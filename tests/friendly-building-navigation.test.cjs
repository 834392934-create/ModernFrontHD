const test=require('node:test'),assert=require('node:assert/strict');
for(const f of ['data','roster','equipment','sim'])require('../src/'+f);
const {U,T,COLS,ROWS}=WarData;
function arena(){const g=new WarSim.Game({map:'desert',faction:'chn',enemies:1,buffs:['vision']});g.entities=[];g.effects=[];g.ore=[];g.nodes=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.map.tiles.fill(0);g.ai=()=>{};g.teams.forEach(t=>{t.queue=[];t.buildQueue=[];t.money=0;});g.spawn(0,'hq',300,300);g.spawn(1,'hq',5700,3500);return g;}
function advance(g,e,seconds=120){for(let i=0;i<seconds*20;i++){const old={x:e.x,y:e.y};g.step(.05);assert.ok(Math.hypot(e.x-old.x,e.y-old.y)<=g.effectiveSpeed(e)*.05+1e-7,'no teleport');for(const o of g.entities)if(o.structure&&o.hp>0&&g.navigationLayer(e,o))assert.ok(Math.hypot(e.x-o.x,e.y-o.y)>=o.r+g.navigationRadius(e)+8-1e-7,'no building penetration');}}
for(const kind of ['tank','carrier','destroyer','submarine','heli','orbital']){
 test(kind+': clears the whole friendly building wall by its domain movement',()=>{
  const g=arena(),e=g.spawn(0,kind,1000,1400);if(kind==='heli')e.altitude=25;if(kind==='submarine')e.altitude=-22;
  for(let y=500;y<=2300;y+=120)g.spawn(0,U[kind].naval?'navalyard':'factory',1500,y);
  g.command([e.id],2200,1400);advance(g,e);assert.equal(e.order,null);assert.ok(Math.hypot(e.x-2200,e.y-1400)<15);
 });
 test(kind+': construction on a pending destination relocates its stop and retains Shift order',()=>{
  const g=arena(),e=g.spawn(0,kind,1000,1400);if(kind==='heli')e.altitude=25;if(kind==='submarine')e.altitude=-22;
  g.command([e.id],2200,1400);g.command([e.id],2700,1400,false,null,{queue:true});g.spawn(0,U[kind].naval?'navalyard':'factory',2200,1400);
  advance(g,e);assert.equal(e.order,null);assert.ok(Math.hypot(e.x-2700,e.y-1400)<15);
 });
}
for(const [kind,altitude]of [['heli',300],['submarine',-100],['orbital',4000]])test(kind+': a separated altitude layer can cross directly above/below ground structures',()=>{
 const g=arena(),e=g.spawn(0,kind,1000,1400),control=arena(),other=control.spawn(0,kind,1000,1400);e.altitude=other.altitude=altitude;g.spawn(0,'factory',1500,1400);g.command([e.id],2200,1400);control.command([other.id],2200,1400);advance(g,e,60);advance(control,other,60);assert.equal(e.order,null);assert.ok(Math.hypot(e.x-other.x,e.y-other.y)<1e-8);assert.equal(e.crowdRepathCount||0,0);
});
test('building-aware paths are invalidated by removal, without changing terrain water masks',()=>{
 const g=arena(),e=g.spawn(0,'tank',1000,1400),b=g.spawn(0,'factory',1500,1400),index=Math.floor(b.y/T)*COLS+Math.floor(b.x/T);const before=g.map.blocked.slice();assert.equal(WarNavigationFootprints.pathGrid(g,e).blocked[index],1);b.hp=0;assert.equal(WarNavigationFootprints.pathGrid(g,e).blocked[index],0);assert.deepEqual(g.map.blocked,before);
});
test('matching movers reuse a tick-local grid; height, construction and next tick invalidate it',()=>{
 const g=arena(),a=g.spawn(0,'heli',1000,1400),b=g.spawn(0,'heli',1000,1600);a.altitude=b.altitude=25;g.spawn(0,'factory',1500,1400);const first=WarNavigationFootprints.pathGrid(g,a);assert.equal(WarNavigationFootprints.pathGrid(g,b),first);b.altitude=300;assert.notEqual(WarNavigationFootprints.pathGrid(g,b),first);g.spawn(0,'factory',1800,1400);const built=WarNavigationFootprints.pathGrid(g,a);assert.notEqual(built,first);g.tick++;assert.notEqual(WarNavigationFootprints.pathGrid(g,a),built);
});
test('long clear aerial routes avoid distance-sized spatial queries and terrain sampling',()=>{
 const g=arena(),e=g.spawn(0,'fighter',500,1400);e.altitude=1000;e.order={x:5500,y:1400};g.spawn(0,'factory',2500,1400);let queries=0,terrainChecks=0;const query=g.spatial.query,terrain=WarNavigationFootprints.terrain;g.spatial.query=()=>{queries++;throw Error('normal air route queried distant buckets');};WarNavigationFootprints.terrain=(...args)=>{terrainChecks++;return terrain(...args);};
 try{for(let i=0;i<1000;i++){assert.equal(WarNavigationFootprints.buildingSegmentClear(g,e,e.order),true);assert.equal(WarCrowdNavigation.segment(g,e,e.order),true);}assert.equal(queries,0);assert.equal(terrainChecks,1000,'one endpoint check per segment, independent of distance');e.altitude=25;assert.equal(WarNavigationFootprints.buildingSegmentClear(g,e,e.order),false,'low aircraft detects physical overlap before flight control climbs above it');}
 finally{g.spatial.query=query;WarNavigationFootprints.terrain=terrain;}
});
test('a physically sealed wall retains the order without tunnelling; demolition restores passage',()=>{
 const g=arena(),e=g.spawn(0,'tank',1000,1400),wall=[];for(let y=0;y<ROWS*T+100;y+=100)wall.push(g.spawn(0,'factory',1500,y));g.command([e.id],2200,1400);advance(g,e,10);assert.ok(e.order);assert.ok(e.x<1500);for(const b of wall)if(Math.abs(b.y-1400)<250)b.hp=0;advance(g,e,90);assert.equal(e.order,null);
});
test('harvester selects a legal alternate mine approach and delivers cargo around a blocked original entrance',()=>{
 const g=arena(),e=g.spawn(0,'harvester',900,1400);g.spawn(0,'refinery',700,1400);g.ore=[{id:91,x:1800,y:1400,amount:12000,initial:12000}];g.spawn(0,'power',1725,1435);advance(g,e,180);assert.ok(g.teams[0].harvested>0);assert.ok(g.ore[0].amount<12000);assert.ok(e.mineApproach);assert.ok(Math.hypot(e.mineApproach.x-1800,e.mineApproach.y-1400)<=160);
});
for(const kind of ['tank','destroyer','heli','orbital'])test(kind+': production spawns clear of neighbors and obeys a rally behind friendly buildings',()=>{
 const g=arena(),prod=g.spawn(0,U[kind].producer,1000,1400);for(let y=900;y<=1900;y+=120)g.spawn(0,U[kind].naval?'navalyard':'factory',1500,y);prod.rally={x:2300,y:1400};g.teams[0].queue=[{kind,remaining:0,paid:0}];g.step(.05);const e=g.entities.find(o=>!o.structure&&o.kind===kind);assert.ok(e);assert.equal(g.teams[0].queue.length,0);advance(g,e);assert.equal(e.order,null);assert.ok(Math.hypot(e.x-2300,e.y-1400)<15);
});
test('production waits when every exit is occupied and resumes after actual space is released',()=>{
 const g=arena(),prod=g.spawn(0,'factory',1000,1400),blockers=[];for(let y=800;y<=2000;y+=90)for(let x=400;x<=1600;x+=90)if(Math.hypot(x-prod.x,y-prod.y)>30)blockers.push(g.spawn(0,'factory',x,y));g.teams[0].queue=[{kind:'tank',remaining:0,paid:0}];for(let i=0;i<30;i++)g.step(.05);assert.equal(g.teams[0].queue.length,1);assert.ok(!g.entities.some(e=>e.kind==='tank'));for(const b of blockers)b.hp=0;g.step(.05);assert.equal(g.teams[0].queue.length,0);assert.ok(g.entities.some(e=>e.kind==='tank'));
});
test('every roster unit completes a move past a friendly structure with its existing domain/footprint',()=>{
 for(const kind of Object.keys(U)){
  const g=arena(),e=g.spawn(0,kind,1000,1400);g.entities.find(o=>o.team===1).hp=1e12;g.spawn(0,U[kind].naval?'navalyard':'factory',1500,1400);g.command([e.id],2200,1400);
  advance(g,e,90);assert.equal(e.order,null,kind);assert.ok(Math.hypot(e.x-2200,e.y-1400)<(WarAircraftFlight.fixed(e)?350:15),kind);
 }
});
