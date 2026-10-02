import { useTranslation } from 'react-i18next'
import './App.css'
import { DatenBereich } from './ui/DatenBereich'

function App() {
  const { t } = useTranslation()

  return (
    <>
      <header className="kopf">
        <h1>{t('app.name')}</h1>
        <p>{t('app.untertitel')}</p>
      </header>
      <main className="inhalt">
        <p className="leer">{t('start.leer')}</p>
        <p className="hinweis">{t('start.hinweis')}</p>
        <DatenBereich />
      </main>
    </>
  )
}

export default App
