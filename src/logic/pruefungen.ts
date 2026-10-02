import { teilnehmerDerVariante } from './mengen'
import type { Ernaehrung, Person, Rezept, Slot, Trip, TripEigenschaften } from './typen'

// Prüfungen und Hinweise (Konzept Kapitel 8). Hinweise blenden nie etwas aus, sie warnen nur.

/** Rangfolge: vegan < vegetarisch < pescetarisch < alles (Konzept 8.1) */
const RANG: Record<Ernaehrung, number> = { vegan: 0, vegetarisch: 1, pescetarisch: 2, alles: 3 }

type RezeptKost = Pick<Rezept, 'ernaehrungsstufe' | 'merkmale'>
type PersonKost = Pick<Person, 'ernaehrung' | 'unvertraeglichkeiten'>

/**
 * Ein Rezept passt, wenn seine Ernährungsstufe höchstens die der Person ist und
 * alle Unverträglichkeiten der Person als Merkmal am Rezept stehen.
 */
export function passtFuer(rezept: RezeptKost, person: PersonKost): boolean {
  return (
    RANG[rezept.ernaehrungsstufe] <= RANG[person.ernaehrung] &&
    person.unvertraeglichkeiten.every((u) => rezept.merkmale.includes(u))
  )
}

export function passtNichtFuer<P extends PersonKost>(rezept: RezeptKost, personen: P[]): P[] {
  return personen.filter((p) => !passtFuer(rezept, p))
}

export type KuechenGrund = 'flammen' | 'ofen' | 'grill'

/** Was fehlt der Küche für dieses Rezept? (Konzept 8.2) */
export function kuechenGruende(
  rezept: Pick<Rezept, 'flammen' | 'brauchtOfen' | 'brauchtGrill'>,
  kueche: TripEigenschaften['kueche'],
): KuechenGrund[] {
  const gruende: KuechenGrund[] = []
  if (rezept.flammen > kueche.flammen) gruende.push('flammen')
  if (rezept.brauchtOfen && !kueche.ofen) gruende.push('ofen')
  if (rezept.brauchtGrill && !kueche.grill) gruende.push('grill')
  return gruende
}

export interface RezeptHinweis {
  varianteId: string
  rezeptId: string
  /** IDs der Personen dieser Variante, für die das Rezept nicht passt */
  passtNichtFuer: string[]
  kueche: KuechenGrund[]
}

export interface SlotHinweise {
  /** nur Rezepte, zu denen es etwas zu melden gibt */
  rezepte: RezeptHinweis[]
  /** Summe der Flammen aller Rezepte übersteigt die Flammenzahl */
  nacheinander: boolean
}

/** Alle Ernährungs- und Küchenhinweise einer Mahlzeit */
export function slotHinweise(trip: Trip, slot: Slot, rezepte: Rezept[], personen: Person[]): SlotHinweise {
  const { kueche, kuechenpruefung } = trip.eigenschaften
  const hinweise: RezeptHinweis[] = []
  let flammenSumme = 0

  for (const variante of slot.varianten) {
    const esser = new Set(teilnehmerDerVariante(trip, slot, variante).map((tn) => tn.personId))
    const essendePersonen = personen.filter((p) => esser.has(p.id))
    for (const rezeptId of variante.rezeptIds) {
      const rezept = rezepte.find((r) => r.id === rezeptId)
      if (!rezept) continue
      flammenSumme += rezept.flammen
      const hinweis: RezeptHinweis = {
        varianteId: variante.id,
        rezeptId,
        passtNichtFuer: passtNichtFuer(rezept, essendePersonen).map((p) => p.id),
        kueche: kuechenpruefung ? kuechenGruende(rezept, kueche) : [],
      }
      if (hinweis.passtNichtFuer.length > 0 || hinweis.kueche.length > 0) hinweise.push(hinweis)
    }
  }
  return { rezepte: hinweise, nacheinander: kuechenpruefung && flammenSumme > kueche.flammen }
}
