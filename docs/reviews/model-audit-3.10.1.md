# 3.10.1 独立外形与发射端口审核

审查日期：2026-10-20。审查者：fps_input_audit，未参与本轮生产模型修改。基线为 `41c8c6e`；本轮地面/海军端口修复正在共享工作区进行，不能用基线截图证明新代码已经通过。只读生产文件、查看已有模型/实物图片、CPU 装配检查；本审查没有启动 GPU。

## 结论及高置信问题

2026-10-21 补充闭环：来源清单已补齐 operator 六槽，现 462/462，政策数字已更新；原 `recordedAt` 保留，补录单记日期，未提升任何视觉通过状态。新增 `tests/launch-anchor-integration.test.cjs` 独立验证42装备槽位及清单，43/43 CPU通过（美国驱逐舰实际加载许可Burke GLB，CPU纹理解码占位，不宣称纹理渲染）。测试曾实际发现帝国驱逐舰炮口未绑定炮塔，主实现者修复后重新通过。以下缺陷保留为发现时证据；端口的CPU闭合仍需新原生截图检查外观，M109A7制退器外形问题未因锚点修复而关闭。

2026-10-21 M109开孔修复的独立CPU复核：主实现者随后将 USA `arty` 制退器改为带透孔壳体。`tools/check-launch-anchors.cjs` 对30槽实跑通过：仅该槽允许几何哈希和三角面数变化（11950→12414），29个其他槽的签名完全等于原基线；该槽包围盒尺寸 `[9.62440619468689,4.37999997317791,3.700000047683716]`、2个mesh、scale 6.4均未改变。中心沿后向0.35艺术单位无交点，横向偏移0.105命中真实孔缘（距离约0.012），前向无阻。`tests/launch-anchor-integration.test.cjs` 增加生产骨架绑定后的同类射线检查，44/44通过。原“实心堵口”几何缺陷已在CPU证据层闭合；新近景的外形品质、实际光照与参考照片一致程度仍须主流程GPU看图，不由此自动宣称完整视觉验收。

### P2：火箭炮、舰炮和鱼雷的发射源与实际外形端口脱节

- 基线实际装配 `WarModels.create(kind,'chn')` 后调用 `WarVehicleAnimation.attach`：rocket、destroyer、submarine 均无 `muzzle`；tank、orbital 有锚点。
- 运行路径：`src/direct-control.js` 的 `aim()` 对缺锚点模型使用车体中心；`submit()` 将此点交给真实射击。不是仅 HUD 绘制偏移。
- 证据：`docs/weapon-effects-desktop-report.json` 中 rocket 源 `[1800,12.35,1400]`、destroyer 源 `[1800,13.65,100]`、submarine 源 `[1800,-52,100]` 都落在各实体中心。`screenshots/weapon-effects-rocket-desktop.png` 可见火焰在双箱之间；CHN 舰炮则实际建在 `models-naval.js` 的 `L*.38` 前甲板。
- 火箭炮、舰炮模型已有可辨的管口；应绑定该管口及其现有可动关节。鱼雷口只能按明确标注的外观游戏近似放置，不推测非公开内部结构。
- 状态：主实现者和地面模型 agent 正在修复。新代码出现 `muzzle` 只说明接口存在，还必须检查实际外表位置、关节转动后位置、真实射击截图。

### P2：M109A7 制退器仍是实心方块，近景轮廓不符合当前参考

- 亲自对比 `screenshots/model-review/arty_usa-perspective.png` 与 `.tmp/references/ground/5.jpg`。现图是小方块加黑色面；实物参考能直接看到圆形前端孔、侧面大开口和中间结构，轮廓差异在近景很明显。
- 源码：`src/models-vehicles.js` 的 `barrel(...,muzzle=true)` 用一个 `box` 加左右黑色薄片表示；没有真实透空几何。该 helper 同时影响其他四个自行火炮槽位，但其他四型的正确制退器不能照搬 M109 外形。
- 参考出处沿用 `ground-reference-review.md` 中的 [原参考页面](https://babel.ua/amp/news/46776-ssha-pochinaye-vikoristovuvati-suputniki-dlya-navedennya-artileriji-na-cili)。此图足以证明开口差异，不足以认证具体批次全车配置。
- 最小建议：按已公开外观分别建立各型开口壳体、孔缘和过渡，保留现有炮管轴线、锚点及碰撞包络；先比对同角度近景，随后更新五视图和缩略图。不是仅加面数或涂黑。

### P2：验收范围文字与现有清单不一致，不能宣称 462 槽已逐型通过

- 当前 `WarData.U` 为 77 类、六阵营，共 462 槽。实际读取 `model-inventory.json` 是 **456** 项，缺少 operator 的六阵营记录；不是文档文字写的 264 项。
- 456 项分类：49 known-photo-reference、10 generic-game-role、19 concept-frozen、24 space-concept-original、354 original-role-variant；`fullVisualAcceptance=true` 为 **0**。
- `ACCEPTANCE_POLICY.md` 仍写264槽。来源清单、许可链、骨骼覆盖或缩略图成功都不是完整外形验收。
- 建议单独更新范围和 operator 来源记录，保留“未完整视觉确认”状态，不自动把新增项改为通过。

## 本次直接看图的重点结果

|对象|实际观察|当前边界|
|---|---|---|
|PHL-191 / rocket_chn|八圆口、双组与四轴可辨；发射效果却在车体中心|发射端口正在修；驾驶室倒角、锁架仍简化，未核验所有配置|
|Type 055 / destroyer_chn|前炮、前后垂发区、舰桥、桅杆和机库可辨；照片中大面积平面与简化窗格明显|未取得本轮同构型三视图比例对照；不能认证垂发数量/舰桥细节或精确比例|
|Type 093 early / submarine_chn|细长艇体、指挥台围壳、水平舵、尾舵可辨；尾部仅圆柱端帽|不能把端帽当已建成螺旋桨；未公开尾部不应捏造“真实还原”。此边界与 naval-motion-rig-sources 一致|
|BMP-3 / ifv_rus|亲自对照 `.tmp/references/ground/1.jpg`：六轮、低车体和双炮保留|模型侧面与炮塔附件明显简化；不以轮组正确推断全车比例准确|
|BMP-2 Sarath / ifv_ind|查看 rear 图及 `.tmp/references/ground/3.jpg`；当前后部仍是大平板和两个黑色小方块|现参考主要侧面，不能据此认证后门细节，需专门后视同构型来源|
|M109A7 / arty_usa|与真实参考直接比较，炮口缺透空；炮塔与底盘已有独立轮廓|制退器列为可复现外形缺陷；全车尺寸/具体改型未完成标定|
|Pantsir-S1 / aa_rus|对照 `.tmp/references/ground/16-pantsir.jpg`：四轴、双侧筒组、设备舱和雷达职责可辨|模型驾驶室折面、雷达/支架和设备舱格栅仍明显简化；参考雷达为不同折叠姿态，不能据单图判当前展开姿态错误|

上述图来自已有 `screenshots/model-review`，未保证与本次所有关节/端口补丁同批生成。它们用于定位仍存在于 builder 的静态外形差距，不能代替 3.10.1 的原生最终图。

本轮还核对了 [BAE M109A7 产品资料](https://www.baesystems.com/dam/jcr:891d545e-5925-442e-a4b1-65172af2647d) 的公开规格与用途边界；没有把游戏艺术单位直接当米，也没有据总包围盒宣称尺寸误差。该资料不是对其他型号的认证。

## 导入资产与全范围扫描

核对 `assets/models/{t90m,burke,ah64}-LICENSE.md`、模型注册与装配边界：现有三个外部模型记录了原作者、CC-BY 来源、派生处理和离线加载。T-90M 仅俄罗斯槽，不能代替印度 T-90S；AH-64 按 Longbow 家族外观，不认证 AH-64E；Burke 艺术资产不认证精确工程尺寸。本轮没有重新联网授予许可，也没有重新逐面验 GLB 材质或宣称新 GPU 加载成功。

以下逐类表覆盖当前全部 77 类、每类六阵营。范围扫描检查的是来源记录是否存在、验收状态是否越界；**不表示审查者本轮看完 462 型实物与对应五视图**。没有完成四项证据链的槽位均继续未完整确认。49 个实物参考槽位沿用历史轮廓初审边界；19 个冻结概念槽位不得据新运动动画自动解冻。

## 验收脚本修正

`tests/weapon-effects-browser.cjs` 保留真实 J/C/RMB/LMB 操作和真实 shot；仅在截图期间隐藏 `direct.el('lock')` 暂停按钮的 visibility，随后恢复原 style。准星、小地图和其余 HUD 保留，report 明示隐藏对象与原因。

只观察包装实际 `emitShot`：在调用时记录模型 `muzzle` 世界坐标，原方法执行后把新增真实 shot 与该坐标对应；不注入、修改或重定向 shot。六类要求锚点存在，来源三维距离误差不超过 0.05 游戏单位。夹具静止，此容差不宣称真实米制精度。

本轮已 `node --check tests/weapon-effects-browser.cjs`；原生执行与新截图交主实现者串行完成，未在此伪报通过。

## 尚未完整视觉确认的逐类清单

|类别 key|来源清单槽位数|现有来源分类|完整视觉状态|
|---|---:|---|---|
| infantry | 6/6 | generic-game-role, concept-frozen | 未完整逐型视觉确认 |
| tank | 6/6 | known-photo-reference, concept-frozen | 未完整逐型视觉确认 |
| ifv | 6/6 | known-photo-reference, concept-frozen | 未完整逐型视觉确认 |
| arty | 6/6 | known-photo-reference, concept-frozen | 未完整逐型视觉确认 |
| rocket | 6/6 | known-photo-reference, concept-frozen | 未完整逐型视觉确认 |
| aa | 6/6 | known-photo-reference, concept-frozen | 未完整逐型视觉确认 |
| heli | 6/6 | known-photo-reference, concept-frozen | 未完整逐型视觉确认 |
| jet | 6/6 | concept-frozen | 未完整逐型视觉确认 |
| fighter | 6/6 | known-photo-reference, concept-frozen | 未完整逐型视觉确认 |
| destroyer | 6/6 | known-photo-reference, concept-frozen | 未完整逐型视觉确认 |
| carrier | 6/6 | known-photo-reference, concept-frozen | 未完整逐型视觉确认 |
| submarine | 6/6 | known-photo-reference, concept-frozen | 未完整逐型视觉确认 |
| satellite | 6/6 | space-concept-original | 未完整逐型视觉确认 |
| orbital | 6/6 | space-concept-original | 未完整逐型视觉确认 |
| orbital_interceptor | 6/6 | space-concept-original | 未完整逐型视觉确认 |
| asat | 6/6 | space-concept-original | 未完整逐型视觉确认 |
| harvester | 6/6 | generic-game-role, concept-frozen | 未完整逐型视觉确认 |
| antitank_team | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| machinegun_team | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| recon_vehicle | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| repair_vehicle | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| mortar_team | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| assault_team | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| frigate | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| patrol_boat | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| missile_boat | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| shore_bombardment | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| air_defense_ship | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| repair_ship | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| recon_boat | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| recon_drone | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| attack_drone | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| interceptor | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| close_support_aircraft | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| heavy_bomber | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| early_warning_aircraft | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| escort_helicopter | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_sniper | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_point_defense | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_bombardment | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_siege | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_repair | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_mapper | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_raider | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| tank_destroyer | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| siege_howitzer | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| field_medic | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| torpedo_boat | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| arsenal_ship | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| escort_corvette | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| rescue_helicopter | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| naval_strike_aircraft | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| electronic_warfare_aircraft | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_escort | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_relay | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_jammer | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| sniper_team | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| mobile_ciws | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| fleet_command_ship | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| electronic_warfare_ship | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| air_repair_drone | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| interceptor_drone | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_shield | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_missile_barge | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| hunter_sub | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| abyss_tender | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| omni_striker | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| omni_dreadnought | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| assault_gun | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| mobile_radar | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| asw_patrol_ship | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| missile_sub | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| high_altitude_interceptor | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| strategic_strike_aircraft | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_carrier | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| orbital_sensor | 6/6 | original-role-variant | 未完整逐型视觉确认 |
| operator | 0/6 |  | 未完整逐型视觉确认 |

## 主线程最终外观复核（2026-10-21）

已重新渲染 M109 五视图、近景、生产头像，并实际对照原参考照片。圆孔与侧窗已透空；实物制退器更圆滑，车顶武器站、线缆和外挂件仍有明显简化，不将此最小修复升级为全车实物验收。原生炮口、齐射、来源材质及模型包络的最新机器证据统一记录于 `../v3.10.1-validation.json`。上方表中operator 0/6是修复前发现，当前来源清单为462/462且所有fullVisualAcceptance仍为false。

原生验收补记：当前3.10.1的六类真实开火检查均通过，发射点与模型锚点误差实测为0游戏单位；不是实物尺寸误差。69载具C切换和五域操作已通过。原生测试补上截图后/键盘操作前的窗口焦点和真实点击锁定前置条件，未改游戏的失锁禁操作规则。
