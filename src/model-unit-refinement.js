/* Conservative finish pass for the existing original models. No new silhouettes,
 * weapons or imported-asset edits. Run once on the template after motion rigs. */
(function(root){
 'use strict';
 const T=root.THREE,materials=new WeakMap(),geometryClasses=new WeakMap();
 const version=1,classes={paint:0,glass:1,metal:2,rubber:3,cloth:4,solar:5,foil:6};
 // These are the documented palette constants of the original builders, not
 // inferred real-world material measurements or nationality-based recolors.
 const palette=new Map();
 for(const [name,colors]of Object.entries({
  glass:[0x233b42,0x344b53,0x254c5c,0x263c43,0x314847,0x3b4c49,0x325a70,0x397c99],
  metal:[0x454a43,0x41423d,0x444b4c,0x60656a,0x939796,0x58646a,0x65777d,0x586775],
  rubber:[0x202528,0x242724],solar:[0x263e69,0x203e70],foil:[0xb09a64,0xb29453]
 }))for(const color of colors){const c=new T.Color(color);palette.set([c.r,c.g,c.b].map(x=>Math.round(x*65535)).join(','),classes[name]);}
 function classify(geometry,explicit){
  let cached=geometryClasses.get(geometry);if(cached)return cached;
  const color=geometry.attributes.color,surface=geometry.attributes.surface,position=geometry.attributes.position;
  if(!color||!surface||!position||color.count!==position.count||surface.count!==position.count)return null;
  const values=new Uint8Array(position.count),counts=Array(7).fill(0),lookup=new Map();
  for(let i=0;i<values.length;i++){
   const key=[color.getX(i),color.getY(i),color.getZ(i)].map(x=>Math.round(x*65535)).join(',');
   let known=lookup.get(key);if(known===undefined){known=palette.has(key)?palette.get(key):-1;lookup.set(key,known);}
   const declared=Math.round(surface.getX(i));
   // Explicit cloth/rubber/solar tags outrank color; this preserves kit-specific
   // fabric and existing role models that intentionally reuse an armor color.
   const value=explicit&&declared>0?declared:known>=0?known:Math.max(0,Math.min(6,declared));
   values[i]=value;counts[value]++;
  }
  geometry.setAttribute('unitSurface',new T.Uint8BufferAttribute(values,1));
  cached={counts,bytes:values.byteLength};geometryClasses.set(geometry,cached);return cached;
 }
 function refineMaterial(source){
  if(source.userData.unitRefinement===version)return source;
  let result=materials.get(source);if(result)return result;
  const mat=source.clone(),previous=source.onBeforeCompile,previousKey=source.customProgramCacheKey.call(source);
  mat.name=(source.name||'OriginalUnitSurface')+'_Refined_v'+version;
  if(source.userData.camo)mat.userData.camo=source.userData.camo;
  mat.userData.unitRefinement=version;
  mat.onBeforeCompile=(shader,renderer)=>{
   previous?.call(source,shader,renderer);
   shader.vertexShader='attribute float unitSurface; varying float urSurface; varying vec3 urLocal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nurSurface=unitSurface; urLocal=position;');
   shader.fragmentShader=`varying float urSurface; varying vec3 urLocal;
    float urDetailFade(vec3 p,float frequency){vec3 pixel=fwidth(p)*frequency;return 1.0-smoothstep(.28,1.0,max(pixel.x,max(pixel.y,pixel.z)));}
    `+shader.fragmentShader;
   // Fade the existing high-frequency grain to its average as it becomes
   // sub-pixel. All deterministic faction camouflage and original colors stay.
   shader.fragmentShader=shader.fragmentShader
    .replaceAll('(.96+grain*.08)','mix(1.0,.96+grain*.08,urDetailFade(vLocal,3.8))')
    .replace('diffuseColor.rgb*=.98+gr*.04;','diffuseColor.rgb*=mix(1.0,.98+gr*.04,urDetailFade(dPos,145.0));');
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`
    float urRough=urSurface<.5?.76:urSurface<1.5?.16:urSurface<2.5?.40:urSurface<3.5?.96:urSurface<4.5?.96:urSurface<5.5?.26:.44;
    float urMetal=urSurface<.5?.025:urSurface<1.5?.0:urSurface<2.5?.82:urSurface<4.5?.0:urSurface<5.5?.25:.72;
    float urGrain=sin(urLocal.x*137.0+sin(urLocal.z*113.0))*sin(urLocal.y*127.0+urLocal.z*79.0);
    roughnessFactor=clamp(urRough+urGrain*.018*urDetailFade(urLocal,145.0),.06,1.0);
    metalnessFactor=urMetal;
    #include <lights_physical_fragment>`);
  };
  mat.customProgramCacheKey=()=>previousKey+'|unit-surface-v'+version;
  mat.needsUpdate=true;materials.set(source,mat);return mat;
 }
 function mapped(mat){return ['map','normalMap','roughnessMap','metalnessMap','alphaMap','aoMap','bumpMap','emissiveMap','displacementMap'].some(key=>mat[key]);}
 function apply(model,kind=model?.userData.kind,faction=model?.userData.faction){
  if(!model||!root.WarData?.U[kind]||model.userData.unitRefinement)return model;
  const report={version,kind,faction,mode:'original-surface-only',meshes:0,preserved:0,surfaceClasses:[],addedTriangles:0};
  const found=new Set(),licensed=!!(model.userData.assetSource||model.userData.assetPath);
  model.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const list=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   // Imported PBR, transparency and emission retain their authored behavior.
   // A mixed-material mesh is kept intact rather than partially recolored.
   if(licensed||list.some(m=>!m?.isMeshStandardMaterial||mapped(m)||m.transparent||(m.emissiveIntensity>0&&m.emissive?.getHex()!==0))){report.preserved++;return;}
   const explicit=!!(mesh.userData.surfaceFinish||list.some(m=>m.name==='RoleSurfaces_v2'||m.name.startsWith('PersonnelFabric_')));
   const info=classify(mesh.geometry,explicit);if(!info){report.preserved++;return;}
   mesh.material=Array.isArray(mesh.material)?list.map(refineMaterial):refineMaterial(list[0]);
   mesh.userData.preserveMaterial=true;mesh.userData.unitRefinement=version;report.meshes++;
   info.counts.forEach((n,i)=>{if(n)found.add(i);});
  });
  report.mode=licensed?'licensed-asset-preserved':'original-surface-only';report.surfaceClasses=[...found].sort();
  model.userData.unitRefinement=report;return model;
 }
 root.WarUnitRefinement={apply,version,classes};
})(globalThis);
