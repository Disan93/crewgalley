import { X, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { speichereTrip } from '../db/trips'
import { portionen, teilnehmerDerVariante } from '../logic/mengen'
import { entferneRezept, entferneZweitgericht, setzeZweitgericht } from '../logic/plan'
import { slotHinweise } from '../logic/pruefungen'
import type { Variante } from '../logic/typen'
import { formatTag } from './datum'
import { Seite } from './Seite'
import { hinweisTexte, namen, portionenText, useTripDaten } from './tripDaten'

/** Slot-Detail: Gericht für alle, Zweitgerichte, Portionen und Hinweise einer Mahlzeit */
export function SlotSeite() {
  const { t } = useTranslation()
  const { id, slotId } = useParams()
  const daten = useTripDaten(id)
  // Personen-Auswahl für ein neues Zweitgericht; null = Auswahl geschlossen
  const [neueAuswahl, setNeueAuswahl] = useState<string[] | null>(null)

  if (daten === undefined) return null
  const slot = daten?.trip.slots.find((s) => s.id === slotId)
  if (!daten || !slot) {
    return (
      <Seite titel={t('trip.reiter.plan')} zurueck={id ? `/trips/${id}/plan` : '/'}>
        <p className="hinweis">{t('allgemein.nichtGefunden')}</p>
      </Seite>
    )
  }

  const { trip, rezepte, personen } = daten
  const titel = `${t('trip.tag', { n: slot.tag })} · ${t(`mahlzeit.${slot.mahlzeit}`)}`
  const hinweise = slotHinweise(trip, slot, rezepte, personen)
  const teilnehmerIds = trip.teilnehmer.map((tn) => tn.personId)

  function hinweiseZu(variante: Variante, rezeptId: string): string[] {
    const eigene = hinweise.rezepte.filter((h) => h.varianteId === variante.id && h.rezeptId === rezeptId)
    return hinweisTexte({ rezepte: eigene, nacheinander: false }, daten!, t)
  }

  function umschalten(liste: string[], personId: string, an: boolean): string[] {
    return an ? [...liste, personId] : liste.filter((p) => p !== personId)
  }

  return (
    <Seite titel={titel} zurueck={`/trips/${trip.id}/plan`}>
      <p className="hinweis">{formatTag(trip.startdatum, slot.tag)}</p>
      {hinweise.nacheinander && <p className="meldung warnung"><TriangleAlert size={16} aria-hidden="true" /> {t('plan.nacheinander')}</p>}

      {slot.varianten.map((variante) => {
        const esser = teilnehmerDerVariante(trip, slot, variante).map((tn) => tn.personId)
        const fuer = variante.fuer
        return (
          <section key={variante.id} className="karte">
            <h2>{fuer === 'standard' ? t('plan.standard') : t('plan.zweitgericht')}</h2>
            <p className="hinweis">
              {t('plan.fuer', { personen: esser.length > 0 ? namen(esser, personen) : t('plan.niemand') })}
              {' · '}
              {portionenText(portionen(trip, slot, variante), t)}
            </p>

            {fuer !== 'standard' && (
              <fieldset className="feldgruppe">
                <legend>{t('plan.zweitgerichtWer')}</legend>
                {teilnehmerIds.map((personId) => (
                  <label key={personId} className="haken">
                    <input
                      type="checkbox"
                      checked={fuer.includes(personId)}
                      // Die letzte Person lässt sich nicht abwählen; dafür gibt es "Zweitgericht entfernen"
                      disabled={fuer.length === 1 && fuer[0] === personId}
                      onChange={(e) =>
                        void speichereTrip(
                          setzeZweitgericht(trip, slot.id, variante.id, umschalten(fuer, personId, e.target.checked)),
                        )
                      }
                    />
                    <span>{namen([personId], personen)}</span>
                  </label>
                ))}
              </fieldset>
            )}

            {variante.rezeptIds.length === 0 && <p className="hinweis">{t('plan.keinRezept')}</p>}
            {variante.rezeptIds.map((rezeptId) => {
              const rezept = rezepte.find((r) => r.id === rezeptId)
              const name = rezept?.name ?? t('plan.rezeptUnbekannt')
              return (
                <div key={rezeptId} className="plan-rezept">
                  <div className="plan-rezept-zeile">
                    {rezept ? (
                      <Link className="eintrag-titel" to={`/rezepte/${rezept.id}`}>
                        {name}
                      </Link>
                    ) : (
                      <span className="eintrag-titel">{name}</span>
                    )}
                    <button
                      type="button"
                      className="zweitrangig klein"
                      aria-label={t('plan.rezeptEntfernen', { name })}
                      onClick={() => void speichereTrip(entferneRezept(trip, slot.id, variante.id, rezeptId))}
                    >
                      <X size={20} aria-hidden="true" />
                    </button>
                  </div>
                  {hinweiseZu(variante, rezeptId).map((text) => (
                    <span key={text} className="warnzeile">
                      <TriangleAlert size={16} aria-hidden="true" /> {text}
                    </span>
                  ))}
                </div>
              )
            })}

            <div className="knoepfe">
              <Link className="knopf" to={`/trips/${trip.id}/plan/${slot.id}/rezept/${variante.id}`}>
                {t('plan.rezeptHinzufuegen')}
              </Link>
              {fuer !== 'standard' && (
                <button
                  type="button"
                  className="gefahr"
                  onClick={() => void speichereTrip(entferneZweitgericht(trip, slot.id, variante.id))}
                >
                  {t('plan.zweitgerichtEntfernen')}
                </button>
              )}
            </div>
          </section>
        )
      })}

      {neueAuswahl === null ? (
        <div className="knoepfe">
          <button
            type="button"
            className="zweitrangig"
            disabled={teilnehmerIds.length === 0}
            onClick={() => setNeueAuswahl([])}
          >
            {t('plan.zweitgerichtNeu')}
          </button>
        </div>
      ) : (
        <section className="karte">
          <h2>{t('plan.zweitgericht')}</h2>
          <fieldset className="feldgruppe">
            <legend>{t('plan.zweitgerichtWer')}</legend>
            {teilnehmerIds.map((personId) => (
              <label key={personId} className="haken">
                <input
                  type="checkbox"
                  checked={neueAuswahl.includes(personId)}
                  onChange={(e) => setNeueAuswahl(umschalten(neueAuswahl, personId, e.target.checked))}
                />
                <span>{namen([personId], personen)}</span>
              </label>
            ))}
            <small>{t('plan.zweitgerichtHinweis')}</small>
          </fieldset>
          <div className="knoepfe">
            <button
              type="button"
              disabled={neueAuswahl.length === 0}
              onClick={() => {
                void speichereTrip(setzeZweitgericht(trip, slot.id, null, neueAuswahl))
                setNeueAuswahl(null)
              }}
            >
              {t('plan.zweitgerichtAnlegen')}
            </button>
            <button type="button" className="zweitrangig" onClick={() => setNeueAuswahl(null)}>
              {t('allgemein.abbrechen')}
            </button>
          </div>
        </section>
      )}
    </Seite>
  )
}
