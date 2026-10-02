import type { Slot, Trip, Variante } from './typen'

// Änderungen am Menüplan. Jede Funktion gibt einen NEUEN Trip zurück.

function aendereSlot(trip: Trip, slotId: string, aendere: (slot: Slot) => Slot): Trip {
  return { ...trip, slots: trip.slots.map((s) => (s.id === slotId ? aendere(s) : s)) }
}

function aendereVariante(
  trip: Trip,
  slotId: string,
  varianteId: string,
  aendere: (variante: Variante) => Variante,
): Trip {
  return aendereSlot(trip, slotId, (slot) => ({
    ...slot,
    varianten: slot.varianten.map((v) => (v.id === varianteId ? aendere(v) : v)),
  }))
}

export function fuegeRezeptHinzu(trip: Trip, slotId: string, varianteId: string, rezeptId: string): Trip {
  return aendereVariante(trip, slotId, varianteId, (v) =>
    v.rezeptIds.includes(rezeptId) ? v : { ...v, rezeptIds: [...v.rezeptIds, rezeptId] },
  )
}

export function entferneRezept(trip: Trip, slotId: string, varianteId: string, rezeptId: string): Trip {
  return aendereVariante(trip, slotId, varianteId, (v) => ({
    ...v,
    rezeptIds: v.rezeptIds.filter((id) => id !== rezeptId),
  }))
}

/**
 * Legt ein Zweitgericht an (varianteId = null) oder ändert, für wen es gilt.
 * Eine Person kann pro Mahlzeit nur ein Zweitgericht haben: Sie wird aus anderen
 * Zweitgerichten entfernt. Zweitgerichte ohne Personen entfallen.
 */
export function setzeZweitgericht(
  trip: Trip,
  slotId: string,
  varianteId: string | null,
  personIds: string[],
): Trip {
  return aendereSlot(trip, slotId, (slot) => {
    const varianten = slot.varianten.map((v): Variante => {
      if (v.fuer === 'standard') return v
      if (v.id === varianteId) return { ...v, fuer: personIds }
      return { ...v, fuer: v.fuer.filter((id) => !personIds.includes(id)) }
    })
    if (varianteId === null) varianten.push({ id: crypto.randomUUID(), rezeptIds: [], fuer: personIds })
    return { ...slot, varianten: varianten.filter((v) => v.fuer === 'standard' || v.fuer.length > 0) }
  })
}

/** Entfernt ein Zweitgericht; die Standard-Variante bleibt immer bestehen */
export function entferneZweitgericht(trip: Trip, slotId: string, varianteId: string): Trip {
  return aendereSlot(trip, slotId, (slot) => ({
    ...slot,
    varianten: slot.varianten.filter((v) => v.fuer === 'standard' || v.id !== varianteId),
  }))
}
