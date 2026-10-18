/* Real V/G, wheel, locked mouse and trigger checks. Fixtures arrange entities only. */
const {chromium,_electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const desktop=process.argv.includes('--desktop'),suffix=desktop?'desktop':'browser',report={recordedAt:new Date().toISOString(),environment:suffix,checks:[],errors:[],domains:[]};let host,p,cursor={x:700,y:420};
function checked(message){report.checks.push(message);console.log(message);}
async function pause(value){if(await p.evaluate(()=>ModernFront.paused)!==value)await p.keyboard.press(await p.evaluate(()=>ModernFront.direct.active?'KeyP':'Space'));await p.waitForFunction(v=>ModernFront.paused===v,value);}
async function lock(){if(await p.evaluate(()=>!!document.pointerLockElement))return;for(let attempt=0;attempt<3;attempt++){await p.waitForTimeout(1400);cursor={x:700,y:420};await p.mouse.click(cursor.x,cursor.y);try{await p.waitForFunction(()=>!!document.pointerLockElement,null,{timeout:1400});return;}catch{if(attempt===2)throw Error('pointer lock unavailable');}}}
async function fixture(kind,height){
 if(await p.evaluate(()=>ModernFront.direct.active)){await p.keyboard.press('e');await p.waitForFunction(()=>!ModernFront.direct.active&&!document.pointerLockElement);}
 await pause(true);
 const ids=await p.evaluate(({kind,height})=>{const g=ModernFront.game;g.entities=[];g.effects=[];g.result=null;g.ore=[];g.map.blocked.fill(0);g.buffs.add('vision');g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;t.queue=[];t.buildQueue=[];});g.spawn(0,'hq',300,300);g.spawn(1,'hq',5700,3600);g.spawn(0,'operator',1700,1400);const worldY=WarData.U[kind].naval?100:1400;const actor=g.spawn(0,kind,1800,worldY);actor.altitude=height;actor.angle=0;actor.pitch=0;const target=g.spawn(1,WarData.U[kind].underwater?'submarine':WarData.U[kind].space?'tank':WarData.U[kind].air?'heli':WarData.U[kind].naval?'destroyer':'tank',1800+(WarData.U[kind].space?0:160),worldY);if(WarData.U[kind].naval){for(const e of [actor,target])for(const [dx,dy]of [[0,0],[-64,-48],[-64,48],[64,-48],[64,48]]){const tile=g.map.tiles[Math.floor((e.y+dy)/48)*WarData.COLS+Math.floor((e.x+dx)/48)];if(![3,6].includes(tile))throw Error('Naval fixture must occupy actual rendered sea tiles');}}target.altitude=WarData.U[kind].space?0:height;target.hp=target.maxHp=10000;target.disabled=1e9;const far=g.spawn(1,'tank',5200,1400);far.hp=far.maxHp=10000;far.disabled=1e9;if(window.WarTrees)for(const tree of WarTrees.ensure(g))if([target,far].some(e=>Math.hypot(e.x-tree.x,e.y-tree.y)<130))WarTrees.damage(g,tree.id,10000);g.spatial.rebuild(g.entities);g.updateFog();return{actor:actor.id,target:target.id,far:far.id};},{kind,height});
 await p.keyboard.press('j');await p.waitForFunction(()=>ModernFront.direct.vehicleMenu.open);await p.locator(`[data-player-unit="${ids.actor}"]`).click();await p.waitForFunction(id=>ModernFront.direct.active&&ModernFront.direct.entityId===id,ids.actor);await pause(false);await lock();await p.waitForTimeout(250);
 await p.evaluate(()=>{const d=ModernFront.direct;if(!d.view.__scopeInstrumented){const original=d.view.render;d.view.render=function(...args){window.__foregroundCalls=(window.__foregroundCalls||0)+1;return original.apply(this,args);};d.view.__scopeInstrumented=true;}});return ids;
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
  for(let attempt=0;attempt<32;attempt++){
   const delta=await p.evaluate(({id,point})=>{const d=ModernFront.direct,model=ModernFront.renderer.objects.get(id),world=model.localToWorld(new THREE.Vector3(...point));const local=world.sub(d.eye).normalize().applyQuaternion(d.camera.quaternion.clone().invert()),sens=.002/(d.opticalActive()?d.scopeState().zoom:1),u=WarData.U[ModernFront.game.get(d.entityId).kind],flight=u.air&&!u.space;return{dx:Math.atan2(local.x,-local.z)/sens,dy:(flight?1:-1)*Math.asin(Math.max(-1,Math.min(1,local.y)))/sens};},{id,point:selected.localPoint});
   if(Math.hypot(delta.dx,delta.dy)<.08)break;
   const scale=Math.min(1,250/Math.max(Math.abs(delta.dx),Math.abs(delta.dy)));cursor.x+=delta.dx*scale;cursor.y+=delta.dy*scale;await p.mouse.move(cursor.x,cursor.y,{steps:Math.max(1,Math.ceil(Math.hypot(delta.dx,delta.dy)*scale/12))});await p.waitForTimeout(90);
  }
  await p.waitForFunction(id=>{const a=ModernFront.direct.aimResult;return(a?.observedTarget||a?.target)?.id===id;},id,{timeout:4000});
 }catch(error){report.aimFailure={id,selected,diagnostic:await p.evaluate(id=>{const d=ModernFront.direct,g=ModernFront.game,a=d.aimResult,e=g.get(id),o=ModernFront.renderer.objects.get(id);return{target:e?{id:e.id,kind:e.kind,x:e.x,y:e.y,altitude:e.altitude,angle:e.angle,hp:e.hp}:null,visible:o?.visible,camera:d.camera.position.toArray(),direction:d.camera.getWorldDirection(new THREE.Vector3()).toArray(),fov:d.camera.fov,zoom:d.scopeState().zoom,observed:a?.observedTarget?.id,accepted:a?.target?.id,point:a?.point?.toArray(),occluded:a?.occluded,contact:d.el('orbit-contact').textContent,locked:!!document.pointerLockElement};},id).catch(e=>({error:e.message}))};throw error;}
}
async function fire(){await p.mouse.down();await p.waitForTimeout(50);await p.mouse.up();await p.waitForTimeout(1500);}
async function sustainedFireSample(targetId){
 await p.waitForFunction(()=>ModernFront.direct.orbitTargetStatus().canFire,null,{timeout:7000});
 await p.evaluate(()=>{const sample=window.__unifiedAimFrames={active:true,started:performance.now(),last:null,frames:[]};const tick=t=>{if(!sample.active)return;if(sample.last!==null)sample.frames.push(t-sample.last);sample.last=t;requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 const hp=await p.evaluate(id=>ModernFront.game.get(id).hp,targetId);await p.mouse.down();try{await p.waitForTimeout(8000);}finally{await p.mouse.up();}
 report.sustainedFire=await p.evaluate(({id,hp})=>{const s=window.__unifiedAimFrames;s.active=false;const sorted=s.frames.slice().sort((a,b)=>a-b),r=ModernFront.renderer,g=ModernFront.game,gl=r.gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{durationMs:performance.now()-s.started,frames:sorted.length,frameP50Ms:sorted[Math.floor(sorted.length*.5)],frameP95Ms:sorted[Math.floor(sorted.length*.95)],frameMaxMs:sorted.at(-1),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[innerWidth,innerHeight],drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],dpr:r.dpr,entities:g.entities.length,visibleEntities:r.stats?.visibleEntities,drawCalls:r.stats?.calls,triangles:r.stats?.triangles,kind:g.get(ModernFront.direct.entityId)?.kind,zoom:ModernFront.direct.scopeState().zoom,hpBefore:hp,hpAfter:g.get(id)?.hp,scope:'8-second small deterministic fixture with actual held primary mouse; frame intervals are RAF observations, not isolated GPU timings or long-battle guarantees'};},{id:targetId,hp});
 assert.ok(report.sustainedFire.frames>0);assert.ok(report.sustainedFire.hpAfter<hp);checked('8秒真实持续射击性能样本：记录GPU、分辨率、实体数及帧间隔P95');
}
(async()=>{try{
 fs.mkdirSync('.tmp',{recursive:true});fs.mkdirSync('screenshots',{recursive:true});
 host=desktop?await _electron.launch({executablePath:path.resolve(process.env.MODERN_FRONT_EXE||'release/ModernFrontHD/ModernFrontHD.exe'),args:[],timeout:45000}):await chromium.launch({headless:true,channel:'chromium'});
 p=desktop?await host.firstWindow():await host.newPage({viewport:{width:1600,height:1000}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});if(!desktop)await p.goto(process.env.GAME_URL||'http://127.0.0.1:8765');await p.waitForFunction(()=>window.ModernFront);await p.evaluate(()=>Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]));await p.locator('#enemies').selectOption('1');await p.locator('#start').click();
 for(const [kind,height]of [['operator',0],['tank',0],['destroyer',0],['submarine',-55],['heli',130],['orbital',4000]]){
  const ids=await fixture(kind,height),before=await state();assert.ok(await p.locator('#direct-orbit-panel').isVisible());
  await p.keyboard.press('v');await p.waitForFunction(()=>ModernFront.direct.opticalActive());if(kind==='orbital')await p.keyboard.press('g');await aimAt(ids.target);
  const zooms=kind==='orbital'?[4,8,16,32,64]:[1.5,2,4,8,16];
  for(let i=0;i<zooms.length;i++){
   if(i)await p.mouse.wheel(0,-120);await p.waitForFunction(z=>ModernFront.direct.scopeState().zoom===z,zooms[i]);await aimAt(ids.target);await p.waitForFunction(()=>ModernFront.direct.orbitTargetStatus().canFire,null,{timeout:7000});
   const aimed=await state();assert.equal(aimed.orbital,kind==='orbital');assert.equal(aimed.range,before.range);assert.ok(Math.abs(Math.tan(aimed.fov*Math.PI/360)*zooms[i]-Math.tan(70*Math.PI/360))<.0001);assert.match(aimed.contact,/实际距离.*射程.*射程内/);
   const hp=await p.evaluate(id=>ModernFront.game.get(id).hp,ids.target);await fire();assert.ok(await p.evaluate(({id,hp})=>ModernFront.game.get(id).hp<hp,{id:ids.target,hp}),kind+' zoom '+zooms[i]+' real trigger damages target');
  }
  if(kind==='tank')await sustainedFireSample(ids.target);
  assert.ok(await p.locator('#direct-minimap').isVisible());assert.ok(await p.locator('#direct-hp').isVisible());await p.screenshot({path:`screenshots/unified-aim-${kind}-${suffix}.png`});report.domains.push({kind,view:await state()});checked(kind+'：五档真实变焦均可开火、射程未变、目标距离与小地图常驻');
  await p.keyboard.press('v');await p.waitForFunction(()=>!ModernFront.direct.opticalActive());await p.mouse.down({button:'right'});await p.waitForFunction(()=>ModernFront.direct.opticalActive());await p.mouse.up({button:'right'});await p.waitForFunction(()=>!ModernFront.direct.opticalActive());
  if(kind==='operator'){
   const slot=await p.evaluate(()=>ModernFront.game.operatorStatus(ModernFront.direct.entityId).activeSlot);await p.mouse.wheel(0,120);await p.waitForFunction(slot=>ModernFront.game.operatorStatus(ModernFront.direct.entityId).activeSlot!==slot,slot);
   await p.keyboard.press('1');await p.keyboard.press('v');await p.mouse.wheel(0,120);assert.equal(await p.evaluate(()=>ModernFront.game.operatorStatus(ModernFront.direct.entityId).activeSlot),0);await p.keyboard.press('2');assert.equal(await p.evaluate(()=>ModernFront.game.operatorStatus(ModernFront.direct.entityId).activeSlot),1);await p.keyboard.press('v');checked('行动员未瞄准滚轮切枪，瞄准滚轮只变焦，1/2继续切枪');
  }
  await p.keyboard.press('j');await p.waitForFunction(()=>ModernFront.direct.vehicleMenu.open);assert.equal(await p.evaluate(()=>ModernFront.game.directControl.input.fire),false);await p.keyboard.press('Escape');await lock();
 }
 const ids=await fixture('tank',0);await aimAt(ids.target);await p.evaluate(id=>{const e=ModernFront.game.get(id);e.x+=1000;},ids.target);await p.waitForTimeout(150);await aimAt(ids.target);await p.waitForFunction(()=>ModernFront.direct.el('orbit-contact').textContent.includes('超出射程'));const hp=await p.evaluate(id=>ModernFront.game.get(id).hp,ids.target);await fire();assert.equal(await p.evaluate(id=>ModernFront.game.get(id).hp,ids.target),hp);checked('超出射程显示真实限制且实际开火不扣目标血');
 await p.keyboard.press('e');await p.waitForFunction(()=>!ModernFront.direct.active);assert.equal(await p.evaluate(()=>ModernFront.direct.opticalActive()),false);assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;if(p)await p.screenshot({path:'.tmp/unified-aim-failure-'+suffix+'.png'}).catch(()=>{});}finally{fs.writeFileSync('docs/unified-aim-'+suffix+'-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await host?.close();}})();
