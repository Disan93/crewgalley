import { baueTripDatei, type TripDatei } from '../logic/tripdatei'
import type { Trip } from '../logic/typen'
import type { CrewGalleyDB } from './datenbank'

export async function erstelleTripDatei(db: CrewGalleyDB, trip: Trip, jetzt: Date = new Date()): Promise<TripDatei> {
  return baueTripDatei(
    trip,
    {
      rezepte: await db.rezepte.toArray(),
      zutaten: await db.zutaten.toArray(),
      personen: await db.personen.toArray(),
    },
    jetzt,
  )
}

export async function tripVorhanden(db: CrewGalleyDB, id: string): Promise<boolean> {
  return (await db.trips.get(id)) !== undefined
}

export interface ImportErgebnis {
  /** Wie viele Rezepte, Zutaten und Personen neu angelegt wurden */
  rezepte: number
  zutaten: number
  personen: number
}

/**
 * Spielt eine Trip-Datei ein. Rezepte, Zutaten und Personen, deren ID es schon gibt,
 * bleiben unverändert und werden nicht doppelt angelegt (Konzept 10.2).
 * Ein Trip mit gleicher ID wird ersetzt.
 */
export async function importiereTrip(db: CrewGalleyDB, datei: TripDatei): Promise<ImportErgebnis> {
  return db.transaction('rw', db.trips, db.rezepte, db.zutaten, db.personen, async () => {
    const rezeptIds = new Set(await db.rezepte.toCollection().primaryKeys())
    const zutatIds = new Set(await db.zutaten.toCollection().primaryKeys())
    const personIds = new Set(await db.personen.toCollection().primaryKeys())
    const rezepte = datei.rezepte.filter((r) => !rezeptIds.has(r.id))
    const zutaten = datei.zutaten.filter((z) => !zutatIds.has(z.id))
    const personen = datei.personen.filter((p) => !personIds.has(p.id))

    await db.rezepte.bulkAdd(rezepte)
    await db.zutaten.bulkAdd(zutaten)
    await db.personen.bulkAdd(personen)
    await db.trips.put(datei.trip)
    return { rezepte: rezepte.length, zutaten: zutaten.length, personen: personen.length }
  })
}
