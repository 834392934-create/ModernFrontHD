const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');
for(const name of ['data','roster','models3d','vehicle-rig-ground','vehicle-rig-naval','vehicle-rig-air','model-detail','models-tanks','models-vehicles','models-air','models-naval','models-space','models-roster','models-reinforcements-ground-naval','models-reinforcements-air-space','models-tactical-ground-naval','models-tactical-air-space','models-depth-wave','models-altitude-wave','models-operator','personnel-animation','model-unit-refinement'])require('../src/'+name);
const T=THREE,R=WarUnitRefinement;
function original(kind,f){const apply=R.apply;R.apply=model=>model;try{WarModels.cache.delete(kind+'_'+f);return WarModels.create(kind,f);}finally{R.apply=apply;}}
function snapshot(model){
 model.updateMatrixWorld(true);const meshes=[],nodes=[];
 model.traverse(o=>{nodes.push({o,name:o.name,matrix:o.matrixWorld.elements.slice(),parent:o.parent});if(o.isMesh){const g=o.geometry;meshes.push({o,geometry:g,position:g.attributes.position,normal:g.attributes.normal,color:g.attributes.color,skinIndex:g.attributes.skinIndex,skinWeight:g.attributes.skinWeight,index:g.index,count:g.index?.count||g.attributes.position.count});}});
 return{meshes,nodes,box:new T.Box3().setFromObject(model)};
}
test('all 462 unit slots retain geometry, normals, hierarchy, muzzle and motion rig transforms',()=>{
 const kinds=Object.keys(WarData.U),factions=Object.keys(WarData.F);assert.equal(kinds.length,77);assert.equal(factions.length,6);
 for(const kind of kinds)for(const f of factions){
  const model=original(kind,f),before=snapshot(model);R.apply(model,kind,f);const after=snapshot(model),label=kind+'_'+f;
  assert.ok(model.userData.unitRefinement.meshes>0,label);assert.equal(model.userData.unitRefinement.addedTriangles,0);assert.ok(after.box.equals(before.box),label+' envelope');
  assert.equal(after.meshes.length,before.meshes.length,label+' draw mesh count');assert.equal(after.nodes.length,before.nodes.length,label+' hierarchy');
  before.meshes.forEach((m,i)=>{const n=after.meshes[i];for(const key of ['o','geometry','position','normal','color','skinIndex','skinWeight','index','count'])assert.equal(n[key],m[key],label+' '+key);assert.ok(n.position.array.every(Number.isFinite),label+' finite positions');assert.ok(n.normal.array.every(Number.isFinite),label+' finite normals');if(m.o.userData.unitRefinement)assert.equal(m.o.geometry.attributes.unitSurface.count,m.position.count);});
  before.nodes.forEach((n,i)=>{assert.equal(after.nodes[i].o,n.o);assert.equal(after.nodes[i].name,n.name);assert.equal(after.nodes[i].parent,n.parent);assert.deepEqual(after.nodes[i].matrix,n.matrix,label+' anchor/rig transform');});
  const first=model.userData.unitRefinement,firstMaterial=after.meshes[0].o.material;R.apply(model,kind,f);assert.equal(model.userData.unitRefinement,first);assert.equal(after.meshes[0].o.material,firstMaterial);
  WarModels.cache.delete(label);
 }
});
test('known builder colors separate rubber, metal and optical windows without altering source colors',()=>{
 const b=new WarModels.Builder();for(const [i,c]of [0x242724,0x454a43,0x254c5c,0x657052].entries())b.box(1,1,1,i,1,0,c);
 const g=new T.Group(),m=b.finish();g.add(m);const colors=m.geometry.attributes.color.array.slice(),source=m.material;R.apply(g,'tank','chn');
 const s=m.geometry.attributes.unitSurface;assert.equal(s.getX(0),R.classes.rubber);assert.equal(s.getX(36),R.classes.metal);assert.equal(s.getX(72),R.classes.glass);assert.equal(s.getX(108),R.classes.paint);assert.deepEqual(m.geometry.attributes.color.array,colors);assert.notEqual(m.material,source);assert.equal(source.userData.unitRefinement,undefined);
});
test('personnel fabric and skinning remain intact and the new shader preserves kit camouflage and fog hooks',()=>{
 const g=original('operator','chn'),m=g.getObjectByName('operatorBody'),source=m.material,callback=source.onBeforeCompile;R.apply(g,'operator','chn');
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};m.material.onBeforeCompile(shader);
 assert.equal(source.onBeforeCompile,callback);assert.equal(shader.uniforms.detailCamo,source.userData.camo);assert.match(shader.fragmentShader,/dh\(floor\(dPos\*64\.0\)\)/);assert.match(shader.fragmentShader,/urDetailFade\(dPos,145\.0\)/);assert.match(shader.fragmentShader,/roughnessFactor=clamp/);assert.match(shader.vertexShader,/urSurface=unitSurface/);assert.equal(m.geometry.attributes.skinIndex.count,m.geometry.attributes.position.count);
 const surfaces=new Set(m.geometry.attributes.unitSurface.array);assert.ok(surfaces.has(R.classes.cloth));assert.ok(surfaces.has(R.classes.rubber));
});
test('licensed GLB, mapped, transparent and emissive materials retain exact authored materials and attributes',()=>{
 for(const protection of ['license','texture','transparent','emissive']){
  const b=new WarModels.Builder();b.box(1,1,1,0,0,0,0x242724);const m=b.finish(),g=new T.Group();m.material=m.material.clone();g.add(m);
  if(protection==='license')g.userData.assetSource='https://example.invalid/author-asset';
  if(protection==='texture')m.material.map=new T.Texture();if(protection==='transparent')m.material.transparent=true;if(protection==='emissive')m.material.emissive.setHex(0x337799);
  const source=m.material,attributes=Object.keys(m.geometry.attributes),side=source.side,alpha=source.opacity;R.apply(g,'tank','rus');assert.equal(m.material,source);assert.equal(source.side,side);assert.equal(source.opacity,alpha);assert.deepEqual(Object.keys(m.geometry.attributes),attributes);assert.equal(g.userData.unitRefinement.preserved,1);assert.equal(g.userData.unitRefinement.meshes,0);
 }
});
test('building and scenery geometry is excluded from the unit-only pass',()=>{const g=new T.Group(),b=new WarModels.Builder();b.box(2,2,2,0,0,0,0x242724);g.add(b.finish());const m=g.children[0].material;R.apply(g,'hq','chn');assert.equal(g.userData.unitRefinement,undefined);assert.equal(g.children[0].material,m);});
test('reparenting an already refined mesh does not install duplicate shader declarations',()=>{const b=new WarModels.Builder();b.box(1,1,1,0,0,0,0x242724);const mesh=b.finish(),first=new T.Group(),second=new T.Group();first.add(mesh);R.apply(first,'tank','chn');const material=mesh.material;second.add(mesh);R.apply(second,'rocket','usa');assert.equal(mesh.material,material);const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader);assert.equal(shader.vertexShader.split('attribute float unitSurface;').length-1,1);});
