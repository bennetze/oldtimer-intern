# Vehicle editor: step-by-step guide

This guide covers adding a vehicle, moving it to another category, editing its
content, and combining an edit with a category move. Button names match the
German interface.

## Before you start

1. Start `Website-Werkzeuge.command` (macOS), `Website-Werkzeuge.cmd` (Windows),
   or `Website-Werkzeuge.sh` (Linux) from the website folder. The launcher opens
   this same editor with website actions integrated into its final step. Keep the
   `oldtimer` and `oldtimer-intern` folders beside each other. Use desktop Chrome
   or Edge for project-folder access. You can also open `index.html` directly for
   offline review/ZIP export and finish with the existing terminal commands.
2. Under **01 Projektordner**, click **Projektordner auswählen** and select the
   complete website project: the folder containing `src`, `public`, and
   `package.json`. On this Mac, it is `/Users/betannet/Developer/oldtimer`.
3. Open **02 Fahrzeug auswählen**.

The categories are:

| Editor category | Folder key used by commands |
| --- | --- |
| Aktuelle Projekte | `aktuelle-projekte` |
| Vergangene Projekte (shown as Abgeschlossene Projekte in the list filter) | `vergangene-projekte` |
| Fahrzeugangebote | `fahrzeugangebote` |

Selecting a category in the **vehicle list filter** only filters the list. To move
a vehicle, change **Kategorie** under **03 Fahrzeug & Kategorie**.

The launcher editor saves the current draft directly through the website's checked
transaction after confirmation. ZIP download is optional. Building and publishing
remain separate steps.

## 1. Add a new car

1. Under **02 Fahrzeug auswählen**, click **Neues Fahrzeug**.
2. Under **03 Fahrzeug & Kategorie**, choose the destination category. Enter the
   title and short description in both German and English. Add the year if needed.
   Check the modification date; a new vehicle defaults to today's local date.
3. Open **Technische Angaben** if you want to check the slug or archive position.
   The title supplies the initial slug. Automatic ordering places a new vehicle
   at the end; select **Neues Fahrzeug am Anfang einfügen** to place it first.
4. Under **04 Bilder**, select a **Kartenbild**. Check its German and English
   alternative descriptions. Import gallery images if needed, choose the
   **Hauptbild**, and complete its descriptions in both languages. A vehicle can
   use the card as its main image without any gallery images.
5. Under **05 Inhalte**, add text, contact, and gallery blocks as needed. Complete
   both languages. Add imported photos to gallery blocks and check their
   descriptions. Optional captions must be supplied in both languages. Arrange
   the blocks in the order readers should see them.
6. Under **06 Prüfen & speichern** (launcher), click **Fahrzeugseite ansehen**. Review both
   languages and desktop/mobile sizes. Use **Änderungen prüfen** to inspect the
   destination. Resolve any validation messages, then use **Im Projekt speichern**.
7. Follow **Save, preview, build, and publish** below. If a destination already exists,
   open that existing vehicle in the editor rather than treating it as a new car.

## 2. Change the category without changing the content

1. Under **02 Fahrzeug auswählen**, find and open the existing car. Use
   **Alle Kategorien** if it is not visible in the current filter.
2. Under **03 Fahrzeug & Kategorie**, change **Kategorie** to the destination.
   Leave the title, descriptions, slug, modification date, and archive order as
   they are. Do not click **Heutiges Datum verwenden** for a pure move.
3. Leave the images and content blocks unchanged. The editor retains the existing
   bilingual content and image filenames and updates the destination URL.
4. Under **06 Prüfen & speichern** (launcher), click **Änderungen prüfen**. Check that
   **Original** identifies the car's current category and **Ziel** identifies its
   new category. If the archive order conflicts with another car in the destination,
   choose an unused **Manueller Sortierwert** under **Technische Angaben**, then
   review again. This changes its archive position, not its story content.
5. Use **Im Projekt speichern** to prepare the current draft automatically.
6. Follow **Save, preview, build, and publish** below. Explicitly select the original
   category and route when asked. The confirmed transfer removes the old pair
   and creates redirects. Leave the old files in place until it handles them.

## 3. Edit the content without changing the category

1. Under **02 Fahrzeug auswählen**, open the existing car.
2. Under **03 Fahrzeug & Kategorie**, leave **Kategorie** unchanged. Update titles,
   short descriptions, or the year as needed. Keep the existing slug. For a
   content update that should carry today's modification date, explicitly click
   **Heutiges Datum verwenden**; the editor otherwise retains the original date.
3. Under **04 Bilder**, add, replace, or reorder images as needed. Check the card,
   main-image selection, and German/English alternative descriptions.
4. Under **05 Inhalte**, edit both languages and add, remove, or reorder blocks as
   needed. Edit photo-specific descriptions and captions on their gallery
   occurrence. Keep optional captions paired in German and English.
5. Under **06 Prüfen & speichern** (launcher), use **Fahrzeugseite ansehen** to review both
   languages and desktop/mobile sizes. Click **Änderungen prüfen**; **Original**
   and **Ziel** should show the same route. Resolve any validation messages.
6. Use **Im Projekt speichern** to prepare the current draft automatically.
7. Follow **Save, preview, build, and publish** below. Explicitly select the exact
   original even when its category stays the same. Replacement requires your
   confirmation and retains a backup.

## 4. Edit the content and change the category

1. Under **02 Fahrzeug auswählen**, open the existing car.
2. Under **03 Fahrzeug & Kategorie**, choose the new category and update the
   titles, short descriptions, or year as needed. Keep the existing slug. Click
   **Heutiges Datum verwenden** if today's date should mark the content update.
3. Under **04 Bilder**, make the required image changes and check the main image
   and German/English alternative descriptions.
4. Under **05 Inhalte**, make the required changes in both languages. Check block
   order and gallery descriptions/captions.
5. Under **06 Prüfen & speichern** (launcher), review both languages and desktop/mobile
   sizes with **Fahrzeugseite ansehen**. Click **Änderungen prüfen** and check the
   original and destination routes. Resolve any errors, including a duplicate
   archive order in the destination category, then review again.
6. Use **Im Projekt speichern** to prepare the current draft automatically.
7. Follow **Save, preview, build, and publish** below. Select the **original** category
   and route. One confirmed transfer applies the content changes and move together.

## Save, preview, build, and publish

These steps finish all four workflows in **06 Prüfen & speichern** when the
editor is started with the launcher.

1. Review the sandboxed vehicle preview in both languages. **Änderungen prüfen**
   provides an optional read-only preflight.
2. Click **Im Projekt speichern**. It validates the current draft and prepares its
   paired page/folder in temporary staging automatically. There is no ZIP download,
   extraction, path entry or second folder selection.
3. Read the exact original and destination routes, then click **Speichern bestätigen**. Existing
   edits/moves use the vehicle explicitly selected in step two; replacement is
   never guessed from a matching title or slug. A new draft cannot overwrite an
   existing vehicle. **Abbrechen** cancels and preserves your draft.
4. Wait for the result and retain the backup path. Confirmed saving places files in
   the correct website category and handles replacements, moves, redirects, sitemap,
   affected llms links, gallery assets and image metadata through the checked importer.
5. Use **Website-Vorschau starten** and **Website-Vorschau öffnen**. A running preview
   restarts after saving; reload its page. If source saving succeeded but preview
   preparation failed, fix its cause and restart preview rather than saving as a new car.
6. Click **Fahrzeugliste aktualisieren** and reopen the saved car before further
   editing. The saved, unchanged draft is recognized; other unsaved drafts retain
   the normal discard confirmation.
7. Stop the preview and click **Website erstellen** when production output is needed.
   This runs the verified production build into `dist/` without publishing.
8. **GitHub Pages veröffentlichen** separately asks for **JA**, builds for Pages and
   publishes to its configured branch. It does not update the production host.

**ZIP herunterladen (optional)** is available for handing files to someone else.
Changing the draft does not require exporting a ZIP; the save button always prepares
fresh current data. Incomplete drafts and changed project snapshots block saving.
Draft controls are locked while preparing/saving; cancellation retains the draft.

The project selected in step one must match the launcher's website project. Its
source snapshot is checked on selection and against the immutable save review.
Original/source changes during preparation or after approval invalidate the save.
The full launcher path is displayed; identical copies can share snapshots, so select
that displayed folder.

### Direct offline entry and terminal fallback

Opening `index.html` directly keeps the offline **Prüfen & exportieren** step and ZIP export available,
without website command controls or network requests. After exporting/extracting,
run `npm run vehicles:transfer` in the website folder **without arguments**. Drag
the extracted folder into its prompt, explicitly select the original when needed,
and type **JA**. Use `npm run dev`, `npm run build` and `npm run deploy` separately
when required. There is no need to type paths or command flags.

### Vehicle deletion

In the launcher editor's final step, expand **Weitere Projektaktionen**, then use
**Fahrzeug zum Löschen suchen**. Enter a search term (empty lists all), select the
exact title/category/route and enter **JA**. Retain the backup and refresh the
vehicle list. An existing draft remains available until you choose to refresh it.
Deletion has no ZIP requirement. Without the launcher, use the existing guided
`npm run vehicles:delete` command in the website folder.

## If something stops the workflow

- **Editor validation error:** follow its message, correct the draft, and save
  again. In the offline workflow, export a fresh ZIP; never edit ZIP contents to
  bypass validation.
- **Transfer reports changed files or a conflicting destination/order:** keep your
  draft and the original files. Refresh the project list when appropriate, resolve
  the conflict and prepare a fresh save review. The offline workflow requires
  a fresh export when its draft changes.
- **Transfer reports a rollback or recovery problem:** retain the reported backup
  and lock. Follow the recovery instructions in the website's
  `VEHICLE-CONTENT-GUIDE.md`; do not delete a lock to force another import.
- **Build fails:** read the error and fix the reported issue before publishing.
  A successful transfer remains applied even if the later build fails.

The project folder must be selected again after reopening the editor. Export drafts
you need to retain before closing; the editor does not persist them automatically.

Under **Bilder**, **Wasserzeichen ansehen** opens a quick preview of every card
and gallery image, even before required fields are complete. With **Wasserzeichen
für alle Bilder** enabled, the page preview also shows watermarks. Previewing alone
does not enable that preference or change original images. Existing baked-in
watermarks remain in place.
