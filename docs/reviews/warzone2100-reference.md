# Warzone 2100 官方代码研究与本项目落地

研究日期：2026-10-18。用户授权参考官方仓库改进 RTS 玩法；研究者 `space_reference` 独占新模块、测试与本文档，主代理负责 sim/app/battle3d 集成。

## 来源与许可

已联网打开 [官方仓库](https://github.com/Warzone2100/warzone2100)，并以 `git clone --depth 1` 实际读取源码。研究副本仅放 `.tmp/warzone2100-reference`；固定提交 **b53919b81419b716bcb6ce500a5c6bd88aad1563**，不以会变化的 master 行号作为证据。

[COPYING.README](https://github.com/Warzone2100/warzone2100/blob/b53919b81419b716bcb6ce500a5c6bd88aad1563/COPYING.README) 指明其源码与数据采用 GPL-2.0-or-later，另有具体链接例外；[COPYING](https://github.com/Warzone2100/warzone2100/blob/b53919b81419b716bcb6ce500a5c6bd88aad1563/COPYING) 为许可证正文。[COPYING.NONGPL](https://github.com/Warzone2100/warzone2100/blob/b53919b81419b716bcb6ce500a5c6bd88aad1563/COPYING.NONGPL) 列出部分图片、第三方库等的不同许可，不能把某个 MIT/CC0 例外套用到整个游戏。

本轮没有拷贝、翻译或链接其 C++ 实现，没有导入其模型、贴图、音频、地图、依赖库或可执行文件。研究采用通用的图连通性设计思路；新增 JavaScript 按本项目网格、命令对象、测试要求独立编写。GPL 研究副本不打入发布包、不进项目 Git；如未来要导入具体源码/资产，应重新核对该文件及组合发布义务。

## 真实发现与取舍

| 实际阅读的官方源码 | 观察到的行为 | 对本项目的作用 |
| --- | --- | --- |
| [map.cpp L2165–2237](https://github.com/Warzone2100/warzone2100/blob/b53919b81419b716bcb6ce500a5c6bd88aad1563/src/map.cpp#L2165) | 地图初始化阶段建立推进方式相关的连通区域。陆地/水面受限推进与气垫的区域信息分别处理。 | 先判定陆军是否处于同一岛，海军是否位于相通水域，再决定是否值得寻路。 |
| [fpath.cpp L1082–1115](https://github.com/Warzone2100/warzone2100/blob/b53919b81419b716bcb6ce500a5c6bd88aad1563/src/fpath.cpp#L1082) | `fpathCheck` 检查地图边界、处理非阻塞位置，再按推进类型检查区域；飞行器单独处理。 | 不能把陆地掩码用到船和飞机；本项目需要自己的保守端点规则，不能直接复用上游吸附逻辑。 |
| [order.cpp L1417–1444](https://github.com/Warzone2100/warzone2100/blob/b53919b81419b716bcb6ce500a5c6bd88aad1563/src/order.cpp#L1417) | 位置命令在改变现有命令之前判断可达性；对象目标有独立条件。 | 被拒绝的新地点不应清除原有行军或 Shift 路线；移动可达与射击可达必须分开。 |
| [fpath.cpp L916–962](https://github.com/Warzone2100/warzone2100/blob/b53919b81419b716bcb6ce500a5c6bd88aad1563/src/fpath.cpp#L916) | 寻路结果区分到达、最近可达和失败；是否接受最近点由作业策略决定。 | 不把“收到右键”当作“能够到达”；本轮不增加偷偷改派另一岛岸边的 fallback。 |
| [order.cpp L2373 起](https://github.com/Warzone2100/warzone2100/blob/b53919b81419b716bcb6ce500a5c6bd88aad1563/src/order.cpp#L2373)、[display3d.cpp L3883](https://github.com/Warzone2100/warzone2100/blob/b53919b81419b716bcb6ce500a5c6bd88aad1563/src/display3d.cpp#L3883) | 显式维护待执行命令列表及命令提示效果；显示单位当前命令字母。 | 队列与当前执行状态应可观察。本文不声称该代码提供了与本项目相同的路径线视觉；本项目实线路径/虚线后续点由主代理独立设计。 |

本轮优先修复真实玩法缺陷：原 `Game.command` 收到群岛另一岛的地面目标后，会清掉当前命令并播放成功效果；随后 A* 失败，每秒重试并占用路径预算。地图面积增加四倍后，这种永远不可能成功的命令同时影响操作可信度与 CPU。没有为本次问题引入上游线程寻路、完整推进系统或新的依赖。

## 已实现模块与集成约定

`src/command-feedback.js` 导出浏览器全局 `WarCommandFeedback`，同时支持 Node require。

```js
const access = WarCommandFeedback.check(map, unitDefinition, from, resolvedDestination);
// access = { reachable: true | false | null, reason, domain }
```

- `false`：已证明静态区域不相通，或坐标超出地图；拒绝该单位的新命令。
- `true`：静态区域相通，或者空中/太空单位不受地面掩码约束。只代表通过静态预检，不能保证动态道路、建筑与碰撞半径下最终可达。
- `null`：地图不完整或端点落在阻塞格；留给现有目的地恢复/A*，不擅自将单位吸附到另一片区域。
- `domain` 为 `land / water / air / space`，`reason` 为机器可读的原因。

连通标签来自 `map.blocked` 与 `map.navalBlocked`，完全不读取每帧改变的建筑阻塞。使用四邻接连通性：本项目八方向 A* 禁止斜切两个障碍夹角，其可达区域与四邻接区域一致。每个地图、每个地表类型只构建一次；首次 O(COLS×ROWS)，后续每次判断 O(1)。128×88 地图每层区域表为 45,056 字节，两层约 88 KiB；构建时临时队列额外占一个同大小表。WeakMap 允许旧地图被回收。

替换掩码对象、改变地图尺寸或 `map.navigationRevision` 会重建缓存。未来原地编辑地形，调用 `invalidate(map)` 或递增 `navigationRevision`。动态建筑变化不需重建静态缓存。`stats(map)` 只提供构建次数、查询次数及区域数，用于自动验证。

主代理接入点：

1. `Game.command` 在 `this.destination` 之后、修改 `order/path/orderQueue` 之前检查。Shift 追加时从已有队列末尾或当前目标出发。
2. 仅对未绑定已探测对象的移动/攻击移动做静态拒绝；直接攻击对象仍交由既有射程、目标域、探测与伤害逻辑。隔海火炮可打击射程内目标；该行为已实测扣血。
3. 被拒单位保留原命令、原路径、原队列；部分接受时只改可达单位；全部拒绝不生成成功指令效果。
4. 返回 `{accepted:[id], rejected:[{id,reason,domain}], queued:boolean}`。`format(report)` 提供中文反馈，包含部分成功、陆地/水域不通、地图越界与 16 点队列已满原因。
5. app 的战场右键、攻击移动、缩略图右键展示报告。真实已求得路径与尚未寻路的排队目标应采用不同画法。主代理已修改相应集成文件，视觉实机验证由其串行执行。

没有把检查塞进通用 `findPath`；因此不会改变其阻塞起点、终点近邻搜索语义，也不会误用静态区域替代建筑动态可达性。已保存的旧不可达命令或直接攻击远处跨岛目标依然可能进入旧寻路流程，这不属于本次纯位置命令预检的保证范围。

## 验证结果

执行 `node --test tests/command-feedback.test.cjs`：**13/13 通过，171 ms**（本次 CPU 测试进程耗时，不是游戏帧率）。

覆盖：

- 五个群岛陆军出生区域两两分离，五个海军出生点互通；旧三图跨图陆路和外围海路仍通。
- 斜角夹缝不误判连通，阻塞端点返回 unknown，动态建筑不被静态缓存误判为永久阻断。
- 连续 2,000 次查询只构建 1 次区域表；掩码替换、版本变化、显式失效会更新结果。
- 实际 `Game` 跨岛命令拒绝后，原 order/path/queue 对象引用不变，成功效果数量不变。
- 空陆混选跨岛，飞机接受、坦克拒绝；Shift 不塞入不可达点。
- 实际 16 点满队列拒绝第 17 点，并显示队列满，而非假报接受。
- 真实模拟构造相隔一格水带的火炮与坦克，距离 200 游戏单位：地面连通性为 false，但明确攻击命令接受，模拟 2 s 后目标生命值下降。

此 agent 未运行 GPU 或浏览器；未以单元测试冒充视觉验收。地图 UI 与路径线/命令反馈的发布包测试须由主代理最后执行。
