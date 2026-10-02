import { START_GRUNDAUSSTATTUNG, START_REZEPTE, START_ZUTATEN } from '../daten/startdaten'
import type { CrewGalleyDB } from './datenbank'
import { ladeEinstellungen } from './sicherung'

/**
 * Bringt die mitgelieferten Daten in die Datenbank. Läuft bei jedem App-Start:
 * - Rezepte werden immer auf den mitgelieferten Stand gebracht (sie sind nicht änderbar).
 * - Zutaten werden nur ergänzt, damit eigene Änderungen (z. B. Preise) erhalten bleiben.
 * - Die Standard-Grundausstattung wird nur ein einziges Mal übernommen.
 */
export async function ladeStartdaten(db: CrewGalleyDB): Promise<void> {
  await db.transaction('rw', db.zutaten, db.rezepte, db.einstellungen, async () => {
    const vorhanden = new Set(await db.zutaten.toCollection().primaryKeys())
    await db.zutaten.bulkAdd(START_ZUTATEN.filter((z) => !vorhanden.has(z.id)))
    await db.rezepte.bulkPut(START_REZEPTE)

    const einstellungen = await ladeEinstellungen(db)
    if (!einstellungen.startGrundausstattungGeladen) {
      await db.einstellungen.update('app', {
        standardGrundausstattung: START_GRUNDAUSSTATTUNG,
        startGrundausstattungGeladen: true,
      })
    }
  })
}
