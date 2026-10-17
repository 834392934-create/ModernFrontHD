# 8 种战术增援：独立模型与机制监督

日期：2026-10-17。监督者：expanded_model_supervisor。仅修改本报告；没有修改源码、启动 GPU 或重复运行主线程测试。

## 当前结论

8 种角色具有可辨识的职责差异，达到本轮原创游戏模型的结构和现有细化标准。轨道导弹驳船发射口遮挡已返工，经新正视、俯视、透视图复检关闭。本轮 64 类第一人称接管、原生范围/动画/短时交火均有当前报告支持，无武装提示已实图复检关闭。本结论不是现实型号精确还原或写实终验，也不是长期稳定性能保证。

## 实际看图记录

目录：`screenshots/model-review/`。已逐张查看 8 型 `chn-perspective.png`，并查看下列辅助视图，共 25 张，不以生成截图或几何检查等同于亲看：

| 角色 | 辅助视图 | 所见及职责判断 |
|---|---|---|
| sniper_team | side、top | 俯卧射手长枪/两脚架、跪姿观察员与三脚镜形成两人组。侧面确认肘部、靴部与地面接近，俯视确认两人相隔，关闭仅凭透视产生的悬空疑虑。提供长程反步兵职责。 |
| mobile_ciws | top、side | 六轮低车体、独立炮塔、后置雷达和支撑。炮、转台、传感器有可见连接，具备机动近防识别。 |
| fleet_command_ship | side、top | 双体宽桥、双通信罩、单桁架；甲板跨梁连接两船体，无炮管，体现舰队指挥支援。双体是原创设计。 |
| electronic_warfare_ship | top、side | 单船体、前桥、两组桁架与四块侧向平面阵列；阵列有承载座，无武器外观。与指挥舰剪影不同。 |
| air_repair_drone | side、top | 四护圈旋翼、滑橇、工具舱及连续关节夹爪；维修臂末端是夹具，没有枪口，区别于攻击无人机。 |
| interceptor_drone | rear、side | 宽翼根、短翼尖垂面、背部进气、尾部暗腔与腹部短炮；翼身有厚度，尾喷不是平面发光片。 |
| orbital_shield | side、front | 四个空心环、接在环实体边缘的支臂、中央电源舱、侧面散热板和发动机。属于原创科幻护盾，不能声称现实存在。 |
| orbital_missile_barge | front、top、side | 双排双层箱体和侧翼区分于轨道狙击炮/护航舰；但前端斜撑横过圆形口，串列后段圆口又朝向前段仓体。须返工后复检。 |

所有型的材质分区至少能区分涂层、深色金属、玻璃/传感窗和太阳翼或隔热面；船体仍相当简化，人物手部、服装褶皱和连接紧固件也未达到近景写实质量。不能以部件数、面数或合批数量作为真实外观验收证据。

## 本轮返工闭环

**V1，已复检关闭：轨道导弹驳船发射面遮挡。** 初版 `orbital_missile_barge_chn-front.png` 中两根斜撑横跨圆口；`side.png` 和源码的三段串列结构共同确认后两段圆口朝向前段仓体。返工后独立亲看覆盖后的 front、top、perspective 三张：前支撑改到外侧，圆口前方无遮挡；只有最前段保留圆口，后两段变成侧面检修盖/把手；仍保留仓架与主体的连接。作者报告枪口前移到发射面外，六阵营每型 72 条前向样本射线均无阻挡；这项射线检查由作者执行。此项只涉及游戏造型和效果一致性，不涉及真实武器内部设计。

## 机制只读核查与早期三项风险

已阅读 `src/roster.js`、`src/sim.js` 和 `tests/tactical-wave.test.cjs`；下述结论是源码与用例审查，测试执行由主线程负责。

1. **护盾统一范围和资格：已按意见修正。** `maxShieldRange` 从 U/B 定义求值；伤害查询统一使用定义、`operational`、友军资格、目标域和范围，再取最强减伤。移动护盾只覆盖友方 space 且包含自身；不叠加，EMP/死亡停用。用例覆盖普通飞机、地面、敌军、边界外与基地护盾竞争。范围提示使用相同域限制。
2. **支援 AI 与接管：已按意见修正。** 支援判定加入 shield，普通进攻/占点排除 shield；护盾跟随友方太空作战单位。用例检查舰队指挥跟随、空中维修只修飞机及接管时被动功能保持。避免无武装支援舰被当作普通攻击单位冲向基地。
3. **太空禁令按武装能力：已按意见修正。** `spaceWeapon` 与仅属于 space 分开：无武装护盾允许 AI 建造，武装导弹驳船受禁令；用例涉及训练、可用列表和存档。不能把全部 space 一刀切禁用，也不能让新武装绕过禁令。

已读取 `docs/simulation-tests.txt`：85 tests、85 pass、0 fail；本监督未独立执行。新增用例还覆盖舰队友方 0.8 冷却系数与敌方 1.25 干扰的组合、移动近防接管时拦截火箭但不拦截鱼雷、驳船只攻击 space。近防基于二维投影的火箭拦截允许地面近防拦截轨道导弹，这是游戏抽象，不是现实拦截包线。

## 本轮浏览器证据复核

已读取 2026-10-17 的 `docs/first-person-browser-report.json` 和 `docs/expanded-browser-report.json`。前者 `passed:true`，记录 64 类通过真实 E 键进入/退出、相机有限与自身模型隐藏；仍有实际射击、固定弹着区移走目标不扣血及三种枪口遮挡零伤的记录。后者 `errors:[]`，记录 8 个新生产卡片真实入队、护盾 210 范围与 space 限制/EMP 提示，以及四旋翼角度从 `[54,-54,54,-54]` 变为 `[81,-81,81,-81]`。运行报告的操作者是主线程，不是本监督。

亲看 `fps-sniper-browser.png`、`fps-shield-browser.png`、`fps-air-repair-browser.png`：狙击前景长枪与偏置镜清楚，角色名/生命值能读；护盾标明架空、自动运行、25% 仅友方太空含自身与 EMP 停机；维修机标明概念、无武装、仅修友方飞机，均使用同一战场视图。前景仍是简化共用仪表/原创建模，不是各真实装备的驾驶舱。当时发现无武装角色仍显示通用“左键开火”操作行；该文案问题现已在原生截图和检查报告中关闭，见下节。

浏览器混编短采样报告为 97 实体、4.0195 秒、46.3 FPS、P95 22.2 ms，1600×1000/DPR 1、RTX 3060，170 calls/1,298,226 三角面；这是预热后渲染样本且 combat 为 null，不是持续战斗或原生 EXE 性能结论。

## 最终原生证据闭环

已读取主线程串行执行后生成的当前报告；本监督仅阅读和看图，没有重跑 GPU：

- `docs/first-person-desktop-report.json`：Packaged Electron，`possession` 实际计数 64，`passed:true`；真实切换记录覆盖全部类别。`nativeFocus` 记录关闭焦点仿真后最小化窗口，发生 `trusted:true` blur、`documentFocused:false`、指针锁释放、keys 为 0、fire 为 false，恢复后输入仍为零、位置保持 `[700,800]`，全屏为 true。底层窗口 focused 字段在最小化时仍为 true，不能单凭该字段判断焦点；结论依赖可信 blur、文档焦点与输入清理的共同记录。
- `docs/expanded-desktop-report.json`：8 类真实生产卡片入队、护盾 210 范围/space 域/EMP 提示、四旋翼正反向动画和高度记录通过，`errors:[]`。真实 5.006 秒交火中实体 80→63、164 次发射、峰值 51 个效果；平均 **46.34 FPS**、P95 **22.4 ms**，同时显示 4 个范围。环境为 RTX 3060、CSS 2752×1152、DPR 1.25（物理 3440×1440）。另一个 4 秒混编渲染样本是 98 实体、46.5 FPS、175 calls/1,299,400 三角面，不能与交火样本混为同一测试。
- `docs/desktop-report.json`：主线程离线包检查记录 `fullscreenToggle:true`、`packageSourceMatch:true`、海陆空导入状态 ready、`errors:[]`；列出的既有 T-90M/AH-64/Burke 授权资产与新增原创角色分开，不将它们算作 8 种新增模型的真实性证据。
- `docs/tactical-controls-report.json`：8 类原生文字检查中 4 个武装类别保留开火/瞄准；4 个无武装类别使用“支援自动运行 · 右键观察”。报告 `errors:[]`。本监督另以 `Get-FileHash` 核对 `src/direct-control.js` SHA256 与报告 `4488b91a72f2d0ad82642afff37745fb70692fb03e5dd5ec9dd94885e09bf3f5` 一致。

已实际查看刷新后的 `screenshots/fps-shield-desktop.png` 与 `screenshots/fps-air-repair-desktop.png`：两图为原生宽屏暂停场景，中央下方已显示“支援自动运行 · 右键观察”，右侧分别为护盾/维修自动运行，角色名称、生命条与概念/架空标记保留，通用“左键开火”遗留关闭。这两张文字复检图不是实战质量或持续性能证据；远处大面积未揭示区域较暗，也不能据其判定全部地形细节已优化。

## 参考证据与授权边界

参照作者的 `tactical-ground-naval-references.md` 与 `tactical-air-space-references.md`，区分作者亲看照片、页面文字和搜索索引，不将它们混写为本监督重新检索或亲看原照：

- [美国陆军狙击组文章](https://www.army.mil/article/22122/day_of_the_sniper_the_story_behind_the_million_dollar_shot)：射手/观察员分工。M151 官方产品页在作者记录中仅有索引，不作为已打开照片。
- [Rheinmetall Skyranger 公开资料](https://www.rheinmetall.com/en/media/news-watch/news/2025/12/2025-12-12-rheinmetall-to-supply-skyranger-30-for-the-dutch-armed-forces)：模块炮塔/传感器造型借鉴；六轮车不是 Skyranger/Boxer 精确模型。
- [NASA Astrobee 照片](https://www.nasa.gov/image-article/astronaut-megan-mcarthur-photographs-an-astrobee-robotic-free-flyer/)：作者实际看过模块工具舱和短臂；四旋翼空中维修飞机完全是游戏原创，不能归为 NASA 产品功能。
- [NASA X-48B](https://www.nasa.gov/aeronautics/x-48b/)：作者实际看过宽翼身、翼梢和上置动力；游戏截击机不是 X-48B 武装型号。
- [ESA 散热板试验](https://www.esa.int/ESA_Multimedia/Images/2016/07/Shaker_test_of_radiator_panel)：作者实际看过板厚/边框/连接，仅用于太空器板状结构。护盾和轨道武器均为原创科幻。

Blue Ridge 和 SEWIP 部分资料在作者记录中为索引可见但正文 403/未打开，不作为已验证照片。官方来源不自动等于任意再分发许可；本轮没有将这些照片作为贴图、模型或发布附件导入。六阵营配色/标记也不等于六个真实型号的独立认证。

## 闭环状态与剩余局限

- V1 正视、俯视、透视复检已关闭；浏览器 64 类接管和新旋翼运行已读报告，狙击/护盾/维修三种新前景已实际看图。
- 本轮原生 EXE 64 类接管、范围/动画、离线包检查和短时交火证据已读取，无武装文案已实图关闭；本监督没有启动 GPU 验证。
- 生产头像由主线程重烘与打包，监督未逐一看完全部头像；5 秒交火和 4 秒渲染只支持上述短场景数值，不能宣称稳定 60 FPS、长局可靠性或任意规模战场性能。
- 外观整体仍为中低细节程序化原创模型，船侧大平面、人物手指/服装褶皱、飞行器检修细节尚简化；不能宣称坦克世界/COD 级画面、真实型号精确复原或真实武器性能验证。
