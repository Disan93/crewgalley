import { ShoppingCart, SlidersHorizontal, UtensilsCrossed, Wallet, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, useParams } from 'react-router'
import { EinkaufReiter } from './EinkaufReiter'
import { KostenReiter } from './KostenReiter'
import { PlanReiter } from './PlanReiter'
import { Seite } from './Seite'
import { useTripDaten } from './tripDaten'
import { TripReiter } from './TripReiter'

const REITER = ['plan', 'einkauf', 'kosten', 'trip'] as const
type Reiter = (typeof REITER)[number]

const REITER_SYMBOLE: Record<Reiter, LucideIcon> = {
  plan: UtensilsCrossed,
  einkauf: ShoppingCart,
  kosten: Wallet,
  trip: SlidersHorizontal,
}

/** Rahmen eines geöffneten Trips: Kopfzeile, Inhalt des gewählten Reiters, untere Navigation */
export function TripRahmen() {
  const { t } = useTranslation()
  const { id, reiter } = useParams()
  const daten = useTripDaten(id)

  if (daten === undefined) return null
  if (daten === null) {
    return (
      <Seite titel={t('start.trips')} zurueck="/">
        <p className="hinweis">{t('allgemein.nichtGefunden')}</p>
      </Seite>
    )
  }

  const { trip } = daten
  const aktiv: Reiter = REITER.find((r) => r === reiter) ?? 'plan'

  return (
    <>
      {/* Im Menü steht der Trip-Name groß in der Kopfkarte */}
      <Seite titel={trip.name} zurueck="/" key={aktiv} titelVersteckt={aktiv === 'plan'}>
        {aktiv === 'trip' && <TripReiter daten={daten} />}
        {aktiv === 'plan' && <PlanReiter daten={daten} />}
        {aktiv === 'einkauf' && <EinkaufReiter daten={daten} />}
        {aktiv === 'kosten' && <KostenReiter daten={daten} />}
      </Seite>
      <nav className="reiterleiste">
        {REITER.map((r) => {
          const Symbol = REITER_SYMBOLE[r]
          return (
            <NavLink key={r} to={`/trips/${trip.id}/${r}`} replace>
              <Symbol size={22} aria-hidden="true" />
              {t(`trip.reiter.${r}`)}
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
