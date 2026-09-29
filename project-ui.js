/* Connect the existing editor to project selection, review, and checked saving. */
window.VehicleProjectUI = function (api) {
  "use strict";
  const A = window.VehicleProjectAccess, S = window.VehicleProjectSave;
  const $ = selector => document.querySelector(selector);
  let project = null, selected = false, from = null, baseline = "", review = null, reviewFingerprint = "", busy = false, recoveryRoot = null;
  let recoveryBlocksCurrent = false;
  const fileIds = new WeakMap(); let nextFile = 0;
  const fileId = file => { if (!file) return null; if (!fileIds.has(file)) fileIds.set(file, ++nextFile); return fileIds.get(file); };
  function fingerprint() {
    return JSON.stringify({ fields: Object.fromEntries(Object.entries(api.fields).map(([key, field]) => [key, [field.value, field.checked]])), card: fileId(api.state.cardFile), cardName: api.state.cardName, lead: api.state.leadImageId, blocks: api.state.blocks, images: api.state.images.map(({ url, ...image }) => ({ ...image, file: fileId(image.file) })) });
  }
  const dirty = () => selected && fingerprint() !== baseline;
  function invalidateReview() {
    if (!review) return;
    review = null;
    $('#save-review').textContent = 'Die Eingaben wurden geändert. Bitte erneut prüfen.';
    $('#save-project').disabled = true;
  }
  const discard = () => !dirty() || confirm("Ungespeicherte Änderungen verwerfen und ein anderes Fahrzeug oder Projekt öffnen?");
  function feedback(element, message, error = false) {
    element.textContent = message; element.classList.toggle('feedback-error', error);
    element.setAttribute('role', error ? 'alert' : 'status');
  }
  function canOpen(step) {
    if (busy || api.state.busy) return false;
    return step === 'project' || (step === 'selection' ? !!project && !recoveryBlocksCurrent : !!project && selected && !recoveryBlocksCurrent);
  }
  function update() {
    for (const button of document.querySelectorAll('[data-step-target]')) button.disabled = !canOpen(button.dataset.stepTarget);
    $('[data-step-status="project"]').textContent = project ? 'Verbunden' : 'Offen';
    $('[data-step-status="selection"]').textContent = selected ? 'Ausgewählt' : 'Offen';
    $('[data-step-target="project"]').classList.toggle('is-complete', !!project);
    $('[data-step-target="selection"]').classList.toggle('is-complete', selected);
    if (review && reviewFingerprint !== fingerprint()) { review = null; $('#save-review').textContent = 'Die Eingaben wurden geändert. Bitte erneut prüfen.'; }
    $('#prepare-save').disabled = busy || recoveryBlocksCurrent || !selected || api.validate().errors.length > 0;
    $('#save-project').disabled = busy || recoveryBlocksCurrent || !review || !selected;
    const steps = ['project', 'selection', 'vehicle', 'images', 'content', 'review'];
    const index = steps.indexOf(api.state.currentStep);
    $('#step-next').disabled = !canOpen(steps[index + 1]);
    $('#step-back').disabled = index === 0 || !canOpen(steps[index - 1]);
  }
  function setBusy(value) {
    busy = value; api.setBusy(value);
    for (const selector of ['#choose-project', '#start-new', '#refresh-project', '#category-filter', '#recover-project']) $(selector).disabled = value;
    $('#vehicle-list').inert = value;
    update();
  }
  async function operation(work, target) {
    if (busy || api.state.busy) return;
    setBusy(true);
    A.setProgress(message => feedback(target, message));
    try { await work(); }
    catch (error) { feedback(target, error.name === 'NotAllowedError' ? 'Kein Zugriff auf den Projektordner. Bitte die Ordnerberechtigung erneut erteilen.' : error.message, true); }
    finally { A.setProgress(() => {}); setBusy(false); }
  }
  function renderList() {
    const root = $('#vehicle-list'); root.replaceChildren();
    const heading = document.createElement('div'); heading.className = 'vehicle-list-head';
    for (const label of ['Fahrzeug', 'Änderungsdatum']) { const span = document.createElement('span'); span.textContent = label; heading.append(span); }
    root.append(heading);
    const rows = project.vehicles.filter(item => !$('#category-filter').value || item.record.category === $('#category-filter').value);
    for (const item of rows) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'vehicle-row';
      const name = document.createElement('span'); name.textContent = item.record.title;
      const date = document.createElement('time'); date.dateTime = item.record.dateModified; date.textContent = item.record.dateModified.split('-').reverse().join('.');
      button.append(name, date); button.addEventListener('click', () => openVehicle(item)); root.append(button);
    }
    feedback($('#selection-feedback'), rows.length ? `${rows.length} Fahrzeuge` : 'In dieser Kategorie sind noch keine Fahrzeuge vorhanden.');
  }
  function openStep(step) {
    // Navigation is restored after an async operation, not while its controls are locked.
    api.state.currentStep = step;
    setBusy(false);
    api.showStep(step, { focus: true });
  }
  async function loadProject(root) {
    const journal = await S.readJournal(root);
    if (journal) {
      recoveryRoot = root;
      recoveryBlocksCurrent = !!project && (root === project.root || await root.isSameEntry?.(project.root));
      $('#recover-project').hidden = false;
      feedback($('#project-feedback'), `Projekt „${root.name}“: Ein Speichervorgang muss wiederhergestellt werden. Ihre bisherige Arbeit bleibt erhalten. Sicherung: ${journal.backup}`, true);
      openStep('project'); return;
    }
    const next = await A.inspect(root, api.validateRecord);
    S.parseDates(await A.text(root, 'src/config/modificationDates.js'));
    project = next; recoveryRoot = null; selected = false; from = null; review = null;
    recoveryBlocksCurrent = false;
    $('#recover-project').hidden = true; $('#project-name').textContent = `Verbunden: ${root.name}`;
    feedback($('#project-feedback'), 'Projektordner erfolgreich geprüft.');
    renderList(); openStep('selection');
  }
  $('#choose-project').addEventListener('click', async () => {
    if (!discard()) return;
    if (!window.showDirectoryPicker || !window.isSecureContext) { feedback($('#project-feedback'), 'Bitte index.html in einer aktuellen Desktop-Version von Chrome oder Edge öffnen. Dieser Browser unterstützt den benötigten Ordnerzugriff nicht.', true); return; }
    await operation(async () => {
      let root;
      try { root = await window.showDirectoryPicker({ id: 'oldtimer-website', mode: 'readwrite' }); }
      catch (error) { if (error.name !== 'AbortError') throw error; return; }
      await loadProject(root);
    }, $('#project-feedback'));
  });
  $('#refresh-project').addEventListener('click', () => {
    if (!project || !discard()) return;
    operation(() => loadProject(project.root), $('#selection-feedback'));
  });
  $('#recover-project').addEventListener('click', () => {
    if (!recoveryRoot || !discard() || !confirm('Den unterbrochenen Vorgang im angezeigten Projekt wiederherstellen oder einen abgeschlossenen Vorgang entsperren? Die Projektliste wird anschließend neu geladen.')) return;
    operation(async () => {
      const root = recoveryRoot;
      if (await root.requestPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('Bitte Schreibzugriff auf den Projektordner erlauben.');
      await S.restore(root); await loadProject(root);
    }, $('#project-feedback'));
  });
  $('#category-filter').addEventListener('change', renderList);
  $('#start-new').addEventListener('click', () => {
    if (!project || !discard()) return;
    api.resetEditor(); selected = true; from = null; review = null;
    if ($('#category-filter').value) api.fields.category.value = $('#category-filter').value;
    baseline = fingerprint(); api.showEditor('new'); api.updateSummary();
  });
  async function openVehicle(item) {
    if (!discard()) return;
    await operation(async () => {
      if (!A.same(project.baseline, await A.snapshot(project.root))) throw new Error('Das Projekt wurde außerhalb des Editors geändert. Bitte die Liste aktualisieren.');
      const files = await A.vehicleFiles(project.root, item.key);
      // The import function validates everything before replacing the current state.
      api.setBusy(false);
      const imported = await api.importVehicle(files, { managed: true });
      if (!imported) throw new Error($('#status').textContent || $('#workspace-status').textContent || 'Fahrzeug konnte nicht geladen werden.');
      selected = true; from = item.key; review = null; baseline = fingerprint();
      openStep('vehicle');
    }, $('#selection-feedback'));
  }
  function renderReview(value) {
    const root = $('#save-review'); root.replaceChildren();
    const summary = document.createElement('p');
    summary.textContent = `Projekt: ${project.root.name}\n${value.from ? `Original: /projekte/${value.from}/\n` : 'Neues Fahrzeug\n'}Ziel: /projekte/${value.key}/\n\n${value.summary.length ? value.summary.map(entry => `${entry.action}: ${entry.path}`).join('\n') : 'Keine Dateiänderungen.'}`;
    root.append(summary);
    const notice = document.createElement('p'); notice.textContent = 'Mit „Im Projekt speichern“ übernehmen Sie genau diese Änderungen. Eine Sicherung wird vor dem Schreiben angelegt.'; root.append(notice);
  }
  $('#prepare-save').addEventListener('click', () => operation(async () => {
    review = null; feedback($('#save-review'), 'Dateien und Projekt werden geprüft …');
    const snapshot = api.editorSnapshot();
    api.updateSummary();
    const stamp = fingerprint();
    const checked = await S.prepare(project, snapshot, from, api);
    if (stamp !== fingerprint()) throw new Error('Die Eingaben wurden während der Prüfung geändert. Bitte erneut prüfen.');
    review = checked; reviewFingerprint = stamp; renderReview(review);
  }, $('#save-review')));
  $('#save-project').addEventListener('click', async () => {
    if (!review || reviewFingerprint !== fingerprint() || busy) return;
    const checked = review, checkedProject = project, stamp = reviewFingerprint;
    await operation(async () => {
      // Called synchronously from the click, retaining user activation for permission.
      const permission = await checkedProject.root.requestPermission({ mode: 'readwrite' }).catch(() => 'denied');
      if (permission !== 'granted') throw new Error('Bitte Schreibzugriff erlauben. Ihre geprüften Änderungen bleiben erhalten.');
      if (project !== checkedProject || review !== checked || stamp !== fingerprint()) throw new Error('Die Eingaben oder das Projekt wurden geändert. Bitte erneut prüfen.');
      review = null;
      feedback($('#save-review'), 'Sicherung wird angelegt und Änderungen werden gespeichert …');
      let committed = false;
      try {
        const result = await S.apply(checked);
        committed = result.committed;
        // Reload the committed bytes, preserving filenames and original metadata for the next save.
        project = await A.inspect(project.root, api.validateRecord);
        const files = await A.vehicleFiles(project.root, checked.key);
        api.setBusy(false);
        if (!await api.importVehicle(files, { managed: true })) throw new Error('Gespeicherte Dateien konnten nicht wieder in den Editor geladen werden. Bitte Projekt erneut auswählen.');
        from = checked.key; selected = true; baseline = fingerprint();
        renderList(); openStep('review');
        if (result.cleanupPending) {
          recoveryRoot = project.root; recoveryBlocksCurrent = true; $('#recover-project').hidden = false;
          feedback($('#project-feedback'), `Die Änderungen wurden gespeichert. Bitte den abgeschlossenen Vorgang entsperren. Sicherung: ${result.backup}`, true);
        }
        feedback($('#save-review'), `Änderungen im Projekt gespeichert.\n${result.backup ? `Sicherung: ${result.backup}\n` : ''}${result.cleanupPending ? 'Die Projektsperre konnte nicht entfernt werden. Bitte unter „Projektordner“ den abgeschlossenen Vorgang entsperren.\n' : ''}Die hochladbare Website (dist) muss separat erstellt werden.`);
      } catch (error) {
        if (await A.hasDirectory(project.root, S.lock).catch(() => true)) {
          recoveryRoot = project.root; recoveryBlocksCurrent = true; $('#recover-project').hidden = false;
          feedback($('#project-feedback'), committed ? 'Die Änderungen wurden gespeichert. Bitte den abgeschlossenen Vorgang unter „Projektordner“ entsperren.' : 'Ein Speichervorgang wurde unterbrochen. Bitte wiederherstellen, bevor Sie weitere Änderungen speichern.', true);
        }
        if (committed) throw new Error(`Änderungen wurden gespeichert, aber das erneute Laden ist fehlgeschlagen. Bitte den Projektordner erneut auswählen.\n${error.message}`);
        throw new Error(`Änderungen konnten nicht im Astro-Projekt gespeichert werden.\n${error.message}`);
      }
    }, $('#save-review'));
  });
  window.addEventListener('beforeunload', event => { if (dirty() || busy) { event.preventDefault(); event.returnValue = ''; } });
  if (!window.showDirectoryPicker || !window.isSecureContext) feedback($('#project-feedback'), 'Bitte index.html in Chrome oder Edge auf einem Computer öffnen. Der benötigte Ordnerzugriff ist hier nicht verfügbar.', true);
  return { canOpen, update, invalidateReview };
};
