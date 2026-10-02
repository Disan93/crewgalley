import type { Trip } from '../logic/typen'
import { db } from './datenbank'

/** Speichert einen geänderten Trip sofort */
export async function speichereTrip(trip: Trip): Promise<void> {
  await db.trips.put({ ...trip, updatedAt: new Date().toISOString() })
}
