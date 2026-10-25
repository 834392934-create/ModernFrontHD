/* CPU geometry/raycast differential review; no renderer or GPU is created.
 * Texture decoding alone is stubbed, never licensed geometry or skeletons. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
global.THREE=require('../assets/vendor/three.min.js');global.self=globalThis;global.dispatchEvent=()=>{};global.CustomEvent=class{};
const T=THREE,repo=path.resolve(__dirname,'..'),load=file=>vm.runInThisContext(fs.readFileSync(path.join(repo,file),'utf8'),{filename:file});
for(const name of ['data','roster','equipment','operator-weapons','sim','models3d','vehicle-rig-ground','vehicle-rig-naval','vehicle-rig-air','models-tanks','models-vehicles','models-air','models-naval','models-space','model-detail','models-roster','models-reinforcements-ground-naval','models-reinforcements-air-space','models-tactical-ground-naval','models-tactical-air-space','models-depth-wave','models-altitude-wave','models-buildings','models-defense-wave','models-operator','personnel-animation','model-unit-refinement','weapon-effects','vehicle-animation'])require('../src/'+name+'.js');
load('assets/vendor/GLTFLoader.bundle.js');const Loader=T.GLTFLoader;T.GLTFLoader=class extends Loader{constructor(){super();for(const name of ['CPUTextureFixture','EXT_texture_webp'])this.register(()=>({name,loadTexture:()=>Promise.resolve(new T.Texture())}));}};
for(const name of ['assets/models/burke-data.js','src/models-imported.js','assets/models/ah64-data.js','src/models-imported-air.js','assets/models/t90m-data.js','src/models-imported-ground.js'])load(name);
const ready=Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]);
const baseline='3b758f1',oldSource=fs.readFileSync(path.join(__dirname,'fixtures/baselines/direct-control.pre-raycast-cache.js'),'utf8');
function api(source){const c=vm.createContext({THREE:T,WarData,WarNavigationFootprints,console});vm.runInContext(source,c);return c.WarDirectControl.prototype;}
const old=api(oldSource),current=api(fs.readFileSync(path.join(repo,'src/direct-control.js'),'utf8'));
function fixture(){const g=new WarSim.Game({faction:'usa',enemies:1,buffs:['vision']});g.entities=[];g.effects=[];const r={objects:new Map(),world:new T.Group()};return{g,r,a:{r,game:g,entityId:-1,ray:new T.Raycaster()},b:{r,game:g,entityId:-1,ray:new T.Raycaster()}};}
function vertex(m,i,v){if(m.getVertexPosition)m.getVertexPosition(i,v);else{v.fromBufferAttribute(m.geometry.attributes.position,i);if(m.isSkinnedMesh)m.applyBoneTransform(i,v);}return v.applyMatrix4(m.matrixWorld);}
function envelope(model){const p=new T.Vector3(),center=model.position,maxima=[-Infinity,-Infinity,-Infinity,Infinity,Infinity,Infinity],extremes=Array.from({length:6},()=>new T.Vector3());let farthest=0,count=0,skinned=0;
 model.updateMatrixWorld(true);model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
 model.traverse(m=>{if(!m.isMesh||m.userData.motionEffect)return;const positions=m.geometry.attributes.position;if(m.isSkinnedMesh)skinned+=positions.count;
  for(let i=0;i<positions.count;i++){vertex(m,i,p);assert(p.toArray().every(Number.isFinite));farthest=Math.max(farthest,p.distanceTo(center));count++;for(let j=0;j<3;j++){const value=p.getComponent(j);if(value>maxima[j]){maxima[j]=value;extremes[j].copy(p);}if(value<maxima[j+3]){maxima[j+3]=value;extremes[j+3].copy(p);}}}
 });return{farthest,count,skinned,extremes};
}
function compare(f,origin,direction,max,boxes){const before=old.cast.call(f.a,origin,direction,max,false),after=current.cast.call(f.b,origin,direction,max,false,boxes);assert.equal(after?.entity?.id,before?.entity?.id);assert.equal(after?.object,before?.object);if(before){assert(Math.abs(after.distance-before.distance)<1e-7);assert(after.point.distanceTo(before.point)<1e-7);}return !!before;}
test('CPU licensed geometry imports retain every ready slot without a DOM texture decoder',async()=>{
 await ready;for(const state of [WarImported,WarImportedAir,WarImportedGround])assert.equal(state.status,'ready',state.errors.join(';'));
 assert.deepEqual([...WarImported.loaded,...WarImportedAir.loaded,...WarImportedGround.loaded].sort(),['destroyer_usa','heli_kor','heli_usa','tank_rus']);
});
test('all 77 roles × six factions and articulated attitudes fit the conservative sphere and preserve exact historical casts',async t=>{
 await ready;for(const state of [WarImported,WarImportedAir,WarImportedGround])assert.equal(state.status,'ready',state.errors.join(';'));
 const kinds=Object.keys(WarData.U),factions=Object.keys(WarData.F);assert.equal(kinds.length,77);assert.equal(factions.length,6);const f=fixture(),axis=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1),new T.Vector3(-1,0,0),new T.Vector3(0,-1,0),new T.Vector3(0,0,-1)];let poses=0,vertices=0,skinVertices=0,casts=0,hits=0,maxRatio=0,worst='';
 for(const kind of kinds)for(const faction of factions){
  f.g.teams[0].faction=faction;f.g.entities=[];f.r.objects.clear();const e=f.g.spawn(0,kind,2500,1800),model=WarModels.create(kind,faction),bounds=WarNavigationFootprints.bounds[kind+'_'+faction];assert(bounds,kind+'_'+faction);model.scale.setScalar(model.userData.scale);f.r.objects.set(e.id,model);
  const combat=WarCombatReadiness.ensure(f.g,e); // Operator uses its independent weapon state.
  for(let phase=0;phase<4;phase++){
   const angle=[0,.7,-1.4,2.3][phase],air=WarData.U[kind].air,person=(WarData.U[kind].modelKind||kind)==='infantry';e.x=2500+phase*3;e.y=1800+phase*2;e.angle=angle;e.pitch=air?[0,.6,-.75,.4][phase]:phase===2?-.1:.12;e.roll=air?[0,.55,-.65,.1][phase]:phase===1?.12:0;e.turret=angle+phase*Math.PI/2;e.motion={signedSpeed:phase===2?-40:80,distance:phase*12,turnRate:phase%2?1:-1,steer:phase%2?.8:-.8,throttle:phase?1:0};e.jumpHeight=person&&phase===2?4:0;
   if(combat)for(const w of WarCombatReadiness.weapons(f.g,e)){const p=WarCombatReadiness.profile(f.g,e,w);if(!p)continue;Object.assign(combat.mounts[p.mountId],{yaw:e.turret,pitch:phase?Math.min(p.mount.maxPitch,Math.max(p.mount.minPitch,phase===2?1.2:-.2)):0,targetId:999});Object.assign(combat.stations[p.id],{phase:phase===3?'reload':'ready',lastShotAt:phase*.2-.04});}
   f.g.time=phase*.2;f.g.effects=phase===2?[{type:'shot',sourceId:e.id,weaponFamily:'cannon',mountId:'main',firedAt:f.g.time-.04}]:[];
   if(person&&phase===3)e.components={state:'downed',lastHitAt:f.g.time-.1,personnel:{downed:true,limp:.8}};
   model.position.set(e.x,f.g.entityAltitude(e),e.y);model.rotation.set(e.roll,-e.angle,e.pitch,'YZX');WarPersonnelAnimation.update(model,e,f.g.time);WarVehicleAnimation.update(model,e,f.g);const env=envelope(model),radius=2*Math.hypot(bounds[0],Math.max(Math.abs(bounds[1]),Math.abs(bounds[2])))+32,ratio=env.farthest/radius,label=kind+'_'+faction+' pose '+phase;
   assert(env.farthest<=radius+1e-7,label+' sphere clips actual articulated geometry');if(ratio>maxRatio){maxRatio=ratio;worst=label;}vertices+=env.count;skinVertices+=env.skinned;poses++;
   const boxes=new Map();for(let i=0;i<axis.length;i++){const origin=env.extremes[i].clone().addScaledVector(axis[i],radius*3),dir=axis[i].clone().negate();hits+=compare(f,origin,dir,radius*7,boxes);casts++;}
   // Off-axis misses, finite endpoints and an inside-model start must agree too.
   for(const [origin,dir,max]of [[model.position.clone().add(new T.Vector3(radius*3,radius*3,0)),axis[2],radius*2],[model.position.clone().addScaledVector(axis[0],radius*3),axis[3],radius*.4],[model.position.clone(),axis[0],radius*4]]){hits+=compare(f,origin,dir,max,boxes);casts++;}
  }
  WarPersonnelAnimation.release(model);WarVehicleAnimation.release(model);WarModels.cache.delete(kind+'_'+faction);
 }
 assert(skinVertices>0);assert(hits>462);t.diagnostic(JSON.stringify({baseline,slots:462,poses,vertices,skinVertices,casts,hits,maxRatio,worst,licensed:[...WarImported.loaded,...WarImportedAir.loaded,...WarImportedGround.loaded]}));
});
test('unknown buildings retain exact casting and the one-aim box cache refreshes next aim',()=>{
 const f=fixture(),e=f.g.spawn(0,'runway',800,900),mesh=new T.Mesh(new T.BoxGeometry(360,2,160),new T.MeshBasicMaterial());mesh.position.set(800,1,900);mesh.rotation.y=-Math.PI/2;mesh.updateMatrixWorld(true);f.r.objects.set(e.id,mesh);
 assert.equal(WarNavigationFootprints.bounds.runway_usa,undefined);const origin=new T.Vector3(500,1,900),dir=new T.Vector3(1,0,0),boxes=new Map();assert(compare(f,origin,dir,1000,boxes));assert.equal(boxes.size,1);const cached=boxes.get(mesh);compare(f,origin.clone().add(new T.Vector3(0,.1,0)),dir,1000,boxes);assert.equal(boxes.get(mesh),cached);
 boxes.clear();mesh.position.z+=400;mesh.updateMatrixWorld(true);assert.equal(compare(f,origin,dir,1000,boxes),false);assert.notEqual(boxes.get(mesh),cached);
});
test('far misses avoid full hierarchy box work while nearby precise hits and the second aim ray are preserved',t=>{
 const f=fixture(),geometry=new T.BoxGeometry(8,8,8),material=new T.MeshBasicMaterial();
 function add(x,z){const e=f.g.spawn(0,'tank',x,z),mesh=new T.Mesh(geometry,material);mesh.position.set(x,0,z);mesh.updateMatrixWorld(true);f.r.objects.set(e.id,mesh);return e;}
 for(let i=0;i<100;i++)add(1500+i*100,1000);const target=add(600,0),origin=new T.Vector3(0,2,0),dir=new T.Vector3(1,0,0),original=T.Box3.prototype.setFromObject;let calls=0;
 T.Box3.prototype.setFromObject=function(...args){calls++;return original.apply(this,args);};
 try{
  const a=old.cast.call(f.a,origin,dir,20000,false),oldCalls=calls;calls=0;const boxes=new Map(),b=current.cast.call(f.b,origin,dir,20000,false,boxes),newCalls=calls;
  assert.equal(a.entity.id,target.id);assert.equal(b.entity.id,a.entity.id);assert(b.point.distanceTo(a.point)<1e-7);assert.equal(oldCalls,101);assert.equal(newCalls,1);
  calls=0;const muzzle=current.cast.call(f.b,new T.Vector3(0,1,0),dir,20000,false,boxes);assert.equal(muzzle.entity.id,target.id);assert.equal(calls,0,'same aim reuses the candidate box');
  t.diagnostic(JSON.stringify({entities:101,oldBoxes:oldCalls,newBoxes:newCalls,secondRayBoxes:calls,scope:'CPU hierarchy work, not an FPS or GPU benchmark'}));
 }finally{T.Box3.prototype.setFromObject=original;geometry.dispose();material.dispose();}
});
