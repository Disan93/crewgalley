import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { speichereTrip } from '../db/trips'
import {
  AUSGABE_KATEGORIEN,
  KASSE,
  anteile,
  entferneAusgabe,
  pruefeAusgabe,
  speichereAusgabe,
  standardModus,
  type AusgabeFehler,
} from '../logic/kosten'
import { istDatum } from '../logic/trip'
import type { Aufteilung, Ausgabe, AusgabeKategorie } from '../logic/typen'
import { formatEuro, parseEuro } from '../logic/zahlen'
import { heute } from './datum'
import { Seite } from './Seite'
import { geld, useTripDaten, zahlerName, type TripDaten } from './tripDaten'

const MODI: Aufteilung['modus'][] = ['essen', 'gleich', 'individuell']

/** Ausgabe erfassen oder bearbeiten */
export function AusgabeSeite() {
  const { t } = useTranslation()
  const { id, ausgabeId } = useParams()
  const daten = useTripDaten(id)

  if (daten === undefined) return null
  const zurueck = `/trips/${id}/kosten`
  const neu = ausgabeId === 'neu'
  const ausgabe = daten?.trip.ausgaben.find((a) => a.id === ausgabeId)
  if (!daten || (!neu && !ausgabe)) {
    return (
      <Seite titel={t('kosten.ausgabeTitel')} zurueck={id ? zurueck : '/'}>
        <p className="hinweis">{t('allgemein.nichtGefunden')}</p>
      </Seite>
    )
  }

  return (
    <Seite titel={neu ? t('kosten.ausgabeNeuTitel') : t('kosten.ausgabeTitel')} zurueck={zurueck}>
      <AusgabeFormular key={ausgabeId} daten={daten} ausgabe={ausgabe} zurueck={zurueck} />
    </Seite>
  )
}

interface AusgabeFormularProps {
  daten: TripDaten
  ausgabe?: Ausgabe
  zurueck: string
}

function AusgabeFormular({ daten, ausgabe, zurueck }: AusgabeFormularProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { trip } = daten
  const alleIds = trip.teilnehmer.map((tn) => tn.personId)

  const [betrag, setBetrag] = useState(ausgabe ? formatEuro(ausgabe.betrag) : '')
  const [beschreibung, setBeschreibung] = useState(ausgabe?.beschreibung ?? '')
  const [kategorie, setKategorie] = useState<AusgabeKategorie>(ausgabe?.kategorie ?? 'lebensmittel')
  const [bezahltVon, setBezahltVon] = useState(ausgabe?.bezahltVon ?? alleIds[0] ?? KASSE)
  const [datum, setDatum] = useState(ausgabe?.datum ?? heute())
  const [modus, setModus] = useState<Aufteilung['modus']>(ausgabe?.aufteilung.modus ?? 'essen')
  // Solange die Aufteilung nicht von Hand gewählt wurde, folgt sie der Kategorie (Konzept 9.1)
  const [modusGewaehlt, setModusGewaehlt] = useState(ausgabe !== undefined)
  const [personIds, setPersonIds] = useState<string[]>(ausgabe?.aufteilung.personIds ?? alleIds)
  const [einzelbetraege, setEinzelbetraege] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(ausgabe?.aufteilung.betraege ?? {}).map(([pid, cent]) => [pid, formatEuro(cent)])),
  )
  const [fehler, setFehler] = useState<(AusgabeFehler | 'datumUngueltig')[]>([])

  const cent = parseEuro(betrag)
  const gewaehlt = alleIds.filter((pid) => personIds.includes(pid))
  const betraege = Object.fromEntries(gewaehlt.map((pid) => [pid, parseEuro(einzelbetraege[pid] ?? '') ?? 0]))
  const aufteilung: Aufteilung =
    modus === 'individuell' ? { modus, personIds: gewaehlt, betraege } : { modus, personIds: gewaehlt }
  const vorschau = cent !== null && cent > 0 && modus !== 'individuell' ? anteile(trip, { betrag: cent, aufteilung }) : []
  const verteilt = Object.values(betraege).reduce((s, b) => s + b, 0)

  function kategorieWaehlen(neu: AusgabeKategorie) {
    setKategorie(neu)
    if (!modusGewaehlt) setModus(standardModus(neu))
  }

  async function speichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    const neu: Ausgabe = {
      id: ausgabe?.id ?? crypto.randomUUID(),
      betrag: cent ?? 0,
      waehrung: trip.waehrung,
      beschreibung: beschreibung.trim(),
      kategorie,
      bezahltVon,
      aufteilung,
      datum,
    }
    const gefunden = [...pruefeAusgabe(neu, trip), ...(istDatum(datum) ? [] : (['datumUngueltig'] as const))]
    setFehler(gefunden)
    if (gefunden.length > 0) return

    await speichereTrip(speichereAusgabe(trip, neu))
    navigate(zurueck, { replace: true })
  }

  async function loeschen(a: Ausgabe) {
    if (!window.confirm(t('kosten.ausgabeLoeschenFrage'))) return
    await speichereTrip(entferneAusgabe(trip, a.id))
    navigate(zurueck, { replace: true })
  }

  return (
    <form className="formular" onSubmit={speichern} noValidate>
      <label className="feld">
        <span>{t('kosten.betrag')}</span>
        <input type="text" inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} />
      </label>

      <label className="feld">
        <span>{t('kosten.beschreibung')}</span>
        <input
          type="text"
          value={beschreibung}
          placeholder={t('kosten.beschreibungPlatzhalter')}
          onChange={(e) => setBeschreibung(e.target.value)}
        />
      </label>

      <label className="feld">
        <span>{t('kosten.kategorie')}</span>
        <select value={kategorie} onChange={(e) => kategorieWaehlen(e.target.value as AusgabeKategorie)}>
          {AUSGABE_KATEGORIEN.map((k) => (
            <option key={k} value={k}>
              {t(`ausgabeKategorie.${k}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="feld">
        <span>{t('kosten.bezahltVonFeld')}</span>
        <select value={bezahltVon} onChange={(e) => setBezahltVon(e.target.value)}>
          {alleIds.map((pid) => (
            <option key={pid} value={pid}>
              {zahlerName(pid, daten, t)}
            </option>
          ))}
          <option value={KASSE}>{t('kosten.kasse')}</option>
        </select>
      </label>

      <label className="feld">
        <span>{t('kosten.datum')}</span>
        <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
      </label>

      <label className="feld">
        <span>{t('kosten.aufteilung')}</span>
        <select
          value={modus}
          onChange={(e) => {
            setModus(e.target.value as Aufteilung['modus'])
            setModusGewaehlt(true)
          }}
        >
          {MODI.map((m) => (
            <option key={m} value={m}>
              {t(`kosten.modus.${m}`)}
            </option>
          ))}
        </select>
        <small>{t(`kosten.modusHinweis.${modus}`)}</small>
      </label>

      <fieldset className="feldgruppe">
        <legend>{t('kosten.fuerWen')}</legend>
        {alleIds.map((pid) => {
          const dabei = personIds.includes(pid)
          const name = zahlerName(pid, daten, t)
          const anteil = vorschau.find((a) => a.personId === pid)
          return (
            <div key={pid} className="anteil-zeile">
              <label className="haken">
                <input
                  type="checkbox"
                  checked={dabei}
                  onChange={(e) =>
                    setPersonIds((alt) => (e.target.checked ? [...alt, pid] : alt.filter((x) => x !== pid)))
                  }
                />
                <span>{name}</span>
              </label>
              {modus === 'individuell'
                ? dabei && (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={einzelbetraege[pid] ?? ''}
                      aria-label={t('kosten.betragVon', { name })}
                      onChange={(e) => setEinzelbetraege((alt) => ({ ...alt, [pid]: e.target.value }))}
                    />
                  )
                : anteil && <span className="kauf-menge">{geld(anteil.betrag)}</span>}
            </div>
          )
        })}
        {modus === 'individuell' && cent !== null && (
          <small className={verteilt === cent ? '' : 'warnzeile'}>
            {t('kosten.verteilt', { verteilt: geld(verteilt), betrag: geld(cent) })}
          </small>
        )}
      </fieldset>

      {fehler.length > 0 && (
        <ul className="meldung fehler" role="alert">
          {fehler.map((f) => (
            <li key={f}>{t(`kosten.fehler.${f}`)}</li>
          ))}
        </ul>
      )}

      <div className="knoepfe">
        <button type="submit">{t('allgemein.speichern')}</button>
        <button type="button" className="zweitrangig" onClick={() => navigate(zurueck, { replace: true })}>
          {t('allgemein.abbrechen')}
        </button>
        {ausgabe && (
          <button type="button" className="gefahr" onClick={() => loeschen(ausgabe)}>
            {t('allgemein.loeschen')}
          </button>
        )}
      </div>
    </form>
  )
}
