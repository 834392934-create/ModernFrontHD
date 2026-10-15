(function () {
  "use strict";
  const D = WarData,
    { F, U, B, BUFFS, ABILITIES } = D,
    $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const r = new WarRenderer($("#battle"), $("#minimap"));
  let game = null,
    demo = new WarSim.Game({
      faction: "chn",
      enemies: 4,
      map: "desert",
      buffs: ["vision"],
    }),
    faction = "chn",
    map = "river",
    tab = "units",
    paused = false,
    modalWasPaused = false,
    speed = 1,
    mode = null,
    selection = new Set(),
    pointer = { x: 0, y: 0 },
    drag = null,
    middle = null,
    groups = {},
    keys = new Set(),
    acc = 0,
    last = performance.now(),
    uiTimer = 0,
    frames = 0,
    fps = 60,
    frameTimer = 0,
    outcomeShown = false,
    sound = true,
    audio = null,
    hadFocus = true;
  const lighting = new WarLighting($("#battle"));
  r.camera = { x: 1550, y: 1000, zoom: 0.64 };
  r.prepare(demo);
  function escapeHTML(v) {
    return String(v).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function flag(k) {
    return '<span class="flag ' + F[k].flag + '" aria-hidden="true"></span>';
  }
  function unitName(k, f) {
    if (D.EXTRA[f]?.[k]) return D.EXTRA[f][k];
    if (k === "jet")
      return f === "usa"
        ? "F-47（公开研发项目）"
        : f === "chn"
          ? "下一代战机（技术推演）"
          : f === "imp"
            ? "雷霆战鹰（科幻）"
            : "六代空优机（架空）";
    if (k === "infantry")
      return f === "imp" ? "星界军突击小队" : "战术步兵小组";
    return U[k]?.index !== undefined
      ? F[f].names[U[k].index]
      : (U[k] || B[k])?.name || k;
  }
  function toast(text) {
    $("#toast").textContent = text;
    $("#toast").style.opacity = 1;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => ($("#toast").style.opacity = 0), 3000);
  }
  function beep(freq = 450, duration = 0.06, type = "sine", gain = 0.035) {
    if (!sound) return;
    try {
      if (!audio)
        audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const o = audio.createOscillator(),
        a = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      a.gain.value = gain;
      a.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      o.connect(a);
      a.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + duration);
    } catch {}
  }
  function setupMenu() {
    $("#factions").innerHTML = Object.entries(F)
      .map(
        ([k, f]) =>
          '<button class="faction-button ' +
          (k === faction ? "active" : "") +
          '" data-faction="' +
          k +
          '">' +
          flag(k) +
          '<span class="faction-name">' +
          f.name +
          "<small>" +
          f.en +
          '</small></span><span class="rank">' +
          (f.rank ? "#0" + f.rank : "SCI-FI") +
          "</span></button>",
      )
      .join("");
    $("#faction-detail").innerHTML =
      "<b>" +
      F[faction].trait +
      "</b><br>" +
      F[faction].names.slice(0, 4).join(" / ") +
      "<br>" +
      (faction === "imp"
        ? "非官方同人科幻阵营 · 强度远高于现代阵营"
        : "真实装备题材 · 所有战斗参数均为游戏数值");
    $$("[data-faction]").forEach(
      (b) =>
        (b.onclick = () => {
          faction = b.dataset.faction;
          setupMenu();
          beep();
        }),
    );
    $("#maps").innerHTML = D.MAPS.map(
      (m) =>
        '<button class="map-button ' +
        (m.id === map ? "active" : "") +
        '" data-map="' +
        m.id +
        '"><canvas class="map-preview" data-preview="' +
        m.id +
        '" width="172" height="120"></canvas><span class="map-info">' +
        m.name +
        "<small>" +
        m.en +
        "</small><p>" +
        m.desc +
        "</p></span></button>",
    ).join("");
    $$("[data-map]").forEach(
      (b) =>
        (b.onclick = () => {
          map = b.dataset.map;
          setupMenu();
          demo = new WarSim.Game({
            faction,
            enemies: 4,
            map,
            buffs: ["vision"],
          });
          r.prepare(demo);
          beep();
        }),
    );
    $$("[data-preview]").forEach((c) => {
      const m = WarSim.makeMap(c.dataset.preview),
        def = D.MAPS.find((v) => v.id === m.id),
        g = c.getContext("2d");
      g.fillStyle = def.palette[0];
      g.fillRect(0, 0, 172, 120);
      for (let i = 0; i < m.tiles.length; i++) {
        g.fillStyle =
          m.tiles[i] === 3
            ? "#365e6c"
            : m.tiles[i] === 4
              ? "#b9b492"
              : m.blocked[i]
                ? "#374746"
                : def.palette[m.tiles[i] === 1 ? 1 : 0];
        g.fillRect(
          ((i % 64) * 172) / 64,
          (Math.floor(i / 64) * 120) / 44,
          172 / 64 + 1,
          120 / 44 + 1,
        );
      }
      for (const n of m.nodes) {
        g.fillStyle = "#e5c880";
        g.fillRect((n.x / D.W) * 172 - 2, (n.y / D.H) * 120 - 2, 4, 4);
      }
      for (let i = 0; i < 5; i++) {
        const p = m.spawns[i];
        g.fillStyle = i === 0 ? "#edd49d" : "#c68577";
        g.beginPath();
        g.arc((p.x / D.W) * 172, (p.y / D.H) * 120, 3, 0, 7);
        g.fill();
      }
    });
  }
  function buffHTML(selected, prefix) {
    return Object.entries(BUFFS)
      .map(
        ([k, v], i) =>
          '<label class="buff-item"><span class="buff-num">0' +
          (i + 1) +
          '</span><span class="buff-name">' +
          v.name +
          "<small>" +
          v.desc +
          '</small></span><input type="checkbox" data-buff="' +
          k +
          '" name="' +
          prefix +
          '" ' +
          (selected.has(k) ? "checked" : "") +
          "></label>",
      )
      .join("");
  }
  $("#buffs").innerHTML = buffHTML(new Set(), "setup");
  $("#all-buffs").onclick = () =>
    $$("#buffs input").forEach((i) => (i.checked = true));
  $("#clear-buffs").onclick = () =>
    $$("#buffs input").forEach((i) => (i.checked = false));
  function startGame(opts) {
    try {
      game = new WarSim.Game(opts);
      enterGame();
      toast("部署完成。先占领补给站，扩大收入。");
      beep(650, 0.2);
    } catch (e) {
      toast("启动失败：" + e.message);
      console.error(e);
    }
  }
  function enterGame() {
    paused = false;
    acc = 0;
    outcomeShown = false;
    applyBuffs.gifted = !!game.wealthGranted;
    selection.clear();
    mode = null;
    keys.clear();
    groups = {};
    $("#menu").hidden = true;
    $("#hud").hidden = false;
    $("#modal").hidden = true;
    $("#pause-banner").hidden = true;
    const p = game.map.spawns[0];
    r.camera = {
      x: p.x + 150,
      y: p.y + 150,
      zoom: innerWidth < 760 ? 0.58 : 0.9,
    };
    r.prepare(game);
    r.pointer = pointer;
    updateHUD();
  }
  $("#start").onclick = () => {
    const opts = {
      faction,
      map,
      enemies: Number($("#enemies").value),
      difficulty: $("#difficulty").value,
      allied: $("#allied").checked,
      abilities: $("#abilities").checked,
      advanced: $("#advanced").checked,
      playerOnlyTech: $("#player-only").checked,
      buffs: $$("#buffs input:checked").map((e) => e.dataset.buff),
      opponents: $$("#opponents select").map((e) => e.value || undefined),
    };
    startGame(opts);
  };
  function setMode(v) {
    mode = mode === v ? null : v;
    $("#order-status").textContent = mode
      ? (B[mode]
          ? "放置 " + B[mode].name
          : ABILITIES[mode]?.name || "攻击移动") + " · 左键确认 / 右键取消"
      : "等待指令";
    $("#battle").style.cursor = mode ? "crosshair" : "default";
    updateHUD();
  }
  function updateHUD() {
    if (!game) return;
    const t = game.teams[0],
      f = F[t.faction],
      own = game.teamEntities(0),
      unit = own.filter((e) => !e.structure);
    $("#team-name").innerHTML = flag(t.faction) + f.name;
    $("#side-faction").textContent = f.flag;
    $("#money").textContent = Math.floor(t.money).toLocaleString();
    $("#income").textContent =
      "+" + Math.round(t.income * (game.buffs.has("income") ? 2 : 1)) + "/s";
    $("#power").textContent = (t.power >= 0 ? "+" : "") + t.power;
    $("#power").style.color = t.power < 0 ? "#ee9a73" : "";
    $("#population").textContent = unit.length + " / 100";
    $("#clock").textContent = formatTime(game.time);
    $("#speed").textContent = speed + "×";
    $("#objective").textContent =
      "摧毁敌方指挥中心 · 剩余 " +
      game.teams.slice(1).filter((t) => t.alive).length;
    $("#pause").textContent = paused ? "▶ 继续" : "Ⅱ 暂停";
    $("#pause-banner").hidden = !paused || !$("#modal").hidden;
    const activeIds = new Set(game.entities.map((e) => e.id));
    for (const id of selection) if (!activeIds.has(id)) selection.delete(id);
    let catalog = "";
    if (tab === "units") {
      catalog = Object.entries(U)
        .map(([k, d]) => {
          if (d.advanced && !game.options.advanced) return "";
          const prod = own.some((e) => e.kind === d.producer),
            cost = game.cost(0, k),
            ready =
              prod &&
              t.money >= cost &&
              t.queue.length < 12 &&
              unit.length + t.queue.length < 100;
          return item(
            k,
            unitName(k, t.faction),
            d.icon,
            prod
              ? (d.advanced ? "尖端科技 · " : d.name + " · ") + d.time + "s"
              : "需要 " + B[d.producer].name,
            cost,
            !ready,
            d.role,
          );
        })
        .join("");
    }
    if (tab === "buildings")
      catalog = Object.entries(B)
        .filter(
          ([k, d]) => k !== "hq" && (!d.advanced || game.options.advanced),
        )
        .map(([k, d]) =>
          item(
            k,
            d.name,
            d.icon,
            (d.power > 0 ? "电力 +" + d.power : "耗能 " + -d.power) +
              " · " +
              d.time +
              "s",
            d.cost,
            t.money < d.cost || t.buildQueue.length >= 4,
            "在己方建筑 400 范围内放置",
          ),
        )
        .join("");
    if (tab === "abilities")
      catalog = Object.entries(ABILITIES)
        .filter(
          ([k, d]) =>
            (!d.advanced || game.options.advanced) &&
            (!d.imperial || t.faction === "imp"),
        )
        .map(([k, d]) => {
          let cd = Math.ceil(Math.max(0, (game.cooldowns[k] || 0) - game.time));
          return item(
            k,
            k === "strike" ? f.support : d.name,
            k === "nuke"
              ? "☢"
              : k === "bunker"
                ? "⬇"
                : k === "orbital"
                  ? "✧"
                  : "⌖",
            cd ? "冷却 " + cd + "s" : d.desc,
            d.cost,
            game.options.abilities === false || t.money < d.cost || cd > 0,
            d.desc + " · 游戏单位范围 " + d.radius,
          );
        })
        .join("");
    $("#catalog").innerHTML = catalog;
    $$("[data-item]").forEach(
      (b) =>
        (b.onclick = () => {
          const k = b.dataset.item;
          if (tab === "units") {
            if (game.train(0, k)) {
              beep(550);
              updateHUD();
            } else toast("无法生产：检查资金、生产设施或人口。");
          } else setMode(k);
        }),
    );
    $("#queue-count").textContent = t.queue.length + " / 12";
    $("#queue").innerHTML =
      t.queue
        .map(
          (q, i) =>
            '<button class="queue-entry" title="' +
            escapeHTML(unitName(q.kind, t.faction)) +
            ' · 右键取消" data-queue="' +
            i +
            '">' +
            U[q.kind].icon +
            '<i style="width:' +
            100 * (1 - q.remaining / q.total) +
            '%"></i></button>',
        )
        .join("") +
      t.buildQueue
        .map(
          (q) =>
            '<button class="queue-entry" title="' +
            B[q.kind].name +
            ' 建设中">' +
            B[q.kind].icon +
            '<i style="width:' +
            100 * (1 - q.remaining / q.total) +
            '%"></i></button>',
        )
        .join("");
    $$("[data-queue]").forEach(
      (b) =>
        (b.oncontextmenu = (e) => {
          e.preventDefault();
          game.cancel(0, Number(b.dataset.queue));
          updateHUD();
        }),
    );
    $("#intel").innerHTML =
      "<small>战区态势 / " +
      (game.options.allied ? "敌方联盟" : "自由混战") +
      "</small>" +
      game.teams
        .slice(1)
        .map(
          (t) =>
            '<div class="enemy-line"><i style="background:' +
            F[t.faction].color +
            '"></i><span>' +
            F[t.faction].name +
            "</span><span>" +
            (t.alive ? "交战中" : "已消灭") +
            "</span></div>",
        )
        .join("");
    const chosen = [...selection].map((id) => game.get(id)).filter(Boolean);
    $("#selection-title").textContent =
      chosen.length > 1
        ? "已选编队 / " + chosen.length
        : chosen.length === 1
          ? unitName(chosen[0].kind, t.faction)
          : "战区待命";
    $("#selection-info").textContent =
      chosen.length === 1
        ? "生命 " +
          Math.ceil(chosen[0].hp) +
          " / " +
          Math.ceil(chosen[0].maxHp) +
          " · " +
          (U[chosen[0].kind]?.role || "基地设施")
        : chosen.length
          ? "右键移动 / 集火 · A 攻击移动 · S 停止"
          : "左键选择单位，按住拖动框选";
    $("#selection-icons").innerHTML = chosen
      .slice(0, 25)
      .map(
        (e) =>
          '<span title="' +
          escapeHTML(unitName(e.kind, t.faction)) +
          '">' +
          (U[e.kind] || B[e.kind]).icon +
          "</span>",
      )
      .join("");
    $("#notifications").innerHTML = game.events
      .filter((e) => game.time - e.time < 9)
      .slice(0, 3)
      .map((e) => "<div>" + escapeHTML(e.text) + "</div>")
      .join("");
  }
  function item(k, name, icon, sub, cost, disabled, title) {
    return (
      '<button class="catalog-item ' +
      (mode === k ? "active" : "") +
      '" data-item="' +
      k +
      '" ' +
      (disabled ? "disabled" : "") +
      ' title="' +
      escapeHTML(title) +
      '"><span class="unit-symbol">' +
      icon +
      '</span><span class="item-body"><strong>' +
      escapeHTML(name) +
      "</strong><small>" +
      escapeHTML(sub) +
      '</small></span><span class="price">' +
      cost.toLocaleString() +
      "</span></button>"
    );
  }
  function formatTime(s) {
    return (
      String(Math.floor(s / 60)).padStart(2, "0") +
      ":" +
      String(Math.floor(s % 60)).padStart(2, "0")
    );
  }
  $$("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        $$("[data-tab]").forEach((v) => v.classList.toggle("active", v === b));
        setMode(null);
      }),
  );
  function selectable(p) {
    return game.entities
      .filter((e) => e.team === 0 && Math.hypot(p.x - e.x, p.y - e.y) < e.r + 8)
      .sort(
        (a, b) =>
          Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y),
      )[0];
  }
  function enemyAt(p) {
    return game.entities.find(
      (e) =>
        game.isEnemy(0, e.team) &&
        game.visibleAt(e.x, e.y) &&
        Math.hypot(p.x - e.x, p.y - e.y) < e.r + 12,
    );
  }
  const canvas = $("#battle");
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    if (!game || !$("#modal").hidden) return;
    pointer = { x: e.clientX, y: e.clientY };
    if (e.button === 1) {
      middle = pointer;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button === 2) {
      if (mode) {
        setMode(null);
        return;
      }
      if (paused) return;
      const p = r.toWorld(e.clientX, e.clientY),
        target = enemyAt(p);
      game.command([...selection], p.x, p.y, !!target, target?.id || null);
      beep(330, 0.06);
      return;
    }
    if (e.button !== 0) return;
    if (mode) {
      if (paused) {
        toast("请先继续对局");
        return;
      }
      const p = r.toWorld(e.clientX, e.clientY);
      if (mode === "attack") {
        game.command([...selection], p.x, p.y, true);
        setMode(null);
      } else if (B[mode]) {
        if (game.build(0, mode, p.x, p.y)) {
          toast(B[mode].name + "开始建造");
          if (!e.shiftKey) setMode(null);
          beep(650);
        } else toast("无法建造：需在己方建筑附近、地面空旷且资金足够。");
      } else if (game.ability(mode, p.x, p.y)) {
        beep(mode === "nuke" ? 95 : 220, 0.3, "triangle");
        setMode(null);
      } else toast("支援失败：检查资金、冷却、视野和科技选项。");
      updateHUD();
      return;
    }
    drag = { x: e.clientX, y: e.clientY, shift: e.shiftKey };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (middle) {
      r.pan(
        (middle.x - pointer.x) / r.camera.zoom,
        (middle.y - pointer.y) / r.camera.zoom,
      );
      middle = pointer;
    }
    if (game && !drag) {
      r.hover =
        selectable(r.toWorld(pointer.x, pointer.y))?.id ||
        enemyAt(r.toWorld(pointer.x, pointer.y))?.id ||
        null;
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    if (e.button === 1) {
      middle = null;
      return;
    }
    if (!drag || !game) return;
    const d = drag;
    drag = null;
    if (!d.shift) selection.clear();
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) {
      let found = selectable(r.toWorld(e.clientX, e.clientY));
      if (found) {
        if (d.shift && selection.has(found.id)) selection.delete(found.id);
        else selection.add(found.id);
        beep(600, 0.04);
      }
    } else {
      const a = r.toWorld(Math.min(d.x, e.clientX), Math.min(d.y, e.clientY)),
        b = r.toWorld(Math.max(d.x, e.clientX), Math.max(d.y, e.clientY));
      for (const u of game.entities)
        if (
          u.team === 0 &&
          !u.structure &&
          u.x >= a.x &&
          u.x <= b.x &&
          u.y >= a.y &&
          u.y <= b.y
        )
          selection.add(u.id);
    }
    updateHUD();
  });
  canvas.addEventListener("pointercancel", () => {
    drag = null;
    middle = null;
  });
  canvas.addEventListener("dblclick", (e) => {
    if (!game) return;
    const hit = selectable(r.toWorld(e.clientX, e.clientY));
    if (hit && !hit.structure) {
      selection = new Set(
        game.entities
          .filter((v) => v.team === 0 && v.kind === hit.kind)
          .map((v) => v.id),
      );
      updateHUD();
    }
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (!game) return;
      e.preventDefault();
      r.zoomAt(Math.exp(-e.deltaY * 0.001), e.clientX, e.clientY);
    },
    { passive: false },
  );
  $("#minimap").addEventListener("pointerdown", (e) => {
    if (!game) return;
    const rect = e.currentTarget.getBoundingClientRect(),
      x = ((e.clientX - rect.left) / rect.width) * D.W,
      y = ((e.clientY - rect.top) / rect.height) * D.H;
    if (e.button === 2) {
      e.preventDefault();
      game.command([...selection], x, y, mode === "attack");
      setMode(null);
    } else {
      r.camera.x = x;
      r.camera.y = y;
    }
  });
  $("#minimap").oncontextmenu = (e) => e.preventDefault();
  function selectAll() {
    selection = new Set(
      game.entities
        .filter((e) => e.team === 0 && !e.structure)
        .map((e) => e.id),
    );
    updateHUD();
  }
  function home() {
    const h = game.entities.find((e) => e.team === 0 && e.kind === "hq");
    if (h) {
      r.camera.x = h.x + 100;
      r.camera.y = h.y + 100;
    }
  }
  function stopUnits() {
    for (const id of selection) {
      const e = game.get(id);
      if (e) {
        e.order = null;
        e.path = [];
        e.target = null;
      }
    }
    setMode(null);
  }
  $("#select-all").onclick = selectAll;
  $("#attack-move").onclick = () => setMode("attack");
  $("#stop-units").onclick = stopUnits;
  $("#home").onclick = home;
  function togglePause() {
    if (!game || game.result || !$("#modal").hidden) return;
    paused = !paused;
    keys.clear();
    acc = 0;
    updateHUD();
  }
  $("#pause").onclick = togglePause;
  $("#speed").onclick = () => {
    speed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    updateHUD();
  };
  $("#sound").onclick = () => {
    sound = !sound;
    $("#sound").textContent = "音效 " + (sound ? "开" : "关");
    if (sound) beep();
  };
  addEventListener("keydown", (e) => {
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "escape") {
      if (!$("#modal").hidden) closeModal();
      else if (mode) setMode(null);
      else if (game) openSettings();
      return;
    }
    if (!game || !$("#modal").hidden) return;
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
      e.preventDefault();
    if (e.repeat) return;
    if (k === " ") {
      togglePause();
      return;
    }
    if (k === "q") selectAll();
    else if (k === "a" && !e.ctrlKey) setMode("attack");
    else if (k === "s") stopUnits();
    else if (k === "h") home();
    else if (k === "f5") {
      e.preventDefault();
      save();
    } else if (k === "f9") {
      e.preventDefault();
      load();
    } else if (/^[1-5]$/.test(k)) {
      if (e.ctrlKey) {
        e.preventDefault();
        groups[k] = [...selection];
        toast("编组 " + k + " 已保存");
      } else {
        selection = new Set((groups[k] || []).filter((id) => game.get(id)));
        updateHUD();
      }
    } else keys.add(k);
  });
  addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  addEventListener("blur", () => {
    keys.clear();
    drag = null;
    middle = null;
    if (game && !paused && !game.result) {
      paused = true;
      hadFocus = false;
      updateHUD();
    }
  });
  addEventListener("focus", () => {
    if (!hadFocus && game) {
      toast("切回窗口，当前已暂停。按空格继续。");
      hadFocus = true;
    }
  });
  addEventListener("resize", () => r.resize());
  function openModal(html) {
    modalWasPaused = paused;
    paused = true;
    keys.clear();
    $("#modal-content").innerHTML = html;
    $("#modal").hidden = false;
    if (game) updateHUD();
  }
  function closeModal() {
    if (game?.result) return;
    $("#modal").hidden = true;
    paused = modalWasPaused;
    updateHUD();
  }
  $("#close-modal").onclick = closeModal;
  function help() {
    openModal(
      '<small>FIELD MANUAL / 01</small><h2>作战指南</h2><p>通过基地与补给站获得资金，扩建产能，组织兵种协同，摧毁所有敌方指挥中心获胜。指挥中心被摧毁即出局。</p><div class="help-grid"><div><strong>选择与指挥</strong>左键选择，拖动框选；Shift 追加。<br>右键移动 / 指定敌军集火。<br>Q 选全军，A 后左键攻击移动，S 停止。<br>Ctrl + 1–5 编组，数字键调用。</div><div><strong>镜头与节奏</strong>方向键 / W D 平移，中键拖动。<br>滚轮缩放，H 回到基地。<br>小地图左键定位，右键下达指令。<br>空格暂停，右上角调节 1–2 倍速。</div><div><strong>建设与经济</strong>右侧“建造”选建筑，左键放置。<br>建筑需在己方建筑 400 范围内。<br>靠近补给站并独占 7 秒即可占领。<br>低电力生产速度仅为 40%。</div><div><strong>兵种与支援</strong>坦克抗线，步战车清步兵。<br>火炮需要前线视野且有最小射程。<br>防空克制直升机与六代机。<br>支援需视野，侦察可揭示任意区域。</div><div><strong>尖端科技</strong>核打击延迟 6 秒，钻地弹延迟 4 秒。<br>六代机先建设陆航基地再生产。<br>默认尖端科技仅玩家可用。<br>全部均为游戏数值；本版无友军伤害。</div><div><strong>科幻阵营</strong>战锤·人类帝国为非官方同人。<br>生命 ×3、火力 ×2.6、生产 ×1.3。<br>专属轨道光矛，强度远高于现代军队。<br>开局可把它选为玩家或 AI。</div></div><p>F5 保存 / F9 读取；菜单中可导出与导入存档。桌面鼠标键盘是完整操作方式；窄屏支持基本查看和点选。</p>',
    );
  }
  $("#help-menu").onclick = help;
  $("#help").onclick = help;
  function openSettings() {
    if (!game) return;
    openModal(
      '<small>COMMAND MENU</small><h2>战区控制</h2><p>作战已暂停。你可以保存进度、调整增益或重新部署。</p><div class="modal-actions"><button id="resume-action" class="primary">继续作战 →</button><button id="save-action">保存进度</button><button id="load-action">读取存档</button><button id="export-action">导出存档</button><button id="import-action">导入存档</button><button id="return-action">返回部署</button></div><p>本地存档保存在当前浏览器；推送代码不会上传你的存档。</p>',
    );
    $("#resume-action").onclick = closeModal;
    $("#save-action").onclick = save;
    $("#load-action").onclick = load;
    $("#export-action").onclick = exportSave;
    $("#import-action").onclick = importSave;
    $("#return-action").onclick = returnMenu;
  }
  $("#settings").onclick = openSettings;
  function returnMenu() {
    game = null;
    $("#modal").hidden = true;
    $("#hud").hidden = true;
    $("#menu").hidden = false;
    paused = false;
    mode = null;
    r.camera = { x: 1550, y: 1000, zoom: 0.64 };
    r.prepare(demo);
    setupMenu();
  }
  function save() {
    if (!game) return;
    try {
      localStorage.setItem("modern-front-save-v1", JSON.stringify(game.save()));
      toast("进度已保存到本地浏览器");
      beep(720);
    } catch (e) {
      toast("保存失败，请使用导出存档：" + e.message);
    }
  }
  function load() {
    try {
      const s = localStorage.getItem("modern-front-save-v1");
      if (!s) {
        toast("还没有本地存档。");
        return;
      }
      game = WarSim.Game.load(s);
      enterGame();
      toast("存档已读取");
    } catch (e) {
      toast("读取失败：" + e.message);
    }
  }
  $("#save").onclick = save;
  $("#load-menu").onclick = load;
  function exportSave() {
    if (!game) return;
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(game.save())], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "现代战线-" + Math.floor(game.time) + "s.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("存档已导出");
  }
  function importSave() {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = ".json";
    i.onchange = async () => {
      try {
        if (i.files[0].size > 5000000) throw Error("文件不能超过 5 MB");
        game = WarSim.Game.load(await i.files[0].text());
        enterGame();
        toast("外部存档已恢复");
      } catch (e) {
        toast("导入失败：" + e.message);
      }
    };
    i.click();
  }
  function applyBuffs() {
    const next = new Set(
      $$("#modal input[data-buff]:checked").map((i) => i.dataset.buff),
    );
    if (next.has("armor") !== game.buffs.has("armor")) {
      const mul = next.has("armor") ? 1.5 : 1 / 1.5;
      for (const e of game.entities)
        if (e.team === 0) {
          e.maxHp *= mul;
          e.hp *= mul;
        }
    }
    game.buffs = next;
    game.options.buffs = [...next];
    if (next.has("wealth") && !applyBuffs.gifted) {
      game.teams[0].money += 25000;
      applyBuffs.gifted = true;
      game.wealthGranted = true;
    }
    game.options.playerOnlyTech = $("#live-player-only").checked;
    game.options.advanced = $("#live-advanced").checked;
    if (game.options.playerOnlyTech || !game.options.advanced) {
      for (const t of game.teams) {
        if (t.id === 0 && game.options.advanced) continue;
        for (const q of t.queue)
          if (U[q.kind].advanced) t.money += game.cost(t.id, q.kind);
        t.queue = t.queue.filter((q) => !U[q.kind].advanced);
        for (const q of t.buildQueue)
          if (B[q.kind].advanced) t.money += game.cost(t.id, q.kind);
        t.buildQueue = t.buildQueue.filter((q) => !B[q.kind].advanced);
      }
      game.entities = game.entities.filter(
        (e) =>
          !(U[e.kind] || B[e.kind])?.advanced ||
          (game.options.advanced && e.team === 0),
      );
      game.effects = game.effects.filter(
        (e) =>
          !ABILITIES[e.type]?.advanced || (game.options.advanced && !e.from),
      );
    }
    game.updateFog();
    closeModal();
    toast("增益与科技权限已更新");
    updateHUD();
  }
  $("#buff-settings").onclick = () => {
    openModal(
      "<small>PLAYER MODIFIERS</small><h2>战场增益与科技</h2>" +
        buffHTML(game.buffs, "live") +
        '<div class="switch-row"><label><input id="live-advanced" type="checkbox" ' +
        (game.options.advanced ? "checked" : "") +
        '>启用尖端科技</label><label><input id="live-player-only" type="checkbox" ' +
        (game.options.playerOnlyTech ? "checked" : "") +
        '>尖端科技仅玩家可用</label></div><p>关闭科技后，对应单位、排队和未落地打击会被移除。开启仅玩家可用时同步移除 AI 的对应内容。装甲增益按比例调整已有单位；充裕资金每局最多额外发放一次。</p><button id="apply-buffs" class="primary">应用设置 →</button>',
    );
    $("#apply-buffs").onclick = applyBuffs;
  };
  function result() {
    if (outcomeShown) return;
    outcomeShown = true;
    const victory = game.result === "victory",
      t = game.teams[0];
    openModal(
      "<small>OPERATION " +
        (victory ? "COMPLETE" : "ENDED") +
        "</small><h2>" +
        (victory ? "战区控制完成" : "指挥中心失守") +
        "</h2><p>" +
        (victory
          ? "敌方指挥体系已瓦解。你的部队取得了本次遭遇战的胜利。"
          : "你的指挥中心已被摧毁。调整兵种与防线后重新部署。") +
        '</p><div class="help-grid"><div><strong>作战时长</strong><span class="result-number">' +
        formatTime(game.time) +
        '</span></div><div><strong>摧毁 / 损失</strong><span class="result-number">' +
        t.kills +
        " / " +
        t.lost +
        '</span></div></div><div class="modal-actions"><button id="again" class="primary">再次部署 ↗</button><button id="result-menu">返回部署界面</button></div>',
    );
    $("#again").onclick = () => {
      applyBuffs.gifted = false;
      startGame(game.options);
    };
    $("#result-menu").onclick = returnMenu;
    beep(victory ? 650 : 150, 0.5, "triangle");
  }
  // One simulation clock at 20 Hz; rendering follows the browser refresh rate.
  function frame(now) {
    const raw = Math.min(0.25, (now - last) / 1000);
    last = now;
    frames++;
    frameTimer += raw;
    if (frameTimer > 1) {
      fps = Math.round(frames / frameTimer);
      frames = 0;
      frameTimer = 0;
      $("#fps").textContent = fps + " FPS";
    }
    if (game) {
      if (!paused && !game.result) {
        acc += raw * speed;
        let steps = 0;
        while (acc >= 0.05 && steps < 8) {
          game.step(0.05);
          acc -= 0.05;
          steps++;
        }
        if (steps === 8) acc = 0;
        const v = (raw * 650) / r.camera.zoom;
        if (keys.has("arrowleft")) r.pan(-v, 0);
        if (keys.has("arrowright") || keys.has("d")) r.pan(v, 0);
        if (keys.has("arrowup") || keys.has("w")) r.pan(0, -v);
        if (keys.has("arrowdown")) r.pan(0, v);
      }
      r.draw(
        game,
        { selection, hover: r.hover, pointer, mode, drag },
        now / 1000,
      );
      uiTimer += raw;
      if (uiTimer > 0.2) {
        updateHUD();
        uiTimer = 0;
      }
      if (game.result) result();
    } else {
      r.camera.x = 1550 + Math.sin(now / 60000) * 180;
      r.draw(demo, { demo: true }, now / 1000);
    }
    try {
      lighting.draw(now / 1000);
    } catch (e) {
      lighting.available = false;
      lighting.output.hidden = true;
      console.warn("浏览器限制 GPU 读取，已自动切换标准画面：" + e.message);
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener("error", (e) => {
    console.error(e.error);
    if (game) {
      paused = true;
      toast("运行异常，已暂停。请保存并查看控制台：" + e.message);
    }
  });
  function opponentSelectors() {
    const count = Number($("#enemies").value),
      old = $$("#opponents select").map((e) => e.value);
    $("#opponents").innerHTML = Array.from(
      { length: count },
      (_, i) =>
        "<label>AI " +
        (i + 1) +
        ' 阵营<select><option value="">自动（现代阵营）</option>' +
        Object.entries(F)
          .map(
            ([k, f]) =>
              '<option value="' +
              k +
              '" ' +
              (old[i] === k ? "selected" : "") +
              ">" +
              f.name +
              (f.fiction ? " · 超规格" : "") +
              "</option>",
          )
          .join("") +
        "</select></label>",
    ).join("");
  }
  function encyclopedia() {
    const ff = game?.teams[0].faction || faction;
    openModal(
      "<small>PUBLIC DATA / " +
        D.EQUIPMENT.checked +
        '</small><h2>装备资料与推演边界</h2><p>公开参数带来源；未知数据保留未知。所有生命、伤害、雷达距离和打击范围均为游戏数值。已知机动参数用于相对移动映射（3 倍时间压缩）；无可靠数值时使用同类游戏基线。这里不是现实作战性能预测。</p><select id="dossier-faction">' +
        Object.entries(F)
          .map(
            ([k, f]) =>
              '<option value="' +
              k +
              '" ' +
              (k === ff ? "selected" : "") +
              ">" +
              f.name +
              "</option>",
          )
          .join("") +
        '</select><div id="dossier-table"></div>',
    );
    const fill = () => {
      const f = $("#dossier-faction").value;
      $("#dossier-table").innerHTML =
        '<div class="dossier-label">' +
        F[f].trait +
        '</div><table class="encyclopedia"><thead><tr><th>装备与状态</th><th>公开事实 / 未知项</th><th>游戏映射</th></tr></thead><tbody>' +
        Object.entries(U)
          .map(([k, d]) => {
            const s = D.EQUIPMENT.dossier(f, k);
            return (
              "<tr><td>" +
              escapeHTML(unitName(k, f)) +
              "<small>" +
              escapeHTML(s.status) +
              "</small></td><td>" +
              Object.entries(s.specs)
                .map(([a, b]) => escapeHTML(a) + "：" + escapeHTML(b))
                .join("<br>") +
              "<small>" +
              s.refs
                .map(
                  (id) =>
                    '<a href="' +
                    D.EQUIPMENT.sources[id][1] +
                    '" target="_blank" rel="noopener">' +
                    escapeHTML(D.EQUIPMENT.sources[id][0]) +
                    "</a>",
                )
                .join("<br>") +
              "</small></td><td>生命 " +
              Math.round(d.hp * (F[f].fiction ? 3 : F[f].armor)) +
              "<br>伤害 " +
              Math.round(d.damage * (F[f].damage || 1)) +
              "<br>速度 " +
              d.speed +
              "<small>均为虚构游戏单位</small></td></tr>"
            );
          })
          .join("") +
        "</tbody></table><p>六代机对常规战斗机：基础生命 1000 / 420 ≈ 2.38 倍；单发伤害 155 / 62 = 2.5 倍；视野 520 / 390 ≈ 1.33 倍。这些是玩法强化，不能作为现实性能引用。科幻轨道平台对地武装和区域护盾均为架空。</p>";
    };
    $("#dossier-faction").onchange = fill;
    fill();
  }
  const dossierButton = document.createElement("button");
  dossierButton.textContent = "装备资料";
  dossierButton.className = "secondary";
  dossierButton.onclick = encyclopedia;
  $(".launch-actions").prepend(dossierButton);
  const modelButton = document.createElement("button");
  modelButton.textContent = "3D 装备检视";
  modelButton.className = "secondary";
  modelButton.onclick = () => window.open("gallery.html", "_blank", "noopener");
  $(".launch-actions").prepend(modelButton);
  const modelGame = document.createElement("button");
  modelGame.textContent = "3D";
  modelGame.title = "打开独立装备检视";
  modelGame.onclick = () => window.open("gallery.html", "_blank", "noopener");
  $(".bottom-status>div:last-child").append(modelGame);
  const graphicButton = document.createElement("button");
  graphicButton.id = "graphics";
  graphicButton.textContent = "光影";
  graphicButton.onclick = () => {
    openModal(
      "<small>GRAPHICS / LOCAL HARDWARE</small><h2>画质与光影</h2><p>本机 RTX 3060。GPU 后处理状态：" +
        (lighting.available ? "WebGL2 可用" : "不可用，自动回退标准渲染") +
        '。本版采用 CAD 预渲染材质、方向阴影、泛光、爆炸动态光和色调映射；没有集成 NVIDIA DLSS 或光线追踪。</p><label class="buff-item">启用 GPU 电影光影<input id="fx-toggle" type="checkbox" ' +
        (lighting.enabled ? "checked" : "") +
        '></label><label class="buff-item">夜间色调<input id="night-toggle" type="checkbox" ' +
        (lighting.night ? "checked" : "") +
        '></label><p>NVIDIA 官方将 DLSS 5 神经渲染列为 RTX 50 系列功能，浏览器也不能直接调用其原生 SDK。详见 docs/GRAPHICS.md。</p><button id="apply-fx" class="primary">应用画质 →</button>',
    );
    $("#apply-fx").onclick = () => {
      lighting.enabled = $("#fx-toggle").checked;
      lighting.night = $("#night-toggle").checked;
      closeModal();
    };
  };
  $(".topbar").insertBefore(graphicButton, $("#settings"));
  const dossierGame = document.createElement("button");
  dossierGame.textContent = "资料";
  dossierGame.onclick = encyclopedia;
  $(".bottom-status>div:last-child").append(dossierGame);
  const tech = document.createElement("div");
  tech.innerHTML =
    '<div class="switch-row tech-row"><label><input id="advanced" type="checkbox" checked>尖端科技</label><label><input id="player-only" type="checkbox" checked>仅玩家可用</label></div><p class="small-note">核打击 / 钻地弹 / 六代机 · 研发或架空科技<br>关闭“仅玩家可用”后允许 AI 解锁。</p><div id="opponents" class="opponents"></div>';
  $(".battle-section").append(tech);
  $("#enemies").onchange = opponentSelectors;
  opponentSelectors();
  setupMenu();
  requestAnimationFrame(frame);
  // Read-only test bridge; automation can exercise the same public game methods as UI.
  window.ModernFront = {
    get game() {
      return game;
    },
    get renderer() {
      return r;
    },
    get paused() {
      return paused;
    },
    get selection() {
      return [...selection];
    },
    start: startGame,
    selectAll,
    save,
    load,
    returnMenu,
    unitName,
    get fps() {
      return fps;
    },
    get lighting() {
      return lighting;
    },
    get mode() {
      return mode;
    },
  };
})();
