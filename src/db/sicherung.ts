import { baueSicherung, standardEinstellungen, type Sicherung } from '../logic/sicherung'
import type { Einstellungen } from '../logic/typen'
import type { CrewGalleyDB } from './datenbank'

/** Liest die Einstellungen; beim allerersten Start werden die Standardwerte angelegt */
export async function ladeEinstellungen(
  db: CrewGalleyDB,
  jetzt: Date = new Date(),
): Promise<Einstellungen> {
  return db.transaction('rw', db.einstellungen, async () => {
    const vorhanden = await db.einstellungen.get('app')
    if (vorhanden) return vorhanden
    const neu = standardEinstellungen(jetzt)
    await db.einstellungen.add(neu)
    return neu
  })
}

/** Liest den gesamten Datenbestand und verpackt ihn als Sicherung */
export async function erstelleSicherung(
  db: CrewGalleyDB,
  jetzt: Date = new Date(),
): Promise<Sicherung> {
  return db.transaction('rw', db.tables, async () => {
    const daten = {
      personen: await db.personen.toArray(),
      zutaten: await db.zutaten.toArray(),
      rezepte: await db.rezepte.toArray(),
      trips: await db.trips.toArray(),
      einstellungen: await ladeEinstellungen(db, jetzt),
    }
    return baueSicherung(daten, jetzt)
  })
}

/** Merkt sich den Zeitpunkt der letzten Sicherung (für die 30-Tage-Erinnerung) */
export async function merkeSicherung(db: CrewGalleyDB, zeitpunkt: string): Promise<void> {
  await db.transaction('rw', db.einstellungen, async () => {
    await ladeEinstellungen(db)
    await db.einstellungen.update('app', { letzteSicherung: zeitpunkt })
  })
}

/** Ersetzt den gesamten Datenbestand durch den Inhalt der Sicherung */
export async function stelleWiederHer(db: CrewGalleyDB, sicherung: Sicherung): Promise<void> {
  const { personen, zutaten, rezepte, trips, einstellungen } = sicherung.daten
  // Eine Transaktion: entweder klappt alles, oder der alte Stand bleibt erhalten
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((tabelle) => tabelle.clear()))
    await db.personen.bulkAdd(personen)
    await db.zutaten.bulkAdd(zutaten)
    await db.rezepte.bulkAdd(rezepte)
    await db.trips.bulkAdd(trips)
    await db.einstellungen.add({ ...einstellungen, letzteSicherung: sicherung.erstelltAm })
  })
}
