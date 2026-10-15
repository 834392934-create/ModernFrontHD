(function (root) {
  "use strict";
  const D = root.WarData,
    { F, U, B, W, H, T, COLS, ROWS, ABILITIES } = D,
    clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function unitsInSight(target, units) {
    return units.some(
      (u) => dist(target, u) < (u.structure ? 330 : U[u.kind].sight),
    );
  }
  function rng(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeMap(id = "river") {
    const def = D.MAPS.find((m) => m.id === id) || D.MAPS[0],
      r = rng(def.seed),
      blocked = new Uint8Array(COLS * ROWS),
      tiles = new Uint8Array(COLS * ROWS);
    const spawns = [
      { x: 720, y: 360 },
      { x: 2352, y: 1752 },
      { x: 2352, y: 360 },
      { x: 720, y: 1752 },
      { x: 2736, y: 1056 },
    ];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x,
          wx = x * T + 24,
          wy = y * T + 24;
        tiles[i] = r() < 0.14 ? 1 : 0;
        if (id === "river" && x >= 30 && x <= 33) {
          tiles[i] = 3;
          blocked[i] = 1;
          if ([8, 21, 34].some((a) => Math.abs(y - a) <= 1)) {
            tiles[i] = 4;
            blocked[i] = 0;
          }
        }
        if (
          id === "desert" &&
          ((x > 23 && x < 27 && y > 6 && y < 17) ||
            (x > 36 && x < 40 && y > 26 && y < 37))
        ) {
          tiles[i] = 2;
          blocked[i] = 1;
        }
        if (
          id === "industry" &&
          ((x > 23 && x < 28 && y > 7 && y < 16) ||
            (x > 35 && x < 40 && y > 27 && y < 36) ||
            (x > 21 && x < 25 && y > 28 && y < 33) ||
            (x > 39 && x < 43 && y > 10 && y < 15))
        ) {
          tiles[i] = 5;
          blocked[i] = 1;
        }
        if (
          spawns.some((p) => Math.hypot(p.x - wx, p.y - wy) < 270) ||
          Math.hypot(wx - W / 2, wy - H / 2) < 170
        ) {
          blocked[i] = 0;
          if (tiles[i] > 1) tiles[i] = id === "river" ? 4 : 0;
        }
      }
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (x < 3 || x >= 61 || y < 4 || y >= 40) {
          tiles[y * COLS + x] = 6;
          blocked[y * COLS + x] = 1;
        }
    const navalBlocked = Uint8Array.from(tiles, (t) =>
      t === 3 || t === 6 ? 0 : 1,
    );
    return {
      id: def.id,
      seed: def.seed,
      blocked,
      navalBlocked,
      tiles,
      spawns,
      nodes: [
        { x: 1176, y: 528 },
        { x: 1896, y: 1584 },
        { x: 1176, y: 1584 },
        { x: 1896, y: 528 },
        { x: 1536, y: 1056 },
        { x: 2592, y: 1056 },
      ],
    };
  }
  class Heap {
    constructor() {
      this.a = [];
    }
    push(n) {
      let a = this.a,
        i = a.length;
      a.push(n);
      while (i) {
        let p = (i - 1) >> 1;
        if (a[p].f <= n.f) break;
        a[i] = a[p];
        i = p;
      }
      a[i] = n;
    }
    pop() {
      const a = this.a,
        n = a[0],
        v = a.pop();
      if (a.length) {
        let i = 0;
        while (i * 2 + 1 < a.length) {
          let c = i * 2 + 1;
          if (c + 1 < a.length && a[c + 1].f < a[c].f) c++;
          if (a[c].f >= v.f) break;
          a[i] = a[c];
          i = c;
        }
        a[i] = v;
      }
      return n;
    }
    get length() {
      return this.a.length;
    }
  }
  function findPath(map, sx, sy, tx, ty) {
    const ix = (v) => clamp(Math.floor(v / T), 0, COLS - 1),
      iy = (v) => clamp(Math.floor(v / T), 0, ROWS - 1);
    let ax = ix(sx),
      ay = iy(sy),
      bx = ix(tx),
      by = iy(ty);
    const free = (x, y) =>
      x >= 0 && y >= 0 && x < COLS && y < ROWS && !map.blocked[y * COLS + x];
    if (!free(bx, by)) {
      let best = null;
      for (let rad = 1; rad < 9 && !best; rad++)
        for (let y = by - rad; y <= by + rad; y++)
          for (let x = bx - rad; x <= bx + rad; x++)
            if (free(x, y) && (!best || Math.hypot(x - bx, y - by) < best.d))
              best = { x, y, d: Math.hypot(x - bx, y - by) };
      if (!best) return [];
      bx = best.x;
      by = best.y;
    }
    const start = ay * COLS + ax,
      end = by * COLS + bx;
    if (start === end) return [{ x: bx * T + 24, y: by * T + 24 }];
    const g = new Float32Array(COLS * ROWS).fill(Infinity),
      parent = new Int32Array(COLS * ROWS).fill(-1),
      closed = new Uint8Array(COLS * ROWS),
      open = new Heap();
    g[start] = 0;
    open.push({ i: start, f: 0 });
    let found = false;
    while (open.length) {
      const { i } = open.pop();
      if (closed[i]) continue;
      if (i === end) {
        found = true;
        break;
      }
      closed[i] = 1;
      const x = i % COLS,
        y = Math.floor(i / COLS);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx,
            ny = y + dy;
          if (
            !free(nx, ny) ||
            (dx && dy && (!free(x + dx, y) || !free(x, y + dy)))
          )
            continue;
          const ni = ny * COLS + nx,
            ng = g[i] + (dx && dy ? 1.4142 : 1);
          if (ng < g[ni]) {
            g[ni] = ng;
            parent[ni] = i;
            open.push({ i: ni, f: ng + Math.hypot(nx - bx, ny - by) });
          }
        }
    }
    if (!found) return [];
    const path = [];
    for (let i = end; i !== start; i = parent[i]) {
      path.push({ x: (i % COLS) * T + 24, y: Math.floor(i / COLS) * T + 24 });
      if (i < 0) return [];
    }
    return path.reverse();
  }
  class Spatial {
    constructor() {
      this.buckets = new Map();
      this.size = 160;
    }
    rebuild(es) {
      this.buckets.clear();
      for (const e of es) {
        if (e.hp <= 0) continue;
        let k = Math.floor(e.x / this.size) + "," + Math.floor(e.y / this.size);
        if (!this.buckets.has(k)) this.buckets.set(k, []);
        this.buckets.get(k).push(e);
      }
    }
    query(x, y, r) {
      const a = [];
      for (
        let cy = Math.floor((y - r) / this.size);
        cy <= Math.floor((y + r) / this.size);
        cy++
      )
        for (
          let cx = Math.floor((x - r) / this.size);
          cx <= Math.floor((x + r) / this.size);
          cx++
        ) {
          const b = this.buckets.get(cx + "," + cy);
          if (b)
            for (const e of b)
              if (Math.hypot(e.x - x, e.y - y) <= r + e.r) a.push(e);
        }
      return a;
    }
  }
  class Game {
    constructor(options = {}) {
      this.options = {
        faction: "chn",
        enemies: 2,
        map: "river",
        difficulty: "normal",
        allied: false,
        buffs: [],
        advanced: true,
        playerOnlyTech: true,
        ...options,
      };
      this.options.enemies = clamp(Number(this.options.enemies) || 1, 1, 4);
      if (!F[this.options.faction]) this.options.faction = "chn";
      this.map = makeMap(this.options.map);
      this.entities = [];
      this.nodes = this.map.nodes.map((n, i) => ({
        ...n,
        id: i,
        owner: -1,
        progress: 0,
        claim: -1,
      }));
      this.teams = [];
      this.effects = [];
      this.events = [];
      this.time = 0;
      this.tick = 0;
      this.nextId = 1;
      this.result = null;
      this.cooldowns = {};
      this.reveals = [];
      this.buffs = new Set(this.options.buffs);
      this.spatial = new Spatial();
      this.visible = new Uint8Array(COLS * ROWS);
      this.explored = new Uint8Array(COLS * ROWS);
      this._random = rng(this.map.seed + 17);
      this.pathBudget = 0;
      const keys = Object.keys(F),
        others = keys.filter(
          (k) => k !== this.options.faction && !F[k].fiction,
        ),
        selected = this.options.opponents || [];
      for (let i = 0; i <= this.options.enemies; i++) {
        const faction =
          i === 0
            ? this.options.faction
            : F[selected[i - 1]]
              ? selected[i - 1]
              : others[(i - 1) % others.length];
        const t = {
          id: i,
          faction,
          money: i === 0 && this.buffs.has("wealth") ? 25000 : 6500,
          spent: 0,
          kills: 0,
          lost: 0,
          queue: [],
          buildQueue: [],
          power: 0,
          income: 0,
          alive: true,
          aiClock: 0,
          attackAt: 28 + i * 4,
        };
        this.teams.push(t);
        const p = this.map.spawns[i];
        const dir = p.y > H / 2 ? -1 : 1;
        this.spawn(i, "hq", p.x, p.y);
        this.spawn(i, "power", p.x - 130, p.y - 90 * dir);
        this.spawn(i, "refinery", p.x + 130, p.y - 90 * dir);
        this.spawn(i, "barracks", p.x - 120, p.y + 110 * dir);
        this.spawn(i, "factory", p.x + 130, p.y + 120 * dir);
        for (let j = 0; j < 3; j++)
          this.spawn(
            i,
            j === 0 ? "tank" : "ifv",
            p.x - 60 + j * 60,
            p.y + 235 * dir,
          );
        for (let j = 0; j < 3; j++)
          this.spawn(i, "infantry", p.x - 90 + j * 28, p.y + 200 * dir);
        const sea =
          i === 4
            ? { x: 3000, y: p.y }
            : { x: p.x, y: p.y > H / 2 ? 1992 : 120 };
        this.spawn(i, "navalyard", sea.x, sea.y);
        this.spawn(
          i,
          "destroyer",
          i === 4 ? sea.x : sea.x + 100,
          i === 4 ? sea.y + 100 : sea.y,
        );
        this.spawn(i, "fighter", p.x - 180, p.y + 40 * dir);
        this.spawn(i, "satellite", p.x + 40, p.y - 140 * dir);
      }
      this.spatial.rebuild(this.entities);
      this.updateFog();
      this.message("行动开始。占领补给站，摧毁敌方指挥中心。");
    }
    random() {
      return this._random();
    }
    message(text) {
      this.events.unshift({ text, time: this.time });
      this.events.length = Math.min(7, this.events.length);
    }
    isEnemy(a, b) {
      if (a === b || a < 0 || b < 0) return false;
      return !(this.options.allied && a > 0 && b > 0);
    }
    teamEntities(id) {
      return this.entities.filter((e) => e.team === id && e.hp > 0);
    }
    spawn(team, kind, x, y) {
      const def = U[kind] || B[kind],
        f = F[this.teams[team].faction],
        structure = !!B[kind],
        mult =
          (team === 0 && this.buffs.has("armor") ? 1.5 : 1) *
          (f.fiction
            ? f.armor
            : !structure && kind !== "infantry"
              ? f.armor
              : 1);
      const e = {
        id: this.nextId++,
        team,
        kind,
        structure,
        x: clamp(x, 25, W - 25),
        y: clamp(y, 25, H - 25),
        hp: def.hp * mult,
        maxHp: def.hp * mult,
        r: def.r,
        angle: team === 0 ? 0.6 : 3.5,
        turret: 0,
        cool: 0,
        target: null,
        path: [],
        order: null,
        disabled: 0,
        lastHit: -100,
        anim: this.random() * 10,
      };
      this.entities.push(e);
      return e;
    }
    get(id) {
      return this.entities.find((e) => e.id === id && e.hp > 0);
    }
    power(team) {
      return this.entities.reduce(
        (v, e) =>
          v +
          (e.hp > 0 && e.team === team && e.structure
            ? B[e.kind].power || 0
            : 0),
        0,
      );
    }
    cost(team, kind) {
      return Math.round(
        (U[kind] || B[kind]).cost *
          (U[kind] ? F[this.teams[team].faction].cost : 1),
      );
    }
    effectiveSpeed(e) {
      const d = U[e.kind],
        f = this.teams[e.team].faction,
        s = D.EQUIPMENT?.dossier(f, e.kind);
      let speed = d.speed;
      if (s?.mobilityKmh) speed = (s.mobilityKmh / 3.6) * 3;
      if (e.kind === "fighter" && f === "ind") speed *= 1.8 / 1.6;
      return speed * F[f].speed;
    }
    train(team, kind) {
      const t = this.teams[team],
        d = U[kind];
      if (
        !d ||
        !t?.alive ||
        (d.advanced &&
          (!this.options.advanced ||
            (team > 0 && this.options.playerOnlyTech))) ||
        t.queue.length >= 12 ||
        this.teamEntities(team).filter((e) => !e.structure).length +
          t.queue.length >=
          100
      )
        return false;
      if (
        !this.entities.some(
          (e) => e.hp > 0 && e.team === team && e.kind === d.producer,
        ) ||
        t.money < this.cost(team, kind)
      )
        return false;
      const c = this.cost(team, kind);
      t.money -= c;
      t.spent += c;
      t.queue.push({ kind, remaining: d.time, total: d.time });
      return true;
    }
    cancel(team, index) {
      const t = this.teams[team];
      if (!t.queue[index]) return;
      const [q] = t.queue.splice(index, 1);
      t.money += Math.round(this.cost(team, q.kind) * 0.75);
    }
    canBuild(team, kind, x, y) {
      const d = B[kind];
      if (
        !d ||
        (d.advanced &&
          (!this.options.advanced ||
            (team > 0 && this.options.playerOnlyTech))) ||
        kind === "hq" ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < d.r + 16 ||
        y < d.r + 16 ||
        x > W - d.r - 16 ||
        y > H - d.r - 16
      )
        return false;
      if (
        !this.entities.some(
          (e) =>
            e.team === team &&
            e.hp > 0 &&
            e.structure &&
            dist(e, { x, y }) < 400,
        )
      )
        return false;
      for (
        let cy = Math.floor((y - d.r) / T);
        cy <= Math.floor((y + d.r) / T);
        cy++
      )
        for (
          let cx = Math.floor((x - d.r) / T);
          cx <= Math.floor((x + d.r) / T);
          cx++
        )
          if (
            d.water
              ? this.map.navalBlocked[cy * COLS + cx]
              : this.map.blocked[cy * COLS + cx]
          )
            return false;
      return (
        !this.entities.some(
          (e) => e.hp > 0 && e.structure && dist(e, { x, y }) < e.r + d.r + 20,
        ) &&
        !this.teams.some((t) =>
          t.buildQueue.some(
            (q) => Math.hypot(q.x - x, q.y - y) < B[q.kind].r + d.r + 20,
          ),
        )
      );
    }
    build(team, kind, x, y) {
      const t = this.teams[team];
      if (
        !t?.alive ||
        t.buildQueue.length >= 4 ||
        !this.canBuild(team, kind, x, y) ||
        t.money < this.cost(team, kind)
      )
        return false;
      const c = this.cost(team, kind);
      t.money -= c;
      t.spent += c;
      t.buildQueue.push({
        kind,
        x,
        y,
        total: B[kind].time,
        remaining: B[kind].time,
      });
      return true;
    }
    command(ids, x, y, attack = false, target = null) {
      const units = ids
        .map((id) => this.get(id))
        .filter((e) => e && !e.structure);
      let n = 0;
      for (const e of units) {
        let tx = clamp(x + ((n % 5) - 2) * 28, 24, W - 24),
          ty = clamp(y + Math.floor(n / 5) * 28, 24, H - 24);
        e.order = { x: tx, y: ty, attack, target };
        e.target = target;
        e.path = [];
        e.repath = 0;
        n++;
      }
      this.effects.push({ type: "command", x, y, ttl: 0.7, max: 0.7, attack });
    }
    visibleAt(x, y) {
      return (
        this.buffs.has("vision") ||
        !!this.visible[
          clamp(Math.floor(y / T), 0, ROWS - 1) * COLS +
            clamp(Math.floor(x / T), 0, COLS - 1)
        ]
      );
    }
    ability(kind, x, y, team = 0) {
      const d = ABILITIES[kind],
        t = this.teams[team],
        key = team === 0 ? kind : team + ":" + kind;
      if (
        this.result ||
        !d ||
        !t?.alive ||
        this.options.abilities === false ||
        (d.advanced &&
          (!this.options.advanced ||
            (team > 0 && this.options.playerOnlyTech))) ||
        (d.imperial && t.faction !== "imp") ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 ||
        y < 0 ||
        x > W ||
        y > H ||
        (this.cooldowns[key] || 0) > this.time ||
        t.money < d.cost
      )
        return false;
      if (kind !== "recon" && team === 0 && !this.visibleAt(x, y)) return false;
      t.money -= d.cost;
      this.cooldowns[key] =
        this.time +
        d.cd * (team === 0 && this.buffs.has("cooldown") ? 0.25 : 1);
      if (kind === "recon")
        this.reveals.push({ x, y, r: d.radius, until: this.time + 22 });
      if (kind === "repair")
        for (const e of this.entities)
          if (e.team === 0 && dist(e, { x, y }) < d.radius)
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.45);
      if (kind === "emp")
        for (const e of this.entities)
          if (this.isEnemy(0, e.team) && dist(e, { x, y }) < d.radius)
            e.disabled = this.time + 9;
      const delay =
        kind === "nuke"
          ? 6
          : ["bunker", "orbital"].includes(kind)
            ? 4
            : kind === "strike"
              ? 3
              : 1.5;
      this.effects.push({
        type: kind,
        x,
        y,
        r: d.radius,
        ttl: delay,
        max: delay,
        from: team,
      });
      this.message((team > 0 ? "敌方预警：" : "") + d.name + "已下达");
      this.updateFog();
      return true;
    }
    updateFog() {
      this.visible.fill(0);
      const circles = [];
      for (const e of this.entities)
        if (e.team === 0 && e.hp > 0)
          circles.push({
            x: e.x,
            y: e.y,
            r:
              (e.structure
                ? B[e.kind].sight && this.power(e.team) >= 0
                  ? B[e.kind].sight
                  : 330
                : U[e.kind].sight) * F[this.teams[0].faction].vision,
          });
      for (const v of this.reveals) if (v.until > this.time) circles.push(v);
      for (const v of circles) {
        let r = v.r / T,
          cx = v.x / T,
          cy = v.y / T;
        for (
          let y = Math.max(0, Math.floor(cy - r));
          y < Math.min(ROWS, cy + r + 1);
          y++
        )
          for (
            let x = Math.max(0, Math.floor(cx - r));
            x < Math.min(COLS, cx + r + 1);
            x++
          )
            if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < r)
              this.visible[y * COLS + x] = 1;
      }
      if (this.buffs.has("vision")) this.visible.fill(1);
      for (let i = 0; i < this.visible.length; i++)
        if (this.visible[i]) this.explored[i] = 1;
    }
    damage(e, value, from) {
      if (e.hp <= 0) return;
      let mul =
        (from === 0 && this.buffs.has("damage") ? 1.4 : 1) *
        (F[this.teams[from]?.faction]?.damage || 1);
      let shield = 0;
      for (const v of this.spatial.query(e.x, e.y, 280))
        if (
          v.team === e.team &&
          B[v.kind]?.shield &&
          v.disabled <= this.time &&
          this.power(e.team) >= 0 &&
          dist(v, e) < B[v.kind].range
        )
          shield = Math.max(shield, B[v.kind].shield);
      e.hp -= value * mul * (1 - shield);
      e.lastHit = this.time;
      if (e.hp <= 0) {
        const t = this.teams[e.team];
        t.lost++;
        if (this.teams[from]) this.teams[from].kills++;
        this.effects.push({
          type: "explosion",
          x: e.x,
          y: e.y,
          r: e.structure ? 70 : 35,
          ttl: 0.85,
          max: 0.85,
        });
        if (e.team === 0 && e.structure)
          this.message(B[e.kind].name + "被摧毁");
      }
    }
    ai(t, dt) {
      if (!t.alive) return;
      t.aiClock -= dt;
      if (t.aiClock > 0) return;
      const hard = this.options.difficulty === "hard",
        easy = this.options.difficulty === "easy";
      t.aiClock = easy ? 3.2 : hard ? 1.2 : 2;
      let es = this.teamEntities(t.id),
        hq = es.find((e) => e.kind === "hq");
      if (!hq) return;
      const buildKind =
        this.power(t.id) < 20
          ? "power"
          : !es.some((e) => e.kind === "airfield") && this.time > 35
            ? "airfield"
            : !es.some((e) => e.kind === "spaceport") && this.time > 65
              ? "spaceport"
              : es.filter((e) => e.kind === "refinery").length < 3
                ? "refinery"
                : es.filter((e) => e.kind === "turret").length < 2
                  ? "turret"
                  : !es.some((e) => e.kind === "sam")
                    ? "sam"
                    : !es.some((e) => e.kind === "repairhub")
                      ? "repairhub"
                      : !es.some((e) => e.kind === "radar")
                        ? "radar"
                        : null;
      if (buildKind && !t.buildQueue.length) {
        for (let a = 0; a < 20; a++) {
          const ang = this.random() * Math.PI * 2,
            rad = 190 + this.random() * 230,
            x = hq.x + Math.cos(ang) * rad,
            y = hq.y + Math.sin(ang) * rad;
          if (this.build(t.id, buildKind, x, y)) break;
        }
      }
      const choices = [
        "infantry",
        "tank",
        "ifv",
        "tank",
        "arty",
        "aa",
        "rocket",
        "heli",
        "fighter",
        "destroyer",
        "carrier",
        "submarine",
        "satellite",
      ];
      if (!this.options.playerOnlyTech && this.options.advanced)
        choices.push("jet", "orbital", "asat");
      if (t.queue.length < 3) {
        let kind = choices[Math.floor(this.random() * choices.length)];
        this.train(t.id, kind);
      }
      if (this.time > 100 && this.options.abilities !== false) {
        const observed = this.entities.filter(
          (e) =>
            this.isEnemy(t.id, e.team) &&
            e.kind === "hq" &&
            unitsInSight(e, es),
        );
        const target = observed[0];
        if (target) {
          if (t.faction === "imp")
            this.ability("orbital", target.x, target.y, t.id);
          if (!this.options.playerOnlyTech && this.options.advanced)
            this.ability(
              t.money > 9000 ? "nuke" : "bunker",
              target.x,
              target.y,
              t.id,
            );
        }
      }
      const units = es.filter((e) => !e.structure);
      const capturers = units.filter(
        (e) => (e.kind === "infantry" || e.kind === "ifv") && !e.order,
      );
      for (const e of capturers) {
        let node = this.nodes
          .filter((n) => n.owner !== t.id)
          .sort((a, b) => dist(e, a) - dist(e, b))[0];
        if (node) this.command([e.id], node.x, node.y, true);
      }
      if (
        this.time > t.attackAt &&
        units.length >= (easy ? 10 : hard ? 5 : 7)
      ) {
        t.attackAt = this.time + (easy ? 45 : hard ? 16 : 27);
        const hqs = this.entities.filter(
          (e) => e.kind === "hq" && e.hp > 0 && this.isEnemy(t.id, e.team),
        );
        hqs.sort((a, b) => dist(hq, a) - dist(hq, b));
        let dest = hqs[0];
        if (dest) {
          let attack = units.filter(
            (e) => e.kind !== "infantry" || this.random() > 0.4,
          );
          this.command(
            attack.map((e) => e.id),
            dest.x,
            dest.y,
            true,
            dest.id,
          );
        }
      }
    }
    step(dt) {
      if (this.result) return;
      dt = clamp(dt, 0, 0.1);
      this.time += dt;
      this.tick++;
      this.pathBudget = 10;
      this.spatial.rebuild(this.entities);
      this.teamSight = this.teams.map((t) =>
        this.entities.filter((e) => e.team === t.id && e.hp > 0),
      );
      for (const t of this.teams) {
        if (!t.alive) continue;
        t.power = this.power(t.id);
        const es = this.teamEntities(t.id);
        t.income =
          12 +
          es.filter((e) => e.kind === "refinery").length * 15 +
          this.nodes.filter((n) => n.owner === t.id).length * 22;
        const inc = t.id === 0 && this.buffs.has("income") ? 2 : 1;
        const difficulty =
          t.id > 0
            ? this.options.difficulty === "hard"
              ? 1.3
              : this.options.difficulty === "easy"
                ? 0.8
                : 1
            : 1;
        t.money += t.income * dt * inc * difficulty;
        let rate =
          (t.power < 0 ? 0.4 : 1) *
          F[t.faction].rate *
          (t.id === 0 && this.buffs.has("rapid") ? 3 : 1);
        const q = t.queue[0];
        if (q) {
          const prod = es.find(
            (e) => e.kind === U[q.kind].producer && e.disabled <= this.time,
          );
          if (prod) {
            q.remaining -= dt * rate;
            if (q.remaining <= 0) {
              let pos = this.freeSpawn(prod);
              if (pos) {
                this.spawn(t.id, q.kind, pos.x, pos.y);
                t.queue.shift();
              }
            }
          } else if (!es.some((e) => e.kind === U[q.kind].producer)) {
            this.cancel(t.id, 0);
          }
        }
        const b = t.buildQueue[0];
        if (b) {
          b.remaining -= dt * rate;
          if (b.remaining <= 0) {
            this.spawn(t.id, b.kind, b.x, b.y);
            t.buildQueue.shift();
          }
        }
        if (t.id > 0) this.ai(t, dt);
      }
      for (const e of this.entities) {
        if (e.hp <= 0 || e.disabled > this.time) continue;
        const d = U[e.kind] || B[e.kind];
        e.cool -= dt;
        if (
          e.team === 0 &&
          this.buffs.has("regen") &&
          this.time - e.lastHit > 7
        )
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.015 * dt);
        if (e.structure && e.kind !== "turret" && this.power(e.team) < 0)
          continue;
        if (d.heal) {
          for (const a of this.spatial.query(e.x, e.y, d.range))
            if (a.team === e.team && !a.structure)
              a.hp = Math.min(a.maxHp, a.hp + d.heal * dt);
        }
        if (d.jam) {
          for (const a of this.spatial.query(e.x, e.y, d.range))
            if (this.isEnemy(e.team, a.team) && !a.structure)
              a.disabled = this.time + 0.15;
        }
        if (!d.damage && !e.order) continue;
        let target = this.get(e.target);
        let range = d.range;
        const canHit = (t) =>
          this.isEnemy(e.team, t.team) &&
          (U[t.kind]?.space
            ? d.antiSpace
            : !U[t.kind]?.air ||
              d.antiAir ||
              e.kind === "heli" ||
              e.kind === "turret") &&
          !(d.onlyAir && !U[t.kind]?.air) &&
          !(e.kind === "asat" && !U[t.kind]?.space) &&
          (e.team === 0
            ? this.visibleAt(t.x, t.y)
            : unitsInSight(t, this.teamSight[e.team]));
        if (!target || !canHit(target) || dist(e, target) > range * 1.35)
          target = null;
        // Player explicit movement suppresses auto-fire until arrival; attack move engages.
        if (
          !target &&
          (!e.order || e.order.attack || e.structure) &&
          this.tick % 5 === e.id % 5
        ) {
          let best = Infinity;
          for (const o of this.spatial.query(e.x, e.y, range)) {
            const delta = dist(e, o);
            if (
              canHit(o) &&
              delta < range &&
              delta >= (d.minRange || 0) &&
              delta < best
            ) {
              best = delta;
              target = o;
            }
          }
        }
        e.target = target?.id || null;
        if (target) {
          e.turret = Math.atan2(target.y - e.y, target.x - e.x);
          if (
            dist(e, target) <= range &&
            dist(e, target) >= (d.minRange || 0) &&
            e.cool <= 0
          ) {
            e.cool = d.reload;
            let val = d.damage;
            if (e.kind === "submarine" && !U[target.kind]?.naval) val *= 0.2;
            if (e.kind === "ifv" && target.kind === "infantry") val *= 1.7;
            if (e.kind === "tank" && target.kind === "ifv") val *= 1.3;
            if (e.kind === "aa") val *= U[target.kind]?.air ? 2 : 0.45;
            const travel = Math.max(
              0.08,
              dist(e, target) / (e.kind === "rocket" ? 400 : 700),
            );
            this.effects.push({
              type: "shot",
              x: e.x,
              y: e.y,
              tx: target.x,
              ty: target.y,
              target: target.id,
              from: e.team,
              damage: val,
              splash: d.splash || 0,
              ttl: travel,
              max: travel,
              rocket: e.kind === "rocket" || e.kind === "heli",
            });
          }
        }
        if (e.structure) continue;
        const fight =
          target && dist(e, target) <= range && (!e.order || e.order.attack);
        if (fight) continue;
        if (e.order) {
          let goal = e.order;
          const orderedTarget = goal.target ? this.get(goal.target) : null;
          if (orderedTarget) {
            goal.x = orderedTarget.x;
            goal.y = orderedTarget.y;
          }
          if (dist(e, goal) < 28) {
            e.order = null;
            e.path = [];
            continue;
          }
          let dest = goal;
          if (!d.air) {
            if (
              !e.path.length &&
              this.pathBudget > 0 &&
              (e.repath || 0) <= this.time
            ) {
              e.path = findPath(
                d.naval ? { blocked: this.map.navalBlocked } : this.map,
                e.x,
                e.y,
                goal.x,
                goal.y,
              );
              e.repath = this.time + 1;
              this.pathBudget--;
            }
            if (!e.path.length) continue;
            dest = e.path[0];
            if (dist(e, dest) < 10) {
              e.path.shift();
              continue;
            }
          }
          let angle = Math.atan2(dest.y - e.y, dest.x - e.x),
            speed = this.effectiveSpeed(e);
          let vx = Math.cos(angle) * speed * dt,
            vy = Math.sin(angle) * speed * dt;
          if (!d.air) {
            for (const o of this.spatial.query(e.x, e.y, 75)) {
              if (o.id === e.id || o.hp <= 0 || U[o.kind]?.air) continue;
              let dd = dist(e, o),
                rr = e.r + o.r + (o.structure ? 8 : 1);
              if (dd < rr && dd > 0.1) {
                const push = (rr - dd) * Math.min(1, dt * 5);
                vx += ((e.x - o.x) / dd) * push;
                vy += ((e.y - o.y) / dd) * push;
              }
            }
          }
          const nx = clamp(e.x + vx, 16, W - 16),
            ny = clamp(e.y + vy, 16, H - 16);
          const free = (x, y) =>
            !(d.naval ? this.map.navalBlocked : this.map.blocked)[
              Math.floor(y / T) * COLS + Math.floor(x / T)
            ];
          if (d.air || free(nx, ny)) {
            e.x = nx;
            e.y = ny;
          } else {
            if (free(nx, e.y)) e.x = nx;
            else if (free(e.x, ny)) e.y = ny;
            else e.path = [];
          }
          e.angle = angle;
        }
      }
      for (const n of this.nodes) {
        const close = this.spatial
          .query(n.x, n.y, 100)
          .filter((e) => !e.structure && !U[e.kind]?.air && e.hp > 0);
        const teams = [...new Set(close.map((e) => e.team))];
        if (teams.length === 1 && teams[0] !== n.owner) {
          if (n.claim !== teams[0]) {
            n.claim = teams[0];
            n.progress = 0;
          }
          n.progress += dt;
          if (n.progress >= 7) {
            n.owner = n.claim;
            n.progress = 0;
            if (n.owner === 0) this.message("补给站已占领 · 收入 +22 / 秒");
          }
        } else if (teams.length === 0)
          n.progress = Math.max(0, n.progress - dt * 0.5);
      }
      const active = [];
      for (const fx of this.effects) {
        fx.ttl -= dt;
        if (fx.ttl > 0) {
          active.push(fx);
          continue;
        }
        if (fx.type === "shot") {
          if (fx.splash) {
            for (const e of this.spatial.query(fx.tx, fx.ty, fx.splash))
              if (this.isEnemy(fx.from, e.team) && !U[e.kind]?.air)
                this.damage(
                  e,
                  fx.damage *
                    Math.max(
                      0.25,
                      1 - dist(e, { x: fx.tx, y: fx.ty }) / (fx.splash + e.r),
                    ),
                  fx.from,
                );
          } else {
            const e = this.get(fx.target);
            if (e) this.damage(e, fx.damage, fx.from);
          }
          active.push({
            type: "impact",
            x: fx.tx,
            y: fx.ty,
            r: fx.splash || 14,
            ttl: 0.3,
            max: 0.3,
          });
        }
        if (["strike", "nuke", "bunker", "orbital"].includes(fx.type)) {
          for (const e of this.spatial.query(fx.x, fx.y, fx.r)) {
            if (!this.isEnemy(fx.from || 0, e.team)) continue;
            const base =
              fx.type === "nuke"
                ? 2300
                : fx.type === "bunker"
                  ? e.structure
                    ? 2600
                    : 280
                  : fx.type === "orbital"
                    ? 1700
                    : 420;
            this.damage(
              e,
              base * Math.max(0.35, 1 - dist(e, fx) / (fx.r + e.r)),
              fx.from || 0,
            );
          }
          active.push({
            type:
              fx.type === "nuke"
                ? "nuclear"
                : fx.type === "orbital"
                  ? "lance"
                  : "explosion",
            x: fx.x,
            y: fx.y,
            r: fx.r,
            ttl: fx.type === "nuke" ? 5 : 1.8,
            max: fx.type === "nuke" ? 5 : 1.8,
          });
        }
      }
      this.effects = active.slice(-650);
      if (this.tick % 5 === 0) {
        this.updateFog();
        this.reveals = this.reveals.filter((r) => r.until > this.time);
      }
      for (const t of this.teams) {
        if (
          t.alive &&
          !this.entities.some(
            (e) => e.team === t.id && e.kind === "hq" && e.hp > 0,
          )
        ) {
          t.alive = false;
          t.queue = [];
          t.buildQueue = [];
          for (const e of this.entities) if (e.team === t.id) e.hp = 0;
          this.message(F[t.faction].name + "指挥部已被摧毁");
        }
      }
      if (!this.teams[0].alive) this.result = "defeat";
      else if (this.teams.slice(1).every((t) => !t.alive))
        this.result = "victory";
      this.entities = this.entities.filter((e) => e.hp > 0);
    }
    freeSpawn(prod) {
      const d = { naval: prod.kind === "navalyard" };
      for (let i = 0; i < 36; i++) {
        let a = (i * Math.PI) / 9,
          r = prod.r + 55 + Math.floor(i / 18) * 24,
          x = prod.x + Math.cos(a) * r,
          y = prod.y + Math.sin(a) * r;
        if (
          x > 20 &&
          x < W - 20 &&
          y > 20 &&
          y < H - 20 &&
          !(d.naval ? this.map.navalBlocked : this.map.blocked)[
            Math.floor(y / T) * COLS + Math.floor(x / T)
          ] &&
          !this.entities.some(
            (e) =>
              e.structure &&
              e.hp > 0 &&
              Math.hypot(e.x - x, e.y - y) < e.r + 20,
          )
        )
          return { x, y };
      }
      return null;
    }
    save() {
      return {
        version: D.version,
        options: this.options,
        time: this.time,
        tick: this.tick,
        nextId: this.nextId,
        entities: this.entities,
        teams: this.teams,
        nodes: this.nodes,
        wealthGranted: !!this.wealthGranted,
        effects: this.effects,
        cooldowns: this.cooldowns,
        reveals: this.reveals,
        buffs: [...this.buffs],
        explored: Array.from(this.explored),
        result: this.result,
      };
    }
    static load(json) {
      const s = typeof json === "string" ? JSON.parse(json) : json;
      const finite = (v) => typeof v === "number" && Number.isFinite(v);
      if (
        !s ||
        s.version !== D.version ||
        !s.options ||
        !Array.isArray(s.entities) ||
        s.entities.length > 1000 ||
        !Array.isArray(s.teams) ||
        s.teams.length < 2 ||
        s.teams.length > 5 ||
        !finite(s.time) ||
        !Number.isInteger(s.tick) ||
        !Number.isInteger(s.nextId) ||
        !s.cooldowns ||
        typeof s.cooldowns !== "object" ||
        !Array.isArray(s.reveals) ||
        !Array.isArray(s.buffs) ||
        !Array.isArray(s.nodes) ||
        s.nodes.length !== 6 ||
        !Array.isArray(s.explored) ||
        s.explored.length !== COLS * ROWS
      )
        throw Error("存档格式或版本不兼容");
      if (
        s.teams.some((t, i) => t.id !== i) ||
        s.nodes.some(
          (n) =>
            !finite(n.x) ||
            !finite(n.y) ||
            !Number.isInteger(n.owner) ||
            n.owner < -1 ||
            n.owner >= s.teams.length,
        ) ||
        s.reveals.some(
          (v) =>
            !finite(v.x) || !finite(v.y) || !finite(v.r) || !finite(v.until),
        ) ||
        Object.values(s.cooldowns).some((v) => !finite(v))
      )
        throw Error("存档状态数据无效");
      for (const t of s.teams)
        if (
          !F[t.faction] ||
          !finite(t.money) ||
          !Array.isArray(t.queue) ||
          !Array.isArray(t.buildQueue) ||
          t.queue.some((q) => !U[q.kind] || !finite(q.remaining)) ||
          t.buildQueue.some(
            (q) =>
              !B[q.kind] ||
              !finite(q.remaining) ||
              !finite(q.x) ||
              !finite(q.y),
          )
        )
          throw Error("存档队伍数据无效");
      for (const e of s.entities)
        if (
          !(U[e.kind] || B[e.kind]) ||
          !Number.isInteger(e.team) ||
          !s.teams[e.team] ||
          !finite(e.x) ||
          !finite(e.y) ||
          e.x < 0 ||
          e.x > W ||
          e.y < 0 ||
          e.y > H ||
          !finite(e.hp) ||
          !finite(e.maxHp) ||
          !Number.isInteger(e.id) ||
          e.maxHp <= 0 ||
          !Array.isArray(e.path) ||
          e.path.some((p) => !finite(p.x) || !finite(p.y)) ||
          (e.order && (!finite(e.order.x) || !finite(e.order.y)))
        )
          throw Error("存档实体数据无效");
      const g = new Game(s.options);
      for (const k of [
        "time",
        "tick",
        "nextId",
        "entities",
        "teams",
        "nodes",
        "cooldowns",
        "reveals",
        "result",
      ])
        g[k] = s[k];
      g.wealthGranted = !!s.wealthGranted;
      g.buffs = new Set(s.buffs);
      g.explored = Uint8Array.from(s.explored);
      g.effects = Array.isArray(s.effects) ? s.effects : [];
      if (
        g.effects.length > 1000 ||
        g.effects.some(
          (e) =>
            !finite(e.x) || !finite(e.y) || !finite(e.ttl) || !finite(e.max),
        )
      )
        throw Error("存档效果数据无效");
      g.spatial.rebuild(g.entities);
      g.updateFog();
      g.message("本地存档已恢复");
      return g;
    }
  }
  root.WarSim = { Game, makeMap, findPath, rng, Spatial, dist };
})(typeof globalThis !== "undefined" ? globalThis : this);
