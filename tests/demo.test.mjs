import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
test('demo entry loads only standalone local assets and blocks API connections', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(scripts, ['vehicle-presentation.js', 'watermark.js', 'demo-data.js', 'demo-ui.js', 'editor.js']);
  for (const name of scripts) await readFile(new URL(name, root));
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /id="tools-|npm run|id="recover-project"/);
  assert.equal([...html.matchAll(/data-step-target=/g)].length, 6);
  for (const name of ['demo-data.js', 'demo-ui.js']) {
    const source = await readFile(new URL(name, root), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|showDirectoryPicker|requestPermission|createWritable|localStorage|sessionStorage|indexedDB/);
  }
});
test('examples contain complete paired bilingual metadata without external image assets', async () => {
  const context2d = new Proxy({}, { get: (_, key) => () => {}, set: () => true });
  const window = {};
  vm.runInNewContext(await readFile(new URL('demo-data.js', root), 'utf8'), {
    window, File, document: { createElement: () => ({ getContext: () => context2d, toBlob: callback => callback(new Blob(['image'], { type: 'image/jpeg' })) }) },
  });
  const vehicles = await window.VehicleDemoData();
  assert.equal(vehicles.length, 3);
  assert.equal(new Set(vehicles.map(item => item.record.category)).size, 3);
  for (const { key, record, images } of vehicles) {
    assert.equal(key, `${record.category}/${record.slug}`);
    assert.notEqual(record.title, record.titleEn);
    assert.notEqual(record.description, record.descriptionEn);
    assert.equal(images.length, 3);
    assert.ok(images.every(image => image.name === image.file.name));
    assert.ok(images.some(image => './' + image.name === record.cardImage));
    assert.deepEqual(Array.from(record.blocks, block => block.type), ['copy', 'gallery', 'contact']);
    for (const image of record.blocks[1].images) {
      assert.ok(image.alt && image.altEn);
      assert.equal(Boolean(image.caption), Boolean(image.captionEn));
    }
  }
});
