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
  let folderCalls = 0, networkCalls = 0, zipBlob;
  win.showDirectoryPicker = () => { folderCalls++; throw new Error('Folder picker must never run'); };
  win.fetch = () => { networkCalls++; throw new Error('No demo API calls'); };
  const nativeObjectURL = win.URL.createObjectURL.bind(win.URL);
  win.URL.createObjectURL = blob => { if (blob.type === 'application/zip') zipBlob = blob; return nativeObjectURL(blob); };
  const nativeClick = win.HTMLAnchorElement.prototype.click;
  win.HTMLAnchorElement.prototype.click = function () { if (!this.download) nativeClick.call(this); };
  win.confirm = () => true;
  try {
    await run('start without project access and load examples', async () => {
      assert($('[data-step-target="selection"]').disabled, 'Selection starts disabled');
      click('#choose-project'); await until(() => all('.vehicle-row').length === 3);
      assert(all('.vehicle-row time').map(el => el.textContent).join() === '03.10.2026,02.10.2026,01.10.2026', 'Date ordering');
      click('.vehicle-row'); await until(() => $('#title').value.includes('Roadster') && !$('#prepare-save').disabled);
      assert($('#title-en').value.includes('roadster'), 'English import');
    });
    await run('review invalidates; memory save preserves bilingual category move', async () => {
      step('review'); click('#prepare-save'); await until(() => $('#save-review').dataset.reviewState === 'ready');
      step('vehicle'); input('#title', 'Mein Übungsroadster'); input('#title-en', 'My practice roadster'); input('#category', 'fahrzeugangebote');
      assert($('#save-review').dataset.reviewState === 'stale', 'Stale review');
      step('review'); click('#remember-demo'); await until(() => $('#status').textContent.includes('in diesem Tab gemerkt'));
      step('selection'); input('#category-filter', 'fahrzeugangebote'); assert(all('.vehicle-row').length === 2, 'Moved practice vehicle');
      click('.vehicle-row'); await until(() => $('#title').value === 'Mein Übungsroadster');
      assert($('#title-en').value === 'My practice roadster', 'English preserved');
      assert($('#source-url').value.includes('/fahrzeugangebote/'), 'Canonical category move');
    });
    await run('cancel discard and reset keep current work', async () => {
      input('#title', 'Nicht verwerfen'); step('selection'); win.confirm = () => false; click('#start-new');
      assert($('#title').value === 'Nicht verwerfen', 'Cancelled new retains draft');
      click('#refresh-project'); assert(all('.vehicle-row').length === 2, 'Cancelled reset retains list');
      win.confirm = () => true; click('.vehicle-row'); await until(() => $('#title').value === 'Mein Übungsroadster');
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
      // Reload the remembered version to keep the ZIP test independent of block edits.
      step('selection'); click('.vehicle-row'); await until(() => $('#title').value === 'Mein Übungsroadster');
    });
    await run('sandboxed bilingual draft preview', async () => {
      step('review'); click('#open-page-preview');
      assert($('#page-preview-frame').getAttribute('sandbox') === 'allow-same-origin', 'Sandbox');
      input('#preview-language', 'en');
      await until(() => $('#page-preview-frame').contentDocument?.body?.textContent.includes('My practice roadster'));
      for (const width of ['1200', '800', '390']) input('#preview-width', width);
      click('#close-page-preview'); await until(() => !$('#page-preview-frame').hasAttribute('srcdoc'));
    });
    await run('valid practice ZIP downloads without project access', async () => {
      click('#generate'); await until(() => zipBlob && !$('#generate').disabled);
      assert(zipBlob.size > 1000, 'ZIP bytes');
      await fetch('/zip', { method: 'POST', body: zipBlob });
      assert(!$('#after-export').textContent.includes('npm'), 'No transfer instructions');
      assert(!doc.querySelector('#tools-transfer'), 'No website controls');
      assert(folderCalls === 0 && networkCalls === 0, 'No filesystem or API access');
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
      click('#generate'); assert($('#workspace-status').textContent.length > 0, 'Actionable validation');
    });
    await run('card-only ZIP, both automatic order directions and manual order', async () => {
      const canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 60;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#7e2930'; ctx.fillRect(0, 0, 80, 60);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      const transfer = new win.DataTransfer(); transfer.items.add(new win.File([blob], 'practice.jpg', { type: 'image/jpeg' }));
      step('images'); $('#card-file').files = transfer.files; $('#card-file').dispatchEvent(new win.Event('change', { bubbles: true }));
      await until(() => !$('#card-preview').hidden);
      input('#card-alt', 'Rotes fiktives Übungsfahrzeug'); input('#card-alt-en', 'Red fictional practice vehicle');
      input('#lead-alt', 'Rotes fiktives Übungsfahrzeug'); input('#lead-alt-en', 'Red fictional practice vehicle');
      async function exportedRecord() {
        step('review'); zipBlob = null; click('#generate'); await until(() => zipBlob);
        const bytes = new Uint8Array(await zipBlob.arrayBuffer()); const view = new DataView(bytes.buffer); const decoder = new TextDecoder();
        let offset = 0;
        while (view.getUint32(offset, true) === 0x04034b50) {
          const size = view.getUint32(offset + 18, true), length = view.getUint16(offset + 26, true), extra = view.getUint16(offset + 28, true);
          const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + length)); const start = offset + 30 + length + extra;
          if (name.endsWith('/vehicle.json')) return JSON.parse(decoder.decode(bytes.slice(start, start + size)));
          offset = start + size;
        }
        throw new Error('Missing vehicle.json');
      }
      const end = await exportedRecord(); assert(end.order > 0, 'Automatic end order');
      assert(end.leadImage === end.cardImage && end.blocks.length === 0, 'Card-only lead with no galleries');
      assert(end.cardImageAltEn === 'Red fictional practice vehicle', 'English card metadata');
      step('vehicle'); input('#prepend-order', 'on'); $('#prepend-order').checked = true; $('#prepend-order').dispatchEvent(new win.Event('change', { bubbles: true }));
      const beginning = await exportedRecord(); assert(beginning.order < 0, 'Automatic beginning order');
      step('vehicle'); $('#auto-order').checked = false; $('#auto-order').dispatchEvent(new win.Event('change', { bubbles: true })); input('#order', '-7');
      const manual = await exportedRecord(); assert(manual.order === -7, 'Safe negative manual order');
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
    });
  } catch (error) { results.push({ name: error.message, passed: false, stack: error.stack }); }
  const report = { passed: results.every(result => result.passed), results };
  document.querySelector('#results').textContent = JSON.stringify(report, null, 2);
  await fetch('/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) });
})();
