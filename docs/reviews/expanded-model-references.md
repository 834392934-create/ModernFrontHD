# 扩展兵种模型与形态参考

核查日期：2026-10-16。研究 agent：expanded_model_reference。对应 `roster-design.md` 的陆海空天扩展。本文件是来源筛选和建模建议，不是模型已经导入或已经通过视觉验收的证明。

本轮核查了 8 个新的 Sketchfab 模型官方 API 详情，并实际查看它们的公开预览；7 个标记 CC BY 4.0 和允许下载，1 个仅作形态参考。另核查 NASA 官方 GLB 入口、GitHub 模型库和 Kenney CC0 资产包。没有提取预览器网格，没有重复调用此前已经返回 401 的匿名下载接口，没有导入任何新外部资产。

## 优先候选

下列三角面/材质/贴图统计来自 Sketchfab 官方 API，不是本游戏导入后的统计。`downloadable=true` 不等于匿名下载可用。预览看图不能证明背面、转轴、UV、贴图实际分辨率及文件依赖完整。

| 优先级 | 模型及作者 | 许可与官方统计 | 实看判断及接入条件 |
|---|---|---|---|
| P1 | [MQ-9 Reaper / Tyler V Howell](https://sketchfab.com/3d-models/mq-9-reaper-eff549610fee4f20904f7b388a3a0830) | CC BY 4.0；41,432 面 / 7 材质 / 35 贴图 | 长直翼、机鼻腹部光电球、尾推桨、V 尾、翼下挂架和弹药层次清楚。适合攻击无人机近景参考，实际导入前需确认桨轴、可拆挂架并降低材质开销。不能直接换色称中国/俄罗斯型号。 |
| P2 | [MQ-9 / IProZenoN](https://sketchfab.com/3d-models/mq-9-fabe963feb354c5584b51f9c470c3f7e) | CC BY 4.0；14,652 / 3 / 2 | 前斜视能看到高展弦比机翼、圆润机鼻及细小起落架，表面层次少。适合性能优先的候选；不是上一项的同源 LOD。 |
| P1 | [Mortar - M224 / Jan Češnjevar](https://sketchfab.com/3d-models/mortar-m224-c86a73e40d994431bcdb57dc741cf8be) | CC BY 4.0；21,642 / 2 / 4 | 独立炮管、脚架、调整机构、瞄具和有开孔的圆形底板清楚。可用于迫击炮班的装备部分，仍需原创人员与搬运姿态。不要把 M224 名字改成 M252。 |
| P2 | [BRDM-2 / zhek](https://sketchfab.com/3d-models/brdm-2-armored-reconnaissance-vehicle-065dc054914f40fdbfb25ad62d6696b7) | CC BY 4.0；129,718 / 4 / 18 | 舟形前体、四个主轮、双前窗、车顶小炮塔和扶手清楚，可帮助区分侦察车与步战车。原型较老；用于通用新角色时必须标原创改装，不能当所有阵营的现代侦察车型。需 LOD。 |
| P2 | [Space Station 3 / re1monsen](https://sketchfab.com/3d-models/space-station-3-a7a6ad10261149cab31aa394bfcf8940) | CC BY 4.0；68,328 / 3 / 18 | 多层环、真正镂空、节点灯与内外桁架清楚。适合维修站的环形坞架参考，不能把整站改名成真实太空武器。作者称 4K 纹理，文件未实测。 |
| P2 | [Space Station Modules / re1monsen](https://sketchfab.com/3d-models/space-station-modules-e3ba39a1c78540448542cf937b11feab) | CC BY 4.0；77,808 / 1 / 6 | 长条桁架、重复设备舱与展开侧板有明显层次，可用于原创长轴舰的结构语言。图较暗，不能判断背面质量；需拆模块，不能每舰整包复制。 |
| P3 | [Low Poly Frigate Ship with Helicopter / Duane's Mind](https://sketchfab.com/3d-models/low-poly-frigate-ship-with-helicopter-e35dab813fe34035b66ac15989b1e2be) | CC BY 4.0；6,515 / 5 / 5 | 公开预览主要是尾部直升机坪、双机库门、栏杆和小直升机；只支持这些局部判断，未确认整舰轮廓。风格和精度低于项目现有高细节舰艇，不优先替换。 |
| 仅参考 | [Oshkosh LVSR Military Recovery Heavy Truck / Vladislav Shreier](https://sketchfab.com/3d-models/oshkosh-lvsr-military-recovery-heavy-truck-0f53c591ad2f4ab98be7a0bbee1eac24) | 不允许下载；API 未给出资产许可；110,561 / 2 / 10 | 五轴、大侧工具柜、可折叠吊臂、前部装甲驾驶舱、回收挂具非常清楚。只借鉴外部结构，不下载或复用网格。可以用公开实物资料继续校准维修车。 |

上述 CC BY 候选若正式采用，应保留作者、模型链接、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 和修改说明，并保存原包 SHA256。作者声明不代替原创来源核查。没有将 NC/ND 模型、来源不明商业游戏资产或 Star Wars 同人舰直接列入游戏可用清单。

## 官方公开模型及 CC0 备选

| 来源 | 核查结果 | 适用边界 |
|---|---|---|
| [NASA 3D Resources GitHub](https://github.com/nasa/NASA-3D-Resources) | NASA 官方仓库与 [3D 资源入口](https://science.nasa.gov/3d-resources/) 相互关联，提供公开模型 | 优先使用官方直接文件。逐项保留署名和 [NASA 媒体使用规则](https://www.nasa.gov/nasa-brand-center/images-and-media/)，注意第三方素材及 NASA 标识不等同于任意授权。不能声称 NASA 为游戏背书。 |
| [Landsat 1, 2, and 3](https://science.nasa.gov/3d-resources/landsat-1-2-and-3/) | 官方 GLB 页面注明 NASA / Ross K. Walter，页面标 15.59 MB；实际看了页面模型预览 | 上层多面仪器舱、下层环形舱、细长双太阳翼和三角支撑清楚。用于测绘星结构参考；历史民用遥感卫星不是军事武器。 |
| [Hubble 3D Model](https://science.nasa.gov/resource/hubble-space-telescope-3d-model/) | 已确认 NASA VTAD 署名及直接 GLB 入口；页面标 glTF 10.93 MB | 仅确认下载入口，本轮未取得可评价的模型图，不列为视觉通过。可后续帮助光学侦察载荷建模。 |
| [ISS 3D Model](https://science.nasa.gov/resource/international-space-station-3d-model/) | 已确认官方 `ISS_stationary.glb` 入口；未下载 | 可作为机械臂、桁架和模块连接的后续检查源。当前建议来源于下面另列的 ISS 实照。 |
| [Kenney Space Kit](https://kenney.nl/assets/space-kit) | 作者页及 [作者 itch 页面](https://kenney-assets.itch.io/space-kit) 明确 CC0，150+ 模型，包含 glTF 等格式 | 适合模块化原型和低配轮廓测试；未下载或宣称其精度优于现有模型。 |
| [Kenney Watercraft Kit](https://kenney.nl/assets/watercraft-kit) | 作者页明确 CC0；已看整包预览，公开 ZIP 入口无需账户 | 实际多为民船、货船、拖船和风格化帆船。用于维修舰工作甲板/吊机大轮廓，不能称真实现代军舰，也不作为写实升级。 |

## 四域已经实际看图的形态依据

以下每域至少 3 项；明确区分实物照片、作者模型预览与原创推断。研究图不作发布贴图、不带进正式资源包。

### 陆军

1. **M224 作者模型预览**：上表的炮管、瞄具、分叉脚架、宽底板形成四层结构。迫击炮不能做成步兵手里的单根直筒，运动时也不能把展开脚架表现为履带车。
2. **BRDM-2 作者模型预览**：四轮侦察车的低矮舟形车体与小炮塔区别明显。新角色采用原创轮式侦察配置时，光电桅杆应从有支座的舱顶升起，不悬空贴在炮管上。
3. **LVSR 作者模型预览**：维修功能通过折叠吊臂、侧工具柜和后部回收装置可识别。游戏维修车若采用履带底盘，吊臂与车辆受力支座仍要连通；若采用轮式底盘，应与采矿车的矿斗明显区分。

4. **[M252 实拍存档](https://commons.wikimedia.org/wiki/File:USMC-090504-M-1012C-001.jpg)**：已实际查看 `mortar-wiki-photo.png`；USMC / James W. Clark，页面标美国公有领域。单兵跪姿、倾斜炮管、瞄准器、分叉支架与大圆底板清楚，能校验人与炮的相对尺度。
5. **[M88 博物馆实拍](https://commons.wikimedia.org/wiki/File:M88_Armored_Recovery_Vehicle_in_pm.jpg)**：已查看 `m88-wiki-photo.png`；作者 baku13，CC BY-SA 3.0 / GFDL 等多重许可。高起 A 形吊臂、横向加强杆、滑轮缆线、低矮装甲车体与履带可见。这是博物馆 M88，不能据此声称当前 M88A2 全部细节一致。

另找到的 [Javelin 官方照片](https://www.dvidshub.net/image/4016547/us-marines-fire-javelin-missiles-during-battle-drill) 和 [M88A2 官方照片](https://www.dvidshub.net/image/2527216/m88a2-hercules-recovery-vehicle-resupply) 在本机返回访问拒绝，不计为已看照片。反坦克班粗发射筒+独立瞄具、机枪班脚架+弹箱、突击班紧凑持枪姿态是本轮美术建议，不是假称从缺失照片测量而来。

### 海军

1. **[戈尔什科夫护卫舰实拍](https://commons.wikimedia.org/wiki/File:Admiral_Gorshkov_frigate_03.jpg)**：重看项目缓存 `naval/gorshkov.jpg`，来源 Mil.ru / CC BY 4.0。可见首炮、前甲板分区、舰桥前圆罩、渐缩塔桅及后部飞行甲板。护卫舰不能只是驱逐舰整体缩小，应调整上层建筑与后甲板比例。
2. **[世宗大王级实拍](https://commons.wikimedia.org/wiki/File:ROKS_Sejong_the_Great_(DDG_991).jpg)**：重看 `naval/sejong.jpg`，美国海军照片。可见大面积固定雷达阵面、开放横梁桅杆、双层上层建筑。适合防空舰读形，但游戏独立防空职责属于玩法设定。
3. **Kenney Watercraft Kit 作者预览**：货船的大后甲板、吊机、拖船前后作业空间与战舰差异明确。维修舰要保留工作负空间，不能放满炮和导弹；侦察艇可用双体/窄船身+显著传感器来和导弹艇区分。这是原创组合，未命名为真实型号。

4. **[Mark VI 海军实照存档](https://commons.wikimedia.org/wiki/File:US_Navy_MKVI_patrol_boat.jpg)**：已实际查看 `mkvi-wiki-photo.png`，Nelson Doromal Jr. / 美国海军，页面标公有领域。短船体、低分层驾驶室、大前窗、短桅与甲板小武器比驱逐舰紧凑。巡逻艇不能简单缩放完整驱逐舰。

另找到的 [Constellation 官方效果图](https://www.navsea.navy.mil/Media/Images/igphoto/2003225606/) 访问拒绝，未作图像验收。导弹艇成组倾斜箱、岸攻舰前置大炮/发射模块是形态设计建议；不将 Constellation 概念效果图称服役实照。

### 空军

1. **MQ-9 两名作者的模型预览**：实看长直翼、尾推桨、V 尾与光电球，Tyler 版本能看到独立挂点。攻击 UAV 保留挂架，侦察 UAV 应去武装并加强传感器轮廓；不能只改变涂色。
2. **[Boeing AH-64 官方照片](https://www.boeing.com/content/theboeingcompany/us/en/defense/military-rotorcraft/ah-64-apache.html)**：重看 `air/ah64.jpg`，串列座舱、双侧发动机、短翼挂架、轮式起落架、机鼻传感器清楚。本图无桅顶雷达，不能凭图给所有护航直升机加同一个雷达球。Boeing 图片只用于研究。
3. **[T-50/Su-57 摄影师实照](https://commons.wikimedia.org/wiki/File:Сухой_Т-50,_Москва_-_Жуковский_(Раменское)_RP118072.jpg)**：重看 `air/su57.jpg`，宽中央翼身、两侧独立进气道、双发动机舱与机鼻光电球清楚；照片是原型阶段。截击角色可借鉴“长前体与推进器分明”的轮廓，但不把其他阵营通用改装叫 Su-57。

4. **[MQ-9 实拍存档](https://commons.wikimedia.org/wiki/File:MQ-9_Reaper_UAV_(cropped).jpg)**：已查看 `mq9-wiki-photo.png`；Leslie Pratt / 美国空军，页面标美国公有领域。俯斜视看清细长主翼、尾翼、后置螺旋桨与翼下挂点，可和两个候选模型交叉比对。
5. **[RQ-4 实拍存档](https://commons.wikimedia.org/wiki/File:Global_Hawk_1.jpg)**：已查看 `rq4-wiki-photo.png`；Bobbi Zapka / 美国空军，页面标美国公有领域。隆起机鼻、背部独立进气/发动机舱、极长翼及 V 尾形成明确侦察机剪影。不能给它装 MQ-9 式尾推桨。
6. **[E-3 实拍存档](https://commons.wikimedia.org/wiki/File:E-3_Sentry_Airborne_Warning_and_Control_System_(AWACS)_conducts_a_mission.jpg)**：已查看 `e3-wiki-photo.png`；Roslyn Ward / 美国空军，页面标美国公有领域。俯斜视能看到机身后上方的大圆盘、四个翼下发动机和单垂尾。预警角色必须有区别于战斗机的长机身和大翼，不能只把圆盘贴到小战斗机上。

官方 [RQ-4 文字资料](https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104516/rq-4-global-hawk/) 与 [E-3 文字资料](https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104504/e-3-sentry-awacs/) 用于角色交叉核对。上述均为历史照片，不证明最新库存或改型。近支机粗机鼻/高置发动机、重轰炸机宽飞翼/明显弹舱仍是本轮设计方向，尚未取得对应新实照，不声称高保真复刻已经完成。

### 太空

1. **Landsat 官方模型预览**：八角舱+下部环形载荷+三角桁架+双太阳翼；测绘星重点是显著仪器和大视野提示，不能装炮。
2. **[NASA ISS 太阳翼与散热板实照](https://www.nasa.gov/image-article/station-solar-arrays-radiator-panels/)**：重看 `space/iss-solar-radiator.jpg`，白色散热薄板与棕金太阳电池网格是两类不同结构。维修站/大舰应有连接节点和支撑，不应把所有侧板统一做成蓝色灯牌。
3. **[ESA Sentinel-2A 太阳翼实照](https://www.esa.int/ESA_Multimedia/Images/2014/09/Sentinel-2A_with_solar_wing)**：重看 `space/sentinel-solar-wing.jpg`，三段展开翼、板间铰链、金银隔热层和仪器舱有清楚区别。地面测试吊架不属于飞行装备。ESA / Airbus 图片仅作研究，不随项目发布。
4. **re1monsen 两个原创站体预览**：环形坞/轴向桁架帮助维修站与长轴狙击舰形成不同剪影。所有新增武装轨道兵种仍是原创科幻，模型有现实结构语言不代表现实存在对应能力。

## 可执行的角色识别与建模要求

| 域 | 角色 | 必须在战场缩小时仍可识别的结构 |
|---|---|---|
| 陆 | 反坦克班 / 机枪班 / 迫击炮班 / 突击班 | 分别是粗筒+瞄具、低姿态长枪+弹箱、倾斜管+脚架底板、紧凑突击持枪。若按“班”命名，建议至少两名人员或明确班组图标，别用四个相同步兵换色。 |
| 陆 | 侦察车 / 维修车 | 前者低小车体+光电桅杆；后者工具柜+吊臂+工作平台，无主炮。 |
| 海 | 护卫 / 巡逻 / 导弹艇 | 中型平衡分区、短宽低舷小炮、低轮廓船体+成组斜箱三种轮廓。 |
| 海 | 岸攻 / 防空 / 维修 / 侦察 | 大前向火力区、高雷达+垂发区、宽工作甲板+吊机、较小船体+传感器桅杆/双体。不要给所有角色保留同一个巨大舰桥。 |
| 空 | 侦察 UAV / 攻击 UAV | 传感器优先长翼机与有挂架尾推桨机。无武装侦察机不挂装饰导弹。 |
| 空 | 截击 / 近支 / 重轰炸 / 预警 / 护航直升机 | 修长后掠、短粗装甲感、大飞翼或重机身、雷达盘、旋翼+短翼轻空空挂架。各角色的尾部/翼展比例都应改变。 |
| 天 | 狙击 / 近防 / 岸攻 / 攻城 | 贯穿长炮轴、多向短炮塔、腹面宽阵列、厚重双支撑主炮，不能四舰仅换发光色。 |
| 天 | 维修 / 测绘 / 快袭 | 开放船坞+机械臂、大口径观测器+太阳翼、紧凑楔体+醒目大推进器。前两者无炮口；维修效果必须连到真实机械臂/坞口附近。 |

所有新单位在检视器里应能读到“游戏角色/原创配置”的说明。模型可引用某种真实平台作为形态依据，但不能以现有坦克/驱逐舰换色凑十种真实型号。影视参考继续遵循用户“借鉴、不是搬运”的要求；采用轮廓、尺度层级与灯光语言，不直接搬运电影网格、标志与纹理。

## 交给建模监督 agent 的核对项

1. 隐藏标签、缩到战场尺寸，先判角色，再看近景；用灰色材质复核，确保不是只靠颜色识别。
2. 五视图检查机翼/太阳翼根部、炮架支座、桅杆、吊臂、起落架与船体连接，拒绝悬空装配和穿模。
3. 武器模型与功能一致：无武装角色没有装饰炮，专用防空单位不展示会误导玩家的大型对地炮。
4. 美术设计比例与真实公开尺寸分开记录；没有查到的内部机构不伪造真实参数。
5. 外部模型只在来源和文件完整性核查后导入。当前候选没有完成多视角审查，也没有实际性能测试；导入后仍需材质、LOD、离线运行与原生窗口检查。

## 研究记录

本轮临时证据位于 `.tmp/references/expanded/`：`candidates.json` 及 8 份 API 详情、`sketchfab-search.json`、`sketch-sheet-0.png`、`sketch-sheet-4.png`、`research.json`、`landsat-photo.png`、`kenneywater-photo.png`、6 张 `*-wiki-photo.png` 与 `commons.json`。初次 Commons 页面截图因懒加载为空白，修正为等待图片解码后重新截取，并逐张查看确认；原站拒绝访问仍独立记录。复用实照的原来源在既有 `air-reference-review.md`、`naval-defense-reference-review.md`、`space-reference-review.md` 中保留。本文件不触碰游戏代码。
