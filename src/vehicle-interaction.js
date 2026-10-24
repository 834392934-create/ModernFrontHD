/* Crew transactions: one live person is either on the battlefield or inside one vehicle. */
(function(root){
 'use strict';
 const P=root.WarSim.Game.prototype,{U,W,H}=root.WarData;
 const personnel=e=>!!e&&!!U[e.kind]&&(U[e.kind].modelKind||e.kind)==='infantry';
 const vehicle=e=>!!e&&!e.structure&&!!U[e.kind]&&!personnel(e);
 const incapacitated=e=>!e||root.WarCombatDamage?.incapacitated(e)||e.hp<=0;
 const finite=Number.isFinite;
 function idle(game,e){game.resetJump(e);e.order=null;e.orderQueue=[];e.path=[];e.target=null;e.manualMove=false;e.retreating=false;delete e.protectionRole;delete e.crowdSteer;delete e.crowdRouteOrder;e.crowdProgress=null;e.crowdWaiting=null;if(e.operatorState){e.operatorState.reloadRemaining=0;e.operatorState.fireHeld=false;}}
 function stow(game,body,crew){
  if(crew.kind==='operator')game.operatorState?.(crew);
  idle(game,crew);crew.embarkedIn=body.id;body.vehicleCrew=crew;body.vehicleDriverId=crew.id;body.vehicleDriverIssued=true;
  game.entities=game.entities.filter(e=>e.id!==crew.id);
 }
 P.vehiclePrepareDirect=function(id){
  const body=this.get(id);this.vehicleInteractionMessage='';
  if(!body||body.team!==0||this.result||incapacitated(body))return false;
  if(!vehicle(body))return !!body;
  if(body.vehicleCrew?.hp>0){if(incapacitated(body.vehicleCrew)){this.vehicleInteractionMessage='驾驶员失去行动能力，无法驾驶';return false;}return true;}
  let crew=this.get(body.vehicleDriverId);
  if(!personnel(crew)||crew.team!==body.team||incapacitated(crew))crew=null;
  crew??=this.entities.filter(e=>e.kind==='operator'&&e.team===body.team&&!incapacitated(e)&&!(e.disabled>this.time)).sort((a,b)=>Math.hypot(a.x-body.x,a.y-body.y)-Math.hypot(b.x-body.x,b.y-body.y)||a.id-b.id)[0];
  if(!crew){
   if(body.vehicleDriverIssued||body.vehicleDriverId!==undefined){this.vehicleInteractionMessage='原驾驶员已失去联系：请使用现有人员靠近并按 F 登乘';return false;}
   crew=this.spawn(body.team,'operator',body.x,body.y);body.vehicleDriverIssued=true;this.operatorState?.(crew);
  }
  stow(this,body,crew);return true;
 };
 P.vehicleNearby=function(id){
  const crew=this.get(id);if(!personnel(crew)||incapacitated(crew))return null;
  return this.entities.filter(e=>vehicle(e)&&!incapacitated(e)&&e.team===crew.team&&!e.vehicleCrew&&!(e.disabled>this.time)&&Math.abs(this.entityAltitude(e)-this.entityAltitude(crew))<=45&&Math.hypot(e.x-crew.x,e.y-crew.y)<=this.navigationRadius(e)+this.navigationRadius(crew)+35)
   .sort((a,b)=>Math.hypot(a.x-crew.x,a.y-crew.y)-Math.hypot(b.x-crew.x,b.y-crew.y)||a.id-b.id)[0]||null;
 };
 P.vehicleExitPoint=function(body,crew){
  const actor={...crew,angle:body.angle||0,altitude:0,jumpHeight:0},r=this.navigationRadius(actor);
  const trees=root.WarTrees?.liveColliders(this)||this.directObstacles||[];
  let attempts=0;
  const free=(x,y)=>{
   attempts++;if(x<r||y<r||x>W-r||y>H-r||!root.WarNavigationFootprints.terrain(this,actor,x,y))return false;
   if(this.ore.some(o=>Math.hypot(x-o.x,y-o.y)<r+52))return false;
   if(trees.some(o=>Math.hypot(x-o.x,y-o.y)<r+o.r+3))return false;
   if(this.entities.some(o=>o.hp>0&&o.id!==crew.id&&this.navigationLayer(actor,o)&&Math.hypot(x-o.x,y-o.y)<r+(o.structure?o.r:this.navigationRadius(o))+8))return false;
   return true;
  };
  // 144 local samples, then at most five friendly base rings (480 samples).
  const near=this.navigationRadius(body)+r+12;
  for(let ring=0;ring<9;ring++)for(let i=0;i<16;i++){
   const angle=(body.angle||0)+Math.PI/2+i*Math.PI/8,dist=near+ring*32,x=body.x+Math.cos(angle)*dist,y=body.y+Math.sin(angle)*dist;
   if(free(x,y))return{x,y,attempts,emergency:!!(U[body.kind].air||U[body.kind].naval||ring>2)};
  }
  const bases=this.entities.filter(e=>e.hp>0&&e.team===body.team&&['hq','barracks','refinery'].includes(e.kind)).sort((a,b)=>Math.hypot(a.x-body.x,a.y-body.y)-Math.hypot(b.x-body.x,b.y-body.y)||a.id-b.id).slice(0,5);
  for(const base of bases)for(let ring=0;ring<6;ring++)for(let i=0;i<16;i++){
   const angle=i*Math.PI/8,dist=base.r+r+16+ring*40,x=base.x+Math.cos(angle)*dist,y=base.y+Math.sin(angle)*dist;
   if(free(x,y))return{x,y,attempts,emergency:true};
  }
  return null;
 };
 P.vehicleInteractionHint=function(id){
  const actor=this.get(id);if(!actor)return'';
  if(personnel(actor)){const body=this.vehicleNearby(id);return body?'F 登乘附近己方载具':'靠近己方空载具 · F 登乘';}
  return vehicle(actor)?'F 离舱返回人员 · 海空天使用游戏安全落点':'';
 };
 P.vehicleInteract=function(id){
  const actor=this.get(id),fail=message=>({ok:false,message});
  if(!actor||actor.team!==0||this.result||this.directControl?.id!==id)return fail('只能操作当前驾驶的存活己方单位');
  if(incapacitated(actor))return fail('当前人员或载具失去行动能力，无法上下车');
  if(actor.disabled>this.time)return fail('EMP 停机期间暂时无法上下车');
  if(personnel(actor)){
   const body=this.vehicleNearby(id);if(!body)return fail('附近没有可登乘的己方空载具；请靠近地面或低空载具');
   this.endDirectControl();stow(this,body,actor);
   if(!this.beginDirectControl(body.id)){delete body.vehicleCrew;delete actor.embarkedIn;this.entities.push(actor);this.beginDirectControl(actor.id);return fail('登乘失败，已保持人员控制');}
   return{ok:true,id:body.id,crewId:actor.id,emergency:false,message:'已登乘 · F 离舱返回同一名人员'};
  }
  if(!vehicle(actor)||!actor.vehicleCrew?.hp)return fail('载具没有可离舱的存活驾驶员');
  const crew=actor.vehicleCrew,point=this.vehicleExitPoint(actor,crew);
  if(!point)return fail('周围及己方基地均无安全落点，暂时留在载具内');
  this.endDirectControl();delete actor.vehicleCrew;delete crew.embarkedIn;idle(this,crew);
  crew.x=point.x;crew.y=point.y;crew.angle=actor.angle||0;crew.altitude=0;crew.pitch=0;crew.roll=0;crew.flightSpeed=0;this.entities.push(crew);
  if(!this.beginDirectControl(crew.id)){this.entities=this.entities.filter(e=>e.id!==crew.id);stow(this,actor,crew);this.beginDirectControl(actor.id);return fail('离舱失败，已恢复载具控制');}
  return{ok:true,id:crew.id,crewId:crew.id,emergency:point.emergency,message:point.emergency?'紧急离舱：游戏救生转移至安全陆地，继续人员第一人称':'已下车 · 生命与随身弹药保持不变'};
 };
 P.vehicleDestroyed=function(body,from){
  const crew=body?.vehicleCrew;if(!crew)return;
  if(crew.hp>0){crew.hp=0;this.teams[crew.team].lost++;if(this.teams[from])this.teams[from].kills++;}
  delete body.vehicleCrew;
 };
 P.validateVehicleCrews=function(){
  const ids=new Set(this.entities.map(e=>e.id));
  for(const body of this.entities){
   if(body.vehicleDriverId!==undefined&&(!Number.isInteger(body.vehicleDriverId)||body.vehicleDriverId<1||body.vehicleDriverId>=this.nextId))throw Error('驾驶员关联标识无效');
   if(body.vehicleDriverIssued!==undefined&&typeof body.vehicleDriverIssued!=='boolean')throw Error('驾驶员记录无效');
   const crew=body.vehicleCrew;if(!crew)continue;
   if(!vehicle(body)||body.team!==0||!personnel(crew)||crew.team!==body.team||crew.structure||!Number.isInteger(crew.id)||crew.id<1||crew.id>=this.nextId||ids.has(crew.id)||crew.embarkedIn!==body.id||body.vehicleDriverId!==crew.id||crew.vehicleCrew||!finite(crew.hp)||!finite(crew.maxHp)||crew.hp<=0||crew.maxHp<=0||crew.hp>crew.maxHp||!finite(crew.x)||!finite(crew.y)||crew.x<0||crew.x>W||crew.y<0||crew.y>H||['altitude','pitch','roll','angle','cool','disabled'].some(k=>!finite(crew[k])))throw Error('乘员存档数据无效');
   if(incapacitated(crew)||root.WarCombatDamage&&!root.WarCombatDamage.validate(crew)||root.WarCombatReadiness&&!root.WarCombatReadiness.validate(crew,this)||root.WarOperatorCombat&&!root.WarOperatorCombat.validate(crew))throw Error('乘员战斗状态无效');
   ids.add(crew.id);crew.r=U[crew.kind].r;idle(this,crew);
   if(crew.kind==='operator'){
    const s=crew.operatorState,C=root.WarOperatorWeapons;
    if(!s||!Array.isArray(s.slots)||s.slots.length!==2||s.slots.some(id=>!C.byId[id])||!s.stash||typeof s.stash!=='object'||Object.entries(s.stash).some(([id,a])=>!C.byId[id]||!a||!Number.isInteger(a.ammo)||!Number.isInteger(a.reserve)||a.ammo<0||a.reserve<0||a.ammo>C.byId[id].magazine||a.reserve>C.byId[id].reserve)||s.slots.some(id=>!s.stash[id]))throw Error('乘员弹药存档数据无效');
    this.operatorState(crew);
   }
  }
  return true;
 };
 root.WarVehicleInteraction={personnel,vehicle};
})(globalThis);
