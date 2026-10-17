# 第一人称参考项目与独立实现

2026-10-18。本轮只研究官方仓库中的具体机制，保留本项目 Electron / Three.js / WarSim 架构，没有移植外部引擎、素材或直接复制源码。目标是人员跳跃、输入稳定和小地图；不能把阅读示例称为获得该示例全部画质或联网能力。

## Unity FPSSample

固定提交：[c8375e7](https://github.com/Unity-Technologies/FPSSample/tree/c8375e7cf29cd0bcc3764b0650028a99aecb7475)。官方 README 说明项目基于 Unity 2018.3，已不再积极维护。仓库 LICENSE.md 为 Unity Companion License（Unity-dependent projects）；因此本项目没有直接复用其代码或资产。

- [InputSystem.cs](https://github.com/Unity-Technologies/FPSSample/blob/c8375e7cf29cd0bcc3764b0650028a99aecb7475/Assets/Scripts/Game/Systems/InputSystem.cs)：跳跃使用按下事件，开火检查鼠标锁定。
- [Ability_Movement.cs](https://github.com/Unity-Technologies/FPSSample/blob/c8375e7cf29cd0bcc3764b0650028a99aecb7475/Assets/Scripts/Game/Modules/Character/Behaviours/Abilities/Ability_Movement.cs)：区分地面、跳跃、空中状态，模拟层更新速度和位置。原示例支持二段跳，本项目采用单次地面跳跃。
- 本地落实：人员跳跃在 WarSim 固定步进里计算，input.jump 按键边沿触发；视角只跟随实体高度；暂停、未锁定、模态窗口时不接收移动或开火。长按不重复跳，空中不能再次起跳。

## Godot TPS Demo

固定提交：[a82f154](https://github.com/godotengine/tps-demo/tree/a82f15448e9b015440d3bbdf5e10801b260c4e9f)。LICENSE.md 将代码按 MIT 条款许可，资产和音乐另列 CC-BY 3.0；本轮没有导入这些文件。

- [player.gd](https://github.com/godotengine/tps-demo/blob/a82f15448e9b015440d3bbdf5e10801b260c4e9f/player/player.gd)：物理循环区分落地和腾空，消费跳跃请求；相机方向与移动计算分开。
- [player_input.gd](https://github.com/godotengine/tps-demo/blob/a82f15448e9b015440d3bbdf5e10801b260c4e9f/player/player_input.gd)：相对鼠标输入及俯仰限幅。
- [camera_noise_shake_effect.gd](https://github.com/godotengine/tps-demo/blob/a82f15448e9b015440d3bbdf5e10801b260c4e9f/player/camera_noise_shake_effect.gd)：抖动由事件强度驱动并随时间消退。
- 本地落实：跳跃实体高度统一供相机、模型和弹道读取；人物默认稳定视角，晃动默认关闭且可按 M 显式开启；锁定切换清理输入，忽略第一条锁定增量及异常巨量，正常视角只接受有效相对鼠标事件。飞机左右/上下按用户指定反向，轨道、地面和水下保留普通观察。

## OpenRA

具体源码、固定提交和 UI 证据见 [小地图与 UI 审计](ui-minimap-audit.md)。落实为驾驶小地图独立于指挥地图输入、保持迷雾和声呐、显示驾驶者朝向，以及模态窗口/输入焦点隔离。

## 验证边界

`tests/jump-and-simulation-audit.test.cjs` 验证物理与存档；`tests/input-stability.test.cjs` 验证输入边界；`tests/fps-upgrade-browser.cjs` 使用真实键鼠检查相机、跳跃和小地图，并支持 `--desktop` 检查实际 EXE。参数是游戏单位，未实现真实人体运动、翻墙、完整角色骨骼动画、联网预测或引擎级碰撞控制器。
