// Injected only by scripts/test-editor-browser.mjs into the website's temporary harness.
  await test('Splitting retains bilingual repeated occurrences, sequence and focus', async () => {
    await t.importVehicle(filesFor());
    const original = t.createRecord(), gallery = t.state.blocks[1];
    t.showStep('content');
    click(`[data-entry-split="0"][data-entry-block="${gallery.id}"]`);
    eq(t.state.blocks.map(block => block.type), ['copy','gallery','gallery','contact'], 'split sequence');
    eq(t.createRecord().blocks.filter(block => block.type === 'gallery').flatMap(block => block.images), original.blocks[1].images, 'occurrence metadata');
    assert(d.activeElement.closest('[data-block-id]').dataset.blockId === t.state.blocks[2].id, 'new gallery focus');
    t.state.blocks.splice(2,0,{id:'between-photos',type:'copy',html:'<p>Text dazwischen</p>',htmlEn:'<p>Text between photos</p>',imageIds:[],imageMeta:[]});
    t.renderBlocks();t.updateSummary();
    const saved = t.createRecord();
    eq(saved.blocks.map(block => block.type), ['copy','gallery','copy','gallery','contact'], 'text before/image/text after');
    await t.importVehicle(filesFor(saved));
    eq(t.createRecord(),saved,'split import round trip');
    t.fields.category.value='vergangene-projekte';t.updateSummary();
    eq(t.createRecord().blocks,saved.blocks,'category move sequence');
    const zip = await t.makeZip([{name:'aktuelle-projekte/test-car/vehicle.json',data:JSON.stringify(saved)}]);
    const bytes=new Uint8Array(await zip.arrayBuffer()),view=new DataView(bytes.buffer);
    const offset=30+view.getUint16(26,true)+view.getUint16(28,true);
    eq(JSON.parse(new TextDecoder().decode(bytes.slice(offset,offset+view.getUint32(18,true)))),saved,'ZIP sequence');
  });
  await test('Preview combines uninterrupted galleries and keeps both languages and lead rules', async () => {
    await t.importVehicle(filesFor());frame.style.width='1440px';t.showStep('review');
    click('#open-page-preview');
    const preview = () => new w.DOMParser().parseFromString(d.querySelector('#page-preview-frame').srcdoc,'text/html');
    let page=preview();
    eq(page.querySelectorAll('article img').length,3,'photo occurrences');
    eq(page.querySelectorAll('.lead').length,0,'lead already in story');
    eq([...page.querySelectorAll('figcaption')].map(node=>node.textContent),['Bild zwei','Anderer Kontext'],'German captions');
    assert(!page.querySelector('script,a[href]'),'preview can execute or navigate');
    const language=d.querySelector('#preview-language');language.value='en';language.dispatchEvent(new w.Event('change',{bubbles:true}));
    page=preview();eq(page.querySelector('h1').textContent,record.titleEn,'English title');
    eq([...page.querySelectorAll('figcaption')].map(node=>node.textContent),['Second image','Another context'],'English captions');
    click('#close-page-preview');
    t.state.leadImageId='__card__';t.updateSummary();click('#open-page-preview');
    eq(preview().querySelectorAll('.lead').length,1,'lead outside story');
    click('#close-page-preview');await new Promise(resolve=>w.requestAnimationFrame(resolve));assert(d.activeElement.id==='open-page-preview','closing focus');
    // Split adjacent galleries still share one run; text creates separate runs.
    t.state.blocks[1].imageIds = t.state.blocks[1].imageIds.slice(0,1);
    t.state.blocks[1].imageMeta = t.state.blocks[1].imageMeta.slice(0,1);
    t.state.blocks.splice(2,0,{id:'next-gallery',type:'gallery',imageIds:[t.state.images[0].id],imageMeta:[null]});
    click('#open-page-preview');eq(preview().querySelectorAll('.photos').length,1,'adjacent gallery run');click('#close-page-preview');
    t.state.blocks.splice(2,0,{id:'interrupt',type:'copy',html:'<p>Text</p>',htmlEn:'<p>Text</p>',imageIds:[],imageMeta:[]});
    click('#open-page-preview');eq(preview().querySelectorAll('.photos').length,2,'text ends run');click('#close-page-preview');
    await t.importVehicle(filesFor());t.showStep('review');
  });
