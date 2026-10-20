# Existing launch/gun anchor correction — 2026-10-20

The original five-country `models-vehicles.js` IFV, artillery, rocket and AA builders had no `muzzle` Object3D. Their imperial fallback models also lacked one. The first-person controller consequently selected its documented body-centred fallback in `direct-control.js:177`, which explains a rocket discharge at the vehicle's X/Z center. `rocket_artillery` currently exists only as an effects-category alias; it is not a registered unit/model.

The correction adds only Object3D markers and source metadata. No vertex, index, material, model scale or navigation envelope changes. Every marker is a child of the existing turret, so it follows the turret's original transform. A small **0.012 model-art-unit** outward offset separates coplanar effects; it is not an asserted weapon measurement. ASAT retains its prior top clearance of approximately 0.011.

## Source of marker coordinates

- **IFV:** the large primary barrel's existing end-cap surface in `models-vehicles.js:48` (`barrel` helper). Russia uses the center barrel, China the larger barrel at z=-0.2, preserving separation from their secondary small cannon. Other countries use their single main barrel. Imperial fallback uses the end of its existing center cylinder.
- **Artillery:** the large gun's muzzle-brake box front at `len/2 + gunLength + .08 + .3/2`, y=.85,z=0. This excludes the roof machine gun. Imperial fallback uses the front of its existing brake box, x=5.4+.36/2.
- **Rocket:** a top-row visible port disc. USA x=`4.3/2+.04+.035/2`, y=1.41,z=0; Russia x=`5.1/2+.01+.015/2`, y=2,z=-.295; China/India/Korea x=`4.7/2+.04+.035/2`, y=1.41. India/Korea select the inner pod center z=-.75; China's selected existing disc is z=`-.75+.5*(1.3/2.25)` (its existing disc centers differ slightly from its long tube centers). The turret's .08 rad original pitch is retained. Imperial fallback derives the closed box front from its existing center, half-length and .15 rad rotation.
- **USA AA:** existing top-inner missile disc at [.595,.935,.735]. **Russia AA:** existing upper missile disc at [1.3975,1.57,1.1]. **India AA:** exposed existing missile nose at [.2+5.2/2+.45,1,0].
- **China AA:** existing VLS cover/seam upper surface [-1.35,1.1825,.45], outward +Y. Its forward circular radar face is deliberately not used as a weapon opening. The current cover remains closed in the artwork; no launch-door animation was added.
- **Korea AA:** existing primary cannon cap at [.85+3.1+.012,1.1,1.05], outward +X. This model has no missile to anchor. It sets `muzzleFamily:'autocannon'`; the shared effect classifier must honor this rather than portray a missile leaving the barrel.
- **Imperial AA:** existing closed canister front face, derived from its 2.4 length and -.24 rad prototype rotation. The old downward inclination is retained rather than silently changing the art. This is a legacy fictional face, not a verified real launch opening.
- **ASAT:** choose actual tube `i=floor((count-1)/2)`, z=`(i-(count-1)/2)*.55`, y=4.9. The old z=0 lay between tubes for even counts. Russia's three-tube model still uses z=0; all other counts use z=-.275.

The markers carry `source`, original `face`, local `outward`, and `artOffset`. Model metadata carries `muzzleSource` and `muzzleFamily`; this metadata does not itself change targeting or missile flight rules.

## CPU evidence

`node tools/check-launch-anchors.cjs` passed **30/30** slots (five kinds × six factions). A short reverse ray from every marker hits the actual original face at the expected offset; the immediate forward exit is clear. It verifies ASAT tube membership, primary-gun selection, turret transforms and independent clones. On this run, every full geometry/transform hash, triangle/mesh count, bound and model scale matched a pre-edit baseline. Baseline file is temporary `.tmp/launch-anchor-baseline.json`; a future run without it reports `baselineCompared:false` instead of claiming conservation was rechecked.

An additional CPU pass with actual `WarGroundRig` and `WarVehicleAnimation` attachment preserved all 30 muzzle world positions at rest, including reparenting primary-gun markers to recoil bones. No GPU was used. Native first-person discharge, effects-family rendering, obstruction handling and screenshots remain parent validation tasks.

Machine-readable results: `launch-anchor-check.json`.

## 2026-10-21 最终修复补记

上述“无几何变化”为第一阶段记录。后续 M109 美国炮口按公开照片改为真实透孔，30槽检查仅允许该槽顶点/面数变化；其包络、炮轴和锚点不变，其余29槽完整签名不变。中心后向0.35无交点，偏移0.105命中孔缘；对应 `launch-anchor-check.json` 与 `m109-brake-check.json`。模型预览五视图、炮口近景及生产头像已重新渲染。炮口照片仍有更圆滑的外壳与连接结构，当前只关闭实心堵口缺陷，不宣称整体精确还原。
