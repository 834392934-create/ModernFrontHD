const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');for(const file of ['data','roster','models3d','model-detail','models-buildings'])require('../src/'+file);
test('all six runway models use the 360 by 160 surface inside the 2u simulation height',()=>{
 for(const faction of Object.keys(WarData.F)){
  const model=WarModels.create('runway',faction);assert(model.getObjectByName('runway-surface'));assert.equal(model.userData.evidenceStatus,'original-game-facility');
  model.scale.setScalar(model.userData.scale);model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
  assert(Math.abs(size.x-360)<.001,faction+': length '+size.x);assert(Math.abs(size.z-160)<.001,faction+': width '+size.z);assert(box.min.y>=-.001);assert(box.max.y<=2);
  assert.equal(model.getObjectByName('turret'),undefined);
 }
});
