# 航空第三方模型候选核查

2026-10-16。本轮仅研究与下载候选，没有修改src或接入生产资产。

## 结论

**取得1个可继续接入评估的有清楚许可来源文件：Andrew Swihart的AH-64 Helicopter。** 下载来自公开GitHub镜像，随后回原作者Sketchfab API核验，CC-BY-4.0与文件内部元数据一致。原作者大图已实际查看，机身、旋翼毂、座舱、起落架明显比现有程序模型细。但有220,715三角形，需要LOD与节点整理；没有贴图、没有动画，不能把它称为已经就绪的PBR游戏资产。

F-35/J-20/Ka-52找到原作者CC-BY候选，但匿名官方下载API返回401。本轮未绕过登录，未把只取得预览误报为已下载模型。

## 全8种实机覆盖

| 游戏实机 | 已核验候选 | 许可、文件与取舍 |
|---|---|---|
| AH-64（美国/韩国） | [Andrew Swihart / ArionDigital](https://sketchfab.com/3d-models/ah-64-helicopter-56f54d3865d247c78b49c2b47454da86) | 原作者API返回CC-BY-4.0、isDownloadable=true；镜像glTF extras同作者/型号ID/许可。已取得glTF+bin，已看1920px预览；推荐下一步接入评估。为带桅顶雷达的Longbow构型，作者未明确A/D/E，不冒称精确E批次。 |
| F-35A（美国/韩国） | [andertan F35](https://sketchfab.com/3d-models/lockheed-martin-f35-lightning-ii-db911de503c74285a8d506951df786d6) | 原作者API CC-BY，已看1920px预览，外部曲面和表面细节更细。但下载401；没有取得模型文件。预览前轮为双轮，也需要核对A/C改型，不能直接按A标记。 |
| J-20 | [andertan J-20](https://sketchfab.com/3d-models/chengdu-j-20-fighter-817bcfb55c3e4fcb864e4296e2e57a95) | API CC-BY，已看1920px预览，外形更细；约120万三角形，下载401，未取得文件。需显著减面。 |
| Ka-52 | [Jawa / HELLBRAD](https://sketchfab.com/3d-models/ka-52-low-poly-832cc05948be458a85487faebb4bcc03) | API CC-BY，已看1920px预览，60.5k三角形；仍为强低模风格，无真实涂装，不认为满足本次明显写实升级目标；下载401。 |
| Z-10 | [PAK Deftech旧模型链接](https://sketchfab.com/3d-models/wz-10-attack-helicopter-e32627d165bc46a989c97ebe588cd388) | 已取得镜像ZIP；内写CC-BY，但原API404，无法回原作者复核。纹理使用VH_WZ_10_Base命名只是待查线索，不能据此断言游戏提取；当前拒绝接入。 |
| Rafale | [fauzan_3d / mbooo1](https://sketchfab.com/3d-models/dassault-rafale-ef444e93505c4310b36e69e894011c66) | API CC-BY；作者描述明确Blender建模、Substance Painter贴图、Photoshop细节。未取得模型文件，未做实际模型/预览视觉验收，因此仅列待下载候选。 |
| Su-57 | [andertan Su-57](https://sketchfab.com/3d-models/sukhoi-su-57-felon-09d546b4355c4fa6882ca46e05069bee) | 原发布页和API均CC-BY，94.1k三角形；本轮未取得文件、未视觉验收。仅列候选。 |
| LCH | [ZARRAR3D TurboSquid](https://www.turbosquid.com/FullPreview/1803853)、[satwik-quino CGTrader](https://www.cgtrader.com/3d-models/aircraft/helicopter/light-combat-helicopter-lch-by-hal) | 本轮找到付费/Editorial或Royalty Free商业资产；未找到同时符合CC-BY/CC0、匿名可下载、写实的候选。不购买、不绕过。 |

## AH-64 文件与署名

- [公开镜像](https://github.com/projeto-arcanjo/modelos/blob/master/ah-64_helicopter.zip)不是授权主体，只有回原作者核验后才列入可接入候选。
- 原作者API：`https://api.sketchfab.com/v3/models/56f54d3865d247c78b49c2b47454da86`，响应已存研究目录同名JSON。
- 模型文件：`.tmp/asset-candidates/air/ah-64_helicopter/scene.gltf`及`scene.bin`；ZIP 8,855,296字节。
- ZIP SHA256：`0DFD7DE823324FC2DE7873338881B6D358C865718183447BF4AE04E284B78D45`。
- glTF解析：129 mesh、228 node、15 material、0 image、0 animation，索引计数合计220,715三角形。VEC3 accessor计数不能当独立顶点数，因为包含位置/法线等重复数组。
- 建议署名：`AH-64 Helicopter by Andrew Swihart (ArionDigital), CC BY 4.0, via Sketchfab. Converted/optimized and material adjustments by this project.` 接入时才按实际修改更新最后一句。
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)：保留作者、原链接、许可链接及修改说明。
- 本轮只确认源文件可读和作者原预览有明显几何提升，未跑游戏内渲染/减面/旋翼测试。

## 明确拒绝的线索

- [Ka-52 War Thunder](https://sketchfab.com/3d-models/ka-52-war-thunder-36683d53f6b64c43bd705247407a29cd)：即使页面勾选CC，也明确为商业游戏资产，不采用。
- [42manako J-20](https://sketchfab.com/3d-models/chengdu-j-20-224b80788fd84ca2aff5cd0ec824f784)：作者描述明确Modern Warship提取，且NC，不采用。
- [Battlefield 4 J-20](https://sketchfab.com/3d-models/battlefield-4-chengdu-j20-4a9086dfda7b4e0a84c09cca1e08560e)：商业游戏提取，不采用。
- [shangus930 F-35A](https://sketchfab.com/3d-models/f-35a-lightning-ii-a06d6113cfb44a0aa7b8f17106aca9c4)：说明来自被放弃的DCS社区mod，未回溯到原模型作者许可，拒绝直接采用。
- bohmerang的F-35/Su-57/Rafale公开页为NC-SA，仅个人非商业，按本轮要求不采用。
- 其余聚合下载页只有“免费/royalty free”标签且无原作者许可链，不下载接入。

研究文件均留在忽略目录`.tmp/asset-candidates/air`。候选授权判断不等于已完成真实性、批次匹配或运行性能验收。
