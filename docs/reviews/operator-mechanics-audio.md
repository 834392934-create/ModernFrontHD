# 单兵动作、弹药与声音升级

记录：2026-10-24，基线 `6a4683c` / 3.12.0。作者：单兵武器审计 agent。以下是原创游戏机制，不是现实武器操作训练或性能认证。

## 已有 / 缺失 / 本次实现

| 类别 | 基线已有 | 本次实现 | 边界 |
| --- | --- | --- | --- |
| 目录 | 8 类 64 款原创武器；双槽、目标域、弹药 | 保留全部旧 ID，新增独立 grenade_01…08，合计 9 类 72 款 | 不是 72 个真实型号；跨海空天仍是科幻游戏能力 |
| 步枪/冲锋枪/手枪 | automatic 布尔、弹匣 | 自动/半自动，步枪另有三发点射；弹匣式保留余弹/空仓不同阶段 | 点射配置是原创设计，不能据 M4A1 资料声称 M4A1 有三发模式 |
| 机枪 | 静态弹链与单一换弹 | 开膛弹链结构、供弹盖/弹链盒动作、独立声音 | 开膛动作不套闭膛每发拉栓；时长是游戏调校 |
| 狙击/精确射手 | 单发触发、静态枪栓 | 手动栓动与半自动变体区别；只有栓动变体操作枪栓 | M107 是半自动，不能把所有狙击枪都做成手动栓动 |
| 霰弹 | 每发 8 弹丸、整仓一次转移 | 大多数管式变体逐发装填；泵动与半自动区别；高容变体保留原创弹匣结构 | 一次击发一个编号/后坐/声音，8 粒实际弹丸沿用伤害与目标域限制 |
| 榴弹与火箭 | 原 launcher 肩射发射筒 | grenade 为独立短管侧开单发；launcher 保留发射筒 | 榴弹不标为火箭；伤害、射速与装填秒数均原创 |
| 第一人称 | 全枪相同换弹曲线，关闭晃动也取消武器后坐 | 动态支撑手、套筒/护木/枪栓/供弹盖/侧开炮管；武器几何后坐独立于镜头晃动 | 不改变相机瞄准射线、不产生额外伤害 |
| 普通人员 | 行走 IK 与静态持枪 | 消费同一模拟 readiness，持枪/击发/准备/装填姿态；受击、跛行、倒地、真实救助动作 | 不自行推进弹药/救援；倒地与死亡必须由模拟状态决定 |
| 弹药增益 | 无限资源/快速生产，与弹药无关 | ammo 仅玩家无限备弹，弹仓仍耗尽；reload 仅玩家 0.25 倍装填时长 | 原 unlimited / rapid 不影响弹药；没有无穷数写入存档 |
| 声音 | 同一种 120ms 白噪声 | 原创分层合成；20 个音色配置、缓存、最多 16 同时声部、256 去重键 | 非真实装备录音，没有提取商用游戏或公开视频音轨 |

弹药模型继续使用“当前可发射数量”计数，没有额外模拟膛内 +1 发。弹匣/弹链/单发装填在最终阶段提交弹药；管式霰弹每完成一个插入阶段提交一发，中断仅保留已完成插入。暂停不推进模拟时钟；切枪取消未完成动作且不清共享冷却。倒地人员不能换装、开火、继续装填或补给。

## 官方资料与采用范围

| 来源 | 已核实的分类事实 | 使用范围 |
| --- | --- | --- |
| [美国陆军 M4A1](https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M4A1-Carbine/) | 官方页面索引明确半自动/全自动；本次正文直连 403，未宣称下载完整手册 | 参考步枪类别，三发点射为本游戏另行设定 |
| [FN M249 SAW](https://fnamerica.com/products/machine-guns/fn-m249-saw/) | 原厂页面明确开膛、弹链供弹及顶部供弹盖 | 机枪动作种类；不采用民用 M249S 的闭膛动作 |
| [Mossberg 500/590](https://resources.mossberg.com/journal/how-mossberg-500-590-pump-action-shotguns-work) | 原厂说明这些为泵动系列，并提供工程师参与的动画参考 | 仅核实泵动类别；没有声称已逐帧观看视频或复制动画 |
| [Benelli M4 官方手册](https://www.benelliusa.com/sites/default/files/content/media/manuals/2019-10/M4%20Tactical%20Shotgun%20Product%20Manual.pdf) | PDF 第 36 页：半自动、管式弹仓 | shotgun_07 的类别参考；高容弹匣变体是独立原创设定，不能冒称 Benelli M4 |
| [美国陆军 M107](https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M107-Semi-Automatic-Long-Range-Sniper-Rifle/) | 官方索引明确半自动狙击步枪 | sniper_07 的半自动类别参考；其余栓动变体不借此声称真实型号 |
| [Barrett MRAD 官方培训说明](https://barrett.net/training/) | 厂方说明 MRAD 属栓动系列 | 只作为栓动类别证据，游戏没有训练/拆解功能 |
| [美国陆军 M320/M320A1](https://www.peosoldier.army.mil/Equipment/Equipment-Portfolio/Project-Manager-Soldier-Lethality-Portfolio/M320-M320A1-Grenade-Launcher-Module/) | 低速榴弹、侧开装填结构 | 独立 grenade 原创短管的外部动作类别 |
| [H&K SL8 原厂手册](https://hk-usa.com/wp-content/uploads/SL8-Manual.pdf) | 官方索引明确末发后枪机后定 | 证明空仓动作不能一概等同有余弹换弹；不据此把所有枪都设置同样后定 |

没有从上述材料反推人的标准换弹秒数、后坐长度、声压、伤害或跨域杀伤能力。合成音由代码生成，只用于区分游戏中的类别和动作。

## Key files table

| File | Role | Status | Read next? | Reason / evidence |
| --- | --- | --- | --- | --- |
| `src/operator-weapons.js` | 目录 / 原创机制 / reloadPlan | primary | Yes | 当前 UI、模拟、第一人称和测试均直接使用 WarOperatorWeapons |
| `src/operator-sim.js` | 弹药交易 / 模式 / 动作快照 | primary | Yes | 挂接真实 Game.operator* 与 stepOperator / operatorAutoFire |
| `src/fps-viewmodel.js` | 第一人称独立前景关节与受击边缘反馈 | primary | Yes | direct-control 调用 view.update / setWeapon |
| `src/personnel-animation.js` | 普通单兵持枪、步态与伤情姿态 | primary | Yes | battle3d 对真实人员实例调用 update；正常步态缓存回归有数值基线 |
| `src/combat-audio.js` | 原创程序音效，资源与事件去重 | primary | Yes | 由主控接入真实 shot / readiness / components，不监听输入 |
| `src/operator-ui.js` | 72 款军械库、模式、分阶段装填与增益提示 | primary | Yes | 当前 B 军械库与人物 HUD |
| `src/direct-control.js`, `src/app.js`, `index.html` | 输入 / 音频 / 加载接线 | primary | Parent only | 本 agent 不编辑；父 agent 对接下面 API |
| `src/combat-readiness.js`, `src/combat-damage.js` | 普通部队弹药、准备和真实伤害 / 救援 | primary | Other owner | 单兵动作只消费快照；operator 使用自身弹药状态 |
| `tests/operator-mechanics.test.cjs` | 真实 Game 新机制回归 | primary | Yes | 空仓/战术、逐发、增益、模式、一次击发编号、存档、倒地限制 |
| `tests/operator-presentation.test.cjs`, `tests/personnel-combat-pose.test.cjs`, `tests/combat-audio.test.cjs` | 表现层 CPU 回归 | primary | Yes | 动作节点、资源预算、姿态状态、音频去重/释放 |

## 接入 API

- `game.operatorSetFireMode(id, mode)` / `operatorCycleFireMode(id)`：主控 X 调用；B 保留军械库。
- `game.operatorCancelTrigger(id)`：失焦、暂停、退出驾驶时清点射队列；不凭视觉判断消耗弹药。普通鼠标松开可完成已触发的三发点射。
- `game.operatorStatus(id).action`：`weaponId/category/mechanism/sequence/shotSequence/event/phase/progress/phaseProgress/reloadKind/fireMode/shotTime/time/events`。事件队列最多 16 条。
- `WarOperatorCombat.validate(entity)`：主控 Game.load 检验可选的 operatorState。旧存档无新状态时兼容，新增非法模式、弹药、装填步骤和时钟应拒绝。
- `view.update({weaponAction, injury:e.components, ...existingArgs})`。普通人员使用 `WarCombatReadiness.snapshot(...)`；原传参仍兼容。
- `WarPersonnelAnimation.update(model,e,simulationTime,weaponAction)`。无第四参时可读 `e.operatorState.action` 或 `e.combat.stations`。医护动作只消费实际成功救援产生的 `source.rescueAction`。
- `const audio=new WarCombatAudio({enabled:()=>sound,maxVoices:16})`；真实 shot 逐条 `playShot(shot,e,weapon)`，`playAction(action,e)`，`playHit(e,game.time)`。场景切换 `reset()`，销毁 `dispose()`。

## 验证边界

CPU 已验证真实弹药/伤害域、分阶段动作、缓存资源上限及正常步态兼容。72 个前景模型目前最高 4,633 三角、11 draw calls。受损衣物仅 3 个三角，不是重伤表现。动画不是动作捕捉；合成音不是实枪声。统一原生 EXE 的镜头、音量、枪口、救援/倒地与长期运行验收由主控完成，不能用这些 CPU 测试宣布画质或听感已经达到商业大作。
