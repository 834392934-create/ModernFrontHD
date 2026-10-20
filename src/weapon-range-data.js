/* Public specification evidence only. No mutation of combat data, domains, AI,
 * ammunition or damage. Null means unverified, never zero or "unlimited".
 * Values are metres; game projection is deliberately a separate pure function. */
(function(root){
 'use strict';
 const checked='2026-10-20';
 const sources={
  abrams:{publisher:'USMC / US DoD archive',url:'https://gulflink.fhpr.osd.mil/du_ii/du_ii_refs/n52en230/usmc_factfile_m1a1.html',access:'indexed-primary'},
  t90s:{publisher:'Rosoboronexport',url:'https://roe.ru/pdfs/pdf_4437.pdf',access:'indexed-primary'},
  bradley:{publisher:'US Army ARMOR Jan–Feb 1997, p18',url:'https://www.benning.army.mil/armor/eARMOR/content/issues/1997/JAN_FEB/ArmorJanuaryFebruary1997web.pdf',access:'indexed-primary'},
  paladin:{publisher:'BAE Systems',url:'https://www.baesystems.com/dam/jcr%3A891d545e-5925-442e-a4b1-65172af2647d',access:'indexed-primary'},
  gmlrs:{publisher:'Lockheed Martin',url:'https://lockheedmartin.com/content/dam/lockheed-martin/mfc/pc/guided-mlrs-unitary-rocket/GMLRS-Fast-Facts-Updates.pdf',access:'indexed-primary'},
  ergmlrs:{publisher:'Lockheed Martin',url:'https://www.lockheedmartin.com/en-us/products/guided-mlrs-unitary-rocket.html',access:'indexed-primary'},
  k9:{publisher:'Hyundai WIA',url:'https://www.hyundai-wia.com/business/defense_ground_01.asp',access:'opened-primary'},
  smerch:{publisher:'Rostec / Tecmash',url:'https://rostec.ru/en/media/news/tecmash-will-parade-rocket-artillery-on-victory-day/',access:'indexed-primary'},
  pinaka:{publisher:'India Ministry of Defence / PIB',url:'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1597051&lang=2&reg=48',access:'indexed-primary'},
  chunmoo:{publisher:'Hanwha Aerospace',url:'https://www.hanwhaaerospace.com/eng/media/newsroom/view.do?seq=631',access:'indexed-primary'},
  pantsir:{publisher:'Rosoboronexport',url:'https://roe.ru/upload/pdf/11402_post.pdf',access:'indexed-primary'},
  akash:{publisher:'India Ministry of Defence / DDP',url:'https://www.ddpmod.gov.in/en/resources/products/akash-weapon-system',access:'opened-primary'},
  mk45:{publisher:'US Navy',url:'https://www.navy.mil/DesktopModules/ArticleCS/Print.aspx?Article=2167864&ModuleId=724&PortalId=1',access:'indexed-primary'},
  tomahawk:{publisher:'US Navy',url:'https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169229/tomahawk-cruise-missile/tomahawk-cruise-missile/',access:'indexed-primary'},
  brahmos:{publisher:'BrahMos Aerospace',url:'https://www.brahmos.com/page/brahmos-missile',access:'opened-primary'},
  meteor:{publisher:'Saab (programme partner)',url:'https://www.saab.com/products/meteor',access:'opened-primary'},
  hellfire:{publisher:'Lockheed Martin, 2006 Tiger integration trial',url:'https://investors.lockheedmartin.com/news-releases/news-release-details/lockheed-martin-successfully-completes-hellfire-flight-test',access:'indexed-primary'},
  jagm:{publisher:'Lockheed Martin',url:'https://www.lockheedmartin.com/en-us/products/jagm.html',access:'indexed-primary'},
  m4:{publisher:'US Army CPE Ground',url:'https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M4A1-Carbine/',access:'indexed-primary'},
  m249:{publisher:'US Army CPE Ground',url:'https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M249-Squad-Automatic-Weapon/',access:'indexed-primary'},
  m107:{publisher:'US Army CPE Ground',url:'https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M107-Semi-Automatic-Long-Range-Sniper-Rifle/',access:'indexed-primary'},
  k2:{publisher:'Hyundai Rotem',url:'https://www.hyundai-rotem.co.kr/en/business/defense/details.do?productCt03=defense0101',access:'indexed-primary'},
  aim9:{publisher:'US Air Force',url:'https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104557/aim-9-sidewinder/',access:'indexed-primary'},
  m9:{publisher:'US Army TC 3-21.75, p10-3',url:'https://rdl.train.army.mil/catalog-ws/view/100.ATSC/C6763F0D-4346-4DA6-BC8C-4EBFF5B34997-1377112048566/tc_3-21x75.pdf',access:'indexed-primary'},
  mortar:{publisher:'US Army Watervliet Arsenal',url:'https://www.army.mil/article/109967/watervliets_4_3m_contract_may_lighten_the_load_for_infantrymen',access:'indexed-primary'},
  biho:{publisher:'Hanwha Defense brochure, p26–27',url:'https://www.hanwhaaerospace.com/assets/content/library/download/Hanwha%20Defense%20Brochure_EN.pdf',access:'indexed-primary'}
 };
 const catalog=Object.create(null);
 function add(id,platform,weapon,target,publishedM,publishedKind,minM,qualifier,source,scope,note){
  catalog[id]={id,platform,weapon,target,publishedM,publishedKind,minM,qualifier,
   effectiveM:publishedKind==='effective'?publishedM:null,
   maxM:publishedKind==='maximum'&&qualifier!=='greater-than'?publishedM:null,
   status:publishedM===null?'unverified':'public',scope,source,sourceUrl:sources[source].url,
   reliability:'官方公开口径；不是独立性能测试',checked,note};
 }
 add('m256_demonstrated','M1A1（非 M1A2 SEPv3 专项）','M256 120 mm，报道未分弹种',['ground'],4000,'demonstrated',null,'approaching','abrams','family-reference','沙漠风暴报道接近4km实战交战；不是保证有效射程或精确最大射程。');
 add('t90s_guided','T-90S 出口型','125 mm 炮射导弹系统',['ground'],5000,'maximum',100,'exact','t90s','munition-specific','只适用于该资料中的制导导弹，不能赋给穿甲弹，也不能冒充T-90M资料。');
 add('bradley_m242','M3A3 / Bradley 家族','M242 25 mm',['ground'],3000,'effective',null,'exact','bradley','family-reference','1997陆军刊物家族参考；并非M2A3各弹种、装甲目标效能的专项认证。');
 add('bradley_tow','M3A3 / Bradley 家族','TOW（资料未区分后续改型）',['ground'],3750,'effective',null,'exact','bradley','family-reference','与25mm机炮分开；不能自动赋予全系列最新TOW弹。');
 add('m109a7_unspecified','M109A7 Paladin','M284/M284A2 155 mm，弹种未注明',['ground','structure'],30000,'published',null,'greater-than','paladin','exact-platform-unspecified-ammunition','厂家资料为超过30km；不能把此数值称为普通榴弹有效射程。');
 add('gmlrs','M142 HIMARS / M270','GMLRS Unitary / AW',['ground','structure'],70000,'published',15000,'greater-than','gmlrs','munition-specific','资料写15–70+km；70000是公开下界，非精确极限。');
 add('er_gmlrs','M142 HIMARS / M270','ER GMLRS',['ground','structure'],150000,'maximum',null,'up-to','ergmlrs','development-variant','增程改型单列，不能默认每辆HIMARS都装此弹；服役状态另验。');
 add('k9','K9 155 mm/52','155 mm，厂家未细分弹种',['ground','structure'],40000,'maximum',null,'exact','k9','exact-platform-unspecified-ammunition','WIA表列最大40km；K9 Vajra-T只能作为家族参考，不能隐去改型差别。');
 add('smerch','BM-30 Smerch','300 mm 火箭弹，报道未细分弹种',['ground','structure'],90000,'maximum',null,'exact','smerch','family-reference','Rostec公开最大90km；不推断所有库存弹药同射程。');
 add('pinaka_guided_trial','Pinaka 制导型试验','制导火箭弹',['ground','structure'],75000,'demonstrated',null,'exact','pinaka','trial-reference','2019试验报道75km及20km；20km是另一次试射距离，不是已公布最小射程。');
 add('chunmoo_cgr080','K239 Chunmoo','CGR-080 239 mm 制导火箭',['ground','structure'],80000,'maximum',null,'approximately-up-to','chunmoo','munition-specific','约80km；不与其他Chunmoo口径及弹种混用。');
 add('pantsir_missile','Pantsir-S1','防空导弹',['air'],20000,'maximum',1200,'exact','pantsir','exact-platform','导弹射程；不要与探测距离或S1M/SM改型混用。');
 add('pantsir_gun','Pantsir-S1','30 mm 机炮',['air'],4000,'maximum',200,'exact','pantsir','exact-platform','此来源为对空区间，不能直接推断对地装甲有效距离。');
 add('akash','Akash 基本型','地空导弹',['air'],25000,'maximum',4500,'exact','akash','exact-platform','本页4.5–25km；旧DRDO出口册写3–25km，存在资料口径差异，不套Akash-NG。');
 add('mk45_conventional','DDG51 / Mk45 家族','Mk45 127 mm 常规弹',['ground','naval','air','structure'],13*1852,'published',null,'approximate','mk45','family-reference','按13海里×1852换算24076m；不能视作所有目标/气象条件下同等有效。');
 add('tomahawk_iv_v','美海军舰艇/潜艇','Block IV/V TLAM-E',['ground','structure'],1600000,'published',null,'approximate','tomahawk','munition-specific','采用官方约1600km口径；同页900海里/1000英里为近似值，不能混作精确换算或反舰性能。');
 add('brahmos_baseline','BrahMos 公开基本型','BrahMos 反舰/对陆导弹',['naval','ground','structure'],290000,'maximum',null,'up-to','brahmos','family-reference','公开页基本型290km，不声称印度现役所有批次最大射程均为290km；不套给Rafale。');
 add('meteor','Meteor 兼容战斗机','Meteor BVR 空空导弹',['air'],100000,'published',null,'greater-than','meteor','munition-specific','Saab写100+km；并非不可逃逸区，发射/目标状态影响实际包线，F-35集成状态需另验。');
 add('hellfire_ii_trial','Tiger ARH 试验（Apache仅家族参照）','HELLFIRE II',['ground','structure'],8000,'demonstrated',null,'exact','hellfire','trial-reference','厂家2006试验到8km；不当作各AH-64变型与各弹种统一极限。');
 add('jagm','兼容平台（装载需另验）','JAGM 基本型',['ground','naval','structure'],8000,'published',null,'exact','jagm','munition-specific','厂家JAGM-MR介绍从8km增至16km，不把MR能力赋给所有直升机。');
 add('jagm_mr','兼容平台（装载需另验）','JAGM-MR',['ground','naval','structure'],16000,'published',null,'exact','jagm','development-variant','单列改型，不能据产品页确认每个游戏平台已部署。');
 add('m4a1','M4A1','5.56 mm 卡宾枪',['personnel'],500,'published',null,'exact','m4','weapon-reference','官方页Range 500m，未在该页区分点/面目标；只作为原创步枪角色参照。');
 add('m249_point','标准 M249','5.56 mm 班用机枪',['personnel'],600,'effective',null,'exact','m249','weapon-reference','点目标600m；面目标800m与压制1000m不能用来冒充点目标有效距离。');
 add('m249_area','标准 M249','5.56 mm 班用机枪，面目标',['ground'],800,'effective',null,'exact','m249','weapon-reference','面目标口径，不代表单人命中距离。');
 add('m107','M107 LRSR','标准660-grain .50弹',['personnel','materiel'],2000,'published',null,'exact','m107','weapon-reference','官方公开2000m；原文未给统一命中概率，不能借此声称射手必命中。');
 add('k2_unverified','K2 Black Panther','120 mm L55，弹种未指定',['ground'],null,'unknown',null,'unknown','k2','exact-platform','厂家Range 450km位于Mobility，是续航；该页没有公开主炮射程，绝不填450000m。');
 add('aim9_unverified','AIM-9 系列兼容战斗机','AIM-9（改型需指定）',['air'],null,'unknown',null,'unknown','aim9','family-reference','本次官方事实页未给数值射程，不采用网络常见数字代填。');
 add('m9','M9','9 mm 手枪',['personnel'],50,'effective',null,'exact','m9','weapon-reference','2013公开资料口径；只作为原创手枪角色参照，不宣称是M17性能。');
 add('m224a1','M224A1','60 mm 迫击炮，弹种未指定',['ground','structure'],3500,'maximum',null,'approximate','mortar','weapon-reference','官方报道约3500m；不推断其他口径迫击炮同值。');
 add('biho_gun','BIHO 家族','30 mm 双联机炮',['air'],3000,'effective',null,'exact','biho','family-reference','厂家混合型资料将机炮3km与导弹6km分别列出；本游戏K30模型仅机炮，不继承导弹。官网旧PDF打开失效，核对官方域名索引表格。');
 const mappings={
  'usa:tank':['m256_demonstrated'],'ind:tank':['t90s_guided'],'kor:tank':['k2_unverified'],
  'usa:ifv':['bradley_m242','bradley_tow'],'usa:arty':['m109a7_unspecified'],
  'kor:arty':['k9'],'ind:arty':['k9'],'usa:rocket':['gmlrs','er_gmlrs'],
  'rus:rocket':['smerch'],'ind:rocket':['pinaka_guided_trial'],'kor:rocket':['chunmoo_cgr080'],
  'rus:aa':['pantsir_missile','pantsir_gun'],'ind:aa':['akash'],'kor:aa':['biho_gun'],
  'usa:destroyer':['mk45_conventional','tomahawk_iv_v'],
  'usa:submarine':['tomahawk_iv_v'],'ind:destroyer':['brahmos_baseline'],
  'ind:fighter':['meteor'],'usa:heli':['hellfire_ii_trial'],'kor:heli':['hellfire_ii_trial']
 };
 // These are analogies, not claims that the original role meshes carry these guns.
 const roleReferences={infantry:['m4a1'],machinegun_team:['m249_point','m249_area'],sniper_team:['m107']};
 // Estimates are explicitly game design. References provide comparison only;
 // publishedM/effectiveM/maxM stay null so the chosen values cannot become facts.
 const estimates={
  tank:[3000,'m256_demonstrated','主炮弹种/型号未知；以公开坦克交战参照取3000m游戏估算'],
  ifv:[2500,'bradley_m242','未知机炮同用途估算，不继承Bradley制式型号'],
  arty:[30000,'k9','未知155/152mm炮及弹种，选30000m同用途估算'],
  rocket:[70000,'gmlrs','未核实弹种的远程火箭角色估算，不冒称PHL-191实测'],
  aa:[12000,'pantsir_missile','未知短程防空导弹取12000m角色估算，非HQ-17或Biho公布参数'],
  heli:[8000,'hellfire_ii_trial','未知直升机对地导弹按同用途8000m估算'],
  fighter:[100000,'meteor','未知空空导弹按公开BVR类参考估算；非AIM-120/PL-15/R-77实测'],
  destroyer:[24000,'mk45_conventional','未指定舰炮型号的常规舰炮角色估算'],
  submarine:[20000,null,'重型鱼雷游戏估算20000m；本轮未核实对应型号公开范围'],
  infantry:[500,'m4a1','原创步枪兵按同类公开参数估算'],
  antitank_team:[2500,'t90s_guided','原创便携反装甲武器2500m游戏估算；参考导弹类别，不声称装备炮射导弹'],
  machinegun_team:[600,'m249_point','原创机枪兵采用点目标类别600m估算'],
  mortar_team:[3500,'m224a1','原创迫击炮角色按60mm公开例子估算'],
  assault_team:[300,'m4a1','原创近距突击角色取300m估算'],
  sniper_team:[1200,'m107','原创狙击角色取1200m游戏估算，不声称为M107或其他制式型号'],
  recon_vehicle:[1500,'bradley_m242','原创侦察车辆轻武器/机炮1500m估算'],
  tank_destroyer:[5000,'t90s_guided','原创反装甲导弹车5000m估算，不声称复制T-90S武器'],
  assault_gun:[3000,'m256_demonstrated','原创突击炮3000m同类估算'],
  mobile_ciws:[2000,'pantsir_gun','原创近防机炮2000m估算，不赋予其导弹射程'],
  siege_howitzer:[40000,'k9','原创重炮40000m同类估算'],
  patrol_boat:[3000,'bradley_m242','原创小艇机炮3000m同类估算'],
  recon_boat:[1500,'m249_point','原创侦察艇轻武器1500m游戏估算，参考不等于数值认证'],
  missile_boat:[120000,'brahmos_baseline','原创反舰导弹艇120km游戏估算，非BrahMos实测'],
  arsenal_ship:[300000,'tomahawk_iv_v','原创导弹火力舰300km游戏估算，非TLAM改型认证'],
  missile_sub:[300000,'tomahawk_iv_v','原创巡航导弹潜艇300km游戏估算'],
  shore_bombardment:[30000,'mk45_conventional','原创舰炮对陆30000m游戏估算'],
  air_defense_ship:[50000,'pantsir_missile','原创区域防空舰50km游戏估算，来源只作类别对照'],
  escort_corvette:[3000,'pantsir_gun','原创护航近防炮3000m游戏估算'],
  torpedo_boat:[10000,null,'原创鱼雷艇10000m游戏设定，未核实对应真实弹种'],
  hunter_sub:[25000,null,'原创猎潜鱼雷25000m游戏设定，未核实对应真实弹种'],
  asw_patrol_ship:[10000,null,'原创轻型反潜鱼雷10000m游戏设定，未核实对应真实弹种'],
  attack_drone:[8000,'hellfire_ii_trial','原创攻击无人机对地导弹8000m估算'],
  close_support_aircraft:[2000,'bradley_m242','原创近距支援机炮2000m游戏估算'],
  escort_helicopter:[8000,'hellfire_ii_trial','原创护航直升机导弹8000m估算'],
  interceptor_drone:[10000,'meteor','原创截击无人机10km游戏估算，非Meteor改型'],
  heavy_bomber:[20000,null,'未指定滑翔弹的投放距离20000m游戏设定，不是飞机作战半径'],
  naval_strike_aircraft:[120000,'brahmos_baseline','原创空射反舰导弹120km估算，非飞机航程'],
  turret:[2500,'bradley_m242','通用炮塔2500m估算'],bunker:[800,'m249_area','通用机枪掩体800m面目标估算'],
  ciws:[2000,'pantsir_gun','通用近防炮2000m估算'],sam:[25000,'akash','通用防空阵地25000m估算'],
  sonar_bastion:[10000,null,'原创岸基鱼雷10000m游戏设定，声呐半径不随攻击射程改变']
 };
 const operatorEstimates={
  pistol:[50,'m9','同类手枪有效射程参照'],
  smg:[150,'m9','近距冲锋枪150m游戏估算；M9仅为手枪弹武器类别参照，不是其公开射程'],
  rifle:[500,'m4a1','同类突击步枪500m参照'],
  shotgun:[40,null,'霰弹散射角色40m游戏估算；未核实具体弹丸/枪型，不能当作最大弹道距离'],
  lmg:[600,'m249_point','同类班用机枪点目标600m参照'],
  marksman:[800,'m107','精确射手角色800m游戏估算，非M107公开数值'],
  sniper:[1200,'m107','狙击角色1200m游戏估算，非M107公开数值'],
  launcher:[500,null,'原创肩射发射器500m游戏估算，非自动继承反坦克导弹最大射程']
 };
 function inferred(id,platform,spec,status='inferred'){
  const [estimateM,ref,note]=spec,reference=ref?catalog[ref]:null;
  return deepFreeze({id,platform,weapon:'未指定制式型号的游戏武器',target:[],publishedM:null,publishedKind:'estimate',
   effectiveM:null,maxM:null,minM:null,estimateM,status,scope:'game-role-estimate',qualifier:'estimated',
   source:reference?.source||null,sourceUrl:reference?.sourceUrl||null,referenceIds:ref?[ref]:[],checked,
   reliability:'估算/游戏设定，不是该装备公开性能',note});
 }
 function deepFreeze(o){if(o&&typeof o==='object'&&!Object.isFrozen(o)){for(const x of Object.values(o))deepFreeze(x);Object.freeze(o);}return o;}
 function getProfile(kind,faction,options={}){
  const D=root.WarData,d=D?.U?.[kind]||D?.B?.[kind],f=D?.F?.[faction];
  if(!d||!f)return {status:'invalid',kind,faction,platform:null,records:[],primary:null,notes:'未知游戏种类或阵营'};
  const platform=Number.isInteger(d.index)?f.names[d.index]:D.EXTRA?.[faction]?.[kind]||d.name||kind;
  if(!d.damage)return {status:'unarmed',kind,faction,platform,records:[],primary:null,notes:'非攻击范围不适用武器射程缩放'};
  if(kind==='operator')return getOperatorProfile(options.operatorWeapon||root.WarOperatorWeapons?.byId?.rifle_01);
  if(f.fiction||d.space||d.advanced||kind==='carrier'){
   const primary=inferred('setting:'+faction+':'+kind,platform,[(d.range||0)*10,null,'既有架空/概念能力按旧设计10m/u折算为独立游戏设定；不代表真实武器或载机作战半径'],'game-setting');
   return {status:'game-setting',kind,faction,platform,records:[],primary,notes:primary.note};
  }
  const ids=mappings[faction+':'+kind]||roleReferences[kind]||[],records=ids.map(id=>catalog[id]);
  let primary=options.weaponId?records.find(r=>r.id===options.weaponId)||null:records[0]||null;
  if(!options.weaponId&&(!primary||primary.publishedM===null||['tank','submarine'].includes(kind)||roleReferences[kind]||faction==='ind'&&['arty','destroyer'].includes(kind))){
   const spec=estimates[kind]||estimates[d.modelKind]||[(d.range||0)*10,null,'缺少同类公开规格，保留可追踪的游戏估算'];
   primary=inferred('inferred:'+faction+':'+kind,platform,spec);
  }else if(!options.weaponId&&['family-reference','trial-reference'].includes(primary?.scope)){
   primary=inferred('inferred:'+faction+':'+kind,platform,[primary.publishedM,primary.id,'采用家族/试验公开例子作当前槽位估算；不宣称已核实本槽位具体改型和装弹。'+primary.note]);
  }
  const status=primary?.status||'unverified';
  return {status,kind,faction,platform,records,primary,notes:'逐弹种证据；范围不赋予新目标域。primary为当前游戏选值，records保留原始公开参照；必须核对weapon/target/scope。'};
 }
 function getOperatorProfile(weapon){
  const w=typeof weapon==='string'?root.WarOperatorWeapons?.byId?.[weapon]:weapon,spec=operatorEstimates[w?.category];
  if(!spec)return {status:'invalid',kind:'operator',platform:null,records:[],primary:null,notes:'未知原创枪械类别'};
  // Variants remain visual/handling variants: no unsupported 1.32x "real range".
  const primary=inferred('inferred:operator:'+w.id,w.name||w.id,spec);
  return {status:'inferred',kind:'operator',platform:w.name||w.id,records:primary.referenceIds.map(id=>catalog[id]),primary,notes:'原创角色枪：采用同类公开参数或明确估算；科幻目标域仍是游戏设定'};
 }
 function resolve(recordOrId,{metric='selected',metersPerUnit=1}={}){
  if(!Number.isFinite(metersPerUnit)||metersPerUnit<=0)throw new RangeError('metersPerUnit must be finite and positive');
  if(!['selected','published','effective','maximum'].includes(metric))throw new RangeError('Unknown range metric');
  const p=typeof recordOrId==='string'?catalog[recordOrId]:recordOrId;
  const value=metric==='selected'&&['inferred','game-setting'].includes(p?.status)?p.estimateM:p?.[metric==='effective'?'effectiveM':metric==='maximum'?'maxM':'publishedM'];
  const known=typeof value==='number'&&Number.isFinite(value)&&value>=0,minimum=p?.minM;
  return {known,range:known?value/metersPerUnit:null,minRange:known&&Number.isFinite(minimum)?minimum/metersPerUnit:null,
   meters:known?value:null,minMeters:known&&Number.isFinite(minimum)?minimum:null,metersPerUnit,metric,
   qualifier:p?.qualifier||'unknown',publishedKind:p?.publishedKind||'unknown',status:p?.status||'unverified',sourceUrl:p?.sourceUrl||null,verified:p?.status==='public'};
 }
 deepFreeze(sources);deepFreeze(catalog);deepFreeze(mappings);deepFreeze(roleReferences);
 deepFreeze(estimates);deepFreeze(operatorEstimates);
 const api=Object.freeze({checked,sources,catalog,mappings,roleReferences,estimates,operatorEstimates,getProfile,getOperatorProfile,resolve});
 root.WarWeaponRanges=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
