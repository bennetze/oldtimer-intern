/* Checked browser writes with a durable, recoverable transaction journal. */
(() => {
  "use strict";
  const A = window.VehicleProjectAccess;
  const origin = "https://www.oldtimermanufaktur.de";
  const lock = ".cache/vehicle-import.lock";
  const reviewed = new WeakMap();
  const coordinate = work => typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('oldtimer-vehicle-save', work) : work();
  const json = value => JSON.stringify(value, null, "\t") + "\n";
  const fail = message => { throw new Error(message); };
  const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T12:00:00Z")) && new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value;

  function parseDates(source) {
    // A deliberately small object-literal grammar. No eval, Function, or script injection.
    const start = source.match(/^\s*(?:\/\/[^\n]*\n\s*)*export\s+const\s+modificationDates\s*=\s*/);
    if (!start) fail("Die Änderungsdatum-Konfiguration wird nicht unterstützt.");
    let position = start[0].length;
    const ws = () => { while (/\s/.test(source[position] || "") && position < source.length) position++; };
    function string() {
      ws(); const quote = source[position++];
      if (quote !== "'" && quote !== '"') fail("Nur einfache Textwerte sind in modificationDates erlaubt.");
      let value = "";
      while (position < source.length && source[position] !== quote) {
        const c = source[position++]; if (c === "\\" || /[\r\n]/.test(c)) fail("Nicht unterstützter Text in modificationDates."); value += c;
      }
      if (source[position++] !== quote) fail("Unvollständige modificationDates-Konfiguration.");
      return value;
    }
    function object() {
      ws(); if (source[position++] !== "{") fail("Ein Datenobjekt für modificationDates wird erwartet.");
      const result = Object.create(null);
      while (true) {
        ws(); if (source[position] === "}") { position++; return result; }
        let key;
        if (/['"]/.test(source[position] || "")) key = string();
        else { const match = source.slice(position).match(/^[A-Za-z][A-Za-z0-9]*/); if (!match) fail("Ungültiger Konfigurationsschlüssel."); key = match[0]; position += key.length; }
        if (["__proto__", "constructor", "prototype"].includes(key) || Object.hasOwn(result, key)) fail("Ungültiger oder doppelter Konfigurationsschlüssel.");
        ws(); if (source[position++] !== ":") fail("Ungültige Datumskonfiguration."); ws();
        result[key] = source[position] === "{" ? object() : string();
        ws(); if (source[position] === ",") { position++; continue; }
        if (source[position] !== "}") fail("Nicht unterstützte Datumskonfiguration.");
      }
    }
    const dates = object();
    // Reject changed date-selection logic rather than silently generating the wrong sitemap.
    const tokens = code => JSON.stringify(code.match(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\/(?:\\.|[^/\\\r\n])+\/[a-z]*|[A-Za-z_$][\w$]*|\d+|[^\s]/g));
    const tail = tokens(source.slice(position));
    const expected = `;
export function pageModified(path, contentDates = []) {
 path = path.replace(/^\\/en(?=\\/)/, '');
 const template = /^\\/projekte\\/[^/]+\\/[^/]+\\/$/.test(path)
 ? modificationDates.vehicle
 : path.startsWith('/projekte/') ? modificationDates.archive : undefined;
 return [modificationDates.shared, modificationDates.pages[path], template, ...contentDates]
 .filter(Boolean).sort().at(-1);
}`;
    if (tail !== tokens(expected)) fail("Die Datumslogik des Website-Projekts hat sich geändert. Bitte den Fahrzeugeditor aktualisieren.");
    if (Object.keys(dates).sort().join(",") !== "archive,pages,shared,vehicle" || !dates.pages || typeof dates.pages !== "object") fail("Unvollständige Datumskonfiguration.");
    for (const value of [dates.shared, dates.archive, dates.vehicle, ...Object.values(dates.pages)]) if (!validDate(value)) fail("Ungültiges Datum in modificationDates.");
    return dates;
  }
  function sitemapEntries(vehicles, dates) {
    const modified = (path, content = []) => [dates.shared, dates.pages[path], /^\/projekte\/[^/]+\/[^/]+\/$/.test(path) ? dates.vehicle : path.startsWith('/projekte/') ? dates.archive : undefined, ...content].filter(Boolean).sort().at(-1);
    const entries = ["/", "/ueber-uns/", "/handwerk/", "/projekte/"].map(path => [path, modified(path)]);
    const groups = A.categories.map(category => vehicles.filter(item => item.category === category).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "de")));
    groups.forEach((group, index) => {
      const path = `/projekte/${A.categories[index]}/`, content = group.map(record => record.dateModified);
      entries.push([path, modified(path, content)]);
      if (index === 1) for (let page = 2; page <= Math.ceil(group.length / 24); page++) { const next = `${path}seite/${page}/`; entries.push([next, modified(next, content)]); }
    });
    for (const record of groups.flat()) { const path = `/projekte/${record.category}/${record.slug}/`; entries.push([path, modified(path, [record.dateModified])]); }
    return [...entries, ...entries.map(([path, date]) => [`/en${path}`, date])];
  }
  const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  function renderSitemap(entries) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(([path, date]) => `\t<url>\n\t\t<loc>${escapeXml(origin + path)}</loc>\n\t\t<lastmod>${date}</lastmod>\n\t</url>`).join('\n')}\n</urlset>\n`;
  }
  function validateRedirects(mapping, active) {
    if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) fail("Ungültige Fahrzeug-Weiterleitungen.");
    for (const [from, to] of Object.entries(mapping)) if (!A.route.test(from) || typeof to !== "string" || !A.route.test(to) || from === to || active.has(from) || !active.has(to)) fail(`Ungültige Weiterleitung: ${from} → ${to}`);
  }
  async function checkUnlocked(root) {
    if (await A.hasDirectory(root, lock)) fail("Ein Import oder Speichervorgang ist aktiv oder wurde unterbrochen. Projekt erneut auswählen und gegebenenfalls wiederherstellen.");
  }
  async function prepare(project, snapshot, from, api) {
    await checkUnlocked(project.root);
    const before = await A.snapshot(project.root);
    if (!A.same(before, project.baseline)) fail("Das Website-Projekt wurde außerhalb des Editors geändert. Änderungen als ZIP sichern und die Projektliste neu laden.");
    const record = structuredClone(snapshot.record), images = snapshot.images.slice();
    api.validateRecord(record);
    const key = `${record.category}/${record.slug}`;
    if (from && (!A.route.test(from) || from.split('/')[1] !== record.slug || !project.vehicles.some(item => item.key === from))) fail("Das ursprüngliche Fahrzeug ist nicht mehr vorhanden oder der Slug wurde verändert.");
    if (project.vehicles.some(item => item.key === key && item.key !== from) || (key !== from && Object.keys(before).some(path => path === `${A.prefix}${key}` || path === `${A.prefix}${key}.astro` || path.startsWith(`${A.prefix}${key}/`)))) fail("Das Zielfahrzeug existiert bereits. Bitte über die Fahrzeugliste öffnen.");
    if (project.vehicles.some(item => item.key !== from && item.record.category === record.category && item.record.order === record.order)) fail("Der Sortierwert ist in dieser Kategorie bereits vergeben. Bitte einen anderen Wert wählen.");
    const recordText = json(record);
    const recordBytes = new TextEncoder().encode(recordText).length;
    if (recordBytes > 2 * 1024 ** 2) fail("vehicle.json überschreitet 2 MiB.");
    const files = new Map(), names = new Set(), stems = new Set();
    if (images.reduce((total, image) => total + image.file.size, recordBytes) > 512 * 1024 ** 2) fail("Das Fahrzeug überschreitet 512 MiB.");
    if (images.length + 1 > 2000) fail("Höchstens 2000 Dateien pro Fahrzeug sind erlaubt.");
    for (const { name, file } of images) {
      if (!A.safeName(name) || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp|avif)$/i.test(name) || name.includes('..') || names.has(name.toLowerCase())) fail(`Ungültiger oder doppelter Bildname: ${name}`);
      const stem = name.replace(/\.[^.]+$/, '').toLowerCase(); if (stems.has(stem)) fail(`Bildnamen kollidieren nach WebP-Konvertierung: ${name}`);
      names.add(name.toLowerCase()); stems.add(stem);
      const image = await api.checkImage(file);
      const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }[name.split('.').at(-1).toLowerCase()];
      if (image.type !== mime) fail(`Bildinhalt und Dateiendung stimmen nicht überein: ${name}`);
      const bytes = new Uint8Array(await file.arrayBuffer());
      files.set(`${A.prefix}${key}/${name}`, bytes);
    }
    for (const ref of [record.cardImage, record.leadImage, ...record.blocks.flatMap(block => block.type === 'gallery' ? block.images.map(image => image.src) : [])]) if (!files.has(`${A.prefix}${key}/${ref.slice(2)}`)) fail(`Fehlendes Bild: ${ref}`);
    const changes = new Map();
    if (from) for (const path of Object.keys(before)) if (path === `${A.prefix}${from}.astro` || (path.startsWith(`${A.prefix}${from}/`) && !path.endsWith('/'))) changes.set(path, null);
    changes.set(`${A.prefix}${key}.astro`, api.createAstro(record.category, record.slug));
    changes.set(`${A.prefix}${key}/vehicle.json`, recordText);
    for (const [path, data] of files) changes.set(path, data);
    const vehicles = [...project.vehicles.filter(item => item.key !== from).map(item => item.record), record];
    const redirectPath = 'src/config/vehicle-redirects.json';
    const mapping = await A.exists(project.root, redirectPath) ? JSON.parse(await A.text(project.root, redirectPath)) : {};
    if (from && from !== key) { delete mapping[key]; for (const old of Object.keys(mapping)) if (mapping[old] === from) mapping[old] = key; mapping[from] = key; }
    validateRedirects(mapping, new Set(vehicles.map(item => `${item.category}/${item.slug}`)));
    changes.set(redirectPath, json(mapping));
    const dates = parseDates(await A.text(project.root, 'src/config/modificationDates.js'));
    const entries = sitemapEntries(vehicles, dates);
    let llms = await A.text(project.root, 'public/llms.txt');
    if (from && from !== key) llms = llms.replaceAll(`/projekte/${from}/`, `/projekte/${key}/`);
    const urls = new Set(entries.map(([path]) => origin + path));
    const links = [...llms.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]);
    if (!llms.startsWith('# ') || !/^> /m.test(llms) || !/^## /m.test(llms) || !links.length || links.some(link => !urls.has(link))) fail("llms.txt enthält ungültige oder nicht mehr vorhandene Seitenlinks. Bitte im Website-Projekt korrigieren.");
    const refs = [...(await A.text(project.root, 'public/robots.txt')).matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map(match => match[1]);
    if (refs.length !== 1 || refs[0] !== `${origin}/sitemap.xml`) fail("robots.txt muss die Produktions-Sitemap referenzieren.");
    changes.set('public/llms.txt', llms); changes.set('public/sitemap.xml', renderSitemap(entries));
    const summary = [];
    for (const [path, data] of changes) {
      const after = data === null ? null : await A.hash(data);
      if (after === (before[path] || null)) { changes.delete(path); continue; }
      summary.push({ path, before: before[path] || null, after, action: data === null ? 'Entfernen' : before[path] ? 'Ändern' : 'Hinzufügen' });
    }
    if (!A.same(before, await A.snapshot(project.root))) fail("Das Projekt wurde während der Prüfung geändert. Bitte neu laden.");
    const review = { root: project.root, before, record, from, key, changes, summary };
    reviewed.set(review, { root: review.root, stamp: reviewStamp(review) });
    return review;
  }
  function reviewStamp(review) { return JSON.stringify([review.before, review.record, review.from, review.key, review.summary]); }
  async function currentHash(root, path) { return await A.exists(root, path) ? A.hash(await A.read(root, path)) : null; }
  function safeEntry(path, journal) {
    if (typeof path !== 'string') return false;
    if (['public/sitemap.xml', 'public/llms.txt', 'src/config/vehicle-redirects.json'].includes(path)) return true;
    return [journal.key, journal.from].filter(Boolean).some(key => path === `${A.prefix}${key}.astro` || (path.startsWith(`${A.prefix}${key}/`) && A.safeName(path.slice(`${A.prefix}${key}/`.length)) && /^(?:vehicle\.json|[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|avif))$/i.test(path.slice(`${A.prefix}${key}/`.length)) && !path.includes('..')));
  }
  async function readJournal(root) {
    if (!await A.hasDirectory(root, lock)) return null;
    if (!await A.exists(root, `${lock}/browser.json`)) fail("Das Projekt ist durch den Website-Importer oder einen unvollständigen Sperrvorgang gesperrt. Bitte die Sperre gemäß VEHICLE-CONTENT-GUIDE.md prüfen; der Editor entfernt sie nicht automatisch.");
    const owner = JSON.parse(await A.text(root, `${lock}/browser.json`));
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
    if (!object(owner) || !uuid(owner.id) || owner.backup !== `.cache/vehicle-browser-backup-${owner.id}`) fail("Ungültige Wiederherstellungsinformation. Sperre beibehalten.");
    const journal = JSON.parse(await A.text(root, `${owner.backup}/journal.json`));
    const validKey = key => typeof key === 'string' && A.route.test(key) && A.safeName(key.split('/')[1] + '.astro') && !['index', 'seite'].includes(key.split('/')[1]);
    if (!object(journal) || journal.id !== owner.id || journal.backup !== owner.backup || !validKey(journal.key) || (journal.from !== null && (!validKey(journal.from) || journal.from.split('/')[1] !== journal.key.split('/')[1])) || typeof journal.targetExisted !== 'boolean' || (journal.targetExisted !== (journal.from === journal.key)) || !Array.isArray(journal.entries) || !journal.entries.length || journal.entries.length > 4005 || !['staged', 'writing', 'completed', 'restored'].includes(journal.phase)) fail("Beschädigtes Wiederherstellungsjournal. Sperre beibehalten.");
    const paths = new Set();
    for (const entry of journal.entries) {
      if (!object(entry) || !safeEntry(entry.path, journal) || paths.has(entry.path) || ![entry.before, entry.after].every(value => value === null || (typeof value === 'string' && /^[a-f0-9]{64}$/.test(value))) || entry.before === entry.after) fail("Unsicherer Dateipfad oder Prüfsumme im Wiederherstellungsjournal.");
      paths.add(entry.path);
    }
    return journal;
  }
  async function assertOwner(root, journal) {
    const current = await readJournal(root);
    if (!current || JSON.stringify(current) !== JSON.stringify(journal)) fail("Die Projektsperre oder das Journal wurde geändert. Sicherung beibehalten.");
    if ((await A.entries(await A.directory(root, lock))).some(([name]) => name !== 'browser.json')) fail("Die Projektsperre enthält fremde Dateien. Sperre beibehalten.");
  }
  async function release(root, journal) {
    await assertOwner(root, journal);
    await A.remove(root, `${lock}/browser.json`);
    try { await A.remove(root, lock); }
    catch (error) {
      // Retain a discoverable completed/restored journal if empty-directory cleanup fails.
      if (await A.hasDirectory(root, lock) && !(await A.entries(await A.directory(root, lock))).length) await A.write(root, `${lock}/browser.json`, json({ id: journal.id, backup: journal.backup }));
      throw error;
    }
  }
  async function cleanupDirectories(root, journal, restore) {
    const key = restore ? journal.key : journal.from;
    if (!key || (!restore && key === journal.key) || (restore && journal.targetExisted)) return;
    const path = A.prefix + key;
    if (await A.hasDirectory(root, path)) {
      const handle = await A.directory(root, path);
      if ((await A.entries(handle)).length === 0) await A.remove(root, path);
    }
  }
  async function restore(root) {
    const journal = await readJournal(root); if (!journal) return;
    await assertOwner(root, journal);
    if (journal.phase === 'completed' || journal.phase === 'restored') { await release(root, journal); return journal; }
    const check = async entry => {
      const now = await currentHash(root, entry.path);
      if (now !== entry.before && now !== entry.after && !(journal.phase === 'writing' && entry.before === null && now === await A.hash(''))) fail(`Wiederherstellung gestoppt: ${entry.path} wurde zwischenzeitlich geändert. Sicherung: ${journal.backup}`);
      const original = entry.before ? await A.read(root, `${journal.backup}/before/${entry.path}`) : null;
      if (original && await A.hash(original) !== entry.before) fail(`Sicherung beschädigt: ${entry.path}. Sicherung: ${journal.backup}`);
      return { original, now };
    };
    // Check every file and backup before touching anything, including after a crash.
    for (const entry of journal.entries) await check(entry);
    {
      for (const entry of [...journal.entries].reverse()) {
        const { original, now } = await check(entry);
        await assertOwner(root, journal);
        if (await currentHash(root, entry.path) !== now) fail(`Wiederherstellung gestoppt: ${entry.path} wurde zwischenzeitlich geändert.`);
        if (now === entry.before) continue;
        if (original) await A.write(root, entry.path, original);
        else await A.remove(root, entry.path);
        if (await currentHash(root, entry.path) !== entry.before) fail(`Wiederherstellung konnte nicht geprüft werden: ${entry.path}`);
      }
      await assertOwner(root, journal);
      await cleanupDirectories(root, journal, true); journal.phase = 'restored';
      await A.write(root, `${journal.backup}/journal.json`, json(journal));
    }
    await release(root, journal);
    return journal;
  }
  async function apply(review) {
    if (!review || (reviewed.get(review)?.root !== review.root || reviewed.get(review)?.stamp !== reviewStamp(review)) || review.changes.size !== review.summary.length) fail("Die geprüften Änderungen wurden verändert. Bitte erneut prüfen.");
    for (const entry of review.summary) {
      if (!review.changes.has(entry.path) || (review.changes.get(entry.path) === null ? null : await A.hash(review.changes.get(entry.path))) !== entry.after) fail("Die geprüften Dateiinhalte wurden verändert. Bitte erneut prüfen.");
    }
    const root = review.root;
    await checkUnlocked(root);
    if (!A.same(review.before, await A.snapshot(root))) fail("Das Projekt wurde nach der Prüfung geändert. Es wurde nichts gespeichert.");
    if (!review.summary.length) return { backup: null, committed: true, cleanupPending: false };
    const id = crypto.randomUUID(), backup = `.cache/vehicle-browser-backup-${id}`;
    const journal = { id, backup, key: review.key, from: review.from, targetExisted: !!review.before[`${A.prefix}${review.key}/`], phase: 'staged', entries: structuredClone(review.summary) };
    // Backups and the journal must be durable before any source writes.
    for (const entry of journal.entries) if (entry.before) {
      await A.write(root, `${backup}/before/${entry.path}`, await A.read(root, entry.path));
      if (await currentHash(root, `${backup}/before/${entry.path}`) !== entry.before) fail("Das Projekt wurde während der Sicherung geändert. Es wurde nichts gespeichert.");
    }
    await A.write(root, `${backup}/journal.json`, json(journal));
    await checkUnlocked(root);
    await A.directory(root, lock, true);
    if ((await A.entries(await A.directory(root, lock))).length) fail("Eine fremde Projektsperre wurde angelegt. Es wurde nichts gespeichert.");
    await A.write(root, `${lock}/browser.json`, json({ id, backup }));
    try {
      const owner = await readJournal(root);
      if (owner.id !== id) fail("Ein anderer Speichervorgang hat das Projekt gesperrt.");
      if (!A.same(review.before, await A.snapshot(root))) fail("Das Projekt wurde während der Sicherung geändert.");
      journal.phase = 'writing'; await A.write(root, `${backup}/journal.json`, json(journal));
      for (const entry of [...journal.entries].sort((a, b) => Number(a.after === null) - Number(b.after === null))) {
        await assertOwner(root, journal);
        if (await currentHash(root, entry.path) !== entry.before) fail(`Die Datei wurde außerhalb des Editors geändert: ${entry.path}`);
        const data = review.changes.get(entry.path);
        if (data === null) await A.remove(root, entry.path); else await A.write(root, entry.path, data);
        if (await currentHash(root, entry.path) !== entry.after) fail(`Die gespeicherte Datei konnte nicht geprüft werden: ${entry.path}`);
      }
      await assertOwner(root, journal);
      await cleanupDirectories(root, journal, false);
      await assertOwner(root, journal);
      journal.phase = 'completed'; await A.write(root, `${backup}/journal.json`, json(journal));
      try { await release(root, journal); }
      catch (error) { return { backup, committed: true, cleanupPending: true, message: error.message }; }
      return { backup, committed: true, cleanupPending: false };
    } catch (error) {
      try {
        const owner = await readJournal(root);
        if (!owner || owner.id !== id) fail("Die Projektsperre gehört einem anderen Vorgang.");
        if (owner.phase === 'completed') return { backup, committed: true, cleanupPending: true, message: error.message };
        await restore(root);
      } catch (recovery) { throw new Error(`${error.message}\nWiederherstellung nicht abgeschlossen: ${recovery.message}\nSicherung: ${backup}. Keine weiteren Änderungen speichern.`); }
      throw new Error(`${error.message}\nDie ursprünglichen Dateien wurden wiederhergestellt. Sicherung: ${backup}`);
    }
  }
  window.VehicleProjectSave = { parseDates, sitemapEntries, renderSitemap, validateRedirects, prepare, apply: review => coordinate(() => apply(review)), readJournal, restore: root => coordinate(() => restore(root)), lock };
})();
