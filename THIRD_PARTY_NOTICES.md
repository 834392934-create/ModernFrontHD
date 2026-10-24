# 第三方与素材说明

- `assets/vendor/three.min.js`：Three.js 0.160.0，MIT，许可原文在 `assets/vendor/THREE-LICENSE.txt`。来自 npm 的 `three@0.160.0` 官方发布包，用于实时三维战场与离线装备检视。
- build123d / OpenCascade / Pillow / Playwright：本机开发与验证工具，未作为游戏运行依赖捆绑进源码仓库；各自许可证适用其自身。
- 除下列署名第三方美术资产外，程序模型、相应图集、程序生成地表、界面、音效生成逻辑为本项目原创。没有提取《坦克世界》《红色警戒》或 Warhammer 官方模型、贴图与音频。
- **T-90M及俄罗斯坦克缩略图**：This work is based on “[T-90M](https://sketchfab.com/3d-models/t-90m-2e31a3cf16b04f0180b9387df5198c9a)” by **minehffd**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 通过Kevin-Liu-01/Claude-of-Tanks历史修订中的优化衍生GLB取得，原作者/模型ID/许可与原站API核对一致；没有复制该仓库程序模型或自有源代码。本项目调整朝向/比例、合批并保留车体/炮塔/炮管层级；完整来源、变更与哈希见 `assets/models/t90m-LICENSE.md`。`tank_rus.png`为衍生渲染，不适用原创资产MIT许可。
- **AH-64及其美韩缩略图**：This work is based on “[AH-64 Helicopter](https://sketchfab.com/3d-models/ah-64-helicopter-56f54d3865d247c78b49c2b47454da86)” by **Andrew Swihart / ArionDigital**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 调整朝向、比例与整体姿态，合批静态网格，分离旋翼动画，生成离线GLB及base64；具体修改和原始许可证据见 `assets/models/ah64-LICENSE.md`。对应 `heli_usa.png`、`heli_kor.png` 是该模型的衍生渲染，不适用原创资产MIT许可。外观为Longbow家族参考，非认证AH-64E批次。
- **伯克级模型及其缩略图**：This work is based on “[1:1 Low Poly US Navy DDG 51 USS Arleigh Burke](https://sketchfab.com/3d-models/11-low-poly-us-navy-ddg-51-uss-arleigh-burke-17be09c31c6047e4a5969b68c29eba03)” by **Yi Tsung Lee / WTigerTw**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 本项目转换朝向/比例并用于离线游戏，GLB原始字节保留；`burke-data.js`是其base64嵌入，`destroyer_usa.png`为衍生渲染。完整来源与许可证据见 `assets/models/burke-LICENSE.md`。其他原创资产的MIT许可不覆盖该CC-BY素材。
- `assets/vendor/GLTFLoader.bundle.js`：Three.js r160官方GLTFLoader及BufferGeometryUtils，MIT；将ES模块导入适配为现有全局THREE，未捆绑重复引擎，许可见THREE-LICENSE.txt。
- `assets/textures/forest-ground-*.jpg` 和 `ground-data.js`：Poly Haven [Forest Ground 04](https://polyhaven.com/a/forest_ground_04)，Rob Tuytel / Rico Cilliers，[CC0](https://docs.polyhaven.com/en/faq)。使用1K diffuse和OpenGL normal。
- `assets/references/m1a2-dvids.jpg`：[DVIDS Abram Tank Operations](https://www.dvidshub.net/image/5852204/abram-tank-operations)，Sgt. Nathan Franco，2019-10-04，页面标记PUBLIC DOMAIN；不表示军方背书。
- 独立版使用官方Electron 44.7.2（MIT）及其Chromium/FFmpeg依赖，原始LICENSE和LICENSES.chromium.html随运行时保留。下载脚本核验官方SHA256，运行时不进入源码Git。
- 其余实物照片仅保存于被Git忽略的 `.tmp/references/` 供目视研究，不打包、不作为贴图。来源及限制见 `docs/reviews/*-reference-review.md`。
- 世界观、商标、真实装备名称和第三方网页不属于本项目自有权利。MIT 许可仅涵盖本项目原创代码与原创资产，不授予第三方商标、世界观或官方素材使用权。
- 战锤阵营是非官方同人展示；商业发行需自行处理相关权利。
- 本项目没有复制 OpenRA、PathFinding.js、RBush、Ares、Phobos 或 cnc-ddraw 的代码或二进制；它们作为设计调研来源列于文档。

## 2.1 原创太空与建筑

`src/models-space.js`、`src/models-buildings.js`为本项目原创程序网格。影视/官方设备图片只作视觉研究，未将图片或预览网格打入发布包。引用与观察记录见 `docs/reviews/space-reference-review.md`、`defense-building-reference.md`。Sketchfab新候选尚未取得源文件，没有新增第三方模型导入；既有T-90M/AH-64/伯克许可继续适用。

## 地理地图数据

新增英吉利海峡、直布罗陀海峡、台湾海峡采用 Natural Earth 1:50,000,000 land 数据，公共领域（https://www.naturalearthdata.com/about/terms-of-use/）。官方维护仓库 `nvkelso/natural-earth-vector`，固定版本 `ca96624a56bd078437bca8184e78163e5039ad19`，文件 `geojson/ne_50m_land.geojson`，原始 SHA-256 `e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b`。本项目裁剪、等距经纬投影并采样成游戏海陆网格，离线数据在 `src/map-geography.js`，来源清单在 `assets/maps/geography-source.json`，可重建工具在 `tools/build-geographic-maps.cjs`。基地、矿山与目标点为原创虚构部署。制图比例不是 50 米精度；不包含真实军事设施与地形高程。
