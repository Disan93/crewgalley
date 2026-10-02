import type { Ernaehrung, RezeptKategorie, RezeptMerkmal } from '../logic/typen'

// Auswahllisten in der Reihenfolge, in der sie in der Oberfläche erscheinen
export const KATEGORIEN: RezeptKategorie[] = ['fruehstueck', 'hauptgericht', 'beilage', 'salat', 'snack']
export const ERNAEHRUNGSSTUFEN: Ernaehrung[] = ['vegan', 'vegetarisch', 'pescetarisch', 'alles']
export const MERKMALE: RezeptMerkmal[] = ['glutenfrei', 'laktosefrei', 'nussfrei', 'kalt', 'bordkuechentauglich']
