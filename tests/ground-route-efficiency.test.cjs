const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data.js');require('../src/roster.js');require('../src/equipment.js');require('../src/sim.js');
const {Game}=WarSim,{COLS,T}=WarData;
function arena(){const g=new Game({seed:712,enemies:1,map:'desert',buffs:['vision'],abilities:false});g.entities=[];g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(1);g.spawn(0,'hq',300,300);g.spawn(1,'hq',5500,3500);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});return g;}
function relocate(kind,angle,ore=false){
 const g=arena(),e=g.spawn(0,kind,1200,1200);e.angle=angle;if(ore)g.ore=[{id:0,x:1800,y:1200,amount:24000,initial:24000}];g.command([e.id],ore?2500:3000,1200);
 let reverse=0,switches=0,lastSign=0,elapsed=0;
 for(let i=0;i<1800&&e.order;i++){
  const x=e.x,y=e.y,a=e.angle;g.step(.05);elapsed=g.time;const travel=Math.hypot(e.x-x,e.y-y),sign=travel>.01?((e.x-x)*Math.cos(e.angle)+(e.y-y)*Math.sin(e.angle)<0?-1:1):0;
  if(sign<0)reverse+=travel;if(sign&&lastSign&&sign!==lastSign)switches++;if(sign)lastSign=sign;
  assert.ok(travel<=g.effectiveSpeed(e)*.05+1e-6,'speed remains bounded');assert.ok(Math.abs(WarVehicleMotion.angleDelta(e.angle,a))<=WarVehicleMotion.profile(e).turn*.05+1e-6,'turn remains bounded');assert.ok(WarNavigationFootprints.terrain(g,e,e.x,e.y,e.angle),'full hull remains on legal terrain');
  if(ore)assert.ok(Math.hypot(e.x-1800,e.y-1200)>=48+g.navigationRadius(e)+4-1e-6,'mine clearance remains intact');
 }
 assert.equal(e.order,null,'reaches the original destination');assert.ok(Math.hypot(e.x-(ore?2500:3000),e.y-1200)<6);return{elapsed,reverse,switches};
}
for(const kind of ['tank','recon_vehicle'])test(`${kind}: a long order turns toward travel instead of reversing the entire route`,()=>{const forward=relocate(kind,0),back=relocate(kind,Math.PI);assert.ok(back.elapsed<forward.elapsed+5,JSON.stringify({forward,back}));assert.ok(back.reverse<100,'reverse is available for escape, not the entire 1800u relocation');});
test('mine route hints use the same clearance as local motion and do not alternate forward/reverse repeatedly',()=>{const g=arena(),e=g.spawn(0,'tank',1200,1200);g.ore=[{id:0,x:1800,y:1200,amount:24000}];const blocked=WarNavigationFootprints.pathGrid(g,e).blocked,r=48+g.navigationRadius(e)+4;for(let y=23;y<=26;y++)for(let x=35;x<=39;x++){const distance=Math.hypot((x+.5)*T-1800,(y+.5)*T-1200);if(distance<r)assert.equal(blocked[y*COLS+x],1,'A* must not suggest a node that local movement cannot enter');}const result=relocate('tank',0,true);assert.ok(result.switches<=4,JSON.stringify(result));});
for(const choke of [false,true])test(`24 mixed vehicles ${choke?'through a narrow opening':'in the open'} settle without excessive gear changes or collisions`,()=>{
 const g=arena(),kinds=['tank','ifv','arty','rocket','aa','assault_gun'];if(choke)for(let y=0;y<WarData.ROWS;y++)for(let x=30;x<33;x++)if(y<23||y>26)g.map.blocked[y*COLS+x]=1;
 const units=Array.from({length:24},(_,i)=>g.spawn(0,kinds[i%6],600+(i%6)*120,850+Math.floor(i/6)*120));units.forEach(e=>e.angle=0);g.command(units.map(e=>e.id),2700,1200);const goals=units.map(e=>({...e.order})),signs=new Map();let switches=0;
 const budget=choke?130:85;
 for(let i=0;i<budget*20&&units.some(e=>e.order);i++){
  const old=units.map(e=>({x:e.x,y:e.y,angle:e.angle}));g.step(.05);
  for(let j=0;j<units.length;j++){
   const e=units[j],p=old[j],dx=e.x-p.x,dy=e.y-p.y,travel=Math.hypot(dx,dy),sign=travel>.01?(dx*Math.cos(e.angle)+dy*Math.sin(e.angle)<0?-1:1):0;
   if(sign&&signs.has(e.id)&&sign!==signs.get(e.id))switches++;if(sign)signs.set(e.id,sign);
   assert.ok(FinitePosition(e));assert.ok(WarNavigationFootprints.terrain(g,e,e.x,e.y,e.angle));assert.ok(travel<=g.effectiveSpeed(e)*.05+1e-6);assert.ok(Math.abs(WarVehicleMotion.angleDelta(e.angle,p.angle))<=WarVehicleMotion.profile(e).turn*.05+1e-6);
   for(let k=j+1;k<units.length;k++){const o=units[k];assert.ok(Math.hypot(e.x-o.x,e.y-o.y)>=g.navigationRadius(e)+g.navigationRadius(o)+2-1e-6,'full model navigation envelopes remain separate');}
  }
 }
 assert.ok(units.every((e,i)=>!e.order&&Math.hypot(e.x-goals[i].x,e.y-goals[i].y)<6),'every original berth reached');assert.ok(switches<(choke?200:100),`observed ${switches} direction changes`);
 const positions=units.map(e=>({x:e.x,y:e.y}));for(let i=0;i<40;i++)g.step(.05);assert.deepEqual(units.map(e=>({x:e.x,y:e.y})),positions,'arrival settles without drift or further crowd pushing');
});
function FinitePosition(e){return Number.isFinite(e.x)&&Number.isFinite(e.y);}
