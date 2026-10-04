import { Lock } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { db } from '../db/datenbank'
import { filtereRezepte } from '../logic/rezepte'
import type { Rezept, RezeptKategorie } from '../logic/typen'
import { proPfad, usePro } from '../pro/usePro'
import { KATEGORIEN } from './auswahl'
import { Seite } from './Seite'

export function RezepteSeite() {
  const { t } = useTranslation()
  const { gesperrt } = usePro()
  const [suche, setSuche] = useState('')
  const [kategorie, setKategorie] = useState<RezeptKategorie | null>(null)
  const rezepte = useLiveQuery(() => db.rezepte.toArray())

  const treffer = filtereRezepte(rezepte ?? [], { suche, kategorie })

  function unterzeile(r: Rezept): string {
    const teile = [
      t(`kategorie.${r.kategorie}`),
      t(`ernaehrung.${r.ernaehrungsstufe}`),
      t('rezepte.minuten', { n: r.zubereitungszeitMin }),
    ]
    if (r.quelle === 'eigen') teile.push(t('quelle.eigen'))
    return teile.join(' · ')
  }

  return (
    <Seite titel={t('rezepte.titel')} zurueck="/">
      <Link className="knopf" to={gesperrt ? proPfad('/rezepte') : '/rezepte/neu'}>
        {gesperrt && <Lock size={18} aria-hidden="true" />}
        {t('rezepte.neu')}
      </Link>
      <input
        className="suchfeld"
        type="search"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        placeholder={t('allgemein.suche')}
        aria-label={t('allgemein.suche')}
      />
      <div className="chips">
        <button type="button" className="chip" aria-pressed={kategorie === null} onClick={() => setKategorie(null)}>
          {t('allgemein.alle')}
        </button>
        {KATEGORIEN.map((k) => (
          <button key={k} type="button" className="chip" aria-pressed={kategorie === k} onClick={() => setKategorie(k)}>
            {t(`kategorie.${k}`)}
          </button>
        ))}
      </div>

      {rezepte && treffer.length === 0 && <p className="hinweis">{t('allgemein.keineTreffer')}</p>}

      <ul className="liste">
        {treffer.map((r) => (
          <li key={r.id}>
            <Link className="eintrag" to={`/rezepte/${r.id}`}>
              <span className="eintrag-titel">{r.name}</span>
              <span className="eintrag-unterzeile">{unterzeile(r)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Seite>
  )
}
