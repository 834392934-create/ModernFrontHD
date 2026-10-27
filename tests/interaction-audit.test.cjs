/* Independent behavior audit. No WebGL context, browser or implementation mocks. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
global.THREE=require('../assets/vendor/three.min.js');require('../src/data.js');require('../src/roster.js');require('../src/operator-weapons.js');require('../src/destructible-trees.js');require('../src/sim.js');require('../src/vehicle-interaction.js');
const {Game}=WarSim,T=THREE;
function arena(kind='tank'){
 const g=new Game({map:'desert',faction:'chn',enemies:1,buffs:['vision'],abilities:false});WarTrees.ensure(g);g.entities=[];g.effects=[];g.result=null;g.ai=()=>{};g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.spawn(0,'hq',300,300);g.spawn(1,'hq',4900,3000);g.teams.forEach(t=>{t.money=0;t.queue=[];t.buildQueue=[];});
 const crew=g.spawn(0,'operator',1100,900),body=g.spawn(0,kind,1180,900);crew.hp=87;g.operatorState(crew).stash.rifle_01={ammo:3,reserve:11};g.spatial.rebuild(g.entities);g.beginDirectControl(crew.id);return{g,crew,body};
}
function storedCrewCount(g,id){return g.entities.filter(e=>e.id===id).length+g.entities.filter(e=>e.vehicleCrew?.id===id).length;}
function board(f){const result=f.g.vehicleInteract(f.crew.id);assert.equal(result.ok,true,result.message);assert.equal(result.id,f.body.id);return result;}
function readyAt(f,point){
 assert.equal(f.g.beginDirectControl(f.body.id),true);const aim={fire:false,yaw:Math.atan2(point.y-f.body.y,point.x-f.body.x),pitch:Math.atan2(point.height-f.g.entityAltitude(f.body),Math.hypot(point.x-f.body.x,point.y-f.body.y)),aimX:point.x,aimY:point.y,aimHeight:point.height};f.g.setDirectInput(aim);
 for(let i=0;i<200&&!f.g.directFireStatus(f.body,null,aim).canFire;i++)f.g.step(.05);
 assert.equal(f.g.directFireStatus(f.body,null,aim).canFire,true,'actual mount and deployment must become ready');
}
test('repeated boarding and disembarking preserve exactly one same crew, health and spent ammo',()=>{
 const f=arena(),initialId=f.crew.id,next=f.g.nextId;for(let i=0;i<25;i++){
  board(f);assert.equal(storedCrewCount(f.g,initialId),1);assert.equal(f.g.get(initialId),undefined);assert.equal(f.body.vehicleCrew.hp,87);assert.deepEqual(f.body.vehicleCrew.operatorState.stash.rifle_01,{ammo:3,reserve:11});assert.equal(f.g.vehicleInteract(initialId).ok,false);
  const exit=f.g.vehicleInteract(f.body.id);assert.equal(exit.ok,true,exit.message);assert.equal(exit.id,initialId);assert.equal(f.g.directControl.id,initialId);assert.equal(storedCrewCount(f.g,initialId),1);assert.equal(f.g.get(initialId).hp,87);assert.deepEqual(f.g.operatorState(f.g.get(initialId)).stash.rifle_01,{ammo:3,reserve:11});
 }assert.equal(f.g.nextId,next);assert.equal(f.g.entities.length,4);
});
test('full boarding save/load preserves crew and rejects duplicate IDs and corrupt nested ammo',()=>{
 const f=arena();board(f);const saved=f.g.save(),loaded=Game.load(saved),body=loaded.get(f.body.id);assert.equal(loaded.validateVehicleCrews(),true);assert.equal(body.vehicleCrew.id,f.crew.id);assert.equal(storedCrewCount(loaded,f.crew.id),1);loaded.beginDirectControl(body.id);assert.equal(loaded.vehicleInteract(body.id).ok,true);assert.equal(loaded.get(f.crew.id).hp,87);assert.deepEqual(loaded.operatorState(loaded.get(f.crew.id)).stash.rifle_01,{ammo:3,reserve:11});
 const duplicate=structuredClone(saved);duplicate.entities.push(structuredClone(duplicate.entities.find(e=>e.id===f.body.id).vehicleCrew));assert.throws(()=>Game.load(duplicate),/乘员|载员|标识|驾驶员/);
 const ammo=structuredClone(saved);ammo.entities.find(e=>e.id===f.body.id).vehicleCrew.operatorState.stash.rifle_01.ammo=NaN;assert.throws(()=>Game.load(ammo),/乘员|弹药/);
});
test('old saves without crew/tree state load and newly associated drivers are not minted on repeated entry',()=>{
 const f=arena();const saved=f.g.save();delete saved.trees;for(const e of saved.entities){delete e.vehicleCrew;delete e.vehicleDriverId;delete e.vehicleDriverIssued;}const loaded=Game.load(saved),body=loaded.get(f.body.id),next=loaded.nextId;
 assert.equal(loaded.vehiclePrepareDirect(body.id),true);const id=body.vehicleCrew.id;for(let i=0;i<8;i++)assert.equal(loaded.vehiclePrepareDirect(body.id),true);assert.equal(storedCrewCount(loaded,id),1);assert.equal(loaded.nextId,next);
});
test('dead vehicles kill stowed crew once and cannot restore that actor',()=>{
 const f=arena();board(f);const lost=f.g.teams[0].lost,kills=f.g.teams[1].kills;f.g.damage(f.body,1e9,1);assert.equal(f.body.vehicleCrew,undefined);assert.equal(f.crew.hp,0);assert.equal(f.g.teams[0].lost,lost+2);assert.equal(f.g.teams[1].kills,kills+2);assert.equal(f.g.vehicleInteract(f.body.id).ok,false);f.g.damage(f.body,1e9,1);assert.equal(f.g.teams[0].lost,lost+2);assert.equal(storedCrewCount(f.g,f.crew.id),0);
});
test('unsafe sea/air/space exit searches land, and no safe land leaves crew and control untouched',()=>{
 for(const kind of ['destroyer','submarine','fighter','satellite']){
  const f=arena(kind);f.g.endDirectControl();assert.equal(f.g.vehiclePrepareDirect(f.body.id),true);f.g.beginDirectControl(f.body.id);f.g.map.blocked.fill(1);const old=f.body.vehicleCrew;
  assert.equal(f.g.vehicleInteract(f.body.id).ok,false,kind);assert.equal(f.body.vehicleCrew,old);assert.equal(f.g.directControl.id,f.body.id);assert.equal(storedCrewCount(f.g,old.id),1);
  const base=f.g.entities.find(e=>e.kind==='hq'&&e.team===0);for(let y=1;y<14;y++)for(let x=1;x<14;x++)f.g.map.blocked[y*WarData.COLS+x]=0;
  const result=f.g.vehicleInteract(f.body.id);assert.equal(result.ok,true,result.message);const actor=f.g.get(result.id);assert.equal(actor.altitude,0);assert.equal(result.emergency,true);assert.ok(WarNavigationFootprints.terrain(f.g,actor,actor.x,actor.y));assert.ok(Math.hypot(actor.x-base.x,actor.y-base.y)>base.r+actor.r);
 }
});
test('dead tree removes the same collider reference; live and destroyed IDs survive serialization',()=>{
 const f=arena(),tree=f.g.trees[0],other=f.g.trees[1],colliders=WarTrees.liveColliders(f.g);f.g.directObstacles=colliders;const otherId=other.id;assert.ok(colliders.includes(tree));WarTrees.damage(f.g,tree.id,11);assert.equal(tree.hp,79);WarTrees.damage(f.g,tree.id,1000);assert.equal(tree.hp,0);assert.equal(WarTrees.liveColliders(f.g),colliders);assert.equal(f.g.directObstacles.includes(tree),false);assert.equal(other.id,otherId);assert.equal(other.hp,90);
 const state=WarTrees.serialize(f.g),copy=new Game(f.g.options);WarTrees.restore(copy,state);assert.equal(WarTrees.get(copy,tree.id).hp,0);assert.equal(WarTrees.liveColliders(copy).some(x=>x.id===tree.id),false);
 const duplicate=structuredClone(state);duplicate.damage.push({...duplicate.damage[0]});assert.throws(()=>WarTrees.restore(copy,duplicate));assert.equal(WarTrees.get(copy,otherId).hp,90);
});
test('actual Three raycast returns stable trunk instance ID and stops hitting a destroyed trunk',()=>{
 const f=arena(),visual=WarTrees.createVisual(f.g),tree=f.g.trees[0],origin=new T.Vector3(tree.x-12,tree.trunkHeight*.5,tree.y),ray=new T.Raycaster(origin,new T.Vector3(1,0,0),0,24);visual.trunks.updateMatrixWorld(true);
 const hit=ray.intersectObject(visual.trunks)[0];assert.ok(hit);assert.equal(WarTrees.resolveHit(hit),tree.id);WarTrees.damage(f.g,tree.id,1000);visual.sync(f.g);assert.equal(ray.intersectObject(visual.trunks).some(h=>WarTrees.resolveHit(h)===tree.id),false);
 f.g.time+=2;visual.sync(f.g);assert.equal(visual.activeFalls.size,0);const matrix=new T.Matrix4();visual.fallingTrunks.getMatrixAt(0,matrix);assert.equal(matrix.determinant(),0);
});
test('tree damage rejects distant or high impacts; explosion damage occurs exactly at real shot arrival',()=>{
 const f=arena(),tree=f.g.trees[0],fx={type:'shot',tx:tree.x,ty:tree.y,targetHeight:5000,targetTreeId:tree.id,damage:40,baseDamage:40,splash:0,x:tree.x-20,y:tree.y};assert.equal(WarTrees.impact(f.g,fx),0);assert.equal(tree.hp,90);assert.equal(WarTrees.impact(f.g,{...fx,targetHeight:5,tx:tree.x+100}),0);
 f.g.endDirectControl();f.g.effects=[{...fx,targetHeight:5,ttl:.10,max:.10,from:0,target:null,sourceKind:'tank'}];f.g.step(.05);assert.equal(tree.hp,90);f.g.step(.05);assert.equal(tree.hp,50);f.g.step(.05);assert.equal(tree.hp,50,'impact visual must not damage again');
});
test('ground RTS nuclear strike destroys trees while a high airburst preserves distant ground foliage',()=>{
 const f=arena(),tree=f.g.trees[0];f.g.endDirectControl();f.g.effects=[{type:'nuke',x:tree.x,y:tree.y,height:5000,r:120,ttl:.05,max:.05,from:0}];f.g.step(.05);assert.equal(tree.hp,90);f.g.effects=[{type:'nuke',x:tree.x,y:tree.y,height:0,r:120,ttl:.05,max:.05,from:0}];f.g.step(.05);assert.equal(tree.hp,0);assert.equal(WarTrees.liveColliders(f.g).some(t=>t.id===tree.id),false);
});
test('real operator trigger spends one round and damages the aimed tree; full game reload retains the stump',()=>{
 const f=arena(),tree=f.g.trees[0];f.g.random=()=>0;f.crew.x=tree.x-70;f.crew.y=tree.y;f.crew.angle=0;f.crew.cool=0;f.g.spatial.rebuild(f.g.entities);
 f.g.setDirectInput({fire:true,yaw:0,targetTreeId:tree.id,aimX:tree.x,aimY:tree.y,aimHeight:5});f.g.setDirectInput({fire:false,yaw:0,targetTreeId:tree.id,aimX:tree.x,aimY:tree.y,aimHeight:5});f.g.step(.05);
 assert.equal(f.g.operatorState(f.crew).stash.rifle_01.ammo,2);const shot=f.g.effects.find(x=>x.type==='shot'&&x.sourceId===f.crew.id);assert.ok(shot);assert.equal(shot.targetTreeId,tree.id);for(let i=0;i<12;i++)f.g.step(.05);assert.ok(tree.hp<90);
 WarTrees.damage(f.g,tree.id,1000);const loaded=Game.load(JSON.stringify(f.g.save()));assert.equal(WarTrees.get(loaded,tree.id).hp,0);assert.equal(WarTrees.liveColliders(loaded).some(t=>t.id===tree.id),false);
});
test('world clearing releases all tree instance buffers and each shared tree geometry/material once',()=>{
 require('../src/battle3d.js');const f=arena(),visual=WarTrees.createVisual(f.g),r=Object.create(Battle3D.prototype);r.scene=new T.Scene();r.world=new T.Group();r.objects=new Map();r.treeVisual=visual;r.world.add(...visual.meshes);let meshes=0,geometries=0,materials=0;
 for(const mesh of visual.meshes)mesh.addEventListener('dispose',()=>meshes++);for(const geo of new Set(visual.meshes.map(m=>m.geometry)))geo.addEventListener('dispose',()=>geometries++);for(const mat of new Set(visual.meshes.map(m=>m.material)))mat.addEventListener('dispose',()=>materials++);
 r.disposeWorld();assert.equal(meshes,5,'InstancedMesh disposal releases its per-instance attributes');assert.equal(geometries,2);assert.equal(materials,2);assert.equal(r.world.children.length,0);
});
function inputFixture(){
 const elements=new Map(),el=()=>({hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s);}}),document={hidden:false,pointerLockElement:null,createElement:el,body:{append(){}},addEventListener(){}};
 const context={THREE:T,document,innerWidth:1600,innerHeight:1000,console,addEventListener(){}};context.globalThis=context;vm.createContext(context);for(const file of ['data.js','roster.js','combat-readiness.js','combat-damage.js','combat-audio.js','transport-operations.js','direct-control.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),context);
 let paused=false,allowed=true,calls=0;const renderer={canvas:{},width:1600,height:1000,camera:{}};const direct=new context.WarDirectControl(renderer,{paused:()=>paused,canEnter:()=>allowed,toast(){}});direct.active=true;direct.entityId=1;direct.game={get:()=>({id:1,kind:'operator'}),setDirectInput(){},vehicleInteract(){calls++;return{ok:false,message:'test'};}};document.pointerLockElement=renderer.canvas;
 return{direct,document,setPaused:v=>paused=v,setAllowed:v=>allowed=v,get calls(){return calls;},key(extra={}){direct.keyDown({code:'KeyF',repeat:false,target:{tagName:'DIV'},preventDefault(){},stopImmediatePropagation(){},...extra});}};
}
test('F is gated by pause, pointer lock, dialogs, hidden document and key repeat',()=>{
 for(const gate of ['pause','unlock','armory','vehicleMenu','modal','hidden','repeat']){const f=inputFixture();if(gate==='pause')f.setPaused(true);if(gate==='unlock')f.document.pointerLockElement=null;if(gate==='armory')f.direct.operatorUI={open:true};if(gate==='vehicleMenu')f.direct.vehicleMenu={open:true};if(gate==='modal')f.setAllowed(false);if(gate==='hidden')f.document.hidden=true;f.key({repeat:gate==='repeat'});assert.equal(f.calls,0,gate);}
 const f=inputFixture();f.key();assert.equal(f.calls,1);
});
test('F never leaks out of focused text controls or an unfocused document',()=>{
 for(const target of [{tagName:'INPUT'},{tagName:'TEXTAREA'},{tagName:'SELECT'},{tagName:'DIV',isContentEditable:true}]){const f=inputFixture();f.key({target});assert.equal(f.calls,0,target.tagName);}
 const f=inputFixture();f.document.hasFocus=()=>false;f.key();assert.equal(f.calls,0);
});
test('an existing driver dying after disembark cannot mint a free replacement via direct entry',()=>{
 const f=arena();board(f);assert.equal(f.g.vehicleInteract(f.body.id).ok,true);f.g.damage(f.crew,1e9,1);f.g.endDirectControl();const next=f.g.nextId;
 assert.equal(f.g.vehiclePrepareDirect(f.body.id),false,'a previously crewed vehicle must require another existing person');assert.equal(f.g.nextId,next);assert.equal(f.body.vehicleCrew,undefined);
});
test('tree impact retains configured explosive radius without inventing additional tree-channel damage',()=>{
 for(const kind of ['tank','rocket']){const f=arena(kind),tree=f.g.trees[0];f.g.endDirectControl();f.body.x=tree.x+(tree.x<WarData.W/2?200:-200);f.body.y=tree.y;const target=f.g.spawn(1,'tank',tree.x,tree.y+45),before=target.hp;target.disabled=999;f.g.spatial.rebuild(f.g.entities);const point={x:tree.x,y:tree.y,height:5,targetTreeId:tree.id};readyAt(f,point);const definition=f.g.weaponDefinition(f.body),count=WarWeaponSalvos.profile(f.g,f.body)?.count||1;assert.equal(f.g.emitShot(f.body,null,point),true);const shot=f.g.effects.find(x=>x.type==='shot');assert.equal(shot.damage,0);assert.equal(shot.baseDamage,definition.damage/count);assert.equal(shot.splash,definition.splash);assert.ok(shot.treeDamage>0);assert.equal(shot.treeSplash,definition.splash);f.body.disabled=999;for(let i=0;i<30;i++)f.g.step(.05);assert.ok(tree.hp<90,kind);if(kind==='rocket'){assert.ok(target.hp<before,'MLRS area damage must apply normally around a tree impact');assert.ok(before-target.hp<=definition.damage);}else assert.equal(target.hp,before,kind+' should not gain new entity damage from tree channel');}
});
test('tree save rejects invalid map, unknown IDs and nonfinite HP before modifying existing damage',()=>{
 const f=arena(),tree=f.g.trees[0];WarTrees.damage(f.g,tree.id,17);const saved=WarTrees.serialize(f.g);for(const mutate of [s=>s.mapKey+='other',s=>s.damage[0].id='tree:unknown',s=>s.damage[0].hp=NaN,s=>s.damage[0].hp=-1,s=>s.damage[0].hp=91]){const bad=structuredClone(saved);mutate(bad);assert.throws(()=>WarTrees.restore(f.g,bad));assert.equal(tree.hp,73);}
 const loaded=Game.load(JSON.stringify(f.g.save()));assert.equal(WarTrees.get(loaded,tree.id).hp,73);assert.ok(WarTrees.liveColliders(loaded).some(t=>t.id===tree.id));
});
function scopeFixture(){const f=inputFixture(),a=arena('orbital');f.direct.game=a.g;f.direct.entityId=a.body.id;f.direct.cb.unitName=k=>k;f.direct.r.entityHeight=e=>a.g.entityAltitude(e);a.body.altitude=12000;f.direct.yaw=.7;f.direct.pitch=-.4;f.direct.updateCamera();return{...f,...a};}
test('orbital scope rejects invalid scroll and all blocked scrolling without changing exact optical magnification',()=>{
 const f=scopeFixture(),d=f.direct;f.key({code:'KeyV'});assert.equal(d.orbitScope.active,true);const wheel=deltaY=>d.wheel({deltaY,preventDefault(){},stopImmediatePropagation(){}});
 for(const delta of [0,NaN,Infinity,-Infinity])wheel(delta);assert.equal(d.orbitScope.zoom,4);for(let i=0;i<20;i++)wheel(-1);assert.equal(d.orbitScope.zoom,64);assert.ok(Math.abs(Math.tan(d.camera.fov*Math.PI/360)*64-Math.tan(70*Math.PI/360))<1e-12);
 for(const gate of ['pause','unlock','modal','menu','armory','hidden','focus']){f.setPaused(gate==='pause');f.setAllowed(gate!=='modal');f.document.pointerLockElement=gate==='unlock'?null:d.r.canvas;d.vehicleMenu={open:gate==='menu'};d.operatorUI={open:gate==='armory'};f.document.hidden=gate==='hidden';f.document.hasFocus=()=>gate!=='focus';wheel(1);assert.equal(d.orbitScope.zoom,64,gate);}
});
test('orbit pole panning stays normalized through repeated pitch crossings and cannot move craft or extend range',()=>{
 const f=scopeFixture(),d=f.direct,before=[f.body.x,f.body.y,f.body.altitude],range=f.g.rangeProfile(f.body).attack;f.key({code:'KeyG'});for(let i=0;i<1000;i++)d.mouseMove({movementX:70,movementY:140});d.updateCamera();const q=d.camera.quaternion,dir=d.camera.getWorldDirection(new T.Vector3());assert.ok([q.x,q.y,q.z,q.w,dir.x,dir.y,dir.z,d.pitch,d.yaw].every(Number.isFinite));assert.ok(Math.abs(q.length()-1)<1e-10);assert.deepEqual([f.body.x,f.body.y,f.body.altitude],before);assert.equal(f.g.rangeProfile(f.body).attack,range);d.resetOrbitScope();assert.equal(d.orbitScope.zoom,4);assert.equal(d.camera.fov,70);assert.equal(d.orbitScope.active,false);
});
test('driver association survives save/load and legacy missing-issued flag cannot resurrect a dead driver',()=>{
 const f=arena();board(f);assert.equal(f.g.vehicleInteract(f.body.id).ok,true);f.g.damage(f.crew,1e9,1);f.g.endDirectControl();const saved=f.g.save();
 for(const legacy of [false,true]){const copy=structuredClone(saved);if(legacy)delete copy.entities.find(e=>e.id===f.body.id).vehicleDriverIssued;const loaded=Game.load(copy),next=loaded.nextId;assert.equal(loaded.vehiclePrepareDirect(f.body.id),false);assert.equal(loaded.nextId,next);assert.equal(loaded.get(f.body.id).vehicleCrew,undefined);}
});
test('in-flight tree shot save/load retains delayed environment impact exactly once',()=>{
 const f=arena(),tree=f.g.trees[0];f.g.endDirectControl();f.body.x=tree.x+(tree.x<WarData.W/2?200:-200);f.body.y=tree.y;const point={x:tree.x,y:tree.y,height:5,targetTreeId:tree.id};readyAt(f,point);const damage=f.g.weaponDefinition(f.body).damage;assert.equal(f.g.emitShot(f.body,null,point),true);const loaded=Game.load(JSON.stringify(f.g.save()));loaded.ai=()=>{};const shot=loaded.effects.find(e=>e.type==='shot');assert.equal(shot.targetTreeId,tree.id);assert.equal(shot.treeDamage,damage);assert.equal(WarTrees.get(loaded,tree.id).hp,90);f.body.disabled=loaded.get(f.body.id).disabled=999;for(let i=0;i<40;i++){loaded.step(.05);f.g.step(.05);}const hp=WarTrees.get(loaded,tree.id).hp;assert.ok(hp<90&&hp>=Math.max(0,90-damage),'physical trunk contact applies one bounded blast');assert.equal(hp,WarTrees.get(f.g,tree.id).hp,'save/load preserves the same swept contact and radial falloff');for(let i=0;i<40;i++)loaded.step(.05);assert.equal(WarTrees.get(loaded,tree.id).hp,hp,'retained discharge cannot apply tree damage a second time');
});
