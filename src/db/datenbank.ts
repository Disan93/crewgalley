import Dexie, { type EntityTable } from 'dexie'
import type { Einstellungen, Person, Rezept, Trip, Zutat } from '../logic/typen'

/**
 * Die Datenbank im Browser (IndexedDB). Jede Tabelle speichert ganze Objekte;
 * hinter dem Tabellennamen stehen nur die Felder, nach denen gesucht/sortiert wird.
 */
export class CrewGalleyDB extends Dexie {
  personen!: EntityTable<Person, 'id'>
  zutaten!: EntityTable<Zutat, 'id'>
  rezepte!: EntityTable<Rezept, 'id'>
  trips!: EntityTable<Trip, 'id'>
  einstellungen!: EntityTable<Einstellungen, 'id'>

  constructor(name = 'crewgalley') {
    super(name)
    // Entspricht SCHEMA_VERSION 1 (src/logic/sicherung.ts)
    this.version(1).stores({
      personen: 'id, name',
      zutaten: 'id, name',
      rezepte: 'id, name',
      trips: 'id, startdatum',
      einstellungen: 'id',
    })
  }
}

export const db = new CrewGalleyDB()
