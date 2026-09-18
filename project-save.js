/* Checked browser writes with a durable, recoverable transaction journal. */
(() => {
  "use strict";
  const A = window.VehicleProjectAccess;
  const origin = "https://www.oldtimermanufaktur.de";
  const lock = ".cache/vehicle-import.lock";
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
    const tail = source.slice(position).replace(/\s+/g, "");
    const expected = `;
export function pageModified(path, contentDates = []) {
 path = path.replace(/^\\/en(?=\\/)/, '');
 const template = /^\\/projekte\\/[^/]+\\/[^/]+\\/$/.test(path)
 ? modificationDates.vehicle
 : path.startsWith('/projekte/') ? modificationDates.archive : undefined;
 return [modificationDates.shared, modificationDates.pages[path], template, ...contentDates]
 .filter(Boolean).sort().at(-1);
}`.replace(/\s+/g, "");
    if (tail !== expected) fail("Die Datumslogik des Website-Projekts hat sich geändert. Bitte den Fahrzeugeditor aktualisieren.");
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
    const files = new Map(), names = new Set(), stems = new Set(); let total = 0;
    if (images.length + 1 > 2000) fail("Höchstens 2000 Dateien pro Fahrzeug sind erlaubt.");
    for (const { name, file } of images) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp|avif)$/i.test(name) || name.includes('..') || names.has(name.toLowerCase())) fail(`Ungültiger oder doppelter Bildname: ${name}`);
      const stem = name.replace(/\.[^.]+$/, '').toLowerCase(); if (stems.has(stem)) fail(`Bildnamen kollidieren nach WebP-Konvertierung: ${name}`);
      names.add(name.toLowerCase()); stems.add(stem);
      const image = await api.checkImage(file);
      const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }[name.split('.').at(-1).toLowerCase()];
      if (image.type !== mime) fail(`Bildinhalt und Dateiendung stimmen nicht überein: ${name}`);
      const bytes = new Uint8Array(await file.arrayBuffer()); total += bytes.length;
      if (total > 512 * 1024 ** 2) fail("Das Fahrzeug überschreitet 512 MiB.");
      files.set(`${A.prefix}${key}/${name}`, bytes);
    }
    for (const ref of [record.cardImage, record.leadImage, ...record.blocks.flatMap(block => block.type === 'gallery' ? block.images.map(image => image.src) : [])]) if (!files.has(`${A.prefix}${key}/${ref.slice(2)}`)) fail(`Fehlendes Bild: ${ref}`);
    const recordText = json(record);
    if (new TextEncoder().encode(recordText).length > 2 * 1024 ** 2) fail("vehicle.json überschreitet 2 MiB.");
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
    return { root: project.root, before, record, from, key, changes, summary };
  }
  async function currentHash(root, path) { return await A.exists(root, path) ? A.hash(await A.read(root, path)) : null; }
  function safeEntry(path, journal) {
    if (['public/sitemap.xml', 'public/llms.txt', 'src/config/vehicle-redirects.json'].includes(path)) return true;
    return [journal.key, journal.from].filter(Boolean).some(key => path === `${A.prefix}${key}.astro` || (path.startsWith(`${A.prefix}${key}/`) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path.slice(`${A.prefix}${key}/`.length)) && !path.includes('..')));
  }
  async function readJournal(root) {
    if (!await A.hasDirectory(root, lock)) return null;
    if (!await A.exists(root, `${lock}/browser.json`)) fail("Das Projekt ist durch den Website-Importer oder einen unvollständigen Sperrvorgang gesperrt. Bitte die Sperre gemäß VEHICLE-CONTENT-GUIDE.md prüfen; der Editor entfernt sie nicht automatisch.");
    const owner = JSON.parse(await A.text(root, `${lock}/browser.json`));
    if (!/^\.cache\/vehicle-browser-backup-[a-f0-9-]+$/.test(owner.backup) || typeof owner.id !== 'string') fail("Ungültige Wiederherstellungsinformation. Sperre beibehalten.");
    const journal = JSON.parse(await A.text(root, `${owner.backup}/journal.json`));
    if (journal.id !== owner.id || journal.backup !== owner.backup || !A.route.test(journal.key) || (journal.from !== null && !A.route.test(journal.from)) || !Array.isArray(journal.entries) || journal.entries.length > 2005 || !['staged', 'writing', 'completed', 'restored'].includes(journal.phase)) fail("Beschädigtes Wiederherstellungsjournal. Sperre beibehalten.");
    const paths = new Set();
    for (const entry of journal.entries) {
      if (!safeEntry(entry.path, journal) || paths.has(entry.path) || ![entry.before, entry.after].every(value => value === null || /^[a-f0-9]{64}$/.test(value))) fail("Unsicherer Dateipfad oder Prüfsumme im Wiederherstellungsjournal.");
      paths.add(entry.path);
    }
    return journal;
  }
  async function release(root) { await A.remove(root, `${lock}/browser.json`); await A.remove(root, lock); }
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
    // Check every file and backup before touching anything, including after a crash.
    for (const entry of journal.entries) {
      const now = await currentHash(root, entry.path);
      if (now !== entry.before && now !== entry.after && !(journal.phase === 'writing' && entry.before === null && now === await A.hash(''))) fail(`Wiederherstellung gestoppt: ${entry.path} wurde zwischenzeitlich geändert. Sicherung: ${journal.backup}`);
      if (entry.before && await currentHash(root, `${journal.backup}/before/${entry.path}`) !== entry.before) fail(`Sicherung beschädigt: ${entry.path}. Sicherung: ${journal.backup}`);
    }
    if (journal.phase !== 'completed') {
      for (const entry of [...journal.entries].reverse()) {
        if (entry.before) await A.write(root, entry.path, await A.read(root, `${journal.backup}/before/${entry.path}`));
        else await A.remove(root, entry.path);
        if (await currentHash(root, entry.path) !== entry.before) fail(`Wiederherstellung konnte nicht geprüft werden: ${entry.path}`);
      }
      await cleanupDirectories(root, journal, true); journal.phase = 'restored';
      await A.write(root, `${journal.backup}/journal.json`, json(journal));
    }
    await release(root);
    return journal;
  }
  async function apply(review) {
    const root = review.root;
    await checkUnlocked(root);
    if (!A.same(review.before, await A.snapshot(root))) fail("Das Projekt wurde nach der Prüfung geändert. Es wurde nichts gespeichert.");
    if (!review.summary.length) return { backup: null };
    const id = crypto.randomUUID(), backup = `.cache/vehicle-browser-backup-${id}`;
    const journal = { id, backup, key: review.key, from: review.from, targetExisted: !!review.before[`${A.prefix}${review.key}/`], phase: 'staged', entries: review.summary };
    // Backups and the journal must be durable before any source writes.
    for (const entry of journal.entries) if (entry.before) {
      await A.write(root, `${backup}/before/${entry.path}`, await A.read(root, entry.path));
      if (await currentHash(root, `${backup}/before/${entry.path}`) !== entry.before) fail("Das Projekt wurde während der Sicherung geändert. Es wurde nichts gespeichert.");
    }
    await A.write(root, `${backup}/journal.json`, json(journal));
    await checkUnlocked(root);
    await A.directory(root, lock, true);
    await A.write(root, `${lock}/browser.json`, json({ id, backup }));
    try {
      const owner = await readJournal(root);
      if (owner.id !== id) fail("Ein anderer Speichervorgang hat das Projekt gesperrt.");
      if (!A.same(review.before, await A.snapshot(root))) fail("Das Projekt wurde während der Sicherung geändert.");
      journal.phase = 'writing'; await A.write(root, `${backup}/journal.json`, json(journal));
      for (const entry of [...journal.entries].sort((a, b) => Number(a.after === null) - Number(b.after === null))) {
        if ((await readJournal(root)).id !== id) fail("Die Projektsperre wurde geändert.");
        if (await currentHash(root, entry.path) !== entry.before) fail(`Die Datei wurde außerhalb des Editors geändert: ${entry.path}`);
        const data = review.changes.get(entry.path);
        if (data === null) await A.remove(root, entry.path); else await A.write(root, entry.path, data);
        if (await currentHash(root, entry.path) !== entry.after) fail(`Die gespeicherte Datei konnte nicht geprüft werden: ${entry.path}`);
      }
      await cleanupDirectories(root, journal, false);
      journal.phase = 'completed'; await A.write(root, `${backup}/journal.json`, json(journal));
      await release(root);
      return { backup };
    } catch (error) {
      try {
        const owner = await readJournal(root);
        if (!owner || owner.id !== id) fail("Die Projektsperre gehört einem anderen Vorgang.");
        await restore(root);
      } catch (recovery) { throw new Error(`${error.message}\nWiederherstellung nicht abgeschlossen: ${recovery.message}\nSicherung: ${backup}. Keine weiteren Änderungen speichern.`); }
      throw new Error(`${error.message}\nDie ursprünglichen Dateien wurden wiederhergestellt. Sicherung: ${backup}`);
    }
  }
  window.VehicleProjectSave = { parseDates, sitemapEntries, renderSitemap, validateRedirects, prepare, apply, readJournal, restore, lock };
})();
