/* Actual existing exterior ports; CPU-only, no rendering or new geometry. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.resolve(__dirname,'..'));global.THREE=require('../assets/vendor/three.min.js');
for(const file of ['src/data.js','src/roster.js','src/models3d.js','src/model-detail.js','src/models-vehicles.js','src/models-tactical-air-space.js','src/weapon-salvos.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const rows=[];
for(const kind of ['rocket','orbital_missile_barge'])for(const faction of Object.keys(WarData.F)){
 const model=WarModels.create(kind,faction),ports=model.userData.firePorts,count=kind==='rocket'?WarWeaponSalvos.counts[faction]:8;
 assert.equal(ports.length,count);model.updateMatrixWorld(true);
 const defaultPoint=model.getObjectByName('muzzle').getWorldPosition(new THREE.Vector3()),first=model.getObjectByName('muzzle_0').getWorldPosition(new THREE.Vector3());assert(defaultPoint.distanceTo(first)<1e-9);
 const seen=new Set();for(const p of ports){
  const node=model.getObjectByName(p.node);assert(node);assert(!node.isMesh);
  const pos=node.getWorldPosition(new THREE.Vector3()),direction=new THREE.Vector3(...p.direction).transformDirection(node.parent.matrixWorld),key=pos.toArray().map(x=>x.toFixed(6)).join(',');
  assert(!seen.has(key));seen.add(key);
  const hit=new THREE.Raycaster(pos,direction.clone().negate(),0,.09).intersectObject(model,true)[0];assert(hit,kind+'_'+faction+' '+p.node+' actual source surface');
  assert(Math.abs(hit.distance-node.userData.artOffset)<2e-5);assert.equal(new THREE.Raycaster(pos,direction,0,.025).intersectObject(model,true).length,0);
 }
 const copy=model.clone(true);model.rotation.y=.7;model.updateMatrixWorld(true);assert(copy.getObjectByName('muzzle_0').getWorldPosition(new THREE.Vector3()).distanceTo(first)<1e-9);
 rows.push({kind,faction,count,source:kind==='rocket'?'existing visible tube/canister faces':'front rack apertures only; aft modules are stores'});
}
for(const kind of ['destroyer','submarine']){const m=WarModels.create(kind,'imp'),node=m.getObjectByName('muzzle');assert(node);assert.equal(m.userData.muzzleFamily,kind==='submarine'?'torpedo':'cannon');if(kind==='submarine')assert.equal(node.userData.source,'approximate-forward-hull-exit');rows.push({kind,faction:'imp',source:node.userData.source,position:node.position.toArray()});}
const report={date:'2026-10-20',gpuUsed:false,models:rows.length,ports:rows.filter(r=>r.count).reduce((n,r)=>n+r.count,0),checks:['Distinct existing model ports','Default muzzle matches port zero','Backward ray reaches each real existing face','Immediate launch direction clear','Independent clone markers'],rows};
fs.writeFileSync('docs/reviews/salvo-port-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
