# Naval existing-part articulation — 2026-10-20

Scope: `src/vehicle-rig-naval.js`, 19 naval kinds × 6 factions. This is exterior game articulation, not a claim of certified naval mechanisms or engineering dimensions. No new weapon or propulsion hardware is generated.

## Public purpose reference

- Smithsonian National Museum of American History, [Ship Control Station](https://americanhistory.si.edu/subs/operating/attackcenter/controlstation/), actually read 2026-10-20. Its exhibit distinguishes horizontal bow/sail and stern planes for vertical motion/pitch from a vertical stern rudder for heading. Used to separate `elevator` and `rudder` roles rather than animate every fin together.
- Navy history [Elements of Submarine Operation](https://www.history.navy.mil/content/history/museums/nmusn/education/educational-resources/history-of-submarines/elements-of-submarine-operation.html) appeared in official-domain search results; direct fetch returned 502, so it is not an independently read verification source.
- The existing Burke source and author/license evidence remain in `assets/models/burke-LICENSE.md` and `burke-license-evidence.json`. Original author Yi Tsung Lee / WTigerTw, CC BY 4.0; [original model page](https://sketchfab.com/3d-models/11-low-poly-us-navy-ddg-51-uss-arleigh-burke-17be09c31c6047e4a5969b68c29eba03). This round uses that already licensed local GLB, no new download or commercial-game asset.

## Mechanisms and evidence boundaries

- Actually inspected the existing full side rendering `screenshots/model-review/destroyer_usa-side.png`. The source mesh contains visible shafts/propellers, separate rudders behind them, and a bow gun turret.
- For the licensed Burke, CPU positional connected-island inspection identifies exactly four bow-turret islands (800 original vertices), six islands per propeller (hub + five blades), and one island per rudder. Hard topology/region guards prevent quietly attaching those labels to an unexpected asset revision. The fixed deck base, shaft struts and hull stay static. Original positions, normals, tangents, both UV sets, materials, textures and credits remain untouched; only rigid skin indices/weights are added to the existing mesh. Six mesh batches remain six. Shaft handedness and hinge positions are visual approximations, not asserted ship specifications.
- Programmatic destroyers: existing turret exterior primitives rotate, fixed pedestal and deck remain static. These models contain no actual underwater blades, so their hull endings are not falsely labelled propellers.
- Five real-reference submarine exteriors: existing bow/sail planes, stern planes and vertical stern rudder become separate rigid regions. Their generic visual controls do not certify exact whole-fin versus trailing-edge hinge design. The existing dark stern cylinder remains fixed; it is not represented as a visible blade assembly.
- Original hunter/missile submarines: retain existing independent propeller meshes and animate the existing horizontal/vertical fins. Imperial fallback submarine has only its existing horizontal tail plane; no unseen vertical rudder is added.
- Existing named turrets/radar assemblies in other original ships are handled by GroundRig. Fixed panel faces do not spin. Carriers, repair ship, torpedo boat, arsenal ship, electronic-warfare ship, abyss tender and ASW patrol ship have no confidently separable propulsion/control mechanism in the current art; they use runtime vessel movement, not fabricated moving parts. Their completeness limit is recorded in `navalMotionRigCoverage`.

## Integration and checks

Load `vehicle-rig-ground.js` then `vehicle-rig-naval.js` before any template creation. Attachment order is **Air → Naval → Ground** so original primitive ranges remain available. Ground must skip meshes already carrying `vehicleBones`. Descriptor roles reuse `turret`, `propeller`, `elevator`, `rudder`; their axes/pivots are in the owning mesh's local coordinates. All rest transforms are clone-safe metadata. Runtime uses simulation time through the shared `WarVehicleAnimation` only.

`node tools/check-naval-motion-rigs.cjs` passed: 114 slots, 72 with mechanical joints and 42 explicitly body-only. Checks compare original vertex attributes and triangle counts, material object identity and source metadata; verify normalized axes and instantiated joints; test independent cloned skeletons and frozen simulation time. The test uses the actual licensed GLB geometry/importer with CPU placeholder texture decoding, so it does not claim GPU texture or visual validation. Parent performs serial GPU deformation, view and pressure tests.

All unit rows, role lists and mesh counts: `naval-motion-rig-coverage.json`.
