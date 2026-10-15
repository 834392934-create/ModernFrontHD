/* Licensed, offline AH-64 exterior. Andrew Swihart / ArionDigital, CC BY 4.0.
 * Load after models-air.js, GLTFLoader.bundle.js and assets/models/ah64-data.js.
 * Register only after full validation; procedural builders survive any failure. */
(function(root){
  'use strict';
  const state=root.WarImportedAir={status:'loading',loaded:[],errors:[]};
  const assetSource='https://sketchfab.com/3d-models/ah-64-helicopter-56f54d3865d247c78b49c2b47454da86';
  const referenceUrl='https://www.dvidshub.net/image/6422832/tf-expect-no-mercy-flyover-greece';
  state.ready=Promise.resolve().then(async function(){
    const T=root.THREE;
    if(!T?.GLTFLoader||!root.WarModels)throw Error('AH-64 import dependencies are missing');
    if(!root.WarAH64GLB)throw Error('Embedded AH-64 GLB data is missing');
    const binary=atob(root.WarAH64GLB),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const gltf=await new T.GLTFLoader().parseAsync(bytes.buffer,''),art=gltf.scene;
    let meshes=0,triangles=0;
    art.traverse(function(m){if(!m.isMesh)return;meshes++;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;m.userData.preserveMaterial=true;m.castShadow=m.receiveShadow=true;});
    const rotor=art.getObjectByName('rotor'),tailRotor=art.getObjectByName('tailRotor');
    if(!rotor||!tailRotor||rotor.children.length!==2||tailRotor.children.length!==2)throw Error('AH-64 animation node map is incomplete');
    art.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(art),size=bounds.getSize(new T.Vector3());
    if(!Number.isFinite(size.x)||size.x<8||size.x>15||meshes!==12||triangles!==220711)throw Error('AH-64 geometry validation failed');
    // Conversion bakes orientation, meter-independent game proportions and pivots.
    // Ground correction is a tiny residual from rounded source-bound inspection.
    art.position.y-=bounds.min.y;
    const template=new T.Group();template.name='AH-64 Longbow reference — Andrew Swihart';template.add(art);
    template.userData={scale:8,parts:meshes,triangles,profile:'AH-64 Longbow reference configuration — licensed exterior',evidenceStatus:'photo-referenced',reviewStatus:'licensed-art-multi-view-reviewed',referenceUrl,assetSource,author:'Andrew Swihart / ArionDigital',license:'CC-BY-4.0',assetPath:'assets/models/ah64.glb',rotorBlades:4,rotorLevels:1,groundY:0,forwardAxis:'+X',limits:'Longbow exterior reference, not an authenticated AH-64E batch. Original PBR except photo-referenced dark main-blade coating; no bitmap textures. No engineering reconstruction.'};
    const create=function(){const clone=template.clone(true);clone.traverse(function(m){if(!m.isMesh)return;m.material=Array.isArray(m.material)?m.material.map(x=>x.clone()):m.material.clone();m.userData.preserveMaterial=true;});return clone;};
    root.WarModels.register('heli','usa',create);root.WarModels.register('heli','kor',create);
    state.status='ready';state.loaded=['heli_usa','heli_kor'];
    root.dispatchEvent(new CustomEvent('war-models-ready',{detail:{loaded:state.loaded.slice()}}));
    return {status:state.status,loaded:state.loaded.slice(),errors:[]};
  }).catch(function(error){state.status='failed';state.errors.push(error?.message||String(error));console.error('[WarImportedAir] AH-64 import failed; procedural model retained.',error);root.dispatchEvent(new CustomEvent('war-models-error',{detail:{errors:state.errors.slice()}}));return {status:state.status,loaded:[],errors:state.errors.slice()};});
})(globalThis);
