import { sortierteTermine, terminFuerTag } from './haltbarkeit'
import { aktiveSlots, istAnwesend } from './trip'
import type { Trip } from './typen'

// Trinkwasser (Konzept 8.5). Nur Trinkwasser, nicht der Bordtank.

/** Anzahl der Personen, die an diesem Tag bei mindestens einer aktiven Mahlzeit anwesend sind */
export function anwesendePersonen(trip: Trip, tag: number): number {
  const tagSlots = aktiveSlots(trip).filter((s) => s.tag === tag)
  return trip.teilnehmer.filter((tn) => tagSlots.some((s) => istAnwesend(tn, s.id))).length
}

/** liter(tag) = anwesende Personen × (Liter pro Person und Tag + Zuschlag an heißen Tagen) */
export function wasserLiter(trip: Trip, tag: number): number {
  const { literProPersonTag, zusatzHeisserTag } = trip.wasser
  const proPerson = literProPersonTag + (trip.tage[tag - 1]?.heisserTag ? zusatzHeisserTag : 0)
  return anwesendePersonen(trip, tag) * proPerson
}

export interface WasserProTermin {
  terminId: string
  liter: number
  gebinde: number
}

export interface Wasserbedarf {
  liter: number
  gebinde: number
  proTermin: WasserProTermin[]
}

/** Wasser wird wie verderbliche Ware den Einkaufsterminen zugeordnet; null ohne Wasserberechnung */
export function wasserbedarf(trip: Trip): Wasserbedarf | null {
  if (!trip.eigenschaften.wasserberechnung) return null
  const gebindeFuer = (liter: number) => Math.ceil(Math.round((liter / trip.wasser.gebindeLiter) * 1000) / 1000)

  const literJeTermin = new Map<string, number>()
  trip.tage.forEach((_, index) => {
    const terminId = terminFuerTag(trip, index + 1).id
    literJeTermin.set(terminId, (literJeTermin.get(terminId) ?? 0) + wasserLiter(trip, index + 1))
  })

  const proTermin = sortierteTermine(trip).map((termin) => {
    const liter = literJeTermin.get(termin.id) ?? 0
    return { terminId: termin.id, liter, gebinde: gebindeFuer(liter) }
  })
  const liter = proTermin.reduce((summe, t) => summe + t.liter, 0)
  return { liter, gebinde: gebindeFuer(liter), proTermin }
}
