# Tactical wave 8：原创空天职责模型参考与检查

日期：2026-10-17。模型文件：`src/models-tactical-air-space.js`。

四型均为原创游戏职责模型，覆盖 chn/usa/rus/ind/kor/imp 六阵营共 24 槽位；不以照片名称命名模型，不认证真实飞行/作战性能。公开实物照片只借鉴可见结构。源照片本轮以内存缩图实际查看，未作为贴图、模型或发布附件保存。

## 已实际看图的官方来源

| 来源 | 页面/原图 | 实际观察与采用范围 | 边界 |
|---|---|---|---|
| NASA，2021-10-15，ISS 照片 iss065e454762（拍摄说明 2021-10-08） | [Astrobee 实验照片页面](https://www.nasa.gov/image-article/astronaut-megan-mcarthur-photographs-an-astrobee-robotic-free-flyer/)；[原图](https://www.nasa.gov/wp-content/uploads/2023/03/iss065e454762.jpg) | 已实际查看像素：立方形模块机体、深色框边、圆形传感/风道面、下伸的外露短臂；用于维修机模块工具舱与连续关节臂的视觉逻辑。 | Astrobee 是舱内机器人。四旋翼、空中修飞机、工具夹爪和飞行能力全部是本项目原创职责抽象，不能归于 NASA 真实产品。该照片不足以确认具体腕部工具结构。 |
| NASA X-48B 页面，照片编号 ED06-0201-2 | [NASA 页面](https://www.nasa.gov/aeronautics/x-48b/)；[实际查看原图](https://www.nasa.gov/wp-content/uploads/2016/08/253983main_ED06-0201-2_full.jpg) | 已实际查看像素：俯斜角的宽扁翼身过渡、外翼后掠、上翘翼梢、上置独立发动机；截击机采用宽翼根与无座舱剪影，改成单脊进气、双短翼尖垂面。 | X-48B 是研究验证机；本模型不是 X-48B 武装型号，其高速、低价和短程对空机炮均为原创游戏规则。本模型没有复制 NASA 标志。 |
| ESA–G. Porter，2016-07-20 | [散热板振动试验页面](https://www.esa.int/ESA_Multimedia/Images/2016/07/Shaker_test_of_radiator_panel)；[实际查看原图](https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2016/07/shaker_test_of_radiator_panel/16076753-1-eng-GB/Shaker_test_of_radiator_panel_pillars.jpg) | 已实际查看像素：大面积浅色薄板、可辨识厚度/边缘、板内结构接口；轨道两型使用有厚度、有边框、有支臂的面板，避免悬浮零厚度片。 | 照片是地面试验件，不是护盾/武器。护盾投射环、导弹弹舱、轨道攻击机制全部原创；ESA Standard Licence 图片不随发布包分发。太阳翼仅借用一般板状外观，没有实物逐单元认证。 |

另检索了 USAF XQ-58A First Flight 页面，照片编号 190305-F-HA049-003，作者 Senior Airman Joshua Hoskins；原图访问返回 403，**没有实际看图，不作为此次视觉证据**。没有绕过访问限制。页面摘要也不算照片检查。

## 四型设计差异与连接检查

| 模型 | 独立剪影和可见组成 | 外观标记 | 战斗机制责任边界 |
|---|---|---|---|
| air_repair_drone | 四旋翼/固定护圈、短宽工具机体、腹部工具盒、双折关节维修臂、腕部夹爪、连体滑橇；没有枪口 | `unarmed:true`，`servicePoint`，`serviceDomain:'air'` | 仅维修飞机由 roster/sim 实现；几何不自行执行治疗。 |
| interceptor_drone | 宽翼根短翼身、无载人座舱、背部单进气、尾喷暗腔、双短翼尖垂面、腹部短机炮 | 前向 `muzzle` | 仅对空、廉价、高速和射程均由数据/模拟实现。 |
| orbital_shield | 短中央电源舱、四个斜向空心投射环、双动力舱、宽散热翼；不同于中继双碟或电子站三瓣平阵 | `unarmed:true`，`supportPoint`；支臂连接环的内侧实体边缘，环中心保持空洞 | 25% 减伤、仅友方 space 且包含自身由模拟实现；不声称现实存在该护盾。 |
| orbital_missile_barge | 宽双列双层短箱弹舱、外侧立柱框架、两侧动力舱、后部有厚度太阳翼；最前段为发射面，后两段为带侧检修盖的存储舱；没有中央长炮 | 最前发射面之外的 `muzzle` | 仅打 space、溅射和近防拦截由模拟实现；无真实内部武器设计。 |

材质使用 WarDetail 合批 PBR 表面分类；涂层、金属、橡胶、传感窗、太阳翼/隔热箔分开识别。喷口使用 `WarDetail.engine` 的暗腔，不以发光圆片假装开口。光照和护盾效果交由主渲染器。

## 本轮验证（不占用 GPU）

`node --check src/models-tactical-air-space.js` 通过。Node 加载 THREE/data/models3d/model-detail/本文件，创建全部 24 槽位，检查位置数组有限、元数据、武装炮口有无和网格数量，通过。中国槽位为下表代表；其余阵营标记数量有轻微面数差异。

| 模型 | mesh | 三角形（chn） | 动画 |
|---|---:|---:|---|
| air_repair_drone | 5 | 5236 | body + rotor / rotorCounter / rotor2 / rotorCounter2；均各自绕 Y 轴，spinDirection 为 ±1 |
| interceptor_drone | 1 | 8260 | 静态合批 |
| orbital_shield | 1 | 8400 | 静态合批 |
| orbital_missile_barge | 1 | 6588（监督返工后） | 静态合批 |

维修机 5 mesh 为主线程明确接受的四独立旋翼例外。主线程需扩展后两个旋翼名字的动画；本文件也提供 `spinAxis`/`spinDirection` 元数据。新脚本应位于 models3d/model-detail/data/roster 之后、gallery/battle 初始化之前。

**尚未通过视觉终验**：本轮按主线程要求没有运行 GPU，未看新增模型渲染截图。待统一串行检查透视/侧/正视、四旋翼转轴、维修夹爪与底盘相交、护盾环连接、弹舱遮挡、太阳翼背面/厚度、离线主战场与缩略图。几何检查和来源照片检查不代替这些渲染验收。也未改动 roster、模拟、FPS 或入口文件。

## 独立监督返工：驳船前端遮挡

监督 agent 实看首版透视/front/top，指出前端斜撑横跨圆形发射口、后两段串列圆口被前段堵住。制作 agent 随后实际打开 `screenshots/model-review/orbital_missile_barge_chn-front.png`，确认斜撑遮挡属实。

已将承力杆改为弹舱外侧立柱，前立柱后退至发射面后方，仍连续连接底板及顶部横梁。仅最前模块保留圆形发射面；后两段改为外侧矩形检修盖/把手，不再表示能向前独立发射。`muzzle` 从与盖面重合的位置移到最前发射面之外，`weaponVisual` 更新为 `forward-launch-racks-with-aft-storage`。

返工没有运行 GPU。Node 检查六阵营网格、有限坐标，并在每个前端发射口中心及周围采样向前射线（每阵营 72 条），均无后续几何遮挡；这些检查只证明发射面前方留空。**返工后透视/front/top 与头像仍待主线程重新生成及独立看图，不能沿用首版通过结论。**
