import { useState } from 'react'

interface EingabeProps {
  /** gespeicherter Wert als Text */
  wert: string
  /** Wird beim Verlassen des Feldes aufgerufen, wenn der Text gültig ist und sich geändert hat */
  onUebernehmen: (text: string) => void
  /** Ungültige Eingaben werden beim Verlassen verworfen */
  pruefe: (text: string) => boolean
  inputMode?: 'text' | 'decimal' | 'numeric'
  beschriftung?: string
}

/**
 * Textfeld, das sofort speichert: Während des Tippens bleibt der Text nur im Feld,
 * erst beim Verlassen (oder Enter) wird er übernommen.
 */
export function Eingabe({ wert, onUebernehmen, pruefe, inputMode = 'text', beschriftung }: EingabeProps) {
  const [text, setText] = useState(wert)
  const [bekannt, setBekannt] = useState(wert)
  // Hat sich der gespeicherte Wert von außen geändert, zeigt das Feld den neuen Wert
  if (wert !== bekannt) {
    setBekannt(wert)
    setText(wert)
  }

  function verlassen() {
    if (text === wert) return
    if (pruefe(text)) onUebernehmen(text)
    else setText(wert)
  }

  return (
    <input
      type="text"
      inputMode={inputMode}
      value={text}
      aria-label={beschriftung}
      onChange={(e) => setText(e.target.value)}
      onBlur={verlassen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}
