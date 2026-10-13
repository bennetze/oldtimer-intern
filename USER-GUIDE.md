# Vehicle editor: step-by-step guide

This guide covers adding a vehicle, moving it to another category, editing its
content, and combining an edit with a category move. Button names match the
German interface.

## Before you start

1. Open the editor's `index.html` in desktop Chrome or Edge. Keep its companion
   scripts and styles in the same folder.
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

The editor exports a ZIP. The website's transfer command applies it after your
confirmation. Building and publishing are separate steps.

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
6. Under **06 Prüfen & exportieren**, click **Fahrzeugseite ansehen**. Review both
   languages and desktop/mobile sizes. Use **Änderungen prüfen** to inspect the
   destination. Resolve any validation messages, then click **ZIP erstellen**.
7. Extract the ZIP into a separate folder outside the website project. Locate the
   category folder inside it; this contains the `.astro` file and matching car
   folder.
8. Follow **Transfer, build, and publish** below. The command for a new car has
   **no `--from` option**. If a destination already exists, open that existing
   vehicle in the editor rather than treating it as a new car.

## 2. Change the category without changing the content

1. Under **02 Fahrzeug auswählen**, find and open the existing car. Use
   **Alle Kategorien** if it is not visible in the current filter.
2. Under **03 Fahrzeug & Kategorie**, change **Kategorie** to the destination.
   Leave the title, descriptions, slug, modification date, and archive order as
   they are. Do not click **Heutiges Datum verwenden** for a pure move.
3. Leave the images and content blocks unchanged. The editor retains the existing
   bilingual content and image filenames and updates the destination URL.
4. Under **06 Prüfen & exportieren**, click **Änderungen prüfen**. Check that
   **Original** identifies the car's current category and **Ziel** identifies its
   new category. If the archive order conflicts with another car in the destination,
   choose an unused **Manueller Sortierwert** under **Technische Angaben**, then
   review again. This changes its archive position, not its story content.
5. Click **ZIP erstellen** and extract it outside the website project.
6. Follow **Transfer, build, and publish** below. Keep the command's `--from`
   option exactly as shown: it identifies the original category and slug.
   The transfer command removes the old pair and creates the redirects after
   confirmation. Leave the old files in place until the command handles them.

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
5. Under **06 Prüfen & exportieren**, use **Fahrzeugseite ansehen** to review both
   languages and desktop/mobile sizes. Click **Änderungen prüfen**; **Original**
   and **Ziel** should show the same route. Resolve any validation messages.
6. Click **ZIP erstellen** and extract it outside the website project.
7. Follow **Transfer, build, and publish** below. Keep the displayed `--from`
   option even though the category stays the same. It authorizes replacement of
   that exact vehicle after you confirm the review; the command backs up its old files.

## 4. Edit the content and change the category

1. Under **02 Fahrzeug auswählen**, open the existing car.
2. Under **03 Fahrzeug & Kategorie**, choose the new category and update the
   titles, short descriptions, or year as needed. Keep the existing slug. Click
   **Heutiges Datum verwenden** if today's date should mark the content update.
3. Under **04 Bilder**, make the required image changes and check the main image
   and German/English alternative descriptions.
4. Under **05 Inhalte**, make the required changes in both languages. Check block
   order and gallery descriptions/captions.
5. Under **06 Prüfen & exportieren**, review both languages and desktop/mobile
   sizes with **Fahrzeugseite ansehen**. Click **Änderungen prüfen** and check the
   original and destination routes. Resolve any errors, including a duplicate
   archive order in the destination category, then review again.
6. Click **ZIP erstellen** and extract it outside the website project.
7. Follow **Transfer, build, and publish** below. Keep the displayed `--from`
   option pointing to the **original** category and slug. One confirmed transfer
   applies the content changes and category move together.

## Transfer, build, and publish

These steps finish each of the four workflows.

1. In the editor, expand **Fahrzeug ins Website-Projekt übernehmen** after the ZIP
   download. It shows the appropriate transfer command for the vehicle.
2. Open an interactive terminal in the **website project folder**, not the editor
   folder. On this Mac:

   ```sh
   cd "/Users/betannet/Developer/oldtimer"
   ```

   On Windows or another computer, use that computer's website folder path.
3. Copy the editor's transfer command. Replace its quoted example path with the
   actual path to the **extracted category folder**. Keep the quotes, especially
   if the path contains spaces. Select neither the ZIP itself nor the individual
   vehicle folder.

   Example for a new car in Aktuelle Projekte:

   ```sh
   npm run vehicles:transfer -- "/absolute/path/to/extracted/aktuelle-projekte"
   ```

   Example for editing `example-car` in its existing category:

   ```sh
   npm run vehicles:transfer -- "/absolute/path/to/extracted/aktuelle-projekte" --from aktuelle-projekte/example-car
   ```

   Example for moving `example-car` from Aktuelle to Vergangene Projekte, with or
   without content changes:

   ```sh
   npm run vehicles:transfer -- "/absolute/path/to/extracted/vergangene-projekte" --from aktuelle-projekte/example-car
   ```

   These are examples. Use your actual extracted path and the editor's exact
   original route; do not enter `example-car` unless that is your car's slug.
4. Run the command and read its proposed changes. Check the original and destination
   routes and the content differences. For an existing vehicle, confirm that it
   replaces or removes only the intended original vehicle pair. Sitemap,
   redirects, and existing `llms.txt` links may also change.
5. Type **`JA`** and press Enter to apply that review. Any other answer cancels
   without changing project files. Do not edit, import, or build the project
   concurrently with the transfer.
6. Wait for **Fahrzeug übernommen** and note the backup location. The command
   copies the new pair, backs up replaced files, removes the old pair when moving,
   updates the sitemap and existing `llms.txt` vehicle links, and configures
   redirects for both languages. No manual copying/deleting or separate
   `npm run vehicles:sync` is needed for this transfer workflow.
7. Build the website:

   ```sh
   npm run build
   ```

   For the GitHub Pages preview, also run:

   ```sh
   npm run build:pages
   ```

   Wait for a successful build and review the generated vehicle page. A ZIP or
   successful transfer alone does not produce a verified website build.
8. Publish the resulting website through your usual publishing process. Transfer
   and build do not publish automatically. After a move, check that the old German
   and English URLs lead to the new pages on the published site.
9. In the editor, return to **02 Fahrzeug auswählen** and click **Liste aktualisieren**.
   Accept discarding the old draft only after its exported changes have been
   transferred successfully. Reopen the vehicle from the refreshed list before
   making further edits; a moved car now belongs to its new category.

## If something stops the workflow

- **Editor validation error:** follow its message, correct the draft, and export
  again. Do not modify the ZIP contents to bypass validation.
- **Transfer reports changed files or a conflicting destination/order:** keep your
  draft and the original files. Refresh the project list when appropriate, resolve
  the conflict, export again if needed, and run a fresh transfer review.
- **Transfer reports a rollback or recovery problem:** retain the reported backup
  and lock. Follow the recovery instructions in the website's
  `VEHICLE-CONTENT-GUIDE.md`; do not delete a lock to force another import.
- **Build fails:** read the error and fix the reported issue before publishing.
  A successful transfer remains applied even if the later build fails.

The project folder must be selected again after reopening the editor. Export drafts
you need to retain before closing; the editor does not persist them automatically.
