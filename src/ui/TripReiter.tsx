import { useTranslation } from 'react-i18next'
import { speichereTrip } from '../db/trips'
import {
  MAHLZEITEN,
  MAX_TAGE,
  hatRezepteAbTag,
  istDatum,
  setzeAnzahlTage,
  setzeMahlzeitAktiv,
} from '../logic/trip'
import type { Kuehlschrank, TripEigenschaften } from '../logic/typen'
import { formatZahl, parseZahl } from '../logic/zahlen'
import { findeVorlage } from '../logic/vorlagen'
import { AnwesenheitsRaster } from './AnwesenheitsRaster'
import { KUEHLSCHRAENKE } from './auswahl'
import { formatTag } from './datum'
import { Eingabe } from './Eingabe'
import { GrundausstattungEditor } from './GrundausstattungEditor'
import { TeilnehmerBereich } from './TeilnehmerBereich'
import type { TripDaten } from './tripDaten'
import { Zaehler } from './Zaehler'

const MAX_FLAMMEN = 8

/** Reiter "Trip": alle Einstellungen des Trips. Jede Änderung wird sofort gespeichert. */
export function TripReiter({ daten }: { daten: TripDaten }) {
  const { t } = useTranslation()
  const { trip, personen, zutaten } = daten
  const vorlage = findeVorlage(trip.vorlage)
  const { eigenschaften } = trip

  function aendereEigenschaften(neu: Partial<TripEigenschaften>) {
    void speichereTrip({ ...trip, eigenschaften: { ...eigenschaften, ...neu } })
  }

  function aendereKueche(neu: Partial<TripEigenschaften['kueche']>) {
    aendereEigenschaften({ kueche: { ...eigenschaften.kueche, ...neu } })
  }

  function aendereTage(anzahl: number) {
    if (anzahl < trip.anzahlTage && hatRezepteAbTag(trip, anzahl + 1) && !window.confirm(t('trip.kuerzenFrage'))) {
      return
    }
    void speichereTrip(setzeAnzahlTage(trip, anzahl))
  }

  return (
    <>
      <section className="karte">
        <h2>{t('trip.stammdaten')}</h2>
        <div className="formular">
          <label className="feld">
            <span>{t('trip.name')}</span>
            <Eingabe
              wert={trip.name}
              pruefe={(text) => text.trim() !== ''}
              onUebernehmen={(text) => void speichereTrip({ ...trip, name: text.trim() })}
            />
          </label>
          <label className="feld">
            <span>{t('trip.startdatum')}</span>
            <input
              type="date"
              value={trip.startdatum}
              onChange={(e) => {
                if (istDatum(e.target.value)) void speichereTrip({ ...trip, startdatum: e.target.value })
              }}
            />
          </label>
          <div className="feld">
            <span>{t('trip.anzahlTage')}</span>
            <Zaehler
              wert={trip.anzahlTage}
              min={1}
              max={MAX_TAGE}
              onAendern={aendereTage}
              wenigerText={t('trip.tagWeniger')}
              mehrText={t('trip.tagMehr')}
            />
          </div>
          <p className="hinweis">
            {t('trip.typ')}: {vorlage.symbol} {t(`vorlage.${vorlage.id}`)}
          </p>
        </div>
      </section>

      <TeilnehmerBereich trip={trip} personen={personen} />

      <section className="karte">
        <h2>{t('trip.anwesenheit')}</h2>
        {trip.teilnehmer.length === 0 ? (
          <p className="hinweis">{t('trip.anwesenheitLeer')}</p>
        ) : (
          <>
            <p className="hinweis">{t('trip.anwesenheitHinweis')}</p>
            <AnwesenheitsRaster trip={trip} personen={personen} />
          </>
        )}
      </section>

      <section className="karte">
        <h2>{t('trip.tageMahlzeiten')}</h2>
        {trip.tage.map((tag, index) => {
          const nummer = index + 1
          return (
            <div key={nummer} className="tag-block">
              <h3>
                {t('trip.tag', { n: nummer })} · {formatTag(trip.startdatum, nummer)}
              </h3>
              <div className="chips ohne-rand umbruch">
                {MAHLZEITEN.map((m) => {
                  const an = tag.mahlzeiten.includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      className="chip"
                      aria-pressed={an}
                      onClick={() => void speichereTrip(setzeMahlzeitAktiv(trip, nummer, m, !an))}
                    >
                      {t(`mahlzeit.${m}`)}
                    </button>
                  )
                })}
              </div>
              {eigenschaften.wasserberechnung && (
                <label className="haken">
                  <input
                    type="checkbox"
                    checked={tag.heisserTag}
                    onChange={(e) =>
                      void speichereTrip({
                        ...trip,
                        tage: trip.tage.map((x, i) => (i === index ? { ...x, heisserTag: e.target.checked } : x)),
                      })
                    }
                  />
                  <span>{t('trip.heisserTag')}</span>
                </label>
              )}
            </div>
          )
        })}
      </section>

      <section className="karte">
        <h2>{t('trip.kueche')}</h2>
        <div className="formular">
          <div className="feld">
            <span>{t('trip.flammen')}</span>
            <Zaehler
              wert={eigenschaften.kueche.flammen}
              min={0}
              max={MAX_FLAMMEN}
              onAendern={(flammen) => aendereKueche({ flammen })}
              wenigerText="−"
              mehrText="+"
            />
          </div>
          <label className="haken">
            <input
              type="checkbox"
              checked={eigenschaften.kueche.ofen}
              onChange={(e) => aendereKueche({ ofen: e.target.checked })}
            />
            <span>{t('trip.ofen')}</span>
          </label>
          <label className="haken">
            <input
              type="checkbox"
              checked={eigenschaften.kueche.grill}
              onChange={(e) => aendereKueche({ grill: e.target.checked })}
            />
            <span>{t('trip.grill')}</span>
          </label>
          <label className="feld">
            <span>{t('trip.kuehlschrank')}</span>
            <select
              value={eigenschaften.kueche.kuehlschrank}
              onChange={(e) => aendereKueche({ kuehlschrank: e.target.value as Kuehlschrank })}
            >
              {KUEHLSCHRAENKE.map((k) => (
                <option key={k} value={k}>
                  {t(`kuehlschrank.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="haken">
            <input
              type="checkbox"
              checked={eigenschaften.kuechenpruefung}
              onChange={(e) => aendereEigenschaften({ kuechenpruefung: e.target.checked })}
            />
            <span>{t('trip.kuechenpruefung')}</span>
          </label>
          <label className="haken">
            <input
              type="checkbox"
              checked={eigenschaften.haltbarkeitspruefung}
              onChange={(e) => aendereEigenschaften({ haltbarkeitspruefung: e.target.checked })}
            />
            <span>{t('trip.haltbarkeitspruefung')}</span>
          </label>
          <label className="haken">
            <input
              type="checkbox"
              checked={eigenschaften.wasserberechnung}
              onChange={(e) => aendereEigenschaften({ wasserberechnung: e.target.checked })}
            />
            <span>{t('trip.wasserberechnung')}</span>
          </label>
        </div>
      </section>

      <section className="karte">
        <h2>{t('grundausstattung.titel')}</h2>
        <p className="hinweis">{t('grundausstattung.tripHinweis')}</p>
        <GrundausstattungEditor
          posten={trip.grundausstattung}
          zutaten={zutaten}
          onAendern={(grundausstattung) => void speichereTrip({ ...trip, grundausstattung })}
        />
      </section>

      <section className="karte">
        <h2>{t('trip.mengen')}</h2>
        <div className="formular">
          <label className="feld">
            <span>{t('trip.puffer')}</span>
            <Eingabe
              wert={formatZahl(trip.puffer)}
              inputMode="decimal"
              pruefe={(text) => parseZahl(text) !== null}
              onUebernehmen={(text) => void speichereTrip({ ...trip, puffer: parseZahl(text) ?? trip.puffer })}
            />
          </label>
          <label className="feld">
            <span>{t('trip.aktivfaktor')}</span>
            <Eingabe
              wert={formatZahl(trip.aktivfaktor)}
              inputMode="decimal"
              pruefe={(text) => (parseZahl(text) ?? 0) > 0}
              onUebernehmen={(text) =>
                void speichereTrip({ ...trip, aktivfaktor: parseZahl(text) ?? trip.aktivfaktor })
              }
            />
          </label>
        </div>
      </section>
    </>
  )
}
