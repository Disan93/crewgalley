import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { db } from '../db/datenbank'
import { erstelleTripDatei, importiereTrip, tripVorhanden } from '../db/tripdatei'
import { dupliziereTrip } from '../logic/trip'
import { leseTripDatei, tripDateiname } from '../logic/tripdatei'
import type { Trip } from '../logic/typen'
import { findeVorlage } from '../logic/vorlagen'
import { teileDatei } from './datei'
import { formatZeitraum } from './datum'

interface Meldung {
  art: 'ok' | 'fehler'
  text: string
}

export function StartSeite() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dateiwahl = useRef<HTMLInputElement>(null)
  const [meldung, setMeldung] = useState<Meldung | null>(null)
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

  async function exportieren(trip: Trip) {
    const dateiname = tripDateiname(trip.name)
    const ergebnis = await teileDatei(dateiname, JSON.stringify(await erstelleTripDatei(db, trip), null, 2))
    setMeldung(ergebnis === 'heruntergeladen' ? { art: 'ok', text: t('start.exportiert', { dateiname }) } : null)
  }

  async function importieren(ereignis: ChangeEvent<HTMLInputElement>) {
    const datei = ereignis.target.files?.[0]
    // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
    ereignis.target.value = ''
    if (!datei) return

    const ergebnis = leseTripDatei(await datei.text())
    if (!ergebnis.ok) {
      setMeldung({ art: 'fehler', text: t(`start.importFehler.${ergebnis.fehler}`) })
      return
    }
    const { trip } = ergebnis.datei
    if ((await tripVorhanden(db, trip.id)) && !window.confirm(t('start.importErsetzenFrage', { name: trip.name }))) {
      return
    }
    try {
      const neu = await importiereTrip(db, ergebnis.datei)
      setMeldung({ art: 'ok', text: t('start.importiert', { name: trip.name, ...neu }) })
    } catch {
      setMeldung({ art: 'fehler', text: t('start.importFehler.einspielen') })
    }
  }

  return (
    <>
      <header className="kopf">
        <h1>{t('app.name')}</h1>
        <p>{t('app.untertitel')}</p>
      </header>
      <main className="inhalt">
        <h2>{t('start.trips')}</h2>
        <div className="knoepfe ohne-abstand">
          <Link className="knopf" to="/trips/neu">
            {t('start.neuerTrip')}
          </Link>
          <button type="button" className="zweitrangig" onClick={() => dateiwahl.current?.click()}>
            {t('start.importieren')}
          </button>
          <input ref={dateiwahl} type="file" accept="application/json,.json" hidden onChange={importieren} />
        </div>

        {meldung && (
          <p className={`meldung ${meldung.art}`} role="status">
            {meldung.text}
          </p>
        )}

        {trips?.length === 0 && <p className="hinweis">{t('start.leer')}</p>}

        {trips?.map((trip) => {
          const vorlage = findeVorlage(trip.vorlage)
          return (
            <article key={trip.id} className="karte trip-karte">
              <Link className="trip-link" to={`/trips/${trip.id}/plan`}>
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
                <button type="button" className="zweitrangig" onClick={() => exportieren(trip)}>
                  {t('start.exportieren')}
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
