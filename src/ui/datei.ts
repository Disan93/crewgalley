/** Bietet einen Text als Datei zum Herunterladen an */
export function ladeHerunter(dateiname: string, text: string, typ = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: typ }))
  const link = document.createElement('a')
  link.href = url
  link.download = dateiname
  link.click()
  URL.revokeObjectURL(url)
}
