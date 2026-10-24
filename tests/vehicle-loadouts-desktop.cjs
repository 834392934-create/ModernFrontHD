/* Native vehicle-station acceptance: run serially with GPU work stopped.
 * node tests/vehicle-loadouts-desktop.cjs
 * Fixtures position real entities, suppress strategic production, and set camera
 * yaw/pitch against real meshes. RTS selection/dropdown, possession, brackets,
 * RMB, LMB and flight movement use real Playwright input. The observer calls the
 * original Game emitter unchanged; no fabricated shots, damage or clock edits.
 * This checks controlled combat/input, not real-model fidelity or battle FPS. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
process.chdir(root);
const report={recordedAt:new Date().toISOString(),environment:'native Electron',scope:'Actual RTS weapon UI and native FPS inputs; controlled mesh aiming and cover fixtures; five projectile stations plus real carrier sorties. Balanced game distances, no claim of mouse-only acquisition, exact equipment fidelity or sustained performance.',rangeMode:'balanced',checks:[],weapons:[],rejections:[],screenshots:[],errors:[]};
let host,p;
const checked=text=>{report.checks.push(text);console.log(text);};
async function pause(value){
 if(await p.evaluate(()=>ModernFront.paused)!==value)await p.keyboard.press(await p.evaluate(()=>ModernFront.direct.active?'KeyP':'Space'));
 await p.waitForFunction(value=>ModernFront.paused===value,value);
}
async function lock(){
 if(await p.evaluate(()=>document.hasFocus()&&document.pointerLockElement===ModernFront.direct.r.canvas))return;
 report.focusReacquisitions=(report.focusReacquisitions||0)+1;
 await host.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];if(w.isMinimized())w.restore();w.show();w.focus();});
 await p.bringToFront();await p.waitForFunction(()=>document.hasFocus(),null,{timeout:3000});
 if(await p.evaluate(()=>document.pointerLockElement===ModernFront.direct.r.canvas))return;
 for(let i=0;i<3;i++){
  await host.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());await p.waitForTimeout(1350);
  const xy=await p.evaluate(()=>[innerWidth/2,innerHeight*.46]);await p.mouse.click(...xy);
  try{await p.waitForFunction(()=>document.pointerLockElement===ModernFront.direct.r.canvas,null,{timeout:1800});return;}catch{if(i===2)throw Error('Real mouse click failed to acquire native pointer lock');}
 }
}
async function exit(){
 await p.mouse.up({button:'left'});await p.mouse.up({button:'right'});
 if(await p.evaluate(()=>ModernFront.direct.active)){await p.keyboard.press('KeyE');await p.waitForFunction(()=>!ModernFront.direct.active&&!document.pointerLockElement);}
}
async function possess(id){
 await p.keyboard.press('KeyJ');await p.waitForFunction(()=>ModernFront.direct.vehicleMenu.open);
 await p.locator('#vehicle-search').fill('');await p.locator('#vehicle-group').selectOption('all');
 await p.locator(`[data-player-unit="${id}"]`).click();
 await p.waitForFunction(id=>ModernFront.direct.active&&ModernFront.direct.entityId===id,id);
 // Possession normally enables friendly strategy AI. Isolate this controlled
 // test from unrelated production without replacing AI or combat functions.
 await p.evaluate(()=>ModernFront.game.teams.forEach(t=>{t.aiClock=1e9;}));
}
async function observe(){
 await p.evaluate(()=>{
  const g=ModernFront.game,r=ModernFront.renderer,old=window.__loadoutAudit;
  if(old){old.stop=true;if(old.game===g){g.emitShot=old.originalEmit;g.spend=old.originalSpend;}}
  const a=window.__loadoutAudit={game:g,stop:false,originalEmit:g.emitShot,originalSpend:g.spend,shots:[],live:[],missions:[],spends:[],planes:{},inputs:[],hp:[],watchedTarget:null,lastHP:null};
  if(window.__loadoutInputObserver)removeEventListener('mousedown',window.__loadoutInputObserver,true);
  window.__loadoutInputObserver=event=>a.inputs.push({button:event.button,trusted:event.isTrusted,time:g.time,locked:document.pointerLockElement===r.canvas,sourceId:ModernFront.direct.entityId});
  addEventListener('mousedown',window.__loadoutInputObserver,true);
  g.spend=function(...args){const before=this.teams[args[0]]?.money,result=a.originalSpend.apply(this,args);if(result!==null)a.spends.push({team:args[0],requested:args[1],paid:before-this.teams[args[0]].money,time:this.time});return result;};
  g.emitShot=function(...args){
   const actor=args[0],target=args[1],model=r.objects.get(actor?.id),weapon=this.vehicleWeapon(actor,target),anchor=WarWeaponEffects.weaponAnchor(model,weapon,{kind:actor?.kind,faction:this.teams[actor?.team]?.faction});
   const anchorPosition=anchor?.getWorldPosition(new THREE.Vector3()).toArray()||null;
   const before=new Set(this.effects),previousMission=actor?.airWing?.mission,result=a.originalEmit.apply(this,args);
   for(const f of this.effects)if(f.type==='shot'&&!before.has(f)){
    a.live.push(f);a.shots.push({sourceId:f.sourceId,sourceKind:f.sourceKind,carrierOriginId:actor?.carrierOriginId??null,targetId:f.target,weaponId:f.weaponId,weaponFamily:f.weaponFamily,muzzleClass:f.weaponMuzzleClass,domains:f.weaponDomains,rocket:!!f.rocket,beam:!!f.beam,damage:f.damage,time:this.time,ttl:f.ttl,from:[f.x,f.sourceHeight,f.y],to:[f.tx,f.targetHeight,f.ty],anchor:anchorPosition,anchorSource:anchor?.userData.source||'existing-model-muzzle',anchorApproximate:!!anchor?.userData.approximate,direct:ModernFront.direct.entityId===f.sourceId&&ModernFront.direct.active});
   }
   if(actor?.kind==='carrier'&&actor.airWing?.mission!==previousMission&&actor.airWing?.mission)a.missions.push({sourceId:actor.id,time:this.time,mission:{...actor.airWing.mission},accepted:result});
   return result;
  };
  function frame(){
   if(a.stop)return;
   for(const e of g.entities)if(e.hp>0&&e.carrierOriginId){
    const item=a.planes[e.id]??={id:e.id,kind:e.kind,carrierOriginId:e.carrierOriginId,firstSeen:g.time,phases:[],maxAltitude:-Infinity};
    if(!item.phases.includes(e.flight?.phase))item.phases.push(e.flight?.phase);item.maxAltitude=Math.max(item.maxAltitude,g.entityAltitude(e));
   }
   const target=g.get(a.watchedTarget);
   if(target&&target.hp!==a.lastHP){a.hp.push({time:g.time,hp:target.hp});a.lastHP=target.hp;}
   requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 });
}
async function snapshot(){return p.evaluate(()=>{
 const g=ModernFront.game,d=ModernFront.direct,a=window.__loadoutAudit,e=g.get(d.entityId);
 return{time:g.time,tick:g.tick,paused:ModernFront.paused,active:d.active,sourceId:e?.id,kind:e?.kind,weaponId:e?.weaponId,position:e?[e.x,g.entityAltitude(e),e.y]:null,fire:d.fire,ads:d.ads,locked:document.pointerLockElement===d.r.canvas,focused:document.hasFocus(),status:d.active?d.orbitTargetStatus():null,shots:a?.shots||[],missions:a?.missions||[],spends:a?.spends||[],planes:a?Object.values(a.planes):[],inputs:a?.inputs||[],hp:a?.hp||[],money:g.teams[0].money,carrier:e?.kind==='carrier'?WarCarrierOperations.status(g,e):null};
 });}
async function fixture({kind='destroyer',faction='usa',targetKind='destroyer',dx=320,dy=0,money=0}={}){
 await exit();await pause(true);
 const state=await p.evaluate(options=>{
  const g=ModernFront.game,r=ModernFront.renderer;
  if(window.__loadoutAudit)window.__loadoutAudit.stop=true;
  g.entities=[];g.effects=[];g.ore=[];g.result=null;g.buffs=new Set(['vision']);g.options.rangeMode='balanced';
  g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.teams[0].faction=options.faction;g.teams[1].faction='chn';
  g.teams.forEach(t=>{t.alive=true;t.aiClock=1e9;t.money=0;t.queue=[];t.buildQueue=[];});g.teams[0].money=options.money;
  g.spawn(0,'hq',300,3200);g.spawn(1,'hq',5700,3500);
  const actor=g.spawn(0,options.kind,1800,240),target=g.spawn(1,options.targetKind,1800+options.dx,240+options.dy);
  for(const e of [actor,target]){const u=WarData.U[e.kind];e.angle=e.pitch=e.roll=0;e.altitude=u.underwater?-55:u.air?120:u.naval?2:0;}
  target.disabled=1e9;target.hp=target.maxHp=100000;
  // Keep actual seabed, shore and water; remove unrelated decorative cover.
  for(const o of [...r.world.children])if(o!==r.water&&o.name!=='terrain-with-seabed')r.world.remove(o);
  r.vegetationColliders=[];g.directObstacles=[];g.spatial.rebuild(g.entities);g.updateFog();
  r.camera.x=actor.x;r.camera.y=actor.y;r.camera.zoom=1.3;r.syncCamera();
  return{id:actor.id,targetId:target.id,kind:actor.kind,faction:options.faction,targetKind:target.kind,targetDomain:g.targetDomain(target.kind),distance:g.engagementDistance(actor,target),initialHP:target.hp,initialMoney:options.money};
 },{kind,faction,targetKind,dx,dy,money});
 await p.waitForFunction(id=>ModernFront.renderer.objects.has(id),state.id);
 // Actual RTS canvas click: no write to the application's selection state.
 const screen=await p.evaluate(id=>ModernFront.renderer.entityScreen(ModernFront.game.get(id)),state.id);
 await p.mouse.click(screen.x,screen.y);await p.waitForFunction(id=>ModernFront.selection.length===1&&ModernFront.selection[0]===id,state.id);
 await p.locator('#vehicle-weapon-picker').waitFor({state:'visible'});
 await observe();await p.evaluate(id=>{window.__loadoutAudit.watchedTarget=id;},state.targetId);
 return state;
}
async function selectStation(state,station){
 const id=state.kind+':'+station;
 await p.locator('#vehicle-weapon').selectOption(id);
 await p.waitForFunction(({source,id})=>ModernFront.game.get(source).weaponId===id,{source:state.id,id});
 const item=await p.evaluate(({source,id})=>{const g=ModernFront.game,e=g.get(source),w=g.vehicleWeapons(e).find(w=>w.id===id);return{...w,rangeProfile:g.weaponRangeProfile(e,w),uiValue:document.getElementById('vehicle-weapon').value,uiLabel:document.getElementById('vehicle-weapon').selectedOptions[0].textContent};},{source:state.id,id});
 assert.equal(item.uiValue,id);assert.ok(item.uiLabel.includes(item.name));state.weapon=item;
 // Leave the SELECT through a real canvas click: game hotkeys intentionally
 // ignore focused form controls, including the newly added weapon dropdown.
 const screen=await p.evaluate(id=>ModernFront.renderer.entityScreen(ModernFront.game.get(id)),state.id);await p.mouse.click(screen.x,screen.y);
 await possess(state.id);await pause(false);await lock();
 return item;
}
async function aimTarget(id,{legal=true}={}){
 await p.waitForFunction(id=>ModernFront.renderer.objects.get(id)?.visible,id);
 // Geometry fixture only: both camera and weapon-origin rays remain production
 // raycasts against the actual model, terrain and any explicit cover mesh.
 let result;
 for(let settle=0;settle<3;settle++){
  result=await p.evaluate(({id,legal})=>{
   const d=ModernFront.direct,o=d.r.objects.get(id);o.updateWorldMatrix(true,true);
   const b=new THREE.Box3().setFromObject(o),size=b.getSize(new THREE.Vector3());
   for(const fx of [.5,.3,.7])for(const fy of [.4,.55,.25,.7,.85])for(const fz of [.5,.35,.65]){
    const point=new THREE.Vector3(b.min.x+size.x*fx,b.min.y+size.y*fy,b.min.z+size.z*fz);
    for(let i=0;i<7;i++){const delta=point.clone().sub(d.eye);d.yaw=Math.atan2(delta.z,delta.x);d.pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));d.updateCamera();}
    const a=d.aim();
    if((legal?a.target?.id:a.observedTarget?.id)===id&&!a.occluded){d.aimResult=a;d.lastAimTime=0;return{point:a.point.toArray(),origin:a.origin.toArray(),targetId:a.target?.id??null,observedTarget:a.observedTarget?.id??null,occluded:a.occluded,status:d.orbitTargetStatus()};}
   }
   throw Error('No actual '+(legal?'legal':'observed')+' target mesh ray for entity '+id);
  },{id,legal});
  if(settle<2)await p.waitForTimeout(90);
 }
 return result;
}
async function brackets(state){
 const before=await snapshot(),ids=await p.evaluate(id=>['auto',...ModernFront.game.vehicleWeapons(ModernFront.game.get(id)).map(w=>w.id)],state.id),index=ids.indexOf(state.weapon.id);
 await p.keyboard.press('BracketRight');await p.waitForFunction(id=>ModernFront.game.get(ModernFront.direct.entityId).weaponId===id,ids[(index+1)%ids.length]);
 const right=(await snapshot()).weaponId;
 await p.keyboard.press('BracketLeft');await p.waitForFunction(id=>ModernFront.game.get(ModernFront.direct.entityId).weaponId===id,state.weapon.id);
 const after=await snapshot();assert.equal(after.shots.length,before.shots.length);assert.equal(after.missions.length,before.missions.length);assert.equal(after.fire,false);
 return{right,left:after.weaponId};
}
async function adsWithoutFire(state,{legal=true}={}){
 const before=await snapshot();await p.mouse.down({button:'right'});
 await p.waitForFunction(()=>ModernFront.direct.ads&&ModernFront.direct.opticalActive());const aim=await aimTarget(state.targetId,{legal});await p.waitForTimeout(250);
 const after=await snapshot();assert.equal(after.fire,false);assert.equal(after.shots.length,before.shots.length,'RMB cannot emit a projectile');assert.equal(after.missions.length,before.missions.length,'RMB cannot dispatch aircraft');
 assert.equal(await p.evaluate(id=>ModernFront.game.get(id).hp,state.targetId),state.initialHP,'RMB cannot damage target');
 assert.ok(after.inputs.some(e=>e.button===2&&e.trusted&&e.locked),'RMB assertion requires trusted native input');
 return{aim,status:after.status,shotCount:after.shots.length,missionCount:after.missions.length};
}
async function actualShot(state){
 const count=(await snapshot()).shots.length;await p.mouse.down({button:'left'});
 try{await p.waitForFunction(({id,count})=>window.__loadoutAudit.shots.slice(count).some(f=>f.sourceId===id),{id:state.id,count},{timeout:8000});}
 finally{await p.mouse.up({button:'left'});}
 const s=await snapshot(),shot=s.shots.slice(count).find(f=>f.sourceId===state.id);
 assert.ok(s.inputs.some(e=>e.button===0&&e.trusted&&e.locked&&e.sourceId===state.id),'Projectile requires a trusted native LMB input');
 assert.equal(shot.weaponId,state.weapon.id);assert.equal(shot.weaponFamily,state.weapon.family);assert.equal(shot.targetId,state.targetId);
 assert.deepEqual(shot.domains,state.weapon.targetDomains);assert.equal(shot.rocket,state.weapon.rocket);assert.equal(shot.beam,state.weapon.beam);
 assert.ok(shot.from.concat(shot.to).every(Number.isFinite));assert.ok(shot.damage>0);assert.ok(shot.anchor);
 shot.muzzleError=Math.hypot(...shot.from.map((v,i)=>v-shot.anchor[i]));assert.ok(shot.muzzleError<=.1,'Actual selected station must match projectile origin: '+shot.muzzleError);
 return shot;
}
async function screenshot(label,extra={}){
 const file=`screenshots/vehicle-loadouts-${label}-desktop.png`,state=await snapshot();await p.screenshot({path:path.join(root,file)});
 report.screenshots.push({file,time:state.time,sourceId:state.sourceId,weaponId:state.weaponId,paused:state.paused,...extra});return file;
}
async function projectileCase(station,targetKind,dx,dy=0){
 report.stage='projectile '+station;const state=await fixture({targetKind,dx,dy});await selectStation(state,station);
 const switchKeys=await brackets(state),rmb=await adsWithoutFire(state);assert.equal(rmb.status.canFire,true);assert.equal(rmb.status.rangeState,'in');
 const shot=await actualShot(state);
 if(station==='anti_ship'){
  // Pause through the ordinary key action, never rewind an expired projectile.
  await pause(true);await screenshot('anti-ship',{realShot:shot});await pause(false);await lock();
 }
 await p.mouse.up({button:'right'});
 await p.waitForFunction(({id,hp})=>ModernFront.game.get(id)?.hp<hp,{id:state.targetId,hp:state.initialHP},{timeout:10000});
 const after=await snapshot(),hp=await p.evaluate(id=>ModernFront.game.get(id).hp,state.targetId);
 assert.ok(hp<state.initialHP,'Real projectile must settle actual target damage');
 const endpoints=await p.evaluate(index=>{const f=window.__loadoutAudit.live[index];return{from:[f.x,f.sourceHeight,f.y],to:[f.tx,f.targetHeight,f.ty]};},after.shots.findIndex(f=>f.sourceId===state.id));
 assert.deepEqual(endpoints.from,shot.from);assert.deepEqual(endpoints.to,shot.to);
 report.weapons.push({...state,switchKeys,rmb,shot,damage:state.initialHP-hp,hpEvidence:after.hp});checked(station+': RTS dropdown / [ ] / RMB no fire / native LMB / real damage');
}
async function reject(state,label,expectedReason){
 const before=await snapshot();assert.equal(before.status.canFire,false);assert.equal(before.status.reason,expectedReason);
 await p.mouse.down({button:'left'});try{await p.waitForTimeout(550);}finally{await p.mouse.up({button:'left'});}
 await p.mouse.up({button:'right'});await p.waitForTimeout(200);
 const after=await snapshot();assert.equal(after.shots.length,before.shots.length,label+' must not emit a shot');assert.equal(after.missions.length,before.missions.length,label+' must not dispatch a mission');
 assert.equal(after.spends.length,before.spends.length,label+' must not pay for an invalid sortie');assert.equal(after.planes.length,before.planes.length,label+' must not launch an aircraft');
 assert.ok(after.money>=before.money,'Only normal passive income may change funds during rejected fire');
 assert.equal(await p.evaluate(id=>ModernFront.game.get(id).hp,state.targetId),state.initialHP,label+' must not damage target');
 assert.ok(after.inputs.some(e=>e.button===0&&e.trusted&&e.locked),'Rejection was tested with actual native LMB');
 report.rejections.push({label,...state,before,after});checked(label+': actual LMB rejected with no damage or aircraft task');
}
async function wrongDomains(){
 report.stage='wrong-domain SAM';let state=await fixture({targetKind:'tank',dx:150,dy:230});await selectStation(state,'sam');await adsWithoutFire(state,{legal:false});await reject(state,'SAM against armor','domain');
 report.stage='wrong-domain Korean carrier';state=await fixture({kind:'carrier',faction:'kor',targetKind:'tank',dx:150,dy:230,money:100000});await selectStation(state,'air_wing');await adsWithoutFire(state,{legal:false});await reject(state,'Korean escort helicopter mission against armor','domain');
}
async function carrierCover(){
 report.stage='carrier real muzzle cover';const state=await fixture({kind:'carrier',targetKind:'destroyer',dx:600,money:100000});await selectStation(state,'air_wing');
 await p.keyboard.press('KeyC');await p.waitForFunction(()=>ModernFront.direct.exteriorActive());await aimTarget(state.targetId);
 state.cover=await p.evaluate(id=>{
  const d=ModernFront.direct,r=d.r,a=d.aim(),direction=d.camera.getWorldDirection(new THREE.Vector3());
  for(const t of [.15,.25,.4,.55,.7]){
   const center=a.origin.clone().lerp(a.point,t),onEye=d.eye.clone().addScaledVector(direction,center.clone().sub(d.eye).dot(direction)),gap=center.distanceTo(onEye);if(gap<.5)continue;
   const size=Math.min(5,gap*.5),mesh=new THREE.Mesh(new THREE.BoxGeometry(size,size,size),new THREE.MeshStandardMaterial({color:0x806d51}));mesh.name='native-carrier-muzzle-cover';mesh.position.copy(center);r.world.add(mesh);mesh.updateMatrixWorld(true);
   const next=d.aim(),camera=d.cast(d.eye,direction,20000);
   if(camera?.entity?.id===id&&next.observedTarget?.id===id&&!next.target&&next.occluded){d.aimResult=next;d.lastAimTime=0;return{size,gap,position:center.toArray(),cameraTarget:camera.entity.id,occluded:next.occluded,originMode:next.originMode};}
   r.world.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();
  }
  throw Error('Cannot construct separated real camera/flight-deck cover fixture');
 },state.targetId);
 await p.waitForTimeout(100);await reject(state,'Visible enemy with flight-deck launch origin blocked','blocked');
}
async function carrierSortie(){
 report.stage='carrier sortie and actual child hit';const state=await fixture({kind:'carrier',targetKind:'destroyer',dx:600,money:100000});await selectStation(state,'air_wing');
 const rmb=await adsWithoutFire(state);assert.equal(rmb.status.canFire,true);assert.equal(state.weapon.damage,0);assert.equal(state.weapon.action,'airWing');
 await p.mouse.down({button:'left'});
 try{await p.waitForFunction(id=>window.__loadoutAudit.missions.some(m=>m.sourceId===id&&m.accepted),state.id,{timeout:4000});}
 finally{await p.mouse.up({button:'left'});await p.mouse.up({button:'right'});}
 await p.waitForFunction(id=>Object.values(window.__loadoutAudit.planes).some(e=>e.carrierOriginId===id&&e.phases.includes('prepare')),state.id,{timeout:10000});
 await p.waitForFunction(id=>Object.values(window.__loadoutAudit.planes).some(e=>e.carrierOriginId===id&&e.phases.includes('climb')&&e.maxAltitude>100),state.id,{timeout:25000});
 await p.keyboard.press('KeyC');await p.waitForFunction(()=>ModernFront.direct.exteriorActive());
 await screenshot('carrier-sortie',{method:'Actual aircraft entities and recorded deck preparation/climb, no inserted models'});
 // Wait on normal animation/simulation ticks. The disabled high-HP enemy cannot
 // shoot back, and only the generated aircraft can produce the tested damage.
 await p.waitForFunction(({carrier,target,hp})=>window.__loadoutAudit.shots.some(f=>f.carrierOriginId===carrier&&f.targetId===target)&&ModernFront.game.get(target)?.hp<hp,{carrier:state.id,target:state.targetId,hp:state.initialHP},{timeout:55000});
 let after=await snapshot();assert.equal(after.shots.filter(f=>f.sourceId===state.id).length,0,'Carrier hull must not emit an attack shell with aircraft main weapon');
 assert.ok(after.money<state.initialMoney,'Actual launches cost resources');assert.ok(after.planes.length>0&&after.planes.length<=after.carrier.capacity);
 const childShot=after.shots.find(f=>f.carrierOriginId===state.id&&f.targetId===state.targetId);assert.ok(childShot.damage>0);assert.ok(childShot.domains.includes('naval'));
 const child=after.planes.find(e=>e.id===childShot.sourceId);assert.ok(child);assert.equal(child.kind,'naval_strike_aircraft');assert.ok(child.phases.includes('prepare')&&child.phases.includes('climb'));assert.ok(child.maxAltitude>100);
 const payments=after.spends.filter(e=>e.team===0);assert.ok(payments.length>0&&payments.every(e=>e.paid>0),'Actual production payments must be recorded');
 report.carrier={...state,rmb,mission:after.missions[0],aircraft:after.planes,childShot,payments,moneySpent:payments.reduce((sum,e)=>sum+e.paid,0),targetDamage:state.initialHP-await p.evaluate(id=>ModernFront.game.get(id).hp,state.targetId),hpEvidence:after.hp};
 report.stage='possess real launched aircraft';await pause(true);await possess(child.id);await pause(false);await lock();
 const before=await snapshot();assert.equal(before.kind,child.kind);
 assert.equal(await p.evaluate(id=>ModernFront.game.get(id).carrierOriginId,child.id),state.id);
 await p.keyboard.down('KeyW');
 try{await p.waitForFunction(({id,pos})=>{const e=ModernFront.game.get(id);return e&&Math.hypot(e.x-pos[0],e.y-pos[2])>8;},{id:child.id,pos:before.position},{timeout:5000});}
 finally{await p.keyboard.up('KeyW');}
 after=await snapshot();assert.equal(after.active,true);assert.equal(after.sourceId,child.id);assert.equal(after.locked,true);assert.ok(after.position.every(Number.isFinite));
 report.carrier.possession={id:child.id,before:before.position,after:after.position,phase:await p.evaluate(id=>ModernFront.game.get(id).flight?.phase,child.id),method:'J menu row followed by native W key; no synthetic aircraft'};
 await screenshot('carrier-aircraft-fps',{carrierId:state.id,childId:child.id});
 checked('Carrier: native LMB task / real paid deck launch and climb / child actual damage / J possession and W flight');
}
async function imports(){
 report.assets=await p.evaluate(async()=>{
  await Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]);
  return{ready:[WarImported.status,WarImportedAir.status,WarImportedGround.status],errors:[...WarImported.errors,...WarImportedAir.errors,...WarImportedGround.errors],models:[['tank','rus'],['destroyer','usa'],['heli','usa'],['heli','kor']].map(([kind,faction])=>{
   const model=WarModels.create(kind,faction);let meshes=0,preserved=0,textured=0,valid=true;
   model.traverse(node=>{if(!node.isMesh)return;meshes++;preserved+=Number(!!node.userData.preserveMaterial);for(const material of Array.isArray(node.material)?node.material:[node.material]){textured+=Number(!!material.map);valid&&=!!material.type&&!!material.color;}});
   return{key:kind+'_'+faction,source:model.userData.assetSource,license:model.userData.license,author:model.userData.author,assetPath:model.userData.assetPath,meshes,preserved,textured,valid};
  })};
 });
 assert.deepEqual(report.assets.ready,['ready','ready','ready']);assert.deepEqual(report.assets.errors,[]);
 for(const model of report.assets.models){assert.match(model.source,/^https:\/\/sketchfab\.com\//);assert.equal(model.license,'CC-BY-4.0');assert.ok(model.author);assert.match(model.assetPath,/\.glb$/);assert.ok(model.meshes>0&&model.meshes===model.preserved&&model.valid);if(!model.key.startsWith('heli_'))assert.ok(model.textured>0);}
 checked('Imported GLB ready, original asset attribution and preserved materials');
}
(async()=>{
 try{
  for(const dir of ['.tmp','docs','screenshots'])fs.mkdirSync(dir,{recursive:true});
  const {executable,appRoot}=require('./desktop-path.cjs'),profile=path.resolve(process.env.MODERN_FRONT_TEST_PROFILE||`.tmp/native-profile-vehicle-loadouts-${process.pid}`);
  fs.mkdirSync(profile,{recursive:true});report.testProfile=profile;report.executable=executable;report.packageVersion=require('../package.json').version;report.sourceHashes={};report.stage='package verification';
  for(const file of ['src/data.js','src/roster.js','src/vehicle-weapons.js','src/weapon-range-data.js','src/carrier-operations.js','src/aircraft-flight.js','src/sim.js','src/app.js','src/direct-control.js','src/player-mode.js','src/weapon-effects.js','src/battle3d.js','src/models3d.js','src/model-unit-refinement.js','src/models-imported.js','src/models-imported-ground.js','src/models-imported-air.js','assets/models/burke.glb','assets/models/t90m.glb','assets/models/ah64.glb','index.html','style.css']){
   const local=fs.readFileSync(path.join(root,file)),packaged=fs.readFileSync(path.join(appRoot,file));assert.ok(local.equals(packaged),'Packaged source mismatch: '+file);report.sourceHashes[file]=crypto.createHash('sha256').update(local).digest('hex');
  }
  host=await _electron.launch({executablePath:executable,args:['--windowed'],env:{...process.env,MODERN_FRONT_TEST_PROFILE:profile},timeout:45000});
  report.appVersion=await host.evaluate(({app})=>app.getVersion());assert.equal(report.appVersion,report.packageVersion);p=await host.firstWindow();
  p.on('pageerror',error=>report.errors.push(error.message));p.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  await p.waitForFunction(()=>window.ModernFront?.direct);await imports();
  report.runtime=await p.evaluate(()=>({userAgent:navigator.userAgent,title:document.title}));
  await p.locator('[data-map="desert"]').click();await p.locator('#enemies').selectOption('1');await p.locator('#range-mode').selectOption('balanced');await p.locator('#start').click();
  await host.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setContentSize(1600,1000);w.show();w.focus();});
  await p.waitForFunction(()=>innerWidth===1600&&innerHeight===1000);report.resolution=[1600,1000];
  for(const args of [['anti_ship','destroyer',320],['land_attack','tank',160,230],['sam','fighter',260],['torpedo','submarine',220],['naval_gun','tank',160,230]])await projectileCase(...args);
  await wrongDomains();await carrierCover();await carrierSortie();await exit();
  assert.equal(report.weapons.length,5);assert.equal(report.rejections.length,3);assert.equal(report.screenshots.length,3);assert.deepEqual(report.errors,[]);
  report.stage='complete';report.passed=true;
 }catch(error){
  report.passed=false;report.failure=error.stack;process.exitCode=1;
  if(p){report.finalState=await snapshot().catch(e=>({error:e.message}));await p.screenshot({path:path.join(root,'.tmp/vehicle-loadouts-desktop-failure.png')}).catch(()=>{});}
 }finally{
  report.finishedAt=new Date().toISOString();fs.mkdirSync(path.join(root,'docs'),{recursive:true});fs.writeFileSync(path.join(root,'docs/vehicle-loadouts-desktop-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:report.passed,stage:report.stage,weapons:report.weapons.length,rejections:report.rejections.length,screenshots:report.screenshots,errors:report.errors,failure:report.failure}));
  await host?.close();
 }
})();
