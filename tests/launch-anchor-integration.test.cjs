/* Independent CPU integration. Geometry/shot contracts are not visual approval. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');global.THREE=require('../assets/vendor/three.min.js');const T=THREE;
const load=f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});
for(const f of ['src/data.js','src/roster.js','src/equipment.js','src/vehicle-motion.js'])load(f);
for(const [,f]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/script src="([^"]+)"/g))if(/^src\/(models3d|model-detail|models-(?!imported)|vehicle-rig-|vehicle-animation|weapon-effects)/.test(f))load(f);
require('../src/sim.js');
const A=WarVehicleAnimation,near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
const kinds=['ifv','arty','rocket','aa','asat','destroyer','submarine'];
test.before(async()=>{
 // Decode the actual licensed Burke vertex/material definitions; CPU has no image renderer.
 global.self=globalThis;global.dispatchEvent=()=>{};global.CustomEvent=class{};
 load('assets/vendor/GLTFLoader.bundle.js');const Loader=T.GLTFLoader;
 T.GLTFLoader=class extends Loader{constructor(){super();this.register(()=>({name:'CPUAnchorTextureFixture',loadTexture:()=>Promise.resolve(new T.Texture())}));}};
 load('assets/models/burke-data.js');load('src/models-imported.js');await WarImported.ready;
 assert.equal(WarImported.status,'ready','procedural fallback must not pass the USA ship test');
});
function ancestry(n){const a=[];for(;n;n=n.parent)a.push(n);return a;}
for(const kind of kinds)for(const faction of Object.keys(WarData.F))test(`${kind}_${faction}: real assembled anchor, independent joint and frozen shot ray`,()=>{
 const m=WarModels.create(kind,faction),other=WarModels.create(kind,faction),marker=m.getObjectByName('muzzle');
 if(kind==='destroyer'&&faction==='usa'){assert.equal(m.userData.license,'CC-BY-4.0');assert.equal(m.userData.assetPath,'assets/models/burke.glb');}
 assert.ok(marker,'final registered model lacks muzzle');assert.notEqual(marker,other.getObjectByName('muzzle'));
 m.position.set(2000,kind==='submarine'?-55:0,1800);m.scale.setScalar(m.userData.scale||1);m.updateMatrixWorld(true);
 const rest=marker.getWorldPosition(new T.Vector3()),s=A.attach(m),peer=A.attach(other),bound=marker.getWorldPosition(new T.Vector3());
 near(rest.distanceTo(bound),0,'binding preserves model-space endpoint');assert.ok(bound.distanceTo(m.position)>.3,'body-centre fallback is not a launch port');
 const beforeOther=other.getObjectByName('muzzle').getWorldPosition(new T.Vector3());
 const e={id:101,kind,x:2000,y:1800,team:0,hp:100,r:20,angle:0,turret:0,pitch:0,roll:0,cool:0,altitude:kind==='submarine'?-55:0},clock={time:1,effects:[]};A.update(m,e,clock);
 if(kind==='submarine'){
  assert.equal(marker.userData.source,'approximate-forward-hull-exit','do not misrepresent precise torpedo doors');
  assert.ok(marker.position.x>8,'exit must be toward the bow, not centre');assert.ok(!ancestry(marker).some(n=>s.joints.some(j=>j.node===n&&j.d.role==='turret')));
 }else{
  const movingAncestors=ancestry(marker).filter(n=>s.joints.some(j=>j.node===n&&['turret','recoil'].includes(j.d.role)));
  assert.ok(movingAncestors.length>0,'anchor not parented to the visible gun/launcher joint');
  e.turret=.65;clock.time+=.05;A.update(m,e,clock);m.updateMatrixWorld(true);
  assert.ok(marker.getWorldPosition(new T.Vector3()).distanceTo(rest)>.05,'launcher turns but anchor stays still');
 }
 near(other.getObjectByName('muzzle').getWorldPosition(new T.Vector3()).distanceTo(beforeOther),0,'same-template peer remains unchanged');
 if(s.skeletons.length&&peer.skeletons.length)assert.notEqual(s.skeletons[0].bones[0],peer.skeletons[0].bones[0]);
 const g=new WarSim.Game({map:'desert',faction,enemies:1});g.effects=[];g.entities=[e];const p=marker.getWorldPosition(new T.Vector3()),direction=new T.Vector3(.7,.22,-.41).normalize(),range=kind==='rocket'?200:150;
 const aim={aimOrigin:{x:p.x,y:p.z,height:p.y},aimX:p.x+direction.x*2000,aimY:p.z+direction.z*2000,aimHeight:p.y+direction.y*2000};
 // This test concerns the original main gun/launch port, not the new default
 // anti-ship station. Let the authoritative mount prepare and traverse first.
 if(kind==='destroyer')e.weaponId='destroyer:naval_gun';
 const point=g.directShotPoint(e,aim,null,range),w=g.vehicleWeapon(e),ctx={weapon:w,aimX:point.x,aimY:point.y,aimHeight:point.height,aimOrigin:point.origin,moving:false};
 if(w?.mount.mode==='hull'){e.angle=Math.atan2(direction.z,direction.x);e.pitch=Math.atan2(direction.y,Math.hypot(direction.x,direction.z));}
 for(let i=0;i<100&&!WarCombatReadiness.status(g,e,w,null,ctx).canFire;i++){g.time+=.05;WarCombatReadiness.step(g,e,.05,ctx);}
 assert.equal(g.emitShot(e,null,{...point,fixedImpact:true}),true);const f=g.effects.find(x=>x.type==='shot');assert.ok(f);
 near(f.x,p.x,'shot x');near(f.y,p.z,'shot map y');near(f.sourceHeight,p.y,'shot height');
 const rayLength=Math.hypot(point.x-p.x,point.y-p.z,point.height-p.y);assert(rayLength<=range+1e-6);if(kind==='rocket')assert(Math.hypot(point.x-e.x,point.y-e.y,point.height-g.entityAltitude(e))<=range+1e-6);else near(rayLength,range,'full non-salvo ray');near(f.tx-f.x,direction.x*rayLength,'ray x');near(f.ty-f.y,direction.z*rayLength,'ray map y');near(f.targetHeight-f.sourceHeight,direction.y*rayLength,'ray height');
 const frozen=[f.x,f.y,f.sourceHeight,f.tx,f.ty,f.targetHeight];e.turret=-1.2;m.position.x+=100;clock.time+=.05;A.update(m,e,clock);m.updateMatrixWorld(true);
 assert.deepEqual([f.x,f.y,f.sourceHeight,f.tx,f.ty,f.targetHeight],frozen,'old projectile follows a later turret/model pose');
 A.release(m);A.release(other);
});
test('inventory covers all 462 slots and retains unapproved original operator provenance',()=>{
 const inv=JSON.parse(fs.readFileSync(path.join(root,'docs/reviews/model-inventory.json'))),keys=new Set(inv.units.map(x=>x.key));
 assert.equal(inv.units.length,462);assert.equal(keys.size,462);
 for(const kind of Object.keys(WarData.U))for(const faction of Object.keys(WarData.F))assert.ok(keys.has(kind+'_'+faction));
 for(const f of Object.keys(WarData.F)){const e=inv.units.find(x=>x.key==='operator_'+f);assert.equal(e.category,'original-role-variant');assert.equal(e.license,'Project-original');assert.equal(e.referenceUrl,null);assert.equal(e.assetSource,null);assert.equal(e.fullVisualAcceptance,false);}
 assert.equal(inv.recordedAt,'2026-10-17T16:57:47.335Z','do not rewrite historical observation date');assert.ok(inv.inventoryUpdatedAt);
});
test('USA M109 actual aperture has an open centre, solid rim and unobstructed forward exit',()=>{
 const m=WarModels.create('arty','usa'),anchor=m.getObjectByName('muzzle');assert.equal(anchor.userData.aperture,true);
 // Bind the production skeleton, so the check includes the real recoil marker path.
 const e={id:900,kind:'arty',x:0,y:0,angle:0,turret:0,hp:100,pitch:0,roll:0};
 A.update(m,e,{time:1,effects:[]});m.updateMatrixWorld(true);
 m.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});
 const origin=anchor.getWorldPosition(new T.Vector3()),q=anchor.getWorldQuaternion(new T.Quaternion()),forward=new T.Vector3(1,0,0).applyQuaternion(q),lateral=new T.Vector3(0,0,1).applyQuaternion(q);
 assert.equal(new T.Raycaster(origin,forward.clone().negate(),0,.35).intersectObject(m,true).length,0,'centre is plugged behind the visible hole');
 const rim=new T.Raycaster(origin.clone().addScaledVector(lateral,.105),forward.clone().negate(),0,.35).intersectObject(m,true);
 assert.ok(rim.length,'aperture is missing its real outer rim');near(rim[0].distance,anchor.userData.artOffset,'rim front plane');
 assert.equal(new T.Raycaster(origin,forward,0,.35).intersectObject(m,true).length,0,'front of muzzle is obstructed');
 A.release(m);
});
