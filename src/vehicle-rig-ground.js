/* Rigid vertex weights retain the original batched exteriors and materials.
 * Game articulation only: no manufacturing dimensions or certified joint data. */
(function(root){
 'use strict';const T=root.THREE;
 function descriptor(g,node,role,pivot,extra={}){const d={node,role,pivot,axis:[0,0,1],rest:[0,0,0,1],restScale:[1,1,1],sign:1,...extra};g.userData.motionRig.push(d);return d;}
 function skin(g,mesh,parts){if(!parts.length)return;const geo=mesh.geometry.clone(),n=geo.attributes.position.count,indices=new Uint16Array(n*4),weights=new Float32Array(n*4);for(let i=0;i<n;i++)weights[i*4]=1;
  const batch='rig_ground_'+g.userData.motionRig.length;mesh.name=mesh.name||batch+'_mesh';const specs=[{node:batch+'_static',pivot:[0,0,0]}];
  const namedParts=new Map();for(const p of parts){const name=batch+'_'+specs.length,ancestor=namedParts.get(p.parentKey),pivot=ancestor?p.pivot.map((v,i)=>v-ancestor.pivot[i]):p.pivot;let parent=ancestor?.node;
   if(p.pitch){const pitchName=name+'_pitch';specs.push({node:pitchName,pivot,parent});descriptor(g,pitchName,'weaponPitch',pivot,{axis:p.pitchAxis||[0,0,1],mountId:p.mountId||'main',batch:mesh.name});parent=pitchName;}
   const id=specs.length,local=p.pitch?[0,0,0]:pivot;specs.push({node:name,pivot:local,parent});const {ranges,pitch,...meta}=p;descriptor(g,name,p.role,local,{...meta,pivot:local,node:name,batch:mesh.name});if(p.key)namedParts.set(p.key,{node:name,pivot:p.pivot});for(const [start,count]of p.ranges)for(let i=start;i<start+count;i++)indices[i*4]=id;}
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));mesh.geometry=geo;mesh.userData.vehicleBones=specs;
 }
 function cylinder(p){return p.type==='CylinderGeometry'&&Math.abs(Math.abs(p.rot[0])-Math.PI/2)<.01;}
 function procedural(g,mesh,mode){if(mesh.userData.vehicleBones)return;const ps=mesh.userData.motionPrimitives||[],parts=[],claimed=new Set(),tracked=!!root.WarData?.U?.[g.userData.kind]&&(root.WarVehicleMotion?root.WarVehicleMotion.profile(g.userData.kind,g.userData.faction).kind==='tracked':['tank','ifv','arty'].includes(root.WarData.U[g.userData.kind].modelKind||g.userData.kind));
  if(g.userData.kind==='ciws'&&ps.some(p=>p.type==='CylinderGeometry'&&Math.abs(p.pos[0]-3.25)<.01&&Math.abs(p.pos[1]-1.9)<.01)){
   const barrel=ps.filter(p=>p.type==='CylinderGeometry'&&p.pos[0]>=1.99&&p.pos[1]>1.7&&p.pos[1]<2.1),top=ps.filter(p=>p.pos[1]>=1.3&&!barrel.includes(p));
   parts.push({key:'ciws-yaw',role:'turret',mountId:'main_turret',search:true,pivot:[0,1.2,0],axis:[0,1,0],ranges:top.map(p=>[p.start,p.count])});
   parts.push({parentKey:'ciws-yaw',role:'barrelSpin',mountId:'main_turret',pitch:true,pivot:[.65,1.9,0],axis:[1,0,0],ranges:barrel.map(p=>[p.start,p.count])});[...top,...barrel].forEach(p=>claimed.add(p));
   if(!g.getObjectByName('muzzle')){const tip=new T.Object3D();tip.name='muzzle';tip.position.set(3.362,1.9,0);tip.userData={source:'existing-ciws-barrel-cluster-tip',motionJointRole:'barrelSpin'};g.add(tip);g.userData.muzzleFamily='autocannon';}
  }
  if(g.userData.kind==='ciws'&&mesh.name==='turret'){const barrel=ps.filter(p=>p.type==='CylinderGeometry'&&p.pos[0]>=1.89&&p.pos[1]>.58&&p.pos[1]<1&&Math.abs(p.pos[2])<.25);if(barrel.length>=7){parts.push({role:'barrelSpin',mountId:'main_turret',pitch:true,pivot:[.55,.78,0],axis:[1,0,0],ranges:barrel.map(p=>[p.start,p.count])});barrel.forEach(p=>claimed.add(p));const m=g.getObjectByName('muzzle');if(m){m.userData.motionJointRole='barrelSpin';m.userData.source='existing-ciws-barrel-cluster-tip';}}}
  if(g.userData.kind==='ifv'&&mesh.name!=='turret')for(const side of [-1,1]){const lid=ps.find(p=>p.type==='CylinderGeometry'&&Math.abs(p.pos[0]+1)<.01&&Math.abs(p.pos[2]-side*.63)<.01&&Math.abs(p.params.radiusTop-.22)<.01);if(lid){const lidParts=ps.filter(p=>Math.abs(p.pos[0]+1)<.01&&Math.abs(p.pos[2]-side*.63)<.01&&p.pos[1]>=lid.pos[1]&&p.pos[1]<lid.pos[1]+.1);parts.push({role:'weaponDoor',pivot:[-1,lid.pos[1],side*.85],axis:[1,0,0],limit:side*.7,weaponFamily:'missile',mountId:'main',ranges:lidParts.map(p=>[p.start,p.count])});lidParts.forEach(p=>claimed.add(p));}}
  if(mode==='ground'){
   const centers=[];for(const p of ps){const r=Math.max(p.params.radiusTop||0,p.params.radiusBottom||0);if(cylinder(p)&&r>=.29&&r<=.85&&p.pos[1]<1.15&&Math.abs(p.pos[2])>.7&&!centers.some(c=>Math.hypot(c.x-p.pos[0],c.y-p.pos[1],c.z-p.pos[2])<.35))centers.push({x:p.pos[0],y:p.pos[1],z:p.pos[2],r});}
   for(const c of centers){const ranges=[];for(const p of ps){if(claimed.has(p))continue;const dx=p.pos[0]-c.x,dy=p.pos[1]-c.y,dz=p.pos[2]-c.z,rad=Math.hypot(dx,dy),isTire=p.type==='TorusGeometry',smallBox=p.type==='BoxGeometry'&&(p.params.width||0)<.23&&(p.params.height||0)<.12;
     if(Math.abs(dz)<.40&&((cylinder(p)&&rad<c.r*.65)||(isTire&&rad<.05)||(!tracked&&smallBox&&rad<c.r*1.03&&rad>c.r*.80))){ranges.push([p.start,p.count]);claimed.add(p);}}
    if(ranges.length)parts.push({role:'wheel',pivot:[c.x,c.y,c.z],radius:c.r,positionZ:c.z,steering:root.WarVehicleMotion?.profile(g.userData.kind).kind==='wheeled'&&c.x>0,ranges});
   }
   if(tracked&&centers.length>=4)for(const side of [-1,1]){
    const row=centers.filter(c=>Math.sign(c.z)===side);if(!row.length)continue;const z=row.reduce((n,c)=>n+c.z,0)/row.length;
    const shoes=ps.filter(p=>!claimed.has(p)&&p.type==='BoxGeometry'&&p.params.width<.32&&p.params.height>.04&&p.params.height<.14&&p.params.depth>.45&&Math.abs(p.pos[2]-z)<.15&&p.pos[1]<1.45);
    if(shoes.length<12)continue;const cx=shoes.reduce((n,p)=>n+p.pos[0],0)/shoes.length,cy=shoes.reduce((n,p)=>n+p.pos[1],0)/shoes.length;shoes.sort((a,b)=>Math.atan2(a.pos[1]-cy,a.pos[0]-cx)-Math.atan2(b.pos[1]-cy,b.pos[0]-cx));
    g.userData.trackPaths??={};const key='track_'+Object.keys(g.userData.trackPaths).length,path=shoes.map(p=>p.pos.slice());g.userData.trackPaths[key]=path;let offset=0;
    for(let i=0;i<shoes.length;i++){const p=shoes[i],next=shoes[(i+1)%shoes.length],ranges=[];for(const q of ps){if(claimed.has(q))continue;if(q===p||(Math.hypot(q.pos[0]-p.pos[0],q.pos[1]-p.pos[1])<.075&&Math.abs(q.pos[2]-p.pos[2])<.34&&((q.type==='BoxGeometry'&&q.params.width<.32&&q.params.height<.04)||(cylinder(q)&&q.params.radiusTop<.05)))){claimed.add(q);ranges.push([q.start,q.count]);}}
     parts.push({role:'track',pivot:p.pos.slice(),axis:[0,0,1],path:key,pathOffset:offset,pathAngle:Math.atan2(next.pos[1]-p.pos[1],next.pos[0]-p.pos[0]),positionZ:z,ranges});offset+=Math.hypot(next.pos[0]-p.pos[0],next.pos[1]-p.pos[1]);}
   }
  }
  // Recoil is applied only to a long +X barrel, never a missile pod or entire turret.
  if(/turret|gun/i.test(mesh.name)&&!['rocket','aa','asat','sam'].includes(g.userData.kind)){
   const barrels=ps.filter(p=>!claimed.has(p)&&p.type==='CylinderGeometry'&&Math.abs(Math.abs(p.rot[2])-Math.PI/2)<.01&&p.params.height>1.2&&Math.max(p.params.radiusTop,p.params.radiusBottom)<.25&&p.pos[0]>0);
   if(barrels.length){const dual=g.userData.kind==='ifv'&&['rus','chn'].includes(g.userData.faction),ordered=barrels.sort((a,b)=>b.params.height-a.params.height);for(const [index,p]of (dual?ordered.slice(0,2):ordered.slice(0,1)).entries()){const selected=ps.filter(q=>!claimed.has(q)&&q.pos[0]>p.pos[0]-p.params.height*.5&&Math.abs(q.pos[1]-p.pos[1])<(dual?.11:.22)&&Math.abs(q.pos[2]-p.pos[2])<(dual?.11:.22)),ranges=selected.map(q=>[q.start,q.count]);selected.forEach(q=>claimed.add(q));parts.push({role:'recoil',pivot:[p.pos[0]-p.params.height*.5,p.pos[1],p.pos[2]],axis:[1,0,0],mountId:'main',families:dual?[index?'autocannon':'cannon']:['cannon','howitzer','mortar','navalGun','autocannon'],pitch:true,distance:index?.045:.30,ranges,...(dual&&index?{muzzleName:'weapon_muzzle_ifv_autocannon',muzzlePoint:g.userData.faction==='rus'?[3.562,.39,-.21]:[3.712,.28,.05]}:{})});}}
  }
  // The US tank already models a roof machine gun. Articulate those exact
  // primitives separately; no new CROWS enclosure or certified geometry claim.
  if(g.userData.kind==='tank'&&g.userData.faction==='usa'&&mesh.name==='turret'){
   const selected=ps.filter(p=>!claimed.has(p)&&p.pos[1]>=.889&&p.pos[1]<=1.35&&p.pos[2]>=.29&&p.pos[2]<=.89&&p.pos[0]>=-.50&&p.pos[0]<=.41),gun=selected.filter(p=>Math.abs(p.pos[1]-1.28)<.01&&Math.abs(p.pos[2]-.59)<.01);
   if(selected.length>=3){parts.push({key:'roof',role:'turret',pivot:[-.48,.89,.59],axis:[0,1,0],mountId:'roof',parentMountId:'main',ranges:selected.filter(p=>!gun.includes(p)).map(p=>[p.start,p.count])});parts.push({parentKey:'roof',role:'recoil',pivot:[-.25,1.28,.59],axis:[1,0,0],mountId:'roof',pitch:true,distance:.025,families:['machinegun'],ranges:gun.map(p=>[p.start,p.count])});g.userData.roofWeaponRig='existing-roof-gun-only; CROWS family role, not certified variant geometry';}
  }
  skin(g,mesh,parts);delete mesh.userData.motionPrimitives;
 }
 function importedIslands(mesh,matrix){const p=mesh.geometry.attributes.position,ids=Array.from({length:p.count},(_,i)=>i),find=i=>{while(ids[i]!==i){ids[i]=ids[ids[i]];i=ids[i];}return i;},join=(a,b)=>{ids[find(a)]=find(b);},seen=new Map();
  for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');if(seen.has(key))join(i,seen.get(key));else seen.set(key,i);}const idx=mesh.geometry.index?.array;for(let i=0;i<(idx?.length||p.count);i+=3){join(idx?idx[i]:i,idx?idx[i+1]:i+1);join(idx?idx[i]:i,idx?idx[i+2]:i+2);}
  const groups=new Map(),v=new T.Vector3();for(let i=0;i<p.count;i++){const k=find(i);if(!groups.has(k))groups.set(k,{box:new T.Box3(),vs:[]});const c=groups.get(k);v.fromBufferAttribute(p,i);if(matrix)v.applyMatrix4(matrix);c.box.expandByPoint(v);c.vs.push(i);}return [...groups.values()].map(c=>({...c,center:c.box.getCenter(new T.Vector3()),size:c.box.getSize(new T.Vector3())}));
 }
 function importedWheels(g,mesh){if(mesh.userData.vehicleBones)return;g.updateMatrixWorld(true);const matrix=g.matrixWorld.clone().invert().multiply(mesh.matrixWorld),inverse=matrix.clone().invert(),islands=importedIslands(mesh,matrix),axes=[];
  // This released asset has six road-wheel axes plus an end wheel at each end
  // of each side. Coaxial rim/hub islands are grouped in XY, not by 3D distance.
  for(const c of islands){const s=c.size;if(s.x<.3||s.y<.3||s.x>1||s.y>1||Math.abs(s.x-s.y)>.015)continue;let a=axes.find(a=>Math.sign(a.center.z)===Math.sign(c.center.z)&&Math.hypot(a.center.x-c.center.x,a.center.y-c.center.y)<.02);if(!a){a={center:c.center.clone(),radius:0,islands:[]};axes.push(a);}a.radius=Math.max(a.radius,s.x/2,s.y/2);}
  if(axes.length!==16){g.userData.importedWheelRigBoundary='Unexpected source topology: wheel articulation skipped.';return;}
  for(const c of islands){const row=axes.filter(a=>Math.sign(a.center.z)===Math.sign(c.center.z));const nearest=row.reduce((a,b)=>Math.hypot(c.center.x-a.center.x,c.center.y-a.center.y)<Math.hypot(c.center.x-b.center.x,c.center.y-b.center.y)?a:b);if(Math.hypot(c.center.x-nearest.center.x,c.center.y-nearest.center.y)>nearest.radius+.025){g.userData.importedWheelRigBoundary='Unexpected outlying island: wheel articulation skipped.';return;}nearest.islands.push(c);}
  const axis=new T.Vector3(0,0,1).transformDirection(inverse).toArray(),parts=axes.map(a=>({role:'wheel',pivot:a.center.clone().applyMatrix4(inverse).toArray(),axis,radius:a.radius,positionZ:a.center.z,steering:false,source:'T90M-original-coaxial-islands',ranges:a.islands.flatMap(c=>c.vs.map(i=>[i,1]))}));
  skin(g,mesh,parts);g.userData.importedWheelRig={axes:axes.length,roadWheels:axes.filter(a=>a.center.y<.5).length,radii:axes.map(a=>a.radius),sourceIslands:islands.length,indexedPreserved:!!mesh.geometry.index};
 }
 function importedTracks(g,mesh){if(mesh.userData.vehicleBones)return;g.updateMatrixWorld(true);const matrix=g.matrixWorld.clone().invert().multiply(mesh.matrixWorld),identity=new T.Matrix4();if(matrix.elements.some((x,i)=>Math.abs(x-identity.elements[i])>1e-6)){g.userData.importedTrackRigBoundary='Non-baked source transform: track loop skipped.';return;}
  const islands=importedIslands(mesh),guide=c=>c.size.z>.08&&c.size.z<.095&&c.vs.length>55,shoes=[];
  // Verified released GLB topology: nine disconnected exterior islands per shoe,
  // third island is its guide tooth. Keep every island intact, with original UVs.
  if(islands.length!==1647)return;
  for(let i=0;i<islands.length;i+=9){const block=islands.slice(i,i+9),c=block[2];if(!guide(c)||block.filter(guide).length!==1||!block.every(x=>Math.sign(x.center.z)===Math.sign(c.center.z)))return;shoes.push({center:c.center.clone(),islands:block});}
  const parts=[];g.userData.trackPaths??={};let merged=0;
  for(const side of [-1,1]){let row=shoes.filter(s=>Math.sign(s.center.z)===side);
   // The original left seam contains two almost coincident shoes. Preserve both
   // skins on one joint, avoiding a zero-length closing path and a 180° flip.
   if(row[0].center.distanceTo(row.at(-1).center)<.04){row[0].islands.push(...row.pop().islands);merged++;}
   if(row.length!==91)return;const area=row.reduce((n,a,i)=>{const b=row[(i+1)%row.length];return n+a.center.x*b.center.y-b.center.x*a.center.y;},0);if(area<0)row.reverse();
   const lengths=row.map((a,i)=>a.center.distanceTo(row[(i+1)%row.length].center));if(lengths.some(x=>x<.07||x>.2))return;
   const key='imported_track_'+(side<0?'left':'right');g.userData.trackPaths[key]=row.map(a=>a.center.toArray());let offset=0;
   for(let i=0;i<row.length;i++){const shoe=row[i],next=row[(i+1)%row.length],p=shoe.center;parts.push({role:'track',pivot:p.toArray(),axis:[0,0,1],path:key,pathOffset:offset,pathAngle:Math.atan2(next.center.y-p.y,next.center.x-p.x),positionZ:p.z,source:'T90M-original-shoe-islands',ranges:shoe.islands.flatMap(c=>c.vs.map(i=>[i,1]))});offset+=lengths[i];}
  }
  skin(g,mesh,parts);g.userData.importedTrackRig={sourceShoes:shoes.length,joints:parts.length,sourceIslands:islands.length,coincidentSeamsMerged:merged,indexedPreserved:!!mesh.geometry.index,limit:'Original exterior loop, not physical track tension or suspension simulation.'};
 }
 function importedNamed(mesh,re){for(let o=mesh;o;o=o.parent)if(re.test(o.name))return true;return false;}
 function attach(g,kind){if(g.userData.personnelRig)return g;g.userData.motionRig??=[];const d=root.WarData?.U?.[kind],mode=d&&!d.air&&!d.naval?'ground':'other',meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const mesh of meshes){if(g.userData.assetPath?.includes('t90m')&&importedNamed(mesh,/wheels/i))importedWheels(g,mesh);else if(g.userData.assetPath?.includes('t90m')&&importedNamed(mesh,/thread|tracks/i))importedTracks(g,mesh);else procedural(g,mesh,mode);}
  for(const name of ['turret','turretRear','radar','jammerHead','gun']){if(g.userData.motionRig.some(d=>d.node===name))continue;const o=g.getObjectByName(name);if(!o)continue;const role=name==='gun'?'recoil':name==='radar'||name==='jammerHead'?'radar':'turret';descriptor(g,name,role,o.position.toArray(),{axis:role==='recoil'?[1,0,0]:[0,1,0],mountId:kind==='rocket'||kind==='asat'||kind==='sam'?'launcher':kind==='ciws'?'main_turret':'main',search:kind==='ciws'&&role==='turret',wholeMountPitch:role==='turret'&&['rocket','asat','sam'].includes(kind),rest:o.quaternion.toArray(),restScale:o.scale.toArray(),distance:.28});}
  return g;
 }
 root.WarGroundRig={attach,skin};
})(globalThis);
