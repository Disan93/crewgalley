import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './locales/de.json'

// Alle App-Texte stehen in src/locales/. V1 nur Deutsch; weitere Sprachen
// kommen später als zusätzliche Datei + Eintrag in "resources" dazu.
i18n.use(initReactI18next).init({
  resources: { de: { translation: de } },
  lng: 'de',
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
})

export default i18n
