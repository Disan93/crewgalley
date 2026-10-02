import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { db } from '../db/datenbank'
import { ABTEILUNGEN, type Zutat } from '../logic/typen'
import { formatEuro, formatZahl } from '../logic/zahlen'
import { sucheZutaten } from '../logic/zutaten'
import { Seite } from './Seite'

export function ZutatenSeite() {
  const { t } = useTranslation()
  const [suche, setSuche] = useState('')
  const daten = useLiveQuery(async () => ({
    zutaten: await db.zutaten.toArray(),
    einstellungen: await db.einstellungen.get('app'),
  }))

  const treffer = sucheZutaten(daten?.zutaten ?? [], suche)
  const reihenfolge = daten?.einstellungen?.abteilungsReihenfolge ?? ABTEILUNGEN

  function unterzeile(z: Zutat): string {
    const teile: string[] = []
    if (z.packungsgroesse !== null) teile.push(`${formatZahl(z.packungsgroesse)} ${t(`einheit.${z.einheit}`)}`)
    if (z.richtpreis !== null) teile.push(`${formatEuro(z.richtpreis)} €`)
    if (z.kuehlpflichtig) teile.push(t('zutaten.kuehl'))
    if (z.quelle === 'eigen') teile.push(t('quelle.eigen'))
    return teile.join(' · ')
  }

  return (
    <Seite titel={t('zutaten.titel')} zurueck="/">
      <Link className="knopf" to="/zutaten/neu">
        {t('zutaten.neu')}
      </Link>
      <input
        className="suchfeld"
        type="search"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        placeholder={t('allgemein.suche')}
        aria-label={t('allgemein.suche')}
      />

      {daten && treffer.length === 0 && <p className="hinweis">{t('allgemein.keineTreffer')}</p>}

      {reihenfolge.map((abteilung) => {
        const gruppe = treffer.filter((z) => z.abteilung === abteilung)
        if (gruppe.length === 0) return null
        return (
          <section key={abteilung}>
            <h2 className="gruppe">{t(`abteilung.${abteilung}`)}</h2>
            <ul className="liste">
              {gruppe.map((z) => (
                <li key={z.id}>
                  <Link className="eintrag" to={`/zutaten/${z.id}`}>
                    <span className="eintrag-titel">{z.name}</span>
                    <span className="eintrag-unterzeile">{unterzeile(z)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </Seite>
  )
}
