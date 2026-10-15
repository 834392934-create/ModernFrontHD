# 公开来源与实现取舍

核查日期 2026-10-16。网页可能更新；源码 src/equipment.js 保存来源键、具体字段、未知项和状态。

## 阵营口径

[GFP 2026 原始榜单](https://www.globalfirepower.com/countries-listing.php)：美国、俄罗斯、中国、印度、韩国。本版为这五个现代阵营加一个独立科幻阵营。该私人复合指数不代表具体冲突胜负，也不用作现实性能系数。

## 已核实字段的示例

- [现代 Rotem K2](https://www.hyundai-rotem.co.kr/en/business/defense/details.do?productCt03=defense0101)：道路 70 km/h、越野 50 km/h。
- [美国陆军 M1A2 SEP 家族报道](https://www.army.mil/article/43803/armor_school_sends_first_wave_of_tanks)：42 mph，换算 67.6 km/h。只作为家族参考，不能称 SEPv3 专项测试值。
- [美国陆军 M109A7](https://www.army.mil/article/290976/iron_soldiers_steel_beasts_defender_battalion_masters_new_paladin_howitzers)：155 mm。
- [洛马 F-35](https://www.lockheedmartin.com/f35/about/5th-gen-capabilities.html)：Mach 1.6。马赫数受音速影响，不填无环境条件的精确 km/h。
- [达索 Rafale](https://www.dassault-aviation.com/en/defense/customer-support/operational-aircraft/rafale/)：高空 Mach 1.8 / 低空 750 kt。
- [中国国防部 99A](https://eng.mod.gov.cn/xb/Home/Focus/16300466.html)、[055 型](https://eng.mod.gov.cn/2025xb/D/S/16448046.html)、[PHL-191](https://eng.mod.gov.cn/2025xb/D/V/16478670.html)：公开身份；不自行补写防护、精确探测距离和作战毁伤。
- [美国空军 F-47 公开研发](https://www.af.mil/News/Article-Display/Article/4131094/statement-by-chief-of-staff-of-the-air-force-gen-david-allvin-on-the-usaf-ngad/)：公开项目不是已验证服役性能。
- [太空军 X-37B](https://www.ssc.spaceforce.mil/Newsroom/Article/4283438/us-space-force-successfully-launches-x-37b-orbital-test-vehicle)：在轨试验平台；没有据此认定武装化或具体侦察载荷。

其余型号在资料库中注明定量资料待补证。型号题材、可见外观、游戏性能是三个不同层次。没有声称本版完成全部现代装备的逐型号精确复原。

## 游戏映射

已知地面速度按 km/h ÷ 3.6 × 3 转成游戏移动速度（3 倍时间压缩）；K2 的阵营机动特性再乘 1.12，明确属于游戏修正。未知数值使用同类型基线。空战速度、武器距离、生命、护盾、产能、地形、弹道、舰载机攻击和轨道层均有显著抽象。

概念强化以同类型基类为比较：六代机 1000 生命 / 155 单发伤害，对比普通战斗机 420 / 62。无公开信息的轨道武装、护盾和反轨道地面单位标为架空。核打击是虚构的区域伤害机制，不采用现实核武器毁伤模型。

## GitHub 调研

- [OpenRA](https://github.com/OpenRA/OpenRA)：参考模拟 / 渲染 / 控制分层的成熟 RTS 方向。没有复制其源代码或游戏素材。GPL 与原游戏素材许可不同，不能混为一谈。
- [PathFinding.js](https://github.com/qiao/PathFinding.js)：栅格寻路方向参考。本版自行实现二叉堆 A*、禁止斜角穿墙，陆海不同通行栅格。
- [RBush](https://github.com/mourner/rbush)：空间索引方向参考。本版规模采用更简单的固定网格哈希，不引入库依赖。
- [cnc-ddraw](https://github.com/FunkyFr3sh/cnc-ddraw)、[Phobos](https://github.com/Phobos-developers/Phobos)：用于识别原目录组件及兼容思路，没有加载 DLL、修改原整合包或复制其二进制。

## 原目录静态识别

用户目录 D:\红警\2024 中 ddraw.dll 自报 DirectDraw replacement 1.3.5.0，Ares.dll 自报 21.352.1218，Phobos.dll 自报 0.3.0.1。版本资源和哈希只能辅助标识，不能证明文件与上游源码完全一致。ddraw.ini 使用 renderer=auto、maxfps=125、vsync=false、bilinear.glsl。不能据此声称 AI 画质增强或 DLSS。原目录保持不变，未执行未知二进制。

## 同人边界

战锤·人类帝国是非官方同人模式，名字和世界观属于其权利方；原始视觉模型与代码为本项目自行生成，不搬运官方美术。参考 [Warhammer Community](https://www.warhammer-community.com/en-gb/articles/HPHWBtld/warhammer-40000-faction-focus-astra-militarum/)。商业发行前需独立处理相应权利；本项目不附带战锤商标或官方素材的授权。
