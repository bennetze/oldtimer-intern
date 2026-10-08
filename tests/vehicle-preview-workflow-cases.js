// Injected only into the disposable project workflow fixture.
  await test('Preview controls retain approval; split invalidates it and survives save/reopen/move', async () => {
    frame.style.width='1440px';
    t.state.blocks = [{id:'story-start',type:'copy',html:'<p>Vorher</p>',htmlEn:'<p>Before</p>',imageIds:[],imageMeta:[]},{id:'split-save',type:'gallery',imageIds:['__card__','__card__','__card__'],imageMeta:[{alt:'Eins',altEn:'One',caption:'Erste Verwendung',captionEn:'First use'},{alt:'Zwei',altEn:'Two',caption:'Zweite Verwendung',captionEn:'Second use'},{alt:'Drei',altEn:'Three'}]},{id:'story-end',type:'copy',html:'<p>Nachher</p>',htmlEn:'<p>After</p>',imageIds:[],imageMeta:[]}];
    t.renderBlocks();t.updateSummary();click('[data-step-target="review"]');click('#prepare-save');await wait(()=>!d.querySelector('#save-project').disabled);
    click('#open-page-preview');
    for(const [selector,value] of [['#preview-language','en'],['#preview-width','390']]) {d.querySelector(selector).value=value;d.querySelector(selector).dispatchEvent(new w.Event('change',{bubbles:true}));}
    await new Promise(resolve=>w.queueMicrotask(resolve));click('#close-page-preview');
    assert(!d.querySelector('#save-project').disabled,'preview invalidated approval');
    click('[data-step-target="content"]');click('[data-entry-split="0"]');
    assert(d.querySelector('#save-project').disabled,'split retained stale review');
    const middle={id:'split-middle',type:'copy',html:'<p>Dazwischen</p>',htmlEn:'<p>Between</p>',imageIds:[],imageMeta:[]};t.state.blocks.splice(2,0,middle);t.renderBlocks();t.updateSummary();
    const expected=t.createRecord().blocks;
    click('[data-step-target="review"]');click('#prepare-save');await wait(()=>!d.querySelector('#save-project').disabled);click('#save-project');await wait(()=>!t.state.busy && d.querySelector('#save-review').textContent.includes('im Projekt gespeichert'));
    assert(JSON.stringify(t.createRecord().blocks)===JSON.stringify(expected),'save/reload lost split sequence');
    const root=await w.fixtureRoot,A=w.VehicleProjectAccess;
    const stored=JSON.parse(await A.text(root,'src/pages/projekte/'+t.fields.category.value+'/test-car/vehicle.json'));
    assert(JSON.stringify(stored.blocks)===JSON.stringify(expected),'written occurrence metadata differs');
    const nextCategory=t.fields.category.value==='aktuelle-projekte'?'vergangene-projekte':'aktuelle-projekte';
    input('#category',nextCategory);click('#prepare-save');await wait(()=>!d.querySelector('#save-project').disabled);click('#save-project');await wait(()=>!t.state.busy);
    const moved=JSON.parse(await A.text(root,'src/pages/projekte/'+nextCategory+'/test-car/vehicle.json'));
    assert(JSON.stringify(moved.blocks)===JSON.stringify(expected),'move lost split sequence');
  });
  await test('Rollback and interrupted recovery restore the complete split story', async () => {
    const root=await w.fixtureRoot,A=w.VehicleProjectAccess,S=w.VehicleProjectSave;
    const key=t.fields.category.value+'/test-car',path=A.prefix+key+'/vehicle.json';
    const original=await A.text(root,path),record=JSON.parse(original);
    const api={validateRecord:t.validateRecord,checkImage:t.checkImage,createAstro:t.createAstro};
    const prepare=async()=>{
      const snapshot=t.editorSnapshot();snapshot.record.blocks[0].html='<p>Geänderte Geschichte</p>';snapshot.recordText=JSON.stringify(snapshot.record,null,'\t')+'\n';
      return S.prepare(await A.inspect(root,t.validateRecord),snapshot,key,api);
    };
    for(const interrupted of [false,true]) {
      const review=await prepare(),write=A.write;let hits=0;
      A.write=async(handle,target,data)=>{
        if(target===path){hits++;if(hits===1){await write(handle,target,data);throw new Error('Injected story write failure');}if(interrupted&&hits===2)throw new Error('Injected rollback failure');}
        return write(handle,target,data);
      };
      let rejected=false;try{await S.apply(review);}catch{rejected=true;}finally{A.write=write;}
      assert(rejected,'failure was not reported');
      if(interrupted){assert(await S.readJournal(root),'interrupted journal lost');await S.restore(root);}
      assert(await A.text(root,path)===original,'recovery did not restore exact story bytes');
      assert(JSON.stringify(JSON.parse(await A.text(root,path)).blocks)===JSON.stringify(record.blocks),'split metadata lost');
      assert(!await S.readJournal(root),'restored lock retained');
    }
  });
