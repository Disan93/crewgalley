// Zahlen und Geldbeträge so lesen und schreiben, wie man sie auf Deutsch eintippt (Komma).

/** "0,5" → 0.5; leer, negativ oder kein Zahlentext → null */
export function parseZahl(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

/** 0.5 → "0,5" (höchstens zwei Nachkommastellen) */
export function formatZahl(zahl: number): string {
  return String(Math.round(zahl * 100) / 100).replace('.', ',')
}

/** "1,29" → 129 Cent */
export function parseEuro(text: string): number | null {
  const zahl = parseZahl(text)
  return zahl === null ? null : Math.round(zahl * 100)
}

/** 129 Cent → "1,29" */
export function formatEuro(cent: number): string {
  return (cent / 100).toFixed(2).replace('.', ',')
}
