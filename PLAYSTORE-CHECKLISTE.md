# CrewGalley in den Play Store bringen – Checkliste

Diese Liste führt dich Schritt für Schritt von der fertigen Web-App zur Android-App
im Google Play Store mit Pro-Upgrade. Hake ab, was erledigt ist.

**Festgelegt:**

| | |
|---|---|
| App-Name | CrewGalley |
| Paketname | `app.crewgalley` (nach der ersten Veröffentlichung nicht mehr änderbar) |
| Adresse der Web-App | https://disan93.github.io/crewgalley/ |
| Produkt-ID des Einmalkaufs | `pro_upgrade` |
| Farben | Theme `#2E6B4A`, Hintergrund `#2E6B4A` |

**So funktioniert das Ganze:** Die Android-App ist nur eine dünne Hülle („Trusted Web
Activity“), die die Web-App ohne Adressleiste anzeigt. Änderungen an der Web-App
kommen deshalb automatisch in der Android-App an. Ein neues Paket brauchst du nur,
wenn sich Name, Icon, Paket-Einstellungen oder die Versionsnummer ändern.

---

## Teil 1 – Vorbereitung am PC

### 1.1 Datenschutzerklärung veröffentlichen

Die Seite ist bewusst noch nicht online. Der Entwurf (deutsch und englisch) liegt in
`docs/datenschutz-entwurf.html`. Google verlangt die Adresse für jede App im Play
Store, auch für kostenlose.

- [ ] In `docs/datenschutz-entwurf.html` alle gelb markierten Stellen mit `[PRÜFEN]`
      ausfüllen (Name, Anschrift, E-Mail, Datum; deutsch und englisch).
- [ ] Seite veröffentlichen (Claude Code: „veröffentliche die Datenschutzseite“).
      Dabei wandert die Datei nach `public/datenschutz/index.html`, und in den
      Einstellungen der App erscheint wieder der Link dorthin.
- [ ] Prüfen: https://disan93.github.io/crewgalley/datenschutz/ ist erreichbar und
      zeigt keine `[PRÜFEN]`-Stellen. Diese Adresse trägst du in der Play Console ein.
- [ ] Vor dem Einschalten des Kaufs klären, ob du zusätzlich ein Impressum brauchst.

Die Texte sind ein einfacher Entwurf und keine Rechtsberatung.

### 1.2 Bubblewrap installieren

Bubblewrap ist das Werkzeug von Google, das aus der Web-App das Android-Paket baut.
Öffne ein Terminal (PowerShell) und führe aus:

```bash
npm install -g @bubblewrap/cli
```

Beim ersten Start fragt Bubblewrap, ob es das **JDK** (Java) und das **Android SDK**
selbst herunterladen soll. Beide Male mit **Yes** antworten und die Lizenz des
Android SDK bestätigen. Das dauert einige Minuten und braucht etwa 1–2 GB Platz.

### 1.3 Android-Projekt anlegen und Signaturschlüssel erzeugen

Das Android-Projekt und der Schlüssel liegen **außerhalb** des Ordners `crewgalley`,
damit sie nicht versehentlich bei GitHub landen.

```bash
mkdir C:\Users\User\crewgalley-android
```

```bash
cd C:\Users\User\crewgalley-android
```

```bash
bubblewrap init --manifest https://disan93.github.io/crewgalley/manifest.webmanifest
```

Bubblewrap stellt jetzt Fragen. Die meisten Vorschläge stammen aus dem Manifest und
passen; mit Enter übernimmst du sie. Wichtig sind diese Antworten:

| Frage (sinngemäß) | Antwort |
|---|---|
| Domain | `disan93.github.io` |
| URL path / Start URL | `/crewgalley/` |
| Application name | `CrewGalley` |
| Short name / Launcher name | `CrewGalley` |
| Application ID | `app.crewgalley` |
| Display mode | `standalone` |
| Status bar color / Theme color | `#2E6B4A` |
| Splash screen / Background color | `#2E6B4A` |
| Icon URL | `https://disan93.github.io/crewgalley/icons/icon-512.png` |
| Maskable icon URL | `https://disan93.github.io/crewgalley/icons/icon-maskable-512.png` |
| Include support for Play Billing? | **Yes** |
| Key store location | `C:\Users\User\crewgalley-schluessel\android.keystore` |
| Key name (Alias) | `crewgalley` |
| Create a new key? | **Yes** |

Beim Anlegen des Schlüssels fragt Bubblewrap nach Name, Organisation, Land
(z. B. `AT`) und nach **zwei Passwörtern** (für die Schlüsseldatei und für den
Schlüssel). Denke dir sichere Passwörter aus und trage sie sofort in deinen
Passwort-Manager ein.

- [ ] `bubblewrap init` ist ohne Fehler durchgelaufen.

**Falls die Frage nach Play Billing nicht erscheint:** im Ordner `crewgalley` ausführen

```bash
node scripts/twa-billing-aktivieren.mjs "C:\Users\User\crewgalley-android"
```

und danach im Android-Ordner

```bash
bubblewrap update
```

### 1.4 Signaturschlüssel sichern – wichtig

Der Schlüssel beweist gegenüber Google, dass ein Update wirklich von dir kommt.

- [ ] Datei `C:\Users\User\crewgalley-schluessel\android.keystore` an **zwei** Orte
      kopieren, die nicht dieser PC sind (z. B. USB-Stick und privater Cloud-Speicher).
- [ ] Beide Passwörter und den Alias `crewgalley` im Passwort-Manager speichern.
- [ ] Der Schlüssel gehört **nie** in das Git-Repository. Zur Sicherheit sind
      `*.keystore`, `*.jks`, `*.aab`, `*.apk` in `.gitignore` eingetragen.
- [ ] Den Schlüssel und die Passwörter niemandem schicken, auch nicht per Chat.

Geht der Schlüssel verloren, kannst du keine Updates mehr hochladen. Mit „Play App
Signing“ (Standard, siehe 2.3) lässt sich bei Google ein neuer Upload-Schlüssel
beantragen; das ist aber umständlich und dauert.

### 1.5 Paket bauen

```bash
cd C:\Users\User\crewgalley-android
```

```bash
bubblewrap build
```

Bubblewrap fragt nach den beiden Passwörtern. Ergebnis im selben Ordner:

- `app-release-bundle.aab` – das lädst du in die Play Console hoch
- `app-release-signed.apk` – zum direkten Testen auf dem eigenen Handy
- `assetlinks.json` – siehe Teil 3

- [ ] `app-release-bundle.aab` ist entstanden.

---

## Teil 2 – Play Console

### 2.1 Entwicklerkonto

- [ ] Konto anlegen unter https://play.google.com/console (einmalig 25 US-Dollar).
- [ ] Identität bestätigen (Ausweis; kann einige Tage dauern).
- Für neue **private** Konten verlangt Google vor der Veröffentlichung einen
  geschlossenen Test mit mehreren Testern über etwa zwei Wochen. Die aktuell
  geltenden Zahlen stehen in der Play Console.

### 2.2 App anlegen

- [ ] „App erstellen“: Name **CrewGalley**, Standardsprache Deutsch, Typ **App**,
      **kostenlos** (das Pro-Upgrade ist ein Kauf in der App, die App selbst kostet nichts).

### 2.3 Erstes Paket hochladen (interner Test)

- [ ] Testen → **Interner Test** → „Neuen Release erstellen“.
- [ ] **Play App Signing** aktiviert lassen (Standard).
- [ ] `app-release-bundle.aab` hochladen, Release-Namen vergeben, speichern.
- [ ] Unter „Tester“ deine eigene Google-Adresse eintragen und den Test-Link am
      Handy öffnen.

### 2.4 Store-Eintrag

- [ ] Kurzbeschreibung (max. 80 Zeichen) und vollständige Beschreibung
- [ ] App-Icon: `public/icons/playstore-icon-512.png`
- [ ] Feature-Grafik **1024 × 500** Pixel
- [ ] Mindestens 2 Handy-Screenshots (am besten Menü, Einkaufsliste, Abrechnung;
      hell und dunkel)
- [ ] Kategorie (z. B. „Essen & Trinken“ oder „Reisen & Lokales“), Kontakt-E-Mail
- [ ] Datenschutzerklärung: https://disan93.github.io/crewgalley/datenschutz/

### 2.5 Pflichtformulare unter „App-Inhalte“

- [ ] **Datensicherheit:** Die App erhebt und überträgt selbst keine Nutzerdaten;
      alles bleibt auf dem Gerät. Käufe laufen über Google Play. Falls du einen
      Bestätigungs-Dienst einrichtest (Teil 4.3), musst du hier angeben, dass der
      Kaufbeleg übertragen wird.
- [ ] **Inhaltsbewertung:** Fragebogen ausfüllen (keine Gewalt, kein Glücksspiel usw.).
- [ ] **Zielgruppe:** Erwachsene/ab 13; die App richtet sich nicht an Kinder.
- [ ] **Werbung:** enthält keine Werbung.

---

## Teil 3 – Adressleiste ausblenden (Digital Asset Links)

Android zeigt die App nur dann ohne Browserleiste, wenn die Webseite bestätigt, dass
die App zu ihr gehört. Dafür muss eine Datei unter genau dieser Adresse liegen:

    https://disan93.github.io/.well-known/assetlinks.json

**Achtung:** Das ist die Wurzel von `disan93.github.io`, nicht der Unterordner
`/crewgalley/`. Das Repository `crewgalley` kann die Datei deshalb nicht ausliefern.
Du brauchst ein zweites Repository:

- [ ] Auf GitHub ein öffentliches Repository mit dem Namen **`Disan93.github.io`** anlegen.
- [ ] Darin eine leere Datei `.nojekyll` anlegen (sonst ignoriert GitHub Ordner, die
      mit einem Punkt beginnen).
- [ ] Die Datei `assetlinks.json` aus `C:\Users\User\crewgalley-android` als
      `.well-known/assetlinks.json` hochladen. Eine Vorlage zum Vergleichen liegt in
      `docs/assetlinks.vorlage.json`.
- [ ] In den Einstellungen des Repositorys unter „Pages“ den Branch `main` als Quelle wählen.

**Zweiter Fingerabdruck – nicht vergessen:** Mit Play App Signing signiert Google
die App für die Nutzer mit einem **eigenen** Schlüssel. Dessen Fingerabdruck muss
zusätzlich in der Datei stehen, sonst erscheint bei Installationen aus dem Play
Store doch die Adressleiste.

- [ ] Play Console → Testen und veröffentlichen → Einrichten → **App-Signatur** →
      „SHA-256-Zertifikatfingerabdruck“ des **App-Signaturschlüssels** kopieren.
- [ ] Im Android-Ordner ausführen (Fingerabdruck einsetzen):

```bash
bubblewrap fingerprint add AA:BB:CC:...
```

```bash
bubblewrap fingerprint generateAssetLinks
```

- [ ] Die neu erzeugte `assetlinks.json` (jetzt mit zwei Fingerabdrücken) erneut
      nach `Disan93.github.io` hochladen.
- [ ] Prüfen mit https://developers.google.com/digital-asset-links/tools/generator
      (Domain `disan93.github.io`, Paketname `app.crewgalley`).
- [ ] App aus dem internen Test installieren: Sie startet **ohne** Adressleiste.

---

## Teil 4 – Pro-Upgrade einschalten

Solange `BILLING_ENABLED` in `src/pro/config.ts` auf `false` steht, kann niemand
kaufen und **nichts ist gesperrt**. Erst wenn alles Folgende erledigt ist, wird
umgeschaltet.

### 4.1 Händlerkonto

- [ ] Play Console → Einrichten → **Zahlungsprofil** anlegen (Bankverbindung,
      Steuerangaben). Ohne Zahlungsprofil lassen sich keine Produkte anlegen.

### 4.2 Produkt anlegen

- [ ] Monetarisieren → Produkte → **In-App-Produkte** → „Produkt erstellen“.
      (Der Menüpunkt erscheint erst, nachdem ein Paket mit Play Billing hochgeladen wurde.)
- [ ] Produkt-ID exakt: **`pro_upgrade`** (nicht mehr änderbar).
- [ ] Name („CrewGalley Pro“), Beschreibung, Preis festlegen, **aktivieren**.

### 4.3 Kaufbestätigung – vor dem Einschalten klären

Google verlangt, dass jeder Kauf innerhalb von **drei Tagen bestätigt** wird
(„acknowledge“). Unbestätigte Käufe werden automatisch erstattet und das Pro-Upgrade
wieder entzogen. Laut der offiziellen Chrome-Dokumentation zur Digital Goods API
geschieht diese Bestätigung über einen **eigenen Server**, der bei Google nachfragt;
die Web-App selbst kann es nicht. CrewGalley hat bisher keinen Server.

- [ ] **Zuerst testen, wie sich die App ohne Server verhält** (Schritt 4.5): Wird ein
      Testkauf nach wenigen Minuten automatisch storniert, brauchst du den Dienst.
- [ ] Falls nötig: einen kleinen Bestätigungs-Dienst einrichten (z. B. eine
      Cloud-Funktion), der den Kaufbeleg entgegennimmt und bei der „Google Play
      Developer API“ `purchases.products.acknowledge` aufruft. Die Adresse kommt in
      `BESTAETIGUNGS_URL` in `src/pro/config.ts`. Die App schickt dorthin per POST
      `{ "produktId": "pro_upgrade", "purchaseToken": "…" }`.
      Dafür ist ein Dienstkonto in der Google Cloud nötig; das ist eine eigene
      Aufgabe (Claude Code: „richte den Bestätigungs-Dienst ein“).
- [ ] Datenschutzerklärung und Formular „Datensicherheit“ entsprechend anpassen.

### 4.4 Umschalten und neue Version hochladen

- [ ] In `src/pro/config.ts`: `BILLING_ENABLED = true`.
      (Der Test „der Kauf ist im Projekt noch ausgeschaltet“ in `src/pro/pro.test.ts`
      schlägt dann absichtlich fehl; er wird beim Umschalten angepasst.)
- [ ] Web-App hochladen. **Ab jetzt gelten die Sperren für alle**, auch im Browser:
      Dort lässt sich Pro nicht kaufen („Pro ist in der Android-App erhältlich“).
- [ ] Ein neues Android-Paket ist dafür nicht nötig, weil nur die Web-App geändert wurde.
      Falls du doch eines baust: vorher in `twa-manifest.json` `appVersionCode` um 1
      erhöhen (`bubblewrap update` fragt danach), dann `bubblewrap build`.

### 4.5 Kauf testen

- [ ] Play Console → Einrichten → **Lizenztests**: deine Google-Adresse als
      Lizenztester eintragen. Testkäufe kosten dann nichts.
- [ ] App aus dem internen Test installieren, eine gesperrte Funktion antippen,
      „Pro freischalten“, Testkauf abschließen.
- [ ] Prüfen: Die Sperren sind weg. Nach **10 Minuten** App schließen und neu öffnen:
      Ist Pro noch aktiv? Wenn nein, wurde der Kauf mangels Bestätigung storniert
      → Abschnitt 4.3.
- [ ] App deinstallieren, neu installieren, „Käufe wiederherstellen“: Pro ist wieder da.
- [ ] Kauf abbrechen: Es erscheint „Der Kauf wurde abgebrochen“, nichts wird freigeschaltet.

---

## Teil 5 – Veröffentlichen

- [ ] Geschlossenen Test durchführen, falls dein Konto ihn verlangt (siehe 2.1).
- [ ] Produktion → neuen Release mit demselben Paket erstellen → zur Prüfung einreichen.
- [ ] Nach der Freigabe: App aus dem Play Store installieren und Teil 3 und 4.5
      noch einmal kurz durchgehen.

## Vor dem Einreichen prüfen

- [ ] App funktioniert im Flugmodus
- [ ] Sicherung erstellt und wiederhergestellt
- [ ] Einkaufsliste und Abrechnung geteilt (z. B. per WhatsApp)
- [ ] Hell und Dunkel sehen richtig aus
- [ ] Icon erscheint rund und eckig ohne abgeschnittene Teile
