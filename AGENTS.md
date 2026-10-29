# AGENTS.md

## Checkout separation

Keep `/Users/betannet/Developer/Website/Intern` on `main`; the website launchers
load this fixed sibling directory. The client demo lives in the separate
`/Users/betannet/Developer/oldtimer-intern-demo` checkout on `demo`. Never switch
the launcher's directory to `demo` or point it at the demo checkout. Preserve
watermark previews and backdrop dismissal in both variants. The internal entry
identifies itself with `vehicle-editor=internal`; it loads VehicleProjectUI and
Website-Werkzeuge actions. The demo has no ZIP downloads or project actions.

## Project purpose

This repository contains an offline browser editor for vehicle pages on the
Oldtimermanufaktur website. Open `index.html` in desktop Chrome or Edge, select the
complete website project, choose or create a vehicle, edit, review, and export a ZIP
for the website's guided CLI transfer.

The deliverable uses local classic scripts and styles:

- `index.html`: markup and script/style links.
- `styles.css`, `workflow.css`: existing editor and workflow layout.
- `editor.js`: bilingual authoring, validation, images, ZIP export.
- `project-access.js`: directory handles, discovery, snapshots.
- `project-save.js`: read-only preparation and historical transaction recovery.
- `project-ui.js`: project selection, vehicle list, read-only review and ZIP export UI.

All files must remain together. There is no install, server, package manager, or
build step for this tool. Direct file:// review and ZIP export do not write vehicle source files. The optional local Website-Werkzeuge launcher supports confirmed checked saves and deletion. Building
`dist` is separate. ZIP export followed by `npm run vehicles:transfer` in the
website repository is the normal workflow.

Use English for collaboration and technical documentation unless the user requests
another language. Keep the tool's interface and actionable messages in German.

## User workflow

Preserve these six steps, all visible in the navigation:

1. Projektordner
2. Fahrzeug auswählen
3. Fahrzeug & Kategorie
4. Bilder
5. Inhalte
6. Prüfen & exportieren

Keep the top bar removed. Disable dependent steps until a project and vehicle have
been selected. Preserve numbered navigation, completion states, visible keyboard
focus, and the compact wrapping mobile layout.

Select the entire website project, not a category or `Projekte` subfolder. Validate
the expected project structure and discover vehicles under `src/pages/projekte/`;
do not scan `node_modules/` or `dist/`. Keep the directory handle in memory only and
request the folder again after reopening. Support desktop Chrome and Edge on macOS
and Windows; show an actionable message when directory access is unavailable.

The vehicle list contains the German title and `dateModified`, displayed as
`DD.MM.YYYY`. Sort newest date first, then German title, then route key for a stable
tie. Provide an all-categories filter and a new-vehicle action. This list order is
independent of the website's numeric archive order. Preserve the project and filter
while switching vehicles. Confirm before discarding unsaved work; cancellation or
failed folder selection must not replace current work.

Direct file:// mode provides read-only project review and ZIP export. The local launcher additionally provides `Im Projekt speichern` and deletion through the website checked importer, with exact original selection and JA confirmation. Every export automatically checks the immutable
snapshot against the selected project for route/order collisions and changed
source files. Never add unconfirmed project writes. Invalidate reviews when
inputs change. ZIP files contain only the category's paired Astro page and vehicle
folder, not sitemap or redirects. Explain the guided transfer described below;
the website CLI handles placement, replacement, category moves and crawler updates.

ZIP export does not update source files. Do not add npm detection, installation, automatic
builds, or build-error alerts to the tool. Never imply that saving refreshes `dist`
or produces an uploadable website; building and publishing remain separate.

## Guided website transfer and live preview

Use the same workflow for adding a vehicle, changing its category, editing its
content, or editing content and category together:

1. Review and export the ZIP in the editor.
2. Extract it outside the website project, for example in Downloads.
3. In the website repository, run `npm run vehicles:transfer`.
4. Drag the extracted folder into the terminal prompt and press Enter. For an
   existing vehicle, select the exact original from the numbered list. Confirm
   the transfer by typing `JA`.
5. Reload the website preview and refresh the editor's project vehicle list before
   continuing to edit the transferred vehicle. Build separately when needed.

Do not require nontechnical users to type paths, `--`, `--from`, approval tokens,
or other flags. Do not instruct them to copy files into category folders, delete
the old vehicle, or run `vehicles:sync` or `vehicles:gallery` after this command.
The transfer handles these operations. The advanced `vehicles:review` check/apply
commands remain available for technical use, with explicit original routes and
review-bound approval.

Accept a single extracted export's outer folder or its category folder. Handle
quoted paths and shell-escaped spaces from terminal drag-and-drop. Accept category
folder suffixes created by extraction, such as `fahrzeugangebote 4` on macOS and
`fahrzeugangebote (2)` on Windows, while retaining strict category, slug, pair,
image and content validation. Never extract over existing project files.

Matching slugs only suggest existing vehicles. Show each candidate's title,
category and exact original route; require explicit numbered selection before
replacement or a move. Never infer replacement approval from a matching title.
Empty, invalid or zero selections cancel. The final `JA` applies only to the
immutable checked review; recheck sources and destination before committing.
Retain locks, durable backups and rollback. Category moves remove the original
pair and update German and English redirects, sitemap and affected existing
`llms.txt` links through the checked importer.

Keep CLI prompts and logs short and in German, for example `Fahrzeug wird geprüft …`,
`Prüfung erfolgreich.`, `Fahrzeug gespeichert.`, `Vorschaubilder werden erstellt …`
and `Fertig. Browserseite neu laden.` Keep actionable error causes and recovery
backup paths. Do not create an additional review HTML site, open a browser from
the transfer command, or print full JSON, hashes, crawler diffs or long explanations.
Preserve the editor's existing read-only review and sandboxed vehicle preview.

After committing source files, the transfer refreshes generated gallery assets
and image metadata. Missing or stale metadata must not leave `npm run dev` showing
`Missing generated image metadata` after an otherwise successful transfer.
The website's `npm run dev` prepares images at startup and runs a foreground
supervisor: it pauses the Astro preview during transfer, then starts a fresh Astro
process after assets are ready. Reload both the content collection and injected
English routes together. Preserve development redirects for old category URLs.
Use the preview URL printed by the command; `Ctrl+C` stops the preview. Restart an
already-running older dev command once after changing this supervisor.

The preview signal is `.cache/vehicle-preview-state.json`, with a unique id,
publisher pid and `updating`, `ready` or `blocked` phase. Recover derived assets
when the publisher has exited, but block preview when `.cache/vehicle-import.lock`
indicates an active or interrupted import. Never delete a foreign lock. Preserve
malformed derived gallery metadata as an `*.invalid-<uuid>.json` file before
rebuilding from validated source; do not relax source validation or accept symlinks.

If source transfer succeeded but preview preparation failed, report that the
vehicle was saved, include its backup path and keep preview paused. After fixing
the cause, restart `npm run dev`; do not suggest repeating the import as a new
vehicle. Transfer refreshes preview assets, not `dist`, and never builds or publishes.
`npm run build` produces the production site; `npm run build:pages` is the separate
GitHub Pages build when required. These commands belong to the website repository,
never this offline editor.

## Guided vehicle deletion

Deletion belongs to the website CLI, not ZIP export or the editor's authoring UI.
From the website root, run `npm run vehicles:delete` without arguments. Enter a
search term (Enter lists all), select the numbered vehicle by title/category/exact
route and confirm with `JA`. Invalid or zero selections and other confirmation
answers cancel. Keep logs short and German; never open an extra browser page.

The command uses an immutable deletion review and the shared checked import
transaction: stale-input checks, exclusive import lock, verified backups and
rollback. It removes the exact page/folder pair and redirects targeting the car,
updates both languages' sitemap and affected archive pagination/llms links, then
refreshes gallery assets and the supervised development preview. Retired car URLs
return 404; do not invent a redirect target. Preserve unrelated vehicles and prose.
Show the backup path. If preview refresh fails after deletion committed, clearly
report that the car is deleted and keep the backup. Build/publish separately and
refresh the editor's vehicle list. No ZIP, manual file deletion, separate sync or
gallery command is needed. Tests must use disposable projects, never real cars.
The website implementation is `scripts/delete-vehicle.mjs`,
`scripts/lib/vehicle-delete.mjs` and the deletion review/apply functions in
`scripts/lib/vehicle-import.mjs`; regressions are in `tests/vehicle-delete.test.mjs`.

## Related website repository and source of truth

The generated files are consumed by the sibling website repository:

```text
/Users/betannet/Developer/Website/Website
```

The most important contract files there are:

- `/Users/betannet/Developer/Website/Website/src/content.config.ts`: authoritative
  `vehicle.json` schema.
- `/Users/betannet/Developer/Website/Website/src/config/vehicles.ts`: category definitions,
  route construction, discovery, and sorting.
- `/Users/betannet/Developer/Website/Website/src/components/VehicleDetailPage.astro`:
  rendering behavior for copy, contact, and gallery blocks.
- `/Users/betannet/Developer/Website/Website/VEHICLE-CONTENT-GUIDE.md`: human-facing vehicle
  maintenance guide.
- `/Users/betannet/Developer/Website/Website/scripts/lib/vehicle-files.mjs`: filesystem pair,
  image-reference, metadata, and duplicate-order validation.
- `/Users/betannet/Developer/Website/Website/scripts/lib/vehicle-import.mjs`: reference
  checked-import behavior, replacements, backups, and category moves.
- `/Users/betannet/Developer/Website/Website/scripts/transfer-vehicle.mjs` and
  `/Users/betannet/Developer/Website/Website/scripts/lib/vehicle-transfer-wizard.mjs`:
  guided folder input and explicit original-vehicle selection.
- `/Users/betannet/Developer/Website/Website/scripts/lib/vehicle-transfer.mjs` and
  `/Users/betannet/Developer/Website/Website/scripts/lib/vehicle-preview.mjs`: confirmed
  transfer, short German messages, gallery refresh and preview signals.
- `/Users/betannet/Developer/Website/Website/scripts/dev-vehicles.mjs` and
  `/Users/betannet/Developer/Website/Website/scripts/vehicle-dev-server.mjs`: foreground
  preview supervision and fresh Astro processes.
- `/Users/betannet/Developer/Website/Website/scripts/lib/vehicle-gallery.mjs` and
  `/Users/betannet/Developer/Website/Website/src/config/vehicleImages.ts`: generated gallery
  assets and image metadata consumed by rendering.
- `/Users/betannet/Developer/Website/Website/src/config/vehicleDevRedirects.js` and
  `/Users/betannet/Developer/Website/Website/src/middleware.ts`: development redirects.
- `/Users/betannet/Developer/Website/Website/scripts/lib/crawlers.mjs` and
  `/Users/betannet/Developer/Website/Website/src/config/modificationDates.js`: sitemap,
  bilingual routes, pagination, and reviewed date rules.
- `/Users/betannet/Developer/Website/Website/scripts/test-vehicle-discovery.mjs`: discovery
  fixture test.
- `/Users/betannet/Developer/Website/Website/scripts/verify-vehicle-build.mjs`: generated-site
  verification.

Before editing the sibling website, read its own
`/Users/betannet/Developer/Website/Website/AGENTS.md` completely. Preserve unrelated user
changes in that repository. Do not edit generated `dist/` output as source.

Treat the website schema as authoritative. If the generator output format changes,
inspect the current website contract first and update both projects only when needed
to keep them compatible. A generator-only UI or behavior change should not cause
unrelated website edits.

## Non-negotiable constraints

- Keep the deliverable directly runnable from `index.html` with local classic scripts and styles.
- Do not use JavaScript modules or fetch local assets: preserve `file://` compatibility.
- Do not add `package.json`, a build step, runtime dependencies, CDN scripts, remote
  fonts, analytics, network requests, storage services, or a backend.
- The file must work when opened via a local `file://` URL.
- Vehicle data and images stay on the local computer. The editor exports locally;
  source writes belong to the explicitly confirmed website CLI transfer. Historical
  browser transaction recovery remains separate from authoring.
- Keep tool UI copy in German. Vehicle content is authored in German and English.
- Continue supporting desktop and mobile layouts, keyboard use, visible focus states,
  drag-and-drop plus button-based reordering, and screen-reader status updates.
- Preserve normal text selection and browser behavior.
- Never weaken output validation just to make a malformed export succeed.

## Generated filesystem contract

The confirmed website CLI transfer places the vehicle pair under
`src/pages/projekte/<category>/`. The ZIP contains the same pair under one category directory,
without the `src/pages/projekte/` prefix. Use exactly one of these category keys:

- `aktuelle-projekte`
- `vergangene-projekte`
- `fahrzeugangebote`

Expected output:

```text
<category>/
├── <slug>.astro
└── <slug>/
    ├── vehicle.json
    ├── card.<ext>
    ├── image-001.<ext>
    ├── image-002.<ext>
    └── …
```

The `.astro` page and vehicle folder are same-named siblings. This pairing is how the
website discovers vehicles; there is no central vehicle manifest. Do not change this
structure casually.

The generated Astro page must continue to load the matching content entry and render
the shared detail component:

```astro
---
import { getEntry } from 'astro:content';
import VehicleDetailPage from '../../../components/VehicleDetailPage.astro';

const vehicle = await getEntry('vehicles', '<category>/<slug>');

if (!vehicle) {
	throw new Error('Missing vehicle content for <category>/<slug>.');
}
---

<VehicleDetailPage {vehicle} />
```

All image references in `vehicle.json` must be local `./filename.ext` paths and all
referenced files must exist directly in the matching vehicle folder.

## `vehicle.json` contract

The current record shape is:

```json
{
	"slug": "bmw-507-roadster-baujahr-1957",
	"category": "aktuelle-projekte",
	"title": "BMW 507 Roadster, Baujahr 1957",
	"titleEn": "BMW 507 Roadster, year 1957",
	"description": "Deutsche Kurzbeschreibung",
	"descriptionEn": "Short English description",
	"sourceUrl": "https://www.oldtimermanufaktur.de/projekte/aktuelle-projekte/bmw-507-roadster-baujahr-1957/",
	"order": 123,
	"dateModified": "2026-09-07",
	"year": "1957",
	"cardImage": "./card.jpg",
	"cardImageAlt": "BMW 507 Roadster, Baujahr 1957",
	"cardImageAltEn": "BMW 507 Roadster, year 1957",
	"leadImage": "./image-001.jpg",
	"leadImageAlt": "BMW 507 Roadster, Baujahr 1957 – Fahrzeugdokumentation",
	"leadImageAltEn": "BMW 507 Roadster, year 1957 – vehicle record",
	"blocks": []
}
```

Rules:

- `slug`, `category`, title, description, URL, order, date, card metadata, lead
  metadata, and blocks must conform to the current Astro content schema.
- `year` is optional but, when present, must contain exactly four digits.
- The slug uses lowercase ASCII letters, digits, and single hyphens. The app
  transliterates German umlauts and `ß`.
- `dateModified` uses `YYYY-MM-DD` and defaults to the current local date shown by the
  browser input.
- `sourceUrl` is generated automatically as
  `https://www.oldtimermanufaktur.de/projekte/<category>/<slug>/`; it is not a manual
  provenance field for newly created vehicles.
- A card image is always required. New cards use `card.<ext>`; unchanged imported
  cards retain their original filename.
- The lead image may be the card image or any imported gallery image.
- Newly added gallery images are ordered and renamed sequentially as
  `image-001.<ext>`, `image-002.<ext>`, and so on, avoiding preserved filenames.
  Existing vehicle imports keep their original image names.
- Supported image MIME types are JPEG, PNG, WebP, and AVIF. Keep extensions aligned
  with actual MIME types.
- Alt text is required for the card, lead image, and every gallery image. Captions are
  optional.

## Archive ordering

The website sorts first by numeric `order`, ascending, then by German title for a
tie. Each `order` value must be unique within its category.

The generator normally creates order automatically from `Date.now()`:

- Add at end: positive timestamp.
- Add at beginning: negative timestamp.
- Manual override: any safe integer, including a negative one.

This preserves existing sequential positive orders and the established ZIP contract.
With negative timestamps, the most recently generated "beginning" item sorts first.
With positive timestamps, newer "end" items sort after older ones. ZIP preparation
also checks the selected project's destination category for duplicate order values;
never silently renumber other vehicles to resolve a collision.

Do not revert the website schema to positive-only orders while this behavior exists.
If ordering is redesigned, update the generator, website schema, discovery tests, and
vehicle guide together.

## Content blocks

Blocks are stored and rendered in the exact order shown in the authoring UI.

### Copy block

```json
{ "type": "copy", "html": "<p>Deutsch …</p>", "htmlEn": "<p>English …</p>" }
```

Normal editorial content. The website renders it as centered story copy in the
vertical reading sequence and supports
paragraphs, headings, emphasis, links, and lists produced by the editor.

### Contact block

```json
{ "type": "contact", "html": "<p>Deutsch …</p>", "htmlEn": "<p>English …</p>" }
```

A visually separated vehicle-inquiry callout. The shared website component adds the
fixed phone and email action links; they are not stored in `vehicle.json`.

### Gallery block

```json
{
	"type": "gallery",
	"images": [
		{
			"src": "./image-001.jpg",
			"alt": "Deutscher Alternativtext",
			"altEn": "English alternative text",
			"caption": "Optionale deutsche Bildunterschrift",
			"captionEn": "Optional English caption"
		}
	]
}
```

A gallery must contain at least one imported image. The same imported image should
not be duplicated unintentionally across blocks. Imported images not used by a
gallery are still exported; the app reports a warning rather than blocking export.

The rich-text HTML is passed through `sanitizeHtml()` before live insertion and export. Preserve the
sanitization of scripts, embeds, forms, event-handler attributes, and unsafe link
protocols because the website renders this HTML with Astro's `set:html`.

## Important implementation areas in `editor.js`

- CSS variables and responsive layout are in `styles.css` and `workflow.css`.
- `state` owns imported files, object URLs, image order, block order, lead selection,
  and generated automatic order.
- `slugify()` defines filename normalization.
- `setCardFile()` and `addGalleryFiles()` import local images.
- `renumberImages()`, `renderImages()`, and `renderBlocks()` keep UI state and output
  names synchronized.
- `updateSummary()` derives the canonical URL and output tree preview.
- `validate()` checks editor completeness for export and review preparation.
- `sanitizeHtml()` protects HTML consumed by `set:html`.
- `createRecord()` is the central JSON serializer.
- `createAstro()` owns the generated route wrapper.
- `makeZip()` is the dependency-free ZIP writer. It uses the ZIP "store" method
  rather than compression and must preserve UTF-8 filenames, offsets, sizes, and
  CRC-32 values.
- `generate()` assigns automatic ordering, assembles entries, creates the ZIP Blob,
  and triggers the local download.
- `editorSnapshot()` validates and captures the record and images for ZIP preparation.
- `resetEditor()` clears vehicle-specific state while the workflow retains its
  selected project and category filter.

`VehicleProjectAccess` owns project discovery and filesystem snapshots.
`VehicleProjectSave.prepare()` validates a proposed change without writing;
`apply()` remains a historical transaction implementation, never a new authoring
action; `readJournal()` and `restore()` handle interrupted historical saves.
`VehicleProjectUI` coordinates read-only preparation and recovery with the editor through its
explicit adapter. Keep busy state, navigation availability, draft fingerprints,
review invalidation and export validation synchronized.

When changing images or blocks, keep state mutation, rerendering, summary updates,
lead-image validity, gallery selections, and object-URL cleanup synchronized.

## Coding style

- Preserve the existing two-space indentation and current HTML/CSS/JavaScript style.
- Use modern browser-native APIs and plain JavaScript.
- Prefer small named functions over introducing a framework or class hierarchy.
- Escape user-provided strings before interpolating them into UI HTML.
- Sanitize rich text before serializing it into generated output.
- Revoke object URLs when replacing/removing images and after downloads.
- Keep validation messages actionable and in German.
- Keep controls semantically labeled and keyboard-accessible.
- Support reduced motion when adding non-essential animation.
- Avoid unrelated visual redesigns during functional changes.

## Verification

There is no `package.json`, test framework, or build command in this repository.
Never run `npm` here expecting project scripts.

Syntax-check each JavaScript file with `node --check`. Run the website fixtures:

```sh
cd /Users/betannet/Developer/Website/Website
node --test tests/vehicle-contract.test.mjs tests/vehicle-import.test.mjs tests/vehicle-project-save.test.mjs
node scripts/test-vehicle-browser.mjs
```

Open the harness `/` for editor regressions and `/workflow` for the new project
workflow. The harness inlines and instruments only temporary test responses; no
test hooks belong in the deliverable. Test the actual `file://` entry point and
native permission prompts in Chrome/Edge on Mac and Windows when available.
Document unavailable checks rather than claiming them.

For functional changes, verify ZIP export and confirm review/export do not write
to the disposable project. Use the actual `file://` entry point where the browser environment permits
it; the harness does not establish native folder-picker or permission compatibility.
Verify at least:

1. Title changes generate the expected slug and default alt text.
2. Category and slug generate the expected `sourceUrl`.
3. Card-only lead-image export works without gallery images.
4. Multiple gallery images import, preview, reorder, renumber, and retain alt text.
5. Copy, contact, and gallery blocks add, edit, reorder, and remove correctly.
6. Removing an image clears it from gallery blocks and repairs lead selection.
7. Automatic end order is positive; automatic beginning order is negative; manual
   order accepts an integer.
8. Invalid or incomplete data is blocked with useful messages.
9. A successful export downloads a ZIP with the exact sibling page/folder structure.
10. `unzip -t generated.zip` reports no errors and the JSON parses.
11. Desktop and approximately 390 px mobile layouts have no horizontal overflow.
12. Keyboard focus remains visible and all non-drag alternatives work.
13. Full-project selection rejects subfolders and malformed page/folder pairs;
    vehicle titles, dates, category filtering, and new-vehicle reset work correctly.
14. Incomplete data cannot be exported; changing inputs invalidates the reviewed change.
15. ZIP exports contain the correct vehicle pair and preserved bilingual content;
    the guided transfer handles crawler sync and bilingual category redirects.
16. Stale project snapshots, destination collisions, duplicate orders, denied access,
    and foreign locks block writes without discarding the draft.
17. Failed writes restore originals; interrupted recovery retains its journal;
    conflicting external edits and damaged backups stop restoration safely.

For transfer or preview changes, use a disposable website copy and actual exported
ZIPs. Run all four transfer cases with `npm run dev` already running: new vehicle,
category-only move, content-only edit, and content plus category edit. Use computer
use to verify German and English archives/detail pages, replaced images, galleries
and old-route redirects. Check extraction suffixes and escaped spaces, explicit
original selection, cancellation, stale reviews and collisions. Confirm that no
extra browser page opens and logs remain short. Verify post-commit preview failure
reports saved source correctly, interrupted locks block preview, and startup can
repair derived assets without removing locks. Document unavailable native platform
checks; browser harness results do not establish Windows or native folder-picker
compatibility.

When generated data, ordering, project writes, redirects, or crawler handling change,
also verify the website. These are developer checks, not editor runtime requirements:

```sh
cd /Users/betannet/Developer/Website/Website
npm run test:vehicle-discovery
npm run build
npm run build:pages
```

The website build is the final compatibility check. It validates page/folder pairs,
content, images, sorting, routes, gallery assets, sitemap, `llms.txt`, and both
production and GitHub Pages output.

## Scope and safety

- Preserve any unrelated dirty files in either repository.
- Do not commit, deploy, publish, or copy generated vehicle ZIP contents into the
  website unless the user explicitly asks.
- Do not overwrite an existing vehicle page/folder without resolving the exact target
  and confirming that replacement is intended.
- Test artifacts belong in a temporary directory, not in this repository.
- Do not claim that client-side validation replaces the website build validation.
- Do not add personal data, analytics, external uploads, or third-party scripts to
  this offline internal tool without explicit authorization and a corresponding
  privacy review.

## Existing-vehicle editing and checked imports

Folder import validates one vehicle.json and its local images before replacing the
current form. Never execute an accompanying Astro file. Keep imported slugs fixed;
category changes show old/new routes and generate the new canonical URL. Preserve
unchanged legacy sourceUrl values, dates, order, original filenames, image bytes,
lead choice, block sequence and each gallery occurrence's alt text/caption.
Intentional repeated references are valid. Renumber only newly added images without
colliding with preserved names; detect collisions after conversion to WebP as well.
Offer today's local date explicitly; do not silently update imported dates.

Sanitize pasted/imported rich text before insertion into the live editor and again
before serialization. Normalize supported formatting with the explicit website
allowlist; explain removals in German. Unsafe imported records fail without replacing
current work. Validate actual image signatures and successful decoding, calendar
dates, safe integer orders and ZIP counts/sizes/offsets. Export an immutable snapshot.
Keep keyboard formatting, selection restoration, focus after moves/removal and
handle-only dragging working together.

The website's `vehicles:transfer` workflow wraps the checked importer; the advanced
`vehicles:review` check/apply workflow uses the same import contract. Browser
preparation and historical transaction recovery retain compatible destination
checks, backups, category redirects and crawler behavior; keep fixture outputs
aligned without restoring direct-save UI. Never instruct users to extract over
existing source files. Existing-vehicle replacement still needs an exact original
route and authorization; the guided CLI obtains these through numbered selection
and confirmation. Run the website's cross-project contract, importer and
browser fixtures after contract changes. Its test harness may instrument a temporary
copy, but never add test hooks, network requests or dependencies to this deliverable.
Follow the current user's approval scope; summarize implemented edits rather than
requesting per-edit approval when the user has explicitly waived it.

## Bilingual authoring

Keep German and English content paired in the interface: side by side on desktop,
stacked on mobile. Use one shared set of images, blocks, ordering and technical
metadata. German fields retain their original names; English uses `titleEn`,
`descriptionEn`, `cardImageAltEn`, `leadImageAltEn`, `htmlEn`, `altEn` and `captionEn`.
Required text must be present in both languages. Captions are either present in both
or omitted in both. Preserve gallery occurrence metadata independently of pool defaults.

Editor import, ZIP export, and website import require complete bilingual
records. German-only records must be translated before importing. Never silently
generate English by copying German. Preserve imported HTML
when unchanged, validate/sanitize both languages, and keep rich-text selections scoped
to each editor. Do not duplicate image bytes or create separate English ZIP folders.

## Historical browser transaction recovery

The historical browser transaction UI is removed. Keep its library for read-only preparation and historical recovery. Launcher saves use the website checked importer after explicit confirmation; never call historical apply() for new authoring saves. Test in isolated fixtures.


Read selected project scripts as data only; never evaluate them. Fail closed if the
restricted modification-date configuration or expected project structure changes.
Preserve unrelated files and manual crawler text. Only modify the exact reviewed
vehicle pair, redirect map, sitemap, and affected llms links.

Never write source files before the immutable review, destination checks and durable
backup journal are ready. Recheck project hashes before writes and verify saved
bytes. Use `.cache/vehicle-import.lock` to cooperate with the CLI importer, and
retain `.cache/vehicle-browser-backup-*` for recovery. Never delete a foreign lock.
File System Access does not provide an atomic multi-file transaction or exclusive
mkdir: hashes, a lock marker and browser Web Locks reduce conflicts but cannot
protect against arbitrary concurrent external writes. Do not claim otherwise.
Avoid simultaneous editing/build/import while saving. Detect incomplete journals
and restore only files matching reviewed before/after hashes (or empty newly
created files); preserve conflicting external edits for manual recovery.

Use accessible German error/status messages with concrete next actions. Distinguish
permission denial, invalid project/data, stale reviews, interrupted transactions,
save failure with successful rollback, and failed recovery. Include the backup path
when recovery is needed. If the write succeeded but reloading failed, report that
the changes were saved rather than claiming the save failed. Completed journals
are finalized without restoring older content.

Implementation tests use disposable copies or browser-private fixtures only. Do
not modify real vehicle content, publish, or build automatically from the editor.

## Vehicle reading sequence and preview

The website stacks copy, contact and gallery blocks in their saved order. Adjacent
gallery blocks share an uninterrupted photo run; copy and contact end that run.
Photos are uncropped, up to 420px wide: one column below 760px, up to two from
760px and up to three from 1100px (two photos remain two columns). Each occurrence
keeps its own bilingual alternatives and captions under its photograph. Place
related copy directly before or after its gallery; edit photo-specific captions
on the gallery occurrence. No grouping configuration or historical source snapshot
is required.

A lead image already used in the story supplies representative metadata without
an additional opening photograph. A lead outside the story appears before the
first block. The review preview uses local object URLs and sanitized content in a
sandboxed, offline frame; desktop/tablet/mobile sizes and both languages can be
reviewed without changing the draft. It matches website Lora typography, colors, gradients, texture and story layout; surrounding navigation remains simplified.
Gallery splitting retains image order and occurrence metadata, invalidates any
prepared review and focuses the new gallery. It does not itself insert a text block.


## Optional authoring presentation fields

Keep `vehicle-presentation.js`, `watermark.js` and `Lora-OFL-1.1.txt` alongside the existing classic scripts.
The font is embedded for offline canvas use. Watermarking prepares every image
before changing draft files, emits validated WebP copies, and never edits disk
originals. Preserve the filename/MIME correspondence for imported images too.

Gallery blocks may carry `textSide` (`left` or `right`) with required bilingual
`html`/`htmlEn` and exactly one image, representing the dedicated Text neben Bild
block. These blocks end adjacent gallery runs. Each image occurrence may carry
`size` (`small`, `medium`, `large`); omitted sizes retain the established layout.
Only `span` with one fixed `om-color-black|red|green|blue|cyan|yellow|magenta` class is
allowed for colors; arbitrary styles and other attributes remain forbidden.
Keep import/export, preview, both website validators and localization aligned.


The watermark checkbox records a draft preference synchronously. Keep original File
objects, filenames and preview URLs unchanged. Create derived watermarked WebP files
only for the immutable final ZIP/download or Website-Werkzeuge save snapshot; do not
process during import or read-only review. Remap every output image reference and
validate converted files, collisions and export size. Cache derived files by original
File identity for repeat output. Conversion failure preserves the preference and draft.
Reset on vehicle import/new draft; never claim to remove baked-in watermarks.

Use a native Textfarbe dropdown with Standard first. Preserve the browser’s live
rich-text DOM, undo history, each language’s selection and collapsed-caret typing
styles across toolbar/dropdown focus. Capture caret offsets through native block
and list changes. Sanitize serialized state and pasted content; never replace live
innerHTML after routine typing or formatting commands. Keep add-block controls
sticky within the content panel and test desktop/mobile scroll positions.


## Authoring and presentation contract (2026-10-18)

Direct `file://` use remains offline: review and ZIP export never write source files or run commands. The optional local Website-Werkzeuge launcher supports confirmed checked saves and deletion, plus separate preview, build and publication actions. Saving prepares assets and restarts a supervised preview; it does not build `dist` or publish. Publication always requires its own confirmation. Historical browser recovery remains separate from new saves.

The Standard-first palette is white `#ffffff`, red `#e04444`, green `#36b96b`, blue `#4f8fe8`, cyan `#22bfd0`, yellow `#e9c52f` and magenta `#d957bd`. The existing `om-color-black` class means readable Standard white. No vehicle migration is needed; old palette values normalize to the corresponding restricted class when edited. Arbitrary CSS remains forbidden and unchanged imported HTML is retained.

Block removal supports **Letzten Block wiederherstellen** for the last 20 removals in the current draft, without a timer. Restoration uses surviving neighbours and preserves later edits. Images intentionally removed from the pool are omitted with an explanation. Switching successfully to another vehicle clears this history; native text undo remains independent. Moves and removals restore keyboard focus and announce the result.

Decoded source dimensions are shown beside card and gallery images. Nonblocking review warnings recommend 480 px for cards/standalone lead images, 420 px for small gallery images, 840 px for medium and 1200 px for large. These hints never change image bytes or replace hard validation. Both descriptions have independent labelled 500-character counters. Category labels use **Abgeschlossene Projekte** while the technical key stays `vergangene-projekte`.

The sandboxed offline preview uses local `vehicle-presentation.js` with immutable presentation data, embedded Lora and decorative texture. It matches centered ordinary copy, left-aligned side text, dark story background, cream/green transitions, contact styling and responsive image sizing. The website keeps local equivalents; cross-project regressions enforce parity. Runtime use never requires the sibling repository. Keep the presentation, watermark and font licence assets together.

Redirects preserve explicit URL language queries. The website does not store language preferences: explicit `lang=de`/`lang=en` takes precedence over the route and browser language. Development redirects run before Astro request normalization. Static redirect HTML retains a no-JavaScript meta refresh and visible fixed destination, plus a CSP-hashed script forwarding the incoming query and fragment when JavaScript is available.
