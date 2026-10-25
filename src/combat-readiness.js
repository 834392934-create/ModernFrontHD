/* Deterministic, game-scale ammunition and mount readiness. No certified loadouts. */
(function(root){
 'use strict';
 const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
 const families={
  rifle:[30,120,2.5],machinegun:[60,240,4],sniper:[5,25,3.4],shotgun:[8,32,3],autocannon:[24,96,5],cannon:[1,24,2.8],howitzer:[1,16,5],mortar:[1,20,3],navalGun:[6,48,7],rocket:[8,24,9],missile:[4,12,8],torpedo:[2,8,8],bomb:[4,0,8],beam:[8,32,5],pulse:[20,80,5]};
 const phases=new Set(['ready','setup','reload','pack']);
 const games=new WeakMap();
 function cache(g){let c=games.get(g);if(!c){c={profiles:new WeakMap(),weapons:new Map()};games.set(g,c);}return c;}
 function data(e){return root.WarData?.U[e?.kind]||root.WarData?.B[e?.kind]||{};}
 function personnel(e){return (data(e).modelKind||e?.kind)==='infantry';}
 function supported(e){return !!e&&e.kind!=='operator';}
 function family(e,w){if(w?.family||w?.weaponFamily)return w.family||w.weaponFamily;const d=data(e);return d.weaponFx==='torpedo'?'torpedo':d.beam?'beam':d.rocket||d.onlyAir?'missile':e.kind==='sniper_team'?'sniper':e.kind==='machinegun_team'?'machinegun':e.kind==='mortar_team'?'mortar':personnel(e)?'rifle':e.structure?'autocannon':'cannon';}
 function weapons(g,e){
  if(!supported(e))return [];
  const V=root.WarVehicleWeapons;
  if(V?.supported(e))return V.list(e,g.teams[e.team]?.faction);
  const d=data(e),c=cache(g),previous=c.weapons.get(e.kind);if(previous?.data===d)return previous.list;
  const list=d.damage>0?[{...d,id:e.kind+':primary',stationId:'primary',family:family(e,d),action:'fire',targetDomains:d.targetDomains||null}]:[];c.weapons.set(e.kind,{data:d,list});return list;
 }
 function profile(g,e,w){
  w=w?.vehicleWeapon||w||weapons(g,e)[0];if(!w||w.action==='airWing'||w.weaponAction==='airWing'||!(w.damage>0))return null;
  const store=cache(g).profiles,config=g.options?.weaponSalvos,faction=g.teams[e.team]?.faction,key=e.kind+':'+faction,cached=store.get(w);if(cached?.key===key&&cached.config===config)return cached.value;
  const d=data(e),f=family(e,w),defaults=families[f]||families.cannon,m=w.mechanics||{},id=w.id||w.weaponId||e.kind+':primary';
  const air=!!d.air&&!d.space,artillery=['howitzer','mortar'].includes(f)||f==='rocket'&&!air;
  let magazine=defaults[0],reserve=defaults[1];
  if(f==='rocket'&&!air){magazine=root.WarWeaponSalvos?.profile(g,e)?.count||magazine;reserve=magazine*3;}
  if(air){if(['missile','rocket','bomb','torpedo'].includes(f))magazine=f==='rocket'?12:4;reserve=0;}
  const integer=(value,fallback,max=10000)=>finite(value)?clamp(Math.floor(value),0,max):fallback;
  magazine=Math.max(1,integer(m.magazine??w.magazine??(w.payloadSlots||undefined),magazine));reserve=air?0:integer(m.reserve??w.reserve,reserve);
  const num=(value,fallback,min,max)=>finite(value)?clamp(value,min,max):fallback;
  const raw=w.mount||{},mode=raw.mode||(air?'hull':d.space||(['missile','beam','pulse'].includes(f)&&(d.naval||e.structure&&(w.targetDomains||d.targetDomains||[]).includes('space')))?'vertical':'turret');
  const mountId=w.mountId||(mode==='hull'?'hull':mode==='vertical'?id:'main_turret');
  const mount={mode,yawRate:num(raw.yawRate??raw.rate,2.4,.02,20),pitchRate:num(raw.pitchRate,1.5,.02,20),
   yawMin:num(raw.yawMin,-Math.PI,-Math.PI,0),yawMax:num(raw.yawMax,Math.PI,0,Math.PI),
   minPitch:num(raw.minPitch??raw.pitchMin,mode==='vertical'?-Math.PI/2:-.3,-Math.PI/2,Math.PI/2),maxPitch:num(raw.maxPitch??raw.pitchMax,mode==='vertical'?Math.PI/2:1.25,-Math.PI/2,Math.PI/2),
   arc:num(raw.arc,mode==='hull'?1.05:Math.PI,.02,Math.PI),tolerance:num(raw.tolerance,.10,.01,.8),pitchTolerance:num(raw.pitchTolerance,.12,.01,.8),selfOcclusion:raw.selfOcclusion!==false};
  const value={...w,id,family:f,mountId,mount,ammoType:w.ammoType||f,magazine,reserve,
   fireInterval:num(m.fireInterval??w.fireInterval,w.reload||d.reload||1,.03,60),reloadSeconds:num(m.reloadSeconds??w.reloadSeconds,defaults[2],.05,120),
   setupSeconds:num(m.setupSeconds,artillery?1.4:0,0,20),packSeconds:num(m.packSeconds,artillery?1:0,0,20),
   moveFactor:num(m.moveFactor,artillery?0:1,0,1),supplyCost:num(m.supplyCost,.7+Math.max(0,w.damage||d.damage||0)*.018,.1,10000),
   supplyRate:num(m.supplyRate,Math.max(1,magazine/3),.1,200),reloadKind:m.reloadKind||(f==='rocket'?'rack':f==='missile'||f==='torpedo'?'tube':f==='cannon'||f==='howitzer'||f==='mortar'?'single':'magazine'),
   burst:w.burst||{count:1,interval:.1},aircraft:air,artillery,parameterBasis:'gameplay-estimate'};
  const entry={key,config,value};store.set(w,entry);store.set(value,entry);return value;
 }
 function ensure(g,e){
  if(!supported(e))return null;
  if(!e.combat)e.combat={schema:1,mounts:{},stations:{},phase:'ready',activeId:null,supply:null};
  const c=e.combat;
  for(const w of weapons(g,e)){const p=profile(g,e,w);if(!p)continue;
   c.stations[p.id]??={ammo:p.magazine,reserve:p.reserve,cooldown:0,reloadRemaining:0,reloadTotal:0,phase:'ready',phaseAt:g.time,phaseUntil:g.time,nextPort:0,shotSerial:0,lastShotAt:-1,setupReady:false};
   c.mounts[p.mountId]??={yaw:finite(e.turret)?e.turret:e.angle||0,pitch:0,targetId:null,targetProjectileId:null,cooldown:0};
  }
  return c;
 }
 function infinite(g,e){return e.team===0&&g.buffs?.has('ammo');}
 function reloadScale(g,e){return e.team===0&&g.buffs?.has('reload')?.25:1;}
 function chamber(p){return ['cannon','howitzer','mortar','navalGun'].includes(p.family);}
 function station(g,e,w){const p=profile(g,e,w),c=ensure(g,e);return p&&c?{p,c,s:c.stations[p.id]}:null;}
 function point(g,target,ctx){const p=ctx.aimPoint,q={x:ctx.aimX??p?.x,y:ctx.aimY??p?.z??p?.y,height:ctx.aimHeight??p?.height??p?.y};return ['x','y','height'].every(k=>finite(q[k]))?q:target?{x:target.x,y:target.y,height:g.entityAltitude(target)}:q;}
 function aim(g,e,p,target,ctx={}){
  const q=point(g,target,ctx),hasAimPoint=finite(q.x)&&finite(q.y)&&finite(q.height),resolved=ctx.aimOrigin||(hasAimPoint?g.resolveWeaponOrigin?.(e,p,e.combat?.stations?.[p.id]?.nextPort||0):null),d=data(e),origin=resolved&&['x','y','height'].every(k=>finite(resolved[k]))&&(!g.validDirectShotOrigin||g.validDirectShotOrigin(e,resolved))?resolved:{x:e.x,y:e.y,height:g.entityAltitude(e)+(e.structure?20:!d.air&&!d.naval?12:0)},dx=q.x-origin.x,dy=q.y-origin.y,dz=q.height-origin.height,hasPoint=finite(dx)&&finite(dy)&&finite(dz),scale=Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz),.001);
  const yaw=hasPoint?Math.atan2(dy,dx):finite(ctx.aimYaw)?ctx.aimYaw:e.turret??e.angle??0;
  const linePitch=hasPoint?Math.atan2(dz/scale,Math.hypot(dx/scale,dy/scale)):finite(ctx.aimPitch)?ctx.aimPitch:e.combat?.mounts?.[p.mountId]?.pitch||0;
  // A self-guided torpedo leaves its tube level; depth seeking belongs to the
  // projectile. The submarine does not need to pitch its hull at a surface ship.
  const pitch=p.family==='bomb'?e.pitch||0:p.family==='torpedo'?(p.mount.mode==='hull'?e.pitch||0:0):p.artillery?Math.max(.35,linePitch):linePitch;
  const relative=wrap(yaw-(e.angle||0)),m=p.mount;
  const relativePitch=m.mode==='hull'?pitch-(e.pitch||0):pitch;
  return {yaw,pitch,q,arc:m.mode==='vertical'||relative>=m.yawMin-1e-6&&relative<=m.yawMax+1e-6&&Math.abs(relative)<=m.arc+1e-6,elevation:m.mode==='vertical'||relativePitch>=m.minPitch-1e-6&&relativePitch<=m.maxPitch+1e-6};
 }
 function bridgeBlocked(e,p,a){
  // Original gameplay hull: aft low-angle gunfire cannot pass through its central bridge.
  if(!data(e).naval||data(e).underwater||!['cannon','navalGun','autocannon','machinegun'].includes(p.family)||p.mount.mode==='vertical')return false;
  return p.mount.selfOcclusion!==false&&Math.cos(wrap(a.yaw-(e.angle||0)))<-.88&&Math.abs(a.pitch)<.08&&p.mountId!=='aft_turret';
 }
 function snapshot(g,e,w){
  const st=station(g,e,w);if(!st?.s)return null;const {p,s}=st;
  const reload=s.reloadRemaining>0,phase=s.phase,event=reload?'reload':g.time-s.lastShotAt<.25&&s.lastShotAt>=0?'fire':'idle';
  return {weaponId:p.id,category:p.family,sequence:s.shotSerial,event,phase,ammo:s.ammo,time:g.time,sourceId:e.id,progress:reload?clamp(1-s.reloadRemaining/Math.max(.001,s.reloadTotal),0,1):s.phaseUntil>s.phaseAt?clamp((g.time-s.phaseAt)/(s.phaseUntil-s.phaseAt),0,1):1,reloadKind:p.reloadKind,fireMode:p.burst.count>1?'burst':['rifle','machinegun','autocannon'].includes(p.family)?'auto':'single',shotTime:s.lastShotAt};
 }
 function status(g,e,w,target=null,ctx={}){
  const st=station(g,e,w);if(!st?.s)return {canFire:false,reason:'unarmed',ammo:0,reserve:0,cooldown:0,reloadRemaining:0,movementMultiplier:1};
  const {p,c,s}=st,m=c.mounts[p.mountId],a=aim(g,e,p,target,ctx),damage=root.WarCombatDamage?.weaponAvailability(e,p),mountYaw=p.mount.mode==='hull'?e.angle||0:m.yaw,mountPitch=p.mount.mode==='hull'?e.pitch||0:m.pitch;
  const aimError=p.mount.mode==='vertical'?0:Math.abs(wrap(a.yaw-mountYaw)),pitchError=p.mount.mode==='vertical'?0:Math.abs(a.pitch-mountPitch);
  const cooldown=Math.max(s.cooldown,chamber(p)?m.cooldown||0:0),chamberReload=chamber(p)&&weapons(g,e).map(w=>profile(g,e,w)).some(w=>w&&chamber(w)&&w.mountId===p.mountId&&c.stations[w.id].reloadRemaining>0);
  const reason=e.hp<=0?'dead':damage&&!damage.available?damage.reason:e.disabled>g.time?'emp':!a.arc?'arc':!a.elevation?'elevation':ctx.muzzleBlocked||ctx.aimBlocked||bridgeBlocked(e,p,a)?'blocked':s.phase==='pack'?'packing':p.setupSeconds&&!s.setupReady?'preparing':s.reloadRemaining>0||chamberReload?'reloading':s.ammo<=0?'no-ammo':cooldown>1e-7&&!ctx.burstContinuation?'cooldown':aimError>p.mount.tolerance+1e-7||pitchError>p.mount.pitchTolerance+1e-7?'traversing':'ready';
  return {canFire:reason==='ready',reason,weaponId:p.id,ammo:s.ammo,reserve:infinite(g,e)?Infinity:s.reserve,cooldown,reloadRemaining:s.reloadRemaining,phase:s.phase,aimError,pitchError,movementMultiplier:movementMultiplier(e),weaponAction:snapshot(g,e,p)};
 }
 function setPhase(g,s,phase,seconds=0){s.phase=phase;s.phaseAt=g.time;s.phaseUntil=g.time+seconds;}
 function requestReload(g,e,weaponId){
  const w=typeof weaponId==='object'?weaponId:weapons(g,e).find(p=>p.id===(weaponId||e.combat?.activeId))||weapons(g,e)[0],st=station(g,e,w);if(!st?.s||e.hp<=0||e.disabled>g.time||root.WarCombatDamage?.incapacitated(e))return false;
  const {p,s}=st;if(s.reloadRemaining>0||s.ammo>=p.magazine||(!infinite(g,e)&&s.reserve<=0)||p.aircraft&&!infinite(g,e))return false;
  s.reloadTotal=s.reloadRemaining=p.reloadSeconds*reloadScale(g,e);setPhase(g,s,'reload',s.reloadTotal);return true;
 }
 function consumeRound(g,e,w,{deferCooldown=false}={}){
  const st=station(g,e,w);if(!st?.s||e.hp<=0||e.disabled>g.time)return false;
  const {p,s,c}=st,m=c.mounts[p.mountId];if(s.ammo<=0||s.reloadRemaining>0||!deferCooldown&&Math.max(s.cooldown,chamber(p)?m.cooldown||0:0)>1e-7)return false;
  s.ammo--;s.shotSerial++;s.lastShotAt=g.time;s.nextPort=(s.nextPort+1)%p.magazine;c.activeId=p.id;
  if(!deferCooldown){s.cooldown=p.fireInterval*reloadScale(g,e);if(chamber(p))m.cooldown=s.cooldown;}e.cool=s.cooldown;
  return true;
 }
 function movementMultiplier(e){const c=e.combat;if(!c)return 1;return Object.values(c.stations).some(s=>s.phase==='setup'||s.phase==='pack')?0:c.movementMultiplier??1;}
 function step(g,e,dt,ctx={}){
  if(!(dt>0)||!supported(e)||e.hp<=0)return;const c=ensure(g,e);if(!c)return;if(e.disabled>g.time){for(const s of Object.values(c.stations))if(s.phase==='setup'||s.phase==='pack'){s.phaseAt+=dt;s.phaseUntil+=dt;}cancelBurst(e);return;}
  const active=profile(g,e,ctx.weapon||weapons(g,e).find(w=>w.id===(e.weaponId==='auto'?c.activeId:e.weaponId))||weapons(g,e)[0]);if(active)c.activeId=active.id;
  c.movementMultiplier=1;const moving=!!ctx.moving;
  const cooldownMultiplier=ctx.cooldownMultiplier??g.cooldownMultiplier?.(e)??1;
  for(const m of Object.values(c.mounts))m.cooldown=Math.max(0,(m.cooldown||0)-dt/cooldownMultiplier);
  for(const w of weapons(g,e)){const p=profile(g,e,w);if(!p)continue;const s=c.stations[p.id];
   s.cooldown=Math.max(0,s.cooldown-dt/cooldownMultiplier);
   if(s.reloadRemaining>0){s.reloadRemaining=Math.max(0,s.reloadRemaining-dt);if(!s.reloadRemaining){const n=Math.min(p.magazine-s.ammo,infinite(g,e)?p.magazine:s.reserve);s.ammo+=n;if(!infinite(g,e))s.reserve-=n;setPhase(g,s,'ready');}}
   if(p.artillery){
    if(moving&&(s.setupReady||s.phase==='setup')&&s.phase!=='pack'){s.setupReady=false;setPhase(g,s,'pack',p.packSeconds);}
    if(s.phase==='pack'&&g.time>=s.phaseUntil)setPhase(g,s,'ready');
    if(!moving&&p.id===active?.id&&!s.setupReady&&!['setup','pack','reload'].includes(s.phase))setPhase(g,s,'setup',p.setupSeconds);
    if(s.phase==='setup'&&g.time>=s.phaseUntil){s.setupReady=true;setPhase(g,s,'ready');}
    if(s.setupReady&&!moving&&ctx.target)c.movementMultiplier=Math.min(c.movementMultiplier,p.moveFactor);
   }
   if(!s.ammo&&!s.reloadRemaining&&s.phase!=='pack')requestReload(g,e,p);
  }
  if(active&&c.mounts[active.mountId]&&c.stations[active.id]){const m=c.mounts[active.mountId],a=aim(g,e,active,ctx.target,ctx),availability=root.WarCombatDamage?.weaponAvailability(e,active),rate=availability?.traverseMultiplier??1;
   const manualFire=ctx.intentFire||g.directControl?.id===e.id&&g.directControl.firePending,defense=!manualFire&&(active.mechanics?.intercept||data(e).interceptRange||e.kind==='ciws')?root.WarCombatProjectiles?.interceptionPlan(g,e):null,defending=defense&&profile(g,e,defense.weapon).mountId===active.mountId;
   // A shared defensive mount has one servo owner per tick. Idle camera angles
   // must not undo the finite movement performed by tryIntercept afterwards.
   if(defending){m.targetProjectileId=defense.projectile.projectileId??m.targetProjectileId;}
   else if(active.mount.mode==='hull'){m.yaw=e.angle||0;m.pitch=e.pitch||0;}else if(active.mount.mode==='vertical'){m.yaw=a.yaw;m.pitch=a.pitch;}else{
    const rel=clamp(wrap(a.yaw-(e.angle||0)),active.mount.yawMin,active.mount.yawMax),desired=(e.angle||0)+rel;
    m.yaw+=clamp(wrap(desired-m.yaw),-active.mount.yawRate*rate*dt,active.mount.yawRate*rate*dt);m.pitch+=clamp(clamp(a.pitch,active.mount.minPitch,active.mount.maxPitch)-m.pitch,-active.mount.pitchRate*rate*dt,active.mount.pitchRate*rate*dt);
   }
   m.targetId=defending?null:ctx.target?.id??null;e.turret=m.yaw;e.turretPitch=m.pitch;e.cool=c.stations[active.id].cooldown;c.phase=c.stations[active.id].phase;
  }
 }
 function needsReturn(g,e){const ws=weapons(g,e).map(w=>profile(g,e,w)).filter(Boolean);if(!data(e).air||data(e).space||!ws.length||infinite(g,e))return false;const c=ensure(g,e);return ws.every(w=>c.stations[w.id].ammo<=0);}
 function supplySources(g,e){const domain=g.targetDomain(e.kind),names=domain==='space'?['orbital_repair','orbital_carrier','spaceport']:domain==='underwater'?['abyss_tender','navalyard']:domain==='naval'?['repair_ship','navalyard']:domain==='air'?['airfield','carrier']:['hq','factory','repairhub','repair_vehicle','barracks'];return g.entities.filter(s=>s.hp>0&&s.team===e.team&&names.includes(s.kind)&&g.operational(s));}
 function supplyPlan(g,e){
  const c=ensure(g,e),ws=weapons(g,e).map(w=>profile(g,e,w)).filter(Boolean);if(!c||!ws.some(p=>c.stations[p.id].ammo<p.magazine||c.stations[p.id].reserve<p.reserve)&&!(e.countermeasures?.charges<3))return null;
  const source=supplySources(g,e).sort((a,b)=>Math.hypot(e.x-a.x,e.y-a.y)-Math.hypot(e.x-b.x,e.y-b.y)||a.id-b.id)[0];
  return source?{sourceId:source.id,x:source.x,y:source.y,radius:(source.r||20)+150,needed:true}:null;
 }
 function service(g,e,source,dt){
  if(!(dt>0)||!source||e.hp<=0||source.team!==e.team||!g.operational(source)||e.disabled>g.time)return false;
  if(!supplySources(g,e).includes(source))return false;
  const parked=data(e).air&&!data(e).space;
  if(parked&&!(e.flight?.phase==='service'&&e.flight.homeId===source.id))return false;
  if(Math.hypot(e.x-source.x,e.y-source.y)>(source.r||20)+(parked?1000:150))return false;
  const c=ensure(g,e);if(!c)return true;c.supply??={sourceId:source.id,credit:0};if(c.supply.sourceId!==source.id)c.supply={sourceId:source.id,credit:0};c.supply.credit=Math.min(10,c.supply.credit+dt);
  let complete=true;
  for(const w of weapons(g,e)){const p=profile(g,e,w);if(!p)continue;const s=c.stations[p.id],missing=p.magazine+p.reserve-s.ammo-s.reserve;if(missing<=0)continue;
   complete=false;const affordable=e.team===0&&g.buffs?.has('unlimited')?Infinity:Math.floor(Math.max(0,g.teams[e.team].money)/p.supplyCost),count=Math.min(missing,Math.floor(c.supply.credit*p.supplyRate),affordable);if(!count)continue;const cost=Math.ceil(count*p.supplyCost),paid=g.spend(e.team,cost);if(paid===null)continue;
   c.supply.credit=Math.max(0,c.supply.credit-count/p.supplyRate);let n=count,loaded=Math.min(n,p.magazine-s.ammo);s.ammo+=loaded;n-=loaded;s.reserve=Math.min(p.reserve,s.reserve+n);s.reloadRemaining=0;setPhase(g,s,'ready');
  }
  if(e.countermeasures?.charges<3){complete=false;if(c.supply.credit>=4&&g.spend(e.team,40)!==null){e.countermeasures.charges++;c.supply.credit-=4;}}
  return (complete||weapons(g,e).map(w=>profile(g,e,w)).filter(Boolean).every(p=>c.stations[p.id].ammo===p.magazine&&c.stations[p.id].reserve===p.reserve))&&(!e.countermeasures||e.countermeasures.charges===3);
 }
 function requestSupply(g,e,source){if(e.hp<=0||root.WarCombatDamage?.incapacitated(e))return false;const plan=supplyPlan(g,e);if(!plan||source&&plan.sourceId!==source.id)return false;e.combat.supplyOrder={...plan,resume:e.order?{...e.order}:null};return true;}
 function beginBurst(g,e,w,target,aimContext){
  const st=station(g,e,w);if(!st||!['rifle','machinegun','autocannon'].includes(st.p.family))return false;const count=clamp(Math.floor(st.p.burst?.count||1),1,8),interval=clamp(st.p.burst?.interval||.1,.04,1);
  if(count<2||st.s.ammo<=0||st.c.burst)return false;st.c.burst={weaponId:st.p.id,targetId:target?.id??null,remaining:Math.min(count-1,st.s.ammo),due:g.time+interval,interval,team:e.team,controlled:g.directControl?.id===e.id,aim:aimContext?structuredClone(aimContext):null};return true;
 }
 function cancelBurst(e){if(!e.combat?.burst)return false;e.combat.burst=null;return true;}
 function takeBurst(g,e){
  const b=e.combat?.burst;if(!b)return null;
  if(b.targetId!=null&&!(g.get(b.targetId)?.hp>0)||b.targetId==null&&!(finite(b.aim?.x)&&finite(b.aim?.y)&&finite(b.aim?.height))){cancelBurst(e);return null;}
  if(e.hp<=0||e.disabled>g.time||e.team!==b.team||g.result||e.weaponId&&e.weaponId!=='auto'&&e.weaponId!==b.weaponId||b.controlled&&g.directControl?.id!==e.id||!b.controlled&&g.directControl?.id===e.id){cancelBurst(e);return null;}
  if(g.time+1e-9<b.due)return null;const result={weaponId:b.weaponId,targetId:b.targetId,aim:b.aim,burstContinuation:true};b.remaining--;b.due+=b.interval;if(b.remaining<=0)cancelBurst(e);return result;
 }
 function validate(e,gOrFaction){
  const c=e.combat;if(!c)return true;if(!supported(e)||c.schema!==1||!c.stations||!c.mounts||!phases.has(c.phase)||Object.keys(c.stations).length>40||Object.keys(c.mounts).length>40)return false;
  const supplied=typeof gOrFaction==='object'&&gOrFaction?.teams?gOrFaction:null,g={teams:supplied?supplied.teams.slice():[],options:supplied?.options||{},time:supplied?.time||0};if(!g.teams[e.team])g.teams[e.team]={faction:typeof gOrFaction==='string'?gOrFaction:'chn'};
  const ws=weapons(g,e).map(w=>profile(g,e,w)).filter(Boolean),ids=new Set(ws.map(p=>p.id));
  if(Object.keys(c.stations).some(id=>!ids.has(id))||c.activeId!==null&&!ids.has(c.activeId))return false;
  for(const p of ws){const s=c.stations[p.id];if(!s||!Number.isInteger(s.ammo)||s.ammo<0||s.ammo>p.magazine||!Number.isInteger(s.reserve)||s.reserve<0||s.reserve>p.reserve||!phases.has(s.phase)||!['cooldown','reloadRemaining','reloadTotal','phaseAt','phaseUntil','lastShotAt'].every(k=>finite(s[k]))||s.cooldown<0||s.reloadRemaining<0||s.reloadRemaining>120||!Number.isInteger(s.shotSerial)||s.shotSerial<0||!Number.isInteger(s.nextPort)||s.nextPort<0||s.nextPort>=p.magazine)return false;
   const m=c.mounts[p.mountId];if(!m||!finite(m.yaw)||!finite(m.pitch)||m.targetId!=null&&!Number.isInteger(m.targetId))return false;
  }
  if(c.burst&&(!ids.has(c.burst.weaponId)||!Number.isInteger(c.burst.remaining)||c.burst.remaining<1||c.burst.remaining>7||!finite(c.burst.due)||!finite(c.burst.interval)||c.burst.interval<.04||c.burst.interval>1||c.burst.team!==e.team||typeof c.burst.controlled!=='boolean'))return false;
  return !c.supply||Number.isInteger(c.supply.sourceId)&&finite(c.supply.credit)&&c.supply.credit>=0&&c.supply.credit<=10;
 }
 const api={weapons,profile,ensure,status,snapshot,step,consumeRound,requestReload,service,needsReturn,movementMultiplier,supplyPlan,requestSupply,beginBurst,takeBurst,cancelBurst,validate};root.WarCombatReadiness=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
