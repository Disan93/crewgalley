import { istAnwesend } from './trip'
import type { Slot, Teilnehmer, Trip, Variante } from './typen'

/**
 * Wer isst diese Variante? Nur Anwesende zählen. Zur Standard-Variante gehören
 * alle Anwesenden ohne Zweitgericht in diesem Slot (Konzept 7.1).
 */
export function teilnehmerDerVariante(trip: Trip, slot: Slot, variante: Variante): Teilnehmer[] {
  const anwesend = trip.teilnehmer.filter((tn) => istAnwesend(tn, slot.id))
  const fuer = variante.fuer
  if (fuer !== 'standard') return anwesend.filter((tn) => fuer.includes(tn.personId))

  const mitZweitgericht = new Set(slot.varianten.flatMap((v) => (v.fuer === 'standard' ? [] : v.fuer)))
  return anwesend.filter((tn) => !mitZweitgericht.has(tn.personId))
}

/** Portionen einer Variante = Summe der Portionsfaktoren ihrer Teilnehmer (Konzept 7.1) */
export function portionen(trip: Trip, slot: Slot, variante: Variante): number {
  return teilnehmerDerVariante(trip, slot, variante).reduce((summe, tn) => summe + tn.portionsfaktor, 0)
}
