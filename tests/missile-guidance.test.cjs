const test=require('node:test'),assert=require('node:assert/strict');
for(const file of ['data','roster','equipment','operator-weapons','sim'])require('../src/'+file+'.js');
const P=WarCombatProjectiles,R=WarCombatReadiness,wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
function launch({kind='destroyer',station='land_attack',targetKind='tank',gap=350,yaw=0,height,targetHeight,dt=.05,rayHeight}={}){
 const g=new WarSim.Game({map:'desert',faction:'usa',enemies:1,buffs:['vision'],abilities:false,rangeMode:'balanced'});
 g.entities=[];g.effects=[];g.ore=[];g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.map.tiles.fill(0);
 for(const t of WarTrees.ensure(g))WarTrees.damage(g,t.id,t.maxHp);
 g.spawn(0,'hq',250,250);g.spawn(1,'hq',5500,3500);g.teams.forEach(t=>{t.money=0;t.aiClock=1e9;t.queue=[];t.buildQueue=[];});
 const e=g.spawn(0,kind,2500,1800),target=g.spawn(1,targetKind,e.x+Math.cos(yaw)*gap,e.y+Math.sin(yaw)*gap);
 target.disabled=1e9;target.hp=target.maxHp=100000;e.angle=e.turret=yaw;if(height!==undefined)e.altitude=height;if(targetHeight!==undefined)target.altitude=targetHeight;
 if(WarData.U[kind]?.air&&!WarData.U[kind]?.space)e.flightSpeed=140;
 const w=g.vehicleWeapons(e).find(w=>w.stationId===station);assert(w);assert(g.setVehicleWeapon(e.id,w.id));
 for(let i=0;i<100&&!R.status(g,e,w,target).canFire;i++){g.time+=.05;R.step(g,e,.05,{target,weapon:w});}
 const aim=rayHeight===undefined?undefined:{origin:{x:e.x,y:e.y,height:rayHeight},x:target.x,y:target.y,height:rayHeight,fixedImpact:true};
 g.spatial.rebuild(g.entities);g.updateFog();assert(R.status(g,e,w,target).canFire);assert(g.emitShot(e,target,aim));
 const fx=g.effects.find(f=>f.type==='shot'&&f.sourceId===e.id);assert(fx);e.disabled=1e9;return{g,e,target,w,fx,dt};
}
function trace(c){
 const {g,fx,dt}=c,p=fx.projectile;let turns=0,lastHeading=p.heading,steps=0;const points=[];
 while(g.effects.includes(fx)&&steps++<Math.ceil((p.maxAge+1)/dt)){
  g.step(dt);const q=P.position(fx);turns+=Math.abs(wrap((p.heading||0)-(lastHeading||0)));lastHeading=p.heading;
  assert(['x','y','height'].every(k=>Number.isFinite(q[k])));points.push({...q});
 }
 assert(!g.effects.includes(fx),'projectile must terminate');return{turns:turns/(2*Math.PI),points};
}
test('legal near vertical launches converge without a full orbit at 20/60/10 Hz in each direction',()=>{
 for(const dt of [1/60,.05,.1])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const c=launch({dt,yaw}),r=trace(c);assert(c.target.hp<c.target.maxHp,`actual swept hit dt=${dt}, yaw=${yaw}`);assert(r.turns<.5,'near launch must not orbit before hitting');assert(r.points.every(p=>p.height>=0));
 }
});
test('near and distant sea/low-air targets and a moving ground target remain actual impacts',()=>{
 for(const spec of [{gap:125},{gap:450},{gap:650},{gap:65,station:'anti_ship',targetKind:'repair_ship'},{gap:200,station:'sam',targetKind:'recon_drone',targetHeight:100},{gap:200,station:'sam',targetKind:'recon_drone',targetHeight:300}]){
  const c=launch(spec),r=trace(c);assert(c.target.hp<c.target.maxHp,JSON.stringify(spec));assert(r.turns<.5,JSON.stringify(spec));
 }
 const c=launch({gap:220,targetKind:'harvester'}),before={x:c.target.x,y:c.target.y};c.target.disabled=0;c.g.command([c.target.id],c.target.x,c.target.y+900,false);const r=trace(c);assert(Math.hypot(c.target.x-before.x,c.target.y-before.y)>10);assert(c.target.hp<c.target.maxHp);assert(r.turns<.5);
});
test('guidance has finite speed and three-dimensional turning and keeps pause/save compatibility',()=>{
 const c=launch(),{g,fx}=c,p=fx.projectile;let last={...p.position},old={x:Math.cos(p.heading)*Math.cos(p.pitch),y:Math.sin(p.heading)*Math.cos(p.pitch),z:Math.sin(p.pitch)};
 for(let i=0;i<100&&g.effects.includes(fx);i++){
  const saved=structuredClone(fx);assert(P.validate(saved));P.step(g,fx,0);assert.deepEqual(fx,saved);
  g.step(.05);const q=P.position(fx),v={x:Math.cos(p.heading)*Math.cos(p.pitch),y:Math.sin(p.heading)*Math.cos(p.pitch),z:Math.sin(p.pitch)};
  assert(Math.hypot(q.x-last.x,q.y-last.y,q.height-last.height)<=Math.max(90,p.cruiseSpeed)*.05+1e-7);
  assert(Math.acos(Math.max(-1,Math.min(1,old.x*v.x+old.y*v.y+old.z*v.z)))<=Math.max(p.turnRate,p.pitchRate)*.05+1e-7);
  last=q;old=v;
 }
 assert(c.target.hp<c.target.maxHp);
});
test('losing a lock coasts along its current heading and expires without circling the old point',()=>{
 const c=launch({gap:650}),{g,fx,target}=c;for(let i=0;i<16;i++)g.step(.05);target.hp=0;g.step(.05);const p=fx.projectile,heading=p.heading,pitch=p.pitch,start=p.age;
 assert.equal(p.phase,'coast');assert.equal(p.lockId,null);assert.equal(fx.target,null);trace(c);assert.equal(p.heading,heading);assert.equal(p.pitch,pitch);assert(p.age-start<=1.6);assert.equal(fx.damage,0);
});
test('guided ground crossing clips the actual segment at the surface rather than flying underground',()=>{
 const c=launch({kind:'fighter',station:'agm',height:65,gap:220}),{g,fx,target}=c,p=fx.projectile;
 // A lost missile already diving: no target ID, no forced impact or damage.
 target.hp=0;p.phase='coast';p.phaseAge=0;p.lockId=null;fx.target=null;p.pitch=-Math.PI/3;p.speed=380;p.position.height=3;
 g.step(.1);assert.equal(p.position.height,0);assert.equal(fx.target,null);assert(!g.effects.includes(fx));assert(g.effects.some(f=>f.type==='impact'&&f.projectileId===fx.projectileId&&f.height===0));
});
test('ground and airborne cross-orbit launches retain game projection and hit by continuous travel',()=>{
 for(const spec of [{kind:'asat',station:'asat',targetKind:'satellite',gap:100,targetHeight:4000},{kind:'high_altitude_interceptor',station:'high_asat',targetKind:'satellite',gap:500,height:300,targetHeight:4000},{kind:'omni_striker',station:'omni_space',targetKind:'satellite',gap:500,height:300,targetHeight:4000}]){
  const c=launch(spec);assert(c.fx.projectile.spaceProjection);const r=trace(c);assert(c.target.hp<c.target.maxHp,JSON.stringify(spec));assert(r.turns<.5);
 }
});
test('in-flight guidance survives real Game save/load without a discontinuity or duplicate damage',()=>{
 const c=launch();for(let i=0;i<15;i++)c.g.step(.05);const loaded=WarSim.Game.load(c.g.save()),copy=loaded.effects.find(f=>f.projectileId===c.fx.projectileId);
 assert(copy);assert.deepEqual(copy.projectile,c.fx.projectile);c.g.step(.05);loaded.step(.05);assert.deepEqual(P.position(copy),P.position(c.fx));
 trace(c);const restored={g:loaded,e:loaded.get(c.e.id),target:loaded.get(c.target.id),fx:copy,dt:.05};trace(restored);assert.equal(restored.target.hp,c.target.hp);const hp=restored.target.hp;for(let i=0;i<30;i++)loaded.step(.05);assert.equal(restored.target.hp,hp);
});
test('aligned cross-layer ASAT keeps the existing short travel time at the maximum orbital height',()=>{
 for(const dt of [1/60,.05,.1]){
  const c=launch({kind:'asat',station:'asat',targetKind:'orbital',gap:300,targetHeight:12000,dt});
  for(let i=0;i<Math.round(1.2/dt);i++)c.g.step(dt);
  assert(c.target.hp<c.target.maxHp,`real swept impact by 1.2 seconds at dt=${dt}`);
 }
});
test('exact overhead guidance remains finite without a yaw singularity',()=>{
 const overhead=launch({station:'sam',targetKind:'recon_drone',gap:0,targetHeight:100});trace(overhead);assert(overhead.target.hp<overhead.target.maxHp);
});
test('guided missiles still stop at friendly hulls and remain interceptable by actual CIWS travel',()=>{
 const blocked=launch({kind:'ifv',station:'atgm',gap:300});const friend=blocked.g.spawn(0,'tank',blocked.e.x+150,blocked.e.y);friend.disabled=1e9;trace(blocked);assert.equal(blocked.target.hp,blocked.target.maxHp);assert.equal(friend.hp,friend.maxHp);
 const c=launch({gap:650,targetKind:'mobile_ciws'});c.target.disabled=0;
 // A prepared defense faces the approach. A gun facing 180 degrees away
 // legitimately cannot traverse before a fast incoming round reaches it.
 c.target.angle=c.target.turret=Math.atan2(c.e.y-c.target.y,c.e.x-c.target.x);
 let sawInterceptor=false;for(let i=0;i<160&&c.g.effects.includes(c.fx);i++){c.g.step(.05);sawInterceptor||=c.g.effects.some(f=>f.type==='interceptor');}
 assert(sawInterceptor);assert.equal(c.fx.type,'intercepted');assert.equal(c.target.hp,c.target.maxHp);
});
test('rotated real runway has a low rectangular swept collider; friendly cover blocks without damage',()=>{
 assert(WarData.B.runway?.rotatable&&WarData.B.runway.footprint,'runway definition is required');
 for(const yaw of [0,Math.PI/2])for(const height of [1,3])for(const team of [0,1]){
  const c=launch({kind:'ifv',station:'atgm',gap:300,rayHeight:height}),runway=c.g.spawn(team,'runway',c.e.x+150,c.e.y+150);runway.angle=yaw;runway.disabled=1e9;
  const hp=runway.hp,blocked=yaw===Math.PI/2&&height===1;assert.equal(c.fx.projectile.kind,'kinetic');trace(c);
  assert.equal(c.target.hp===c.target.maxHp,blocked,`yaw=${yaw} height=${height} team=${team}`);
  assert.equal(runway.hp<hp,blocked&&team===1);if(blocked)assert.equal(c.fx.target,team===1?runway.id:null);
 }
});
test('runway blast distance and cover respect its rotated low footprint instead of the large selection radius',()=>{
 for(const yaw of [0,Math.PI/2]){
  const c=launch({kind:'ifv',station:'atgm',gap:300}),runway=c.g.spawn(1,'runway',2500,1800),behind=c.g.spawn(1,'tank',2800,1950);runway.angle=yaw;runway.disabled=behind.disabled=1e9;c.g.effects=[];c.g.spatial.rebuild(c.g.entities);
  const low={tx:2400,ty:1950,targetHeight:0},high={...low,targetHeight:10};
  assert.equal(WarCombatImpact.cover(c.g,low,behind),yaw===0?1:.15);assert.equal(WarCombatImpact.cover(c.g,high,behind),1);
  // At y+100, the unrotated runway is 20 units away (outside a 14-unit
  // blast), whereas the same point is on the rotated runway's pavement.
  const fx={type:'shot',from:0,sourceKind:'ifv',target:null,tx:2500,ty:1900,targetHeight:1,damage:100,baseDamage:100,splash:14,ammoType:'he',weaponDomains:['ground','structure'],targetDomain:'ground'},before=runway.hp;
  WarCombatImpact.resolve(c.g,fx);assert.equal(runway.hp<before,yaw===Math.PI/2);
 }
});
