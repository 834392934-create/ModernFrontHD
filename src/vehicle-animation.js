/* Simulation-clock articulation. Geometry and materials remain immutable/shared;
 * skeletons and pose state belong exclusively to one rendered instance. */
(function(root){
 'use strict';const T=root.THREE,states=new WeakMap(),plumes=new Map(),plumeMaterial=new T.MeshBasicMaterial({color:0xa1d6e6,transparent:true,opacity:.36,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function attach(model){const meshes=[];model.traverse(o=>{if(o.isMesh&&o.userData.vehicleBones&&!o.isSkinnedMesh)meshes.push(o);});const skeletons=[];
  for(const src of meshes){const mesh=new T.SkinnedMesh(src.geometry,src.material);mesh.name=src.name;mesh.userData={...src.userData};mesh.position.copy(src.position);mesh.quaternion.copy(src.quaternion);mesh.scale.copy(src.scale);mesh.castShadow=src.castShadow;mesh.receiveShadow=src.receiveShadow;mesh.frustumCulled=false;
   const bones=src.userData.vehicleBones.map(d=>{const b=new T.Bone();b.name=d.node;b.position.set(...d.pivot);mesh.add(b);return b;});for(const child of [...src.children])mesh.add(child);src.parent.add(mesh);src.parent.remove(src);model.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);mesh.bind(skeleton);skeletons.push(skeleton);
   mesh.boundingBox=new T.Box3().setFromBufferAttribute(src.geometry.attributes.position).expandByScalar(.35);mesh.boundingSphere=mesh.boundingBox.getBoundingSphere(new T.Sphere());
  }
  const joints=(model.userData.motionRig||[]).map(d=>({d,node:model.getObjectByName(d.node),phase:0})).filter(j=>j.node),paths={};for(const [key,points]of Object.entries(model.userData.trackPaths||{})){let length=0;const segments=points.map((a,i)=>{const b=points[(i+1)%points.length],size=Math.hypot(b[0]-a[0],b[1]-a[1]),s={a,b,start:length,size};length+=size;return s;});paths[key]={segments,length};}
  const muzzle=model.getObjectByName('muzzle'),barrel=joints.find(j=>j.d.role==='recoil'&&j.d.batch);if(muzzle&&barrel){model.updateMatrixWorld(true);barrel.node.attach(muzzle);}
  // Exhaust is render-only. Templates and baked navigation envelopes contain
  // the physical vehicle, never the length of a flame or smoke effect.
  for(const {d,node}of joints)if(d.effect&&d.plumeRadius&&!node.children.length){const key=d.plumeRadius+':'+d.plumeLength;let geo=plumes.get(key);if(!geo){geo=new T.ConeGeometry(d.plumeRadius*.72,d.plumeLength,8,1,true);geo.rotateZ(Math.PI/2);geo.translate(-d.plumeLength/2,0,0);plumes.set(key,geo);}const mesh=new T.Mesh(geo,plumeMaterial);mesh.userData.motionEffect=true;mesh.raycast=()=>{};node.add(mesh);}
  const state={joints,skeletons,paths,time:null,x:0,y:0,angle:0,distance:0,seen:new WeakSet(),shots:[],q:new T.Quaternion(),axis:new T.Vector3()};states.set(model,state);return state;
 }
 function update(model,e,game){const s=states.get(model)||attach(model),time=Number(game?.time)||0,m=e.motion||{},scale=model.userData.scale||1,dt=s.time===null?0:time-s.time;
  if(s.time===time)return s;const fresh=s.time===null||dt<0||dt>.5,dx=e.x-s.x,dy=e.y-s.y,travel=Math.hypot(dx,dy),signed=travel*((dx*Math.cos(e.angle)+dy*Math.sin(e.angle))<0?-1:1),distance=Number.isFinite(m.distance)?m.distance:0,delta=fresh?0:(Number.isFinite(m.distance)?distance-s.distance:signed)/scale,turn=fresh?0:wrap((e.angle||0)-s.angle);
  for(const fx of game?.effects||[])if(fx.type==='shot'&&fx.sourceId===e.id&&!s.seen.has(fx)){s.seen.add(fx);s.shots.push({at:Number.isFinite(fx.firedAt)?fx.firedAt:time-Math.max(0,fx.max-fx.ttl),profile:root.WarWeaponEffects?.profile(fx)});}s.shots=s.shots.filter(x=>time-x.at<1.2);
  let recoil=0;for(const shot of s.shots){const a=time-shot.at,p=shot.profile;if(a>=0&&a<.6)recoil=Math.max(recoil,(p?.recoil??.7)*Math.min(1,a/.035)*Math.exp(-Math.max(0,a-.035)*8));}
  const speed=Math.abs(m.signedSpeed||e.flightSpeed||0),max=root.WarData?.U?.[e.kind]?.speed||100,throttle=clamp(m.throttle||0,0,1),roll=clamp((e.roll||0)/.42,-1,1),pitch=clamp((e.pitch||0)/.6,-1,1),yaw=clamp((m.turnRate||0),-1,1);
  for(const j of s.joints){const {d,node}=j;let a=0;node.position.fromArray(d.pivot);node.quaternion.fromArray(d.rest);node.scale.fromArray(d.restScale||[1,1,1]);
   switch(d.role){
    case 'wheel':if(!fresh)j.phase-=(delta-turn*(d.positionZ||0))/Math.max(.1,d.radius);a=j.phase;if(d.steering)node.quaternion.multiply(s.q.setFromAxisAngle(s.axis.set(0,1,0),-(m.steer||0)*.43));break;
    case 'track':{const path=s.paths[d.path];if(!path)break;if(!fresh)j.phase-=delta-turn*(d.positionZ||0);const offset=((d.pathOffset+j.phase)%path.length+path.length)%path.length,seg=path.segments.find(x=>offset<x.start+x.size-1e-9)||path.segments.at(-1),t=clamp((offset-seg.start)/seg.size,0,1);node.position.set(seg.a[0]+(seg.b[0]-seg.a[0])*t,seg.a[1]+(seg.b[1]-seg.a[1])*t,d.pivot[2]);a=Math.atan2(seg.b[1]-seg.a[1],seg.b[0]-seg.a[0])-d.pathAngle;break;}
    case 'turret':a=Number.isFinite(e.turret)?(e.structure?0:e.angle||0)-e.turret:0;break;
    case 'recoil':node.position.addScaledVector(s.axis.fromArray(d.axis||[1,0,0]),-(d.distance||.28)*recoil);continue;
    case 'rotor':a=time*(d.speed||27);break;
    case 'propeller':if(!fresh)j.phase+=dt*(root.WarData?.U?.[e.kind]?.air?27:clamp(m.signedSpeed||0,-120,120)*.5);a=j.phase;break;
    case 'radar':a=time*(d.speed||.45);break;
    case 'flap':a=(d.limit||.3)*clamp(1-speed/Math.max(1,max*.7),0,1);break;
    case 'aileron':a=(d.limit||.23)*clamp(roll+(d.mixPitch||0)*pitch,-1,1);break;
    case 'elevator':a=(d.limit||.23)*pitch;break;
    case 'rudder':a=(d.limit||.2)*yaw;break;
    case 'solarArray':a=(d.limit||.2)*(-pitch);break;
    case 'thruster':{const force=clamp(throttle+(d.yawContribution||0)*yaw+(d.pitchContribution||0)*pitch,0,1),power=d.space?force:(d.idle||.06)+force*.8;node.visible=power>.015;node.scale.x=(d.restScale?.[0]||1)*(.25+power*1.6);node.scale.y=node.scale.z=.55+power*.45;continue;}
   }
   node.quaternion.multiply(s.q.setFromAxisAngle(s.axis.fromArray(d.axis||[0,1,0]),a*(d.sign??1)));
  }
  s.time=time;s.x=e.x;s.y=e.y;s.angle=e.angle||0;s.distance=distance;return s;
 }
 function release(model){const s=states.get(model);if(s)for(const sk of s.skeletons)sk.dispose();states.delete(model);}
 root.WarVehicleAnimation={update,attach,release,state:model=>states.get(model)};
})(globalThis);
