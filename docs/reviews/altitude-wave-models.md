# 高度分层扩展：8单位与4防御设施模型

日期：2026-10-18。所有模型为本项目原创游戏职责造型，不认证真实装备或真实战斗性能。

文件：src/models-altitude-wave.js、src/models-defense-wave.js。八单位 × 六阵营 = 48 槽；四建筑 × 六阵营 = 24 槽。阵营涂装/小标记不代表独立真实型号。模型比例是美术坐标，不是加工尺寸。

## 来源及证据边界

本轮检索了以下官方资料。除明确引用项目此前看图记录外，本轮只读公开页面文字，没有把搜索结果缩略图当作已完成实物对照，也没有下载素材到发布包。

| 来源 | 采用范围 | 未采用/限制 |
|---|---|---|
| [US Army M10 Booker交付报道，2024](https://www.army.mil/article/275419) | 步兵直射支援与装甲防护职责的文字背景 | 本项目突击炮是短炮、低矮固定战斗室原创组合，不是 M10，不复制其炮塔/真实性能；该旧报道不用于证明2026现役状态。 |
| [Lockheed Martin Q-53](https://lockheedmartin.com/en-us/products/tpq-53.html) | 机动相控阵和火控支援的功能背景；模型阵面有背架、铰链、支柱与机柜 | 8轮底盘、三片折叠阵面与轨道预警三面阵为原创组合。未看官方原图，不宣称精确Q53外形。 |
| [Kongsberg ST2400 VDS](https://www.kongsberg.com/what-we-do/defence-and-security/naval/st2400/) | 拖曳声呐职责支持反潜舰尾部绞车/A架的视觉设计 | 船体、鱼雷、岸基堡垒为原创；没有复制实际拖曳装置。BAE Type26页面尝试访问失败，不算证据。 |
| [US Navy SSGN事实页](https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169613/guided-missile-submarines-ssgn/) | 读取官方页面：导弹潜艇垂直发射载荷的职责背景 | 14个可见舱盖只为游戏辨识，不等同真实Ohio装载量；本模型不是Ohio或任何国家真实改型。 |
| [NASA SR-71](https://www.nasa.gov/image-article/sr-71/) | 读取历史高空/高速研究平台描述，设计细长机身与大双引擎轮廓 | 不将SR-71称现役战斗机，也不复制速度、升限、发动机性能。新增截击机为原创武装角色。 |
| [NASA X-48B](https://www.nasa.gov/aeronautics/x-48b/)；[ESA散热板](https://www.esa.int/ESA_Multimedia/Images/2016/07/Shaker_test_of_radiator_panel) | 沿用此前tactical-air-space-references.md中实际看图记录：宽翼面连接与有厚度的面板/支臂逻辑 | 本轮未重复看图。远程机为大三角翼/四发动机，非X-48B；轨道母舰炮阵和性能为架空。 |
| [NASA Robotic Servicing Arm](https://www.nasa.gov/isam/robotic-servicing-arm/) | 阅读关节机械臂的公开服务作业背景；维修穹顶画出基座/肩/肘/腕/夹爪连续结构 | 本项目双维修臂不是NASA机械臂复刻，游戏修复机制不等同真实可行工程。 |

重型等离子炮、空天防御和轨道武器能力为明确科幻/游戏规则，没有真实武器工程依据。未提取商业游戏资产，未导入第三方模型或照片贴图。

## 8种单位结构

| key | 可辨识结构 | 动画/锚点 |
|---|---|---|
| assault_gun | 低矮履带底盘、分节履带/六负重轮、斜装甲固定战斗室、短粗炮、后部散热板/舱盖/观察窗 | turret仅为炮座组件；muzzle；不是主战坦克换色 |
| mobile_radar | 8轮底盘、驾驶舱玻璃/门/镜、后部供电箱、三片带铰链的矩形阵面、后撑杆、停车支腿 | radar；unarmed，无muzzle |
| asw_patrol_ship | 窄舰体、舰桥/桅杆、前部双鱼雷组、尾部卷筒/绳槽/导缆A架、声呐体与工作甲板 | 鱼雷口muzzle；不把绞车做成武器 |
| missile_sub | 显著加长艇身、背脊双排14个独立垂发盖、前部帆罩、艏/尾翼与独立推进桨 | propeller绕X；muzzle位于舱盖上方，muzzleAxis=y |
| high_altitude_interceptor | 细长尖首机身、长双发动机/进气与尾喷暗腔、大双垂尾、窄后掠主翼、挂架长导弹 | 前向muzzle；静态合批 |
| strategic_strike_aircraft | 大三角翼、四翼下发动机、厚中央机身、单垂尾、成对腹部舱盖和铰链 | 腹部发射面前muzzle；静态合批 |
| orbital_carrier | 宽装甲舰体、两侧双联炮舱、纵向长武器阵列、后部推进/散热面、独立舰桥 | muzzle；noAircraftProduction=true。没有飞机生产/发射玩法，也不画航母跑道或机库误导玩家 |
| orbital_sensor | 三面大型相控阵围绕有支撑桅杆、后置双太阳翼、中央电源舱、小型推进口 | radar；unarmed，无muzzle |

## 4种防御设施结构

| key | 构成与支撑 | 锚点 |
|---|---|---|
| sonar_bastion | 厚基础、承力台/转盘、双鱼雷筒支架与箍环、声呐机柜/设备房、缆绞车/导向立柱、台阶和栏杆 | turret + muzzle，朝+X |
| aerospace_array | 厚装甲基础、倾斜密封筒阵/托架、后置四面相控阵塔、两供电柜、地面管线 | turret + muzzle，筒体与muzzleDirection倾角0.82rad |
| plasma_bastion | 圆周锚栓基座、旋转平台、分段重炮/环形组件、左右冷却机柜/罐体、连续动力线、维护舱盖/栏杆 | turret + muzzle，朝+X |
| repair_dome | 可通行的中央检修区、三拱肋与两端立柱、双层薄壳护棚、两完整关节臂/夹爪、工具柜/控制台/工位线 | servicePoint，无muzzle；半拱护棚无透明球体，避免遮掉作业结构 |

建筑scale=7，基础最低Y=0；基脚/支柱均连接到基础，避免悬浮设施。四建筑元数据均为original-concept-facility，不认证真实阵地部署。

## CPU验证

两个文件node --check通过。Node加载THREE/data/roster/models3d/model-detail与新增模型，72槽均能构造。位置/法线有限、surface数量与顶点一致、PBR材质保留。每型1–2mesh、最高17608三角，低于每型30000上限。无武装2单位/维修建筑没有muzzle。

| chn槽 | 三角形 | mesh |
|---|---:|---:|
| assault_gun | 7424 | 2 |
| mobile_radar | 17608 | 2 |
| asw_patrol_ship | 11844 | 1 |
| missile_sub | 3604 | 2 |
| high_altitude_interceptor | 16252 | 1 |
| strategic_strike_aircraft | 16232 | 1 |
| orbital_carrier | 13944 | 1 |
| orbital_sensor | 5452 | 2 |
| sonar_bastion | 9480 | 2 |
| aerospace_array | 3480 | 2 |
| plasma_bastion | 7360 | 2 |
| repair_dome | 8400 | 1 |

9个武装角色全部沿各自中心发射方向射线无自身后续遮挡；潜艇向上、空天阵列倾斜，其余向+X。只证明中心射线，不代表全部射界。维修护棚另外从外向内、内部向外射线验证，外表面朝外且内表面朝内；最高处内外层间距约0.09美术单位。

## 待视觉监督

未跑GPU、未提交Git。需主线程串行截图正/侧/顶/透视并送监督，重点检查：车辆支腿与轮胎关系、船体曲线/鱼雷视线、潜艇发射盖深度、高空机与远程机轮廓差异、三面阵的支撑与太阳板遮挡、建筑武器旋转后护栏/机柜间隙、维修臂与拱壳间隙。模型CPU通过不能当作真实照片验收；入口、战斗规则、AI、第一人称、头像、离线包验证由主线程负责。


## 首轮监督返工：挂架连接、船体曲线、母舰立体结构

制作agent实际打开并检查high_altitude_interceptor_chn-front.png、asw_patrol_ship_chn-side.png、orbital_carrier_chn-perspective.png，确认三项问题属实。

- 截击机：原挂架位于主翼前方，不能仅加高支架。已把导弹/挂架后移到真实翼面覆盖区域，新增连续翼底→短厚挂架→发射轨→弹体连接。两侧CPU射线测得翼底Y约-0.0567，挂架上端Y=-0.02，两者有实际重叠，发射轨与挂架/弹体同样相接；muzzle同步后移，向前射线无遮挡。
- 反潜舰：用4层纵向放样替代等宽直墙，水线下经折角收窄至龙骨，并让艏部随深度后退形成斜艏。中段从Y=-0.9到Y=0.6，半宽由约0.519增至1.624；外侧与龙骨法线检查正确。
- 轨道母舰：两条纵向阵列前段各改为真正有底/侧壁/端壁的开放武器维护槽，保留后段密封武器箱。CPU测得槽底Y=0.88、槽沿Y=1.50，实深0.62；增加侧肋、底部双纵梁及斜撑，改变平板侧影。没有机库门、跑道或载机生产暗示，noAircraftProduction仍为true。

18槽返工模型CPU构造、有限坐标/法线、PBR、面数预算和发射方向中心射线均通过；三型仍各1mesh。此后未运行GPU，须主线程重新拍三型五视图，监督复看后才能结束视觉返工。
