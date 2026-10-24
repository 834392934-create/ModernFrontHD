/* Shared simulation/renderer trajectories, point defense and torpedo counterplay.
 * Speeds, seekers and gravity below are deterministic game parameters. */
(function(root){
 'use strict';
 const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
 const data=e=>root.WarData?.U[e?.kind]||root.WarData?.B[e?.kind]||{},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.height||0)-(b.height||0));
 function position(fx){
  if(fx.projectile?.position)return {...fx.projectile.position};
  const t=fx.max>0?clamp(1-fx.ttl/fx.max,0,1):1;return{x:fx.x+(fx.tx-fx.x)*t,y:fx.y+(fx.ty-fx.y)*t,height:(fx.sourceHeight||0)+((fx.targetHeight||0)-(fx.sourceHeight||0))*t};
 }
 function id(g,fx){if(!Number.isInteger(fx.projectileId))fx.projectileId=g.nextId++;return fx.projectileId;}
 function bombSolution(e,start,targetHeight){
  const speed=Math.max(0,e.flightSpeed||0),pitch=e.pitch||0,velocity={x:finite(e.motion?.vx)&&Math.abs(e.motion.vx)>0?e.motion.vx:Math.cos(e.angle||0)*speed*Math.cos(pitch),y:finite(e.motion?.vy)&&Math.abs(e.motion.vy)>0?e.motion.vy:Math.sin(e.angle||0)*speed*Math.cos(pitch),height:Math.sin(pitch)*speed},gravity=70,impactHeight=targetHeight<start.height?targetHeight:0,fall=Math.max(.1,(velocity.height+Math.sqrt(velocity.height**2+2*gravity*Math.max(0,start.height-impactHeight)))/gravity);
  return{velocity,gravity,impactHeight,fall,point:{x:start.x+velocity.x*fall,y:start.y+velocity.y*fall,height:impactHeight}};
 }
 function decorateLaunch(g,e,w,shot){
  if(!shot||shot.type!=='shot')return shot;id(g,shot);const p=root.WarCombatReadiness?.profile(g,e,w),family=p?.family||shot.weaponFamily||shot.weaponFx;
  const start={x:shot.x,y:shot.y,height:shot.sourceHeight||0},target={x:shot.tx,y:shot.ty,height:shot.targetHeight||0};
  if(!(shot.baseDamage>0)&&p?.damage>0)shot.baseDamage=p.damage;
  if(!shot.operatorTargets&&!shot.weaponDomains&&p?.targetDomains)shot.weaponDomains=p.targetDomains.slice();
  if(['howitzer','mortar','grenade'].includes(family)){
   const duration=Math.min(10,Math.max(shot.max||0,1+dist(start,target)/260)),gravity=70,velocity={x:(target.x-start.x)/duration,y:(target.y-start.y)/duration,height:(target.height-start.height+.5*gravity*duration*duration)/duration};
   shot.projectile={kind:'arc',position:start,previous:{...start},origin:{...start},destination:{...target},velocity,gravity,duration,age:0,maxAge:duration};shot.ttl=shot.max=duration;
   shot.directHitArea??={x:target.x,y:target.y,altitude:target.height,r:Math.max(8,shot.splash||8),verticalRadius:20};
  }else if(family==='bomb'){
   const {velocity,gravity,impactHeight,fall,point}=bombSolution(e,start,target.height);
   shot.projectile={kind:'bomb',position:start,previous:{...start},velocity:{...velocity},gravity,age:0,maxAge:Math.min(25,fall+1),impactHeight,releaseVelocity:{...velocity}};
   shot.tx=point.x;shot.ty=point.y;shot.targetHeight=impactHeight;shot.ttl=shot.max=fall;
   // Ballistic releases cannot guarantee an original target hit after it moves.
   shot.directHitArea={x:shot.tx,y:shot.ty,altitude:target.height,r:Math.max(8,shot.splash||8),verticalRadius:20};
  }else if(family==='torpedo'||shot.weaponFx==='torpedo'){
   const heading=Math.atan2(target.y-start.y,target.x-start.x),speed=180;
   shot.projectile={kind:'torpedo',position:start,previous:{...start},velocity:{x:Math.cos(heading)*speed,y:Math.sin(heading)*speed,height:0},heading,speed,turnRate:.8,age:0,maxAge:Math.min(35,Math.max(4,shot.max*2+2,Math.abs(target.height-start.height)/22+dist(start,target)/speed+2)),lockId:shot.target??null,decoyId:null,lostFor:0,searchRemaining:3,state:'tracking',impactHeight:target.height};
   shot.ttl=shot.max=shot.projectile.maxAge;delete shot.directHitArea;
  }else if(family==='missile'&&shot.target!=null&&!shot.directHitArea&&!Number.isInteger(shot.salvoIndex)){
   const air=!!data(e).air&&!data(e).space,vertical=!data(e).space&&p?.mount?.mode==='vertical',heading=air?e.angle||0:Math.atan2(target.y-start.y,target.x-start.x),pitch=vertical?Math.PI/2:air?e.pitch||0:Math.atan2(target.height-start.height,Math.max(.01,Math.hypot(target.x-start.x,target.y-start.y))),flightSpeed=e.flightSpeed||0,spaceProjection=!!data(e).space!==!!data(g.get(shot.target)).space;
   const lifetime=spaceProjection?clamp((shot.max||.5)+3,4,10):clamp(dist(start,target)/260+4,4,35),cruiseSpeed=spaceProjection?clamp(dist(start,target)/Math.max(.35,shot.max||.5),380,40000):380;
   shot.projectile={kind:'guided',position:start,previous:{...start},age:0,maxAge:lifetime,phase:air?'separation':vertical?'vertical':'ignition',phaseAge:0,heading,pitch,speed:air?flightSpeed:vertical?90:40,cruiseSpeed,spaceProjection,turnRate:1.8,pitchRate:1.5,lockId:shot.target,destination:{...target},releaseVelocity:{x:Math.cos(e.angle||0)*Math.cos(e.pitch||0)*flightSpeed,y:Math.sin(e.angle||0)*Math.cos(e.pitch||0)*flightSpeed,height:Math.sin(e.pitch||0)*flightSpeed},basis:'gameplay-guided-launch'};
   shot.ttl=shot.max=lifetime;delete shot.directHitArea;
  }else if(!['beam','airWing'].includes(family)){
   const duration=Math.max(.02,shot.max||dist(start,target)/700);
   shot.projectile={kind:'kinetic',position:start,previous:{...start},origin:{...start},destination:{...target},duration,age:0,maxAge:duration,phase:['missile','rocket'].includes(family)?'powered':'flight',velocity:{x:(target.x-start.x)/duration,y:(target.y-start.y)/duration,height:(target.height-start.height)/duration}};
  }
  return shot;
 }
 function swept(a,b,c,r){const dx=b.x-a.x,dy=b.y-a.y,dz=b.height-a.height,length=dx*dx+dy*dy+dz*dz,t=length?clamp(((c.x-a.x)*dx+(c.y-a.y)*dy+(c.height-a.height)*dz)/length,0,1):0;return Math.hypot(a.x+dx*t-c.x,a.y+dy*t-c.y,a.height+dz*t-c.height)<=r;}
 function expire(fx){fx.ttl=0;fx.target=null;fx.damage=0;fx.baseDamage=0;fx.splash=0;fx.treeDamage=0;fx.treeSplash=0;fx.type='spent-projectile';return {handled:true,expired:true,impact:false};}
 function impact(fx,target){const p=fx.projectile.position;fx.tx=p.x;fx.ty=p.y;fx.targetHeight=p.height;fx.target=target?.id??null;fx.ttl=0;return {handled:true,expired:false,impact:true};}
 function canImpact(g,fx,e){
  if(!e||e.hp<=0||e.id===fx.excludedTargetId||!g.isEnemy(fx.from,e.team)||!g.canDetect(fx.from,e))return false;
  const domain=g.targetDomain(e.kind),isPerson=(data(e).modelKind||e.kind)==='infantry';
  if(fx.operatorTargets)return fx.operatorTargets.includes(g.operatorDomain(e));
  if(fx.weaponDomains)return fx.weaponDomains.includes(domain)&&(!fx.weaponPersonnelOnly||isPerson);
  return !fx.sourceKind||g.canTargetKind(fx.sourceKind,e.kind);
 }
 // Contact is required for steering, not for physical collision. An already
 // airborne round can hit an unseen enemy; losing radar must not erase matter.
 function canTrack(g,fx,e){
  if(!canImpact(g,fx,e))return false;
  if(g.entityVisible)return g.entityVisible(fx.from,e);
  if(data(e).underwater)return true; // canImpact retains the existing sonar gate.
  return fx.from===0?g.visibleAt(e.x,e.y):g.unitsInSight(e,g.teamEntities(fx.from));
 }
 function local(g,e,p){const dx=p.x-e.x,dz=p.y-e.y,dy=p.height-g.entityAltitude(e),a=e.structure&&!data(e).rotatable?0:e.angle||0,c=Math.cos(a),s=Math.sin(a),cp=Math.cos(e.pitch||0),sp=Math.sin(e.pitch||0),cr=Math.cos(e.roll||0),sr=Math.sin(e.roll||0),x=c*dx+s*dz,z=-s*dx+c*dz,y=dy,xx=cp*x+sp*y,yy=-sp*x+cp*y;return{x:xx,y:cr*yy+sr*z,z:-sr*yy+cr*z};}
 function boxEntry(a,b,min,max){let lo=0,hi=1;for(const key of ['x','y','z']){const delta=b[key]-a[key];if(Math.abs(delta)<1e-9){if(a[key]<min[key]||a[key]>max[key])return null;continue;}let near=(min[key]-a[key])/delta,far=(max[key]-a[key])/delta;if(near>far)[near,far]=[far,near];lo=Math.max(lo,near);hi=Math.min(hi,far);if(lo>hi)return null;}return lo;}
 function collision(g,fx,a,b){
  const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},radius=Math.hypot(b.x-a.x,b.y-a.y)/2+240,candidates=g.spatial?.query(mid.x,mid.y,radius)||g.entities;let best=null;
  for(const e of candidates){if(e.hp<=0||e.id===fx.sourceId||e.embarkedIn||e.components?.state==='downed')continue;
   const shape=e.structure?data(e).footprint:null,bounds=root.WarNavigationFootprints?.bounds[e.kind+'_'+g.teams[e.team]?.faction],r=e.r||10;
   const min=shape?{x:-shape.halfLength,y:shape.minY??0,z:-shape.halfWidth}:bounds?{x:bounds[3]-1,y:bounds[1]-1,z:bounds[5]-1}:{x:-r,y:-1,z:-r},max=shape?{x:shape.halfLength,y:shape.maxY??data(e).collisionHeight??2,z:shape.halfWidth}:bounds?{x:bounds[4]+1,y:bounds[2]+1,z:bounds[6]+1}:{x:r,y:g.hitHeightRadius?.(e)||r*2,z:r},t=boxEntry(local(g,e,a),local(g,e,b),min,max);
   if(t!==null&&(!best||t<best.t))best={t,entity:e};
  }
  for(const tree of root.WarTrees?.liveColliders(g)||g.directObstacles||[]){if(tree.hp===0)continue;const r=tree.r||4,t=boxEntry({x:a.x,y:a.height,z:a.y},{x:b.x,y:b.height,z:b.y},{x:tree.x-r,y:0,z:tree.y-r},{x:tree.x+r,y:tree.height||30,z:tree.y+r});if(t!==null&&(!best||t<best.t))best={t,tree};}
  return best;
 }
 function resolveCollision(g,fx){
  const p=fx.projectile,hit=collision(g,fx,p.previous,p.position);if(!hit)return null;
  p.position={x:p.previous.x+(p.position.x-p.previous.x)*hit.t,y:p.previous.y+(p.position.y-p.previous.y)*hit.t,height:p.previous.height+(p.position.height-p.previous.height)*hit.t};
  if(hit.tree){fx.targetTreeId=hit.tree.id;return impact(fx,null);}
  const e=hit.entity;
  if(!canImpact(g,fx,e)){fx.damage=fx.baseDamage=fx.splash=fx.treeDamage=fx.treeSplash=0;return impact(fx,null);}
  fx.damage=g.attackDamage(fx.sourceKind,e,fx.baseDamage||fx.damage,fx.weaponDefinition);fx.targetDomain=g.targetDomain(e.kind);fx.directHitArea={x:e.x,y:e.y,altitude:g.entityAltitude(e),r:e.r||10,verticalRadius:g.hitHeightRadius?.(e)||20};
  return impact(fx,e);
 }
 function direction(p){return{x:Math.cos(p.heading)*Math.cos(p.pitch),y:Math.sin(p.heading)*Math.cos(p.pitch),height:Math.sin(p.pitch)};}
 function steerGuided(p,q,dt){
  const forward=direction(p),dx=q.x-p.position.x,dy=q.y-p.position.y,dz=q.height-p.position.height,length=Math.hypot(dx,dy,dz);
  if(length<1e-8)return;
  const desired={x:dx/length,y:dy/length,height:dz/length},dot=clamp(forward.x*desired.x+forward.y*desired.y+forward.height*desired.height,-1,1),angle=Math.acos(dot),rate=Math.min(p.turnRate,p.pitchRate),turn=Math.min(angle,rate*dt);
  if(angle>1e-8&&turn>0){
   // A bounded rotation in 3D avoids the yaw discontinuity directly above a
   // target. An antiparallel vector gets a deterministic perpendicular axis.
   let tx=desired.x-dot*forward.x,ty=desired.y-dot*forward.y,tz=desired.height-dot*forward.height,n=Math.hypot(tx,ty,tz);
   if(n<1e-8){if(Math.abs(forward.height)<.9){tx=-forward.height*forward.x;ty=-forward.height*forward.y;tz=1-forward.height*forward.height;}else{tx=1-forward.x*forward.x;ty=-forward.x*forward.y;tz=-forward.x*forward.height;}n=Math.hypot(tx,ty,tz);}
   const c=Math.cos(turn),s=Math.sin(turn),x=forward.x*c+tx/n*s,y=forward.y*c+ty/n*s,h=forward.height*c+tz/n*s;
   p.heading=Math.atan2(y,x);p.pitch=Math.atan2(h,Math.hypot(x,y));
  }
  // In game units, a circle reaching a point at angular error a needs
  // r <= distance/(2*sin(a)). Reduce speed before the turn runs out of room;
  // retaining finite acceleration/braking also prevents a terminal snap.
  // An aligned missile needs no curvature braking. A broad artificial angle
  // floor would make straight orbital approaches decelerate exponentially.
  const demand=Math.max(1e-6,Math.sin(Math.min(angle,Math.PI/2))),desiredSpeed=Math.min(p.cruiseSpeed,Math.max(30,length*rate*.8/(2*demand))),acceleration=p.spaceProjection?p.cruiseSpeed*6:600,braking=p.spaceProjection?p.cruiseSpeed*8:1200;
  p.speed+=clamp(desiredSpeed-p.speed,-braking*dt,acceleration*dt);
 }
 function guidedSurface(p){
  // Surface crossing is a segment intersection, not a target-ID hit. Upward
  // submarine ejection is allowed to leave the water before seeking.
  if(p.previous.height>=0&&p.position.height<=0&&p.position.height<p.previous.height){const t=p.previous.height/(p.previous.height-p.position.height);p.position={x:p.previous.x+(p.position.x-p.previous.x)*t,y:p.previous.y+(p.position.y-p.previous.y)*t,height:0};return true;}
  return false;
 }
 function step(g,fx,dt){
  const p=fx.projectile;if(!p)return {handled:false,expired:false,impact:false};if(!(dt>0))return {handled:true,expired:false,impact:false};
  p.previous={...p.position};p.age+=dt;fx.ttl=Math.max(0,fx.ttl-dt);
  if(p.kind==='decoy')return p.age>=p.maxAge?expire(fx):{handled:true,expired:false,impact:false};
  if(p.kind==='interceptor'){
   const target=g.effects.find(f=>f.type==='shot'&&f.projectileId===p.targetProjectileId);if(!target)return expire(fx);
   const q=position(target),v={x:q.x-p.position.x,y:q.y-p.position.y,height:q.height-p.position.height},length=Math.hypot(v.x,v.y,v.height),stepLength=Math.min(length,p.speed*dt);
   if(length>0){p.position.x+=v.x/length*stepLength;p.position.y+=v.y/length*stepLength;p.position.height+=v.height/length*stepLength;}
   fx.tx=q.x;fx.ty=q.y;fx.targetHeight=q.height;
   if(swept(p.previous,p.position,q,p.radius)){target.type='intercepted';target.damage=target.baseDamage=target.splash=target.treeDamage=target.treeSplash=0;target.ttl=target.max=.12;target.interceptedAt={...q};delete target.projectile;return expire(fx);}
   return p.age>=p.maxAge?expire(fx):{handled:true,expired:false,impact:false};
  }
  if(p.kind==='arc'){
   const t=Math.min(p.age,p.duration);p.position.x=p.origin.x+p.velocity.x*t;p.position.y=p.origin.y+p.velocity.y*t;p.position.height=p.origin.height+p.velocity.height*t-.5*p.gravity*t*t;
   if(p.age>=p.duration)p.position={...p.destination};const hit=resolveCollision(g,fx);if(hit)return hit;
   if(p.age>=p.duration)return impact(fx,null);
  }else if(p.kind==='bomb'){
   p.position.x+=p.velocity.x*dt;p.position.y+=p.velocity.y*dt;p.position.height+=p.velocity.height*dt-.5*p.gravity*dt*dt;p.velocity.height-=p.gravity*dt;
   const reached=p.position.height<=p.impactHeight;if(reached){const t=clamp((p.previous.height-p.impactHeight)/Math.max(.001,p.previous.height-p.position.height),0,1);p.position={x:p.previous.x+(p.position.x-p.previous.x)*t,y:p.previous.y+(p.position.y-p.previous.y)*t,height:p.impactHeight};}
   const hit=resolveCollision(g,fx);if(hit)return hit;if(reached)return impact(fx,null);
  }else if(p.kind==='kinetic'){
   const t=Math.min(p.age,p.duration);p.position={x:p.origin.x+p.velocity.x*t,y:p.origin.y+p.velocity.y*t,height:p.origin.height+p.velocity.height*t};
   const hit=resolveCollision(g,fx);if(hit)return hit;
   if(p.age>=p.duration){fx.target=null;return impact(fx,null);}
  }else if(p.kind==='guided'){
   p.phaseAge+=dt;
   if(p.phase==='separation'){
    p.position.x+=p.releaseVelocity.x*dt;p.position.y+=p.releaseVelocity.y*dt;p.position.height+=(p.releaseVelocity.height-12)*dt;
    if(p.phaseAge>=.18){p.phase='ignition';p.phaseAge=0;}
   }else if(p.phase==='vertical'){
    p.position.height+=90*dt;if(p.phaseAge>=.28&&p.position.height>=8){p.phase='ignition';p.phaseAge=0;}
   }else{
    if(p.phase==='ignition'&&p.phaseAge>=.12){p.phase='powered';p.phaseAge=0;}
    if(p.phase!=='coast'){
     const target=g.get(p.lockId);if(target&&canTrack(g,fx,target)){p.destination={x:target.x,y:target.y,height:g.entityAltitude(target)};steerGuided(p,p.destination,dt);}
     else{p.lockId=null;fx.target=null;p.phase='coast';p.phaseAge=0;}
    }
    const forward=direction(p);p.position.x+=forward.x*p.speed*dt;p.position.y+=forward.y*p.speed*dt;p.position.height+=forward.height*p.speed*dt;
   }
   const surface=guidedSurface(p);
   const hit=resolveCollision(g,fx);if(hit)return hit;
   if(surface)return impact(fx,null);
   if(p.phase==='coast'&&p.phaseAge>=1.5||p.position.height< -100&&p.destination.height>=-10)return expire(fx);
  }else if(p.kind==='torpedo'){
   const target=g.get(p.lockId),decoys=g.effects.filter(d=>d.type==='decoy'&&d.projectile?.kind==='decoy'&&d.from!==fx.from&&d.projectile.age<d.projectile.maxAge&&dist(position(d),p.position)<130),decoy=decoys.sort((a,b)=>dist(position(a),p.position)-dist(position(b),p.position))[0];
   let q=null;
   if(decoy){p.decoyId=id(g,decoy);p.state='decoy';q=position(decoy);}
   else if(target&&canTrack(g,fx,target)&&['naval','underwater'].includes(g.targetDomain(target.kind))){p.state='tracking';p.lostFor=0;p.searchRemaining=3;q={x:target.x,y:target.y,height:g.entityAltitude(target)};}
   else{p.state='searching';p.lostFor+=dt;p.searchRemaining-=dt;p.lockId=null;fx.target=null;}
   if(!q&&p.searchRemaining>0){const contact=g.entities.filter(e=>canTrack(g,fx,e)&&['naval','underwater'].includes(g.targetDomain(e.kind))&&dist({x:e.x,y:e.y,height:g.entityAltitude(e)},p.position)<150).sort((a,b)=>a.id-b.id)[0];if(contact){p.lockId=contact.id;q={x:contact.x,y:contact.y,height:g.entityAltitude(contact)};p.state='tracking';}}
   if(q){const desired=Math.atan2(q.y-p.position.y,q.x-p.position.x);p.heading+=clamp(wrap(desired-p.heading),-p.turnRate*dt,p.turnRate*dt);p.position.height+=clamp(q.height-p.position.height,-22*dt,22*dt);}
   const depthApproach=q?clamp(Math.hypot(q.x-p.position.x,q.y-p.position.y)/Math.max(1,Math.abs(q.height-p.position.height)*8),.1,1):1;
   p.position.x+=Math.cos(p.heading)*p.speed*depthApproach*dt;p.position.y+=Math.sin(p.heading)*p.speed*depthApproach*dt;
   if(q&&swept(p.previous,p.position,q,decoy?12:Math.max(12,target?.r||12))){if(decoy)return expire(fx);const hit=g.get(p.lockId);return impact(fx,hit);}
   if(p.searchRemaining<=0)return expire(fx);
  }
  const bounds=root.WarMapDimensions?.forMap(g.map)||{width:root.WarData.W,height:root.WarData.H};
  if(p.age>=p.maxAge||p.position.x<0||p.position.y<0||p.position.x>bounds.width||p.position.y>bounds.height)return expire(fx);
  // The dynamic trajectory owns its expiry, independent of the original straight-line TTL.
  fx.ttl=Math.max(.001,p.maxAge-p.age);return {handled:true,expired:false,impact:false};
 }
 function interceptionPlan(g,e){
  if(e.hp<=0||!g.operational(e)||root.WarCombatDamage?.incapacitated(e))return null;
  const R=root.WarCombatReadiness,ws=R.weapons(g,e),base=data(e);
  const defensive=ws.filter(w=>w.mechanics?.intercept||w.stationId==='ciws'||e.kind==='ciws'||base.interceptRange);
  if(!defensive.length)return null;
  const origin={x:e.x,y:e.y,height:g.entityAltitude(e)+8};
  const threats=g.effects.filter(f=>f.type==='shot'&&(f.rocket||['missile','rocket'].includes(f.weaponFamily))&&g.isEnemy(e.team,f.from));
  for(const fx of threats){const q=position(fx);for(const w of defensive){const range=root.WarSensors?.interceptionRange(g,e,w)??(base.interceptRange||w.mechanics?.interceptRange||w.range);if(dist(origin,q)<=range){const st=R.ensure(g,e).stations[R.profile(g,e,w).id];if(st.ammo>0&&!st.reloadRemaining&&st.cooldown<=0)return {weapon:w,projectile:fx,position:q,range,origin};}}}
  return null;
 }
 function tryIntercept(g,e,dt){
  if(!(dt>0))return false;const plan=interceptionPlan(g,e);if(!plan)return false;const R=root.WarCombatReadiness,p=R.profile(g,e,plan.weapon),c=R.ensure(g,e),m=c.mounts[p.mountId],q=plan.position,portIndex=c.stations[p.id].nextPort,candidate=g.resolveWeaponOrigin?.(e,plan.weapon,portIndex),origin=candidate&&['x','y','height'].every(k=>finite(candidate[k]))?candidate:plan.origin,dx=q.x-origin.x,dy=q.y-origin.y,yaw=Math.atan2(dy,dx),pitch=Math.atan2(q.height-origin.height,Math.hypot(dx,dy));
  if(g.directControl?.id===e.id&&(g.directControl.input?.fire||g.directControl.firePending)&&R.profile(g,e,g.vehicleWeapon?.(e))?.mountId===p.mountId)return false;
  const speed=root.WarCombatDamage?.weaponAvailability(e,p).traverseMultiplier??1;m.yaw+=clamp(wrap(yaw-m.yaw),-p.mount.yawRate*speed*dt,p.mount.yawRate*speed*dt);m.pitch+=clamp(clamp(pitch,p.mount.minPitch,p.mount.maxPitch)-m.pitch,-p.mount.pitchRate*speed*dt,p.mount.pitchRate*speed*dt);m.targetProjectileId=id(g,plan.projectile);
  const ready=R.status(g,e,p,null,{aimOrigin:origin,aimX:q.x,aimY:q.y,aimHeight:q.height});
  if(!ready.canFire||dist(origin,q)>plan.range||!R.consumeRound(g,e,p))return false;
  const lifetime=Math.max(.2,dist(origin,q)/1100+.5),fx={type:'interceptor',from:e.team,sourceId:e.id,sourceKind:e.kind,sourceFaction:g.teams[e.team]?.faction,x:origin.x,y:origin.y,sourceHeight:origin.height,tx:q.x,ty:q.y,targetHeight:q.height,firedAt:g.time,ttl:lifetime,max:lifetime,weaponId:p.id,mountId:p.mountId,ammoType:p.ammoType,shotSerial:c.stations[p.id].shotSerial,portIndex,weaponFamily:p.family,weaponMuzzleClass:p.muzzleClass||'gun',originFrozen:true,originApproximate:origin===plan.origin||!!origin.approximate,projectile:{kind:'interceptor',position:{...origin},previous:{...origin},age:0,maxAge:lifetime,speed:1100,radius:16,targetProjectileId:m.targetProjectileId}};
  id(g,fx);g.effects.push(fx);return true;
 }
 function deployDecoy(g,e){
  if(!e||e.hp<=0||!data(e).naval||!g.operational(e)||root.WarCombatDamage?.incapacitated(e))return false;
  e.countermeasures??={charges:3,nextAt:0};const c=e.countermeasures;if(c.charges<=0||c.nextAt>g.time)return false;c.charges--;c.nextAt=g.time+8;
  const point={x:e.x-Math.cos(e.angle||0)*25,y:e.y-Math.sin(e.angle||0)*25,height:g.entityAltitude(e)},fx={type:'decoy',from:e.team,sourceId:e.id,x:point.x,y:point.y,sourceHeight:point.height,tx:point.x,ty:point.y,targetHeight:point.height,ttl:6,max:6,firedAt:g.time,projectile:{kind:'decoy',position:point,previous:{...point},age:0,maxAge:6}};id(g,fx);g.effects.push(fx);return true;
 }
 function validate(fx){
  if(fx.projectileId!==undefined&&(!Number.isInteger(fx.projectileId)||fx.projectileId<1))return false;const p=fx.projectile;if(!p)return true;
  if(!['arc','bomb','kinetic','guided','torpedo','interceptor','decoy'].includes(p.kind)||!['x','y','height'].every(k=>finite(p.position?.[k])&&finite(p.previous?.[k]))||!finite(p.age)||p.age<0||!finite(p.maxAge)||p.maxAge<=0||p.maxAge>120)return false;
  if(p.kind==='arc'&&(!['x','y','height'].every(k=>finite(p.velocity?.[k])&&finite(p.origin?.[k])&&finite(p.destination?.[k]))||!finite(p.gravity)||p.gravity<=0||!finite(p.duration)||p.duration<=0))return false;
  if(p.kind==='bomb'&&(!['x','y','height'].every(k=>finite(p.velocity?.[k])&&finite(p.releaseVelocity?.[k]))||!finite(p.gravity)||p.gravity<=0||!finite(p.impactHeight)))return false;
  if(p.kind==='torpedo'&&(!['speed','turnRate','heading','lostFor','searchRemaining'].every(k=>finite(p[k]))||p.speed<=0||p.turnRate<0||!['tracking','searching','decoy'].includes(p.state)||p.lockId!=null&&!Number.isInteger(p.lockId)))return false;
  if(p.kind==='interceptor'&&(!Number.isInteger(p.targetProjectileId)||!finite(p.speed)||p.speed<=0||!finite(p.radius)||p.radius<0))return false;
  if(p.kind==='kinetic'&&(!['x','y','height'].every(k=>finite(p.velocity?.[k])&&finite(p.origin?.[k])&&finite(p.destination?.[k]))||!finite(p.duration)||p.duration<=0))return false;
  if(p.kind==='guided'&&(!['heading','pitch','speed','cruiseSpeed','turnRate','pitchRate','phaseAge'].every(k=>finite(p[k]))||p.speed<0||p.cruiseSpeed<=0||p.cruiseSpeed>(p.spaceProjection?40000:5000)||p.turnRate<0||p.turnRate>20||p.pitchRate<0||p.pitchRate>20||p.phaseAge<0||!['separation','vertical','ignition','powered','coast'].includes(p.phase)||!['x','y','height'].every(k=>finite(p.destination?.[k])&&finite(p.releaseVelocity?.[k]))||p.lockId!=null&&!Number.isInteger(p.lockId)))return false;
  return true;
 }
 function validateEntity(e){const c=e.countermeasures;return !c||!!data(e).naval&&Number.isInteger(c.charges)&&c.charges>=0&&c.charges<=3&&finite(c.nextAt)&&c.nextAt>=0;}
 const api={decorateLaunch,bombSolution,position,step,interceptionPlan,tryIntercept,deployDecoy,canImpact,canTrack,validate,validateEntity};root.WarCombatProjectiles=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
