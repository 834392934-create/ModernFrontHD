# 第三方模型与独立版集成只读审查

审查日期：2026-10-16。
范围：src/battle3d.js、src/armory3d.js、desktop/main.cjs、build-desktop.ps1、tests/upgrade.cjs；按调用关系读取模型注册、导入模块与相关玩法入口。使用本地 review 技能，只记录可由代码路径支持的实质问题。未修改共享源码，未重复已通过的整套测试。

## 发现

### P2：独立版测试没有验证新增模型，回退模型可以掩盖漏包或导入失败

位置：tests/upgrade.cjs:38、39、43；源目录file测试亦见:30。

HTTP源目录段:7会等待WarImported.ready并断言assetSource，但实际发布EXE段只断言DesktopGame与is3D。导入模块刻意捕获解析/数据错误，以console.error、WarImported.errors报告后保留程序模型，因此这些错误不产生pageerror，EXE检查仍可能成功。pageerror监听还在ModernFront就绪之后才注册。这样“源目录成功 + 旧的/缺资源的包仍有程序模型”也能获得独立版通过报告。

影响：测试本身无法证明用户启动release/ModernFrontHD/ModernFrontHD.exe时确实获得本次伯克模型；后续AH64同样可能受影响。不是已确认当前打包缺文件，而是本次发布检查的覆盖缺口。

建议最终打包后，在EXE窗口等待各导入ready，断言status=ready、errors为空、destroyer_usa.assetSource及PBR材质标记；AH64加入后做同类检查。监听初始化阶段console.error并明确区分预期回退。已有burke-import-failure-verification.json证明“数据缺失但程序模型仍可创建”的回退路径真实存在，无需破坏正式发布目录来验证。

## 无阻塞结论及依据

本次未发现P0/P1运行阻塞。

- 异步刷新：WarModels.register清理对应缓存；battle3d.js:26清理当前实体显示对象，下一帧根据原游戏实体重建，不修改战斗状态。导入若早于renderer创建，后续create直接取注册模型；若晚于创建，则事件替换。armory3d.js:44重新加载当前选择并保留预设视角。
- 材质：armory3d.js:22保留preserveMaterial；战场:133仅给保留的材质注入战雾，不把PBR替换成统一迷彩。纹理、法线和金属粗糙属性仍由作者材质提供。wireframe对保留材质亦生效，迷彩按钮有范围说明。
- 战雾：fogify沿用原onBeforeCompile并加入世界坐标采样；视野外敌方实体在draw路径被设为不可见。现有app只创建一个持久Battle3D renderer，共用材质不会跨多个同时存活战场绑定错误战雾uniform。
- 方向/水线：已复用先前实际看过的伯克三视角与file://验证证据，源GLB正向转换为+X，战场rotation.y=-angle与模拟平面方向一致。导入保留源Y=0水线，图库按最低点落地仅为展示，不改变缓存资产。
- 打包路径：desktop/main.cjs相对desktop目录的上一级加载index/gallery；build-desktop.ps1:9复制完整src、assets、desktop与许可证文档到resources/app。当前引用的GLTFLoader、base64数据、模型模块都在覆盖范围内，无额外网络运行依赖。原作者网页经外部浏览器打开，gallery以应用内本地页面打开。
- 玩法入口：新增集结、队列、矿车采集、CIWS拦截与渲染代码接口未见本次接入造成的直接断裂。CIWS把shot改为intercepted后，伤害结算只处理shot，因此拦截并非纯视觉效果。此为调用路径审查，不代替长局平衡或寻路压力测试。

## 局限

- 本审查在AH64导入合入前完成；新增模块仍需主线程最终等待ready、验证实际型号材质及打包文件。
- 没有重新跑整套已通过浏览器/EXE测试；使用已有伯克离线加载、失败回退、三视图证据加只读代码检查。最终包仍应跑一次新增资产断言。
- Naval实体统一在世界Y=2、水面顶Y约0.25，源水线存在约1.75世界单位的展示上浮量；这是可见性调节，不是严格吃水还原，本轮不列阻塞。
- 材质共享来源于WarModels缓存浅材质clone；当前单战场/独立gallery页面路径可用。若未来一个页面同时放多个战场renderer，需要重新设计每renderer的战雾材质归属。
- 本轮外观提高不等于整套装备已达到照片级精确复刻，未知/概念装备仍按既定范围暂缓。

## 主实现者处理（最终发布检查）

P2验收缺口已补：`tests/upgrade.cjs`在实际EXE中等待伯克、AH-64、T-90M导入，检查ready、errors、assetSource、CC-BY及每个网格材质；在等待ModernFront之前挂接pageerror/console.error。发布入口和全部入口脚本还与工作区作SHA256比较。最终11组浏览器检查及EXE启动/全屏/沉浸检查均通过，`docs/desktop-report.json`记录四个已导入槽位及零错误。之后全屏RTX 3060实测中、美、俄152实体压力场景约50 FPS；这是短时静态军团结果，不是持续战斗保证。
