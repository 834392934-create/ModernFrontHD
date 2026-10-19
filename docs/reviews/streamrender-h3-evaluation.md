# StreamRender-H3 对本项目的适用性

2026-10-19；独立官方资料审查。用户已选择：**只用本机，先吸收可落地的优化方法**。因此本轮不集成 H3 推理、不下载权重、不运行远端源码，也不添加声称已启用 H3 的界面标识。仅新增本报告；未启动 GPU 应用。

## 判断

当前 Windows + RTX 3060 12 GB 无法按官方公开部署方案运行 StreamRender-H3。它是分块生成视频的多 GPU 研究系统，不是可直接装进 Three.js 的超分辨率插件。其缓存、减少重复计算、有限队列及固定条件评估方法可以独立用于本游戏；这类优化应以项目自己的 CPU/原生测试验收。

官方仓库地址中的 **`sol-engine` 是分支名**，源码目录是 `models/streamrender_h3`。本次固定代码版本为 [`396a5300acef00676f94b5125b67effad3a7de96`](https://github.com/NVlabs/Sana/tree/396a5300acef00676f94b5125b67effad3a7de96/models/streamrender_h3)。权重仓库查询版本为 `9f81b42fb6bac3509ccc6ebf4cb6c8aec7469c62`，最后修改时间 2026-10-11。

## 硬件、环境及适配边界

| 项目 | 核实结果 | 对本机的含义 |
| --- | --- | --- |
| 本机 GPU | 只读 `nvidia-smi --query-gpu=name,memory.total,driver_version` 返回 RTX 3060、12,288 MiB、驱动 595.79 | 未运行推理，也未以 Windows CIM 的截断 AdapterRAM 推算显存。 |
| 官方部署 | 8 张处于同一 NVLink 域的 GPU；发布性能在 8×GB200 测量。DiT 每卡保留完整权重，分的是 token/attention 工作，不是简单把模型大小除以 8 | 单张 3060 与该方案不匹配。Qwen 配置另外使用 FSDP/CPU offload，不能因此误称 DiT 已支持低显存卸载。 |
| 资产空间 | 完整资产约 206.87 GB；重构 backbone 另需约 66.28 GB | 主线程本轮读到 D 盘约 139.66 GB 可用，完整资产本身已超出；这个数是瞬时空闲量。不能靠改分辨率解决权重容量。 |
| 发布环境 | Python 3.11、Torch 2.9.1+cu128、Triton 3.5.1、Node 22.20.0；还需 FA4 CuTe、CUTLASS DSL 等内核依赖 | 有 CUDA 显卡不等于具备这套兼容环境；`requirements.txt` 单独安装不完整。 |
| 操作系统 | 官方启动使用 Bash、torch.distributed、NCCL/NVLS；集群脚本使用 Slurm。未找到本配置的原生 Windows 验证或安装流程 | 将其视为所示 Linux/集群部署流程；不能承诺 Windows 或 WSL 可直接运行，更不能把 WSL 当显存扩容。 |

环境依据：[README](https://github.com/NVlabs/Sana/blob/396a5300acef00676f94b5125b67effad3a7de96/models/streamrender_h3/README.md)、[精确测试环境](https://github.com/NVlabs/Sana/blob/396a5300acef00676f94b5125b67effad3a7de96/models/streamrender_h3/configs/environment-tested.json)、[运行配置](https://github.com/NVlabs/Sana/blob/396a5300acef00676f94b5125b67effad3a7de96/models/streamrender_h3/configs/runtime.json)、[启动脚本](https://github.com/NVlabs/Sana/blob/396a5300acef00676f94b5125b67effad3a7de96/models/streamrender_h3/scripts/launch_local.sh)。

## 性能数字不能当作输入到显示延迟

官方测量 JSON 给出：encoder P50 **16.669 ms**、render P50 **217.963 ms**；原运行 decoder P50 **36.535 ms**，原运行 RGB-ready TPOT P50 **272.726 ms**。后续 decoder **23.8 ms** 来自另一轮更新，官方明确注明各阶段中位数**不能相加成新的实测端到端 TPOT**。[原始测量 JSON](https://nvlabs.github.io/Sana/Sol-Engine/StreamRender-H3/assets/streaming_render_latency_v6.json)

RGB-ready TPOT 也不是鼠标到屏幕的实测延迟：还涉及收集分块、上传、队列、JPEG 传输及浏览器显示。`runtime/worker.py:106` 记录 `oldest_input_to_rgb_ready_ms`，起点是服务器已接收帧时间，终点仍在浏览器显示之前；不能据此声称完整 motion-to-photon。没有核实到当前游戏或 RTX 3060 的该类基准。[worker 源码](https://github.com/NVlabs/Sana/blob/396a5300acef00676f94b5125b67effad3a7de96/models/streamrender_h3/runtime/worker.py)

官方模型目前只在赛车数据、车后第三人称视角上训练与测试；语义输入有固定的 13 类颜色。接口可推广不等于发布权重已会绘制步兵、舰艇、水下、轨道或 RTS 俯视画面。它会生成整个外观，不能保证武器轮廓/识别细节严格对应游戏命中模型。官方还明确将覆盖其他游戏列为后续工作。[项目页：限制与架构](https://nvlabs.github.io/Sana/Sol-Engine/StreamRender-H3/)

## 官方真实接口：HTTP，不是 WebSocket

以下只记录未来研究边界，不在本轮搭服务。协议来自固定提交的 [runtime/server.py](https://github.com/NVlabs/Sana/blob/396a5300acef00676f94b5125b67effad3a7de96/models/streamrender_h3/runtime/server.py) 与 [runtime-client.js](https://github.com/NVlabs/Sana/blob/396a5300acef00676f94b5125b67effad3a7de96/models/streamrender_h3/coding/threejs-racing/src/runtime-client.js)。

| 请求 | 实际契约 |
| --- | --- |
| `GET /health` | 返回 `ready/error/backend`。GPU 暖机未完成时不能开始会话。 |
| `POST /session` | JSON 配置，强制 `fps:24,width:1344,height:768`；返回 `{id}`。每个 worker allocation 仅支持一个活动会话。 |
| `POST /frame/{id}/{index}` | PNG 二进制，1344×768；`X-Controls` 为 JSON，包含与 URL index 一致的 `frame`。index 必须等于下一帧，不可乱序跳号。 |
| `GET /status/{id}` | `ready/closed/error/accepted_frames/queued_frames/metrics`。 |
| `GET /stream/{id}` | HTTP `multipart/x-mixed-replace; boundary=render`，每段 JPEG，含 `X-Session/X-Chunk`。单 viewer；不是 WebSocket、WebRTC 或浏览器本地神经渲染。 |
| `POST /close/{id}` | 关闭会话。 |

默认 worker `127.0.0.1:8765`，前端 Vite `5191`，前端 `/runtime/` 代理到 worker。配置输入队列上限 48 帧、输出 2 chunks、请求体上限 12 MiB。满队列返回 429；官方客户端等待 25 ms 重试**同一帧**，服务端响应还带 `Retry-After:1`。不能套用“随便丢旧帧”破坏时间序列。当前浏览器反馈只发布 RGB，虽推理契约仍包含音频组件。

`BACKEND=passthrough` 只测传输，不是 H3 推理。开发服务默认 loopback，无现成公网鉴权部署契约；不应为了试效果直接公开端口。未来若研究远端适配，应先解决场景训练、服务来源、许可、延迟、认证和断流回退，不应让视频生成结果拥有游戏规则、视野或伤害判定。

## 许可：具体地域及组件分别核对

已读取官方权重的 [LICENSE](https://huggingface.co/Efficient-Large-Model/StreamRender-H3/blob/9f81b42fb6bac3509ccc6ebf4cb6c8aec7469c62/LICENSE) 与 [NOTICE](https://huggingface.co/Efficient-Large-Model/StreamRender-H3/blob/9f81b42fb6bac3509ccc6ebf4cb6c8aec7469c62/NOTICE)。H3 主体、蒸馏 decoder 和 audio codec 遵循 MiniMax H3 Community License；不是整体 Apache/MIT。地域条款原文为：

> “Excluded Territories” means the European Union, the United Kingdom, the Republic of Korea and the United States of America.

即排除欧盟、英国、韩国、美国；**此列表没有中国**。协议 V.4 还覆盖区域外对作品或输出的使用、修改、分发、展示；不是仅限制服务器摆放位置。另有再分发通知、商业界面署名、年收入超过 2,000 万美元的另行授权条件，以及 AUP 中 military purposes 等使用限制。娱乐战争游戏是否落入特定用途解释，不能仅凭题材武断判定；真要采用模型时需具体核对发布用途与地域。本轮仅借鉴通用设计，不部署这些权重。

Qwen 保留 Apache-2.0；TAE 保留 MIT/作者署名；部署胶水代码 README 标为仓库 Apache-2.0，赛车资产另有 TORCS/Free Art License 通知。代码许可不能覆盖模型或第三方赛车素材。[官方权重说明](https://huggingface.co/Efficient-Large-Model/StreamRender-H3)

## 本机立即可借鉴的改进

这些是根据官方设计迁移到当前游戏的工程建议，不是把 H3 CUDA 内核移植到 JavaScript。

| 官方方法 | 本项目落点 | 验证与失效边界 |
| --- | --- | --- |
| 不变条件缓存，精确 guard；会话重启清缓存 | `src/personnel-animation.js:update` 的稳定静止姿态缓存，已实现并验证 | 48 个角色/阵营变体；医疗兵独特停姿、转向、起步、跳跃落地、传送、重新显现和实例释放均要正确。只跳过已稳定且依赖未变的计算。 |
| 持久缓冲区、避免重复分配/搬运 | `src/battle3d.js:updateFog` 复用像素缓冲，仅可见/探索/模式等依赖变化时重画上传；已实现并验证 | 迷雾像素完全一致，单位进入视野立即更新；vision 增益、demo、换局/读档与 context restore 必须失效。不得用低频缓存泄露或滞后敌情。 |
| 按真实形状与实际瓶颈测量，保留正确性门槛 | 现有 `battle3d.stats`、单兵/拥堵基准及原生 EXE 检查 | 固定地图 seed、单位数、分辨率、相机路线和暖机；比较 CPU P50/P95/P99、帧时间、绘制/纹理更新数和分配量。画面及模拟结果不过关则回退，不承诺未经测量的提升百分比。 |
| 序列编号、有限队列、明确重置 | 未来截图/回放/研究导出管线 | 不在当前单机主模拟上增加网络等待；异常取消必须清本次任务缓存，旧局结果不可覆盖新局。仅确有异步队列时应用。 |

缓存方法直接依据 [render/optimizations.py](https://github.com/NVlabs/Sana/blob/396a5300acef00676f94b5125b67effad3a7de96/models/streamrender_h3/render/optimizations.py)：文件明确采用精确相等条件保护值并在会话间重置。当前低风险路线是消除相同状态的重复工作，保留本地 Three.js 实时画面、真实模型和现有命中机制。

## 本次验证记录

已读官方网页、固定提交的 README/config/server/client/worker/启动脚本/优化源码，以及 HF 的许可和模型元数据；仅 GET 文本。只读查询本机显卡信息。未下载模型、未执行远端程序、未安装依赖、研究阶段研究阶段未调用推理或 GPU 应用；报告中的官方性能不等同本机性能。


## 本地实现与验收结果

已独立实现稳定静止骨骼缓存、动画临时向量复用、模型部件查找缓存、第一人称无用投影跳过及迷雾缓冲/变化上传。交叉审查核对换局、上下文恢复、实例替换和缓存失效，未发现发布阻断。没有导入 H3 模型、远程服务或神经渲染依赖。

完整 CPU 测试 492/492；48 变体 × 199 帧的 5,129,424 个数值与旧实现最大误差为 0。真实 Windows EXE 验收覆盖 77 种驾驶、48 单兵、FPS 输入与导入资源。RTX 3060、3440×1440、128 人场景平均 CPU 绘制提交静止 6.17→3.98 ms、半数行走 5.66→4.11 ms；实际帧率均约 50 FPS，不宣称帧率或画质提高。场景 8 秒、其他 GPU 应用仍在运行；更多范围见 [验收记录](../v3.8.1-validation.json) 与 [前后原始样本](../render-cache-desktop-report.json)。
