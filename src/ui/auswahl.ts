import type {
  Ernaehrung,
  Kuehlschrank,
  RezeptKategorie,
  RezeptMerkmal,
  Unvertraeglichkeit,
} from '../logic/typen'

// Auswahllisten in der Reihenfolge, in der sie in der Oberfläche erscheinen
export const KATEGORIEN: RezeptKategorie[] = ['fruehstueck', 'hauptgericht', 'beilage', 'salat', 'snack']
export const ERNAEHRUNGSSTUFEN: Ernaehrung[] = ['vegan', 'vegetarisch', 'pescetarisch', 'alles']
export const MERKMALE: RezeptMerkmal[] = ['glutenfrei', 'laktosefrei', 'nussfrei', 'kalt', 'bordkuechentauglich']
export const UNVERTRAEGLICHKEITEN: Unvertraeglichkeit[] = ['glutenfrei', 'laktosefrei', 'nussfrei']
export const KUEHLSCHRAENKE: Kuehlschrank[] = ['keiner', 'klein', 'mittel']
