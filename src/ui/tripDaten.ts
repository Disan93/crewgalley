import { useLiveQuery } from 'dexie-react-hooks'
import type { TFunction } from 'i18next'
import { db } from '../db/datenbank'
import type { SlotHinweise } from '../logic/pruefungen'
import { KASSE } from '../logic/kosten'
import {
  ABTEILUNGEN,
  type AbteilungId,
  type Person,
  type Rezept,
  type Trip,
  type Zahler,
  type Zutat,
} from '../logic/typen'
import { formatEuro, formatZahl } from '../logic/zahlen'

export interface TripDaten {
  trip: Trip
  rezepte: Rezept[]
  personen: Person[]
  zutaten: Zutat[]
  abteilungen: readonly AbteilungId[]
}

/** Lädt einen Trip samt allem, was seine Bildschirme brauchen. undefined = lädt noch, null = Trip nicht gefunden */
export function useTripDaten(id: string | undefined): TripDaten | null | undefined {
  return useLiveQuery(async () => {
    const trip = id ? await db.trips.get(id) : undefined
    if (!trip) return null
    return {
      trip,
      rezepte: await db.rezepte.toArray(),
      personen: await db.personen.toArray(),
      zutaten: await db.zutaten.toArray(),
      abteilungen: (await db.einstellungen.get('app'))?.abteilungsReihenfolge ?? ABTEILUNGEN,
    }
  }, [id])
}

/** "12,50 €"; mit Vorzeichen "+12,50 €" bzw. "−12,50 €" */
export function geld(cent: number, mitVorzeichen = false): string {
  const betrag = `${formatEuro(Math.abs(cent))} €`
  if (cent < 0) return `−${betrag}`
  return mitVorzeichen && cent > 0 ? `+${betrag}` : betrag
}

/** Name einer Person oder "Bordkasse" */
export function zahlerName(zahler: Zahler, daten: TripDaten, t: TFunction): string {
  return zahler === KASSE ? t('kosten.kasse') : namen([zahler], daten.personen)
}

/** "962,5 g", "3 Stk." */
export function mengeText(menge: number, zutat: Zutat, t: TFunction): string {
  return `${formatZahl(menge)} ${t(`einheit.${zutat.einheit}`)}`
}

export function namen(ids: string[], liste: { id: string; name: string }[]): string {
  return ids.map((id) => liste.find((e) => e.id === id)?.name ?? '?').join(', ')
}

/** "1 Portion", "6,5 Portionen" */
export function portionenText(anzahl: number, t: TFunction): string {
  return anzahl === 1 ? t('plan.portion') : t('plan.portionen', { n: formatZahl(anzahl) })
}

/** Hinweise einer Mahlzeit als fertige Sätze */
export function hinweisTexte(hinweise: SlotHinweise, daten: TripDaten, t: TFunction): string[] {
  const texte: string[] = []
  for (const h of hinweise.rezepte) {
    const rezept = daten.rezepte.find((r) => r.id === h.rezeptId)
    if (!rezept) continue
    if (h.passtNichtFuer.length > 0) {
      texte.push(t('plan.passtNicht', { rezept: rezept.name, personen: namen(h.passtNichtFuer, daten.personen) }))
    }
    if (h.kueche.includes('flammen')) {
      texte.push(
        t('plan.kuecheFlammen', {
          rezept: rezept.name,
          n: rezept.flammen,
          vorhanden: daten.trip.eigenschaften.kueche.flammen,
        }),
      )
    }
    if (h.kueche.includes('ofen')) texte.push(t('plan.kuecheOfen', { rezept: rezept.name }))
    if (h.kueche.includes('grill')) texte.push(t('plan.kuecheGrill', { rezept: rezept.name }))
  }
  if (hinweise.nacheinander) texte.push(t('plan.nacheinander'))
  return texte
}
