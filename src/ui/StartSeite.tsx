import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { db } from '../db/datenbank'
import { dupliziereTrip } from '../logic/trip'
import type { Trip } from '../logic/typen'
import { findeVorlage } from '../logic/vorlagen'
import { formatZeitraum } from './datum'

export function StartSeite() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // Neueste Trips zuerst
  const trips = useLiveQuery(() => db.trips.orderBy('startdatum').reverse().toArray())

  async function duplizieren(trip: Trip) {
    const kopie = dupliziereTrip(trip, t('start.kopieName', { name: trip.name }))
    await db.trips.add(kopie)
    navigate(`/trips/${kopie.id}/trip`)
  }

  async function loeschen(trip: Trip) {
    if (!window.confirm(t('start.loeschenFrage', { name: trip.name }))) return
    await db.trips.delete(trip.id)
  }

  return (
    <>
      <header className="kopf">
        <h1>{t('app.name')}</h1>
        <p>{t('app.untertitel')}</p>
      </header>
      <main className="inhalt">
        <h2>{t('start.trips')}</h2>
        <Link className="knopf" to="/trips/neu">
          {t('start.neuerTrip')}
        </Link>

        {trips?.length === 0 && <p className="hinweis">{t('start.leer')}</p>}

        {trips?.map((trip) => {
          const vorlage = findeVorlage(trip.vorlage)
          return (
            <article key={trip.id} className="karte trip-karte">
              <Link className="trip-link" to={`/trips/${trip.id}/trip`}>
                <span className="trip-symbol" aria-hidden="true">
                  {vorlage.symbol}
                </span>
                <span>
                  <span className="eintrag-titel">{trip.name}</span>
                  <span className="eintrag-unterzeile">
                    {formatZeitraum(trip.startdatum, trip.anzahlTage)} · {t('start.tage', { count: trip.anzahlTage })}
                    {' · '}
                    {t('start.personen', { count: trip.teilnehmer.length })}
                  </span>
                </span>
              </Link>
              <div className="trip-aktionen">
                <button type="button" className="zweitrangig" onClick={() => duplizieren(trip)}>
                  {t('start.duplizieren')}
                </button>
                <button type="button" className="gefahr" onClick={() => loeschen(trip)}>
                  {t('allgemein.loeschen')}
                </button>
              </div>
            </article>
          )
        })}

        <nav className="kacheln">
          <Link className="kachel" to="/rezepte">
            {t('start.rezepte')}
          </Link>
          <Link className="kachel" to="/personen">
            {t('start.personenKachel')}
          </Link>
          <Link className="kachel" to="/zutaten">
            {t('start.zutaten')}
          </Link>
          <Link className="kachel" to="/einstellungen">
            {t('start.einstellungen')}
          </Link>
        </nav>
      </main>
    </>
  )
}
