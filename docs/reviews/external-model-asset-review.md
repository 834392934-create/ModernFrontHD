# 外部 GLB/glTF 资产筛查与伯克导入

核验日期：2026-10-16。范围：优先核对 Claude-of-Tanks 的第三方清单，再检查可公开下载的原作者授权模型。没有将 GitHub 仓库的代码许可证自动套用到其美术资产。

## 已批准并离线接入

### Arleigh Burke DDG-51 / Flight I

- 作者 Yi Tsung Lee / WTigerTw；原页面：https://sketchfab.com/3d-models/11-low-poly-us-navy-ddg-51-uss-arleigh-burke-17be09c31c6047e4a5969b68c29eba03
- API：https://api.sketchfab.com/v3/models/17be09c31c6047e4a5969b68c29eba03 ，实时CC BY4.0；作者说明自己制作模型和贴图，用作Cities Skylines模组。这与商业游戏提取不同。
- 下载：https://raw.githubusercontent.com/jstxw/CyberSea/hi/main/public/models/destroyer.glb
- 大小5,419,076 bytes；SHA256 F7A6CCAC4894E9994CC5F75D1EBDA3A1930EA5993EBB2B5EC5C118B4DC3D73C6。
- 下载GLB 49,381三角（API49632faces）；6mesh、5 PBR材质、14内嵌PNG；无skin/动画。船体、桅杆、桥楼、救生艇、前后垂发、舰炮与栏杆细节比当前自建几何明显改善。
- 实际查看了渲染透视、侧视、俯视：+X舰首正确，DDG51舰号、Flight I无直升机机库特征一致；并非精确工程复刻。
- 证据和署名在assets/models/burke-LICENSE.md与burke-license-evidence.json；GLB与base64离线副本均入assets/models。
- src/models-imported.js只在完整解析成功后覆盖destroyer_usa，失败保留原模型。官方three r160 GLTFLoader/BufferGeometryUtils改为IIFE绑定现有THREE，没有引入第二份引擎。
- file://实测0网络请求、0pageErrors，所有6mesh保留纹理；缺数据失败实测仍有可创建程序模型。验证记录见burke-import-verification.json、burke-import-failure-verification.json。
- 材质目前略暗，保留作者PBR；应在共同光照/曝光层复核，不宜直接删掉贴图重涂统一材质。

## 可继续追踪但尚未得到可直接下载文件

| 型号 | 来源与实时授权 | 结构/大小 | 结论 |
|---|---|---|---|
| T-90 / alexxx_xarchenko | https://sketchfab.com/3d-models/t-90-9bb8af8876a6478aa92089eff058d4db ，API CC BY4.0，作者说明XYZ学校课程作品并给ArtStation个人作品集 | API304272faces、169533verts、0动画；二进制大小/材质/骨架未取得不能编造 | 最有希望的原创T-90候选，但不可冒充T-90M。原repo提到减面版本，当前main的完整树没有glb/gltf文件；下载需作者公开包或正常Sketchfab下载流程 |
| T-90M / minehffd | https://sketchfab.com/3d-models/t-90m-2e31a3cf16b04f0180b9387df5198c9a ，API CC BY4.0，描述2k贴图/个人未修完的贴图问题 | API205998faces、109019verts、0动画；文件大小和骨架未取得 | 许可元数据明确，但当前镜像main未存模型，未下载；仍需取得原包并检查游戏提取线索 |

## 不接入 / 证据不足

| 候选 | URL/大小 | 不接入原因 |
|---|---|---|
| dannzjs所谓M1A2 SEPv3 | https://sketchfab.com/3d-models/abrams-m1a2-sepv3-eb6f5560198740269507e9948376414c | Claude-of-Tanks当前归档记录明确指出型号误标，实际为Leopard2A5；不能按M1导入 |
| Morv_AI T90M | https://github.com/DhruvBhargava007/Morv_AI/blob/Dhruv/frontend/public/models/t-90m__war_thunder.glb ，48,141,044bytes | 文件名明确War Thunder提取候选，不接入 |
| CyberSea T90 | https://raw.githubusercontent.com/jstxw/CyberSea/hi/main/public/models/t-90.glb ，5,469,080bytes；原API f21acfb4ef1b4e74b91c2348cbf6e2e2 | 虽CC BY声明，但原作者无创作说明，根节点t-90_coldwar.obj与哈希DDS材质疑似游戏资产；未下载模型，只检查GLB JSON头 |
| M2 Bradley / 42manako | https://sketchfab.com/3d-models/m2-bradley-ifv-ab022158ab5f4fbfa55d4142db7595ab | 描述明确“Model created by Alec Moody”，上传者不是创作者，未确认授权链 |
| HMMWV M998A1 / 42manako | https://sketchfab.com/3d-models/hmmwv-m998a1-soft-top-ffbc4b053628413fb84acf5b89595d96 | API描述明确“Not my original model”；镜像license.txt的CC BY标签无法补全原作者授权链 |
| SH60B / nazidefenseforceofficial | https://raw.githubusercontent.com/jstxw/CyberSea/hi/main/public/models/seahawk.glb ，11,842,904bytes | 上传者来源不可信、DDS贴图/OBJ转换节点，无法证实原创，未下载模型 |
| MQ9 / IProZenoN | https://sketchfab.com/3d-models/mq-9-fabe963feb354c5584b51f9c470c3f7e ，镜像1,612,032bytes | CC BY明确但无原创过程/来源说明；3材质、无skin/动画、OBJ转换节点。暂缓，不把转换格式本身当作侵权定论 |
| F35 / bohmerang | https://sketchfab.com/3d-models/f-35-lightning-ii-fighter-jet-free-b1ab1c0090e34b0fbfe667e706023e6d ，镜像22,288,984bytes | API CC BY-NC-SA4.0且作者强调仅个人非商业用途；不是本轮可自由商用的开放候选，未下载 |
| F15E / bohmerang | https://raw.githubusercontent.com/jstxw/CyberSea/hi/main/public/models/f15.glb ，29,008,540bytes | 内嵌CC BY-NC-SA4.0，未下载 |
| F/A18F / bohmerang | https://raw.githubusercontent.com/jstxw/CyberSea/hi/main/public/models/f18.glb ，30,185,108bytes | 内嵌CC BY-NC-SA4.0，未下载 |
| A10 / bohmerang | https://raw.githubusercontent.com/jstxw/CyberSea/hi/main/public/models/a10.glb ，26,341,020bytes | 内嵌CC BY-NC-SA4.0，未下载 |

说明：对未接入镜像只读取文件目录/许可证/GLB JSON头用于来源核验，没有把许可不明的二进制模型存入项目。原始核验记录位于.tmp/asset-candidates。对NC-SA没有声称其非法；只是避免未经项目范围确认就把非商业约束混进可公开仓库。

原优先参考清单：https://github.com/Kevin-Liu-01/Claude-of-Tanks/blob/main/docs/ATTRIBUTION.md 。该repo第一方美术有Reserved Content限制，第三方研究清单亦包含明确隔离的商业游戏提取资产，不能作为统一开放资产库。
