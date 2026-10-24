# 3.14 技能筛选与应用记录

日期：2026-10-25。目标：导弹盘旋、独立跑道、第一人称帧耗时及地面路线。保留 Three.js r160 与现有模拟，不新增运行时依赖。

| 来源 | 核验与适用范围 | 本轮应用 |
|---|---|---|
| 本机 `diagnose` / `explore` | Codex-native；先复现和文件归属，再做最小修复 | 实际 Game.step 轨迹、固定场景 CPU profile、前后路线指标；3 个 agent 分别实现导弹、跑道和导航 |
| 本机 `game-studio/three-webgl-game` | 已有 plain Three.js 流程；工具链迁移不适用于现有发行版 | 模拟与表现分离，精确射线保留，性能变更独立验证 |
| [threejs-debug-profiler](https://github.com/majidmanzarpour/threejs-game-skills/blob/8286774b22a2566bf894dbc825825c16921866af/skills/threejs-debug-profiler/SKILL.md) | MIT 仓库，固定到 `8286774b22a2566bf894dbc825825c16921866af`，已读技能和 debug-playbook | 固定分辨率与实体数，在实际 Electron 内测量帧时间与 CPU 热点；只改可测开销，不通过删减画面细节伪装提速 |
| [godot-navigation-pathfinding](https://github.com/thedivergentai/Game-Dev-Agentic-Skills/blob/db004d74c40686ca2f7a35fe067b119a9cda593e/skills/godot-navigation-pathfinding/SKILL.md) | LGPL-3.0 仓库；Godot API 不兼容现引擎，仅研究方法 | 参考到达终止、包络与实际避障一致、卡住检测、限制重算等原则；没有复制 GDScript、替换引擎或引入 Godot |

网页仅用来筛选和核验；不执行第三方安装脚本，不全局安装外部 skill。没有复制其实现代码或资产。技能描述中的 AAA 宣传不作为本项目画质验收标准。

落点：`direct-control.js` 先排除明显不相交单位，并在同一次瞄准内复用精确包围盒，最终仍做原始模型三角形相交；`crowd-navigation.js` 根据行程选择合理前后行驶；`navigation-footprints.js` 让矿山/跑道路径留白匹配实际碰撞；导弹保持连续飞行和碰撞。具体测量与限制见本版本验证报告。
