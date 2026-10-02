import { essensGewichte } from './einkauf'
import type { Aufteilung, Ausgabe, AusgabeKategorie, Einzahlung, Trip, Ueberweisung, Zahler } from './typen'

// Kosten und Abrechnung (Konzept Kapitel 9). Alle Beträge sind ganze Cent.

export const KASSE = 'kasse'

export const AUSGABE_KATEGORIEN: AusgabeKategorie[] = [
  'lebensmittel',
  'getraenke',
  'unterkunft',
  'hafen',
  'diesel',
  'sonstiges',
]

/** 9.1: Lebensmittel und Getränke werden standardmäßig nach Essensgewicht geteilt, alles andere gleich */
export function standardModus(kategorie: AusgabeKategorie): Aufteilung['modus'] {
  return kategorie === 'lebensmittel' || kategorie === 'getraenke' ? 'essen' : 'gleich'
}

// ---------- Aufteilung (9.1, 9.2) ----------

/**
 * Verteilt einen Betrag nach Gewichten auf ganze Cent (Methode des größten Rests):
 * Erst abrunden, dann die übrigen Cent an die größten Reste vergeben. Die Summe stimmt immer exakt.
 */
export function verteile(betrag: number, gewichte: number[]): number[] {
  if (gewichte.length === 0) return []
  const summe = gewichte.reduce((s, g) => s + g, 0)
  // Hat niemand ein Gewicht (z. B. niemand war bei einer Mahlzeit), wird gleich geteilt
  const wirksam = summe > 0 ? gewichte : gewichte.map(() => 1)
  const wirksameSumme = summe > 0 ? summe : gewichte.length

  const exakt = wirksam.map((g) => (betrag * g) / wirksameSumme)
  const anteile = exakt.map((x) => Math.floor(x + 1e-9))
  const uebrig = betrag - anteile.reduce((s, a) => s + a, 0)
  const nachRest = exakt
    .map((x, index) => ({ index, rest: x - anteile[index] }))
    .sort((a, b) => b.rest - a.rest)
  for (let i = 0; i < uebrig; i++) anteile[nachRest[i].index] += 1
  return anteile
}

export interface Anteil {
  personId: string
  /** Cent */
  betrag: number
}

/** Wer trägt wie viel von einer Ausgabe? */
export function anteile(trip: Trip, ausgabe: Pick<Ausgabe, 'betrag' | 'aufteilung'>): Anteil[] {
  const { modus, personIds, betraege } = ausgabe.aufteilung
  // Reihenfolge wie in der Teilnehmerliste, damit übrige Cent immer gleich vergeben werden
  const kreis = [
    ...trip.teilnehmer.map((tn) => tn.personId).filter((id) => personIds.includes(id)),
    ...personIds.filter((id) => !trip.teilnehmer.some((tn) => tn.personId === id)),
  ]
  if (modus === 'individuell') {
    return kreis.map((personId) => ({ personId, betrag: betraege?.[personId] ?? 0 }))
  }
  const gewichte = essensGewichte(trip)
  const verteilt = verteile(
    ausgabe.betrag,
    kreis.map((id) => (modus === 'essen' ? (gewichte.get(id) ?? 0) : 1)),
  )
  return kreis.map((personId, index) => ({ personId, betrag: verteilt[index] }))
}

export type AusgabeFehler = 'betragUngueltig' | 'niemand' | 'summeFalsch' | 'zahlerFehlt'

export function pruefeAusgabe(ausgabe: Ausgabe, trip: Trip): AusgabeFehler[] {
  const fehler: AusgabeFehler[] = []
  const { modus, personIds, betraege } = ausgabe.aufteilung
  if (!(Number.isInteger(ausgabe.betrag) && ausgabe.betrag > 0)) fehler.push('betragUngueltig')
  if (ausgabe.bezahltVon !== KASSE && !trip.teilnehmer.some((tn) => tn.personId === ausgabe.bezahltVon)) {
    fehler.push('zahlerFehlt')
  }
  if (personIds.length === 0) fehler.push('niemand')
  // 9.1: Bei festen Beträgen muss die Summe dem Betrag entsprechen
  if (modus === 'individuell' && personIds.reduce((s, id) => s + (betraege?.[id] ?? 0), 0) !== ausgabe.betrag) {
    fehler.push('summeFalsch')
  }
  return fehler
}

// ---------- Ausgaben, Einzahlungen, Überweisungen ändern ----------

/** Legt eine Ausgabe an oder ersetzt die mit derselben ID */
export function speichereAusgabe(trip: Trip, ausgabe: Ausgabe): Trip {
  const vorhanden = trip.ausgaben.some((a) => a.id === ausgabe.id)
  return {
    ...trip,
    ausgaben: vorhanden ? trip.ausgaben.map((a) => (a.id === ausgabe.id ? ausgabe : a)) : [...trip.ausgaben, ausgabe],
  }
}

export function entferneAusgabe(trip: Trip, id: string): Trip {
  return { ...trip, ausgaben: trip.ausgaben.filter((a) => a.id !== id) }
}

export function fuegeEinzahlungHinzu(trip: Trip, einzahlung: Einzahlung): Trip {
  return { ...trip, einzahlungen: [...trip.einzahlungen, einzahlung] }
}

export function entferneEinzahlung(trip: Trip, id: string): Trip {
  return { ...trip, einzahlungen: trip.einzahlungen.filter((e) => e.id !== id) }
}

function gleicheUeberweisung(a: Ueberweisung, b: Ueberweisung): boolean {
  return a.von === b.von && a.an === b.an && a.betrag === b.betrag
}

/** Hakt eine Überweisung als erledigt ab bzw. nimmt den Haken zurück */
export function setzeUeberweisungErledigt(trip: Trip, ueberweisung: Ueberweisung, erledigt: boolean): Trip {
  if (erledigt) return { ...trip, ueberweisungenErledigt: [...trip.ueberweisungenErledigt, ueberweisung] }
  const index = trip.ueberweisungenErledigt.findIndex((u) => gleicheUeberweisung(u, ueberweisung))
  return { ...trip, ueberweisungenErledigt: trip.ueberweisungenErledigt.filter((_, i) => i !== index) }
}

// ---------- Salden und Überweisungen (9.3–9.5) ----------

export interface PersonAbrechnung {
  personId: string
  /** Ausgaben, die die Person selbst bezahlt hat */
  bezahlt: number
  /** Einzahlungen in die Bordkasse */
  eingezahlt: number
  /** Summe ihrer Anteile an allen Ausgaben */
  anteil: number
  /** bezahlt + eingezahlt − Anteil; positiv = bekommt Geld, negativ = schuldet */
  saldo: number
  /** Saldo nach den bereits erledigten Überweisungen */
  offen: number
}

export interface Abrechnung {
  /** Summe aller Ausgaben */
  gesamt: number
  personen: PersonAbrechnung[]
  /** Σ Einzahlungen − Σ Ausgaben aus der Kasse, abzüglich erledigter Auszahlungen */
  kassenstand: number
  /** Vorschlag für die noch offenen Überweisungen */
  ueberweisungen: Ueberweisung[]
}

/**
 * 9.5 Greedy-Verfahren: wiederholt zahlt der größte Schuldner an den größten Gläubiger,
 * bis alle Salden 0 sind. Bei Gleichstand gilt die Reihenfolge der Liste.
 */
export function ueberweisungsVorschlag(salden: { wer: Zahler; saldo: number }[]): Ueberweisung[] {
  const offen = salden.map((s) => ({ ...s }))
  const ergebnis: Ueberweisung[] = []
  for (;;) {
    const schuldner = offen.reduce((a, b) => (b.saldo < a.saldo ? b : a))
    const glaeubiger = offen.reduce((a, b) => (b.saldo > a.saldo ? b : a))
    const betrag = Math.min(-schuldner.saldo, glaeubiger.saldo)
    if (betrag <= 0) return ergebnis
    ergebnis.push({ von: schuldner.wer, an: glaeubiger.wer, betrag })
    schuldner.saldo += betrag
    glaeubiger.saldo -= betrag
  }
}

export function abrechnung(trip: Trip): Abrechnung {
  const personen = new Map<string, PersonAbrechnung>(
    trip.teilnehmer.map((tn) => [
      tn.personId,
      { personId: tn.personId, bezahlt: 0, eingezahlt: 0, anteil: 0, saldo: 0, offen: 0 },
    ]),
  )
  const eintrag = (personId: string): PersonAbrechnung => {
    const vorhanden = personen.get(personId)
    if (vorhanden) return vorhanden
    const neu = { personId, bezahlt: 0, eingezahlt: 0, anteil: 0, saldo: 0, offen: 0 }
    personen.set(personId, neu)
    return neu
  }

  let ausDerKasse = 0
  for (const ausgabe of trip.ausgaben) {
    if (ausgabe.bezahltVon === KASSE) ausDerKasse += ausgabe.betrag
    else eintrag(ausgabe.bezahltVon).bezahlt += ausgabe.betrag
    for (const anteil of anteile(trip, ausgabe)) eintrag(anteil.personId).anteil += anteil.betrag
  }
  let eingezahlt = 0
  for (const einzahlung of trip.einzahlungen) {
    eintrag(einzahlung.personId).eingezahlt += einzahlung.betrag
    eingezahlt += einzahlung.betrag
  }

  // 9.4: Die Kasse wird wie ein zusätzlicher Teilnehmer geführt; saldo(Kasse) = −Kassenstand
  const kasse = { wer: KASSE as Zahler, saldo: -(eingezahlt - ausDerKasse) }
  for (const p of personen.values()) {
    p.saldo = p.bezahlt + p.eingezahlt - p.anteil
    p.offen = p.saldo
  }
  // Erledigte Überweisungen zählen als Zahlungen
  for (const u of trip.ueberweisungenErledigt) {
    if (u.von === KASSE) kasse.saldo += u.betrag
    else eintrag(u.von).offen += u.betrag
    if (u.an === KASSE) kasse.saldo -= u.betrag
    else eintrag(u.an).offen -= u.betrag
  }

  const liste = [...personen.values()]
  return {
    gesamt: trip.ausgaben.reduce((s, a) => s + a.betrag, 0),
    personen: liste,
    kassenstand: -kasse.saldo,
    ueberweisungen: ueberweisungsVorschlag([...liste.map((p) => ({ wer: p.personId, saldo: p.offen })), kasse]),
  }
}
