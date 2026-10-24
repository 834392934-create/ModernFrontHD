/* Original simplified component failures, casualties and recovery. Game values only. */
(function(root){
 'use strict';
 const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const states=new Set(['operational','disabled','burning','flooding','crashing','downed','dead']);
 const data=e=>root.WarData?.U[e?.kind]||root.WarData?.B[e?.kind]||{};
 const personnel=e=>(data(e).modelKind||e?.kind)==='infantry';
 function partNames(e){const d=data(e);if(personnel(e))return [];if(e.structure)return ['structure'];if(d.air&&!d.space)return ['engine','control','hull'];if(d.naval)return ['engine','turret','hull'];if(d.space)return ['engine','turret','hull'];return ['engine','tracks','turret','hull'];}
 function ensure(g,e){
  if(!e.components)e.components={schema:1,parts:Object.fromEntries(partNames(e).map(k=>[k,{health:1,lastHitAt:-1}])),lastHitAt:-1,hitPoint:null,fireUntil:0,flooding:0,listing:0,state:e.hp>0?'operational':'dead',destroyedAt:null,personnel:personnel(e)?{downedAt:null,bleedUntil:0,reviveProgress:0,rescuerId:null,limp:0,staggerUntil:0,everDowned:false}:null};
  return e.components;
 }
 function health(e,key){return e.components?.parts?.[key]?.health??1;}
 function incapacitated(e){return e.hp<=0||['downed','dead','crashing','disabled'].includes(e.components?.state);}
 function refresh(g,e){
  const c=e.components;if(!c)return;
  if(e.hp<=0){c.state='dead';c.destroyedAt??=g.time;return;}
  if(c.personnel?.downedAt!=null){c.state='downed';return;}
  if(c.emergencyLanded){c.state='disabled';return;}
  const d=data(e);
  if(d.air&&!d.space&&(health(e,'engine')<=.15||health(e,'control')<=.15)&&((e.altitude||0)>25||c.state==='crashing'&&(e.altitude||0)>3)){c.state='crashing';return;}
  if(e.structure&&health(e,'structure')<=.2){c.state='disabled';return;}
  c.state=c.flooding>.1?'flooding':c.fireUntil>g.time?'burning':'operational';
 }
 function apply(g,e,actualDamage,source={}){
  source=source||{};
  const c=ensure(g,e);if(!(actualDamage>0))return {downed:c.state==='downed',killed:e.hp<=0};
  c.lastHitAt=g.time;c.hitPoint={x:finite(source.tx)?source.tx:e.x,y:finite(source.ty)?source.ty:e.y,height:finite(source.targetHeight)?source.targetHeight:g.entityAltitude(e)};
  if(c.personnel){const p=c.personnel;p.staggerUntil=g.time+.65;p.limp=clamp(Math.max(p.limp,1-e.hp/e.maxHp),0,1);
   if(e.hp<=0&&p.downedAt==null&&!p.everDowned&&!source.componentTick&&actualDamage<e.maxHp*.8){e.hp=1;p.downedAt=g.time;p.bleedUntil=g.time+35;p.reviveProgress=0;p.rescuerId=null;p.everDowned=true;e.target=null;e.order=null;e.path=[];root.WarVehicleMotion?.stop(e);}
   refresh(g,e);return {downed:c.state==='downed',killed:e.hp<=0};
  }
  if(e.hp<=0&&data(e).air&&!data(e).space&&(e.altitude||0)>25&&!source.componentTick&&!c.fatalFlight){e.hp=1;c.fatalFlight=true;c.parts.engine.health=0;c.parts.control.health=0;c.fireUntil=g.time+30;}
  if(!source.componentTick){
   const keys=partNames(e),angle=e.angle||0,dx=c.hitPoint.x-e.x,dy=c.hitPoint.y-e.y,along=dx*Math.cos(angle)+dy*Math.sin(angle),heightAbove=c.hitPoint.height-g.entityAltitude(e),d=data(e);
   let key=source.component&&keys.includes(source.component)?source.component:e.structure?'structure':d.naval?'hull':heightAbove>8&&keys.includes('turret')?'turret':along<-(e.r||15)*.2?'engine':heightAbove<2&&keys.includes('tracks')?'tracks':keys.includes('control')?'control':'hull';
   const part=c.parts[key];if(part){part.health=clamp(part.health-actualDamage/Math.max(1,e.maxHp)*1.6,0,1);part.lastHitAt=g.time;}
   if(health(e,'engine')<.3||e.structure&&health(e,'structure')<.4)c.fireUntil=Math.max(c.fireUntil,g.time+9);
   if(d.naval&&health(e,'hull')<.5)c.flooding=clamp(c.flooding+(1-health(e,'hull'))*.16,0,1);
  }
  refresh(g,e);return {downed:false,killed:e.hp<=0};
 }
 function mobility(e){
  const c=e.components;if(!c)return {speed:1,turn:1,canMove:e.hp>0};
  if(incapacitated(e))return {speed:0,turn:0,canMove:false};
  if(c.personnel){const speed=1-c.personnel.limp*.55;return {speed,turn:1,canMove:true};}
  const engine=health(e,'engine'),tracks=health(e,'tracks'),speed=engine<=.15||tracks<=.15?0:Math.max(.2,engine)*Math.max(.3,tracks)*(1-c.flooding*.7);
  return {speed,turn:Math.max(.1,tracks)*Math.max(.3,health(e,'control')),canMove:speed>0};
 }
 function weaponAvailability(e,w){
  if(incapacitated(e))return {available:false,reason:e.components?.state||'dead',traverseMultiplier:0};
  const turret=health(e,'turret');return {available:turret>.15||w?.mount?.mode==='vertical',reason:turret<=.15?'turret-damaged':'ready',traverseMultiplier:turret<=.15?0:Math.max(.15,turret)};
 }
 function step(g,e,dt){
  const result={damage:0,expireDowned:false,crashImpact:false};if(!(dt>0)||e.hp<=0)return result;const c=ensure(g,e),d=data(e);
  if(c.personnel){if(c.personnel.downedAt!=null&&g.time>=c.personnel.bleedUntil)result.expireDowned=true;return result;}
  if(c.fireUntil>g.time&&!c.fatalFlight)result.damage+=e.maxHp*.006*dt;
  if(d.naval&&c.flooding>0){c.flooding=clamp(c.flooding+Math.max(0,.5-health(e,'hull'))*.012*dt,0,1);c.listing=Math.sin((e.id||1)*1.7)*c.flooding*.3;result.damage+=e.maxHp*.008*c.flooding*dt;}
  refresh(g,e);
  if(c.state==='crashing'){
   const before={x:e.x,y:e.y,angle:e.angle},speed=Math.max(25,e.flightSpeed||50),loss=health(e,'engine')<=.15;
   e.pitch+=clamp((loss?-.22:-.45)-(e.pitch||0),-.6*dt,.6*dt);e.roll+=clamp((health(e,'control')<=.15?.45:0)-(e.roll||0),-.3*dt,.3*dt);
   e.flightSpeed=Math.max(25,speed-7*dt);e.x=clamp(e.x+Math.cos(e.angle||0)*e.flightSpeed*dt,0,root.WarData.W);e.y=clamp(e.y+Math.sin(e.angle||0)*e.flightSpeed*dt,0,root.WarData.H);
   e.altitude=Math.max(0,(e.altitude||0)-Math.max(12,speed*(loss?.18:.32))*dt);root.WarVehicleMotion?.record(e,before,dt,0,0,g.tick);
   if(e.altitude<=3){result.crashImpact=true;
    // A controlled emergency landing survives on traversable land; otherwise central damage ends it.
    const at=Math.floor(e.y/root.WarData.T)*root.WarData.COLS+Math.floor(e.x/root.WarData.T),land=!g.map?.blocked?.[at];
    if(health(e,'control')>.45&&land){e.altitude=3;e.flightSpeed=0;c.state='disabled';c.emergencyLanded=true;e.order=null;e.target=null;if(e.flight)e.flight.phase='service';}
    else result.damage+=e.maxHp*2;
   }
  }
  return result;
 }
 function repair(g,e,source,dt){
  const service=e.flight?.phase==='service'&&e.flight.homeId===source?.id;
  if(!(dt>0)||!source||source.team!==e.team||source.hp<=0||e.hp<=0||!g.operational(source)||!service&&Math.hypot(source.x-e.x,source.y-e.y)>(data(source).range||160)+(source.r||0))return false;
  const c=ensure(g,e),d=data(source),medical=!!d.heal&&(!d.healFamilies||d.healFamilies.includes('infantry'));
  if(c.personnel){const p=c.personnel;if(!medical)return false;
   if(p.downedAt!=null){p.rescuerId=source.id;p.reviveProgress=clamp(p.reviveProgress+dt/5,0,1);source.rescueAction={targetId:e.id,time:g.time,progress:p.reviveProgress};if(p.reviveProgress>=1){p.downedAt=null;p.bleedUntil=0;p.rescuerId=null;e.hp=Math.max(e.hp,e.maxHp*.25);p.limp=.5;c.state='operational';}return true;}
   p.limp=Math.max(0,p.limp-dt*.1);return true;
  }
  if(d.healFamilies&&!d.healFamilies.includes(data(e).modelKind||e.kind))return false;
  if(e.structure&&!['hq','factory','repairhub'].includes(source.kind))return false;
  if(!d.heal&&!['hq','factory','navalyard','spaceport','airfield','carrier','repairhub'].includes(source.kind))return false;
  if(d.healDomains&&!d.healDomains.includes(g.targetDomain(e.kind)))return false;
  for(const p of Object.values(c.parts))p.health=Math.min(1,p.health+dt*.05);
  c.fireUntil=Math.max(g.time,c.fireUntil-dt*5);c.flooding=Math.max(0,c.flooding-dt*.12);c.listing*=Math.max(0,1-dt*3);
  if(c.emergencyLanded&&health(e,'engine')>.3){c.emergencyLanded=false;c.state='operational';}
  refresh(g,e);return true;
 }
 function wreck(g,e){const c=ensure(g,e);return {type:'wreck',entityId:e.id,kind:e.kind,team:e.team,x:e.x,y:e.y,height:g.entityAltitude(e),angle:e.angle||0,pitch:e.pitch||0,roll:e.roll||0,createdAt:g.time,ttl:personnel(e)?12:35,max:personnel(e)?12:35,personnel:personnel(e),naval:!!data(e).naval,aircraft:!!data(e).air&&!data(e).space,components:structuredClone(c)};}
 function repairPulse(g,e,ratio){
  if(!e||e.hp<=0||!finite(ratio)||ratio<=0)return false;const c=ensure(g,e);if(c.personnel?.downedAt!=null||c.state==='dead'||c.state==='downed')return false;ratio=clamp(ratio,0,1);
  if(c.personnel)c.personnel.limp=Math.max(0,c.personnel.limp-ratio);else{
   for(const p of Object.values(c.parts))p.health=Math.min(1,p.health+ratio);
   c.fireUntil=Math.max(g.time,c.fireUntil-ratio*180);c.flooding=Math.max(0,c.flooding-ratio);c.listing*=1-ratio;
   if(health(e,'engine')>.3&&health(e,'control')>.3){c.fatalFlight=false;if(c.emergencyLanded){c.emergencyLanded=false;c.state='operational';}}
  }refresh(g,e);return true;
 }
 function validate(e){const c=e.components;if(!c)return true;if(c.schema!==1||!states.has(c.state)||!c.parts||!finite(c.lastHitAt)||!finite(c.fireUntil)||!finite(c.flooding)||c.flooding<0||c.flooding>1||!finite(c.listing)||c.destroyedAt!=null&&!finite(c.destroyedAt))return false;
  const names=partNames(e);if(Object.keys(c.parts).some(k=>!names.includes(k))||names.some(k=>!c.parts[k]))return false;
  for(const p of Object.values(c.parts))if(!p||!finite(p.health)||p.health<0||p.health>1||!finite(p.lastHitAt))return false;
  if(c.hitPoint&&!['x','y','height'].every(k=>finite(c.hitPoint[k])))return false;
  if(personnel(e)){const p=c.personnel;if(!p||p.downedAt!=null&&!finite(p.downedAt)||!['bleedUntil','reviveProgress','limp','staggerUntil'].every(k=>finite(p[k]))||p.reviveProgress<0||p.reviveProgress>1||p.limp<0||p.limp>1||p.rescuerId!=null&&!Number.isInteger(p.rescuerId))return false;}else if(c.personnel!==null)return false;
  return true;
 }
 const api={ensure,apply,step,mobility,weaponAvailability,repair,repairPulse,incapacitated,wreck,validate,personnel};root.WarCombatDamage=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
