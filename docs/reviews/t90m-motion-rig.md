# T-90M licensed exterior articulation audit — 2026-10-20

Only the imported T-90M branch of `src/vehicle-rig-ground.js` was changed. The generic procedural rig, model importer, shared runtime animation and original GLB remain outside this change.

## Actual asset findings

The released `assets/models/t90m.glb` contains directly named `hull_Wheels` and `hull_Thread` meshes. Therefore the former `/wheels/` name check did match this specific converted asset; there was no evidence that it currently failed due to `Object_x` naming. Detection now also accepts a matching ancestor, without changing unrelated meshes.

The substantive former issue was using the height of the entire wheel assembly to assign one radius to every wheel, expanding indexed geometry, and assigning triangles by nearest 3D center. The actual wheel mesh has 172 disconnected positional islands representing 16 coaxial assemblies. There are 12 road wheels, two smaller forward end wheels and two rear end wheels. Their measured visual outer radii are approximately 0.3744, 0.2580 and 0.3394 respectively, in model art units, **not published mechanical dimensions or certified pitch radii**.

The new branch groups complete original islands by their XY axis center and side, including each wheel's hubs/rims/bolts. All original vertices remain indexed and retain their positions, normals, UVs and material. Axis and pivot are transformed into the mesh's local frame; radius and lateral position used for travel feedback are in model units. The currently released asset has identity baked mesh transforms and +X forward, +Y up, +Z axle direction.

## Existing track geometry

`hull_Thread` has 54,942 indexed vertices / 29,280 triangles and 1,647 connected exterior islands, precisely nine islands per existing shoe. The third island of each group is its guide tooth. This was checked against the actual binary asset; no new shoes are generated. The source has 183 shoe groups: 92 on one side and 91 on the other. One left closure shoe is almost coincident with the first (about 0.009 model units); its geometry is retained on the adjacent joint, giving **182 track joints** with no tiny closing segment.

The source order follows the original curved track loop, including sag. Angular sorting around an arbitrary center was rejected because it produced crossing jumps of over 1.7 model units; the source order has normal neighbor spacing near 0.15. Both paths are normalized to counterclockwise traversal, so forward vehicle motion makes the lower track move backward relative to the hull in the shared runtime. Geometry remains in the original one track mesh, rigidly weighted by shoe. Track tension, suspension travel, ground contact deformation and exact sprocket gearing are not simulated by this art rig.

Source topology guards reject unexpected mesh revisions instead of silently assigning incorrect joints. Wheel and track batches remain two of the model's existing **23 meshes / 122,516 triangles**. There are **198 mechanical bones** plus static batch bones; native GPU stress validation is required.

## Credit and verification

Original model author **minehffd**, CC BY 4.0, [original asset page](https://sketchfab.com/3d-models/t-90m-2e31a3cf16b04f0180b9387df5198c9a). Existing `assets/models/t90m-LICENSE.md`, source metadata and reference URL remain unchanged. This modification adds runtime rigid vertex weights and motion metadata; original GLB, textures and source attribution are retained.

Run `node tools/check-t90m-motion-rig.cjs`. It loads the actual released GLB through the existing importer, replacing only CPU WebP decoding with placeholder Texture objects. It checks source vertex/index attributes and material identity, counts all 16 wheel and 182 track joints, checks per-wheel radii, every vertex's rigid assignment and triangle integrity, rest-pose conservation, forward lower-track direction, reverse return, paused time, and clone isolation. Result details are written to `t90m-motion-rig-check.json` only after passing. This CPU test does not prove texture rendering or photographic fidelity; parent owns serial native-app/GPU verification.
