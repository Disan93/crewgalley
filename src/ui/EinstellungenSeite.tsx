import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { db } from '../db/datenbank'
import { DatenBereich } from './DatenBereich'
import { GrundausstattungEditor } from './GrundausstattungEditor'
import { Seite } from './Seite'

export function EinstellungenSeite() {
  const { t } = useTranslation()
  const daten = useLiveQuery(async () => ({
    einstellungen: await db.einstellungen.get('app'),
    zutaten: await db.zutaten.toArray(),
  }))

  return (
    <Seite titel={t('einstellungen.titel')} zurueck="/">
      <Link className="knopf zweitrangig" to="/zutaten">
        {t('einstellungen.zutatenVerwalten')}
      </Link>

      {daten?.einstellungen && (
        <section className="karte">
          <h2>{t('grundausstattung.standardTitel')}</h2>
          <p className="hinweis">{t('grundausstattung.standardHinweis')}</p>
          <GrundausstattungEditor
            posten={daten.einstellungen.standardGrundausstattung}
            zutaten={daten.zutaten}
            onAendern={(standardGrundausstattung) =>
              void db.einstellungen.update('app', { standardGrundausstattung })
            }
          />
        </section>
      )}

      <DatenBereich />
    </Seite>
  )
}
