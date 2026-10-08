# Fahrzeugeditor

1. Alle Dateien in diesem Ordner zusammenlassen. `index.html` in einer aktuellen Desktop-Version von **Chrome oder Edge** öffnen (macOS oder Windows).
2. **Projektordner auswählen**: den vollständigen Website-Ordner mit `src`, `public` und der Astro-Konfiguration auswählen und den Ordnerzugriff erlauben.
3. Ein Fahrzeug aus der Liste öffnen oder **Neues Fahrzeug** wählen. Die Liste zeigt das gepflegte Änderungsdatum, nicht das Änderungsdatum der Datei. Über **Kategorie** lässt sie sich filtern.
4. Deutsche und englische Texte, Bilder und Inhalte bearbeiten. Bestehende Fahrzeuge behalten Datum und Slug; **Heutiges Datum verwenden** ändert das Datum ausdrücklich.
5. Unter **Prüfen & speichern** zuerst **Änderungen prüfen** wählen. Projekt, Original-/Zielroute und betroffene Dateien kontrollieren. Mit **Im Projekt speichern** genau diese Änderungen übernehmen.

Es ist keine Installation nötig. Der Editor lädt keine Daten hoch und startet keine Programme. Er speichert die Website-Quelldateien. Ein vorhandener `dist`-Ordner wird **nicht** aktualisiert; die veröffentlichbare Website muss separat gebaut werden. **ZIP erstellen** bleibt als alternative Ausgabe verfügbar.

Beim erneuten Öffnen muss der Projektordner erneut ausgewählt werden. Ein abgebrochener Ordnerdialog verändert die aktuelle Arbeit nicht. Ungespeicherte Eingaben gehen beim Schließen des Browsers verloren; bei Bedarf vorher als ZIP sichern.

## Sicherungen und unterbrochene Vorgänge

Vor dem Schreiben legt der Editor unter `.cache/vehicle-browser-backup-…` im Website-Projekt Originaldateien und ein Journal an. Diese Sicherung bleibt erhalten. Während eines Speichervorgangs dürfen das Projekt und seine Dateien nicht gleichzeitig in einem anderen Editor, Browserfenster oder Importprogramm geändert werden.

Bei einem Schreibfehler versucht der Editor, die Originaldateien wiederherzustellen. Nach einem Browserabsturz den Projektordner erneut auswählen und **Unterbrochenen Speichervorgang wiederherstellen** wählen. Bereits vollständig abgeschlossene Vorgänge werden dabei nur entsperrt; unvollständige Vorgänge werden zurückgesetzt.

Wurden betroffene Dateien inzwischen extern verändert oder ist eine Sicherung beschädigt, stoppt die Wiederherstellung. Die angezeigte Sicherung und `.cache/vehicle-import.lock` aufbewahren; nicht einfach löschen oder erneut darüber speichern. Fremde Sperren des Website-Importers werden nicht automatisch entfernt.

Browser können nicht alle Dateien als eine einzige atomare Änderung speichern. Der Editor verwendet Sicherungen, Prüfsummen und ein Wiederherstellungsjournal. Die Website-Buildprüfung bleibt die abschließende Prüfung vor einer Veröffentlichung.
# oldtimer-intern

## Geprüfte Dateigrenzen und Wiederherstellung

ZIP-Export, direktes Speichern und der geprüfte Website-Importer verwenden dieselben Fahrzeuggrenzen: 2 MiB für `vehicle.json`, 50 MiB und 100 Megapixel je Bild, 2000 Dateien im Fahrzeugordner und 512 MiB Fahrzeugdaten insgesamt. Dateinamen müssen unter Windows verwendbar sein; neue Bilder reservieren ihre Namen auch ohne Beachtung der Großschreibung und nach WebP-Konvertierung.

Wenn Dateien gespeichert wurden, aber das Entfernen der Projektsperre scheitert, meldet der Editor ausdrücklich den erfolgreichen Speichervorgang. Unter „Projektordner“ lässt sich der abgeschlossene Vorgang entsperren. Dabei werden keine älteren Inhalte zurückgeschrieben; alte Sicherungsdateien sind dafür nicht erforderlich. Bei einer unterbrochenen Schreibphase werden dagegen aktuelle Dateien, Sicherungen und die Sperrzugehörigkeit vor jeder Wiederherstellung erneut geprüft. Externe Änderungen bleiben bei einem Konflikt erhalten.

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

Under **Prüfen & speichern**, **Fahrzeugseite ansehen** opens a local preview with
German/English and desktop/tablet/mobile controls. It shows the reading sequence
and each occurrence's caption; fonts and surrounding website navigation are
simplified. Previewing does not authorize a save. No extra layout configuration or
historical source snapshot is needed. Saving and ZIP export retain the existing
vehicle JSON and page/folder contract.

## Developer verification

Run `node --check` on the four deliverable JavaScript files. Run the contract,
import and save tests described in AGENTS.md from the sibling website repository.
For the extended editor checks, run `node scripts/test-editor-browser.mjs` here,
then open `http://127.0.0.1:8767/` and `http://127.0.0.1:8767/workflow` in a browser.
Use `PORT` to select another local port and `VEHICLE_WEBSITE_PATH` if the sibling
website checkout is elsewhere. This developer-only harness reuses the website's
installed test dependencies and injects the additional cases into temporary
responses; the distributed editor still needs no installation or server.

The added cases cover splitting, occurrence captions and alternatives in both
languages, adjacent photo runs, lead placement, preview focus and review validity,
ZIP/import round trips, save/reload, category moves, rollback and interrupted
recovery. Native file-picker compatibility must still be checked through the
actual `file://` entry point on the available target browsers.
