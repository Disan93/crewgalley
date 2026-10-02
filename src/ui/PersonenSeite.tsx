import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { db } from '../db/datenbank'
import type { Person } from '../logic/typen'
import { formatZahl } from '../logic/zahlen'
import { nachName } from '../logic/zutaten'
import { Seite } from './Seite'

export function PersonenSeite() {
  const { t } = useTranslation()
  const personen = useLiveQuery(() => db.personen.toArray())

  function unterzeile(p: Person): string {
    return [
      t('personen.faktor', { faktor: formatZahl(p.portionsfaktor) }),
      p.ernaehrung === 'alles' ? t('personen.ernaehrungAlles') : t(`ernaehrung.${p.ernaehrung}`),
      ...p.unvertraeglichkeiten.map((u) => t(`unvertraeglichkeit.${u}`)),
    ].join(' · ')
  }

  return (
    <Seite titel={t('personen.titel')} zurueck="/">
      <Link className="knopf" to="/personen/neu">
        {t('personen.neu')}
      </Link>

      {personen?.length === 0 && <p className="hinweis">{t('personen.leer')}</p>}

      <ul className="liste">
        {nachName(personen ?? []).map((p) => (
          <li key={p.id}>
            <Link className="eintrag" to={`/personen/${p.id}`}>
              <span className="eintrag-titel">{p.name}</span>
              <span className="eintrag-unterzeile">{unterzeile(p)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Seite>
  )
}
