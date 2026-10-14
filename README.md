# Fahrzeugeditor

See the [step-by-step user guide](USER-GUIDE.md) for adding cars, changing categories,
editing content, and combining edits with a category move.

1. Alle Editor-Dateien zusammenlassen und `oldtimer` sowie `oldtimer-intern` nebeneinander ablegen. Im Website-Ordner `Website-Werkzeuge.command` (macOS), `Website-Werkzeuge.cmd` (Windows) oder `Website-Werkzeuge.sh` (Linux) starten. Das öffnet diesen Editor mit integrierten Website-Aktionen. Alternativ `index.html` direkt in Chrome oder Edge für den Offline-ZIP-Workflow öffnen.
2. Den vollständigen Website-Projektordner auswählen. Der Editor liest dessen Fahrzeuge und prüft die Ausgabe gegen dieses Projekt.
3. Ein Fahrzeug öffnen oder **Neues Fahrzeug** wählen. Deutsche und englische Texte sowie Bildbeschreibungen vollständig ausfüllen. Neue Galeriebeschreibungen starten leer und müssen die sichtbare Aufnahme beschreiben.
4. Im gestarteten Editor unter **Prüfen & speichern** die Fahrzeugvorschau ansehen. **Im Projekt speichern** bereitet den aktuellen Entwurf automatisch vor. Original und Ziel prüfen und mit `JA` bestätigen. Der Entwurf wird an der richtigen Stelle im Website-Projekt gespeichert; eine Sicherung bleibt erhalten. Kein ZIP-Download, Entpacken oder erneuter Ordnerimport ist nötig.
5. **Website-Vorschau starten** und **Website-Vorschau öffnen** wählen. Eine laufende Vorschau wird nach dem Speichern automatisch neu gestartet; die Browserseite anschließend neu laden. Vor weiteren Fahrzeugänderungen **Fahrzeugliste aktualisieren** wählen.
6. Bei Bedarf die Vorschau stoppen und **Website erstellen** wählen. **GitHub Pages veröffentlichen** ist eine separate, bestätigte Aktion und aktualisiert nur GitHub Pages. Den Produktionshost separat veröffentlichen.

**ZIP herunterladen (optional)** bleibt zur Weitergabe verfügbar. Beim direkten Offline-Start von `index.html` heißt der letzte Schritt weiterhin **Prüfen & exportieren**: ZIP außerhalb des Projekts entpacken und mit dem bestehenden `npm run vehicles:transfer`-Assistenten übernehmen.

Prüfung und optionale ZIP-Erstellung verändern keine Projektdateien. Beim direkten Öffnen von `index.html` startet der Editor keine Programme. Über das Startprogramm führt der letzte Schritt zusätzlich ausdrücklich bestätigte Website-Übernahme/Löschung sowie separate Vorschau-, Build- und Veröffentlichungsaktionen aus. Diese verwenden die Website-Werkzeuge mit Sperren, Sicherungen und erneuter Prüfung. Eine erzeugte ZIP enthält Website-Quelldateien; `dist` wird erst durch den separaten Build aktualisiert.

Der Übernahme-Befehl zeigt kurze deutsche Statusmeldungen und fragt vor dem Speichern nach einer Bestätigung (JA). Es öffnet sich keine zusätzliche Seite. Nach dem Speichern erstellt der Befehl die Vorschaubilder. Eine mit `npm run dev` gestartete Vorschau pausiert während der Übernahme und startet anschließend automatisch mit den neuen Fahrzeugen, Bildern und beiden Sprachen neu. Danach die Browserseite neu laden. Eine neue Vorschau mit `npm run dev` starten und mit Strg+C beenden. Wenn das Fahrzeug gespeichert wurde, aber die Vorschauvorbereitung fehlschlägt, nennt der Befehl diesen Unterschied ausdrücklich und behält die Sicherung.

Die Übernahme verwendet den geprüften Website-Importer. Vorhandene Fahrzeuge werden nur nach ausdrücklicher Auswahl des angezeigten Originals ersetzt oder verschoben. Für neue Fahrzeuge, Inhaltsänderungen und Kategoriewechsel gilt derselbe Befehl ohne zusätzliche Optionen. Die Prüfung muss vor der Bestätigung vollständig angesehen werden. Bei einem Kategoriewechsel bleiben deutsche und englische URLs durch Weiterleitungen erreichbar. Für die getrennte Prüfung/Freigabe steht weiterhin `vehicles:review` bereit; siehe `VEHICLE-CONTENT-GUIDE.md` im Website-Projekt.

Nach der Übernahme die Projektliste neu laden, bevor weitere Fahrzeuge exportiert werden. Externe Projektänderungen machen die vorherige Projektprüfung ungültig. Beim Schließen gehen nicht exportierte Entwürfe verloren; ungespeicherte Änderungen werden vor dem Wechsel abgefragt.

## Fahrzeug löschen

Im integrierten Editor unter **Website aktualisieren → Weitere Projektaktionen**
**Fahrzeug zum Löschen suchen** wählen. Alternativ im Website-Ordner
`npm run vehicles:delete` ausführen. Suchbegriff eingeben
(Enter zeigt alle Fahrzeuge), die Nummer des richtigen Fahrzeugs auswählen und
mit `JA` bestätigen. `0` bricht ab. Eine ZIP ist nicht nötig.

Der Befehl entfernt das Fahrzeug mit Sicherung, aktualisiert Sitemap, betroffene
Links und Vorschaubilder und entfernt Weiterleitungen auf das gelöschte Fahrzeug.
Den angezeigten Sicherungsordner behalten. Danach die Browserseite und die
Fahrzeugliste im Editor neu laden. Bauen und Veröffentlichen bleiben separate
Schritte; erst danach verschwindet das Fahrzeug auch von der veröffentlichten Website.

## Frühere Speichervorgänge

Die frühere direkte Browserschreibfunktion wurde entfernt. Das neue **Im Projekt speichern** verwendet den geprüften Website-Importer im Startprogramm. Vorhandene Journale und Sicherungen früherer Versionen bleiben geschützt. Bei einem unterbrochenen Vorgang kann die bestehende Wiederherstellungsfunktion weiterhin Originaldateien zurücksetzen oder einen abgeschlossenen Vorgang entsperren. Konflikte, beschädigte Sicherungen und fremde Importsperren erfordern eine manuelle Prüfung; Sperren nicht einfach löschen.

ZIP-Ausgaben verwenden die geprüften Grenzen: 2 MiB JSON, 50 MiB und 100 Megapixel je Bild, 2000 Fahrzeugdateien und 512 MiB Fahrzeugdaten insgesamt. Die Website-Buildprüfung bleibt die abschließende Kompatibilitätsprüfung.

## Reading sequence and page preview

Under **Inhalte**, blocks appear in the same reading order as on the website, in
both languages. Place related text directly before or after its gallery. Edit a
photo-specific caption on that gallery occurrence; repeated uses of the same photo
retain their own alternatives and captions. **Galerie nach diesem Bild teilen**
creates two adjacent galleries. Move a text or contact block between them to
separate the photo runs.

The website displays uncropped photos up to 420px wide, in one column below 760px,
up to two from 760px and up to three from 1100px. Consecutive galleries share a
photo run; text and contact blocks end it. A lead already used in a gallery is not
repeated above the story. A lead outside the story appears before the first block.
It also supplies the representative image for search and shared links.

Under **Prüfen & exportieren**, **Fahrzeugseite ansehen** opens a local preview with
German/English and desktop/tablet/mobile controls. It shows the reading sequence
and each occurrence's caption; fonts and surrounding website navigation are
simplified. Previewing does not copy files into the project. No extra layout configuration or
historical source snapshot is needed. ZIP exports retain the existing
vehicle JSON and page/folder contract.

## Developer verification

Run `node --check` on all deliverable JavaScript files, including `website-tools.js`. Run the contract,
import and save tests described in AGENTS.md from the sibling website repository.
For the extended editor checks, run `node scripts/test-editor-browser.mjs` here,
then open `/`, `/workflow`, and `/tools-workflow` at `http://127.0.0.1:8767` in a browser.
Use `PORT` to select another local port and `VEHICLE_WEBSITE_PATH` if the sibling
website checkout is elsewhere. This developer-only harness reuses the website's
installed test dependencies and injects the additional cases into temporary
responses; the distributed editor still needs no installation or server.

The added cases cover splitting, occurrence captions and alternatives in both
languages, adjacent photo runs, lead placement, preview focus and review validity,
ZIP/import round trips, project review, export collisions and category changes. Historical
transaction recovery remains tested separately. Native file-picker compatibility must still be checked through the
actual `file://` entry point on the available target browsers.
