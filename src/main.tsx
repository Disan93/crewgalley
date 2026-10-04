import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import '@fontsource-variable/plus-jakarta-sans'
import './i18n'
import './index.css'
import App from './App.tsx'
import { db } from './db/datenbank'
import { starteDatenbank } from './db/start'
import { pruefeKaeufe } from './pro/billing'
import { ladeProStatus } from './pro/entitlement'
import { wendeGemerktesDesignAn } from './ui/design'

wendeGemerktesDesignAn()
// Pro-Status: erst den gespeicherten Stand laden, dann mit Google Play abgleichen
ladeProStatus()
void pruefeKaeufe()
void starteDatenbank(db)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter: Seiten-Adressen stehen hinter einem #, das funktioniert auch auf GitHub Pages und offline */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
