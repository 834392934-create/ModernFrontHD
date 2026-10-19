/* RMB-only aiming and independent LMB firing regression using actual native input.
 * Surface probe / pointer-lock helpers adapted from unified-aim-browser.cjs. No runtime edits. */
const {chromium,_electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const desktop=process.argv.includes('--desktop'),suffix=desktop?'desktop':'browser',report={recordedAt:new Date().toISOString(),environment:suffix,inputContract:'RMB aims only; LMB exclusively fires',checks:[],errors:[],domains:[],shots:[]};let host,p,cursor={x:700,y:420};
const allDomains=[['operator',0],['tank',0],['destroyer',0],['submarine',-55],['heli',130],['orbital',4000]],requested=process.argv.find(a=>a.startsWith('--kinds='))?.slice(8).split(',').filter(Boolean),domainCases=requested?allDomains.filter(([kind])=>requested.includes(kind)):allDomains;
if(requested&&(!domainCases.length||requested.some(k=>!allDomains.some(([kind])=>kind===k))))throw Error('Unknown --kinds value; allowed: '+allDomains.map(([k])=>k).join(','));
report.requestedKinds=domainCases.map(([k])=>k);report.coverage=requested?'focused debug subset; not full six-domain acceptance':'full six-domain acceptance';
function checked(message){report.checks.push(message);console.log(message);}
async function pause(value){if(await p.evaluate(()=>ModernFront.paused)!==value)await p.keyboard.press(await p.evaluate(()=>ModernFront.direct.active?'KeyP':'Space'));await p.waitForFunction(v=>ModernFront.paused===v,value);}
async function lock(){if(await p.evaluate(()=>!!document.pointerLockElement))return;for(let attempt=0;attempt<3;attempt++){await p.waitForTimeout(1400);cursor={x:700,y:420};await p.mouse.click(cursor.x,cursor.y);try{await p.waitForFunction(()=>!!document.pointerLockElement,null,{timeout:1400});return;}catch{if(attempt===2)throw Error('pointer lock unavailable');}}}
async function observationKey(active,label){
 // Native pointer lock can be lost while waiting for projectiles to settle.
 // V intentionally ignores unlocked input; reacquire through a real canvas click.
 const snapshot=()=>p.evaluate(()=>({focused:document.hasFocus(),locked:document.pointerLockElement===ModernFront.direct.r.canvas,active:ModernFront.direct.opticalActive(),fire:ModernFront.game.directControl?.input.fire}));
 const before=await snapshot();
 if(!active){const ownUnlocks=await p.evaluate(()=>(window.__rmbFocusEvents||[]).filter(e=>e.name==='exitPointerLock-call'&&e.time>=window.__rmbObservationStarted));assert.deepEqual(ownUnlocks,[],label+' application unexpectedly released pointer lock during observation');}
 (report.focusBoundaryRecoveries??=[]).push({label,needed:!before.focused||!before.locked});await p.bringToFront();await lock();const ready=await snapshot();assert.ok(ready.focused&&ready.locked,label+' requires focused, locked native input');assert.equal(ready.fire,false,label+' focus recovery must not fire');if(active)await p.evaluate(()=>{window.__rmbObservationStarted=performance.now();});
 await p.keyboard.press('v');await p.waitForFunction(active=>ModernFront.direct.opticalActive()===active,active,{timeout:4000});
 (report.observationInputs??=[]).push({label,before,ready,after:await snapshot()});
}
async function fixture(kind,height){
 if(await p.evaluate(()=>ModernFront.direct.active)){await p.keyboard.press('e');await p.waitForFunction(()=>!ModernFront.direct.active&&!document.pointerLockElement);}
 await pause(true);
 const ids=await p.evaluate(({kind,height})=>{const g=ModernFront.game;g.entities=[];g.effects=[];g.result=null;g.ore=[];g.map.blocked.fill(0);g.buffs.add('vision');g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;t.queue=[];t.buildQueue=[];});g.spawn(0,'hq',300,300);g.spawn(1,'hq',5700,3600);g.spawn(0,'operator',1700,1400);const worldY=WarData.U[kind].naval?100:1400;const actor=g.spawn(0,kind,1800,worldY);actor.altitude=height;actor.angle=0;actor.pitch=0;const target=g.spawn(1,WarData.U[kind].underwater?'submarine':WarData.U[kind].space?'tank':WarData.U[kind].air?'heli':WarData.U[kind].naval?'destroyer':'tank',1800+(WarData.U[kind].space?0:160),worldY);if(WarData.U[kind].naval){for(const e of [actor,target])for(const [dx,dy]of [[0,0],[-64,-48],[-64,48],[64,-48],[64,48]]){const tile=g.map.tiles[Math.floor((e.y+dy)/48)*WarData.COLS+Math.floor((e.x+dx)/48)];if(![3,6].includes(tile))throw Error('Naval fixture must occupy actual rendered sea tiles');}}target.altitude=WarData.U[kind].space?0:height;target.hp=target.maxHp=10000;target.disabled=1e9;const far=g.spawn(1,'tank',5200,1400);far.hp=far.maxHp=10000;far.disabled=1e9;if(window.WarTrees)for(const tree of WarTrees.ensure(g))if([target,far].some(e=>Math.hypot(e.x-tree.x,e.y-tree.y)<130))WarTrees.damage(g,tree.id,10000);g.spatial.rebuild(g.entities);g.updateFog();return{actor:actor.id,target:target.id,far:far.id};},{kind,height});
 await p.keyboard.press('j');await p.waitForFunction(()=>ModernFront.direct.vehicleMenu.open);await p.locator(`[data-player-unit="${ids.actor}"]`).click();await p.waitForFunction(id=>ModernFront.direct.active&&ModernFront.direct.entityId===id,ids.actor);await pause(false);await lock();await p.waitForTimeout(250);
 await p.evaluate(()=>{const g=ModernFront.game;g.__rightButtonOriginalEmitShot??=g.emitShot;const original=g.__rightButtonOriginalEmitShot,seen=new WeakSet();window.__rightButtonShots=[];g.emitShot=function(...args){const result=original.apply(this,args);for(const fx of this.effects){if(fx.type!=='shot'||seen.has(fx))continue;seen.add(fx);window.__rightButtonShots.push({sourceId:fx.sourceId,time:this.time,targetId:fx.target,weaponId:fx.weaponId||null});}return result;};});return ids;
}
async function state(){return p.evaluate(()=>{const d=ModernFront.direct,g=ModernFront.game,e=g.get(d.entityId);return{position:[e.x,e.y,g.entityAltitude(e)],fov:d.camera.fov,zoom:d.scopeState().zoom,active:d.opticalActive(),orbital:d.orbitScope.active,direction:d.camera.getWorldDirection(new THREE.Vector3()).toArray(),foreground:window.__foregroundCalls||0,range:g.rangeProfile(e).attack,contact:d.el('orbit-contact').textContent};});}
async function aimAt(id){
 let selected;
 try{
  // Probe real model surfaces. A bounding-box centre may be an empty gap between
  // the submarine sail and hull, so it is never accepted without a mesh hit.
  selected=await p.evaluate(id=>{
   const d=ModernFront.direct,g=ModernFront.game,model=ModernFront.renderer.objects.get(id);if(!model?.visible)throw Error('Target model is not visible: '+id);
   model.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),ray=new THREE.Raycaster(),candidates=[];
   for(const fy of [.5,.35,.2,.65,.8,.1,.9])for(const fz of [.5,.35,.65,.2,.8])for(const fx of [.5,.35,.65]){
    const seed=new THREE.Vector3(box.min.x+size.x*fx,box.min.y+size.y*fy,box.min.z+size.z*fz),dir=seed.clone().sub(d.eye).normalize();ray.set(d.eye,dir);ray.far=20000;const meshHit=ray.intersectObject(model,true)[0];if(!meshHit)continue;
    const first=d.cast(d.eye,dir,20000);if(first?.entity?.id!==id)continue;
    const hit=first.point.clone(),normal=meshHit.face?.normal.clone().transformDirection(meshHit.object.matrixWorld),facing=normal?Math.abs(normal.dot(dir)):0;
    const status=g.directFireStatus(g.get(d.entityId),g.get(id),{aimPoint:hit});if(!status.aimValid)continue;
    candidates.push({point:model.worldToLocal(hit).toArray(),score:facing-Math.abs(fy-.4)*.15-Math.abs(fz-.5)*.15});
   }
   candidates.sort((a,b)=>b.score-a.score);if(!candidates.length)throw Error('No unobstructed mesh surface in sampled target envelope '+id);
   return{localPoint:candidates[0].point,candidates:candidates.length,bounds:[box.min.toArray(),box.max.toArray()]};
  },id);
  const attempts=await p.evaluate(()=>WarData.U[ModernFront.game.get(ModernFront.direct.entityId).kind].space?64:32);
  for(let attempt=0;attempt<attempts;attempt++){
   const delta=await p.evaluate(({id,point})=>{const d=ModernFront.direct,model=ModernFront.renderer.objects.get(id),world=model.localToWorld(new THREE.Vector3(...point));const local=world.sub(d.eye).normalize().applyQuaternion(d.camera.quaternion.clone().invert()),sens=.002/(d.opticalActive()?d.scopeState().zoom:1),u=WarData.U[ModernFront.game.get(d.entityId).kind],flight=u.air&&!u.space;return{dx:Math.atan2(local.x,-local.z)/sens,dy:(flight?1:-1)*Math.asin(Math.max(-1,Math.min(1,local.y)))/sens};},{id,point:selected.localPoint});
   if(Math.hypot(delta.dx,delta.dy)<.08)break;
   const scale=Math.min(1,250/Math.max(Math.abs(delta.dx),Math.abs(delta.dy)));cursor.x+=delta.dx*scale;cursor.y+=delta.dy*scale;await p.mouse.move(cursor.x,cursor.y,{steps:Math.max(1,Math.ceil(Math.hypot(delta.dx,delta.dy)*scale/12))});await p.waitForTimeout(90);
  }
  await p.waitForFunction(id=>{const a=ModernFront.direct.aimResult;return(a?.observedTarget||a?.target)?.id===id;},id,{timeout:4000});
 }catch(error){report.aimFailure={id,selected,diagnostic:await p.evaluate(id=>{const d=ModernFront.direct,g=ModernFront.game,a=d.aimResult,e=g.get(id),o=ModernFront.renderer.objects.get(id);return{target:e?{id:e.id,kind:e.kind,x:e.x,y:e.y,altitude:e.altitude,angle:e.angle,hp:e.hp}:null,visible:o?.visible,camera:d.camera.position.toArray(),direction:d.camera.getWorldDirection(new THREE.Vector3()).toArray(),fov:d.camera.fov,zoom:d.scopeState().zoom,observed:a?.observedTarget?.id,accepted:a?.target?.id,point:a?.point?.toArray(),occluded:a?.occluded,contact:d.el('orbit-contact').textContent,locked:!!document.pointerLockElement};},id).catch(e=>({error:e.message}))};throw error;}
}
async function verifyImported(){
 const result=await p.evaluate(async()=>{
  await Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]);
  const models=[['destroyer','usa'],['heli','usa'],['heli','kor'],['tank','rus']].map(([kind,faction])=>{const m=WarModels.create(kind,faction);let meshes=0,preserved=0,textured=0;const materials=[];m.traverse(o=>{if(!o.isMesh)return;meshes++;if(o.userData.preserveMaterial)preserved++;for(const mat of Array.isArray(o.material)?o.material:[o.material]){if(mat.map)textured++;materials.push({name:mat.name,type:mat.type,map:!!mat.map,roughness:mat.roughness,metalness:mat.metalness,color:mat.color?.getHexString()});}});return{key:kind+'_'+faction,source:m.userData.assetSource,license:m.userData.license,author:m.userData.author,assetPath:m.userData.assetPath,meshes,preserved,textured,materials};});
  return{ship:WarImported.status,air:WarImportedAir.status,ground:WarImportedGround.status,errors:[...WarImported.errors,...WarImportedAir.errors,...WarImportedGround.errors],models};
 });
 for(const key of ['ship','air','ground'])assert.equal(result[key],'ready',key+' must not fall back to procedural models');assert.deepEqual(result.errors,[]);
 for(const model of result.models){assert.match(model.source,/^https:\/\/sketchfab\.com\//);assert.equal(model.license,'CC-BY-4.0');assert.ok(model.author);assert.match(model.assetPath,/\.glb$/);assert.ok(model.meshes>0);assert.equal(model.preserved,model.meshes);assert.ok(model.materials.every(m=>m.type&&m.color));if(!model.key.startsWith('heli_'))assert.ok(model.textured>0,model.key+' textures must load');}
 report.imported=result;checked('全部许可导入模型ready，真实来源/CC BY/署名/材质保留已核验');
}
async function sample(ids){return p.evaluate(({actor,target})=>{const g=ModernFront.game,d=ModernFront.direct,s=g.get(actor).kind==='operator'?g.operatorStatus(actor):null;return{time:g.time,count:window.__rightButtonShots.filter(s=>s.sourceId===actor).length,hp:g.get(target).hp,ammo:s?s.slots[s.activeSlot].ammo:null,fire:g.directControl?.input.fire,active:d.opticalActive(),latched:d.scopeState().latched,zoom:d.scopeState().zoom,locked:document.pointerLockElement===d.r.canvas};},ids);}
async function waitSim(seconds){const start=await p.evaluate(()=>ModernFront.game.time);await p.waitForFunction(({start,seconds})=>ModernFront.game.time>=start+seconds,{start,seconds},{timeout:Math.max(10000,seconds*4000)});}
async function assertStopped(ids,label){
 await p.waitForFunction(()=>ModernFront.game.directControl.input.fire===false,null,{timeout:2000});
 // Consume at most an already captured input edge, then wait out every launched projectile.
 await waitSim(.15);const settled=await sample(ids);
 await p.waitForFunction(id=>!ModernFront.game.effects.some(f=>f.type==='shot'&&f.sourceId===id),ids.actor,{timeout:15000});const landed=await sample(ids);
 const cadence=await p.evaluate(id=>{const g=ModernFront.game,e=g.get(id);return e.kind==='operator'?g.operatorWeapon(e).fireInterval:WarData.U[e.kind].reload;},ids.actor);await waitSim(Math.max(1.2,cadence*1.2));const after=await sample(ids);
 assert.equal(after.count,settled.count,label+' emitted a new shot after release');assert.equal(after.hp,landed.hp,label+' HP changed after in-flight shots settled');assert.equal(after.fire,false);return{settled,landed,after};
}
async function ensureAmmo(ids){
 const read=()=>p.evaluate(id=>{const g=ModernFront.game,e=g.get(id);if(e?.kind!=='operator')return null;const s=g.operatorStatus(id),a=s.slots[s.activeSlot];return{ammo:a.ammo,reserve:a.reserve,reloadRemaining:s.reloadRemaining,weaponId:a.weaponId};},ids.actor);
 let before=await read();if(!before)return;
 if(before.reloadRemaining>0){await p.waitForFunction(id=>ModernFront.game.operatorStatus(id).reloadRemaining===0,ids.actor,{timeout:15000});before=await read();}
 if(before.ammo>=8)return;
 assert.ok(before.reserve>0,'Operator fixture exhausted reserve ammunition; no ammo injection is allowed');
 await p.keyboard.press('r');
 await p.waitForFunction(({id,ammo})=>{const s=ModernFront.game.operatorStatus(id);return s.reloadRemaining>0||s.slots[s.activeSlot].ammo>ammo;},{id:ids.actor,ammo:before.ammo},{timeout:2000});
 await p.waitForFunction(id=>{const s=ModernFront.game.operatorStatus(id);return s.reloadRemaining===0&&s.slots[s.activeSlot].ammo>0;},ids.actor,{timeout:15000});
 (report.reloads??=[]).push({actor:ids.actor,before,after:await read(),input:'actual keyboard R; held mouse buttons unchanged'});
}
async function continuedAfterRelease(ids,releaseButton,label){
 await ensureAmmo(ids);
 const before=await sample(ids);await p.mouse.up({button:releaseButton});await p.waitForFunction(()=>ModernFront.game.directControl.input.fire===true,null,{timeout:2000});
 await p.waitForFunction(({id,count})=>window.__rightButtonShots.filter(s=>s.sourceId===id).length>count,{id:ids.actor,count:before.count},{timeout:15000});
 await p.waitForFunction(({id,hp})=>ModernFront.game.get(id).hp<hp,{id:ids.target,hp:before.hp},{timeout:15000});checked(label+'：释放右键后左键仍产生真实射击与伤害');
}
(async()=>{try{
 fs.mkdirSync('.tmp',{recursive:true});fs.mkdirSync('screenshots',{recursive:true});fs.mkdirSync('docs',{recursive:true});
 host=desktop?await _electron.launch({executablePath:require('./desktop-path.cjs').executable,args:[],timeout:45000}):await chromium.launch({headless:true,channel:'chromium'});
 p=desktop?await host.firstWindow():await host.newPage({viewport:{width:1600,height:1000}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});if(!desktop)await p.goto(process.env.GAME_URL||'http://127.0.0.1:8765');await p.waitForFunction(()=>window.ModernFront);await verifyImported();await p.locator('#enemies').selectOption('1');await p.locator('#start').click();
 report.runtime=await p.evaluate(()=>{window.__rmbFocusEvents=[];const record=(name,e)=>{window.__rmbFocusEvents.push({name,trusted:e.isTrusted,time:performance.now(),focused:document.hasFocus(),locked:!!document.pointerLockElement,kind:ModernFront.game.get(ModernFront.direct.entityId)?.kind});if(window.__rmbFocusEvents.length>80)window.__rmbFocusEvents.shift();};const originalExit=document.exitPointerLock;document.exitPointerLock=function(...args){record('exitPointerLock-call',{isTrusted:false});window.__rmbFocusEvents.at(-1).stack=new Error('Pointer unlock caller').stack;return originalExit.apply(this,args);};for(const name of ['blur','focus'])addEventListener(name,e=>record(name,e));document.addEventListener('pointerlockchange',e=>record('pointerlockchange',e));addEventListener('keydown',e=>{if(['KeyV','Escape'].includes(e.code))record(e.code,e);},true);return{userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],version:document.title};});
 for(const [kind,height]of domainCases){
  report.stage=kind+' fixture';const ids=await fixture(kind,height),initial=await state(),domain={kind,ids,magnifications:[]};assert.equal(initial.active,false);assert.equal(await p.evaluate(()=>ModernFront.direct.scopeState().latched),false);
  // RMB must never launch a new shot. Every zoom then requires a real LMB hold to damage.
  const beforeRMB=await sample(ids);await p.mouse.down({button:'right'});await p.waitForFunction(()=>ModernFront.direct.opticalActive()&&!ModernFront.game.directControl.input.fire);const zooms=kind==='orbital'?[4,8,16,32,64]:[1.5,2,4,8,16];
  for(let i=0;i<zooms.length;i++){
   if(i)await p.mouse.wheel(0,-120);await p.waitForFunction(z=>ModernFront.direct.scopeState().zoom===z,zooms[i]);await aimAt(ids.target);await ensureAmmo(ids);const quiet=await sample(ids);if(i===0){assert.equal(quiet.count,beforeRMB.count,'initial RMB press launched a shot');assert.equal(quiet.hp,beforeRMB.hp,'initial RMB press damaged target');assert.equal(quiet.ammo,beforeRMB.ammo,'initial RMB press spent ammo');}await waitSim(1.2);const before=await sample(ids);assert.equal(before.fire,false);assert.equal(before.count,quiet.count,'RMB alone emitted a shot at '+zooms[i]+'x');assert.equal(before.hp,quiet.hp,'RMB alone damaged target');assert.equal(before.ammo,quiet.ammo,'RMB alone spent ammunition');await p.mouse.down({button:'left'});
   await p.waitForFunction(({id,count})=>window.__rightButtonShots.filter(s=>s.sourceId===id).length>count,{id:ids.actor,count:before.count},{timeout:15000});await p.waitForFunction(({id,hp})=>ModernFront.game.get(id).hp<hp,{id:ids.target,hp:before.hp},{timeout:15000});
   const after=await sample(ids),view=await state();assert.equal(after.fire,true);assert.equal(after.latched,false,'RMB must not latch V');assert.equal(view.range,initial.range);assert.equal(after.zoom,zooms[i]);assert.ok(Math.abs(Math.tan(view.fov*Math.PI/360)*zooms[i]-Math.tan(70*Math.PI/360))<.0001);assert.match(view.contact,/实际距离.*射程.*射程内/);await p.mouse.up({button:'left'});const stop=await assertStopped(ids,kind+' LMB release with RMB held '+zooms[i]+'x');assert.equal(stop.after.active,true,'RMB must keep optics after LMB release');domain.magnifications.push({zoom:zooms[i],quiet,before,after,view,stop});
  }
  if(['tank','orbital'].includes(kind)){const screenshot=`screenshots/right-button-fire-${kind}-${suffix}.png`;await p.screenshot({path:screenshot});domain.screenshot=screenshot;}
  await p.mouse.up({button:'right'});await p.waitForFunction(()=>!ModernFront.direct.opticalActive());domain.stop=await assertStopped(ids,kind+' RMB');checked(kind+'：无V，单RMB五倍率均不发弹、不扣血、不耗弹；配合LMB真实伤害，松开LMB后停止新弹且保留瞄准');
  // V is an observation latch, not a fire button.
  report.stage=kind+' V observation on';const quiet=await sample(ids);await observationKey(true,report.stage);await waitSim(1.5);const vOnly=await sample(ids);assert.equal(vOnly.fire,false);assert.equal(vOnly.count,quiet.count);assert.equal(vOnly.hp,quiet.hp);report.stage=kind+' V observation off';await observationKey(false,report.stage);domain.vOnly=vOnly;
  // Representative personnel/vehicle chord paths; firing always follows LMB, aiming follows RMB.
  if(kind==='operator'||kind==='tank'){
  // Keep the other button down through each release; never synthesize d.fire or sim inputs.
  await p.mouse.down({button:'left'});await p.mouse.down({button:'right'});await aimAt(ids.target);await p.mouse.up({button:'left'});await assertStopped(ids,kind+' LMB→RMB release left');assert.equal(await p.evaluate(()=>ModernFront.direct.opticalActive()),true);await p.mouse.up({button:'right'});await assertStopped(ids,kind+' overlap right last');
  await p.mouse.down({button:'right'});await p.mouse.down({button:'left'});await aimAt(ids.target);await continuedAfterRelease(ids,'right',kind+' RMB→LMB');await p.mouse.up({button:'left'});await assertStopped(ids,kind+' overlap left last');
  }
  assert.equal(await p.evaluate(()=>ModernFront.direct.scopeState().latched),false);report.domains.push(domain);report.shots.push({kind,events:await p.evaluate(()=>window.__rightButtonShots)});
 }
 await p.keyboard.press('e');await p.waitForFunction(()=>!ModernFront.direct.active);assert.deepEqual(report.errors,[]);assert.equal(report.domains.length,domainCases.length);report.focusEvents=await p.evaluate(()=>window.__rmbFocusEvents);report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;if(p){report.finalState=await p.evaluate(()=>{const d=ModernFront.direct,g=ModernFront.game;return{kind:g.get(d.entityId)?.kind,focused:document.hasFocus(),focusEvents:window.__rmbFocusEvents,paused:ModernFront.paused,locked:!!document.pointerLockElement,active:d.active,fire:d.fire,ads:d.ads,scope:d.scopeState(),input:g.directControl?.input,shots:window.__rightButtonShots?.slice(-10)};}).catch(e=>({error:e.message}));await p.screenshot({path:'.tmp/right-button-fire-failure-'+suffix+'.png'}).catch(()=>{});}}
finally{fs.writeFileSync('docs/right-button-fire-'+suffix+'-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await host?.close();}})();
