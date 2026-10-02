import { terminFuer } from './haltbarkeit'
import { portionen } from './mengen'
import { rundeOhnePackung } from './runden'
import { aktiveSlots, istAnwesend } from './trip'
import type { EinkaufsEintragStatus, Rezept, Trip, Zutat } from './typen'

// Mengen und Einkaufsliste (Konzept Kapitel 7). Die Liste wird immer neu aus dem
// Plan berechnet; gespeichert wird nur der Status (abgehakt, vorhanden, Zusatzeinträge).

/** Gleicht winzige Rechenfehler von Kommazahlen aus (z. B. 550,0000000001), bevor aufgerundet wird */
function glaette(zahl: number): number {
  return Math.round(zahl * 1000) / 1000
}

// ---------- Bedarf (7.2, 7.3) ----------

/** Ein einzelner Bedarf einer Zutat an einem Tag */
export interface Bedarf {
  zutatId: string
  tag: number
  menge: number
  /** pauschale Grundausstattung: einmalig, ohne Puffer */
  pauschal: boolean
}

/** 7.2: mengeProPortion × Portionen der Variante × Aktivfaktor, für jede aktive Mahlzeit */
export function rezeptBedarfe(trip: Trip, rezepte: Rezept[]): Bedarf[] {
  const bedarfe: Bedarf[] = []
  for (const slot of aktiveSlots(trip)) {
    for (const variante of slot.varianten) {
      const anzahl = portionen(trip, slot, variante)
      if (anzahl === 0) continue
      for (const rezeptId of variante.rezeptIds) {
        const rezept = rezepte.find((r) => r.id === rezeptId)
        for (const rz of rezept?.zutaten ?? []) {
          bedarfe.push({
            zutatId: rz.zutatId,
            tag: slot.tag,
            menge: rz.mengeProPortion * anzahl * trip.aktivfaktor,
            pauschal: false,
          })
        }
      }
    }
  }
  return bedarfe
}

/**
 * Personentage je Tag, gewichtet mit dem Portionsfaktor. Eine Person zählt an einem Tag,
 * wenn sie bei mindestens einer aktiven Mahlzeit anwesend ist (Konzept 7.3).
 */
export function personentage(trip: Trip): number[] {
  const slots = aktiveSlots(trip)
  return trip.tage.map((_, index) => {
    const tagSlots = slots.filter((s) => s.tag === index + 1)
    return trip.teilnehmer
      .filter((tn) => tagSlots.some((s) => istAnwesend(tn, s.id)))
      .reduce((summe, tn) => summe + tn.portionsfaktor, 0)
  })
}

/** 7.3: "proPersonTag" je Tag, "pauschal" einmalig am ersten Tag */
export function grundausstattungBedarfe(trip: Trip): Bedarf[] {
  const proTag = personentage(trip)
  return trip.grundausstattung.flatMap((posten): Bedarf[] => {
    if (posten.modus === 'pauschal') {
      return [{ zutatId: posten.zutatId, tag: 1, menge: posten.menge, pauschal: true }]
    }
    return proTag
      .map((gewicht, index) => ({ zutatId: posten.zutatId, tag: index + 1, menge: posten.menge * gewicht, pauschal: false }))
      .filter((b) => b.menge > 0)
  })
}

export function alleBedarfe(trip: Trip, rezepte: Rezept[]): Bedarf[] {
  return [...rezeptBedarfe(trip, rezepte), ...grundausstattungBedarfe(trip)]
}

// ---------- Einkaufsliste (7.4, 7.7, 7.8) ----------

export interface ListenEintrag {
  terminId: string
  zutat: Zutat
  /** Summe aller Bedarfe inkl. Puffer */
  bedarf: number
  /** "haben wir schon / bringt XY mit" */
  vorhanden: number
  mitbringerId: string | null
  /** noch einzukaufen = Bedarf − vorhanden, ungerundet */
  menge: number
  /** auf Packungen bzw. runde Mengen aufgerundet */
  kaufMenge: number
  /** null bei loser Ware */
  packungen: number | null
  /** kaufMenge − menge; wird nur angezeigt, nicht weiterverrechnet */
  rest: number
  abgehakt: boolean
  gekaufteMenge: number | null
  /** abgehakt, aber der Bedarf ist inzwischen größer als die gekaufte Menge */
  nachkaufen: number
  /** nachkaufen, aufgerundet wie beim Einkauf */
  nachkaufenKauf: number
  /** geschätzte Kosten in Cent; null ohne Richtpreis */
  kosten: number | null
}

/** 7.4 Schritt 4: mit Packungsgröße auf ganze Packungen, sonst auf runde Mengen */
export function rundeEinkauf(menge: number, zutat: Zutat): { kaufMenge: number; packungen: number | null } {
  const glatt = glaette(menge)
  if (glatt <= 0) return { kaufMenge: 0, packungen: zutat.packungsgroesse === null ? null : 0 }
  if (zutat.packungsgroesse !== null) {
    const packungen = Math.ceil(glaette(glatt / zutat.packungsgroesse))
    return { kaufMenge: glaette(packungen * zutat.packungsgroesse), packungen }
  }
  return { kaufMenge: rundeOhnePackung(glatt, zutat.einheit), packungen: null }
}

/** 7.8: Packungen × Preis pro Packung, sonst Menge × Richtpreis (pro 1000 g/ml bzw. pro Stück) */
function schaetzeKosten(zutat: Zutat, kaufMenge: number, packungen: number | null): number | null {
  if (zutat.richtpreis === null) return null
  if (packungen !== null) return packungen * zutat.richtpreis
  if (zutat.einheit === 'stk') return Math.round(kaufMenge * zutat.richtpreis)
  return Math.round((kaufMenge / 1000) * zutat.richtpreis)
}

function findeStatus(trip: Trip, terminId: string, zutatId: string): EinkaufsEintragStatus | undefined {
  return trip.einkaufsstatus.eintraege.find((e) => e.terminId === terminId && e.zutatId === zutatId)
}

/** Die zusammengefasste Einkaufsliste: ein Eintrag pro Einkaufstermin und Zutat (Konzept 7.4) */
export function einkaufsliste(trip: Trip, rezepte: Rezept[], zutaten: Zutat[]): ListenEintrag[] {
  // Jeder einzelne Bedarf wird seinem Einkaufstermin zugeordnet (7.6) und dort summiert
  const summen = new Map<string, { terminId: string; zutat: Zutat; mitPuffer: number; pauschal: number }>()
  for (const bedarf of alleBedarfe(trip, rezepte)) {
    const zutat = zutaten.find((z) => z.id === bedarf.zutatId)
    if (!zutat) continue
    const terminId = terminFuer(trip, zutat, bedarf).id
    const schluessel = `${terminId}|${zutat.id}`
    const summe = summen.get(schluessel) ?? { terminId, zutat, mitPuffer: 0, pauschal: 0 }
    if (bedarf.pauschal) summe.pauschal += bedarf.menge
    else summe.mitPuffer += bedarf.menge
    summen.set(schluessel, summe)
  }

  const liste: ListenEintrag[] = []
  for (const summe of summen.values()) {
    const { terminId, zutat } = summe
    const status = findeStatus(trip, terminId, zutat.id)

    // 1.–3. summieren, Puffer (nicht auf Pauschales), Vorhandenes abziehen
    const bedarf = glaette(summe.mitPuffer * (1 + trip.puffer / 100) + summe.pauschal)
    const vorhanden = status?.vorhandenMenge ?? 0
    const menge = glaette(Math.max(0, bedarf - vorhanden))
    // 4. runden
    const { kaufMenge, packungen } = rundeEinkauf(menge, zutat)

    const abgehakt = status?.abgehakt ?? false
    const gekaufteMenge = status?.gekaufteMenge ?? null
    // 7.7: nur ein Hinweis, wenn der neue Bedarf größer ist als das Gekaufte
    const nachkaufen = abgehakt && gekaufteMenge !== null ? glaette(Math.max(0, menge - gekaufteMenge)) : 0

    liste.push({
      terminId,
      zutat,
      bedarf,
      vorhanden,
      mitbringerId: status?.mitbringerId ?? null,
      menge,
      kaufMenge,
      packungen,
      rest: glaette(kaufMenge - menge),
      abgehakt,
      gekaufteMenge,
      nachkaufen,
      nachkaufenKauf: rundeEinkauf(nachkaufen, zutat).kaufMenge,
      kosten: schaetzeKosten(zutat, kaufMenge, packungen),
    })
  }
  return liste.sort((a, b) => a.zutat.name.localeCompare(b.zutat.name, 'de'))
}

// ---------- Status ändern ----------

function aendereStatus(
  trip: Trip,
  terminId: string,
  zutatId: string,
  aenderung: Partial<EinkaufsEintragStatus>,
): Trip {
  const alt = findeStatus(trip, terminId, zutatId) ?? {
    terminId,
    zutatId,
    abgehakt: false,
    gekaufteMenge: null,
    vorhandenMenge: 0,
    mitbringerId: null,
  }
  const neu = { ...alt, ...aenderung }
  const andere = trip.einkaufsstatus.eintraege.filter((e) => e !== alt)
  // Einträge ohne Inhalt werden nicht gespeichert
  const leer = !neu.abgehakt && neu.vorhandenMenge === 0 && neu.mitbringerId === null
  return { ...trip, einkaufsstatus: { ...trip.einkaufsstatus, eintraege: leer ? andere : [...andere, neu] } }
}

/** Beim Abhaken wird die gekaufte Menge gespeichert (Konzept 7.7) */
export function setzeAbgehakt(trip: Trip, eintrag: ListenEintrag, abgehakt: boolean): Trip {
  return aendereStatus(trip, eintrag.terminId, eintrag.zutat.id, {
    abgehakt,
    gekaufteMenge: abgehakt ? eintrag.kaufMenge : null,
  })
}

/** Der Nachkauf wurde erledigt: Die gekaufte Menge wächst um den Nachkauf */
export function bestaetigeNachkauf(trip: Trip, eintrag: ListenEintrag): Trip {
  return aendereStatus(trip, eintrag.terminId, eintrag.zutat.id, {
    abgehakt: true,
    gekaufteMenge: glaette((eintrag.gekaufteMenge ?? 0) + eintrag.nachkaufenKauf),
  })
}

/** "Haben wir schon" (mitbringerId = null) oder "bringt XY mit" */
export function setzeVorhanden(
  trip: Trip,
  terminId: string,
  zutatId: string,
  menge: number,
  mitbringerId: string | null,
): Trip {
  return aendereStatus(trip, terminId, zutatId, {
    vorhandenMenge: menge,
    mitbringerId: menge > 0 ? mitbringerId : null,
  })
}

export function fuegeZusatzHinzu(trip: Trip, terminId: string, name: string): Trip {
  const eintrag = { id: crypto.randomUUID(), terminId, name: name.trim(), abgehakt: false }
  return {
    ...trip,
    einkaufsstatus: { ...trip.einkaufsstatus, zusatzeintraege: [...trip.einkaufsstatus.zusatzeintraege, eintrag] },
  }
}

export function setzeZusatzAbgehakt(trip: Trip, id: string, abgehakt: boolean): Trip {
  return {
    ...trip,
    einkaufsstatus: {
      ...trip.einkaufsstatus,
      zusatzeintraege: trip.einkaufsstatus.zusatzeintraege.map((z) => (z.id === id ? { ...z, abgehakt } : z)),
    },
  }
}

export function entferneZusatz(trip: Trip, id: string): Trip {
  return {
    ...trip,
    einkaufsstatus: {
      ...trip.einkaufsstatus,
      zusatzeintraege: trip.einkaufsstatus.zusatzeintraege.filter((z) => z.id !== id),
    },
  }
}

// ---------- Kostenschätzung (7.8) ----------

/** Gewicht fürs Teilen von Essenskosten: Summe des Portionsfaktors über alle Mahlzeiten mit Anwesenheit (9.1) */
export function essensGewichte(trip: Trip): Map<string, number> {
  const slots = aktiveSlots(trip)
  return new Map(
    trip.teilnehmer.map((tn) => [
      tn.personId,
      slots.filter((s) => istAnwesend(tn, s.id)).length * tn.portionsfaktor,
    ]),
  )
}

export interface Kostenschaetzung {
  /** Cent */
  summe: number
  /** Artikel auf der Liste, für die kein Richtpreis hinterlegt ist */
  ohnePreis: number
  /** kleinster und größter Anteil einer Person in Cent; null, wenn niemand mitisst */
  proPerson: { von: number; bis: number } | null
}

export function kostenschaetzung(trip: Trip, liste: ListenEintrag[]): Kostenschaetzung {
  const zuKaufen = liste.filter((e) => e.kaufMenge > 0)
  const summe = zuKaufen.reduce((s, e) => s + (e.kosten ?? 0), 0)
  const gewichte = [...essensGewichte(trip).values()].filter((g) => g > 0)
  const gesamt = gewichte.reduce((s, g) => s + g, 0)
  return {
    summe,
    ohnePreis: zuKaufen.filter((e) => e.kosten === null).length,
    proPerson:
      gesamt > 0
        ? {
            von: Math.round((summe * Math.min(...gewichte)) / gesamt),
            bis: Math.round((summe * Math.max(...gewichte)) / gesamt),
          }
        : null,
  }
}
