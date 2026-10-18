const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');require('../src/models3d.js');require('../src/model-detail.js');require('../src/models-operator.js');require('../src/personnel-animation.js');
const A=WarPersonnelAnimation,T=THREE;
test('registration covers every actual infantry-family unit in the game data',()=>{require('../src/data.js');require('../src/roster.js');const all=Object.keys(WarData.U).filter(k=>(WarData.U[k].modelKind||k)==='infantry');assert.deepEqual([...A.roles].sort(),all.sort());});
function fixture(kind='operator',f='chn'){const model=WarModels.create(kind,f),e={id:1,kind,x:0,y:0,angle:0,jumpHeight:0};model.scale.setScalar(model.userData.scale);let time=0;const update=(dt,dx=0,dz=0)=>{time+=dt;e.x+=dx;e.y+=dz;model.position.set(e.x,e.jumpHeight,e.y);model.rotation.y=-e.angle;const state=A.update(model,e,time);model.updateMatrixWorld(true);return state;};update(0);return{model,e,update};}
function pose(model){const state=A.state(model);return state.people.flatMap(p=>p.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray()]));}
test('all 48 personnel variants preserve role squad count, shared detail materials and independent articulated chains',()=>{
 const counts={infantry:3,antitank_team:3,machinegun_team:2,mortar_team:2,assault_team:3,field_medic:3,sniper_team:2,operator:1};
 for(const kind of A.roles)for(const faction of Object.keys(WarModels.colors)){
  const {model,update}=fixture(kind,faction),state=update(1/60,.2);assert.equal(state.people.length,counts[kind]);let meshes=0,triangles=0;
  model.traverse(o=>{if(!o.isMesh)return;meshes++;assert.ok(o.isSkinnedMesh);assert.equal(o.userData.preserveMaterial,true);triangles+=o.geometry.attributes.position.count/3;for(const attr of ['skinIndex','skinWeight','position','normal'])assert.ok(o.geometry.attributes[attr].array.every(Number.isFinite));});
  assert.equal(meshes,counts[kind]*2);assert.ok(triangles<30000);assert.equal(model.userData.unarmed,kind==='field_medic');
  for(const p of state.people){assert.equal(p.bones.length,13);for(const name of ['hipL','kneeL','ankleL','hipR','kneeR','ankleR','shoulderL','elbowL','wristL'])assert.ok(p.bones.some(b=>b.name===name));assert.ok(p.bones.every(b=>b.quaternion.toArray().every(Number.isFinite)));}
 }
});
test('stride needs displacement, and equal distance at equal speed gives the same phase across render rates',()=>{
 const still=fixture();for(let i=0;i<100;i++)still.update(1/60);assert.equal(A.state(still.model).phase,0);assert.equal(A.state(still.model).distance,0);
 const a=fixture(),b=fixture();for(let i=0;i<60;i++)a.update(1/60,.3);for(let i=0;i<30;i++)b.update(1/30,.6);
 assert.ok(Math.abs(A.state(a.model).phase-A.state(b.model).phase)<1e-8);assert.ok(Math.abs(A.state(a.model).distance-18)<1e-8);
 const s=A.state(a.model);assert.ok(Math.abs(s.people[0].feet[0].phase-s.people[0].feet[1].phase)>.49);
});
test('support foot is fixed in world space while hip and knee change independently',()=>{
 const f=fixture();let checked=0,previous=null,hipChanged=false,kneeChanged=false;
 for(let i=0;i<160;i++){
  const state=f.update(1/60,.15),p=state.people[0],foot=p.feet[0],actual=p.bones[3].getWorldPosition(new T.Vector3());
  if(foot.stance&&previous?.stance){assert.ok(actual.distanceTo(previous.actual)<1e-5,'planted ankle may not slide');hipChanged ||=p.bones[1].quaternion.angleTo(previous.hip)>1e-5;kneeChanged ||=p.bones[2].quaternion.angleTo(previous.knee)>1e-5;checked++;}
  previous={stance:foot.stance,actual,hip:p.bones[1].quaternion.clone(),knee:p.bones[2].quaternion.clone()};
 }
 assert.ok(checked>10);assert.ok(hipChanged&&kneeChanged);
});
test('stop settles to bind pose; unchanged simulation time freezes every joint and phase',()=>{
 const f=fixture();for(let i=0;i<20;i++)f.update(1/60,.5);const before=pose(f.model),phase=A.state(f.model).phase;for(let i=0;i<60;i++)f.update(0);assert.deepEqual(pose(f.model),before);assert.equal(A.state(f.model).phase,phase);
 for(let i=0;i<30;i++)f.update(1/60);assert.equal(A.state(f.model).moving,false);assert.equal(A.state(f.model).phase,phase);for(const p of A.state(f.model).people)for(const bone of p.bones)assert.ok(bone.quaternion.angleTo(new T.Quaternion())<1e-8);
});
test('jump holds gait phase and avoids extra body bob, landing and teleport reinitialize safely',()=>{
 const f=fixture();for(let i=0;i<5;i++)f.update(1/60,.3);const before=A.state(f.model).phase;f.e.jumpHeight=4;
 for(let i=0;i<8;i++)f.update(1/60,.5);let state=A.state(f.model);assert.equal(state.phase,before);assert.equal(state.people[0].bones[0].position.y,0);assert.ok(state.people[0].feet.every(x=>!x.stance));
 f.e.jumpHeight=0;f.update(1/60,.2);assert.equal(state.jumping,false);const lastDistance=state.distance;f.update(1/60,2000);assert.equal(state.teleports,1);assert.equal(state.distance,lastDistance);assert.equal(state.moving,false);f.update(1);assert.equal(state.teleports,2);
});
test('cached models share geometry but never skeleton state or pose',()=>{
 const a=fixture('infantry'),b=fixture('infantry');const sa=A.state(a.model),sb=A.state(b.model);assert.notEqual(sa.people[0].skeleton,sb.people[0].skeleton);assert.notEqual(sa.people[0].skeleton,sa.people[1].skeleton);assert.equal(a.model.getObjectByName('operatorBody').geometry,b.model.getObjectByName('operatorBody').geometry);const before=pose(b.model);a.update(1/60,.6);assert.deepEqual(pose(b.model),before);
});
test('reverse and strafe retain finite IK, and non-personnel objects are untouched',()=>{
 for(const delta of [[-.3,0],[0,.3]]){const f=fixture();for(let i=0;i<80;i++){const s=f.update(1/60,...delta);assert.ok(pose(f.model).every(Number.isFinite));assert.ok(s.people[0].feet.every(foot=>foot.target.y>=.134));}}
 const group=new T.Group();assert.equal(A.update(group,{x:0,y:0},1),null);assert.equal(group.children.length,0);
});
test('rendered boot vertices remain planted at walk/run speed in forward, reverse and strafe movement',()=>{
 for(const speed of [9,48,78,84])for(const direction of [[1,0],[-1,0],[0,1]]){
  const f=fixture('infantry'),last=new Map();let pairs=0;
  for(let frame=0;frame<100;frame++){
   const s=f.update(1/60,speed/60*direction[0],speed/60*direction[1]);
   for(let i=0;i<s.people.length;i++)for(let side=0;side<2;side++){
    const p=s.people[i],mesh=p.person.getObjectByName('operatorBody'),attr=mesh.geometry.attributes.rigPart,tag=side?6:3,index=attr.array.indexOf(tag),point=mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld),key=i+':'+side,foot=p.feet[side],previous=last.get(key);
    if(foot.stance&&previous?.stance){assert.ok(point.distanceTo(previous.point)<1e-5,`${speed} ${direction} ${key} rendered foot drift`);pairs++;}
    last.set(key,{point,stance:foot.stance});
   }
  }assert.ok(pairs>5,'at least several real planted frames');
 }
});
test('release disposes only per-instance bone textures, retaining other clone and shared geometry',()=>{
 const a=fixture(),b=fixture(),sa=A.state(a.model),sb=A.state(b.model),geometry=a.model.getObjectByName('operatorBody').geometry;let disposedA=0,disposedB=0,disposedGeometry=0;
 for(const p of sa.people){p.skeleton.computeBoneTexture();p.skeleton.boneTexture.addEventListener('dispose',()=>disposedA++);}for(const p of sb.people){p.skeleton.computeBoneTexture();p.skeleton.boneTexture.addEventListener('dispose',()=>disposedB++);}geometry.addEventListener('dispose',()=>disposedGeometry++);
 assert.equal(A.release(a.model),true);assert.equal(A.release(a.model),false);assert.equal(A.state(a.model),undefined);assert.equal(disposedA,1);assert.equal(disposedB,0);assert.equal(disposedGeometry,0);b.update(1/60,.2);assert.ok(pose(b.model).every(Number.isFinite));
});
test('conservative skinned bounds retain moving boots and arms for aiming raycasts',()=>{
 for(const kind of A.roles){const f=fixture(kind);for(let frame=0;frame<10;frame++){
  f.e.jumpHeight=frame===9?3:0;f.update(1/30,frame%2?1.4:-1.4,.5);
  f.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const position=new T.Vector3();for(let i=0;i<mesh.geometry.attributes.position.count;i+=12){mesh.getVertexPosition(i,position);assert.ok(mesh.boundingBox.containsPoint(position));assert.ok(mesh.boundingSphere.containsPoint(position));}});
 }}
});
test('battle renderer deletion and world/model-ready clearing release skeleton instances',()=>{
 require('../src/battle3d.js');const renderer=Object.create(Battle3D.prototype);renderer.scene=new T.Scene();renderer.world=new T.Group();renderer.objects=new Map();
 const a=fixture(),b=fixture('infantry');let count=0;for(const [id,f] of [[1,a],[2,b]]){renderer.objects.set(id,f.model);renderer.scene.add(f.model);for(const p of A.state(f.model).people){p.skeleton.computeBoneTexture();p.skeleton.boneTexture.addEventListener('dispose',()=>count++);}}
 renderer.removeObject(1);assert.equal(count,1);assert.equal(renderer.objects.has(1),false);assert.equal(a.model.parent,null);assert.ok(A.state(b.model));
 renderer.disposeWorld();assert.equal(count,4);assert.equal(renderer.objects.size,0);assert.equal(b.model.parent,null);assert.equal(A.state(b.model),undefined);renderer.clearObjects();assert.equal(count,4);
});
