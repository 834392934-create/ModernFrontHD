# 地面装备实图审查与模型修改记录

审查日期：2026-10-16。范围仅公开外观游戏美术，不记录内部结构或制造参数。搜索自动图说多次出现轴数/型号错误，本报告的可观察特征以实际打开的像素为准。

**最新状态以 [25型轮廓门禁](ground-silhouette-gates.md) 为准。** 下文逐轮问题保留为历史记录，P1 的最后关闭情况已在门禁表逐项说明；初审通过仍不表示精细资产验收。

来源映射校正：PLZ-05 实际查看的下载备用图来自 https://www.sohu.com/picture/752175627 ；K239 实际查看图来自 https://commons.wikimedia.org/wiki/File:K239_Chunmoo_MLRS.png ；K30 实际查看图来自 https://w.atwiki.jp/namacha/pages/60.html 。Pantsir 采用 Commons 链接，不采用失效占位图。`models-vehicles.js` 的 referenceUrl 使用这些已查看图的页面来源。

## 判定边界

“已看实图”指审查者实际用图像工具查看过本地下载的图片，不等于图片具有游戏内再发行许可。参考下载在 `.tmp/references/ground`，不打包；模型为原创网格。程序不报错只验证可渲染，不能替代真实外观验收。尚未达到摄影测量或《坦克世界》资产质量。

## 五型坦克

|型号|实图链接|已看实图|旧模型问题/修改方向|
|---|---|---|---|
|ZTZ-99A|[中国国防部/中国军网](https://www.mod.gov.cn/gfbw/jmsd/4806118.html)|是，type99a.png|旧梯台炮塔、等距盒颊甲、薄车首错误。主实现者第2轮已加前下甲、炮塔平顶与折面、六轮轮组；本审查判定“轮廓初审通过、细节待复核”。|
|M1A2家族|[DVIDS实车](https://www.dvidshub.net/image/5852204/abram-tank-operations)|是，assets/references/m1a2-dvids.jpg|本图用于家族外形，不能单凭照片认证 SEPv3 每个套件。第2轮宽钝炮塔优于旧尖鼻，但中央炮盾与左右颊甲分面仍缺，P1待修。|
|T-90M|[Rostec原厂说明/照片](https://www.rostec.ru/media/news/tank-t-90m-proryvnaya-mashina/)，[已看展示实图](https://warfiles.ru/231820-novejshaja-versija-tanka-t-90m-obzavelas-vydvizhnoj-sistemoj-nabljudenija.html)|是，t90m.jpg|不能与 T90S 共用圆台炮塔。独立长尾部、分层侧甲、顶部观瞄、低前车体；当前主实现者新模型待多视角复核。|
|T-90S Bhishma|[印度制造商身份来源](https://avnl.co.in/index.php/milestone)，[已看阅兵实图](https://sputniknews.in/20250407/indian-army-to-procure-anti-drone-systems-for-t-72-and-t-90-tanks-8956117.html)|是，t90s.jpg|六轮、低炮塔分块颊甲，照片没有 T90M 那样大尾部箱形轮廓；独立印度参考涂装及附件，不能从俄军新型直接换色。|
|K2|[Hyundai Rotem产品页](https://www.hyundai-rotem.co.kr/en/business/defense/details.do?productCt03=defense0101)，[已看展览实拍转载](https://forum.warthunder.com/t/k2-black-panther-technical-data-and-discussion/170934)|是，k2.jpg|宽炮盾、扁平楔形炮塔、侧面长箱、六轮、明显前灯罩。展车有配置差异，不把所有展车附件默认为量产型；当前新模型待复核。|

## 20类已知地面装备逐项审查

### M2A3 Bradley

- 实图：[参考页面](https://www.dvidshub.net/image/6775085/iron-rangers-off-load-military-vehicles-mk-air-base)；已实际查看：是，`.tmp/references/ground/0.jpg`。
- 可观察特征：高车体、六负重轮、左侧 TOW 盒、偏置观瞄、后跳板。
- 旧模型偏差：原先低矮通用炮塔/单炮，没有 TOW。
- 此轮修改与剩余项：已加 TOW/高车体；P2：斜侧板和反应装甲分块、炮塔后部仍简化。

### BMP-3

- 实图：[参考页面](https://defence-ua.com/news/zsu_na_pjatij_misjats_vijni_prodovzhujut_zbirati_trofejni_bmp_3_rashistiv_foto-8320.html)；已实际查看：是，`.tmp/references/ground/1.jpg`。
- 可观察特征：低舟形车首、六轮、并列粗细炮管、侧面窄翼子板。
- 旧模型偏差：原单细炮管，所有 IFV 相同。
- 此轮修改与剩余项：已双炮/低圆台炮塔；P1：车首甲面仍偏短，轮带首尾曲线需要重做。

### ZBD-04A

- 实图：[参考页面](https://odin.t2com.army.mil/WEG/Asset/ZBD-04A_Chinese_Amphibious_Infantry_Fighting_Vehicle_%28IFV%29)；已实际查看：是，`.tmp/references/ground/2.jpg`。
- 可观察特征：高直侧板、楔形车首、六轮、双炮、模块化炮塔侧板。
- 旧模型偏差：与 Bradley 共模换色。
- 此轮修改与剩余项：已高车体/侧板/双炮；P2：前部斜面转折、侧面舱盖与涂装细化。

### BMP-2 Sarath

- 实图：[参考页面](https://timesofindia.indiatimes.com/defence/weapons/tank/bmp-2-sarath)；已实际查看：是，`.tmp/references/ground/3.jpg`。
- 可观察特征：低车体、六轮、圆台小炮塔、单细炮、顶置导弹。
- 旧模型偏差：与 BMP3 没有外形差别。
- 此轮修改与剩余项：已单细炮/顶置筒；P1：车尾双门和侧面射孔/观察块仍缺。

### K21

- 实图：[参考页面](https://historia.org.pl/2022/05/30/k21-i-as21-redback-czyli-koreanskie-bojowe-wozy-piechoty/)；已实际查看：是，`.tmp/references/ground/4.jpg`。
- 可观察特征：高车体、六轮、大块斜面炮塔、明显观瞄、侧储物篮。
- 旧模型偏差：共用小炮塔。
- 此轮修改与剩余项：已储物篮/观瞄；P1：炮塔前脸和宽度仍应区别 04A。

### M109A7

- 实图：[参考页面](https://babel.ua/amp/news/46776-ssha-pochinaye-vikoristovuvati-suputniki-dlya-navedennya-artileriji-na-cili)；已实际查看：是，`.tmp/references/ground/5.jpg`。
- 可观察特征：六轮、较大后置炮塔、带分区炮盾、短于 K9 的炮管、侧门/尾架。
- 旧模型偏差：共用低长方盒+细杆。
- 此轮修改与剩余项：已六轮/后置多面炮塔/侧门；P1：炮盾及炮口制退器太简化。

### 2S19 Msta-S

- 实图：[参考页面](https://commons.wikimedia.org/wiki/File%3AArtillery_exercise_with_2S19_Msta-S_at_the_Mulino_Training_Ground_%2825-03-2020%29_06.jpg)；已实际查看：是，`.tmp/references/ground/6.jpg`。
- 可观察特征：高大后置炮塔、六轮、侧门、后部装填设备轮廓。
- 旧模型偏差：与其它自行炮完全同形。
- 此轮修改与剩余项：已高炮塔/尾部设备；P2：炮塔右后侧展开件和观瞄进一步细化。

### PLZ-05

- 实图：[参考页面](https://eng.chinamil.com.cn/2025xb/H_251454/F_251457/16420082.html)；已实际查看：是，`.tmp/references/ground/7.jpg`。
- 可观察特征：高方炮塔有转折、长炮管、六轮、车首炮架。
- 旧模型偏差：一块方盒。
- 此轮修改与剩余项：已转折炮塔/炮架；P1：炮盾凹口和尾部整体轮廓仍简化。

### K9 Vajra-T

- 实图：[参考页面](https://m.economictimes.com/news/defence/lt-bags-its-biggest-defence-order-worth-rs-4500-crore-to-supply-self-propelled-guns-to-indian-army/articleshow/58644663.cms)；已实际查看：是，`.tmp/references/ground/8.jpg`。
- 可观察特征：K9 家族大型前倾炮塔、六轮、长炮管、车首灯组、印度涂装。
- 旧模型偏差：共用方盒。
- 此轮修改与剩余项：家族轮廓与 K9 共用合理；P2：印度具体批次外部附件仍待补照片。

### K9 Thunder

- 实图：[参考页面](https://medium.com/lessons-from-history/5-most-dangerous-artillery-guns-in-the-world-9a35d8a1e491)；已实际查看：是，`.tmp/references/ground/9.jpg`。
- 可观察特征：前倾炮塔、六轮、长炮管、侧门、车首灯组。
- 旧模型偏差：所有自行炮同形。
- 此轮修改与剩余项：已家族轮廓；P1：前炮盾和侧面圆门细节不足。

### M142 HIMARS

- 实图：[参考页面](https://thegaze.media/news/victorys-arsenal-its-himars-oclock)；已实际查看：是，`.tmp/references/ground/10.jpg`。
- 可观察特征：6×6、装甲驾驶室、单荚六口、后部起竖框/装载架。
- 旧模型偏差：原为8×8且六根独立方管。
- 此轮修改与剩余项：已6×6+单荚；P1：驾驶室前脸/起竖框仍简化。

### BM-30 Smerch

- 实图：[参考页面](https://truck-encyclopedia.com/coldwar/ussr/BM-30_Smerch.php)；已实际查看：是，`.tmp/references/ground/11.jpg`。
- 可观察特征：8×8 长底盘、偏置驾驶室、十二圆管束。
- 旧模型偏差：与所有火箭车一样的六方管。
- 此轮修改与剩余项：已偏置驾驶室+12圆管；P2：外侧驾驶室曲面、后部管束支架。

### PHL-191

- 实图：[参考页面](https://www.g-enews.com/article/General-News/2019/12/201912091306401342c5557f8da8_1)；已实际查看：是，`.tmp/references/ground/12.jpg`。
- 可观察特征：8×8、大驾驶室、双发射模块（本图8圆口）、长底盘。
- 旧模型偏差：原6方管通用卡车。
- 此轮修改与剩余项：已8口双荚；P1：车头楔形与双荚外露筒结构仍简化。

### Pinaka

- 实图：[参考页面](https://tribune.com.pk/story/2527703/france-in-talks-to-purchase-rocket-launcher-from-india-officials-confirm)；已实际查看：是，`.tmp/references/ground/13.jpg`。
- 可观察特征：8×8 Tatra/BEML 驾驶室、2×6 发射组。
- 旧模型偏差：原六管/通用卡车。
- 此轮修改与剩余项：已双六组；P1：Tatra 车头形状仍应独立化；不把搜索自动描述的6×6当事实。

### K239 Chunmoo

- 实图：[参考页面](https://viggen.tistory.com/entry/25102406)；已实际查看：是，`.tmp/references/ground/14.jpg`。
- 可观察特征：8×8、高驾驶室、双模块六口；韩国产基础车，不是波兰改型。
- 旧模型偏差：原六方管。
- 此轮修改与剩余项：已双模块+8轮；P1：驾驶室高比例/舱后空隙还需修。

### Stryker M-SHORAD

- 实图：[参考页面](https://odin.t2com.army.mil/WEG/Asset/d8e35b53d1a96872dcc5ca0865253b54)；已实际查看：是，`.tmp/references/ground/15.jpg`。
- 可观察特征：8×8 低楔形装甲车、远程武器站、雷达/光电装置。
- 旧模型偏差：原履带底盘和巨大导弹架错误。
- 此轮修改与剩余项：已8轮独立车体/紧凑武器站；P2：锁定双Stinger参考配置，车侧格栅尚简化。

### Pantsir-S1

- 实图：[参考页面](https://topwar.ru/7553-voyskovaya-pvo-problemy-transformacii.html)；已实际查看：是，`.tmp/references/ground/16-pantsir.jpg`。首次16.jpg是网站占位图，明确拒收；采用[Commons实拍](https://commons.wikimedia.org/wiki/File:Bronnitsy_-_02_-_Pantsir-S1_SAM.jpg)。
- 可观察特征：KamAZ8×8、两组六筒、两侧炮、顶部搜索雷达与正面跟踪雷达。
- 旧模型偏差：原履带车且没有双炮。
- 此轮修改与剩余项：已8轮卡车/双炮/12筒/双雷达；P1：雷达支架和整机设备箱体比例仍待细化。

### HQ-17

- 实图：[参考页面](https://www.popsci.com/blog-network/eastern-arsenal/hq-17-classic-russian-missile-new-chinese-twist/)；已实际查看：是，`.tmp/references/ground/17.jpg`。
- 可观察特征：履带车、封闭垂发上体、前跟踪雷达、后部矩形搜索雷达。
- 旧模型偏差：原侧挂八导弹盒，类似别的系统。
- 此轮修改与剩余项：已改垂发/双雷达；P1：上体应带侧斜面，不能维持纯方盒。

### Akash

- 实图：[参考页面](https://m.rediff.com/news/report/r-day-parade-indian-army-showcases-its-might-at-rajpath/20220126.htm)；已实际查看：是，`.tmp/references/ground/18.jpg`。
- 可观察特征：照片为8×8卡车、三枚外露弹体及支架；非 Akash-NG筒装。
- 旧模型偏差：原履带+侧挂方管。
- 此轮修改与剩余项：已3弹外露卡车；P1：架体抬升角/箱体分割、弹体外轮廓还需照片对齐。

### K30 Biho

- 实图：[参考页面](https://siamrath.co.th/n/576487)；已实际查看：是，`.tmp/references/ground/19.jpg`。
- 可观察特征：六轮履带车、左右分开的双炮、大雷达；本图基础炮型。
- 旧模型偏差：原导弹盒且没有双炮。
- 此轮修改与剩余项：已改双炮雷达；P1：炮塔两侧耳轴大圆面和后篮尚待细化。

## 已实现与复核

独立模块 `src/models-vehicles.js` 注册20套车辆外观；保留游戏炮塔旋转接口和共享材质。完成两轮渲染：20/20可生成，无页面异常。第二轮修复了发射架悬空、挡风玻璃嵌入车体、车体侧板过薄、炮塔纯方块等问题。截图在 `screenshots/ground-review`，机器报告为 `docs/reviews/ground-render-report.json`。

轮廓初审可识别类别：BMP-3、ZBD-04A、2S19、Smerch、Stryker M-SHORAD、Pantsir、HQ17、K30 已具备各自区别于旧共模的主要特征，但这不是型号高保真验收。逐项P1仍保留，不把它们作为未知装备生成的已通过经验库。其它模型同样维持“实图重建中”状态。

下一轮验收必须锁定同配置、同近似视角：1）侧视核对轮数/车长比例和主要部件位置；2）前视核对炮盾/颊甲/驾驶室开窗；3）后三分之四核对尾部舱门和设备；4）近景查看硬边、法线、涂装、履带方向。每型至少3张合格实物图；本轮单张或单侧图不能推断遮挡面。

## 首选官方交叉来源

- [HIMARS 制造商媒体包](https://www.lockheedmartin.com/en-us/products/himars/media-kit.html)
- [美陆军 M-SHORAD 部署实拍](https://www.army.mil/article/251051/unit_completes_first_live_fire_of_armys_new_m_shorad_system_in_europe)
- [BMP-3 出口商外观资料](https://roe.ru/pdfs/pdf_6378.pdf)
- [Pantsir-S1 出口商外观资料](https://roe.ru/pdfs/pdf_6432.pdf)
- [中国军网 PLZ-05 实拍](https://eng.chinamil.com.cn/2025xb/H_251454/F_251457/16420082.html)
- [中国国防部 04A/HQ17 训练报道](https://eng.mod.gov.cn/2025xb/D/V/16444009.html)
- [Hanwha K21/K9/Chunmoo/Biho产品线](https://hanwha-aerospace.eu/products-services/)
- [L&T K9 Vajra 外观来源](https://newsnviews.larsentoubro.com/Lists/Article/DispForm.aspx?ContentTypeId=0x0100EF455C4C063A584F87C6890804F21B42&ID=305)

ASAT、虚构采矿车、未知概念武器本轮不当作已验证实物改造。未找到并核验可直接再分发的高保真武器3D网格；不从商业游戏提取资产。版权未知实图仅本地研究，未进入游戏资产目录。

## 第三轮改进复核

以上逐项表保留第二轮审查记录。第三轮已实际修正：K21宽炮塔独立折面；M109/K9/PLZ等增加凹入式炮架及侧颊；K9侧圆门；PHL191由封闭长方荚改为外露圆筒组；各国驾驶室高度和前窗倾斜差异；HQ17上体收分斜面；K30双炮耳轴圆面与后储物篮；BMP低车体前斜面延长。第三轮20模型再渲染无异常，亲眼复核K21、PLZ05、PHL191、HQ17、K30的输出。

这些纠正降低了型号识别错误，但精细造型和材质仍明显是程序化游戏网格。特别是轮带端部曲线、卡车发动机舱/驾驶室曲面、车辆局部贴花及磨损需要后续独立工作，不应宣称全部已接近实物。已有照片的型号不因三维渲染成功而自动通过完整验收。各型三视图完整照片不足之前，未知装备生成继续暂缓。
