'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
for(const f of ['data','roster','equipment','sim'])require('../src/'+f);
test('entity lookup observes in-place death, replacement, reorder, append and array replacement',()=>{
 const g=new WarSim.Game({map:'desert',enemies:1}),a=g.entities[0],b=g.entities[1];assert.equal(g.get(a.id),a);assert.equal(g.get(b.id),b);
 a.hp=0;assert.equal(g.get(a.id),undefined);a.hp=1;assert.equal(g.get(a.id),a);
 g.entities.reverse();assert.equal(g.get(a.id),a);const pos=g.entities.indexOf(b),replacement={...b,id:999999};g.entities[pos]=replacement;assert.equal(g.get(b.id),undefined);assert.equal(g.get(replacement.id),replacement);
 const next={...b,id:999998};g.entities.push(next);assert.equal(g.get(next.id),next);g.entities=g.entities.filter(e=>e!==a);assert.equal(g.get(a.id),undefined);assert.equal(g.get(null),null);
});
test('spatial squared-distance query retains all old candidates in the same order',()=>{
 const s=new WarSim.Spatial(),random=WarSim.rng(316),entities=Array.from({length:640},(_,id)=>({id,hp:1,x:random()*24576,y:random()*16896,r:5+random()*100}));s.rebuild(entities);
 const legacy=(x,y,r)=>{const out=[],b=s.bounds,minX=Math.max(b.minX,Math.floor((x-r)/s.size)),maxX=Math.min(b.maxX,Math.floor((x+r)/s.size)),minY=Math.max(b.minY,Math.floor((y-r)/s.size)),maxY=Math.min(b.maxY,Math.floor((y+r)/s.size));if((maxX-minX+1)*(maxY-minY+1)>s.buckets.size*2){for(const bucket of s.buckets.values())for(const e of bucket)if(Math.hypot(e.x-x,e.y-y)<=r+e.r)out.push(e.id);}else for(let y1=minY;y1<=maxY;y1++)for(let x1=minX;x1<=maxX;x1++)for(const e of s.buckets.get(x1+','+y1)||[])if(Math.hypot(e.x-x,e.y-y)<=r+e.r)out.push(e.id);return out;};
 for(let i=0;i<400;i++){const x=random()*24576,y=random()*16896,r=[0,100,500,5000,400000][i%5];assert.deepEqual(s.query(x,y,r).map(e=>e.id),legacy(x,y,r));}
});
test('navigation shape cache follows faction, kind, radius and editable structure dimensions',()=>{
 const g=new WarSim.Game({map:'desert',enemies:1}),e=g.spawn(0,'tank',1200,1200);assert.equal(g.navigationRadius(e),52);g.teams[0].faction='usa';assert.equal(g.navigationRadius(e),48);e.kind='infantry';assert.equal(g.navigationRadius(e),Math.max(e.r,15));e.kind='unknown-fixture';e.r=101;assert.equal(g.navigationRadius(e),101);
 const b=g.spawn(0,'runway',2000,2000),f=WarData.B.runway.footprint,previous=f.halfLength;try{const before=g.navigationRadius(b);f.halfLength=previous+200;assert(g.navigationRadius(b)>before+100);}finally{f.halfLength=previous;}
});
test('sensor observer hints revalidate movement, replacement and same-tick EMP/power loss',()=>{
 const g=new WarSim.Game({map:'desert',enemies:1,rangeMode:'published'});g.entities=[];const plant=g.spawn(0,'power',100,100),radar=g.spawn(0,'radar',1000,1000),target=g.spawn(1,'fighter',6000,1000);target.altitude=500;const observers=[radar];assert(WarSensors.unitsInSight(g,target,observers));radar.disabled=g.time+10;assert.equal(WarSensors.unitsInSight(g,target,observers),false);radar.disabled=0;assert(WarSensors.unitsInSight(g,target,observers));plant.hp=0;assert.equal(WarSensors.unitsInSight(g,target,observers),false);plant.hp=plant.maxHp;
 const close=g.spawn(0,'infantry',target.x,target.y);target.kind='infantry';target.altitude=0;observers[0]=close;assert(WarSensors.unitsInSight(g,target,observers));close.x=100;assert.equal(WarSensors.unitsInSight(g,target,observers),false);observers.length=0;assert.equal(WarSensors.unitsInSight(g,target,observers),false);
});
