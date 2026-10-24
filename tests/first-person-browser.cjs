/* Integration fixtures create entities, but possession, movement, ADS, fire and exit
 * use browser input. Ray tests use actual model meshes and an explicit cover mesh. */
const {chromium,_electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const desktop=process.argv.includes('--desktop'),suffix=desktop?'desktop':'browser',focusOnly=process.argv.includes('--focus-only');
const report=focusOnly?JSON.parse(fs.readFileSync('docs/first-person-'+suffix+'-report.json','utf8')):{recordedAt:new Date().toISOString(),environment:desktop?'Packaged Electron':'Chromium',checks:[],possession:[],screenshots:[],errors:[],scope:'Deterministic small combat fixtures; real browser input, renderer, model raycasts and simulation. No claim of sustained combat performance or photorealism.'};
fs.mkdirSync('screenshots',{recursive:true});fs.mkdirSync('docs',{recursive:true});
let host,p;
async function shot(label){const wasLocked=await p.evaluate(()=>!!document.pointerLockElement);const file='screenshots/fps-'+label+'-'+suffix+'.png';await p.screenshot({path:file});report.screenshots.push(file);if(wasLocked)await lock();}
async function paused(value){if(await p.evaluate(()=>ModernFront.paused)!==value)await p.keyboard.press(await p.evaluate(()=>ModernFront.direct.active?'KeyP':'Space'));await p.waitForFunction(v=>ModernFront.paused===v,value);}
async function exit(key='KeyE'){if(await p.evaluate(()=>ModernFront.direct.active)){await p.keyboard.press(key);await p.waitForFunction(()=>!ModernFront.direct.active&&!ModernFront.game.directControl);await p.waitForFunction(()=>!document.pointerLockElement);}assert.equal(await p.evaluate(()=>ModernFront.renderer.cam===ModernFront.renderer.strategyCam),true);}
async function fixture(kind,combat=false,faction='chn'){
 await exit();await paused(true);
 const state=await p.evaluate(({kind,combat,faction})=>{
  const g=ModernFront.game,r=ModernFront.renderer;g.entities=[];g.effects=[];g.result=null;g.ore=[];g.teams.forEach(t=>{t.aiClock=999999;t.money=0;t.queue=[];t.buildQueue=[];});g.spawn(0,'hq',300,300);g.spawn(1,'hq',2700,1800);g.buffs.add('vision');g.directObstacles=r.vegetationColliders||[];
  g.teams[0].faction=faction;const d=WarData.U[kind],e=g.spawn(0,kind,840,d.naval?100:1000);e.angle=0;e.cool=0;
  if(!d.naval&&!d.air){outer:for(let y=800;y<1300;y+=100)for(let x=700;x<1100;x+=100){if([[-65,-65],[-65,65],[65,-65],[65,65],[0,0]].every(([dx,dy])=>g.directPositionFree(e,x+dx,y+dy))){e.x=x;e.y=y;break outer;}}}
  let target=null;if(combat){target=g.spawn(1,'tank',e.x+130,e.y);target.disabled=999999;target.cool=999999;}
  r.camera={x:e.x,y:e.y,zoom:1.4};r.syncCamera();return{id:e.id,kind,x:e.x,y:e.y,targetId:target?.id};
 },{kind,combat,faction});
 await p.waitForTimeout(100);
 if(kind==='harvester'){const pos=await p.evaluate(id=>ModernFront.renderer.entityScreen(ModernFront.game.get(id)),state.id);await p.mouse.click(pos.x,pos.y);}else await p.keyboard.press('q');
 assert.ok((await p.evaluate(()=>ModernFront.selection)).includes(state.id),'real selection '+kind);
 return state;
}
async function enter(state,button=false,requireLock=false){
 if(button)await p.locator('#drive-unit').click();else await p.keyboard.press('KeyE');
 await p.waitForFunction(id=>ModernFront.direct.active&&ModernFront.game.directControl?.id===id,state.id);
 assert.equal(await p.locator('#direct-hud').isVisible(),true);
 assert.equal(await p.evaluate(()=>ModernFront.renderer.cam===ModernFront.direct.camera),true);
 if(requireLock)await lock();
}
async function lock(){
 if(desktop)await host.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];if(w.isMinimized())w.restore();w.show();w.focus();});await p.bringToFront();await p.waitForFunction(()=>document.hasFocus(),null,{timeout:3000});
 if(await p.evaluate(()=>document.pointerLockElement===ModernFront.renderer.canvas))return;
 // Chromium briefly rejects a fresh lock after release. A new real click is required.
 for(let attempt=0;attempt<3;attempt++){
  if(desktop)await host.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());
  await p.waitForTimeout(1300);const viewport=await p.evaluate(()=>({x:innerWidth*.5,y:innerHeight*.46}));await p.mouse.click(viewport.x,viewport.y);
  try{await p.waitForFunction(()=>document.pointerLockElement===ModernFront.renderer.canvas,{},{timeout:1200});return;}catch{if(attempt===2)throw new Error('Real canvas click failed to acquire pointer lock after three retries');}
 }
}
async function position(){return p.evaluate(()=>{const d=ModernFront.direct,e=ModernFront.game.get(d.entityId);return{x:e.x,y:e.y,yaw:d.yaw,pitch:d.pitch};});}
async function aimAt(id){
 return p.evaluate(id=>{
  const d=ModernFront.direct,o=ModernFront.renderer.objects.get(id),box=new THREE.Box3().setFromObject(o),size=box.getSize(new THREE.Vector3());
  for(const fy of [.55,.35,.75,.2,.9])for(const fz of [.5,.35,.65]){
   const point=new THREE.Vector3(box.min.x+size.x*.5,box.min.y+size.y*fy,box.min.z+size.z*fz),delta=point.clone().sub(d.eye);d.yaw=Math.atan2(delta.z,delta.x);d.pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));d.recoil=0;d.updateCamera();const a=d.aim();
   if(a.target?.id===id){d.aimResult=a;d.lastAimTime=0;return{target:id,point:a.point.toArray(),yaw:d.yaw,pitch:d.pitch};}
  }
  throw new Error('Cannot find unobstructed real mesh aim for target '+id);
 },id);
}
async function nativeFocusCheck(){
 assert.ok(desktop,'Native focus check requires --desktop');
 // Playwright normally emulates a focused document even for a minimized native window.
 // Disable that emulation so the operating-system transition, not a synthetic event,
 // exercises the application's real window blur handler.
 const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});
 const state=await fixture('infantry');await enter(state,false,true);await paused(false);
 await p.evaluate(()=>{window.__fpsBlurEvents=[];addEventListener('blur',e=>window.__fpsBlurEvents.push({trusted:e.isTrusted,at:performance.now()}));});
 const nativeBefore=await host.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return{fullScreen:w.isFullScreen(),focused:w.isFocused(),minimized:w.isMinimized()};});assert.equal(nativeBefore.fullScreen,true);assert.equal(nativeBefore.focused,true);
 await p.keyboard.down('KeyW');await p.mouse.down();await p.waitForFunction(()=>ModernFront.game.directControl.input.forward===1&&ModernFront.game.directControl.input.fire);
 await host.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].minimize());
 await p.waitForFunction(()=>!document.hasFocus(),{},{timeout:5000});
 await p.waitForFunction(()=>{const d=ModernFront.direct,i=ModernFront.game.directControl?.input;return d.keys.size===0&&!d.fire&&i?.forward===0&&!i.fire;});
 const blurred=await p.evaluate(()=>{const d=ModernFront.direct,e=ModernFront.game.get(d.entityId);return{documentFocused:document.hasFocus(),events:window.__fpsBlurEvents,locked:!!document.pointerLockElement,keys:d.keys.size,fire:d.fire,input:{...ModernFront.game.directControl.input},position:[e.x,e.y]};});assert.equal(blurred.documentFocused,false);assert.ok(blurred.events.some(e=>e.trusted));
 await p.waitForTimeout(300);const nativeBlurred=await host.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return{focused:w.isFocused(),minimized:w.isMinimized()};});report.nativeFocus={nativeBefore,nativeBlurred,blurred};assert.equal(nativeBlurred.minimized,true);
 await host.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.restore();w.show();});
 for(let attempt=0;attempt<3;attempt++){await host.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());await p.bringToFront();try{await p.waitForFunction(()=>document.hasFocus(),null,{timeout:2000});break;}catch(error){if(attempt===2)throw error;}}
 await p.waitForTimeout(150);
 const restored=await p.evaluate(()=>{const d=ModernFront.direct,e=ModernFront.game.get(d.entityId);return{documentFocused:document.hasFocus(),keys:d.keys.size,fire:d.fire,input:{...ModernFront.game.directControl.input},position:[e.x,e.y]};});assert.equal(restored.documentFocused,true);assert.equal(restored.keys,0);assert.equal(restored.fire,false);assert.equal(restored.input.forward,0);assert.equal(restored.input.fire,false);assert.deepEqual(restored.position,blurred.position);
 await p.keyboard.up('KeyW');await p.mouse.up();report.nativeFocus={recordedAt:new Date().toISOString(),method:'Native focus emulation disabled, then BrowserWindow.minimize / restore / show / focus with physical W and primary mouse held',nativeBefore,nativeBlurred,blurred,restored};await shot('focus-restored');await exit();await cdp.detach();report.checks.push('Real packaged fullscreen=true; minimizing with W+fire held clears keys and simulation input; restoring/focusing does not resume movement or fire');
}
(async()=>{
 try{
  host=desktop?await _electron.launch({executablePath:require('./desktop-path.cjs').executable,args:[],timeout:45000}):await chromium.launch({headless:true,channel:'chromium'});
  p=desktop?await host.firstWindow():await host.newPage({viewport:{width:1600,height:1000}});
  p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  if(!desktop)await p.goto(process.env.GAME_URL||'http://127.0.0.1:8765');
  await p.waitForFunction(()=>window.ModernFront?.direct);await p.evaluate(()=>Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]));
  await p.locator('#enemies').selectOption('1');await p.locator('#range-mode').selectOption('balanced');await p.locator('#start').click();await p.waitForTimeout(200);
  if(focusOnly){await nativeFocusCheck();assert.deepEqual(report.errors,[]);report.passed=true;delete report.failure;return;}
  let state=await fixture('infantry');await enter(state,true,true);await paused(false);
  await p.evaluate(()=>{ModernFront.game.teams[0].aiClock=999999;});
  const movements=[];
  for(const [key,axis,sign]of [['KeyW','x',1],['KeyS','x',-1],['KeyD','y',1],['KeyA','y',-1]]){
   const before=await position();await p.keyboard.down(key);await p.waitForTimeout(300);await p.keyboard.up(key);const after=await position();assert.ok((after[axis]-before[axis])*sign>1,key+' moves in expected direction');movements.push({key,before,after});
  }
  report.movement=movements;report.checks.push('Button entry, real pointer lock and W/S/D/A move the live infantry entity in four directions');
  const beforeLook=await position();await p.mouse.move(850,460,{steps:8});await p.waitForTimeout(100);const afterLook=await position();assert.ok(Math.abs(afterLook.yaw-beforeLook.yaw)+Math.abs(afterLook.pitch-beforeLook.pitch)>.001,'relative mouse look');
  const motion=await p.evaluate(()=>ModernFront.direct.motion);await p.keyboard.press('KeyM');assert.equal(await p.evaluate(()=>ModernFront.direct.motion),!motion);await p.keyboard.press('KeyM');assert.equal(await p.evaluate(()=>ModernFront.direct.motion),motion);report.checks.push('M toggles and restores the optional motion setting through keyboard input');
  await p.evaluate(()=>{ModernFront.direct.yaw=0;ModernFront.direct.pitch=-.025;});await p.waitForTimeout(150);await shot('infantry');
  const hip=await p.evaluate(()=>ModernFront.direct.camera.fov);await p.mouse.down({button:'right'});await p.waitForTimeout(350);
  const ads=await p.evaluate(()=>({active:ModernFront.direct.ads,fov:ModernFront.direct.camera.fov,view:ModernFront.direct.view?.mode}));assert.equal(ads.active,true);assert.ok(ads.fov<hip-10);await shot('ads');await p.mouse.up({button:'right'});await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>ModernFront.direct.ads),false);report.ads={hip,...ads};
  await paused(true);const stop=await position(),tick=await p.evaluate(()=>ModernFront.game.tick);await p.keyboard.down('KeyW');await p.mouse.down();await p.waitForTimeout(250);await p.mouse.up();await p.keyboard.up('KeyW');assert.equal(await p.evaluate(()=>ModernFront.game.tick),tick);assert.deepEqual(await position(),stop);await paused(false);
  report.checks.push('Mouse look, right-button ADS narrows camera FOV, release restores aim, and P freezes simulation and clears movement/fire');
  await exit('Escape');assert.equal(await p.locator('#modal').isVisible(),false);report.checks.push('Escape exits driving and returns strategy camera without opening settings');

  // All supported unit kinds must be possessable through real keyboard selection/E.
  const kinds=await p.evaluate(()=>Object.keys(WarData.U));assert.equal(kinds.length,77);
  const screenshots={sniper_team:'sniper',orbital_shield:'shield',air_repair_drone:'air-repair',tank:'tank',destroyer:'naval',fighter:'air',orbital:'space',field_medic:'medical',antitank_team:'antitank_team',mortar_team:'mortar_team',machinegun_team:'machinegun_team'};
  const profiles={sniper_team:'original-marksman-rifle',antitank_team:'original-shoulder-launcher',mortar_team:'original-mortar-observation',machinegun_team:'original-belt-fed-machinegun'};
  for(const kind of kinds){state=await fixture(kind);await enter(state);await p.waitForTimeout(40);const detail=await p.evaluate(()=>{const d=ModernFront.direct,g=ModernFront.game,e=g.get(d.entityId);return{kind:e.kind,id:e.id,domain:WarData.U[e.kind].unitGroup,mode:d.view?.mode,weaponProfile:d.view?.weaponProfile,hudName:d.el('name').textContent,finiteCamera:d.camera.position.toArray().every(Number.isFinite),ownModelHidden:ModernFront.renderer.objects.get(e.id)?.visible===false};});assert.ok(detail.finiteCamera&&detail.ownModelHidden,kind);assert.ok(detail.hudName);if(profiles[kind]){assert.equal(detail.weaponProfile,profiles[kind]);assert.equal(detail.mode,'infantry');}report.possession.push(detail);if(screenshots[kind]){await paused(false);await lock();await p.waitForTimeout(120);await shot(screenshots[kind]);await paused(true);}await exit();}
  assert.equal(report.possession.find(e=>e.kind==='field_medic').mode,'medical');report.checks.push('All 77 unit kinds enter/exit through E (harvester uses real click selection); domain foreground and self-model hiding checked');

  // AI uses the existing unmodified method; wrapper only counts calls.
  state=await fixture('tank');await p.evaluate(()=>{const g=ModernFront.game;g.teams[0].money=50000;g.spawn(0,'barracks',500,400);g.spawn(0,'factory',500,520);g.spawn(0,'ifv',1000,1000);g.__fpsAICalls=0;const ai=g.ai.bind(g);g.ai=(team,dt)=>{if(team.id===0)g.__fpsAICalls++;return ai(team,dt);};});
  await enter(state,false,true);await paused(false);
  // AI plans on its own cadence and can reject a random building site on real
  // terrain. Wait for observable work, not an assumed first 250 ms placement.
  await p.waitForFunction(()=>{const g=ModernFront.game;return g.__fpsAICalls>0&&g.teams[0].queue.length>0&&g.teams[0].buildQueue.length>0&&g.entities.some(e=>e.team===0&&e.kind==='ifv'&&e.order);},null,{timeout:8000});
  report.ai=await p.evaluate(()=>{const g=ModernFront.game;return{calls:g.__fpsAICalls,production:g.teams[0].queue.length,construction:g.teams[0].buildQueue.length,othersOrdered:g.entities.filter(e=>e.team===0&&e.kind==='ifv'&&e.order).length,controlledOrder:g.get(g.directControl.id).order};});
  assert.ok(report.ai.calls>0&&report.ai.production>0&&report.ai.construction>0&&report.ai.othersOrdered>0);assert.equal(report.ai.controlledOrder,null);await exit();const aiCalls=await p.evaluate(()=>ModernFront.game.__fpsAICalls);await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>ModernFront.game.__fpsAICalls),aiCalls);report.checks.push('AI builds, trains and orders other units during possession, excludes the driver, and stops new AI calls after E exits');

  state=await fixture('tank',true);await enter(state,false,true);await paused(false);await p.waitForTimeout(150);report.aim=await aimAt(state.targetId);
  const health=await p.evaluate(id=>ModernFront.game.get(id).hp,state.targetId);await p.mouse.down();await p.waitForFunction(id=>ModernFront.game.directFeedback?.targetId===id,state.targetId,{timeout:5000});await p.mouse.up();
  await p.waitForFunction(()=>ModernFront.direct.lastHitAt===ModernFront.game.directFeedback.hitAt);report.combat=await p.evaluate(id=>{const g=ModernFront.game;return{targetHP:g.get(id).hp,feedback:{...g.directFeedback},incoming:{...g.get(id).lastHitFrom},hudConfirmed:ModernFront.direct.lastHitAt===g.directFeedback.hitAt};},state.targetId);assert.ok(report.combat.targetHP<health);assert.equal(report.combat.feedback.sourceId,state.id);assert.ok(report.combat.feedback.damage>0);assert.equal(report.combat.hudConfirmed,true);await shot('hit');
  await p.waitForTimeout(300);await p.evaluate(()=>{const d=ModernFront.direct;d.pitch=1.1;d.yaw+=Math.PI*.5;d.lastAimTime=0;ModernFront.game.get(d.entityId).cool=0;ModernFront.game.directFeedback=null;});
  await p.mouse.down();await p.waitForTimeout(200);await p.mouse.up();await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>ModernFront.game.directFeedback),null);assert.equal(await p.evaluate(()=>ModernFront.direct.el('hit').style.opacity),'0');report.checks.push('Real left-click mesh-target shot reduces enemy HP and confirms actual source damage; a subsequent sky miss produces no hit marker');

  // Relocate the disabled target as an explicit fixture while a real shot is in flight.
  // This probes delayed impact ownership without substituting shot/damage functions.
  await aimAt(state.targetId);await p.evaluate(()=>{const g=ModernFront.game;g.effects=[];g.directFeedback=null;g.get(ModernFront.direct.entityId).cool=0;});
  await p.mouse.down();await p.waitForFunction(()=>ModernFront.game.effects.some(f=>f.sourceId===ModernFront.direct.entityId&&f.directHitArea));
  report.fixedImpact=await p.evaluate(id=>{const g=ModernFront.game,e=g.get(id),shot=g.effects.find(f=>f.sourceId===ModernFront.direct.entityId&&f.directHitArea);if(!shot)throw new Error('Projectile resolved before relocation fixture');const result={original:[e.x,e.y],impact:[shot.tx,shot.ty],health:e.hp,area:{...shot.directHitArea}};e.x+=180;e.y+=80;result.relocated=[e.x,e.y];return result;},state.targetId);
  await p.mouse.up();await p.waitForTimeout(550);assert.equal(await p.evaluate(id=>ModernFront.game.get(id).hp,state.targetId),report.fixedImpact.health);assert.equal(await p.evaluate(()=>ModernFront.game.directFeedback),null);report.checks.push('A real manual projectile remains tied to its recorded impact area: relocating the target during flight causes no remote damage or hit marker');

  // Explicit low cover is inserted into the existing world and raycast as geometry.
  report.cover=[];
  for(const [kind,faction,expectedOrigin]of [['tank_destroyer','chn','model-muzzle'],['tank','chn','model-muzzle'],['tank','imp','model-muzzle']]){
  state=await fixture(kind,true,faction);await enter(state,false,true);await paused(false);await p.waitForTimeout(150);
  await aimAt(state.targetId);await p.evaluate(()=>{ModernFront.game.effects=[];ModernFront.game.directFeedback=null;ModernFront.game.get(ModernFront.direct.entityId).cool=0;});
  const proof=await p.evaluate(id=>{
   const d=ModernFront.direct,r=ModernFront.renderer,initial=d.aim(),origin=initial.origin,target=initial.point;
   const dir=d.camera.getWorldDirection(new THREE.Vector3()),cameraHit=d.cast(d.eye,dir,2200);if(cameraHit?.entity?.id!==id)throw new Error('Camera must see target before cover fixture');
   let cover=null,proof=null;
   for(const t of [.1,.2,.3,.4,.5,.6]){
    const center=origin.clone().lerp(target,t),along=center.clone().sub(d.eye).dot(dir),cameraPoint=d.eye.clone().addScaledVector(dir,along),gap=center.distanceTo(cameraPoint);if(gap<.5)continue;
    const size=Math.min(3,gap*.65),mesh=new THREE.Mesh(new THREE.BoxGeometry(size,size,size),new THREE.MeshStandardMaterial({color:0x726d60}));mesh.position.copy(center);r.world.add(mesh);mesh.updateMatrixWorld(true);
    const visible=d.cast(d.eye,dir,2200),muzzle=d.cast(origin,target.clone().sub(origin).normalize(),origin.distanceTo(target)+.2),aim=d.aim();
    if(visible?.entity?.id===id&&muzzle?.object===mesh&&!aim.target){cover=mesh;proof={originMode:initial.originMode,approximate:!!WarWeaponEffects.weaponAnchor(r.objects.get(d.entityId),d.game.vehicleWeapon(d.game.get(d.entityId)),{kind:d.game.get(d.entityId).kind,faction:d.game.teams[0].faction})?.userData.approximate,cameraTarget:visible.entity.id,muzzleHitCover:true,aimTarget:aim.target?.id||null,center:center.toArray(),size,gap};break;}r.world.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();
   }
   if(!cover)throw new Error('Could not construct separated camera/muzzle cover rays');window.__fpsTestCover=cover;d.aimResult=d.aim();d.lastAimTime=0;return proof;
  },state.targetId);
  assert.equal(proof.originMode,expectedOrigin);if(faction==='imp')assert.equal(proof.approximate,true,'unverified imperial gun uses an explicitly approximate station');const coveredHP=await p.evaluate(id=>ModernFront.game.get(id).hp,state.targetId);await p.mouse.down();await p.waitForTimeout(200);await p.mouse.up();await p.waitForTimeout(500);assert.equal(await p.evaluate(id=>ModernFront.game.get(id).hp,state.targetId),coveredHP);assert.equal(await p.evaluate(()=>ModernFront.game.directFeedback),null);await shot('muzzle-cover-'+kind+'-'+faction);report.cover.push({kind,faction,...proof,damage:0});
  await p.evaluate(()=>{const m=window.__fpsTestCover;m.parent.remove(m);m.geometry.dispose();m.material.dispose();delete window.__fpsTestCover;});
  }
  report.checks.push('Camera sees target while the selected weapon station hits cover: missile vehicle, Chinese tank and explicitly approximate IMP station all deal zero damage and no hit confirmation');
  await exit();if(desktop)await nativeFocusCheck();report.renderEnvironment=await p.evaluate(()=>{const r=ModernFront.renderer,gl=r.gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{viewport:[innerWidth,innerHeight],dpr:r.dpr,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};});assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(error){report.passed=false;report.failure={message:error.message,stack:error.stack};if(p){try{report.failure.state=await p.evaluate(()=>({paused:ModernFront?.paused,selected:ModernFront?.selection,direct:ModernFront?.direct?.active,locked:!!document.pointerLockElement,entity:ModernFront?.game?.directControl}));await shot('failure');}catch{}}throw error;
 }finally{
  fs.writeFileSync('docs/first-person-'+suffix+'-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,environment:report.environment,checks:report.checks,possession:report.possession.length,combat:report.combat,cover:report.cover,errors:report.errors,failure:report.failure}));await host?.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
