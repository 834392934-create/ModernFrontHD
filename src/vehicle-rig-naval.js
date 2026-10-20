/* Existing exterior articulation only. No invented propellers, rotating fixed
 * arrays or certified joint dimensions. Requires WarGroundRig.skin at attach. */
(function(root){
 'use strict';const T=root.THREE;
 function descriptor(g,o,role,axis,extra={}){if(g.userData.motionRig.some(j=>j.node===o.name))return;g.userData.motionRig.push({node:o.name,role,axis,pivot:o.position.toArray(),rest:o.quaternion.toArray(),restScale:o.scale.toArray(),sign:1,...extra});}
 function primitiveBox(mesh,p){const b=new T.Box3(),a=mesh.geometry.attributes.position,v=new T.Vector3();for(let i=p.start;i<p.start+p.count;i++)b.expandByPoint(v.fromBufferAttribute(a,i));return b;}
 function procedural(g,mesh,kind,f){const entries=(mesh.userData.motionPrimitives||[]).map(p=>({p,b:primitiveBox(mesh,p)})),parts=[];if(!entries.length)return;
  const selected=new Set(),part=(role,items,pivot,extra={})=>{items=items.filter(x=>!selected.has(x));if(!items.length)return;items.forEach(x=>selected.add(x));parts.push({role,pivot,axis:role==='turret'||role==='rudder'?[0,1,0]:[0,0,1],rest:[0,0,0,1],sign:1,limit:.18,existing:true,ranges:items.map(({p})=>[p.start,p.count]),...extra});};
  if(kind==='destroyer'){
   if(f==='imp'){const items=entries.filter(({p})=>p.type==='CylinderGeometry'&&p.pos[0]>=8.9&&p.pos[0]<10.3&&p.pos[1]>1);part('turret',items,[9,1.0,0]);}
   else{const length={usa:24,chn:27,rus:21,ind:25,kor:26}[f],x=length*.38,r=f==='rus'?.7:.83;part('turret',entries.filter(({b})=>b.min.x>x-r*.76&&b.max.x<x+r*2.21&&b.min.y>1.33&&b.max.y<2.1&&b.min.z>-r*.64&&b.max.z<r*.64),[x,1.34,0]);}
  }
  if(['submarine','hunter_sub','missile_sub'].includes(kind)){
   // Whole original primitive ranges prevent clipping hull skin or duplicating surfaces.
   for(const item of entries){const b=item.b,s=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());
    if(['BufferGeometry','ExtrudeGeometry','BoxGeometry'].includes(item.p.type)&&s.y<.17&&s.z>.65&&s.x>.3&&s.x<3.5&&(Math.abs(c.z)>.45||kind==='submarine'&&f==='imp')&&(c.x>1.2||c.x< -4)){
     const fore=c.x>0,pivot=[b.max.x-(s.x*.18),c.y,c.z];part('elevator',[item],pivot,{sign:fore?1:-1,limit:.16,control:'pitch',side:Math.sign(c.z),surface:fore?'bow-or-sail-plane':'stern-plane'});
    }
    if(s.z<.16&&s.y>.7&&s.x>.4&&s.x<3.6&&c.x< -4&&Math.abs(c.z)<.10)part('rudder',[item],[b.max.x-.10,c.y,0],{limit:.20,surface:'vertical-stern-control'});
   }
  }
  root.WarGroundRig.skin(g,mesh,parts);
 }
 function islands(mesh,matrix){const p=mesh.geometry.attributes.position,idx=mesh.geometry.index?.array,ids=Array.from({length:p.count},(_,i)=>i),seen=new Map(),find=i=>{while(ids[i]!==i){ids[i]=ids[ids[i]];i=ids[i];}return i;},join=(a,b)=>{ids[find(a)]=find(b);};
  for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e4)).join(',');if(seen.has(key))join(i,seen.get(key));else seen.set(key,i);}
  for(let i=0;i<(idx?.length||p.count);i+=3){join(idx?idx[i]:i,idx?idx[i+1]:i+1);join(idx?idx[i]:i,idx?idx[i+2]:i+2);}
  const groups=new Map(),v=new T.Vector3();for(let i=0;i<p.count;i++){const k=find(i);if(!groups.has(k))groups.set(k,{box:new T.Box3(),vertices:[]});const c=groups.get(k);c.vertices.push(i);c.box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(matrix));}return [...groups.values()];
 }
 function burke(g){const mesh=g.getObjectByName('Object_6');if(!mesh?.geometry||!g.userData.assetPath?.includes('burke'))return;g.updateMatrixWorld(true);const matrix=g.matrixWorld.clone().invert().multiply(mesh.matrixWorld),inv=matrix.clone().invert(),groups=islands(mesh,matrix),parts=[];
  const add=(role,chosen,pivot,axis,extra={})=>{if(!chosen.length)return;parts.push({role,pivot:new T.Vector3(...pivot).applyMatrix4(inv).toArray(),axis:new T.Vector3(...axis).transformDirection(inv).toArray(),rest:[0,0,0,1],sign:1,limit:.20,existing:true,ranges:chosen.flatMap(c=>c.vertices.map(i=>[i,1])),sourceSpace:'licensed-Burke-original-vertex-islands',...extra});};
  const turret=groups.filter(c=>{const b=c.box;return b.min.x>6.80&&b.max.x<8.34&&b.min.y>1.32&&b.max.y<1.85&&b.min.z>-.25&&b.max.z<.25;});
  // Guard the known asset topology instead of silently rigging a different GLB revision.
  if(turret.length===4&&turret.reduce((n,c)=>n+c.vertices.length,0)===800){add('turret',turret,[7.21,1.323,.00476],[0,1,0]);if(!g.getObjectByName('muzzle')){const tip=turret.reduce((a,b)=>a.box.max.x>b.box.max.x?a:b).box,center=tip.getCenter(new T.Vector3()),m=new T.Object3D();m.name='muzzle';m.position.set(tip.max.x+.002,center.y,center.z);m.userData.motionJointRole='turret';m.userData.source='licensed-original-main-gun-tip';g.add(m);g.userData.muzzleFamily='navalGun';}}
  for(const side of [-1,1]){
   const props=groups.filter(c=>{const b=c.box,center=b.getCenter(new T.Vector3());return b.min.x> -10.50&&b.max.x< -10.15&&b.max.y<-.40&&Math.abs(center.z)<1&&Math.sign(center.z)===side;});
   if(props.length===6)add('propeller',props,[-10.30,-.8521,side<0?-.536:.5455],[1,0,0],{side,sign:side,rotationConvention:'game counter-rotation; exact shaft handedness not asserted'});
   const rudders=groups.filter(c=>{const b=c.box,center=b.getCenter(new T.Vector3());return b.min.x> -11.30&&b.max.x< -10.60&&b.max.y<0&&Math.abs(center.z)>.4&&Math.abs(center.z)<.8&&Math.sign(center.z)===side;});
   if(rudders.length===1)add('rudder',rudders,[-10.80,-.117,side<0?-.553:.6974],[0,1,0],{side,limit:.20});
  }
  root.WarGroundRig.skin(g,mesh,parts);
  g.userData.navalLicensedRig={asset:'burke.glb',preservesSourceUV:true,riggedIslands:parts.reduce((n,p)=>n+p.ranges.length,0),roles:parts.map(p=>p.role),changes:'Rigid vertex weights only; geometry, PBR textures, credits and source license retained.'};
 }
 function attach(g,kind,f='chn'){const u=root.WarData?.U?.[kind];if(!u?.naval||u.air||u.space||g.userData.navalMotionRigVersion===1||!root.WarGroundRig?.skin)return g;g.userData.motionRig??=[];g.userData.navalMotionRigVersion=1;
  const prop=g.getObjectByName('propeller');if(prop)descriptor(g,prop,'propeller',[1,0,0],{existing:true,sign:prop.userData.spinDirection||1});
  if(g.userData.assetPath?.includes('burke'))burke(g);else{const meshes=[];g.traverse(o=>{if(o.isMesh&&!o.userData.vehicleBones)meshes.push(o);});for(const mesh of meshes)procedural(g,mesh,kind,f);}
  const named=g.getObjectByName('turret')||g.getObjectByName('radar');g.userData.navalMotionRigCoverage={kind,faction:f,joints:g.userData.motionRig.length,roles:[...new Set(g.userData.motionRig.map(j=>j.role))],namedJointHandledByGroundRig:!!named,bodyOnly:!named&&!g.userData.motionRig.length,boundary:'Only existing exterior hardware; missing propellers and fixed electronic array faces remain unchanged. Joint locations are game approximations.'};return g;
 }
 root.WarNavalRig={attach,version:1};
})(globalThis);
