(function (root) {
  "use strict";
  if(typeof module!=='undefined'&&typeof require==='function')require('./navigation-footprints.js');
  if(typeof module!=='undefined'&&typeof require==='function')require('./destructible-trees.js');
  const D = root.WarData,
    { F, U, B, W, H, T, COLS, ROWS, ABILITIES } = D,
    clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const PLAYER_PROTECTION_DEFAULTS=Object.freeze({tickSeconds:1,baseRadius:650,playerRadius:650,guardCount:2,escortCount:2,supportCount:1,respondersPerThreat:2,maxThreats:4,criticalRatio:.35,powerReserve:20,holdRadius:140,refreshDistance:80});
  const PLAYER_JUMP_DEFAULTS=Object.freeze({impulse:32,gravity:80});
  const maxShieldRange=Math.max(0,...Object.values({...U,...B}).filter(d=>d.shield).map(d=>d.range));
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
    if(!root.WarMapLayouts&&typeof module!=='undefined'&&typeof require==='function')require('./maps-large.js');
    if(root.WarMapLayouts)return root.WarMapLayouts.makeMap(id,rng);
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
        aiSpaceWeapons: false,
        mode: 'annihilation',
        scoreLimit: 600,
        ...options,
      };
      this.options.playerProtection=Object.fromEntries(Object.entries(PLAYER_PROTECTION_DEFAULTS).map(([k,v])=>{
        const value=options.playerProtection?.[k],limit=k==='tickSeconds'?[.5,5]:k==='criticalRatio'?[.1,.8]:k.endsWith('Count')||k==='respondersPerThreat'||k==='maxThreats'?[1,8]:[20,1500];
        return [k,Number.isFinite(value)?clamp(value,...limit):v];
      }));
      this.options.playerJump=Object.fromEntries(Object.entries(PLAYER_JUMP_DEFAULTS).map(([k,v])=>{
        const value=options.playerJump?.[k];return [k,Number.isFinite(value)?clamp(value,...(k==='impulse'?[12,50]:[40,160])):v];
      }));
      this.protectionStatus=null;
      this.options.enemies = clamp(Number(this.options.enemies) || 1, 1, 4);
      if (!F[this.options.faction]) this.options.faction = "chn";
      this.map = makeMap(this.options.map);
      this.options.scoreLimit=clamp(Number(this.options.scoreLimit)||600,10,5000);
      this.ore=this.map.spawns.map((p,i)=>({id:i,x:p.x+(i===4?-280:300),y:p.y+(p.y>H/2?-140:180),amount:24000,initial:24000}));
      this.formation='line';
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
      this.directControl = null;
      this.directFeedback = null;
      this._directTeamAI = null;
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
          score: 0,
          harvested: 0,
          queue: [],
          buildQueue: [],
          power: 0,
          income: 0,
          alive: true,
          aiClock: 0,
          attackAt: (this.options.difficulty==='easy'?100:this.options.difficulty==='brutal'?40:65) + i * 6,
        };
        this.teams.push(t);
        const p = this.map.spawns[i];
        const dir = p.y > H / 2 ? -1 : 1;
        this.spawn(i, "hq", p.x, p.y);
        this.spawn(i, "power", p.x - 130, p.y - 90 * dir);
        this.spawn(i, "refinery", p.x + 130, p.y - 90 * dir);
        this.spawn(i, "barracks", p.x - 120, p.y + 110 * dir);
        this.spawn(i, "factory", p.x + 130, p.y + 120 * dir);
        this.spawn(i,'harvester',p.x+210,p.y+140*dir);
        for (let j = 0; j < 3; j++)
          this.spawn(
            i,
            j === 0 ? "tank" : "ifv",
            p.x - 60 + j * 60,
            p.y + 235 * dir,
          );
        for (let j = 0; j < 3; j++)
          this.spawn(i, "infantry", p.x - 90 + j * 28, p.y + 200 * dir);
        const sea = this.map.navalSpawns?.[i] || (
          i === 4
            ? { x: W-72, y: p.y }
            : { x: p.x, y: p.y > H / 2 ? H-120 : 120 });
        this.spawn(i, "navalyard", sea.x, sea.y);
        this.spawn(
          i,
          "destroyer",
          this.map.navalUnitSpawns?.[i]?.x ?? (i === 4 ? sea.x : sea.x + 100),
          this.map.navalUnitSpawns?.[i]?.y ?? (i === 4 ? sea.y + 100 : sea.y),
        );
        this.spawn(i, "fighter", p.x - 180, p.y + 40 * dir);
        this.spawn(i, "satellite", p.x + 40, p.y - 140 * dir);
        if(i===0&&U.operator)this.spawn(i,'operator',p.x-160,p.y+205*dir);
      }
      this.directObstacles=root.WarTrees.liveColliders(this);
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
        orderQueue: [],
        cargo: 0,
        anim: this.random() * 10,
      };
      e.altitude=this.entityAltitude(e);e.pitch=0;e.roll=0;e.flightSpeed=0;
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
    targetDomain(kind) {
      const d=U[kind];
      return B[kind]?'structure':d?.space?'space':d?.underwater?'underwater':d?.naval?'naval':d?.air?'air':'ground';
    }
    entityAltitude(e) {
      const d=U[e?.kind],base=Number.isFinite(e?.altitude)?e.altitude:d?.underwater?-55:d?.space?4000:d?.air?65:d?.naval?2:0;
      return base+((d?.modelKind||e?.kind)==='infantry'&&Number.isFinite(e?.jumpHeight)?Math.max(0,e.jumpHeight):0);
    }
    resetJump(e) {
      if(e){e.jumpHeight=0;e.jumpVelocity=0;}
      if(this.directControl){this.directControl.jumpHeld=false;this.directControl.jumpPending=false;}
    }
    hitHeightRadius(e) {
      const d=U[e.kind];return e.structure?Math.max(60,e.r*2):d?.naval?Math.max(30,e.r*2):d?.air?Math.max(12,e.r):Math.max(20,e.r);
    }
    directAimValid(target,options={}) {
      if(!target)return false;
      const b=root.WarNavigationFootprints?.bounds[target.kind+'_'+this.teams[target.team]?.faction],r=this.hitHeightRadius(target),height=options.aimHeight??options.aimPoint?.y;
      const x=options.aimX??options.aimPoint?.x,y=options.aimY??options.aimPoint?.z,hasHeight=Number.isFinite(height),hasXY=Number.isFinite(x)&&Number.isFinite(y);
      const dx=hasXY?x-target.x:0,dz=hasXY?y-target.y:0,dy=hasHeight?height-this.entityAltitude(target):0;
      // Keep the old combat volume; model additions must be inside the rotated measured box.
      if((!hasHeight||Math.abs(dy)<=r+2)&&(!hasXY||Math.hypot(dx,dz)<=target.r+2))return true;
      if(!b||b.length<7)return false;
      const angle=target.structure?0:target.angle||0,c=Math.cos(angle),s=Math.sin(angle),cp=Math.cos(target.pitch||0),sp=Math.sin(target.pitch||0),cr=Math.cos(target.roll||0),sr=Math.sin(target.roll||0);
      if(!hasXY){
        const contributions=[[sp,b[3],b[4]],[cp*cr,b[1],b[2]],[-cp*sr,b[5],b[6]]];
        const min=contributions.reduce((n,[a,lo,hi])=>n+Math.min(a*lo,a*hi),0),max=contributions.reduce((n,[a,lo,hi])=>n+Math.max(a*lo,a*hi),0);
        return dy>=min-2&&dy<=max+2;
      }
      // Renderer Euler(roll,-yaw,pitch,'YZX') = Ry(-yaw) Rz(pitch) Rx(roll).
      // Invert in reverse order without depending on THREE in the simulation.
      const yawX=c*dx+s*dz,yawZ=-s*dx+c*dz,lx=cp*yawX+sp*dy,pitchY=-sp*yawX+cp*dy,ly=cr*pitchY+sr*yawZ,lz=-sr*pitchY+cr*yawZ;
      return lx>=b[3]-2&&lx<=b[4]+2&&ly>=b[1]-2&&ly<=b[2]+2&&lz>=b[5]-2&&lz<=b[6]+2;
    }
    directFireStatus(e,target,options={}) {
      const d=U[e?.kind]||B[e?.kind],weapon=e?.kind==='operator'?this.operatorWeapon(e):null,state=weapon?this.operatorState(e):null;
      const profile=d?this.rangeProfile(e):null,armed=!!((weapon||d)?.damage>0),range=profile?.attack||0,minRange=profile?.min||0;
      const x=options.aimX??options.aimPoint?.x,y=options.aimY??options.aimPoint?.z,height=options.aimHeight??options.aimPoint?.y;
      const point=target?{x:target.x,y:target.y,height:this.entityAltitude(target)}:Number.isFinite(x)&&Number.isFinite(y)?{x,y,height:Number.isFinite(height)?height:this.entityAltitude(e)}:null;
      const projected=!!point&&(!!d?.space!==(target?!!U[target.kind]?.space:point.height>=2000));
      const actualDistance=e&&point?Math.hypot(point.x-e.x,point.y-e.y,point.height-this.entityAltitude(e)):null;
      const distance=e&&point?(projected?Math.hypot(point.x-e.x,point.y-e.y):actualDistance):null;
      const inRange=armed&&distance!==null&&distance<=range&&distance>=minRange,rangeState=distance===null?'none':distance<minRange?'min':distance>range?'out':'in';
      const domainAllowed=!target||!!(weapon?this.operatorCanTarget(e,target):d&&this.canTargetKind(e.kind,target.kind));
      const detected=!target||!!(e&&this.canDetect(e.team,target)&&(U[target.kind]?.underwater||e.team!==0||this.visibleAt(target.x,target.y)));
      const ammo=weapon?state.stash[weapon.id].ammo:null,reloading=!!state?.reloadRemaining,cooldown=Math.max(0,e?.cool||0),aimValid=!target||this.directAimValid(target,options);
      const reason=!e||e.hp<=0?'dead':!armed?'unarmed':e.disabled>this.time?'emp':!profile.active?'inactive':!point?'no-target':options.blocked?'blocked':target&&!this.isEnemy(e.team,target.team)?'friendly':!domainAllowed?'domain':!detected?'undetected':!aimValid?'aim-miss':rangeState==='min'?'min-range':rangeState==='out'?'out-of-range':reloading?'reloading':ammo===0?'no-ammo':cooldown>0?'cooldown':'ready';
      return{armed,range,minRange,distance,actualDistance,inRange,rangeState,domainAllowed,detected,canFire:reason==='ready',reason,projected,ammo,reloading,aimValid,cooldown};
    }
    distance3D(a,b) {return Math.hypot(a.x-b.x,a.y-b.y,this.entityAltitude(a)-this.entityAltitude(b));}
    engagementDistance(a,b) {
      // Space is a compressed orbital layer; only cross-layer weapons/sensors project onto the map.
      return !!U[a.kind]?.space!==!!U[b.kind]?.space?dist(a,b):this.distance3D(a,b);
    }
    canAfford(team,cost) {return Number.isFinite(cost)&&cost>=0&&!!this.teams[team]&&((team===0&&this.buffs.has('unlimited'))||this.teams[team].money>=cost);}
    spend(team,cost) {
      if(!this.canAfford(team,cost))return null;
      const paid=team===0&&this.buffs.has('unlimited')?0:cost;
      this.teams[team].money-=paid;this.teams[team].spent+=paid;return paid;
    }
    canDetect(team,e) {
      if(!e||e.hp<=0)return false;
      if(!this.isEnemy(team,e.team)||!U[e.kind]?.underwater)return true;
      // Explicit player vision cheat includes underwater contacts.
      if(team===0&&this.buffs.has('vision'))return true;
      return this.entities.some(s=>s.team===team&&(U[s.kind]||B[s.kind])?.sonarRange&&this.operational(s)&&this.engagementDistance(s,e)<=(U[s.kind]||B[s.kind]).sonarRange);
    }
    operational(e, power) {
      return e.hp!==0 && !(e.hp<0) && !(e.disabled>this.time) &&
        !(B[e.kind] && e.kind!=='turret' && (power??this.power(e.team))<0);
    }
    sightRadius(e, power) {
      const d=U[e.kind]||B[e.kind];
      const base=B[e.kind]?(d.sight&&this.operational(e,power)?d.sight:330):d.sight;
      return base*(F[this.teams[e.team].faction].vision||1);
    }
    unitsInSight(target,units) {
      return units.some(e=>e.hp>0&&dist(target,e)<this.sightRadius(e));
    }
    targetDomains(kind) {
      const d=U[kind]||B[kind];
      if(!d?.damage)return [];
      if(d.targetDomains)return d.targetDomains;
      if(kind==='asat')return ['space'];
      const domains=d.onlyAir?[]:['ground','naval','structure'];
      if(d.antiAir||kind==='heli'||kind==='turret')domains.push('air');
      if(d.antiSpace)domains.push('space');
      return domains;
    }
    canTargetKind(sourceKind,targetKind) {
      return this.targetDomains(sourceKind).includes(this.targetDomain(targetKind));
    }
    attackDamage(kind,target,base) {
      const d=U[kind]||B[kind],family=U[target.kind]?.modelKind||target.kind;
      return base*(d.damageBonuses?.[this.targetDomain(target.kind)]||1)*
        (d.targetBonuses?.[target.kind]??d.targetBonuses?.[family]??1);
    }
    canHeal(source,target) {
      const d=U[source.kind]||B[source.kind],family=U[target.kind]?.modelKind||target.kind;
      return !!d.heal&&target.hp>0&&target.team===source.team&&!target.structure&&
        (!d.healDomains||d.healDomains.includes(this.targetDomain(target.kind)))&&
        (!d.healFamilies||d.healFamilies.includes(family));
    }
    cooldownMultiplier(e,controllers=this.entities) {
      if(!(U[e.kind]||B[e.kind])?.damage)return 1;
      let friendly=1,hostile=1;const domain=this.targetDomain(e.kind);
      for(const source of controllers){const d=U[source.kind],field=d?.fireControl;
        if(!field||!this.operational(source)||!field.domains.includes(domain)||this.engagementDistance(source,e)>d.range)continue;
        if(field.enemy&&this.isEnemy(source.team,e.team))hostile=Math.max(hostile,field.multiplier);
        else if(!field.enemy&&source.team===e.team)friendly=Math.min(friendly,field.multiplier);
      }
      return friendly*hostile;
    }
    rangeProfile(e,preview=false) {
      const base=U[e.kind]||B[e.kind],weapon=e.kind==='operator'?this.operatorWeapon?.(e):null,d=weapon?{...base,range:weapon.range,damage:weapon.damage}:base,structure=!!B[e.kind],power=(structure?this.power(e.team):0)+(preview?(d.power||0):0);
      const active=this.operational(e,power),reason=e.disabled>this.time?'EMP停机':!active?'供电不足':null;
      const boosted=structure&&d.damage>0&&power>=0&&this.teamEntities(e.team).some(r=>r.kind==='radar'&&this.operational(r,power)&&dist(e,r)<450);
      const attack=d.damage>0?(d.range||0)*(boosted?1.15:1):0;
      const zones=[];
      if(attack){zones.push({type:'attack',label:'攻击',radius:attack,min:d.minRange||0,domains:this.targetDomains(e.kind)});if(d.minRange)zones.push({type:'blind',label:'最小射程盲区',radius:d.minRange});}
      if(e.kind==='ciws'||d.interceptRange)zones.push({type:'intercept',label:'拦截火箭',radius:d.interceptRange||d.range});
      if(d.sonarRange)zones.push({type:'sonar',label:'声呐探测',radius:d.sonarRange,domains:['underwater']});
      if(d.heal)zones.push({type:'repair',label:d.healFamilies?'步兵治疗':'维修',radius:d.range,domains:d.healDomains||['ground','naval','air','space']});
      if(d.fireControl)zones.push({type:d.fireControl.enemy?'jam':'link',label:(d.fireControl.enemy?'敌方装填 +':'友方装填 −')+Math.round(Math.abs(d.fireControl.multiplier-1)*100)+'%',radius:d.range,domains:d.fireControl.domains});
      if(d.shield)zones.push({type:'shield',label:'护盾',radius:d.range,domains:d.shieldDomains||['ground','naval','underwater','air','space','structure']});
      if(d.jam)zones.push({type:'jam',label:'电磁压制',radius:d.range});
      if(e.kind==='radar')zones.push({type:'link',label:'雷达联动',radius:450});
      if(e.kind==='radar'||(!d.damage&&!d.heal&&!structure))zones.push({type:'sight',label:'侦察',radius:this.sightRadius(e,power),active:true});
      return {kind:e.kind,active,reason,preview,power,boosted,attack,nominal:d.range||0,min:d.minRange||0,domains:this.targetDomains(e.kind),zones};
    }
    availableUnitKinds(team) {
      const t=this.teams[team],own=this.teamEntities(team),producers=new Set(own.filter(e=>e.structure&&e.disabled<=this.time).map(e=>e.kind));
      return Object.keys(U).filter(k=>{const d=U[k];return !d.playerOnly&&!d.logistics&&k!=='harvester'&&producers.has(d.producer)&&this.canAfford(team,this.cost(team,k))&&
        !(d.advanced&&(!this.options.advanced||(team>0&&this.options.playerOnlyTech)))&&!(team>0&&d.spaceWeapon&&this.options.aiSpaceWeapons===false);});
    }
    chooseUnitKind(choices) {
      const weight=k=>Math.max(0,U[k].aiWeight??(['tank','ifv'].includes(k)?3:1));
      const total=choices.reduce((sum,k)=>sum+weight(k),0);if(!total)return null;
      let roll=this.random()*total;
      for(const k of choices){roll-=weight(k);if(roll<0)return k;}
      return choices.at(-1);
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
    beginDirectControl(id) {
      const e=this.get(id);
      if(this.result||!e||e.team!==0||e.structure||!U[e.kind])return false;
      if(this.vehiclePrepareDirect&&!this.vehiclePrepareDirect(id))return false;
      this.endDirectControl();
      this.directFeedback=null;
      this._directTeamAI={aiClock:this.teams[0].aiClock,attackAt:this.teams[0].attackAt};
      this.teams[0].aiClock=0;
      this.resetJump(e);
      e.order=null;e.orderQueue=[];e.path=[];e.target=null;e.retreating=false;e.manualMove=true;
      this.directControl={id:e.id,input:{forward:0,strafe:0,yaw:e.angle,fire:false,targetId:null,aimX:e.x,aimY:e.y,aimHeight:this.entityAltitude(e),pitch:e.pitch,turn:0,lift:0,throttle:0,flightEnabled:false}};
      return true;
    }
    endDirectControl() {
      if(!this.directControl)return false;
      const e=this.entities.find(o=>o.id===this.directControl.id);
      if(e){this.resetJump(e);e.manualMove=false;e.order=null;e.orderQueue=[];e.path=[];e.target=null;}
      if(e?.operatorState){e.operatorState.reloadRemaining=0;e.operatorState.fireHeld=false;}
      if(this._directTeamAI)Object.assign(this.teams[0],this._directTeamAI);
      for(const ally of this.entities)if(ally.protectionRole){delete ally.protectionRole;ally.order=null;ally.orderQueue=[];ally.path=[];ally.target=null;}
      this.protectionStatus=null;
      this.directControl=null;this._directTeamAI=null;
      this.directFeedback=null;
      return true;
    }
    setDirectInput(input={}) {
      const e=this.get(this.directControl?.id);
      if(!e||this.result)return false;
      if(!input||typeof input!=='object')input={};
      const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
      if(e.disabled>this.time){this.resetJump(e);e.target=null;this.directControl.firePending=null;this.directControl.input={forward:0,strafe:0,yaw:e.angle,fire:false,targetId:null};return false;}
      const yaw=finite(input.yaw,e.angle),d=U[e.kind],aimTarget=Number.isInteger(input.targetId)?this.get(input.targetId):null;
      const pressed=input.jump===true;
      // Capture edges when input arrives: a press/release can happen between fixed simulation ticks.
      if(input.cancelJump===true)this.directControl.jumpPending=false;
      else if(pressed&&!this.directControl.jumpHeld&&!(e.jumpHeight>0)&&(d.modelKind||e.kind)==='infantry')this.directControl.jumpPending=true;
      this.directControl.jumpHeld=pressed;
      const trigger=!!input.fire&&!this.directControl.input.fire;
      if(input.cancelJump===true)this.directControl.firePending=null;
      this.directControl.input={
        forward:clamp(finite(input.forward),-1,1),strafe:clamp(finite(input.strafe),-1,1),yaw,
        pitch:clamp(finite(input.pitch),-1.15,1.15),turn:clamp(finite(input.turn),-1,1),lift:clamp(finite(input.lift),-1,1),throttle:clamp(finite(input.throttle),-1,1),flightEnabled:input.flightEnabled===true,
        fire:!!input.fire,ads:!!input.ads,jump:input.jump===true,targetId:Number.isInteger(input.targetId)?input.targetId:null,
        targetTreeId:typeof input.targetTreeId==='string'&&root.WarTrees.get(this,input.targetTreeId)?.hp>0?input.targetTreeId:null,
        aimX:clamp(finite(input.aimX,aimTarget?.x??e.x+Math.cos(yaw)*(d.range||250)),0,W),
        aimY:clamp(finite(input.aimY,aimTarget?.y??e.y+Math.sin(yaw)*(d.range||250)),0,H),
        aimHeight:clamp(finite(input.aimHeight,this.entityAltitude(aimTarget||e)),-160,14000),
      };
      if(trigger&&input.cancelJump!==true)this.directControl.firePending={...this.directControl.input};
      return true;
    }
    flightFloor(e,x,y) {
      let floor=25;const clearance=Math.max(8,e.r*.35);
      for(const o of this.entities)if(o.structure&&o.hp>0&&Math.hypot(x-o.x,y-o.y)<e.r+o.r+6)
        floor=Math.max(floor,this.entityAltitude(o)+(B[o.kind].collisionHeight||60)+clearance);
      for(const o of this.directObstacles||[])if(Math.hypot(x-o.x,y-o.y)<e.r+o.r)
        floor=Math.max(floor,(o.height??50)+clearance);
      return floor;
    }
    directPositionFree(e,x,y) {
      const d=U[e.kind],radius=e.r;
      // Manual driving must obey the same complete hull envelope as RTS movement.
      if(!root.WarNavigationFootprints.terrain(this,e,x,y))return false;
      if(x<radius||x>W-radius||y<radius||y>H-radius)return false;
      if(d.air)return d.space||this.entityAltitude(e)>=this.flightFloor(e,x,y)-.001;
      const blocked=d.naval?this.map.navalBlocked:(this.groundNavigation?.blocked||this.map.blocked);
      for(let n=-1;n<8;n++){
        const px=x+(n<0?0:Math.cos(n*Math.PI/4)*radius),py=y+(n<0?0:Math.sin(n*Math.PI/4)*radius);
        if(blocked[Math.floor(py/T)*COLS+Math.floor(px/T)])return false;
      }
      for(const o of this.entities)if(o.structure&&o.hp>0&&Math.hypot(x-o.x,y-o.y)<radius+o.r+6)return false;
      if(!d.naval&&(this.directObstacles||[]).some(o=>Math.hypot(x-o.x,y-o.y)<radius+o.r))return false;
      return d.naval||!this.ore.some(o=>Math.hypot(x-o.x,y-o.y)<radius+48);
    }
    emitShot(e,target,aim,weapon) {
      if(e.kind==='operator'&&!weapon&&this.operatorAutoFire)return this.operatorAutoFire(e,target);
      const d=weapon||U[e.kind]||B[e.kind];
      if(!d.damage||e.cool>0)return false;
      e.cool=d.reload;
      let val=target?this.attackDamage(e.kind,target,d.damage):0;
      if(target){
        if(e.kind==='submarine'&&!U[target.kind]?.naval)val*=.2;
        if(e.kind==='ifv'&&target.kind==='infantry')val*=1.7;
        if(e.kind==='tank'&&target.kind==='ifv')val*=1.3;
        if(e.kind==='aa')val*=U[target.kind]?.air?2:.45;
      }
      const asw=U[target?.kind]?.underwater&&['destroyer','frigate','missile_sub'].includes(e.kind),weaponFx=asw?'torpedo':d.weaponFx;
      const destination=aim?.fixedImpact?aim:target||aim,destinationHeight=aim?.fixedImpact?aim.height:target?this.entityAltitude(target):aim?.height??0,crossLayer=target?(!!U[e.kind]?.space!==!!U[target.kind]?.space):(!!U[e.kind]?.space!==(destinationHeight>=2000)),travel=Math.max(.08,Math.hypot(e.x-destination.x,e.y-destination.y,crossLayer?0:this.entityAltitude(e)-destinationHeight)/(weaponFx==='torpedo'?220:e.kind==='rocket'?400:700));
      this.effects.push({type:'shot',x:e.x,y:e.y,tx:destination.x,ty:destination.y,target:target?.id??null,from:e.team,
        damage:val,baseDamage:target||weapon?d.damage:0,targetDomain:target?this.targetDomain(target.kind):weapon?(destinationHeight>=2000?'space':destinationHeight>25?'air':destinationHeight< -15?'underwater':null):null,splash:target||weapon?(d.splash||0):0,
        ttl:travel,max:travel,rocket:weaponFx!=='torpedo'&&(!!d.rocket||['rocket','heli','asat','sam'].includes(e.kind)),space:!!d.spaceWeapon,
        sourceKind:e.kind,sourceId:e.id,sourceHeight:this.entityAltitude(e)+(e.structure?20:!d.air&&!d.naval?12:0),
        targetHeight:aim?.fixedImpact?aim.height:target?this.entityAltitude(target):(aim?.height??5),
        // Environment impacts share projectile arrival, cooldown and ammunition, but do not turn a unit miss into a hit.
        targetTreeId:aim?.targetTreeId??null,treeDamage:d.damage,treeSplash:d.splash||0,
        weaponFx:weaponFx||(e.kind==='orbital'?'orbital-beam':e.kind==='orbital_interceptor'?'interceptor-burst':e.kind==='asat'?'asat-missile':e.kind==='laser'?'laser-beam':'projectile'),
        ...(weapon?{operatorTargets:weapon.targets,weaponId:weapon.id}:{}),
        ...(!target?{miss:true}:{}),
        ...(aim?.fixedImpact&&target?{directHitArea:{x:target.x,y:target.y,altitude:this.entityAltitude(target),r:target.r,verticalRadius:this.hitHeightRadius(target)}}:{}),
      });
      return true;
    }
    stepDirectControl(e,dt) {
      const input=this.directControl.input,d=U[e.kind],yaw=input.yaw;
      const turnHull=desired=>{
        if(d.air){e.angle=desired;return;}
        const start=e.angle,delta=Math.atan2(Math.sin(desired-start),Math.cos(desired-start)),steps=Math.max(1,Math.ceil(Math.abs(delta)/.08));
        // Old saves may begin with a hull already intersecting terrain. Allow an
        // in-place correction into a legal heading, without translating it through land.
        if(!root.WarNavigationFootprints.terrain(this,e,e.x,e.y,start)&&root.WarNavigationFootprints.terrain(this,e,e.x,e.y,desired)){e.angle=desired;return;}
        // Test the turn as well as its endpoint: a long hull cannot sweep through
        // land and finish on water again during a large mouse movement.
        for(let i=1;i<=steps;i++){
          const angle=start+delta*i/steps;
          if(!root.WarNavigationFootprints.terrain(this,e,e.x,e.y,angle))break;
          e.angle=angle;
        }
      };
      if((d.modelKind||e.kind)==='infantry'){
        const cfg=this.options.playerJump;
        if(this.directControl.jumpPending&&!(e.jumpHeight>0))e.jumpVelocity=cfg.impulse;
        this.directControl.jumpPending=false;
        if(e.jumpHeight>0||e.jumpVelocity>0){
          e.jumpHeight=Math.max(0,(e.jumpHeight||0)+e.jumpVelocity*dt-.5*cfg.gravity*dt*dt);
          e.jumpVelocity=e.jumpHeight>0?e.jumpVelocity-cfg.gravity*dt:0;
        }
      }
      e.target=null;
      let dx=0,dy=0;
      if(d.air||d.underwater){
        if(input.flightEnabled){
          const speed=this.effectiveSpeed(e),angleDelta=Math.atan2(Math.sin(yaw-e.angle),Math.cos(yaw-e.angle));
          const fixedWing=d.air&&!d.space&&(d.modelKind||e.kind)!=='heli';
          const turn=clamp(angleDelta*1.8+input.turn*.7,-.9,.9);
          turnHull(e.angle+turn*dt);e.pitch+=(clamp(input.pitch+input.lift*.35,-1.05,1.05)-e.pitch)*Math.min(1,dt*3);
          e.roll+=((fixedWing?-turn*.6:0)-e.roll)*Math.min(1,dt*4);
          if(fixedWing){
            if(!(e.flightSpeed>0))e.flightSpeed=speed*.65;
            e.flightSpeed=clamp(e.flightSpeed+input.throttle*speed*.35*dt,speed*.35,speed*1.25);
            dx=Math.cos(e.angle)*Math.cos(e.pitch)*e.flightSpeed*dt;
            dy=Math.sin(e.angle)*Math.cos(e.pitch)*e.flightSpeed*dt;
            e.altitude=clamp(this.entityAltitude(e)+Math.sin(e.pitch)*e.flightSpeed*dt,25,1800);
          }else{
            const norm=Math.max(1,Math.hypot(input.forward,input.strafe));
            dx=(Math.cos(e.angle)*input.forward-Math.sin(e.angle)*input.strafe)*speed*dt/norm;
            dy=(Math.sin(e.angle)*input.forward+Math.cos(e.angle)*input.strafe)*speed*dt/norm;
            e.flightSpeed=Math.hypot(dx,dy)/dt;
            const climb=input.lift*(d.underwater?22:d.space?450:60)+(d.underwater?Math.sin(e.pitch)*e.flightSpeed:0);
            e.altitude=clamp(this.entityAltitude(e)+climb*dt,d.underwater?-140:d.space?2000:25,d.underwater?-22:d.space?12000:1800);
          }
        }
      }else{
        turnHull(yaw);
        const normal=Math.max(1,Math.hypot(input.forward,input.strafe)),speed=this.effectiveSpeed(e)*dt/normal;
        dx=(Math.cos(e.angle)*input.forward-Math.sin(e.angle)*input.strafe)*speed;
        dy=(Math.sin(e.angle)*input.forward+Math.cos(e.angle)*input.strafe)*speed;
      }
      e.turret=yaw;
      if(d.air&&!d.space&&input.flightEnabled)e.altitude=Math.max(this.entityAltitude(e),this.flightFloor(e,e.x,e.y));
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));
      for(let n=0;n<steps;n++){
        const x=e.x+dx/steps,y=e.y+dy/steps;
        if(this.directPositionFree(e,x,y)){e.x=x;e.y=y;}
        else if(this.directPositionFree(e,x,e.y))e.x=x;
        else if(this.directPositionFree(e,e.x,y))e.y=y;
      }
      if(e.kind==='operator'&&this.stepOperator){this.stepOperator(e,dt,input);return;}
      const fireInput=this.directControl.firePending||input;this.directControl.firePending=null;
      const candidate=this.get(fireInput.targetId),status=this.directFireStatus(e,candidate,fireInput),range=status.range;
      const target=candidate&&status.inRange&&status.domainAllowed&&status.detected&&status.aimValid&&this.isEnemy(e.team,candidate.team)?candidate:null;
      e.target=target?.id??null;
      if(target)e.turret=Math.atan2(target.y-e.y,target.x-e.x);
      if(!fireInput.fire||!status.armed||e.cool>0||e.disabled>this.time)return;
      let ax=fireInput.aimX-e.x,ay=fireInput.aimY-e.y,az=fireInput.aimHeight-this.entityAltitude(e),crossLayer=status.projected,length=Math.hypot(ax,ay,crossLayer?0:az),factor=length>range?range/length:1;
      this.emitShot(e,target,{x:e.x+ax*factor,y:e.y+ay*factor,height:crossLayer?fireInput.aimHeight:this.entityAltitude(e)+az*factor,targetTreeId:fireInput.targetTreeId,fixedImpact:true});
    }
    train(team, kind) {
      const t = this.teams[team],
        d = U[kind];
      if (
        !d || (team>0&&d.playerOnly) ||
        !t?.alive ||
        (team > 0 && d.spaceWeapon && this.options.aiSpaceWeapons === false) ||
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
        !this.canAfford(team,this.cost(team, kind))
      )
        return false;
      const c = this.cost(team, kind);
      const paid=this.spend(team,c);
      t.queue.push({ kind, remaining: d.time, total: d.time, paid });
      return true;
    }
    cancel(team, index) {
      const t = this.teams[team];
      if (!t.queue[index]) return;
      const [q] = t.queue.splice(index, 1);
      t.money += Math.round((q.paid??this.cost(team, q.kind)) * 0.75);
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
        !this.ore.some(o=>dist(o,{x,y})<48+d.r+6) &&
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
        !this.canAfford(team,this.cost(team, kind))
      )
        return false;
      const c = this.cost(team, kind);
      const paid=this.spend(team,c);
      t.buildQueue.push({
        kind,
        x,
        y,
        total: B[kind].time,
        remaining: B[kind].time,
        paid,
      });
      return true;
    }
    navigationRadius(e){return root.WarNavigationFootprints.radius(this,e);}
    navigationLayer(a,b){return root.WarNavigationFootprints.sameLayer(this,a,b);}
    destination(e,x,y,budget={remaining:8192}){
      const r=this.navigationRadius(e);x=clamp(x,r,W-r);y=clamp(y,r,H-r);
      const heading=Math.atan2(y-e.y,x-e.x);
      const free=(px,py)=>budget.remaining-->0&&root.WarNavigationFootprints.terrain(this,e,px,py,heading)&&
        (!U[e.kind]?.naval||root.WarNavigationFootprints.turningRoom(this,e,px,py))&&
        !this.entities.some(o=>o.structure&&o.hp>0&&this.navigationLayer(e,o)&&Math.hypot(px-o.x,py-o.y)<o.r+r+6)&&
        (U[e.kind]?.air||U[e.kind]?.naval||!this.ore.some(o=>Math.hypot(o.x-px,o.y-py)<48+r+4));
      if(free(x,y))return{x,y};
      for(let radius=24;radius<Math.max(W,H)&&budget.remaining>0;radius+=24)for(let j=0;j<24&&budget.remaining>0;j++){const a=j*Math.PI/12,px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius;if(free(px,py))return{x:px,y:py};}
      return null;
    }
    setRally(ids,x,y){for(const id of ids){const e=this.get(id);if(e?.structure&&Object.values(U).some(d=>d.producer===e.kind))e.rally={x:clamp(x,24,W-24),y:clamp(y,24,H-24)};}}
    retreat(ids){for(const id of ids){const e=this.get(id);if(!e||e.id===this.directControl?.id||e.structure||U[e.kind]?.naval||U[e.kind]?.space)continue;const base=this.teamEntities(e.team).filter(o=>o.kind==='repairhub'||o.kind==='hq').sort((a,b)=>dist(a,e)-dist(b,e))[0];if(base){this.command([id],base.x+90,base.y+90);e.retreating=true;}}}
    setAISpaceWeapons(allow){
      this.options.aiSpaceWeapons=!!allow;if(allow)return;
      for(const t of this.teams.slice(1)){for(const q of t.queue)if(U[q.kind]?.spaceWeapon)t.money+=(q.paid??this.cost(t.id,q.kind));t.queue=t.queue.filter(q=>!U[q.kind]?.spaceWeapon);}
      this.entities=this.entities.filter(e=>e.team===0||!U[e.kind]?.spaceWeapon);
      this.effects=this.effects.filter(fx=>!(fx.from>0&&(fx.space||fx.type==='orbital')));
    }
    command(ids, x, y, attack = false, target = null, options = {}) {
      if(!root.WarCommandFeedback&&typeof module!=='undefined'&&typeof require==='function')require('./command-feedback.js');
      const report={accepted:[],rejected:[],queued:!!options.queue};
      const destinationBudget={remaining:16384};
      if(!Number.isFinite(x)||!Number.isFinite(y))return report;
      const units = [...new Set(ids)]
        .map((id) => this.get(id))
        .filter((e) => e && !e.structure && e.id!==this.directControl?.id);
      let n = 0;
      const formation=options.formation||this.formation||'line',cols=formation==='column'?1:Math.ceil(Math.sqrt(units.length)*1.6),spacing=Math.max(formation==='spread'?125:60,...units.map(e=>this.navigationRadius(e)*4+24));
      const planKey=JSON.stringify([x,y,formation,...units.map(e=>e.id).sort((a,b)=>a-b)]);
      this._formationPlans=this._formationPlans||new Map();
      const cachedPlan=this._formationPlans.get(planKey),plan=new Map(),selected=new Set(units.map(e=>e.id));
      const reserved=this.entities.filter(e=>!selected.has(e.id)&&!e.structure&&e.hp>0).map(e=>({entity:e,...(e.orderQueue?.at(-1)||e.order||e)}));
      const cx=units.reduce((sum,e)=>sum+e.x,0)/Math.max(1,units.length),cy=units.reduce((sum,e)=>sum+e.y,0)/Math.max(1,units.length),facing=Math.atan2(y-cy,x-cx),fx=Math.cos(facing),fy=Math.sin(facing),rx=-fy,ry=fx;
      // The front rank receives the front destinations; rear vehicles do not have to pass stopped front ranks.
      units.sort((a,b)=>Math.round((b.x*fx+b.y*fy)/spacing)-Math.round((a.x*fx+a.y*fy)/spacing)||(a.x*rx+a.y*ry)-(b.x*rx+b.y*ry)||a.id-b.id);
      for (const e of units) {
        const width=Math.min(cols,units.length),rows=Math.ceil(units.length/cols);
        const side=((n%cols)-(width-1)/2)*spacing,front=((rows-1)/2-Math.floor(n/cols))*spacing;
        const cached=cachedPlan?.get(e.id);let p=this.destination(e,cached?.x??x+rx*side+fx*front,cached?.y??y+ry*side+fy*front,destinationBudget);
        if(!p){report.rejected.push({id:e.id,reason:'no-free-berth'});n++;continue;}
        const vacant=q=>q&&reserved.every(o=>!this.navigationLayer(e,o.entity)||Math.hypot(q.x-o.x,q.y-o.y)>=this.navigationRadius(e)+this.navigationRadius(o.entity)+32);
        if(!vacant(p)){
          const original=p;let found=false;
          const berthStep=U[e.kind]?.naval?spacing:Math.max(32,this.navigationRadius(e));
          for(let ring=1;ring<=16&&!found;ring++)for(let j=0;j<16;j++){
            const a=j*Math.PI/8,q=this.destination(e,original.x+Math.cos(a)*berthStep*ring,original.y+Math.sin(a)*berthStep*ring,destinationBudget);
            if(vacant(q)){p=q;found=true;break;}
          }
        }
        if(!vacant(p)){report.rejected.push({id:e.id,reason:'no-free-berth'});n++;continue;}
        const contact=this.get(target),tracked=contact&&this.canDetect(e.team,contact)?target:null;
        const order={x:p.x,y:p.y,attack,target:tracked};
        // Movement connectivity is distinct from ranged fire: an explicit detected
        // attack target can remain valid across a river or between islands.
        const from=options.queue?(e.orderQueue?.at(-1)||e.order||e):e;
        const access=tracked?null:root.WarCommandFeedback?.check(this.map,U[e.kind],from,p);
        if(access?.reachable===false){report.rejected.push({id:e.id,reason:access.reason,domain:access.domain});n++;continue;}
        if(options.queue&&e.order&&(e.orderQueue?.length||0)>=16){report.rejected.push({id:e.id,reason:'queue-full'});n++;continue;}
        reserved.push({...p,entity:e});plan.set(e.id,p);
        if(options.queue&&e.order){e.orderQueue=e.orderQueue||[];if(e.orderQueue.length<16){e.orderQueue.push(order);report.accepted.push(e.id);}else report.rejected.push({id:e.id,reason:'queue-full'});n++;continue;}
        report.accepted.push(e.id);
        e.orderQueue=[];e.retreating=false;
        if(e.kind!=='harvester'&&e.order&&e.order.x===order.x&&e.order.y===order.y&&e.order.attack===attack&&e.order.target===tracked){n++;continue;}
        if(e.kind==='harvester'){const ore=this.ore.filter(o=>o.amount>0).sort((a,b)=>dist(p,a)-dist(p,b))[0];e.oreId=ore&&dist(ore,p)<120?ore.id:null;e.manualMove=e.oreId===null;e.miningState=null;}
        e.order = order;
        e.target = tracked;
        e.path = [];
        e.repath = 0;
        e.crowdProgress=null;e.crowdDetourUntil=0;e.crowdWaiting=null;
        this._crowdReplans?.delete(e.id);
        n++;
      }
      this._formationPlans.set(planKey,plan);
      if(this._formationPlans.size>32)this._formationPlans.delete(this._formationPlans.keys().next().value);
      if(report.accepted.length)this.effects.push({ type: "command", x, y, ttl: 0.7, max: 0.7, attack });
      this.commandFeedback=report;return report;
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
        (team > 0 && kind==='orbital' && this.options.aiSpaceWeapons===false) ||
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
        !this.canAfford(team,d.cost)
      )
        return false;
      if (kind !== "recon" && team === 0 && !this.visibleAt(x, y)) return false;
      this.spend(team,d.cost);
      this.cooldowns[key] =
        this.time +
        d.cd * (team === 0 && this.buffs.has("cooldown") ? 0.25 : 1);
      if (kind === "recon")
        this.reveals.push({ x, y, r: d.radius, until: this.time + 22 });
      if (kind === "repair")
        for (const e of this.entities)
          if (e.team === team && dist(e, { x, y }) < d.radius)
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.45);
      if (kind === "emp")
        for (const e of this.entities)
          if (this.isEnemy(team, e.team) && dist(e, { x, y }) < d.radius)
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
            r: this.sightRadius(e),
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
      this.fogRevision = (this.fogRevision || 0) + 1;
    }
    damage(e, value, from, source=null) {
      if (e.hp <= 0 || !Number.isFinite(value) || value<=0) return;
      let mul =
        (from === 0 && this.buffs.has("damage") ? 1.4 : 1) *
        (F[this.teams[from]?.faction]?.damage || 1);
      let shield = 0;
      for (const v of this.spatial.query(e.x,e.y,maxShieldRange)) {
        const d=U[v.kind]||B[v.kind];
        if(v.team===e.team && d?.shield && this.operational(v) &&
          (!d.shieldDomains || d.shieldDomains.includes(this.targetDomain(e.kind))) && this.distance3D(v,e)<d.range)
          shield=Math.max(shield,d.shield);
      }
      const applied=value*mul*(1-shield),actual=Math.min(e.hp,Math.max(0,applied));
      if(actual<=0)return;
      e.hp -= applied;
      e.lastHit = this.time;
      e.lastHitSourceId=Number.isInteger(source?.sourceId)?source.sourceId:null;
      e.lastHitFrom=Number.isFinite(source?.x)&&Number.isFinite(source?.y)?{x:source.x,y:source.y,sourceId:e.lastHitSourceId,time:this.time}:null;
      if(e.lastHitSourceId===this.directControl?.id&&this.isEnemy(from,e.team))
        this.directFeedback={hitAt:this.time,sourceId:e.lastHitSourceId,targetId:e.id,damage:actual};
      if (e.hp <= 0) {
        this.vehicleDestroyed?.(e,from);
        if(e.id===this.directControl?.id)this.endDirectControl();
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
    navalApproach(ship,goal) {
      if(!this.navalRegions){
        const regions=new Int32Array(COLS*ROWS);let label=0;
        for(let start=0;start<regions.length;start++)if(!this.map.navalBlocked[start]&&!regions[start]){
          const queue=[start];regions[start]=++label;
          for(let n=0;n<queue.length;n++){const at=queue[n],x=at%COLS,y=Math.floor(at/COLS);
            for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,next=yy*COLS+xx;if(xx>=0&&xx<COLS&&yy>=0&&yy<ROWS&&!this.map.navalBlocked[next]&&!regions[next]){regions[next]=label;queue.push(next);}}
          }
        }this.navalRegions=regions;
      }
      const region=this.navalRegions[Math.floor(ship.y/T)*COLS+Math.floor(ship.x/T)];if(!region)return null;
      let best=null,score=Infinity;
      for(let i=0;i<this.map.navalBlocked.length;i++)if(this.navalRegions[i]===region){
        const p={x:(i%COLS)*T+T/2,y:Math.floor(i/COLS)*T+T/2},d=dist(p,goal),value=d+dist(p,ship)*.04;
        if(d<(U[ship.kind].minRange||0)+20)continue;
        if(value<score){score=value;best=p;}
      }
      return best;
    }
    commandSupport(team,units) {
      for(const support of units.filter(e=>e.id!==this.directControl?.id&&(U[e.kind].heal||U[e.kind].fireControl||U[e.kind].shield)&&!e.retreating&&this.operational(e))){
        const d=U[support.kind],allies=units.filter(e=>e.id!==support.id&&U[e.kind].damage&&(d.heal?this.canHeal(support,e):d.supportDomains.includes(this.targetDomain(e.kind))));
        const supportDistance=(a,b)=>d.fireControl?this.engagementDistance(a,b):this.distance3D(a,b);
        allies.sort((a,b)=>(a.hp/a.maxHp-b.hp/b.maxHp)||supportDistance(a,support)-supportDistance(b,support));
        const ally=allies[0];if(!ally)continue;
        if(supportDistance(support,ally)>d.range*.72)this.command([support.id],ally.x,ally.y,false);
        else if(support.order){support.order=null;support.path=[];support.orderQueue=[];}
      }
    }
    updatePlayerProtection(t,es,hq) {
      const player=this.get(this.directControl?.id),cfg=this.options.playerProtection;
      if(t.id!==0||!player)return null;
      const own=es.filter(e=>!e.structure&&e.id!==player.id&&this.operational(e)&&!e.retreating),
        armed=own.filter(e=>U[e.kind].damage>0&&e.hp/e.maxHp>.25),assets=es.filter(e=>e.structure),
        observed=this.entities.filter(e=>this.isEnemy(0,e.team)&&this.operational(e)&&(U[e.kind]||B[e.kind]).damage>0&&this.canDetect(0,e)&&(U[e.kind]?.underwater||this.visibleAt(e.x,e.y))),
        threatens=(enemy,ally,radius)=>this.canTargetKind(enemy.kind,ally.kind)&&this.engagementDistance(enemy,ally)<=Math.max(radius,((U[enemy.kind]||B[enemy.kind]).range||0)+100),
        playerThreats=observed.filter(e=>threatens(e,player,cfg.playerRadius)).sort((a,b)=>this.engagementDistance(a,player)-this.engagementDistance(b,player)),
        baseThreats=observed.filter(e=>assets.some(a=>threatens(e,a,cfg.baseRadius))).sort((a,b)=>dist(a,hq)-dist(b,hq)),
        critical=player.hp/player.maxHp<cfg.criticalRatio,reserved=new Set(),assigned=new Set();
      const reserve=(e,role)=>{reserved.add(e.id);e.protectionRole=role;};
      if(!root.WarCommandFeedback&&typeof module!=='undefined'&&typeof require==='function')require('./command-feedback.js');
      const reachable=(e,goal,allowFire=false)=>{
        if(allowFire&&this.canTargetKind(e.kind,goal.kind)&&this.engagementDistance(e,goal)<=(U[e.kind].range||0))return true;
        const destination=this.destination(e,goal.x,goal.y);
        return !!destination&&root.WarCommandFeedback?.check(this.map,U[e.kind],e,destination)?.reachable!==false;
      };
      const guards=armed.filter(e=>reachable(e,hq)).sort((a,b)=>{
        const useful=e=>baseThreats.some(threat=>this.canTargetKind(e.kind,threat.kind))?0:1;
        return useful(a)-useful(b)||this.engagementDistance(a,hq)-this.engagementDistance(b,hq);
      }).slice(0,cfg.guardCount);
      guards.forEach(e=>reserve(e,'base-guard'));
      const escorts=armed.filter(e=>!reserved.has(e.id)&&this.targetDomain(e.kind)===this.targetDomain(player.kind)&&reachable(e,player)).sort((a,b)=>this.distance3D(a,player)-this.distance3D(b,player)).slice(0,cfg.escortCount+(critical?1:0));
      escorts.forEach(e=>reserve(e,'escort'));
      const supports=own.filter(e=>U[e.kind].heal&&this.canHeal(e,player)&&reachable(e,player)&&
        (this.targetDomain(e.kind)===this.targetDomain(player.kind)||Math.abs(this.entityAltitude(e)-this.entityAltitude(player))<U[e.kind].range*.65)).sort((a,b)=>this.distance3D(a,player)-this.distance3D(b,player)).slice(0,cfg.supportCount);
      supports.forEach(e=>reserve(e,'repair'));
      // Keep existing paths until the destination meaningfully moves.
      const order=(e,goal,target=null,attack=!!target)=>{
        if(target&&e.order?.target===target.id)return;
        if(!target&&e.order&&!e.order.target&&e.order.attack===attack&&dist(e.order,goal)<cfg.refreshDistance)return;
        this.command([e.id],goal.x,goal.y,attack,target?.id||null);
      };
      const alignAltitude=(e,goal)=>{
        const domain=this.targetDomain(e.kind);
        if(domain!==this.targetDomain(goal.kind)||!['air','space','underwater'].includes(domain))return;
        const current=this.entityAltitude(e),step=({air:90,space:450,underwater:22})[domain]*cfg.tickSeconds;
        e.altitude=current+clamp(this.entityAltitude(goal)-current,-step,step);
        if(domain==='air')e.altitude=Math.max(e.altitude,this.flightFloor(e,e.x,e.y));
      };
      const respond=(threats,base)=>{
        for(const threat of threats.slice(0,cfg.maxThreats)){
          const candidates=armed.filter(e=>!assigned.has(e.id)&&this.canTargetKind(e.kind,threat.kind)&&(U[e.kind].naval||reachable(e,threat,true))&&
            (base?!(playerThreats.length&&escorts.includes(e)):!guards.includes(e))).sort((a,b)=>this.engagementDistance(a,threat)-this.engagementDistance(b,threat));
          for(const e of candidates.slice(0,cfg.respondersPerThreat)){
            assigned.add(e.id);if(!reserved.has(e.id))reserve(e,base?'base-response':'player-response');
            alignAltitude(e,threat);
            const goal=U[e.kind].naval?this.navalApproach(e,threat):threat;
            if(goal)order(e,goal,U[e.kind].naval&&!U[threat.kind]?.naval?null:threat,true);
          }
        }
      };
      respond(baseThreats,true);respond(playerThreats,false);
      guards.forEach((e,i)=>{if(!assigned.has(e.id))order(e,{x:hq.x+Math.cos(i*Math.PI)*cfg.holdRadius,y:hq.y+cfg.holdRadius});});
      escorts.forEach((e,i)=>{if(!assigned.has(e.id)){alignAltitude(e,player);order(e,{x:player.x+Math.cos(i*Math.PI)*cfg.holdRadius,y:player.y+cfg.holdRadius});}});
      supports.forEach(e=>{alignAltitude(e,player);if(this.distance3D(e,player)>U[e.kind].range*.65)order(e,player);else {e.order=null;e.orderQueue=[];e.path=[];e.target=null;}});
      for(const e of es)if(e.protectionRole&&!reserved.has(e.id)){delete e.protectionRole;e.order=null;e.orderQueue=[];e.path=[];e.target=null;}
      const safe=assets.filter(e=>['hq','repairhub','repair_dome','navalyard','airfield','spaceport'].includes(e.kind)&&this.operational(e)&&!observed.some(threat=>threatens(threat,e,150))).sort((a,b)=>this.engagementDistance(player,a)-this.engagementDistance(player,b))[0];
      const safePoint=safe&&(U[player.kind].naval?this.navalApproach(player,safe):safe);
      const fallback=safePoint?{x:safePoint.x,y:safePoint.y,id:safe.id}:null;
      const damagedBase=assets.find(e=>e.hp/e.maxHp<cfg.criticalRatio);
      if(critical||damagedBase){const repairAt=critical?player:damagedBase;this.ability('repair',repairAt.x,repairAt.y,t.id);}
      this.protectionStatus={protectedId:player.id,playerThreats:playerThreats.length,baseThreats:baseThreats.length,guardIds:guards.map(e=>e.id),escortIds:escorts.map(e=>e.id),supportIds:supports.map(e=>e.id),critical,fallback,updatedAt:this.time,
        summary:`基地威胁 ${baseThreats.length} · 玩家威胁 ${playerThreats.length} · 守卫 ${guards.length} / 护卫 ${escorts.length} · ${supports.length?'维修支援中':'待补维修'}${critical?' · 严重受损，建议撤回'+(fallback?'安全基地':'脱离交火区'):''}`};
      const choices=this.availableUnitKinds(0).filter(k=>!t.queue.some(q=>q.kind===k));
      let productionKind=null;
      for(const threat of [...playerThreats,...baseThreats]){
        if(armed.some(e=>this.canTargetKind(e.kind,threat.kind)&&this.engagementDistance(e,threat)<cfg.baseRadius))continue;
        productionKind=choices.filter(k=>U[k].damage>0&&this.canTargetKind(k,threat.kind)).sort((a,b)=>this.cost(0,a)-this.cost(0,b))[0];
        if(productionKind)break;
      }
      if(!productionKind&&!supports.length&&player.hp<player.maxHp*.9)productionKind=choices.filter(k=>U[k].heal&&this.canHeal({team:0,kind:k},player)).sort((a,b)=>this.cost(0,a)-this.cost(0,b))[0];
      if(!productionKind&&(guards.length<cfg.guardCount||escorts.length<cfg.escortCount))productionKind=choices.filter(k=>U[k].damage>0&&this.targetDomain(k)===this.targetDomain(player.kind)).sort((a,b)=>this.cost(0,a)-this.cost(0,b))[0];
      const defenseFor={ground:'turret',naval:'sonar_bastion',underwater:'sonar_bastion',air:'sam',space:'aerospace_array'};
      let buildKind=null;
      for(const threat of baseThreats){
        const candidate=defenseFor[this.targetDomain(threat.kind)];
        if(candidate&&!(B[candidate].advanced&&!this.options.advanced)&&!es.some(e=>e.kind===candidate)&&!t.buildQueue.some(q=>q.kind===candidate)){buildKind=candidate;break;}
      }
      if(!buildKind&&player.hp<player.maxHp*.9&&!supports.length&&!es.some(e=>e.kind==='repairhub')&&!t.buildQueue.some(q=>q.kind==='repairhub'))buildKind='repairhub';
      return {reserved,productionKind,buildKind};
    }
    ai(t, dt) {
      if (!t.alive) return;
      t.aiClock -= dt;
      if (t.aiClock > 0) return;
      const hard = ['hard','brutal'].includes(this.options.difficulty),
        easy = this.options.difficulty === "easy";
      const protecting=t.id===0&&!!this.directControl;
      t.aiClock = protecting?this.options.playerProtection.tickSeconds:easy ? 3.2 : hard ? 1.2 : 2;
      let es = this.teamEntities(t.id),
        hq = es.find((e) => e.kind === "hq");
      if (!hq) return;
      const protection=protecting?this.updatePlayerProtection(t,es,hq):null;
      const buildKind =
        this.power(t.id) < (protecting?this.options.playerProtection.powerReserve:20)
          ? "power"
          : protection?.buildKind || (!es.some((e) => e.kind === "airfield") && this.time > 35
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
                        : null);
      const urgentPower=protecting&&buildKind==='power'&&!t.buildQueue.some(q=>q.kind==='power');
      if (buildKind && (!t.buildQueue.length||urgentPower)) {
        for (let a = 0; a < 20; a++) {
          const ang = this.random() * Math.PI * 2,
            rad = 190 + this.random() * 230,
            x = hq.x + Math.cos(ang) * rad,
            y = hq.y + Math.sin(ang) * rad;
          if (this.build(t.id, buildKind, x, y)) {if(urgentPower)t.buildQueue.unshift(t.buildQueue.pop());break;}
        }
      }
      const choices=this.availableUnitKinds(t.id);
      if(t.queue.length<3&&choices.length){
        const kind=protection?.productionKind||this.chooseUnitKind(choices);
        if(kind&&this.train(t.id,kind)&&protection?.productionKind)t.queue.unshift(t.queue.pop());
      }
      if (this.time > 100 && this.options.abilities !== false) {
        const observed = this.entities.filter(
          (e) =>
            this.isEnemy(t.id, e.team) &&
            e.kind === "hq" &&
            this.unitsInSight(e, es),
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
      const units = es.filter((e) => !e.structure && e.id!==this.directControl?.id&&!protection?.reserved.has(e.id));
      this.commandSupport(t.id,units);
      for(const ship of units.filter(e=>U[e.kind].naval&&U[e.kind].damage&&!e.retreating)){
        if(ship.order&&(!ship.order.target||this.get(ship.order.target)?.hp>0))continue;
        const enemy=this.entities.filter(e=>e.hp>0&&this.isEnemy(t.id,e.team)&&this.canTargetKind(ship.kind,e.kind)&&this.canDetect(ship.team,e)&&(U[e.kind]?.underwater||this.unitsInSight(e,es))).sort((a,b)=>dist(ship,a)-dist(ship,b))[0];
        const goal=enemy||this.entities.filter(e=>e.hp>0&&e.kind==='hq'&&this.isEnemy(t.id,e.team)).sort((a,b)=>dist(ship,a)-dist(ship,b))[0];
        if(!goal)continue;
        const sea=this.navalApproach(ship,goal);
        if(sea&&dist(ship,sea)>35)this.command([ship.id],sea.x,sea.y,true,U[enemy?.kind]?.naval?enemy.id:null);
      }
      if(!es.some(e=>e.kind==='harvester')&&!t.queue.some(q=>q.kind==='harvester'))this.train(t.id,'harvester');
      for(const e of units)if(e.hp<e.maxHp*.25&&!e.retreating&&!U[e.kind].space&&!U[e.kind].naval&&e.kind!=='harvester')this.retreat([e.id]);
      const capturers = units.filter(
        (e) => !U[e.kind].heal&&!U[e.kind].fireControl&&!U[e.kind].shield&&(U[e.kind].capturePriority || U[e.kind].modelKind === 'infantry' || e.kind === 'infantry' || e.kind === 'ifv') && !e.order,
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
        let dest = this.options.mode==='domination'?this.nodes.filter(n=>n.owner!==t.id).sort((a,b)=>dist(hq,a)-dist(hq,b))[0]||hqs[0]:hqs[0];
        if (dest) {
          let attack = units.filter(
            (e) => e.kind!=='harvester'&&!U[e.kind].heal&&!U[e.kind].fireControl&&!U[e.kind].shield&&!e.retreating&&!U[e.kind].naval&&(e.kind !== "infantry" || this.random() > 0.4),
          );
          this.command(
            attack.map((e) => e.id),
            dest.x,
            dest.y,
            true,
            dest.kind?dest.id:null,
          );
        }
      }
    }
    step(dt) {
      if (this.result || !Number.isFinite(dt) || dt<=0) return;
      if(!root.WarCrowdNavigation&&typeof module!=='undefined'&&typeof require==='function')require('./crowd-navigation.js');
      dt = clamp(dt, 0, 0.1);
      this.time += dt;
      this.tick++;
      if(this.directControl){const e=this.get(this.directControl.id);if(!e)this.endDirectControl();else if(e.disabled>this.time){this.resetJump(e);e.target=null;this.directControl.firePending=null;if(e.operatorState){e.operatorState.reloadRemaining=0;e.operatorState.fireHeld=false;}this.directControl.input={forward:0,strafe:0,yaw:e.angle,fire:false,targetId:null};}}
      this.pathBudget = 10;
      this.crowdPathBudget = 2;
      this.spatial.rebuild(this.entities);
      this.teamSight = this.teams.map((t) =>
        this.entities.filter((e) => e.team === t.id && e.hp > 0),
      );
      if(!this.groundNavigation||this.tick%10===1){
        const blocked=this.map.blocked.slice();
        for(const e of this.entities)if(e.structure&&e.hp>0&&!B[e.kind].water){
          for(let y=Math.max(0,Math.floor((e.y-e.r-12)/T));y<=Math.min(ROWS-1,Math.floor((e.y+e.r+12)/T));y++)for(let x=Math.max(0,Math.floor((e.x-e.r-12)/T));x<=Math.min(COLS-1,Math.floor((e.x+e.r+12)/T));x++)if(Math.hypot(x*T+24-e.x,y*T+24-e.y)<e.r+14)blocked[y*COLS+x]=1;
        }
        this.groundNavigation={blocked};
        for(const o of this.ore)for(let y=Math.max(0,Math.floor((o.y-48)/T));y<=Math.min(ROWS-1,Math.floor((o.y+48)/T));y++)for(let x=Math.max(0,Math.floor((o.x-48)/T));x<=Math.min(COLS-1,Math.floor((o.x+48)/T));x++)if(Math.hypot(x*T+24-o.x,y*T+24-o.y)<45)blocked[y*COLS+x]=1;
      }
      for (const t of this.teams) {
        if (!t.alive) continue;
        t.power = this.power(t.id);
        const es = this.teamEntities(t.id);
        t.income =
          12 +
          es.filter((e) => e.kind === "refinery").length * 4 +
          this.nodes.filter((n) => n.owner === t.id).length * 22;
        const inc = t.id === 0 && this.buffs.has("income") ? 2 : 1;
        const difficulty =
          t.id > 0
            ? this.options.difficulty === "brutal" ? 1.7 : this.options.difficulty === "hard"
              ? 1.3
              : this.options.difficulty === "easy"
                ? 0.8
                : 1
            : 1;
        t.money += t.income * dt * inc * difficulty;
        let rate =
          (t.power < 0 ? 0.4 : 1) *
          F[t.faction].rate *
          (t.id === 0 && this.buffs.has("rapid") ? 10 : 1);
        const productionHeads=[...new Set(t.queue.map(q=>U[q.kind].producer))].map(producer=>t.queue.find(q=>U[q.kind].producer===producer));
        for (const q of productionHeads) {
          const prod = es.find(
            (e) => e.kind === U[q.kind].producer && e.disabled <= this.time,
          );
          if (prod) {
            q.remaining -= dt * rate;
            if (q.remaining <= 0) {
              let pos = this.freeSpawn(prod,q.kind);
              if (pos) {
                const spawned=this.spawn(t.id, q.kind, pos.x, pos.y);
                if(prod.rally&&q.kind!=='harvester')this.command([spawned.id],prod.rally.x,prod.rally.y,true);
                t.queue.splice(t.queue.indexOf(q),1);
              }
            }
          } else if (!es.some((e) => e.kind === U[q.kind].producer)) {
            this.cancel(t.id, t.queue.indexOf(q));
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
        if (t.id > 0 || (t.id===0&&this.directControl)) this.ai(t, dt);
      }
      const fireControllers=this.entities.filter(e=>U[e.kind]?.fireControl&&this.operational(e));
      for (const e of this.entities) {
        if (e.hp <= 0 || e.disabled > this.time) continue;
        const d = U[e.kind] || B[e.kind];
        if(e.kind==='harvester'&&e.id!==this.directControl?.id)this.harvest(e,dt);
        if(e.retreating&&this.time-e.lastHit>5){const base=this.teamEntities(e.team).some(o=>(o.kind==='hq'||o.kind==='repairhub')&&dist(e,o)<165);if(base){e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.035*dt);if(e.hp>=e.maxHp)e.retreating=false;}}
        e.cool -= dt / this.cooldownMultiplier(e,fireControllers);
        if (
          e.team === 0 &&
          this.buffs.has("regen") &&
          this.time - e.lastHit > 7
        )
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.015 * dt);
        if (!this.operational(e))
          continue;
        if (d.heal) {
          for (const a of this.spatial.query(e.x, e.y, d.range))
            if (this.canHeal(e,a) && this.distance3D(e,a)<=d.range)
              a.hp = Math.min(a.maxHp, a.hp + d.heal * dt);
        }
        if (d.jam) {
          for (const a of this.spatial.query(e.x, e.y, d.range))
            if (this.isEnemy(e.team, a.team) && !a.structure && dist(e,a)<=d.range)
              a.disabled = this.time + 0.15;
        }
        if((e.kind==='ciws'||d.interceptRange)&&(e.interceptAt||0)<=this.time){
          const interceptRange=d.interceptRange||d.range;
          const rocket=this.effects.find(f=>f.type==='shot'&&f.rocket&&this.isEnemy(e.team,f.from)&&Math.hypot(f.x+(f.tx-f.x)*(1-f.ttl/f.max)-e.x,f.y+(f.ty-f.y)*(1-f.ttl/f.max)-e.y)<interceptRange);
          if(rocket){rocket.type='intercepted';rocket.ttl=.12;rocket.max=.12;e.interceptAt=this.time+(d.interceptReload||.55);}
        }
        if(e.id===this.directControl?.id){this.stepDirectControl(e,dt);continue;}
        if(e.kind==='operator')this.operatorAutoTick(e,dt);
        if (!d.damage && !e.order) continue;
        let target = this.get(e.target);
        let range = e.kind==='operator'?this.operatorWeapon(e).range:this.rangeProfile(e).attack;
        const canHit = (t) =>
          d.damage > 0 &&
          (e.kind!=='operator'||this.operatorCanTarget(e,t)) &&
          this.isEnemy(e.team, t.team) &&
          this.canTargetKind(e.kind,t.kind) && this.canDetect(e.team,t) && this.engagementDistance(e,t)>=(d.minRange||0) &&
          (U[t.kind]?.underwater ? true : e.team === 0
            ? this.visibleAt(t.x, t.y)
            : this.unitsInSight(t, this.teamSight[e.team]));
        if (!target || !canHit(target) || this.engagementDistance(e, target) > range * 1.35)
          target = null;
        // Player explicit movement suppresses auto-fire until arrival; attack move engages.
        if (
          !target &&
          (!e.order || e.order.attack || e.structure) &&
          this.tick % 5 === e.id % 5
        ) {
          let best = Infinity;
          for (const o of this.spatial.query(e.x, e.y, range)) {
            const delta = this.engagementDistance(e, o);
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
            this.engagementDistance(e, target) <= range &&
            this.engagementDistance(e, target) >= (d.minRange || 0) &&
            e.cool <= 0
          ) {
            this.emitShot(e,target);
          }
        }
        if (e.structure) continue;
        const fight =
          target && this.engagementDistance(e, target) <= range && this.engagementDistance(e,target)>=(d.minRange||0) && (!e.order || e.order.attack);
        if (fight) continue;
        if (e.order) {
          let goal = e.order;
          const orderedTarget = goal.target ? this.get(goal.target) : null;
          if (orderedTarget && this.canDetect(e.team,orderedTarget)) {
            goal.x = orderedTarget.x;
            goal.y = orderedTarget.y;
          }
          if (dist(e, goal) < (d.air?14:6)) {
            e.order = e.orderQueue?.shift() || null;
            e.manualMove=false;
            e.path = [];
            e.crowdProgress=null;e.crowdDetourUntil=0;e.crowdWaiting=null;
            continue;
          }
          let dest = goal;
          if (!d.air || e.path.length) {
            if (
              !e.path.length &&
              this.pathBudget > 0 &&
              (e.repath || 0) <= this.time
            ) {
              e.path = findPath(
                d.naval ? { blocked: this.map.navalBlocked } : this.groundNavigation,
                e.x,
                e.y,
                goal.x,
                goal.y,
              );
              if(e.path.length){const last=e.path[e.path.length-1];if(Math.hypot(last.x-goal.x,last.y-goal.y)<T*1.5)e.path.push({x:goal.x,y:goal.y});}
              e.repath = this.time + 1;
              this.pathBudget--;
            }
            if (!e.path.length) continue;
            dest = root.WarCrowdNavigation?.waypoint(this,e)||e.path[0];
            if (dist(e, dest) < (e.path.length===1?5:10)) {
              e.path.shift();
              continue;
            }
          }
          if(root.WarCrowdNavigation){
            root.WarCrowdNavigation.move(this,e,dest,dt);
            if(!e.crowdProgress)e.crowdProgress={distance:dist(e,goal),time:this.time};
            if(this.time-e.crowdProgress.time>1.2&&!(e.crowdDetourUntil>this.time)){
              if(e.crowdProgress.distance-dist(e,goal)<8)root.WarCrowdNavigation.enqueue(this,e);
              else e.crowdProgress={distance:dist(e,goal),time:this.time};
            }
            continue;
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
      root.WarCrowdNavigation?.process(this,findPath);
      for (const n of this.nodes) {
        const close = this.spatial
          .query(n.x, n.y, 100)
          .filter((e) => !e.structure && !U[e.kind]?.air && !U[e.kind]?.naval && e.kind!=='harvester' && e.hp > 0 && dist(e,n)<90);
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
        root.WarTrees.impact(this,fx);
        if (fx.type === "shot") {
          if (fx.splash) {
            for (const e of this.spatial.query(fx.tx, fx.ty, fx.splash))
              if (e.hp>0 && this.isEnemy(fx.from, e.team) &&
                (fx.operatorTargets?fx.operatorTargets.includes(this.operatorDomain(e)):(fx.sourceKind?this.canTargetKind(fx.sourceKind,e.kind):!U[e.kind]?.air)) &&
                (['air','space','underwater'].includes(fx.targetDomain)?this.targetDomain(e.kind)===fx.targetDomain:!U[e.kind]?.air&&!U[e.kind]?.underwater) &&
                Math.hypot(e.x-fx.tx,e.y-fx.ty,this.entityAltitude(e)-(fx.targetHeight??this.entityAltitude(e)))<=fx.splash+e.r)
                this.damage(
                  e,
                  (fx.sourceKind&&fx.baseDamage!==undefined?this.attackDamage(fx.sourceKind,e,fx.baseDamage):fx.damage) *
                    Math.max(
                      0.25,
                      1 - dist(e, { x: fx.tx, y: fx.ty }) / (fx.splash + e.r),
                    ),
                  fx.from,
                  fx,
                );
          } else {
            const e = this.get(fx.target);
            if (e&&(!fx.directHitArea||Math.hypot((e.x-fx.directHitArea.x)/Math.max(5,fx.directHitArea.r),(e.y-fx.directHitArea.y)/Math.max(5,fx.directHitArea.r),(this.entityAltitude(e)-(fx.directHitArea.altitude??this.entityAltitude(e)))/(fx.directHitArea.verticalRadius??Math.max(5,fx.directHitArea.r)))<=1)) this.damage(e, fx.damage, fx.from, fx);
          }
          active.push({
            type: "impact",
            x: fx.tx,
            y: fx.ty,
            height: fx.targetHeight || 0,
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
              fx,
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
      if(!this.result&&this.options.mode==='domination'){
        for(const t of this.teams)if(t.alive){t.score=(t.score||0)+this.nodes.filter(n=>n.owner===t.id).length*dt;if(t.score>=this.options.scoreLimit){this.result=t.id===0?'victory':'defeat';this.message(F[t.faction].name+'取得据点积分胜利');break;}}
      }
      this.entities = this.entities.filter((e) => e.hp > 0);
      if(this.directControl&&(!this.get(this.directControl.id)||this.result))this.endDirectControl();
    }
    harvest(e,dt){
      if(e.id===this.directControl?.id)return;
      if(e.manualMove&&e.order)return;
      const refinery=this.teamEntities(e.team).filter(o=>o.kind==='refinery').sort((a,b)=>dist(e,a)-dist(e,b))[0];
      if(!refinery){e.order=null;return;}
      let ore=this.ore.find(o=>o.id===e.oreId&&o.amount>0)||this.ore.filter(o=>o.amount>0).sort((a,b)=>dist(e,a)-dist(e,b))[0];
      const returning=e.cargo>=U.harvester.capacity||(!ore&&e.cargo>0);
      if(returning){
        if(dist(e,refinery)<refinery.r+e.r+60){const multiplier=(e.team===0&&this.buffs.has('income'))?2:1;this.teams[e.team].money+=e.cargo*multiplier;this.teams[e.team].harvested=(this.teams[e.team].harvested||0)+e.cargo;e.cargo=0;e.order=null;e.path=[];}
        else if(!e.order||e.miningState!=='return'){const p=this.destination(e,refinery.x,refinery.y);e.order=p?{...p,attack:false}:null;e.path=[];}
        e.miningState='return';
      }else if(ore){
        const entrance={x:ore.x-75,y:ore.y+35};const changing=e.miningState!=='gather'||e.oreId!==ore.id;
        e.oreId=ore.id;
        if(dist(e,entrance)<32){e.order=null;e.path=[];let take=Math.min(U.harvester.harvestRate*dt,ore.amount,U.harvester.capacity-e.cargo);ore.amount-=take;e.cargo+=take;}
        else if(!e.order||changing){e.order={...entrance,attack:false};e.path=[];}
        e.miningState='gather';
      }else e.miningState='empty';
    }
    freeSpawn(prod,kind=prod.kind==='navalyard'?'destroyer':'tank') {
      const e={kind,team:prod.team,r:U[kind].r,angle:.6},r=this.navigationRadius(e);
      for(let ring=0;ring<8;ring++)for(let i=0;i<24;i++){
        const a=i*Math.PI/12,rad=prod.r+r+12+ring*48,x=prod.x+Math.cos(a)*rad,y=prod.y+Math.sin(a)*rad;
        if(root.WarNavigationFootprints.terrain(this,e,x,y)&&!this.entities.some(o=>o.hp>0&&this.navigationLayer(e,o)&&Math.hypot(o.x-x,o.y-y)<r+(o.structure?o.r:this.navigationRadius(o))+12))return{x,y};
      }
      return null;
    }
    save() {
      return structuredClone({
        version: D.version,
        altitudeSchema: 2,
        mapScaleVersion: 2,
        options: this.options,
        time: this.time,
        tick: this.tick,
        nextId: this.nextId,
        entities: this.entities.map(e=>e.protectionRole?{...e,protectionRole:undefined,order:null,orderQueue:[],path:[],target:null}:e.id===this.directControl?.id?{...e,manualMove:false,target:null,jumpHeight:0,jumpVelocity:0}:e),
        teams: this.teams.map(t=>t.id===0&&this._directTeamAI?{...t,...this._directTeamAI}:t),
        nodes: this.nodes,
        wealthGranted: !!this.wealthGranted,
        effects: this.effects,
        cooldowns: this.cooldowns,
        reveals: this.reveals,
        buffs: [...this.buffs],
        explored: Array.from(this.explored),
        result: this.result,
        ore: this.ore,
        trees: root.WarTrees.serialize(this),
        formation: this.formation,
      });
    }
    static load(json) {
      let s = typeof json === "string" ? JSON.parse(json) : structuredClone(json);
      const finite = (v) => typeof v === "number" && Number.isFinite(v);
      if(s&&s.mapScaleVersion===undefined){
        if(!Array.isArray(s.explored)||s.explored.length!==64*44)throw Error('旧地图存档尺寸不明，无法安全迁移；请使用匹配版本存档或新开遭遇战');
        // Clone before migration so loading an object twice never doubles coordinates again.
        const scaled=new WeakSet();
        const point=p=>{if(!p||typeof p!=='object'||scaled.has(p))return;scaled.add(p);if(finite(p.x))p.x*=2;if(finite(p.y))p.y*=2;};
        for(const e of Array.isArray(s.entities)?s.entities:[]){point(e);point(e.order);point(e.rally);for(const p of Array.isArray(e.path)?e.path:[])point(p);for(const p of Array.isArray(e.orderQueue)?e.orderQueue:[])point(p);}
        for(const t of Array.isArray(s.teams)?s.teams:[])for(const q of Array.isArray(t.buildQueue)?t.buildQueue:[])point(q);
        for(const list of [s.nodes,s.ore,s.reveals])for(const p of Array.isArray(list)?list:[])point(p);
        for(const fx of Array.isArray(s.effects)?s.effects:[]){point(fx);if(finite(fx.tx))fx.tx*=2;if(finite(fx.ty))fx.ty*=2;point(fx.directHitArea);}
        const explored=new Array(COLS*ROWS).fill(0);
        for(let y=0;y<44;y++)for(let x=0;x<64;x++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)explored[(y*2+dy)*COLS+x*2+dx]=s.explored[y*64+x];
        s.explored=explored;s.mapScaleVersion=2;
      }

      if (
        !s ||
        s.version !== D.version ||
        s.mapScaleVersion!==2 ||
        (s.altitudeSchema!==undefined&&s.altitudeSchema!==2) ||
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
          t.queue.some((q) => !U[q.kind] || !finite(q.remaining) || (q.paid!==undefined&&(!finite(q.paid)||q.paid<0))) ||
          t.buildQueue.some(
            (q) =>
              !B[q.kind] ||
              !finite(q.remaining) ||
              (q.paid!==undefined&&(!finite(q.paid)||q.paid<0)) ||
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
          ["altitude","pitch","roll","flightSpeed","jumpHeight","jumpVelocity"].some(k=>e[k]!==undefined&&!finite(e[k])) ||
          !Number.isInteger(e.id) ||
          e.maxHp <= 0 ||
          !Array.isArray(e.path) ||
          e.path.some((p) => !finite(p.x) || !finite(p.y)) ||
          (e.order && (!finite(e.order.x) || !finite(e.order.y)))
        )
          throw Error("存档实体数据无效");
      if(new Set(s.entities.map(e=>e.id)).size!==s.entities.length||s.entities.some(e=>e.id<1||e.id>=s.nextId))throw Error('存档实体标识冲突');
      const g = new Game(s.options);
      if(s.ore){if(!Array.isArray(s.ore)||s.ore.length>20||s.ore.some(o=>!finite(o.x)||!finite(o.y)||!finite(o.amount)||o.amount<0))throw Error('矿区存档无效');g.ore=s.ore;}
      g.formation=['line','column','spread'].includes(s.formation)?s.formation:'line';
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
      for(const t of g.teams){t.score=finite(t.score)?Math.max(0,t.score):0;t.harvested=finite(t.harvested)?Math.max(0,t.harvested):0;}
      for(const e of g.entities){if(e.rally&&(!finite(e.rally.x)||!finite(e.rally.y)))throw Error('集结点无效');if(e.orderQueue&&(!Array.isArray(e.orderQueue)||e.orderQueue.length>16||e.orderQueue.some(p=>!finite(p.x)||!finite(p.y))))throw Error('路径队列无效');e.cargo=finite(e.cargo)?clamp(e.cargo,0,500):0;}
      for(const e of g.entities){e.r=(U[e.kind]||B[e.kind]).r;g.resetJump(e);if(s.altitudeSchema===undefined&&U[e.kind]?.space&&finite(e.altitude)&&e.altitude>=120&&e.altitude<=900)e.altitude=4000;e.altitude=g.entityAltitude(e);e.pitch=e.pitch??0;e.roll=e.roll??0;e.flightSpeed=e.flightSpeed??0;}
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
      if(s.altitudeSchema===undefined)for(const fx of g.effects){
        const legacy=v=>finite(v)&&v>=120&&v<=900;
        if(U[fx.sourceKind]?.space&&legacy(fx.sourceHeight))fx.sourceHeight=4000;
        const target=g.get(fx.target);
        if((U[target?.kind]?.space||fx.targetDomain==='space')&&legacy(fx.targetHeight))fx.targetHeight=4000;
        if(U[target?.kind]?.space&&fx.directHitArea&&legacy(fx.directHitArea.altitude))fx.directHitArea.altitude=4000;
      }
      g.validateVehicleCrews?.();
      root.WarTrees.restore(g,s.trees);
      g.directObstacles=root.WarTrees.liveColliders(g);
      g.spatial.rebuild(g.entities);
      if(g.options.aiSpaceWeapons===false)g.setAISpaceWeapons(false);
      g.updateFog();
      g.message("本地存档已恢复");
      return g;
    }
  }
  root.WarSim = { PLAYER_PROTECTION_DEFAULTS, PLAYER_JUMP_DEFAULTS, Game, makeMap, findPath, rng, Spatial, dist };
  if(typeof module!=='undefined'&&typeof require==='function')require('./operator-sim.js');
  if(typeof module!=='undefined'&&typeof require==='function')require('./vehicle-interaction.js');
})(typeof globalThis !== "undefined" ? globalThis : this);
