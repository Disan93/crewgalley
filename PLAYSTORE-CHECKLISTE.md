# CrewGalley in den Play Store bringen – Checkliste

Diese Liste führt dich Schritt für Schritt von der fertigen Web-App zur kostenlosen
Android-App mit Banner-Werbung im Google Play Store. Hake ab, was erledigt ist.

**Festgelegt:**

| | |
|---|---|
| App-Name | CrewGalley |
| Paketname | `app.crewgalley` (nach der ersten Veröffentlichung nicht mehr änderbar) |
| Technik | Capacitor: Die Web-App wird in eine Android-App verpackt und läuft dort komplett offline |
| Werbung | nur Banner, nur auf Trip-Übersicht und Rezeptauswahl, über Google AdMob |
| Farbe | `#2E6B4A` |

**So hängt alles zusammen:**

- `npm run build` baut die **Web-Version** (GitHub Pages). Sie bleibt werbefrei.
- `npm run build:android` baut die App neu und kopiert sie in den Ordner `android/`.
  Das ist nach **jeder** Änderung am Code nötig, bevor du in Android Studio startest.
- Die Android-App bekommt Updates **nicht** automatisch über die Webseite. Für jedes
  Update lädst du ein neues Paket in die Play Console hoch.
- Daten der Android-App und der Web-Version sind getrennt. Umziehen geht über
  „Alles sichern“ und „Wiederherstellen“.

> **Nie die eigenen echten Anzeigen antippen.** Google wertet das als Betrug und kann
> das AdMob-Konto dauerhaft sperren. Zum Ausprobieren immer Test-Anzeigen verwenden
> (das ist der Zustand im Projekt) und dein Handy zusätzlich als Testgerät eintragen
> (Schritt 2.4).

---

## Teil 1 – Android Studio und Test auf dem eigenen Handy

### 1.1 Android Studio installieren

- [ ] Von https://developer.android.com/studio herunterladen und installieren.
- [ ] Beim ersten Start den Einrichtungs-Assistenten mit „Standard“ durchlaufen. Er
      lädt das Android SDK herunter (einige GB) und fragt nach der Zustimmung zu den
      Lizenzen.

### 1.2 Projekt öffnen

Im Terminal im Ordner `crewgalley`:

```bash
npm run build:android
```

```bash
npx cap open android
```

- [ ] Android Studio öffnet den Ordner `android`. Unten läuft „Gradle sync“; das
      dauert beim ersten Mal mehrere Minuten. Warten, bis keine Fortschrittsanzeige
      mehr läuft.
- [ ] Meldet Android Studio fehlende Komponenten („Install missing SDK …“), auf den
      angebotenen Link klicken.

### 1.3 Handy vorbereiten

- [ ] Am Handy: Einstellungen → Über das Telefon → sieben Mal auf **Build-Nummer**
      tippen. Damit erscheinen die „Entwickleroptionen“.
- [ ] Einstellungen → System → Entwickleroptionen → **USB-Debugging** einschalten.
- [ ] Handy per USB-Kabel anschließen und die Frage „USB-Debugging zulassen?“ am
      Handy bestätigen.

### 1.4 App starten

- [ ] In Android Studio oben dein Handy in der Geräteliste auswählen und auf den
      grünen Pfeil **Run** klicken. Die App wird installiert und startet.

### 1.5 Was du testen solltest

Diesen Teil konnte ich nicht selbst prüfen, weil dafür ein Android-Gerät nötig ist.

- [ ] Die App startet mit grünem Startbildschirm und zeigt die Trip-Übersicht.
- [ ] **Flugmodus:** App schließen, Flugmodus an, App öffnen. Alles funktioniert,
      und es bleibt keine leere Fläche für Werbung stehen.
- [ ] **Werbung:** Unten auf der Trip-Übersicht und in der Rezeptauswahl erscheint
      ein Banner mit der Aufschrift „Test Ad“. Es verdeckt keinen Knopf; der Inhalt
      lässt sich bis über das Banner scrollen.
- [ ] Keine Werbung auf Menüplan, Einkaufsliste, Kosten und Einstellungen.
- [ ] Hell und Dunkel sehen richtig aus, auch die Statusleiste oben.
- [ ] „Alles sichern“ öffnet das Teilen-Menü; die Datei lässt sich z. B. in „Dateien“
      ablegen. „Wiederherstellen“ liest sie wieder ein.
- [ ] „Liste teilen“, „Abrechnung teilen“ und „Exportieren“ öffnen das Teilen-Menü.
- [ ] Die Zurück-Taste des Handys geht eine Seite zurück.

Die Einwilligungsabfrage erscheint in diesem Stand noch **nicht**: Sie kommt erst,
wenn in deinem AdMob-Konto eine DSGVO-Mitteilung eingerichtet und deine eigene App-ID
eingetragen ist (Teil 2).

---

## Teil 2 – AdMob

### 2.1 Konto anlegen

- [ ] https://admob.google.com → mit deinem Google-Konto anmelden, Land und
      Zahlungsangaben eintragen.

### 2.2 App und Anzeigenblock anlegen

- [ ] Apps → **App hinzufügen** → Plattform Android → „Ist die App in einem
      App-Store gelistet?“ **Nein** → Name „CrewGalley“.
- [ ] Die **App-ID** notieren. Form: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX` (mit `~`).
- [ ] Anzeigenblöcke → **Anzeigenblock hinzufügen** → **Banner** → Name z. B.
      „Banner unten“.
- [ ] Die **Anzeigenblock-ID** notieren. Form: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`
      (mit `/`).

### 2.3 Echte IDs eintragen

Beide Stellen sind mit `[ECHTE ID EINTRAGEN]` markiert:

- [ ] **App-ID** (mit `~`): in `android/app/src/main/res/values/strings.xml` den Wert
      von `admob_app_id` ersetzen.
- [ ] **Anzeigenblock-ID** (mit `/`): in `src/werbung/config.ts` bei `ECHTE_BANNER_ID`
      eintragen.
- [ ] `ECHTE_ANZEIGEN` bleibt vorerst auf `false`. Solange zeigt die App weiter
      Test-Anzeigen.

### 2.4 Handy als Testgerät eintragen

- [ ] AdMob → Einstellungen → **Testgeräte** → dein Handy hinzufügen (AdMob erklärt,
      wie du die Werbe-ID des Geräts findest).

Dann bekommst du auf diesem Handy auch mit echten IDs nur Test-Anzeigen und kannst
gefahrlos testen.

### 2.5 Einwilligungsabfrage (DSGVO) einrichten

- [ ] AdMob → **Datenschutz und Mitteilungen** → DSGVO → Mitteilung für die App
      „CrewGalley“ erstellen. Darin müssen „Einwilligen“ **und** eine Möglichkeit zum
      Ablehnen angeboten werden. Mitteilung **veröffentlichen**.
- [ ] App neu bauen und starten: Beim ersten Öffnen erscheint die Abfrage.
- [ ] Ablehnen, dann in der App unter Einstellungen → Werbung → „Einwilligung zur
      Werbung ändern“ prüfen, dass sich das Formular erneut öffnen lässt.

### 2.6 app-ads.txt (empfohlen)

AdMob empfiehlt eine Datei `app-ads.txt` auf der Entwickler-Webseite, die du im
Store-Eintrag angibst. Sie muss an der Wurzel der Domain liegen
(`https://disan93.github.io/app-ads.txt`), also in einem eigenen Repository namens
`Disan93.github.io`, nicht in diesem Projekt.

- [ ] Den Inhalt nennt dir AdMob unter Apps → app-ads.txt. Ohne die Datei
      funktioniert Werbung trotzdem; AdMob zeigt aber einen Hinweis an.

---

## Teil 3 – Signiertes Paket (.aab) erzeugen

### 3.1 Vor jedem Paket

- [ ] In `android/app/build.gradle` die **versionCode** um 1 erhöhen (beim allerersten
      Paket bleibt sie 1) und bei Bedarf `versionName` anpassen.
- [ ] Für das Store-Paket in `src/werbung/config.ts`: `ECHTE_ANZEIGEN = true`.
      (Der Test „im Projekt sind echte Anzeigen noch ausgeschaltet“ in
      `src/werbung/werbung.test.ts` schlägt dann absichtlich fehl und wird angepasst.)
- [ ] `npm run build:android` ausführen.

### 3.2 Paket bauen und Schlüssel anlegen

- [ ] Android Studio → Menü **Build → Generate Signed App Bundle or APK…** →
      **Android App Bundle** → Next.
- [ ] Beim ersten Mal **Create new…** wählen:
  - Key store path: `C:\Users\User\crewgalley-schluessel\crewgalley.jks`
    (ein Ordner **außerhalb** des Projekts)
  - zwei Passwörter (für die Schlüsseldatei und für den Schlüssel)
  - Alias: `crewgalley`, Validity: 25 Jahre, dein Name und Land
- [ ] Build-Variante **release** wählen → Create.
- [ ] Ergebnis: `android/app/release/app-release.aab`.

### 3.3 Signaturschlüssel sichern – wichtig

Der Schlüssel beweist gegenüber Google, dass ein Update wirklich von dir kommt.

- [ ] Datei `crewgalley.jks` an **zwei** Orte kopieren, die nicht dieser PC sind
      (z. B. USB-Stick und privater Cloud-Speicher).
- [ ] Beide Passwörter und den Alias im Passwort-Manager speichern.
- [ ] Der Schlüssel gehört **nie** in das Git-Repository. Zur Sicherheit sind
      `*.jks`, `*.keystore`, `*.aab` und `*.apk` in `.gitignore` eingetragen.
- [ ] Den Schlüssel und die Passwörter niemandem schicken, auch nicht per Chat.

Geht der Schlüssel verloren, kannst du keine Updates mehr hochladen. Mit „Play App
Signing“ (Standard in der Play Console) lässt sich bei Google ein neuer
Upload-Schlüssel beantragen; das ist umständlich und dauert.

---

## Teil 4 – Play Console

### 4.1 Entwicklerkonto

- [ ] Konto anlegen unter https://play.google.com/console (einmalig 25 US-Dollar).
- [ ] Identität bestätigen (Ausweis; kann einige Tage dauern).

### 4.2 Datenschutzerklärung veröffentlichen

Google verlangt für jede App eine öffentliche Adresse, bei Apps mit Werbung erst recht.
Der Entwurf (deutsch und englisch, mit Abschnitten zu AdMob, Werbe-ID und
Einwilligung) liegt in `docs/datenschutz-entwurf.html` und ist bewusst noch nicht online.

- [ ] Alle gelb markierten `[PRÜFEN]`-Stellen ausfüllen.
- [ ] Veröffentlichen (Claude Code: „veröffentliche die Datenschutzseite“). Sie ist
      dann unter https://disan93.github.io/crewgalley/datenschutz/ erreichbar und in
      der App verlinkt.
- [ ] Klären, ob du zusätzlich ein Impressum brauchst: Mit Werbeeinnahmen ist die App
      ein geschäftliches Angebot.

Die Texte sind ein einfacher Entwurf und keine Rechtsberatung.

### 4.3 App anlegen

- [ ] „App erstellen“: Name **CrewGalley**, Standardsprache Deutsch, Typ **App**,
      **kostenlos**.

### 4.4 Pflichtangaben unter „App-Inhalte“

- [ ] **Werbung:** „Ja, meine App enthält Werbung“.
- [ ] **Datenschutzerklärung:** die Adresse aus 4.2.
- [ ] **Datensicherheit:** Die App selbst überträgt keine eingegebenen Inhalte. Das
      AdMob-SDK erhebt aber Daten und gibt sie an Google weiter. Anzugeben sind
      mindestens **Geräte- oder andere IDs (Werbe-ID)**, **ungefährer Standort**,
      **App-Interaktionen** und **Diagnosedaten**, jeweils mit dem Zweck „Werbung
      oder Marketing“ bzw. „Analyse“. Google führt eine Übersicht, welche Angaben für
      das Google Mobile Ads SDK nötig sind; daran orientieren.
- [ ] **Werbe-ID:** „Ja, die App verwendet eine Werbe-ID“, Zweck: Werbung.
- [ ] **Inhaltsbewertung:** Fragebogen ausfüllen.
- [ ] **Zielgruppe:** Erwachsene bzw. ab 13. Nicht „Kinder“ wählen; für Apps mit
      Werbung gelten dort strengere Regeln.

### 4.5 Geschlossener Test

Für neue private Entwicklerkonten verlangt Google vor der Veröffentlichung einen
geschlossenen Test mit mehreren Testern über etwa zwei Wochen. Die aktuell geltenden
Zahlen stehen in der Play Console.

- [ ] Testen → **Geschlossener Test** → Release erstellen → `app-release.aab` hochladen.
- [ ] Tester per E-Mail-Liste einladen und den Test-Link verschicken.
- [ ] Tester bitten, die App wirklich zu benutzen, und Rückmeldungen sammeln.
- [ ] Die Tester darauf hinweisen, keine Anzeigen absichtlich anzutippen.

### 4.6 Store-Eintrag

- [ ] Kurzbeschreibung (max. 80 Zeichen) und vollständige Beschreibung
- [ ] App-Icon: `public/icons/playstore-icon-512.png`
- [ ] Feature-Grafik **1024 × 500** Pixel
- [ ] Mindestens 2 Handy-Screenshots (z. B. Menü, Einkaufsliste, Abrechnung; ohne
      sichtbare Test-Anzeige)
- [ ] Kategorie, Kontakt-E-Mail

### 4.7 Veröffentlichen

- [ ] Nach dem geschlossenen Test den Zugang zur Produktion beantragen.
- [ ] Produktion → Release erstellen → zur Prüfung einreichen.
- [ ] Nach der Freigabe in AdMob die App mit dem Store-Eintrag verknüpfen
      (Apps → App-Einstellungen → App-Store hinzufügen).

---

## Teil 5 – Vorbereitet, aber ausgeschaltet

- **Affiliate-Links:** `src/werbung/affiliate.ts`, Schalter `AFFILIATE_AKTIV = false`.
  Der Baustein `AffiliateHinweis` zeigt „Ausrüstung ansehen“ mit der Kennzeichnung
  „Werbelink“. Er ist noch auf keinem Bildschirm eingebunden, weil es in der App noch
  keine Packliste oder Ausrüstungshinweise gibt.
- **App unterstützen:** In den Einstellungen steht ein Dankestext. Eine Kauf- oder
  Spendenfunktion ist nicht eingebaut.

## Bei jedem späteren Update

- [ ] Code ändern, `npm test`, Web-Version hochladen wie bisher.
- [ ] `versionCode` erhöhen, `npm run build:android`, signiertes Paket bauen (Teil 3).
- [ ] Neues Paket in der Play Console als Release hochladen.
