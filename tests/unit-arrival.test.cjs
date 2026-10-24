const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
global.THREE=require('../assets/vendor/three.min.js');
for(const file of ['data','roster','equipment','maps-large','command-feedback','operator-weapons','sim'])require('../src/'+file);
// Keep the production registration order: bounds must include every procedural override.
const modelModules=['models3d','models-tanks','models-vehicles','models-air','models-naval','models-space','model-detail','models-roster','models-reinforcements-ground-naval','models-reinforcements-air-space','models-tactical-ground-naval','models-tactical-air-space','models-depth-wave','models-altitude-wave','models-buildings','models-defense-wave','models-operator'];
for(const file of modelModules)require('../src/'+file);
const {Game}=WarSim,{U,F}=WarData,cache=new Map();
const imported={destroyer_usa:'assets/models/burke.glb',heli_usa:'assets/models/ah64.glb',heli_kor:'assets/models/ah64.glb',tank_rus:'assets/models/t90m.glb'};
function bounds(kind,faction='chn'){
 const key=kind+'_'+faction;if(cache.has(key))return cache.get(key);
 const model=WarModels.create(kind,faction);model.scale.setScalar(model.userData.scale);model.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(model),radius=Math.hypot(Math.max(Math.abs(b.min.x),Math.abs(b.max.x)),Math.max(Math.abs(b.min.z),Math.abs(b.max.z)));
 const value={kind,faction,combatRadius:U[kind].r,scale:model.userData.scale,minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z,length:b.max.x-b.min.x,width:b.max.z-b.min.z,height:b.max.y-b.min.y,horizontalRadius:radius,importedReplacement:imported[key]||null,measurement:imported[key]?'procedural-fallback-awaiting-imported-GPU-bounds':'actual-procedural-model'};
 assert.ok(Object.values(value).filter(v=>typeof v==='number').every(Number.isFinite),key+' has finite geometry');cache.set(key,value);return value;
}
function corners(e,faction='chn'){
 const b=bounds(e.kind,faction),c=Math.cos(e.angle),s=Math.sin(e.angle);
 return [[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ]].map(([x,z])=>({x:e.x+c*x-s*z,y:e.y+s*x+c*z}));
}
function overlaps(g,a,b,faction='chn'){
 const A=bounds(a.kind,faction),B=bounds(b.kind,faction),ah=g.entityAltitude(a),bh=g.entityAltitude(b);
 if(Math.min(ah+A.maxY,bh+B.maxY)-Math.max(ah+A.minY,bh+B.minY)<=.01)return false;
 const p=corners(a,faction),q=corners(b,faction);
 for(const angle of [a.angle,a.angle+Math.PI/2,b.angle,b.angle+Math.PI/2]){const x=Math.cos(angle),y=Math.sin(angle),ap=p.map(c=>c.x*x+c.y*y),bp=q.map(c=>c.x*x+c.y*y);if(Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp))<=.01)return false;}
 return true;
}
function arena(kind,faction='chn'){
 const g=new Game({enemies:1,map:'desert',faction,buffs:['vision'],abilities:false});g.entities=[];g.ore=[];g.map.blocked.fill(U[kind].naval?1:0);g.map.navalBlocked.fill(U[kind].naval?0:1);
 g.spawn(0,'hq',300,300);const enemy=g.spawn(1,'hq',5800,3900);enemy.hp=enemy.maxHp=1e12;g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});return g;
}
function advance(g,seconds){for(let i=0;i<seconds*20;i++)g.step(.05);}
function assertSeparated(g,units){for(let a=0;a<units.length;a++)for(let b=a+1;b<units.length;b++)assert.equal(overlaps(g,units[a],units[b]),false,`${units[a].kind}/${units[b].kind} actual scaled OBB overlap at ${units[a].id}/${units[b].id}`);}
if(process.env.UNIT_BOUNDS_REPORT){
 const rows=[];for(const kind of Object.keys(U))for(const faction of Object.keys(F))rows.push(bounds(kind,faction));
 fs.writeFileSync('docs/reviews/unit-model-bounds.json',JSON.stringify({recordedAt:new Date().toISOString(),units:Object.keys(U).length,factions:Object.keys(F).length,modelModules,method:'THREE.Box3 on production-order procedural models after userData.scale. X/Z are horizontal, Y is height. horizontalRadius encloses all horizontal corners relative to entity origin, including asymmetric gun/antenna offsets.',limitations:'No GLB import or GPU: four replacement keys across three assets require parent actual imported-model checks. Bounds enclose present mesh geometry including thin antennae; not exact triangle intersection and not proof of visual authenticity. Animated barrel/rotor extremes require separate margins.',rows},null,2)+'\n');
 console.log('Measured '+rows.length+' unit/faction models');
}
if(!process.env.UNIT_BOUNDS_ONLY){
 for(const kind of ['tank','destroyer','submarine','fighter','orbital'])test(kind+': later command avoids an occupied actual-model berth and settles',()=>{
  const g=arena(kind),parked=g.spawn(0,kind,3000,1800),incoming=g.spawn(0,kind,2400,1800);parked.angle=.7;
  g.command([incoming.id],3000,1800);advance(g,70);assert.equal(incoming.order,null,'second batch must finish');assertSeparated(g,[parked,incoming]);if(WarAircraftFlight.fixed(parked))assert.deepEqual(parked.flight.anchor,{x:3000,y:1800});else assert.deepEqual([parked.x,parked.y,parked.angle],[3000,1800,.7]);
  const position=[incoming.x,incoming.y,incoming.angle];advance(g,3);if(WarAircraftFlight.fixed(incoming)){assert.notDeepEqual([incoming.x,incoming.y,incoming.angle],position,'fixed wing continues circling');assert.equal(incoming.flight.phase,'loiter');assertSeparated(g,[parked,incoming]);}else assert.deepEqual([incoming.x,incoming.y,incoming.angle],position,'arrival remains still');
 });
 for(const kind of ['tank','destroyer','submarine','fighter','orbital'])test(kind+': overlapping batches reserve different destinations while still travelling',()=>{
  const g=arena(kind),first=Array.from({length:3},(_,i)=>g.spawn(0,kind,1800,900+i*450)),second=Array.from({length:3},(_,i)=>g.spawn(0,kind,1200,1100+i*450));
  g.command(first.map(e=>e.id),3000,1800);advance(g,1);assert.ok(first.some(e=>e.order),'first batch is still travelling');g.command(second.map(e=>e.id),3000,1800);advance(g,90);
  const units=[...first,...second];assert.ok(units.every(e=>!e.order),'both live batches finish their distinct reservations');assertSeparated(g,units);
 });
 for(const kind of Object.keys(U))test(kind+': short group move completes with actual model separation',()=>{
  const g=arena(kind),units=Array.from({length:3},(_,i)=>g.spawn(0,kind,1800,1200+i*500));g.command(units.map(e=>e.id),2500,1700);advance(g,65);
  assert.ok(units.every(e=>!e.order),kind+' all three finish');assertSeparated(g,units);
  const poses=units.map(e=>[e.x,e.y,e.angle]);advance(g,2);if(WarAircraftFlight.fixed(units[0])){assert.notDeepEqual(units.map(e=>[e.x,e.y,e.angle]),poses,'fixed wing circles after arrival');assert.ok(units.every(e=>e.flight.phase==='loiter'&&e.flightSpeed>0));assertSeparated(g,units);}else assert.deepEqual(units.map(e=>[e.x,e.y,e.angle]),poses,'completed group remains still');
 });
 test('separated flight height layers can share a horizontal berth',()=>{
  const g=arena('fighter'),lower=g.spawn(0,'fighter',3000,1800),upper=g.spawn(0,'fighter',2400,1800);lower.altitude=100;upper.altitude=600;
  g.command([upper.id],3000,1800);advance(g,30);assert.equal(upper.order,null);assert.deepEqual(upper.flight.anchor,{x:3000,y:1800},'independent flight layers may circle the same horizontal point');assert.ok(upper.altitude>=590);assert.ok(lower.altitude<200);assertSeparated(g,[lower,upper]);
 });
 test('idle directly controlled player is not reassigned or pushed by arrival slots',()=>{
  const g=arena('tank'),player=g.spawn(0,'tank',3000,1800),incoming=g.spawn(0,'tank',2400,1800);g.beginDirectControl(player.id);g.teams[0].aiClock=1e9;
  const pose=[player.x,player.y,player.angle];g.command([player.id,incoming.id],3000,1800);assert.equal(player.order,null,'RTS selection must leave the directly controlled player read-only');advance(g,50);assert.equal(incoming.order,null);assert.deepEqual([player.x,player.y,player.angle],pose);assert.equal(g.directControl.id,player.id);assertSeparated(g,[player,incoming]);
 });
 test('three ships beside a shore retain room for a later ship to arrive and depart',()=>{
  const g=arena('destroyer'),{COLS,ROWS,T}=WarData;g.map.navalBlocked.fill(1);
  for(let y=8;y<19;y++)for(let x=8;x<80;x++)g.map.navalBlocked[y*COLS+x]=0;
  const left=g.spawn(0,'destroyer',2144,600),right=g.spawn(0,'destroyer',2480,600);
  g.command([left.id],2144,425);g.command([right.id],2480,426);advance(g,70);assert.equal(left.order,null);assert.equal(right.order,null);
  const parked=[left,right],poses=parked.map(e=>[e.x,e.y,e.angle]);
  for(const e of parked)assert.ok(e.y-g.navigationRadius(e)>=8*T,'berth includes complete turning clearance above the shore');
  const arrival=g.spawn(0,'destroyer',1800,500),all=[...parked,arrival];
  function travel(x,y){g.command([arrival.id],x,y);assert.ok(arrival.order,'the requested trip has an accepted destination');
   for(let tick=0;tick<1800;tick++){g.step(.05);assertSeparated(g,all);for(const ship of all)for(const p of corners(ship))assert.equal(g.map.navalBlocked[Math.floor(p.y/T)*COLS+Math.floor(p.x/T)],0,'whole actual hull remains in water');}
   assert.equal(arrival.order,null,'the trip completes without moving already parked ships');assert.deepEqual(parked.map(e=>[e.x,e.y,e.angle]),poses);
  }
  travel(2719,415);const docking=[arrival.x,arrival.y,arrival.angle];advance(g,3);assert.deepEqual([arrival.x,arrival.y,arrival.angle],docking,'ship rests after docking');travel(1800,700);
 });
}
