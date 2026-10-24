/* Real Game, DirectControl, Battle3D.draw, model hierarchy and raycasting.
 * Only DOM/canvas drawing and the GPU submission endpoint are inert CPU fixtures. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
global.THREE=require('../assets/vendor/three.min.js');const T=THREE;
for(const name of ['data','roster','equipment','operator-weapons','sim','combat-audio','render-timeline','models3d','vehicle-rig-ground','vehicle-rig-naval','vehicle-rig-air','models-tanks','models-vehicles','models-air','models-naval','models-space','model-detail','models-roster','models-reinforcements-ground-naval','models-reinforcements-air-space','models-tactical-ground-naval','models-tactical-air-space','models-depth-wave','models-altitude-wave','models-buildings','models-defense-wave','models-operator','personnel-animation','model-unit-refinement','weapon-effects','vehicle-animation'])require('../src/'+name+'.js');
const near=(a,b,message='values differ')=>assert.ok(Math.abs(a-b)<1e-7,`${message}: ${a} vs ${b}`);
function fixture(kind='tank'){
 const nodes=new Map(),noop=()=>{},ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop}),measureText:()=>({width:10})},{get:(o,k)=>o[k]??noop}),classes=new Set(),classList={add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle:noop};
 const el=()=>({hidden:false,style:{},classList,querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s);},getContext:()=>ctx});
 const doc={hidden:false,pointerLockElement:null,createElement:el,body:{append:noop,classList},addEventListener:noop,exitPointerLock(){this.pointerLockElement=null;}};
 const c={THREE:T,WarData,WarNavigationFootprints,WarCombatReadiness,WarCombatDamage,WarTransportOperations,WarCombatAudio,WarRenderTimeline,WarModels,WarWeaponEffects,WarVehicleAnimation,WarPersonnelAnimation,document:doc,innerWidth:1600,innerHeight:1000,console,addEventListener:noop};c.globalThis=c;vm.createContext(c);for(const name of ['vehicle-camera','battle3d','direct-control'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/'+name+'.js'),'utf8'),c);
 const g=new WarSim.Game({seed:712,map:'desert',enemies:1,buffs:['vision'],abilities:false});g.entities=[];g.effects=[];g.ore=[];g.nodes=[];g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(1);g.spawn(0,'hq',300,300);g.spawn(1,'hq',5500,3500);const e=g.spawn(0,kind,1800,1400);e.angle=0;if(WarData.U[kind].air)e.altitude=250;
 const gl={toneMappingExposure:1,info:{render:{frame:0,calls:1,triangles:10},memory:{geometries:1}},render(scene){scene.updateMatrixWorld(true);this.info.render.frame++;}};
 const r=Object.assign(Object.create(c.Battle3D.prototype),{is3D:true,canvas:{requestPointerLock(){doc.pointerLockElement=this;}},width:1600,height:1000,dpr:1,ctx,gl,camera:{x:1800,y:1400,zoom:1},cam:new T.PerspectiveCamera(),strategyCam:new T.OrthographicCamera(),scene:new T.Scene(),world:new T.Group(),objects:new Map(),sun:new T.DirectionalLight(),hemi:new T.HemisphereLight(),fogify:m=>m,updateFog:noop});r.scene.add(r.world);
 let paused=false;const d=new c.WarDirectControl(r,{game:()=>g,paused:()=>paused,canEnter:()=>true,toast:noop,sound:()=>false,unitName:k=>k});d.drawOverlay=noop;assert.equal(d.enter(e.id),true);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});g.setDirectInput({forward:1,yaw:0,flightEnabled:!!WarData.U[kind].air,pitch:0});g.step(.05);d.timeline.reset(g);
 function step(input){if(input)g.setDirectInput(input);d.timeline.captureBefore(g);g.step(.05);d.timeline.captureAfter(g);}
 function draw(alpha){d.timeline.beginFrame(g,alpha,{paused});r.draw(g,{},g.time);return r.objects.get(d.entityId);}
 return{g,e,r,d,doc,c,step,draw,pause:v=>paused=v};
}
test('real camera and Battle3D body share continuous frame poses at 40, 60 and 120 Hz',()=>{
 for(const hz of [40,60,120]){
  const f=fixture();for(let i=0;i<40;i++)f.step();f.d.externalView=true;f.draw(1);let acc=0,previous=null;const deltas=[];
  for(let i=0;i<hz;i++){
   acc+=1/hz;while(acc>=.05-1e-9){f.step();acc-=.05;}const model=f.draw(acc/.05),p=f.d.renderPose(f.e);near(model.position.x,p.x);near(model.position.z,p.y);near(f.d.vehicleEye.x,p.x);near(f.d.vehicleEye.z,p.y);
   if(i>hz*.1&&previous!==null)deltas.push(f.d.eye.x-previous);previous=f.d.eye.x;assert.ok(p.x<=f.e.x+1e-7);
  }
  assert.ok(deltas.every(v=>Math.abs(v-f.g.effectiveSpeed(f.e)/hz)<1e-7),`${hz} Hz camera must not retain the former 20Hz position steps`);
 }
});
test('repeated updateCamera, renderPose and draw do not drift or mutate actual Game positions',()=>{
 const f=fixture();for(let i=0;i<20;i++)f.step();f.d.externalView=true;const model=f.draw(.35),eye=f.d.eye.toArray(),rotation=f.d.camera.quaternion.toArray(),body=model.position.toArray(),physical=[f.e.x,f.e.y,f.e.altitude,f.e.angle],time=f.g.time;
 for(let i=0;i<60;i++){f.d.updateCamera();f.d.renderPose(f.e);f.r.draw(f.g,{},100+i);assert.deepEqual(f.d.eye.toArray(),eye);assert.deepEqual(f.d.camera.quaternion.toArray(),rotation);assert.deepEqual(model.position.toArray(),body);}
 assert.deepEqual([f.e.x,f.e.y,f.e.altitude,f.e.angle],physical);assert.equal(f.g.time,time);
});
test('ground mouse look responds immediately while aircraft camera uses interpolated physical attitude',()=>{
 const ground=fixture();ground.step();ground.draw(.25);ground.d.yaw=.8;ground.d.pitch=.3;ground.d.updateCamera();const look=ground.d.camera.getWorldDirection(new T.Vector3());near(look.x,Math.cos(.8)*Math.cos(.3));near(look.y,Math.sin(.3));near(look.z,Math.sin(.8)*Math.cos(.3));
 const f=fixture('fighter');for(let i=0;i<8;i++)f.step({forward:1,yaw:.9,pitch:.3,flightEnabled:true});const model=f.draw(.3),pose=f.d.renderPose(f.e);assert.notEqual(pose,f.e);const direction=f.d.camera.getWorldDirection(new T.Vector3());near(direction.x,Math.cos(pose.angle)*Math.cos(pose.pitch));near(direction.y,Math.sin(pose.pitch));near(direction.z,Math.sin(pose.angle)*Math.cos(pose.pitch));near(model.rotation.x,pose.roll);near(model.rotation.y,-pose.angle);near(model.rotation.z,pose.pitch);near(f.d.vehicleEye.y,f.r.entityHeight(pose)+7);
});
test('real modeled weapon muzzle is authoritative during aiming, then body redraw restores interpolation',()=>{
 const f=fixture();for(let i=0;i<20;i++)f.step();f.d.externalView=true;const model=f.draw(.25),poseX=model.position.x,weapon=f.g.vehicleWeapon(f.e),physical=f.r.resolveWeaponOrigin(f.g,f.e,weapon,0);assert.ok(physical);f.draw(.25);assert.ok(model.position.x<f.e.x);
 const aim=f.d.aim();near(aim.origin.x,physical.x);near(aim.origin.z,physical.y);near(aim.origin.y,physical.height);near(model.position.x,f.e.x,'synchronized anchor comes from physical pose');f.r.draw(f.g,{},f.g.time);near(model.position.x,poseX,'next display restores the same sampled body pose');
});
test('unanchored fallback muzzle also stays physical while a jumping first-person camera is interpolated',()=>{
 const f=fixture('infantry');f.step({forward:0,yaw:0,jump:true});f.draw(.2);const model=f.r.objects.get(f.e.id);f.r.objects.delete(f.e.id);f.r.scene.remove(model);const physical=f.g.entityAltitude(f.e),aim=f.d.aim();near(aim.origin.x,f.e.x);near(aim.origin.z,f.e.y);near(aim.origin.y,physical+9.5*.65,'fallback muzzle must not depend on sampled eye altitude');
});
test('pause, resume, enter/exit and replacement game control discard stale visual pose',()=>{
 const f=fixture();for(let i=0;i<10;i++)f.step();f.draw(.2);assert.ok(f.d.vehicleEye.x<f.e.x);f.pause(true);f.draw(.7);near(f.d.vehicleEye.x,f.e.x);f.pause(false);f.draw(0);near(f.d.vehicleEye.x,f.e.x);
 const soldier=f.g.spawn(0,'infantry',2300,1800);assert(f.d.enter(soldier.id));near(f.d.eye.x,soldier.x);near(f.d.eye.z,soldier.y);assert.equal(f.d.timeline.current.ref,soldier);f.d.exit();assert.equal(f.d.timeline.game,null);assert.equal(f.r.firstPerson,null);
});
