import type { CrewGalleyDB } from './datenbank'
import { ladeEinstellungen } from './sicherung'
import { ladeStartdaten } from './startdaten'

/** Wird einmal beim App-Start aufgerufen */
export async function starteDatenbank(db: CrewGalleyDB): Promise<void> {
  await ladeEinstellungen(db)
  await ladeStartdaten(db)
  // Bittet den Browser, die Daten nicht von sich aus zu löschen (Konzept 10.1)
  await navigator.storage?.persist?.().catch(() => false)
}
