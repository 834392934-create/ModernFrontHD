# 技能搜索与采用记录 · 2026-10-24

目标：改善当前离线 Three.js / Electron 游戏的开火、动画、损伤和稳定性。先核验技能内容与本机引擎兼容性，再在现有工程实现；不把安装技能等同于画质升级。

| 来源 | 已核验与采用内容 | 本项目落点 |
| --- | --- | --- |
| [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) 的 threejs-animation | 按状态驱动动画、区分骨骼/关节和程序动画、控制动画生命周期 | `personnel-animation.js`、`vehicle-animation.js`、`fps-viewmodel.js`；使用游戏模拟时钟，暂停不继续动画 |
| 同仓库 threejs-shaders | 材质共享、控制透明叠加和着色复杂度、先用标准材质 | `weapon-effects.js` 弹体共享几何和材质、有限对象池；`combat-damage-visuals.js` 柔和烟雾与距离预算 |
| 本地 game-studio / three-webgl-game 与 webgl-debugging-and-performance | 模拟状态独立于网格、渲染器只做呈现、测量资源数量与帧成本 | 弹药/损伤/连续弹道独立模块；同一状态供 RTS、驾驶、瞄准与存档使用 |
| [OpenAI playwright-interactive](https://github.com/openai/skills/blob/main/skills/.curated/playwright-interactive/SKILL.md) | 从使用场景列验收清单、真实输入、视觉和功能分别验收 | 复用项目现有 Playwright / Electron 测试；实际鼠标发射、暂停检查弹体、独立 agent 看图 |

Three.js 技能仓库核验时为 MIT，固定参考提交 `0e181866f095b5f06d005133876e926515390d95`。研究副本在忽略目录 `.tmp/skill-references/`，未把第三方技能全文或研究照片随游戏分发。

兼容边界：技能示例含 r186 API，而游戏使用本地 r160；未直接复制新版 Timer、WebGPU、TSL 或 shader chunks。保留当前 JavaScript / WebGL 架构，不为采用技能增加 Vite、React、Rapier 或联网依赖。官方交互技能的 js_repl 运行环境在本会话不可用，实际采用已可运行的项目 Playwright 工具链，不能声称运行了该技能的专用工具。

本地入口：`D:/CodexSkillAgentHub/codex-home/tmp-plugins/plugins/game-studio/skills/three-webgl-game/SKILL.md`；性能参考为其插件目录 `references/webgl-debugging-and-performance.md`。通过 `local-skill-agent-router` 与 `find-skills` 查询集中清单后选取，未批量安装未知插件。

验收以独立版源码一致性、实际输入、专项截图和模拟回归为准；测试通过不等于真实型号外形认证，也不等于达到商业游戏的画质。
