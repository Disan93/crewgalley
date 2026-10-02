import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './i18n'
import './index.css'
import App from './App.tsx'
import { db } from './db/datenbank'
import { starteDatenbank } from './db/start'
import { wendeGemerktesDesignAn } from './ui/design'

wendeGemerktesDesignAn()
void starteDatenbank(db)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter: Seiten-Adressen stehen hinter einem #, das funktioniert auch auf GitHub Pages und offline */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
