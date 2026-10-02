import type { Bedarf } from './einkauf'
import type { Einkaufstermin, Kuehlschrank, Trip, Zutat } from './typen'

// Einkaufstermine und Haltbarkeit (Konzept 7.6 und 8.3)

/** Termine in zeitlicher Reihenfolge; der erste ist der "Großeinkauf" */
export function sortierteTermine(trip: Trip): Einkaufstermin[] {
  return [...trip.einkaufstermine].sort((a, b) => a.tag - b.tag)
}

/**
 * Effektive Haltbarkeit in Tagen nach dem Einkaufstag; null = unbegrenzt.
 * Mit Kühlschrank zählt der gekühlte Wert, wenn einer gesetzt ist.
 */
export function effektiveHaltbarkeit(
  zutat: Pick<Zutat, 'haltbarkeitUngekuehlt' | 'haltbarkeitGekuehlt'>,
  kuehlschrank: Kuehlschrank,
): number | null {
  if (kuehlschrank !== 'keiner' && zutat.haltbarkeitGekuehlt !== null) return zutat.haltbarkeitGekuehlt
  return zutat.haltbarkeitUngekuehlt
}

/** Werden Bedarfe überhaupt auf mehrere Termine verteilt? */
function verteilt(trip: Trip): boolean {
  return trip.einkaufstermine.length > 1 && trip.eigenschaften.haltbarkeitspruefung
}

/** Termin für Verderbliches an einem Tag: der späteste Termin, der nicht nach dem Tag liegt */
export function terminFuerTag(trip: Trip, tag: number): Einkaufstermin {
  const termine = sortierteTermine(trip)
  if (!verteilt(trip)) return termine[0]
  return termine.filter((t) => t.tag <= tag).pop() ?? termine[0]
}

/**
 * Konzept 7.6: Haltbares (und alles Pauschale) kommt komplett zum ersten Termin,
 * Verderbliches zum spätesten Termin vor dem Verbrauch.
 */
export function terminFuer(trip: Trip, zutat: Zutat, bedarf: Pick<Bedarf, 'tag' | 'pauschal'>): Einkaufstermin {
  const haltbarkeit = effektiveHaltbarkeit(zutat, trip.eigenschaften.kueche.kuehlschrank)
  const haltbar = haltbarkeit === null || haltbarkeit >= trip.anzahlTage
  if (bedarf.pauschal || haltbar) return sortierteTermine(trip)[0]
  return terminFuerTag(trip, bedarf.tag)
}

export type Ampel = 'gruen' | 'gelb' | 'rot'

export interface HaltbarkeitsHinweis {
  /** Tag, an dem die Zutat verbraucht wird */
  tag: number
  zutat: Zutat
  /** Tag des zugeordneten Einkaufstermins */
  einkaufTag: number
  haltbarkeit: number
  stufe: 'gelb' | 'rot'
}

/**
 * Konzept 8.3: rot, wenn die Zutat beim Verbrauch älter ist als ihre Haltbarkeit;
 * gelb am letzten Haltbarkeitstag. Ohne Haltbarkeitsprüfung gibt es keine Hinweise.
 */
export function haltbarkeitsHinweise(trip: Trip, bedarfe: Bedarf[], zutaten: Zutat[]): HaltbarkeitsHinweis[] {
  if (!trip.eigenschaften.haltbarkeitspruefung) return []
  const hinweise = new Map<string, HaltbarkeitsHinweis>()

  for (const bedarf of bedarfe) {
    const zutat = zutaten.find((z) => z.id === bedarf.zutatId)
    if (!zutat || bedarf.pauschal) continue
    const haltbarkeit = effektiveHaltbarkeit(zutat, trip.eigenschaften.kueche.kuehlschrank)
    if (haltbarkeit === null) continue

    const einkaufTag = terminFuer(trip, zutat, bedarf).tag
    const alter = bedarf.tag - einkaufTag
    const stufe = alter > haltbarkeit ? 'rot' : alter === haltbarkeit && haltbarkeit > 0 ? 'gelb' : null
    if (stufe) hinweise.set(`${bedarf.tag}|${zutat.id}`, { tag: bedarf.tag, zutat, einkaufTag, haltbarkeit, stufe })
  }
  return [...hinweise.values()].sort((a, b) => a.tag - b.tag || a.zutat.name.localeCompare(b.zutat.name, 'de'))
}

/** Tages-Ampel = schlechtester Wert des Tages */
export function tagesAmpel(hinweise: HaltbarkeitsHinweis[], tag: number): Ampel {
  const desTages = hinweise.filter((h) => h.tag === tag)
  if (desTages.some((h) => h.stufe === 'rot')) return 'rot'
  return desTages.length > 0 ? 'gelb' : 'gruen'
}
