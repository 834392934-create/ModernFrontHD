# 陆海空天兵种扩展设计

日期：2026-10-16。范围：用户确认四大类各至少十种有战斗或作战支援职责的单位。采矿车单列后勤，不用它凑作战兵种数量。现有单位保留。

设计原则：新增的是游戏角色及其配置，不宣称新增真实现役型号，不通过给同一个单位换名、换色填数量。每个角色必须至少有一项可测量的战术差异：目标域、射程/最小射程、机动、视野、溅射、维修或明确克制系数，并承担成本、生命、速度或装填时间代价。

## 角色名单

| 类别 | 原有角色 | 新增角色 | 合计 |
|---|---|---|---|
| 陆军 | 步兵、主战坦克、步战车、自行炮、火箭炮、野战防空、反轨车 | 反坦克班、机枪班、侦察车、维修车、迫击炮班、突击步兵 | 13 |
| 海军 | 驱逐舰、航母、攻击潜艇 | 护卫舰、巡逻艇、导弹艇、岸攻舰、防空舰、维修舰、侦察艇 | 10 |
| 空军 | 武装直升机、多用途战斗机、六代概念战机 | 侦察无人机、攻击无人机、截击机、近距支援机、重轰炸机、预警机、护航直升机 | 10 |
| 太空 | 侦察星、重型轨道平台、截击舰 | 反轨狙击舰、近防护卫舰、轨道岸攻平台、攻城舰、维修站、测绘星、快速突袭舰 | 10 |
| 后勤 | 采矿车 | 无 | 1 |

### 陆军差异

- 反坦克班：慢射、高单发；对装甲单位强化，对步兵不占优势。
- 机枪班：快射、低单发；反步兵，对重装甲削弱。
- 侦察车：较高速度和视野、较弱自卫火力及装甲。
- 维修车：无武装，短范围修复友方陆军；不能维修舰艇、飞机或轨道单位。
- 迫击炮班：便宜的短中程溅射，存在最小射程、低机动及脆弱生命。
- 突击步兵：近距离高持续火力，射程短；用于近距离突入与占点。

### 海军差异

- 护卫舰：比驱逐舰便宜，射程、生命、火力相应降低。
- 巡逻艇：廉价、高速、近程炮火，适合狭窄水道。
- 导弹艇：海上目标专精，高单发、慢装填、低生命。
- 岸攻舰：只打陆军及建筑，远程溅射，存在最小射程。
- 防空舰：仅对空，不能对海陆与太空输出。
- 维修舰：无武装，只维修附近友方海军。
- 侦察艇：远视、快速、脆弱、弱自卫火力。

### 空军差异

- 侦察无人机：无武装、高速侦察、低生命。
- 攻击无人机：仅攻击地面及舰艇，低成本持续单体输出。
- 截击机：仅对空，远射程、高速度、较长装填。
- 近距支援机：短射程地面溅射，需要进入防空火力圈。
- 重轰炸机：对陆海及建筑远程溅射，低机动、昂贵、慢装填。
- 预警机：无武装，视野大于侦察无人机；较慢且更昂贵。
- 护航直升机：近距离快射对空，不能攻击地面；区别于高速远程截击机。

### 太空差异（全部为原创架空游戏设定）

- 反轨狙击舰：只打太空，高单发、长射程、低速、长装填。
- 近防护卫舰：只打空中飞机，快速连射，不具备对地攻击。
- 轨道岸攻平台：只打陆军及海军，溅射火力，不攻击基地。
- 攻城舰：只攻击建筑，最小射程限制，近距离需护卫。
- 维修站：无武装，只维修附近友方太空单位。
- 测绘星：无武装，视野更远、机动更慢、生命低。
- 快速突袭舰：海陆与建筑近距离突袭，高机动、低装甲、视野有限。

## 必需接入与验证

1. 定义按目标域过滤，区分地面、海军、空军、太空及建筑；太空单位即使同时有 `air:true`，也只归太空目标域。
2. 新兵种沿用现有训练、移动、寻路、命令队列及存档流程；生产界面按四大类筛选，不能把新增兵种隐藏在无入口的数据里。
3. 新武装太空单位统一标记 `spaceWeapon`，受 AI 禁造、清除与退款规则约束；玩家专属科技开关保持独立。
4. 维修按同域筛选，不允许海军维修隔空修复飞机；无武装侦察和维修单位永不射击。
5. 模型来源字段只用于图形复用，不继承真实型号名称。新增模块及轮廓装配必须能在战场和检视器中识别角色。
6. 测试每个单位存在正确生产设施、价格和有效职责；抽样验证限制目标、维修域、克制、太空禁造、存档和真实窗口生产。

不引入没有对应机制的布雷、运输、登陆、隐身、电子战或所谓真实秘密参数。现有 `jam` 是短时间禁用，直接用于移动单元会形成近乎连续封锁，因此本轮不加入移动干扰单位。

## 验收边界

这份设计清单不是完成证明。运行时接入、模型角色区分、主战场验证和难度平衡结果由最终验证报告记录。公开资料对应的原有装备继续按实物对照流程验收；通用角色改装不等同于新增真实型号高保真复刻。

## 数据模块独立检查

执行 Node 断言：44 总数、27 新增、四类数量、原有每项参数保持、生产设施存在、模型基类存在、真实型号 index 清除、正值参数、支援职责及武装太空禁造标记。仅证明数据定义，不代表模拟及画面已经通过。

```json
{
  "date": "2026-10-16",
  "totalUnits": 44,
  "addedRoles": 27,
  "counts": {
    "ground": 13,
    "naval": 10,
    "air": 10,
    "space": 10
  },
  "logistics": [
    "harvester"
  ],
  "originalUnitParametersPreserved": true,
  "dataChecks": "PASS",
  "integrationVerification": "Pending main-agent simulation and browser tests",
  "units": {
    "ground": [
      {
        "kind": "infantry",
        "name": "步兵小组",
        "role": "combat"
      },
      {
        "kind": "tank",
        "name": "主战坦克",
        "role": "combat"
      },
      {
        "kind": "ifv",
        "name": "步兵战车",
        "role": "combat"
      },
      {
        "kind": "arty",
        "name": "自行火炮",
        "role": "combat"
      },
      {
        "kind": "rocket",
        "name": "火箭炮",
        "role": "combat"
      },
      {
        "kind": "aa",
        "name": "野战防空",
        "role": "combat"
      },
      {
        "kind": "asat",
        "name": "反轨道系统（架空）",
        "role": "combat"
      },
      {
        "kind": "antitank_team",
        "name": "反坦克导弹班",
        "role": "combat"
      },
      {
        "kind": "machinegun_team",
        "name": "机枪火力班",
        "role": "combat"
      },
      {
        "kind": "recon_vehicle",
        "name": "轻型侦察车",
        "role": "combat"
      },
      {
        "kind": "repair_vehicle",
        "name": "装甲维修车",
        "role": "repair"
      },
      {
        "kind": "mortar_team",
        "name": "迫击炮班",
        "role": "combat"
      },
      {
        "kind": "assault_team",
        "name": "重装突击班",
        "role": "combat"
      }
    ],
    "naval": [
      {
        "kind": "destroyer",
        "name": "导弹驱逐舰",
        "role": "combat"
      },
      {
        "kind": "carrier",
        "name": "航空母舰 / 航空舰",
        "role": "combat"
      },
      {
        "kind": "submarine",
        "name": "攻击潜艇",
        "role": "combat"
      },
      {
        "kind": "frigate",
        "name": "通用护卫舰",
        "role": "combat"
      },
      {
        "kind": "patrol_boat",
        "name": "高速巡逻艇",
        "role": "combat"
      },
      {
        "kind": "missile_boat",
        "name": "反舰导弹艇",
        "role": "combat"
      },
      {
        "kind": "shore_bombardment",
        "name": "岸攻火力舰",
        "role": "combat"
      },
      {
        "kind": "air_defense_ship",
        "name": "舰队防空舰",
        "role": "combat"
      },
      {
        "kind": "repair_ship",
        "name": "舰队维修舰",
        "role": "repair"
      },
      {
        "kind": "recon_boat",
        "name": "海上侦察艇",
        "role": "combat"
      }
    ],
    "air": [
      {
        "kind": "heli",
        "name": "武装直升机",
        "role": "combat"
      },
      {
        "kind": "jet",
        "name": "六代制空战机",
        "role": "combat"
      },
      {
        "kind": "fighter",
        "name": "多用途战斗机",
        "role": "combat"
      },
      {
        "kind": "recon_drone",
        "name": "侦察无人机",
        "role": "reconnaissance"
      },
      {
        "kind": "attack_drone",
        "name": "察打一体无人机",
        "role": "combat"
      },
      {
        "kind": "interceptor",
        "name": "远程截击机",
        "role": "combat"
      },
      {
        "kind": "close_support_aircraft",
        "name": "近距支援机",
        "role": "combat"
      },
      {
        "kind": "heavy_bomber",
        "name": "重型轰炸机",
        "role": "combat"
      },
      {
        "kind": "early_warning_aircraft",
        "name": "空中预警机",
        "role": "reconnaissance"
      },
      {
        "kind": "escort_helicopter",
        "name": "防空护航直升机",
        "role": "combat"
      }
    ],
    "space": [
      {
        "kind": "satellite",
        "name": "轨道侦察平台",
        "role": "reconnaissance"
      },
      {
        "kind": "orbital",
        "name": "重型轨道打击平台（架空）",
        "role": "combat"
      },
      {
        "kind": "orbital_interceptor",
        "name": "轨道截击舰（架空）",
        "role": "combat"
      },
      {
        "kind": "orbital_sniper",
        "name": "反轨狙击舰（架空）",
        "role": "combat"
      },
      {
        "kind": "orbital_point_defense",
        "name": "轨道近防护卫舰（架空）",
        "role": "combat"
      },
      {
        "kind": "orbital_bombardment",
        "name": "轨道岸攻平台（架空）",
        "role": "combat"
      },
      {
        "kind": "orbital_siege",
        "name": "轨道攻城舰（架空）",
        "role": "combat"
      },
      {
        "kind": "orbital_repair",
        "name": "轨道维修站（架空）",
        "role": "repair"
      },
      {
        "kind": "orbital_mapper",
        "name": "广域测绘星（架空）",
        "role": "reconnaissance"
      },
      {
        "kind": "orbital_raider",
        "name": "轨道突袭舰（架空）",
        "role": "combat"
      }
    ]
  }
}
```
