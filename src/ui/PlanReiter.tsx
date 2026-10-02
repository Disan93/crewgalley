import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { alleBedarfe } from '../logic/einkauf'
import { haltbarkeitsHinweise, tagesAmpel } from '../logic/haltbarkeit'
import { portionen } from '../logic/mengen'
import { slotHinweise } from '../logic/pruefungen'
import { aktiveSlots } from '../logic/trip'
import type { Slot } from '../logic/typen'
import { formatTag } from './datum'
import { hinweisTexte, namen, portionenText, type TripDaten } from './tripDaten'

/** Reiter "Plan": alle Tage untereinander, je Tag die aktiven Mahlzeiten (Konzept Kapitel 6) */
export function PlanReiter({ daten }: { daten: TripDaten }) {
  const { t } = useTranslation()
  const { trip, rezepte, personen } = daten
  const slots = aktiveSlots(trip)
  const haltbarkeit = haltbarkeitsHinweise(trip, alleBedarfe(trip, rezepte), daten.zutaten)

  function gesamtPortionen(slot: Slot): number {
    return slot.varianten.reduce((summe, v) => summe + portionen(trip, slot, v), 0)
  }

  return (
    <>
      {trip.teilnehmer.length === 0 && <p className="meldung warnung">{t('plan.keineTeilnehmer')}</p>}

      {trip.tage.map((_, index) => {
        const tag = index + 1
        const tagSlots = slots.filter((s) => s.tag === tag)
        const ampel = tagesAmpel(haltbarkeit, tag)
        return (
          <section key={tag} className="plan-tag">
            <h2 className="plan-kopf">
              <span>
                {t('trip.tag', { n: tag })} · {formatTag(trip.startdatum, tag)}
              </span>
              {trip.eigenschaften.haltbarkeitspruefung && (
                <span className={`ampel ${ampel}`}>{t(`plan.ampel.${ampel}`)}</span>
              )}
            </h2>
            {haltbarkeit
              .filter((h) => h.tag === tag)
              .map((h) => (
                <p key={h.zutat.id} className={h.stufe === 'rot' ? 'meldung fehler' : 'meldung warnung'}>
                  {t(`plan.haltbarkeit.${h.stufe}`, {
                    zutat: h.zutat.name,
                    tag: h.tag,
                    einkaufTag: h.einkaufTag,
                    dauer: t('plan.haltbarkeit.dauer', { count: h.haltbarkeit }),
                  })}
                </p>
              ))}
            {tagSlots.length === 0 && <p className="hinweis">{t('plan.keineMahlzeiten')}</p>}

            {tagSlots.map((slot) => {
              const [standard, ...zweitgerichte] = slot.varianten
              const hinweise = hinweisTexte(slotHinweise(trip, slot, rezepte, personen), daten, t)
              return (
                <Link key={slot.id} className="slot-karte" to={`/trips/${trip.id}/plan/${slot.id}`}>
                  <span className="slot-kopf">
                    <span className="slot-mahlzeit">{t(`mahlzeit.${slot.mahlzeit}`)}</span>
                    <span className="eintrag-unterzeile">
                      {portionenText(gesamtPortionen(slot), t)}
                    </span>
                  </span>
                  {standard.rezeptIds.length === 0 ? (
                    <span className="hinweis">{t('plan.leer')}</span>
                  ) : (
                    <span className="eintrag-titel">{namen(standard.rezeptIds, rezepte)}</span>
                  )}
                  {zweitgerichte.map((v) => (
                    <span key={v.id} className="eintrag-unterzeile">
                      {t('plan.zweitZeile', {
                        personen: v.fuer === 'standard' ? '' : namen(v.fuer, personen),
                        rezepte: v.rezeptIds.length === 0 ? t('plan.leer') : namen(v.rezeptIds, rezepte),
                      })}
                    </span>
                  ))}
                  {hinweise.map((text) => (
                    <span key={text} className="warnzeile">
                      ⚠ {text}
                    </span>
                  ))}
                </Link>
              )
            })}
          </section>
        )
      })}
    </>
  )
}
