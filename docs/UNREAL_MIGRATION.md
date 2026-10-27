# 虚幻引擎评估（2026-10-27）

当前交付仍是 Electron / Three.js 独立桌面版，不是 Unreal 游戏。本机常用 Epic 安装目录、D 盘根目录和 Unreal 注册表安装项未发现引擎；本轮没有下载引擎或声称完成 UE 编译。机器约 32 GB 内存、RTX 3060 12 GB，可以先做小场景迁移验证，不能由硬件配置推断最终大型战场帧率。

UE 的游戏逻辑主要通过 C++ / Blueprint 实现。现有 JavaScript 模拟器、Three.js 渲染器与 DOM 界面不能通过加入一个插件直接变成 UE 原生游戏。公开的 GLB 模型可通过 glTF/Interchange 导入，但程序生成模型、动画、材质、炮口与武器碰撞需要迁移和复核。

推荐迁移顺序：

1. 单独 UE 项目，先导入一辆已授权 T-90M、一名原创人员、一座建筑和小块地形。保留来源与 CC-BY 署名。
2. 用 C++ 固定步进重建伤害、连续弹体、火力分配；蓝图配置单位与 UI。直接移植本轮行为用例：伤员死亡、失锁余弹、齐射多目标、友伤开关。
3. PlayerController 在指挥相机和 Pawn 驾驶间切换，AI 接管空闲部队；禁止渲染效果直接结算伤害。
4. 将坐标统一为 UE 厘米和 Z 向上。现有模拟平面 x/y、高度 altitude 与 Three.js 显示高度分开映射；压缩轨道高度不可直接冒充真实距离。
5. 先验证 32 单位，再验证 320 单位。对照当前版记录 20 Hz 模拟是否实时、平均 FPS、P95 帧时间、内存和显存；不过验收不替换现有启动器。

暂不同时运行两套完整引擎，也不使用网页嵌入来冒称 UE 原生迁移。接入成本的主要部分是玩法与渲染重建，不能承诺安装后自动提升帧率。

官方依据：

- [C++ / Blueprint 的职责与组合](https://dev.epicgames.com/documentation/en-us/unreal-engine/coding-in-unreal-engine-blueprint-vs-cplusplus)
- [Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine)
- [GLB / glTF 支持与限制](https://dev.epicgames.com/documentation/en-us/unreal-engine/gltf-file-format-support-in-unreal-engine)
- [硬件与软件要求](https://dev.epicgames.com/documentation/unreal-engine/hardware-and-software-specifications-for-unreal-engine)
