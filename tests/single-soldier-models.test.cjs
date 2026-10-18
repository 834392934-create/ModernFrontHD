const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
global.THREE=require('../assets/vendor/three.min.js');require('../src/data');require('../src/roster');require('../src/models3d');require('../src/model-detail');require('../src/models-operator');require('../src/personnel-animation');
const T=THREE,A=WarPersonnelAnimation,kinds=Object.keys(WarData.U).filter(k=>(WarData.U[k].modelKind||k)==='infantry');
test('all eight personnel roles and six factions create exactly one body and one independently jointed soldier',()=>{
 assert.equal(kinds.length,8);
 for(const kind of kinds)for(const faction of Object.keys(WarData.F)){
  const model=WarModels.create(kind,faction),people=model.children.filter(x=>x.name.startsWith('personnel_'));
  assert.equal(people.length,1,kind+' '+faction);assert.equal(model.userData.squadMembers,1);assert.deepEqual(people[0].position.toArray(),[0,0,0]);
  assert.equal(model.userData.personnelKit,faction);assert.equal(model.userData.unarmed,kind==='field_medic');assert.ok(model.userData.uniformPattern);assert.ok(model.userData.helmetProfile);
  A.update(model,{kind,x:0,y:0,angle:0,jumpHeight:0},0);const state=A.state(model);assert.equal(state.people.length,1);assert.equal(state.people[0].bones.length,13);
  let bodies=0,bones=0,skinned=0,triangles=0;model.traverse(o=>{if(o.name==='operatorBody')bodies++;if(o.isBone)bones++;if(o.isSkinnedMesh){skinned++;assert.equal(o.skeleton,state.people[0].skeleton);triangles+=o.geometry.attributes.position.count/3;}});
  assert.equal(bodies,1);assert.equal(bones,13);assert.equal(skinned,2);assert.ok(triangles<10000,kind+' '+faction+' '+triangles);
  A.release(model);
 }
});
test('faction silhouettes are distinct geometry rather than only material recoloring',()=>{
 const hashes=new Set();for(const f of Object.keys(WarData.F)){const m=WarModels.create('infantry',f),a=m.getObjectByName('operatorBody').geometry.attributes.position.array;hashes.add(crypto.createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex'));}
 assert.equal(hashes.size,6);
});
test('all armed personnel retain a forward unobstructed muzzle and medic has only a service point',()=>{
 for(const kind of kinds)for(const faction of Object.keys(WarData.F)){
  const m=WarModels.create(kind,faction);m.updateMatrixWorld(true);const marker=m.getObjectByName(kind==='field_medic'?'servicePoint':'muzzle');assert.ok(marker);
  if(kind==='field_medic'){assert.equal(m.getObjectByName('muzzle'),undefined);assert.equal(m.getObjectByName('operatorRifle'),undefined);continue;}
  const ray=new T.Raycaster(marker.getWorldPosition(new T.Vector3()).add(new T.Vector3(.005,0,0)),new T.Vector3(1,0,0));assert.equal(ray.intersectObject(m,true).length,0,kind+' '+faction+' muzzle blocked');
 }
});
test('kit camouflage shaders retain surface PBR and use faction-specific deterministic programs',()=>{
 const keys=new Set();for(const f of Object.keys(WarData.F)){
  const m=WarModels.create('operator',f).getObjectByName('operatorBody').material,shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>'};m.onBeforeCompile(shader);keys.add(m.customProgramCacheKey());
  assert.match(shader.fragmentShader,/roughnessFactor/);assert.match(shader.fragmentShader,/metalnessFactor/);assert.ok(shader.uniforms.detailCamo);if(['chn','rus','kor'].includes(f))assert.match(shader.fragmentShader,/dh\(floor\(dPos\*/);
 }assert.equal(keys.size,6);
});
