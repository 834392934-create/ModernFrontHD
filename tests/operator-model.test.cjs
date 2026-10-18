const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');
require('../src/models3d.js');
require('../src/model-detail.js');
require('../src/models-operator.js');
for(const faction of ['chn','usa','rus','ind','kor','imp']){
 test('original single operator '+faction+' has finite batched geometry, scale and functional muzzle',()=>{
  const model=WarModels.create('operator',faction),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  assert.equal(model.userData.squadMembers,1);assert.equal(model.userData.original,true);
  assert.equal(model.userData.scale,5.6);assert.ok(size.y>1.70&&size.y<1.80,'standing roster soldier scale');
  assert.ok(size.z<.8,'one person width, not a reused three-person squad');
  assert.ok(model.getObjectByName('operatorBody'));assert.ok(model.getObjectByName('operatorRifle'));
  let triangles=0,meshes=0;const finishes=new Set();
  model.traverse(o=>{if(!o.isMesh)return;meshes++;const a=o.geometry.attributes;triangles+=a.position.count/3;
   for(const key of ['position','normal','color','surface']){assert.ok(a[key].array.every(Number.isFinite),key);assert.equal(a[key].count,a.position.count);}
   assert.equal(o.userData.preserveMaterial,true);for(const v of a.surface.array)finishes.add(v);
  });
  assert.equal(meshes,2);assert.ok(triangles<10000,'operator rendering budget');
  for(const finish of [WarDetail.Surface.glass,WarDetail.Surface.metal,WarDetail.Surface.rubber,WarDetail.Surface.cloth])assert.ok(finishes.has(finish));
  const muzzle=model.getObjectByName('muzzle');assert.ok(muzzle);assert.ok(muzzle.position.x>1);assert.ok(muzzle.position.y>1.25&&muzzle.position.y<1.4);
  model.updateMatrixWorld(true);const ray=new THREE.Raycaster(muzzle.position.clone().add(new THREE.Vector3(.005,0,0)),new THREE.Vector3(1,0,0));
  assert.equal(ray.intersectObject(model,true).length,0,'muzzle must point forward outside character geometry');
 });
}
test('operator cache clones have independent transforms and shared batched resources',()=>{
 const a=WarModels.create('operator','chn'),b=WarModels.create('operator','chn');a.position.x=15;a.getObjectByName('muzzle').position.z=4;
 assert.equal(b.position.x,0);assert.equal(b.getObjectByName('muzzle').position.z,.17);
 assert.equal(a.getObjectByName('operatorBody').geometry,b.getObjectByName('operatorBody').geometry);
 assert.notEqual(WarModels.create('operator','usa').userData.profile,b.userData.profile);
});
