# 坦克合法资产候选与最终程序模型质量审查

审查日期：2026-10-16。先完成研究和隔离预览；在主任务明确合理核验门槛后，继续完成 T-90M 独立导入模块与离线验证。未修改共享 index/gallery 接线。

## 结论

**T-90M 候选完成原站许可、文件署名、原页外形对应、离线渲染和炮塔独立旋转核验，已准备独立模块接入。** 原站标注 CC-BY 4.0，保留核验记录，不作原创绝对保证。没有发现实际来源或型号冲突；作者未写履历本身不作为拒绝理由。M1、K2 有值得追踪的作者站候选；99A、T90S 没有满足要求的直接替换文件。

此前的“轮廓初审通过”仅表示五辆程序模型已经有类别与型号的主要区别，不表示达到用户要求的近似真实实物或《坦克世界》近景质量。本报告的 P1 指阻塞这一更高交付目标的问题。

## 候选列表

|目标/候选|作者与原站许可核实|面数/材质证据|离线情况及决定|
|---|---|---|---|
|M1 Abrams，Artem Goyko|[作者上传页](https://sketchfab.com/3d-models/m1-abrams-2577a4eccbc74b2da6dba5bfd09b7511)；官方 API 为 CC-BY 4.0，作者 API 链接至 ArtStation/theangas|API 40,170 三角面、21,086 顶点；实际看了站点缩略图，有磨损贴图、灯罩、车体舱盖、履带；未取得二进制，材质数未知|原站下载 API 返回 401，未绕过登录。Open3DModel 转存页另标 NC/个人使用且顶点数不一致，拒绝该镜像。缩略预览细节优于当前 M1，但不能认证为 SEPv3，也不能作为已取得资产|
|T-90M，minehffd|[作者上传页](https://sketchfab.com/3d-models/t-90m-2e31a3cf16b04f0180b9387df5198c9a)；官方 API CC-BY 4.0|原站 205,998 三角面、109,019 顶点；镜像优化版实际 122,516 三角面、116 meshes、15 材质、42 嵌入图像|已取 GLB 并离线加载、五视图预览。细节明显更好；对应原页外形与署名，无实际来源冲突；已转换合批并选择性校正漆面，最终23网格，完成独立加载器|
|T-90（非直接 T90S），alexxx_xarchenko|[作者上传页](https://sketchfab.com/3d-models/t-90-9bb8af8876a6478aa92089eff058d4db)；API CC-BY 4.0；描述明确是学校课程作业并链接本人作品集|API 304,272 三角面、169,533 顶点；实际看缩略图，灯具/线缆/履带/甲板细节显著更多|下载需登录，未取得文件；预览具有 T90A 风格的双前照射器，不能直接替代印度 T90S 的锁定配置|
|K2，jjj0605|[作者上传页](https://sketchfab.com/3d-models/k-2-black-panther-tank-8f79997ad7e14deea07a5a60c8af5308)；API CC-BY 4.0|343,624 三角面、181,852 顶点；实际看缩略图，中央炮盾、尾篮与履带更细，当前预览为统一色材质|未取得二进制，无法检查完整材质、贴图、节点及来源；仅保留候选，不宣称可直接使用|
|ZTZ-99A|本轮未找到可核实独立创作且有 CC-BY/CC0 的高细节离线 glTF/GLB|无合格文件|保留缺口，不能用商业游戏拆模填补|

以上计数中，API 数值与实际文件数值分开记录。原站标记 downloadable 并不表示当前无需登录即可取得文件；缩略图好看不等于离线渲染、动画与性能已经通过。

## T-90M 隔离文件审计

- 原作者标识：minehffd，Sketchfab UID `2e31a3cf16b04f0180b9387df5198c9a`。
- 原站 API：<https://api.sketchfab.com/v3/models/2e31a3cf16b04f0180b9387df5198c9a>。响应已存 `.tmp/asset-candidates/ground/t90m-minehffd-metadata.json`。
- 镜像文件：[公开 Git 历史中的 GLB](https://raw.githubusercontent.com/Kevin-Liu-01/Claude-of-Tanks/255aff4087401f9a4297ef407c21e85ab7ec0728/public/models/tanks/t90m_minehffd.glb)。当前仓库树已无此文件，故明确记录旧提交，不误称 HEAD 下载。
- 本地：`.tmp/asset-candidates/ground/t90m-minehffd-mirror.glb`，14,157,340 bytes；SHA256 `3f36c5eabd16dd0f8c0a67e2c4d26198c7d41198b99b0f681a4e938cff8ac9b0`。
- GLB 内 `asset.copyright` 与 scene extras 都写同一作者、源编号、CC-BY-4.0；generator 是 Khronos glTF Blender I/O v5.2.39。这些证明镜像内的署名记录一致，不能单独证明其原创权利。
- 节点含 `Hull chassis`、`Driver Hatch`、`Main barrel`、`Turret` 等语义名；材质含 Front hull、Wheels、Front turret ERA、12.7mm Kord 等，未见当前文件采用 hash DDS/已知游戏 LOD 节点体系。
- 使用 `EXT_texture_webp`；多数材质有 basecolor、normal、metallic/roughness 图。`Gun mantley` 无 basecolor 图，Thread 与 Turret basket 无 normal 图，质量并不完全一致。
- 预览脚本：`.tmp/asset-candidates/ground/review-glb.cjs`；审计 JSON：`t90m-file-audit.json`。全部图像嵌入 GLB，能在本地 GLTFLoader 中渲染，不依赖远程贴图。

实际已看本地渲染：`t90m-perspective.png`、`t90m-side.png`、`t90m-front.png`，另保存 rear/top。前方为模型 -X；截图文件已按实际车头方向校正。

与当前程序 T90M 相比：其轮毂/履带链节、机枪站、甲板格栅、尾部油桶、炮塔后篮、舱盖、灯具、贴花和粗糙度变化明显更丰富。仍有炮盾单色、细节密度不均、镜像做过减面与重组的问题；战场大编队压力测试由主任务统一进行，独立炮塔旋转已通过下述验证。

**来源决定：依据公开原站 CC-BY 标注、文件内同一署名/源编号、原页与文件预览对应关系接受使用，保留证据，不作原创绝对保证。** 作者 API 简介和外部作品集为空；这限制了可核实的创作过程，但不是抄袭证据。已把镜像与原站缩略图实际并排核对：车首颊甲、车顶武器站、尾部油桶与格栅、侧面阅兵图案一致；文件使用语义节点及材质名，未发现商业游戏提取声明或实际冲突。镜像优化导致面数下降已经单独说明，不把第三方仓库的文字判断当作唯一证据。

## 已完成的独立导入与验证

- 新增 `src/models-imported-ground.js`，统一 `WarImportedGround.ready/status/errors/loaded`，成功后发 `war-models-ready`，仅注册 `tank_rus`。
- 离线资源 `assets/models/t90m.glb` 与等值 `t90m-data.js`；原站 API 快照、许可与改动说明、转换与验证记录同目录。
- 转换器 `tools/convert-t90m.cjs` 保留全部 122,516 三角面和42图片，将116网格按材质/顶点属性/运动组合批；最后加入选择性漆面修正后为23网格。15个原材质定义保留，另有隐含默认材质和6个漆面派生材质，文件共22个材质。
- 源 -X 朝向转为游戏 +X；车体归一化、贴地；炮塔与炮管各有独立 pivot，轮带/车体保持静态。
- 使用 Chromium 离线模式加载 file:// 测试页：状态 ready、loaded仅tank_rus、23个网格均 preserveMaterial，页面错误为0。
- 炮塔偏航90度后：车体矩阵完全不变、炮塔 pivot 世界坐标不变、炮管中心移动约5.03游戏美术单位，炮管仍是炮塔子节点；另实际看了60度转炮截图。零角外包围尺寸为 `[10.17596,3.05365,3.88223]`，转炮90度后为 `[7.7,3.05365,8.92067]`，两者已分字段记录，不能把转炮后的跨度当作车体宽度。
- 人为删除嵌入数据：状态 failed、有明确错误、俄方程序模型保留。印度tank_ind继续使用原程序模型。
- 最终预览 `.tmp/asset-candidates/ground/t90m-import-{perspective,front,rear,side,top,yaw60}.png`。标准五视图均恢复炮塔零角后拍摄；yaw60单独保存。游戏共享脚本接线及大编队压力测试交主任务统一执行。

### 最后漆面校正

实际再看 `.tmp/references/ground/t90m.jpg` 展示实拍，确认参考车辆为绿色低金属漆面，源资产主要灰色观感与其不同。只对可靠分区的车体、炮塔、ERA和炮盾外漆处理：线性RGB乘子 `[0.62,0.72,0.46]`，metallicFactor=0.05，roughnessFactor=1；炮盾保持原有橄榄色因子。保留全部原图及粗糙度细节，只新建派生材质并按节点替换。车灯、驾驶员潜望镜与大甲板原本共用材质，因此显式挑选21个已知装甲节点，未用整材质/整车染色。履带轮组、侧裙阅兵贴花、机枪和混合观瞄件不变；不能可靠单独分出的前部灰色板件仍保留，整体并非完整绿色实车涂装复刻。已重做离线/转炮/回退验证并实际查看修后透视图。最终输出SHA256为 `58a8ed5339168757d5ead282639fc74ac4f880cf0b1edae77170a5b943a4ecce`。

## 明确排除的结果

|结果|排除原因|
|---|---|
|[42manako Chinese ZTZ-99A](https://sketchfab.com/3d-models/chinese-ztz-99a-4599114a3a8946fa9e7c3ab8386739de)|虽然页面标 CC-BY，正文明确来自 War Thunder/WT Live，不能据上传者标签取得原游戏资产权利|
|[42manako T-90M3](https://sketchfab.com/3d-models/russian-t-90m3-e2155840ad704692b66119f8a5274220)|正文明确 Call to Arms 拆模；拒绝|
|[KojfDiscord K2 Armored Warfare](https://sketchfab.com/3d-models/k2-black-panther-armored-warfare-af7a16423faa4530953fa801caace65a)|标题直接表明商业游戏来源；拒绝|
|[KojfDiscord T-90M War Thunder](https://sketchfab.com/3d-models/t-90m-war-thunder-e967f6b302fb4de1a39ef06298c7296a)|标题表明商业游戏来源；拒绝|
|[42manako T-90A](https://sketchfab.com/3d-models/t-90a-d65cc8e8ac6d42598c170ec49ce2846b)|明确 Combat Mission 拆模，并且 NC；拒绝|
|dannzjs/Claude-of-Tanks 所谓 Abrams|父任务已核实实际外形为 Leopard 2A5，继续排除，不重新采信文件名/归属表|
|[OpenGameArt Abrams / Sketlux](https://opengameart.org/content/abrams-tank)|CC0 的 Freeciv 模型改编，直接文件仅旧 .blend；不是已经核实的高细节 glTF/GLB候选。未下载，不借别人的评价宣称自己做过离线质量判定|
|Gerhald3D K2、CGTrader/Fab 付费或其他标准许可模型|不符合本轮限定的 CC-BY/CC0 门禁，未购买、未下载|

## 当前五辆坦克的真实感缺口

本轮重新实际查看 `screenshots/model-review/tank_{chn,usa,rus,ind,kor}-perspective.png`。下面表格评价的是导入前的五辆程序模型；俄方T90M后续导入已经显著改善这些细部，不能继续用该行形容新导入资产。其它四型仍适用。此前各型号已有正/侧/俯等审查记录，真实图片来源见 ground-reference-review.md。只针对游戏外观，不推断装甲内部、未公开性能或工程结构。

|型号|P1：达到近似实物仍需优先解决|P2：轮廓后进一步完善|
|---|---|---|
|99A|炮塔侧与顶附件仍由通用圆筒/方盒组成，观瞄与真实各装置形态和分组差异明显；前颊甲和车体前部缺少足以形成实车观感的独立板件/边界，近景仍是几块多面体|细化牵引钩、灯罩、侧裙连接、轮毂、炮根遮罩、网篮；按同一车辆配置锁定涂装|
|M1A2|两颊＋中央炮盾的大轮廓已改好，但 CITV/车长武器站/装填手区域仍是共享占位附件；不能把这种顶部配置命名为准确 SEPv3。车首灯罩、牵引点、裙板/轮组遮挡也过平直|炮塔尾篮、机枪架、舱盖周边潜望镜、发动机格栅、裙板分缝与橡胶材质|
|T90M|车顶 Kord 武器站、观瞄、尾部储物结构缺少真实相互位置与细部体量；ERA 被少量大楔块代替，主炮两侧轮廓尚不能代表真实装甲模块排布|炮塔后格栅、车尾油桶/排气/工具、轮毂与履带截面、对应批次迷彩|
|T90S Bhishma|车顶附件仍与其它国坦克共用形状；颊甲 ERA 为少数粗楔块，圆弧基体和各块关系过简。需要锁定印度具体批次，而非把俄军 T90A 附件直接移植|炮塔铸造表面、舱盖、车首灯/护罩、侧裙与尾部结构|
|K2|中央炮盾已解决大轮廓问题，但正面两侧灯组/翼子板凹口仍显著过平；炮塔后半部应有的侧后储物篮层次在当前模型上近似实体盒，近景仍差距明显|裙板下缘、轮组遮挡、炮塔顶装置形状、舱盖、线缆与原厂两种展示配置区分|

五型共性：主块体硬边没有适当倒角/接缝，车顶重复附件很显眼；履带、轮毂与负重轮质感仍趋同；材质主要靠平面颜色/迷彩，没有针对装甲漆、橡胶、金属、光学件分别制作足够细的表面变化。增加灯光或面数不能自动解决这些问题。

建议准确交付措辞：**“T90M 已加入署名许可的纹理模型并通过独立转炮与离线验证；其它四型坦克已完成实图参考的可辨识轮廓重建，精细外观和近景材质仍需继续制作。全体型号尚不能统一宣称达到实物近似或商业高质量坦克游戏资产级别。”**

## 下一步可执行边界

1. 主任务将独立T90M脚本接入统一加载顺序后做战场压力测试；原程序模型继续作为失败回退。
2. 若继续原创制作，先挑一辆建立完整照片板（同配置正、侧、前后斜视），按灯罩、轮带、炮塔顶附件、尾篮四组逐件替换占位体，再进行材质工作。
3. 若继续获取第三方资产，同时核对原站许可、文件署名、实际外形及来源冲突，不用面数或另一仓库的文字替代核验。不得自动扩大到印度 T90S 或其他改型。
4. 本轮检索到此停止；缺口如上，未做无限搜索，也未访问付费/登录后文件或使用下载绕过工具。
