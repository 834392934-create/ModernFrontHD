/* Simulation-clock articulation. Geometry and materials remain immutable/shared;
 * skeletons and pose state belong exclusively to one rendered instance. */
(function(root){
 'use strict';const T=root.THREE,states=new WeakMap(),eventIndexes=new WeakMap(),plumes=new Map(),plumeMaterial=new T.MeshBasicMaterial({color:0xa1d6e6,transparent:true,opacity:.36,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function shotsFor(game,id){let index=eventIndexes.get(game);if(!index||index.time!==game.time||index.count!==(game.effects||[]).length){index={time:game.time,count:(game.effects||[]).length,byId:new Map()};for(const fx of game.effects||[])if(['shot','interceptor','discharge'].includes(fx.type)){if(!index.byId.has(fx.sourceId))index.byId.set(fx.sourceId,[]);index.byId.get(fx.sourceId).push(fx);}eventIndexes.set(game,index);}return index.byId.get(id)||[];}
 function attach(model){const meshes=[];model.traverse(o=>{if(o.isMesh&&o.userData.vehicleBones&&!o.isSkinnedMesh)meshes.push(o);});const skeletons=[];
  for(const src of meshes){const mesh=new T.SkinnedMesh(src.geometry,src.material);mesh.name=src.name;mesh.userData={...src.userData};mesh.position.copy(src.position);mesh.quaternion.copy(src.quaternion);mesh.scale.copy(src.scale);mesh.castShadow=src.castShadow;mesh.receiveShadow=src.receiveShadow;mesh.frustumCulled=false;
   const bones=src.userData.vehicleBones.map(d=>{const b=new T.Bone();b.name=d.node;b.position.set(...d.pivot);return b;});for(let i=0;i<bones.length;i++){const parent=src.userData.vehicleBones[i].parent;((parent&&bones.find(b=>b.name===parent))||mesh).add(bones[i]);}for(const child of [...src.children])mesh.add(child);src.parent.add(mesh);src.parent.remove(src);model.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);mesh.bind(skeleton);skeletons.push(skeleton);
   mesh.boundingBox=new T.Box3().setFromBufferAttribute(src.geometry.attributes.position).expandByScalar(.35);mesh.boundingSphere=mesh.boundingBox.getBoundingSphere(new T.Sphere());
  }
  const joints=(model.userData.motionRig||[]).map(d=>({d,node:model.getObjectByName(d.node),phase:0})).filter(j=>j.node),paths={};for(const [key,points]of Object.entries(model.userData.trackPaths||{})){let length=0;const segments=points.map((a,i)=>{const b=points[(i+1)%points.length],size=Math.hypot(b[0]-a[0],b[1]-a[1]),s={a,b,start:length,size};length+=size;return s;});paths[key]={segments,length};}
  const muzzle=model.getObjectByName('muzzle'),barrel=joints.find(j=>j.d.role==='recoil'&&j.d.batch)||joints.find(j=>j.d.batch&&j.d.role===muzzle?.userData.motionJointRole);if(muzzle&&barrel){model.updateMatrixWorld(true);barrel.node.attach(muzzle);}
  for(const {d,node}of joints)if(d.muzzleName&&d.muzzlePoint&&!model.getObjectByName(d.muzzleName)){const a=new T.Object3D();a.name=d.muzzleName;a.position.fromArray(d.muzzlePoint);a.userData={source:'existing-secondary-autocannon-barrel-tip',approximate:false,boundary:'Existing model barrel, not a certified real mount dimension.'};model.getObjectByName(d.batch).add(a);model.updateMatrixWorld(true);node.attach(a);}
  // Exhaust is render-only. Templates and baked navigation envelopes contain
  // the physical vehicle, never the length of a flame or smoke effect.
  for(const {d,node}of joints)if(d.effect&&d.plumeRadius&&!node.children.length){const key=d.plumeRadius+':'+d.plumeLength;let geo=plumes.get(key);if(!geo){geo=new T.ConeGeometry(d.plumeRadius*.72,d.plumeLength,8,1,true);geo.rotateZ(Math.PI/2);geo.translate(-d.plumeLength/2,0,0);plumes.set(key,geo);}const mesh=new T.Mesh(geo,plumeMaterial);mesh.userData.motionEffect=true;mesh.raycast=()=>{};node.add(mesh);}
  const state={joints,skeletons,paths,time:null,x:0,y:0,angle:0,distance:0,seen:new WeakSet(),serials:new Map(),shots:[],q:new T.Quaternion(),axis:new T.Vector3()};states.set(model,state);return state;
 }
 function update(model,e,game){const s=states.get(model)||attach(model),time=Number(game?.time)||0,m=e.motion||{},scale=model.userData.scale||1,dt=s.time===null?0:time-s.time;
  if(s.time===time)return s;const fresh=s.time===null||dt<0||dt>.5,dx=e.x-s.x,dy=e.y-s.y,travel=Math.hypot(dx,dy),signed=travel*((dx*Math.cos(e.angle)+dy*Math.sin(e.angle))<0?-1:1),distance=Number.isFinite(m.distance)?m.distance:0,delta=fresh?0:(Number.isFinite(m.distance)?distance-s.distance:signed)/scale,turn=fresh?0:wrap((e.angle||0)-s.angle);
  for(const fx of shotsFor(game,e.id))if(!s.seen.has(fx)){s.seen.add(fx);if(fx.projectileId!=null&&s.shots.some(v=>v.projectileId===fx.projectileId))continue;s.shots.push({projectileId:fx.projectileId,at:Number.isFinite(fx.firedAt)?fx.firedAt:time-Math.max(0,fx.max-fx.ttl),mountId:fx.mountId||'main',profile:root.WarWeaponEffects?.profile(fx)});}s.shots=s.shots.filter(x=>time-x.at<1.2);
  const recoilFor=d=>{let recoil=0;for(const shot of s.shots){const a=time-shot.at,p=shot.profile;if((shot.mountId!==(d.mountId||'main'))||(d.families&&!d.families.includes(p?.name)))continue;if(a>=0&&a<.6)recoil=Math.max(recoil,(p?.recoil??.7)*Math.min(1,a/.035)*Math.exp(-Math.max(0,a-.035)*8));}return recoil;};
  const speed=Math.abs(m.signedSpeed||e.flightSpeed||0),max=root.WarData?.U?.[e.kind]?.speed||100,throttle=clamp(m.throttle||0,0,1),roll=clamp((e.roll||0)/.42,-1,1),pitch=clamp((e.pitch||0)/.6,-1,1),yaw=clamp((m.turnRate||0),-1,1);
  for(const j of s.joints){const {d,node}=j;let a=0;node.position.fromArray(d.pivot);node.quaternion.fromArray(d.rest);node.scale.fromArray(d.restScale||[1,1,1]);
   switch(d.role){
    case 'wheel':if(!fresh)j.phase-=(delta-turn*(d.positionZ||0))/Math.max(.1,d.radius);a=j.phase;if(d.steering)node.quaternion.multiply(s.q.setFromAxisAngle(s.axis.set(0,1,0),-(m.steer||0)*.43));break;
    case 'track':{const path=s.paths[d.path];if(!path)break;if(!fresh)j.phase-=delta-turn*(d.positionZ||0);const offset=((d.pathOffset+j.phase)%path.length+path.length)%path.length,seg=path.segments.find(x=>offset<x.start+x.size-1e-9)||path.segments.at(-1),t=clamp((offset-seg.start)/seg.size,0,1);node.position.set(seg.a[0]+(seg.b[0]-seg.a[0])*t,seg.a[1]+(seg.b[1]-seg.a[1])*t,d.pivot[2]);a=Math.atan2(seg.b[1]-seg.a[1],seg.b[0]-seg.a[0])-d.pathAngle;break;}
    case 'turret':{const mount=e.combat?.mounts?.[d.mountId||'main'],parent=e.combat?.mounts?.[d.parentMountId];a=d.search&&!mount?.targetId&&!mount?.targetProjectileId?time*.4:Number.isFinite(mount?.yaw)?(d.parentMountId?(parent?.yaw??e.turret??e.angle??0):(e.structure?0:e.angle||0))-mount.yaw:Number.isFinite(e.turret)?(e.structure?0:e.angle||0)-e.turret:0;break;}
    case 'barrelSpin':{const hot=Object.values(e.combat?.stations||{}).some(st=>time-st.lastShotAt<.25&&st.lastShotAt>=0);if(!fresh&&hot)j.phase+=dt*45;a=j.phase;break;}
    case 'weaponPitch':a=e.combat?.mounts?.[d.mountId||'main']?.pitch||0;break;
    case 'recoil':node.position.addScaledVector(s.axis.fromArray(d.axis||[1,0,0]),-(d.distance||.28)*recoilFor(d));continue;
    case 'payload':{const weapons=root.WarVehicleWeapons?.list(e.kind,model.userData.faction)||[],w=weapons.find(w=>w.family===d.weaponFamily&&w.payloadSlots>0),station=w&&e.combat?.stations?.[w.id],n=d.slotCount||1;node.visible=true;if(station){const capacity=w.mechanics.magazine,spent=capacity-station.ammo,first=((station.nextPort??station.shotSerial??0)-spent+capacity)%capacity,index=(d.slotIndex-Math.floor(first*n/capacity)+n)%n;node.visible=index>=Math.floor(spent*n/capacity);}continue;}
    case 'weaponDoor':{const ids=d.weaponFamily?(root.WarVehicleWeapons?.list(e.kind,model.userData.faction)||[]).filter(w=>w.family===d.weaponFamily).map(w=>w.id):Object.keys(e.combat?.stations||{}),stations=ids.map(id=>e.combat?.stations?.[id]).filter(Boolean),active=stations.some(st=>st.phase==='reload'||!d.weaponFamily&&(st.phase==='setup'||time-st.lastShotAt<.65));a=active?(d.limit||.65):0;break;}
    case 'rotor':a=time*(d.speed||27);break;
    case 'propeller':if(!fresh)j.phase+=dt*(root.WarData?.U?.[e.kind]?.air?27:clamp(m.signedSpeed||0,-120,120)*.5);a=j.phase;break;
    case 'radar':{const track=Object.values(e.combat?.mounts||{}).find(v=>v.targetProjectileId!=null);a=track&&Number.isFinite(track.yaw)?(e.angle||0)-track.yaw:time*(d.speed||.45);break;}
    case 'flap':a=(d.limit||.3)*clamp(1-speed/Math.max(1,max*.7),0,1);break;
    case 'aileron':a=(d.limit||.23)*clamp(roll+(d.mixPitch||0)*pitch,-1,1);break;
    case 'elevator':a=(d.limit||.23)*pitch;break;
    case 'rudder':a=(d.limit||.2)*yaw;break;
    case 'solarArray':a=(d.limit||.2)*(-pitch);break;
    case 'thruster':{const force=clamp(throttle+(d.yawContribution||0)*yaw+(d.pitchContribution||0)*pitch,0,1),power=d.space?force:(d.idle||.06)+force*.8;node.visible=power>.015;node.scale.x=(d.restScale?.[0]||1)*(.25+power*1.6);node.scale.y=node.scale.z=.55+power*.45;continue;}
   }
   node.quaternion.multiply(s.q.setFromAxisAngle(s.axis.fromArray(d.axis||[0,1,0]),a*(d.sign??1)));
   if(d.wholeMountPitch)node.quaternion.multiply(s.q.setFromAxisAngle(s.axis.set(0,0,1),e.combat?.mounts?.[d.mountId]?.pitch||0));
  }
  s.time=time;s.x=e.x;s.y=e.y;s.angle=e.angle||0;s.distance=distance;return s;
 }
 function release(model){const s=states.get(model);if(s)for(const sk of s.skeletons)sk.dispose();states.delete(model);}
 // Simulation may request a port between rendered frames. Synchronize the
 // authoritative mount angles without integrating wheels/rotors or shot queues.
 function syncWeaponPose(model,e){const s=states.get(model)||attach(model);for(const {d,node}of s.joints){if(!['turret','weaponPitch'].includes(d.role))continue;const m=e.combat?.mounts?.[d.mountId||'main'];if(!m)continue;let a=m.pitch||0;if(d.role==='turret'){const parent=e.combat?.mounts?.[d.parentMountId];a=(d.parentMountId?(parent?.yaw??e.turret??e.angle??0):(e.structure?0:e.angle||0))-(m.yaw||0);}node.quaternion.fromArray(d.rest).multiply(s.q.setFromAxisAngle(s.axis.fromArray(d.axis||[0,1,0]),a*(d.sign??1)));if(d.wholeMountPitch)node.quaternion.multiply(s.q.setFromAxisAngle(s.axis.set(0,0,1),m.pitch||0));}return s;}
 root.WarVehicleAnimation={update,attach,release,syncWeaponPose,state:model=>states.get(model)};
})(globalThis);
