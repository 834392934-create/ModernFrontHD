const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data');require('../src/roster');require('../src/equipment');require('../src/sim');
const {Game}=WarSim,{U,B,MAPS,COLS,ROWS,T}=WarData,F=WarNavigationFootprints;
function arena(){const g=new Game({map:'desert',enemies:1,buffs:['vision']});g.entities=[];g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});return g;}
test('FPS rejects a shore that intersects the full hull while the combat circle remains on water',()=>{
 const g=arena(),e=g.spawn(0,'destroyer',1400,1500);for(let y=0;y<ROWS;y++)for(let x=30;x<COLS;x++)g.map.navalBlocked[y*COLS+x]=1;
 assert.ok(e.x+e.r<30*T);assert.equal(F.terrain(g,e,e.x,e.y),false);assert.equal(g.directPositionFree(e,e.x,e.y),false);
});
test('stationary manual yaw cannot rotate a long hull through the shoreline',()=>{
 const g=arena(),e=g.spawn(0,'destroyer',1400,1500);for(let y=0;y<ROWS;y++)for(let x=30;x<COLS;x++)g.map.navalBlocked[y*COLS+x]=1;
 e.angle=Math.PI/2;assert.equal(F.terrain(g,e,e.x,e.y),true);g.beginDirectControl(e.id);g.setDirectInput({yaw:0});g.stepDirectControl(e,.05);
 assert.equal(F.terrain(g,e,e.x,e.y),true);assert.deepEqual([e.x,e.y],[1400,1500]);
});
test('a large yaw cannot sweep a hull through land even when both endpoints fit',()=>{
 const g=arena(),e=g.spawn(0,'destroyer',1400,1500);for(let y=0;y<ROWS;y++)for(let x=30;x<COLS;x++)g.map.navalBlocked[y*COLS+x]=1;
 e.angle=Math.PI/2;assert.equal(F.terrain(g,e,e.x,e.y,-Math.PI/2),true);g.beginDirectControl(e.id);g.setDirectInput({yaw:-Math.PI/2});g.stepDirectControl(e,.05);
 assert.equal(F.terrain(g,e,e.x,e.y),true);assert.ok(Math.abs(e.angle+Math.PI/2)>.1,'blocked intermediate rotation retains the last valid heading');
 g.map.navalBlocked.fill(0);g.stepDirectControl(e,.05);assert.ok(Math.abs(Math.sin(e.angle+Math.PI/2))<1e-8,'unobstructed turn reaches the requested heading');
});
test('submerged manual turns also keep their complete hull in navigable water',()=>{
 const g=arena(),e=g.spawn(0,'submarine',1400,1500);for(let y=0;y<ROWS;y++)for(let x=30;x<COLS;x++)g.map.navalBlocked[y*COLS+x]=1;
 e.angle=Math.PI/2;g.beginDirectControl(e.id);g.setDirectInput({yaw:0,flightEnabled:true});
 for(let tick=0;tick<100;tick++){g.stepDirectControl(e,.05);assert.equal(F.terrain(g,e,e.x,e.y),true);}
 assert.ok(e.angle>.2);assert.deepEqual([e.x,e.y],[1400,1500]);
});
test('registered envelopes have finite, bounded scan extents across all kinds and factions',()=>{
 assert.ok(Object.keys(F.bounds).length>=77*6);for(const [id,b] of Object.entries(F.bounds)){assert.ok(b.every(Number.isFinite),id);assert.ok(b[0]>0&&b[0]<=160,id);assert.ok(b[4]>b[3]&&b[6]>b[5],id);}
});
test('rotated terrain box catches an interior blocked cell, not just sampled corners',()=>{
 const g=arena(),e=g.spawn(0,'carrier',2200,1500);e.angle=.57;const cx=Math.floor(e.x/T),cy=Math.floor(e.y/T);g.map.navalBlocked[cy*COLS+cx]=1;
 assert.equal(F.terrain(g,e,e.x,e.y),false);g.map.navalBlocked.fill(0);assert.equal(F.terrain(g,e,e.x,e.y),true);
 assert.equal(F.terrain(g,e,1,1),false);
});
test('all initial fleet slots can leave their coast without crossing terrain in four maps',()=>{
 for(const map of MAPS){const g=new Game({map:map.id,enemies:4,buffs:['vision']});g.teams.forEach(t=>{t.aiClock=1e9;t.attackAt=1e9;t.money=0;});const ships=g.entities.filter(e=>e.kind==='destroyer'),starts=ships.map(e=>[e.x,e.y]);
  for(const e of ships){assert.equal(F.terrain(g,e,e.x,e.y),true,`${map.id}/${e.team} initial hull`);g.command([e.id],e.x+(e.x>5500?-280:280),e.y);}
  for(let tick=0;tick<400;tick++){g.step(.05);for(const e of ships)assert.equal(F.terrain(g,e,e.x,e.y),true,`${map.id}/${e.team} shoreline crossing`);}
  for(let i=0;i<ships.length;i++)assert.ok(Math.hypot(ships[i].x-starts[i][0],ships[i].y-starts[i][1])>40,`${map.id}/${i} leaves initial berth`);
 }
});
test('later commands reserve queued final destinations and preserve attack metadata',()=>{
 const g=arena(),a=g.spawn(0,'destroyer',1000,1000),b=g.spawn(0,'destroyer',1300,1000),target=g.spawn(1,'tank',4000,1500);
 g.command([a.id],2200,1400);g.command([a.id],3000,1500,true,target.id,{queue:true});const last=a.orderQueue.at(-1);assert.equal(last.attack,true);assert.equal(last.target,target.id);
 g.command([b.id],last.x,last.y);assert.ok(Math.hypot(b.order.x-last.x,b.order.y-last.y)>=g.navigationRadius(a)+g.navigationRadius(b)+32);
 const restored=Game.load(g.save()),copy=restored.entities.find(e=>e.id===a.id);assert.deepEqual(copy.orderQueue,a.orderQueue);assert.equal(restored.navigationRadius(copy),g.navigationRadius(a));
});
test('different height layers do not reserve each other\'s projected berth',()=>{
 const g=arena(),a=g.spawn(0,'destroyer',2000,1500),b=g.spawn(0,'fighter',1000,1500);assert.equal(g.navigationLayer(a,b),false);g.command([b.id],a.x,a.y);assert.deepEqual({x:b.order.x,y:b.order.y},{x:a.x,y:a.y});
});
test('consecutive production placements exclude full hulls already spawned this tick',()=>{
 const g=arena(),yard=g.spawn(0,'navalyard',2200,1500),p=g.freeSpawn(yard,'carrier');assert.ok(p);const a=g.spawn(0,'carrier',p.x,p.y),q=g.freeSpawn(yard,'carrier');assert.ok(q);
 assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>=2*g.navigationRadius(a)+12);assert.equal(F.terrain(g,a,q.x,q.y),true);
 g.map.navalBlocked.fill(1);assert.equal(g.freeSpawn(yard,'carrier'),null);
});
test('loaded collision radius comes from the registered definition, not oversized save data',()=>{
 const g=new Game({map:'desert',enemies:1}),save=g.save();for(const e of save.entities)e.r=1e9;const restored=Game.load(save);
 for(const e of restored.entities)assert.equal(e.r,(U[e.kind]||B[e.kind]).r);
});
test('a batch with no navigable hull location is rejected with bounded terrain work',()=>{
 const g=arena();g.map.navalBlocked.fill(1);const ships=Array.from({length:12},()=>g.spawn(0,'carrier',1000,1000));let calls=0;const original=F.terrain;
 F.terrain=(...args)=>{calls++;return original(...args);};let report;
 try{report=g.command(ships.map(e=>e.id),3000,2000);}finally{F.terrain=original;}
 assert.ok(calls<500000,`no-space batch used ${calls} terrain queries`);assert.equal(report.accepted.length,0);assert.equal(report.rejected.length,ships.length);
});
