import { Circle, CircleCheck, CircleDashed } from 'lucide-react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { speichereTrip } from '../db/trips'
import { aktiveSlots, istAnwesend, setzeAnwesenheit } from '../logic/trip'
import type { Person, Teilnehmer, Trip } from '../logic/typen'
import { formatTag } from './datum'

interface AnwesenheitsRasterProps {
  trip: Trip
  personen: Person[]
}

/** Raster Mahlzeit × Person (Konzept Kapitel 3): wer isst wann mit */
export function AnwesenheitsRaster({ trip, personen }: AnwesenheitsRasterProps) {
  const { t } = useTranslation()
  const slots = aktiveSlots(trip)
  const tagNummern = trip.tage.map((_, i) => i + 1).filter((tag) => slots.some((s) => s.tag === tag))
  const nameVon = (personId: string) => personen.find((p) => p.id === personId)?.name ?? '?'

  function tagUmschalten(tn: Teilnehmer, tag: number) {
    const ids = slots.filter((s) => s.tag === tag).map((s) => s.id)
    const ueberallDabei = ids.every((id) => istAnwesend(tn, id))
    void speichereTrip(setzeAnwesenheit(trip, tn.personId, ids, !ueberallDabei))
  }

  /** Symbol für den Tages-Knopf: ganz, teilweise oder gar nicht dabei */
  function tagSymbol(tn: Teilnehmer, tag: number) {
    const ids = slots.filter((s) => s.tag === tag).map((s) => s.id)
    const dabei = ids.filter((id) => istAnwesend(tn, id)).length
    if (dabei === ids.length) return <CircleCheck size={22} aria-hidden="true" />
    return dabei === 0 ? <Circle size={22} aria-hidden="true" /> : <CircleDashed size={22} aria-hidden="true" />
  }

  return (
    <div className="raster-rahmen">
      <table className="raster">
        <thead>
          <tr>
            <td />
            {trip.teilnehmer.map((tn) => (
              <th key={tn.personId} scope="col">
                <span>{nameVon(tn.personId)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tagNummern.map((tag) => (
            <Fragment key={tag}>
              <tr className="raster-tag">
                <th scope="row">
                  {t('trip.tag', { n: tag })}
                  <small>{formatTag(trip.startdatum, tag)}</small>
                </th>
                {trip.teilnehmer.map((tn) => (
                  <td key={tn.personId}>
                    <button
                      type="button"
                      className="raster-knopf"
                      aria-label={t('trip.ganzerTag', { name: nameVon(tn.personId), n: tag })}
                      onClick={() => tagUmschalten(tn, tag)}
                    >
                      {tagSymbol(tn, tag)}
                    </button>
                  </td>
                ))}
              </tr>
              {slots
                .filter((s) => s.tag === tag)
                .map((slot) => (
                  <tr key={slot.id}>
                    <th scope="row">{t(`mahlzeit.${slot.mahlzeit}`)}</th>
                    {trip.teilnehmer.map((tn) => (
                      <td key={tn.personId}>
                        <label className="raster-haken">
                          <input
                            type="checkbox"
                            checked={istAnwesend(tn, slot.id)}
                            aria-label={t('trip.anwesendBei', {
                              name: nameVon(tn.personId),
                              mahlzeit: t(`mahlzeit.${slot.mahlzeit}`),
                              n: tag,
                            })}
                            onChange={(e) =>
                              void speichereTrip(setzeAnwesenheit(trip, tn.personId, [slot.id], e.target.checked))
                            }
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
