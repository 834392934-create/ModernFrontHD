# Ground navigation audit — 2026-10-25

Base revision: `3b758f1`. This work changes game navigation decisions, not real vehicle specifications. Navigation safety, finite acceleration/turning/reverse speed, original destinations and full-unit arrival are preserved.

## Confirmed causes and changes

1. Non-harvester vehicles paid a fixed small reverse penalty even for long relocation orders. A tank facing away from a destination 1,800 game units away drove the entire route backward. Ground vehicles now weigh reverse against the distance to the original order, as the harvester already did. Short docking, constrained reverse and wall escape remain available; no speed or turn rate increased.
2. The A* ore mask used only a 45-unit mine radius, while local movement required `48 + navigationRadius + 4`. It therefore proposed nodes the full vehicle could not occupy. The path mask now uses the same clearance as local avoidance.
3. The independent runway has an explicit rotated 360 × 160-unit footprint and a 2-unit height. Shared signed-distance and segment-distance queries now serve navigation grids, local avoidance, visibility detours and simulation callers. It does not block the entire bounding circle; legal side aisles remain open. Existing circular structures retain their old clearances.

## Reproducible measurements

Actual `WarSim.Game`, deterministic seed 712, 0.05-second simulation steps, empty desert terrain, AI clocks delayed, all physical motion and command/planner methods real. Group fixtures start at non-overlapping 120-unit spacing and use the unchanged formation allocator. The narrow opening is four map cells wide (192 game units). Arrival requires order completion and distance under 6 units to the originally assigned berth.

| Fixture | Before time (s) | After time (s) | Before / after forward–reverse changes | Before / after total travel (u) |
|---|---:|---:|---:|---:|
| Tank, initially facing away, 1,800 u | 55.40 | 29.85 | 0 / 0 (formerly continuous reverse) | 1,794.24 / 1,821.89 |
| Recon vehicle, initially facing away, 1,800 u | 37.55 | 17.75 | 0 / 0 (formerly continuous reverse) | 1,795.80 / 1,828.95 |
| Tank around one ore mine | 26.55 | 20.55 | 14 / 0 | 1,399.65 / 1,311.94 |
| 24 mixed vehicles, open ground | 106.35 | 57.95 | 177 / 42 | 52,516.74 / 50,585.86 |
| 24 mixed vehicles, narrow opening | 120.75 | 105.05 | 587 / 132 | 65,101.27 / 63,570.60 |

All fixtures reached every assigned destination. At every simulation step: zero overlapping conservative navigation envelopes, zero full-hull terrain violations, zero speed-limit or turn-rate violations. Forward-facing tank/recon controls remain 28.00 / 15.30 seconds. Harvester controls remain unchanged. Arrival remains stable with a further 2-second no-drift check in the group regression.

These are simulated travel times, **not FPS measurements**. CPU timings in the raw probe are diagnostic only because other agent processes can run concurrently. No GPU or visual acceptance was performed in this slice. Constrained routes still legitimately wait or reverse; this does not claim every possible layout has zero congestion.

Raw local evidence: `.tmp/ground-route-baseline.cjs`, `.tmp/ground-route-before.json`, `.tmp/ground-route-after.json`, `.tmp/ground-navigation-final.log`. These ignored files are intentionally not shipped.

## Validation and ownership

- The initial three new tests failed on the old behavior, then passed after the two targeted movement fixes.
- Grouped navigation regression: 72/72 passed, retaining all existing collision, full arrival, narrow-water hull, stationary manual blocker, FIFO, sealed-wall, mining delivery and all-77-unit building-route assertions.
- Runway-specific final follow-up: 7/7 passed, including one extra manual-driving/dynamic-construction integration case added after that grouped run. Tests cover 0°, 45°, 90°, exact rounded-corner clearance, rotation invalidation, side-aisle direct travel, full ground envelope and separated altitude.
- No old assertion was weakened or test budget raised. `vehicle-motion.js` was inspected and left unchanged.
- Navigation source ownership: `src/crowd-navigation.js`, `src/navigation-footprints.js`. New regression files: `tests/ground-route-efficiency.test.cjs`, `tests/runway-navigation.test.cjs`. Runway data/simulation/flight integration belongs to the runway agent and is independently covered by the integration cases above.

Primary chain: `sim.command` assigns/reserves berths → `sim.step` requests `navigation-footprints.pathGrid` → `crowd-navigation.waypoint/move` follows legal segments with finite vehicle motion → FIFO `crowd-navigation.process` services stalled routes. The legacy fallback inside `sim.js` is not the active crowd path.
