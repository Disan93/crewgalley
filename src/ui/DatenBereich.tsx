import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '../db/datenbank'
import { erstelleSicherung, ladeEinstellungen, merkeSicherung, stelleWiederHer } from '../db/sicherung'
import { leseSicherung, sicherungFaellig } from '../logic/sicherung'
import { ladeHerunter } from './datei'

interface Meldung {
  art: 'ok' | 'fehler'
  text: string
}

function datumText(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function DatenBereich() {
  const { t } = useTranslation()
  const dateiwahl = useRef<HTMLInputElement>(null)
  const [meldung, setMeldung] = useState<Meldung | null>(null)
  const [dauerhaft, setDauerhaft] = useState<boolean | null>(null)

  // Wird automatisch neu berechnet, sobald sich etwas in der Datenbank ändert
  const stand = useLiveQuery(async () => {
    const anzahl = {
      trips: await db.trips.count(),
      personen: await db.personen.count(),
      rezepte: await db.rezepte.count(),
      zutaten: await db.zutaten.count(),
    }
    // Hier darf nur gelesen werden; angelegt werden die Einstellungen beim Start (siehe unten)
    const einstellungen = await db.einstellungen.get('app')
    if (!einstellungen) return null
    const hatDaten = Object.values(anzahl).some((n) => n > 0)
    return { anzahl, einstellungen, faellig: sicherungFaellig(einstellungen, hatDaten) }
  })

  useEffect(() => {
    void ladeEinstellungen(db)
    // Bittet den Browser, die Daten nicht von sich aus zu löschen (Konzept 10.1)
    navigator.storage
      ?.persist?.()
      .then(setDauerhaft)
      .catch(() => setDauerhaft(false))
  }, [])

  async function sichern() {
    try {
      const sicherung = await erstelleSicherung(db)
      const dateiname = `crewgalley-sicherung-${sicherung.erstelltAm.slice(0, 10)}.json`
      ladeHerunter(dateiname, JSON.stringify(sicherung, null, 2))
      await merkeSicherung(db, sicherung.erstelltAm)
      setMeldung({ art: 'ok', text: t('daten.gesichert', { dateiname }) })
    } catch {
      setMeldung({ art: 'fehler', text: t('daten.fehler.sichern') })
    }
  }

  async function wiederherstellen(ereignis: ChangeEvent<HTMLInputElement>) {
    const datei = ereignis.target.files?.[0]
    // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
    ereignis.target.value = ''
    if (!datei) return

    const ergebnis = leseSicherung(await datei.text())
    if (!ergebnis.ok) {
      setMeldung({ art: 'fehler', text: t(`daten.fehler.${ergebnis.fehler}`) })
      return
    }
    const { sicherung } = ergebnis
    const frage = t('daten.ersetzenFrage', {
      datum: datumText(sicherung.erstelltAm),
      trips: sicherung.daten.trips.length,
      personen: sicherung.daten.personen.length,
      rezepte: sicherung.daten.rezepte.length,
    })
    if (!window.confirm(frage)) return

    try {
      await stelleWiederHer(db, sicherung)
      setMeldung({ art: 'ok', text: t('daten.wiederhergestellt') })
    } catch {
      setMeldung({ art: 'fehler', text: t('daten.fehler.einspielen') })
    }
  }

  if (!stand) return null
  const { anzahl, einstellungen, faellig } = stand

  return (
    <section className="karte">
      <h2>{t('daten.titel')}</h2>

      <dl className="werte">
        <dt>{t('daten.trips')}</dt>
        <dd>{anzahl.trips}</dd>
        <dt>{t('daten.personen')}</dt>
        <dd>{anzahl.personen}</dd>
        <dt>{t('daten.rezepte')}</dt>
        <dd>{anzahl.rezepte}</dd>
        <dt>{t('daten.zutaten')}</dt>
        <dd>{anzahl.zutaten}</dd>
        <dt>{t('daten.letzteSicherung')}</dt>
        <dd>{einstellungen.letzteSicherung ? datumText(einstellungen.letzteSicherung) : t('daten.nie')}</dd>
      </dl>

      {faellig && <p className="meldung warnung">{t('daten.erinnerung')}</p>}
      {dauerhaft === false && <p className="hinweis">{t('daten.nichtDauerhaft')}</p>}

      <div className="knoepfe">
        <button type="button" onClick={sichern}>
          {t('daten.sichern')}
        </button>
        <button type="button" className="zweitrangig" onClick={() => dateiwahl.current?.click()}>
          {t('daten.wiederherstellen')}
        </button>
        <input
          ref={dateiwahl}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={wiederherstellen}
        />
      </div>

      {meldung && (
        <p className={`meldung ${meldung.art}`} role="status">
          {meldung.text}
        </p>
      )}
    </section>
  )
}
