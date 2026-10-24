# 全载具武器职责审计

- 审计日期：2026-10-24。
- 审计基线：`8448efe0a7bb9d2e71732fb883c281a39fc4aa24`，3.11.0；开始时工作区仅两个启动 CMD 有主代理修改。
- 范围：`src/data.js`、`roster.js`、`sim.js`、`weapon-range-data.js`、`weapon-effects.js`、`weapon-salvos.js`、航空流程、输入和相应测试。排除构建产物及第三方大资产。
- 方法：读取实际入口与调用方、Node 加载数据枚举全部 kind、联网核查官方公开资料。本文是实现前审计，建议不代表已交付或视觉验收通过。
- 计数：77 个单位 kind；69 个载具/平台（地面 14、海军 19、航空 18、太空 18）及 8 个人员角色。无武装保障、采矿、侦察平台亦计入，不能为了“解锁全部武器”给它们强加攻击能力。
- 本轮实现边界：韩国独岛级槽位仅出动现有 `escort_helicopter`，显示“舰载直升机护航（职责近似）”，任务域仅 `air`；不宣称其具备当前未实现的对陆、对舰或对建筑出动，也不混入陆基 Apache 作为真实舰载配置。

## Findings

### 主要问题与证据

1. **载具只有一个实际攻击档。** `sim.js:724 emitShot` 使用 `U[kind]` 的唯一 `damage/reload/range`；`weaponRangeProfile` 不传 `weaponId`。射程目录中已有美国驱逐舰 Mk45/Tomahawk、Bradley 机炮/TOW、Pantsir 导弹/机炮等记录，但不是玩家可选或 AI 可选的实际武器槽。
2. **导弹驱逐舰主要在发舰炮弹。** `data.js` 中 `destroyer` 无 `rocket` 或导弹武器设置；`weapon-effects.js family` 的海军兜底是 `navalGun`。可攻击空/海/岸/潜的同一套属性没有区分防空导弹、反舰弹、巡航弹、舰炮和鱼雷。
3. **航母没有舰载机。** `carrier.damage=180/range=840/reload=4/splash=50` 进入通用直接射击路径；没有放飞、回收、补给或子机归属状态。航空模块 `home()` 只接受 `airfield`。当前“舰载机打击（抽象）”其实表现为航母舰炮，不能满足此次要求。
4. **反潜特例只换效果，没有独立性能。** 对水下目标，`destroyer/frigate/missile_sub` 临时换为 `torpedo`；仍沿用该载具其他主武器的伤害、射程、装填、溅射。多武器上线后尤其要防止鱼雷继承巡航导弹射程。
5. **导弹效果与模拟拦截标记不一致。** `weapon-effects.family` 将 `fighter/jet/interceptor` 认作导弹，但 `sim.emitShot` 的 `rocket` 字段仅检查 `d.rocket` 或 `rocket/heli/asat/sam`。基础 `fighter/jet` 没有 `d.rocket`，近防炮的 `f.rocket` 判断会漏拦这类“导弹”。必须由实际弹种生成模拟和视觉状态。
6. **部分近防/小艇套用了大型舰炮效果。** `patrol_boat/recon_boat/escort_corvette` 走 `navalGun`；`escort_helicopter` 描述对空快射、射程档按导弹估算，却实际走机炮，类别定义不一致。需要清楚指定主武器和副武器，不只换名称。
7. **目标域判断是 kind 级别。** `canTargetKind` 和溅射结算使用整车目标域。新增多武器后，若只给整车合并域、而不为 shot 保存实际武器域，会出现防空弹打地面、岸攻弹穿透潜艇层等错误。
8. **射程现有证据层值得保留。** `weapon-range-data.js` 已区分公开数据、同类估算、架空设定，以及有效/最大/试验/公开下界；不应以“真实性能”要求为由把未知数值伪装为精确值。当前可发布的是正确职责与弹种/目标域，不是复现保密火控、装甲或命中概率。
9. **近防拦截是辅助行为。** 现有 CIWS 通过拦截敌方 `shot.rocket` 实现；这和对单位的机炮开火不同，必须并存且各自有冷却。无武装电子战、维修角色已有独立支援机制，不要降格为通用武器。
10. **现有每型模型不等于已包含全部武器炮口。** `vehicle-rig-naval.js` 的已导入 Burke 主炮锚点指向真实模型炮管；新增 VLS 不能复用这根炮口。需按已有模型标注发射器锚点，缺失部分明确采用原创示意，不冒称通过实物建模验收。

### 建议的最小实现界面

- 每种载具显式列 `weapons[]`，每个武器有稳定 ID、中文名称、武器家族、目标域、平衡射程/最小射程、独立装填、伤害/溅射、公开证据引用及炮口类别。定义可以共享，装填状态必须按实体独立。
- AI 根据目标域与距离选有效武器；对舰用反舰导弹，对空用防空弹，对潜用鱼雷，近距离/软目标用炮或机枪。玩家驾驶时显示当前武器和可切换武器，仍保持右键仅瞄准、左键开火。
- 武器切换后 HUD、射程圆、射线端点限制、模拟伤害、视觉弹体、炮口、装填和拦截都从同一个实际武器记录取值。未发射时切换不得刷新冷却；已发射弹体不能因后来切换而改变伤害或域。
- 先沿用已有总输出平衡，通过各武器倍率和独立冷却调校；不能同时全武器无限开火导致所有载具伤害暴增。所有新倍率、再装填时间、携弹量和舰载机架数必须标为游戏设计值。
- 未知型号用“同用途机炮/导弹”等角色名称；按国家与真实型号可确认的武器组解锁，不能所有国家通用一个“最强导弹”。

## 全量载具职责表

表中“当前”是 3.11.0 的实际单档射击家族，不把未实际开火的效果兜底误判为无武装单位具备武器。“建议”是角色/武器类型；除下方官方映射外均为游戏职责建议。陆=地面车辆及人员、岸=建筑、海=水面舰艇、潜=水下、空=大气层飞机、天=太空；人员是否受损由实际武器域决定，行动员 64 款武器的“全部可对人员”约定不自动扩展到真实反潜鱼雷。

### 地面：14

| kind | 当前 | 建议武器组及目标域 | 边界/修复点 |
| --- | --- | --- | --- |
| tank | 坦克炮 | 主炮穿甲/多用途弹：陆/岸；同轴/遥控机枪：人员 | 炮射导弹只在对应型号有证据时解锁，不给 M1/K2 通用加装 |
| ifv | 机炮；中俄效果例外为炮 | 机炮：陆/轻装甲；机枪：人员；对应实装反坦克导弹：重装甲；BMP-3 双炮分开 | Bradley 的 25mm/TOW/同轴枪分槽；不能让导弹共用机炮射速 |
| arty | 榴弹炮 | 榴弹：陆/岸；烟幕等辅助弹仅有明确机制再加 | 保留曲射、最小射程；射程按弹种 |
| rocket | 多管火箭独立弹体齐射 | 火箭覆盖：陆/岸；有对应发射器证据的制导火箭可单列 | 保留现有齐射总伤害预算和炮口轮换 |
| aa | 导弹；韩为机炮视觉 | 按国家拆：弹炮结合/纯导弹/纯机炮 | 韩 K30 当前模型仅机炮，不直接升级成 Hybrid Biho；中 HQ-17/印 Akash 不凭空增加主炮 |
| asat | 反轨导弹（架空） | 反轨拦截弹：天 | 原创设定，不提供陆/海通用伤害 |
| harvester | 无武装 | 采矿/运矿 | 不解锁武器 |
| recon_vehicle | 机炮 | 轻机炮/机枪：陆/人员 | 侦察优先，不能变成主战坦克 |
| repair_vehicle | 无武装 | 维修陆军 | 不解锁武器 |
| tank_destroyer | 反坦克导弹 | 反装甲导弹：陆/岸；有模型座时可轻机枪自卫 | 保留导弹盲区和慢装填 |
| siege_howitzer | 重榴弹炮 | 重型榴弹：陆/岸 | 最小射程和重炮射击节奏 |
| mobile_ciws | 连射效果 | 近防机炮：空；独立导弹拦截 | 不继承远程 SAM 射程 |
| assault_gun | 坦克炮 | 突击炮高爆/破甲：陆/岸；机枪：人员 | 固定战斗室炮的开火方向应受车体/射界约束 |
| mobile_radar | 无武装 | 侦察、友军火控辅助 | 不解锁武器 |

### 海军：19

| kind | 当前 | 建议武器组及目标域 | 边界/修复点 |
| --- | --- | --- | --- |
| destroyer | 舰炮；对潜改鱼雷效果 | 主武器导弹；防空弹：空，反舰弹：海，具证据的巡航弹：陆/岸；舰炮：海/岸；反潜鱼雷：潜；CIWS 自卫 | 每型装载差异；美舰特定批次反舰导弹需证据，不能把 TLAM-E 当通用反舰弹 |
| carrier | 直接舰炮/溅射 | 主攻为真实子机出动；本舰近防炮/近程防空弹自卫 | 必须独立舰载机实体；不再直接用大口径舰炮打岸 |
| submarine | 鱼雷 | 重鱼雷：海/潜；具证据的潜射巡航弹：岸 | 美 Virginia 的 Tomahawk 已有证据，其他型不能直接套美弹 |
| frigate | 舰炮；对潜改鱼雷效果 | 防空/反舰导弹、反潜鱼雷；舰炮近距离海面自卫 | 每档不同射程；原创护卫角色不声称精确真实型号 |
| patrol_boat | 大舰炮效果 | 速射机炮/机枪：海/岸近距 | 改小口径发射节奏与效果 |
| missile_boat | 反舰导弹 | 反舰导弹：海；轻炮近防（若模型支持） | 保留海域专长，不能反潜或超远对陆 |
| shore_bombardment | 舰炮 | 舰炮岸轰：陆/岸 | 当前角色正确；不要通用化成反舰导弹舰 |
| air_defense_ship | 导弹 | 区域防空弹：空；近程防空/近防炮：空 | 近防与区域防空独立档 |
| repair_ship | 无武装 | 舰艇维修 | 不解锁武器 |
| recon_boat | 大舰炮效果 | 轻机枪/小机炮：海面自卫 | 轻武装效果和伤害，不能用大型舰炮 |
| torpedo_boat | 鱼雷 | 鱼雷：海；轻机枪自卫可作为原创附加档 | 水下尾迹，不生成空中火焰 |
| arsenal_ship | 巡航/反舰导弹未分 | 反舰弹：海；对陆巡航弹：陆/岸 | 分弹种，不给一枚弹全域能力 |
| escort_corvette | 大舰炮效果+独立拦截 | 近防机炮：海/空；导弹拦截 | 更正发射视觉尺度；保留辅助拦截 |
| fleet_command_ship | 无武装 | 舰队指挥辅助 | 不解锁武器 |
| electronic_warfare_ship | 无武装 | 海上电子压制 | 电子效果非爆炸武器 |
| hunter_sub | 鱼雷 | 重鱼雷：海/潜 | 反潜角色正确 |
| abyss_tender | 无武装 | 深海维修/声呐 | 概念保障，不解锁武器 |
| asw_patrol_ship | 鱼雷 | 反潜鱼雷：潜/海（游戏设定） | 声呐探测与武器距离必须分开 |
| missile_sub | 导弹；对潜临时变鱼雷 | 对陆巡航弹：陆/岸；反舰弹：海；重鱼雷：潜/海 | 防止鱼雷继承巡航弹盲区、射程、溅射 |

### 航空：18

| kind | 当前 | 建议武器组及目标域 | 边界/修复点 |
| --- | --- | --- | --- |
| heli | 导弹 | 机炮：陆；反装甲导弹：陆/岸；火箭：陆/岸；实装获证据后追加空空弹 | AH-64 有机炮/火箭/Hellfire 证据；不是所有直升机都可反舰/对空 |
| jet | 架空导弹视觉 | 概念远程/近程空空弹、概念炮；原有授权跨域能力单列 | 六代机性能未公开，明确游戏设定 |
| fighter | 单导弹视觉 | 空空弹：空；机炮：空/陆；实际集成的对地弹/炸弹：陆/岸；实证反舰弹：海 | 机型差异必须保留；J-20 不默认全部复制 Rafale 装载 |
| recon_drone | 无武装 | 侦察 | 不解锁武器 |
| attack_drone | 对地导弹 | 精确空地弹：陆/岸；对海弹仅适合小艇/已定义海域角色 | 轻平台不挂通用重型巡航弹 |
| interceptor | 空空导弹 | 远程/近程空空弹、近距机炮：空 | 保持制空专长 |
| close_support_aircraft | 机炮 | 机炮、火箭、对地导弹/炸弹：陆/岸 | 每种攻击方式单独设发射效果和射程 |
| heavy_bomber | 炸弹效果 | 炸弹/滑翔弹：陆/岸；反舰弹/对海制导弹另档 | 投弹无炮口火焰；不能把航程当投弹射程 |
| early_warning_aircraft | 无武装 | 预警 | 不解锁武器 |
| escort_helicopter | 机炮视觉，射程按导弹估算 | 对空导弹+近距机炮：空 | 两档拆分，不能用机炮打 8km 导弹档距离 |
| rescue_helicopter | 无武装 | 人员救援/治疗 | 不解锁武器 |
| naval_strike_aircraft | 反舰导弹 | 空射反舰导弹：海 | 不无条件赠送对地巡航弹 |
| electronic_warfare_aircraft | 无直接武装 | 电子压制；自卫空空弹仅在决定扩展角色后单列 | 当前承诺无武装，不默改成战斗机 |
| air_repair_drone | 无武装 | 空中维修（概念） | 不解锁武器 |
| interceptor_drone | 机炮 | 轻型空空弹/机炮：空（概念） | 显示明确武器类别 |
| omni_striker | 一枚全域导弹（架空） | 对地/反舰/反潜/空空/反轨五类原创弹组 | 保留架空全域强度，但每个弹组分别限制目标域 |
| high_altitude_interceptor | 空天导弹（架空） | 空空弹：空；反轨弹：天 | 不把反轨能力称为现实截击机实装 |
| strategic_strike_aircraft | 巡航导弹 | 远程对陆弹：陆/岸；反舰弹：海；炸弹可单列 | 不能按名称包含 strike 就自动变成炸弹效果 |

### 太空：18，全为明确架空/原创职责

| kind | 当前 | 建议武器组及目标域 | 边界/修复点 |
| --- | --- | --- | --- |
| satellite | 无武装 | 侦察 | 不增加武器 |
| orbital | 光束 | 轨道打击光束：陆/海/空/天/岸，按现有授权 | 分目标域火控，保持游戏投影规则 |
| orbital_interceptor | 脉冲 | 空天拦截炮/拦截弹：空/天 | 不附带对地 |
| orbital_sniper | 光束 | 长程反轨光束：天 | 保留反轨专长 |
| orbital_point_defense | 脉冲 | 轨道对空拦截炮：空 | 当前角色只对大气层，不能偷偷扩大到天 |
| orbital_bombardment | 光束 | 对地/海集群打击：陆/海 | 原角色不能攻击基地 |
| orbital_siege | 光束 | 攻城光束：岸 | 保留建筑专长 |
| orbital_repair | 无武装 | 太空维修 | 不增加武器 |
| orbital_mapper | 无武装 | 广域测绘 | 不增加武器 |
| orbital_raider | 脉冲 | 突袭炮：陆/海/岸 | 不增加空天能力 |
| orbital_escort | 脉冲 | 近防脉冲/拦截弹：空/天 | 与重炮差异化 |
| orbital_relay | 无武装 | 中继辅助 | 不增加武器 |
| orbital_jammer | 无直接武装 | 轨道压制 | 保留敌方科技开关约束 |
| orbital_shield | 无武装 | 轨道护盾 | 不增加武器 |
| orbital_missile_barge | 对轨多弹齐射 | 轨道导弹齐射：天 | 每发实际弹体，近防可拦截，总伤害预算不变 |
| omni_dreadnought | 全域光束 | 原创海陆潜空天/岸分组光束/弹药 | 反潜也只能作为架空能力，不能称现实轨道反潜 |
| orbital_carrier | 多炮位脉冲 | 轨道火力母舰：空/天 | 现名字明确“火力母舰/无生产功能”，不同于海军航母；此次真实航母逻辑不应自动套此架空类型 |
| orbital_sensor | 无武装 | 轨道预警/辅助 | 不增加武器 |

### 8 个人员角色（补充覆盖）

`infantry` 步枪、`antitank_team` 反装甲导弹、`machinegun_team` 机枪、`mortar_team` 迫击炮、`assault_team` 突击步枪、`sniper_team` 狙击步枪、`field_medic` 无武装治疗、`operator` 现有 64 款原创军械。此次车辆武器槽不得复用行动员弹药库存或把医疗兵自动武装；行动员当前全部可攻击人员、其他目标按各枪标签的设计约定保留。

## 官方公开资料与型号边界

只用下列官方机构/厂家一次来源支持“装备职责、武器类别及型号兼容性”。本轮不从公开视频反推射速/命中率，不增加未经核实的精确性能数值；既有 `weapon-range-data.js` 的米制数值保留其原始限定词。

| 对象 | 本轮核实结论 | 来源与适用边界 |
| --- | --- | --- |
| 美国 DDG 51 | 多任务导弹驱逐舰，公开装备 Standard 系列、ASROC、Tomahawk、鱼雷、Mk45、CIWS、ESSM | [美国海军 DDG 51](https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169871/destroyers-ddg-51/)；舰级汇总不等于所有批次具体装载相同，不能自动认定每舰有某反舰弹 |
| 美国尼米兹级 | 主作战能力来自搭载/运行舰载机，对空、海、岸作战；本舰是近程自卫系统 | [美国海军航母](https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169795/aircraft-carriers-cvn)、[美国海军太平洋航空兵资料](https://www.airpac.navy.mil/Organization/Distinguished-Visitor-Info/Important-Links-and-Info/)；游戏架数及出动周期不宣称实装数值 |
| 中国辽宁舰 | 滑跃起飞的固定翼舰载航空作战，J-15 系列为有据参考 | [中国国防部 J-15T 公开报道](https://eng.mod.gov.cn/xb/News_213114/Features/16350377.html)；不把当前陆基 J-20 模型直接称为辽宁舰真实舰载机 |
| 印度维克拉玛蒂亚 | 演习公开舰载 MiG-29K 与多类直升机 | [印度国防部/PIB 双航母演习](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1931254&lang=2&reg=48)；不把现有陆基 Rafale 直接说成该舰已实装舰载机 |
| 韩国独岛级 | 当前舰级为 LPH 直升机两栖平台 | [美国海军 Ssang Yong 2024 官方演习报道](https://www.navy.mil/DesktopModules/ArticleCS/Print.aspx?Article=3893079&ModuleId=523&PortalId=1)；若选择固定翼“航空玩法抽象”必须保留架空标识，贴近现实默认采用直升机 |
| 美国 Virginia | 攻击潜艇职责含反舰/反潜与对岸巡航导弹；公开 Mk48/Tomahawk | [美国海军 SSN](https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169558/attack-submarines-ssn/attack-submarines-ssn/)；Block 不同发射系统不同，不把平台携弹数当无限弹药 |
| 美国 Bradley | 25mm 自动炮、7.62mm 同轴机枪、TOW 和烟幕发射器 | [美国陆军 Bradley 武器系统](https://www.benning.army.mil/Infantry/DoctrineSupplement/ATP3-21.8/chapter_03/RoleoftheMech/Bradley/index.html)；烟幕是辅助防护，不是新增爆炸伤害 |
| 俄罗斯 BMP-3 | 100mm 炮/发射器、30mm 自动炮和机枪不同系统 | [Rosoboronexport BMP-3 厂家资料](https://roe.ru/pdfs/pdf_4442.pdf)；不能仅用一根通用“坦克炮”代表全部武器 |
| AH-64 | 30mm 机炮、火箭和 Hellfire 三类独立武器 | [Boeing AH-64](https://www.boeing.com/defense/military-rotorcraft/ah-64-apache)；现有外形不能据 AH-64E 页面宣称精确 E 型所有性能 |
| Rafale | 厂家列空空导弹、对地弹药、AM39 反舰弹等多种集成武器 | [Dassault 2023 官方资料](https://www.dassault-aviation.com/wp-content/blogs.dir/2/files/2023/06/RAFALE-Press-Release-Paris-Air-Show-2023.pdf)；机型兼容不代表印度每架/每批已经采购并装载全部弹种，保留配置边界 |
| 美国 M-SHORAD | 默认采用 Stinger、30mm 机炮、机枪；旧资料 Hellfire 不作为当前默认可用武器 | [Leonardo DRS 2023 产品资料](https://cdn.leonardodrs.com/uploads/wp-content/uploads/2023/09/m-shorad-datasheet.pdf) 仅证明历史配置；武器实现代理发现后续 CRS 禁用/替换记录，需按 [CRS IF12397](https://www.congress.gov/crs_external_products/IF/PDF/IF12397/IF12397.15.pdf) 复核；不能以旧产品册断言 2026 当前配置，也不声称所有批次已完成改装 |
| 俄罗斯 Pantsir-S1 | 弹炮结合系统，导弹和炮分别成档 | [Rosoboronexport S1 官方资料](https://roe.ru/upload/pdf/11402_post.pdf)；不用 S1M/SM 射程覆盖游戏 S1 型号 |

其他中国/俄罗斯/印度/韩国基础车型仍应继续沿 `equipment.js` 与既有射程来源逐型号补证。此次不能把“69 类已枚举”说成“69 类全部真实性已认证”。原创角色及战锤/轨道/六代机未知参数保持游戏设定。

## 航母实现建议与验收

1. 新增舰载航空职责实体或明示抽象的舰载配置，不能把美 F-35A、中 J-20、俄 Su-57、印 Rafale、韩 F-35A 不加说明塞入每艘航母。若新建原创舰载 kind，现有固定 77/462 计数的测试、模型/肖像/驾驶/导航注册均需随之更新。
2. 海军航母主攻击操作应派出有实体 ID、生命、飞行和武器的舰载机：甲板准备→放飞→爬升→接敌→攻击→返航→回收/整备。舰载机飞行不能套地面跑道的陆地通行检查。
3. 本舰自卫只在自卫武器射程内进行；舰载机作战范围和舰炮/防空范围分别标注。不能把航母攻击指令同时变成一发直接伤害弹再派飞机，造成双重伤害。
4. 母舰移动时，起降锚点随甲板变换；已经离舰的飞机不跟随母舰瞬移。母舰被毁，空中飞机继续独立作战/寻找可用机场；不得清空飞机规避全歼胜利条件。
5. 甲板容纳、活动编队上限、补充花费和周期应可配置；损失要有代价，暂停时不增长。所有数值为游戏平衡值，不冒称真实出动效率。
6. 保存/读取必须保持子机归属、生命、飞行阶段和冷却，修正失效母舰引用；载机能被敌方防空正常攻击。敌方航母执行同一机制，不能只给玩家表演特效。

## Key files table

路径均已本地存在性验证。primary 由入口/调用方/现有测试确定，不由文件名猜测。

| File | Role | Status | Read next? | Reason / symbols / evidence | Source |
| --- | --- | --- | --- | --- | --- |
| `index.html` | 加载入口 | primary | Yes | 204–260 行实际依次加载 data/roster/range/sim/model/input/app；新模块需接入真实入口 | 本地读取 |
| `src/data.js` | 基础单位/阵营 | primary | Yes | `U`、`F.names`、`EXTRA`，carrier/destroyer/fighter 原始职责与数值 | 本地枚举 |
| `src/roster.js` | 扩展角色 | primary | Yes | `add()`、后置 submarine/destroyer 域覆盖、69 载具完整来源 | 本地枚举 |
| `src/sim.js` | 战斗与保存 | primary | Yes | `targetDomains/canTargetKind/weaponRangeProfile/rangeProfile/emitShot/stepDirectControl/step/save/load`；全部攻击、拦截、胜负实际路径 | 调用追踪 |
| `src/weapon-range-data.js` | 性能证据与米制换算 | primary | Yes | `catalog/mappings/getProfile/resolve`；已有 weaponId 选值能力但模拟未接入 | range integration 测试 |
| `src/aircraft-flight.js` | 起飞到返航 | primary | Yes | `supported/launch/home/requestReturn/update/canFire`；home 当前只认 airfield | aircraft tests |
| `src/weapon-effects.js` | 发射家族表现 | primary | Yes | `family/profile/update`；海军兜底 navalGun、机型名推断；必须优先实际武器 ID | articulation tests |
| `src/weapon-salvos.js` | 多弹齐射 | primary | Yes | `profile/begin/launch/stillValid`；现支持 rocket/orbital_missile_barge，切武器后需旧弹快照 | salvo tests |
| `src/direct-control.js` | 驾驶输入/HUD | primary | Yes | 当前 weapon 仅 operator；载具需可见切换方式，不改变 RMB/LMB 约定 | desktop tests |
| `src/app.js` | RTS 属性/帮助 | primary | Yes | `weaponRangeProfile` 显示调用、帮助手册、选择面板；要显示主副武器及舰载状态 | index 入口 |
| `src/vehicle-rig-naval.js` | 舰炮/部件锚点 | primary | Yes | 导入 Burke 真实主炮 `muzzle`，不能拿来发 VLS 导弹 | articulation 断言 |
| `src/equipment.js` | 型号证据状态 | primary | Maybe | `verified/dossier` 区分原创角色/实型号/未知；避免新能力被宣传成已核实实装 | index 入口 |
| `src/ranges.js` | 射程圈 | primary | Maybe | 委托 `game.rangeProfile`，新增武器时显示需要与模拟同步 | range-display tests |
| `src/operator-ui.js` | 人员军械库 | primary | Maybe | 可借 UI 交互思路，但人员库存不可直接复用给车辆 | index 入口 |
| `tests/depth-flight.test.cjs` | 水下隔离与反潜 | primary | Yes | 声呐、反潜、溅射隔层断言，新增武器容易回归 | 测试调用 |
| `tests/weapon-range-integration.test.cjs` | 实际射程 | primary | Yes | 旧驱逐舰舰炮范围断言需随真实武器选择改为逐档验证 | 测试调用 |
| `tests/weapon-range-data.test.cjs` | 公开/估算边界 | primary | Yes | 禁止串阵营/型号/主炮与导弹射程，必须保留 | 测试调用 |
| `tests/weapon-salvos.test.cjs` | 齐射伤害/取消 | primary | Yes | 独立弹体、射程环、停止/死亡取消，不可只换特效 | 测试调用 |
| `tests/aircraft-flight.test.cjs` | 飞行生命周期 | primary | Yes | 陆机场起降/手动安全/保存，应新增海上移动甲板情形 | 测试调用 |
| `tests/vehicle-articulation.test.cjs` | 全类型模型/炮口/效果 | primary | Yes | 固定 77 kind、462 组合和 family 断言；新增角色要同步 | 测试调用 |
| `tests/aircraft-flight-desktop.cjs` | 原生交互验收 | primary | Yes | 实际 EXE、输入、起飞/返航；扩展舰载机流程 | 测试调用 |
| `tests/weapon-effects-browser.cjs` | 开火画面验收 | primary | Yes | 原生发射画面、冻结世界弹道；新增导弹/鱼雷/机炮分档应覆盖 | 测试调用 |
| `docs/reviews/weapon-fire-reference.md` | 既有官方视频证据 | primary | Maybe | 有真实 DVIDS 抽帧记录与 VLS/舰炮不同表现规则，复用以减少重复研究 | 本地读取 |

## Change Map

| Change type | Primary files | Notes |
| --- | --- | --- |
| 载具逐武器配置/状态 | 建议新 `src/vehicle-weapons.js`、`sim.js` | 深模块统一供 AI、玩家、HUD、伤害使用，不散落 kind 特例 |
| 航母航空队 | 建议新 `src/carrier-operations.js`、`aircraft-flight.js`、`sim.js` | 独立子机实体；舰毁后不自动清空；保留全歼条件 |
| 视觉与输入 | `weapon-effects.js`、`direct-control.js`、`app.js`、模型炮口接口 | 不复制整份人员军械库；发射器炮口与实际武器对应 |
| 公开数据 | `weapon-range-data.js`、相关 dossier | 逐武器 reference，未知保留估算，不伪造数字 |
| 回归与部署 | 相应 tests、index、原生包 | 同一套行为在源代码、打包 EXE、桌面快捷方式启动包一致 |

## Suggested next reads

先亲读 `sim.js` 的武器选择/射程/发射/溅射/存档四段和 `aircraft-flight.home/launch/update`；再读 `direct-control` 当前武器/HUD路径、`vehicle-rig-naval` 的炮口约定。新增多武器回归应覆盖：导弹舰对舰/对空/对潜逐档、舰炮近距回退、AI 与玩家一致、切枪不清冷却、RMB 不开火、射程状态同步、齐射中切枪、弹体域冻结、全部无武装角色不可射击、六阵营差异、航母真实放飞和飞机被击落/母舰毁后保存/全歼。


## 2026-10-24 集成回归迁移与缺陷复核

- 原全套日志 `.tmp/v3120-tests-initial.log` 的 18 项失败逐项分类：12 项来自已批准的武器职责/弹种规格变更，6 项来自实际集成缺陷。只改过时夹具与规格预期，保留射程、最小射程、雾、声呐、目标域、实际扣血和移动逃逸约束。
- 航母短点击不再期望船体弹丸，改验任务仅消费一次、真实飞机生成和船体零炮弹；弹道方向用航母独立 CIWS 验证。印度驱逐舰分别验证反舰导弹基本型参照 290 km 与舰炮估算 24 km，不把家族参照写成精确装载证明。
- 鱼雷等待实际飞行 TTL 后验伤；全域机拆分武器后，爬升逃逸的 3D 溅射夹具改用仍有溅射的轨道导弹驳船。树木空打不得意外赋予普通炮弹实体伤害，MLRS 仍按原总伤害预算结算。
- 已定位并交主代理修复：无武装状态被误写为不支持目标域；自动切弹 HUD 使用错误射程依据；保护 AI 使用其他阵营同 kind 的武器能力；小溅射炮弹瞄准模型表面却因逻辑中心球未相交而零伤害。新增回归要求直击与溅射不能重复扣主目标血量，移动离开冻结命中体仍必须逃逸。
- 航母追加审查：非法实体点击不得降格为自由对地任务；真实鼠标/射线输入必须保留观察目标与遮挡信息；空槽与任务的存档种类必须符合当前阵营，韩国旋翼角色不得恢复固定翼。新增用例曾分别复现并记录 RED，最终通过状态以最新测试日志为准。
- 主要新测试为 `tests/vehicle-combat-integration.test.cjs`；实际输入覆盖在 `tests/unified-aim.test.cjs`；阵营威胁对照在 `tests/player-protection.test.cjs`。这些验证不代表新模型或发行 EXE 的视觉/部署验收。

最终定向复验（2026-10-24）：上述相关 12 个测试文件合计 **168/168 通过**，耗时 1.93 秒；日志 `.tmp/vehicle-weapons-targeted-regression.log`。包括真实 Game 17 项载具武器/航空队回归、真实鼠标与 THREE 射线路径、空槽与任务跨阵营存档拒绝、主目标命中去重和移动逃逸。`git diff --check -- tests` 无空白错误。新发现的航母输入/存档问题均已修复并由这些断言覆盖；此次复验不替代全套测试、原生 EXE 启动与部署验收。
