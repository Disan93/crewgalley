import { Lock, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { speichereTrip } from '../db/trips'
import { einkaufsliste, kostenschaetzung } from '../logic/einkauf'
import {
  abrechnung,
  entferneEinzahlung,
  fuegeEinzahlungHinzu,
  setzeUeberweisungErledigt,
  type Abrechnung,
} from '../logic/kosten'
import { istDatum } from '../logic/trip'
import type { AusgabeKategorie, Ueberweisung } from '../logic/typen'
import { parseEuro } from '../logic/zahlen'
import { usePro } from '../pro/usePro'
import { formatDatum, heute } from './datum'
import { teileText, type TeilenErgebnis } from './teilen'
import { geld, zahlerName, type TripDaten } from './tripDaten'

const BEREICHE = ['ausgaben', 'kasse', 'abrechnung'] as const
type Bereich = (typeof BEREICHE)[number]

/** Reiter "Kosten": Ausgaben · Bordkasse · Abrechnung (Konzept Kapitel 6 und 9) */
export function KostenReiter({ daten }: { daten: TripDaten }) {
  const { t } = useTranslation()
  const [bereich, setBereich] = useState<Bereich>('ausgaben')
  const { gesperrt, zeigePro } = usePro()
  // Pro: Bordkasse und Abrechnung. Ausgaben erfassen bleibt kostenlos.
  const istGesperrt = (b: Bereich) => b !== 'ausgaben' && gesperrt
  const ergebnis = abrechnung(daten.trip)

  return (
    <>
      <div className="chips ohne-rand umbruch">
        {BEREICHE.map((b) => (
          <button key={b} type="button" className="chip" aria-pressed={bereich === b}
            onClick={() => (istGesperrt(b) ? zeigePro(`/trips/${daten.trip.id}/kosten`) : setBereich(b))}
          >
            {istGesperrt(b) && <Lock size={14} aria-hidden="true" />}
            {t(`kosten.bereich.${b}`)}
          </button>
        ))}
      </div>

      {daten.trip.teilnehmer.length === 0 && <p className="meldung warnung">{t('kosten.keineTeilnehmer')}</p>}

      {bereich === 'ausgaben' && <Ausgaben daten={daten} ergebnis={ergebnis} />}
      {bereich === 'kasse' && !gesperrt && <Bordkasse daten={daten} ergebnis={ergebnis} />}
      {bereich === 'abrechnung' && !gesperrt && <AbrechnungAnsicht daten={daten} ergebnis={ergebnis} />}
    </>
  )
}

interface BereichProps {
  daten: TripDaten
  ergebnis: Abrechnung
}

function Ausgaben({ daten, ergebnis }: BereichProps) {
  const { t } = useTranslation()
  const { trip, rezepte, zutaten } = daten
  const [filter, setFilter] = useState<AusgabeKategorie | null>(null)

  const vorhandeneKategorien = [...new Set(trip.ausgaben.map((a) => a.kategorie))]
  // Neueste zuerst
  const liste = trip.ausgaben
    .filter((a) => filter === null || a.kategorie === filter)
    .sort((a, b) => b.datum.localeCompare(a.datum))
  const schaetzung = kostenschaetzung(trip, einkaufsliste(trip, rezepte, zutaten))

  return (
    <>
      <p className="schaetzung">
        <strong>{t('kosten.gesamt', { summe: geld(ergebnis.gesamt) })}</strong>
        {/* Die Vorab-Schätzung steht getrennt und fließt nie in die Abrechnung ein (Konzept 9.6) */}
        {schaetzung.summe > 0 && <span>{t('kosten.schaetzung', { summe: geld(schaetzung.summe) })}</span>}
      </p>

      <Link className="knopf" to={`/trips/${trip.id}/kosten/ausgabe/neu`}>
        {t('kosten.ausgabeNeu')}
      </Link>

      {vorhandeneKategorien.length > 1 && (
        <div className="chips">
          <button type="button" className="chip" aria-pressed={filter === null} onClick={() => setFilter(null)}>
            {t('allgemein.alle')}
          </button>
          {vorhandeneKategorien.map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {t(`ausgabeKategorie.${k}`)}
            </button>
          ))}
        </div>
      )}

      {trip.ausgaben.length === 0 && <p className="hinweis">{t('kosten.keineAusgaben')}</p>}

      <ul className="liste">
        {liste.map((a) => (
          <li key={a.id}>
            <Link className="eintrag" to={`/trips/${trip.id}/kosten/ausgabe/${a.id}`}>
              <span className="kauf-kopf">
                <span className="eintrag-titel">{a.beschreibung || t(`ausgabeKategorie.${a.kategorie}`)}</span>
                <span className="kauf-menge">{geld(a.betrag)}</span>
              </span>
              <span className="eintrag-unterzeile">
                {t('kosten.bezahltVon', { name: zahlerName(a.bezahltVon, daten, t) })} ·{' '}
                {t(`ausgabeKategorie.${a.kategorie}`)} · {formatDatum(a.datum)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

function Bordkasse({ daten, ergebnis }: BereichProps) {
  const { t } = useTranslation()
  const { trip } = daten
  const [personId, setPersonId] = useState(trip.teilnehmer[0]?.personId ?? '')
  const [betrag, setBetrag] = useState('')
  const [datum, setDatum] = useState(heute)
  const [ungueltig, setUngueltig] = useState(false)

  function einzahlen(ereignis: FormEvent) {
    ereignis.preventDefault()
    const cent = parseEuro(betrag)
    if (cent === null || cent <= 0 || personId === '' || !istDatum(datum)) {
      setUngueltig(true)
      return
    }
    setUngueltig(false)
    void speichereTrip(fuegeEinzahlungHinzu(trip, { id: crypto.randomUUID(), personId, betrag: cent, datum }))
    setBetrag('')
  }

  return (
    <>
      <p className="schaetzung">
        <strong>{t('kosten.kassenstand', { summe: geld(ergebnis.kassenstand) })}</strong>
        <span>{t('kosten.kasseHinweis')}</span>
      </p>
      {ergebnis.kassenstand < 0 && <p className="meldung fehler">{t('kosten.kasseNegativ')}</p>}

      <h2>{t('kosten.einzahlungNeu')}</h2>
      <form className="formular" onSubmit={einzahlen} noValidate>
        <label className="feld">
          <span>{t('kosten.wer')}</span>
          <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
            {trip.teilnehmer.map((tn) => (
              <option key={tn.personId} value={tn.personId}>
                {zahlerName(tn.personId, daten, t)}
              </option>
            ))}
          </select>
        </label>
        <label className="feld">
          <span>{t('kosten.betrag')}</span>
          <input type="text" inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} />
        </label>
        <label className="feld">
          <span>{t('kosten.datum')}</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>
        {ungueltig && (
          <p className="meldung fehler" role="alert">
            {t('kosten.fehler.betragUngueltig')}
          </p>
        )}
        <button type="submit" disabled={trip.teilnehmer.length === 0}>
          {t('kosten.einzahlen')}
        </button>
      </form>

      <h2>{t('kosten.einzahlungen')}</h2>
      {trip.einzahlungen.length === 0 && <p className="hinweis">{t('kosten.keineEinzahlungen')}</p>}
      {trip.einzahlungen.map((e) => {
        const name = zahlerName(e.personId, daten, t)
        return (
          <div key={e.id} className="kauf-zeile">
            <span className="wasser-zeile ohne-einzug">
              <span className="kauf-kopf">
                <span className="eintrag-titel">{name}</span>
                <span className="kauf-menge">{geld(e.betrag)}</span>
              </span>
              <span className="eintrag-unterzeile">{formatDatum(e.datum)}</span>
            </span>
            <button
              type="button"
              className="zweitrangig klein"
              aria-label={t('kosten.einzahlungEntfernen', { name, betrag: geld(e.betrag) })}
              onClick={() => {
                if (window.confirm(t('kosten.einzahlungEntfernenFrage', { name, betrag: geld(e.betrag) }))) {
                  void speichereTrip(entferneEinzahlung(trip, e.id))
                }
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </>
  )
}

function AbrechnungAnsicht({ daten, ergebnis }: BereichProps) {
  const { t } = useTranslation()
  const { trip } = daten
  const [teilenMeldung, setTeilenMeldung] = useState<TeilenErgebnis | null>(null)

  const zeile = (u: Ueberweisung) =>
    t('kosten.ueberweisung', {
      von: zahlerName(u.von, daten, t),
      an: zahlerName(u.an, daten, t),
      betrag: geld(u.betrag),
    })

  /** Abrechnung als Klartext, z. B. für WhatsApp (Konzept 9.6) */
  function alsText(): string {
    const zeilen = [`${t('kosten.abrechnungTitel')} – ${trip.name}`, t('kosten.gesamt', { summe: geld(ergebnis.gesamt) })]
    zeilen.push('', `${t('kosten.salden')}:`)
    for (const p of ergebnis.personen) zeilen.push(`- ${zahlerName(p.personId, daten, t)}: ${geld(p.saldo, true)}`)
    if (trip.einzahlungen.length > 0 || ergebnis.kassenstand !== 0) {
      zeilen.push(`- ${t('kosten.kassenstand', { summe: geld(ergebnis.kassenstand) })}`)
    }
    if (ergebnis.ueberweisungen.length > 0) {
      zeilen.push('', `${t('kosten.offen')}:`)
      for (const u of ergebnis.ueberweisungen) zeilen.push(`- ${zeile(u)}`)
    }
    if (trip.ueberweisungenErledigt.length > 0) {
      zeilen.push('', `${t('kosten.erledigt')}:`)
      for (const u of trip.ueberweisungenErledigt) zeilen.push(`- ${zeile(u)}`)
    }
    return zeilen.join('\n')
  }

  return (
    <>
      <p className="schaetzung">
        <strong>{t('kosten.gesamt', { summe: geld(ergebnis.gesamt) })}</strong>
        <span>{t('kosten.kassenstand', { summe: geld(ergebnis.kassenstand) })}</span>
      </p>

      <h2>{t('kosten.salden')}</h2>
      <p className="hinweis">{t('kosten.saldenHinweis')}</p>
      {ergebnis.personen.map((p) => (
        <div key={p.personId} className="saldo-zeile">
          <span className="kauf-kopf">
            <span className="eintrag-titel">{zahlerName(p.personId, daten, t)}</span>
            <span className={p.saldo < 0 ? 'kauf-menge negativ' : 'kauf-menge'}>{geld(p.saldo, true)}</span>
          </span>
          <span className="eintrag-unterzeile">
            {t('kosten.saldoDetail', { bezahlt: geld(p.bezahlt), eingezahlt: geld(p.eingezahlt), anteil: geld(p.anteil) })}
          </span>
        </div>
      ))}

      <h2>{t('kosten.offen')}</h2>
      {ergebnis.ueberweisungen.length === 0 && <p className="hinweis">{t('kosten.allesAusgeglichen')}</p>}
      {ergebnis.ueberweisungen.map((u) => (
        <label key={`${u.von}|${u.an}`} className="kauf-haken ueberweisung">
          <input
            type="checkbox"
            checked={false}
            onChange={() => void speichereTrip(setzeUeberweisungErledigt(trip, u, true))}
          />
          <span className="eintrag-titel">{zeile(u)}</span>
        </label>
      ))}

      {trip.ueberweisungenErledigt.length > 0 && (
        <>
          <h2>{t('kosten.erledigt')}</h2>
          {trip.ueberweisungenErledigt.map((u, index) => (
            <label key={index} className="kauf-haken ueberweisung erledigt">
              <input
                type="checkbox"
                checked
                onChange={() => void speichereTrip(setzeUeberweisungErledigt(trip, u, false))}
              />
              <span>{zeile(u)}</span>
            </label>
          ))}
        </>
      )}

      <div className="knoepfe">
        <button
          type="button"
          onClick={async () => setTeilenMeldung(await teileText(`${t('kosten.abrechnungTitel')} – ${trip.name}`, alsText()))}
        >
          {t('kosten.teilen')}
        </button>
      </div>
      {(teilenMeldung === 'kopiert' || teilenMeldung === 'fehler') && (
        <p className={teilenMeldung === 'kopiert' ? 'meldung ok' : 'meldung fehler'} role="status">
          {t(`kosten.teilenMeldung.${teilenMeldung}`)}
        </p>
      )}
    </>
  )
}
