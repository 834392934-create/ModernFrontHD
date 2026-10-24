/* Headless rendering acceptance. Screenshots are software evidence, not a
 * certification that every original silhouette matches its named prototype. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chromium'});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.goto('http://127.0.0.1:8765/gallery.html');await page.waitForFunction(()=>window.Armory);
 await page.evaluate(()=>Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]));
 const integrated=await page.evaluate(()=>!!window.WarUnitRefinement&&!!WarModels.create('tank','chn').userData.unitRefinement);
 if(!integrated){assert.ok(process.argv.includes('--preview'),'index/gallery and WarModels.create must integrate the refinement pass');await page.addScriptTag({path:path.resolve('src/model-unit-refinement.js')});}
 const report=await page.evaluate(()=>{
  const T=THREE,rows=[],imported=[];let refinedSlots=0,preservedSlots=0;
  for(const f of Object.keys(WarData.F))for(const kind of Object.keys(WarData.U)){
   const key=kind+'_'+f,model=WarModels.create(kind,f);let meshes=0,triangles=0,valid=true;const originalMaterials=[];
   model.traverse(m=>{if(m.isMesh)originalMaterials.push([m,m.material,Object.keys(m.geometry.attributes)]);});WarUnitRefinement.apply(model,kind,f);
   model.traverse(m=>{if(!m.isMesh)return;meshes++;const a=m.geometry.attributes;triangles+=(m.geometry.index?.count||a.position.count)/3;valid&&=a.position.array.every(Number.isFinite)&&a.normal.array.every(Number.isFinite);});
   const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()).toArray(),refinement=model.userData.unitRefinement;
   valid&&=size.every(n=>Number.isFinite(n)&&n>0);if(refinement.meshes)refinedSlots++;if(refinement.mode==='licensed-asset-preserved'){
    preservedSlots++;let materialSame=true,texturedMeshes=0;for(const [m,mat,attributes]of originalMaterials){materialSame&&=m.material===mat&&JSON.stringify(Object.keys(m.geometry.attributes))===JSON.stringify(attributes);for(const x of Array.isArray(mat)?mat:[mat])if(x.map)texturedMeshes++;}
    imported.push({key,assetSource:model.userData.assetSource,license:model.userData.license,materialSame,texturedMeshes});
   }
   rows.push({key,valid,meshes,triangles,size,refinement});WarModels.cache.delete(key);
  }
  return{rows,imported,refinedSlots,preservedSlots,statuses:[WarImported.status,WarImportedAir.status,WarImportedGround.status]};
 });
 assert.equal(report.rows.length,462);assert.ok(report.rows.every(r=>r.valid));assert.deepEqual(report.statuses,['ready','ready','ready']);assert.equal(report.imported.length,4);for(const r of report.imported){assert.ok(r.materialSame,JSON.stringify(r));if(!r.key.startsWith('heli_'))assert.ok(r.texturedMeshes>0,JSON.stringify(r));}
 const samples={ground:['tank_chn','rocket_usa'],naval:['carrier_usa','destroyer_chn'],air:['fighter_chn','heli_rus'],space:['orbital_usa','satellite_chn'],personnel:['operator_usa','infantry_chn']};
 const screenshots=[];
 for(const [category,keys]of Object.entries(samples)){
  const output=await page.evaluate(async({category,keys})=>{
   const T=THREE,renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(640,360);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
   const scene=new T.Scene();scene.background=new T.Color(0x28343c);scene.add(new T.HemisphereLight(0xdde7e5,0x77735a,2.1));const sun=new T.DirectionalLight(0xffe5bf,3);sun.position.set(10,18,8);scene.add(sun);const rim=new T.DirectionalLight(0xc2d8e3,1.3);rim.position.set(-8,10,-10);scene.add(rim);
   const sheet=document.createElement('canvas');sheet.width=1280;sheet.height=keys.length*402;const c=sheet.getContext('2d');c.fillStyle='#142028';c.fillRect(0,0,sheet.width,sheet.height);c.font='18px sans-serif';c.fillStyle='#e7edf0';
   const comparisons=[];
   for(let row=0;row<keys.length;row++){
    const key=keys[row],split=key.lastIndexOf('_'),kind=key.slice(0,split),f=key.slice(split+1),apply=WarUnitRefinement.apply;WarUnitRefinement.apply=model=>model;WarModels.cache.delete(key);let model;
    try{model=WarModels.create(kind,f);}finally{WarUnitRefinement.apply=apply;}scene.add(model);
    const box=new T.Box3().setFromObject(model),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),radius=size.length()/2,cam=new T.PerspectiveCamera(36,640/360,.01,1000),distance=radius/Math.sin(18*Math.PI/180)*1.08;
    cam.position.copy(center).add(new T.Vector3(1,.55,1.35).normalize().multiplyScalar(distance));cam.lookAt(center);cam.updateMatrixWorld(true);
    const pixels=[];
    for(let col=0;col<2;col++){
     if(col)apply(model,kind,f);renderer.render(scene,cam);const data=renderer.domElement.toDataURL('image/png'),im=new Image();im.src=data;await im.decode();c.drawImage(im,col*640,row*402+42);c.fillText(key+' | '+(col?'refined finish':'previous finish'),col*640+16,row*402+28);pixels.push(data);
    }
    comparisons.push({key,changed:pixels[0]!==pixels[1],classes:model.userData.unitRefinement.surfaceClasses});scene.remove(model);WarModels.cache.delete(key);
   }
   const calls=renderer.info.render.calls;renderer.dispose();return{image:sheet.toDataURL('image/png').split(',')[1],comparisons,calls};
  },{category,keys});
  assert.ok(output.comparisons.every(x=>x.changed),category+' must visibly differ');const filename='screenshots/unit-model-refinement-'+category+'.png';fs.mkdirSync('screenshots',{recursive:true});fs.writeFileSync(filename,Buffer.from(output.image,'base64'));screenshots.push({category,file:filename,comparisons:output.comparisons});
 }
 // The real gallery camouflage control remains connected after preservation.
 for(const key of ['assault_team_chn','tank_chn']){
  await page.locator('#model').selectOption(key);await page.evaluate(()=>{const b=new THREE.Box3().setFromObject(Armory.modelRoot),center=b.getCenter(new THREE.Vector3()),radius=b.getSize(new THREE.Vector3()).length()/2;Armory.camera.position.copy(center).add(new THREE.Vector3(1,.5,1).normalize().multiplyScalar(radius*3.5));Armory.camera.lookAt(center);Armory.renderer.render(Armory.scene,Armory.camera);});const before=await page.locator('#view').screenshot();await page.locator('#camo').click();await page.evaluate(()=>Armory.renderer.render(Armory.scene,Armory.camera));const after=await page.locator('#view').screenshot();assert.notDeepEqual(before,after,key+' camouflage toggle still changes material');
 }
 assert.deepEqual(errors,[]);const result={recordedAt:new Date().toISOString(),integrated,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync('src/model-unit-refinement.js')).digest('hex'),scope:'Finish-only revision; no new geometric fidelity or full visual acceptance claim.',slots:report.rows.length,refinedSlots:report.refinedSlots,preservedSlots:report.preservedSlots,imported:report.imported,screenshots,errors,rows:report.rows};
 fs.writeFileSync('docs/reviews/unit-model-refinement-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify({integrated,slots:result.slots,refinedSlots:result.refinedSlots,preservedSlots:result.preservedSlots,screenshots:screenshots.map(x=>x.file),errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
