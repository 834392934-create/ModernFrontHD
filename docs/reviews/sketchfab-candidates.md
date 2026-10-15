# Sketchfab 模型候选核查

核查日期：2026-10-16。执行者：sketchfab_scout agent。范围：防御设施、基地工业建筑和卫星。仅研究，未修改或导入游戏资产。

## 结论与证据边界

- 已核查 **11 个模型的官方 API 元数据及原站公开预览图**，其中 8 个列为可继续评估的候选，2 个淘汰，1 个已在项目使用。
- 优先评估 **Lemper_Studio 的 Phalanx CIWS** 和 **KIFIR 的 Factory Low-Poly**；前者适合近防塔，后者可提供工厂/电站成套建筑。Patriot 拖架也有较好的候选，但需要进一步核原始来源和改型外观。
- 10 个新资产的官方 `/v3/models/{uid}/download` 接口，本次匿名请求全部返回 **HTTP 401 Unauthorized**。`isDownloadable=true` 只说明作者启用下载，不表示当前无需账户即可取得文件。没有用预览器提取网格、贴图或绕过下载认证。
- 因未取得源文件，**包体大小、贴图分辨率、节点层级、可转动零件、文件完整性均未验证**。下表面数/材质数/贴图数来自官方 API，是上传模型的统计，不是本项目导入后的实测数。
- 所有 8 个候选的 API 当前均为 `license.slug=by`，即 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。需要保留作者、来源、许可及修改说明。作者声明不能替代对素材原创来源的核验。
- 预览图只用于视觉研究，位于被 Git 忽略的 `.tmp/references/sketchfab/`，不随游戏发布。此文档不把作者模型当作真实装备照片，也不把预览图当成全视角验收。

## 候选清单

数字依次为三角面、材质数、贴图数。所有候选 API 的 `animationCount=0`；这不证明零件不能转动，只说明没有上传动画片段。

| 优先级与用途 | 模型 / 作者 / 来源 | 官方统计 | 亲自看图后的判断 | 取得文件后要做的工作 |
|---|---|---:|---|---|
| P1：近防塔主体 | [Phalanx CIWS](https://sketchfab.com/3d-models/phalanx-ciws-b811949a2ba543aab5fde70ecdf0bf6d)，Lemper_Studio | 42,949 / 3 / 2 | 白色雷达圆筒、右侧光电组件、黑色炮束、开口炮架、下部弹鼓和维修柜层次完整。8 个候选里最接近本项目对近防设备的精细化要求。 | 对比真实 Phalanx 的具体改型；验证雷达/炮架独立节点及转轴。地面版本另做支腿、发电/电控箱和平台，不把船用底座直接冒称完整 C-RAM。 |
| P2：近防塔轻量备选 | [Phalanx CIWS (Close-in Weapons System)](https://sketchfab.com/3d-models/phalanx-ciws-close-in-weapons-system-6c038d4e66634fc4832be5b2d8697a0d)，DenisGLabrecque | 10,562 / 5 / 0 | 主轮廓清楚，有炮束、雷达筒、弹鼓、回转座；面板、传感器细节少，作者明确称略风格化。比第一项更适合远景或低配等级。 | 合并同类材质，检查炮束是否为独立网格；可作为 LOD 方向，不能直接宣称是第一项的同源 LOD。 |
| P2：防空阵地 | [MIM-104 Patriot Air Defense System](https://sketchfab.com/3d-models/mim-104-patriot-air-defense-system-95e1e402426f4ddcb543af7a0455cf05)，Muhamad Mirza Arrafi | 11,612 / 2 / 3 | 预览可见双轴拖架、展开支腿、四联矩形发射箱、俯仰支架与器材柜；有磨损材质，RTS 轮廓较清楚。图中弹头露出箱口，需与选定运输/待发状态的实照再核。 | 核原创来源和箱口状态，不能仅凭标题认定准确 PAC 改型。移除不符合选定阵营/时代的装饰字样，验证发射架俯仰轴。 |
| P1：电站/工业组团 | [Factory Low-Poly](https://sketchfab.com/3d-models/factory-low-poly-7d3bc4d7ce6d48d9986a664d48f3cca1)，KIFIR | 6,790 / 4 / 20 | 工业厂房、管道、穹顶装置和独立双曲线冷却塔组合；建筑体量和屋顶设备可读，墙面有纹理变化。作者描述定位移动/等距策略游戏。 | 20 张贴图可能包含多个通道，需实际检查分辨率和磁盘大小。工厂、冷却塔分开注册，不将冷却塔视作任何电站必备结构；保留合理管线。 |
| P2：维修/机库棚架 | [Hangar](https://sketchfab.com/3d-models/hangar-bad8c6349749480d85ee58f8d1a9355b)，Matvis | 4,310 / 1 / 0 | 实际预览为开放式钢结构棚，斜屋面、柱间 X 撑及屋架明确；不是封闭抗爆机堡。作者公开外形尺寸 12 × 21 × 5.5 m。 | 可作为维修棚基础；需加工作台、吊装轨道、配电与地坪。本项目采用游戏尺度不承诺工程尺寸。页面评论有导入问题报告，必须先做文件兼容验证。 |
| P2：工业配件库 | [Factory Assets](https://sketchfab.com/3d-models/factory-assets-9d8578c8be8d42569101bca81c8cd845)，TeenWolf | 46,140 / 1 / 0 | 多栋厂房、烟囱、水罐、栅栏、塔架、风机/发电设备组合；形体简化但用途清楚，可以丰富基地空地和附属设施。作者说明无贴图和 UV。 | 需按独立构件拆分，检查颜色存储位置；给近景设备补非重复表面细节。不要把整包 46k 面放进每一座建筑。 |
| P2：侦察/通信卫星外观 | [Simple Satellite Low Poly Free](https://sketchfab.com/3d-models/simple-satellite-low-poly-free-f23b484cda664f1cb91b4f62ea5ef8bf)，DjalalxJay | 15,182 / 5 / 5 | 长圆柱舱体、两块细分太阳翼、端部抛物面天线；机械舱连接和太阳翼纹理较清楚。图像更像通用通信卫星，不能称真实军用侦察型号。 | 核太阳翼/天线转轴及背面，按本游戏无武装角色加入原创光学载荷；如用作参考而另建模型，应仍将原作者作品与实物来源分开。 |
| P3：机场外围建筑 | [Runway and Hangar](https://sketchfab.com/3d-models/runway-and-hangar-cf6a8925f591421a9b82c28c61ad4c47)，Derek.Dziedzic | 41,846 / 9 / 14 | 拱形金属机库、跑道、围栏完整，图中仓门关闭；表面有风化，适合作为机场外围或小机库，非现代军用加固机堡。 | 作者说明门可打开，但 API 无动画片段，须验证门节点。删去重复跑道地块，保留门/拱顶/栅栏；优化 9 材质并检查透明围栏排序。 |

## 剔除、降级及重复资产

1. [MIM-104 Patriot Missile System / Snicks Game Development](https://sketchfab.com/3d-models/mim-104-patriot-missile-system-163622db973542ffbf697490d1bc571f)：21,214 面、15 材质、2 贴图，CC BY、允许下载。**不列为真实 Patriot 候选**：亲自看图发现模型是夸张的四轴车载裸露火箭轨架，与 Patriot 的箱式拖曳发射站明显不同。不能因为名称正确就通过。
2. [Radar Station - WIP / Ingoldt](https://sketchfab.com/3d-models/radar-station-wip-d9657bf768ce43f5b20411b036012a9d)：15,308 面、1 材质、0 贴图，CC BY、允许下载。图中为无材质的箱体组和小抛物面天线，底座结构不清；作者也标 WIP。**不能改善当前建筑细节，暂不采用**。
3. 用户提供的 [T-90M / minehffd](https://sketchfab.com/3d-models/t-90m-2e31a3cf16b04f0180b9387df5198c9a) 与项目 `assets/models/t90m-LICENSE.md` 中 ID 完全相同。官方 API 为 205,998 面、16 材质、54 贴图；本项目使用的是有完整来源记录的 122,516 面衍生文件，统计不同已有解释。**不重复下载，也不把它换色用于印度 T-90S**。

另检索到的 150 万面电站扫描、数百万面雷达遗址、NC 限制工业包、NoAI 或付费产品不进入本次集成候选。未将它们作为生成输入。

## 建议的集成门槛

1. 取得作者公开提供的源文件，或可核对作者/模型 ID/许可的合法公开镜像；记录原始 SHA256。没有这样的文件就保留候选状态，不承诺“已导入”。
2. 检查实际 GLB/FBX/Blend 中网格、贴图、动画和外部依赖；确认无隐藏无关素材。以离线自包含 GLB 为交付格式，模型失败时明确报告，不把程序回退当导入成功。
3. 在保持关键轮廓的前提下，普通建筑目标先控制在 15k 三角面、1–4 个材质；近防主体容许约 45k 面，远景另做 LOD。以上为本项目建议预算，不是已实测性能保证。
4. 实装炮塔、发射架、机库门和太阳翼之前检查转轴。主战场、检视器、缩略图共享同一个模型源。
5. 验证五视图、战场远景可识别性、离线加载、阴影、轮廓遮挡、阵营色区域和实际原生程序性能。现实外观仍需与实物照片对齐；Sketchfab 名称、面数、许可均不是还原度证明。

## 本地研究记录

`.tmp/references/sketchfab/candidates.json` 保存 11 项汇总；每项 `{uid}.json` 为官方 `https://api.sketchfab.com/v3/models/{uid}` 响应，`{uid}.jpg` 为公开预览图。均仅研究，不进入 Git 和发布包。正式采用时将对应必要来源证据与许可单独放入 `assets/models/`。
