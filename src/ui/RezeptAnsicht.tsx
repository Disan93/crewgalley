import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { db } from '../db/datenbank'
import { kopiereRezept, rezeptVerwendung } from '../logic/rezepte'
import type { Rezept } from '../logic/typen'
import { formatZahl } from '../logic/zahlen'
import { Seite } from './Seite'

export function RezeptAnsicht() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [meldung, setMeldung] = useState<string | null>(null)
  const daten = useLiveQuery(
    async () => ({ rezept: id ? await db.rezepte.get(id) : undefined, zutaten: await db.zutaten.toArray() }),
    [id],
  )

  if (!daten) return null
  const { rezept, zutaten } = daten
  if (!rezept) {
    return (
      <Seite titel={t('rezepte.titel')} zurueck="/rezepte">
        <p className="hinweis">{t('allgemein.nichtGefunden')}</p>
      </Seite>
    )
  }

  const ausstattung = [
    t('rezepte.minuten', { n: rezept.zubereitungszeitMin }),
    t('rezepte.flammen', { n: rezept.flammen }),
    ...(rezept.brauchtOfen ? [t('rezepte.ofen')] : []),
    ...(rezept.brauchtGrill ? [t('rezepte.grill')] : []),
  ]

  async function kopieren(r: Rezept) {
    const kopie = kopiereRezept(r, t('rezepte.kopieName', { name: r.name }))
    await db.rezepte.add(kopie)
    navigate(`/rezepte/${kopie.id}/bearbeiten`)
  }

  async function loeschen(r: Rezept) {
    const trips = rezeptVerwendung(r.id, await db.trips.toArray())
    if (trips.length > 0) {
      setMeldung(t('rezepte.nichtLoeschbar', { wo: trips.join(', ') }))
      return
    }
    if (!window.confirm(t('rezepte.loeschenFrage', { name: r.name }))) return
    await db.rezepte.delete(r.id)
    navigate('/rezepte', { replace: true })
  }

  return (
    <Seite titel={rezept.name} zurueck="/rezepte">
      <p className="hinweis">
        {t(`kategorie.${rezept.kategorie}`)} · {t(`ernaehrung.${rezept.ernaehrungsstufe}`)} ·{' '}
        {t(`quelle.${rezept.quelle}`)}
      </p>
      <p>{ausstattung.join(' · ')}</p>
      {rezept.merkmale.length > 0 && (
        <ul className="marken">
          {rezept.merkmale.map((m) => (
            <li key={m}>{t(`merkmal.${m}`)}</li>
          ))}
        </ul>
      )}

      <h2>{t('rezepte.zutatenProPortion')}</h2>
      <dl className="werte">
        {rezept.zutaten.map((rz) => {
          const zutat = zutaten.find((z) => z.id === rz.zutatId)
          return (
            <div key={rz.zutatId} className="werte-zeile">
              <dt>{zutat?.name ?? '?'}</dt>
              <dd>
                {formatZahl(rz.mengeProPortion)} {zutat ? t(`einheit.${zutat.einheit}`) : ''}
              </dd>
            </div>
          )
        })}
      </dl>

      {rezept.zubereitung !== '' && (
        <>
          <h2>{t('rezepte.zubereitung')}</h2>
          <p className="fliesstext">{rezept.zubereitung}</p>
        </>
      )}

      {rezept.quelle === 'mitgeliefert' && <p className="hinweis">{t('rezepte.mitgeliefertHinweis')}</p>}

      <div className="knoepfe">
        {rezept.quelle === 'eigen' && (
          <Link className="knopf" to={`/rezepte/${rezept.id}/bearbeiten`}>
            {t('allgemein.bearbeiten')}
          </Link>
        )}
        <button type="button" className="zweitrangig" onClick={() => kopieren(rezept)}>
          {t('rezepte.kopieren')}
        </button>
        {rezept.quelle === 'eigen' && (
          <button type="button" className="gefahr" onClick={() => loeschen(rezept)}>
            {t('allgemein.loeschen')}
          </button>
        )}
      </div>
      {meldung && (
        <p className="meldung fehler" role="alert">
          {meldung}
        </p>
      )}
    </Seite>
  )
}
