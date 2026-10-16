# 现代战线 HD · 2.3

可离线运行的三维即时战略遭遇战。项目位于 `D:\现代战线HD`；原参考目录 `D:\红警\2024` 未修改。

## 启动

双击 **启动独立版.cmd**，或 **启动游戏.cmd**。发布程序是 `release/ModernFrontHD/ModernFrontHD.exe`，需保留整个同名目录。默认全屏，无浏览器地址栏，无需另外安装Node.js或浏览器。F11切换全屏，Tab隐藏/恢复作战界面。

独立窗口使用Electron + Three.js WebGL；不是Unreal/DirectX引擎重写。资源全部本地加载，不要求账号、服务器或联网AI。浏览器兼容入口保留为 `play.ps1` 或 `index.html`。

`release/ModernFrontHD-portable.zip` 是浏览器兼容包，不含独立版运行时；本机优先使用上面的EXE目录。

## 2.3 模型细化

27种新增角色共用结构升级：人物比例与关节/织物背心，圆肩胎纹与多层轮毂，斜风挡和液压吊臂，分段机身/弧面机翼/凹进气口，分层舰桥和机库甲板，太空喷口/散热管与板件支架。新增按顶点区分涂漆、玻璃、金属、橡胶、布料、太阳电池与隔热材料的PBR表面；保持合批，每模型最多3个网格。

[同光照前后对比](screenshots/detail-pass/comparison.png) / [四轮独立建模监督](docs/reviews/detail-pass-supervision.md)。这些是原创职责模型的几何和材质改善，仍保留程序模型感，未达到《坦克世界》级资产精度；不是新增162种真实型号，也未集成DLSS或光追。人物动作、布料、机身蒙皮与壳体涂装仍有提升空间。

## 当前玩法

- 美国、俄罗斯、中国、印度、韩国、战锤人类帝国同人阵营；1玩家对1–4 AI，支持混战/敌方联盟。
- 简单、标准、困难、极难四档AI；高难度包含经济补助，不能等同于公平经济下更聪明。
- 三张地图、连通海域、陆路桥梁、矿山、补给据点；基地歼灭与据点积分胜利规则。
- 44类单位：陆军13、海军10、空军10、太空10，另有采矿车、17类基地/防御设施、7类支援能力、8项玩家增益；本地保存和JSON导入导出。
- 每矿山初始24,000资源；采矿车容量500、装载65/秒，自动往返装车区和炼厂。采空后另寻矿源，炼厂损失时保留货物等待。矿体阻挡车辆，装车区可达。
- 陆海空生产线分别推进；集结点、队形、排队路径、撤退维修、近防火箭拦截、雷达防御增益。
- 尖端科技仅玩家可用与禁止AI太空武器独立设置；可在对局内更改，禁止后退还AI相关排队订单。轨道武器可攻击海陆空、轨道目标和基地。

太空重平台保留海陆空天及基地攻击；新截击舰只打空中/太空，速度145、伤害95/0.95秒；重平台速度62、伤害200/3.2秒（均为游戏数值）。AI太空开关控制全部七种武装太空单位；侦察星、测绘星及维修站仍可用。

新增27类按公开装备形态与原创职责设计，包含侦察、反装甲、维修、对空、对舰、岸轰与轨道攻城等；不是换名复制既有进口模型。生产界面可切四类并搜索名称/职责，尖端科技未开启时仍显示锁定卡片。AI按相同目标域战斗，维修跟随对应军种；舰队沿同一连通水域推进。

防御提示：悬停或选中显示攻击、拦截、维修、雷达联动等范围；V循环选中/己方防线/关闭。建造时显示投影范围与建成后电力；EMP/缺电用虚线及文字提示。雷达增程只影响攻击，近防拦截半径维持330。全部距离为游戏单位。

外观总览：[新增27角色](screenshots/expanded-review-sheet.png) / [建模监督](docs/reviews/expanded-model-supervision.md) / [参考来源](docs/reviews/expanded-model-references.md)。

旧版总览：[太空24槽位](screenshots/space-review-sheet.png) / [17建筑](screenshots/buildings-review-sheet.png)。[监督审查](docs/reviews/space-supervision.md) / [Sketchfab候选](docs/reviews/sketchfab-candidates.md)。

## 操作

| 动作 | 输入 |
|---|---|
| 选择、框选、追加 | 左键、拖动、Shift |
| 移动、指定攻击 | 右键地面、可见敌军 |
| 排队路径 | Shift+右键 |
| 生产集结点 | 选生产建筑后右键地面 |
| 全选作战单位 | Q，不包括采矿车 |
| 攻击移动、停止 | A后左键、S |
| 队形、撤退 | F、R |
| 平移、缩放、回基地 | 方向键/W/D/中键、滚轮、H |
| 编组、调用 | Ctrl+1–5、1–5 |
| 暂停、保存、读取 | 空格、F5、F9 |
| 全屏、隐藏界面 | F11、Tab |
| 攻击与支援范围 | V：选中/防线/关闭 |

独占据点7秒开始产出；积分模式增加胜利积分。电力不足减慢生产并停用高能防御。大型打击需要侦察和可见目标。当前没有友军伤害。

## 外观与真实资料

主战场使用实时三维模型；装备检视提供透视/正/侧/后/俯五视图。五国坦克、步战车、自行炮、火箭炮、防空车、战机、直升机和舰艇分别按实物照片重建。三名agent的差异审查见 [审查目录](docs/reviews/)。

大部分装备为原创程序网格；俄罗斯T-90M、美国伯克级与美韩AH-64已接入有CC-BY署名许可的离线美术资产。T-90M保留独立炮塔，AH-64保留主/尾旋翼动画。AH-64按Longbow家族参考外观展示，不认证某个AH-64E生产批次。具体作者、来源、改动和许可见 [第三方说明](THIRD_PARTY_NOTICES.md)。

**尚未完成所有型号“接近实物”的视觉终验。** 功能测试、部件数和三角面数不能代表真实性。照片仅支持可见外观；原创航天单元不冒称现实已部署装备。25个地面槽位通过一级轮廓初审，详细剩余项见 [验收顺序](docs/reviews/ACCEPTANCE_POLICY.md) 和 [49个实物槽位清单](docs/reviews/KNOWN_EQUIPMENT.md)。

2026-10-16 用户新增授权太空4型与全部17类建筑细化：6阵营24个太空槽位，区分无武装侦察、空天截击、全域重型打击和地面反轨；帝国太空舰采用厚装甲、高塔和侧舷炮舱。建筑借鉴 C-RAM、Patriot、TPY-4、HESCO 和光电设备照片，游戏组合不冒称精确实物。六代机与其余未知车辆舰机继续保持旧版占位。证据与冻结范围见 [图片来源](docs/VISUAL_REFERENCES.md)。

公开资料与游戏数值分开；未知射程、防护和毁伤不填假精确值。概念能力为游戏强化，不是现实仿真。没有集成DLSS或光追，详见 [画质说明](docs/GRAPHICS.md)。

## 构建与验证

```powershell
npm test
# 首次构建独立版需要联网下载官方运行时：
powershell -File tools/fetch-desktop-runtime.ps1
powershell -File build-desktop.ps1
node server.cjs
# 第二终端；需要已有Playwright或设置PLAYWRIGHT_MODULE：
node tests/gallery.cjs
node tests/gallery-framing.cjs
node tests/expanded-browser.cjs
node tests/expanded-browser.cjs --desktop
node tests/range-fallback.cjs
node tests/space-browser.cjs --desktop
node tests/upgrade.cjs
node tests/performance3d.cjs --desktop
# 模型修改后更新核查视图与生产缩略图，再重建发布包：
node tools/capture-model-review.cjs tank_chn tank_usa
node tools/bake-portraits.cjs
node tools/export-model-inventory.cjs
powershell -File build-desktop.ps1
```

游戏运行不需要开发工具。报告见 [验证记录](docs/VALIDATION.md)，真实截图在 `screenshots/`。

新版实时外观源为 `src/models-tanks.js`、`models-vehicles.js`、`models-air.js`、`models-naval.js`、`models-space.js`、`models-buildings.js`、`models-roster.js`。`models/`内STEP为早期CAD研究资产，**不等同于当前实时模型**。运行无需Fusion/FreeCAD/Python。

## Git

本地分支 `codex/modern-front-hd`，未配置远端。自行在Git账户建空仓库后：

```powershell
cd 'D:\现代战线HD'
git remote add origin '你的远端仓库URL'
git push -u origin codex/modern-front-hd
```

运行时、研究照片、缓存、日志与存档不进入Git。原创代码/资产使用MIT；第三方许可见 [第三方说明](THIRD_PARTY_NOTICES.md)。
