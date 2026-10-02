import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { db } from '../db/datenbank'
import { ladeEinstellungen } from '../db/sicherung'
import { MAX_TAGE, erstelleTrip, pruefeTripEingabe, type TripFehler } from '../logic/trip'
import { TRIP_VORLAGEN } from '../logic/vorlagen'
import { heute } from './datum'
import { Seite } from './Seite'
import { Zaehler } from './Zaehler'

export function TripAnlegen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [vorlageId, setVorlageId] = useState(TRIP_VORLAGEN[0].id)
  const [name, setName] = useState('')
  const [startdatum, setStartdatum] = useState(heute)
  const [anzahlTage, setAnzahlTage] = useState(3)
  const [fehler, setFehler] = useState<TripFehler[]>([])

  async function anlegen(ereignis: FormEvent) {
    ereignis.preventDefault()
    const eingabe = { name, vorlageId, startdatum, anzahlTage }
    const gefunden = pruefeTripEingabe(eingabe)
    setFehler(gefunden)
    if (gefunden.length > 0) return

    const einstellungen = await ladeEinstellungen(db)
    const trip = erstelleTrip(eingabe, {
      grundausstattung: einstellungen.standardGrundausstattung,
      ersterTerminName: t('einkauf.ersterTermin'),
    })
    await db.trips.add(trip)
    // Weiter zu den Teilnehmern (Konzept Kapitel 3)
    navigate(`/trips/${trip.id}/trip`, { replace: true })
  }

  return (
    <Seite titel={t('trip.neuTitel')} zurueck="/">
      <form className="formular" onSubmit={anlegen} noValidate>
        <fieldset className="feldgruppe">
          <legend>{t('trip.vorlageWaehlen')}</legend>
          {TRIP_VORLAGEN.map((v) => (
            <label key={v.id} className="haken auswahl">
              <input type="radio" name="vorlage" checked={vorlageId === v.id} onChange={() => setVorlageId(v.id)} />
              <span>
                <strong>
                  {v.symbol} {t(`vorlage.${v.id}`)}
                </strong>
                <small>{t(`vorlage.${v.id}Text`)}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="feld">
          <span>{t('trip.name')}</span>
          <input
            type="text"
            value={name}
            placeholder={t('trip.namePlatzhalter')}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="feld">
          <span>{t('trip.startdatum')}</span>
          <input type="date" value={startdatum} onChange={(e) => setStartdatum(e.target.value)} />
        </label>

        <div className="feld">
          <span>{t('trip.anzahlTage')}</span>
          <Zaehler
            wert={anzahlTage}
            min={1}
            max={MAX_TAGE}
            onAendern={setAnzahlTage}
            wenigerText={t('trip.tagWeniger')}
            mehrText={t('trip.tagMehr')}
          />
        </div>

        {fehler.length > 0 && (
          <ul className="meldung fehler" role="alert">
            {fehler.map((f) => (
              <li key={f}>{t(`trip.fehler.${f}`)}</li>
            ))}
          </ul>
        )}

        <div className="knoepfe">
          <button type="submit">{t('trip.anlegen')}</button>
        </div>
      </form>
    </Seite>
  )
}
