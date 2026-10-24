# 3.15 技能筛选与应用

目标是现有本机 Three.js / Electron 游戏中的总指挥托管、侦察规则和更大地理地图，不迁移引擎，不增加在线依赖。

- `local-skill-agent-router`：检查 `D:/CodexSkillAgentHub/inventory/skill-agent-files.csv`，限定游戏渲染、寻路与验证相关条目，先用已启用 Codex 技能。
- `explore`：分派只读 AI / 传感器 / 地图调查，由主控核对调用路径，形成 `.tmp/explore/commander-sensors-geography-315.md`，再按文件所有权实施，避免多 agent 同改一个核心文件。
- `brainstorming-lite`：落实已有用户授权的具体方案——Y 键托管、人工控制保留、分类型侦察、三张离线地理地图，沿用现有模拟而不增加第二套调度器。
- `three-webgl-game`（Hub 中 game-studio 外部技能，仅作兼容参考）：采用每图尺寸、共享雾 uniform、固定成本范围线、受限地表纹理、实际画面与输入验证。没有运行第三方安装脚本或复制未知许可素材。

重点验证：源观察者失效后停止跟踪、准备和定向开火；双方 AI 不通过隐藏单位的当前坐标寻敌；真实右键命令到达旧边界之外；旧地图哈希、保存几何和矩形跑道约束保持；最终独立版使用隔离测试目录，避免终止用户对局。

Native / CPU 的最终数量和 GPU 场景数据见 `docs/v3.15.0-validation.json`，本文不以技能名称代替测试或性能证据。
