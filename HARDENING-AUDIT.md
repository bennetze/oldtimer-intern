# Editor–website hardening implementation

The approved plan is implemented across the offline editor and sibling website.
The classic-script, local-only six-step workflow, bilingual record fields, Astro
wrapper, sibling page/folder structure, and source-only reviewed saving are retained.
No dependencies, editor network calls, commits, publishing, legal-copy changes, or
real vehicle replacements were added. Concurrent website work was preserved,
including retirement of the historical importer and content-hash image cache v3.

## Findings and implementation

| Priority | Finding | Implemented correction |
| --- | --- | --- |
| P1 | CLI rollback overwrote concurrent external edits. | Ownership marker, destination-before hashes, verified backups, rollback preflight and per-mutation hash/ownership checks. Conflicts retain edits, backup and lock. |
| P1 | Browser recovery lacked coordination and repeated checks. | Save and recovery share a Web Lock; recovery checks journal ownership, current bytes and backups again immediately before each mutation and verifies restored bytes. |
| P1 | Completed transaction cleanup could enter rollback and misreport success. | Internal result distinguishes durable commit and pending cleanup. Completed journals are finalized without restoring older files; German messages distinguish saved data from reload/unlock failures. |
| P1 | Candidate project recovery discarded the current workspace. | Candidate inspection leaves the current project, selection and draft intact until successful loading. Recovery blocks only the affected current project. |
| P2 | Completed recovery required obsolete backup bytes. | Completed/restored journals unlock after ownership validation without reading obsolete backups. |
| P2 | Tests/docs referenced the retired editor directory. | One test-side resolver defaults relative to `oldtimer-intern/index.html`, honors `VEHICLE_TOOL_PATH`, and reports unavailable editors explicitly. Documentation paths are updated. |
| P2 | Output payload limits differed. | Shared editor snapshot assembly and ZIP checks enforce 2 MiB JSON, 50 MiB per image, 100 megapixels, 2000 vehicle-folder files and 512 MiB payload. ZIP container limits remain separate. Browser saving, CLI importing and filesystem discovery enforce compatible limits. |
| P2 | New image names could collide after case folding/WebP conversion. | New names reserve case-insensitive card and preserved gallery stems. Imported filenames remain unchanged; validators check converted filenames too. |
| P2 | Gallery occurrence moves/removal retained stale derived state/reviews. | Common mutation notification immediately invalidates review and coalesces derived updates; occurrence and rich-text changes invoke it. |
| P2 | Save waited for permission before locking/rechecking. | Workflow locks synchronously, captures review/project identity and fingerprint, then revalidates them after permission resolves. |
| P2 | Date comparison removed literal whitespace. | Restricted token comparison preserves string/regex contents and rejects altered logic without evaluating selected scripts. |
| P2 | Astro schemas stripped unknown fields. | Strict vehicle, block and gallery-image object schemas preserve checked-import rejection behavior. |
| P2 | Unsafe Windows/oversized filenames were accepted. | Device names, oversized ASCII components and oversized Astro/WebP destination names are rejected consistently. |

Additional maintenance includes review-byte/hash validation, journal object/route/path/
hash/directory-state validation, bounded flat vehicle discovery with German hashing
progress, differential HTML fixtures including wrappers and malformed nesting, image
manifest route/metadata validation and cache-byte/image-dimension checks, symlink/root
boundary checks, and updated recovery/cache guidance.

## Verification

- JavaScript syntax checks and diff whitespace checks pass.
- All 58 website tests pass, including fault injection for concurrent edits, foreign
  locks, stale/mutated reviews, corrupt journals/backups, completed cleanup failures,
  repeated recovery, and byte-equivalent browser/CLI plans across all categories.
- Discovery fixtures pass. Sitemap comparison covers archive counts 0, 1, 23, 24,
  25, 48 and 49, both languages and reviewed modification dates.
- Browser harness: 22 editor and 12 workflow cases pass, including delayed permission,
  candidate recovery, immediate occurrence invalidation, filename/payload checks,
  keyboard reordering and desktop/390px overflow checks.
- Production and GitHub Pages builds pass their release verifiers: 344 pages,
  172 language pairs and 314 authored vehicle language pages.
- Dependency audit: zero known vulnerabilities; 252 verified registry signatures,
  71 verified attestations.
- A distinct bilingual fixture ZIP passes `unzip -t`, parses and imports through
  the checked CLI into a disposable website copy. That copy builds 346 pages;
  German/English title, description, lead/gallery alternatives, copy/contact,
  captions and archive-card alternatives match authored records.
- Native macOS Chrome opens the unmodified `file://` entry point, grants access
  to the disposable full project, discovers 158 vehicles, loads the bilingual
  fixture, completes a reviewed save, reloads it and downloads a ZIP. The native
  downloaded ZIP also passes `unzip -t`.
- Existing public-site dialog, archive Back restoration and reduced-motion regression
  suites pass, along with generated-site accessibility/metadata/link checks. Live
  browser checks on the disposable build also verify gallery opening, Escape
  dismissal with focus restoration, and filtered archive state after browser Back.

## Remaining acceptance and limits

Windows and Edge native permission/save behavior remain unverified in this environment.
Safari/Firefox manual browser checks and broader cross-browser visual acceptance
were not completed; the automated public-site regressions above do not replace them.
Full keyboard/screen-reader and OS permission-revocation acceptance remain manual.

File System Access cannot make a multi-file transaction atomic or prevent every
external write between checking and mutating a file. Hashes, durable backups,
ownership markers and Web Locks reduce conflicts and stop detected conflicts;
avoid concurrent editing/building/importing while saving. Keep recovery backups
and locks when a conflict is reported, and resolve differing external edits manually.
This audit does not guarantee that every possible defect has been found.

Native verification screenshot: `/tmp/oldtimer-hardening-native-save.png`.
