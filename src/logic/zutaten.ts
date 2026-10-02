import type { Einstellungen, Rezept, Trip, Zutat } from './typen'

export type ZutatFehler =
  | 'nameFehlt'
  | 'nameDoppelt'
  | 'packungUngueltig'
  | 'preisUngueltig'
  | 'haltbarkeitUngueltig'

function istHaltbarkeit(wert: number | null): boolean {
  return wert === null || (Number.isInteger(wert) && wert >= 0)
}

/** Prüft eine Zutat vor dem Speichern; leere Liste = alles in Ordnung */
export function pruefeZutat(zutat: Zutat, alle: Zutat[]): ZutatFehler[] {
  const fehler: ZutatFehler[] = []
  const name = zutat.name.trim().toLowerCase()
  if (name === '') {
    fehler.push('nameFehlt')
  } else if (alle.some((z) => z.id !== zutat.id && z.name.trim().toLowerCase() === name)) {
    fehler.push('nameDoppelt')
  }
  if (zutat.packungsgroesse !== null && !(zutat.packungsgroesse > 0)) fehler.push('packungUngueltig')
  if (zutat.richtpreis !== null && !(Number.isInteger(zutat.richtpreis) && zutat.richtpreis >= 0)) {
    fehler.push('preisUngueltig')
  }
  if (!istHaltbarkeit(zutat.haltbarkeitUngekuehlt) || !istHaltbarkeit(zutat.haltbarkeitGekuehlt)) {
    fehler.push('haltbarkeitUngueltig')
  }
  return fehler
}

export interface ZutatVerwendung {
  /** Namen der Rezepte, die die Zutat enthalten */
  rezepte: string[]
  /** Namen der Trips, in deren Grundausstattung die Zutat steht */
  trips: string[]
  standardGrundausstattung: boolean
}

/** Wo wird die Zutat verwendet? Nur unbenutzte Zutaten dürfen gelöscht werden. */
export function zutatVerwendung(
  zutatId: string,
  daten: { rezepte: Rezept[]; trips: Trip[]; einstellungen: Pick<Einstellungen, 'standardGrundausstattung'> },
): ZutatVerwendung {
  return {
    rezepte: daten.rezepte.filter((r) => r.zutaten.some((z) => z.zutatId === zutatId)).map((r) => r.name),
    trips: daten.trips.filter((t) => t.grundausstattung.some((p) => p.zutatId === zutatId)).map((t) => t.name),
    standardGrundausstattung: daten.einstellungen.standardGrundausstattung.some((p) => p.zutatId === zutatId),
  }
}

export function istUnbenutzt(verwendung: ZutatVerwendung): boolean {
  return verwendung.rezepte.length === 0 && verwendung.trips.length === 0 && !verwendung.standardGrundausstattung
}

/** Sortiert nach Namen, wie im deutschen Alphabet (ä bei a) */
export function nachName<T extends { name: string }>(liste: T[]): T[] {
  return [...liste].sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

export function sucheZutaten(zutaten: Zutat[], suche: string): Zutat[] {
  const text = suche.trim().toLowerCase()
  return nachName(text === '' ? zutaten : zutaten.filter((z) => z.name.toLowerCase().includes(text)))
}
