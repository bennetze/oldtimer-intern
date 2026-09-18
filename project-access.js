/* Local project access. Selected project scripts are never evaluated. */
(() => {
  "use strict";
  const categories = ["aktuelle-projekte", "vergangene-projekte", "fahrzeugangebote"];
  const prefix = "src/pages/projekte/";
  const metadata = ["src/config/vehicle-redirects.json", "src/config/modificationDates.js", "public/sitemap.xml", "public/llms.txt", "public/robots.txt"];
  const route = /^(aktuelle-projekte|vergangene-projekte|fahrzeugangebote)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
  function parts(path) {
    const result = path.split("/");
    if (result.some(part => !part || part === "." || part === ".." || /[\\\x00-\x1f]/.test(part))) throw new Error("Ungültiger Dateipfad.");
    return result;
  }
  async function directory(root, path, create = false) {
    let handle = root;
    for (const part of parts(path)) handle = await handle.getDirectoryHandle(part, { create });
    return handle;
  }
  async function fileHandle(root, path, create = false) {
    const names = parts(path), name = names.pop();
    const parent = names.length ? await directory(root, names.join("/"), create) : root;
    return parent.getFileHandle(name, { create });
  }
  async function read(root, path) { return (await fileHandle(root, path)).getFile(); }
  async function exists(root, path) {
    try { await read(root, path); return true; } catch (error) { if (error.name === "NotFoundError") return false; throw error; }
  }
  async function hasDirectory(root, path) {
    try { await directory(root, path); return true; } catch (error) { if (error.name === "NotFoundError") return false; throw error; }
  }
  async function text(root, path) {
    const file = await read(root, path);
    if (file.size > 2 * 1024 ** 2) throw new Error(`${path}: Textdatei überschreitet 2 MiB.`);
    return file.text();
  }
  async function write(root, path, value) {
    const stream = await (await fileHandle(root, path, true)).createWritable();
    try { await stream.write(value); await stream.close(); } catch (error) { await stream.abort().catch(() => {}); throw error; }
  }
  async function remove(root, path) {
    const names = parts(path), name = names.pop();
    try { await (await directory(root, names.join("/"))).removeEntry(name); }
    catch (error) { if (error.name !== "NotFoundError") throw error; }
  }
  async function hash(value) {
    const data = typeof value === "string" ? new TextEncoder().encode(value) : value instanceof Blob ? await value.arrayBuffer() : value;
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
  async function entries(handle) { const result = []; for await (const pair of handle.entries()) result.push(pair); return result.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0); }
  async function snapshot(root) {
    const result = {};
    async function walk(handle, path) {
      result[path + "/"] = "directory";
      for (const [name, child] of await entries(handle)) {
        if (name === ".DS_Store") continue;
        const childPath = `${path}/${name}`;
        if (child.kind === "directory") await walk(child, childPath);
        else {
          const file = await child.getFile();
          if (file.size > 50 * 1024 ** 2) throw new Error(`${childPath}: Datei überschreitet 50 MiB.`);
          result[childPath] = await hash(file);
        }
      }
    }
    await walk(await directory(root, prefix.slice(0, -1)), prefix.slice(0, -1));
    for (const path of metadata) result[path] = await exists(root, path) ? await hash(await read(root, path)) : null;
    return result;
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  async function discover(root, validateRecord) {
    const vehicles = [];
    for (const category of categories) {
      const handle = await directory(root, prefix + category);
      const children = await entries(handle), pages = new Set(), folders = new Set(), orders = new Set();
      for (const [name, child] of children) {
        if (child.kind === "file" && name.endsWith(".astro") && name !== "index.astro") pages.add(name.slice(0, -6));
        if (child.kind === "directory" && name !== "seite") folders.add(name);
      }
      for (const slug of new Set([...pages, ...folders])) {
        if (!pages.has(slug) || !folders.has(slug)) throw new Error(`${category}/${slug}: Fahrzeugseite und Fahrzeugordner müssen zusammen vorhanden sein.`);
        let record;
        try { record = JSON.parse(await text(root, `${prefix}${category}/${slug}/vehicle.json`)); validateRecord(record, true); }
        catch (error) { throw new Error(`${category}/${slug}: ${error.message}`); }
        if (record.slug !== slug || record.category !== category) throw new Error(`${category}/${slug}: Ordner und Fahrzeugdaten stimmen nicht überein.`);
        for (const ref of new Set([record.cardImage, record.leadImage, ...record.blocks.flatMap(block => block.type === 'gallery' ? block.images.map(image => image.src) : [])])) {
          if (!await exists(root, `${prefix}${category}/${slug}/${ref.slice(2)}`)) throw new Error(`${category}/${slug}: Fehlendes Bild ${ref}.`);
        }
        if (orders.has(record.order)) throw new Error(`${category}: Doppelter Sortierwert ${record.order}.`);
        orders.add(record.order);
        vehicles.push({ key: `${category}/${slug}`, record });
      }
    }
    return vehicles.sort((a, b) => b.record.dateModified.localeCompare(a.record.dateModified) || a.record.title.localeCompare(b.record.title, "de") || a.key.localeCompare(b.key));
  }
  async function vehicleFiles(root, key) {
    if (!route.test(key)) throw new Error("Ungültige Fahrzeugroute.");
    const result = [];
    for (const [name, handle] of await entries(await directory(root, prefix + key))) {
      if (name === ".DS_Store") continue;
      if (handle.kind !== "file") throw new Error(`${key}: Unterordner werden nicht unterstützt.`);
      result.push(await handle.getFile());
    }
    return result;
  }
  async function inspect(root, validateRecord) {
    try {
      for (const path of ["package.json", "astro.config.mjs", "src/content.config.ts", "src/components/VehicleDetailPage.astro", ...metadata.filter(path => !path.endsWith("vehicle-redirects.json"))]) await text(root, path);
      for (const category of categories) await directory(root, prefix + category);
    } catch (error) {
      throw new Error(`Bitte den vollständigen Website-Projektordner mit src, public und Astro-Konfiguration auswählen. ${error.message}`);
    }
    const before = await snapshot(root);
    const vehicles = await discover(root, validateRecord);
    if (!same(before, await snapshot(root))) throw new Error("Das Projekt wurde während des Einlesens geändert. Bitte erneut auswählen.");
    return { root, vehicles, baseline: before };
  }
  window.VehicleProjectAccess = { categories, prefix, metadata, route, directory, fileHandle, read, text, exists, hasDirectory, write, remove, hash, entries, snapshot, same, discover, vehicleFiles, inspect };
})();
