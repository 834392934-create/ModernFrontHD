# Guided missile circling — reproducible diagnosis and repair

Baseline: `3b758f1` (3.13.0). CPU-only, production `Game.emitShot` and `Game.step`; no GPU, renderer replacement, damage shortcut, or source-range override. Distances, speeds, turn rates and lifetimes below are game units/settings, not certified weapon performance.

## Findings

1. Confirmed simulation defect, not a decorative missile animation. A destroyer `land_attack` at legal distance 350.006 (allowed 100–820) returned `ready` and emitted an actual `guided` round. It accumulated 1.060 yaw turns, travelled 5.380 times the initial straight distance, inflicted zero damage and expired after 5.35 s. Three identical repeats reproduced; dt 1/60 reproduced with 1.065 turns and zero damage. At distance 500 the baseline hit directly in 2.25 s. At distance 220 it made almost a whole circle before a late hit.
2. Baseline guided update used independent yaw/pitch pure pursuit, unconditional acceleration to 380, yaw cap 1.8 rad/s and pitch cap 1.5 rad/s. At cruise these imply approximately 211 and 253 units of turning radius. A vertical launch passed the 350-unit target horizontally at 1.65 s while still 182.9 units above it; pursuit then commanded a large reversal. There was no remaining-distance speed control. Separate Euler steering also changes yaw abruptly directly above a target.
3. One-variable diagnostic intervention on the emitted round (no production patch or collision change): cruise speeds 120/180/240 instead of 380 all hit the 350-unit target without a circle. This supports the speed/turn-space mismatch; globally slowing all missiles is not the chosen repair.
4. Baseline lost-lock `coast` still steered and accelerated toward the old destination. Deleting the target at 0.8 s reproduced another 1.017-turn loop. Individual projectiles have bounded lifetime (ordinary 4–35 s; cross-orbit 4–10 s), so the reported persistent circle can be repeated finite rounds rather than an immortal entity.
5. At 450 units, a baseline missile overshot below the surface and reached altitude -103.385 before expiration. Guided collision checked hulls/trees but had no ground/sea-surface segment crossing.
6. MLRS distinction: actual USA `rocket_salvo` and `guided_rocket_salvo` each emitted six `kinetic` rounds with `salvoIndex`. These frozen area endpoints are deliberately excluded from entity guidance. FPS fixed rays are also excluded. The repair preserves both pathways.

## Minimal implementation

- `combat-projectiles.js` only: rotate the existing heading/pitch direction by a bounded 3D angle, with a deterministic antiparallel fallback. Output remains the existing heading/pitch state and the shared world position.
- Bound requested speed by remaining distance and required curvature, retaining finite acceleration/braking and the existing cruise upper bound. No target snapping, inflated hulls or unconditional target-ID damage.
- Lost lock freezes heading and pitch, clears target ID, coasts for at most 1.5 s (or the existing lifetime), and never rehomes to the frozen point.
- Clip a descending segment at surface height 0 before resolving the earliest hull/tree hit; otherwise settle a normal surface impact at that intersection. Upward water crossing is allowed. Existing vertical ejection waits for surface clearance when starting underwater; current `missile_sub` metadata is **turret**, so this does not claim it is a certified VLS configuration.
- Public API/save schema unchanged. All state is existing serializable projectile state. Friendly blocking, detection, domain rules, model hull collision, central impact damage, and real interceptor travel remain intact.

## Before / after (unmodified actual Game scenarios)

| Scenario | Before | After |
|---|---|---|
| Static ground 125 | 0.974 turns; hit at 4.45 s | 0 turns; hit at 2.20 s |
| Static ground 220 | 0.988 turns; hit at 4.75 s | 0 turns; hit at 2.15 s |
| Static ground 350 | 1.060 turns; expiry; damage 0 | 0 turns; hit at 2.10 s; damage 160 |
| Static ground 450 | below surface; expiry; damage 0 | 0 turns; hit at 2.15 s; damage 160 |
| Static ground 500 | hit at 2.25 s | hit at 2.20 s |
| Moving harvester 220 | 1.097 turns; expiry; damage 0 | 0.277 turns; hit at 2.65 s; damage 160 |
| Target removed at 0.8 s | 1.017 turns at old position | straight coast; ends at 2.35 s |

A successful interception is not guaranteed when a CIWS initially faces 180 degrees away; its finite traverse may take longer than the remaining missile flight. The added positive interception fixture starts facing the approach and still requires real projectile travel.

The old integration CIWS fixture also lacked enemy sight at 650 units: `canImpact=false`, `unitsInSight=false`, so the missile lost lock at the first powered update. The old broken coast happened to bring it into defense range. An explicitly disabled enemy reconnaissance vehicle now supplies legitimate observation; its presence is asserted. No fog/targeting bypass was added.

## Key files (primary evidence)

| File | Why / verified symbols | Confidence |
|---|---|---|
| `src/combat-projectiles.js` | `decorateLaunch`, `step` guided branch, `steerGuided`, `guidedSurface`, `resolveCollision`, `validate`; actual position and damage collision authority | High, inspected and executed |
| `src/sim.js` | `Game.emitShot`, effect loop in `Game.step`; real readiness, ammunition, launch, continuous collision and central impact entry | High, inspected and executed; unchanged |
| `src/vehicle-weapons.js` | destroyer `land_attack`, `anti_ship`, `sam`; station ranges/mount modes distinguish valid launch from guidance failure | High, inspected; unchanged |
| `src/weapon-salvos.js` | `freezePoints`, `launch`, `salvoIndex`; six independently emitted frozen MLRS rounds in probe | High, executed; unchanged |
| `src/weapon-effects.js` | `updateProjectiles`, `drawProjectile` consume `WarCombatProjectiles.position` rather than a separate orbit path | High, static primary evidence; no GPU validation |
| `src/combat-impact.js` | `footprintDistance`, `footprintCover`, `resolve`; exact runway blast distance, low rotated cover and conservative spatial query | High, inspected, changed and executed |
| `tests/missile-guidance.test.cjs` | Actual launch/step, 4 headings × 3 time steps; moving target, loss, surface, cross-orbit, bounded turn/speed, real save/load, friendly blocking, CIWS | High, executed |
| `tests/combat-projectiles.test.cjs` | Existing air-launch, vertical launch, fixed FPS ray, continuous collision, torpedo and CIWS regression | High, executed |
| `tests/combat-realism-integration.test.cjs` | CIWS fixture legitimate observer and real delayed interception; only observer fixture lines changed | High, executed |

## Verification / retained artifacts

- RED: `node .tmp/guidance-diagnosis.cjs --assert` on baseline exited 1 with the legal 350-unit case. Same command now exits 0.
- Frozen baseline: `.tmp/guidance-diagnosis.before.json` and `.before.log`; after: `.tmp/guidance-diagnosis.after.json` / `.after.log`. 40 normal scenarios plus 3 explicitly labeled one-variable diagnostic interventions; trajectory samples cover full lifetime.
- `.tmp/guidance-legacy-ciws-probe.cjs` with/without `--observer` records the sight issue.
- Final focused: `node --test tests/missile-guidance.test.cjs tests/high-altitude.test.cjs tests/combat-projectiles.test.cjs tests/combat-impact.test.cjs tests/combat-realism-integration.test.cjs tests/vehicle-combat-integration.test.cjs tests/weapon-salvos.test.cjs tests/direct-shot-ray.test.cjs` — **111/111 pass**, including the real runway collision/cover/blast regression and unchanged maximum-height 1.2-second engagement rule. New guidance suite contains 12 tests and parameterized cases.
- `.tmp/guidance-focused.log` is the latest focused result. No GPU, build/release, Git commit or remote operations performed by this agent.

## Adjacent runway integration

Parent requested low rectangular runway collision: explicit `B.footprint={halfLength:180,halfWidth:80,minY:0,maxY:2}` takes precedence over model/fallback sphere, and only `B.rotatable` buildings use entity yaw. Local +X is the runway long axis. Ordinary structures retain yaw 0. Definition/navigation/rendering are owned by the other agents.

The actual runway regression then exposed a separate central-blast defect: subtracting its 197-unit selection radius from center distance caused a 14-unit blast to damage pavement whose nearest rectangle edge was 70 units away. Under subsequent parent authorization, `combat-impact.js` now uses rotated box closest distance for explicit footprints, the same low box for cover-segment intersection, and a conservative query expansion covering the footprint diagonal. Existing non-footprint unit/building rules are preserved. Tests verify 0/90 degree orientation, 1/3-unit rays, friend/enemy cover, a blast outside/inside the rotated footprint, and no elevated ray occlusion by a 2-unit pavement.

## Full-suite follow-up: maximum orbital height

The first full-suite run exposed one genuine timing regression in this change: an ASAT aimed at height 12000 hit at 1.25 seconds, just beyond the existing 1.2-second rule. Recorded actual Game trajectories showed persistent lock and a fully aligned missile, but the initial curvature formula imposed a fictitious minimum `sin(angle)=.08`, causing exponential slowing even when no turn was needed. Replacing only that angle floor with a numerical epsilon restored straight cruise while preserving finite acceleration, bounded 3D turning and continuous collision. The same actual scenario now hits at 0.80 seconds with damage 160. The original high-altitude assertion is unchanged; a new regression checks 60/20/10 Hz and was run RED before the fix and GREEN afterward. `.tmp/guidance-high-orbit.cjs` and `.log` retain the probe. The final 40-scenario diagnostic and MLRS check were rerun with all final source changes.
