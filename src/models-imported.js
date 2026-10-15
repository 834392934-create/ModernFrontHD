/* Offline third-party art import. Model: Yi Tsung Lee / WTigerTw, CC BY 4.0.
 * See assets/models/burke-LICENSE.md. Programmatic model remains on load failure. */
(function (root) {
  'use strict';
  const state = root.WarImported = { status: 'loading', errors: [], loaded: [] };
  const referenceUrl = 'https://www.usff.navy.mil/Press-Room/News-Stories/Article/3112957/uss-arleigh-burke-responds-to-man-overboard/';
  const assetSource = 'https://sketchfab.com/3d-models/11-low-poly-us-navy-ddg-51-uss-arleigh-burke-17be09c31c6047e4a5969b68c29eba03';
  state.ready = Promise.resolve().then(async function () {
    const T = root.THREE;
    if (!T || !T.GLTFLoader || !root.WarModels) throw new Error('Burke import dependencies are missing');
    if (!root.WarBurkeGLB) throw new Error('Embedded Burke GLB data is missing');
    const binary = atob(root.WarBurkeGLB), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const gltf = await new T.GLTFLoader().parseAsync(bytes.buffer, '');
    const art = gltf.scene;
    // Source ship is +Z forward and Y up after its glTF node transforms.
    // Its original Y=0 is the waterline, with the red underwater hull below it.
    art.rotation.y = Math.PI / 2;
    art.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(art), size = bounds.getSize(new T.Vector3());
    if (!Number.isFinite(size.x) || size.x < 1) throw new Error('Burke model has invalid bounds');
    const scale = 24 / size.x;
    art.scale.setScalar(scale);
    art.updateMatrixWorld(true);
    bounds.setFromObject(art);
    const center = bounds.getCenter(new T.Vector3());
    art.position.set(-center.x, 0, -center.z);
    let parts = 0, triangles = 0;
    art.traverse(function (mesh) {
      if (!mesh.isMesh) return;
      parts++;
      triangles += (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3;
      mesh.userData.preserveMaterial = true;
      mesh.castShadow = mesh.receiveShadow = true;
    });
    const template = new T.Group();
    template.add(art);
    template.name = 'DDG-51 USS Arleigh Burke — WTigerTw';
    template.userData = {
      scale: 5.4, parts, triangles, profile: 'Arleigh Burke DDG-51 / Flight I — licensed textured exterior',
      evidenceStatus: 'photo-referenced', reviewStatus: 'licensed-art-multi-view-reviewed',
      referenceUrl, assetSource, license: 'CC-BY-4.0', author: 'Yi Tsung Lee / WTigerTw',
      assetPath: 'assets/models/burke.glb', waterlineY: 0,
      limitations: 'Exterior game art; not an engineering reconstruction. Source includes underwater hull.'
    };
    root.WarModels.register('destroyer', 'usa', function () {
      const copy = template.clone(true);
      // Keep instance display/fog adjustments independent; geometry and textures stay shared.
      copy.traverse(function (mesh) {
        if (!mesh.isMesh) return;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone();
        mesh.userData.preserveMaterial = true;
      });
      return copy;
    });
    state.status = 'ready';
    state.loaded.push('destroyer_usa');
    root.dispatchEvent(new CustomEvent('war-models-ready', { detail: { loaded: state.loaded.slice() } }));
    return { status: state.status, loaded: state.loaded.slice(), errors: [] };
  }).catch(function (error) {
    state.status = 'failed';
    state.errors.push(error && error.message ? error.message : String(error));
    console.error('[WarImported] Burke import failed; procedural model retained.', error);
    root.dispatchEvent(new CustomEvent('war-models-error', { detail: { errors: state.errors.slice() } }));
    return { status: state.status, loaded: [], errors: state.errors.slice() };
  });
})(globalThis);
