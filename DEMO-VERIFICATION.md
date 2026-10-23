# Watermark previews — 2026-10-23

Added **Wasserzeichen ansehen** beside the image-step checkbox in both the demo
and the separate local editor checkout. The quick dialog covers card and gallery
images without requiring a complete draft. The sandboxed page view uses the same
rendered WebP copies when watermarking is enabled. Original files, filenames and
editor thumbnails remain unchanged; preview URLs are revoked on close. The demo
still has no ZIP downloads or project actions.

Passed checks:

- JavaScript syntax, both Node demo tests and whitespace checks.
- All twelve demo browser regression groups, including watermark rendering,
  unchanged original image URLs/preference, focus restoration and URL cleanup.
- All 45 local editor browser regressions and 50 website contract/import/save tests
  against the separate local editor checkout.
- Local fixture ZIP passes `unzip -t`; its vehicle JSON parses independently.
- Manual browser inspection of the quick preview in both versions.

Tests used temporary localhost harnesses and fictional/disposable data. Direct
`file://` navigation is blocked by the browser automation policy. Native Windows
Chrome/Edge and native folder-picker compatibility remain unverified. No commit,
publishing operation or real vehicle changes were performed.

---

# ZIP download removal — 2026-10-23

The `demo` branch no longer offers ZIP downloads. The download button, ZIP writer
and download handler were removed; step six is now **Prüfen**. Draft validation
and the sandboxed bilingual preview remain available. The `main` branch is unchanged.

Passed checks:

- Syntax checks for every root JavaScript file and scripts/tests JS/MJS file.
- Both Node demo tests and `git diff --check`.
- All eleven browser regression groups under `/oldtimer-intern/`, including review
  invalidation, bilingual preview, collision/incomplete-input validation, card-only
  review, ordering, image/block controls, reset and desktop/mobile overflow checks.
- The browser regressions assert that no ZIP blobs or downloads are created.

Checks used fictional examples and a temporary localhost harness. Native `file://`
and Windows Chrome/Edge were not tested. No publishing operation was performed.

---

# Demo verification — 2026-10-19

The client demo is isolated on `demo`, with its own managed checkout.
The original `main` checkout and its uncommitted files were preserved.

Passed checks:

- Syntax checks for every JavaScript/MJS file in this branch; `git diff --check`.
- Two Node demo tests: static entry isolation/CSP and fictional bilingual examples.
- Eleven browser regression groups against the real, uninstrumented demo entry
  served beneath `/oldtimer-intern/`: startup, selection/date ordering, bilingual
  imports, category changes/canonical URL, review invalidation,
  discard/reset cancellation, block and image reorder buttons, alternative text
  preservation, sandboxed bilingual responsive draft view, valid ZIP download,
  duplicate order rejection, incomplete bilingual input, new vehicle reset/slug
  transliteration, card-only lead export, positive/negative automatic ordering,
  safe negative manual order, all six steps at 1440px and 390px, and demo reset.
- Browser fixtures assert no directory-picker calls or application API requests.
- `unzip -t` and independent JSON inspection: five entries under the expected
  category, paired Astro page/vehicle folder, bilingual content intact, CRCs valid.
- Existing sibling website contract, importer and historical save suites: 50 passed.
  These validate the shared production contract and do not establish demo UI behavior.
- Manual computer-use review of onboarding, sample loading and local draft view.

No real vehicle content, website source, production build or publishing operation
was exercised. GitHub Pages publishes only this practice editor.

Unavailable checks: the browser automation environment blocks `file://` navigation,
so the actual local-file entry was not verified. Native Chrome/Edge on Windows and
native folder permissions were not tested; the demo does not need folder permissions.
The main workflow was tested over HTTP in the embedded Chromium browser.
