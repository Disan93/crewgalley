import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { speichereTrip } from '../db/trips'
import { entferneTeilnehmer, fuegeTeilnehmerHinzu, hatBuchungen, setzePortionsfaktor } from '../logic/trip'
import type { Person, Trip } from '../logic/typen'
import { formatZahl, parseZahl } from '../logic/zahlen'
import { nachName } from '../logic/zutaten'
import { Eingabe } from './Eingabe'
import { PersonFormular } from './PersonFormular'

interface TeilnehmerBereichProps {
  trip: Trip
  /** das ganze Adressbuch */
  personen: Person[]
}

export function TeilnehmerBereich({ trip, personen }: TeilnehmerBereichProps) {
  const { t } = useTranslation()
  const [auswahlOffen, setAuswahlOffen] = useState(false)
  const [neuePerson, setNeuePerson] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)

  const nameVon = (personId: string) => personen.find((p) => p.id === personId)?.name ?? '?'
  const nichtDabei = nachName(personen.filter((p) => !trip.teilnehmer.some((tn) => tn.personId === p.id)))

  function entfernen(personId: string) {
    const name = nameVon(personId)
    if (hatBuchungen(trip, personId)) {
      setMeldung(t('trip.entfernenGesperrt', { name }))
      return
    }
    if (!window.confirm(t('trip.entfernenFrage', { name }))) return
    setMeldung(null)
    void speichereTrip(entferneTeilnehmer(trip, personId))
  }

  return (
    <section className="karte">
      <h2>
        {t('trip.teilnehmer')} ({trip.teilnehmer.length})
      </h2>

      {trip.teilnehmer.length === 0 && <p className="hinweis">{t('trip.keineTeilnehmer')}</p>}

      {trip.teilnehmer.map((tn) => {
        const name = nameVon(tn.personId)
        return (
          <div key={tn.personId} className="teilnehmer-zeile">
            <span className="zutat-name">{name}</span>
            <Eingabe
              wert={formatZahl(tn.portionsfaktor)}
              inputMode="decimal"
              beschriftung={t('trip.faktorVon', { name })}
              pruefe={(text) => (parseZahl(text) ?? 0) > 0}
              onUebernehmen={(text) =>
                void speichereTrip(setzePortionsfaktor(trip, tn.personId, parseZahl(text) ?? tn.portionsfaktor))
              }
            />
            <button
              type="button"
              className="zweitrangig klein"
              aria-label={t('trip.entfernen', { name })}
              onClick={() => entfernen(tn.personId)}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )
      })}

      {meldung && (
        <p className="meldung fehler" role="alert">
          {meldung}
        </p>
      )}

      <div className="knoepfe">
        <button type="button" onClick={() => setAuswahlOffen(true)}>
          {t('trip.teilnehmerHinzufuegen')}
        </button>
      </div>

      {auswahlOffen && (
        <div className="ueberlagerung" role="dialog" aria-modal="true" aria-label={t('trip.teilnehmerWaehlen')}>
          <div className="ueberlagerung-inhalt">
            {neuePerson ? (
              <>
                <h2>{t('personen.neuTitel')}</h2>
                <PersonFormular
                  onFertig={(person) => {
                    void speichereTrip(fuegeTeilnehmerHinzu(trip, person))
                    setNeuePerson(false)
                  }}
                  onAbbrechen={() => setNeuePerson(false)}
                />
              </>
            ) : (
              <>
                <h2>{t('trip.teilnehmerWaehlen')}</h2>
                <button type="button" className="zweitrangig" onClick={() => setNeuePerson(true)}>
                  {t('trip.neuePerson')}
                </button>
                <h3>{t('trip.ausAdressbuch')}</h3>
                {nichtDabei.length === 0 && <p className="hinweis">{t('trip.alleDabei')}</p>}
                <ul className="liste">
                  {nichtDabei.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="eintrag"
                        onClick={() => void speichereTrip(fuegeTeilnehmerHinzu(trip, p))}
                      >
                        <span className="eintrag-titel">+ {p.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="knoepfe">
                  <button type="button" onClick={() => setAuswahlOffen(false)}>
                    {t('trip.fertig')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
