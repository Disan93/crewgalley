import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export function StartSeite() {
  const { t } = useTranslation()

  return (
    <>
      <header className="kopf">
        <h1>{t('app.name')}</h1>
        <p>{t('app.untertitel')}</p>
      </header>
      <main className="inhalt">
        <h2>{t('start.trips')}</h2>
        <p className="hinweis">{t('start.leer')}</p>

        <nav className="kacheln">
          <Link className="kachel" to="/rezepte">
            {t('start.rezepte')}
          </Link>
          <Link className="kachel" to="/zutaten">
            {t('start.zutaten')}
          </Link>
          <Link className="kachel" to="/einstellungen">
            {t('start.einstellungen')}
          </Link>
        </nav>
      </main>
    </>
  )
}
