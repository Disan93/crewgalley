interface ZaehlerProps {
  wert: number
  min: number
  max: number
  onAendern: (wert: number) => void
  /** Texte für Vorlese-Programme, z. B. "Einen Tag weniger" */
  wenigerText: string
  mehrText: string
}

/** Zahl mit großen Minus- und Plus-Knöpfen */
export function Zaehler({ wert, min, max, onAendern, wenigerText, mehrText }: ZaehlerProps) {
  return (
    <div className="zaehler">
      <button
        type="button"
        className="zweitrangig klein"
        aria-label={wenigerText}
        disabled={wert <= min}
        onClick={() => onAendern(wert - 1)}
      >
        −
      </button>
      <output>{wert}</output>
      <button
        type="button"
        className="zweitrangig klein"
        aria-label={mehrText}
        disabled={wert >= max}
        onClick={() => onAendern(wert + 1)}
      >
        +
      </button>
    </div>
  )
}
