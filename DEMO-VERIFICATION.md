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
