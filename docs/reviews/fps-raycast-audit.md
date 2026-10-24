# FPS cast optimization — read-only review

Target: working-tree `src/direct-control.js`, `cast` and `aim`, compared with committed `3b758f1`. This agent did not edit that production file. Review used actual Three geometry, CPU skeleton transformations and historical source in a VM; no WebGL renderer, desktop process or GPU was started.

## Findings

No reproducible correctness regression found in the reviewed changes. The broad-phase sphere safely contained every measured posed vertex, and the new casts retained the same entity, mesh, intersection point and distance as historical exact casts. The final triangle intersection code and world-occluder path are unchanged. Both call sites supply normalized directions. The objects' roots are direct scene children positioned in the same coordinates used by the sphere, and the per-aim box map is cleared before each fresh aim.

## Executed evidence

- `tests/fps-raycast.test.cjs`: 77 roles × 6 factions × 4 articulated/moving attitudes = **1,848 poses**.
- **60,037,168 vertex positions** checked, including **19,252,944 skinned positions**. Vertex queries apply the actual skeleton deformation and world matrix. Tests include turret and weapon elevation, recoiling/deploying parts, reverse/turn/aircraft bank/pitch, jump and downed personnel.
- Actual imported geometry registered and asserted `ready`: `destroyer_usa`, `heli_usa`, `heli_kor`, `tank_rus`. Only texture image decoding is replaced with empty CPU textures. GLB buffer geometry, original hierarchy, importer transforms and articulation remain intact; procedural fallback does not satisfy this test.
- **16,632 rays** compared against the unmodified historical `cast`, including extreme geometry points, off-axis misses, limited travel and internal starts. **10,522 exact hits** matched entity/object/point/distance.
- Worst measured vertex-radius / broad-phase-radius ratio: **0.39001013**, `arty_imp`, pose 2. Hull attitude rotations preserve radial distance; the test also covers actual articulated geometry rather than static baked coordinates alone.
- Unknown/new `runway` (no baked entry) retained exact raycast behavior. Within one aim, the box object is reused; after clear and movement, it is rebuilt and the hit changes correctly.
- Focused work-count test: 101 visible objects, 100 definite off-ray misses and one real hit. Historical code computed 101 hierarchy boxes; new code computed 1, and its second aim ray computed 0 additional boxes, preserving the exact hit. This is a CPU operation count, **not** an FPS/GPU performance claim.

## Commands and scope

1. `node --test tests/fps-raycast.test.cjs` — initial geometry/cache tests 2/2 passed in 95.19 s; `.tmp/fps-raycast.log`.
2. After adding the independent operation-count test: `node --test --test-name-pattern 'far misses avoid' tests/fps-raycast.test.cjs` — 1/1 passed in 0.59 s; `.tmp/fps-raycast-counts.log`. The 95-second unchanged geometry test was not unnecessarily rerun.

3. After the first concurrent full-suite log reported `Image is not defined`, a separate licensed-import health test was added. The full-suite run had read an earlier fixture before the WebP plugin stub; the current fixture independently proves all four imported slots ready without `Image`. `node --test --test-name-pattern 'CPU licensed geometry|unknown buildings|far misses avoid' tests/fps-raycast.test.cjs` — **3/3 passed** in 0.59 s; `.tmp/fps-raycast-fast.log`.

The four current tests have each been run and passed. This is a regression check of current assets and representative supported poses; it is not a proof for arbitrary future artwork, unsupported scale changes, or newly added joints. Keep this test with future geometry/rig changes. Release/native GPU verification remains with the parent agent.

## Primary files inspected

| File | Verified role |
|---|---|
| `src/direct-control.js` | `cast`, `aim`: conservative sphere, per-aim AABB cache, unchanged exact triangle raycasts |
| `src/battle3d.js` | Root object scale/position and YZX attitude; personnel/vehicle pose updates |
| `src/navigation-footprints.js` | Baked full-model extents keyed by kind/faction; unknown buildings lack entries |
| `src/vehicle-animation.js` | Actual bones, turret, recoil, weapon pitch, payload, aircraft and track articulation |
| `src/personnel-animation.js` | Actual body skinning, gait, jump and injury/downed pose |
| `src/models-imported*.js` | Licensed offline GLB geometry/hierarchy and runtime model registration |
| `src/weapon-effects.js` | `weaponAnchor` retrieval does not move other target models between the two cached casts |

Read-only implementation recommendation: retain the current conservative sphere and exact fallback. The current measurements provide no reason to replace it with a tighter, riskier envelope.
