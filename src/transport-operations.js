/* IFV passenger identity transactions. Capacity and survival are game rules. */
(function(root){
 'use strict';
 const finite=Number.isFinite,data=e=>root.WarData?.U[e?.kind]||{};
 const personnel=e=>(data(e).modelKind||e?.kind)==='infantry';
 function capacity(e){return e?.kind==='ifv'?6:Math.max(0,Math.min(12,data(e).transportSeats||0));}
 function status(g,e){const seats=capacity(e),passengers=e?.passengers||[];return {capacity:seats,occupied:passengers.length,available:Math.max(0,seats-passengers.length),passengers:passengers.map(p=>({id:p.id,kind:p.kind,hp:p.hp,maxHp:p.maxHp})),canUnload:e?.hp>0&&!(e.disabled>g.time)&&Math.abs(e.motion?.signedSpeed||0)<3};}
 function idle(g,p){g.resetJump?.(p);p.order=null;p.orderQueue=[];p.path=[];p.target=null;p.manualMove=false;p.retreating=false;root.WarVehicleMotion?.stop(p);}
 function board(g,e,p){
  if(!e||!p||!capacity(e)||e.hp<=0||p.hp<=0||e.team!==p.team||!personnel(p)||p.embarkedIn||g.get(p.id)!==p||p.id===g.directControl?.id||e.disabled>g.time||p.disabled>g.time||root.WarCombatDamage?.incapacitated(p)||Math.abs(e.motion?.signedSpeed||0)>=3||Math.abs(g.entityAltitude(e)-g.entityAltitude(p))>20||Math.hypot(e.x-p.x,e.y-p.y)>g.navigationRadius(e)+g.navigationRadius(p)+40)return false;
  e.passengers??=[];if(e.passengers.length>=capacity(e)||e.passengers.some(x=>x.id===p.id)||p.vehicleCrew||p.passengers?.length)return false;
  idle(g,p);p.embarkedIn=e.id;p.passengerSeat=e.passengers.length;e.passengers.push(p);g.entities=g.entities.filter(x=>x.id!==p.id);return true;
 }
 function exitPoint(g,e,p){
  if(g.vehicleExitPoint)return g.vehicleExitPoint(e,p);
  const radius=g.navigationRadius(e)+g.navigationRadius(p)+12;
  for(let ring=0;ring<4;ring++)for(let i=0;i<16;i++){const a=(e.angle||0)+i*Math.PI/8,x=e.x+Math.cos(a)*(radius+ring*25),y=e.y+Math.sin(a)*(radius+ring*25);if(x<0||y<0||x>root.WarData.W||y>root.WarData.H)continue;
   if(root.WarNavigationFootprints?.terrain(g,p,x,y)&&!g.entities.some(o=>o.hp>0&&Math.hypot(o.x-x,o.y-y)<g.navigationRadius(p)+g.navigationRadius(o)+5))return {x,y};}
  return null;
 }
 function unload(g,e,p,force=false){
  if(!p||!e.passengers?.includes(p)||!force&&!status(g,e).canUnload)return false;const point=exitPoint(g,e,p);if(!point)return false;
  e.passengers.splice(e.passengers.indexOf(p),1);delete p.embarkedIn;delete p.passengerSeat;idle(g,p);p.x=point.x;p.y=point.y;p.altitude=0;p.pitch=0;p.roll=0;p.angle=e.angle||0;g.entities.push(p);e.passengers.forEach((x,i)=>x.passengerSeat=i);return true;
 }
 function disembark(g,e,personnelId){
  if(!e||e.hp<=0||e.disabled>g.time||!capacity(e))return false;const candidates=personnelId==null?[...(e.passengers||[])]:[(e.passengers||[]).find(p=>p.id===personnelId)];let count=0;
  for(const p of candidates)if(unload(g,e,p))count++;return count;
 }
 function destroyed(g,e,from){
  const passengers=[...(e.passengers||[])],result={survivors:[],lost:[]};
  for(const p of passengers){
   // Deterministic game survival, followed by the same legal exit search as normal unloading.
   const canSurvive=p.hp>p.maxHp*.25&&(p.id+e.id)%3!==0&&!(e.components?.fireUntil>g.time);
   if(canSurvive&&unload(g,e,p,true)){p.hp=Math.max(1,p.hp*.35);const c=root.WarCombatDamage?.ensure(g,p);if(c?.personnel){c.personnel.limp=.8;c.personnel.staggerUntil=g.time+1.5;}result.survivors.push(p.id);}
   else{if(p.hp>0){g.damage(p,p.maxHp*3,from,{componentTick:true,sourceId:e.id,x:e.x,y:e.y});}result.lost.push(p.id);}
  }
  e.passengers=[];return result;
 }
 function step(g,e,dt){if(!(dt>0))return;for(const p of e.passengers||[]){p.x=e.x;p.y=e.y;p.altitude=g.entityAltitude(e);}}
 function validateGame(g){
  const ids=new Set(g.entities.map(e=>e.id));for(const e of g.entities)if(e.vehicleCrew){if(ids.has(e.vehicleCrew.id))return false;ids.add(e.vehicleCrew.id);}
  for(const e of g.entities){if(e.passengers===undefined)continue;if(!Array.isArray(e.passengers)||e.passengers.length>capacity(e)||e.passengers.length&&!capacity(e))return false;
   for(let i=0;i<e.passengers.length;i++){const p=e.passengers[i];if(!p||!Number.isInteger(p.id)||p.id<1||p.id>=g.nextId||ids.has(p.id)||!personnel(p)||p.team!==e.team||p.embarkedIn!==e.id||p.passengerSeat!==i||p.vehicleCrew||p.passengers?.length||!['x','y','hp','maxHp','angle','altitude'].every(k=>finite(p[k]))||p.hp<=0||p.hp>p.maxHp||p.maxHp<=0||!root.WarCombatDamage?.validate(p)||root.WarCombatDamage.incapacitated(p)||root.WarCombatReadiness&&!root.WarCombatReadiness.validate(p,g))return false;
    if(p.kind==='operator'&&(!root.WarOperatorCombat?.validate(p)||!p.operatorState))return false;
    ids.add(p.id);
   }
  }return true;
 }
 const api={capacity,status,board,disembark,destroyed,step,validateGame};root.WarTransportOperations=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
