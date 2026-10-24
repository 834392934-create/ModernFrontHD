# 战斗机制独立集成审查

审查日期：2026-10-24。基线：`6a4683c / 3.12.0`，本轮工作树。审查者：`vehicle_weapons_audit`。本报告记录可复现的游戏行为，不把游戏尺度的弹药量、伤害、准备时间、弹道、救援或零件失效阈值称为实际装备性能。

## 最终结论

本 agent 的 **73 / 73 专项回归通过**，其中真实 Game 集成 **20 / 20**；源浏览器人员 **10 / 10** 和 **3.13.0 原生 EXE 人员 10 / 10** 均完成实际截图检查。原生人员报告校验 **75 项文件哈希**一致、三个授权 GLB 导入完成、页面错误 **0**。主控另报告全套 **887 / 887 通过**；全量与后续发布检查由主控运行，本 agent 不把其结果冒称为独立重跑。

实际 Playwright 鼠标/键盘结果：右键瞄准弹药 **30→30**，左键开火 **30→28**，X 模式 **auto→semi** 且不额外扣弹，R 显示保留余弹的战术装填；医疗、倒地、死亡与 FPS 降低镜头的真实模拟状态和截图对应。接受这一轮的基本机制与原创视觉反馈。人物、武器和损伤仍有简化，未达到照片级或商业 AAA 画面，也不能凭短场景证明全部地形、所有动作和长期性能。

## Findings

本轮发现并完成回归的 4 项接线缺陷：

| 缺陷 | 原复现与后果 | 修复归属 | 验证 |
|---|---|---|---|
| 倒地人员仍能 F 登车，或被自动挑为驾驶员 | 当前行动员被 `Game.damage` 打倒后，`vehicleInteract` 返回成功并将倒地实体藏入 IFV；可以驾驶且伤情不再推进 | 本审查 agent：`vehicle-interaction.js` 在交互、候选选择、自动驾驶员选择、嵌套存档上检查实际行动能力 | 真实倒地实体不得入车；原实体仍在战场；已有失能司机不得操纵车辆；保存的失能司机拒绝读取 |
| 手持榴弹实际按直线动能弹飞行 | `operator-sim` 只在发射之后补 `weaponFamily`，轨迹创建时已误选普通步枪类别 | 本审查 agent：发射前显式传入类别；手持榴弹为 `grenade`，原未声明导引的火箭筒为 `rocket` | 真正按键发射得到 `projectile.kind='arc'`；一发扣一弹；上升位置及发射原点经过存档保持 |
| 火箭炮的弹药存档无法读回 | `Readiness.validate` 的最小上下文缺少 `options`，调用齐射配置时抛 `TypeError` | readiness agent：验证提供无副作用的默认配置；主控补完整验证上下文 | 实际射出若干弹、停火、保存再加载，剩余弹药及冷却保持，不恢复未发出的队列 |
| 运输乘客嵌套状态验证不完整 | 存档中可藏倒地乘客冻结失血计时，或保留非法行动员模式 | transport agent：拒绝失能乘客，调用完整行动员状态验证；本审查 agent 对独立驾驶员同步完整验证 | 乘客和驾驶员中的倒地状态、非法射击模式均拒绝读取，普通合法身份存档正常 |

初轮其余要求未发现新的根本接线遗漏。随后全量日志复核发现下面三项新增问题，已向主控提供实际证据；后两轮定向回归的状态如下。

| 后续问题 | 实际证据 | 状态 |
|---|---|---|
| 原创轨道炮不能对地俯射 | 轨道高度 4000、水平距离 200 的地面目标，瞄准 3 秒后仍 `elevation`；普通炮塔最低俯角 -0.2，目标实际俯角约 -1.52。输入俯角另被限制在 -1.15 | 主控与 readiness agent 修复；4000/12000 高度实际地面几何瞄准、五档倍率真实命中通过 |
| 武装载具看不兼容目标被误称无武装 | ASAT 看地面目标或坦克看飞机，自动武器选择为空导致 HUD 报“无攻击武器”，本应是目标域不支持 | 主控修复；无武装、目标域、己方、缺弹、遮挡仍独立显示，原安全断言通过 |
| 近距离当步命中的枪声/炮口闪光可能丢失 | 真实手枪弹药 15→14、目标生命 10000→9968、`shotSequence=1`，但弹体在同一步命中后不再属于 `effects`；现有枪声和炮口闪光只扫描活 `shot` | 主控保留有界无伤害 `discharge` 记录，本 agent 的音频模块支持并按发射 ID 去重；6 项音频回归通过。画面及全局音频消费者最终验收由主控继续完成 |

以上结论仅限已列出的确定性场景，不是全量对局或视觉验收证明。

## 真实 Game 回归矩阵

`tests/combat-realism-integration.test.cjs` 使用生产 `WarSim.Game`、`Game.step(.05)`、实际伤害、移动、开火、补给和保存入口。未替换 `Game.ai`、`damage`、`emitShot`、导航或补给方法。场景通常延后战略 AI 时钟以隔离被测行为；空弹返补场景显式开启真实敌方战略 AI。渲染投影测试仅使用 CPU Canvas/投影记录器，不创建 GPU 上下文，也不将记录器作为视觉验收。

| # | 验证对象 | 成功判据 |
|---|---|---|
| 1 | 坦克炮、同轴机枪与另一个主炮弹种 | 实弹才扣所在弹仓一发；储备在装填时转移；主炮弹种不能绕过共用炮膛；同轴不重复扣主炮弹 |
| 2 | 火炮准备与撤收 | 准备前不能射击；完成准备后可射；实际撤收期间位置固定，完成后才继续行驶 |
| 3 | 射界及炮口通路 | 转炮未到位、舰炮后向禁区、显式炮口遮挡、真实建筑遮挡均拒射且不扣弹 |
| 4 | RTS/FPS 共用轨迹 | 两条投影路径接收同一炮弹世界位置；绘制前后弹体 JSON 完全相同 |
| 5 | 实体拦截 | 初次发射拦截弹不立即删除来袭导弹；飞行交会后才清除伤害；无关普通炮弹正常命中 |
| 6 | 最后一名敌方伤员 | 倒地人员不移动、不射击、仍阻止胜利；失血到期由中央死亡结算一次并产生残骸 |
| 7 | 实际医疗循环 | 医生持续救援推进进度并提供实际救援动作字段；恢复生命后能重新合法移动 |
| 8 | 飞机致命损伤 | 保留活实体连续降低高度和前进；落地后中央死亡一次，生成一个残骸 |
| 9 | IFV 载员存档 | 6 个原始人员 ID、生命与弹药保持；下车出现于不同合法落点；重复 ID 存档拒绝 |
| 10 | IFV 摧毁 | 每个真实乘客只处理一次；生还者不复制、死亡者不复活、重复伤害不重复计数 |
| 11 | AI 空弹返补 | 开启真实战略 AI，空弹载具向真实补给源行驶并实际恢复弹药 |
| 12 | 维修熄火 | 维修车通过主循环修复受损发动机，灭火并恢复工作状态 |
| 13 | 航空空弹恢复 | 旋翼机实际请求返场并经过机场服务恢复弹药 |
| 14 | 倒地驾驶绕过 | F 和自动司机选择都不能把倒地人员转成可操作司机 |
| 15 | 手持榴弹 | 原创榴弹为实抛物线、弹药守恒、保存后沿原轨迹前进 |
| 16 | 多管火箭齐射 | 每颗真实弹体扣一发；松开扳机取消剩余发射；保存后有限弹量/冷却保持 |
| 17 | 嵌套人员验证 | 隐藏伤员或非法射击模式不能通过乘客/司机存档进入游戏 |
| 18 | 炮塔、履带与通路 | 炮塔损坏禁止实际开火；履带失效不能前进；倒地伤员不成为队列交通障碍 |
| 19 | 发射时拒绝的观察目标 | 真实清空可见性后发射，再用真实迷雾更新揭示；该发射仍不得命中原拒绝目标，但无候选的自由发射可以扫掠命中合法敌人；冻结 ID 完整接线后定向通过 |
| 20 | 当步命中发射记录 | 近距手枪真实扣一弹并命中；只留下无弹体的短 `discharge`，不画轨迹、不重复伤害，随后过期；定向通过 |

执行命令：

```text
node --test tests/combat-realism-integration.test.cjs tests/operator-mechanics.test.cjs tests/vehicle-interaction.test.cjs
```

初轮历史复验结果：**40 / 40 通过**，包括当时 18 项新增集成、9 项单兵机制、13 项上下车回归。该时点尚未启动 GPU；后续完整 20 项集成、73 项专项和实际截图验收见下方最终章节。全套测试及发布操作由主控统一完成。

相关旧测试的调整没有降低行为要求：武器数量随已授权目录从 64 到 72；重复嵌套 ID 被更早的载员验证拦截时接受对应错误标签；输入测试上下文补充实际 Readiness 模块；旧单兵测试使用真正的 `Game.damage` 形成完整伤员状态，替换仅含字符串的非完整测试状态。

后续 VM 夹具维护涉及 `input-stability`、`flight-steering`、`vehicle-camera`、`interaction-audit`、`orbit-scope`、`unified-aim`、`unified-aim-audit` 七个测试文件：加载实际新增 Readiness/Damage/Transport/Audio 依赖；不修改被测控制器。`unified-aim` 的发射计数改为真实 `operator.shotSequence` 或各武器站 `shotSerial` 合计，避免遗漏同一步内已命中的弹体。原输入、弹药和目标受伤断言保留；“缺弹，需补给”采用当前 HUD 语义。

光学连续射击现在由真实 `Game.step(.05)` 等待准备、转炮和武器站冷却，不写冷却变量跳过机制；轨道 HUD 的装填检查以实际 `emitShot` 建立冷却。树目标测试保留直接命中和真实齐射面积作用，去除邻近人员恰好放在树干前拦截弹体的夹具冲突；存档前后必须得到相同树木生命，额外推进后不允许重复伤害。

后续定向命令：

```text
node --test tests/input-stability.test.cjs tests/flight-steering.test.cjs tests/vehicle-camera.test.cjs tests/interaction-audit.test.cjs tests/orbit-scope.test.cjs tests/unified-aim.test.cjs tests/unified-aim-audit.test.cjs tests/operator-ui.test.cjs tests/combat-realism-integration.test.cjs tests/combat-audio.test.cjs
```

结果 **129 / 129 通过**。音频新增两项回归验证活弹与无伤害发射快照共享 ID 只播放一次，以及长飞行弹体的旧发射时间不能清空去重记录重播旧枪声；显式换场景 `reset()` 仍可重新使用 ID。这些结果不等同于全局音频接线或实际画面验收。

## Key files

| 路径 | 符号 / 入口 | 本轮证据 |
|---|---|---|
| `src/sim.js` | `emitShot`, `combatSupplyStep`, `weaponPathBlocked`, `step`, `checkElimination`, `load` | 射击扣弹、准备/装填、弹体推进、伤情/救援、中央死亡、返补、全歼及保存都通过生产入口验证 |
| `src/combat-readiness.js` | `status`, `step`, `consumeRound`, `validate` | 只在真实发射交易后扣弹，共炮膛冷却、独立弹仓及安全保存 |
| `src/combat-projectiles.js` | `decorateLaunch`, `position`, `step`, `tryIntercept` | 动态弹体 ID、单一位置来源、真实延迟拦截 |
| `src/weapon-effects.js` | `drawProjectile` | RTS 与 FPS 均投影同一模拟坐标，无绘制侧改写伤害/弹体 |
| `src/combat-damage.js` | `apply`, `step`, `repair`, `wreck` | 倒地、救援、零件失效、连续坠落和残骸快照 |
| `src/transport-operations.js` | `board`, `disembark`, `destroyed`, `validateGame` | 原实体载员交易与完整嵌套验证 |
| `src/vehicle-interaction.js` | `vehiclePrepareDirect`, `vehicleNearby`, `vehicleInteract`, `validateVehicleCrews` | 本轮修复倒地登车/自动司机，以及嵌套驾驶员状态 |
| `src/operator-sim.js` | `projectileFamily`, `operatorAutoFire`, `stepOperator` | 发射前提供类别，避免榴弹误用直线弹道；普通子弹、无导引火箭保持已有类别边界 |
| `src/combat-audio.js` | `playShot`, `reset` | 原创程序音色；消费活弹及无伤害发射记录，同一音频实例以发射 ID 去重，场景更替显式重置 |
| `tests/combat-realism-integration.test.cjs` | 20 项场景 | 实际 Game 跨模块行为；全部 20 项已通过，包括冻结目标 ID、同一步发射记录及有限射界的实际拦截 |

## 最终定向复验

2026-10-24 最后一次专项命令得到 **73 / 73 通过**：

```text
node --test tests/combat-realism-integration.test.cjs tests/operator-combat.test.cjs tests/operator-mechanics.test.cjs tests/operator-presentation.test.cjs tests/render-object-cache.test.cjs tests/vehicle-motion.test.cjs tests/personnel-combat-pose.test.cjs tests/personnel-animation-cache.test.cjs
```

包括真实 Game 20 项、旧单兵战斗 15 项、单兵新机制 9 项、前景表现 4 项、缓存 5 项、移动 10 项、人员姿态及缓存 10 项。退出驾驶真正取消未完成装填且不凭空转移弹药，失焦仅清输入仍保留装填的接口已区分。榴弹测试按真实弹体飞行时间等待结算；近防测试从 650 游戏单位外发射导弹，最多等待 4 秒观察实际拦截弹，不增大 220 单位保护圈或有限转速/射界。贴脸垂发快速越顶可能漏防，游戏没有保证 100% 拦截。

另复现爆炸遮挡顺序缺陷：生命 1 的中间掩体先结算死亡时，后方目标损失由 4.7 变为 31.333，取决于实体生成顺序。主控将遮挡和伤害计划先冻结、再统一应用伤害，并增加生成顺序回归；本 agent 未编辑主控源码。

## 视觉审查状态

**已完成源浏览器人员 10 场景的实际截图判读，接受基本状态和输入反馈；不接受“照片级真人”或“使命召唤级画面”的描述。** 人物仍是原创简化模型，四肢关节与装备形状可辨，但缺乏高精度皮肤、布料和专业动作捕捉。截图和一次暂停姿态也不能证明所有方向、速度和地形下的动作都自然。

人员复验脚本：`tests/personnel-combat-browser.cjs`。报告：`docs/personnel-combat-browser-report.json`，10 / 10、页面错误 0，RTX 3060，1500 × 980。近距观察相机仅用于暂停后看生产模型，不插入伤员或假动作；伤态通过真实 `Game.damage` 和 `Game.step`，并明确标记为定点状态检查，不能冒称真实子弹命中。实际鼠标验证右键不扣弹、左键扣弹，R 开始保留余弹的战术装填。

| 实际截图 | 判读与处理 |
|---|---|
| `personnel-combat-healthy.png`、`-walking.png`、`-injured.png` | 能区分站立、由真实位移驱动的步态和受伤跛行；基础迷彩、头盔及负重可辨。仍是简化几何人体 |
| `personnel-combat-downed.png`、`-rescue.png`、`-revived.png`、`-dead.png` | 倒地与死亡保留原人物；医疗兵降低身体并伸手，实际救援完成后恢复站立。倒地不保留站立射击姿态 |
| `personnel-combat-fps-reload.png` | 实际左键开火后 R 换弹，弹药与战术装填阶段文本一致；前景持枪动作与准星分离 |
| `personnel-combat-fps-injured.png`、`-fps-downed.png` | 首轮硬边圆环被拒绝，改为屏幕空间柔和边缘渐变后重拍通过；倒地镜头降低、前景武器隐藏，中央目标视野保持清晰 |

首轮还发现医疗兵静立左肘高于肩：持枪支撑手的旧绑定前臂过长，直接放下双手使 IK 绕肩。修复仅给无武装医疗兵重绑左前臂为右臂镜像长度，配套几何同步变换；新的真实关节回归先失败再通过，双肘低于肩，双手低于肘，救援状态仍合法。缓存历史对比保留全部角色其他关节、双脚和步态，仅将已明确改变的医疗兵左臂改为独立解剖约束，不再要求恢复错误旧姿势。重拍救援与站立图确认不存在过肩反折。

弹体首批图中鱼雷/导弹轮廓过于近似、舰艇夹具位于陆地，本 agent 拒绝作为最终海战证明。表现 agent 随后改为真实水域重拍，已实际复看新的 `combat-visual-{missile,torpedo}-{actual,inspection}.png`、`combat-visual-bomb-inspection.png` 和 `combat-visual-bullet-inspection.png`：圆头无尾焰鱼雷、扫掠翼导弹、母机下方无尾焰炸弹形成类别区别，接受为原创游戏弹体。`combat-guided-vertical-inspection.png` 与 `combat-guided-powered-inspection.png` 展示同一实际 RTS 导弹垂发无尾焰、随后倾转点火；暂停观察相机未制造测试弹体。该判读不证明某具体导弹实物比例或动力参数准确。

最终又独立复看 3.13.0 的 `combat-visual-{shell,rocket,missile,torpedo,bomb,bullet}-inspection-desktop.png` 六类原生近景，类别差异与上述源画面一致。子弹近景已隐藏前景持枪层，鱼雷在真实水域且无尾焰，炸弹位于母机下方。原生报告 `combat-visuals-desktop-report.json` 记录 6 / 6；`combat-guided-desktop-report.json` 记录 2 / 2。微小弹体在近景检查中被相机放大，不能由截图把它误认为世界尺度数米的普通步枪子弹。

`combat-damage-tank-actual-hit.png` 与 `combat-damage-tank-real-wreck.png` 已实看，分别为真实 FPS 左键攻击后局部命中与中央死亡后的原模型残留。随后已独立复看 `combat-damage-{tank-actual-hit,tank-real-wreck,tank-state-probe,destroyer-state-probe,fighter-state-probe,factory-state-probe,infantry-state-probe}-desktop.png` 共 7 张原生图；`docs/combat-damage-desktop-report.json` 为 3.13.0 实际 EXE，7 / 7、页面错误 0、75 项源文件哈希一致、三个授权 GLB 导入完成。新火焰从外表面可见，已无旧版硬球形状，舰体为状态推导的轻微倾斜。接受基本受损状态表达；烟雾仍较弱、伤口与残骸形变简化，不称真实燃烧或影视级特效。舰艇、飞机、建筑及人员这 5 个定点状态检查仍须按报告标签区别于前 2 个真实武器命中/摧毁链。

桌面人员验收已执行 `node tests/personnel-combat-browser.cjs --desktop`，复用 `combat-desktop-harness` 检查全部入口脚本/样式与三个授权 GLB 的源文件哈希、导入完成、材质与模型来源，以及隔离用户配置。`docs/personnel-combat-desktop-report.json`：**10 / 10**，3.13.0，页面错误 0，75 项文件一致，RTX 3060，1500 × 980 CSS 视口。最终 `personnel-combat-{revived,rescue,fps-injured,fps-downed}-desktop.png` 已独立实看，医疗兵双肘及柔和受伤边缘修复在原生包内一致。

原生首轮输入夹具在入场已获得鼠标锁定后又无条件左击，下一模拟帧合法开火，造成右键测量前后 30/29 的假失败。夹具改为仅未锁定时点击，等待真实三帧且左扳机已释放，再采基线；不改弹量、不绕过冷却、不降低右键零弹断言。最终报告 `inputEvidence` 为 Playwright 真实鼠标/键盘与实际弹量/模式读数。附加 document 监听器被游戏更早的 `stopImmediatePropagation` 阻断，因此 `trustedInput=[]` 不是已捕获的可信事件日志，本报告不使用它作证据。

同日后续用户允许未知装备按公开用途和已知同类作原创类比设计；本轮仍不把这种外观、性能或动画称为实物精确还原。真实型号、公开参考、同类推定、原创游戏行为应继续分开标注。

## Suggested next reads

1. `docs/personnel-combat-desktop-report.json` 及对应 `-desktop.png`：本 agent 完成的原生人员/输入验收与明确画质边界。
2. 主控最终全量、驾驶相机、弹道及性能采样报告：评估完整版本，不把本报告的专项通过外推为所有玩法或长期性能保证。
3. `release/ModernFrontHD-3.13.0/ModernFrontHD.exe` 与桌面快捷方式的最终交付记录，由主控统一确认；本 agent 不修改发布路径或提交仓库。
