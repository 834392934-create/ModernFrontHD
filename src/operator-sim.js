/* Original game-only operator combat. Simulation owns every ammunition transaction. */
(function(root){
 'use strict';
 if(!root.WarOperatorWeapons&&typeof require==='function')require('./operator-weapons.js');
 const C=root.WarOperatorWeapons,U=root.WarData.U,P=root.WarSim.Game.prototype;
 const bounded=(v,max,fallback)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):fallback;
 P.operatorState=function(e){
  if(!e||e.kind!=='operator')return null;
  let s=e.operatorState;
  if(!s||!Array.isArray(s.slots)||!s.stash||typeof s.stash!=='object')s=e.operatorState={slots:[C.defaultPrimary,C.defaultSecondary],stash:{},activeSlot:0,reloadRemaining:0,reloadTotal:0};
  s.slots=[0,1].map(i=>C.byId[s.slots[i]]?s.slots[i]:i?C.defaultSecondary:C.defaultPrimary);
  s.activeSlot=s.activeSlot===1?1:0;
  for(const id of s.slots){const w=C.byId[id];if(!s.stash[id]||typeof s.stash[id]!=='object')s.stash[id]={};const a=s.stash[id];a.ammo=bounded(a.ammo,w.magazine,w.magazine);a.reserve=bounded(a.reserve,w.reserve,w.reserve);}
  s.reloadRemaining=Number.isFinite(s.reloadRemaining)?Math.max(0,Math.min(10,s.reloadRemaining)):0;
  s.reloadTotal=Number.isFinite(s.reloadTotal)?Math.max(0,Math.min(10,s.reloadTotal)):0;
  return s;
 };
 P.operatorActor=function(id){const e=this.get(id);return e?.hp>0&&e.team===0&&e.kind==='operator'&&this.directControl?.id===id&&!this.result?e:null;};
 P.operatorDomain=function(e){const d=U[e.kind];return d&&(d.modelKind||e.kind)==='infantry'?'personnel':d?.space?'space':d?.air?'air':d?.naval?'naval':'ground';};
 P.operatorWeapon=function(e){const s=this.operatorState(e);return s&&C.byId[s.slots[s.activeSlot]];};
 P.operatorCanTarget=function(e,target){return !!this.operatorWeapon(e)?.targets.includes(this.operatorDomain(target));};
 P.operatorStatus=function(id){const e=this.get(id),s=this.operatorState(e);if(!s)return null;
  const near=this.entities.some(b=>b.hp>0&&b.team===e.team&&['hq','barracks','refinery'].includes(b.kind)&&Math.hypot(b.x-e.x,b.y-e.y)<=b.r+180),needed=Object.entries(s.stash).some(([id,a])=>C.byId[id]&&(a.ammo<C.byId[id].magazine||a.reserve<C.byId[id].reserve));
  return{slots:s.slots.map(weaponId=>({weaponId,...s.stash[weaponId]})),activeSlot:s.activeSlot,reloadRemaining:s.reloadRemaining,reloadTotal:s.reloadTotal,canResupply:!!this.operatorActor(id)&&near&&needed&&this.canAfford(e.team,100),resupplyReason:!near?'需靠近己方指挥部、兵营或精炼厂':!needed?'弹药已满':!this.canAfford(e.team,100)?'补给需要100资金':'基地补给可用'};
 };
 P.operatorEquip=function(id,slot,weaponId){const e=this.operatorActor(id),w=C.byId[weaponId];if(!e||!w||![0,1].includes(slot)||e.disabled>this.time)return false;const s=this.operatorState(e);s.slots[slot]=weaponId;s.stash[weaponId]??={ammo:w.magazine,reserve:w.reserve};s.reloadRemaining=0;s.fireHeld=false;e.cool=Math.max(e.cool,.2);return true;};
 P.operatorSwitch=function(id,slot){const e=this.operatorActor(id);if(!e||![0,1].includes(slot)||e.disabled>this.time)return false;const s=this.operatorState(e);if(s.activeSlot===slot)return true;s.activeSlot=slot;s.reloadRemaining=0;s.fireHeld=false;e.cool=Math.max(e.cool,.2);return true;};
 P.operatorReload=function(id){const e=this.operatorActor(id);if(!e||e.disabled>this.time)return false;const s=this.operatorState(e),w=this.operatorWeapon(e),a=s.stash[w.id];if(s.reloadRemaining||a.ammo>=w.magazine||!a.reserve)return false;s.reloadRemaining=s.reloadTotal=w.reloadSeconds;return true;};
 P.operatorResupply=function(id){if(!this.operatorStatus(id)?.canResupply)return false;const e=this.operatorActor(id),s=this.operatorState(e);this.spend(e.team,100);for(const [id,a]of Object.entries(s.stash)){const w=C.byId[id];if(w){a.ammo=w.magazine;a.reserve=w.reserve;}}s.reloadRemaining=0;return true;};
 P.operatorAutoTick=function(e,dt){const s=this.operatorState(e),w=this.operatorWeapon(e),a=s.stash[w.id];if(s.reloadRemaining>0){s.reloadRemaining=Math.max(0,s.reloadRemaining-dt);if(!s.reloadRemaining){const n=Math.min(w.magazine-a.ammo,a.reserve);a.ammo+=n;a.reserve-=n;}}else if(a.ammo===0&&a.reserve>0)s.reloadRemaining=s.reloadTotal=w.reloadSeconds;};
 P.operatorAutoFire=function(e,target){const s=this.operatorState(e),w=this.operatorWeapon(e),a=s.stash[w.id];if(!target||!this.operatorCanTarget(e,target)||s.reloadRemaining||a.ammo<=0||e.cool>0)return false;a.ammo--;for(let n=0;n<w.pellets;n++){e.cool=0;this.emitShot(e,target,null,{...w,reload:w.fireInterval,rocket:w.category==='launcher'});}return true;};
 P.stepOperator=function(e,dt,input){
  const s=this.operatorState(e),w=this.operatorWeapon(e),a=s.stash[w.id],pending=this.directControl.firePending,pressed=!!pending||(!!input.fire&&!s.fireHeld);this.directControl.firePending=null;s.fireHeld=!!input.fire;if(pending)input=pending;
  if(s.reloadRemaining>0){s.reloadRemaining=Math.max(0,s.reloadRemaining-dt);if(!s.reloadRemaining){const n=Math.min(w.magazine-a.ammo,a.reserve);a.ammo+=n;a.reserve-=n;}return;}
  if(!input.fire||(!w.automatic&&!pressed)||e.cool>0||a.ammo<=0)return;
  const candidate=this.get(input.targetId),status=this.directFireStatus(e,candidate,input),range=status.range,valid=candidate&&status.inRange&&status.domainAllowed&&status.detected&&status.aimValid&&this.isEnemy(e.team,candidate.team);
  const ax=input.aimX-e.x,ay=input.aimY-e.y,az=input.aimHeight-this.entityAltitude(e),cross=U[candidate?.kind]?.space||input.aimHeight>=2000,len=Math.hypot(ax,ay,cross?0:az),factor=len>range?range/len:1;
  a.ammo--;e.target=valid?candidate.id:null;
  for(let n=0;n<w.pellets;n++){
   const angle=this.random()*Math.PI*2,spread=Math.sqrt(this.random())*w.spread*(input.ads?.45:1)*Math.min(len,range),ox=Math.cos(angle)*spread,oy=Math.sin(angle)*spread;
   const target=valid&&this.directAimValid(candidate,{aimX:input.aimX+ox,aimY:input.aimY+oy,aimHeight:input.aimHeight})?candidate:null;
   e.cool=0;
   this.emitShot(e,target,{x:e.x+ax*factor+ox,y:e.y+ay*factor+oy,height:cross?input.aimHeight:this.entityAltitude(e)+az*factor,targetTreeId:input.targetTreeId,fixedImpact:true},{...w,reload:w.fireInterval,rocket:w.category==='launcher'});
  }
  e.cool=w.fireInterval;
 };
})(globalThis);
