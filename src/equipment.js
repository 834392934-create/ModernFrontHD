(function () {
  "use strict";
  // Public data is a separate evidence layer. Null is unknown, never an invented measurement.
  const sources = {
    ranking: [
      "GFP 2026",
      "https://www.globalfirepower.com/countries-listing.php",
    ],
    abrams: [
      "美国陆军：M1A2 SEPv3 项目",
      "https://cpeground.army.mil/Combat-Platforms/Project-Manager-Abrams/",
    ],
    abramsFamily: [
      "美国陆军：M1A2 SEP 家族速度（非 SEPv3 专项测试）",
      "https://www.army.mil/article/43803/armor_school_sends_first_wave_of_tanks",
    ],
    chinaTank: [
      "中国国防部：99A 列装与训练",
      "https://eng.mod.gov.cn/xb/Home/Focus/16300466.html",
    ],
    chinaArt: [
      "国家国防科工局：陆军装备公开介绍",
      "https://www.sastind.gov.cn/n10086200/n10086344/c10171283/content.html",
    ],
    phl: [
      "中国国防部：PHL-191",
      "https://eng.mod.gov.cn/2025xb/D/V/16478670.html",
    ],
    k2: [
      "现代 Rotem：K2 公开产品页",
      "https://www.hyundai-rotem.co.kr/en/business/defense/details.do?productCt03=defense0101",
    ],
    hanwha: [
      "韩华：K9 与 Chunmoo",
      "https://www.hanwha.com/newsroom/news/press-releases/hanwha-aerospace-presents-future-security-vision-to-nato-delegation.do",
    ],
    india: [
      "印度 PIB：T-90 Bhishma 列装",
      "https://www.pib.gov.in/newsite/erelcontent.aspx?lang=2&reg=48&relid=56489",
    ],
    t90s: [
      "Rosoboronexport：T-90S 出口型资料",
      "https://roe.ru/pdfs/pdf_4437.pdf",
    ],
    m109: [
      "美国陆军：M109A7 发射 155 mm 弹药",
      "https://www.army.mil/article/290976/iron_soldiers_steel_beasts_defender_battalion_masters_new_paladin_howitzers",
    ],
    f35: [
      "洛克希德·马丁：F-35 能力",
      "https://www.lockheedmartin.com/f35/about/5th-gen-capabilities.html",
    ],
    rafale: [
      "达索：Rafale 性能",
      "https://www.dassault-aviation.com/en/defense/customer-support/operational-aircraft/rafale/",
    ],
    f47: [
      "美国空军：F-47 研发合同",
      "https://www.af.mil/News/Article-Display/Article/4131094/statement-by-chief-of-staff-of-the-air-force-gen-david-allvin-on-the-usaf-ngad/",
    ],
    ddg: [
      "美国海军：DDG 51",
      "https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169871/destroyers-ddg/no/destroyers-ddg-51/",
    ],
    type055: [
      "中国国防部：055 型万吨级驱逐舰",
      "https://eng.mod.gov.cn/2025xb/D/S/16448046.html",
    ],
    x37: [
      "美国太空军：X-37B 第八次任务",
      "https://www.ssc.spaceforce.mil/Newsroom/Article/4283438/us-space-force-successfully-launches-x-37b-orbital-test-vehicle",
    ],
    imperium: [
      "Warhammer Community：星界军公开设定",
      "https://www.warhammer-community.com/en-gb/articles/HPHWBtld/warhammer-40000-faction-focus-astra-militarum/",
    ],
  };
  const verified = {
    "usa:tank": {
      status: "现役型号；此处速度仅为 SEP 家族参考",
      specs: { 家族最大速度: "42 mph ≈ 67.6 km/h" },
      refs: ["abrams", "abramsFamily"],
      mobilityKmh: 67.6,
      scope: "family",
    },
    "chn:tank": {
      status: "公开列装",
      specs: { 防护等效厚度: "未知", 精确最大速度: "本版未核实，不填写" },
      refs: ["chinaTank"],
    },
    "chn:ifv": {
      status: "公开装备",
      specs: { 型号: "04A 式步兵战车" },
      refs: ["chinaArt"],
    },
    "chn:arty": {
      status: "公开装备",
      specs: { 公开口径: "155 mm" },
      refs: ["chinaArt"],
    },
    "chn:rocket": {
      status: "公开装备",
      specs: { 型号: "PHL-191", 具体弹种射程: "随弹种而变；本版不填单一值" },
      refs: ["phl"],
    },
    "usa:arty": {
      status: "公开列装",
      specs: { 公开口径: "155 mm" },
      refs: ["m109"],
    },
    "ind:tank": {
      status: "印度公开列装",
      specs: {
        型号: "T-90S Bhishma",
        俄出口资料适用边界: "不直接替代印度具体批次参数",
      },
      refs: ["india", "t90s"],
    },
    "kor:tank": {
      status: "公开装备",
      specs: { 道路最大速度: "70 km/h", 越野最大速度: "50 km/h" },
      refs: ["k2"],
      mobilityKmh: 70,
      scope: "exact",
    },
    "kor:arty": {
      status: "公开产品系列",
      specs: { 型号: "K9 Thunder" },
      refs: ["hanwha"],
    },
    "kor:rocket": {
      status: "公开产品系列",
      specs: { 型号: "Chunmoo" },
      refs: ["hanwha"],
    },
    "usa:fighter": {
      status: "现役系列",
      specs: {
        最大速度: "Mach 1.6",
        环境条件: "马赫数不可无条件换算为固定 km/h",
      },
      refs: ["f35"],
    },
    "kor:fighter": {
      status: "现役系列",
      specs: { 最大速度: "Mach 1.6" },
      refs: ["f35"],
    },
    "ind:fighter": {
      status: "现役系列",
      specs: { 高空最大速度: "Mach 1.8", 低空最大速度: "750 kt" },
      refs: ["rafale"],
    },
    "usa:jet": {
      status: "公开研发项目，非现役性能验证",
      specs: {
        公开项目: "F-47 / NGAD",
        "速度、隐身与武器数据": "未公开可靠定量值；全部游戏推演",
      },
      refs: ["f47"],
      concept: true,
    },
    "chn:jet": {
      status: "下一代技术推演；不认定未经官方确认的型号",
      specs: {
        实际型号与定量性能: "未知",
        外形: "游戏原创无尾概念，非精确复刻",
      },
      refs: [],
      concept: true,
    },
    "usa:destroyer": {
      status: "公开现役舰级",
      specs: { 舰级: "Arleigh Burke / DDG 51" },
      refs: ["ddg"],
    },
    "chn:destroyer": {
      status: "公开现役舰型",
      specs: { 公开级别: "万吨级", 实际舰载系统性能: "本版不推断未知数值" },
      refs: ["type055"],
    },
    "usa:satellite": {
      status: "公开在轨试验平台；侦察用途为游戏抽象",
      specs: {
        已公开活动: "在轨试验、机动与技术验证",
        武装状态: "不声称有公开武装",
      },
      refs: ["x37"],
    },
  };
  function dossier(faction, kind) {
    const f = WarData.F[faction],
      d = WarData.U[kind] || WarData.B[kind];
    if (d?.roleVariant) return {
      status: "原创职责模型 / 公开外形借鉴",
      specs: { 职责: d.role, 参数依据: "射程、伤害、速度与维修量均为游戏平衡参数", 外形: "按用途设计的原创模型，不冒称具体真实型号" },
      refs: [], concept: !!d.space, fiction: !!d.space || !!f.fiction,
    };
    if (["satellite", "orbital_interceptor", "orbital", "asat"].includes(kind)) return {
      status: "原创架空航天体系 / 影视美术借鉴",
      specs: { 外形参考: "影视工业舰船、公开太阳翼及散热桁架；非真实型号复刻", 职责: d.role, 性能: "全部是游戏参数，不代表现实装备能力" },
      refs: [], concept: true, fiction: true,
    };
    if (f.fiction)
      return {
        status: "战锤非官方同人 / 科幻设定",
        specs: { 现实参照: "不适用", 强度: "现代基类生命 ×3 / 火力 ×2.6" },
        refs: ["imperium"],
        fiction: true,
      };
    if (verified[faction + ":" + kind]) return verified[faction + ":" + kind];
    if (d?.advanced)
      return {
        status: "概念 / 架空强化",
        specs: {
          设计基线:
            kind === "jet"
              ? "常规战斗机"
              : kind === "orbital"
                ? "公开航天平台 + 架空定向载荷"
                : "同用途现实系统",
          性能数值: "全部为明确标注的游戏设定",
        },
        refs: [],
        concept: true,
      };
    return {
      status: "公开装备题材 / 本版定量资料待补证",
      specs: {
        定量参数: "未核实，保留未知",
        游戏外形: "自制类型轮廓，不是该型号精确模型",
      },
      refs: [],
    };
  }
  WarData.EQUIPMENT = {
    sources,
    verified,
    dossier,
    checked: "2026-10-16",
    mobilityScale: 3,
  };
})();
