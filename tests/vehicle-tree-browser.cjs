/* Real F/E keys, pointer-locked mouse fire, Three raycasts and normal projectile impacts.
 * Fixtures only arrange entities/camera; they never damage trees or submit synthetic fire. */
const {chromium,_electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const desktop=process.argv.includes('--desktop'),suffix=desktop?'desktop':'browser';
const report={recordedAt:new Date().toISOString(),environment:suffix,checks:[],screenshots:[],errors:[],scope:'Small deterministic interaction fixture; real keyboard/mouse input and rendered Three geometry. No sustained combat or performance claim.'};
let host,p;
for(const dir of ['docs','screenshots','.tmp'])fs.mkdirSync(dir,{recursive:true});
async function screenshot(name){const file=`screenshots/vehicle-tree-${name}-${suffix}.png`;await p.screenshot({path:file});report.screenshots.push(file);}
async function lock(){
 if(await p.evaluate(()=>!!document.pointerLockElement))return;
 await p.waitForTimeout(1400);const b=await p.locator('canvas').first().boundingBox();
 await p.mouse.click(b?b.x+b.width*.5:650,b?b.y+b.height*.5:400);
 await p.waitForFunction(()=>document.pointerLockElement===ModernFront.renderer.canvas);
}
async function crewState(){return p.evaluate(()=>{
 const g=ModernFront.game,f=window.vehicleTreeFixture,body=g.get(f.vehicleId),crew=g.get(f.crewId)||body?.vehicleCrew;
 return{id:crew?.id,hp:crew?.hp,ammo:crew?.operatorState?.stash?.rifle_01,
  copies:g.entities.filter(e=>e.id===f.crewId).length+g.entities.filter(e=>e.vehicleCrew?.id===f.crewId).length,
  controlled:ModernFront.direct.entityId,active:ModernFront.direct.active};
 });}
async function treeState(){return p.evaluate(()=>{
 const g=ModernFront.game,r=ModernFront.renderer,id=window.vehicleTreeFixture.treeId,t=WarTrees.get(g,id),i=g.trees.findIndex(x=>x.id===id),v=r.treeVisual,m=new THREE.Matrix4();
 v.sync(g);v.trunks.updateMatrixWorld(true);v.stumps.getMatrixAt(i,m);const stump=m.determinant();v.trunks.getMatrixAt(i,m);const trunk=m.determinant();
 const ray=new THREE.Raycaster(new THREE.Vector3(t.x-20,Math.min(8,t.trunkHeight*.5),t.y),new THREE.Vector3(1,0,0),0,40);
 return{id,hp:t.hp,stump,trunk,collider:WarTrees.liveColliders(g).some(x=>x.id===id),directCollider:(g.directObstacles||[]).some(x=>x.id===id),rayHits:ray.intersectObject(v.trunks).filter(h=>WarTrees.resolveHit(h)===id).length};
 });}
function assertDeadTree(state){assert.equal(state.hp,0);assert.equal(state.collider,false);assert.equal(state.directCollider,false);assert.equal(state.trunk,0);assert.ok(state.stump>0);assert.equal(state.rayHits,0);}

(async()=>{try{
 host=desktop?await _electron.launch({executablePath:require('./desktop-path.cjs').executable,args:[],timeout:45000}):await chromium.launch({headless:true,channel:'chromium'});
 p=desktop?await host.firstWindow():await host.newPage({viewport:{width:1600,height:1000}});
 p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 if(!desktop)await p.goto(process.env.GAME_URL||'http://127.0.0.1:8765');
 await p.waitForFunction(()=>window.ModernFront?.direct&&window.WarTrees);
 report.assets=await p.evaluate(async()=>{
  await Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]);
  return [WarImported,WarImportedAir,WarImportedGround].map(x=>({status:x.status}));
 });for(const asset of report.assets)assert.equal(asset.status,'ready','Packaged GLB assets must be ready');
 await p.locator('[data-map="desert"]').click();await p.locator('#enemies').selectOption('1');await p.locator('#player-mode').selectOption('driver');await p.locator('#initial-vehicle').selectOption('operator');await p.locator('#start').click();
 await p.waitForFunction(()=>ModernFront.direct.active&&ModernFront.game.get(ModernFront.direct.entityId)?.kind==='operator');
 report.fixture=await p.evaluate(()=>{
  const g=ModernFront.game,d=ModernFront.direct,crew=g.get(d.entityId);
  g.entities=g.entities.filter(e=>e.id===crew.id||e.kind==='hq');g.effects=[];g.ai=()=>{};
  for(const t of g.teams){t.money=0;t.aiClock=1e9;t.queue=[];t.buildQueue=[];}
  crew.hp=87;crew.order=null;crew.path=[];crew.angle=0;g.operatorState(crew).stash.rifle_01={ammo:17,reserve:23};
  const body=g.spawn(0,'tank',crew.x+g.navigationRadius(crew)+g.navigationRadius({kind:'tank',team:0})+18,crew.y);body.order=null;body.path=[];body.cool=1e6;
  g.spatial.rebuild(g.entities);d.yaw=Math.PI;d.pitch=.8;d.motion=false;d.lastAimTime=0;d.aimResult=null;
  window.vehicleTreeFixture={crewId:crew.id,vehicleId:body.id};return {...window.vehicleTreeFixture};
 });await lock();
 // Spend ammunition through an actual trigger before checking that F cannot refill it.
 const beforeTrigger=await crewState();await p.mouse.down();
 await p.waitForFunction(()=>ModernFront.game.operatorState(ModernFront.game.get(window.vehicleTreeFixture.crewId)).stash.rifle_01.ammo<17);
 await p.mouse.up();const original=await crewState();assert.ok(original.ammo.ammo<beforeTrigger.ammo.ammo);assert.equal(original.hp,87);
 report.crewBeforeBoard=original;
 for(let cycle=0;cycle<3;cycle++){
  await lock();await p.keyboard.press('f');await p.waitForFunction(()=>ModernFront.direct.entityId===window.vehicleTreeFixture.vehicleId);
  assert.equal(await p.evaluate(()=>document.pointerLockElement===ModernFront.renderer.canvas),true,'F boarding keeps mouse capture without requiring another click');
  const aboard=await crewState();assert.equal(aboard.id,original.id);assert.equal(aboard.hp,original.hp);assert.deepEqual(aboard.ammo,original.ammo);assert.equal(aboard.copies,1);assert.equal(aboard.active,true);
  if(cycle===0)await screenshot('aboard');
  await lock();await p.keyboard.press('f');await p.waitForFunction(()=>ModernFront.direct.entityId===window.vehicleTreeFixture.crewId);
  assert.equal(await p.evaluate(()=>document.pointerLockElement===ModernFront.renderer.canvas),true,'F disembarking keeps mouse capture without requiring another click');
  const out=await crewState();assert.equal(out.id,original.id);assert.equal(out.hp,original.hp);assert.deepEqual(out.ammo,original.ammo);assert.equal(out.copies,1);assert.equal(out.active,true);
 }
 report.checks.push('Real mouse fire spends rifle ammo; three real F boarding/disembarking cycles preserve one crew ID, HP and spent ammo while remaining in FPS');

 // Place the same person beside an existing deterministic tree, retaining real terrain and tree art.
 report.treeFixture=await p.evaluate(()=>{
  const g=ModernFront.game,d=ModernFront.direct,r=ModernFront.renderer,e=g.get(d.entityId);
  const tree=g.trees.find(t=>t.hp>0&&t.trunkHeight>13&&t.x>130&&t.x<WarData.W-130&&t.y>130&&t.y<WarData.H-130&&
   WarNavigationFootprints.terrain(g,{...e,angle:0},t.x-65,t.y)&&
   !g.entities.some(o=>o.id!==e.id&&Math.hypot(o.x-(t.x-32),o.y-t.y)<(o.r||20)+100)&&
   !g.trees.some(o=>o.id!==t.id&&Math.hypot(o.x-(t.x-32),o.y-t.y)<60));
  if(!tree)throw Error('No safe isolated tree fixture on the natural map');
  window.vehicleTreeFixture.treeId=tree.id;e.x=tree.x-65;e.y=tree.y;e.angle=0;e.cool=0;e.order=null;e.path=[];e.jumpHeight=0;e.jumpVelocity=0;
  g.spatial.rebuild(g.entities);d.yaw=0;d.pitch=0;d.recoil=0;d.motion=false;d.lastAimTime=0;d.aimResult=null;d.updateCamera();r.scene.updateMatrixWorld(true);
  return {id:tree.id,x:tree.x,y:tree.y,hp:tree.hp,trunkHeight:tree.trunkHeight};
 });await lock();
 await p.waitForFunction(()=>ModernFront.direct.aimResult?.targetTreeId===window.vehicleTreeFixture.treeId);
 report.ray=await p.evaluate(()=>{
  const d=ModernFront.direct,h=d.cast(d.eye,d.camera.getWorldDirection(new THREE.Vector3()),200);
  return {treeId:h?.treeId,resolvedId:h?WarTrees.resolveHit(h):null,instanceId:h?.instanceId,point:h?.point?.toArray(),distance:h?.distance};
 });assert.equal(report.ray.treeId,report.treeFixture.id);assert.equal(report.ray.resolvedId,report.treeFixture.id);assert.ok(Number.isInteger(report.ray.instanceId));
 await screenshot('tree-before');
 const ammunitionBeforeTree=(await crewState()).ammo.ammo;
 // Observe real projectile objects without replacing emitShot, impact or damage.
 await p.evaluate(()=>{
  window.vehicleTreeShots=[];const seen=new WeakSet();window.vehicleTreeObserver=setInterval(()=>{
   for(const fx of ModernFront.game.effects)if(fx.type==='shot'&&fx.sourceId===window.vehicleTreeFixture.crewId&&!seen.has(fx)){
    seen.add(fx);window.vehicleTreeShots.push({targetTreeId:fx.targetTreeId,damage:fx.damage,baseDamage:fx.baseDamage});
   }
  },10);
 });
 await p.mouse.down();try{await p.waitForFunction(()=>WarTrees.get(ModernFront.game,window.vehicleTreeFixture.treeId).hp===0,null,{timeout:7000});}finally{await p.mouse.up();}
 report.shots=await p.evaluate(()=>{clearInterval(window.vehicleTreeObserver);return window.vehicleTreeShots;});
 assert.ok(report.shots.some(s=>s.targetTreeId===report.treeFixture.id&&(s.damage>0||s.baseDamage>0)),'Real armed projectile carries the raycast tree ID');
 const ammunitionAfterTree=(await crewState()).ammo.ammo;assert.ok(ammunitionAfterTree<ammunitionBeforeTree);report.treeAmmoSpent=ammunitionBeforeTree-ammunitionAfterTree;
 await p.waitForFunction(()=>ModernFront.game.time-WarTrees.get(ModernFront.game,window.vehicleTreeFixture.treeId).destroyedAt>1.3);
 report.destroyed=await treeState();assertDeadTree(report.destroyed);await screenshot('tree-stump');
 report.checks.push('Actual Three trunk instance ray resolves stable tree ID; real left-button rifle shots consume ammo and destroy it through projectile impacts; collider and standing ray occluder disappear and stump remains');

 await p.keyboard.press('e');await p.waitForFunction(()=>!ModernFront.direct.active);assert.equal(await p.locator('#direct-hud').isVisible().catch(()=>false),false);
 report.checks.push('Real E exits first person back to RTS');
 await p.keyboard.press('F5');await p.waitForFunction(()=>{
  const s=JSON.parse(localStorage.getItem('modern-front-save-v1')||'null');return s?.trees?.damage?.some(t=>t.id===window.vehicleTreeFixture.treeId&&t.hp===0);
 });
 await p.evaluate(()=>{window.vehicleTreeOldGame=ModernFront.game;});await p.keyboard.press('F9');await p.waitForFunction(()=>ModernFront.game!==window.vehicleTreeOldGame);
 await p.evaluate(()=>{const g=ModernFront.game;g.ai=()=>{};g.teams.forEach(t=>{t.money=0;t.aiClock=1e9;});});
 report.loaded=await treeState();assertDeadTree(report.loaded);
 const afterLoad=await crewState();assert.equal(afterLoad.id,original.id);assert.equal(afterLoad.hp,87);assert.equal(afterLoad.ammo.ammo,ammunitionAfterTree);assert.equal(afterLoad.copies,1);
 await p.evaluate(()=>{const r=ModernFront.renderer,g=ModernFront.game;r.prepare(g);const t=WarTrees.get(g,window.vehicleTreeFixture.treeId);r.camera.x=t.x;r.camera.y=t.y;r.camera.zoom=2;});
 report.rebuilt=await treeState();assertDeadTree(report.rebuilt);await screenshot('tree-reloaded');
 report.checks.push('Real F5/F9 save/load and explicit world rebuild retain the dead tree, visible stump, absent collider/occluder and original crew state');
 report.renderEnvironment=await p.evaluate(()=>{const r=ModernFront.renderer,gl=r.gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{viewport:[innerWidth,innerHeight],dpr:r.dpr,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};});
 assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;if(p){try{await screenshot('failure');report.diagnostics=await p.evaluate(()=>({active:ModernFront.direct.active,paused:ModernFront.paused,locked:!!document.pointerLockElement,controlled:ModernFront.direct.entityId,aimTree:ModernFront.direct.aimResult?.targetTreeId,crew:ModernFront.game.get(window.vehicleTreeFixture?.crewId),tree:WarTrees.get(ModernFront.game,window.vehicleTreeFixture?.treeId)}));}catch(capture){report.captureError=String(capture);}}}
 finally{if(p)await p.evaluate(()=>clearInterval(window.vehicleTreeObserver)).catch(()=>{});fs.writeFileSync(`docs/vehicle-tree-${suffix}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await host?.close();}
})();
