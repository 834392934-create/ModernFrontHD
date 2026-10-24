# Combat presentation integration — 2026-10-24

Implementation uses the existing Three.js r160/WebGL runtime. This document records behavior and limits; it does not certify real equipment geometry or claim photorealistic visual acceptance.

## Authority and interfaces

Simulation owns `e.combat` schema 1, its `mounts` and weapon-keyed `stations`; `e.components` owns damage, fire, flooding and incapacitation. Rendering never consumes ammo, repairs components or performs damage. `vehicle-weapons.js` provides mount, magazine, burst, ammo type and payload metadata. All mechanical rates, reloads and damage values are explicitly gameplay values.

`WarCombatProjectiles.position(fx)` supplies `{x,y,height}` to both RTS and FPS. `WarWeaponEffects.drawProjectile(renderer,game,fx)` / `drawImpact(...)` return true when handled, preventing duplicate camera-specific trails or explosions. Source, weapon, mount, port and projectile metadata are captured by simulation at launch.

`Battle3D.resolveWeaponOrigin(game,e,weapon,port)` refreshes current entity and authoritative turret/pitch transforms, reads the actual existing anchor, and returns plain `{x,y,height,source,approximate}`. It uses `WarVehicleAnimation.syncWeaponPose`, which does not advance travel, rotors or event queues. No previous-frame position is reused. The RTS display-height compression is removed from the returned physical height. Missing visible instances return null for the simulation's labelled approximate fallback.

`WarCombatDamageVisuals.update(renderer,game)` reads live components and frozen `type:'wreck'` events. `clear(renderer)` removes owned effect meshes, materials and skeletons. Persistent visual clocks use game time, including pause and expiration.

## Implemented differences

| Category | Current implementation | Evidence / limit |
|---|---|---|
| Tank | AP/HE and multi-purpose stations; main/coax share mount; main gun pitch/recoil; US roof gun independently turns and elevates | Existing US roof geometry only, CROWS family role; no claim of exact enclosure, traverse or capacity |
| Dual-gun IFV | Chinese/Russian original low-pressure gun and autocannon separate barrel bones and recoil; each secondary muzzle follows its own pitched barrel | Existing geometry coordinates; no second copied barrel |
| Artillery / MLRS | Mount pitch follows readiness; staged sequential actual rockets, per-round ammunition, unchanged per-round damage if magazine is incomplete | Setup/packing timing remains simulation-owned; crew actions belong to personnel module |
| MLRS dispersion | Original area coverage plus narrower “guided category” gameplay loadout | Concentrated precomputed area pattern, not a certified seeker simulation or exact national munition |
| CIWS | Existing C-RAM-inspired installation search rotation, target-projectile tracking, barrel elevation and rotation after actual station shots | RTX functional sequence informs the category. National variants and fixed radar panels are not invented |
| Aircraft stores | Existing attack-drone, interceptor and escort-helicopter external stores disappear according to station ammo/port serial; restore with actual replenishment | Only known existing detachable primitives. Closed-bay fighter exteriors keep their current exterior; no fabricated internal stores |
| Helicopter | Existing chin/side gun pipe independent yaw/pitch; pods release from role-based anchors; near-ground wash on land/water; lateral-motion body lean | Existing geometry and gameplay motion only. Full rotor aerodynamic model not asserted |
| Bomber | Existing original heavy-bomber bay panel opens for loading/firing state | Single original panel; hinge position is a game approximation |
| Naval gun | Existing procedural main gun and guarded Burke source-island barrel pitch/recoil; CIWS does not recoil main gun | Current ship self-occlusion gate is simulation-owned; no broad source-model replacement |
| Torpedo / impact | Shared actual 3D trajectory; water wake, underwater bubble burst, surface water column; AP sparks distinct from HE flash | Visual style does not add damage or overwrite the impact endpoint |
| Live damage | Frozen hit-point local scar; engine/hull severity smoke, timed flame; flooding/list follows components | One localized effect group per live unit, not detachable structural fracture |
| Wrecks | Bounded fading original-model wrecks; flooded ships sink/list, buildings compress/collapse, aircraft retain their terminal physical pose | Simplified presentation, no claim of structural finite-element failure |
| Personnel death | Existing personnel animation receives the frozen dead component snapshot; no second root-level tumble | Personnel agent owns pose, wound, rescue, limp and skeleton disposal |
| Space | Separate cool luminous damaged-component pulses; no atmospheric smoke or underwater bubbles | Explicitly fictional game equipment |

Aircraft known external stores and original gun geometry keep their shared material/UV attributes. Licensed Burke geometry is only split along guarded existing vertex islands; source textures, author and license remain. Concept exteriors are not regenerated.

## Budgets and resources

| Quality | Concurrent live damage groups | Wreck groups | Map-distance limit |
|---|---:|---:|---:|
| Low | 10 | 5 | 700 game units |
| Medium | 18 | 8 | 1,100 game units |
| High | 26 | 12 | 1,600 game units |

Each live damage group has at most 3 soft-alpha smoke sprites, 2 flame sprites and 1 scar. Shared procedural alpha textures remove opaque polygon smoke silhouettes. Distant groups reduce visible particles. Rotor wash is limited to 6 groups. Wrecks reuse model geometry/textures and own only cloned tint/fade materials; up to 3 residual smoke/flame sprites per non-personnel wreck are shown within 600 units, with flame bounded by `fireUntil`. Personnel wound details are disabled beyond 650 units, while casualty poses remain. The group caps bound effect work, not total scene draw calls; `renderer.info` remains the runtime measurement source.

One event index per simulation tick supplies vehicle shot animations, replacing an effects scan for every visible vehicle. Geometry is immutable after template preparation; pose state, skeletons, payload visibility and damage material clones belong to instances. Live groups are disposed when repaired, invisible, outside budget, or removed. Wreck events are consumed once and cannot replay by switching RTS/FPS.

## References and implementation principles

- [RTX Phalanx](https://www.rtx.com/en/raytheon/what-we-do/sea/phalanx-close-in-weapon-system): search, detect, track, engage and assess sequence; not universal CIWS performance.
- [US Army CROWS equipment portfolio](https://www.peosoldier.army.mil/Equipment/Equipment-Portfolio/Project-Manager-Soldier-Lethality-Portfolio/M153-A1-A2-CROWS/): platform integration and weapon-family context; exact current vehicle variant and model enclosure remain bounded.
- [USAF A-10 training article](https://www.af.mil/News/Article-Display/Article/126323/training-communication-key-to-success-for-a-10-pilots/): gun/rocket/bomb categories. The game's close-support original role model is not relabelled as an exact A-10.
- Three.js skills reference: `CloudAI-X/threejs-skills` MIT, reviewed pinned revision `0e181866f095b5f06d005133876e926515390d95`. Borrowed principles are one stable simulation clock, independent instance pose, explicit resource disposal and measured draw calls. Its r186 `Timer`, WebGPU and TSL examples were not copied into r160.

## Verification

- `tests/vehicle-combat-visuals.test.cjs`: state immutability, same-tick origins, separate recoil/pitch/roof, real existing payload masks, CIWS tracking, pause, repair cleanup and budgets.
- `tests/vehicle-salvo-ammunition.test.cjs`: actual per-round consumption, unique projectile/port metadata, partial-magazine damage conservation, guided coverage, pause.
- Existing `vehicle-weapon-visual`, `vehicle-articulation`, `vehicle-weapons` tests retain source/material and legacy behavior checks.

Native screenshots use the final packaged version with an isolated test profile, matching source hashes and imported models ready. CPU pass is not a substitute for those images. The completed 3.13.0 results below supersede the earlier source-only verification stage.

### Completed 3.13.0 native acceptance — 2026-10-24

All six suites launched `release/ModernFrontHD-3.13.0/ModernFrontHD.exe`, closed only their own process, and verified the same 75 script/style/GLB hashes. No core source changed between these suites. All imported assets were ready with author/source/license and original material assertions. GPU: NVIDIA RTX 3060 through ANGLE; new visual suites used 1500 × 980 CSS pixels (Windows scaling produces larger screenshot pixels). These are controlled scenes, not a large-battle frame-rate guarantee.

| Report under `docs/` | Observed result |
|---|---|
| `combat-visuals-desktop-report.json` | 6 real LMB projectile categories; RMB emits nothing; physical bodies remain at the same sampled position during paused close inspection |
| `combat-guided-desktop-report.json` | 2 captures of one real RTS missile: vertical launch without flame, then powered flight with motor flame |
| `combat-damage-desktop-report.json` | 7 records: actual FPS tank damage and destruction, plus 5 explicitly labeled `Game.damage` location probes for tank/ship/aircraft/factory/personnel state presentation |
| `weapon-effects-desktop-report.json` | 6 weapon families: correct original muzzle, independent recoil, real input, frozen launch geometry and paused effect lifetime |
| `public-range-salvo-desktop-report.json` | 9 checks: 72 armory cards, 8 real ports, two-dimensional area coverage, normalized actual damage, three cancellation paths and published-range boundary |
| `vehicle-loadouts-desktop-report.json` | 5 selectable weapon stations with actual damage, 3 invalid-domain/occlusion rejections, paid aircraft launch/climb, child hit, J possession and W flight |

Native evidence paths include `screenshots/combat-visual-*-{actual,inspection}-desktop.png`, `screenshots/combat-guided-*-inspection-desktop.png` and `screenshots/combat-damage-*-desktop.png`. Close-inspection camera placement is explicitly labeled; no projectile position, simulation clock or damage result is manufactured for screenshots. The independent reviewer accepted basic category and state readability, with visible limits: low-polygon original bodies, simplified/weak smoke and no claim of real combustion, exact munition geometry or cinematic quality.

The prior loadout test incorrectly expected planned aim points to remain the collision endpoint after continuous flight. It now retains the frozen launch origin and unguided destination assertions and separately requires the actual terminal point to lie on the target model. Native pointer lock is allowed three animation frames to deliver its normal held-input reset before the independent RMB press. Neither adaptation bypasses preparation, traversal, input, domain, obstruction or damage gates.

## 2026-10-24 physical projectile and damage follow-up

- The near-view pool now draws seven original category bodies: bullet, shell, rocket, missile, bomb, torpedo and fictional pulse. Bullets are flying projectiles, not cartridge cases; their short cosmetic ejection rectangles remain a separate effect. Torpedoes use rounded noses/tail steering and a small propulsor, bombs rounded noses, and missiles/rockets swept fins. Geometry communicates categories; it is not a verified national munition model.
- Low/medium/high pools cap at 24/44/64 active bodies within 400/650/900 game units. Body geometry, surface/energy/flame materials are shared per renderer. All are disposed on world replacement. Fog and underwater viewpoint gates also apply to the pool; distant shots keep short traces. Only one in three ordinary rounds has the brighter tracer; collision speed is unchanged.
- `WarCombatProjectiles.position` and velocity/previous point drive every body. Guided `separation` and `vertical` phases do not have a motor flame; `ignition`/`powered` do. `coast` has no flame. Actual interception is a simulated projectile; decoy traces are cosmetic.
- Same-tick impacts retain a simulation-owned, damage-free `discharge` snapshot. Muzzle/recoil consumes it with `projectileId` de-duplication. The physical body pool ignores snapshots. Pausing and camera changes do not restart these events.
- Smoke/flash radius derives from a family-specific `visualRadius`, independently of damage `splash`. AP sparks, HE flash/smoke/debris, surface water columns, underwater bubbles and air/space impacts remain separate. Ground-only marks are capped at 8 on low, 16 otherwise and expire after 18 simulation seconds.
- Infantry/vehicle/building damage is read from authoritative components, never inferred by the renderer from a health percentage alone. Rotor wash checks the real tile grid; water uses water-colored disturbance, land uses dust. Wreck events are consumed once and never replayed when returning to a camera.
- USA/other guided rocket variants preserve their platform's minimum-range evidence while remaining explicitly estimated loadouts. The selected station, not a different default weapon, supplies salvo limits. Invalid pre-spread aim points reject without spending ammo or moving the point out of the blind zone.
- Orbital game weapons and ASAT use explicit all-altitude/vertical mechanisms. Helicopter chin guns retain a limited forward arc with a gameplay down-angle suitable for ground engagement. The orbital missile barge has eight rounds for its existing eight-port salvo. These changes repair previously unreachable roles; no precise real firing arcs or magazine sizes are claimed.
- The user's latest authorization permits original elaboration of unknown/concept displays. This slice uses original shared role mechanisms and distinct fictional pulse/damage presentation, without rewriting frozen chassis, importing movie assets or certifying undocumented real equipment.

Source-browser GPU evidence is recorded separately in `docs/combat-visuals-browser-report.json` (actual mouse shots plus labeled paused inspection) and `docs/combat-damage-browser-report.json` (actual hit chain versus explicitly labeled component-location probes). These reports do not replace final packaged native acceptance. Inspection camera movement is recorded, simulation time and live projectile coordinates are not altered.

## Final integration boundaries

- `omni_striker:omni_space` and `high_altitude_interceptor:high_asat` deploy from independent `space_launcher` mounts. Only dedicated aircraft missile stations whose sole domain is space receive this fictional all-altitude mechanism; ordinary forward cannon and missile arcs are retained. Aircraft guided missile release cones are game parameters, not certified seeker limits.
- Interior component hits vent at a cached intersection with the actual model exterior. The upward offset changes only smoke/fire presentation; the authoritative hit point and local surface scar are unchanged. The model ray is recalculated when the local damage point changes, not every frame. Texture, geometry and owned material disposal remains explicit.
- CPU coverage now checks all three projectile/live-damage quality caps, simulation-state immutability, cached vent-ray count, pause, repair cleanup and no wreck replay. These assertions do not certify appearance or sustained frame rate.
- Native adapters use `tests/combat-desktop-harness.cjs`: isolated process/profile, launcher's selected executable, app version, hash equality for every script referenced by `index.html`, and imported GLB ready/source/license/material checks. Three native reports distinguish six actual mouse-fired projectile categories, two actual RTS guided phases, and a real FPS damage-to-wreck chain plus five labeled production-damage location probes.
- No static chassis or licensed skin was redesigned in this slice. Existing joints are extracted in their original rest pose; added objects are invisible anchors, separate projectile bodies and dynamic damage effects. These changes alone do not require rebaking production portraits.
