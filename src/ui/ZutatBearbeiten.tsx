import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { db } from '../db/datenbank'
import { standardEinstellungen } from '../logic/sicherung'
import type { Zutat } from '../logic/typen'
import { istUnbenutzt, zutatVerwendung } from '../logic/zutaten'
import { Seite } from './Seite'
import { ZutatFormular } from './ZutatFormular'

export function ZutatBearbeiten() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [meldung, setMeldung] = useState<string | null>(null)
  const zutaten = useLiveQuery(() => db.zutaten.toArray())

  if (!zutaten) return null
  const zutat = id ? zutaten.find((z) => z.id === id) : undefined
  const titel = id ? t('zutaten.bearbeitenTitel') : t('zutaten.neuTitel')

  if (id && !zutat) {
    return (
      <Seite titel={titel} zurueck="/zutaten">
        <p className="hinweis">{t('allgemein.nichtGefunden')}</p>
      </Seite>
    )
  }

  async function loeschen(z: Zutat) {
    if (z.quelle === 'mitgeliefert') {
      setMeldung(t('zutaten.nichtLoeschbarMitgeliefert'))
      return
    }
    const verwendung = zutatVerwendung(z.id, {
      rezepte: await db.rezepte.toArray(),
      trips: await db.trips.toArray(),
      einstellungen: (await db.einstellungen.get('app')) ?? standardEinstellungen(),
    })
    if (!istUnbenutzt(verwendung)) {
      const wo = [
        ...verwendung.rezepte,
        ...verwendung.trips,
        ...(verwendung.standardGrundausstattung ? [t('zutaten.inGrundausstattung')] : []),
      ].join(', ')
      setMeldung(t('zutaten.nichtLoeschbarVerwendet', { wo }))
      return
    }
    if (!window.confirm(t('zutaten.loeschenFrage', { name: z.name }))) return
    await db.zutaten.delete(z.id)
    navigate('/zutaten', { replace: true })
  }

  return (
    <Seite titel={titel} zurueck="/zutaten">
      <ZutatFormular
        key={id ?? 'neu'}
        zutat={zutat}
        alle={zutaten}
        onFertig={() => navigate('/zutaten', { replace: true })}
        onAbbrechen={() => navigate('/zutaten', { replace: true })}
      />
      {zutat && (
        <button type="button" className="gefahr" onClick={() => loeschen(zutat)}>
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
