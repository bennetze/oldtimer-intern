(() => {
  "use strict";
  // The static file entry remains offline. Only the launcher enables this adapter.
  if (!document.querySelector('meta[name="vehicle-tools"][content="local-launcher"]') || location.hostname !== '127.0.0.1' || !/^#[0-9a-f-]{36}$/.test(location.hash)) return;
  const token = location.hash.slice(1);
  const root = document.getElementById('website-tools');
  root.hidden = false;
  const finalStep = root.parentElement;
  let recoveryDialog = null;
  const projectHint = document.createElement('p');
  projectHint.className = 'hint';
  document.getElementById('choose-project').before(projectHint);
  document.querySelector('.export-note').textContent = 'ZIP-Download ist optional, etwa zur Weitergabe. Zum Speichern des aktuellen Entwurfs ist keine ZIP nötig.';
  document.getElementById('generate').textContent = 'ZIP herunterladen (optional)';
  document.querySelector('[data-step-target="review"] .step-nav__label').textContent = 'Prüfen & speichern';
  document.querySelector('.review-panel h2').textContent = 'Prüfen & speichern';
  document.querySelector('.sidebar').setAttribute('aria-label', 'Prüfen und speichern');
  const oldSaveRow = document.querySelector('#tools-transfer').closest('li');
  const saveRow = document.createElement('section');
  saveRow.append(...oldSaveRow.childNodes); oldSaveRow.remove();
  saveRow.querySelector('h3').textContent = 'Fahrzeug speichern';
  document.querySelector('#generate').before(saveRow);
  saveRow.className = 'website-tools__save';
  document.getElementById('tools-title').textContent = 'Website ansehen & bereitstellen';
  for (const heading of root.querySelectorAll('.website-tools__flow h3')) heading.textContent = heading.textContent.replace('2.', '1.').replace('3.', '2.');
  let adapter = null, toolLocked = false, handledTask = null;

  const $ = id => document.getElementById('tools-' + id);
  // Both steps control the same launcher-owned preview, independently of a draft.
  const projectPreview = document.createElement('section');
  projectPreview.className = 'website-tools';
  projectPreview.setAttribute('aria-labelledby', 'project-tools-preview-title');
  const previewRow = $('preview-start').closest('li').cloneNode(true);
  previewRow.querySelector('h3').id = 'project-tools-preview-title';
  previewRow.querySelector('h3').textContent = 'Website ansehen';
  previewRow.querySelector('p').textContent = 'Die Website-Vorschau kann ohne Fahrzeugauswahl gestartet werden.';
  projectPreview.append(...previewRow.childNodes, $('preview-detail').cloneNode(true), $('message').cloneNode(true));
  for (const element of projectPreview.querySelectorAll('[id]')) {
    if (element.id.startsWith('tools-')) element.id = 'project-' + element.id;
  }
  document.querySelector('[data-step="project"] .panel__body').append(projectPreview);
  const previewControls = [id => $('preview-' + id), id => document.getElementById('project-tools-preview-' + id)];
  const messages = [$('message'), document.getElementById('project-tools-message')];
  const names = { transfer: 'Fahrzeug speichern', delete: 'Fahrzeug löschen', build: 'Website erstellen', deploy: 'Bei IONOS veröffentlichen' };
  let state, promptId, uploadBusy = false, requestBusy = false, lastRevision = -1, detailState;


  async function api(path, data, bytes) {
    const response = await fetch('/api/' + path, {
      method: data === undefined && bytes === undefined ? 'GET' : 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': bytes === undefined ? 'application/json' : 'application/octet-stream' },
      body: bytes === undefined ? data === undefined ? undefined : JSON.stringify(data) : bytes,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Aktion fehlgeschlagen.');
    return result;
  }
  function message(text) { for (const element of messages) { element.hidden = !text; element.textContent = text; } }
  function controls() {
    const context = adapter?.context();
    const busy = uploadBusy || requestBusy || state?.task?.status === 'running';
    for (const id of ['transfer', 'delete', 'build', 'deploy']) $(id).disabled = busy || !context?.ready || context.busy || (['build', 'deploy'].includes(id) && state?.preview?.running) || (['transfer', 'delete'].includes(id) && context.stale) || (id === 'transfer' && !context.valid);
    for (const preview of previewControls) {
      preview('start').disabled = busy || !state || !!context?.busy || state.preview.running;
      preview('stop').disabled = busy || !state || !!context?.busy || !state.preview.running;
    }
    $('export-hint').textContent = context?.stale ? 'Bitte die Fahrzeugliste nach der Projektänderung aktualisieren.' : context?.valid ? 'Speichert den aktuellen Entwurf nach Prüfung und Bestätigung. Kein ZIP-Download nötig.' : 'Bitte zuerst alle Pflichtangaben vervollständigen.';
    const locked = uploadBusy || state?.task?.status === 'running';
    if (adapter && locked !== toolLocked) { toolLocked = locked; adapter.setBusy(locked); }
    $('refresh').hidden = !context?.stale;
    $('refresh').disabled = busy;
  }
  async function action(work) {
    if (requestBusy) return;
    requestBusy = true; message(''); controls();
    try { await work(); await refresh(); }
    catch (error) { message(error.message); }
    finally { requestBusy = false; controls(); }
  }
  function scrollActivity() { $('activity-title').scrollIntoView({ block: 'center' }); }
  function taskSurface(task) {
    // A reload loses directory handles; keep an outstanding prompt reachable.
    if (task?.status === 'running' && adapter && !adapter.context().ready && !recoveryDialog) {
      recoveryDialog = document.createElement('dialog');
      recoveryDialog.className = 'website-tools-recovery';
      recoveryDialog.setAttribute('aria-label', 'Laufende Website-Aktion abschließen');
      recoveryDialog.addEventListener('cancel', event => event.preventDefault());
      document.body.append(recoveryDialog);
      recoveryDialog.append(root);
      recoveryDialog.showModal();
    } else if (recoveryDialog && task?.status !== 'running') {
      finalStep.append(root);
      recoveryDialog.close(); recoveryDialog.remove(); recoveryDialog = null;
      document.getElementById('choose-project').focus();
    }
  }
  function saveApproval(task) {
    return task?.name === 'transfer' && task.prompt?.kind === 'approval';
  }
  function render(next) {
    state = next; controls();
    $('project').textContent = 'Website-Projekt des Startprogramms: ' + next.project;
    projectHint.textContent = 'Bitte diesen Website-Ordner auswählen: ' + next.project;
    for (const preview of previewControls) {
      preview('start').hidden = next.preview.running;
      preview('stop').hidden = !next.preview.running;
      preview('link').hidden = !next.preview.url;
      if (next.preview.url) preview('link').href = next.preview.url;
      else preview('link').removeAttribute('href');
      preview('detail').hidden = !next.preview.log;
      preview('log').textContent = next.preview.log;
    }
    const task = next.task;
    taskSurface(task);
    if (task?.committed && task.status !== 'running' && handledTask !== task.id) {
      handledTask = task.id;
      adapter?.changed(task.name);
      controls();
    }
    $('task-detail').hidden = !task;
    if (task && detailState !== task.id + task.status) {
      detailState = task.id + task.status;
      $('task-detail').open = ['transfer', 'delete'].includes(task.name) || ['error', 'warning'].includes(task.status);
    }
    $('task-log').textContent = task?.log || '';
    $('activity-title').textContent = task ? names[task.name] : 'Nächster Schritt';
    $('status').textContent = uploadBusy ? 'Fahrzeug wird vorbereitet' : task?.prompt ? 'Ihre Auswahl' : task?.status === 'running' ? 'Läuft …' : task?.status === 'error' ? 'Bitte prüfen' : task?.status === 'warning' ? 'Vorschau prüfen' : task ? 'Abgeschlossen' : next.preview.running ? 'Vorschau läuft' : 'Bereit';
    $('hint').textContent = saveApproval(task) ? 'Original und Ziel im Verlauf prüfen. „Speichern bestätigen“ übernimmt die geprüfte Änderung mit Sicherung.' : task?.prompt?.question || (task?.status === 'running' ? 'Die Aktion läuft. Dieses Fenster offen lassen.' : task?.status === 'warning' ? 'Die Fahrzeugänderung wurde gespeichert. Bitte die Meldung zur Vorschau und den Sicherungspfad beachten.' : task?.status === 'error' ? 'Bitte die Ursache im Verlauf prüfen, bevor Sie die Aktion erneut starten.' : task ? 'Das Ergebnis und gegebenenfalls die Sicherung finden Sie im Verlauf.' : '„Im Projekt speichern“ bereitet den aktuellen Entwurf vor. Die geprüfte Änderung anschließend mit „Speichern bestätigen“ freigeben.');
    $('prompt').hidden = !task?.prompt;
    if (!task?.prompt && promptId) {
      promptId = null;
      $('activity-title').tabIndex = -1;
      $('activity-title').focus({ preventScroll: true });
    }
    if (task?.prompt && task.prompt.id !== promptId) {
      promptId = task.prompt.id;
      const prompt = task.prompt;
      $('choices').hidden = prompt.kind !== 'choice';
      $('text-answer').hidden = prompt.kind === 'choice' || saveApproval(task);
      $('choice-list').replaceChildren();
      for (const choice of prompt.choices) {
        const label = document.createElement('label'); label.className = 'website-tools__choice';
        const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'vehicle'; radio.value = choice.value;
        const text = document.createElement('span'); text.textContent = choice.label;
        label.append(radio, text); $('choice-list').append(label);
      }
      $('answer').value = '';
      $('answer-label').textContent = prompt.kind === 'approval' ? 'Zur Bestätigung JA eingeben. Jede andere Antwort bricht ab.' : 'Suchbegriff (leer lassen: alle Fahrzeuge)';
      $('submit').textContent = saveApproval(task) ? 'Speichern bestätigen' : prompt.kind === 'approval' ? 'Bestätigen' : prompt.kind === 'choice' ? 'Dieses Fahrzeug auswählen' : 'Suchen';
      scrollActivity();
      (saveApproval(task) ? $('submit') : prompt.kind === 'choice' ? $('choice-list').querySelector('input') : $('answer'))?.focus({ preventScroll: true });
    }
  }
  async function refresh() {
    const next = await api('state');
    if (next.revision !== lastRevision) { lastRevision = next.revision; render(next); }
  }
  async function poll() {
    try { await refresh(); }
    catch (error) { message('Verbindung unterbrochen. Werkzeuge über den Startknopf neu öffnen. ' + error.message); }
    setTimeout(poll, 800);
  }
  for (const name of ['delete', 'build', 'deploy']) $(name).addEventListener('click', () => action(async () => { await api('start', { name }); scrollActivity(); }));
  for (const preview of previewControls) {
    preview('start').addEventListener('click', () => {
      if (preview('start').disabled) return;
      action(() => api('preview/start', {}));
    });
    preview('stop').addEventListener('click', () => {
      if (preview('stop').disabled) return;
      action(() => api('preview/stop', {}));
    });
  }
  $('transfer').addEventListener('click', () => action(async () => {
    uploadBusy = true; controls(); $('upload-progress').hidden = false;
    $('upload-progress').textContent = 'Entwurf und Projekt werden geprüft …';
    scrollActivity();
    try {
      const { snapshot, from, project, page } = await adapter.prepareTransfer();
      const record = snapshot.record;
      const top = record.category;
      const upload = await api('upload/start', { top, draft: true, from, project });
      const entries = [
        { path: `${top}/${record.slug}.astro`, bytes: page },
        { path: `${top}/${record.slug}/vehicle.json`, bytes: snapshot.recordText },
        ...snapshot.images.map(image => ({ path: `${top}/${record.slug}/${image.name}`, bytes: image.file })),
      ];
      for (let i = 0; i < entries.length; i++) {
        $('upload-progress').textContent = `Fahrzeug wird vorbereitet · ${i + 1} / ${entries.length}`;
        await api('upload/file?id=' + encodeURIComponent(upload.id) + '&path=' + encodeURIComponent(entries[i].path), {}, entries[i].bytes);
      }
      await api('start', { name: 'transfer', upload: upload.id });
    } finally { uploadBusy = false; $('upload-progress').hidden = true; controls(); }
  }));
  async function answer(value) {
    const task = state?.task;
    if (!task?.prompt) return;
    await api('answer', { task: task.id, prompt: task.prompt.id, value });
  }
  $('prompt').addEventListener('submit', event => {
    event.preventDefault();
    if (!state?.task?.prompt) return;
    action(() => answer(saveApproval(state.task) ? 'JA' : state.task.prompt.kind === 'choice' ? $('choice-list').querySelector('input:checked')?.value || '' : $('answer').value));
  });
  $('cancel').addEventListener('click', () => action(() => answer(state.task.prompt.kind === 'search' ? '\u0000' : '')));
  $('refresh').addEventListener('click', () => adapter?.refresh());
  // Replace terminal-only guidance in hosted mode, preserving the file:// workflow.
  const guide = document.querySelector('#after-export ol');
  guide.replaceChildren();
  for (const text of ['Zum Speichern des aktuellen Entwurfs „Im Projekt speichern“ wählen; die ZIP ist dafür nicht nötig.', 'Original und Ziel prüfen und „Speichern bestätigen“ wählen.', 'Die Website-Vorschau unten starten oder neu laden. Danach die Fahrzeugliste aktualisieren.', 'Bei Bedarf die Website separat erstellen oder bei IONOS veröffentlichen.']) {
    const item = document.createElement('li'); item.textContent = text; guide.append(item);
  }
  window.VehicleWebsiteTools = {
    attach(value) { adapter = value; controls(); },
    contextChanged: controls,
    async verifyProject(handle, snapshot) { await api('project/check', { name: handle.name, snapshot }); },
  };
  poll();
})();
