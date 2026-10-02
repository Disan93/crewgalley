import { SCHEMA_VERSION, type SicherungsFehler } from './sicherung'
import type { Person, Rezept, Trip, Zutat } from './typen'

/** Inhalt einer Trip-Datei: der Trip samt allem, was er verwendet (Konzept 10.2) */
export interface TripDatei {
  app: 'CrewGalley'
  art: 'trip'
  schemaVersion: number
  erstelltAm: string
  trip: Trip
  rezepte: Rezept[]
  zutaten: Zutat[]
  personen: Person[]
}

export type TripLeseErgebnis = { ok: true; datei: TripDatei } | { ok: false; fehler: SicherungsFehler }

/** Packt den Trip mit den verwendeten Rezepten, deren Zutaten, der Grundausstattung und den Teilnehmern */
export function baueTripDatei(
  trip: Trip,
  daten: { rezepte: Rezept[]; zutaten: Zutat[]; personen: Person[] },
  jetzt: Date = new Date(),
): TripDatei {
  const rezeptIds = new Set(trip.slots.flatMap((s) => s.varianten.flatMap((v) => v.rezeptIds)))
  const rezepte = daten.rezepte.filter((r) => rezeptIds.has(r.id))
  const zutatIds = new Set([
    ...rezepte.flatMap((r) => r.zutaten.map((z) => z.zutatId)),
    ...trip.grundausstattung.map((p) => p.zutatId),
    ...trip.einkaufsstatus.eintraege.map((e) => e.zutatId),
  ])
  const personIds = new Set(trip.teilnehmer.map((tn) => tn.personId))
  return {
    app: 'CrewGalley',
    art: 'trip',
    schemaVersion: SCHEMA_VERSION,
    erstelltAm: jetzt.toISOString(),
    trip,
    rezepte,
    zutaten: daten.zutaten.filter((z) => zutatIds.has(z.id)),
    personen: daten.personen.filter((p) => personIds.has(p.id)),
  }
}

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istListeMitIds(wert: unknown): boolean {
  return Array.isArray(wert) && wert.every((e) => istObjekt(e) && typeof e.id === 'string')
}

/** Prüft den Text einer Trip-Datei. Geprüft wird nur die grobe Form, nicht jedes einzelne Feld. */
export function leseTripDatei(text: string): TripLeseErgebnis {
  let roh: unknown
  try {
    roh = JSON.parse(text)
  } catch {
    return { ok: false, fehler: 'keinJson' }
  }
  if (!istObjekt(roh) || roh.app !== 'CrewGalley' || roh.art !== 'trip') {
    return { ok: false, fehler: 'fremdeDatei' }
  }
  if (typeof roh.schemaVersion !== 'number') return { ok: false, fehler: 'beschaedigt' }
  if (roh.schemaVersion > SCHEMA_VERSION) return { ok: false, fehler: 'zuNeu' }
  const trip = roh.trip
  if (
    !istObjekt(trip) ||
    typeof trip.id !== 'string' ||
    typeof trip.name !== 'string' ||
    !Array.isArray(trip.slots) ||
    !Array.isArray(trip.teilnehmer) ||
    !istListeMitIds(roh.rezepte) ||
    !istListeMitIds(roh.zutaten) ||
    !istListeMitIds(roh.personen)
  ) {
    return { ok: false, fehler: 'beschaedigt' }
  }
  return { ok: true, datei: roh as unknown as TripDatei }
}

/** Dateiname ohne Sonderzeichen: "Törn Kroatien 2027" → "crewgalley-trip-toern-kroatien-2027.json" */
export function tripDateiname(name: string): string {
  const ersetzt = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `crewgalley-trip-${ersetzt || 'export'}.json`
}
