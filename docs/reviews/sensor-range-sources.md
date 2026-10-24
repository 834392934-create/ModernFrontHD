# Sensor and defensive-range boundary — 2026-10-25

This change separates weapon engagement distance, optical observation, radar contacts, sonar contacts and orbital terrain coverage. It does not certify the original game meshes as real fitted equipment. Classic mode retains its previous sight circles and radar weapon-range bonus; published-range mode uses the independently labelled profiles below and does not increase a weapon's physical range by placing a radar nearby.

## Public sources and their limited use

| Official reference | Published quantity | Used in this game | Boundary |
| --- | --- | --- | --- |
| [Saab Giraffe 4A](https://www.saab.com/products/giraffe-4a) | 400 km instrumented range | Original radar-building and early-warning-aircraft air-contact range ceiling | A class analogy, not a claim that either mesh is Giraffe 4A. Instrumented range is not guaranteed detection/identification of every aircraft. No ground personnel or submarine contacts. |
| [ESA Sentinel-2](https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2) | 290 km imaging swath; 786 km altitude | A circular **explored-terrain** footprint for original satellite/mapper roles | Civilian imaging geometry only. It does not establish real-time military tracking, resolution, revisit time, cloud penetration or personnel identification. Large structure/surface-vessel contacts are an explicitly simplified game rule. |
| [Rheinmetall Skyranger](https://www.rheinmetall.com/en/products/air-defence-systems/mobile-air-defence-skyranger) | Skyranger 35 gun up to 4 km; Skyranger 30 gun up to 3 km | Generic turret 4,000 m and generic CIWS 3,000 m **inferred** choices | Separate gun records; no missile/search range borrowed. The existing C-RAM-style mesh is not an exact Skyranger or a certified calibre. Existing surface target eligibility remains a game rule. |
| [Spanish Army NASAMS](https://ejercito.defensa.gob.es/en/materiales/artilleria_antiaerea/NASAMS.html) | Maximum range 25 km in this system entry | Generic SAM building 25,000 m **inferred** choice | Does not assign the same envelope to all NASAMS missiles/variants. No guidance claims copied from this entry. |

The official records remain in `WarWeaponRanges.catalog`; the corresponding original-building selections retain `status: 'inferred'`, `publishedM: null`, an estimate and reference IDs. Damage, interception accuracy, reload and target eligibility are game parameters, not additional sourced specifications.

## Explicit game assumptions

- Mobile optical estimates preserve the prior role distance interpreted as `d.sight × 10` metres. Building estimates are HQ 2,000 m; economy/production 1,000–1,500 m; turret 4,000 m; bunker 1,200 m; CIWS/SAM 3,000 m; radar 1,500 m. These are observation-role estimates, not guaranteed human recognition distances. Optical observation does not identify orbit or submerged units.
- Public optical contacts use a 3D radius. Their ground-fog footprint is the horizontal cross-section `sqrt(max(0, radius² − altitude²))`; a high aircraft cannot reveal nearby ground personnel through a flat fog circle when the ground is outside its optics. This does not implement terrain/tree optical occlusion or weather.
- Radar is air-only. The selected game horizon bound is `4,120 × (sqrt(observer height m) + sqrt(target height m))` metres, capped by the instrumented analogy. The building antenna is estimated at 15 m. Ordinary aircraft height uses the scenario metre scale; orbital height retains the separate established 100 m/u compression. This bound is not an RCS, signal-to-noise, terrain-masking or probability-of-detection simulation.
- Mapper radius is `145,000 × (orbital altitude u × 100) / 786,000` metres. At 4,000 u / 400 km it is approximately 73.79 km. The circle represents a simplified footprint, not Sentinel-2's real rectangular swath or a military sensor specification. It writes explored terrain only. Ordinary orbital combat sensors detect space contacts only and do not reveal ground terrain; the original orbital early-warning role additionally receives explicitly fictional air contacts.
- Sonar retains the existing game range and physical underwater eligibility gate. Repair, shield, jamming and fire-control distances retain their game-unit meanings. A radar cannot provide submarine contact. A vision cheat/recon ability remains explicitly authorised game intelligence.
- Public CIWS attack, interceptor admission and the displayed intercept ring use the same per-station range. Classic interception distances stay unchanged. A vessel's CIWS evidence is taken from its CIWS station, not from its selected anti-ship missile.

## Runtime contract and cost

`WarSensors.profiles(game, entity, power?)` returns immutable, bounded profiles with type, radius, metres, domains, active state, reference and terrain-reveal mode. `sightRadius` is optical ground coverage only. `terrainZones` returns `{x,y,r,mode:'visible'|'explored',type}`. `detects`/`unitsInSight` are contact queries; `entityVisible` handles friendly units, cheats, recon, personnel optical fog and underwater eligibility. `zones` supplies labelled range hints. `interceptionRange(game,e,weapon?)` accepts a concrete defensive station; synthetic building readiness metadata cannot override its published building range.

Profiles use per-game/per-observer WeakMap caches keyed by semantic state: definition/kind, mode, metre scale, faction vision factor, operational/incapacitation state and current altitude. Source positions and target positions are read at each contact query, never cached. Electronic observers share one **current** team-power scan per contact query, so same-tick power loss/EMP is not hidden behind a tick-only cache. Terrain fog uses bounded row spans in the main simulation. No sensor radius creates a target-by-all-map-cell scan.

The 2D overlay retains the existing bounded entity selection and a fixed 72 segments per circle, clips line endpoints to the viewport, keeps relevant offscreen emitters and labels a circle covering the view. It does not shrink the simulation range to fit the screen. Public sensor labels display metric distances and their own evidence category.

Projectile **physical collision** and **tracking intelligence** are separate. `canImpact` retains hostile/domain/health and the pre-existing underwater rule; `canTrack` additionally requires current entity visibility. A launched kinetic round can still hit an unseen enemy once. A guided missile losing contact coasts instead of steering toward hidden live coordinates; torpedo reacquisition also requires contact. Projectile expiry reads the owning map's dimensions rather than the legacy shared world constants.

## Verification

Focused CPU checks in `tests/sensors.test.cjs` cover classic compatibility, radar domains/horizon/power/EMP, mapper altitude scaling and non-personnel rules, orbital isolation, CIWS range parity, authoritative evidence, fixed-cost clipped circles, real `Game.emitShot` followed by contact loss, map-local expiry, immutable cache reuse and same-tick invalidation. Existing projectile, public-range data and range-display suites are rerun with it. These are simulation/data checks; they do not certify final desktop rendering or end-to-end release performance, which remain the parent task's independent packaged-game validation.
