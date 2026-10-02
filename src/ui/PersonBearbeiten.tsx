import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { db } from '../db/datenbank'
import { personVerwendung } from '../logic/personen'
import type { Person } from '../logic/typen'
import { PersonFormular } from './PersonFormular'
import { Seite } from './Seite'

export function PersonBearbeiten() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [meldung, setMeldung] = useState<string | null>(null)
  // null = nicht gefunden, undefined = lädt noch
  const person = useLiveQuery(async () => (id ? ((await db.personen.get(id)) ?? null) : null), [id])

  if (person === undefined) return null
  const titel = id ? t('personen.bearbeitenTitel') : t('personen.neuTitel')

  if (id && !person) {
    return (
      <Seite titel={titel} zurueck="/personen">
        <p className="hinweis">{t('allgemein.nichtGefunden')}</p>
      </Seite>
    )
  }

  async function loeschen(p: Person) {
    const trips = personVerwendung(p.id, await db.trips.toArray())
    if (trips.length > 0) {
      setMeldung(t('personen.nichtLoeschbar', { wo: trips.join(', ') }))
      return
    }
    if (!window.confirm(t('personen.loeschenFrage', { name: p.name }))) return
    await db.personen.delete(p.id)
    navigate('/personen', { replace: true })
  }

  return (
    <Seite titel={titel} zurueck="/personen">
      <PersonFormular
        key={id ?? 'neu'}
        person={person ?? undefined}
        onFertig={() => navigate('/personen', { replace: true })}
        onAbbrechen={() => navigate('/personen', { replace: true })}
      />
      {person && (
        <button type="button" className="gefahr" onClick={() => loeschen(person)}>
          {t('allgemein.loeschen')}
        </button>
      )}
      {meldung && (
        <p className="meldung fehler" role="alert">
          {meldung}
        </p>
      )}
    </Seite>
  )
}
