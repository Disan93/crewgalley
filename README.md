# CrewGalley

Mobile Web-App (PWA) zum Planen von Essen und Kosten für Gruppenwochenenden
(Hütte, Segeltörn, …). Daten bleiben nur auf dem Gerät.

Live: https://disan93.github.io/crewgalley/ · Play-Store-Anleitung: [PLAYSTORE-CHECKLISTE.md](PLAYSTORE-CHECKLISTE.md)

## Befehle

| Befehl | Was passiert |
|---|---|
| `npm run dev` | Startet die App zum Entwickeln (http://localhost:5173) |
| `npm test` | Lässt alle automatischen Tests einmal laufen |
| `npm run build` | Prüft den Code und baut die fertige App in den Ordner `dist` |
| `npm run preview` | Zeigt die gebaute App aus `dist` (so wie später im Internet) |
| `npm run build:android` | Baut die App für Android und kopiert sie in den Ordner `android` |
| `npx cap open android` | Öffnet das Android-Projekt in Android Studio |
| `npm run icons` | Erzeugt die Web-Icons neu aus `public/icons/icon.svg` |
| `npm run app-assets` | Erzeugt Icon und Startbildschirm der Android-App neu |

## Ordner

- `src/logic/` – Datenmodell und Rechenlogik als reine Funktionen, mit Tests (`*.test.ts`), ohne Oberfläche
- `src/db/` – Datenbank im Browser (IndexedDB), Sichern/Wiederherstellen, Laden der Startdaten
- `src/daten/` – mitgelieferte Zutaten, Rezepte und Grundausstattung als JSON-Dateien
- `src/ui/` – Bildschirme und Formulare
- `src/locales/` – Sprachdateien (alle App-Texte)
- `src/werbung/` – Einstellungen für Werbung (AdMob) und Werbelinks; Werbung gibt es nur in der Android-App
- `android/` – Android-Projekt (Capacitor); wird in Android Studio geöffnet
- `assets/` – Vorlagen für Icon und Startbildschirm der Android-App
- `public/` – App-Icons
