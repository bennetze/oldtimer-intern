/* Runs against an unmodified demo inside a disposable localhost-only harness. */
(async () => {
  const results = [];
  const iframe = document.querySelector('#editor');
  if (!iframe.contentDocument?.querySelector('#choose-project')) await new Promise(resolve => iframe.addEventListener('load', resolve, { once: true }));
  const win = iframe.contentWindow, doc = iframe.contentDocument;
  const $ = selector => doc.querySelector(selector);
  const all = selector => [...doc.querySelectorAll(selector)];
  const assert = (value, message) => { if (!value) throw new Error(message); };
  async function until(check) {
    await new Promise(resolve => setTimeout(resolve, 0));
    for (let i = 0; i < 150; i++) { if (check() && !$('[data-step-target="project"]').disabled) return; await new Promise(resolve => setTimeout(resolve, 30)); }
    throw new Error('Timed out: ' + check.toString());
  }
  function input(selector, value) { const el = $(selector); el.value = value; el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); }
  function click(selector) { assert($(selector) && !$(selector).disabled, 'Unavailable control: ' + selector); $(selector).click(); }
  const step = name => click(`[data-step-target="${name}"]`);
  async function run(name, work) { await work(); results.push({ name, passed: true }); }
  let folderCalls = 0, networkCalls = 0, zipCount = 0, downloads = 0;
  win.showDirectoryPicker = () => { folderCalls++; throw new Error('Folder picker must never run'); };
  win.fetch = () => { networkCalls++; throw new Error('No demo API calls'); };
  const nativeObjectURL = win.URL.createObjectURL.bind(win.URL);
  win.URL.createObjectURL = blob => { if (blob.type === 'application/zip') zipCount++; return nativeObjectURL(blob); };
  const nativeClick = win.HTMLAnchorElement.prototype.click;
  win.HTMLAnchorElement.prototype.click = function () { if (this.download) downloads++; else nativeClick.call(this); };
  win.confirm = () => true;
  try {
    await run('start without project access and load examples', async () => {
      assert($('[data-step-target="selection"]').disabled, 'Selection starts disabled');
      assert(!$('.demo-notice') && !$('#remember-demo'), 'Removed disclosure and memory-save control');
      assert(!doc.querySelector('[data-step="project"] p:not(:empty)'), 'No introductory copy');
      click('#choose-project'); await until(() => all('.vehicle-row').length === 3);
      assert(all('.vehicle-row time').map(el => el.textContent).join() === '03.10.2026,02.10.2026,01.10.2026', 'Date ordering');
      click('.vehicle-row'); await until(() => $('#title').value.includes('Roadster') && !$('#prepare-save').disabled);
      assert($('#title-en').value.includes('Roadster'), 'English import');
    });
    await run('review invalidates and category move preserves bilingual draft', async () => {
      step('review'); click('#prepare-save'); await until(() => $('#save-review').dataset.reviewState === 'ready');
      step('vehicle'); input('#title', 'Mein Roadster'); input('#title-en', 'My roadster'); input('#category', 'fahrzeugangebote');
      assert($('#save-review').dataset.reviewState === 'stale', 'Stale review');
      assert($('#title-en').value === 'My roadster', 'English preserved');
      assert($('#source-url').value.includes('/fahrzeugangebote/'), 'Canonical category move');
    });
    await run('cancel discard and reset keep current work', async () => {
      step('selection'); win.confirm = () => false; click('#start-new');
      assert($('#title').value === 'Mein Roadster', 'Cancelled new retains draft');
      click('#refresh-project'); assert(all('.vehicle-row').length === 3, 'Cancelled reset retains list');
      win.confirm = () => true;
      step('vehicle');
    });
    await run('block and image keyboard alternatives preserve state', async () => {
      step('content'); const count = all('[data-block-id]').length;
      click('[data-add-block="copy"]'); assert(all('[data-block-id]').length === count + 1, 'Added block');
      const last = all('[data-block-id]').at(-1);
      const move = last.querySelector('[data-block-move="up"]'); assert(move, 'Move button'); move.click();
      const remove = doc.querySelector('[data-block-id] [data-block-remove]'); assert(remove, 'Remove button'); remove.click();
      step('images'); const first = $('[data-image-id]'); const imageId = first.dataset.imageId;
      const alt = first.querySelector('[data-image-alt]'); input('#' + alt.id, 'Übungsansicht mit eigenem Alternativtext');
      first.querySelector('[data-image-move="down"]').click();
      assert($(`[data-image-id="${imageId}"] [data-image-alt]`).value.includes('eigenem'), 'Alt retained after move');
      // Reload a sample to keep the review test independent of block edits.
      step('selection'); click('.vehicle-row'); await until(() => $('#title').value === 'Roadster, Baujahr 1962');
      input('#title', 'Mein Roadster'); input('#title-en', 'My roadster'); input('#category', 'fahrzeugangebote');
    });
    await run('quick watermark preview preserves original images and checkbox preference', async () => {
      step('images');
      const original = $('#card-preview-image').src;
      const urls = [], revoked = [];
      const create = win.URL.createObjectURL, revoke = win.URL.revokeObjectURL;
      win.URL.createObjectURL = file => { const url = create(file); if (file.type === 'image/webp') urls.push(url); return url; };
      win.URL.revokeObjectURL = url => { revoked.push(url); revoke.call(win.URL, url); };
      click('#open-watermark-preview');
      await until(() => all('#watermark-preview-images img').length === 3);
      await until(() => all('#watermark-preview-images img').every(image => image.complete && image.naturalWidth));
      assert(!$('#watermark-all').checked, 'Preview does not change preference');
      assert($('#card-preview-image').src === original, 'Original card URL retained');
      assert(all('#watermark-preview-images img').every(image => urls.includes(image.src)), 'All card and gallery images rendered as WebP');
      click('#close-watermark-preview'); await until(() => !$('#watermark-preview-dialog').open && !all('#watermark-preview-images img').length);
      assert(urls.every(url => revoked.includes(url)), 'Temporary preview URLs revoked');
      assert(doc.activeElement.id === 'open-watermark-preview', 'Focus restored');
      $('#watermark-all').checked = true; $('#watermark-all').dispatchEvent(new win.Event('change', { bubbles: true }));
      step('review'); click('#open-page-preview');
      await until(() => $('#page-preview-frame').contentDocument?.querySelector('.story-image img')?.complete);
      const marked = $('#page-preview-frame').contentDocument.querySelector('.story-image img');
      assert(marked.src !== $('[data-image-id] img').src, 'Page uses derived watermarked image');
      click('#close-page-preview'); await until(() => !$('#page-preview-frame').hasAttribute('srcdoc'));
      $('#watermark-all').checked = false; $('#watermark-all').dispatchEvent(new win.Event('change', { bubbles: true }));
      win.URL.createObjectURL = create; win.URL.revokeObjectURL = revoke;
    });
    await run('sandboxed bilingual draft preview', async () => {
      step('review'); click('#open-page-preview');
      assert($('#page-preview-frame').getAttribute('sandbox') === 'allow-same-origin', 'Sandbox');
      input('#preview-language', 'en');
      await until(() => $('#page-preview-frame').contentDocument?.body?.textContent.includes('My roadster'));
      for (const width of ['1200', '800', '390']) input('#preview-width', width);
      click('#close-page-preview'); await until(() => !$('#page-preview-frame').hasAttribute('srcdoc'));
    });
    await run('review works without ZIP download controls or project access', async () => {
      assert(!$('#generate') && !$('#after-export'), 'No download controls');
      assert(!all('[data-step="review"] button, [data-step-target="review"]').some(el => /ZIP|exportieren|herunterladen/i.test(el.textContent)), 'No export labels');
      click('#prepare-save'); await until(() => $('#save-review').dataset.reviewState === 'ready');
      assert(!doc.querySelector('#tools-transfer'), 'No website controls');
      assert(folderCalls === 0 && networkCalls === 0, 'No filesystem or API access');
      assert(zipCount === 0 && downloads === 0, 'No ZIP or download created');
    });
    await run('duplicate orders block practice changes', async () => {
      step('vehicle'); input('#order', '300'); step('review'); click('#prepare-save');
      await until(() => $('#save-review').textContent.includes('bereits belegt'));
    });
    await run('new vehicle has useful validation and automatic slug', async () => {
      step('selection'); click('#start-new');
      assert($('#card-preview').hidden, 'New vehicle resets images');
      input('#title', 'Übungswagen Weiß 1960'); input('#title-en', 'Practice car white 1960');
      assert($('#slug').value === 'uebungswagen-weiss-1960', 'German transliteration');
      input('#description', 'Eine fiktive Beschreibung.'); input('#description-en', 'A fictional description.');
      input('#category', 'vergangene-projekte');
      assert($('#source-url').value.includes('/vergangene-projekte/uebungswagen-weiss-1960/'), 'Canonical URL');
      step('review'); assert($('#prepare-save').disabled, 'Incomplete data cannot be reviewed');
      assert($('#review-state').textContent.length > 0, 'Actionable validation');
    });
    await run('card-only review, both automatic order directions and manual order', async () => {
      const canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 60;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#7e2930'; ctx.fillRect(0, 0, 80, 60);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      const transfer = new win.DataTransfer(); transfer.items.add(new win.File([blob], 'practice.jpg', { type: 'image/jpeg' }));
      step('images'); $('#card-file').files = transfer.files; $('#card-file').dispatchEvent(new win.Event('change', { bubbles: true }));
      await until(() => !$('#card-preview').hidden);
      input('#card-alt', 'Rotes fiktives Übungsfahrzeug'); input('#card-alt-en', 'Red fictional practice vehicle');
      input('#lead-alt', 'Rotes fiktives Übungsfahrzeug'); input('#lead-alt-en', 'Red fictional practice vehicle');
      async function reviewedOrder() {
        step('review'); click('#prepare-save'); await until(() => $('#save-review').dataset.reviewState === 'ready');
        return parseInt($('#summary-order').textContent, 10);
      }
      assert(await reviewedOrder() > 0, 'Automatic end order with card-only draft');
      assert($('#card-alt-en').value === 'Red fictional practice vehicle', 'English card metadata');
      step('vehicle'); input('#prepend-order', 'on'); $('#prepend-order').checked = true; $('#prepend-order').dispatchEvent(new win.Event('change', { bubbles: true }));
      assert(await reviewedOrder() < 0, 'Automatic beginning order');
      step('vehicle'); $('#auto-order').checked = false; $('#auto-order').dispatchEvent(new win.Event('change', { bubbles: true })); input('#order', '-7');
      assert(await reviewedOrder() === -7, 'Safe negative manual order');
      step('vehicle'); input('#description-en', ''); step('review'); assert($('#prepare-save').disabled, 'Missing English blocks review');
    });
    await run('desktop and mobile do not overflow', async () => {
      for (const width of [1440, 390]) {
        iframe.style.width = width + 'px'; await new Promise(resolve => setTimeout(resolve, 80));
        for (const name of ['project', 'selection', 'vehicle', 'images', 'content', 'review']) {
          step(name); assert(doc.documentElement.scrollWidth <= doc.documentElement.clientWidth + 1, `No overflow at ${width}, ${name}`);
        }
      }
    });
    await run('reset restores fictional examples', async () => {
      step('selection'); click('#refresh-project'); await until(() => all('.vehicle-row').length === 3);
      input('#category-filter', ''); assert(all('.vehicle-row').length === 3, 'Reset examples');
      assert(!$('#title').value, 'Reset draft');
      assert(zipCount === 0 && downloads === 0, 'Entire demo runs without ZIPs or downloads');
    });
  } catch (error) { results.push({ name: error.message, passed: false, stack: error.stack }); }
  const report = { passed: results.every(result => result.passed), results };
  document.querySelector('#results').textContent = JSON.stringify(report, null, 2);
  await fetch('/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) });
})();
