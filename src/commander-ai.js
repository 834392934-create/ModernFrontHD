/* Explicit player commander ownership. Decision logic remains in Game.ai.
 * Presentation, combat outcomes and enemy difficulty are not changed here. */
(function(root){
 'use strict';
 const MAX_IDS=1000,defaults=()=>({schema:1,enabled:false,manualIds:[],aiOrderIds:[]});
 const unit=e=>!!e&&e.hp>0&&e.team===0&&!e.structure&&!!root.WarData?.U?.[e.kind];
 function initialize(g){if(!g.commanderAI)g.commanderAI=defaults();return g.commanderAI;}
 function identities(g){const found=new Map(),seen=new Set(),pending=[...(g?.entities||[])];while(pending.length&&seen.size<MAX_IDS*2){const e=pending.pop();if(!e||seen.has(e))continue;seen.add(e);if(unit(e))found.set(e.id,e);if(e.hp>0){if(e.vehicleCrew)pending.push(e.vehicleCrew);if(Array.isArray(e.passengers))pending.push(...e.passengers);}}return found;}
 // Recycle casualty history only at the bound; regular commands need no world
 // traversal, and living nested crew/passengers retain their ownership.
 function compact(g,s){const living=identities(g);s.manualIds=s.manualIds.filter(id=>living.has(id));const manual=new Set(s.manualIds);s.aiOrderIds=s.aiOrderIds.filter(id=>living.has(id)&&!manual.has(id));}
 function eligible(g,e){if(!e||e.hp<=0||e.id===g.directControl?.id)return false;if(e.team!==0)return true;const s=initialize(g);return !s.enabled||!s.manualIds.includes(e.id);}
 function markManual(g,ids){const s=initialize(g),accepted=[];if(s.manualIds.length>=MAX_IDS||s.aiOrderIds.length>=MAX_IDS)compact(g,s);for(const id of new Set(ids||[])){const e=g.get?.(id);if(!unit(e))continue;if(!s.manualIds.includes(id)&&s.manualIds.length<MAX_IDS)s.manualIds.push(id);s.aiOrderIds=s.aiOrderIds.filter(n=>n!==id);delete e.protectionRole;accepted.push(id);}return accepted;}
 function markOrders(g,ids,isAI){if(!isAI)return markManual(g,ids);const s=initialize(g),accepted=[];if(!s.enabled)return accepted;if(s.manualIds.length>=MAX_IDS||s.aiOrderIds.length>=MAX_IDS)compact(g,s);for(const id of new Set(ids||[])){const e=g.get?.(id);if(!unit(e)||!eligible(g,e))continue;if(!s.aiOrderIds.includes(id)&&s.aiOrderIds.length<MAX_IDS)s.aiOrderIds.push(id);accepted.push(id);}return accepted;}
 function cancelOrder(g,e){
  root.WarWeaponSalvos?.cancel(g,e,'commander-disabled');root.WarCombatReadiness?.cancelBurst(e);
  // Mandatory fuel/ammunition returns continue; an old AI destination must not
  // resume after service. Other aircraft loiter at their current safe location.
  if(e.flight?.returning)e.flight.resume=null;else root.WarAircraftFlight?.stop(g,e);
  e.order=null;e.orderQueue=[];e.path=[];e.target=null;e.repath=0;e.retreating=false;e.manualMove=false;
  delete e.protectionRole;e.crowdProgress=null;e.crowdWaiting=null;e.crowdDetourUntil=0;g._crowdReplans?.delete(e.id);
  if(!root.WarData?.U?.[e.kind]?.air)root.WarVehicleMotion?.stop(e);
 }
 function setEnabled(g,value){
  if(typeof value!=='boolean'||value&&(g.result||!g.teams?.[0]?.alive))return false;
  const s=initialize(g);if(s.enabled===value)return true;s.enabled=value;
  if(value){s.manualIds=[];s.aiOrderIds=[];g.teams[0].aiClock=0;}
  else{for(const id of s.aiOrderIds){const e=g.get?.(id);if(unit(e)&&e.id!==g.directControl?.id&&!s.manualIds.includes(id))cancelOrder(g,e);}s.aiOrderIds=[];}
  return true;
 }
 function run(g,t,dt){
  if(t?.id!==0||!t.alive||g.result||!Number.isFinite(dt)||dt<=0||(!initialize(g).enabled&&!g.directControl))return false;
  const own=Object.prototype.hasOwnProperty.call(g,'_commanderAIContext'),previous=g._commanderAIContext;g._commanderAIContext=true;
  try{g.ai(t,Math.min(dt,.1));}finally{if(own)g._commanderAIContext=previous;else delete g._commanderAIContext;}
  return true;
 }
 function observed(g,e){if(!e||e.hp<=0||!g.isEnemy(0,e.team))return false;if(typeof g.entityVisible==='function')return !!g.entityVisible(0,e);return !!g.canDetect(0,e)&&(!!root.WarData?.U?.[e.kind]?.underwater||!!g.visibleAt(e.x,e.y));}
 function validate(s,g){
  if(s===undefined)return true;if(!s||typeof s!=='object'||Array.isArray(s)||s.schema!==1||typeof s.enabled!=='boolean')return false;
  for(const key of ['manualIds','aiOrderIds'])if(!Array.isArray(s[key])||s[key].length>MAX_IDS||s[key].some(id=>!Number.isSafeInteger(id)||id<1)||new Set(s[key]).size!==s[key].length)return false;
  if(s.manualIds.some(id=>s.aiOrderIds.includes(id))||!s.enabled&&s.aiOrderIds.length)return false;
  if(g){const living=identities(g);if([...s.manualIds,...s.aiOrderIds].some(id=>!living.has(id)))return false;}
  return true;
 }
 function save(g){const s=initialize(g),living=identities(g),manualIds=s.manualIds.filter(id=>living.has(id)),manual=new Set(manualIds);return {schema:1,enabled:s.enabled,manualIds,aiOrderIds:s.enabled?s.aiOrderIds.filter(id=>living.has(id)&&!manual.has(id)):[]};}
 function load(g,s){if(!validate(s,g))throw Error('总指挥 AI 存档无效');g.commanderAI=s===undefined?defaults():{schema:1,enabled:s.enabled,manualIds:s.manualIds.slice(),aiOrderIds:s.aiOrderIds.slice()};delete g._commanderAIContext;return g.commanderAI;}
 const api={initialize,setEnabled,eligible,markManual,markOrders,run,observed,save,validate,load};root.WarCommanderAI=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
