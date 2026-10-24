# Controlled camera cadence diagnosis — 2026-10-25

The application runs actual simulation at 20 Hz and draws at browser refresh rate. Before this change, `DirectControl.updateCamera()` copied the entity's discrete coordinates directly, and the frame loop updated that camera before advancing the simulation. A high FPS counter therefore did not imply smooth positional motion.

An independent CPU probe uses a real `WarSim.Game`, the real `DirectControl` camera method and Three.js math classes; it creates no renderer or GPU context. A tank moves at its unchanged 65 u/s after its real acceleration period. Two seconds of camera position samples show:

| Render sampling | Repeated position frames | Position change values |
|---|---:|---|
| 40 Hz | 40 / 79 (50.63%) | 0 or 3.25 u |
| 60 Hz | 80 / 119 (67.23%) | 0 or 3.25 u |
| 120 Hz | 200 / 239 (83.68%) | 0 or 3.25 u |

Local reproducible probe: `.tmp/camera-cadence-probe.cjs`. This is evidence of fixed-step display judder, not a measurement of GPU performance or total input latency.

The independent `src/render-timeline.js` helper records only the controlled entity immediately before and after each fixed step. `beginFrame(game, alpha, { paused })` freezes `alpha = accumulator / 0.05` for that rendered frame. `controlledPose(game, entity)` reads the same result each time, interpolating x/y/altitude/jumpHeight and the short angle arc. It does not recursively blend per call or extrapolate past the authoritative position. Display delay is at most one simulation interval (50 ms at normal speed).

Integration contract:

1. Call `captureBefore(game)`, then the existing `game.step(0.05)`, then `captureAfter(game)`.
2. After all fixed steps for that frame, call `beginFrame(game, acc / 0.05, { paused: paused || !!game.result })`.
3. Use `controlledPose(game, entity)` for the camera and controlled model only. It returns a shallow pose copy for display; callers must not mutate it or shared nested state. Other units and projectiles are unaffected.
4. Keep physical firing origin, aim validation and damage on authoritative state. Displayed model interpolation must not silently turn its world-space muzzle anchor into a new physical firing location.
5. Missing snapshots, game/control identity changes, a replaced entity, large teleport, downed/dead/disabled transition, pause and resume fall back to the original entity. `reset(game)` is available for explicit load, entry/exit or small intentional teleports.

`tests/render-timeline.test.cjs`: 6/6 CPU tests passed. Real Game motion at 40/60/120 Hz gives uniform 1.625 / 1.083333 / 0.541667 u frame displacement after initialization. A parallel unsmoothed Game has exactly the same simulated coordinates, angles and input state. Repeating pose sampling 1,000 times leaves serialized Game state unchanged. Tests also cover pause/resume, boarding identity changes, replaced entity, new game, teleport, angle wrap, real jumping height and incapacitation/EMP transitions.

## Independent integration review

The root integration now records fixed-step snapshots in `app.js`, reads display poses in the real `DirectControl.updateCamera()` and draws the controlled body with the same pose in `Battle3D.draw()`. The source renderer still restores the authoritative model pose before resolving modeled firing ports.

`tests/render-timeline-integration.test.cjs` executes actual Game, DirectControl, Battle3D draw, production procedural model hierarchies and Three.js raycasts. Only DOM/canvas painting and the final GPU submission endpoint are inert CPU fixtures. It confirms uniform camera and model travel at 40/60/120 Hz, identical pose on repeated camera/draw calls, immediate ground look angles, interpolated aircraft attitude, authoritative modeled muzzle positions, restoration of the displayed body after aiming, and actual pause/resume/entry/exit resets.

The first integration run found one real defect: the unanchored weapon fallback used interpolated `vehicleEye.y` to derive its physical muzzle height. During a real infantry jump with alpha 0.2, it produced 6.895 u instead of the authoritative 7.675 u. The root fixed the fallback to use the unit's physical altitude plus its category-specific eye offset. The regression remains in the integration suite and now passes.

Final focused acceptance: 12/12 tests passed (6 helper + 6 real integration). Source/tests are frozen for the root's combined validation. This remains CPU integration evidence; native image/latency/performance acceptance is owned by the root agent and is not implied by these tests.
