# 画质实现与 NVIDIA 边界

核查日期：2026-10-16。通过 Win32_VideoController 检测本机为 NVIDIA GeForce RTX 3060，驱动版本 32.0.15.9579；同时存在远程桌面虚拟显示设备。WMI 的 AdapterRAM 字段存在 32 位截断，不能据此判断真实显存容量。

## 本版实际实现

- 参数化 build123d CAD 装配，STEP 作为可编辑中间产物；构件三角化、光照法线计算、16 方向透明图集烘焙。
- 方向光明暗、接触投影、自制地表纹理、动态爆炸与支援效果。
- WebGL2 屏幕后处理：亮区提取、8 采样泛光、色调映射、轻微暗角、可选夜间调色。UI 在 GPU 效果层之上，保持字体清晰。
- GPU 不可用或上下文丢失时显示 Canvas 标准画面；没有账号、许可证服务器、订阅或联网依赖。
- 宽屏 / 高 DPI 画布；DPR 上限 2，地图只烘焙一次，实体裁剪、固定 20 Hz 逻辑、空间网格和分批 AI 更新。

## 没有实现的技术

没有 DLSS、DLAA、NVIDIA Ray Reconstruction、硬件光线追踪或神经渲染。不能将普通泛光或图像放大叫作 DLSS。

NVIDIA 官方 DLSS 5 研究页面将本地神经渲染描述为 RTX 50 Series 管线阶段；本机 RTX 3060 不在该范围内。Streamline / DLSS 的接入还要求原生图形管线及相应资源，浏览器 Canvas / WebGL 没有直接绑定。

- [DLSS 5 官方研究说明](https://research.nvidia.com/labs/adlr/DLSS5/)
- [NVIDIA DLSS 开发文档](https://developer.nvidia.com/rtx/dlss)
- [NVIDIA Streamline](https://developer.nvidia.com/rtx/streamline)
- [Streamline 官方开源仓库](https://github.com/NVIDIAGameWorks/Streamline)

如果未来迁移到原生渲染器，必须生成正确的深度、运动向量、曝光和抖动数据，按 SDK 的资源生命周期与功能支持查询接入，并分别验证支持的超分辨率、帧生成和光线重建功能。不能通过复制某个 DLL 或破解组件给不支持的硬件补齐代际功能。该原生迁移不属于本次可运行浏览器版本。
