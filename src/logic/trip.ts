import { neueBasis } from './sicherung'
import type { GrundausstattungsPosten, Mahlzeit, Person, Slot, Teilnehmer, Trip, TripTag } from './typen'
import { findeVorlage } from './vorlagen'

// Alle Funktionen hier geben einen NEUEN Trip zurück und lassen den übergebenen unverändert.

/** Mahlzeiten in der Reihenfolge des Tages */
export const MAHLZEITEN: Mahlzeit[] = ['fruehstueck', 'mittag', 'abend', 'snack']
export const MAX_TAGE = 31

const TAG_MS = 24 * 60 * 60 * 1000

// ---------- Tage, Mahlzeiten, Slots ----------

/** Slot-IDs sind innerhalb eines Trips eindeutig und sprechend: "t2-abend" */
export function slotId(tag: number, mahlzeit: Mahlzeit): string {
  return `t${tag}-${mahlzeit}`
}

/**
 * Standard (Konzept Kapitel 4): Anreisetag nur Abendessen, Abreisetag Frühstück und
 * Mittag, dazwischen Frühstück, Mittag, Abendessen. Snack ist aus.
 */
export function standardMahlzeiten(tag: number, anzahlTage: number): Mahlzeit[] {
  if (anzahlTage === 1) return ['fruehstueck', 'mittag', 'abend']
  if (tag === 1) return ['abend']
  if (tag === anzahlTage) return ['fruehstueck', 'mittag']
  return ['fruehstueck', 'mittag', 'abend']
}

/** Für jeden Tag gibt es immer alle vier Slots; ob einer aktiv ist, steht in trip.tage */
function neueSlots(tag: number): Slot[] {
  return MAHLZEITEN.map((mahlzeit) => ({
    id: slotId(tag, mahlzeit),
    tag,
    mahlzeit,
    varianten: [{ id: crypto.randomUUID(), rezeptIds: [], fuer: 'standard' }],
  }))
}

export function istAktiv(trip: Trip, slot: Slot): boolean {
  return trip.tage[slot.tag - 1]?.mahlzeiten.includes(slot.mahlzeit) ?? false
}

/** Aktive Slots in zeitlicher Reihenfolge */
export function aktiveSlots(trip: Trip): Slot[] {
  return trip.slots
    .filter((s) => istAktiv(trip, s))
    .sort((a, b) => a.tag - b.tag || MAHLZEITEN.indexOf(a.mahlzeit) - MAHLZEITEN.indexOf(b.mahlzeit))
}

/** Datum eines Trip-Tages (Tag 1 = Startdatum), als UTC-Mitternacht */
export function tagDatum(startdatum: string, tag: number): Date {
  return new Date(Date.parse(`${startdatum}T00:00:00Z`) + (tag - 1) * TAG_MS)
}

// ---------- Anlegen ----------

export interface TripEingabe {
  name: string
  vorlageId: string
  startdatum: string
  anzahlTage: number
}

export type TripFehler = 'nameFehlt' | 'datumUngueltig' | 'tageUngueltig'

export function istDatum(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00Z`))
}

export function istTageszahl(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= MAX_TAGE
}

export function pruefeTripEingabe(eingabe: TripEingabe): TripFehler[] {
  const fehler: TripFehler[] = []
  if (eingabe.name.trim() === '') fehler.push('nameFehlt')
  if (!istDatum(eingabe.startdatum)) fehler.push('datumUngueltig')
  if (!istTageszahl(eingabe.anzahlTage)) fehler.push('tageUngueltig')
  return fehler
}

export interface TripOptionen {
  /** Standard-Grundausstattung aus den Einstellungen; der Trip bekommt eine Kopie */
  grundausstattung: GrundausstattungsPosten[]
  /** Name des ersten Einkaufstermins, z. B. "Tag 1 – Großeinkauf" */
  ersterTerminName: string
}

export function erstelleTrip(eingabe: TripEingabe, optionen: TripOptionen, jetzt: Date = new Date()): Trip {
  const vorlage = findeVorlage(eingabe.vorlageId)
  const tagNummern = Array.from({ length: eingabe.anzahlTage }, (_, i) => i + 1)
  return {
    ...neueBasis(jetzt),
    name: eingabe.name.trim(),
    vorlage: vorlage.id,
    startdatum: eingabe.startdatum,
    anzahlTage: eingabe.anzahlTage,
    waehrung: 'EUR',
    eigenschaften: structuredClone(vorlage.eigenschaften),
    aktivfaktor: vorlage.aktivfaktor,
    puffer: 10,
    tage: tagNummern.map((tag) => ({ mahlzeiten: standardMahlzeiten(tag, eingabe.anzahlTage), heisserTag: false })),
    teilnehmer: [],
    slots: tagNummern.flatMap(neueSlots),
    grundausstattung: structuredClone(optionen.grundausstattung),
    einkaufstermine: [{ id: crypto.randomUUID(), tag: 1, name: optionen.ersterTerminName }],
    einkaufsstatus: { eintraege: [], zusatzeintraege: [] },
    wasser: { literProPersonTag: 3, zusatzHeisserTag: 1, gebindeLiter: 6 },
    ausgaben: [],
    einzahlungen: [],
    ueberweisungenErledigt: [],
  }
}

// ---------- Tage ändern ----------

function gleicheMahlzeiten(a: Mahlzeit[], b: Mahlzeit[]): boolean {
  return a.length === b.length && a.every((m) => b.includes(m))
}

/** Stellt einen Tag auf das neue Standardmuster um, aber nur, wenn er noch das alte Standardmuster hatte */
function passeTagAn(tage: TripTag[], tag: number, altAnzahl: number, neuAnzahl: number): void {
  if (gleicheMahlzeiten(tage[tag - 1].mahlzeiten, standardMahlzeiten(tag, altAnzahl))) {
    tage[tag - 1] = { ...tage[tag - 1], mahlzeiten: standardMahlzeiten(tag, neuAnzahl) }
  }
}

/**
 * Verlängert oder verkürzt den Trip. Beim Verkürzen gehen die Planung und die
 * Anwesenheit der gestrichenen Tage verloren.
 */
export function setzeAnzahlTage(trip: Trip, anzahl: number): Trip {
  const alt = trip.anzahlTage
  if (anzahl === alt) return trip

  const tage = trip.tage.slice(0, anzahl)
  let slots = trip.slots.filter((s) => s.tag <= anzahl)
  const neueIds: string[] = []

  if (anzahl > alt) {
    // Der bisherige Abreisetag wird ein normaler Tag
    passeTagAn(tage, alt, alt, anzahl)
    for (let tag = alt + 1; tag <= anzahl; tag++) {
      tage.push({ mahlzeiten: standardMahlzeiten(tag, anzahl), heisserTag: false })
      const dazu = neueSlots(tag)
      slots = [...slots, ...dazu]
      neueIds.push(...dazu.map((s) => s.id))
    }
  } else {
    // Der neue letzte Tag wird zum Abreisetag
    passeTagAn(tage, anzahl, alt, anzahl)
  }

  const gueltig = new Set(slots.map((s) => s.id))
  const termine = trip.einkaufstermine.filter((t) => t.tag <= anzahl)
  return {
    ...trip,
    anzahlTage: anzahl,
    tage,
    slots,
    // Neue Tage: alle sind standardmäßig dabei
    teilnehmer: trip.teilnehmer.map((tn) => ({
      ...tn,
      anwesenheit: [...tn.anwesenheit.filter((id) => gueltig.has(id)), ...neueIds],
    })),
    einkaufstermine: termine.length > 0 ? termine : trip.einkaufstermine.slice(0, 1).map((t) => ({ ...t, tag: 1 })),
  }
}

/** Sind ab diesem Tag schon Rezepte geplant? (Rückfrage vor dem Verkürzen) */
export function hatRezepteAbTag(trip: Trip, tag: number): boolean {
  return trip.slots.some((s) => s.tag >= tag && s.varianten.some((v) => v.rezeptIds.length > 0))
}

export function setzeMahlzeitAktiv(trip: Trip, tag: number, mahlzeit: Mahlzeit, aktiv: boolean): Trip {
  return {
    ...trip,
    tage: trip.tage.map((t, i) => {
      if (i !== tag - 1) return t
      const ohne = t.mahlzeiten.filter((m) => m !== mahlzeit)
      return { ...t, mahlzeiten: aktiv ? MAHLZEITEN.filter((m) => m === mahlzeit || ohne.includes(m)) : ohne }
    }),
  }
}

// ---------- Teilnehmer und Anwesenheit ----------

/** Neue Teilnehmer sind standardmäßig immer dabei (Konzept Kapitel 3) */
export function fuegeTeilnehmerHinzu(trip: Trip, person: Pick<Person, 'id' | 'portionsfaktor'>): Trip {
  if (trip.teilnehmer.some((tn) => tn.personId === person.id)) return trip
  const neu: Teilnehmer = {
    personId: person.id,
    portionsfaktor: person.portionsfaktor,
    anwesenheit: trip.slots.map((s) => s.id),
  }
  return { ...trip, teilnehmer: [...trip.teilnehmer, neu] }
}

/** Hat die Person Ausgaben bezahlt, Anteile daran oder in die Bordkasse eingezahlt? */
export function hatBuchungen(trip: Trip, personId: string): boolean {
  return (
    trip.einzahlungen.some((e) => e.personId === personId) ||
    trip.ausgaben.some((a) => a.bezahltVon === personId || a.aufteilung.personIds.includes(personId))
  )
}

export function entferneTeilnehmer(trip: Trip, personId: string): Trip {
  return {
    ...trip,
    teilnehmer: trip.teilnehmer.filter((tn) => tn.personId !== personId),
    // Zweitgerichte, die nur für diese Person waren, entfallen
    slots: trip.slots.map((s) => ({
      ...s,
      varianten: s.varianten
        .map((v) => (v.fuer === 'standard' ? v : { ...v, fuer: v.fuer.filter((id) => id !== personId) }))
        .filter((v) => v.fuer === 'standard' || v.fuer.length > 0),
    })),
  }
}

export function setzePortionsfaktor(trip: Trip, personId: string, portionsfaktor: number): Trip {
  return {
    ...trip,
    teilnehmer: trip.teilnehmer.map((tn) => (tn.personId === personId ? { ...tn, portionsfaktor } : tn)),
  }
}

export function istAnwesend(teilnehmer: Teilnehmer, slot: string): boolean {
  return teilnehmer.anwesenheit.includes(slot)
}

/** Setzt die Anwesenheit einer Person für einen oder mehrere Slots */
export function setzeAnwesenheit(trip: Trip, personId: string, slotIds: string[], anwesend: boolean): Trip {
  return {
    ...trip,
    teilnehmer: trip.teilnehmer.map((tn) => {
      if (tn.personId !== personId) return tn
      const ohne = tn.anwesenheit.filter((id) => !slotIds.includes(id))
      return { ...tn, anwesenheit: anwesend ? [...ohne, ...slotIds] : ohne }
    }),
  }
}

// ---------- Duplizieren ----------

/** "Wie letztes Jahr": kopiert alles außer Ausgaben, Abhak-Status und Einkaufsstatus (Konzept Kapitel 3) */
export function dupliziereTrip(trip: Trip, neuerName: string, jetzt: Date = new Date()): Trip {
  return {
    ...structuredClone(trip),
    ...neueBasis(jetzt),
    name: neuerName,
    einkaufsstatus: { eintraege: [], zusatzeintraege: [] },
    ausgaben: [],
    einzahlungen: [],
    ueberweisungenErledigt: [],
  }
}
