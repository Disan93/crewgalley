import type { TripEigenschaften } from './typen'

/**
 * Trip-Vorlagen (Konzept Kapitel 4). Eine Vorlage setzt nur Standardwerte;
 * ein neuer Typ (Camping, Kanu, …) ist nur ein weiterer Eintrag in dieser Liste
 * plus sein Name in der Sprachdatei (vorlage.<id>).
 */
export interface TripVorlage {
  id: string
  symbol: string
  eigenschaften: TripEigenschaften
  aktivfaktor: number
}

export const TRIP_VORLAGEN: TripVorlage[] = [
  {
    id: 'huette',
    symbol: '🏠',
    eigenschaften: {
      kueche: { flammen: 4, ofen: true, kuehlschrank: 'mittel', grill: false },
      kuechenpruefung: false,
      haltbarkeitspruefung: false,
      wasserberechnung: false,
    },
    aktivfaktor: 1,
  },
  {
    id: 'segeln',
    symbol: '⛵',
    eigenschaften: {
      kueche: { flammen: 2, ofen: false, kuehlschrank: 'klein', grill: false },
      kuechenpruefung: true,
      haltbarkeitspruefung: true,
      wasserberechnung: true,
    },
    aktivfaktor: 1,
  },
  {
    id: 'sonstiges',
    symbol: '🧭',
    eigenschaften: {
      kueche: { flammen: 4, ofen: true, kuehlschrank: 'mittel', grill: false },
      kuechenpruefung: false,
      haltbarkeitspruefung: false,
      wasserberechnung: false,
    },
    aktivfaktor: 1,
  },
]

/** Unbekannte IDs (z. B. aus einer neueren App-Version) fallen auf "Sonstiges" zurück */
export function findeVorlage(id: string): TripVorlage {
  return TRIP_VORLAGEN.find((v) => v.id === id) ?? TRIP_VORLAGEN[TRIP_VORLAGEN.length - 1]
}
