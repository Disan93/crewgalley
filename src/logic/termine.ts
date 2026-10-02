import { sortierteTermine } from './haltbarkeit'
import type { Einkaufstermin, Trip } from './typen'

// Einkaufstermine verwalten. Es gibt immer mindestens einen Termin.

export function fuegeTerminHinzu(trip: Trip, tag: number, name: string): Trip {
  const termin: Einkaufstermin = { id: crypto.randomUUID(), tag, name }
  return { ...trip, einkaufstermine: [...trip.einkaufstermine, termin] }
}

export function aendereTermin(trip: Trip, id: string, aenderung: Partial<Pick<Einkaufstermin, 'tag' | 'name'>>): Trip {
  return {
    ...trip,
    einkaufstermine: trip.einkaufstermine.map((t) => (t.id === id ? { ...t, ...aenderung } : t)),
  }
}

/**
 * Entfernt einen Termin (nie den letzten). Der Abhak-Status seiner Einträge entfällt,
 * eigene Zusatzeinträge wandern zum ersten verbleibenden Termin.
 */
export function entferneTermin(trip: Trip, id: string): Trip {
  if (trip.einkaufstermine.length <= 1) return trip
  const rest = { ...trip, einkaufstermine: trip.einkaufstermine.filter((t) => t.id !== id) }
  const erster = sortierteTermine(rest)[0].id
  return {
    ...rest,
    einkaufsstatus: {
      eintraege: trip.einkaufsstatus.eintraege.filter((e) => e.terminId !== id),
      zusatzeintraege: trip.einkaufsstatus.zusatzeintraege.map((z) =>
        z.terminId === id ? { ...z, terminId: erster } : z,
      ),
    },
  }
}
