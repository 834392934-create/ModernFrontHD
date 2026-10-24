/* Bounded, simulation-only sensor profiles. Public references describe a class;
 * original game buildings/spacecraft are not certifications of fitted hardware. */
(function(root){
 'use strict';
 const D=root.WarData,U=D.U,B=D.B;
 const sources=Object.freeze({
  giraffe4a:Object.freeze({url:'https://www.saab.com/products/giraffe-4a',publisher:'Saab',metric:'instrumented-search-range',meters:400000,note:'400 km instrumented range, not guaranteed detection of every target. Original radar slots use a class analogy.'}),
  sentinel2:Object.freeze({url:'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2',publisher:'ESA',metric:'civilian-imaging-swath',swathM:290000,altitudeM:786000,note:'Civilian swath/altitude reference only; no personnel identification or military tracking claim.'}),
 });
 const opticalBuildings=Object.freeze({hq:2000,turret:4000,bunker:1200,ciws:3000,sam:3000,radar:1500,power:1000,refinery:1200,barracks:1200,factory:1500,airfield:1500,runway:1000,navalyard:1500,spaceport:1500});
 const data=e=>U[e?.kind]||B[e?.kind]||{},publicMode=g=>g.options?.rangeMode==='published',scale=g=>Math.max(1,Number(g.options?.metersPerUnit)||1),height=(g,e)=>g.entityAltitude?g.entityAltitude(e):e.altitude||0;
 const domain=e=>B[e.kind]?'structure':U[e.kind]?.space?'space':U[e.kind]?.underwater?'underwater':U[e.kind]?.air?'air':U[e.kind]?.naval?'naval':'ground';
 const people=e=>(U[e.kind]?.modelKind||e.kind)==='infantry';
 const alive=e=>!!e&&e.hp!==0&&!(e.hp<0),operational=(g,e,power)=>alive(e)&&(g.operational?g.operational(e,power):!(e.disabled>g.time));
 const profileCaches=new WeakMap(),empty=Object.freeze([]);
 function reference(status,note,source=null,meters=null){return{status,note,sourceUrl:source?.url||null,metric:source?.metric||'game-estimate',publishedM:null,estimateM:meters,checked:'2026-10-25'};}
 function profiles(g,e,power){
  if(!e||!(U[e.kind]||B[e.kind])||!alive(e))return empty;
  const d=data(e),isPublic=publicMode(g),unit=scale(g),vision=D.F[g.teams[e.team]?.faction]?.vision||1,opticalActive=!root.WarCombatDamage?.incapacitated(e),altitude=height(g,e);
  // Ordinary public near-field optics do not depend on power. Only electronic
  // profiles and legacy building circles need the operational/power check.
  const electronic=d.space||d.sonarRange||e.kind==='radar'||e.kind==='early_warning_aircraft',active=isPublic&&!electronic?opticalActive:operational(g,e,power);
  let cache=profileCaches.get(g);if(!cache){cache=new WeakMap();profileCaches.set(g,cache);}const old=cache.get(e);
  if(old&&old.d===d&&old.kind===e.kind&&old.isPublic===isPublic&&old.unit===unit&&old.vision===vision&&old.active===active&&old.opticalActive===opticalActive&&old.altitude===altitude)return old.list;
  const list=[],save=()=>{for(const p of list){if(isPublic&&p.type==='optical')p.terrainRadius=Math.sqrt(Math.max(0,p.radius*p.radius-altitude*altitude));Object.freeze(p.domains);Object.freeze(p.reference);Object.freeze(p);}Object.freeze(list);cache.set(e,{d,kind:e.kind,isPublic,unit,vision,active,opticalActive,altitude,list});return list;};
  const add=(type,meters,domains,extra={})=>list.push({type,meters,radius:isPublic?meters/unit:meters,domains,active,terrainReveal:false,contactsOnly:true,reference:reference('game-setting','Explicit game role estimate.',null,meters),...extra});
  if(!isPublic){const radius=(B[e.kind]?(d.sight&&active?d.sight:330):d.sight||0)*vision;add('optical',radius,['ground','naval','air','space','structure'],{active:true,terrainReveal:true,contactsOnly:false,reveal:'visible',classic:true});return save();}
  if(d.space){
   if(['satellite','orbital_mapper'].includes(e.kind)){
    const physicalAltitudeM=Math.max(0,altitude)*100,meters=sources.sentinel2.swathM*.5*physicalAltitudeM/sources.sentinel2.altitudeM;
    add('orbital',meters,['structure','naval'],{terrainReveal:true,reveal:'explored',physicalAltitudeM,reference:reference('inferred','圆形覆盖是民用幅宽按高度线性缩放的游戏近似；大型海面/建筑接触属于游戏识别规则，不识别人或潜艇。',sources.sentinel2,meters)});
   }
   add('space',(d.sight||600)*10,['space'],{reference:reference('game-setting','原创轨道传感器的压缩三维空间接触范围；不是实测航天器性能。',null,(d.sight||600)*10)});
   if(e.kind==='orbital_sensor')add('radar',400000,['air'],{antennaHeightM:Math.max(0,altitude)*100,reference:reference('game-setting','架空在轨预警；公开地面仪器量程仅作类别参照，不声称该设备能在太空工作。',sources.giraffe4a,400000)});
  }else{
   // Normal role optics retain the existing 10 m/u interpretation. Electronic
   // outages remove active sensors, while an observer's near view can remain.
   const meters=(B[e.kind]?(opticalBuildings[e.kind]??1500):(d.sight||0)*10)*vision;
   if(!d.underwater||altitude>=-8)add('optical',meters,['ground','naval','air','structure'],{active:opticalActive,terrainReveal:true,contactsOnly:false,reveal:'visible',reference:reference('game-setting','角色近场光学观察估算；不是保证识别距离，且不提供轨道或水下识别。',null,meters)});
   if(e.kind==='radar'||e.kind==='early_warning_aircraft')add('radar',400000,['air'],{antennaHeightM:B[e.kind]?15:Math.max(1,altitude*unit),reference:reference('inferred','400 km 为 Saab Giraffe 4A 仪器量程类别参照；原创建筑/预警机非该型号，实际接触另受游戏地平线限制。',sources.giraffe4a,400000)});
  }
  if(d.sonarRange)add('sonar',d.sonarRange*unit,['underwater'],{radius:d.sonarRange,reference:reference('game-setting','保留既有声呐游戏范围；不由武器射程或雷达量程推导。',null,d.sonarRange*unit)});
  return save();
 }
 function sightRadius(g,e,power){const p=profiles(g,e,power).find(p=>p.type==='optical'&&p.active);return p?.terrainRadius??p?.radius??0;}
 function terrainZones(g,e,power){return profiles(g,e,power).filter(p=>p.active&&p.terrainReveal).map(p=>({x:e.x,y:e.y,r:p.terrainRadius??p.radius,mode:p.reveal||'visible',type:p.type}));}
 // 4/3-Earth radio horizon is used only as an explicit gameplay bound. It is
 // neither an RCS model nor a guarantee of detection, and never grants ground sight.
 function radarHorizonM(observerHeightM,targetHeightM){return 4120*(Math.sqrt(Math.max(0,observerHeightM))+Math.sqrt(Math.max(0,targetHeightM)));}
 function detects(g,observer,target,power){
  if(!alive(observer)||!alive(target))return false;
  const dx=target.x-observer.x,dy=target.y-observer.y,horizontal=Math.hypot(dx,dy);
  if(!publicMode(g))return horizontal<sightRadius(g,observer,power);
  const targetDomain=domain(target),z=height(g,target)-height(g,observer),unit=scale(g);
  for(const p of profiles(g,observer,power)){
   if(!p.active||!p.domains.includes(targetDomain))continue;
   if(p.type==='orbital'&&people(target))continue;
   const measured=p.type==='orbital'||p.type==='radar'?horizontal:Math.hypot(dx,dy,z);
   if(measured>p.radius)continue;
   if(p.type==='radar'&&horizontal*unit>radarHorizonM(p.antennaHeightM,height(g,target)*unit))continue;
   return true;
  }return false;
 }
 function unitsInSight(g,target,units){
  // Every query observes current power, including a same-tick destroyed plant,
  // but one shared team calculation replaces one full entity scan per observer.
  const powers=[];for(const e of units||[]){const d=data(e),needsPower=B[e.kind]&&(!publicMode(g)||e.kind==='radar'||d.sonarRange);if(needsPower&&powers[e.team]===undefined)powers[e.team]=g.power?.(e.team);if(detects(g,e,target,powers[e.team]))return true;}return false;
 }
 function entityVisible(g,team,e){
  if(!alive(e))return false;if(!g.isEnemy(team,e.team))return true;
  if(team===0&&g.buffs?.has('vision'))return true;
  if(U[e.kind]?.underwater)return !!g.canDetect(team,e);
  if(!publicMode(g))return team===0?g.visibleAt(e.x,e.y):unitsInSight(g,e,g.teamSight?.[team]||g.entities.filter(s=>s.team===team));
  if(team===0&&!U[e.kind]?.space&&(g.reveals||[]).some(r=>r.until>g.time&&Math.hypot(e.x-r.x,e.y-r.y)<=r.r))return true;
  // The current visible terrain grid contains optical/recon circles only;
  // orbital mapping writes explored, so it cannot expose every individual.
  if(team===0&&people(e)&&g.visibleAt(e.x,e.y))return true;
  return unitsInSight(g,e,g.teamSight?.[team]||g.entities.filter(s=>s.team===team));
 }
 function interceptionRange(g,e,weapon=null){
  const d=data(e),w=weapon||(g.vehicleWeapons?.(e)||[]).find(w=>w.mechanics?.intercept||w.stationId==='ciws');
  const legacy=d.interceptRange||w?.mechanics?.interceptRange||(e.kind==='ciws'?d.range:0);
  if(!legacy)return 0;
  if(!publicMode(g))return legacy;
  // Building readiness creates a synthetic station in game units. Its local
  // range cannot override the building's independently sourced public range.
  return g.weaponRangeProfile?.(e,B[e.kind]?undefined:w)?.range??legacy;
 }
 function zones(g,e,power){
  const labels={optical:'光学观察',radar:'对空雷达量程上限',sonar:'声呐探测',orbital:'轨道测绘覆盖',space:'轨道接触'};
  const result=profiles(g,e,power).map(p=>({...p,type:p.type==='optical'?'sight':p.type,label:!publicMode(g)?'侦察':labels[p.type],unit:publicMode(g)?'metric':'game'}));
  const weapon=(g.vehicleWeapons?.(e)||[]).find(w=>w.mechanics?.intercept||w.stationId==='ciws'),intercept=interceptionRange(g,e,weapon);if(intercept)result.push({type:'intercept',label:'弹体拦截',radius:intercept,active:operational(g,e,power),unit:publicMode(g)?'metric':'game',reference:g.weaponRangeProfile?.(e,B[e.kind]?undefined:weapon)?.reference||reference('game-setting','既有近防拦截范围')});return result;
 }
 const api={sources,opticalBuildings,profiles,sightRadius,terrainZones,radarHorizonM,detects,unitsInSight,zones,interceptionRange,entityVisible};root.WarSensors=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
