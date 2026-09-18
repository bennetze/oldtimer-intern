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
