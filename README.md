# CrewGalley

Mobile Web-App (PWA) zum Planen von Essen und Kosten für Gruppenwochenenden
(Hütte, Segeltörn, …). Daten bleiben nur auf dem Gerät.

## Befehle

| Befehl | Was passiert |
|---|---|
| `npm run dev` | Startet die App zum Entwickeln (http://localhost:5173) |
| `npm test` | Lässt alle automatischen Tests einmal laufen |
| `npm run build` | Prüft den Code und baut die fertige App in den Ordner `dist` |
| `npm run preview` | Zeigt die gebaute App aus `dist` (so wie später im Internet) |

## Ordner

- `src/logic/` – Rechenlogik als reine Funktionen, mit Tests (`*.test.ts`), ohne Oberfläche
- `src/locales/` – Sprachdateien (alle App-Texte)
- `public/` – App-Icons
