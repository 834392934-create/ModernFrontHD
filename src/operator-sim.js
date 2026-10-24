/* Original game-only operator combat. Simulation owns every ammunition transaction. */
(function(root){
 'use strict';
 if(!root.WarOperatorWeapons&&typeof require==='function')require('./operator-weapons.js');
 const C=root.WarOperatorWeapons,U=root.WarData.U,P=root.WarSim.Game.prototype;
 const bounded=(v,max,fallback)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):fallback;
 const unlimited=(g,e)=>e.team===0&&g.buffs.has('ammo');
 const projectileFamily=w=>w.category==='launcher'?'rocket':w.category;
 function event(g,e,s,type,phase){s.eventSequence=bounded(s.eventSequence,1e12,0)+1;s.events??=[];s.events.push({sequence:s.eventSequence,type,phase,weaponId:s.slots[s.activeSlot],sourceId:e.id,time:g.time});if(s.events.length>16)s.events.shift();}
 function sync(g,e,s,w){const r=s.reloadState,phase=r?.steps[r.index],remaining=s.reloadRemaining>0;s.action={time:g.time,weaponId:w.id,category:w.category,mechanism:w.mechanism,reloadStyle:w.reloadStyle,sequence:s.eventSequence||0,shotSequence:s.shotSequence||0,event:remaining?'reload':g.time-(s.shotTime??-1e6)<w.fireInterval?'fire':'idle',phase:remaining?(phase?.id||'reload'):'ready',progress:remaining?Math.max(0,Math.min(1,1-s.reloadRemaining/Math.max(.001,s.reloadTotal))):0,phaseProgress:remaining&&phase?Math.max(0,Math.min(1,r.elapsed/phase.duration)):0,reloadKind:s.reloadKind||null,fireMode:s.fireModes?.[w.id]||w.defaultFireMode,shotTime:s.shotTime??-1e6,ammo:s.stash[w.id].ammo};return s.action;}
 function cancel(s){s.reloadRemaining=0;s.reloadState=null;s.burstRemaining=0;s.burstInput=null;}
 function markDischarge(g,e,s,w,start){const shots=g.effects.slice(start).filter(x=>x.type==='shot'&&x.sourceId===e.id);if(!shots.length)return false;s.shotSequence=bounded(s.shotSequence,1e12,0)+1;s.shotTime=g.time;const dischargeId=e.id+':'+s.shotSequence;for(const shot of shots){shot.dischargeId=dischargeId;shot.operatorShotSequence=s.shotSequence;shot.weaponFamily=w.category;shot.weaponMechanism=w.mechanism;}event(g,e,s,'fire',w.mechanism);sync(g,e,s,w);return true;}
 function beginReload(g,e,s,w){const a=s.stash[w.id];if(s.reloadRemaining||a.ammo>=w.magazine||(!a.reserve&&!unlimited(g,e)))return false;const scale=e.team===0&&g.buffs.has('reload')?.25:1,available=unlimited(g,e)?w.magazine:a.reserve,steps=C.reloadPlan(w,a.ammo,available,scale);s.reloadKind=a.ammo?'tactical':'empty';s.reloadState={weaponId:w.id,index:0,elapsed:0,startAmmo:a.ammo,available,scale,steps};s.reloadRemaining=s.reloadTotal=steps.reduce((n,p)=>n+p.duration,0);s.burstRemaining=0;s.burstInput=null;event(g,e,s,'reload',steps[0].id);sync(g,e,s,w);return true;}
 function validState(e){
  const s=e?.operatorState;if(s===undefined||s===null)return true;if(e.kind!=='operator'||typeof s!=='object'||!Array.isArray(s.slots)||s.slots.length!==2||s.slots.some(id=>!C.byId[id])||![0,1].includes(s.activeSlot)||!s.stash||typeof s.stash!=='object'||Array.isArray(s.stash))return false;
  const entries=Object.entries(s.stash);if(entries.length>C.list.length||entries.some(([id,a])=>!C.byId[id]||!a||!Number.isInteger(a.ammo)||a.ammo<0||a.ammo>C.byId[id].magazine||!Number.isInteger(a.reserve)||a.reserve<0||a.reserve>C.byId[id].reserve))return false;
  if(s.slots.some(id=>!s.stash[id]))return false;
  if(s.fireModes!==undefined&&(!s.fireModes||typeof s.fireModes!=='object'||Array.isArray(s.fireModes)||Object.entries(s.fireModes).some(([id,mode])=>!C.byId[id]?.fireModes.includes(mode))))return false;
  if(['reloadRemaining','reloadTotal'].some(k=>s[k]!==undefined&&(!Number.isFinite(s[k])||s[k]<0||s[k]>60)))return false;
  if(['shotSequence','eventSequence','burstRemaining'].some(k=>s[k]!==undefined&&(!Number.isInteger(s[k])||s[k]<0||s[k]>(k==='burstRemaining'?3:1e12))))return false;
  if(s.shotTime!==undefined&&!Number.isFinite(s.shotTime))return false;
  if(s.events!==undefined&&(!Array.isArray(s.events)||s.events.length>16||s.events.some(x=>!x||!Number.isInteger(x.sequence)||x.sequence<1||!Number.isFinite(x.time)||!C.byId[x.weaponId]||x.sourceId!==e.id||!['fire','reload','ready','mode','dry'].includes(x.type))))return false;
  const r=s.reloadState;if(r&&s.reloadRemaining>0){const w=C.byId[r.weaponId];if(!w||r.weaponId!==s.slots[s.activeSlot]||!Number.isInteger(r.startAmmo)||r.startAmmo<0||r.startAmmo>=w.magazine||!Number.isInteger(r.available)||r.available<1||r.available>Math.max(w.reserve,w.magazine)||![1,.25].includes(r.scale)||!Array.isArray(r.steps)||!Number.isInteger(r.index)||!Number.isFinite(r.elapsed)||r.elapsed<0)return false;const expected=C.reloadPlan(w,r.startAmmo,r.available,r.scale);if(r.index<0||r.index>=expected.length||r.steps.length!==expected.length||r.steps.some((p,i)=>!p||p.id!==expected[i].id||p.transfer!==expected[i].transfer||p.duration!==expected[i].duration)||r.elapsed>expected[r.index].duration)return false;const total=expected.reduce((n,p)=>n+p.duration,0),remaining=expected.slice(r.index).reduce((n,p)=>n+p.duration,0)-r.elapsed;if(Math.abs(total-s.reloadTotal)>1e-5||Math.abs(remaining-s.reloadRemaining)>1e-5)return false;}
  return true;
 }
 function tickReload(g,e,s,w,dt){
  if(!s.reloadRemaining){s.reloadState=null;sync(g,e,s,w);return false;}
  if(!s.reloadState||s.reloadState.weaponId!==w.id){cancel(s);sync(g,e,s,w);return false;}
  let left=Math.max(0,Number(dt)||0);const r=s.reloadState,a=s.stash[w.id];
  while(left>1e-9&&r.index<r.steps.length){const phase=r.steps[r.index],amount=Math.min(left,phase.duration-r.elapsed);r.elapsed+=amount;left-=amount;s.reloadRemaining=Math.max(0,s.reloadRemaining-amount);if(r.elapsed+1e-8<phase.duration)break;
   if(phase.transfer){const need=phase.transfer==='one'?Math.min(1,w.magazine-a.ammo):w.magazine-a.ammo,n=Math.min(need,unlimited(g,e)?need:a.reserve);a.ammo+=n;if(!unlimited(g,e))a.reserve-=n;}
   r.index++;r.elapsed=0;if(r.index<r.steps.length)event(g,e,s,'reload',r.steps[r.index].id);
  }
  if(r.index>=r.steps.length){s.reloadRemaining=0;s.reloadState=null;event(g,e,s,'ready','ready');}
  sync(g,e,s,w);return true;
 }
 P.operatorState=function(e){
  if(!e||e.kind!=='operator')return null;
  let s=e.operatorState;
  if(!s||!Array.isArray(s.slots)||!s.stash||typeof s.stash!=='object')s=e.operatorState={slots:[C.defaultPrimary,C.defaultSecondary],stash:{},activeSlot:0,reloadRemaining:0,reloadTotal:0};
  s.slots=[0,1].map(i=>C.byId[s.slots[i]]?s.slots[i]:i?C.defaultSecondary:C.defaultPrimary);
  s.activeSlot=s.activeSlot===1?1:0;
  for(const id of s.slots){const w=C.byId[id];if(!s.stash[id]||typeof s.stash[id]!=='object')s.stash[id]={};const a=s.stash[id];a.ammo=bounded(a.ammo,w.magazine,w.magazine);a.reserve=bounded(a.reserve,w.reserve,w.reserve);}
  s.reloadRemaining=Number.isFinite(s.reloadRemaining)?Math.max(0,Math.min(60,s.reloadRemaining)):0;
  s.reloadTotal=Number.isFinite(s.reloadTotal)?Math.max(0,Math.min(60,s.reloadTotal)):0;
  if(!s.fireModes||typeof s.fireModes!=='object'||Array.isArray(s.fireModes))s.fireModes={};for(const id of s.slots)if(!C.byId[id].fireModes.includes(s.fireModes[id]))s.fireModes[id]=C.byId[id].defaultFireMode;
  if(this.directControl?.id!==e.id||e.disabled>this.time){s.burstRemaining=0;s.burstInput=null;}
  if(!s.reloadRemaining)s.reloadState=null;
  else if(!s.reloadState){s.reloadRemaining=0;beginReload(this,e,s,C.byId[s.slots[s.activeSlot]]);}
  return s;
 };
 P.operatorActor=function(id){const e=this.get(id);return e?.hp>0&&!['downed','dead'].includes(e.components?.state)&&e.team===0&&e.kind==='operator'&&this.directControl?.id===id&&!this.result?e:null;};
 P.operatorDomain=function(e){const d=U[e.kind];return d&&(d.modelKind||e.kind)==='infantry'?'personnel':d?.space?'space':d?.air?'air':d?.naval?'naval':'ground';};
 P.operatorWeapon=function(e){const s=this.operatorState(e);return s&&C.byId[s.slots[s.activeSlot]];};
 P.operatorCanTarget=function(e,target){return !!this.operatorWeapon(e)?.targets.includes(this.operatorDomain(target));};
 P.operatorValidateState=validState;
 P.operatorStatus=function(id){const e=this.get(id),s=this.operatorState(e);if(!s)return null;
  const near=this.entities.some(b=>b.hp>0&&b.team===e.team&&['hq','barracks','refinery'].includes(b.kind)&&Math.hypot(b.x-e.x,b.y-e.y)<=b.r+180),needed=Object.entries(s.stash).some(([id,a])=>C.byId[id]&&(a.ammo<C.byId[id].magazine||a.reserve<C.byId[id].reserve));
  const w=C.byId[s.slots[s.activeSlot]],action=sync(this,e,s,w);
  return{slots:s.slots.map(weaponId=>({weaponId,...s.stash[weaponId]})),activeSlot:s.activeSlot,reloadRemaining:s.reloadRemaining,reloadTotal:s.reloadTotal,action:{...action,events:(s.events||[]).slice()},fireMode:action.fireMode,fireModes:w.fireModes,unlimitedAmmo:unlimited(this,e),quickReload:e.team===0&&this.buffs.has('reload'),canResupply:!!this.operatorActor(id)&&near&&needed&&this.canAfford(e.team,100),resupplyReason:!near?'需靠近己方指挥部、兵营或精炼厂':!needed?'弹药已满':!this.canAfford(e.team,100)?'补给需要100资金':'基地补给可用'};
 };
 P.operatorEquip=function(id,slot,weaponId){const e=this.operatorActor(id),w=C.byId[weaponId];if(!e||!w||![0,1].includes(slot)||e.disabled>this.time)return false;const s=this.operatorState(e);s.slots[slot]=weaponId;s.stash[weaponId]??={ammo:w.magazine,reserve:w.reserve};cancel(s);s.fireHeld=false;e.cool=Math.max(e.cool,.2);sync(this,e,s,this.operatorWeapon(e));return true;};
 P.operatorSwitch=function(id,slot){const e=this.operatorActor(id);if(!e||![0,1].includes(slot)||e.disabled>this.time)return false;const s=this.operatorState(e);if(s.activeSlot===slot)return true;s.activeSlot=slot;cancel(s);s.fireHeld=false;e.cool=Math.max(e.cool,.2);sync(this,e,s,this.operatorWeapon(e));return true;};
 P.operatorReload=function(id){const e=this.operatorActor(id);if(!e||e.disabled>this.time)return false;return beginReload(this,e,this.operatorState(e),this.operatorWeapon(e));};
 P.operatorSetFireMode=function(id,mode){const e=this.operatorActor(id);if(!e||e.disabled>this.time)return false;const s=this.operatorState(e),w=this.operatorWeapon(e);if(!w.fireModes.includes(mode))return false;s.fireModes[w.id]=mode;this.operatorCancelTrigger(id);event(this,e,s,'mode',mode);sync(this,e,s,w);return true;};
 P.operatorCycleFireMode=function(id){const e=this.operatorActor(id);if(!e)return false;const s=this.operatorState(e),w=this.operatorWeapon(e);return this.operatorSetFireMode(id,w.fireModes[(w.fireModes.indexOf(s.fireModes[w.id])+1)%w.fireModes.length]);};
 P.operatorCancelTrigger=function(id){const e=this.get(id),s=e?.operatorState;if(!s)return false;s.burstRemaining=0;s.burstInput=null;s.fireHeld=false;if(this.directControl?.id===id)this.directControl.firePending=null;return true;};
 P.operatorCancelAction=function(id){const e=this.get(id),s=e?.operatorState;if(!s||e.kind!=='operator')return false;cancel(s);this.operatorCancelTrigger(id);sync(this,e,s,this.operatorWeapon(e));return true;};
 P.operatorResupply=function(id){if(!this.operatorStatus(id)?.canResupply)return false;const e=this.operatorActor(id),s=this.operatorState(e);this.spend(e.team,100);for(const [id,a]of Object.entries(s.stash)){const w=C.byId[id];if(w){a.ammo=w.magazine;a.reserve=w.reserve;}}cancel(s);sync(this,e,s,this.operatorWeapon(e));return true;};
 P.operatorAutoTick=function(e,dt){const s=this.operatorState(e),w=this.operatorWeapon(e),a=s.stash[w.id];if(e.hp<=0||e.disabled>this.time||['downed','dead'].includes(e.components?.state)){cancel(s);sync(this,e,s,w);return;}if(s.reloadRemaining>0)tickReload(this,e,s,w,dt);else if(a.ammo===0)beginReload(this,e,s,w);else sync(this,e,s,w);};
 P.operatorAutoFire=function(e,target){const s=this.operatorState(e),w=this.operatorWeapon(e),a=s.stash[w.id];if(!target||!this.operatorCanTarget(e,target)||s.reloadRemaining||a.ammo<=0||e.cool>0||e.hp<=0||e.components?.state==='downed')return false;const start=this.effects.length;for(let n=0;n<w.pellets;n++){e.cool=0;this.emitShot(e,target,null,{...w,family:projectileFamily(w),reload:w.fireInterval,rocket:w.category==='launcher',weaponFx:w.category==='grenade'?'grenade':undefined});}if(!markDischarge(this,e,s,w,start))return false;a.ammo--;sync(this,e,s,w);return true;};
 P.stepOperator=function(e,dt,input){
  const s=this.operatorState(e),w=this.operatorWeapon(e),a=s.stash[w.id],pending=this.directControl.firePending,pressed=!!pending||(!!input.fire&&!s.fireHeld);this.directControl.firePending=null;s.fireHeld=!!input.fire;if(pending)input=pending;
  if(e.hp<=0||e.disabled>this.time||e.components?.state==='downed'){this.operatorCancelTrigger(e.id);return;}
  if(s.reloadRemaining>0){if(w.reloadStyle==='shell'&&pressed&&a.ammo>0){cancel(s);e.cool=Math.max(e.cool,.15);event(this,e,s,'ready','ready');}else{tickReload(this,e,s,w,dt);return;}}
  const mode=s.fireModes[w.id];if(mode==='burst'&&pressed&&!s.burstRemaining){s.burstRemaining=w.burstCount;s.burstInput={...input};}
  const wants=mode==='burst'?s.burstRemaining>0:mode==='auto'?input.fire:input.fire&&pressed;
  if(!wants||e.cool>0){sync(this,e,s,w);return;}
  if(a.ammo<=0){if(pressed)event(this,e,s,'dry','empty');s.burstRemaining=0;s.burstInput=null;sync(this,e,s,w);return;}
  if(mode==='burst'&&!input.fire)input=s.burstInput;
  const candidate=this.get(input.targetId),status=this.directFireStatus(e,candidate,input),range=status.range,valid=candidate&&!input.aimBlocked&&status.inRange&&status.domainAllowed&&status.detected&&status.aimValid&&this.isEnemy(e.team,candidate.team);
  const point=this.directShotPoint(e,input,valid?candidate:null,range),len=point.distance;
  e.target=valid?candidate.id:null;const start=this.effects.length;
  for(let n=0;n<w.pellets;n++){
   const angle=this.random()*Math.PI*2,spread=Math.sqrt(this.random())*w.spread*(input.ads?.45:1)*Math.min(len,range),ox=Math.cos(angle)*spread,oy=Math.sin(angle)*spread;
   const target=valid&&this.directAimValid(candidate,{aimX:input.aimX+ox,aimY:input.aimY+oy,aimHeight:input.aimHeight})?candidate:null;
   e.cool=0;
   // A dispersed miss still belongs to the same real cross-layer engagement;
   // losing the hit must not pull its visual endpoint back down near the shooter.
   const scattered=this.directShotPoint(e,{aimOrigin:point.origin,aimX:point.x+ox,aimY:point.y+oy,aimHeight:point.height},valid?candidate:null,range);
   this.emitShot(e,target,{...scattered,targetTreeId:input.targetTreeId,excludedTargetId:candidate&&!target?candidate.id:null,fixedImpact:true},{...w,family:projectileFamily(w),reload:w.fireInterval,rocket:w.category==='launcher',weaponFx:w.category==='grenade'?'grenade':undefined});
  }
  e.cool=w.fireInterval;
  if(markDischarge(this,e,s,w,start)){a.ammo--;if(mode==='burst'){s.burstRemaining--;if(!s.burstRemaining)s.burstInput=null;}sync(this,e,s,w);}
 };
 root.WarOperatorCombat=Object.freeze({validate:validState,version:2});
})(globalThis);
