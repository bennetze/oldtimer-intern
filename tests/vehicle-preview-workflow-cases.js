// Injected only into the disposable project workflow fixture.
  await test('Preview and split preserve bilingual reading order in ZIP exports without project writes', async () => {
    frame.style.width='1440px';
    t.state.blocks = [{id:'story-start',type:'copy',html:'<p>Vorher</p>',htmlEn:'<p>Before</p>',imageIds:[],imageMeta:[]},{id:'split-zip',type:'gallery',imageIds:['__card__','__card__','__card__'],imageMeta:[{alt:'Eins',altEn:'One',caption:'Erste Verwendung',captionEn:'First use'},{alt:'Zwei',altEn:'Two',caption:'Zweite Verwendung',captionEn:'Second use'},{alt:'Drei',altEn:'Three'}]},{id:'story-end',type:'copy',html:'<p>Nachher</p>',htmlEn:'<p>After</p>',imageIds:[],imageMeta:[]}];
    t.renderBlocks();t.updateSummary();await reviewed();
    click('#open-page-preview');
    for(const [selector,value] of [['#preview-language','en'],['#preview-width','390']]) {d.querySelector(selector).value=value;d.querySelector(selector).dispatchEvent(new w.Event('change',{bubbles:true}));}
    await new Promise(resolve=>w.queueMicrotask(resolve));click('#close-page-preview');
    assert(ready(),'preview invalidated review');
    click('[data-step-target="content"]');click('[data-entry-split="0"]');
    assert(d.querySelector('#save-review').dataset.reviewState==='stale','split retained stale review');
    const middle={id:'split-middle',type:'copy',html:'<p>Dazwischen</p>',htmlEn:'<p>Between</p>',imageIds:[],imageMeta:[]};t.state.blocks.splice(2,0,middle);t.renderBlocks();t.updateSummary();
    const expected=t.createRecord().blocks,root=await w.fixtureRoot,A=w.VehicleProjectAccess,before=await A.snapshot(root);
    const key=t.fields.category.value+'/'+t.fields.slug.value;
    const entries=await zipEntries(await captureZip());
    const record=JSON.parse(new TextDecoder().decode(entries.get(key+'/vehicle.json')));
    assert(JSON.stringify(record.blocks)===JSON.stringify(expected),'ZIP lost split sequence');
    assert(A.same(before,await A.snapshot(root)),'preview/export wrote source files');
    const nextCategory=t.fields.category.value==='aktuelle-projekte'?'vergangene-projekte':'aktuelle-projekte';
    input('#category',nextCategory);
    const moved=await zipEntries(await captureZip());
    const movedRecord=JSON.parse(new TextDecoder().decode(moved.get(nextCategory+'/'+t.fields.slug.value+'/vehicle.json')));
    assert(JSON.stringify(movedRecord.blocks)===JSON.stringify(expected),'category change lost occurrence metadata');
  });
  await test('Historical rollback and interrupted recovery remain compatible after save UI removal', async () => {
    const root=await w.fixtureRoot,A=w.VehicleProjectAccess,S=w.VehicleProjectSave;
    const key='aktuelle-projekte/test-car',path=A.prefix+key+'/vehicle.json';
    const original=await A.text(root,path),record=JSON.parse(original);
    const image=new w.File([await A.read(root,A.prefix+key+'/card.jpg')],'card.jpg',{type:'image/jpeg'});
    const api={validateRecord:t.validateRecord,checkImage:t.checkImage,createAstro:t.createAstro};
    const prepare=async()=>{
      const changed=structuredClone(record);changed.blocks=[{type:'copy',html:'<p>Geänderte Geschichte</p>',htmlEn:'<p>Changed story</p>'}];
      const snapshot={record:changed,recordText:JSON.stringify(changed,null,'\t')+'\n',images:[{name:'card.jpg',file:image}]};
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
      assert(await A.text(root,path)===original,'recovery did not restore exact bytes');
      assert(!await S.readJournal(root),'restored lock retained');
    }
  });
