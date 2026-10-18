# 独立人员武器库与第一人称近景 · 2026-10-18

本轮新增64款原创游戏武器，8类各8款：手枪、冲锋枪、突击步枪、霰弹枪、轻机枪、精确射手步枪、狙击步枪、发射器。不提取《使命召唤》或其他商用游戏资产，不把游戏数值冒称真实装备性能。

## 数据接口

`src/operator-weapons.js` 加载于 roster 之后、sim 之前，暴露 `WarOperatorWeapons`：

- `list`：64个冻结定义；`byId[id]`：同一对象索引。
- `categories`：`[{id,name}]`；ID为 `pistol/smg/rifle/shotgun/lmg/marksman/sniper/launcher`。
- 武器ID为 `category_01` 至 `category_08`。
- `defaultPrimary='rifle_01'`，`defaultSecondary='pistol_01'`。
- `targetLabels` 提供人员、陆地/建筑、水面/水下、空中、太空的中文标签。
- 属性包括 damage（每弹丸）、range/splash（游戏u）、fireInterval/reloadSeconds（秒）、magazine/reserve（发数）、spread（弧度）、recoil（近景表现强度）、automatic、pellets、targets、color、profile、description。
- 只有霰弹枪 pellets 大于1；只有发射器 splash 大于0。

每类的01至04型分别针对陆、海、空、天单域，05为陆海、06为空天、07用类别ID稳定种子选2或3域，08为全域。全部另含 personnel。总计32款单域、24款组合、8款全域。随机组合在重新加载后不变化；对空/轨道属性明确为原创科幻游戏设定，不暗示真实手枪可以打轨道目标。

## 近景与换弹

`view.setWeapon(id,faction)` 将视图切为独立人员武器；或调用 `view.setKind(kind,faction,id)`。重复同一武器不会重建；换武器释放旧几何/材质。`metrics.weaponId`、`weaponCategory` 可用于UI和自动验证；旧载具的 `setKind(kind,faction)` 会清武器状态。

8类拥有独立轮廓：短滑套手枪、短机匣冲锋枪、护木步枪、下置管仓霰弹枪、侧弹箱/供弹带轻机枪、长护木精确步枪、长枪管/枪机柄狙击枪、粗管肩射发射器。每类的长度、瞄具、枪托、弹匣形态和颜色按8款配置变化。开放机械瞄具及偏置镜体保留中心视野；握持手套、袖口、拉机柄、护木孔、枪口环和脚架等由程序原创生成。

`view.update({reloading,reloadProgress})` 接收0至1进度；换弹时枪体侧倾，下移弹匣或弹罐，结束归位。M关闭呼吸/步行晃动后，换弹动作仍显示。换弹时禁止近景枪焰，ADS退回。此为游戏动作提示，不宣称完整真人骨骼换弹或真实机构操作。

## 验证与边界

`node --test tests/operator-weapons.test.cjs`：6/6通过。检查64项数据、域组合分布与稳定性、64个不同几何摘要、有限顶点、换弹动作、资源释放及原有单位视图构造。

测试使用实际Three.js和项目倒角几何模块：新武器最多4633三角形、8次前景draw call，低于现有12000/12预算。几何摘要不同只能证明模型发生变化，不能替代视觉审查或AAA质量评价。此agent未启动GPU；实际画面、准星遮挡、主副切换、弹药与打包EXE交互须由主线程串行验证。

## 战斗模拟独立审查

新增 `tests/operator-combat.test.cjs`，14/14通过；与武器数据/近景6组共20/20。其中第一人称与RTS分别64款×7类目标，共896个实际发射场景，验证人员、陆地、水面、空中、太空、建筑、水下的命中授权与每次扣弹；另测短按、半自动/自动、友军/隐藏/超距/失去声呐、不重复补弹、换弹守恒、暂停冻结、换枪取消换弹、退出与存档、EMP清待发及基地收费补给。

审查反馈并修正：

- 弹药引用：原normalization每次替换stash对象，目标判定再次读取状态后，射击扣减写入旧对象。主线程改为原位校正，实际命中扣弹测试通过。
- EMP待发：清输入同时清未消费firePending，防EMP结束自动补射；主线程修复，测试通过。
- 非法武器键：普通索引对象曾将 __proto__/constructor 视为有效键；测试直接复现。武器byId改为无原型冻结字典，非法ID拒绝回归通过。

主线程补齐退出驾驶后的RTS行动员配装路径。新增回归验证：RTS实际命中与扣弹遵守64款域掩码；武器射程随配装变化；自动换弹只转移既有备弹；全部弹药耗尽后不继续射击。该项边界已经闭合。

主流程补充：发射器无需锁定目标也按实际落点产生范围伤害，仍遵守人员与声明目标域限制；相关实射测试已通过。原生/浏览器军械库及全77单位驾驶通过；详见 docs/VALIDATION.md。
