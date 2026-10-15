(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: $("#view"),
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (e) {
    $("#loading").hidden = true;
    $("#error").style.display = "block";
    $("#error").textContent =
      "当前浏览器无法创建 3D 上下文。请启用硬件加速或使用本地 CAD Viewer 打开 models 目录中的 STEP 文件。";
    return;
  }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#182329");
  scene.fog = new THREE.Fog("#182329", 300, 750);
  const camera = new THREE.PerspectiveCamera(
      38,
      innerWidth / innerHeight,
      0.1,
      2000,
    ),
    modelRoot = new THREE.Group();
  scene.add(modelRoot);
  scene.add(new THREE.HemisphereLight("#c5d8df", "#4c4935", 1.0));
  const sun = new THREE.DirectionalLight("#ffe0ae", 2.6);
  sun.position.set(110, 160, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -180,
    right: 180,
    top: 180,
    bottom: -180,
    near: 1,
    far: 600,
  });
  sun.shadow.normalBias = 0.5;
  sun.shadow.bias = -0.0001;
  scene.add(sun);
  const rim = new THREE.DirectionalLight("#78b7d8", 1.0);
  rim.position.set(-100, 70, -100);
  scene.add(rim);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({
      color: "#4a524e",
      roughness: 0.95,
      metalness: 0.1,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.3;
  floor.receiveShadow = true;
  scene.add(floor);
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(125, 128, 2, 96),
    new THREE.MeshStandardMaterial({
      color: "#3b4545",
      roughness: 0.7,
      metalness: 0.4,
    }),
  );
  pad.position.y = -1;
  pad.receiveShadow = true;
  scene.add(pad);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(119, 0.22, 5, 120),
    new THREE.MeshBasicMaterial({ color: "#968763" }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  scene.add(ring);
  let yaw = 0.65,
    pitch = 0.38,
    distance = 230,
    targetY = 18,
    auto = true,
    wire = false,
    camo = true,
    drag = null,
    pending = 0;
  const mats = [];
  let maxSpan = 150;
  function material(color, name) {
    const isDark = color.reduce((a, b) => a + b, 0) < 0.5,
      isGlass = /glass|optic|window|lens/.test(name);
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(...color),
      metalness: isGlass ? 0.7 : isDark ? 0.3 : 0.55,
      roughness: isGlass ? 0.18 : isDark ? 0.92 : 0.7,
    });
    m.userData.base = m.color.clone();
    m.userData.name = name;
    mats.push(m);
    return m;
  }
  function paint(m) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const g = canvas.getContext("2d"),
      base = m.userData.base;
    g.fillStyle = "#" + base.getHexString();
    g.fillRect(0, 0, 128, 128);
    let seed = 17;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    if (
      camo &&
      !/glass|window|track|wheel|barrel|solar|optic|nozzle|hub|bolt|radiator/.test(
        m.userData.name,
      )
    ) {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? "#1c271d66" : "#7b795044";
        g.beginPath();
        let x = random() * 128,
          y = random() * 128;
        g.moveTo(x, y);
        for (let j = 0; j < 5; j++)
          g.lineTo(x + (random() - 0.5) * 75, y + (random() - 0.5) * 75);
        g.fill();
      }
    }
    for (let i = 0; i < 1900; i++) {
      g.fillStyle = random() > 0.5 ? "#dfd4aa09" : "#101c1710";
      g.fillRect(random() * 128, random() * 128, 1 + random() * 3, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    if (m.map) m.map.dispose();
    m.map = tex;
    m.color.set("white");
    m.needsUpdate = true;
  }
  function build(key) {
    const data = window.CADMeshes[key];
    while (modelRoot.children.length) {
      const obj = modelRoot.children[0];
      obj.geometry.dispose();
      obj.material.map?.dispose();
      obj.material.dispose();
      modelRoot.remove(obj);
    }
    mats.length = 0;
    let triangles = 0;
    for (const part of data) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(part.p, 3));
      geo.setIndex(part.i);
      geo.computeVertexNormals();
      const uv = [];
      for (let i = 0; i < part.p.length; i += 3)
        uv.push(part.p[i] / 40, part.p[i + 1] / 40);
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      const mesh = new THREE.Mesh(geo, material(part.c, part.name));
      mesh.rotation.x = -Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = part.name;
      modelRoot.add(mesh);
      triangles += part.i.length / 3;
    }
    const bounds = new THREE.Box3().setFromObject(modelRoot),
      size = bounds.getSize(new THREE.Vector3());
    maxSpan = Math.max(size.x, size.y, size.z);
    distance = maxSpan * 1.9;
    targetY = size.y * 0.35;
    modelRoot.position.x = -(bounds.max.x + bounds.min.x) / 2;
    modelRoot.position.z = -(bounds.max.z + bounds.min.z) / 2;
    modelRoot.position.y = -bounds.min.y;
    for (const m of mats) paint(m);
    $("#stats").textContent =
      data.length + " 个独立构件 · " + triangles.toLocaleString() + " 个三角面";
    $("#model-name").textContent = $("#model").selectedOptions[0].textContent;
    $("#loading").hidden = true;
    window.Armory = {
      scene,
      modelRoot,
      renderer,
      camera,
      key,
      parts: data.length,
      triangles,
    };
  }
  function load(key) {
    const id = ++pending;
    $("#loading").hidden = false;
    if (window.CADMeshes?.[key]) {
      build(key);
      return;
    }
    const script = document.createElement("script");
    script.src = "assets/meshes/" + key + ".js";
    script.onload = () => {
      if (id === pending) build(key);
    };
    script.onerror = () => {
      $("#loading").textContent =
        "素材读取失败，请确认 assets/meshes 目录完整。";
    };
    document.body.append(script);
  }
  $("#model").onchange = (e) => load(e.target.value);
  $("#rotate").onclick = () => {
    auto = !auto;
    $("#rotate").textContent = "自动旋转 " + (auto ? "开" : "关");
  };
  $("#wire").onclick = () => {
    wire = !wire;
    for (const m of mats) m.wireframe = wire;
    $("#wire").textContent = "线框 " + (wire ? "开" : "关");
  };
  $("#camo").onclick = () => {
    camo = !camo;
    for (const m of mats) paint(m);
    $("#camo").textContent = "迷彩 " + (camo ? "开" : "关");
  };
  $("#light").onclick = () => {
    sun.color.setHex(sun.color.getHex() === 0xffe0ae ? 0xc6d8ff : 0xffe0ae);
    sun.position.x = -sun.position.x;
  };
  const canvas = $("#view");
  canvas.onpointerdown = (e) => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (!drag) return;
    yaw -= (e.clientX - drag.x) * 0.006;
    pitch = Math.max(0.05, Math.min(1.3, pitch + (e.clientY - drag.y) * 0.005));
    drag = { x: e.clientX, y: e.clientY };
  };
  canvas.onpointerup = () => (drag = null);
  canvas.onwheel = (e) => {
    e.preventDefault();
    distance = Math.max(
      maxSpan * 0.55,
      Math.min(maxSpan * 4, distance * Math.exp(e.deltaY * 0.001)),
    );
  };
  canvas.ondblclick = () => {
    yaw = 0.65;
    pitch = 0.38;
    distance = maxSpan * 1.9;
  };
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (auto && !drag) yaw += dt * 0.09;
    camera.position.set(
      Math.cos(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance + targetY,
      Math.sin(yaw) * Math.cos(pitch) * distance,
    );
    camera.lookAt(0, targetY, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  load("tank_chn");
  requestAnimationFrame(frame);
})();
