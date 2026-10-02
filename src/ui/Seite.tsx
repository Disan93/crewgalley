import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

interface SeiteProps {
  titel: string
  /** Ziel des Zurück-Pfeils; ohne Angabe gibt es keinen Pfeil */
  zurueck?: string
  children: ReactNode
}

/** Rahmen jeder Unterseite: Kopfzeile mit Zurück-Pfeil und Titel */
export function Seite({ titel, zurueck, children }: SeiteProps) {
  const { t } = useTranslation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <header className="kopf leiste">
        {zurueck !== undefined && (
          <Link className="zurueck" to={zurueck} aria-label={t('allgemein.zurueck')}>
            ‹
          </Link>
        )}
        <h1>{titel}</h1>
      </header>
      <main className="inhalt">{children}</main>
    </>
  )
}
