# 3.8 右键实射、单兵模型与资料评估

日期：2026-10-19。三个 agent 分别参与公开军人照片/模型、输入与原生用例审查、用户《分析》PDF/Markdown 评估；GPU 验收由主流程串行完成。

- 完整 CPU 回归 **473 / 473**，0 失败。包含双键交叠、半自动、换枪/失焦清理、48 个单兵模型与 7 项渲染计数回归。
- 实际 EXE：人员、坦克、舰船、潜艇、飞机、轨道平台 **6 类 × 5 档倍率**，全程无 V/G 的右键瞄准实射通过；真实伤害、松开后停止新发射、在途弹结算、V 仅观察及两种双键交叠顺序通过。本次全量运行不需要焦点恢复。
- **8 角色 × 6 阵营 = 48** 个模型均为一实体一人，独立 13 骨骼；选择移动、生命值和存档身份独立。48 张头像及全 462 型导航包络已重新烘焙。多角度检视保留程序迷彩着色器，属于有公开资料参考的原创低多边形美术，不是扫描模型或现役装具精确复刻。
- 刷新 7 份原生报告：右键实射、单兵、真实渲染统计、77 类驾驶、到位/步态、军械库、96 单位移动。导入模型 ready、原来源/CC BY/作者/材质纹理检查通过。发布一致性另检查其他历史报告，不将历史记录算成本轮重跑。
- 按《分析》资料的“实测计量”原则修复开镜重复计算世界绘制：实际普通 FPS 42 calls = 世界 36 + 前景 6；V/RMB 开镜只计 36，前景为 0；恢复与 RTS 均通过真实 gl.render 记录核对。只修统计，**不声称因此提高 FPS**；旧开镜绘制数可能重复，独立 RAF 帧时采样不受此计数错误影响。
- RTX 3060，物理 **3440 × 1440**、CSS 2752 × 1152，98 实体 / 96 移动单位，8.02 秒短样本平均 **46.3 FPS**，P95 帧时 **22.3 ms**；96/96 净移动超过 80 u，坐标有限且无运行错误。这是固定开放场景，不代表长局或极限规模。

初次右键原生用例在驱逐舰 V 收起时因鼠标解锁而超时，旧日志不足以确定触发来源。验收脚本补充可信焦点事件和应用解锁调用栈，只在观察用例边界允许真实点击重锁；射击区间不自动恢复或削弱断言。后续六域全量通过，未改游戏伤害/射线以绕过测试。

[完整证据](v3.8-validation.json) · [用户资料评估](reviews/user-analysis-evaluation.md) · [单兵照片依据与边界](reviews/single-soldier-models.md) · [操作](UNIFIED_AIM.md)

---

# 3.7 全单位瞄准、变焦与射程状态

日期：2026-10-19。主流程与三个 agent 分别实现、独立复核，并串行运行实际 Windows EXE。

- 完整 CPU 回归 **454 / 454**；包括全部有武装单位短点击、真实模型表面与俯仰滚转、各档倍率、射程/目标域/遮挡、弹药及暂停锁定。
- 独立版 77 种单位进出驾驶、6 类 × 5 档倍率实射、4000 / 12000 u 轨道俯视、失焦停止、上下车、树木破坏与保存读取均通过。
- 行动员军械库、离线浏览器与独立版导入模型来源/材质/许可验证通过；689 个发布源文件 SHA-256 一致。
- RTX 3060、3440 × 1440、5 实体小场景，坦克 16 倍瞄准按住左键 8.02 秒，帧间隔 P95 **20.1 ms**。不代表大规模持续战斗。
- 实测发现并修复暂停后无法重新锁定鼠标；测试发现潜艇包围盒中心可能落空，改为真实海域、真实模型表面及真实鼠标操作验收，没有修改伤害/射线来绕过失败。

[操作与实现](UNIFIED_AIM.md) · [监督记录](reviews/unified-aim-supervision.md) · [完整本轮证据](v3.7-validation.json)

---

# 3.5 调度吸收、拥堵修复与行动员军械库

日期：2026-10-18。本轮通过三个agent分别负责导航、武器/ZIP分析、UI/单人模型；主流程集成与真实EXE串行验收。

- 完整CPU回归 **247/247**；含64武器×7目标类型×FPS/RTS共896实射子场景，以及非锁定发射器范围伤害。
- 五组24/48单位移动测试全部到达：48单位192u窄口由24/48到48/48，持续卡住24→0；逐tick检查重叠/越地形均0。具体条件见[导航审计](reviews/crowd-navigation-audit.md)。
- 用户ZIP仅静态读取，独立吸收实际占位释放、超时重评、保留目标及有预算FIFO轮次。每tick局部重评最多2请求，总A*最多10次；24车道测试验证高ID不饥饿。见[源码依据](reviews/archive-scheduling-reference.md)。
- 400单位60s压力：相对无局部预算版本，平均模拟步19.06→10.62ms，P95 45.42→18.11ms；298/400经过瓶颈，77到终点。大规模窄口仍有真实排队，不能宣称全员瞬时通过；0.5s采样无重叠。
- 原生全屏移动样本：RTX3060、物理3440×1440（CSS2752×1152，DPR1.25），96移动单位/98实体，8s平均 **46.4FPS**、P95帧时22.4ms，96/96净移动超过80u，无运行错误。只是受控短样本，不是长期激战保证。[报告](crowd-desktop-report.json)
- 独立行动员6阵营原创外观、64款武器8类；全部能对人员，32单域/24组合/8全域。弹药、备弹、换弹、切换、随机配装、目标限制、RTS接管和存档已验证。角色仍是程序化美术，无完整骨骼动作；没有达到使命召唤画质。第三人称持默认步枪外观，第一人称显示实际配装。
- 真实浏览器和EXE操作均通过：B军械库、搜索/目标筛选/随机/装备、1/2/滚轮切换、R装填与暂停守恒、半自动长按仅一发、跳跃、小地图、菜单隔离及退出。700×900和1600×1000卡片布局断言无文字溢出；原生全屏也通过。[原生报告](operator-desktop-report.json)
- 原有9份原生流程报告全部更新：离线模型来源/许可/材质、全部77单位驾驶、AI保护、FPS输入、水下/飞机失焦、轨道射程、群岛/全屏、命令路径和生产防御交战。新原生军械库与移动压力合计11份。

实际UI验收发现卡片高度被通用按钮样式压到40px，修为132px最小行高并加入真实DOM包含性检查。审查发现并修复弹药旧引用、EMP短按残留、原型属性非法武器键、退出驾驶后绕过配装等问题。历史单位计数断言已更新，未削弱行为验收条件。

[军械库](../screenshots/operator-armory-desktop.png) · [移动部队](../screenshots/crowd-moving-desktop.png) · [单人模型](../screenshots/operator-gallery.png)

---

# 3.4 第一人称稳定性与三个 agent 审计

日期：2026-10-18（北京时间）。本轮增加人员跳跃、第一人称只读小地图、飞机鼠标左右反向，并由输入、模拟和界面三个 agent 分工定位和修复。未新增模型，仍为 76 类单位 / 21 类建筑。完整审计表示覆盖这些主流程，不表示已经证明全游戏没有任何 bug。

|检查|结果与范围|证据|
|---|---|---|
|完整 CPU 回归|198/198 通过，0 失败；npm test 现包含全部 *.test.cjs|simulation-tests.txt|
|模拟专项|12项：7类人员跳跃/长按/空中限制/短按边沿/暂停退出EMP、存档隔离与ID校验、矿山占地、AI不移动驾驶员|../tests/jump-and-simulation-audit.test.cjs|
|驾驶输入|11项：默认稳定、双轴方向、锁定异常增量、失焦/暂停/模态、短按立即提交|../tests/input-stability.test.cjs|
|UI专项|11项：小地图10Hz/换乘更新、菜单与卡片焦点、Tab隔离、J默认文本输入、FPS暂停鼠标不进入RTS及捕获取消|../tests/ui-audit.test.cjs|
|真实浏览器与实际EXE|各9组通过：静止相机与前景不动、真实Space跳跃/P暂停、小地图迷雾与朝向、坏存档不退出FPS、焦点/Tab/帮助、飞机真实鼠标四向、换乘清转向、水下声呐丢失；errors均为空|fps-upgrade-browser-report.json / fps-upgrade-desktop-report.json|

最终串行原生回归全部通过：upgrade（离线导入模型/材质/全屏）、player-mode（5组）、first-person（全部76类，真实射击/遮挡/失焦，零错误）、depth-flight（7组）、high-altitude（7组）、maps（3组）、command-feedback（2组）和 expanded（混编单位/生产建造/范围/交战）。补丁后的9组新增浏览器与EXE检查也重新通过，含暂停时真实鼠标点击不触发RTS捕获。对应同名desktop-report.json均已刷新。

发布包一致性由 fps-package-report.json 记录：3.4.0，674个源码/资产文件SHA256一致，582头像，9份原生运行报告均无错误。
修复证据和参考源码：[输入审计](reviews/input-stability-audit.md)、[模拟审计](reviews/simulation-audit.md)、[UI/OpenRA审计](reviews/ui-minimap-audit.md)、[Unity/Godot参考](reviews/fps-reference-upgrade.md)。全部为独立实现，没有复制这些仓库的源码、素材或引擎运行时。

真实界面测试额外发现并修复三项：快速释放/重按Space在一个模拟tick内丢失第二跳；RTS按J打开后默认文本输入把j填入搜索框；第一人称暂停点击漏入RTS的setPointerCapture异常。最后一项是旧76驾驶回归捕获的阻断，错误非空时明确判失败，修后整套重跑。其余一次飞机方向测试需先用W启动飞行并校准初始姿态；一次静止比较只差JavaScript的+0/-0，改为等值零规范化，未改运行时掩盖问题。

默认跳跃初速32u/s、重力80u/s²，峰高6.4u、约0.8s落地，属于游戏比例；未实现翻墙、角色骨骼动作或真实人体动力学。正常飞机惯性、滚转和战场动画保留。锁定切换丢弃首条鼠标增量，异常巨量也忽略；M可主动恢复前景晃动，默认关闭。小地图10Hz刷新且只读；未侦察目标和无声呐的潜艇不暴露。

本版原生短时性能：RTX 3060、物理3440×1440 / CSS2752×1152 / DPR1.25；122实体混编平均46.3 FPS，P95帧耗时22.4ms；约5秒交战98→74实体，177次发射，平均46.35 FPS、P95 22.5ms。短时受控样本不表示长局或极限人口。详见 expanded-desktop-report.json。

以下为3.3及更早版本历史记录，部分同名运行报告会更新。

---
# 3.3 群岛、轨道、Warzone 参考与玩家驾驶验证

日期：2026-10-18（北京时间）。76 类单位（陆军20、海军19、空军18、太空18，另采矿车1）、21 类建筑、六阵营582个图鉴/头像项目。四图6144×4224，面积为旧版4倍。以下均为游戏参数与本机验证，不认证真实武器性能。

|检查|本版结果|证据|
|---|---|---|
|完整模拟|164/164通过，0失败|simulation-tests.txt|
|地图|16项；四图20座矿真实采集返厂，每队至少500矿；五岛陆地隔离与五港72u保守船体余量连通|../tests/maps-large.test.cjs / LARGE_MAPS.md|
|群岛实际操作|浏览器与独立EXE均通过真实菜单开局、5队/5矿/5港/6据点、点船和右键移动|maps-browser/browser-report.json / maps-browser/desktop-report.json|
|高空与资源|20项模拟；浏览器与EXE各7组：真实鼠标反向俯仰、4000u相机与真实地面点击命中、12000u显示、8角色/4设施UI、无限与10倍开关|../tests/high-altitude.test.cjs / high-altitude-browser-report.json / high-altitude-desktop-report.json|
|Warzone参考|官方固定提交研究；13项CPU验证静态连通缓存、拒绝保留原命令、混选/Shift/队列满、隔海直接火力；浏览器与EXE各2组真实路径/右键反馈|reviews/warzone2100-reference.md / command-feedback-browser-report.json / command-feedback-desktop-report.json|
|玩家模式|浏览器与EXE各5组：开局接管、J换乘、海陆空天/水下、搜索、敌军排除、新单位自动加入、AI时间推进、保护HUD、退出清理|player-mode-browser-report.json / player-mode-desktop-report.json|
|保护AI|11项：正确目标域、基地留守、玩家护卫、维修实回血、资金科技、缺电插队、探测/EMP、退出与存档、应急维修、群岛与舰炮|../tests/player-protection.test.cjs / PLAYER_MODE.md|
|驾驶回归|76类真实选择/E进入退出，手动射击、遮挡、失焦清输入、AI经营；原生水下/飞行7组|first-person-desktop-report.json / depth-flight-desktop-report.json|
|模型与取景|354职责变体几何/PBR有效，582图鉴，1040横竖屏五视图取景；582同源头像|model-detail-report.json / gallery-report.json / gallery-framing-report.json|
|离线与原生|实际EXE：导入模型ready、CC-BY-4.0来源及材质、离线零HTTP、全屏/沉浸切换|desktop-report.json / upgrade-browser-report.json|
|包一致性|发布代码、资产与582头像逐文件SHA256核对|altitude-package-report.json|

本版独立EXE短时性能：RTX 3060，物理3440×1440、CSS2752×1152、DPR1.25。122实体混编4.012秒平均46.4 FPS、P95帧耗时22.4ms；5.018秒交战98→74实体、177次发射、76峰值效果、4组防御圈，平均46.64 FPS、P95帧耗时22.3ms。测试串行运行；短时受控采样不代表长局或极限人口。证据：expanded-desktop-report.json。

独立监督亲看新单位/防御结构、轨道与玩家菜单截图，并独立运行专项CPU；详见 reviews/high-altitude-supervision.md。发现的截击机挂架悬空、平板船底、母舰纵深、地图预览格数和搜索框被挤压均已修正。高空平面战场与装饰球面仍能看出边界，列为画质限制；不是无缝星球。

保护AI每秒评估已知威胁，不提供无敌，受兵力/视野/资金/目标域限制。跨岛地面部队没有运输登陆机制，海空与轨道负责跨岛打击。中央岛有两个据点，未宣称竞技平衡。轨道1u=0.1km仅用于该层压缩HUD；飞机为简化三维运动，未模拟真实气动/轨道力学。程序模型和背景仍为风格化画面，未接入DLSS、光追或破解组件。

复现：启动node server.cjs，npm test；GPU测试务必串行。运行tests/player-mode-browser.cjs、tests/command-feedback-browser.cjs、tests/high-altitude-browser.cjs、tests/maps-browser.cjs；build-desktop.ps1后给这些脚本加--desktop。再运行tests/upgrade.cjs、tests/expanded-browser.cjs --desktop、tests/first-person-browser.cjs --desktop、tests/depth-flight-browser.cjs --desktop以及tests/package-consistency.cjs。

下文为历史版本记录；同名自动报告更新为最新验证结果。

---

# 3.2 水下作战、三维飞行与全域平台验证

日期：2026-10-17（北京时间）。4种新角色；合计68类单位（陆18、海17、空16、天16、采矿车1），6阵营408单位外观槽位，加建筑共510图鉴项。新全域平台为架空游戏装备，数值不代表现实性能。

|检查|本轮实际结果|证据|
|---|---|---|
|模拟|104/104通过；含19项深度/飞行、68类生产/存档、210武装目标域场景、科技与AI禁令|simulation-tests.txt / ../tests/depth-flight.test.cjs|
|水下和飞行交互|浏览器6组、实际EXE7组均通过；Ctrl/Shift潜深、海床、声呐失联、左键鱼雷命中、真实鼠标/油门/升降/滚转、生产入队|depth-flight-browser-report.json / depth-flight-desktop-report.json|
|失焦与暂停|原生全屏真实最小化产生trusted blur，W/Shift保持时失焦清空；恢复后XYZ完全相同且flightEnabled=false；暂停/指针解锁同样停止|depth-flight-desktop-report.json 的 nativeFlightFocus|
|声呐一致性|关闭全图增益，optical=false仍显示有效声呐接触；EMP后模型/接触和小地图点一同消失|depth-flight-desktop-report.json 的 sonar|
|海床与沿岸|实际垂直射线沿岸海底=-180；水面双面合批；潜深22–140且海军导航禁止穿陆|depth-flight-desktop-report.json 的 coastalFloor / depth-flight.test.cjs|
|68类驾驶回归|浏览器和实际EXE各68类真实选择/E进入退出；射击、遮挡、AI代管、全屏/返回通过，错误0|first-person-browser-report.json / first-person-desktop-report.json|
|模型与头像|306职责槽位几何/PBR有效；510图鉴项；920横竖屏五视图取景；510同源头像|model-detail-report.json / gallery-report.json / gallery-framing-report.json|
|独立监督|监督agent独立35项CPU通过；实际看20模型图和两张原生图；保障艇支柱及小地图问题修复关闭|reviews/depth-flight-supervision.md|
|离线和许可|实际EXE通过授权导入ready/材质/署名、file离线、全屏/沉浸与UI检查|desktop-report.json / upgrade-browser-report.json|
|发布一致性|3.2.0运行代码/资产和510头像逐文件SHA256核对|depth-package-report.json / ../tests/package-consistency.cjs|

实际EXE性能：ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)；物理3440×1440、CSS2752×1152、DPR1.25。106实体混编4秒平均46.3 FPS；5.006秒交战86→65实体，163次发射，57峰值效果、4组防御圈，平均47.94 FPS，P95帧耗时22.5ms。GPU测试全部串行；这是短时受控采样，不代表长局或极限人口。水下/飞行报告是功能检查，不作为稳定帧率测试。

所有距离、速度、深度和武器参数采用游戏单位。固定翼有推进惯性/有限转弯/俯仰升降；不含真实气动、失速、真实座舱或完整碰撞损毁。海床为固定深度，海岸为简化垂直壁；水下雾色不是物理散射。射程/伤害区域、声呐和维修/护盾/火控采用3D距离，旧近防拦截仍为二维近似。画面仍是风格化程序模型，未达到商业AAA；未引入DLSS或光追。

验证过程中：首先修复斜坡海床可能侵入靠岸潜艇空间。小地图在FPS隐藏时不会自动重画，因此像素检查显式调用同一RTS小地图绘制函数；没有伪造像素。一次单点鼠标移动断言未观察到俯仰变化，加入事件记录并改为连续8步真实鼠标移动，两端均收到trusted、locked且dy非0事件，俯仰改变；未据此宣称修复运行时鼠标bug。

复现：先运行 node server.cjs；npm test；串行运行 node tests/model-detail.cjs、node tests/gallery.cjs、node tests/gallery-framing.cjs、node tests/expanded-browser.cjs、node tests/first-person-browser.cjs、node tests/depth-flight-browser.cjs。构建后串行运行 node tests/upgrade.cjs、node tests/expanded-browser.cjs --desktop、node tests/first-person-browser.cjs --desktop、node tests/depth-flight-browser.cjs --desktop、node tests/package-consistency.cjs。

下文为历史记录；同名自动报告已由当前版本更新。

---

# 3.1 战术单位扩充验证

日期：2026-10-17（北京时间）。新增8种职责，合计64类单位：陆18、海15、空15、天15，另采矿车1；6阵营384单位槽位，加17建筑的6阵营变体共486图鉴项。模型均为原创职责外观，不冒称真实型号。

|检查|本轮实际结果|证据|
|---|---|---|
|模拟|85/85通过；64类生产/存档、160武装目标域场景，新护盾/空中维修/舰队支援/拦截/AI禁令|simulation-tests.txt|
|模型与监督|282职责槽位几何/PBR/锚点有效；维修机5网格（机体+4旋翼），其余最多3；驳船发射口支撑遮挡返工闭环|model-detail-report.json / reviews/tactical-wave-supervision.md|
|图鉴及生产头像|486项无错误；880个横竖屏视角取景通过；486张同源生产头像|gallery-report.json / gallery-framing-report.json / ../assets/portraits/|
|生产及范围|新8种均通过真实点击加入队列；轨道护盾210范围仅作用于太空，EMP停机；维修机4副旋翼分别转动|expanded-browser-report.json / expanded-desktop-report.json|
|64类第一人称|浏览器与实际EXE分别完成全部64类真实选择与E进入/退出；移动/瞄准/AI代管/伤害/遮挡回归通过|first-person-browser-report.json / first-person-desktop-report.json|
|原生失焦|全屏true；真实最小化产生trusted blur，移动/开火输入清空，恢复后不续动续射|first-person-desktop-report.json 的 nativeFocus|
|最终HUD提示|监督反馈后，无武装单位改为支援自动运行；新8类原生键盘进入/退出、提示及源文件SHA256再次验证|tactical-controls-report.json|
|发布一致性|486头像、运行代码/资产与EXE包逐文件SHA256核对|tactical-package-report.json|
|离线与许可|三授权导入模块ready、材质/署名保留，file启动零HTTP；实际EXE全屏/沉浸通过|desktop-report.json / upgrade-browser-report.json|

实际 EXE 的 RTS 性能：NVIDIA GeForce RTX 3060 / ANGLE D3D11，物理3440×1440，CSS2752×1152、DPR1.25；4秒混编98实体平均46.5 FPS。5.006秒交战80→63实体，164次发射，51峰值效果，4组防御圈，平均46.34 FPS、P95帧耗时22.4ms。见 expanded-desktop-report.json 与 ../screenshots/expanded-combat-desktop.png。GPU测试串行运行，这是短时受控采样，不代表长局或极限人口性能。旧版第一人称10秒性能报告保留作历史记录，未冒称本轮重测。

新增舰队增益、护盾和维修均为游戏规则。护盾取最强值、不叠加，含自身但仅友方太空单位；EMP/死亡立即失效；无武装护盾舰不受AI太空武器禁令限制，导弹驳船受限制。近防与导弹仍采用现有二维距离拦截近似，不能作为现实轨道反导仿真。人物、舰艇蒙皮、座舱和场景仍明显简化，没有达到商业AAA写实画质。

复现：先 node server.cjs；运行 npm test、node tests/model-detail.cjs、node tests/gallery.cjs、node tests/gallery-framing.cjs、node tests/expanded-browser.cjs、node tests/first-person-browser.cjs；构建后串行运行 node tests/upgrade.cjs、node tests/expanded-browser.cjs --desktop、node tests/first-person-browser.cjs --desktop、node tests/tactical-controls.cjs。最后追加的改动仅为无武装操作文案，已经8类原生定向复测。

下文为历史记录；同名自动报告已由当前版本更新。

---

# 3.0 第一人称与作战增援验证

日期：2026-10-17（北京时间）。12种新职责单位、同一RTS战场第一人称接管、己方AI代管、近景武器与座舱。本轮保留真实型号的既有证据边界；模型和FPS画质未达到商业AAA。

|检查|实际结果|证据|
|---|---|---|
|模拟回归|77/77通过：56类生产/存档、140种武装目标域场景、治疗与装填场、驾驶/碰撞/控制权/延迟弹着等|simulation-tests.txt|
|全部单位接管|浏览器和实际EXE均逐个使用真实选择与E进入/退出56类；相机有限、自身外部模型隐藏、HUD身份正确|first-person-browser-report.json / first-person-desktop-report.json|
|第一人称交互|WASD、鼠标观察、ADS、M晃动、暂停、一次Esc返回；AI经营与其他部队调度，退出停止新增AI调度|first-person-desktop-report.json|
|射击一致性|真实点击造成74点伤害并得到相同sourceId确认；空射无确认；飞行期间移走目标不会隔空扣血；两类真实锚点+一类保守发射点遮挡均0伤害|first-person-desktop-report.json|
|原生失焦|全屏true；关闭测试框架焦点仿真后，最小化产生trusted blur，锁鼠/移动/开火清空；恢复位置相同且不续射|first-person-desktop-report.json 的 nativeFocus|
|增援模型|234角色变体几何、材质、武器锚点通过；最高29,760三角面/模型、最多3网格；不是写实程度判据|model-detail-report.json|
|图鉴/头像|438槽位、800个横竖屏五视图检查；438张最终模型头像|gallery-report.json / gallery-framing-report.json / ../assets/portraits/|
|扩兵与防御UI|真实生产/搜索/范围/EMP/放置/海陆空天动画；234角色变体；错误0|expanded-browser-report.json / expanded-desktop-report.json|
|许可资产与离线|T-90M、伯克、AH-64三导入模块ready，原材质及署名保留；file协议零HTTP；原生全屏切换通过|desktop-report.json / upgrade-browser-report.json|
|独立监督|增援12种结构/职责辨识；第一人称原生记录、截图与问题闭环，未授予写实终验|reviews/reinforcements-supervision.md / reviews/first-person-supervision.md|

最终第一人称性能：ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)。物理3440×1440、CSS 2752×1152、DPR 1.25；实际EXE全屏，采样10.00秒，61→58实体，观察24次发射。平均 **46.8 FPS**，P95 **22.4 ms**；世界与近景合计90次绘制、1,049,774三角面。证据：[first-person-performance-report.json](first-person-performance-report.json) / [实际交战截图](../screenshots/fps-live-battle-desktop.png)。

RTS短时性能：同机同原生全屏，混编82实体4秒平均46.4 FPS；5秒交火72→59实体，146次发射、4组防御圈，平均46.9 FPS，P95 22.4 ms。测试串行运行；以上是受控短时采样，不代表长局、极限人口或最低帧率承诺。

第一人称射击是准星/炮口射线、延迟固定落点和圆形命中区近似，不是逐帧完整弹道；无炮口锚点的旧模型采用较低的保守发射点。空天保留RTS高度层，班组保持原单位语义；没有六自由度飞行、弹匣或完整人物骨骼动画。近景舱室是按军种设计的原创控制台，不冒称逐型号真实座舱。无DLSS、光追或破解组件。最后一次原生实战重测包含柔边火光/火花视觉修正。

下文为历史版本记录，同名自动报告已更新到当前版本。

---

# 2.3 模型细化验证记录

日期：2026-10-17（北京时间）。本轮修改27种原创职责模型及其六阵营变体；原参考目录未修改。

|检查|实际结果|证据|
|---|---|---|
|独立监督|四轮实际看图，人物/车舱/进气道/舰桥返工闭环；几何和材质细化改善通过，写实终验未完成|reviews/detail-pass-supervision.md|
|几何与材质|162槽位有限坐标/法线、保留PBR材质；机身/两种机翼上下射线命中朝外面；真实迷彩按钮改变图像|model-detail-report.json|
|合批预算|最大29,760三角面/模型，最多3个网格；不是写实程度判据|model-detail-report.json|
|模拟回归|55/55通过|simulation-tests.txt|
|图鉴与取景|366模型，680个横竖屏五视图取景检查通过，错误0|gallery-report.json / gallery-framing-report.json|
|美术证据|135张最终五视图，6组同角度同光照前后对比，27角色联图|../screenshots/detail-pass/comparison.png / ../screenshots/expanded-review-sheet.png|
|生产头像|366张由最终运行模型重新渲染|../assets/portraits/|
|实际EXE|新角色生产、搜索、范围/EMP、海陆空天高度、雷达/旋翼、全屏及沉浸通过；错误0|expanded-desktop-report.json|
|原有导入与离线|三导入模块ready，署名与材质保留；11组交互检查、file协议零HTTP、发布脚本SHA256一致|desktop-report.json / upgrade-browser-report.json|

短时性能：ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)。物理3440×1440，CSS 2752×1152，DPR 1.25。混编58实体，4秒平均50.1 FPS，828,956三角面、109绘制调用；5秒实际交火58→47实体，观察93次发射、4组防御圈，平均50.07 FPS，P95 20.1 ms。未同时运行其他本项目渲染测试；这是受控短时检查，不能替代长期实战或极限人口测试。

本轮未改模拟参数、未新增外部资产、未集成DLSS/光追。服装、面部、座舱、涂装与蒙皮仍简化，六阵营共享角色基础设计。主战场、图鉴、生产头像同源；素材许可沿用原记录。

下文为历史版本记录，链接中的同名自动报告已更新到当前版，旧数字只描述当时记录。

---

# 2.2 验证记录

日期：2026-10-16。项目 D:\现代战线HD；原参考目录未修改。

|检查|实际结果|证据|
|---|---|---|
|模拟|55/55通过；新增21种武装角色×5目标域=105次射击场景；44种生产、存档、维修域、AI限制与连通海域|simulation-tests.txt / tests/expanded.test.cjs|
|图鉴|366可选项，0错误；新增162阵营角色槽位几何与炮口检查通过|gallery-report.json / expanded-browser-report.json|
|五视图|1200×800和700×900各340个取景检查，共680项，通过|gallery-framing-report.json|
|角色美术|新增27角色135张五视图；两轮监督闭环，原创角色辨识通过|reviews/expanded-model-supervision.md|
|生产头像|366张，与战场同一模型源，最后修订后重烘|../assets/portraits/|
|范围提示|真实输入验证选中/悬停、V三态、建造预览、雷达EMP及攻击379.5/拦截330区别|expanded-browser-report.json|
|兼容2D|新增27角色可绘制；同一379.5/330范围规则通过|range-fallback-report.json|
|原有交互/离线|11组检查通过；原有三种导入模块ready、PBR材质和署名保留，file://零HTTP请求|upgrade-browser-report.json / desktop-report.json|
|实际EXE|全屏、Tab、366头像入口、四军种搜索/生产、162模型、雷达与推进桨转动通过，错误0|expanded-desktop-report.json|
|运行高度|航空65、太空145游戏单位；实际运行对象位置断言及混编截图|expanded-desktop-report.json 的 animation|
|独立审查|两个UI启动阻断和不可达河段问题已修复并独立复核|reviews/expanded-integration-review.md|

性能记录：RTX 3060，物理屏幕3440×1440，CSS视口2752×1152，DPR1.25。实际EXE混编场景采样4秒约50.1 FPS；5秒交火由58实体降至47，观察92次发射、峰值31个效果及4组防御圈，平均50.18 FPS，P95帧20.1ms。短时采样，不是长局/极限人口承诺。控制场景含54新增模型与基地，原生产队列可能继续产出；报告记录的是采样时真实实体数。

外观边界：新增是27种原创职责模型、6阵营色系，共162槽位；不是162种精确实物型号。完整实物终验仍未全部完成；本轮没有导入新的Sketchfab模型，没有集成DLSS或光追。候选来源与许可见 reviews/expanded-model-references.md。

下文保留2.1历史记录；其中旧数量和性能只适用于对应旧版。

---

# 2.1 验证记录

日期：2026-10-16。项目位于 `D:\现代战线HD`；原参考目录 `D:\红警\2024` 未修改。

## 已实际执行

|检查|结果|证据|
|---|---|---|
|模拟行为|40项通过，0失败|`simulation-tests.txt`|
|装备检视|194个可选模型可创建、边界有效、交互正常，错误0|`gallery-report.json`|
|浏览器操作/离线|11组检查通过，错误0|`upgrade-browser-report.json`|
|实际Windows EXE|启动、三维战场、F11全屏切换、Tab沉浸界面通过|`desktop-report.json`|
|发布内容一致性|入口及全部入口脚本SHA256与工作区相同|`desktop-report.json` 的 `packageSourceMatch`|
|授权外部资产|伯克、美韩AH-64、T-90M均ready，署名存在，全部网格保留自身材质|`desktop-report.json` 的 `imported`|
|外观截图|49个实物槽位＋3类设施，各5视图，共260张|`../screenshots/model-review/`|
|生产缩略图|204张（102单位＋102阵营建筑）由当前运行模型渲染|`../assets/portraits/`|
|范围清单|102个阵营单位槽位、17类设施、7类能力|`reviews/model-inventory.json`|

模拟覆盖三地图出生点连通、海军水域路径、39种地图/单位寻路组合到达目标、15处矿山的指定采矿往返、装载/卸货/矿尽改道、平行生产线、集结点、排队路径、队形、撤退、据点胜负、保存恢复、技能冷却、延迟打击、护盾、维修、干扰及CIWS实际拦截。独立AI太空禁用与玩家尖端科技开关分别验证；轨道武器能伤害地面、舰艇、飞机、轨道目标和基地。

浏览器检查使用真实鼠标/键盘选择与右键移动，覆盖六阵营、四档AI、生产、集结、实时权限设置、夜间/画质、窄屏和本地保存。file://检查等待三个导入模块完成，启动对局，确认零HTTP请求。EXE检查也等待导入并监听console.error，避免把旧程序模型回退误当作新资产已经交付。

外部模型另有离线与失败回退检查：伯克缺嵌入数据仍保留程序模型；AH-64主/尾桨转动不移动机身和旋翼轴；T-90M转炮塔不移动车体，炮管随炮塔，印度T-90S不被覆盖。详见 `reviews/burke-import-verification.json`、`reviews/ah64-import-validation.json` 与 `../assets/models/t90m-validation.json`。

## 本轮太空与建筑专项

- 24个太空阵营槽位（4职责×6阵营，共享家族基础并有构型变体），17类建筑×6阵营。194项图集加载零错误；新增126槽位边界/模型标识/武器锚点检查通过。
- 40项模拟测试含8项新太空测试：无武装侦察、截击仅空天、反轨仅轨道、重平台五类目标、AI禁造/退款/清除、玩家独占科技、保存与路径、弹道和爆点层级。
- 浏览器和实际EXE各检查28个四象限瞄准案例，建筑根基不转、上装正确朝向，攻击起点与实际炮口锚点一致。三类效果区分轨道束流、截击脉冲与反轨上升导弹。
- 1200×800及700×900各205个五视图取景检查，共410项均完整包含包围盒；报告 `gallery-framing-report.json`。
- 独立监督agent多轮实看24槽位/17建筑总览及关键五视图，修正裁切、悬空连接、C-RAM双眼、阵元遮挡、上装支承、SAM承架、机场与维修同形等问题。结论是原创游戏外观/职责辨识通过，不是实物或影视级精度。见 `reviews/space-supervision.md`。
- Sketchfab检索核查11模型、筛8候选；新文件下载均要求认证，未导入。已用T-90M没有重复计入新资产。详见 `reviews/sketchfab-candidates.md`。

本轮桌面专项性能：RTX3060，CSS2752×1152×DPR1.25，即3440×1440，高画质；48个额外太空/反轨单位＋17建筑，共97实体全可见；预热1.2秒，采样6.016秒，平均47.0 FPS，P95 21.8 ms，206次绘制、642685三角面，错误0。这是模拟运行且AI调度暂停的静态样本，不是长期交战保证。报告 `space-desktop-report.json`；浏览器专项 `space-browser-report.json`。

## 2.0历史全屏性能（非本轮重测）

使用 `node tests/performance3d.cjs --desktop` 启动发布EXE默认全屏。WebGL报告GPU为 **NVIDIA GeForce RTX 3060 / ANGLE D3D11**。CSS视口2752×1152，DPR 1.25，因此渲染缓冲为 **3440×1440**；高画质。每场预热2秒，采样6秒。

|场景|总实体|可见实体|绘制调用|三角面|平均FPS|P95帧时间|
|---|---:|---:|---:|---:|---:|---:|
|中国初始场景|32|16|30|256,054|50.1|20.1 ms|
|中国＋120混合单位|152|152|313|2,120,598|50.1|20.1 ms|
|美国＋120混合单位，含AH-64|152|152|468|5,465,097|50.0|20.1 ms|
|俄罗斯＋120混合单位，含T-90M|152|152|964|4,948,584|50.1|20.1 ms|

报告：`performance3d-desktop.json`；浏览器另测于 `performance3d-browser.json`。这些是模拟持续运行、AI调度暂停的静态军团短样本；不是持续交战、全地图大军团或长时间稳定帧率保证。约50 FPS可能受到本机显示/调度节奏限制，不能据此推算GPU上限。交互测试末尾的一帧FPS不作为性能基准。

## 外观验收边界

- 25个地面装备槽位完成一级轮廓初审；海空完成多轮图片对照。几何、贴图、来源和运行改进不等于所有装备已接近实物。
- T-90M、伯克与AH-64使用有署名许可的外部美术。T-90M部分灰色混合材质尚未细分；AH-64是Longbow家族参考，不能认证精确AH-64E批次。其余四款坦克顶部装置、尾篮、局部板件和近景表面仍有明显差距。
- 早期260张实物/设施截图以及本轮新增太空、建筑总览和代表五视图证明可渲染，不代表每个真实装备都完成实物细节终验。具体检查记录见三个agent的逐型报告。
- 用户新指令放行太空4型（含帝国）和17类建筑（含概念防御）；其余未知图片、六代概念及其他战锤车辆舰机继续冻结进一步生成，旧原型可玩。规则见 `reviews/ACCEPTANCE_POLICY.md`。
- 真实公开资料与游戏数值分开。核打击、钻地打击和轨道能力为玩法抽象，不能作为现实性能证据。

## 技术范围与未验证项

独立窗口为Electron 44.7.2＋Three.js WebGL，运行无需浏览器安装、Node.js、Python或CAD服务。已启用软阴影、PBR、地面法线、程序迷彩和战雾；没有DLSS、光追、摄影测量或真实弹道。当前未验证联网多人、完整触屏操作、数小时耐久运行和所有大军团碰撞场景。

`tests/browser.cjs`、`acceptance.cjs`、`performance.cjs`及部分旧报告为1.x二维版本历史记录；本次2.0以本页列出的新测试为准。早期`models/`内STEP/CAD有效性和工具适配记录属于研究资产，不能证明当前实时网格精度，也不是游戏启动依赖。
