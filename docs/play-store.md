# CrewGalley in den Google Play Store bringen

Diese Anleitung beschreibt den Weg über **PWABuilder**. Dabei entsteht eine kleine
Android-App („Trusted Web Activity“), die nichts anderes tut, als die Webseite
`https://disan93.github.io/crewgalley/` ohne Adressleiste anzuzeigen. Updates der
Webseite kommen deshalb automatisch in der App an – ein neues Paket ist nur nötig,
wenn sich Name, Icon oder Adresse ändern.

## Was du brauchst

- ein **Google-Play-Entwicklerkonto** (einmalig 25 US-Dollar): https://play.google.com/console
- Für neue private Entwicklerkonten verlangt Google vor der Veröffentlichung einen
  geschlossenen Test mit mehreren Testern über etwa zwei Wochen. Die aktuellen
  Bedingungen stehen in der Play Console.
- eine **Datenschutzerklärung** unter einer öffentlichen Adresse (Pflichtangabe im
  Store). Inhaltlich einfach: Die App speichert alle Daten nur auf dem Gerät und
  überträgt nichts.
- Screenshots vom Handy (mindestens zwei) und eine Feature-Grafik 1024 × 500 Pixel

## Schritt 1: Paket mit PWABuilder erzeugen

1. https://www.pwabuilder.com öffnen und `https://disan93.github.io/crewgalley/` eingeben.
2. PWABuilder prüft Manifest und Service Worker. Hinweise zu fehlenden Screenshots
   im Manifest sind kein Hindernis.
3. **Package for stores → Android** wählen.
4. Wichtige Felder:
   - **Package ID:** z. B. `io.github.disan93.crewgalley` – lässt sich später nie mehr ändern.
   - **App name:** CrewGalley
   - **Signing key:** „New“ wählen. PWABuilder erzeugt einen Schlüssel.
5. Herunterladen. Im ZIP liegen:
   - `app-release-bundle.aab` – das wird in die Play Console hochgeladen
   - `signing.keystore` und `signing-key-info.txt` – **sicher aufbewahren und nicht
     in dieses Repository legen.** Ohne diesen Schlüssel kannst du die App nie wieder
     aktualisieren.
   - `assetlinks.json` – siehe Schritt 2

## Schritt 2: Adressleiste ausblenden (assetlinks.json)

Damit Android der App glaubt, dass sie zur Webseite gehört, muss die Datei
`assetlinks.json` unter genau dieser Adresse erreichbar sein:

    https://disan93.github.io/.well-known/assetlinks.json

**Achtung:** Das ist die Wurzel von `disan93.github.io`, nicht der Unterordner
`/crewgalley/`. Dieses Repository kann die Datei deshalb nicht selbst ausliefern.
Es gibt zwei Wege:

**Weg A – zusätzliches Repository (kostenlos):**

1. Auf GitHub ein neues, öffentliches Repository mit dem Namen `Disan93.github.io` anlegen.
2. Darin eine leere Datei `.nojekyll` anlegen (sonst ignoriert GitHub Ordner, die mit
   einem Punkt beginnen).
3. Die Datei `assetlinks.json` aus dem PWABuilder-ZIP als `.well-known/assetlinks.json` hochladen.
4. In den Repository-Einstellungen unter „Pages“ den Branch `main` als Quelle wählen.

**Weg B – eigene Domain:** CrewGalley unter einer eigenen Domain betreiben; dann liegt
`.well-known/assetlinks.json` im Ordner `public/` dieses Projekts.

Wenn du in der Play Console **Play App Signing** nutzt (Standard), signiert Google die
App mit einem eigenen Schlüssel. Dessen Fingerabdruck (Play Console → Einrichten →
App-Signatur → SHA-256) muss zusätzlich in `assetlinks.json` stehen. Fehlt er, läuft
die App trotzdem, zeigt aber oben eine Adressleiste.

Prüfen kannst du die Datei mit dem „Statement List Generator and Tester“ von Google:
https://developers.google.com/digital-asset-links/tools/generator

## Schritt 3: In der Play Console veröffentlichen

1. App anlegen (Name CrewGalley, Sprache Deutsch, App, kostenlos).
2. Store-Eintrag ausfüllen: Kurzbeschreibung, Beschreibung, Icon (`public/icons/icon-512.png`),
   Screenshots, Feature-Grafik.
3. Fragebögen ausfüllen: Datenschutz („erhebt keine Daten“), Altersfreigabe, Zielgruppe.
4. `app-release-bundle.aab` zuerst in einen Test-Track hochladen und auf dem eigenen
   Handy ausprobieren, dann zur Prüfung für die Produktion einreichen.

## Vor dem Einreichen prüfen

- [ ] App auf einem echten Android-Handy installiert (Chrome → „App installieren“)
- [ ] Funktioniert im Flugmodus
- [ ] Sicherung erstellt und auf einem zweiten Gerät wiederhergestellt
- [ ] Einkaufsliste und Abrechnung per WhatsApp geteilt
- [ ] Bei Sonnenlicht gut lesbar (helles Design)
