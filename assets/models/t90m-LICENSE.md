# T-90M exterior artwork

- Original model title: T-90M.
- Author/uploader: minehffd, https://sketchfab.com/minehffd
- Original source: https://sketchfab.com/3d-models/t-90m-2e31a3cf16b04f0180b9387df5198c9a
- License: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/
- Checked on 2026-10-16 through the original model page and official API: https://api.sketchfab.com/v3/models/2e31a3cf16b04f0180b9387df5198c9a . The API reports license.slug=by and commercial use with author attribution. A snapshot is kept in t90m-source-metadata.json.
- Public derivative mirror: https://raw.githubusercontent.com/Kevin-Liu-01/Claude-of-Tanks/255aff4087401f9a4297ef407c21e85ab7ec0728/public/models/tanks/t90m_minehffd.glb . This is an explicitly recorded historical revision, not the current repository tree.
- Downloaded source SHA256: 3f36c5eabd16dd0f8c0a67e2c4d26198c7d41198b99b0f681a4e938cff8ac9b0.
- The source GLB's asset.copyright and scene extras repeat the same author, model ID, source and CC-BY-4.0 license. Its thumbnail, tank fittings, turret/rear cage geometry and parade livery correspond to the original page. No actual competing asset identity or commercial-game extraction statement was found. This records the published license and our checks; it is not an absolute guarantee of originality.

## Attribution to retain when sharing

This work is based on “T-90M” by minehffd (https://sketchfab.com/minehffd), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Original model: https://sketchfab.com/3d-models/t-90m-2e31a3cf16b04f0180b9387df5198c9a . Obtained through an optimized public derivative in Kevin-Liu-01/Claude-of-Tanks, revision 255aff4087401f9a4297ef407c21e85ab7ec0728. Modern Frontline HD changes: +X-forward orientation, uniform display scaling/grounding, baked transforms, material batching within separate hull/turret/gun groups, preserved independent pivots, and an identical base64 copy for offline loading.

## Adaptation and validation

The original site reports 205,998 triangles. The downloaded optimized derivative contains 122,516 triangles, 116 meshes, 15 declared materials and 42 embedded WebP images. This project preserves every downloaded triangle, UV, vertex color and texture. It retains original material definitions, makes glTF's implicit default material explicit, and adds six derivatives for selectively corrected armour paint. Final output: 23 meshes, 22 stored materials, 42 images. It does not copy the mirror repository's source code or procedural models.

`tools/convert-t90m.cjs` is the reproducible conversion; `t90m-conversion.json` records source/output hashes and source-node grouping. The display hull is 7.7 arbitrary art units, not a certified dimensional reconstruction. Turret and gun pivots are inherited from the source assembly and transformed consistently. Only the Russian T-90M is registered, never India's T-90S.

Original texture images and livery are retained. A photograph-referenced olive paint correction is applied only to explicit armour nodes and the dedicated turret/ERA/mantlet materials: linear RGB tint factors [0.62,0.72,0.46] (mantlet keeps its existing olive factor), metallic factor 0.05, roughness factor 1.0 while retaining the original roughness texture variation. Mixed front-hull material is split by audited node IDs so headlamps and driver's periscope stay unchanged. Wheels, tracks, weapon parts, mixed small fittings, basket/decal materials and optical parts keep their original material assignments. The source's grey front panels that cannot be reliably isolated and the parade side-skirt finish remain grey; no whole-vehicle tint is claimed. See paintAudit in t90m-conversion.json for the exact 21 selected source nodes.

The source has a flat-color gun-mantlet material and some surfaces lack normal maps; the asset is not a verified exact production-batch replica. Runtime loading failure retains the procedural model. `t90m-validation.json` records an offline file:// load, preserved imported materials, static hull under turret yaw, stationary turret pivot, moving gun, unchanged Indian fallback and missing-data failure handling.
