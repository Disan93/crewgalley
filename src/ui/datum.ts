import { tagDatum } from '../logic/trip'

// Trip-Tage sind reine Kalendertage ohne Uhrzeit; deshalb wird überall in UTC formatiert.

/** "Sa., 03.10." */
export function formatTag(startdatum: string, tag: number): string {
  return tagDatum(startdatum, tag).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  })
}

/** "02.10.2026 – 04.10.2026" bzw. nur ein Datum bei eintägigen Trips */
export function formatZeitraum(startdatum: string, anzahlTage: number): string {
  const format = (tag: number) =>
    tagDatum(startdatum, tag).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    })
  return anzahlTage === 1 ? format(1) : `${format(1)} – ${format(anzahlTage)}`
}

/** "2026-10-02" → "02.10.2026" */
export function formatDatum(datum: string): string {
  const [jahr, monat, tag] = datum.split('-')
  return `${tag}.${monat}.${jahr}`
}

/** Heutiges Datum am Gerät als "JJJJ-MM-TT" */
export function heute(): string {
  const d = new Date()
  const zwei = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`
}
