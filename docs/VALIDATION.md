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
