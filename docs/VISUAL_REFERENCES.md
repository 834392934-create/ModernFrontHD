# 图片、技能与外观依据（2026-10-16）

本次没有从商用游戏提取模型。程序模型按公开照片重画外形，另选用有原作者署名许可的独立美术资产；出处与变更见 `THIRD_PARTY_NOTICES.md`。模型比例近似，非测绘复刻。游戏单位以屏幕辨识度缩放，不是所有军种统一的现实比例。

## 实物优先的第二阶段

用户要求多个agent逐型找图对比后，新增独立的坦克、车辆、航空、海军模块；不再把同一个模型换色作为五国装备。审查记录：[地面](reviews/ground-reference-review.md)、[航空](reviews/air-reference-review.md)、[海军/防御](reviews/naval-defense-reference-review.md)。每条记录区分真正查看的图片、只检索到的文字、配置差异与剩余问题。

本轮重建49个现实阵营装备槽位：25地面、10航空、14海军。相同真实型号可跨阵营复用，例如美韩F-35A/AH-64。另修正C-RAM、通用防空阵地、警戒雷达三类设施；后两者不冒充某个真实型号。

概念装备此前已有的占位模型继续可玩，但**本轮冻结进一步生成**，直到已知装备完成全部视觉验收。下表“游戏处理”是旧版本概念依据，不代表本轮已审核通过或再次生成。所有“photo-referenced”标记仅表示用了照片参考，不能代表照片级模型终验。

完整范围和逐项实图入口见 [49个实物槽位](reviews/KNOWN_EQUIPMENT.md)、[全部单位/设施/能力清单](reviews/model-inventory.json)；统一判据见 [验收顺序](reviews/ACCEPTANCE_POLICY.md)。大规模渲染测试没有自动将其中任何项改成终验通过。

已接入的伯克级采用Yi Tsung Lee / WTigerTw的CC-BY美术资产，美韩AH-64采用Andrew Swihart / ArionDigital的Longbow参考模型。两者都保留来源和许可，模型作者页面与真正的实拍来源分别记录，不能相互替代。AH-64主桨涂层依据实拍改为深灰，根部连杆与桨毂保留原材质。

俄罗斯T-90M采用minehffd原站标注CC-BY的优化衍生资产，原站API、文件内署名及外形已交叉核对。保留独立车体/炮塔/炮管，未用来替换T-90S。许可链、镜像历史修订、构型与材质局限见 `assets/models/t90m-LICENSE.md` 和 `reviews/ground-asset-candidate-review.md`。

K2补充亲眼查看制造商[产品页](https://www.hyundai-rotem.co.kr/en/business/defense/details.do?productCt03=defense0101)内 `img-model-k2-01.jpg` 和 `img-model-k2-02.jpg`：中央宽炮盾/炮根、侧储物篮、灯罩、量产与展示配置差异。研究副本未随游戏再分发。

## 已实际查看的照片

- [M1A2，DVIDS，Sgt. Nathan Franco，2019-10-04](https://www.dvidshub.net/image/5852204/abram-tank-operations)：页面标记 PUBLIC DOMAIN。本地 `assets/references/m1a2-dvids.jpg`，用于参考浏览；没有美国军方背书。重点：低矮车体、宽楔形炮塔、履带外露比例、深色橡胶轮胎、观察窗。
- [99A，中国国防部/中国军网](https://www.mod.gov.cn/gfbw/jmsd/4806118.html)：照片只存于忽略的研究目录，未纳入发布。重点：六对负重轮、楔形模块炮塔、侧裙、光学模块与数字迷彩。公开照片不意味着可自由再分发。
- [J-20，中国军网，2024 航展适应性训练](https://eng.chinamil.com.cn/MEDIA/PhotosChina/16350632_4.html)：研究照片未纳入发布。重点：鸭翼、双发动机、大三角翼、外倾双垂尾。旧版无尾通用模型已不用于 J-20。
- [F-35A，美空军](https://www.aetc.af.mil/News/Article-Display/Article/3980238/cadets-take-flight-afrotc-cadets-soar-aboard-c-17-at-luke-afb/)：单发、梯形主翼、双垂尾；模型仍是原创外形近似。
- [K2，Hyundai Rotem](https://www.hyundai-rotem.co.kr/en/business/defense/details.do?productCt03=defense0101)：低轮廓焊接炮塔与六对轮外形参考。

## 六代机证据边界

| 阵营 | 已找到证据 | 游戏处理 |
|---|---|---|
| 美国 | [USAF F-47 官方艺术图](https://www.af.mil/News/Art/igphoto/2003674021/) | 标注“官方概念图参考”，不是完整公开实机外形；参考无尾、前部翼面并推演不可见部分 |
| 中国 | [公开媒体展示的新型无尾机观察照片](https://asiatimes.com/2025/11/chinas-j-36-evolving-fast-to-outfly-slower-advancing-us-rivals/) | 摄影身份、具体型号和代际未经此项目独立确认；采用宽菱形与三喷口的观察外形研究，保留“未确认/推演”标签，不把 J-36 当作已确认正式型号 |
| 俄罗斯 | 检索 Rostec/UAC，未取得可验证的六代机完整实机图 | 原创远程无尾概念，不宣称 MiG-41 真实外形 |
| 印度 | [HAL 年报列举 AMCA 项目](https://hal-india.co.in/backend/wp-content/uploads/2024/07/AR24English.pdf)；未取得可信六代机实机图 | 原创未来概念；AMCA 不被当作已确认六代机 |
| 韩国 | [KAI 2024 可持续发展报告](https://m.koreaaero.com/EN/data_file/2024_KAI_Sustainability_Report.pdf)提及未来第五/第六代研发方向；未取得可核验六代实机图 | 原创无尾双发概念；KF-21 不冒充六代实机 |
| 帝国 | 战锤虚构世界 | 原创科幻机，不存在真实装备图片 |

## 技能与性能资料

- 本地 `three-webgl-game`：模拟与渲染分离、DOM HUD、相机和上下文恢复。
- 本地 `web-3d-asset-pipeline`：统一朝向、材质复用、部件合批。原创模型采用确定性几何工厂；授权外部模型合批后用自包含GLB及base64接入，支持纯离线。不需要运行时网络或DRACO解码服务。
- 本地 `game-playtest`、`ui-build`：实际输入、截图、控制台和响应布局验证。
- [GitHub threejs-perf](https://github.com/PlayableIntelligence/game-creator/blob/main/skills/threejs-perf/SKILL.md)：参考实例化与绘制调用测量方法；没有复制其数字作为本项目结果。
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)、[阴影文档](https://threejs.org/manual/pages/shadows.html)。
- [Poly Haven Forest Ground 04](https://polyhaven.com/a/forest_ground_04)，Rob Tuytel / Rico Cilliers，CC0。纹理与许可来源随项目记录。

## 与参考仍有差异

这是游戏比例模型：未对公开照片做摄影测量；部分车辆、舰艇和防御设施为同类通用结构；未完成所有具体型号的精确外观。不会用多边形数量或组件数代替真实程度评价。

## M1A2 SEPv3 批次补充

主实现者新增查看 [DVIDS 6598991](https://www.dvidshub.net/image/6598991/m1a2-sepv3-main-battle-tank)，Sgt. Melissa Lessard，2021-04-11，页面明确标记SEPv3及PUBLIC DOMAIN。该图为侧后方射击照片，火光遮挡前部，因此只用于侧裙、炮塔后部、顶部武器站及携行物外观交叉核对，不能推断遮挡区。追加了顶部遥控武器站轮廓与后篮软包，保留原创网格。

GitHub候选检索发现一份题名“Abrams M1A2 SEPv3”的CC-BY模型，但镜像自身更正其为Leopard 2A5；本项目未采用。不能只凭文件名、许可证标签或高面数替换真实型号。
