/* Offline T-90M exterior: minehffd, CC BY 4.0; see assets/models/t90m-LICENSE.md.
 * Load after models-tanks.js, GLTFLoader.bundle.js and t90m-data.js. */
(function(root){
 'use strict';
 const state=root.WarImportedGround={status:'loading',loaded:[],errors:[]};
 const assetSource='https://sketchfab.com/3d-models/t-90m-2e31a3cf16b04f0180b9387df5198c9a';
 state.ready=Promise.resolve().then(async function(){
  const T=root.THREE;if(!T?.GLTFLoader||!root.WarModels)throw Error('T-90M import dependencies are missing');
  if(!root.WarT90MGLB)throw Error('Embedded T-90M data is missing');
  const binary=atob(root.WarT90MGLB),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const gltf=await new T.GLTFLoader().parseAsync(bytes.buffer,''),art=gltf.scene,turret=art.getObjectByName('turret'),hull=art.getObjectByName('hull'),gun=art.getObjectByName('gun');
  if(!turret||!hull||!gun||gun.parent!==turret||hull.parent===turret||turret.children.length<2)throw Error('T-90M articulation map is invalid');
  let parts=0,triangles=0;art.traverse(m=>{if(!m.isMesh)return;parts++;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;m.userData.preserveMaterial=true;m.castShadow=m.receiveShadow=true;});
  art.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(art),size=bounds.getSize(new T.Vector3());
  if(triangles!==122516||parts>25||size.x<9||size.x>12||Math.abs(bounds.min.y)>.01)throw Error('T-90M geometry validation failed');
  const template=new T.Group();template.name='T-90M — minehffd';template.add(art);
  template.userData={scale:6.4,parts,triangles,profile:'T-90M — licensed textured exterior',evidenceStatus:'photo-referenced',reviewStatus:'licensed-art-multi-view-reviewed',referenceUrl:'https://www.rostec.ru/media/news/tank-t-90m-proryvnaya-mashina/',assetSource,author:'minehffd',license:'CC-BY-4.0',assetPath:'assets/models/t90m.glb',forwardAxis:'+X',groundY:0,limitations:'Author page labels CC-BY; source metadata and visual correspondence retained. Exterior artwork, not engineering reconstruction or an absolute originality guarantee.'};
  root.WarModels.register('tank','rus',()=>{const clone=template.clone(true);clone.traverse(m=>{if(m.isMesh){m.material=Array.isArray(m.material)?m.material.map(x=>x.clone()):m.material.clone();m.userData.preserveMaterial=true;}});return clone;});
  state.status='ready';state.loaded=['tank_rus'];root.dispatchEvent(new CustomEvent('war-models-ready',{detail:{loaded:state.loaded.slice()}}));return {status:state.status,loaded:state.loaded.slice(),errors:[]};
 }).catch(error=>{state.status='failed';state.errors.push(error?.message||String(error));console.error('[WarImportedGround] T-90M import failed; procedural model retained.',error);root.dispatchEvent(new CustomEvent('war-models-error',{detail:{errors:state.errors.slice()}}));return {status:state.status,loaded:[],errors:state.errors.slice()};});
})(globalThis);
