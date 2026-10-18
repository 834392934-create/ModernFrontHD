# 单兵模型与公开照片对照（2026-10-19）

本轮把现有 8 类人员、6 阵营共 48 个最终模型统一为单兵。一个游戏实体对应一个可选、可驾驶的士兵；不拆出额外伤害实体，不调整生命、价格、射程和兵种职责。这些仍是参考公开装备的原创游戏模型，不是某支部队在 2026 年的统一制式复刻。`imp` 为原创科幻动力护甲。

## 来源、实图检查与边界

下列原图均在本轮以图片工具实际打开。研究副本只保留在忽略的 `.tmp/personnel-reference/`，不随代码或发布包分发。没有把照片转为纹理，也没有复制官方徽章或人物面部。

| 阵营 | 官方来源及日期 | 已看到并用于设计的细节 | 未认证部分 |
|---|---|---|---|
| 中国 | [国防部：“八十二勇士”今犹在](https://www.mod.gov.cn/gfbw/wzll/lj/16415652.html)，页面 2025-10-16；照片拍摄日期未核实；本地研究图 `chn.jpg` | 全覆盖布套头盔、灰绿像素迷彩、胸前竖向弹袋、肩部织带、双手托枪；头盔取消通用高切侧导轨 | 图片中的枪械为无托布局，本轮保留原创常规布局游戏步枪，不能称 QBZ-95/191 精确模型；背面护具和具体头盔型号未认证 |
| 美国 | [DVIDS：I Corps Soldiers test out new head, ear protection](https://www.dvidshub.net/news/244642/corps-soldiers-test-out-new-head-ear-protection)，2017 年 8 月测试报道，图片编号 3665082；`usa.jpg` | 布套头盔及侧挂结构、前安装座、护目镜、棕色模块背心、侧袋/背包和肩托姿态 | 是早期 IHPS/听力防护测试照片，不据此宣称 NG-IHPS 最新批次或全军标配；游戏步枪非照片中制式枪的精确复刻 |
| 俄罗斯 | [中国军网：Chinese troops help Russian counterpart master made-in-China equipment](https://eng.chinamil.com.cn/2021special/2021-08/09/content_10073407_3.htm)，2021-08-09，摄影 Ding Kai；`rus.jpg` | 俄方协训人员的橄榄绿细像素面料、肩袖袋/魔术贴分区 | 照片人员戴软帽、未穿完整作战护甲。因此模型圆顶头盔、护颈、弹袋属于通用游戏设计，**未认证为 6Б47、6Б45 或 Ratnik 某一改型**；另查阅 [Rostec Ratnik 官方页](https://rostec.ru/en/media/news/rostec-hands-over-ratnik-combat-equipment-to-the-russian-army/)，原页返回 502，未将其当作已看实图证据 |
| 印度 | [DVIDS：Indian and U.S. Army troops fire each other’s weapons during Yudh Abhyas 21](https://www.dvidshub.net/image/6902463/indian-and-us-army-troops-fire-each-others-weapons-during-yudh-abhyas-21)，2021-10-20，第 7 Madras 团；`ind-yudh2021.jpg` | 光面全覆盖头盔、明显帽沿、下颏带、橄榄绿外层、承载织带和长弹袋；取消普遍化的夜视座/耳机 | 联训中使用的美方枪械不能冒充印度制式武器；寒区照片不代表所有地区、宗教头饰或最新装具；面部遮盖没有一概复制 |
| 韩国 | [DVIDS：Exercise Cobra Gold 2026 Operations at Sea](https://www.dvidshub.net/image/9543753/exercise-cobra-gold-2026-operations-sea)，2026 年 3 月图集；`kor-marine.jpg` | 韩国海军陆战队车组的深绿头盔、耳机、护目镜及细像素面料，作为材料和附件位置参考 | 这是**海军陆战队车组**，不能认证为韩国陆军步兵 Warrior Platform；陆军另查到 [2024-08-14 AT4 实射官方照片与说明](https://www.army.mil/article/278979/1ad_battalion_completes_dre_training_validation_with_combined_live_fire_with_rok_army_battalions)，原图 CDN 返回 403，未实际看其像素。本轮韩国步兵头盔/护甲仍标记为通用原创组合 |

## 模型变更

- `models-operator.js` 提供六套不同几何的基础装具：头盔深度/覆盖角/帽沿、导轨与护目镜、耳机、下颏扣、织带、肩带、释放扣、侧袋、IFAK、背包与饮水软管。护甲使用低饱和装备色；中/俄/韩为不同粒度的程序像素面料，美/印为有机布料图案，帝国保持原创纯色装甲。程序图案是美术近似，不冒充实物迷彩样版。
- `personnel-animation.js` 最终注册覆盖 `infantry`、`antitank_team`、`machinegun_team`、`mortar_team`、`assault_team`、`field_medic`、`sniper_team`、`operator`。全部只生成 `personnel_0`；共享几何但每实体单独创建骨架。
- 保留 13 骨的髋/膝/踝、肩/肘/腕 IK、脚底世界坐标锁定、侧移/倒退、跳跃和停步归位。持枪是低姿戒备的游戏姿态，未宣称贴腮精瞄动作已逐枪还原。
- 反坦克兵增加握持部、管箍与瞄具；机枪增加弹带和折叠两脚架；狙击枪保留长管/光学镜；单人轻迫击炮保留炮管、折叠支撑及背负底板，是携行/动作抽象，未模拟真实多人炮组展开流程。医疗兵只有医疗包和服务点，无枪口。
- 最终生产入口在 `index.html` 中由 `personnel-animation.js` 后注册覆盖；`models3d.js`/`models-roster.js` 的旧静态小队 fallback 不属于主战场最终模型，不做无关重构。

## 验证与交接

执行 `node --test tests/personnel-animation.test.cjs tests/operator-model.test.cjs tests/single-soldier-models.test.cjs`：23/23 通过。实际检查 48 个模型，每个 1 人、13 骨、2 个蒙皮网格；8496–9740 三角面。六阵营主体坐标哈希不同，确认不是仅换色；枪口向前射线无遮挡，医疗兵没有枪口。原有脚底驻留、暂停、跳跃、骨架独立性、释放及动态包围盒检查继续通过。日志 `.tmp/single-soldier-model-tests.txt`。

这些 CPU 检查只证明结构和行为，不能代替照片真实性或画质验收。本子任务未运行 GPU、未提交 Git。由主线程串行完成独立版实机、多角度画面和射击监督后，再记录视觉结论。

重新烘焙 48 张实际模型缩略图：

```powershell
node tools/bake-portraits.cjs infantry antitank_team machinegun_team mortar_team assault_team field_medic sniper_team operator
```

去除同伴后占地明显收缩，装具边界也改变，需要重烘运行时导航/瞄准包围数据（该工具目前遍历全部加载模型）：

```powershell
node tools/bake-navigation-footprints.cjs
```

两条命令均需要现有 `http://127.0.0.1:8765` 服务，由主线程独占 GPU 执行。模型来源仍在主战场、检视器与缩略图间共用。

## 主流程原生验收

48 张头像及全部 462 个模型导航包络已烘焙。实际 3.8 EXE 的 `single-soldier-browser.cjs --desktop` 验证 48 个模型均为单人/13 骨、权重归一且骨架独立；真实鼠标单选移动、独立受伤、存档身份、八角色行走/暂停/停步均通过。报告为 `docs/single-soldier-desktop-report.json`。

主流程查看六阵营正面、背面和头盔装具近景，以及八兵种检视图。迷彩、装具、兵种武器与单人轮廓可辨；轮廓仍明显为程序化低多边形，面部与衣料褶皱没有达到写实扫描品质。原生图片：`screenshots/single-soldier-factions-desktop.png`、`screenshots/single-soldier-roles-desktop.png`。检视脚本初次克隆材质时丢失 shader hook，已修正并重拍；最终图保留实际着色器和战场光源参数。上述检查不构成某支现实部队装具精确复刻认证。
