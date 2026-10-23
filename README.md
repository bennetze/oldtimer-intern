# Client practice demo

This branch (`demo`) is an isolated, static practice version of the
internal editor. Keep it separate from `main`; it is not intended to be merged.

Open `index.html` locally, or serve the repository root with GitHub Pages.
There is no install or build step. All paths are relative, including under
`/oldtimer-intern/`. Only the static editor and its bundled scripts/styles run.

## Repository versions

- `main` contains the complete internal editor used by the Website-Werkzeuge launcher.
- `demo` contains this standalone client version and remains the GitHub Pages source.

Shared editor updates are merged from `main`; demo-specific entry, workflow and copy
remain separate. Both branches are committed and available in the normal repository.
Switch branches there after committing local work; an extra worktree is not required.

## GitHub Pages setup

In repository Settings → Pages, select **Deploy from a branch**, choose
**demo**, select **/(root)**, and save. GitHub supplies the final
URL on that page. This deploys the demo editor, not the vehicle website.
No Actions workflow, website directory, launcher or backend is required.

## Demo behavior

- Six steps: start demo, select practice vehicle, metadata, images, content, review.
- Three fictional bilingual examples with canvas-generated placeholder pictures.
- Create vehicles, change categories, edit bilingual text, reorder images/blocks,
  and inspect a sandboxed local draft at desktop, tablet and mobile sizes.
- Draft review and preview only; ZIP downloads are unavailable.
- No folder picker, project access, source writes, live website preview, deletion,
  build, deployment, API calls, analytics, storage service or content uploads.
- Refreshing/closing loses all practice changes. A reset requires confirmation.
- Validation checks cover the in-memory practice list only, never the real website.

`demo-ui.js` replaces the project workflow. The production access/save/launcher
libraries are retained as inert source history but are not loaded or deployed
as executable actions. `demo-data.js` creates examples without remote resources.

## Verification

Run `node --check` on all JavaScript files and `node --test tests/demo.test.mjs`.
For browser regressions run `node scripts/test-demo-browser.mjs` and open its
printed localhost `/test` URL in a browser. The test uses a disposable static server,
exercises the real demo without production hooks, and writes results
to a temporary directory. No real vehicles are used.
