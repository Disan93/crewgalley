import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { speichereTrip } from '../db/trips'
import { sortierteTermine } from '../logic/haltbarkeit'
import { aendereTermin, entferneTermin, fuegeTerminHinzu } from '../logic/termine'
import type { Trip } from '../logic/typen'
import { formatTag } from './datum'
import { Eingabe } from './Eingabe'

/** Einkaufstermine eines Trips: wann und wo eingekauft wird (Konzept Kapitel 2 und 7.6) */
export function TermineBereich({ trip }: { trip: Trip }) {
  const { t } = useTranslation()
  const termine = sortierteTermine(trip)
  const tagNummern = trip.tage.map((_, i) => i + 1)

  function hinzufuegen() {
    // Vorschlag: zwei Tage nach dem letzten Termin, höchstens am letzten Tag
    const tag = Math.min(termine[termine.length - 1].tag + 2, trip.anzahlTage)
    void speichereTrip(fuegeTerminHinzu(trip, tag, t('einkauf.neuerTermin', { n: tag })))
  }

  function entfernen(id: string, name: string) {
    if (!window.confirm(t('einkauf.terminEntfernenFrage', { name }))) return
    void speichereTrip(entferneTermin(trip, id))
  }

  return (
    <section className="karte">
      <h2>{t('einkauf.termine')}</h2>
      <p className="hinweis">{t('einkauf.termineHinweis')}</p>

      {termine.map((termin) => (
        <div key={termin.id} className="termin-zeile">
          <Eingabe
            wert={termin.name}
            beschriftung={t('einkauf.terminName')}
            pruefe={(text) => text.trim() !== ''}
            onUebernehmen={(text) => void speichereTrip(aendereTermin(trip, termin.id, { name: text.trim() }))}
          />
          <button
            type="button"
            className="zweitrangig klein"
            aria-label={t('einkauf.terminEntfernen', { name: termin.name })}
            disabled={termine.length === 1}
            onClick={() => entfernen(termin.id, termin.name)}
          >
            <X size={20} aria-hidden="true" />
          </button>
          <select
            value={termin.tag}
            aria-label={t('einkauf.terminTag', { name: termin.name })}
            onChange={(e) => void speichereTrip(aendereTermin(trip, termin.id, { tag: Number(e.target.value) }))}
          >
            {tagNummern.map((tag) => (
              <option key={tag} value={tag}>
                {t('trip.tag', { n: tag })} · {formatTag(trip.startdatum, tag)}
              </option>
            ))}
          </select>
        </div>
      ))}

      {termine.length > 1 && !trip.eigenschaften.haltbarkeitspruefung && (
        <p className="meldung warnung">{t('einkauf.termineOhnePruefung')}</p>
      )}

      <div className="knoepfe">
        <button type="button" className="zweitrangig" onClick={hinzufuegen}>
          {t('einkauf.terminHinzufuegen')}
        </button>
      </div>
    </section>
  )
}
