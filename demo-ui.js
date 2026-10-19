/* Standalone practice workflow. No filesystem handles, persistent storage or APIs. */
window.VehicleDemoUI = function (api) {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const steps = ['project', 'selection', 'vehicle', 'images', 'content', 'review'];
  let vehicles = [], started = false, selected = false, originalKey = null;
  let baseline = '', reviewed = '', busy = false, practiceChanges = false;
  const fileIds = new WeakMap(); let nextFile = 0;
  function fileId(file) {
    if (!file) return null;
    if (!fileIds.has(file)) fileIds.set(file, ++nextFile);
    return fileIds.get(file);
  }
  function fingerprint() {
    return JSON.stringify({ fields: Object.fromEntries(Object.entries(api.fields).map(([key, field]) => [key, [field.value, field.checked]])), watermark: api.state.watermarkEnabled, card: fileId(api.state.cardFile), cardName: api.state.cardName, lead: api.state.leadImageId, blocks: api.state.blocks, images: api.state.images.map(({ url, ...image }) => ({ ...image, file: fileId(image.file) })) });
  }
  const dirty = () => selected && fingerprint() !== baseline;
  const discard = () => !dirty() || confirm('Ungemerkte Änderungen verwerfen? Gemerkte Übungsstände bleiben bis zum Neuladen erhalten.');
  function feedback(target, message, error = false) {
    target.textContent = message;
    target.classList.toggle('feedback-error', error);
    target.setAttribute('role', error ? 'alert' : 'status');
  }
  function invalidateReview() {
    if (!reviewed && $('#after-export').hidden) return;
    reviewed = '';
    $('#after-export').hidden = true;
    $('#save-review').dataset.reviewState = 'stale';
    feedback($('#save-review'), 'Entwurf geändert. Bitte die Übungsdaten erneut prüfen.');
    $('#status').textContent = 'Die bisherige ZIP enthält diese Änderungen noch nicht.';
  }
  function clearReview() {
    reviewed = ''; $('#after-export').hidden = true;
    $('#save-review').dataset.reviewState = 'idle';
    feedback($('#save-review'), 'Noch nicht geprüft.');
    $('#status').textContent = 'Noch keine Übungs-ZIP erstellt.';
  }
  function canOpen(step) {
    return steps.includes(step) && !busy && !api.state.busy && (step === 'project' || (started && (step === 'selection' || selected)));
  }
  function update() {
    for (const button of document.querySelectorAll('[data-step-target]')) button.disabled = !canOpen(button.dataset.stepTarget);
    $('[data-step-status="project"]').textContent = started ? 'Gestartet' : 'Offen';
    $('[data-step-status="selection"]').textContent = selected ? 'Ausgewählt' : 'Offen';
    $('[data-step-target="project"]').classList.toggle('is-complete', started);
    $('[data-step-target="selection"]').classList.toggle('is-complete', selected);
    const unavailable = busy || api.state.busy;
    for (const id of ['choose-project', 'start-new', 'refresh-project', 'category-filter']) $('#' + id).disabled = unavailable;
    $('#vehicle-list').inert = unavailable;
    const valid = selected && !api.validate().errors.length;
    $('#prepare-save').disabled = unavailable || !valid;
    $('#remember-demo').disabled = unavailable || !valid;
    $('#generate').disabled = unavailable || !selected;
    const index = steps.indexOf(api.state.currentStep);
    $('#step-back').disabled = !canOpen(steps[index - 1]);
    $('#step-next').disabled = !canOpen(steps[index + 1]);
    if (reviewed && reviewed !== fingerprint()) invalidateReview();
  }
  async function operation(work, target) {
    if (busy || api.state.busy) return;
    busy = true; api.setBusy(true); update();
    try { await work(); }
    catch (error) { feedback(target, error.message || 'Aktion fehlgeschlagen. Bitte erneut versuchen.', true); }
    finally { busy = false; api.setBusy(false); update(); }
  }
  function renderList() {
    const root = $('#vehicle-list'); root.replaceChildren();
    const heading = document.createElement('div'); heading.className = 'vehicle-list-head';
    for (const text of ['Übungsfahrzeug', 'Änderungsdatum']) { const span = document.createElement('span'); span.textContent = text; heading.append(span); }
    root.append(heading);
    const rows = vehicles.filter(item => !$('#category-filter').value || item.record.category === $('#category-filter').value)
      .sort((a, b) => b.record.dateModified.localeCompare(a.record.dateModified) || a.record.title.localeCompare(b.record.title, 'de') || a.key.localeCompare(b.key, 'de'));
    for (const item of rows) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'vehicle-row';
      const name = document.createElement('span'); name.textContent = item.record.title;
      const date = document.createElement('time'); date.dateTime = item.record.dateModified; date.textContent = item.record.dateModified.split('-').reverse().join('.');
      button.append(name, date); button.addEventListener('click', () => openVehicle(item)); root.append(button);
    }
    feedback($('#selection-feedback'), `${rows.length} Übungsfahrzeuge. Gemerkte Änderungen bleiben nur bis zum Neuladen erhalten.`);
  }
  async function openVehicle(item) {
    if (!discard()) return;
    let opened = false;
    await operation(async () => {
      const files = [new File([JSON.stringify(item.record)], 'vehicle.json', { type: 'application/json' }), ...item.images.map(image => image.file)];
      api.setBusy(false);
      if (!await api.importVehicle(files, { managed: true })) throw new Error('Übungsfahrzeug konnte nicht geladen werden. Bitte erneut versuchen.');
      selected = true; originalKey = item.key; clearReview(); baseline = fingerprint(); opened = true;
    }, $('#selection-feedback'));
    if (opened) api.showEditor('existing');
  }
  async function start(reset = false) {
    if (reset && !confirm('Alle Übungsstände und aktuellen Eingaben löschen und die drei Beispiele wiederherstellen?')) return;
    let ready = false;
    await operation(async () => {
      const examples = await window.VehicleDemoData();
      vehicles = examples; practiceChanges = false; started = true;
      if (reset) $('#category-filter').value = ''; selected = false; originalKey = null;
      api.resetEditor(); clearReview(); baseline = '';
      renderList(); $('#choose-project').textContent = 'Zur Übungsliste';
      feedback($('#project-feedback'), 'Demo bereit. Es ist kein Website-Projekt verbunden.'); ready = true;
    }, $('#project-feedback'));
    if (ready) api.showStep('selection', { focus: true });
  }
  function checkSnapshot(snapshot) {
    if (!started || !selected) throw new Error('Bitte zuerst die Demo starten und ein Übungsfahrzeug auswählen.');
    api.validateRecord(snapshot.record);
    const key = `${snapshot.record.category}/${snapshot.record.slug}`;
    for (const item of vehicles) {
      if (item.key === originalKey) continue;
      if (item.key === key) throw new Error('Dieses Übungsfahrzeug ist bereits in der Liste. Bitte einen anderen Slug oder eine andere Kategorie wählen.');
      if (item.record.category === snapshot.record.category && item.record.order === snapshot.record.order) throw new Error('Dieser Sortierwert ist in der Übungskategorie bereits belegt. Bitte einen anderen Wert wählen.');
    }
    return key;
  }
  async function prepareExport(snapshot) {
    const key = checkSnapshot(snapshot);
    reviewed = fingerprint();
    $('#save-review').dataset.reviewState = 'ready';
    feedback($('#save-review'), `Übungsdaten vollständig. Beispielziel: /projekte/${key}/. Geprüft wurde nur die Übungsliste, kein Website-Projekt. Es wurden keine Website-Dateien geändert.`);
    return { key };
  }
  $('#choose-project').addEventListener('click', () => started ? api.showStep('selection', { focus: true }) : start());
  $('#refresh-project').addEventListener('click', () => start(true));
  $('#category-filter').addEventListener('change', renderList);
  $('#start-new').addEventListener('click', () => {
    if (!started || !discard()) return;
    selected = true; originalKey = null; api.resetEditor(); clearReview();
    if ($('#category-filter').value) api.fields.category.value = $('#category-filter').value;
    baseline = fingerprint(); api.showEditor('new'); api.updateSummary();
  });
  $('#prepare-save').addEventListener('click', () => operation(async () => {
    const snapshot = api.editorSnapshot(); api.updateSummary(); await prepareExport(snapshot);
  }, $('#save-review')));
  $('#remember-demo').addEventListener('click', () => operation(async () => {
    const stamp = fingerprint();
    const snapshot = await api.prepareOutputSnapshot(api.editorSnapshot());
    if (stamp !== fingerprint()) throw new Error('Die Eingaben wurden geändert. Bitte erneut merken.');
    const key = checkSnapshot(snapshot);
    const item = { key, record: JSON.parse(snapshot.recordText), images: snapshot.images.map(image => ({ name: image.name, file: new File([image.file], image.name, { type: image.file.type }) })) };
    vehicles = vehicles.filter(entry => entry.key !== originalKey); vehicles.push(item);
    originalKey = key; practiceChanges = true; baseline = fingerprint(); renderList(); await prepareExport(snapshot);
    $('#status').textContent = 'Übungsstand in diesem Tab gemerkt. Beim Neuladen geht er verloren. Keine Website geändert.';
    api.updateSummary();
  }, $('#save-review')));
  window.addEventListener('beforeunload', event => {
    if (dirty() || busy || api.state.busy || practiceChanges) { event.preventDefault(); event.returnValue = ''; }
  });
  return { canOpen, update, invalidateReview, prepareExport };
};
