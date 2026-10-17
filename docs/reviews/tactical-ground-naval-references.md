# Tactical wave: four original ground / naval roles

Recorded: 2026-10-17. Scope: `src/models-tactical-ground-naval.js`, four roles × six factions. The units are original game art with reference-informed equipment arrangements, not replicas of the cited products. All geometry was authored locally; no third-party model or photograph is bundled.

## Public references and design use

| Role | Official source | Information used | Deliberate original design |
| --- | --- | --- | --- |
| `sniper_team` | [U.S. Army M151 Spotting Scope System](https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M151-Spotting-Scope-System/) | The official equipment description identifies an observer scope, target recognition and a tripod usable from low positions. Search-index text was available; the page body did not load through the research tool. | Two adult-proportioned figures: a prone shooter with long rifle, supported optic and bipod, plus a separate kneeling observer with a tripod-mounted telescope. The two-person game group is not claimed as the universal organization of a real sniper team. |
| `sniper_team` | [U.S. Army: Day of the sniper](https://www.army.mil/article/22122/day_of_the_sniper_the_story_behind_the_million_dollar_shot) | Accessible official article independently distinguishes shooter, observer scope and communications. | Low shooter silhouette, independent observing pose, packed radio/case. No copied unit identity, historical engagement parameters or named rifle. |
| `mobile_ciws` | [Rheinmetall: Skyranger 30 for the Netherlands](https://www.rheinmetall.com/en/media/news-watch/news/2025/12/2025-12-12-rheinmetall-to-supply-skyranger-30-for-the-dutch-armed-forces) | Accessible manufacturer article describes a modular cannon turret, tracking sensors and mobile/stationary mounts. The official article also links an exterior image. | A new six-wheel chassis with faceted cab, a compact elevated-barrel cannon station and a separately rotating supported rear search radar. This is not labelled Skyranger or Boxer; the article's purchase/delivery dates and real ammunition specifications are not used as game stats. |
| `fleet_command_ship` | [U.S. Navy: USS Blue Ridge — About](https://www.surfpac.navy.mil/Warships/USS-Blue-Ridge-LCC-19/About/) | Official search-index description establishes the command/control and coordination role. The full page could not be fetched in this session. | An original twin-hull platform, broad transverse bridge, two radomes, communications mast and open operations deck. Blue Ridge is not a catamaran; the hull choice is explicitly original and is not a visual reconstruction of that ship. |
| `electronic_warfare_ship` | [NAVSEA: SEWIP evaluation for LCS](https://www.navsea.navy.mil/Media/News/Article/582100/sewip-block-upgrade-program-evaluated-for-use-on-lcs/) | Official search-index text describes antenna/receiver/interface upgrades and detection/classification functions. Full-page fetch returned HTTP 403. | A slender single hull with fore bridge, four side-facing panels on visible braces and two truss sensor masts. The array shapes and arrangement are game art, not an engineering reconstruction of AN/SLQ-32. |
| `electronic_warfare_ship` | [NAVSEA public SEWIP presentation](https://www.navsea.navy.mil/Portals/103/Documents/Exhibits/SNA2022/SNA2022-CAPTJasonHall-SEWIP.pdf) | Search-index content identifies shipboard antenna/sensor placement. Direct PDF fetch returned HTTP 403, so this document is supporting context, not a claimed image-by-image visual inspection. | Distributed equipment on structural sponsons; no weapon barrel, missile rack or muzzle marker on either support ship. |

## Geometry and integration contract

- +X is forward. The armed roles have exactly one `muzzle` at the physical exit. The sniper assembly and close-defense cannon are named `turret`; the vehicle's independent search assembly and command ship navigation array are named `radar`.
- Both support ships are unarmed and have `servicePoint`, never `muzzle`. Their support bonuses are simulation design values supplied by the main agent: naval reload −20% for command support and enemy naval reload +25% for electronic interference. These percentages are not public real-world weapon performance claims.
- `WarDetail.Builder` batches the geometry; meshes preserve the shared PBR surface material and `surface` attributes. Each root carries `scale`, `parts`, `original: true`, `evidenceStatus: original-role-variant`, role, distinct `profile`, `detailPass: 2`, `modelFamily`, and `fiction` for the empire faction.
- Window planes follow their tapered bridge surfaces. Radomes, radar pivots, cannon station, EW side panels and mast arrays have attached bases/braces. Hulls have curved cross sections, waterline detail, transom/end closure, rails and passage space.

## Non-GPU validation

All 24 variants were instantiated under Node using the same local Three.js and model scripts. Checks: finite position/normal/color values and nonzero bounds; correct surface-attribute length; PBR material preservation; root provenance metadata; armed/unarmed muzzle policy; named rotating assemblies. No browser or GPU was started by this agent.

| Chinese faction instance | Triangles | Batched meshes | Builder parts | Model scale |
| --- | ---: | ---: | ---: | ---: |
| Sniper and observer | 12,700 | 1 | 105 | 5.7 |
| Mobile CIWS | 15,336 | 3 | 579 | 6.2 |
| Fleet command ship | 10,468 | 2 | 239 | 4.7 |
| Electronic warfare ship | 11,690 | 1 | 239 | 4.6 |

Across six factions: 9,668–15,336 triangles, at most three batched meshes. These counts verify geometry and batching only. They do not prove photographic fidelity, visibility at RTS scale, real combat performance, or final visual acceptance. The root agent schedules shared GPU captures; an independent supervisor reviews the rendered results next.
