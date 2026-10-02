import { neueBasis } from './sicherung'
import type { Rezept, RezeptKategorie, Trip, Zutat } from './typen'
import { nachName } from './zutaten'

export type RezeptFehler =
  | 'nameFehlt'
  | 'keineZutaten'
  | 'mengeUngueltig'
  | 'zutatDoppelt'
  | 'zutatUnbekannt'
  | 'wertUngueltig'

/** Prüft ein Rezept vor dem Speichern; leere Liste = alles in Ordnung */
export function pruefeRezept(rezept: Rezept, zutaten: Zutat[]): RezeptFehler[] {
  const fehler: RezeptFehler[] = []
  const bekannt = new Set(zutaten.map((z) => z.id))
  const ids = rezept.zutaten.map((z) => z.zutatId)

  if (rezept.name.trim() === '') fehler.push('nameFehlt')
  if (rezept.zutaten.length === 0) fehler.push('keineZutaten')
  if (rezept.zutaten.some((z) => !(z.mengeProPortion > 0))) fehler.push('mengeUngueltig')
  if (new Set(ids).size !== ids.length) fehler.push('zutatDoppelt')
  if (ids.some((id) => !bekannt.has(id))) fehler.push('zutatUnbekannt')
  if (
    !(Number.isInteger(rezept.flammen) && rezept.flammen >= 0) ||
    !(Number.isInteger(rezept.zubereitungszeitMin) && rezept.zubereitungszeitMin >= 0)
  ) {
    fehler.push('wertUngueltig')
  }
  return fehler
}

/** Kopie eines Rezepts als eigenes, änderbares Rezept (Konzept 5.3) */
export function kopiereRezept(rezept: Rezept, neuerName: string, jetzt: Date = new Date()): Rezept {
  return {
    ...rezept,
    ...neueBasis(jetzt),
    name: neuerName,
    merkmale: [...rezept.merkmale],
    zutaten: rezept.zutaten.map((z) => ({ ...z })),
    quelle: 'eigen',
  }
}

export interface RezeptFilter {
  suche: string
  /** null = alle Kategorien */
  kategorie: RezeptKategorie | null
}

export function filtereRezepte(rezepte: Rezept[], filter: RezeptFilter): Rezept[] {
  const text = filter.suche.trim().toLowerCase()
  return nachName(
    rezepte.filter(
      (r) =>
        (filter.kategorie === null || r.kategorie === filter.kategorie) &&
        (text === '' || r.name.toLowerCase().includes(text)),
    ),
  )
}

/** Namen der Trips, in deren Menüplan das Rezept steht */
export function rezeptVerwendung(rezeptId: string, trips: Trip[]): string[] {
  return trips
    .filter((t) => t.slots.some((s) => s.varianten.some((v) => v.rezeptIds.includes(rezeptId))))
    .map((t) => t.name)
}
