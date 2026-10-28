  await run('Preview starts before project or vehicle selection and shares both sets of controls', async () => {
    const first = id => $('#project-tools-preview-' + id);
    const last = id => $('#tools-preview-' + id);
    await wait(() => first('start') && !first('start').disabled);
    check(!doc.querySelector('[data-step="project"]').hidden, 'First page is not visible.');
    check($('#tools-transfer').disabled, 'Save enabled without a vehicle.');
    const nativeFetch = win.fetch;
    let starts = 0, release;
    win.fetch = async (path, options) => {
      if (path === '/api/preview/start') {
        starts++;
        await new Promise(resolve => { release = resolve; });
      }
      return nativeFetch(path, options);
    };
    try {
      first('start').click();
      check(first('start').disabled && last('start').disabled, 'Both start controls must lock immediately.');
      last('start').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      first('start').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      check(starts === 1, 'Concurrent clicks started more than one preview.');
      release();
      await wait(() => !first('link').hidden && !first('stop').disabled);
      check(first('start').hidden && last('start').hidden, 'Start controls disagree.');
      check(first('link').href === last('link').href, 'Preview links disagree.');
      check(first('log').textContent === last('log').textContent, 'Preview logs disagree.');
      last('start').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      check(starts === 1, 'Running preview was started again.');
      last('stop').click();
      await wait(() => !first('start').disabled);
      check(first('link').hidden && last('link').hidden && !first('link').hasAttribute('href'), 'Stopped preview kept a stale link.');
      last('start').click(); release();
      await wait(() => !first('stop').disabled);
      first('stop').click();
      await wait(() => !last('start').disabled);
      check(starts === 2 && !first('start').hidden && !last('start').hidden, 'Restart/stop did not synchronize.');
      for (const width of [1440, 390]) {
        frame.style.width = width + 'px'; await new Promise(resolve => setTimeout(resolve, 50));
        check(doc.documentElement.scrollWidth <= width + 1, 'First page overflow at ' + width);
      }
      frame.style.width = '1440px';
    } finally { release?.(); win.fetch = nativeFetch; }
  });
  await run('Preview failures appear on the first page and permit retry', async () => {
    const nativeFetch = win.fetch;
    win.fetch = async (path, options) => path === '/api/preview/start'
      ? new win.Response(JSON.stringify({ error: 'Vorschau konnte nicht gestartet werden.' }), { status: 400 })
      : nativeFetch(path, options);
    try {
      $('#project-tools-preview-start').click();
      await wait(() => !$('#project-tools-message').hidden && !$('#project-tools-preview-start').disabled);
      check($('#project-tools-message').textContent === $('#tools-message').textContent, 'Error messages disagree.');
      check(!$('#tools-preview-start').disabled, 'Failed start left final control locked.');
    } finally { win.fetch = nativeFetch; }
  });
