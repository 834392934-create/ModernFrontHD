const test = require("node:test");
const assert = require("node:assert/strict");
require("../src/data.js");require('../src/roster.js');
require("../src/equipment.js");
require("../src/sim.js");
const { Game, makeMap, findPath } = global.WarSim;
test("destroyed producer refunds its blocked queue item",()=>{const g=new Game({enemies:1});g.train(0,'tank');const producer=g.entities.find(e=>e.team===0&&e.kind==='factory');producer.hp=0;g.step(.05);assert.equal(g.teams[0].queue.length,0)});
test("malformed nested save data is rejected",()=>{const g=new Game({enemies:1}),s=g.save();s.entities[0].path=[{x:null,y:100}];assert.throws(()=>Game.load(s));const s2=new Game({enemies:1}).save();s2.reveals=null;assert.throws(()=>Game.load(s2))});
test("public evidence stays separate and verified mobility is mapped", () => {
  const g = new Game({ faction: "kor", enemies: 1 }),
    tank = g.entities.find((e) => e.kind === "tank" && e.team === 0);
  assert.ok(Math.abs(g.effectiveSpeed(tank) - (70 / 3.6) * 3 * 1.12) < 0.001);
  assert.equal(
    WarData.EQUIPMENT.dossier("chn", "tank").specs["防护等效厚度"],
    "未知",
  );
  assert.ok(WarData.EQUIPMENT.dossier("usa", "jet").concept);
});
test("five factions, unique armored rosters", () => {
  assert.equal(Object.values(WarData.F).filter((f) => !f.fiction).length, 5);
  assert.equal(
    new Set(
      Object.values(WarData.F)
        .filter((f) => !f.fiction)
        .map((f) => f.names[0]),
    ).size,
    5,
  );
});
test("mainland maps connect all bases; island maps retain local objectives and separate shores", () => {
  for (const m of WarData.MAPS) {
    const map=makeMap(m.id);
    for(const p of map.spawns){
      if(m.id==='archipelago'){
        assert.ok(map.nodes.some(n=>findPath(map,p.x,p.y,n.x,n.y).length>0),'each island has a reachable objective');
        for(const q of map.spawns)if(p!==q)assert.equal(findPath(map,p.x,p.y,q.x,q.y).length,0,'separate islands require sea/air transport');
      }else{
        assert.ok(findPath(map,p.x,p.y,WarData.W/2,WarData.H/2).length>0,m.id+' centre');
        for(const q of map.spawns)assert.ok(findPath(map,p.x,p.y,q.x,q.y).length>0,m.id+' base route');
      }
    }
  }
});
test("queue spends money, requires producer, completes after simulation time", () => {
  const g = new Game({ faction: "chn", enemies: 1, map: "desert" });
  let money = g.teams[0].money;
  assert.equal(g.train(0, "heli"), false);
  assert.equal(g.train(0, "tank"), true);
  assert.ok(g.teams[0].money < money);
  const n = g.entities.filter((e) => e.team === 0 && e.kind === "tank").length;
  for (let i = 0; i < 220; i++) g.step(0.05);
  assert.ok(
    g.entities.filter((e) => e.team === 0 && e.kind === "tank").length > n,
  );
});
test("impassable river blocks a direct route and paths use bridges", () => {
  const m = makeMap("river");
  const path = findPath(m, 2200, 1400, 3800, 1400);
  assert.ok(path.length > 0);
  assert.equal(m.blocked[Math.floor(1400/48)*WarData.COLS+Math.floor(3072/48)],1);
  assert.ok(path.some(p=>m.tiles[Math.floor(p.y/48)*WarData.COLS+Math.floor(p.x/48)]===4),"crosses a bridge");
  for (const p of path)
    assert.equal(
      m.blocked[Math.floor(p.y / 48) * WarData.COLS + Math.floor(p.x / 48)],
      0,
    );
});
test("all five factions can play and AI constructs and produces", () => {
  for (const faction of Object.keys(WarData.F)) {
    const g = new Game({
      faction,
      enemies: 4,
      map: "industry",
      difficulty: "normal",
    });
    for (let i = 0; i < 1800; i++) g.step(0.05);
    assert.equal(g.teams.length, 5);
    assert.ok(g.teams.slice(1).every((t) => t.spent > 0));
    assert.ok(g.entities.some((e) => e.team > 0 && e.kind === "power"));
  }
});
test("buffs, ability cost and cooldown are enforced", () => {
  const g = new Game({ buffs: ["wealth", "armor"], enemies: 1 });
  assert.equal(g.teams[0].money, 25000);
  assert.equal(
    g.entities.find((e) => e.team === 0 && e.kind === "hq").maxHp,
    4800,
  );
  assert.equal(g.ability("strike", g.map.spawns[0].x, g.map.spawns[0].y), true);
  assert.equal(g.ability("strike", 720, 360), false);
  assert.equal(g.teams[0].money, 24000);
});
test("save/load restores state and rejects malformed data", () => {
  const g = new Game({ enemies: 2 });
  g.train(0, "tank");
  for (let i = 0; i < 35; i++) g.step(0.05);
  const h = Game.load(JSON.stringify(g.save()));
  assert.equal(h.time, g.time);
  assert.equal(h.entities.length, g.entities.length);
  assert.equal(h.teams[0].money, g.teams[0].money);
  assert.throws(() => Game.load("{}"));
  assert.throws(() => Game.load("{broken"));
  h.step(0.05);
});
test("eliminating all hostile entities ends a duel and records victory", () => {
  const g = new Game({ enemies: 1 });
  for(const e of g.entities)if(e.team===1)e.hp=0;
  g.step(0.05);
  assert.equal(g.result, "victory");
});
test("building placement rejects river, overlap and distant territory", () => {
  const g = new Game({ map: "river", enemies: 1 });
  const h = g.entities.find((e) => e.team === 0 && e.kind === "hq");
  assert.equal(g.build(0, "power", h.x, h.y), false);
  assert.equal(g.build(0, "power", 1536, 200), false);
  assert.equal(g.build(0, "power", 2900, 1900), false);
});
test("all maps have connected oceans and ships stay on water", () => {
  for (const def of WarData.MAPS) {
    const m = makeMap(def.id),
      path = findPath({ blocked: m.navalBlocked }, m.navalUnitSpawns[0].x, m.navalUnitSpawns[0].y, m.navalUnitSpawns[1].x, m.navalUnitSpawns[1].y);
    assert.ok(path.length > 0);
    assert.ok(
      path.every(
        (p) =>
          !m.navalBlocked[Math.floor(p.y / 48) * WarData.COLS + Math.floor(p.x / 48)],
      ),
    );
  }
  const g = new Game({ enemies: 1, map: "desert" }),
    ship = g.entities.find((e) => e.team === 0 && e.kind === "destroyer");
  const oldX=ship.x;
  g.command([ship.id], oldX+500, ship.y);
  for (let i = 0; i < 100; i++) g.step(0.05);
  assert.equal(
    g.map.navalBlocked[Math.floor(ship.y / 48) * WarData.COLS + Math.floor(ship.x / 48)],
    0,
  );
  assert.ok(ship.x > oldX+100);
});
test("advanced technology rejects AI by default and allows opt-in", () => {
  const g = new Game({ enemies: 1 });
  g.teams[1].money = 99999;
  g.spawn(1, "airfield", 2300, 1500);
  assert.equal(g.train(1, "jet"), false);
  assert.equal(g.ability("nuke", 720, 360, 1), false);
  g.options.playerOnlyTech = false;
  assert.equal(g.train(1, "jet"), true);
  assert.equal(g.ability("nuke", 720, 360, 1), true);
  g.options.advanced = false;
  assert.equal(g.train(0, "jet"), false);
  assert.equal(g.canBuild(0, "shield", 1000, 360), false);
});
test("nuclear and bunker strikes resolve after warning and survive saves", () => {
  const g = new Game({ enemies: 1, buffs: ["vision", "wealth"] });
  const h = g.entities.find((e) => e.team === 1 && e.kind === "hq"),
    hp = h.hp;
  assert.equal(g.ability("bunker", h.x, h.y), true);
  assert.equal(h.hp, hp);
  const h2 = Game.load(JSON.stringify(g.save()));
  for (let i = 0; i < 83; i++) h2.step(0.05);
  assert.ok(h2.entities.find((e) => e.id === h.id).hp < hp - 2000);
  g.teams[0].money = 99999;
  assert.equal(g.ability("nuke", h.x, h.y), true);
  for (let i = 0; i < 123; i++) g.step(0.05);
  assert.ok(g.effects.some((e) => e.type === "nuclear"));
});
test("Imperium is stronger and has exclusive orbital support", () => {
  const g = new Game({
    faction: "imp",
    enemies: 1,
    buffs: ["wealth", "vision"],
  });
  const tank = g.entities.find((e) => e.kind === "tank" && e.team === 0);
  assert.equal(tank.maxHp, WarData.U.tank.hp * 3);
  assert.equal(g.ability("orbital", 2200, 1700), true);
  const normal = new Game({ faction: "usa" });
  assert.equal(normal.ability("orbital", 720, 360), false);
});
test("space units move independently, ground guns cannot hit orbit", () => {
  const g = new Game({ enemies: 1 }),
    sat = g.entities.find((e) => e.team === 0 && e.kind === "satellite"),
    old = sat.x;
  g.command([sat.id], old+500, sat.y);
  for (let i = 0; i < 40; i++) g.step(0.05);
  assert.ok(sat.x > old);
  const hostile = g.spawn(1, "satellite", sat.x + 25, sat.y);
  const tank = g.spawn(0, "tank", sat.x, sat.y);
  for (let i = 0; i < 30; i++) g.step(0.05);
  assert.equal(hostile.hp, hostile.maxHp);
  assert.notEqual(tank.target, hostile.id);
});
test("shield mitigates hits only while powered; repair hub heals", () => {
  const g = new Game({ enemies: 1 });
  const tank = g.entities.find((e) => e.kind === "tank" && e.team === 0);
  g.spawn(0, "power", 500, 900);
  const s = g.spawn(0, "shield", tank.x + 30, tank.y);
  g.spatial.rebuild(g.entities);
  const hp = tank.hp;
  g.damage(tank, 100, 1);
  assert.equal(Math.round(hp - tank.hp), 55);
  s.disabled = g.time + 10;
  const hp2 = tank.hp;
  g.damage(tank, 100, 1);
  assert.equal(hp2 - tank.hp, 100);
  g.spawn(0, "repairhub", tank.x + 40, tank.y + 20);
  for (let i = 0; i < 40; i++) g.step(0.05);
  assert.ok(tank.hp > hp2 - 100);
});
test("sam targets aircraft and jammer disables hostile units", () => {
  const g = new Game({ enemies: 1 });
  const h = g.entities.find((e) => e.team === 0 && e.kind === "hq");
  const sam = g.spawn(0, "sam", h.x + 250, h.y),
    heli = g.spawn(1, "heli", h.x + 300, h.y);
  g.spawn(0, "power", h.x - 200, h.y);
  const ground = g.spawn(1, "tank", h.x + 280, h.y);
  g.spawn(0, "jammer", h.x + 100, h.y);
  for (let i = 0; i < 30; i++) g.step(0.05);
  assert.ok(heli.hp < heli.maxHp);
  assert.ok(ground.disabled > g.time);
  assert.notEqual(sam.target, ground.id);
});
