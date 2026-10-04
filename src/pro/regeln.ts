import { tagDatum } from '../logic/trip'
import type { Trip } from '../logic/typen'

// Regeln des Pro-Upgrades als reine Funktionen (ohne Browser, gut testbar).

/**
 * Alle Pro-Funktionen. "vorhanden: false" heißt: Die Funktion gibt es in der App
 * noch nicht. Sie ist als Sperre vorgesehen, wird aber auf dem Pro-Bildschirm
 * nicht beworben, solange es sie nicht gibt.
 */
export const PRO_FUNKTIONEN = [
  { id: 'unbegrenzteTrips', vorhanden: true },
  { id: 'duplizieren', vorhanden: true },
  { id: 'bordkasse', vorhanden: true },
  { id: 'eigeneRezepte', vorhanden: true },
  { id: 'pdfExport', vorhanden: false },
  { id: 'kochdienste', vorhanden: false },
] as const

export type ProFunktion = (typeof PRO_FUNKTIONEN)[number]['id']

/** Entwickler-Schalter: normal = wie beim Kunden, pro = Pro vortäuschen, kostenlos = Sperren erzwingen */
export type DevModus = 'normal' | 'pro' | 'kostenlos'

export interface ProZustand {
  /** Der Einmalkauf wurde bei Google Play gefunden */
  gekauft: boolean
  dev: DevModus
}

export interface Umgebung {
  /** BILLING_ENABLED aus config.ts */
  billingAktiv: boolean
  /** true nur bei "npm run dev"; in der veröffentlichten App immer false */
  entwicklung: boolean
}

function devModus(zustand: ProZustand, umgebung: Umgebung): DevModus {
  // Außerhalb der Entwicklung wird der Entwickler-Schalter ignoriert, egal was gespeichert ist
  return umgebung.entwicklung ? zustand.dev : 'normal'
}

export function istPro(zustand: ProZustand, umgebung: Umgebung): boolean {
  return zustand.gekauft || devModus(zustand, umgebung) === 'pro'
}

/** Solange der Kauf nicht möglich ist, wird auch nichts gesperrt */
export function sperrenAktiv(zustand: ProZustand, umgebung: Umgebung): boolean {
  return umgebung.billingAktiv || devModus(zustand, umgebung) === 'kostenlos'
}

/** Darf diese Person eine Pro-Funktion benutzen? */
export function istFreigeschaltet(zustand: ProZustand, umgebung: Umgebung): boolean {
  return istPro(zustand, umgebung) || !sperrenAktiv(zustand, umgebung)
}

/** Ein Trip ist abgeschlossen, wenn sein letzter Tag vor heute liegt (heute als "JJJJ-MM-TT") */
export function istAbgeschlossen(trip: Pick<Trip, 'startdatum' | 'anzahlTage'>, heute: string): boolean {
  return tagDatum(trip.startdatum, trip.anzahlTage).toISOString().slice(0, 10) < heute
}

export function aktiveTrips<T extends Pick<Trip, 'startdatum' | 'anzahlTage'>>(trips: T[], heute: string): T[] {
  return trips.filter((t) => !istAbgeschlossen(t, heute))
}

/** Kostenlos: nur so lange neue Trips, bis das Limit aktiver Trips erreicht ist. Abgeschlossene zählen nicht. */
export function darfNeuenTripAnlegen(
  trips: Pick<Trip, 'startdatum' | 'anzahlTage'>[],
  heute: string,
  freigeschaltet: boolean,
  limit: number,
): boolean {
  return freigeschaltet || aktiveTrips(trips, heute).length < limit
}
