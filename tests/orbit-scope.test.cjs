const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const THREE=require('../assets/vendor/three.min.js');require('../src/data');require('../src/roster');require('../src/equipment');require('../src/sim');
require('../src/combat-audio.js');
function fixture(kind='orbital',height=4000){
 const nodes=new Map(),listeners={},events={},el=()=>({hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s);}}),document={hidden:false,pointerLockElement:null,createElement:el,body:{append(){}},addEventListener(n,fn){(listeners[n]??=[]).push(fn);}};
 const c={THREE,WarData,WarNavigationFootprints,WarCombatReadiness,WarCombatDamage,WarTransportOperations,WarCombatAudio,document,innerWidth:1600,innerHeight:1000,console,addEventListener(n,fn){events[n]=fn;}};c.globalThis=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/direct-control.js'),'utf8'),c);
 const g=new WarSim.Game({map:'desert',enemies:1,buffs:['vision']});g.entities=[];g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.spawn(0,'hq',300,300);g.spawn(1,'hq',5500,3500);const actor=g.spawn(0,kind,1800,1400);actor.altitude=height;g.beginDirectControl(actor.id);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});
 const r={canvas:{},width:1600,height:1000,camera:{},objects:new Map(),world:new THREE.Group(),entityHeight:e=>g.entityAltitude(e)};let paused=false,allowed=true;
 const d=new c.WarDirectControl(r,{game:()=>g,paused:()=>paused,canEnter:()=>allowed,unitName:k=>k,sound:()=>false,toast(){}});d.active=true;d.game=g;d.entityId=actor.id;d.yaw=0;d.pitch=-.4;d.lastHP=actor.hp;document.pointerLockElement=r.canvas;d.updateCamera();
 const event=(extra={})=>({target:{tagName:'DIV'},preventDefault(){},stopImmediatePropagation(){},...extra});
 return{d,g,actor,r,document,events,paused:v=>paused=v,allowed:v=>allowed=v,key:(code,extra={})=>d.keyDown(event({code,repeat:false,...extra})),mouse:(x,y)=>d.mouseMove({movementX:x,movementY:y}),wheel:dy=>d.wheel(event({deltaY:dy}))};
}
test('orbital V uses true optical FOV at all five magnifications, without moving the craft',()=>{
 const f=fixture(),before=[f.actor.x,f.actor.y,f.actor.altitude],limits=f.g.rangeProfile(f.actor).attack;f.key('KeyV');assert.equal(f.d.orbitScope.active,true);
 for(const zoom of [4,8,16,32,64]){assert.equal(f.d.orbitScope.zoom,zoom);assert.ok(Math.abs(Math.tan(f.d.camera.fov*Math.PI/360)*zoom-Math.tan(70*Math.PI/360))<1e-10);assert.equal(f.g.rangeProfile(f.actor).attack,limits);f.wheel(-120);}
 assert.equal(f.d.orbitScope.zoom,64);f.wheel(120);assert.equal(f.d.orbitScope.zoom,32);assert.deepEqual([f.actor.x,f.actor.y,f.actor.altitude],before);f.key('KeyV');assert.equal(f.d.orbitScope.active,false);assert.equal(f.d.camera.fov,70);
});
test('64x angular mouse sensitivity is 1/16 of 4x and RMB does not replace selected optics',()=>{
 const f=fixture();f.key('KeyV');const first=f.d.orbitScope.rotation.clone();f.mouse(10,0);const four=first.angleTo(f.d.orbitScope.rotation);f.d.orbitScope.rotation.copy(first);for(let i=0;i<4;i++)f.wheel(-1);f.mouse(10,0);const sixtyFour=first.angleTo(f.d.orbitScope.rotation);assert.ok(Math.abs(four/sixtyFour-16)<.001);f.d.ads=true;f.d.update(.05,1);assert.ok(Math.abs(f.d.camera.fov-f.d.scopeFOV())<1e-8);assert.equal(f.d.orbitScope.zoom,64);
});
test('G acquires real ground geometry at 4000 and 12000 units; horizontal precision survives the downward pole',()=>{
 for(const height of [4000,12000]){const f=fixture('orbital',height),target=f.g.spawn(1,'tank',f.actor.x,f.actor.y),mesh=new THREE.Mesh(new THREE.BoxGeometry(40,20,40),new THREE.MeshBasicMaterial());mesh.position.set(target.x,10,target.y);mesh.updateMatrixWorld();f.r.objects.set(target.id,mesh);const before=[f.actor.x,f.actor.y,f.actor.altitude];f.key('KeyG');f.d.updateCamera();let aim=f.d.aim();assert.equal(aim.target.id,target.id);assert.ok(Math.abs(aim.point.x-target.x)<.001);assert.ok(Math.abs(aim.point.z-target.y)<.001);f.d.aimResult=aim;assert.equal(f.d.orbitTargetStatus().canFire,true);f.mouse(1,0);f.d.updateCamera();const dir=f.d.camera.getWorldDirection(new THREE.Vector3());assert.ok(dir.x>0,'screen-right panning changes ground aim instead of spinning in place');assert.ok(Math.abs(dir.z)<1e-8);f.d.submit();f.g.step(.05);assert.deepEqual([f.actor.x,f.actor.y,f.actor.altitude],before);mesh.geometry.dispose();mesh.material.dispose();}
});
test('zoom projects the same real object sixteen times wider at 64x than at 4x',()=>{
 const f=fixture('orbital',12000);f.key('KeyG');f.d.updateCamera();const width=()=>{const a=new THREE.Vector3(f.actor.x-10,0,f.actor.y).project(f.d.camera),b=new THREE.Vector3(f.actor.x+10,0,f.actor.y).project(f.d.camera);return Math.abs(b.x-a.x);};const small=width();for(let i=0;i<4;i++)f.wheel(-1);assert.ok(Math.abs(width()/small-16)<1e-8);
});
test('orbital HUD respects real domain, range, friendly ownership, EMP, reload and upper layers',()=>{
 const f=fixture(),t=f.g.spawn(1,'tank',f.actor.x+200,f.actor.y);f.key('KeyV');f.d.aimResult={target:t,observedTarget:t};let s=f.d.orbitTargetStatus();assert.equal(s.projected,true);assert.equal(s.distance,200);assert.equal(s.canFire,true);
 t.x=f.actor.x+s.range+1;assert.match(f.d.orbitTargetStatus().text,/超出射程/);t.x=f.actor.x+200;t.team=0;assert.match(f.d.orbitTargetStatus().text,/己方/);t.team=1;f.actor.disabled=f.g.time+10;assert.match(f.d.orbitTargetStatus().text,/EMP/);f.actor.disabled=0;
 assert.equal(f.g.emitShot(f.actor,t),true,'actual launch starts station cooldown');assert.match(f.d.orbitTargetStatus().text,/装填/);
 const upper=f.g.spawn(1,'satellite',f.actor.x+30,f.actor.y);upper.altitude=12000;f.d.aimResult={target:upper,observedTarget:upper};s=f.d.orbitTargetStatus();assert.equal(s.projected,false);assert.ok(s.distance>7900);assert.equal(s.range,f.g.rangeProfile(f.actor).attack);
});
test('pause, lock, menus, text input and focus gates prevent scope control; clearing drops fire and movement',()=>{
 for(const gate of ['paused','unlocked','hidden','blurred','modal','menu','repeat','text']){const f=fixture();if(gate==='paused')f.paused(true);if(gate==='unlocked')f.document.pointerLockElement=null;if(gate==='hidden')f.document.hidden=true;if(gate==='blurred')f.document.hasFocus=()=>false;if(gate==='modal')f.allowed(false);if(gate==='menu')f.d.vehicleMenu={open:true};f.key('KeyV',gate==='repeat'?{repeat:true}:gate==='text'?{target:{tagName:'INPUT'}}:{});assert.equal(f.d.orbitScope.active,false,gate);}
 const f=fixture();f.key('KeyV');f.d.fire=true;f.d.keys.add('KeyW');f.events.blur();assert.equal(f.d.fire,false);assert.equal(f.d.keys.size,0);assert.equal(f.g.directControl.input.fire,false);assert.equal(f.g.directControl.input.forward,0);f.d.resetOrbitScope();assert.equal(f.d.orbitScope.active,false);assert.equal(f.d.camera.fov,70);
});
test('non-space actors use separate optics and preserve unscoped operator wheel switching',()=>{
 for(const kind of ['operator','tank','fighter']){const f=fixture(kind,0);f.key('KeyV');f.key('KeyG');assert.equal(f.d.orbitScope.active,false);assert.equal(f.d.aimScope.active,true);assert.ok(f.d.camera.fov<70);f.key('KeyV');if(kind==='operator'){const before=f.g.operatorStatus(f.actor.id).activeSlot;f.wheel(-120);assert.equal(f.g.operatorStatus(f.actor.id).activeSlot,1-before);}}
});
test('scope hides the cockpit render while retaining normal overlay execution',()=>{
 const f=fixture();let calls=0;f.d.view={render(){calls++;}};f.r.ctx={};f.g.effects=[];f.d.drawOverlay(f.g,0);assert.equal(calls,1);f.key('KeyV');f.d.drawOverlay(f.g,0);assert.equal(calls,1);f.key('KeyV');f.d.drawOverlay(f.g,0);assert.equal(calls,2);
});
test('high-orbit optical near plane improves depth precision and restores the ordinary view on exit',()=>{
 for(const height of [4000,12000]){const f=fixture('orbital',height);f.key('KeyG');f.d.updateCamera();assert.ok(f.d.camera.near>100&&f.d.camera.near<=500,`${height} near ${f.d.camera.near}`);assert.equal(f.d.camera.far,100000);f.d.update(.05,1);assert.match(f.d.el('attitude').textContent,/机体俯仰.*机体滚转/);f.key('KeyV');assert.equal(f.d.camera.near,1);assert.equal(f.d.camera.fov,70);f.key('KeyV');f.d.resetOrbitScope();assert.equal(f.d.camera.near,1);}
 const ground=fixture('tank',0);ground.key('KeyV');ground.d.updateCamera();assert.equal(ground.d.camera.near,.08);
});
test('nearby friendly and enemy orbital hulls remain inside the optical frustum',()=>{
 for(const team of [0,1]){const f=fixture('orbital',12000);f.key('KeyG');const near=f.g.spawn(team,'satellite',f.actor.x,f.actor.y);near.altitude=11890;f.d.updateCamera();const b=WarNavigationFootprints.bounds[near.kind+'_'+f.g.teams[team].faction],top=new THREE.Vector3(near.x,near.altitude+b[2],near.y),clip=top.clone().project(f.d.camera);assert.ok(f.d.camera.near<f.d.eye.distanceTo(top)*.5);assert.ok(clip.z>=-1&&clip.z<=1,`team ${team} nearby top remains in depth range`);assert.ok(f.d.camera.near<100);
  near.x=f.actor.x;near.y=f.actor.y;near.altitude=f.d.eye.y;f.d.updateCamera();assert.equal(f.d.camera.near,.08,'inside conservative model envelope falls back to 0.08');}
});
test('current optical aim surface constrains near plane without traversing scene meshes',()=>{
 const f=fixture('orbital',12000);f.key('KeyG');f.d.updateCamera();f.d.aimResult={point:f.d.eye.clone().add(new THREE.Vector3(0,-40,0))};f.r.objects={values(){throw Error('must not scan mesh geometry');}};f.d.updateCamera();assert.ok(f.d.camera.near>1&&f.d.camera.near<20);assert.ok(f.d.aimResult.point.clone().project(f.d.camera).z>=-1);
});
