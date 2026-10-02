import { ChevronLeft } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

interface SeiteProps {
  titel: string
  /** Ziel des Zurück-Pfeils; ohne Angabe gibt es keinen Pfeil */
  zurueck?: string
  /** Der Titel steht schon groß im Inhalt (z. B. in der Kopfkarte) und wird oben nicht angezeigt */
  titelVersteckt?: boolean
  children: ReactNode
}

/** Rahmen jeder Unterseite: Kopfzeile mit Zurück-Pfeil und Titel */
export function Seite({ titel, zurueck, titelVersteckt = false, children }: SeiteProps) {
  const { t } = useTranslation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <header className="kopf leiste">
        {zurueck !== undefined && (
          <Link className="zurueck" to={zurueck} aria-label={t('allgemein.zurueck')}>
            <ChevronLeft size={24} aria-hidden="true" />
          </Link>
        )}
        <h1 className={titelVersteckt ? 'unsichtbar' : undefined}>{titel}</h1>
      </header>
      <main className="inhalt">{children}</main>
    </>
  )
}
