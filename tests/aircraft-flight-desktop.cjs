/* Native UI acceptance; fixture setup is explicit, input uses Playwright keys/mouse. */
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),crypto=require('crypto');
const {executable,appRoot}=require('./desktop-path.cjs'),report={recordedAt:new Date().toISOString(),checks:[],errors:[],sourceHashes:{},executable};let host,p;
const check=s=>{report.checks.push(s);console.log(s);};
async function focus(){await host.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];if(w.isMinimized())w.restore();w.show();w.focus();});await p.bringToFront();await p.waitForFunction(()=>document.hasFocus(),null,{timeout:3000});}
async function pause(value){if(await p.evaluate(()=>ModernFront.paused)!==value)await p.keyboard.press(await p.evaluate(()=>ModernFront.direct.active?'KeyP':'Space'));await p.waitForFunction(v=>ModernFront.paused===v,value);}
async function snap(label){const file='screenshots/aircraft-'+label+'-desktop.png';await p.screenshot({path:file});report[label]=file;}
async function lockFlight(){
 if(await p.evaluate(()=>document.hasFocus()&&document.pointerLockElement===ModernFront.direct.r.canvas))return;
 await focus();if(await p.evaluate(()=>document.pointerLockElement===ModernFront.direct.r.canvas))return;
 for(let n=0;n<3;n++){await p.waitForTimeout(1350);const xy=await p.evaluate(()=>[innerWidth/2,innerHeight*.46]);await p.mouse.click(...xy);try{await p.waitForFunction(()=>document.pointerLockElement===ModernFront.direct.r.canvas,null,{timeout:1800});return;}catch{if(n===2)throw Error('Real canvas click did not acquire flight mouse lock');await focus();}}
}
async function flightSnapshot(){return p.evaluate(()=>{
 const d=ModernFront.direct,g=ModernFront.game,e=g.get(d.entityId),o=d.r.objects.get(e.id);o?.updateWorldMatrix(true,true);
 let wings=null;
 if(o){
  // Use vertices from the rendered aircraft, including articulated surfaces;
  // exhaust effects do not define the physical wingtip. The mirrored match
  // avoids comparing unrelated vertices at different fore/aft positions.
  const inverse=o.matrixWorld.clone().invert(),vertices=[],v=new THREE.Vector3();
  o.traverse(mesh=>{if(!mesh.isMesh||mesh.userData.motionEffect)return;let node=mesh;while(node&&node!==o){if(node.userData.motionEffect)return;node=node.parent;}const position=mesh.geometry?.attributes?.position;if(!position)return;const matrix=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);for(let i=0;i<position.count;i++){if(mesh.getVertexPosition)mesh.getVertexPosition(i,v);else v.fromBufferAttribute(position,i);vertices.push(v.clone().applyMatrix4(matrix));}});
  const right=vertices.reduce((best,v)=>!best||v.z>best.z?v:best,null);
  if(right){const mirror=new THREE.Vector3(right.x,right.y,-right.z),left=vertices.reduce((best,v)=>!best||v.distanceToSquared(mirror)<best.distanceToSquared(mirror)?v:best,null);if(left){wings={rightLocal:right.toArray(),leftLocal:left.toArray(),mirrorError:left.distanceTo(mirror),right:o.localToWorld(right.clone()).toArray(),left:o.localToWorld(left.clone()).toArray()};}}
 }
 const q=o?.getWorldQuaternion(new THREE.Quaternion()),nose=q?new THREE.Vector3(1,0,0).applyQuaternion(q).normalize().toArray():null;
 return{id:e.id,yaw:d.yaw,pitch:d.pitch,angle:e.angle,roll:e.roll,bodyPitch:e.pitch,position:[e.x,e.altitude,e.y],speed:e.flightSpeed,time:g.time,tick:g.tick,exterior:d.exteriorActive(),optical:d.opticalActive(),ownVisible:o?.visible,look:d.camera.getWorldDirection(new THREE.Vector3()).toArray(),nose,wings,locked:document.pointerLockElement===d.r.canvas,focused:document.hasFocus(),paused:ModernFront.paused,flightReady:d.flightReady,input:g.directControl?.input,moves:window.__flightMouseMoves||[],trace:window.__flightSteeringTrace||[]};
});}
async function realMouseSteering(){
 report.mouseSteering={method:'Real Playwright mouse.move under native pointer lock; trusted capture events plus actual simulation travel and rendered mesh wingtip vertices. Aircraft poses are reset explicitly between independent left/right fixtures.',cases:[]};
 await lockFlight();
 // Earlier P pauses intentionally disarm the flight controller even when mouse
 // lock remains. Resume through a real W key, as the live HUD instructs, before
 // measuring steering; mouse-look alone is allowed while flight is stopped.
 await p.keyboard.press('KeyW');await p.waitForFunction(()=>ModernFront.direct.flightReady&&ModernFront.game.directControl.input.flightEnabled,null,{timeout:3000});
 const saved=await p.evaluate(()=>{const d=ModernFront.direct,g=ModernFront.game,e=g.get(d.entityId);window.__flightSteeringOriginalStep=g.step;g.step=function(dt){const e=this.get(d.entityId),before=e?{x:e.x,y:e.y}:null,value=window.__flightSteeringOriginalStep.call(this,dt),after=this.get(d.entityId);if(before&&after&&window.__flightSteeringTrace)window.__flightSteeringTrace.push({dx:after.x-before.x,dy:after.y-before.y,angle:after.angle,pitch:after.pitch,roll:after.roll,time:this.time,dt});return value;};return{pose:{x:e.x,y:e.y,altitude:e.altitude,angle:e.angle,pitch:e.pitch,roll:e.roll,flightSpeed:e.flightSpeed,motion:structuredClone(e.motion)},yaw:d.yaw,pitch:d.pitch};});
 try{
  const centre=await p.evaluate(()=>[innerWidth/2,innerHeight/2]);
  for(const sign of [-1,1]){
   await lockFlight();if(!await p.evaluate(()=>ModernFront.game.directControl.input.flightEnabled)){await p.keyboard.press('KeyW');await p.waitForFunction(()=>ModernFront.game.directControl.input.flightEnabled,null,{timeout:3000});}await p.mouse.move(...centre,{steps:4});await p.waitForTimeout(100);
   await p.evaluate(()=>{
    const d=ModernFront.direct,g=ModernFront.game,e=g.get(d.entityId);Object.assign(e,{x:2600,y:1800,altitude:300,angle:0,pitch:0,roll:0});WarVehicleMotion.stop(e);e.flightSpeed=g.effectiveSpeed(e)*.65;d.yaw=0;d.pitch=0;d.lastAimTime=0;d.aimResult=null;d.cameraPoseKey=null;d.updateCamera();d.submit();
    window.__flightMouseMoves=[];window.__flightSteeringTrace=[];
    window.__flightMouseObserver=event=>{const limit=Math.max(300,Math.min(d.r.width,d.r.height)*.5);window.__flightMouseMoves.push({trusted:event.isTrusted,dx:event.movementX,dy:event.movementY,accepted:document.pointerLockElement===d.r.canvas&&!d.ignoreNextMouse&&!ModernFront.paused&&document.hasFocus()&&Math.abs(event.movementX)<=limit&&Math.abs(event.movementY)<=limit});};addEventListener('mousemove',window.__flightMouseObserver,true);
   });
   await p.waitForTimeout(100);const before=await flightSnapshot();
   await p.mouse.move(centre[0]+sign*100,centre[1],{steps:8});
   await p.waitForFunction(sign=>{const d=ModernFront.direct,e=ModernFront.game.get(d.entityId);return e.roll*sign>.018&&e.angle*sign>.02&&d.r.objects.get(e.id)?.visible;},sign,{timeout:5000});
   const after=await flightSnapshot(),entry={direction:sign>0?'right':'left',before,after};report.mouseSteering.cases.push(entry);
   await p.evaluate(()=>{removeEventListener('mousemove',window.__flightMouseObserver,true);delete window.__flightMouseObserver;});
   const accepted=after.moves.filter(m=>m.trusted&&m.accepted),dx=accepted.reduce((v,m)=>v+m.dx,0),dy=accepted.reduce((v,m)=>v+m.dy,0);entry.acceptedDelta=[dx,dy];
   assert.ok(accepted.length>0&&dx*sign>0,'A real trusted mouse pulse must have the requested horizontal sign');assert.ok(Math.abs(dy)<1,'Horizontal fixture must not inject vertical mouse motion');
   assert.ok(Math.abs(after.yaw-before.yaw-dx*.002)<1e-6,'Flight mouse X must keep its normal direction and sensitivity');
   assert.equal(after.exterior,true);assert.equal(after.optical,false);assert.equal(after.ownVisible,true);assert.ok(after.angle*sign>0&&after.roll*sign>0,'Heading and roll must turn inward together');
   assert.ok(after.wings&&after.wings.rightLocal[2]>0&&after.wings.leftLocal[2]<0,'Both real model wingtip vertices must exist');assert.ok(after.wings.mirrorError<1,'Wingtip comparison must use matching exterior geometry');assert.ok((after.wings.left[1]-after.wings.right[1])*sign>.05,'The inside wing must be lower in the rendered C exterior view');
   assert.ok(after.nose.reduce((v,n,i)=>v+n*after.look[i],0)>.995,'C exterior camera and actual rendered nose must face the same direction');
   const travel=after.trace.filter(s=>Math.hypot(s.dx,s.dy)>.001);assert.ok(travel.length>2);for(const s of travel)assert.ok(Math.abs(Math.atan2(Math.sin(Math.atan2(s.dy,s.dx)-s.angle),Math.cos(Math.atan2(s.dy,s.dx)-s.angle)))<.001,'Every flight step must travel along its nose');
   await snap(sign>0?'mouse-right-inward-bank':'mouse-left-inward-bank');
   await p.waitForFunction(()=>{const d=ModernFront.direct,e=ModernFront.game.get(d.entityId);return Math.abs(e.roll)<.004&&Math.abs(WarVehicleMotion.angleDelta(d.yaw,e.angle))<.004;},null,{timeout:8000});
   entry.settled=await flightSnapshot();assert.ok(Math.abs(entry.settled.roll)<.004,'A short mouse pulse must settle wings level');const heading=entry.settled.trace.map(s=>s.angle);assert.ok(heading.every((v,i)=>!i||(v-heading[i-1])*sign>=-1e-7),'Finishing a mouse pulse must not reverse heading');
  }
  await pause(true);const stopped=await flightSnapshot();await p.mouse.move(centre[0]+20,centre[1]-40,{steps:4});await p.waitForTimeout(250);const still=await flightSnapshot();assert.deepEqual(still.position,stopped.position);assert.equal(still.angle,stopped.angle);assert.equal(still.roll,stopped.roll);assert.equal(still.tick,stopped.tick);report.mouseSteering.pause={before:stopped,after:still};
  await pause(false);await lockFlight();await p.keyboard.press('KeyW');check('独立版可信鼠标左右输入、C 外视角实际机翼向内倾斜、机头与航迹一致、松鼠标回平、P 暂停不漂移');
 }catch(error){report.mouseSteering.failureState=await flightSnapshot().catch(()=>null);throw error;}
 finally{
  await p.evaluate(saved=>{const d=ModernFront.direct,g=ModernFront.game,e=g.get(d.entityId);if(window.__flightMouseObserver)removeEventListener('mousemove',window.__flightMouseObserver,true);delete window.__flightMouseObserver;if(window.__flightSteeringOriginalStep){g.step=window.__flightSteeringOriginalStep;delete window.__flightSteeringOriginalStep;}window.__flightSteeringTrace=null;if(e)Object.assign(e,saved.pose);d.yaw=saved.yaw;d.pitch=saved.pitch;d.cameraPoseKey=null;d.aimResult=null;d.lastAimTime=0;d.updateCamera();d.submit();},saved).catch(()=>{});
 }
}
(async()=>{try{
 for(const file of ['src/sim.js','src/aircraft-flight.js','src/carrier-operations.js','src/vehicle-motion.js','src/vehicle-camera.js','src/vehicle-animation.js','src/battle3d.js','src/direct-control.js','src/app.js','index.html']){const b=fs.readFileSync(file);assert.ok(b.equals(fs.readFileSync(path.join(appRoot,file))),file);report.sourceHashes[file]=crypto.createHash('sha256').update(b).digest('hex');}
 const profile=path.resolve(process.env.MODERN_FRONT_TEST_PROFILE||'.tmp/native-aircraft-'+process.pid);report.profile=profile;
 host=await _electron.launch({executablePath:executable,args:['--windowed'],env:{...process.env,MODERN_FRONT_TEST_PROFILE:profile},timeout:45000});p=await host.firstWindow();p.on('pageerror',e=>report.errors.push(e.message));
 await p.waitForFunction(()=>window.ModernFront);report.version=await host.evaluate(({app})=>app.getVersion());assert.equal(report.version,require('../package.json').version);
 report.imports=await p.evaluate(async()=>{await Promise.all([WarImported.ready,WarImportedGround.ready,WarImportedAir.ready]);return[WarImported.status,WarImportedGround.status,WarImportedAir.status];});assert.deepEqual(report.imports,['ready','ready','ready']);
 assert.equal(await p.locator('#game-mode').inputValue(),'annihilation');assert.equal(await p.locator('#game-mode option').count(),1);
 await p.locator('#enemies').selectOption('1');await p.locator('[data-map="desert"]').click();await p.locator('#start').click();await p.waitForFunction(()=>ModernFront.game);await pause(true);
 const ids=await p.evaluate(()=>{const g=ModernFront.game,r=ModernFront.renderer;g.entities=[];g.effects=[];g.ore=[];g.result=null;g.ai=()=>{};g.buffs.add('vision');g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.map.tiles.fill(0);g.directObstacles=[];g.nodes=[];g.teams.forEach(t=>{t.queue=[];t.buildQueue=[];t.money=50000;t.alive=true;});g.spawn(0,'hq',300,300);const enemy=g.spawn(1,'hq',5700,3500),field=g.spawn(0,'airfield',2000,1700);g.spawn(0,'power',1700,1500);g.teams[0].queue=[{kind:'fighter',total:1,remaining:0,paid:0}];g.step(.05);const e=g.entities.find(e=>e.kind==='fighter');r.camera={x:2100,y:1940,zoom:1.45};r.prepare(g);g.directObstacles=[];g.spatial.rebuild(g.entities);g.updateFog();window.__flightId=e.id;window.__flightTrace=[];const original=g.step;g.step=function(dt){const v=original.call(this,dt),e=this.get(window.__flightId);if(e&&window.__flightTrace.at(-1)?.phase!==e.flight?.phase)window.__flightTrace.push({phase:e.flight?.phase,time:this.time,altitude:e.altitude,speed:e.flightSpeed});return v;};return{actor:e.id,field:field.id,enemy:enemy.id};});
 await p.evaluate(()=>ModernFront.game.options.rangeMode='balanced');
 await p.waitForFunction(id=>ModernFront.renderer.runwayObjects.has(id),ids.field);await snap('prepare');
 await pause(false);await p.waitForFunction(id=>ModernFront.game.get(id)?.flight.phase==='takeoff',ids.actor);await pause(true);await snap('takeoff');
 await pause(false);await p.waitForFunction(id=>ModernFront.game.get(id)?.flight.phase==='climb',ids.actor);await pause(true);await snap('climb');
 await pause(false);await p.waitForFunction(id=>ModernFront.game.get(id)?.flight.phase==='loiter',ids.actor);await pause(true);check('机场准备、加速滑跑、离地爬升、持续盘旋及可见跑道');
 const screen=await p.evaluate(id=>ModernFront.renderer.entityScreen(ModernFront.game.get(id)),ids.actor);await focus();await p.mouse.click(screen.x,screen.y);assert.ok((await p.evaluate(()=>ModernFront.selection)).includes(ids.actor));await p.keyboard.press('KeyE');await p.waitForFunction(()=>ModernFront.direct.active);await pause(false);await focus();await p.waitForTimeout(1500);await p.mouse.click(800,420);await p.waitForFunction(()=>!!document.pointerLockElement);await p.keyboard.press('KeyC');assert.equal(await p.evaluate(()=>ModernFront.direct.exteriorActive()),true);
 await realMouseSteering();
 await p.keyboard.press('KeyR');await p.waitForFunction(id=>ModernFront.game.get(id)?.flight.returning,ids.actor);check('真实 E 接管、C 机外视角、R 自动返航输入');
 await p.waitForFunction(id=>ModernFront.game.get(id)?.flight.phase==='approach',ids.actor,{timeout:60000});await pause(true);await snap('approach');
 await pause(false);await focus();await p.waitForTimeout(1500);if(!await p.evaluate(()=>!!document.pointerLockElement))await p.mouse.click(800,420);await p.waitForFunction(()=>!!document.pointerLockElement);await p.keyboard.press('KeyW');
 await p.waitForFunction(id=>ModernFront.game.get(id)?.flight.phase==='service',ids.actor,{timeout:60000});await pause(true);await snap('parked');report.phases=await p.evaluate(()=>window.__flightTrace);check('自动返航、对正进近、着陆减速、滑行停机维修');
 await p.keyboard.press('KeyE');await p.waitForFunction(()=>!ModernFront.direct.active);await p.evaluate(ids=>{const g=ModernFront.game;g.get(ids.enemy).hp=0;const last=g.spawn(1,'power',5500,3300);window.__lastEnemy=last.id;},ids);await pause(false);await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>ModernFront.game.result),null);assert.match(await p.locator('#objective').textContent(),/全歼敌军.*剩余设施 1/);await p.evaluate(()=>ModernFront.game.get(window.__lastEnemy).hp=0);await p.waitForFunction(()=>ModernFront.game.result==='victory');await snap('victory');check('摧毁总部后继续战斗，最后设施消灭才出现胜利界面');
 assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;if(p){report.state=await p.evaluate(()=>({paused:ModernFront.paused,lock:!!document.pointerLockElement,actor:ModernFront.game?.get(window.__flightId),trace:window.__flightTrace})).catch(()=>null);await p.screenshot({path:'.tmp/aircraft-native-failure.png'}).catch(()=>{});}}
 finally{fs.writeFileSync('docs/aircraft-flight-desktop-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,error:report.failure}));await host?.close();}
})();
