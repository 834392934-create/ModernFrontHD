'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const feedback=require('../src/command-feedback.js');
const layouts=require('../src/maps-large.js');
function fixture(){return {cols:5,rows:3,tileSize:10,blocked:Uint8Array.from([0,0,1,0,0,0,0,1,0,0,0,0,1,0,0]),navalBlocked:Uint8Array.from([1,1,0,1,1,1,1,0,1,1,1,1,0,1,1])};}
test('rejects separated land but permits same island and unrestricted flight',()=>{
  const m=fixture();
  assert.equal(feedback.check(m,{}, {x:5,y:5},{x:45,y:5}).reason,'separated-land');
  assert.equal(feedback.check(m,{}, {x:5,y:5},{x:15,y:25}).reachable,true);
  for(const d of [{air:true},{space:true}])assert.equal(feedback.check(m,d,{x:5,y:5},{x:45,y:5}).reachable,true);
});
test('water connectivity is independent from ground',()=>{
  const m=fixture();
  assert.equal(feedback.check(m,{naval:true},{x:25,y:5},{x:25,y:25}).reachable,true);
  m.navalBlocked=Uint8Array.from([1,1,0,1,1,1,1,1,1,1,1,1,0,1,1]);
  assert.equal(feedback.check(m,{naval:true},{x:25,y:5},{x:25,y:25}).reason,'separated-water');
});
test('does not join regions diagonally through blocked corners',()=>{
  const m={cols:2,rows:2,tileSize:10,blocked:Uint8Array.from([0,1,1,0])};
  assert.equal(feedback.check(m,{}, {x:5,y:5},{x:15,y:15}).reachable,false);
});
test('blocked endpoints are unknown and defer to existing recovery',()=>{
  const m=fixture();
  for(const [a,b] of [[{x:25,y:5},{x:5,y:5}],[{x:5,y:5},{x:25,y:5}]])
    assert.equal(feedback.check(m,{},a,b).reachable,null);
});
test('validates inputs and treats temporary building blockers as dynamic',()=>{
  const m=fixture(),a={x:5,y:5},b={x:15,y:25};
  m.groundNavigation={blocked:new Uint8Array(15).fill(1)};
  assert.equal(feedback.check(m,{},a,b).reachable,true);
  assert.equal(feedback.check(m,{},a,{x:50,y:5}).reason,'out-of-bounds');
  assert.equal(feedback.check(m,{},a,{x:NaN,y:5}).reachable,false);
  assert.equal(feedback.check({}, {},a,b).reachable,null);
  assert.equal(feedback.check(null,{},a,b).reachable,null);
});
test('caches each static layer once, updates replaced mask and explicit revisions',()=>{
  const m=fixture(),a={x:5,y:5},b={x:45,y:5};
  for(let i=0;i<2000;i++)feedback.check(m,{},a,b);
  assert.deepEqual(feedback.stats(m),{builds:1,checks:2000,landRegions:2,waterRegions:0});
  m.blocked=new Uint8Array(15);
  assert.equal(feedback.check(m,{},a,b).reachable,true);
  assert.equal(feedback.stats(m).builds,2);
  m.blocked[2]=m.blocked[7]=m.blocked[12]=1;m.navigationRevision=1;
  assert.equal(feedback.check(m,{},a,b).reachable,false);
  m.blocked.fill(0);feedback.invalidate(m);
  assert.equal(feedback.check(m,{},a,b).reachable,true);
});
test('five archipelago land bases are isolated and all five naval starts connected',()=>{
  const m=layouts.makeMap('archipelago');
  for(let a=0;a<5;a++)for(let b=0;b<5;b++){
    assert.equal(feedback.check(m,{},m.spawns[a],m.spawns[b]).reachable,a===b);
    assert.equal(feedback.check(m,{naval:true},m.navalUnitSpawns[a],m.navalUnitSpawns[b]).reachable,true);
  }
  assert.deepEqual(feedback.stats(m),{builds:2,checks:50,landRegions:5,waterRegions:1});
});
test('existing maps retain cross-map bridge routes for ground and outer sea routes',()=>{
  for(const id of ['river','desert','industry']){
    const m=layouts.makeMap(id);
    for(let b=1;b<5;b++){
      assert.equal(feedback.check(m,{},m.spawns[0],m.spawns[b]).reachable,true,`${id}: land ${b}`);
      assert.equal(feedback.check(m,{naval:true},m.navalUnitSpawns[0],m.navalUnitSpawns[b]).reachable,true,`${id}: water ${b}`);
    }
  }
});
test('mixed selection feedback explicitly distinguishes accepted and preserved orders',()=>{
  assert.equal(feedback.format({accepted:[1],rejected:[]}), '');
  const msg=feedback.format({accepted:[2,3],rejected:[{id:1,reason:'separated-land'}],queued:true});
  assert.match(msg,/2 个单位已加入路线/);assert.match(msg,/1 个单位未接受/);assert.match(msg,/保留原有命令/);
});

function game(){
  require('../src/data.js');require('../src/roster.js');require('../src/equipment.js');require('../src/sim.js');
  const g=new WarSim.Game({map:'archipelago',faction:'chn',enemies:4,buffs:['vision']});
  g.teams.forEach(t=>t.aiClock=1e9);return g;
}
test('Game rejects cross-island move without changing old order, path, queue or command effects',()=>{
  const g=game(),a=g.entities.find(e=>e.team===0&&e.kind==='tank'),p=g.map.spawns[0],far=g.map.spawns[1];
  assert.equal(g.command([a.id],p.x+200,p.y+200).accepted.length,1);
  a.path=[{x:a.x+10,y:a.y+10}];a.orderQueue=[{x:p.x+100,y:p.y+180,attack:false}];
  const old={order:a.order,path:a.path,queue:a.orderQueue},count=g.effects.length;
  const result=g.command([a.id],far.x+200,far.y+200);
  assert.deepEqual(result.accepted,[]);assert.equal(result.rejected[0].reason,'separated-land');
  assert.equal(a.order,old.order);assert.equal(a.path,old.path);assert.equal(a.orderQueue,old.queue);assert.equal(g.effects.length,count);
});
test('Game mixed ground and flight selection partially accepts cross-island command',()=>{
  const g=game(),a=g.entities.find(e=>e.team===0&&e.kind==='tank'),plane=g.spawn(0,'fighter',a.x,a.y),far=g.map.spawns[1];
  const result=g.command([a.id,plane.id],far.x+200,far.y+200);
  assert.deepEqual(result.accepted,[plane.id]);assert.equal(result.rejected[0].id,a.id);
  assert.ok(plane.order);assert.match(feedback.format(result),/1 个单位接受指令；1 个单位未接受/);
});
test('Game Shift rejects unreachable waypoints and reports a full queue without false acceptance',()=>{
  const g=game(),a=g.entities.find(e=>e.team===0&&e.kind==='tank'),p=g.map.spawns[0],far=g.map.spawns[1];
  g.command([a.id],p.x+200,p.y+200);const old=a.order;
  const result=g.command([a.id],far.x+200,far.y+200,false,null,{queue:true});
  assert.equal(result.accepted.length,0);assert.equal(a.order,old);assert.equal(a.orderQueue.length,0);
  for(let i=0;i<16;i++)assert.equal(g.command([a.id],p.x+200,p.y+210,false,null,{queue:true}).accepted.length,1);
  const full=g.command([a.id],p.x+200,p.y+210,false,null,{queue:true});
  assert.equal(full.accepted.length,0);assert.equal(full.rejected[0].reason,'queue-full');assert.equal(a.orderQueue.length,16);
  assert.match(feedback.format(full),/队列已满（最多 16 个后续点）/);
});
test('Game explicit attack can hit across disconnected land within weapon range',()=>{
  const g=game();g.entities=[];g.ore=[];
  const m=g.map;m.blocked=new Uint8Array(m.cols*m.rows);
  for(let y=0;y<m.rows;y++)m.blocked[y*m.cols+64]=1;
  g.spawn(0,'hq',400,400);g.spawn(1,'hq',5500,3500);
  const a=g.spawn(0,'arty',3000,2000),b=g.spawn(1,'tank',3200,2000);b.disabled=999;
  assert.equal(feedback.check(m,WarData.U[a.kind],a,b).reachable,false);
  assert.ok(g.engagementDistance(a,b)<=WarData.U[a.kind].range);
  const result=g.command([a.id],b.x,b.y,true,b.id);
  assert.deepEqual(result.accepted,[a.id]);assert.equal(result.rejected.length,0);
  require('./combat-preparation.cjs').advanceUntil(g,()=>b.hp<b.maxHp,8);
  assert.ok(b.hp<b.maxHp,'cross-water ranged attack must still inflict damage');
});
