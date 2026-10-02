import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { NavLink, useParams } from 'react-router'
import { db } from '../db/datenbank'
import { Seite } from './Seite'
import { TripReiter } from './TripReiter'

const REITER = ['plan', 'einkauf', 'kosten', 'trip'] as const
type Reiter = (typeof REITER)[number]

/** Rahmen eines geöffneten Trips: Kopfzeile, Inhalt des gewählten Reiters, untere Leiste */
export function TripRahmen() {
  const { t } = useTranslation()
  const { id, reiter } = useParams()
  // null = nicht gefunden, undefined = lädt noch
  const trip = useLiveQuery(async () => (id ? ((await db.trips.get(id)) ?? null) : null), [id])

  if (trip === undefined) return null
  if (trip === null) {
    return (
      <Seite titel={t('start.trips')} zurueck="/">
        <p className="hinweis">{t('allgemein.nichtGefunden')}</p>
      </Seite>
    )
  }

  const aktiv: Reiter = REITER.find((r) => r === reiter) ?? 'trip'

  return (
    <>
      <Seite titel={trip.name} zurueck="/" key={aktiv}>
        {aktiv === 'trip' ? <TripReiter trip={trip} /> : <p className="hinweis">{t(`trip.folgt.${aktiv}`)}</p>}
      </Seite>
      <nav className="reiterleiste">
        {REITER.map((r) => (
          <NavLink key={r} to={`/trips/${trip.id}/${r}`} replace>
            {t(`trip.reiter.${r}`)}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
