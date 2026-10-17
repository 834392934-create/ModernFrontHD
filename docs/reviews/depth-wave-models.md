# 水下 / 全域四型原创模型

日期：2026-10-17。文件：src/models-depth-wave.js。四型 × 六阵营共 24 槽位。

本轮是用户授权的原创游戏职责模型，不宣称对应任何真实潜艇改型、航空器或太空武器；六阵营主要改变材质和小标记，不等于 24 种真实型号。模型坐标只用于比例，不是加工尺寸或武器工程资料。全域突击机、无畏舰全部为科幻设计；能力、价格与战斗规则由数据和模拟实现。

## 参考证据

| 来源 | 访问与观察状态 | 用途与边界 |
|---|---|---|
| [NOAA Deep Discoverer 官方页面](https://oceanexplorer.noaa.gov/technology/subs-deep-discoverer/)；[水下原图](https://oceanexplorer.noaa.gov/wp-content/uploads/2018/09/d2-1-hires.jpg) | 阅读页面；原图经内存缩图实际查看像素，未保存或打包。可见浅色上部设备舱、下部开放作业架、向前投光照亮海床；画面偏暗，不能辨认每个关节。 | 保障艇借鉴外露作业架、前灯和工具作业空间。双压力舱、双臂细节、无缆自主维修均为本项目原创，不冒称复制 Deep Discoverer。两机械臂的存在有官方文字支持，但不能把本模型的关节数与轮廓当作照片实证。 |
| [US Navy Attack Submarines](https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169558/attack-submarines-ssn/) | 搜索返回官方事实页，打开返回 403；未实际检查 Navy 照片。 | 猎潜艇不命名为 Virginia、Seawolf 或任何国家型号；只使用一般流线壳、帆罩、控制翼和推进器的原创组合。不能据此认证真实艇外形。 |
| [NASA X-59 官方概述 PDF，2023](https://ntrs.nasa.gov/api/citations/20220017632/downloads/SciTech2023_X59aircraftOVUaud_111822.pdf)；[NASA 公布页面](https://www.nasa.gov/news-release/nasa-lockheed-martin-reveal-x-59-quiet-supersonic-aircraft/) | 已读官方文字及 PDF 特征说明；截图工具仅返回 URL/超时，本轮没有取得可视像素，不能记为实际看图。 | 只借鉴机翼、进排气与传感舱需要有连续连接这一普通外形逻辑。双发动机、升力风扇、武装均是原创，绝不称 X-59 武装版，也不搬用其性能数据。 |
| [ESA 散热板振动试验](https://www.esa.int/ESA_Multimedia/Images/2016/07/Shaker_test_of_radiator_panel) | 沿用项目已记录的上一轮实际图片观察，见 tactical-air-space-references.md；本轮没有重复看图。 | 无畏舰的散热翼采用有厚度的面板、支臂与管线；主脊武器、推进舱和装甲舰桥为科幻设计。无真实轨道武器工程依据。 |

另外实际查看了 NOAA [出舱原图](https://oceanexplorer.noaa.gov/wp-content/uploads/2018/09/d2-2-hires.jpg) 的内存缩图：可见竖向开放框架与上部浅色设备块，图像本身较模糊，未据此认定细小零件。

这些链接用于溯源，照片没有成为贴图、模型或发布附件。

## 结构与识别

| key | 主要结构和区别 | 锚点与动画 |
|---|---|---|
| hunter_sub | 单根细长流线壳、深色声呐艏罩、狭长帆罩、艏翼、十字尾翼、开放泵喷护环；不使用舰桥玻璃窗 | muzzle 位于前部侧面鱼雷出口之外；独立 propeller 绕 X 轴 |
| abyss_tender | 宽双压力舱、开放中框、中央工具箱、两折机械臂、双夹爪、前照灯、后部双推进口、底部落架；没有武器 | unarmed=true；servicePoint；静态合批 |
| omni_striker | 大后掠翼、短前翼、双发动机真实暗腔、两独立升力风扇、双倾斜垂尾、分段装甲、腹部舱和前向武器 | muzzle；rotor / rotorCounter 绕 Y 轴，记录 spinAxis / spinDirection |
| omni_dreadnought | 长主脊炮、宽侧装甲舱、后部多发动机、宽散热翼、独立装甲舰桥、上置任务模块；区别旧轨道导弹箱阵列 | 前端 muzzle；weaponVisual=spinal-launcher-with-side-mission-pods；静态合批 |

所有可渲染组使用 WarDetail 材质，涂层/金属/橡胶/玻璃/隔热金属按表面分级；没有创建新的着色器依赖。每种模型保存 original-role-variant、detailPass=2、独立 profile、modelFamily 和 scale 元数据。

## 非 GPU 检查

node --check 通过。Node 加载 THREE、data、roster、models3d、model-detail 和本文件，24 槽全部构造成功；位置/法线数值有限，surface 属性数量一致，preserveMaterial 为真，mesh ≤ 4、三角形 < 30000。

| chn 代表槽 | 三角形 | mesh | scale |
|---|---:|---:|---:|
| hunter_sub | 7288 | 2 | 4.4 |
| abyss_tender | 9668 | 1 | 4.6 |
| omni_striker | 20192 | 3 | 5.9 |
| omni_dreadnought | 8780 | 1 | 5.0 |

三种武装模型从 muzzle 向 +X 射线，均没有后续自身几何相交；这只验证中心射线，不代替视觉检查或实际命中测试。保障艇没有 muzzle。

**尚待串行 GPU 视觉验收**：主线程生成正/侧/顶/透视图，监督检查首尾朝向、潜艇泵喷和鱼雷口、保障艇臂/舱干涉、全域机升力风扇与机翼间隙、无畏舰主脊/面板连接。主战场水下透明/雾效、第一人称与战斗机制由主线程负责，本文件的几何检查不能证明其运行正确。未运行 GPU、未修改其它源文件、未提交 Git。

## 最终闭环补充

主线程依据独立监督的正/后视反馈，为保障艇补齐底架→横梁→相机盒支柱，重新生成20张多视图及510张同源头像；最终面数以 model-capture-hunter_sub_chn.json 为准。四种模型的结构辨识通过本轮监督，原生水下/飞行功能证据见 depth-flight-supervision.md。先前非GPU表为返工前记录，不代表最终美术认证。
