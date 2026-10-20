# 武器射程：公开证据与游戏选值

核对日期：2026-10-20。范围：已有77类单位、6阵营、现有防御设施及64把原创行动员武器。不新增武器制造、弹道求解或真实作战优化功能。实现只提供数据与纯换算接口；模拟、UI及发布验收由主线程集成。

## 结论与接入

采用 `src/weapon-range-data.js`：官方公开事实放在 `catalog`，当前角色的游戏选值放在 `getProfile(...).primary`。二者不等价。可核对的具体弹种用公开口径；未知改型、原创角色和家族借鉴标为 `inferred`；太空/概念/帝国标为 `game-setting`。未核实字段保持 `null`。公开数字是来源声称，不是本项目独立测试结果，也不表示每次射击都能命中。

新局公开射程模式默认 **1 m / 游戏单位**，可选5或10；只改变射程与地图标尺，不改变放大的模型外观。6144×4224地图分别对应6.144×4.224、30.72×21.12或61.44×42.24 km。远程武器可以覆盖全图，不暗中截到地图边界。缩放不改变目标域、视野、遮挡、最小射程和弹药约束。1 m/u同时避免50 m手枪在10 m/u时只有5 u、比当前放大人员包络还小的问题；这依然是游戏尺度，并非整个场景实现统一物理比例。

```js
const p = WarWeaponRanges.getProfile(entity.kind, faction, {
  operatorWeapon: currentWeapon // 仅行动员使用
});
const r = WarWeaponRanges.resolve(p.primary, {
  metersPerUnit: 1, metric: 'selected'
});
// r.known 才可采用 r.range。r.verified 区分公开事实与估算。
// minRange === null 表示来源未给出，不是证明现实武器没有近距限制。
```

- `resolve` 默认为 `selected`：公开记录取 `publishedM`，估算记录取 `estimateM`。`published / effective / maximum` 是严格字段，不互相借值。
- `getProfile(kind,faction,{weaponId})` 仅允许选择本槽位列出的参照弹种。返回公开记录仍须核对 `scope/target/note`，不表示游戏实际已装载该弹。
- `getOperatorProfile(weapon或id)` 将原创枪映射到类别估算。8种外形/操纵变体共用类别射程，不把旧平衡倍率伪装成实物射程改型。
- `known=true` 表示存在可用数值，**不是**实物性能已认证；判断真实性要看 `status/verified/scope`。估算记录 `publishedM/effectiveM/maxM` 均为 `null`。
- 只替换攻击用 `rangeProfile`；治疗、维修、护盾、干扰、探测、声呐等支持半径不随射程缩放。雷达增益等仍为游戏加成，不回写公开数据。
- `game-setting` 当前以旧 `range×10` 表达独立米制设定；不是现实数据。主线程可在模式整合时保留旧游戏单位，但必须明确其特殊口径。
- 模块不修改原 `U/B`、装备档案、目标域、伤害、弹药或AI；无网络依赖，无新增第三方库。

## 公开规格目录

表中 m 为米。“最大/有效/演示/公开未分类”严格区分。`>`、约和“接近”保持原意；游戏必须选有限数值时使用公开边界，不把它改称精确极限。以下官方页面为原始来源，非百科汇编。

| 装备/弹种 | 对象 | 公开射程 m | 证据口径及限制 | 官方来源 |
|---|---|---:|---|---|
| M1A1 / M256 120 mm | 地面 | 接近4000 | 历史实战交战报道；非M1A2 SEPv3保证有效射程 | [USMC/DoD档案](https://gulflink.fhpr.osd.mil/du_ii/du_ii_refs/n52en230/usmc_factfile_m1a1.html) |
| T-90S炮射导弹 | 地面 | 100–5000 | 导弹区间；不是穿甲弹，也不认证T-90M | [Rosoboronexport](https://roe.ru/pdfs/pdf_4437.pdf) |
| Bradley M3A3 / M242 | 地面 | 有效3000 | 1997陆军家族资料；非M2A3各弹种专项 | [US Army ARMOR p18](https://www.benning.army.mil/armor/eARMOR/content/issues/1997/JAN_FEB/ArmorJanuaryFebruary1997web.pdf) |
| Bradley / TOW | 地面 | 有效3750 | 同上，未分后续TOW改型 | [US Army ARMOR p18](https://www.benning.army.mil/armor/eARMOR/content/issues/1997/JAN_FEB/ArmorJanuaryFebruary1997web.pdf) |
| M109A7 / 155 mm | 地面、建筑 | >30000 | 厂家未指定弹种；不声称普通榴弹有效射程 | [BAE产品资料](https://www.baesystems.com/dam/jcr%3A891d545e-5925-442e-a4b1-65172af2647d) |
| GMLRS Unitary/AW | 地面、建筑 | 15000–70000+ | 70000为公开边界，不是精确最大 | [Lockheed资料](https://lockheedmartin.com/content/dam/lockheed-martin/mfc/pc/guided-mlrs-unitary-rocket/GMLRS-Fast-Facts-Updates.pdf) |
| ER GMLRS | 地面、建筑 | 最大150000 | 增程弹单列，不默认所有HIMARS装载 | [Lockheed产品页](https://www.lockheedmartin.com/en-us/products/guided-mlrs-unitary-rocket.html) |
| K9 / 155 mm 52倍径 | 地面、建筑 | 最大40000 | 弹种未细分；K9 Vajra-T属于家族借鉴 | [Hyundai WIA](https://www.hyundai-wia.com/business/defense_ground_01.asp) |
| BM-30 Smerch / 300 mm | 地面、建筑 | 最大90000 | 弹种未细分，不推断所有库存弹药相同 | [Rostec](https://rostec.ru/en/media/news/tecmash-will-parade-rocket-artillery-on-victory-day/) |
| Pinaka制导型试验 | 地面、建筑 | 演示75000 | 2019试射；另一次20000 m试射不是最小射程 | [印度国防部PIB](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1597051&lang=2&reg=48) |
| K239 / CGR-080 | 地面、建筑 | 最大约80000 | 239 mm制导弹；不混其他口径 | [Hanwha Aerospace](https://www.hanwhaaerospace.com/eng/media/newsroom/view.do?seq=631) |
| Pantsir-S1导弹 | 空中 | 1200–20000 | 不混探测距离及S1M/SM | [Rosoboronexport](https://roe.ru/upload/pdf/11402_post.pdf) |
| Pantsir-S1机炮 | 空中 | 200–4000 | 对空区间，不直接认证对地装甲效果 | [Rosoboronexport](https://roe.ru/upload/pdf/11402_post.pdf) |
| BIHO家族双联30 mm机炮 | 空中 | 有效3000 | 混合型厂家表单列机炮3 km/导弹6 km；本游戏K30仅采用机炮参照并标估算 | [Hanwha资料p26–27](https://www.hanwhaaerospace.com/assets/content/library/download/Hanwha%20Defense%20Brochure_EN.pdf) |
| Akash基本型 | 空中 | 4500–25000 | 当前DDP口径；旧DRDO出口册为3000–25000，有口径差异；非NG | [印度DDP](https://www.ddpmod.gov.in/en/resources/products/akash-weapon-system) |
| Mk45常规舰炮弹 | 水面/其他公开用途 | 约24076 | 13海里×1852；不是所有目标同等有效 | [US Navy](https://www.navy.mil/DesktopModules/ArticleCS/Print.aspx?Article=2167864&ModuleId=724&PortalId=1) |
| Tomahawk IV/V TLAM-E | 陆地、建筑 | 约1600000 | 采用官方约1600 km；同页海里/英里为近似口径；不当反舰弹 | [US Navy](https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169229/tomahawk-cruise-missile/tomahawk-cruise-missile/) |
| BrahMos公开基本型 | 舰船、陆地 | 最大290000 | 不冒称印度所有增程批次，也不套给Rafale | [BrahMos Aerospace](https://www.brahmos.com/page/brahmos-missile) |
| Meteor | 空中 | 100000+ | 非不可逃逸区；仅兼容机型，不能推断F-35已全量部署 | [Saab](https://www.saab.com/products/meteor) |
| HELLFIRE II / Tiger试验 | 地面、建筑 | 演示8000 | 2006试验；Apache只作家族借鉴 | [Lockheed试验发布](https://investors.lockheedmartin.com/news-releases/news-release-details/lockheed-martin-successfully-completes-hellfire-flight-test) |
| JAGM / JAGM-MR | 地面、水面 | 8000 / 16000 | 两改型分开，平台装载另验 | [Lockheed](https://www.lockheedmartin.com/en-us/products/jagm.html) |
| M4A1 | 人员 | 500 | 官方Range未在页面细分点/面目标；只作原创步枪参照 | [US Army](https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M4A1-Carbine/) |
| M249 | 人员/面目标 | 有效600 / 800 | 点与面分开；不以压制距离替代点目标 | [US Army](https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M249-Squad-Automatic-Weapon/) |
| M107 | 人员、轻型器材 | 2000 | 标准660 grain弹公开值；不隐含统一命中概率 | [US Army](https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M107-Semi-Automatic-Long-Range-Sniper-Rifle/) |
| M9 | 人员 | 有效50 | 2013公开参照，不冒称M17 | [US Army TC 3-21.75 p10-3](https://rdl.train.army.mil/catalog-ws/view/100.ATSC/C6763F0D-4346-4DA6-BC8C-4EBFF5B34997-1377112048566/tc_3-21x75.pdf) |
| M224A1 / 60 mm迫击炮 | 地面、建筑 | 最大约3500 | 未指定具体弹种 | [US Army Watervliet](https://www.army.mil/article/109967/watervliets_4_3m_contract_may_lighten_the_load_for_infantrymen) |
| K2 / 120 mm L55 | 地面 | 未核实 | 厂家450 km位于Mobility，是车辆续航，禁止当主炮射程 | [Hyundai Rotem](https://www.hyundai-rotem.co.kr/en/business/defense/details.do?productCt03=defense0101) |
| AIM-9系列 | 空中 | 未核实 | 本次官方事实页未列数值，不抄网络常见数字 | [US Air Force](https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104557/aim-9-sidewinder/) |

资料访问限制：K9、Akash、BrahMos、Meteor已打开官方正文；部分军方网页403、PDF过大或服务器超时，使用搜索工具返回的官方站点索引正文核对，标记 `sources[*].access='indexed-primary'`，不能声称已阅读全文。Hanwha旧PDF链接当前直接打开为失效页，但官方域名索引仍有完整BIHO机炮/导弹规格表，作为家族估算参照保留此限制。源链接及口径都保留在代码中。资料是公开披露，可能随后更新；没有下载或随包分发照片、手册全文。

## 游戏估算的覆盖

以下是选值，不是该国该型号实测或公布性能。未知中国ZTZ-99A/ZBD-04A/PLZ-05/PHL-191/HQ-17等具体改型、俄罗斯未核实弹种、韩国K2主炮等均不填伪造公开字段。五个现实阵营不意味着462个型号组合都已有精准公开证据。

| 原创枪械类别 | 选值 m | 依据/边界 |
|---|---:|---|
| 手枪 | 50 | M9有效射程类别参照 |
| 冲锋枪 | 150 | 游戏估算；M9只是同类短程枪械参考，不认证150 |
| 突击步枪 | 500 | M4A1公开类别参照 |
| 霰弹枪 | 40 | 未核实枪型/弹丸，纯游戏估算；不是弹丸最大飞行距离 |
| 轻机枪 | 600 | M249点目标类别参照 |
| 精确射手步枪 | 800 | 游戏估算，非M107公开值 |
| 狙击步枪 | 1200 | 游戏估算，非M107公开值 |
| 肩射发射器 | 500 | 原创发射器设定，不自动继承反坦克导弹最大射程 |

其他角色估算逐项位于 `estimates`，每项有数值、参照ID和原因。主要默认值：坦克主炮3000、未知机炮2500、自行炮30000、远程火箭70000、短程防空12000、直升机对地导弹8000、远程空空导弹100000、舰炮24000、重型鱼雷20000 m。它们仅体现用途差别，不认证具体型号。原始参照可以明显不同，例如某原创防空舰50000 m是角色估算，Pantsir文献只说明参考类别；文献并不支持该舰50000 m数值。

特别处理：T-90S炮射导弹5000 m保留为可查的独立记录，默认坦克主炮仍用3000 m估算；美国潜艇默认鱼雷角色20000 m，不因为资料里有Tomahawk就将其自动变成1600000 m鱼雷；Tiger试验8000 m用于Apache槽位时标为估算，不伪装成AH-64所有批次的认证。

印度驱逐舰当前实际主武器为舰炮，因此默认24000 m估算；BrahMos290000 m仅保留为资料或显式弹种查询。韩国K30当前仅双机炮，采用BIHO家族机炮3000 m估算，不借通用防空导弹12000 m。GMLRS保留15000 m最小射程，因此1 m/u的小地图无法满足远距发射区间；应在新局选择5或10 m/u，不能为了可玩而悄悄删除真实区间限制。

## 验证与未完成边界

`node --test tests/weapon-range-data.test.cjs`：7/7通过。覆盖77×6单位与设施的武装/支持分类、64原创枪械类别、1/5/10比例、最小射程、有效/最大/演示口径不混用、错误弹种拒绝、未核实字段保持空值、只读数据和旧平衡数据不被修改。

该CPU结果证明数据接口和覆盖，不证明真实装备建模、弹药装载或交战表现。射程接入后还需主线程验证实际HUD、AI接敌、近距盲区、大范围搜索性能与独立版运行。当前一实体一主攻击的模型不能完整表达同一Pantsir的导弹+机炮、舰炮+各类导弹的不同射界/弹药；本轮保留证据分项，不通过一个万能射程假装已实现多武器系统。

2026-10-21 主线程闭环：实际接入、HUD/64军械、AI最小射程、实际8弹齐射、距离边界与当前EXE均已验证；完整结果见 `../v3.10.1-validation.json`。646项CPU与11组原生回归通过，不提升未核实数据的证据等级。
