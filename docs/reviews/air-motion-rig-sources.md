# v3.9.0 航空/太空活动机构：接口、来源与边界

日期：2026-10-20。仅新增 `src/vehicle-rig-air.js`、`tools/check-air-motion-rigs.cjs` 与本目录检查记录，没有修改 models3d/battle3d/index 或原模型源码。

## 依据与采用边界

- [NASA Glenn：Ailerons](https://www.grc.nasa.gov/www/k-12/VirtualAero/BottleRocket/airplane/alr.html)：外翼后缘副翼差动用于滚转。本模块两侧 `aileron.sign` 相反，不能用同向襟翼代替滚转。
- [NASA Glenn：Animated Flaps and Slats](https://www.grc.nasa.gov/www/k-12/airplane/aflap.html)：襟翼用于改变低速增升/阻力特性，起降有相应收放。`flap` 为两侧同向、独立于转弯的控制量，不能每次转弯自动全放。
- [FAA：Helicopter Flying Handbook Chapter 4](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook/hfh_ch04.pdf)：不同旋翼布局的反扭矩处理不同。只登记资产已有主/尾旋翼；Ka-52 保留反向双主旋翼，不凭空加尾桨。这里没有重新认证照片中的具体桨叶旋转方向或实际转速。
- [NASA：Onboard Systems / AACS](https://science.nasa.gov/learn/basics-of-space-flight/chapter11-2/)：姿态控制可使用推力器、反作用轮等，太阳翼有跟踪需求。游戏太空模型只在现有喷口位置提供推进反馈及分布式喷口差动参数；没有把所有卫星都当作一直喷火的火箭。`orbital_mapper` 原资产没有可确认喷口，改为已有太阳翼的姿态补偿关节，不编造外部 RCS 硬件。
- [NASA Glenn：Forces in a Climb](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/forces-in-a-climb/)：可转推力方向并非所有飞机的共同特性。本轮所有喷口保持原方向，只有尾焰形状/可见性反馈，不给 F-35A 等统一添加矢量喷管；也不声称现有 Su-57 程序资产已认证实际喷管结构。

以上资料核实运动用途，**不是各型号铰链位置图纸**。真实型号舵面位置来自现有外观的后缘/尾翼区域，美术铰链位置与限位为小幅游戏近似。原型六代机只切分已有外表面，不扩展新外形。原有来源、profile、许可、材质保持。

## 装配与运行契约

主线程在缓存模板装配阶段调用 `WarAirRig.attach(group,kind,faction)`，随后才 clone。函数幂等，不自行包装 `WarModels.create`，不读取 RAF 或墙钟，也不运行模拟。

`group.userData.motionRig` 是可 JSON 克隆的数组：`node`（唯一节点名）、`role`、归一化三维 `axis`、`pivot`、四元数 `rest`、`restScale`、`side`、`sign`。舵面另有 `limit`（弧度），部分无水平尾翼的原创模型副翼有 `mixPitch`，表示升降副翼的混合项。

| role | 推荐驱动 | 说明 |
|---|---|---|
| rotor / propeller / radar | 仿真时间与 `speed`、`sign` | 必须由 game.time 推进；重复相同仿真时间时连旋翼、雷达都冻结。已有授权 AH-64 rotor/tailRotor 各两个子网格保持原样。 |
| flap | 独立归一化 `[0,1]` × limit | 同向；仅低速/起降调度，不能由 roll 决定。 |
| aileron | roll 指令 `[-1,1]` × limit × sign | 差动；+X 机头、+Y 上、+Z 右，以右手轴角约定右侧 sign=-1。有 mixPitch 时升降项不再乘两侧差动 sign。 |
| elevator | pitch 指令 `[-1,1]` × limit × sign | 后尾翼 sign=-1，前鸭翼 sign=+1。模型轴约定与主控制层必须统一。 |
| rudder | yaw/turnRate 归一化 `[-1,1]` | 只动切分的尾舵外表面，具体转弯符号需主线程按 heading 约定映射。 |
| thruster | 实际 throttle/推进需求 `[0,1]` | effect=true，control='thrust'，方向固定 -X；普通喷口 idle=.06、太空 idle=0。不能只因太空仍在惯性滑行就持续亮主推力。 |
| solarArray | 世界光源/姿态补偿 `[-1,1]` × limit | 只用于 orbital_mapper 已有左右太阳翼，可在转向后补偿；不是随机摆动。 |

太空尾焰还提供 `yawContribution`/`pitchContribution`，便于根据现有喷口相对位置差动。只有中央单喷口的型号不会凭空获得多轴喷口效果，完整航天姿态物理并未因此实现。

尾焰仅使用新 MeshBasicMaterial，主线程应只改该节点的 `scale`/`visible`，不改共享 material.opacity/emissive。它们标记 `userData.motionEffect=true`，应排除于静止模型尺寸、碰撞包络、落地偏移统计；隐藏节点仍会被原生 Box3.setFromObject 计算，主线程必须在 attach 前保存原 bounds 或使用跳过 motionEffect 的遍历。

裁分按平面与三角形实际相交进行，插值保留全部顶点属性、共享原材质，并将新移动网格移到铰链局部坐标。没有叠放另一片舵面遮盖旧翼面。关节变换只影响实例 Object3D，既有 geometry/material 均不作动画修改。

## CPU 检查与覆盖

运行 `node tools/check-air-motion-rigs.cjs`：**36 种空天单位 × 六阵营 = 216 槽位通过**，包括实际加载离线 GLB 的美国/韩国 AH-64 两槽。明细在 `air-motion-rig-coverage.json`。

检查内容：每槽位有活动描述、节点能找到、轴向有限且归一化、静止外表面总面积守恒误差 < 2e-5、静止包围盒误差 < 2e-5 美术单位、属性集合保留、原材质引用保留、来源/许可保留、重复 attach 不叠加、克隆实例姿态相互独立、襟翼同向/副翼差动符号、导入 AH-64 网格和三角形总数不变。

本次实际最大相对表面积误差约 **1.29×10⁻⁵**；来自浮点裁分/极小退化面处理，不是摄影测量精度。程序固定翼新增约 4–8 个独立舵面批次，尾焰每喷口一个极低面数网格；完整压力测试由主线程负责，不能继续沿用此前静态模型的 drawcall 预算结论。

覆盖说明：直升机/维修无人机使用既有旋翼，固定翼使用原后缘与尾翼裁分，太空大部分使用现有喷口反馈，测绘站使用既有太阳翼。既有太空炮塔由主线程共享载具关节层处理，避免两个模块重复接管。

**尚未验收**：本模块没有 GPU 渲染；开合后切口、碰撞、尾焰遮挡、可见动作和大量单位性能仍待统一截图/运行复核。仿真时间冻结、实体实际俯仰/滚转与舵面的一致性、太阳翼补偿及惯性滑行时推力关闭，需要共享 WarVehicleAnimation 集成测试。CPU 几何检查不是“全部运动真实”的认证。
