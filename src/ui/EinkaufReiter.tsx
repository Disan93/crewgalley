import type { TFunction } from 'i18next'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { speichereTrip } from '../db/trips'
import {
  bestaetigeNachkauf,
  einkaufsliste,
  entferneZusatz,
  fuegeZusatzHinzu,
  kostenschaetzung,
  setzeAbgehakt,
  setzeVorhanden,
  setzeZusatzAbgehakt,
  type ListenEintrag,
} from '../logic/einkauf'
import { formatEuro, formatZahl, parseZahl } from '../logic/zahlen'
import { teileText, type TeilenErgebnis } from './teilen'
import { mengeText, namen, type TripDaten } from './tripDaten'

/** "2 × 500 g" bei Packungen, sonst "450 g" */
function kaufText(e: ListenEintrag, t: TFunction): string {
  if (e.packungen !== null && e.zutat.packungsgroesse !== null) {
    return `${e.packungen} × ${mengeText(e.zutat.packungsgroesse, e.zutat, t)}`
  }
  return mengeText(e.kaufMenge, e.zutat, t)
}

function vorhandenText(e: ListenEintrag, daten: TripDaten, t: TFunction): string {
  const menge = mengeText(Math.min(e.vorhanden, e.bedarf), e.zutat, t)
  return e.mitbringerId === null
    ? t('einkauf.habenWir', { menge })
    : t('einkauf.bringtMit', { menge, name: namen([e.mitbringerId], daten.personen) })
}

/** Reiter "Einkauf": zusammengefasste Liste nach Abteilungen (Konzept Kapitel 6 und 7) */
export function EinkaufReiter({ daten }: { daten: TripDaten }) {
  const { t } = useTranslation()
  const { trip, rezepte, zutaten, abteilungen } = daten
  const [offen, setOffen] = useState<ListenEintrag | null>(null)
  const [zusatzName, setZusatzName] = useState('')
  const [teilenMeldung, setTeilenMeldung] = useState<TeilenErgebnis | null>(null)

  const termin = trip.einkaufstermine[0]
  const liste = einkaufsliste(trip, rezepte, zutaten)
  const zuKaufen = liste.filter((e) => e.kaufMenge > 0 || e.abgehakt)
  const vorhanden = liste.filter((e) => e.vorhanden > 0)
  const zusatz = trip.einkaufsstatus.zusatzeintraege.filter((z) => z.terminId === termin.id)
  const schaetzung = kostenschaetzung(trip, liste)

  function zusatzHinzufuegen(ereignis: FormEvent) {
    ereignis.preventDefault()
    if (zusatzName.trim() === '') return
    void speichereTrip(fuegeZusatzHinzu(trip, termin.id, zusatzName))
    setZusatzName('')
  }

  /** Einkaufsliste als Klartext, z. B. für WhatsApp (Konzept 10.3) */
  function alsText(): string {
    const zeilen = [`${t('einkauf.titel')} – ${trip.name}`, termin.name]
    for (const abteilung of abteilungen) {
      const gruppe = zuKaufen.filter((e) => e.zutat.abteilung === abteilung && !e.abgehakt)
      if (gruppe.length === 0) continue
      zeilen.push('', t(`abteilung.${abteilung}`).toUpperCase())
      for (const e of gruppe) zeilen.push(`- ${e.zutat.name}: ${kaufText(e, t)}`)
    }
    const offeneZusatz = zusatz.filter((z) => !z.abgehakt)
    if (offeneZusatz.length > 0) {
      zeilen.push('', t('einkauf.zusatz').toUpperCase())
      for (const z of offeneZusatz) zeilen.push(`- ${z.name}`)
    }
    if (vorhanden.length > 0) {
      zeilen.push('', t('einkauf.vorhanden').toUpperCase())
      for (const e of vorhanden) zeilen.push(`- ${e.zutat.name}: ${vorhandenText(e, daten, t)}`)
    }
    return zeilen.join('\n')
  }

  return (
    <>
      <h2>{termin.name}</h2>

      {liste.length === 0 && <p className="hinweis">{t('einkauf.leer')}</p>}

      {liste.length > 0 && (
        <p className="schaetzung">
          <strong>{t('einkauf.schaetzung', { summe: formatEuro(schaetzung.summe) })}</strong>
          {schaetzung.proPerson && (
            <span>
              {schaetzung.proPerson.von === schaetzung.proPerson.bis
                ? t('einkauf.proPerson', { betrag: formatEuro(schaetzung.proPerson.bis) })
                : t('einkauf.proPersonVonBis', {
                    von: formatEuro(schaetzung.proPerson.von),
                    bis: formatEuro(schaetzung.proPerson.bis),
                  })}
            </span>
          )}
          {schaetzung.ohnePreis > 0 && <span>{t('einkauf.ohnePreis', { count: schaetzung.ohnePreis })}</span>}
        </p>
      )}

      {abteilungen.map((abteilung) => {
        const gruppe = zuKaufen.filter((e) => e.zutat.abteilung === abteilung)
        if (gruppe.length === 0) return null
        return (
          <section key={abteilung}>
            <h3 className="gruppe">{t(`abteilung.${abteilung}`)}</h3>
            {gruppe.map((e) => (
              <div key={e.zutat.id} className={e.abgehakt ? 'kauf-zeile erledigt' : 'kauf-zeile'}>
                <label className="kauf-haken">
                  <input
                    type="checkbox"
                    checked={e.abgehakt}
                    onChange={(ev) => void speichereTrip(setzeAbgehakt(trip, e, ev.target.checked))}
                  />
                  <span>
                    <span className="kauf-kopf">
                      <span className="eintrag-titel">{e.zutat.name}</span>
                      <span className="kauf-menge">
                        {e.abgehakt && e.gekaufteMenge !== null ? mengeText(e.gekaufteMenge, e.zutat, t) : kaufText(e, t)}
                      </span>
                    </span>
                    {!e.abgehakt && (
                      <span className="eintrag-unterzeile">
                        {t('einkauf.bedarf', { menge: mengeText(e.menge, e.zutat, t) })}
                        {e.rest > 0 && ` · ${t('einkauf.rest', { menge: mengeText(e.rest, e.zutat, t) })}`}
                        {e.vorhanden > 0 && ` · ${vorhandenText(e, daten, t)}`}
                      </span>
                    )}
                  </span>
                </label>
                {!e.abgehakt && (
                  <button
                    type="button"
                    className="zweitrangig klein"
                    aria-label={t('einkauf.vorhandenFuer', { name: e.zutat.name })}
                    onClick={() => setOffen(e)}
                  >
                    ⋯
                  </button>
                )}
                {e.nachkaufen > 0 && (
                  <div className="nachkauf">
                    <span className="warnzeile">
                      ⚠ {t('einkauf.nachkaufen', { menge: mengeText(e.nachkaufen, e.zutat, t) })}
                    </span>
                    <button type="button" className="zweitrangig" onClick={() => void speichereTrip(bestaetigeNachkauf(trip, e))}>
                      {t('einkauf.nachgekauft')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )
      })}

      <section>
        <h3 className="gruppe">{t('einkauf.zusatz')}</h3>
        {zusatz.map((z) => (
          <div key={z.id} className={z.abgehakt ? 'kauf-zeile erledigt' : 'kauf-zeile'}>
            <label className="kauf-haken">
              <input
                type="checkbox"
                checked={z.abgehakt}
                onChange={(ev) => void speichereTrip(setzeZusatzAbgehakt(trip, z.id, ev.target.checked))}
              />
              <span className="eintrag-titel">{z.name}</span>
            </label>
            <button
              type="button"
              className="zweitrangig klein"
              aria-label={t('einkauf.zusatzEntfernen', { name: z.name })}
              onClick={() => void speichereTrip(entferneZusatz(trip, z.id))}
            >
              ✕
            </button>
          </div>
        ))}
        <form className="zusatz-form" onSubmit={zusatzHinzufuegen}>
          <input
            type="text"
            value={zusatzName}
            placeholder={t('einkauf.zusatzPlatzhalter')}
            aria-label={t('einkauf.zusatzPlatzhalter')}
            onChange={(e) => setZusatzName(e.target.value)}
          />
          <button type="submit" className="klein" aria-label={t('einkauf.zusatzHinzufuegen')}>
            +
          </button>
        </form>
      </section>

      {vorhanden.length > 0 && (
        <section>
          <h3 className="gruppe">{t('einkauf.vorhanden')}</h3>
          <ul className="liste">
            {vorhanden.map((e) => (
              <li key={e.zutat.id}>
                <button type="button" className="eintrag" onClick={() => setOffen(e)}>
                  <span className="eintrag-titel">{e.zutat.name}</span>
                  <span className="eintrag-unterzeile">{vorhandenText(e, daten, t)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {liste.length > 0 && (
        <div className="knoepfe">
          <button
            type="button"
            onClick={async () => setTeilenMeldung(await teileText(`${t('einkauf.titel')} – ${trip.name}`, alsText()))}
          >
            {t('einkauf.teilen')}
          </button>
        </div>
      )}
      {(teilenMeldung === 'kopiert' || teilenMeldung === 'fehler') && (
        <p className={teilenMeldung === 'kopiert' ? 'meldung ok' : 'meldung fehler'} role="status">
          {t(`einkauf.teilenMeldung.${teilenMeldung}`)}
        </p>
      )}

      {offen && <VorhandenDialog key={offen.zutat.id} eintrag={offen} daten={daten} onSchliessen={() => setOffen(null)} />}
    </>
  )
}

interface VorhandenDialogProps {
  eintrag: ListenEintrag
  daten: TripDaten
  onSchliessen: () => void
}

/** "Haben wir schon / bringt XY mit" für eine Zutat */
function VorhandenDialog({ eintrag, daten, onSchliessen }: VorhandenDialogProps) {
  const { t } = useTranslation()
  const { trip, personen } = daten
  const [menge, setMenge] = useState(eintrag.vorhanden > 0 ? formatZahl(eintrag.vorhanden) : '')
  const [mitbringer, setMitbringer] = useState(eintrag.mitbringerId ?? '')
  const [ungueltig, setUngueltig] = useState(false)
  const einheit = t(`einheit.${eintrag.zutat.einheit}`)

  function speichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    const zahl = menge.trim() === '' ? 0 : parseZahl(menge)
    if (zahl === null) {
      setUngueltig(true)
      return
    }
    void speichereTrip(
      setzeVorhanden(trip, eintrag.terminId, eintrag.zutat.id, zahl, mitbringer === '' ? null : mitbringer),
    )
    onSchliessen()
  }

  return (
    <div className="ueberlagerung" role="dialog" aria-modal="true" aria-label={eintrag.zutat.name}>
      <div className="ueberlagerung-inhalt">
        <h2>{eintrag.zutat.name}</h2>
        <p className="hinweis">{t('einkauf.bedarfGesamt', { menge: mengeText(eintrag.bedarf, eintrag.zutat, t) })}</p>
        <form className="formular" onSubmit={speichern} noValidate>
          <label className="feld">
            <span>{t('einkauf.vorhandenMenge', { einheit })}</span>
            <input type="text" inputMode="decimal" value={menge} onChange={(e) => setMenge(e.target.value)} />
          </label>
          <button type="button" className="zweitrangig" onClick={() => setMenge(formatZahl(eintrag.bedarf))}>
            {t('einkauf.allesVorhanden')}
          </button>
          <label className="feld">
            <span>{t('einkauf.wer')}</span>
            <select value={mitbringer} onChange={(e) => setMitbringer(e.target.value)}>
              <option value="">{t('einkauf.niemand')}</option>
              {trip.teilnehmer.map((tn) => (
                <option key={tn.personId} value={tn.personId}>
                  {t('einkauf.bringtName', { name: namen([tn.personId], personen) })}
                </option>
              ))}
            </select>
          </label>
          {ungueltig && (
            <p className="meldung fehler" role="alert">
              {t('einkauf.mengeUngueltig')}
            </p>
          )}
          <div className="knoepfe">
            <button type="submit">{t('allgemein.speichern')}</button>
            <button type="button" className="zweitrangig" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
