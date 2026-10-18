# 独立行动员、军械库与弹药 HUD

日期：2026-10-18。实现范围：`src/operator-ui.js`、`src/models-operator.js`、`style.css` 末尾新增样式及对应 CPU 测试。模拟、驾驶输入、加载顺序与实际桌面包由主 agent 集成验证。

## 交付行为

- 存活且由玩家直接控制的己方 `operator` 可以按 B 或点击 HUD 的“军械库”按钮打开。界面包含原创角色识别图、护甲与手套说明、耐久、主副两槽和当前手持标识。
- 64 款武器按 8 类、名称/描述和目标域筛选。卡片与详情显示伤害、游戏射程 u、射速、弹匣、装填秒数、开火模式及全部可攻击域。车辆/基地合为陆地，水面/水下合为海军；全部武器包含人员目标，对空/轨道明确为原创科幻参数。
- 点击武器、选择槽位、点击装备才调用模拟层；“随机配装”仅从当前筛选结果选择，成功后显示实际武器。空结果禁用随机，不调用装备 API。
- 角色弹匣、备弹、装填时间和进度直接读取模拟状态；界面不设置弹药。基地补给按钮依照 `canResupply` 启用，调用补给 API 并反馈结果。
- 打开清除驾驶与 RTS 残留输入并释放指针锁，世界/AI 继续运行。窗口捕获阶段隔离菜单快捷键；文本输入保留浏览器默认行为，B 不会落入搜索框，Esc 优先关闭，Tab 在可用控件间循环。关闭清输入、恢复焦点并按状态重新锁定鼠标。死亡、换乘、换游戏对象或主模态出现时无重锁关闭。
- HUD 使用真实弹药数与 R 装填提示。军械库桌面双栏，窄屏改为垂直布局，保留可滚动武器列表。游戏状态下 HUD 不增加覆盖小地图的面板。

## 集成合同

1. 加载 `operator-weapons.js` 后加载 `operator-ui.js`。构造 `direct.operatorUI = new WarOperatorUI(direct)`，在每帧调用 `.update()`；退出驾驶/换乘先 `.hide(false)`。
2. `direct` 提供 `active`、`entityId`、`hud`、`el()`、`clearInput()`、`lock()` 与 `cb.game/clearStrategyInput/canEnter/unitName`。`vehicleMenu.hide(false)` 可选。
3. `game.operatorStatus(id)` 提供 `{slots:[{weaponId,ammo,reserve}],activeSlot,reloadRemaining,reloadTotal,canResupply,resupplyReason?}`；`operatorEquip(id,slot,weaponId)`、`operatorResupply(id)` 返回布尔。装备/补给权限与资金均由模拟层再次验证。
4. Root 驾驶输入必须在 `operatorUI.open` 时阻止鼠标瞄准、开火、移动、滚轮换武器和命令提交；1/2、滚轮、R 的游戏逻辑由 root 接入。菜单仅在冒泡阶段拦指针事件，保留控件原生点击/焦点；捕获阶段仍必须识别菜单状态。
5. 关键 DOM：`#operator-armory`、`#operator-search`、`#operator-target`、`#operator-weapons`、`[data-operator-slot="0/1"]`、`[data-operator-weapon="id"]`、`#operator-equip`、`#operator-random`、`#operator-resupply`、`#direct-armory`、`#operator-ammo`。

## 原创单人模型

`src/models-operator.js` 在 `models3d.js` 和 `model-detail.js` 之后加载即可；建议置于 `models-roster.js` 后，与 gallery/主游戏保持同一模型源。文件注册 `operator` × chn/usa/rus/ind/kor/imp，不依赖模拟单元数据，不覆盖既有 infantry。

模型为一名人物：头盔壳与导轨、护目镜、耳机/麦克风、下颌固定带、护甲、三联弹匣包、背包/电台天线、护肩、手套指节、膝护与绑带、战靴、原创步枪及光学镜。六阵营使用阵营护甲色、布料与标识色、背包/天线尺寸；帝国增加原创肩部护甲，未使用影视或商业游戏人物资产。

CPU 实测：普通五阵营各 8,128 三角形，帝国 8,452；每款 2 个网格批次；原始高约 1.7501，模型标度 5.6，与 standing roster 人物同尺度；世界显示高约 9.80 游戏单位。`muzzle` 朝 +X，位于枪口外侧。几何缓存共享、克隆变换独立；玻璃、金属、橡胶与布料保留既有 PBR 分类。

第三人称模型步枪为默认原创外观；第一人称多款武器的几何、切换与瞄准由 `operator-weapons` / 玩家视图模块负责。本模型不宣称真实军人装具还原，也不以部件数或面数代替视觉验收。

## 验证与边界

- `node --check src/operator-ui.js` / `node --check src/models-operator.js`：语法检查。
- `node --test tests/operator-ui.test.cjs`：9 项，覆盖 B 打开权限、输入清理与解锁、搜索快捷键隔离、Esc/Tab 焦点、筛选与空状态、实际点击回调、装备失败、随机候选集、模拟弹药/装填显示、补给和死亡/换乘/外部模态。
- `node --test tests/operator-model.test.cjs`：7 项，覆盖六阵营有限数值几何、单人尺度、批次/三角形预算、PBR 分类、前向枪口无自身遮挡，以及缓存克隆隔离。
- 本 agent 不启动 GPU 或浏览器；CPU DOM fixture 不代替实际浏览器事件顺序、窄屏视觉、鼠标锁、触控和 EXE 验收。主 agent 需在集成后检查这些项目。

## 实际截图后的布局修复

主 agent 的 `screenshots/operator-armory-browser.png` 显示卡片实际约 40px 高，名称/属性/目标域跨卡重叠。已亲看截图并核对级联：`.operator-shell button` 的 `min-height:40px` 优先级高于 `.operator-weapon-card` 的 `min-height:104px`；受限滚动网格的隐式行因此压缩到 40px，按钮内容超出边框。这是 CPU 假 DOM 无法检测的布局错误，前述 CPU 通过不能证明视觉合格。

修复：为武器网格指定 `grid-auto-rows:minmax(132px,max-content)`，使用更高优先级卡片规则提供至少 132px 高度与从顶部排列的 flex 列，子内容禁止收缩。内容换行并在列表区域滚动，不以裁剪隐藏错误。左侧身份图改用本项目实际 `operator_<阵营>.png` 模型缩略图，随玩家阵营更新。修复后语法与 9 项 UI CPU 用例通过；GPU 由主 agent 串行复验。

真实浏览器回归建议（1600×1000、700×900）：检查所有 64 张卡 `getBoundingClientRect().height >= 132`；每个直接 `span/strong/small` 子项边界都在所属卡内，容差 1px；卡片 `scrollHeight <= clientHeight + 2`；同列下一张卡 top 至少大于上一张 bottom 7px；滚动后再次验证可见首尾卡，并等待角色缩略图 `complete && naturalWidth > 0`。这些断言应进入主 agent 的实际浏览器/桌面脚本，不能以正则检查 CSS 文本代替。
