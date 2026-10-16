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
    if (group === "space" && d.damage > 0) {
      d.spaceWeapon = true;
      d.advanced = true;
    }
    if (!d.damage && d.heal) d.combatRole = "repair";
    else if (!d.damage) d.combatRole = "reconnaissance";
    U[kind] = d;
    added.push(kind);
  }

  add("antitank_team", "ground", "infantry", "antitank", {
    name: "反坦克导弹班", role: "陆军反装甲 / 高单发、慢装填 / 脆弱步兵",
    cost: 260, hp: 115, speed: 58, damage: 48, range: 245, reload: 3,
    sight: 260, r: 8, time: 5, producer: "barracks", icon: "↗",
    targetDomains: ["ground", "structure"], targetBonuses: { tank: 1.7, ifv: 1.45, aa: 1.25 }, rocket: true,
  });
  add("machinegun_team", "ground", "infantry", "machinegun", {
    name: "机枪火力班", role: "中距反步兵 / 快速连射 / 对重装甲弱",
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
    name: "迫击炮班", role: "廉价曲射溅射 / 最小射程 90 / 需要侦察",
    cost: 340, hp: 100, speed: 48, damage: 52, range: 335, minRange: 90, reload: 3.4,
    sight: 215, r: 8, time: 6, producer: "barracks", icon: "⌁", splash: 35,
    targetDomains: ["ground", "structure"],
  });
  add("assault_team", "ground", "infantry", "assault", {
    name: "重装突击班", role: "近距离突入 / 较高生命 / 射程短",
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

  D.UNIT_GROUPS = {
    ground: { name: "陆军", icon: "▰" }, naval: { name: "海军", icon: "⚓" },
    air: { name: "空军", icon: "✈" }, space: { name: "太空", icon: "✧" },
  };
  D.ROSTER = {
    added,
    logistics: ["harvester"],
    groups: Object.fromEntries(Object.keys(D.UNIT_GROUPS).map(group => [group,
      Object.keys(U).filter(kind => U[kind].unitGroup === group && U[kind].combatRole !== "logistics"),
    ])),
    parameterBasis: "新增角色的生命、射程、伤害、速度和修复量均为游戏平衡参数，不代表真实装备性能。",
  };
  if (typeof module !== "undefined") module.exports = D.ROSTER;
})(typeof globalThis !== "undefined" ? globalThis : this);
