# 验证记录

日期：2026-10-16。原参考目录未修改。

## 已执行

- `npm test`：19 项行为测试全部通过，覆盖地图所有出生点连通、海军沿水域寻路、生产扣费和完成、AI 建造、技能冷却、延迟打击、胜负、存档、太空克制、护盾、维修、干扰以及公开数据机动映射。
- `node tests/browser.cjs`：部署菜单、6 阵营、4 AI、生产、选择、右键、核打击瞄准、保存、桌面与窄屏截图。页面脚本及控制台错误 0。
- `node tests/acceptance.cjs`：14 项浏览器验收，包括海陆空天、AI 科技权限、保存恢复、增益、夜间光影、胜利结算、file:// 离线运行与 QHD。页面错误 0。
- `node tests/gallery.cjs`：11 个模型选择，旋转拖动、线框、迷彩和光照切换。页面错误 0。
- 真实启动：执行 `启动游戏.cmd`，确认 `http://127.0.0.1:8765/health` 返回项目标识与版本。
- 运行 `scripts/step`、`scripts/inspect refs --facts --planes --positioning` 和 `scripts/snapshot`。最终几何源生成的模型有效性为 true，截图已人工视觉检查。坦克外观模型 427–441 个独立构件，导弹舰 162 个构件。

## 性能测量

`tests/performance.cjs`，Chromium headless，1600×1000，530 实体压力场景：4 次 FPS 采样 30、46、46、46。仅代表该浏览器和压力布局，不保证用户正常窗口中的帧率。报告在 `performance-report.json`。

## 运行边界

- 双击 file:// 模式在 Chromium 中正常运行，CAD 图集成功加载。由于本地图片污染画布，GPU 后处理被浏览器限制，已自动回退，未影响模拟和操作。本机启动器优先走 localhost，正常启用 WebGL2。
- 实测支持的 GPU 光影不是 DLSS。检测到的 RTX 3060 不支持本次核实的 DLSS 5 神经渲染硬件范围。
- 没有验证所有浏览器、触屏完整 RTS 操作、联网多人、长时间耐久运行和所有大军团碰撞情况。
- 仍然是俯视 RTS 原型；一些兵种与设施采用通用几何，未完成所有真实型号的精确外观、弹道与装甲仿真。游戏数据层对此有明确标注。
- 核打击、钻地弹、六代性能增强、轨道作战和护盾采用显著抽象；不能作为现实性能证据。

## CAD 工具兼容处理

安装的 CAD 插件与 OpenCascade 8 不兼容，开发虚拟环境改用 build123d 0.12.0 + OCP 7.9.3.1.1。Python Playwright 与已有浏览器修订号不同，`models/snapshot_cad.py` 使用本机已安装 Chromium 调用原 snapshot 工具，没有修改插件源码。

插件文档中的 `agent:start` 在此安装包中缺失；使用同一包实际提供的 `start` 启动 CAD Viewer，限定 localhost，12 小时自动停止。游戏本身不依赖 CAD Viewer。
