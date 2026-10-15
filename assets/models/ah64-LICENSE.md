# AH-64 Helicopter — attribution and changes

**Author:** Andrew Swihart / ArionDigital

**Original model:** https://sketchfab.com/3d-models/ah-64-helicopter-56f54d3865d247c78b49c2b47454da86

**Author profile:** https://sketchfab.com/andrewswihart

**License:** Creative Commons Attribution 4.0 International (CC BY 4.0)

https://creativecommons.org/licenses/by/4.0/

Legal code: https://creativecommons.org/licenses/by/4.0/legalcode

Original creator API response was verified on 2026-10-16: license.slug `by`, license.url `http://creativecommons.org/licenses/by/4.0/`, isDownloadable `true`. Retained as `ah64-source-api.json`. The downloaded glTF asset.extras identifies the same author, source ID and license.

Source archive mirror: https://github.com/projeto-arcanjo/modelos/blob/master/ah-64_helicopter.zip

Source ZIP SHA256: `0DFD7DE823324FC2DE7873338881B6D358C865718183447BF4AE04E284B78D45`

## Modifications by ModernFront

- Baked source transforms, leveled the original approximately 10-degree nose-down pose, and converted source +Z nose to game +X nose.
- Normalized exterior size for the game; this is not a measurement-accurate CAD model.
- Removed two fully transparent studio planes (4 triangles), not aircraft components.
- Merged meshes with identical PBR settings, separated static body, main rotor and tail rotor pivot groups; retained the remaining 220,711 triangles and original materials except the four main-blade surfaces.
- Recolored only four main-blade source nodes (144,147,150,153) to dark nonmetallic, rough coated surfaces after comparing Boeing and DVIDS photographs. Main-hub and root-linkage materials remain original. This adds one material batch.
- Converted to an embedded, self-contained GLB/JavaScript payload for offline file:// use.
- Added game metadata and animation integration. Original asset has no bitmap textures or animation clips.

Files covered: `ah64.glb`, `ah64-data.js`. These remain adaptations of the CC-BY-4.0 asset. The original creator does not endorse this project.

This is an AH-64 Longbow reference exterior, not a certified AH-64E production configuration. Public real-aircraft photographs serve as exterior reference only and are not packaged as textures.
