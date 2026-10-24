/* Original articulated personnel. Simulation coordinates drive stride and planted-foot IK. */
(function(root){
 'use strict';
 const T=root.THREE,M=root.WarModels,D=root.WarDetail,states=new WeakMap(),appearances=new Map();
 const roles={infantry:{members:1,weapon:'rifle'},antitank_team:{members:1,weapon:'launcher'},machinegun_team:{members:1,weapon:'machinegun'},mortar_team:{members:1,weapon:'mortar'},assault_team:{members:1,weapon:'rifle'},field_medic:{members:1,weapon:'medical'},sniper_team:{members:1,weapon:'sniper'},operator:{members:1,weapon:'rifle'}};
 const names=['torso','hipL','kneeL','ankleL','hipR','kneeR','ankleR','shoulderL','elbowL','wristL','shoulderR','elbowR','wristR'];
 const parents=[-1,0,1,2,0,4,5,0,7,8,0,10,11];
 const rest=[[0,0,0],[0,.88,-.135],[-.020,.48,-.135],[-.060,.135,-.135],[0,.88,.135],[.070,.48,.135],[.030,.135,.135],[0,1.385,-.235],[.13,1.115,-.25],[.53,1.275,.17],[0,1.385,.235],[.13,1.115,.25],[.31,1.275,.17]].map(v=>new T.Vector3(...v));
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),fract=x=>x-Math.floor(x);
 function skinGeometry(geo){const g=geo.clone(),count=g.attributes.position.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4),tags=g.attributes.rigPart;for(let i=0;i<count;i++){indices[i*4]=tags?tags.getX(i):0;weights[i*4]=1;}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));return g;}
 // The armed support hand reaches across the rifle. A medic has no rifle: give
 // its left forearm the mirrored right-arm bind length before lowering the IK.
 const medicalWrist=new T.Vector3(rest[12].x,rest[12].y,-rest[12].z);
 function medicalBody(geometry){const g=geometry.clone(),position=g.attributes.position,normal=g.attributes.normal,tags=g.attributes.rigPart,a=rest[9].clone().sub(rest[8]),b=medicalWrist.clone().sub(rest[8]),scale=b.length()/a.length(),axis=a.normalize(),rotation=new T.Quaternion().setFromUnitVectors(axis,b.normalize()),v=new T.Vector3(),n=new T.Vector3(),shift=medicalWrist.clone().sub(rest[9]);for(let i=0;i<position.count;i++){const tag=tags.getX(i);if(tag===8){v.fromBufferAttribute(position,i).sub(rest[8]);v.addScaledVector(axis,v.dot(axis)*(scale-1)).applyQuaternion(rotation).add(rest[8]);position.setXYZ(i,v.x,v.y,v.z);n.fromBufferAttribute(normal,i);n.addScaledVector(axis,n.dot(axis)*(1/scale-1)).applyQuaternion(rotation).normalize();normal.setXYZ(i,n.x,n.y,n.z);}else if(tag===9){v.fromBufferAttribute(position,i).add(shift);position.setXYZ(i,v.x,v.y,v.z);}}g.computeBoundingSphere();return g;}
 function appearance(f,medical=false){const key=f+(medical?':medical':'');if(!appearances.has(key)){const original=root.WarOperatorModel.build(f),body=original.getObjectByName('operatorBody'),rifle=original.getObjectByName('operatorRifle'),source=medical?medicalBody(body.geometry):body.geometry;appearances.set(key,{body:skinGeometry(source),rifle:skinGeometry(rifle.geometry),material:body.material,parts:body.userData.parts,rifleParts:rifle.userData.parts});if(medical)source.dispose();}return appearances.get(key);}
 function equipment(role,f,index){
  const b=new D.Builder(),c=root.WarOperatorModel.kits[f].armor,dark=0x202528,metal=0x58646a;
  const type=role.weapon;
  if(type==='rifle')return null;
  if(type==='launcher'){b.cyl(.09,.95,.28,1.35,.17,c,'x',.09,16);for(const x of [-.21,.77])b.cyl(.11,.05,x,1.35,.17,dark,'x',.11,16);b.box(.18,.09,.11,.24,1.47,.17,dark);b.box(.06,.12,.055,.31,1.25,.17,dark);b.box(.12,.04,.08,.53,1.275,.17,dark);for(const x of [.02,.57])b.cyl(.097,.035,x,1.35,.17,metal,'x',.097,16);b.cyl(.035,.14,.22,1.49,.17,dark,'x');b.cyl(.025,.008,.295,1.49,.17,0x325a70,'x');}
  if(type==='machinegun'||type==='sniper'){b.box(.40,.105,.09,.37,1.335,.17,dark);b.box(.22,.08,.08,.08,1.325,.17,c);b.cyl(.019,.70,.91,1.335,.17,metal,'x',.019,12);b.cyl(.035,.17,.41,1.445,.17,dark,'x',.035,12);b.cyl(.024,.012,.501,1.445,.17,0x325a70,'x');if(type==='machinegun')b.box(.15,.19,.16,.35,1.21,.24,c);else b.cyl(.04,.20,1.25,1.335,.17,dark,'x',.04,12);}
  if(type==='machinegun'||type==='sniper'){for(const z of [.11,.23])D.link(b,[.68,1.28,z],[1.09,1.23,z],.015,metal);b.box(.06,.12,.06,.31,1.26,.17,dark);b.box(.11,.04,.09,.53,1.275,.17,c);if(type==='machinegun')for(let i=0;i<6;i++)b.cyl(.012,.10,.37+i*.024,1.27,.29,metal,'z',.012,6);}
  if(type==='mortar'){
   // Original portable light mortar: one bearer retains the tube, folded support and baseplate.
   D.link(b,[.48,.98,.17],[.94,1.60,.17],.074,c,.074,16);D.link(b,[.91,1.56,.17],[.965,1.635,.17],.086,dark,.086,16);
   b.box(.07,.13,.06,.31,1.26,.17,dark);D.link(b,[.31,1.32,.17],[.67,1.24,.17],.02,metal);b.box(.14,.05,.10,.53,1.275,.17,dark);
   b.cyl(.20,.045,-.40,1.20,0,c,'x',.20,16);for(const z of [-.13,.13])D.link(b,[-.43,.94,z],[-.43,1.41,z],.018,metal);
   b.box(.10,.13,.08,.72,1.35,.28,dark);b.cyl(.022,.07,.76,1.36,.28,0x325a70,'x');
  }
  if(type==='medical'){b.box(.15,.29,.3,-.43,1.15,0,0x797463);b.box(.02,.15,.11,-.515,1.15,0,0x7db7a1);b.box(.02,.045,.23,-.517,1.15,0,0x7db7a1);b.box(.18,.14,.18,.08,.96,.30,c);}
  const mesh=b.finish();mesh.geometry=skinGeometry(mesh.geometry);mesh.name='personnelEquipment';return mesh;
 }
 function model(kind,f){const role=roles[kind],a=appearance(f,kind==='field_medic'),g=new T.Group();let triangles=0;
  for(let i=0;i<role.members;i++){
   const person=new T.Group();person.name='personnel_'+i;person.position.set(i===0?0:-.85,0,i===0?0:i===1?-.90:.90);person.userData.personnelIndex=i;
   const body=new T.Mesh(a.body,a.material);body.name='operatorBody';body.userData={preserveMaterial:true,parts:a.parts};person.add(body);
   const extra=equipment(role,f,i);if(extra)person.add(extra);else{const rifle=new T.Mesh(a.rifle,a.material);rifle.name='operatorRifle';rifle.userData.preserveMaterial=true;rifle.userData.parts=a.rifleParts;person.add(rifle);}
   person.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;triangles+=o.geometry.attributes.position.count/3;}});g.add(person);
  }
  const marker=new T.Object3D();marker.name=kind==='field_medic'?'servicePoint':'muzzle';marker.position.set(kind==='sniper_team'?1.36:kind==='machinegun_team'?1.27:kind==='antitank_team'?.805:kind==='mortar_team'?.98:1.065,kind==='mortar_team'?1.66:kind==='antitank_team'?1.35:1.335,.17);g.children[0].add(marker);
  const kit=root.WarOperatorModel.kits[f];let parts=0;g.traverse(o=>{if(o.isMesh)parts+=o.userData.parts||0;});g.userData={scale:5.6,parts,original:true,fiction:true,evidenceStatus:'reference-informed-articulated-personnel',modelFamily:kind,personnelFamily:'infantry',squadMembers:1,personnelRig:true,personnelKit:f,uniformPattern:kit.pattern,helmetProfile:kit.helmetProfile,referenceStatus:f==='imp'?'original-fiction':'reference-informed-game-kit',profile:`single-${kind}-${f}-v2`,gear:role.weapon,unarmed:kind==='field_medic',triangles,detailPass:3};return g;
 }
 function attach(model){
  const people=[];for(const person of model.children.filter(x=>x.name.startsWith('personnel_'))){
   // A released instance may be used again. Reuse its immutable mesh assets,
   // but remove the disposed skeleton before attaching independent new bones.
   const previous=person.getObjectByName('personnelRig');if(previous){for(const src of [...previous.children])if(src.isSkinnedMesh){const mesh=new T.Mesh(src.geometry,src.material);mesh.name=src.name;mesh.userData={...src.userData};person.add(mesh);}const marker=previous.getObjectByName('muzzle')||previous.getObjectByName('servicePoint');if(marker)person.add(marker);person.remove(previous);}
   const rig=new T.Group();rig.name='personnelRig';const bindRest=model.userData.unarmed?rest.map((v,i)=>i===9?medicalWrist:v):rest,bones=bindRest.map((v,i)=>{const bone=new T.Bone();bone.name=names[i];bone.position.copy(v).sub(parents[i]<0?new T.Vector3():bindRest[parents[i]]);return bone;});
   bones.forEach((bone,i)=>{if(parents[i]<0)rig.add(bone);else bones[parents[i]].add(bone);});
   const meshes=[];for(const src of [...person.children]){if(!src.isMesh)continue;const mesh=new T.SkinnedMesh(src.geometry,src.material);mesh.name=src.name;mesh.userData={...src.userData};mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
    // Three caches posed bounds after first use. Keep a conservative envelope for
    // direct-control raycasts without rescanning all skinned vertices every frame.
    mesh.boundingBox=new T.Box3().setFromBufferAttribute(src.geometry.attributes.position).expandByScalar(.60);mesh.boundingSphere=mesh.boundingBox.getBoundingSphere(new T.Sphere());
    rig.add(mesh);meshes.push(mesh);person.remove(src);}
   rig.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);for(const mesh of meshes)mesh.bind(skeleton);person.add(rig);
   const marker=person.children.find(x=>x.name==='muzzle'||x.name==='servicePoint');if(marker){person.remove(marker);bones[0].add(marker);}
   const feet=[0,1].map(side=>({phase:0,planted:false,world:new T.Vector3(),start:new T.Vector3(),target:rest[side?6:3].clone(),stance:false}));
   people.push({person,bones,skeleton,feet});
  }
  const scratch={delta:new T.Vector3(),bend:new T.Vector3(),thigh:new T.Vector3(),calf:new T.Vector3(),q1:new T.Quaternion(),q2:new T.Quaternion(),motion:new T.Vector3(),lead:new T.Vector3(),landing:new T.Vector3(),local:new T.Vector3(),hand:new T.Vector3()};
  const state={people,scratch,poseStable:false,poseAngle:null,x:null,y:null,time:null,phase:0,distance:0,moving:false,jumping:false,settle:1,teleports:0,scale:model.userData.scale||5.6};states.set(model,state);return state;
 }
 const chains=new Map([1,4,7,10].map(index=>{const u=rest[index+1].clone().sub(rest[index]),v=rest[index+2].clone().sub(rest[index+1]),L1=u.length(),L2=v.length();return[index,{u:u.normalize(),v:v.normalize(),L1,L2}];}));
 const medicalChain=(()=>{const u=rest[8].clone().sub(rest[7]),v=medicalWrist.clone().sub(rest[8]),L1=u.length(),L2=v.length();return{u:u.normalize(),v:v.normalize(),L1,L2};})();
 const legHint=new T.Vector3(1,0,0),armHints=[new T.Vector3(0,-1,-1),new T.Vector3(0,-1,1)];
 // Two-bone inverse kinematics in model space, preserving independent hip/knee/ankle chains.
 function solve(bones,index,target,hint,bob,scratch,chain=chains.get(index)){
  const {u,v,L1,L2}=chain,delta=scratch.delta.copy(target).sub(rest[index]);delta.y-=bob;
  const dist=clamp(delta.length(),.025,L1+L2-.0001),dir=delta.normalize();
  const bend=scratch.bend.copy(hint).addScaledVector(dir,-hint.dot(dir));if(bend.lengthSq()<.00001)bend.set(0,0,1);bend.normalize();
  const along=(dist*dist+L1*L1-L2*L2)/(2*dist),height=Math.sqrt(Math.max(0,L1*L1-along*along));
  const thigh=scratch.thigh.copy(dir).multiplyScalar(along).addScaledVector(bend,height),calf=scratch.calf.copy(dir).multiplyScalar(dist).sub(thigh);
  const q1=scratch.q1.setFromUnitVectors(u,thigh.normalize()),worldQ2=scratch.q2.setFromUnitVectors(v,calf.normalize());
  bones[index].quaternion.copy(q1);bones[index+1].quaternion.copy(q1).invert().multiply(worldQ2);bones[index+2].quaternion.copy(worldQ2).invert();
 }
 function toWorld(local,e,p,scale,out){const a=e.angle||0,c=Math.cos(a),s=Math.sin(a),x=(local.x+p.position.x)*scale,z=(local.z+p.position.z)*scale;return out.set(e.x+x*c-z*s,local.y*scale,e.y+x*s+z*c);}
 function toLocal(world,e,p,scale,out){const a=e.angle||0,c=Math.cos(a),s=Math.sin(a),x=(world.x-e.x)/scale,z=(world.z-e.y)/scale;return out.set(x*c+z*s-p.position.x,world.y/scale,-x*s+z*c-p.position.z);}
 function neutral(state,e){for(const p of state.people){for(const bone of p.bones)bone.quaternion.identity();p.bones[0].position.set(0,0,0);for(let side=0;side<2;side++){const foot=p.feet[side];foot.target.copy(rest[side?6:3]);toWorld(foot.target,e,p.person,state.scale,foot.world);foot.start.copy(foot.world);foot.planted=false;foot.stance=false;}p.skeleton.update();}state.moving=false;state.jumping=false;state.settle=1;state.poseStable=false;}
 function damageMarks(person,e,detail=true){
  const visible=detail&&!!e.components&&e.components.lastHitAt>=0&&e.hp<e.maxHp*.85;
  if(visible&&!person.damageMarks){const positions=[],colors=[];for(const [x,y,z,size,color]of [[.23,1.19,.18,.07,0x443a31],[.13,1.35,-.20,.055,0x55352f],[.08,.77,.17,.06,0x332f27]]){positions.push(x,y-size,z-size,x,y+size,z-size*.4,x,y+size*.4,z+size);const c=new T.Color(color);for(let n=0;n<3;n++)colors.push(c.r,c.g,c.b);}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));const material=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,opacity:.78,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});const mesh=new T.Mesh(geometry,material);mesh.name='personnel-damage-marks';mesh.userData.original=true;mesh.frustumCulled=false;person.bones[0].add(mesh);person.damageMarks=mesh;}
  if(person.damageMarks)person.damageMarks.visible=visible;
 }
 function fallen(state,e,detail=true){if(!['downed','dead'].includes(e.components?.state)&&!(e.hp<=0))return false;for(const p of state.people){for(const b of p.bones)b.quaternion.identity();p.bones[0].position.set(0,.17,0);p.bones[0].rotation.set(0,0,-1.48);p.bones[2].rotation.z=.24;p.bones[5].rotation.z=.43;p.bones[8].rotation.y=.36;p.bones[11].rotation.y=-.4;for(const f of p.feet){f.planted=false;f.stance=false;}damageMarks(p,e,detail);p.person.updateMatrixWorld(true);p.skeleton.update();}state.moving=false;state.jumping=false;state.poseStable=false;return true;}
 function actionFromEntity(e,time){if(e.operatorState?.action)return e.operatorState.action;const stations=Object.values(e.combat?.stations||{}),s=stations.find(x=>x.reloadRemaining>0)||stations.sort((a,b)=>(b.lastShotAt??-1e6)-(a.lastShotAt??-1e6))[0];return s?{phase:s.phase,event:s.reloadRemaining>0?'reload':'idle',progress:s.phaseUntil>s.phaseAt?clamp((time-s.phaseAt)/(s.phaseUntil-s.phaseAt),0,1):0,shotTime:s.lastShotAt??-1e6,category:roles[e.kind]?.weapon}:null;}
 function update(model,e,time,weaponAction=null){
  if(!model?.userData.personnelRig||!Number.isFinite(time))return null;
  const state=states.get(model)||attach(model);
  if(state.time===null){state.time=time;state.x=e.x;state.y=e.y;neutral(state,e);fallen(state,e,model.userData.personnelDamageDetail!==false);return state;}
  const dt=time-state.time;if(dt===0)return state;
  const dx=e.x-state.x,dz=e.y-state.y,distance=Math.hypot(dx,dz);
  state.time=time;state.x=e.x;state.y=e.y;
  // Discontinuities include load/teleport and long offscreen gaps, never a huge sprint.
  if(dt<0||dt>.30||distance>Math.max(35,dt*220)){state.teleports++;neutral(state,e);fallen(state,e,model.userData.personnelDamageDetail!==false);return state;}
  if(fallen(state,e,model.userData.personnelDamageDetail!==false))return state;
  const action=weaponAction||actionFromEntity(e,time),reload=action?.event==='reload'||['reload','setup','pack','stow'].includes(action?.phase),reloadPose=reload?Math.sin(Math.PI*clamp(action?.progress??.5,.1,.9)):0,shotAge=time-(action?.shotTime??-1e6),shotKick=shotAge>=0?Math.max(0,1-shotAge/.16):0;
  const injury=e.components?.personnel,limp=clamp(injury?.limp||0,0,1),hitAge=time-(e.components?.lastHitAt??-1e6),hitKick=hitAge>=0?Math.max(0,1-hitAge/.32):0,rescue=e.rescueAction&&time-e.rescueAction.time>=0&&time-e.rescueAction.time<.25,active=reload||shotKick>0||hitKick>0||rescue;
  const jump=(e.jumpHeight||0)>.025,wasJump=state.jumping,moving=distance>.00001&&!jump,speed=distance/dt;
  const cadence=clamp(1.5+speed/(state.scale*5),1.5,4.2),cycleLength=speed/cadence,duty=moving?clamp(.52*state.scale/cycleLength,.12,.60):.60;
  if(moving){state.distance+=distance;state.phase=fract(state.phase+distance/Math.max(.001,cycleLength));state.settle=0;}else state.settle=Math.min(1,state.settle+dt/.22);
  if(wasJump!==jump)for(const p of state.people)for(const foot of p.feet)foot.planted=false;
  state.moving=moving;state.jumping=jump;
  const a=e.angle||0,scratch=state.scratch;
  // Cache only a pose actually solved for this role; medics have a distinct
  // lowered-arm rest pose. Keep simulation bookkeeping above this fast path.
  if(state.poseStable&&!active&&!moving&&!jump&&state.settle>=1&&a===state.poseAngle&&state.poseHP===e.hp&&state.poseDetail===(model.userData.personnelDamageDetail!==false))return state;
  const localMotion=scratch.motion.set(dx*Math.cos(a)+dz*Math.sin(a),0,-dx*Math.sin(a)+dz*Math.cos(a));if(localMotion.lengthSq())localMotion.normalize();else localMotion.set(1,0,0);
  for(const person of state.people){const bones=person.bones,memberPhase=fract(state.phase+person.person.userData.personnelIndex*.12),medical=model.userData.unarmed;
   bones[0].quaternion.identity();const bob=rescue?-.43:jump?0:moving?-.065+.010*Math.cos(memberPhase*Math.PI*4)-limp*.025*Math.max(0,Math.sin(memberPhase*Math.PI*2)):bones[0].position.y*(1-state.settle);bones[0].position.set(-shotKick*(action?.category==='sniper'?.045:.025)-hitKick*.035,bob,0);
   for(let side=0;side<2;side++){
    const foot=person.feet[side],ankle=rest[side?6:3],phase=fract(memberPhase+side*.5),stance=moving&&phase<duty;
    if(jump){foot.target.set(ankle.x-.11,.26,ankle.z);foot.planted=false;foot.stance=false;}
    else if(moving){
     const lead=scratch.lead.set(0,.135,ankle.z).addScaledVector(localMotion,.26),landing=toWorld(lead,e,person.person,state.scale,scratch.landing);
     if(stance){if(!foot.planted||!foot.stance){foot.world.copy(landing);foot.planted=true;}foot.target.copy(toLocal(foot.world,e,person.person,state.scale,scratch.local));foot.start.copy(foot.world);}
     else{if(!foot.planted){toWorld(ankle,e,person.person,state.scale,foot.start);foot.planted=true;}const swing=(phase-duty)/(1-duty),blend=swing*swing*(3-2*swing);foot.world.copy(foot.start).lerp(landing,blend);foot.target.copy(toLocal(foot.world,e,person.person,state.scale,scratch.local));foot.target.y=.135+Math.sin(swing*Math.PI)*(speed>25?.23:.14)*(side?1:1-limp*.65);}
     foot.stance=stance;
    }else{foot.target.lerp(ankle,Math.min(1,dt*16));if(state.settle>=1)foot.target.copy(ankle);foot.planted=false;foot.stance=false;}
    foot.phase=phase;solve(bones,side?4:1,foot.target,legHint,bob,scratch);
   }
   for(let side=0;side<2;side++){
    const index=side?10:7,hand=scratch.hand.copy(rest[index+2]),swing=moving?Math.sin((memberPhase+side*.5)*Math.PI*2):0;
    if(medical){hand.set(.08+swing*.12,.97,side?.28:-.28);}else{hand.x+=swing*.007;hand.y+=Math.abs(swing)*.008;}
    if(reload&&!medical){hand.x-=reloadPose*(side?.03:.22);hand.y-=reloadPose*(side?.03:.24);hand.z+=reloadPose*(side?0:-.08);}
    if(rescue&&medical)hand.set(.40+Math.sin(time*6+side)*.015,.64,side?.16:-.11);
    hand.x-=shotKick*.025+hitKick*.025;
    if(jump)hand.y+=.025;solve(bones,index,hand,armHints[side],bob,scratch,medical&&side===0?medicalChain:chains.get(index));
   }
   if(!active&&!moving&&!jump&&state.settle>=1&&!medical){for(const bone of bones)bone.quaternion.identity();bones[0].position.set(0,0,0);}
   damageMarks(person,e,model.userData.personnelDamageDetail!==false);
   person.person.updateMatrixWorld(true);person.skeleton.update();
  }
  state.poseStable=!active&&!moving&&!jump&&state.settle>=1;state.poseAngle=a;state.poseHP=e.hp;state.poseDetail=model.userData.personnelDamageDetail!==false;return state;
 }
 for(const kind of Object.keys(roles))for(const f of Object.keys(M.colors))M.register(kind,f,()=>model(kind,f));
 function release(model){const state=states.get(model);if(!state)return false;for(const p of state.people){if(p.damageMarks){p.damageMarks.geometry.dispose();p.damageMarks.material.dispose();p.damageMarks.removeFromParent();p.damageMarks=null;}p.skeleton.dispose();}states.delete(model);return true;}
 root.WarPersonnelAnimation={update,release,state:model=>states.get(model),roles:Object.keys(roles),version:1};
})(globalThis);
