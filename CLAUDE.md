# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Über diesen Workspace

In diesem  Repo liegt eine kleine Web-App (siehe unten), die ich mit Claude Code zusammen baue und pflege. Die Kommunikationsregeln unten gelten trotzdem immer.

## Wie du mit mir kommunizieren sollst

- Antworte immer auf Deutsch.
- Erkläre Dinge einfach und ohne Fachjargon. Wenn ein technischer Begriff nötig ist, erklär ihn kurz mit.
- Fasse dich kurz. Keine langen Einleitungen oder Zusammenfassungen am Ende, wenn nicht nötig.
- Wenn eine Aufgabe mehrere sinnvolle Wege hat, schlage kurz einen Weg vor, statt alle Optionen aufzuzählen.

## Wie du arbeiten sollst

- Bevor du etwas löschst, überschreibst oder größere Mengen an Dateien veränderst: kurz nachfragen bzw. genau beschreiben, was du vorhast.
- Bei Dateiorganisation: nachvollziehbare, sprechende Namen und eine klare, einfache Ordnerstruktur bevorzugen – keine komplizierten Systeme.
- Wenn eine Anfrage unklar ist, lieber kurz nachfragen als etwas Falsches zu tun.

# Was die App können soll (Anforderungen)

Eine App zur Begleitung der Gin-Herstellung, Schritt für Schritt.

- Rezepte verwalten: Checklisten-Vorlagen mit den 5 festen Produktionsschritten
– Vorbereitung, Mazeration, Destillation, Verdünnen, Nachbereitung
- Jeder Schritt hat Abschnitte mit Prüfpunkten (z. B. Zoll-Anmeldung, Hygiene-Checks, Mengenangaben, Prüfungen vor/während/nach dem Brennvorgang).
- Batch durchführen: Aus einem Rezept wird ein konkreter "Batch" gestartet. Die Checkliste wird dabei eingefroren (spätere Rezept-Änderungen wirken sich nicht auf laufende/alte Batches aus).
- Abhaken mit Beleg: Einzelne Punkte können angehakt werden, teils mit Mess-Wert (z. B. Liter, Gramm, kg, %) und/oder Foto als Nachweis (z. B. Alkoholmenge, Gewicht).
- Archiv: Abgeschlossene Batches landen im Archiv, druckbar (eigenes Druck-Layout) als Nachweis-Dokument.
- Datensicherung: Backup/Wiederherstellung als ZIP-Datei (inkl. Fotos), Teilen (iOS) oder Download – wichtig, da alle Daten nur lokal auf dem Gerät liegen.
- Offline-fähig, Handy-tauglich: Läuft als installierbare App (auch auf dem iPhone in der Werkstatt ohne Internet), Kamera-Zugriff für Fotos direkt aus der Checkliste.

Als Logo soll das Logo-Ginwerkstatt.svg genutzt werden.

# Technische Notizen zur App "Gin-Produktion – Checklisten"

Eine Offline-fähige PWA, mit der Produktionsschritte einer Gin-Herstellung (Vorbereitung → Mazeration → Destillation → Verdünnen → Nachbereitung) als Checkliste abgehakt, mit Fotos/Messwerten belegt und archiviert werden.

## App starten / testen

Kein Build-Schritt, kein `npm install` nötig – reines HTML/CSS/JS. Lokal starten:

```
powershell -File scripts\dev-server.ps1 [-Port 8080]
```

Danach im Browser `http://localhost:8080/` öffnen. Es gibt keine Lint- oder Test-Kommandos in diesem Repo.

**Ordner `private/`:** Für Geschäftsgeheimnisse (z. B. echte Rezeptur-CSVs) reserviert. Ist per `.gitignore` komplett ausgeschlossen – landet nie im Repo und darf auch nicht auf einen anderen Webspace hochgeladen werden.

## Architektur

- **Kein Framework, keine Build-Pipeline.** ES-Module direkt im Browser (`<script type="module">` in `index.html` → `js/app.js`). Bewusst so gehalten, damit nichts installiert/kompiliert werden muss.
- **Routing:** `js/app.js` macht simples Hash-Routing (`#/batches`, `#/rezept/neu`, `#/batch/<id>/schritt/<n>`, `#/batch/<id>/druck`, …) und rendert dafür die passende View-Funktion aus `js/views/*.js` in das `<main>`-Element. Jede View ist eine eigenständige `render*(container, ...)`-Funktion, kein Component-System.
- **Datenmodell (`js/models.js`):** Zwei Kernbegriffe – **Rezept** (Vorlage mit Checklisten-Struktur je Produktionsschritt) und **Batch** (eine konkrete Durchführung eines Rezepts). Beim Start eines Batches wird die Rezept-Checkliste als Kopie "eingefroren" (`createBatchFromRecipe`), damit spätere Rezeptänderungen alte/laufende Batches nicht verändern. Die Schritt-Reihenfolge ist zentral in `STEP_ORDER`/`STEP_LABELS` definiert. Jeder Checklistenpunkt trägt `wantsValue`/`wantsPhoto`-Flags (im Rezept-Editor per Icon-Button umschaltbar), die in `checklisteView.js` steuern, ob beim Abhaken ein Messwert-Feld bzw. ein Foto-Button erscheint.
- **Speicherung:** IndexedDB über eine selbstgeschriebene Promise-Hülle in `js/db.js` (kein externes Paket). Drei Object Stores: `recipes`, `batches`, `photos`. Kein Server, keine Cloud – alle Daten bleiben lokal auf dem Gerät. `DB_VERSION` wurde beim Umbenennen "Charge" → "Batch" auf 2 angehoben, mit Migration bestehender Foto-Datensätze (`chargeId` → `batchId`) in `openDatabase()`.
- **Fotos:** `js/photo.js` nimmt per Kamera-Input auf, verkleinert/komprimiert client-seitig (Canvas, JPEG) vor dem Speichern in IndexedDB.
- **Backup/Restore:** `js/backup.js` + `js/zip.js` (eigene, minimale ZIP-Implementierung ohne Fremdbibliothek) exportieren/importieren den kompletten Datenbestand (Rezepte, Batches, Fotos) als ZIP mit `manifest.json`. Der Import versteht beim Foto-Feld sowohl `batchId` als auch das alte `chargeId` (Abwärtskompatibilität zu älteren Backups).
- **Gemeinsame UI-Helfer:** `js/util.js` (u. a. `el()` als kleiner DOM-Builder, Datumsformatierung) und `js/ui.js` (Kopfzeile/Header, Navigation, Toast) werden von allen Views genutzt.
- **Offline/PWA:** `sw.js` cached die App-Assets für Offline-Nutzung; `manifest.webmanifest` macht die App installierbar.
- **Rezept-Import:** Es gibt bewusst **keine** im Code hinterlegten Standard-Rezepte mehr (frühere `buildSeedRecipeXY()`-Funktionen in `js/models.js` wurden entfernt) – die konkreten Botanicals-Rezepturen sind Geschäftsgeheimnis und sollen nicht im (öffentlich einsehbaren) Quellcode landen. Stattdessen können Rezepte über `js/views/rezeptImportView.js` (`#/rezept/import`) aus einer CSV-Datei importiert werden; `js/csv.js` enthält den Parser und die Zuordnung auf die Rezept-Datenstruktur. CSV-Spalten: Schritt, Abschnitt, Punkt, Einheit, Foto (eine Zeile pro Checklistenpunkt).
- **Druckansicht:** `css/print.css` + `js/views/batchDruckView.js` erzeugen eine druckbare Version eines abgeschlossenen Batches als Nachweis-Dokument.
