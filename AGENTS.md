# AGENTS.md

## Project purpose

This repository contains an offline browser editor for vehicle pages on the
Oldtimermanufaktur website. Open `index.html` in desktop Chrome or Edge, select the
complete website project, choose or create a vehicle, edit, review, and save.

The deliverable uses local classic scripts and styles:

- `index.html`: markup and script/style links.
- `styles.css`, `workflow.css`: existing editor and workflow layout.
- `editor.js`: bilingual authoring, validation, images, ZIP export.
- `project-access.js`: directory handles, discovery, snapshots.
- `project-save.js`: checked save, sitemap/redirect updates, backups/recovery.
- `project-ui.js`: project selection, vehicle list, review and save UI.

All files must remain together. There is no install, server, package manager, or
build step for this tool. Saving changes source files; building `dist` is separate.
ZIP export remains available for the website's checked CLI importer.

Use English for collaboration and technical documentation unless the user requests
another language. Keep the tool's interface and actionable messages in German.

## User workflow

Preserve these six steps, all visible in the navigation:

1. Projektordner
2. Fahrzeug auswählen
3. Fahrzeug & Kategorie
4. Bilder
5. Inhalte
6. Prüfen & speichern

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

The final step first prepares a review of the project, original/destination route,
and affected files. `Im Projekt speichern` authorizes exactly that reviewed change.
Invalidate the review when inputs change. After saving, reload the committed data
and refresh the vehicle list. Keep ZIP export secondary.

Saving updates source files only. Do not add npm detection, installation, automatic
builds, or build-error alerts to the tool. Never imply that saving refreshes `dist`
or produces an uploadable website; building and publishing remain separate.

## Related website repository and source of truth

The generated files are consumed by the sibling website repository:

```text
/Users/betannet/Developer/oldtimer
```

The most important contract files there are:

- `/Users/betannet/Developer/oldtimer/src/content.config.ts`: authoritative
  `vehicle.json` schema.
- `/Users/betannet/Developer/oldtimer/src/config/vehicles.ts`: category definitions,
  route construction, discovery, and sorting.
- `/Users/betannet/Developer/oldtimer/src/components/VehicleDetailPage.astro`:
  rendering behavior for copy, contact, and gallery blocks.
- `/Users/betannet/Developer/oldtimer/VEHICLE-CONTENT-GUIDE.md`: human-facing vehicle
  maintenance guide.
- `/Users/betannet/Developer/oldtimer/scripts/lib/vehicle-files.mjs`: filesystem pair,
  image-reference, metadata, and duplicate-order validation.
- `/Users/betannet/Developer/oldtimer/scripts/lib/vehicle-import.mjs`: reference
  checked-import behavior, replacements, backups, and category moves.
- `/Users/betannet/Developer/oldtimer/scripts/lib/crawlers.mjs` and
  `/Users/betannet/Developer/oldtimer/src/config/modificationDates.js`: sitemap,
  bilingual routes, pagination, and reviewed date rules.
- `/Users/betannet/Developer/oldtimer/scripts/test-vehicle-discovery.mjs`: discovery
  fixture test.
- `/Users/betannet/Developer/oldtimer/scripts/verify-vehicle-build.mjs`: generated-site
  verification.

Before editing the sibling website, read its own
`/Users/betannet/Developer/oldtimer/AGENTS.md` completely. Preserve unrelated user
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
- Vehicle data and images stay on the local computer. Only an explicit reviewed save writes to the selected project; ZIP export remains local.
- Keep tool UI copy in German. Vehicle content is authored in German and English.
- Continue supporting desktop and mobile layouts, keyboard use, visible focus states,
  drag-and-drop plus button-based reordering, and screen-reader status updates.
- Preserve normal text selection and browser behavior.
- Never weaken output validation just to make a malformed export succeed.

## Generated filesystem contract

Direct saving writes the vehicle pair under `src/pages/projekte/<category>/` in the
selected project. The ZIP contains the same pair under one category directory,
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
With positive timestamps, newer "end" items sort after older ones. Direct saving
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

Normal editorial content. The website renders it as centered story copy and supports
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
- `validate()` checks editor completeness for export and save preparation.
- `sanitizeHtml()` protects HTML consumed by `set:html`.
- `createRecord()` is the central JSON serializer.
- `createAstro()` owns the generated route wrapper.
- `makeZip()` is the dependency-free ZIP writer. It uses the ZIP "store" method
  rather than compression and must preserve UTF-8 filenames, offsets, sizes, and
  CRC-32 values.
- `generate()` assigns automatic ordering, assembles entries, creates the ZIP Blob,
  and triggers the local download.
- `editorSnapshot()` validates and captures the record and images for checked saving.
- `resetEditor()` clears vehicle-specific state while the workflow retains its
  selected project and category filter.

`VehicleProjectAccess` owns project discovery and filesystem snapshots.
`VehicleProjectSave.prepare()` validates a proposed change without writing;
`apply()` creates the backup and commits it; `readJournal()` and `restore()` handle
interrupted saves. `VehicleProjectUI` coordinates these with the editor through its
explicit adapter. Keep busy state, navigation availability, draft fingerprints,
review invalidation, and the post-save baseline synchronized.

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
cd /Users/betannet/Developer/oldtimer
node --test tests/vehicle-contract.test.mjs tests/vehicle-import.test.mjs tests/vehicle-project-save.test.mjs
node scripts/test-vehicle-browser.mjs
```

Open the harness `/` for editor regressions and `/workflow` for the new project
workflow. The harness inlines and instruments only temporary test responses; no
test hooks belong in the deliverable. Test the actual `file://` entry point and
native permission prompts in Chrome/Edge on Mac and Windows when available.
Document unavailable checks rather than claiming them.

For functional changes, verify a complete save on a disposable project and a ZIP
export. Use the actual `file://` entry point where the browser environment permits
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
14. Incomplete data cannot be saved; changing inputs invalidates the reviewed change.
15. New saves, replacements, and category moves match the checked importer's file
    output, including bilingual sitemap entries and pagination boundaries.
16. Stale project snapshots, destination collisions, duplicate orders, denied access,
    and foreign locks block writes without discarding the draft.
17. Failed writes restore originals; interrupted recovery retains its journal;
    conflicting external edits and damaged backups stop restoration safely.

When generated data, ordering, project writes, redirects, or crawler handling change,
also verify the website. These are developer checks, not editor runtime requirements:

```sh
cd /Users/betannet/Developer/oldtimer
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

The website's `vehicles:review` check/apply workflow owns CLI imports. The browser
checked-save path implements compatible destination checks, backups, category
redirects and crawler updates; keep their fixture outputs aligned. Never instruct users to extract over
existing source files. Existing-vehicle replacement still needs an explicit original
route and authorization. Run the website's cross-project contract, importer and
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

The explicit legacy-import checkbox allows old German-only records into the editor,
leaving English empty. Direct save, ZIP export, and website import require complete bilingual
records. Never silently generate English by copying German. Preserve imported HTML
when unchanged, validate/sanitize both languages, and keep rich-text selections scoped
to each editor. Do not duplicate image bytes or create separate English ZIP folders.

## Browser checked saving

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
