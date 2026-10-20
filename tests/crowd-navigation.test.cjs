const test=require('node:test'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
require('../src/data.js');require('../src/roster.js');require('../src/equipment.js');require('../src/sim.js');
const {Game}=WarSim,{COLS,ROWS,T,U}=WarData;
function arena(){const g=new Game({enemies:1,map:'desert',buffs:['vision'],abilities:false});g.entities=[];g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(1);g.spawn(0,'hq',300,300);g.spawn(1,'hq',5500,3500);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});return g;}
function scenario(count,type='open'){
 const g=arena(),units=[],kinds=['tank','ifv','arty','rocket','aa','assault_gun'];
 for(let i=0;i<count;i++)units.push(g.spawn(0,kinds[i%kinds.length],800+(i%6)*55,950+Math.floor(i/6)*55));
 if(type==='choke')for(let y=0;y<ROWS;y++)for(let x=30;x<33;x++)if(y<23||y>26)g.map.blocked[y*COLS+x]=1;
 if(type==='obstacles'){g.spawn(0,'factory',1450,1100);g.spawn(0,'power',1450,1350);g.ore=[{id:0,x:1700,y:1180,amount:24000,initial:24000}];}
 if(type==='crossing')for(let i=0;i<count;i++)units.push(g.spawn(0,kinds[i%kinds.length],2300+(i%6)*55,950+Math.floor(i/6)*55));
 g.command(units.slice(0,count).map(e=>e.id),2400,1200);
 if(type==='crossing')g.command(units.slice(count).map(e=>e.id),900,1200);
 const seconds=type==='choke'?240:180,ticks=seconds*20;
 const goals=new Map(units.map(e=>[e.id,{...e.order}])),cost=[],positions=new Map(),waiting=new Map(),resumed=new Set();let maxOverlap=0,invalidTerrainSteps=0,maxContinuousWaitSeconds=0;
 // Preserve the legacy 55u overlapping model spawn layout. Full-size footprints
 // and passable arrival aisles require longer travel than the former tiny circles.
 for(let i=0;i<ticks;i++){if(i===ticks-100)for(const e of units)positions.set(e.id,{x:e.x,y:e.y});const t=performance.now();g.step(.05);cost.push(performance.now()-t);
  if(i%20===0)for(const e of units){const previous=waiting.get(e.id),stopped=e.order&&previous&&Math.hypot(e.x-previous.x,e.y-previous.y)<2,seconds=stopped?previous.seconds+1:0;if(previous?.seconds>1&&!stopped)resumed.add(e.id);maxContinuousWaitSeconds=Math.max(maxContinuousWaitSeconds,seconds);waiting.set(e.id,{x:e.x,y:e.y,seconds});}
  for(let a=0;a<units.length;a++){const e=units[a];if(g.map.blocked[Math.floor(e.y/T)*COLS+Math.floor(e.x/T)])invalidTerrainSteps++;for(let b=a+1;b<units.length;b++){const o=units[b];maxOverlap=Math.max(maxOverlap,e.r+o.r-Math.hypot(e.x-o.x,e.y-o.y));}}
 }
 const arrived=units.filter(e=>!e.order&&Math.hypot(e.x-goals.get(e.id).x,e.y-goals.get(e.id).y)<35).length;
 const stuck=units.filter(e=>e.order&&Math.hypot(e.x-positions.get(e.id).x,e.y-positions.get(e.id).y)<8).length;
 cost.sort((a,b)=>a-b);return{game:g,units,goals,metrics:{type,count:units.length,seconds,arrived,stuck,maxOverlap,invalidTerrainSteps,maxContinuousWaitSeconds,resumedUnits:resumed.size,stepMeanMs:cost.reduce((a,b)=>a+b,0)/cost.length,stepP95Ms:cost[Math.floor(cost.length*.95)]}};
}
function stress(count){
 const g=arena(),units=[],kinds=['tank','ifv','arty','rocket','aa','assault_gun'];
 for(let y=0;y<ROWS;y++)for(let x=54;x<56;x++)if(y<30||y>35)g.map.blocked[y*COLS+x]=1;
 for(let i=0;i<count;i++)units.push(g.spawn(0,kinds[i%kinds.length],800+(i%20)*55,500+Math.floor(i/20)*55));
 g.entities.find(e=>e.team===1).hp=1e12;g.command(units.map(e=>e.id),4200,2200);
 const costs=[];let maxOverlap=0,invalidTerrainSteps=0,invalidNumbers=0,maxSpeedExcess=0,minPathBudget=10;
 for(let tick=0;tick<1200;tick++){
  const old=units.map(e=>[e.x,e.y]),start=performance.now();g.step(.05);costs.push(performance.now()-start);minPathBudget=Math.min(minPathBudget,g.pathBudget);
  for(let a=0;a<units.length;a++){const e=units[a];if(!Number.isFinite(e.x)||!Number.isFinite(e.y))invalidNumbers++;if(g.map.blocked[Math.floor(e.y/T)*COLS+Math.floor(e.x/T)])invalidTerrainSteps++;maxSpeedExcess=Math.max(maxSpeedExcess,Math.hypot(e.x-old[a][0],e.y-old[a][1])-g.effectiveSpeed(e)*.05);
   if(tick%10===0)for(let b=a+1;b<units.length;b++){const o=units[b];maxOverlap=Math.max(maxOverlap,e.r+o.r-Math.hypot(e.x-o.x,e.y-o.y));}}
 }
 costs.sort((a,b)=>a-b);return{count,seconds:60,arrived:units.filter(e=>!e.order).length,crossedBottleneck:units.filter(e=>e.x>56*T+e.r).length,maxOverlap,overlapSamplingSeconds:.5,invalidTerrainSteps,invalidNumbers,maxSpeedExcess,minPathBudget,stepMeanMs:costs.reduce((a,b)=>a+b,0)/costs.length,stepP95Ms:costs[Math.floor(costs.length*.95)],stepWorstMs:costs.at(-1)};
}
if(process.env.CROWD_STRESS){for(const count of [200,400])console.log(JSON.stringify(stress(count)));}
else if(process.env.CROWD_BASELINE){for(const [n,t]of [[24,'open'],[48,'open'],[48,'choke'],[24,'crossing'],[48,'obstacles']])console.log(JSON.stringify(scenario(n,t).metrics));}
else {
 // Finite acceleration/steering takes 198.7s in the choke fixture; retain the
 // other 180s budgets and every arrival/collision assertion.
 for(const [n,type]of [[24,'open'],[48,'open'],[48,'choke'],[24,'crossing'],[48,'obstacles']])test(`${type} ${n}: legacy 55u dense spawn and finite steering settle within ${type==='choke'?240:180}s`,()=>{const s=scenario(n,type);assert.equal(s.metrics.arrived,s.units.length,JSON.stringify(s.metrics));assert.equal(s.metrics.stuck,0);assert.equal(s.metrics.maxOverlap,0);assert.equal(s.metrics.invalidTerrainSteps,0);});
 test('repeated group orders keep the same slots and path instead of reshuffling or restarting A*',()=>{
  const g=arena(),units=Array.from({length:24},(_,i)=>g.spawn(0,'tank',800+(i%6)*55,950+Math.floor(i/6)*55)),ids=units.map(e=>e.id);
  g.command(ids,2400,1200);const goals=units.map(e=>({...e.order}));for(let i=0;i<60;i++)g.step(.05);const paths=units.map(e=>e.path);
  g.command(ids,2400,1200);assert.deepEqual(units.map(e=>e.order),goals);units.forEach((e,i)=>assert.equal(e.path,paths[i]));
  g.command([...ids,ids[0]],2400,1200);assert.equal(g.commandFeedback.accepted.length,24);
  for(let i=0;i<3600;i++){if(i%10===0)g.command(ids,2400,1200);g.step(.05);}assert.ok(units.every(e=>!e.order));
 });
 test('Shift keeps the final waypoint and group stops there without overlaps or residual motion',()=>{
  const g=arena(),units=Array.from({length:12},(_,i)=>g.spawn(0,'tank',800+(i%4)*60,1000+Math.floor(i/4)*60)),ids=units.map(e=>e.id);
  g.command(ids,1700,1000);g.command(ids,2300,1600,false,null,{queue:true});const final=units.map(e=>({...e.orderQueue[0]}));
  for(let i=0;i<1600;i++)g.step(.05);for(let i=0;i<units.length;i++){const e=units[i];assert.equal(e.order,null);assert.ok(Math.hypot(e.x-final[i].x,e.y-final[i].y)<6);}
  const positions=units.map(e=>[e.x,e.y]);for(let i=0;i<100;i++)g.step(.05);assert.deepEqual(units.map(e=>[e.x,e.y]),positions);
  for(const e of units)for(const o of units)if(e.id<o.id)assert.ok(Math.hypot(e.x-o.x,e.y-o.y)>=e.r+o.r);
 });
 test('terrain-clipped formation endpoints reserve separate real positions instead of collapsing onto one tile',()=>{
  const g=arena(),units=Array.from({length:24},(_,i)=>g.spawn(0,'tank',600+(i%6)*55,800+Math.floor(i/6)*55));
  for(let y=0;y<ROWS;y++)for(let x=25;x<COLS;x++)g.map.blocked[y*COLS+x]=1;
  g.command(units.map(e=>e.id),1160,1000);for(const e of units)for(const o of units)if(e.id<o.id)assert.ok(Math.hypot(e.order.x-o.order.x,e.order.y-o.order.y)>=e.r+o.r+14);
 });
 test('a formation ordered onto a factory settles around its actual footprint without entering the structure',()=>{
  const g=arena(),factory=g.spawn(0,'factory',1800,1200),units=Array.from({length:24},(_,i)=>g.spawn(0,'tank',800+(i%6)*55,950+Math.floor(i/6)*55));g.command(units.map(e=>e.id),factory.x,factory.y);
  for(let i=0;i<3600;i++){g.step(.05);for(const e of units)assert.ok(Math.hypot(e.x-factory.x,e.y-factory.y)>=e.r+factory.r);}
  assert.ok(units.every(e=>!e.order));
 });
 test('bottleneck waits for observed physical release: elapsed time never permits crossing a stationary player',()=>{
  const g=arena();g.map.blocked.fill(1);for(let x=5;x<80;x++)g.map.blocked[20*COLS+x]=0;
  const follower=g.spawn(0,'tank',800,984),driver=g.spawn(0,'tank',1000,984);follower.angle=driver.angle=0;g.beginDirectControl(driver.id);g.teams[0].aiClock=1e9;g.command([follower.id],1500,984);
  for(let i=0;i<500;i++)g.step(.05);assert.equal(driver.x,1000);assert.equal(driver.y,984);assert.ok(follower.x<=driver.x-driver.r-follower.r);assert.ok(follower.order,'timeout retains original business destination');assert.equal(follower.crowdWaiting?.id,driver.id);
  g.setDirectInput({forward:1,yaw:0});for(let i=0;i<260;i++)g.step(.05);g.setDirectInput({});assert.ok(driver.x>1600);assert.equal(follower.order,null);assert.ok(Math.abs(follower.x-1500)<6);
  assert.equal(follower.crowdWaiting,null,'arrival clears the observation rather than leaving a stale blocker');
 });
 test('naval groups keep their full hull inside navigable water and never cross the opposite land shore',()=>{
  const g=arena();for(let y=8;y<19;y++)for(let x=8;x<80;x++)g.map.navalBlocked[y*COLS+x]=0;
  const units=Array.from({length:12},(_,i)=>g.spawn(0,'destroyer',700+(i%4)*110,500+Math.floor(i/4)*110));g.command(units.map(e=>e.id),2200,650);
  for(let i=0;i<3600;i++){g.step(.05);for(const e of units){
   const b=WarNavigationFootprints.bounds[e.kind+'_'+g.teams[e.team].faction],c=Math.cos(e.angle),s=Math.sin(e.angle);
   // The full measured hull, including its offset from entity origin, replaces
   // the old combat-radius circle (which is wider but much shorter than a ship).
   for(const x of [b[3],b[4]])for(const z of [b[5],b[6]]){const wx=e.x+c*x-s*z,wy=e.y+s*x+c*z;assert.equal(g.map.navalBlocked[Math.floor(wy/T)*COLS+Math.floor(wx/T)],0,'actual hull corner stays inside water');}
  }}
  assert.ok(units.every(e=>!e.order));
 });
 test('long vehicle reverses out of a wall corner before turning, without crossing terrain or teleporting',()=>{
  const g=arena();for(let y=0;y<ROWS;y++)for(let x=30;x<33;x++)if(y<23||y>26)g.map.blocked[y*COLS+x]=1;
  const e=g.spawn(0,'ifv',1600.1493962283632,1067.2474280029624);e.angle=-1.6507613541257116;e.order={x:2084.1687927443377,y:374.95536573865854,attack:false,target:null};e.path=[{x:e.order.x,y:e.order.y}];let reversed=false;
  for(let i=0;i<1000;i++){const x=e.x,y=e.y,angle=e.angle;g.step(.05);if((e.x-x)*Math.cos(angle)+(e.y-y)*Math.sin(angle)<-.01&&Math.abs(e.angle-angle)<.001)reversed=true;assert.equal(WarNavigationFootprints.terrain(g,e,e.x,e.y,e.angle),true);assert.ok(Math.hypot(e.x-x,e.y-y)<=g.effectiveSpeed(e)*.05+1e-6);}
  assert.ok(reversed,'a constrained hull backs out while preserving its orientation');assert.equal(e.order,null,'the original destination is eventually reached');
 });
 test('bounded FIFO replanning serves high-ID waiters without bypassing occupied bottlenecks',()=>{
  const g=arena(),waiters=[];g.map.blocked.fill(1);
  for(let lane=0;lane<24;lane++){const row=8+lane*3;for(let x=5;x<80;x++)g.map.blocked[row*COLS+x]=0;const y=row*T+24;const e=g.spawn(0,'tank',800,y);g.spawn(0,'tank',1000,y);waiters.push(e);g.command([e.id],1500,y);}
  for(let i=0;i<160;i++){g.step(.05);assert.ok(g.pathBudget>=0&&g.crowdPathBudget>=0);}
  assert.ok(waiters.every(e=>e.crowdRepathCount>0),'every wait lane, including the highest ID, receives actual replanning');
  assert.ok(waiters.at(-1).crowdRepathCount>=waiters[0].crowdRepathCount-1,'early IDs cannot monopolize a full round');
  assert.ok(waiters.every(e=>e.x<1000-34&&e.order));
 });
}
module.exports={arena,scenario};
