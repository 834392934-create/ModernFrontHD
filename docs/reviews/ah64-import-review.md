# AH-64 Longbow 外观资产接入复核

2026-10-16。只新增航空导入脚本、AH64资产、离线转换与检验工具；共享HTML、battle3d、models-imported.js由主代理接线。

## 已完成

- 作者：Andrew Swihart / ArionDigital；CC-BY-4.0。原作者API与下载glTF的作者、许可、ID一致，证据在`assets/models/ah64-source-api.json`，署名和修改说明在`assets/models/ah64-LICENSE.md`。
- 静态同材质合批：129 mesh / 15材料条目降为**12 mesh / 10材料条目**；除下述四片主桨涂层外，原PBR参数保留。未减面、未加贴图，220,715面中只删除两块完全透明的摄影棚平面4面，剩**220,711面**。
- 离线GLB约12.35 MB，嵌入JS约16.46 MB，无运行时远程资源请求需求。未新增库；转换工具只使用Node与项目已有THREE。
- 原作者网格不是按运行时动画组织；通过源节点包围盒与多视图，显式将四片主桨、旋转桨毂/连杆、尾桨分组。主桨`rotor`绕Y，尾桨`tailRotor`绕Z；主轴、桅顶雷达与机身保持静止。
- 原网格源坐标+Z朝前；烘焙到+X朝前。原整体姿态约10°低头，直接转向后的侧视出现尾轮悬高、主桨倾斜。离线校正该姿态后重新捕获，主桨水平，主轮着地且尾轮接近地面。不同起落架悬架未做受力模拟。
- 美国与韩国直升机注册为**AH-64 Longbow reference configuration**，不声明已认证到具体AH-64E批次。原脚本的程序化AH-64E仍作为失败回退。

## 主桨材质复核

初版原PBR参数在游戏强光下呈银白色。重新目视已核验的[Boeing前斜实拍](https://www.boeing.com/content/theboeingcompany/us/en/defense/military-rotorcraft/ah-64-apache.html)与[DVIDS侧面实拍](https://www.dvidshub.net/image/6422832/tf-expect-no-mercy-flyover-greece)，主桨为深灰黑色，明亮金属部位集中于桨毂。仅源节点144/147/150/153的四片主桨改为深灰非金属涂层：linear RGB=(0.012,0.016,0.019)，metalness=0，roughness=0.87。这是照片引导的游戏材质参数，不是实物材料测量。145/148/151/154根部连杆、158/160桨毂保持原材质，增加1个绘制批次。重新导出GLB/嵌入JS，重跑7项验证，errors=0，并亲眼检查新透视/俯视/转桨截图，桨叶已为深灰、桨毂仍有金属高光。

## 接线接口

顺序：THREE、GLTFLoader、models3d.js、models-air.js之后，加载：

```html
<script src="assets/models/ah64-data.js"></script>
<script src="src/models-imported-air.js"></script>
```

状态：`window.WarImportedAir = {status, ready, loaded, errors}`。等待`WarImportedAir.ready`；成功派发`war-models-ready`，detail.loaded为`['heli_usa','heli_kor']`。失败派发`war-models-error`，不会替换程序构建器。网格均`userData.preserveMaterial=true`。

模型元数据包含author/license/assetSource/referenceUrl、scale=8、profile、limits。一次加载只解析一份模板；实例共享几何。原有WarModels缓存决定同阵营实例的材质共享规则。

## 验证

命令：

```text
node tools/convert-ah64.cjs
node --check src/models-imported-air.js
node tools/capture-ah64-review.cjs
```

最终运行结果：**7项记录，浏览器pageerror 0**。

1. HTTP下美国/韩国均解析成功，12网格、220,711三角面，最低点y=0。
2. `file://`下同样两阵营成功，不依赖HTTP加载GLB。
3. 两种协议下改变主桨Y角与尾桨Z角，静态机身世界矩阵不变，两个旋翼轴心不漂移。
4. 人为清空嵌入字节后导入状态failed，美国/韩国仍能创建原程序模型。

捕获`ah64-perspective.png / front / rear / side / top`五视图和`ah64-rotated.png`。已实际查看透视、正面、侧面、俯视、转桨后透视，确认机鼻朝+X，尾旋翼在后部，四片主桨旋转时机体不旋转。

数值报告：`ah64-conversion.json`、`ah64-import-validation.json`。

## 仍有的边界

- 这是许可清楚的第三方外观模型，不能凭面数、授权、运行通过宣称实机每一部位准确。
- 原模型没有蒙皮贴图和座舱完整内部，黑色舱窗和材质保留原作者设置。Longbow构型与照片的具体批次差异需保留说明。
- 12个网格只是基础绘制批次；开启阴影/透明材料时实际GPU调用更多。220k几何每架仍较重，主代理需在实际遭遇战做多架直升机压力验证，再决定LOD；本轮没有引入大减面依赖。
- 公共来源照片仅作外观研究，没有作为纹理或模型附件再分发。
