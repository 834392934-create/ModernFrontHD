(function (root) {
  "use strict";
  const D = root.WarData, U = D.U;
  // Model families provide visual parts only; new roles never inherit a real model name/index.
  for (const [kind, d] of Object.entries(U)) {
    d.unitGroup = d.space ? "space" : d.air ? "air" : d.naval ? "naval" : "ground";
    d.modelKind = kind;
    d.combatRole = kind === "harvester" ? "logistics" : !d.damage ? "reconnaissance" : "combat";
  }
  const added = [];
  function add(kind, group, modelKind, variant, props) {
    const d = Object.assign({}, U[modelKind]);
    for (const field of ["index", "air", "space", "ground", "naval", "antiAir", "antiSpace", "onlyAir", "advanced", "spaceWeapon", "heal", "splash", "minRange", "capacity", "harvestRate"])
      delete d[field];
    Object.assign(d, {
      unitGroup: group, modelKind, variant, roleVariant: true,
      combatRole: "combat", aiWeight: 1, targetDomains: [],
      weaponFx: "projectile",
    }, props);
    d[group] = true;
    if (group === "space") d.air = true;
    d.antiAir = d.targetDomains.includes("air");
    d.antiSpace = d.targetDomains.includes("space");
    if (d.targetDomains.length && d.targetDomains.every(domain => domain === "air" || domain === "space")) d.onlyAir = true;
    if (group === "space" && (d.damage > 0 || d.fireControl?.enemy)) {
      d.spaceWeapon = true;
      d.advanced = true;
    }
    if (!d.damage && d.heal) d.combatRole = "repair";
    else if (d.fireControl || d.shield) d.combatRole = "support";
    else if (!d.damage) d.combatRole = "reconnaissance";
    U[kind] = d;
    added.push(kind);
  }

  add("antitank_team", "ground", "infantry", "antitank", {
    name: "反坦克导弹兵", role: "陆军反装甲 / 高单发、慢装填 / 脆弱步兵",
    cost: 260, hp: 115, speed: 58, damage: 48, range: 245, reload: 3,
    sight: 260, r: 8, time: 5, producer: "barracks", icon: "↗",
    targetDomains: ["ground", "structure"], targetBonuses: { tank: 1.7, ifv: 1.45, aa: 1.25 }, rocket: true,
  });
  add("machinegun_team", "ground", "infantry", "machinegun", {
    name: "机枪手", role: "中距反步兵 / 快速连射 / 对重装甲弱",
    cost: 220, hp: 130, speed: 54, damage: 9, range: 205, reload: 0.32,
    sight: 270, r: 8, time: 4, producer: "barracks", icon: "⋯",
    targetDomains: ["ground", "structure"], targetBonuses: { infantry: 1.8, tank: 0.35, ifv: 0.45, aa: 0.7 },
  });
  add("recon_vehicle", "ground", "ifv", "recon", {
    name: "轻型侦察车", role: "快速前出 / 大视野 / 弱自卫火力",
    cost: 350, hp: 180, speed: 120, damage: 10, range: 155, reload: 0.8,
    sight: 510, r: 13, time: 5, producer: "factory", icon: "◉",
    targetDomains: ["ground", "structure"], aiWeight: 0.6,
  });
  add("repair_vehicle", "ground", "harvester", "repair", {
    name: "装甲维修车", role: "无武装 / 近距维修友方陆军 / 不能修复基地",
    cost: 650, hp: 370, speed: 68, damage: 0, range: 170, reload: 1,
    sight: 250, r: 14, time: 9, producer: "factory", icon: "+",
    heal: 22, healDomains: ["ground"], aiWeight: 0.45,
  });
  add("mortar_team", "ground", "infantry", "mortar", {
    name: "轻型迫击炮手", role: "廉价曲射溅射 / 最小射程 90 / 需要侦察",
    cost: 340, hp: 100, speed: 48, damage: 52, range: 335, minRange: 90, reload: 3.4,
    sight: 215, r: 8, time: 6, producer: "barracks", icon: "⌁", splash: 35,
    targetDomains: ["ground", "structure"],
  });
  add("assault_team", "ground", "infantry", "assault", {
    name: "重装突击兵", role: "近距离突入 / 较高生命 / 射程短",
    cost: 230, hp: 170, speed: 84, damage: 19, range: 100, reload: 0.65,
    sight: 230, r: 9, time: 4, producer: "barracks", icon: "◆",
    targetDomains: ["ground", "structure"],
  });

  add("frigate", "naval", "destroyer", "frigate", {
    name: "通用护卫舰", role: "低成本海域护航 / 兼顾防空 / 火力弱于驱逐舰",
    cost: 1100, hp: 900, speed: 82, damage: 68, range: 405, reload: 2.2,
    sight: 420, r: 22, time: 15, producer: "navalyard", icon: "⚓",
    targetDomains: ["ground", "naval", "air", "structure"],
  });
  add("patrol_boat", "naval", "destroyer", "patrol", {
    name: "高速巡逻艇", role: "廉价近海炮艇 / 高速快射 / 射程短",
    cost: 460, hp: 350, speed: 115, damage: 22, range: 250, reload: 0.65,
    sight: 350, r: 14, time: 7, producer: "navalyard", icon: "▸",
    targetDomains: ["ground", "naval", "structure"],
  });
  add("missile_boat", "naval", "destroyer", "missile", {
    name: "反舰导弹艇", role: "只攻击海军 / 高单发远射程 / 低生命慢装填",
    cost: 820, hp: 390, speed: 105, damage: 170, range: 570, reload: 5,
    sight: 365, r: 16, time: 12, producer: "navalyard", icon: "⋙",
    targetDomains: ["naval"], rocket: true,
  });
  add("shore_bombardment", "naval", "destroyer", "artillery", {
    name: "岸攻火力舰", role: "仅攻击陆军和建筑 / 远程溅射 / 最小射程 180",
    cost: 2000, hp: 1100, speed: 54, damage: 160, range: 720, minRange: 180, reload: 5.6,
    sight: 360, r: 27, time: 24, producer: "navalyard", icon: "⌁", splash: 68,
    targetDomains: ["ground", "structure"],
  });
  add("air_defense_ship", "naval", "destroyer", "antiair", {
    name: "舰队防空舰", role: "仅对空 / 远程连射 / 无对舰和对地火力",
    cost: 1400, hp: 1050, speed: 75, damage: 36, range: 510, reload: 0.55,
    sight: 480, r: 24, time: 18, producer: "navalyard", icon: "⌖",
    targetDomains: ["air"], rocket: true,
  });
  add("repair_ship", "naval", "carrier", "repair", {
    name: "舰队维修舰", role: "无武装 / 近距维修友方海军 / 需要护航",
    cost: 1250, hp: 1050, speed: 62, damage: 0, range: 215, reload: 1,
    sight: 340, r: 27, time: 19, producer: "navalyard", icon: "+",
    heal: 30, healDomains: ["naval"], aiWeight: 0.45,
  });
  add("recon_boat", "naval", "destroyer", "recon", {
    name: "海上侦察艇", role: "大范围海域侦察 / 高速脆弱 / 弱自卫火力",
    cost: 520, hp: 260, speed: 125, damage: 12, range: 205, reload: 0.8,
    sight: 710, r: 15, time: 8, producer: "navalyard", icon: "◉",
    targetDomains: ["naval"], aiWeight: 0.6,
  });

  add("recon_drone", "air", "fighter", "recon", {
    name: "侦察无人机", role: "无武装 / 高速侦察 / 低成本低生命",
    cost: 480, hp: 120, speed: 190, damage: 0, range: 0, reload: 1,
    sight: 620, r: 13, time: 7, producer: "airfield", icon: "◇", aiWeight: 0.6,
  });
  add("attack_drone", "air", "fighter", "drone", {
    name: "察打一体无人机", role: "对陆海及建筑单体打击 / 低成本 / 无制空能力",
    cost: 650, hp: 200, speed: 145, damage: 46, range: 310, reload: 1.8,
    sight: 360, r: 13, time: 9, producer: "airfield", icon: "↗",
    targetDomains: ["ground", "naval", "structure"], rocket: true,
  });
  add("interceptor", "air", "fighter", "interceptor", {
    name: "远程截击机", role: "只攻击飞机 / 高速远射程 / 装填较慢",
    cost: 1800, hp: 400, speed: 225, damage: 108, range: 430, reload: 2.5,
    sight: 430, r: 20, time: 19, producer: "airfield", icon: "⋈",
    targetDomains: ["air"], rocket: true,
  });
  add("close_support_aircraft", "air", "fighter", "support", {
    name: "近距支援机", role: "对陆军及建筑溅射 / 高耐久 / 短射程低速",
    cost: 1350, hp: 550, speed: 125, damage: 65, range: 245, reload: 1.8,
    sight: 330, r: 22, time: 17, producer: "airfield", icon: "⌁", splash: 42,
    targetDomains: ["ground", "structure"],
  });
  add("heavy_bomber", "air", "fighter", "bomber", {
    name: "重型轰炸机", role: "对陆海及建筑大范围轰击 / 昂贵、慢速、慢装填",
    cost: 2600, hp: 900, speed: 110, damage: 220, range: 465, reload: 6,
    sight: 350, r: 28, time: 28, producer: "airfield", icon: "▰", splash: 80,
    targetDomains: ["ground", "naval", "structure"], damageBonuses: { structure: 1.2 },
  });
  add("early_warning_aircraft", "air", "fighter", "radar", {
    name: "空中预警机", role: "无武装 / 超大视野 / 较慢较昂贵；不提供额外伤害加成",
    cost: 1450, hp: 480, speed: 120, damage: 0, range: 0, reload: 1,
    sight: 930, r: 25, time: 18, producer: "airfield", icon: "◉", aiWeight: 0.4,
  });
  add("escort_helicopter", "air", "heli", "escort", {
    name: "防空护航直升机", role: "只攻击飞机 / 近距快射 / 保护慢速航空编队",
    cost: 1050, hp: 360, speed: 135, damage: 25, range: 250, reload: 0.4,
    sight: 390, r: 18, time: 14, producer: "airfield", icon: "✣",
    targetDomains: ["air"],
  });

  add("orbital_sniper", "space", "orbital_interceptor", "sniper", {
    name: "反轨狙击舰（架空）", role: "只攻击太空 / 超远单体火力 / 低速慢装填",
    cost: 3400, hp: 720, speed: 65, damage: 290, range: 920, minRange: 160, reload: 5.4,
    sight: 560, r: 24, time: 30, producer: "spaceport", icon: "↟",
    targetDomains: ["space"], weaponFx: "orbital-beam",
  });
  add("orbital_point_defense", "space", "orbital_interceptor", "pointdefense", {
    name: "轨道近防护卫舰（架空）", role: "只攻击大气层飞机 / 快速连射 / 无对轨和对地火力",
    cost: 2300, hp: 1000, speed: 100, damage: 34, range: 430, reload: 0.35,
    sight: 540, r: 23, time: 24, producer: "spaceport", icon: "⌖",
    targetDomains: ["air"], weaponFx: "interceptor-burst",
  });
  add("orbital_bombardment", "space", "orbital", "bombardment", {
    name: "轨道岸攻平台（架空）", role: "只攻击陆军和海军 / 集群溅射 / 不能攻击基地",
    cost: 4100, hp: 1400, speed: 50, damage: 145, range: 690, reload: 4.5,
    sight: 460, r: 28, time: 34, producer: "spaceport", icon: "⌁", splash: 75,
    targetDomains: ["ground", "naval"], weaponFx: "orbital-beam",
  });
  add("orbital_siege", "space", "orbital", "siege", {
    name: "轨道攻城舰（架空）", role: "只攻击建筑 / 高单发 / 最小射程 220、机动低",
    cost: 4700, hp: 1650, speed: 40, damage: 460, range: 830, minRange: 220, reload: 6.8,
    sight: 430, r: 30, time: 37, producer: "spaceport", icon: "✧",
    targetDomains: ["structure"], weaponFx: "orbital-beam",
  });
  add("orbital_repair", "space", "satellite", "repair", {
    name: "轨道维修站（架空）", role: "无武装 / 近距维修友方太空单位 / 移动缓慢",
    cost: 2100, hp: 850, speed: 55, damage: 0, range: 260, reload: 1,
    sight: 500, r: 25, time: 24, producer: "spaceport", icon: "+",
    heal: 34, healDomains: ["space"], aiWeight: 0.45,
  });
  add("orbital_mapper", "space", "satellite", "mapping", {
    name: "广域测绘星（架空）", role: "无武装 / 超大视野 / 低机动低耐久",
    cost: 2400, hp: 380, speed: 35, damage: 0, range: 0, reload: 1,
    sight: 1150, r: 23, time: 26, producer: "spaceport", icon: "◉", aiWeight: 0.4,
  });
  add("orbital_raider", "space", "orbital_interceptor", "raider", {
    name: "轨道突袭舰（架空）", role: "海陆及基地近距离突袭 / 高机动 / 低耐久无对空能力",
    cost: 2800, hp: 650, speed: 180, damage: 82, range: 325, reload: 0.9,
    sight: 460, r: 22, time: 25, producer: "spaceport", icon: "◆",
    targetDomains: ["ground", "naval", "structure"], weaponFx: "interceptor-burst",
  });

  // Reinforcement wave: role differences are implemented, not descriptive-only traits.
  const waveStart=added.length;
  add("tank_destroyer", "ground", "ifv", "missile-carrier", {
    name:"反坦克歼击车",role:"远射程反装甲 / 轻型8轮底盘 / 怕步兵近身",
    cost:980,hp:360,speed:90,damage:105,range:470,minRange:75,reload:4.2,sight:340,r:16,time:14,producer:"factory",icon:"↗",
    targetDomains:["ground","structure"],targetBonuses:{tank:1.8,ifv:1.45,infantry:.42},rocket:true,
  });
  add("siege_howitzer", "ground", "arty", "siege", {
    name:"重型攻城榴炮",role:"超远程对地溅射 / 对建筑加成 / 盲区200、机动缓慢",
    cost:1950,hp:450,speed:42,damage:175,range:770,minRange:200,reload:6.5,sight:260,r:20,time:25,producer:"factory",icon:"⌁",splash:65,
    targetDomains:["ground","structure"],damageBonuses:{structure:1.5},
  });
  add("field_medic", "ground", "infantry", "medic", {
    name:"战地医护兵",role:"无武装 / 仅治疗友方步兵 / 不能维修车辆与建筑",
    cost:260,hp:125,speed:70,damage:0,range:145,reload:1,sight:240,r:9,time:5,producer:"barracks",icon:"+",
    heal:14,healDomains:["ground"],healFamilies:["infantry"],aiWeight:.45,
  });
  add("torpedo_boat", "naval", "destroyer", "torpedo", {
    name:"高速鱼雷艇",role:"仅对舰 / 近距离高单发 / 脆弱高速、需接近舰队",
    cost:680,hp:320,speed:137,damage:220,range:220,reload:4.1,sight:330,r:14,time:10,producer:"navalyard",icon:"»",
    targetDomains:["naval"],weaponFx:"torpedo",
  });
  add("arsenal_ship", "naval", "destroyer", "arsenal", {
    name:"导弹武库舰",role:"陆海及基地远程导弹 / 盲区170 / 昂贵缓慢、需防空护航",
    cost:2800,hp:1450,speed:45,damage:190,range:820,minRange:170,reload:5.8,sight:380,r:29,time:31,producer:"navalyard",icon:"▦",splash:48,
    targetDomains:["ground","naval","structure"],rocket:true,
  });
  add("escort_corvette", "naval", "destroyer", "ciws-escort", {
    name:"近防护航舰",role:"近距对舰防空 / 拦截250范围内敌方火箭 / 每0.8秒一次",
    cost:1250,hp:780,speed:88,damage:22,range:310,reload:.45,sight:410,r:20,time:16,producer:"navalyard",icon:"⌖",
    targetDomains:["naval","air"],interceptRange:250,interceptReload:.8,
  });
  add("rescue_helicopter", "air", "heli", "rescue", {
    name:"战场救援直升机",role:"无武装 / 快速治疗地面步兵 / 怕防空、不维修车辆",
    cost:850,hp:290,speed:155,damage:0,range:190,reload:1,sight:380,r:18,time:12,producer:"airfield",icon:"+",
    heal:22,healDomains:["ground"],healFamilies:["infantry"],aiWeight:.4,
  });
  add("naval_strike_aircraft", "air", "fighter", "antiship", {
    name:"反舰攻击机",role:"仅攻击舰艇 / 高速远程导弹 / 无自卫对空火力",
    cost:1600,hp:350,speed:185,damage:185,range:540,reload:4.6,sight:400,r:21,time:20,producer:"airfield",icon:"↗",
    targetDomains:["naval"],rocket:true,
  });
  add("electronic_warfare_aircraft", "air", "fighter", "electronic", {
    name:"战术电子战飞机",role:"无直接火力 / 260范围内敌方陆海空及建筑装填耗时+30% / 同类不叠加",
    cost:1900,hp:380,speed:165,damage:0,range:260,reload:1,sight:510,r:22,time:23,producer:"airfield",icon:"≈",aiWeight:.4,
    fireControl:{enemy:true,multiplier:1.3,domains:["ground","naval","air","structure"]},supportDomains:["ground","naval","air"],
  });
  add("orbital_escort", "space", "orbital_interceptor", "close-escort", {
    name:"轨道护航舰（架空）",role:"近距空天连射 / 高耐久护航 / 不攻击地面和基地",
    cost:2700,hp:1250,speed:105,damage:44,range:350,reload:.42,sight:500,r:24,time:26,producer:"spaceport",icon:"⌖",
    targetDomains:["air","space"],weaponFx:"interceptor-burst",
  });
  add("orbital_relay", "space", "satellite", "command-relay", {
    name:"轨道指挥中继站（架空）",role:"无武装 / 280范围友方空天单位装填耗时-15% / 同类不叠加",
    cost:2200,hp:650,speed:65,damage:0,range:280,reload:1,sight:650,r:24,time:24,producer:"spaceport",icon:"⌁",aiWeight:.4,
    fireControl:{enemy:false,multiplier:.85,domains:["air","space"]},supportDomains:["air","space"],
  });
  add("orbital_jammer", "space", "satellite", "electronic-denial", {
    name:"轨道电子压制站（架空）",role:"无直接火力 / 360范围敌方太空装填耗时+35% / 受AI太空武器禁令约束",
    cost:2900,hp:800,speed:75,damage:0,range:360,reload:1,sight:560,r:25,time:28,producer:"spaceport",icon:"≈",aiWeight:.4,
    fireControl:{enemy:true,multiplier:1.35,domains:["space"]},supportDomains:["space"],
  });
  const reinforcements=added.slice(waveStart);

  // Tactical wave: fills support gaps while retaining existing production and control rules.
  const tacticalStart=added.length;
  add("sniper_team","ground","infantry","precision",{
    name:"侦察狙击手",role:"远距反步兵 / 独立侦察 / 怕重装甲与近身突击",
    cost:390,hp:85,speed:64,damage:42,range:430,minRange:60,reload:3.4,sight:490,r:8,time:7,producer:"barracks",icon:"⌖",
    targetDomains:["ground"],targetBonuses:{infantry:2.2,tank:.15,ifv:.3,aa:.35},
  });
  add("mobile_ciws","ground","aa","mobile-interception",{
    name:"机动近防车",role:"短程对空机炮 / 拦截220范围敌方火箭 / 不直接攻击地面",
    cost:1100,hp:390,speed:78,damage:16,range:275,reload:.32,sight:370,r:16,time:16,producer:"factory",icon:"⌖",
    targetDomains:["air"],interceptRange:220,interceptReload:.65,
  });
  add("fleet_command_ship","naval","carrier","fleet-command",{
    name:"舰队指挥舰",role:"无武装 / 280范围友方舰艇装填耗时-20% / 同类不叠加",
    cost:1700,hp:1120,speed:65,damage:0,range:280,reload:1,sight:570,r:26,time:22,producer:"navalyard",icon:"⌁",aiWeight:.4,
    fireControl:{enemy:false,multiplier:.8,domains:["naval"]},supportDomains:["naval"],
  });
  add("electronic_warfare_ship","naval","destroyer","fleet-denial",{
    name:"海上电子战舰",role:"无直接火力 / 320范围敌舰装填耗时+25% / 需要舰队护航",
    cost:1650,hp:800,speed:81,damage:0,range:320,reload:1,sight:590,r:23,time:21,producer:"navalyard",icon:"≈",aiWeight:.4,
    fireControl:{enemy:true,multiplier:1.25,domains:["naval"]},supportDomains:["naval"],
  });
  add("air_repair_drone","air","heli","aerial-maintenance",{
    name:"空中维修无人机（概念）",role:"无武装 / 仅修复友方大气层飞机 / 不修陆海与轨道单位",
    cost:900,hp:210,speed:160,damage:0,range:180,reload:1,sight:330,r:14,time:13,producer:"airfield",icon:"+",aiWeight:.45,
    heal:18,healDomains:["air"],
  });
  add("interceptor_drone","air","fighter","light-interception",{
    name:"轻型截击无人机（概念）",role:"廉价近程制空 / 高速脆弱 / 无对地对舰火力",
    cost:720,hp:170,speed:245,damage:17,range:205,reload:.5,sight:390,r:13,time:10,producer:"airfield",icon:"⋈",
    targetDomains:["air"],
  });
  add("orbital_shield","space","satellite","fleet-shield",{
    name:"轨道护盾舰（架空）",role:"无武装 / 210范围友方太空减伤25%含自身 / 取最强护盾、不叠加、EMP停机",
    cost:2800,hp:1150,speed:70,damage:0,range:210,reload:1,sight:470,r:26,time:28,producer:"spaceport",icon:"◈",aiWeight:.45,
    shield:.25,shieldDomains:["space"],supportDomains:["space"],
  });
  add("orbital_missile_barge","space","orbital","missile-salvo",{
    name:"轨道导弹驳船（架空）",role:"仅对轨道集群溅射 / 盲区120 / 导弹可被近防拦截",
    cost:3300,hp:900,speed:57,damage:130,range:610,minRange:120,reload:4.8,sight:480,r:27,time:30,producer:"spaceport",icon:"▦",
    targetDomains:["space"],splash:60,rocket:true,weaponFx:"orbital-missile",
  });
  const tacticalWave=added.slice(tacticalStart);

  // Depth / all-domain wave: original game roles, not claims about real weapon performance.
  Object.assign(U.submarine,{underwater:true,sonarRange:400,targetDomains:['naval','underwater'],weaponFx:'torpedo',role:'水下隐蔽 / 声呐探测 / 对舰与反潜鱼雷'});
  Object.assign(U.destroyer,{sonarRange:420,targetDomains:['ground','naval','underwater','air','structure']});
  Object.assign(U.frigate,{sonarRange:460,targetDomains:['naval','underwater','air'],role:'舰队护航 / 声呐反潜 / 对舰防空'});
  const depthStart=added.length;
  add('hunter_sub','naval','submarine','deep-hunter',{
    name:'深海猎潜艇（原创）',role:'水下隐蔽 / 500范围声呐 / 对舰与反潜重型鱼雷',
    cost:2600,hp:1200,speed:76,damage:240,range:500,reload:4.2,sight:300,r:23,time:28,producer:'navalyard',icon:'◉',
    underwater:true,sonarRange:500,targetDomains:['naval','underwater'],weaponFx:'torpedo',
  });
  add('abyss_tender','naval','submarine','deep-support',{
    name:'深海保障潜艇（概念）',role:'无武装 / 仅维修友方水下单位 / 360范围声呐',
    cost:2100,hp:1350,speed:58,damage:0,range:220,reload:1,sight:280,r:26,time:25,producer:'navalyard',icon:'+',
    underwater:true,sonarRange:360,heal:35,healDomains:['underwater'],targetDomains:[],aiWeight:.35,
  });
  add('omni_striker','air','fighter','all-domain-assault',{
    name:'寰宇全域突击机（架空）',role:'昂贵先进科技 / 陆海潜空天及基地攻击 / 700范围声呐',
    cost:12000,hp:2600,speed:210,damage:220,range:600,reload:1.5,sight:650,r:28,time:65,producer:'airfield',icon:'✦',
    advanced:true,sonarRange:700,targetDomains:['ground','naval','underwater','air','space','structure'],rocket:true,splash:40,aiWeight:.12,
  });
  add('omni_dreadnought','space','orbital','all-domain-dreadnought',{
    name:'寰宇全域无畏舰（架空）',role:'极昂贵轨道旗舰 / 陆海潜空天及基地攻击 / 受AI太空武器禁令约束',
    cost:20000,hp:6000,speed:60,damage:400,range:850,reload:2.5,sight:800,r:35,time:95,producer:'spaceport',icon:'✧',
    advanced:true,sonarRange:950,targetDomains:['ground','naval','underwater','air','space','structure'],weaponFx:'orbital-beam',splash:60,aiWeight:.08,
  });
  const depthWave=added.slice(depthStart);

  // Orbital weapons use a compressed cross-layer projection range; same-layer height still matters.
  for(const d of Object.values(U))if(d.space&&d.damage>0){
    d.range=Math.min(d===U.omni_dreadnought?2800:2400,Math.max(1250,Math.round(d.range*2.2)));
    d.role+=' / 跨层使用轨道投影射程';
  }
  U.asat.range=1400;
  const altitudeStart=added.length;
  add('assault_gun','ground','tank','assault-casemate',{
    name:'重装突击炮（原创）',role:'近程对地 / 对建筑加成 / 厚装甲低机动',cost:1550,hp:1250,speed:48,damage:150,range:260,reload:3.2,sight:300,r:21,time:22,producer:'factory',icon:'▰',
    targetDomains:['ground','structure'],damageBonuses:{structure:1.7},splash:28,
  });
  add('mobile_radar','ground','ifv','mobile-fire-control',{
    name:'机动火控雷达车（原创）',role:'无武装 / 300范围友方陆军装填耗时-15% / 同类不叠加',cost:1200,hp:380,speed:86,damage:0,range:300,reload:1,sight:620,r:18,time:18,producer:'factory',icon:'◉',aiWeight:.4,
    targetDomains:[],fireControl:{enemy:false,multiplier:.85,domains:['ground']},supportDomains:['ground'],
  });
  add('asw_patrol_ship','naval','destroyer','asw-patrol',{
    name:'反潜巡逻舰（原创）',role:'650范围声呐 / 对舰反潜鱼雷 / 无防空',cost:1750,hp:1050,speed:95,damage:170,range:610,reload:3.2,sight:430,r:23,time:23,producer:'navalyard',icon:'≋',
    sonarRange:650,targetDomains:['naval','underwater'],weaponFx:'torpedo',
  });
  add('missile_sub','naval','submarine','cruise-missile',{
    name:'巡航导弹潜艇（原创）',role:'潜航远程对岸对舰 / 对潜鱼雷 / 无空天火力',cost:3600,hp:1250,speed:60,damage:260,range:1000,minRange:120,reload:6,sight:350,r:26,time:38,producer:'navalyard',icon:'↗',
    underwater:true,sonarRange:480,targetDomains:['ground','naval','underwater','structure'],rocket:true,splash:40,
  });
  add('high_altitude_interceptor','air','fighter','high-altitude-interception',{
    name:'高空截击机（架空）',role:'先进科技 / 空天截击 / 跨层投影射程950 / 无对地武器',cost:4100,hp:800,speed:260,damage:150,range:950,reload:2.4,sight:650,r:23,time:36,producer:'airfield',icon:'↟',advanced:true,
    targetDomains:['air','space'],rocket:true,
  });
  add('strategic_strike_aircraft','air','fighter','strategic-strike',{
    name:'重型远程突击机（原创）',role:'远程海陆及基地打击 / 慢速高耐久 / 无自卫对空火力',cost:4600,hp:1450,speed:135,damage:280,range:1000,minRange:150,reload:5.2,sight:580,r:30,time:42,producer:'airfield',icon:'✈',
    targetDomains:['ground','naval','structure'],splash:75,rocket:true,
  });
  add('orbital_carrier','space','orbital','orbital-fire-carrier',{
    name:'轨道火力母舰（架空）',role:'远距制空天 / 多炮位齐射 / 轨道投影射程2300 / 无生产功能',cost:8500,hp:3100,speed:52,damage:260,range:2300,minRange:180,reload:2.8,sight:950,r:34,time:60,producer:'spaceport',icon:'✧',
    targetDomains:['air','space'],weaponFx:'interceptor-burst',splash:42,aiWeight:.3,
  });
  add('orbital_sensor','space','satellite','orbital-early-warning',{
    name:'轨道预警阵列（架空）',role:'无武装 / 投影600范围友方空天装填耗时-20% / 同类不叠加',cost:3200,hp:900,speed:70,damage:0,range:600,reload:1,sight:1350,r:28,time:31,producer:'spaceport',icon:'◉',aiWeight:.4,
    targetDomains:[],fireControl:{enemy:false,multiplier:.8,domains:['air','space']},supportDomains:['air','space'],
  });
  const altitudeWave=added.slice(altitudeStart);

  // A single original playable soldier, separate from the existing infantry squad.
  U.operator={...U.infantry,name:'前线行动员（原创）',role:'独立玩家角色 / 64款军械 / B配装、R装填、1/2切换',modelKind:'infantry',unitGroup:'ground',ground:true,combatRole:'combat',playerOnly:true,roleVariant:true,aiWeight:0,cost:900,hp:240,speed:78,damage:33,range:460,reload:.115,sight:550,r:8,time:12,producer:'barracks',icon:'◎',targetDomains:['ground','structure','naval','underwater','air','space']};

  D.UNIT_GROUPS = {
    ground: { name: "陆军", icon: "▰" }, naval: { name: "海军", icon: "⚓" },
    air: { name: "空军", icon: "✈" }, space: { name: "太空", icon: "✧" },
  };
  D.ROSTER = {
    added,
    reinforcements,
    tacticalWave,
    depthWave,
    altitudeWave,
    logistics: ["harvester"],
    groups: Object.fromEntries(Object.keys(D.UNIT_GROUPS).map(group => [group,
      Object.keys(U).filter(kind => U[kind].unitGroup === group && U[kind].combatRole !== "logistics"),
    ])),
    parameterBasis: "新增角色的生命、射程、伤害、速度和修复量均为游戏平衡参数，不代表真实装备性能。",
  };
  if (typeof module !== "undefined") module.exports = D.ROSTER;
})(typeof globalThis !== "undefined" ? globalThis : this);
