/* Independent audit: actual simulation and Three CPU raycasts, no WebGL. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.THREE=require('../assets/vendor/three.min.js');for(const f of ['data','roster','sim','models3d','model-detail','models-tanks','models-vehicles','models-naval','models-roster','models-buildings','models-operator','personnel-animation'])require('../src/'+f+'.js');const T=THREE,{Game}=WarSim;
function arena(kind='tank',targetKind='tank'){
 const g=new Game({map:'desert',faction:'chn',enemies:1,buffs:['vision'],abilities:false});g.entities=[];g.effects=[];g.ore=[];g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.ai=()=>{};g.spawn(0,'hq',300,300);g.spawn(1,'hq',5500,3500);g.teams.forEach(t=>{t.money=0;t.queue=[];t.buildQueue=[];});const actor=g.spawn(0,kind,1800,1400),target=g.spawn(1,targetKind,1950,1400);target.disabled=1e8;g.beginDirectControl(actor.id);g.spatial.rebuild(g.entities);g.random=()=>0;return{g,actor,target};
}
function input(f,point,fire=true){return{fire,yaw:0,targetId:f.target.id,aimX:point.x,aimY:point.z,aimHeight:point.y};}
function finish(f,seconds=.8){f.g.setDirectInput({fire:false});for(let n=0;n<seconds*20;n++)f.g.step(.05);}
function modelFor(f){const m=WarModels.create(f.target.kind,'chn');m.scale.setScalar(m.userData.scale);m.position.set(f.target.x,f.g.entityAltitude(f.target),f.target.y);m.updateMatrixWorld(true);return m;}
test('a press and release between ticks fires one non-operator shot and applies damage',()=>{
 for(const kind of ['tank','infantry','destroyer','orbital']){const f=arena(kind);f.target.x=f.actor.x+100;const p=new T.Vector3(f.target.x,5,f.target.y);f.g.setDirectInput(input(f,p,true));f.g.setDirectInput(input(f,p,false));f.g.step(.05);const shots=f.g.effects.filter(x=>x.type==='shot'&&x.sourceId===f.actor.id);assert.equal(shots.length,1,kind+' lost a short click');finish(f);assert.ok(f.target.hp<f.target.maxHp,kind);}
});
test('an actual anti-air vehicle upper mesh hit is not discarded by a shorter combat cylinder',()=>{
 const f=arena('tank','aa'),m=modelFor(f);let hit;
 for(let y=21;y<30&&!hit;y+=.5)for(let z=-10;z<=10&&!hit;z+=.5){const ray=new T.Raycaster(new T.Vector3(f.actor.x,y,f.target.y+z),new T.Vector3(1,0,0),0,200);hit=ray.intersectObject(m,true)[0];}
 assert.ok(hit,'real visible upper assembly exists');assert.ok(hit.point.y>f.g.hitHeightRadius(f.target));f.g.setDirectInput(input(f,hit.point));f.g.step(.05);const shot=f.g.effects.find(x=>x.type==='shot'&&x.sourceId===f.actor.id);assert.equal(shot?.target,f.target.id,'valid visible mesh hit was rejected at '+hit.point.toArray());finish(f);assert.ok(f.target.hp<f.target.maxHp);
});
test('zero-spread operator hit on real vehicle hull beyond circular entity radius damages the vehicle',()=>{
 const f=arena('operator','ifv'),m=modelFor(f);let hit;
 for(let x=-23;x<-15&&!hit;x+=.25){const ray=new T.Raycaster(new T.Vector3(f.target.x+x,6,f.target.y-100),new T.Vector3(0,0,1),0,200);hit=ray.intersectObject(m,true)[0];}
 assert.ok(hit);assert.ok(Math.hypot(hit.point.x-f.target.x,hit.point.z-f.target.y)>f.target.r);f.g.setDirectInput(input(f,hit.point));f.g.step(.05);const shot=f.g.effects.find(x=>x.type==='shot'&&x.sourceId===f.actor.id);assert.equal(shot?.target,f.target.id,'visible hull edge should not become a harmless miss');finish(f);assert.ok(f.target.hp<f.target.maxHp);
});

test('pitched and rolled real aircraft hull surfaces pass the same firing envelope as rendered transforms',()=>{
 for(const file of ['models-air','models-depth-wave'])require('../src/'+file+'.js');
 for(const kind of ['fighter','omni_dreadnought']){const f=arena('orbital',kind);f.g.teams[1].faction='chn';f.target.angle=.7;f.target.pitch=.6;f.target.roll=.25;const m=modelFor(f);m.rotation.set(f.target.roll,-f.target.angle,f.target.pitch,'YZX');m.updateMatrixWorld(true);const box=new T.Box3().setFromObject(m),center=box.getCenter(new T.Vector3());let hits=0,rejected=[];
 for(let i=1;i<12;i++)for(let j=1;j<12;j++){const origin=new T.Vector3(box.min.x+(box.max.x-box.min.x)*i/12,box.max.y+50,box.min.z+(box.max.z-box.min.z)*j/12),hit=new T.Raycaster(origin,new T.Vector3(0,-1,0),0,box.max.y-box.min.y+100).intersectObject(m,true)[0];if(!hit)continue;hits++;if(!f.g.directAimValid(f.target,{aimPoint:hit.point}))rejected.push(hit.point.toArray());}
 assert.ok(hits>10,kind+' mesh sample coverage');assert.equal(rejected.length,0,kind+' rejects '+JSON.stringify(rejected.slice(0,3)));
 }
});
function controls(kind='tank'){
 const f=arena(kind),nodes=new Map(),listeners={},el=()=>({hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s);}}),document={hidden:false,pointerLockElement:null,createElement:el,body:{append(){}},addEventListener(n,fn){(listeners[n]??=[]).push(fn);}};
 const c={THREE:T,WarData,WarNavigationFootprints,WarOperatorWeapons,WarTrees,document,innerWidth:1600,innerHeight:1000,console,addEventListener(){}};c.globalThis=c;vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../src/direct-control.js'),'utf8'),c);
 f.g.teams[1].faction='chn';f.target.x=f.actor.x+100;const r={canvas:{},width:1600,height:1000,camera:{},objects:new Map(),world:new T.Group(),entityHeight:e=>f.g.entityAltitude(e)},d=new c.WarDirectControl(r,{game:()=>f.g,paused:()=>false,canEnter:()=>true,unitName:k=>k,sound:()=>false,toast(){}});d.active=true;d.game=f.g;d.entityId=f.actor.id;d.yaw=0;const height=f.g.entityAltitude(f.actor)+(WarData.U[kind].air?7:kind==='operator'?9.5:WarData.U[kind].naval?21:19);d.pitch=Math.atan2(8-height,100);r.objects.set(f.target.id,modelFor(f));d.updateCamera();document.pointerLockElement=r.canvas;
 const event=(more={})=>({target:{tagName:'DIV',closest(){return null;}},preventDefault(){},stopImmediatePropagation(){},...more});return{...f,d,r,document,pointer:(type,button)=>listeners[type].forEach(fn=>fn(event({button}))),wheel:dy=>d.wheel(event({deltaY:dy})),key:code=>d.keyDown(event({code,repeat:false}))};
}
test('all optical magnifications accept real left-click while right button is held; release restores V latch',()=>{
 for(const kind of ['tank','operator','orbital']){const f=controls(kind),zooms=kind==='orbital'?[4,8,16,32,64]:[1.5,2,4,8,16];f.target.hp=f.target.maxHp=10000;const slot=kind==='operator'?f.g.operatorState(f.actor).activeSlot:null;f.pointer('mousedown',2);
 for(const z of zooms){assert.equal(f.d.scopeState().zoom,z);const hp=f.target.hp;f.actor.cool=0;f.pointer('mousedown',0);f.pointer('mouseup',0);f.g.step(.05);finish(f);assert.ok(f.target.hp<hp,kind+' '+z+'x real shot');assert.ok(f.d.opticalActive());assert.ok(Math.abs(Math.tan(f.d.camera.fov*Math.PI/360)*z-Math.tan(70*Math.PI/360))<1e-10);f.wheel(-1);}
 if(slot!==null)assert.equal(f.g.operatorState(f.actor).activeSlot,slot,'zoom wheel must not switch operator weapon');f.pointer('mouseup',2);assert.equal(f.d.opticalActive(),false);f.key('KeyV');f.pointer('mousedown',2);f.pointer('mouseup',2);assert.equal(f.d.opticalActive(),true,'V-latched state survives RMB release');
 }
});
test('real muzzle obstruction blocks target, damage and ready HUD even when camera can see over cover',()=>{
 const f=controls('tank'),block=new T.Mesh(new T.BoxGeometry(2,5,20),new T.MeshBasicMaterial());block.position.set(f.actor.x+10,12,f.actor.y);block.updateMatrixWorld(true);f.r.world.add(block);f.d.aimResult=f.d.aim();assert.equal(f.d.aimResult.target,null);assert.equal(f.d.aimResult.occluded,true);assert.equal(f.d.orbitTargetStatus().canFire,false);assert.match(f.d.orbitTargetStatus().text,/遮挡/);f.pointer('mousedown',0);f.pointer('mouseup',0);f.g.step(.05);finish(f);assert.equal(f.target.hp,f.target.maxHp);block.geometry.dispose();block.material.dispose();
});
test('unarmed, wrong domain, friend, hidden target, blind zone and overrange never show ready',()=>{
 for(const [driver,targetKind,reason] of [['field_medic','tank','unarmed'],['tank','fighter','domain'],['arty','tank','min-range']]){const f=arena(driver,targetKind);if(driver==='arty')f.target.x=f.actor.x+20;const s=f.g.directFireStatus(f.actor,f.target);assert.equal(s.canFire,false);assert.equal(s.reason,reason);}
 const f=arena();f.target.team=0;assert.equal(f.g.directFireStatus(f.actor,f.target).reason,'friendly');f.target.team=1;f.g.buffs.delete('vision');f.g.visible.fill(0);assert.equal(f.g.directFireStatus(f.actor,f.target).reason,'undetected');f.g.buffs.add('vision');f.target.x=f.actor.x+f.g.rangeProfile(f.actor).attack+.1;const s=f.g.directFireStatus(f.actor,f.target);assert.equal(s.reason,'out-of-range');assert.equal(s.inRange,false);
});
test('operator HUD range follows equipped weapon and slot; ammo/reload/cooldown are separate from range',()=>{
 const f=controls('operator');for(const [slot,id] of [[0,'sniper_01'],[1,'pistol_01']]){assert.equal(f.g.operatorEquip(f.actor.id,slot,id),true);assert.equal(f.g.operatorSwitch(f.actor.id,slot),true);f.actor.cool=0;f.d.aimResult=f.d.aim();const s=f.d.orbitTargetStatus();assert.equal(s.range,WarOperatorWeapons.byId[id].range);assert.equal(s.range,f.g.rangeProfile(f.actor).attack);const state=f.g.operatorState(f.actor),ammo=state.stash[id];ammo.ammo=0;assert.equal(f.g.directFireStatus(f.actor,f.target).reason,'no-ammo');ammo.ammo=1;state.reloadRemaining=1;assert.equal(f.g.directFireStatus(f.actor,f.target).reason,'reloading');state.reloadRemaining=0;f.actor.cool=1;assert.equal(f.g.directFireStatus(f.actor,f.target).reason,'cooldown');f.actor.cool=0;}
});
test('effective radar range is shared by direct status; damage and resource buffs do not invent extra range',()=>{
 const f=arena(),turret=f.g.spawn(0,'turret',1500,1400);f.g.spawn(0,'power',1400,1350);f.g.spawn(0,'power',1400,1450);f.g.spawn(0,'radar',1510,1400);const profile=f.g.rangeProfile(turret);assert.equal(profile.boosted,true);assert.equal(f.g.directFireStatus(turret,f.target).range,profile.attack);const before=f.g.rangeProfile(f.actor).attack;for(const b of ['damage','armor','unlimited'])f.g.buffs.add(b);assert.equal(f.g.directFireStatus(f.actor,f.target).range,before);
});
test('invalid distant aim point and cancelled pending shot cannot leak a later hit',()=>{
 const f=arena(),p=new T.Vector3(f.target.x+1000,500,f.target.y);assert.equal(f.g.directFireStatus(f.actor,f.target,{aimPoint:p}).reason,'aim-miss');f.g.setDirectInput(input(f,new T.Vector3(f.target.x,5,f.target.y)));f.g.setDirectInput({cancelJump:true,fire:false});f.g.step(.05);assert.ok(!f.g.effects.some(x=>x.type==='shot'&&x.sourceId===f.actor.id));finish(f);assert.equal(f.target.hp,f.target.maxHp);
});
