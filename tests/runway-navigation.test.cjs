const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data');require('../src/roster');require('../src/equipment');require('../src/sim');
const F=WarNavigationFootprints,{T,COLS}=WarData;
function arena(){const g=new WarSim.Game({seed:712,map:'desert',enemies:1,buffs:['vision']});g.entities=[];g.ore=[];g.nodes=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(1);g.spawn(0,'hq',300,300);g.spawn(1,'hq',5500,3500);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});return g;}
test('runway rectangle preserves the passable side aisle and rotates its actual footprint',()=>{
 const g=arena(),r=g.spawn(0,'runway',1600,1500),e=g.spawn(0,'tank',1000,1650);r.angle=0;
 assert.equal(F.structureDistance(r,1600,1650),70);assert.equal(F.structureClear(g,e,r,1600,1650),true);assert.equal(F.structureClear(g,e,r,1600,1630),false);
 assert.equal(F.structureSegmentClear(g,e,r,{x:2200,y:1650}),true,'outside the 160u width is open even inside the 197u bounding circle');
 const grid=F.pathGrid(g,e),index=34*COLS+33;assert.equal(grid.blocked[index],0);
 r.angle=Math.PI/2;assert.equal(F.structureClear(g,e,r,1600,1650),false);assert.equal(F.structureSegmentClear(g,e,r,{x:2200,y:1650}),false);assert.notEqual(F.pathGrid(g,e),grid,'rotation invalidates cached footprint');assert.equal(F.pathGrid(g,e).blocked[index],1);
 r.angle=Math.PI/4;assert.ok(Math.abs(F.structureDistance(r,1600+150/Math.sqrt(2),1500-150/Math.sqrt(2))-70)<1e-6);
});
test('runway clearance uses rounded rectangle corners rather than an oversized axis-aligned box',()=>{
 const g=arena(),r=g.spawn(0,'runway',1600,1500),e=g.spawn(0,'tank',1000,1500);r.angle=0;const point={x:1600+180+44,y:1500+80+44};assert.ok(F.structureClear(g,e,r,point.x,point.y),'corner diagonal exceeds the full tank navigation radius');assert.ok(F.structureSegmentClear(g,e,r,point,8,point));
 const blocked={x:point.x-4,y:point.y-4};assert.equal(F.structureClear(g,e,r,blocked.x,blocked.y),false);assert.equal(F.structureSegmentClear(g,e,r,blocked,8,blocked),false);
});
for(const angle of [0,Math.PI/4,Math.PI/2])test(`real tank route passes runway at ${angle.toFixed(2)} radians without entering its rectangle`,()=>{
 const g=arena(),r=g.spawn(0,'runway',1600,1400),e=g.spawn(0,'tank',1000,1550);r.angle=angle;e.angle=0;g.command([e.id],2300,1550);let length=0;
 for(let i=0;i<1800&&e.order;i++){const x=e.x,y=e.y,a=e.angle;g.step(.05);const travel=Math.hypot(e.x-x,e.y-y);length+=travel;assert.ok(F.structureClear(g,e,r,e.x,e.y),'full navigation envelope clears runway');assert.ok(F.terrain(g,e,e.x,e.y,e.angle));assert.ok(travel<=g.effectiveSpeed(e)*.05+1e-6);assert.ok(Math.abs(WarVehicleMotion.angleDelta(e.angle,a))<=WarVehicleMotion.profile(e).turn*.05+1e-6);}
 assert.equal(e.order,null);assert.ok(Math.hypot(e.x-2300,e.y-1550)<6);if(!angle)assert.ok(length<1310,'clear side aisle does not detour around the giant circular bound');
});
test('runway height only blocks the overlapping ground layer',()=>{const g=arena(),r=g.spawn(0,'runway',1600,1500),e=g.spawn(0,'heli',1000,1500);e.altitude=100;assert.equal(F.sameLayer(g,e,r),false);assert.equal(F.structureSegmentClear(g,e,r,{x:2200,y:1500}),true);});
test('manual ground driving and later construction use the same runway rectangle',()=>{
 const g=arena(),r=g.spawn(0,'runway',1600,1500),e=g.spawn(0,'tank',1000,1650);r.angle=0;g.step(.05);
 assert.equal(g.directPositionFree(e,1600,1650),true);assert.equal(g.directPositionFree(e,1600,1620),false);assert.equal(g.directPositionFree(e,1600,1500),false);
 g.command([e.id],2300,1650);const later=g.spawn(0,'runway',2300,1650);later.angle=Math.PI/2;
 for(let i=0;i<1600&&e.order;i++){g.step(.05);assert.ok(F.structureClear(g,e,r,e.x,e.y));assert.ok(F.structureClear(g,e,later,e.x,e.y));}
 assert.equal(e.order,null);assert.ok(F.structureClear(g,e,later,e.x,e.y,8),'newly occupied destination is reselected outside the actual rectangle');
});
