# USS Arleigh Burke exterior asset

- Title: 1:1 Low poly US NAVY DDG-51 USS Arleigh Burke.
- Author: Yi Tsung Lee / WTigerTw, https://sketchfab.com/WTigerTw
- Source: https://sketchfab.com/3d-models/11-low-poly-us-navy-ddg-51-uss-arleigh-burke-17be09c31c6047e4a5969b68c29eba03
- License: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/
- License evidence: https://api.sketchfab.com/v3/models/17be09c31c6047e4a5969b68c29eba03 (checked 2026-10-16), license.slug=by, commercial use allowed with attribution.
- Author description expressly states: model and texture by WTigerTw; created for use in Cities Skylines. This identifies authored mod artwork, rather than claiming extracted Cities Skylines artwork.
- Public download mirror: https://raw.githubusercontent.com/jstxw/CyberSea/hi/main/public/models/destroyer.glb
- Download size: 5,419,076 bytes. Embedded GLB asset.extras repeats the author, source, and CC-BY-4.0 grant.
- 49,381 triangles in the downloaded GLB (live Sketchfab API reports 49,632 faces); 6 meshes, 5 PBR materials, 14 embedded PNG images; no skin or animation clips.
- Adaptation in this project: unchanged GLB plus an identical base64 embedded copy for offline file:// execution; runtime rotation to +X bow, uniform scale to 24 art units, centered in X/Z. Y=0 source waterline retained. No claim of exact engineering fidelity.

Required attribution (retain when sharing):

This work is based on “1:1 Low poly US NAVY DDG-51 USS Arleigh Burke.” by Yi Tsung Lee / WTigerTw (https://sketchfab.com/WTigerTw), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Original model: https://sketchfab.com/3d-models/11-low-poly-us-navy-ddg-51-uss-arleigh-burke-17be09c31c6047e4a5969b68c29eba03 . Adapted orientation and display scale for Modern Frontline HD.

The imported art is separate from the verified real-ship photographic reference:
https://www.usff.navy.mil/Press-Room/News-Stories/Article/3112957/uss-arleigh-burke-responds-to-man-overboard/

## Loader

assets/vendor/GLTFLoader.bundle.js combines the official three.js r160 GLTFLoader and BufferGeometryUtils, MIT licensed under assets/vendor/THREE-LICENSE.txt. ES module import/export declarations were adapted into isolated IIFEs bound to the existing global THREE, without a second engine copy. Original sources:
- https://github.com/mrdoob/three.js/blob/r160/examples/jsm/loaders/GLTFLoader.js
- https://github.com/mrdoob/three.js/blob/r160/examples/jsm/utils/BufferGeometryUtils.js
