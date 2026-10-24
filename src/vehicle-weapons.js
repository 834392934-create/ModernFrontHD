/* Vehicle weapon stations, independent from movement and rendering.
 * Damage, reload and compact-map ranges are game balance. Public metre ranges
 * retain their original evidence qualifiers; unspecified loadouts are estimates.
 * A model family never grants weapons: every supported vehicle kind is explicit. */
(function(root){
 'use strict';
 const G=['ground','structure'],N=['naval'],A=['air'],S=['space'],T=['naval','underwater'];
 const SURFACE=['ground','naval','structure'],ALL=['ground','naval','underwater','air','space','structure'];
 const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
 // station(id, name, visual family, domains, balanced range, damage, reload,
 //         estimated metres, optional per-station metadata)
 const station=(id,name,family,targetDomains,range,damage,reload,meters,extra={})=>
  ({id,name,family,targetDomains,range,damage,reload,meters,minRange:0,minMeters:null,splash:0,...extra});
 const gun=(range=220,damage=74,reload=2.1)=>station('main_gun','主炮多用途弹','cannon',G,range,damage,reload,3000,{splash:12,referenceId:'m256_demonstrated'});
 const mg=()=>station('coax_mg','同轴机枪','machinegun',['ground'],145,8,.22,800,{personnelPreferred:true,personnelOnly:true,targetBonuses:{infantry:1.6,tank:.08,ifv:.15}});
 const auto=(range=190,damage=23,reload=.7,domains=G)=>station('autocannon','自动机炮','autocannon',domains,range,damage,reload,2500,{targetBonuses:{infantry:1.5,tank:.3}});
 const atgm=(range=350,damage=85,reload=3.6)=>station('atgm','反装甲导弹','missile',G,range,damage,reload,5000,{minRange:35,minMeters:100,splash:14,targetBonuses:{tank:1.3}});
 const aa=(range=430,damage=80,reload=2.5)=>station('sam','防空导弹','missile',A,range,damage,reload,25000,{minRange:30,minMeters:300});
 const ciws=(range=200,damage=14,reload=.22,domains=A)=>station('ciws','近防机炮','autocannon',domains,range,damage,reload,2000,{targetBonuses:{tank:.15}});
 const antiShip=(range=570,damage=170,reload=5)=>station('anti_ship','反舰导弹','missile',N,range,damage,reload,120000,{minRange:65,minMeters:1000,splash:24,referenceId:'brahmos_baseline'});
 const cruise=(range=820,damage=190,reload=5.8)=>station('land_attack','对陆巡航导弹','missile',G,range,damage,reload,300000,{minRange:100,minMeters:1000,splash:48,referenceId:'tomahawk_iv_v'});
 const torpedo=(range=440,damage=140,reload=3)=>station('torpedo','重型鱼雷','torpedo',T,range,damage,reload,20000,{minRange:25,minMeters:200,splash:0});
 const navalGun=(range=350,damage=75,reload=2.3,domains=SURFACE)=>station('naval_gun','舰炮常规弹','navalGun',domains,range,damage,reload,24000,{splash:18,referenceId:'mk45_conventional'});
 const aam=(range=430,damage=80,reload=2.5)=>station('aam','中远程空空导弹','missile',A,range,damage,reload,100000,{minRange:35,minMeters:800,referenceId:'meteor'});
 const shortAam=()=>station('short_aam','近程空空导弹','missile',A,230,45,1.4,12000,{minRange:12,minMeters:200,referenceId:'aim9_unverified'});
 const aircraftGun=(domains=['air','ground'],range=170,damage=15,reload=.25)=>station('aircraft_gun','航空机炮','autocannon',domains,range,damage,reload,1800,{targetBonuses:{tank:.25}});
 const agm=(range=310,damage=70,reload=2.8,domains=G)=>station('agm','精确空地导弹','missile',domains,range,damage,reload,8000,{minRange:25,minMeters:300,splash:18,referenceId:'hellfire_ii_trial'});
 const rockets=()=>station('rockets','航空火箭弹','rocket',G,240,42,1.2,4000,{splash:26,minRange:20,minMeters:100});
 const bombs=(range=320,damage=180,reload=5.5)=>station('bombs','制导炸弹','bomb',G,range,damage,reload,20000,{splash:62});
 const pulse=(id,name,domains,range,damage,reload)=>station(id,name,'pulse',domains,range,damage,reload,range*10,{setting:true});
 const beam=(id,name,domains,range,damage,reload,extra={})=>station(id,name,'beam',domains,range,damage,reload,range*10,{setting:true,...extra});
 const orbitMissile=(id,name,domains,range,damage,reload,extra={})=>station(id,name,'missile',domains,range,damage,reload,range*10,{setting:true,...extra});
 const config={
  // Ground: 14 chassis, including explicitly unarmed logistics/support.
  tank:[gun(),mg()],
  ifv:[auto(),atgm(330,76,3.8),mg()],
  arty:[station('howitzer','榴弹炮高爆弹','howitzer',G,440,105,4.8,30000,{minRange:100,splash:42})],
  rocket:[station('rocket_salvo','多管火箭覆盖齐射','rocket',G,510,136,6.4,70000,{minRange:125,splash:65})],
  aa:[aa(285,46,1.2)],
  asat:[orbitMissile('asat','反轨拦截弹（游戏设定）',S,1400,160,3.5)],
  harvester:[],
  recon_vehicle:[{...auto(155,10,.8),name:'侦察车轻机炮',meters:1500}],
  repair_vehicle:[],
  tank_destroyer:[{...atgm(470,105,4.2),minRange:75}],
  siege_howitzer:[station('heavy_howitzer','重型榴弹炮','howitzer',G,770,175,6.5,40000,{minRange:200,splash:65,referenceId:'k9'})],
  mobile_ciws:[ciws(275,16,.32)],
  assault_gun:[{...gun(260,150,3.2),name:'突击炮高爆弹',splash:28},mg()],
  mobile_radar:[],
  // Naval: a missile, shell and torpedo never share one station's range or domain.
  destroyer:[antiShip(650,155,4.5),cruise(820,160,5.2),aa(570,64,2.2),navalGun(360,85,2.6),torpedo(320,130,3.8),ciws()],
  carrier:[station('air_wing','舰载航空队出动','airWing',['ground','naval','air','structure'],840,0,18,8400,{action:'airWing',setting:true}),ciws(210,18,.22)],
  submarine:[torpedo()],
  frigate:[antiShip(480,110,4.2),aa(420,55,2.2),torpedo(330,115,3.5),navalGun(300,48,1.8,N)],
  patrol_boat:[{...auto(250,22,.65,SURFACE),name:'小口径舰载机炮',meters:3000}],
  missile_boat:[antiShip()],
  shore_bombardment:[{...navalGun(720,160,5.6,G),name:'舰炮岸轰弹',minRange:180,meters:30000,splash:55}],
  air_defense_ship:[aa(510,72,1.8),ciws(210,16,.24)],
  repair_ship:[],
  recon_boat:[station('deck_mg','艇载重机枪','machinegun',N,205,12,.8,1500)],
  torpedo_boat:[{...torpedo(220,220,4.1),name:'反舰鱼雷',targetDomains:N,meters:10000}],
  arsenal_ship:[cruise(),antiShip(720,185,5.8)],
  escort_corvette:[ciws(310,22,.45,['naval','air'])],
  fleet_command_ship:[],
  electronic_warfare_ship:[],
  hunter_sub:[{...torpedo(500,240,4.2),meters:25000}],
  abyss_tender:[],
  asw_patrol_ship:[{...torpedo(380,170,3.2),name:'反潜轻型鱼雷',meters:10000}],
  missile_sub:[cruise(1000,260,6),antiShip(700,220,5.2),torpedo(440,165,3.6)],
  // Aircraft: primary missions remain distinct, support aircraft stay unarmed.
  heli:[agm(310,70,2.8),aircraftGun(G,175,15,.34),rockets()],
  jet:[{...aam(490,155,2.4),setting:true},{...agm(400,130,2.8),setting:true},{...aircraftGun(),setting:true}],
  fighter:[aam(430,80,2.5),shortAam(),aircraftGun(),agm(),bombs(300,120,4.5)],
  recon_drone:[],
  attack_drone:[agm(310,46,1.8,['ground','naval','structure'])],
  interceptor:[aam(500,108,2.5),shortAam(),aircraftGun(A)],
  close_support_aircraft:[aircraftGun(G,245,30,.65),agm(340,80,3.2),rockets(),bombs(270,110,4.5)],
  heavy_bomber:[bombs(465,220,6),antiShip(600,190,5.8)],
  early_warning_aircraft:[],
  escort_helicopter:[{...shortAam(),range:300,damage:55,reload:2.2},aircraftGun(A,165,15,.4)],
  rescue_helicopter:[],
  naval_strike_aircraft:[antiShip(540,185,4.6)],
  electronic_warfare_aircraft:[],
  air_repair_drone:[],
  interceptor_drone:[{...shortAam(),range:270,damage:35,reload:1.4,meters:10000},aircraftGun(A,170,17,.5)],
  omni_striker:[orbitMissile('omni_land','全域机对地弹（架空）',G,600,220,1.5,{splash:40}),orbitMissile('omni_ship','全域机反舰弹（架空）',N,600,220,1.5),{...torpedo(450,220,2.5),id:'omni_torpedo',name:'全域机反潜弹（架空）',setting:true},orbitMissile('omni_air','全域机空空弹（架空）',A,600,180,1.5),orbitMissile('omni_space','全域机反轨弹（架空）',S,950,220,2)],
  high_altitude_interceptor:[orbitMissile('high_aam','高空空空弹（架空）',A,700,150,2.4),orbitMissile('high_asat','高空反轨弹（架空）',S,950,150,2.4)],
  strategic_strike_aircraft:[cruise(1000,280,5.2),antiShip(750,250,5.2),bombs(400,250,6)],
  // Space: these are explicitly fictional roles, never certified weapons.
  satellite:[],
  orbital:[beam('orbital_beam','轨道打击光束（架空）',['ground','naval','air','space','structure'],1342,200,3.2)],
  orbital_interceptor:[pulse('intercept_pulse','空天拦截脉冲（架空）',['air','space'],1250,95,.95)],
  orbital_sniper:[beam('sniper_beam','反轨狙击光束（架空）',S,2024,290,5.4,{minRange:160})],
  orbital_point_defense:[pulse('air_intercept','大气层拦截脉冲（架空）',A,1250,34,.35)],
  orbital_bombardment:[beam('surface_beam','海陆集群光束（架空）',['ground','naval'],1518,145,4.5,{splash:60})],
  orbital_siege:[beam('siege_beam','轨道攻城光束（架空）',['structure'],1826,460,6.8,{minRange:220,splash:55})],
  orbital_repair:[],
  orbital_mapper:[],
  orbital_raider:[pulse('raider_pulse','海陆突袭脉冲（架空）',SURFACE,1250,82,.9)],
  orbital_escort:[pulse('escort_pulse','空天近防脉冲（架空）',['air','space'],1250,44,.42)],
  orbital_relay:[],
  orbital_jammer:[],
  orbital_shield:[],
  orbital_missile_barge:[orbitMissile('orbital_salvo','对轨导弹齐射（架空）',S,1342,130,4.8,{minRange:120,splash:60})],
  omni_dreadnought:[beam('omni_surface_beam','旗舰海陆光束（架空）',SURFACE,1870,400,2.5,{splash:60}),beam('omni_sub_beam','旗舰深海光束（架空）',['underwater'],1500,330,3),beam('omni_air_beam','旗舰空天光束（架空）',['air','space'],1870,350,2.5)],
  orbital_carrier:[pulse('carrier_battery','轨道火力母舰炮组（架空）',['air','space'],2300,260,2.8)],
  orbital_sensor:[],
 };
 const catalogKey={arty:{usa:'m109a7_unspecified',kor:'k9',ind:'k9'},rocket:{usa:'gmlrs',rus:'smerch',ind:'pinaka_guided_trial',kor:'chunmoo_cgr080'}};
 const cache=new Map(),empty=Object.freeze([]);
 function factionSpecs(kind,faction){
  let specs=config[kind];if(!specs)return null;specs=specs.map(w=>({...w}));
  if(kind==='tank'){
   specs[0].name=['rus','chn','ind'].includes(faction)?'125 mm 主炮多用途弹':faction==='imp'?'帝国主炮（架空）':'120 mm 主炮多用途弹';
   if(faction==='ind')specs.push({...atgm(370,100,3.5),id:'gun_launched_missile',name:'125 mm 炮射导弹',rangeSourceKey:'t90s_guided'});
  }
  if(kind==='ifv'){
   if(faction==='usa'){specs[0]={...specs[0],name:'M242 25 mm 机炮',rangeSourceKey:'bradley_m242',rangeStatus:'inferred'};specs[1]={...specs[1],name:'TOW 反装甲导弹（家族参照）',rangeSourceKey:'bradley_tow',rangeStatus:'inferred',meters:3750};}
   if(['rus','chn'].includes(faction))specs=[{...auto(),name:'30 mm 自动机炮'}, {...gun(250,58,2.4),id:'low_pressure_gun',name:'100 mm 低压炮',meters:3000},atgm(350,85,3.6),mg()];
   if(faction==='kor')specs=[{...auto(),name:'40 mm 自动机炮'},mg()];
  }
  if(kind==='aa'){
   if(faction==='usa')specs=[{...aa(285,46,1.7),name:'Stinger 防空导弹',meters:6000},{...auto(190,18,.45,['air','ground']),name:'30 mm 自动机炮',meters:2000},mg()];
   else if(faction==='rus')specs=[{...aa(340,46,1.7),name:'Pantsir-S1 防空导弹',rangeSourceKey:'pantsir_missile'},{...ciws(220,20,.4),name:'30 mm 双联防空炮',rangeSourceKey:'pantsir_gun'}];
   else if(faction==='ind')specs=[{...aa(350,46,1.7),name:'Akash 防空导弹',rangeSourceKey:'akash'}];
   else if(faction==='kor')specs=[{...ciws(285,23,.6),name:'K30 30 mm 双联防空炮',rangeSourceKey:'biho_gun',rangeStatus:'inferred',meters:3000}];
   else if(faction==='chn')specs=[{...aa(285,46,1.7),name:'HQ-17 类防空导弹',meters:12000}];
   else specs=[{...ciws(285,46,1.2),name:'九头蛇防空炮（架空）',setting:true}];
  }
  if(catalogKey[kind]?.[faction])specs[0]={...specs[0],rangeSourceKey:catalogKey[kind][faction],rangeStatus:kind==='arty'&&faction==='ind'||kind==='rocket'&&faction==='ind'?'inferred':undefined};
  if(kind==='destroyer'){
   // Missing loadout evidence stays generic: TLAM land-attack is never the antiship slot.
   if(faction==='usa'){specs[1]={...specs[1],name:'Tomahawk 对陆巡航导弹',rangeSourceKey:'tomahawk_iv_v'};specs[2].name='Standard / ESSM 类防空导弹';specs[3]={...specs[3],name:'Mk45 127 mm 舰炮',rangeSourceKey:'mk45_conventional',rangeStatus:'inferred',meters:24076};}
   if(faction==='ind')specs[0]={...specs[0],name:'BrahMos 反舰导弹（基本型参照）',rangeSourceKey:'brahmos_baseline',rangeStatus:'inferred',meters:290000};
  }
  if(kind==='submarine'&&faction==='usa')specs.push({...cruise(950,170,5.5),name:'Tomahawk 潜射对陆导弹',rangeSourceKey:'tomahawk_iv_v'});
  if(kind==='heli'&&['usa','kor'].includes(faction)){specs[0]={...specs[0],name:'HELLFIRE II 反装甲导弹（家族参照）',rangeSourceKey:'hellfire_ii_trial',rangeStatus:'inferred'};specs[1].name='30 mm 链式机炮';specs[2].name='70 mm 航空火箭弹';}
  if(kind==='fighter'){
   if(faction==='chn')specs=[{...aam(430,80,2.5),name:'中远程空空导弹（未指定弹型）'},shortAam()];
   if(faction==='ind'){specs[0]={...specs[0],name:'Meteor 空空导弹',rangeSourceKey:'meteor'};/* AM39 is a Rafale integration, not proof of Indian inventory. */}
  }
  if(kind==='carrier'&&faction==='kor')specs[0]={...specs[0],name:'舰载直升机护航（职责近似）',targetDomains:['air'],airWingKind:'escort_helicopter'};
  return specs;
 }
 function evidence(spec,kind,faction){
  const R=root.WarWeaponRanges,source=spec.rangeSourceKey&&R?.catalog?.[spec.rangeSourceKey],setting=!!spec.setting||!!root.WarData?.F?.[faction]?.fiction||!!root.WarData?.U?.[kind]?.space;
  if(source&&!setting&&spec.rangeStatus!=='inferred'&&source.publishedM!==null)return source;
  const ref=source||R?.catalog?.[spec.referenceId],status=setting?'game-setting':'inferred';
  return freeze({id:status+':'+faction+':'+kind+':'+spec.id,weapon:spec.name,platform:kind,target:spec.targetDomains.slice(),status,
   scope:'game-role-estimate',publishedKind:'estimate',publishedM:null,effectiveM:null,maxM:null,
   estimateM:source?.publishedM??spec.meters,minM:spec.minMeters,qualifier:'estimated',source:ref?.source||null,
   sourceUrl:ref?.sourceUrl||null,referenceIds:ref?[ref.id]:[],checked:'2026-10-24',
   note:setting?'原创/概念武器的游戏设定，不代表现实性能。':'武器类别或家族参照；具体装弹和改型未逐一证实。伤害、装填、散布为游戏设定。'});
 }
 function supported(value){const kind=typeof value==='string'?value:value?.kind;return Object.prototype.hasOwnProperty.call(config,kind);}
 function list(value,faction){
  const kind=typeof value==='string'?value:value?.kind;faction=faction||(typeof value==='object'&&value?.faction)||'chn';
  if(!supported(kind))return empty;const key=faction+':'+kind;if(cache.has(key))return cache.get(key);
  const specs=factionSpecs(kind,faction),result=freeze(specs.map((spec,index)=>{
   const rangeReference=evidence(spec,kind,faction),rocket=['missile','rocket'].includes(spec.family),beam=spec.family==='beam';
   return {...spec,id:kind+':'+spec.id,stationId:spec.id,kind,faction,primary:index===0,
    rocket,beam,action:spec.action||'fire',weaponFx:beam?'orbital-beam':spec.family==='pulse'?'interceptor-burst':spec.family,
    muzzleClass:spec.family==='missile'?'launcher':spec.family==='rocket'?'rocket':spec.family==='torpedo'?'torpedo':spec.family==='bomb'?'bombBay':spec.family==='airWing'?'flightDeck':'gun',
    rangeSourceKey:spec.rangeSourceKey||null,rangeReference,status:rangeReference.status,parameterBasis:'伤害/装填/平衡射程为游戏参数；米制射程依单项证据限定。'};
  }));cache.set(key,result);return result;
 }
 function options(value){return typeof value==='string'?{domain:value}:value&&typeof value==='object'?value:{};}
 function canTarget(profile,domain,{personnel=false}={}){
  if(!profile)return false;if(domain==='personnel'){domain='ground';personnel=true;}
  return (!domain||profile.targetDomains.includes(domain))&&(!profile.personnelOnly||!domain||personnel);
 }
 function resolve(entity,targetOrOptions,faction){
  const opts=options(targetOrOptions),domain=opts.domain||opts.targetDomain,available=list(entity,opts.faction||faction),chosen=opts.weaponId??entity?.weaponId??'auto';
  if(!available.length)return null;
  if(chosen!=='auto')return available.find(p=>(p.id===chosen||p.stationId===chosen)&&canTarget(p,domain,opts))||null;
  let candidates=available.filter(p=>canTarget(p,domain,opts));
  if(opts.allowAirWing===false)candidates=candidates.filter(p=>p.action!=='airWing');
  if(Number.isFinite(opts.distance)){
   const ranges=typeof opts.rangeFor==='function'?opts.rangeFor:p=>({range:p.range,minRange:p.minRange});
   const inRange=candidates.filter(p=>{const r=ranges(p);return opts.distance>=(r?.minRange??r?.min??0)&&opts.distance<=(r?.range??r?.attack??p.range);});
   // Caller may request the next approach weapon; otherwise impossible attacks return null.
   if(inRange.length)candidates=inRange;else if(!opts.allowOutOfRange)return null;
  }
  if(opts.personnel||domain==='personnel'){
   const preferred=candidates.find(p=>p.personnelPreferred||p.family==='machinegun'||p.family==='autocannon');if(preferred)return preferred;
  }
  return candidates[0]||null;
 }
 function definition(base,profile){
  if(!profile)return {...base,damage:0,targetDomains:[],rocket:false,beam:false,splash:0,minRange:0,weaponId:null,weaponFamily:null,weaponAction:null};
  return {...base,damage:profile.damage,range:profile.range,minRange:profile.minRange,reload:profile.reload,
   targetDomains:profile.targetDomains,rocket:profile.rocket,beam:profile.beam,splash:profile.splash,
   weaponId:profile.id,weaponFamily:profile.family,weaponFx:profile.weaponFx,weaponAction:profile.action,
   rangeSourceKey:profile.rangeSourceKey,rangeReference:profile.rangeReference,vehicleWeapon:profile,
   personnelOnly:!!profile.personnelOnly,antiAir:profile.targetDomains.includes('air'),antiSpace:profile.targetDomains.includes('space'),
   onlyAir:profile.targetDomains.length>0&&profile.targetDomains.every(d=>d==='air'||d==='space'),
   targetBonuses:profile.targetBonuses||null};
 }
 const api=Object.freeze({list,resolve,definition,apply:definition,supported,canTarget,kinds:freeze(Object.keys(config)),domains:freeze(ALL),clearCache:()=>cache.clear()});
 root.WarVehicleWeapons=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
