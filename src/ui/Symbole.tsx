import { Coffee, Compass, Cookie, House, Sailboat, Salad, Soup, type LucideIcon } from 'lucide-react'
import type { Mahlzeit } from '../logic/typen'

// Linien-Icons (Lucide) für Mahlzeiten und Trip-Vorlagen. Die Farben stehen in index.css.

const MAHLZEIT_SYMBOLE: Record<Mahlzeit, LucideIcon> = {
  fruehstueck: Coffee,
  mittag: Salad,
  abend: Soup,
  snack: Cookie,
}

/** Farbige Kachel mit dem Symbol der Mahlzeit */
export function MahlzeitKachel({ mahlzeit }: { mahlzeit: Mahlzeit }) {
  const Symbol = MAHLZEIT_SYMBOLE[mahlzeit]
  return (
    <span className={`mahl-kachel ${mahlzeit}`} aria-hidden="true">
      <Symbol size={24} />
    </span>
  )
}

const VORLAGE_SYMBOLE: Record<string, LucideIcon> = {
  huette: House,
  segeln: Sailboat,
}

/** Symbol einer Trip-Vorlage; unbekannte Vorlagen bekommen den Kompass */
export function VorlageSymbol({ id, size = 24 }: { id: string; size?: number }) {
  const Symbol = VORLAGE_SYMBOLE[id] ?? Compass
  return <Symbol size={size} aria-hidden="true" />
}
