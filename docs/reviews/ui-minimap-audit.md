# FPS 小地图与界面输入审计

日期：2026-10-18。范围：`src/app.js`、`src/player-mode.js`、`style.css`。独立审计 agent 负责界面；主 agent 负责小地图实际绘制和 GPU/独立版验证，输入 agent 负责驾驶按键。

## 已确认根因和修复

| 问题 | 证据 / 触发路径 | 本轮修改 |
|---|---|---|
| FPS 没有可见且持续刷新的小地图 | 原小地图在 `#hud` 的 RTS sidebar 内；`body.direct-view #hud` 隐藏整个 RTS HUD。三维绘制在 FPS 分支提前返回，未经过原 RTS 小地图更新。 | 在 `#direct-hud` 下新建独立只读 `#direct-minimap`，保持原 RTS DOM 不动。app 每帧完成战场绘制后调用 `vehicleMenu.drawMinimap(time)`；控制器每 0.1 s 复用 `renderer.drawMinimap(game, canvas)`，换人/换游戏立即更新。 |
| 换乘菜单关闭后仍可能保持隐藏输入框焦点 | 原 `show()` 强制聚焦搜索框；`hide()` 只改 hidden，不显式归还焦点。app RTS keydown 对 INPUT 提前返回，程序式输入/不同焦点时序可让快捷键被阻断。 | 记录菜单打开前的焦点，关闭时释放菜单内焦点并归还原控件；换人/退出时不强制锁鼠标。真实浏览器行为另交主线程验证。 |
| RTS 的 J 开菜单同时输入了搜索字符 j | 主线程真实 GPU 集成复现，失败截图 `.tmp/fps-upgrade-failure-browser.png` 显示搜索框为 j；原 J 分支同步 focus 搜索框却未阻止原键默认文本输入，导致人员列表被误筛空。 | J 分支先 `preventDefault()`、`stopPropagation()`，再打开菜单。CPU 回归执行 app 真实注册的 RTS keydown 处理器，断言焦点移动前已阻止默认输入；主线程 GPU 脚本另断言空 filter。 |
| 键盘选车时焦点被定时刷新移除 | 每 750 ms `render()` 整体重建 `vehicle-list.innerHTML`，当前聚焦的卡片节点随即消失。 | 保存焦点卡片的 unit ID，刷新后聚焦新节点且不滚动；单位死亡/消失则回到搜索框。 |
| RTS 持键可能跨入换乘菜单 | 原 J 菜单只清驾驶控制器的输入；打开前的 RTS `keys` 不统一清理，帧循环也未排除打开菜单。退出 FPS 的原 onExit 已清键，因此未将其误报为已复现的退出残键。 | `clearStrategyInput()` 统一清 keys/drag/middle；进入驾驶、换乘菜单显示/关闭均调用；帧循环在换乘菜单打开时不执行 RTS 键盘平移。 |
| 模态输入焦点和快捷键缺少统一边界 | app 原先先排除 INPUT 再判断 Escape；主模态没有 Tab 范围约束；原小地图事件仅检查 game，未检查模态或 FPS。 | 主模态的 Escape/Tab 在 window capture 阶段处理，关闭后归还焦点；换乘菜单的 Tab 同样限定在本窗口。原 RTS 小地图在 FPS、换乘窗口、主模态或结果状态不接受命令；暂停时禁止右键命令。 |
| 损坏的本地存档会先结束驾驶再失败 | 原 `load()` 先 `direct.exit()` 后 `Game.load(s)`；即使 JSON/结构无效，也已退出 FPS。 | 先完整解析验证到临时变量，再退出驾驶并替换 game。取消文件导入的空 files 列表直接返回。 |

主模态打开时释放鼠标锁并清两套输入；嵌套更新模态内容时保留打开前的暂停状态。帮助和切回窗口提示统一采用 **P 暂停**；人员空格跳跃，非人员仍兼容空格暂停。具体驾驶键行为由输入 agent 实现。

## 小地图合同和边界

- `renderer.drawMinimap(game, targetCanvas)` 是唯一绘制来源。UI 不独立查询敌军、不绕过迷雾、不维护第二套声呐判定。
- 玩家位置/方向箭头、迷雾、声呐接触和 FPS 抑制 RTS 视口框由主线程的 renderer 修改承担。
- canvas 内部分辨率 240 × 165，与当前 6144 × 4224 地图比例一致；小窗口 CSS 缩至 190 px，短窗口缩至 160 px。保持可见，不占用地图点击指挥功能。
- FPS 小地图 `pointer-events:none`，没有 pointer/click/wheel 处理器；不搬移有 RTS 事件监听的原 canvas。
- 10 Hz 仅限制小地图图层重绘，不限制游戏模拟或驾驶画面刷新；暂停仍可更新箭头/界面，退出后隐藏并重置刷新时刻。

## OpenRA 官方仓库研究

固定提交：[`e180e3225f3930272dd451917467631618f8976f`](https://github.com/OpenRA/OpenRA/tree/e180e3225f3930272dd451917467631618f8976f)，由 GitHub 官方仓库 API 的 bleed 提交解析后固定。本次仅吸收设计思路，未复制 C# 源码、美术或二进制。

1. [`OpenRA.Mods.Common/Widgets/RadarWidget.cs`](https://github.com/OpenRA/OpenRA/blob/e180e3225f3930272dd451917467631618f8976f/OpenRA.Mods.Common/Widgets/RadarWidget.cs)：将 terrain/shroud/actor 图层分开；迷雾根据当前观察玩家更新；`HandleMouseInput` 是与绘制分开的行为入口。本项目沿用既有 renderer 的同一迷雾/接触源，新增只读显示目标，不复用原 RTS 命令监听。
2. [`OpenRA.Game/Widgets/Widget.cs`](https://github.com/OpenRA/OpenRA/blob/e180e3225f3930272dd451917467631618f8976f/OpenRA.Game/Widgets/Widget.cs)：键盘优先交给 `KeyboardFocusWidget`，显示与事件范围有独立检查，控件释放时归还焦点。本项目以 DOM 的焦点归还和 window capture 模态处理实现相同原则，避免搜索/对话框按键落到世界操作。
3. [`COPYING`](https://github.com/OpenRA/OpenRA/blob/e180e3225f3930272dd451917467631618f8976f/COPYING)：GPL v3 许可文本。研究快照保存在被忽略的 `.tmp/references/openra-ui/`，不随本项目发布；此次没有引入需重新许可的 OpenRA 代码。

10 Hz、布局尺寸及本项目回调名称是本项目自主实现选择，并非 OpenRA 的原值或 API。

## 验证记录

已运行：

```text
node --check src/app.js
node --check src/player-mode.js
node --test tests/ui-audit.test.cjs
git diff --check -- src/app.js src/player-mode.js style.css tests/ui-audit.test.cjs
```

**7 项 CPU 测试通过**，执行真实 `WarPlayerMode` 控制器及 app 注册的 RTS keydown 处理器，用轻量 DOM fixture 替代浏览器/GPU，覆盖：10 Hz 和模式切换、独立 canvas、打开清输入/解锁、关闭归还焦点、换人不重锁、动态卡片焦点、Tab 循环和 J 不写入搜索框。

这些测试不证明像素输出、真实浏览器焦点时序、独立包或长期性能已通过。已交主线程串行执行 `tests/fps-upgrade-browser.cjs` 及原生验证，并提醒补查 RTS J→Esc→P、750 ms 卡片焦点、损坏存档保持 FPS、主模态输入框 Escape。最终 GPU 和发布结果以主线程报告为准。没有声称全游戏不存在剩余 bug。

## 新功能独立 UI 监督复核（第一轮）

2026-10-18 再复核。独立读取主线程产出的报告、相关测试断言并亲看截图；未重新启动 GPU，也未修改本节之外的代码。结论：**本轮 FPS 小地图、跳跃界面及相关输入/菜单修复可通过；未发现阻断本轮交付的 UI 问题。**

功能证据：

- `docs/fps-upgrade-browser-report.json` 与 `docs/fps-upgrade-desktop-report.json` 均为 `passed:true`、9 组通过、`errors:[]`。记录时间分别为 UTC 2026-10-17 18:20:57 与 18:21:31，对应北京时间 2026-10-18。已核测试实际使用 `release/ModernFrontHD/ModernFrontHD.exe` 启动独立版。
- 两环境的小地图像素记录一致：未发现敌军为背景 `[17,25,28]`，侦察后敌军为 `[241,163,138]`，驾驶单位标记为 `[255,227,154]`；声呐接触显示敌军色，探测器遭 EMP 后恢复为背景 `[28,46,51]`。因此“常驻”没有以暴露全部敌军为代价。
- 跳跃记录的地面相机高为 9.5 u，腾空时实体高 3.9 u、相机高 13.4 u；二者差仍为 9.5 u，没有二次加高。落地恢复到 0 / 9.5 u；P 暂停期间快照保持一致。该动态结论来自测试记录，不仅来自单张截图。
- 报告同时覆盖坏存档保持 FPS、菜单刷新保留卡片焦点、Tab 限定范围、关闭搜索恢复 RTS 暂停键、帮助 Escape 恢复此前暂停状态，以及 J 换乘清除旧驾驶输入。飞行方向断言使用 `trusted:true` 且 `locked:true` 的鼠标事件。
- `docs/simulation-tests.txt` 末尾独立核实为 **194 tests / 194 pass / 0 fail**，含本报告 7 项 UI CPU 回归。原有 76 单元驾驶、地图、建造等更广回归在本次复核时仍由主线程继续运行，不借此预先声明通过。

视觉证据：

| 亲自查看的截图 | 观察与判断 |
|---|---|
| `screenshots/fps-minimap-desktop.png`，原图 3440 × 1440 | 小地图在左侧独立面板内，玩家金色方向箭头与普通点可分辨；边框、北向、只读说明可见。未压住中央准星、右下武器状态或左下生命信息，FPS 下未出现 RTS 指挥 sidebar。 |
| `screenshots/fps-jump-desktop.png`，原图 3440 × 1440 | 腾空画面保留相同准星、武器、生命条与小地图布局；地图显示局部已探区域及大片迷雾。没有界面跳位、额外 RTS 视口框或浮层遮住瞄准区。步枪和环境的写实程度不属于这次 UI 通过结论。 |
| `screenshots/fps-minimap-narrow.png`，700 × 900 | 潜艇场景中小地图完整处于左侧，右侧深度/姿态信息与其分离，中央观察区及准星保留；图例自然换行，无水平溢出。报告 canvas 边界为 x=27、y=256、right=199、bottom=374.25，均在视口内。底部既有舱内仪表与 HUD 层次较密，但生命、EMP 状态及武器状态仍可识别，不构成本轮阻断。 |

验证边界：截图没有覆盖所有 DPI、极短窗口高度、长期战斗或每一种舱内界面。通过范围是本轮明确功能及已测试的 3440 × 1440 独立版与 700 × 900 窄屏布局；不等于全游戏无 bug，也不等于最终画质验收。

## 旧驾驶回归发现的阻断及第二次修复

第一轮新功能测试通过后，主线程继续执行旧驾驶回归，实际 EXE 的 `docs/first-person-desktop-report.json` 记录了阻断异常：

```text
InvalidStateError: Failed to execute 'setPointerCapture' on 'Element'
at HTMLCanvasElement.<anonymous> (.../resources/app/src/app.js:601:12)
```

该次旧驾驶回归虽然执行了 10 组功能检查，但 `errors` 非空、报告 `passed:false`，未被当作通过。第一轮小范围通过结论不能覆盖此后发现的路径。

根因：驾驶控制器暂停时不接收开火 pointerdown；事件继续到达原 RTS 画布监听。原监听仅检查 game/modal，没有检查 FPS 或仍在生效的 pointer lock，因此尝试在鼠标锁定期间执行 RTS 框选捕获。其他 RTS move/up/dblclick/wheel 也缺同样状态边界，可能发生选择、平移或缩放漏触。

修复：

- `strategyPointerAvailable()` 统一检查有效游戏、未结束、非 FPS、非换乘菜单、主模态关闭、`document.pointerLockElement` 为空。最后一项也覆盖退出 FPS 后浏览器尚未异步解锁的短暂窗口。
- RTS canvas 的 pointerdown/move/up/dblclick/wheel 和原 RTS 小地图共用该边界。阻断的 pointer 事件取消已有 drag/middle，不启动新指挥动作。
- 不将 `paused` 加到总 gate：**纯 RTS 暂停仍可选择、框选、查看地图**；暂停中的下令/建设沿用已有专用限制。
- 两处 pointer capture 都成功后才保存拖动状态。只有已失效 pointer ID 的 `NotFoundError` 被识别为取消手势；其他异常仍抛出，未用笼统 catch 隐藏真正错误。
- pointercancel 和 lostpointercapture 无论当前模式都清理 drag/middle，防止失捕后继续平移。

新增回归执行 app 实际注册的画布监听，避免重写一套模拟业务逻辑：暂停 FPS 所有鼠标事件不调用 capture/pan/zoom/command、不改选择；换乘/模态/待解锁同样拒绝；纯 RTS 暂停框选、中键平移与滚轮正常；失效 capture 安全取消、非预期异常仍暴露、cancel/lostcapture 始终清理。首次运行新增测试有 3 项失败（其中暂停 FPS 实际记录 capture=2、pan=1、zoom=1），修复后 **UI CPU 共 11 项全部通过**，语法检查通过。

主线程已在真实跳跃暂停阶段追加鼠标按下/释放回归，检查保持暂停、相机不变及错误列表为空。该次补丁的 GPU/EXE 重验由主线程重建后串行执行；本节落盘时尚未宣称已通过。此后最终结果以重新生成的报告为准。

最终主线程回传：补丁后新增浏览器/EXE各9组，以及实际EXE全部76类驾驶、窗口失焦、离线导入、生产建造、飞行水下、高空、群岛和命令反馈回归全部通过，错误为0；CPU最终198/198。监督未重跑GPU，最终证据见更新后的报告与docs/VALIDATION.md。
