import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { alleBedarfe } from '../logic/einkauf'
import { haltbarkeitsHinweise, tagesAmpel } from '../logic/haltbarkeit'
import { portionen } from '../logic/mengen'
import { slotHinweise } from '../logic/pruefungen'
import { aktiveSlots } from '../logic/trip'
import type { Slot } from '../logic/typen'
import { formatTag, formatZeitraum } from './datum'
import { MahlzeitKachel, VorlageSymbol } from './Symbole'
import { hinweisTexte, namen, portionenText, type TripDaten } from './tripDaten'

const MAX_AVATARE = 6

/** "Anna Maier" → "AM", "Ben" → "B" */
function initialen(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((wort) => wort.charAt(0).toUpperCase())
    .join('')
}

/** Reiter "Menü": Kopfkarte, Tages-Pillen und je Mahlzeit eine Karte */
export function PlanReiter({ daten }: { daten: TripDaten }) {
  const { t } = useTranslation()
  const { trip, rezepte, personen } = daten
  const [gewaehlterTag, setGewaehlterTag] = useState(1)
  const tag = Math.min(gewaehlterTag, trip.anzahlTage)

  const slots = aktiveSlots(trip).filter((s) => s.tag === tag)
  const haltbarkeit = haltbarkeitsHinweise(trip, alleBedarfe(trip, rezepte), daten.zutaten)
  const teilnehmer = trip.teilnehmer
    .map((tn) => personen.find((p) => p.id === tn.personId))
    .filter((p) => p !== undefined)
  const vegetarier = teilnehmer.filter((p) => p.ernaehrung === 'vegetarisch' || p.ernaehrung === 'vegan').length

  function gesamtPortionen(slot: Slot): number {
    return slot.varianten.reduce((summe, v) => summe + portionen(trip, slot, v), 0)
  }

  /** "vegan" oder "vegetarisch", wenn alle Rezepte des Gerichts für alle so sind */
  function kost(rezeptIds: string[]): string | null {
    const stufen = rezeptIds.map((id) => rezepte.find((r) => r.id === id)?.ernaehrungsstufe)
    if (stufen.length === 0) return null
    if (stufen.every((s) => s === 'vegan')) return t('ernaehrung.vegan')
    if (stufen.every((s) => s === 'vegan' || s === 'vegetarisch')) return t('ernaehrung.vegetarisch')
    return null
  }

  return (
    <>
      <section className="kopfkarte">
        <span className="kopfkarte-art">
          <VorlageSymbol id={trip.vorlage} size={18} /> {t(`vorlage.${trip.vorlage}`, t('vorlage.sonstiges'))}
        </span>
        <h2>{trip.name}</h2>
        <p>{formatZeitraum(trip.startdatum, trip.anzahlTage)}</p>
        <p className="kopfkarte-zahlen">
          <span>{t('start.tage', { count: trip.anzahlTage })}</span>
          <span>{t('start.personen', { count: teilnehmer.length })}</span>
          {vegetarier > 0 && <span>{t('plan.vegetarier', { count: vegetarier })}</span>}
        </p>
        {teilnehmer.length > 0 && (
          <div className="avatare">
            {teilnehmer.slice(0, MAX_AVATARE).map((p) => (
              <span key={p.id} className="avatar" title={p.name}>
                {initialen(p.name)}
              </span>
            ))}
            {teilnehmer.length > MAX_AVATARE && <span className="avatar">+{teilnehmer.length - MAX_AVATARE}</span>}
          </div>
        )}
      </section>

      {trip.teilnehmer.length === 0 && <p className="meldung warnung">{t('plan.keineTeilnehmer')}</p>}

      <div className="chips pillen">
        {trip.tage.map((_, index) => {
          const nummer = index + 1
          const ampel = tagesAmpel(haltbarkeit, nummer)
          return (
            <button
              key={nummer}
              type="button"
              className="chip"
              aria-pressed={nummer === tag}
              onClick={() => setGewaehlterTag(nummer)}
            >
              {t('trip.tag', { n: nummer })}
              {trip.eigenschaften.haltbarkeitspruefung && ampel !== 'gruen' && (
                <span className={`ampel-punkt ${ampel}`} title={t(`plan.ampel.${ampel}`)} />
              )}
            </button>
          )
        })}
      </div>

      <section className="plan-tag">
        <h2 className="plan-kopf">
          <span>{formatTag(trip.startdatum, tag)}</span>
          {trip.eigenschaften.haltbarkeitspruefung && (
            <span className={`ampel ${tagesAmpel(haltbarkeit, tag)}`}>{t(`plan.ampel.${tagesAmpel(haltbarkeit, tag)}`)}</span>
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

        {slots.length === 0 && <p className="hinweis">{t('plan.keineMahlzeiten')}</p>}

        {slots.map((slot) => {
          const [standard, ...zweitgerichte] = slot.varianten
          const hinweise = hinweisTexte(slotHinweise(trip, slot, rezepte, personen), daten, t)
          const zusatz = [portionenText(gesamtPortionen(slot), t), kost(standard.rezeptIds)].filter(Boolean)
          return (
            <Link key={slot.id} className="slot-karte" to={`/trips/${trip.id}/plan/${slot.id}`}>
              <MahlzeitKachel mahlzeit={slot.mahlzeit} />
              <span className="slot-text">
                <span className="slot-mahlzeit">{t(`mahlzeit.${slot.mahlzeit}`)}</span>
                {standard.rezeptIds.length === 0 ? (
                  <span className="hinweis">{t('plan.leer')}</span>
                ) : (
                  <span className="eintrag-titel">{namen(standard.rezeptIds, rezepte)}</span>
                )}
                <span className="eintrag-unterzeile">{zusatz.join(' · ')}</span>
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
                    <TriangleAlert size={16} aria-hidden="true" /> {text}
                  </span>
                ))}
              </span>
            </Link>
          )
        })}
      </section>

      <Link className="knopf haupt" to={`/trips/${trip.id}/einkauf`} replace>
        {t('plan.einkaufslisteErstellen')}
      </Link>
    </>
  )
}
