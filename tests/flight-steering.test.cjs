const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const T=require('../assets/vendor/three.min.js');for(const f of ['data','roster','equipment','sim'])require('../src/'+f);
function arena(kind='fighter'){
 const g=new WarSim.Game({map:'desert',enemies:1,buffs:['vision']});g.entities=[];g.ore=[];g.effects=[];g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.ai=()=>{};g.spawn(0,'hq',300,300);g.spawn(1,'hq',5700,3500);
 const e=g.spawn(0,kind,2600,1800);e.angle=0;e.altitude=300;g.beginDirectControl(e.id);return{g,e};
}
function controls(kind='fighter'){
 const {g,e}=arena(kind),nodes=new Map(),listeners={},el=()=>({hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s);}}),doc={hidden:false,pointerLockElement:null,createElement:el,body:{append(){}},addEventListener(k,f){(listeners[k]??=[]).push(f);}};
 const context={THREE:T,WarData,WarNavigationFootprints,WarVehicleMotion,WarAircraftFlight,document:doc,innerWidth:1600,innerHeight:1000,console,addEventListener(){}};context.globalThis=context;vm.createContext(context);
 for(const file of ['vehicle-camera','direct-control','battle3d'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/'+file+'.js'),'utf8'),context);
 const r={canvas:{},width:1600,height:1000,camera:{},objects:new Map(),world:new T.Group(),scene:new T.Scene(),entityHeight:e=>g.entityAltitude(e)};let paused=false;
 const d=new context.WarDirectControl(r,{game:()=>g,paused:()=>paused,canEnter:()=>true,toast(){},sound:()=>false,unitName:k=>k});Object.assign(d,{active:true,game:g,entityId:e.id,pitch:0,yaw:0,flightReady:true});doc.pointerLockElement=r.canvas;d.updateCamera();
 const event=extra=>({target:{tagName:'DIV',closest:()=>null},preventDefault(){},stopImmediatePropagation(){},...extra});
 return{g,e,d,r,doc,context,mouse:(x,y)=>d.mouseMove(event({movementX:x,movementY:y})),key:code=>d.keyDown(event({code})),paused:v=>paused=v};
}
function step(g,seconds,fn=()=>{}){for(let i=0;i<Math.ceil(seconds*20);i++){g.step(.05);fn();}}
function actualRenderedModel(f){
 const {g,e,r,d,context}=f,model=new T.Group(),scene=new T.Scene();scene.add(model);r.objects.set(e.id,model);
 Object.assign(r,{scene,dpr:1,ctx:{setTransform(){},clearRect(){}},syncRunways(){},syncCamera(){},updateFog(){},sun:{intensity:1,position:new T.Vector3(),target:new T.Object3D()},hemi:{intensity:1},gl:{render:()=>scene.updateMatrixWorld(true),info:{render:{calls:0,triangles:0,frame:0},memory:{geometries:0}}},firstPerson:d});d.drawOverlay=()=>{};
 context.Battle3D.prototype.draw.call(r,{...g,entities:[e],teams:g.teams,time:g.time}, {}, g.time);return model;
}
for(const sign of [-1,1])test('mouse '+(sign>0?'right':'left')+' banks inward and follows nose in FPS and C exterior rendering',()=>{
 const f=controls();f.mouse(sign*150,0);assert.ok(f.d.yaw*sign>0);f.d.submit();let prior={x:f.e.x,y:f.e.y};step(f.g,.6,()=>{
  const dx=f.e.x-prior.x,dy=f.e.y-prior.y;assert.ok(Math.abs(WarVehicleMotion.angleDelta(Math.atan2(dy,dx),f.e.angle))<1e-8,'flight path is along nose');prior={x:f.e.x,y:f.e.y};
 });assert.ok(f.e.angle*sign>0);assert.ok(f.e.roll*sign>0,'bank into turn, not out of it');
 f.key('KeyC');const model=actualRenderedModel(f),right=model.localToWorld(new T.Vector3(0,0,20)),left=model.localToWorld(new T.Vector3(0,0,-20));assert.equal(model.visible,true);assert.ok((left.y-right.y)*sign>0,'inside wing is lower in actual Battle3D Euler transform');
 const nose=new T.Vector3(1,0,0).applyQuaternion(model.quaternion),look=f.d.camera.getWorldDirection(new T.Vector3());assert.ok(nose.dot(look)>.999999,'exterior camera follows rendered nose');
 f.key('KeyC');const hidden=actualRenderedModel(f);assert.equal(hidden.visible,false);assert.ok(f.d.camera.up.dot(new T.Vector3(0,1,0).applyQuaternion(model.quaternion))>.999999,'cockpit roll uses the same frame as the hull');
});
test('equal left/right pulses are symmetric and level off without reverse-heading overshoot',()=>{
 const cases=[-1,1].map(sign=>{const f=controls();f.mouse(sign*130,0);f.d.submit();const heading=[];step(f.g,5,()=>heading.push(f.e.angle));assert.ok(Math.abs(f.e.angle-f.d.yaw)<.001);assert.ok(Math.abs(f.e.roll)<.002);assert.ok(heading.every((v,i)=>i===0||(v-heading[i-1])*sign>=-1e-10));return f;});
 assert.ok(Math.abs(cases[0].e.x-cases[1].e.x)<1e-7);assert.ok(Math.abs((cases[0].e.y-1800)+(cases[1].e.y-1800))<1e-7);assert.ok(Math.abs(cases[0].e.roll+cases[1].e.roll)<1e-7);
});
test('mouse up still dives and mouse down climbs, while roll never changes the nose pitch convention',()=>{
 for(const sign of [-1,1]){const f=controls();f.mouse(100,sign*110);f.d.submit();step(f.g,1);assert.ok(f.e.pitch*sign>0);assert.ok((f.e.altitude-300)*sign>0);f.key('KeyC');const model=actualRenderedModel(f),nose=new T.Vector3(1,0,0).applyQuaternion(model.quaternion);assert.ok(nose.y*sign>0);}
});
test('paused or unlocked input cannot drift heading, bank, pitch or position',()=>{
 const f=controls();f.mouse(150,90);f.d.submit();step(f.g,.4);f.d.clearInput();f.doc.pointerLockElement=null;const before=[f.e.x,f.e.y,f.e.altitude,f.e.angle,f.e.roll,f.e.pitch];f.mouse(200,-100);step(f.g,1);assert.deepEqual([f.e.x,f.e.y,f.e.altitude,f.e.angle,f.e.roll,f.e.pitch],before);f.paused(true);f.doc.pointerLockElement=f.r.canvas;f.mouse(-100,200);f.d.submit();step(f.g,.5);assert.deepEqual([f.e.x,f.e.y,f.e.altitude,f.e.angle,f.e.roll,f.e.pitch],before);
});
test('rotorcraft yaw in hover stays level and retains independent sideways translation',()=>{
 const f=controls('escort_helicopter');f.mouse(150,0);f.d.submit();step(f.g,1);assert.ok(f.e.angle>0);assert.equal(f.e.roll,0);assert.equal(f.e.x,2600);assert.equal(f.e.y,1800);f.g.setDirectInput({yaw:f.e.angle,strafe:1,flightEnabled:true});const p={x:f.e.x,y:f.e.y};step(f.g,.5);const dx=f.e.x-p.x,dy=f.e.y-p.y;assert.ok(Math.abs(dx*Math.cos(f.e.angle)+dy*Math.sin(f.e.angle))<1e-6);assert.ok(Math.hypot(dx,dy)>0);
});
test('autonomous aircraft turn with the same inward roll sign as the manual aircraft',()=>{
 for(const sign of [-1,1]){const {g,e}=arena();g.endDirectControl();g.command([e.id],3200,1800+sign*500);step(g,.5);assert.ok(e.motion.turnRate*sign>0);assert.ok(e.roll*sign>0);}
});
test('keyboard yaw is integrated once and release finishes the turn without reversing its heading',()=>{
 for(const sign of [-1,1]){const f=controls(),key=sign>0?'KeyD':'KeyA';f.key(key);for(let i=0;i<16;i++){f.d.update(.05,f.g.time);f.g.step(.05);}assert.ok(Math.abs(f.d.yaw-sign*.64)<1e-8);assert.ok(f.e.angle*sign>.2);f.d.keys.delete(key);let before=f.e.angle;
  for(let i=0;i<100;i++){f.d.update(.05,f.g.time);f.g.step(.05);assert.ok((f.e.angle-before)*sign>=-1e-9);before=f.e.angle;}assert.ok(Math.abs(f.e.angle-f.d.yaw)<.001);assert.ok(Math.abs(f.e.roll)<.002);
 }
});
test('heading wrap chooses the short turn and bank settling is independent of render subdivision',()=>{
 const e={kind:'fighter',angle:Math.PI-.02,roll:0};WarVehicleMotion.steerAircraft(e,-Math.PI+.05,.05);assert.ok(e.angle>Math.PI-.02);assert.ok(e.roll>0);const before=JSON.stringify(e);WarVehicleMotion.steerAircraft(e,0,0);assert.equal(JSON.stringify(e),before);
 const a={roll:.5},b={roll:.5};WarVehicleMotion.bankAircraft(a,0,1);for(let i=0;i<100;i++)WarVehicleMotion.bankAircraft(b,0,.01);assert.ok(Math.abs(a.roll-b.roll)<1e-12);assert.ok(a.roll<.01);
});
