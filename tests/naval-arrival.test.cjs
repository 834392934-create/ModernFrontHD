const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');
require('../src/data');require('../src/roster');require('../src/equipment');require('../src/sim');
for(const file of ['models3d','models-naval','model-detail','models-roster','models-reinforcements-ground-naval','models-reinforcements-air-space','models-tactical-ground-naval','models-tactical-air-space','models-depth-wave','models-altitude-wave'])require('../src/'+file);
const {Game}=WarSim,{U,F,T,COLS,ROWS}=WarData,cache=new Map();
function bounds(kind,faction='chn'){
 const key=kind+'_'+faction;if(cache.has(key))return cache.get(key);
 const model=WarModels.create(kind,faction);model.scale.setScalar(model.userData.scale);model.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(model),value={minX:b.min.x,maxX:b.max.x,minY:b.min.z,maxY:b.max.z,length:b.max.x-b.min.x,width:b.max.z-b.min.z};cache.set(key,value);return value;
}
function corners(e,faction='chn'){
 const b=bounds(e.kind,faction),c=Math.cos(e.angle),s=Math.sin(e.angle);
 return [[b.minX,b.minY],[b.maxX,b.minY],[b.maxX,b.maxY],[b.minX,b.maxY]].map(([x,y])=>({x:e.x+c*x-s*y,y:e.y+s*x+c*y}));
}
function overlaps(a,b,faction='chn'){
 const first=corners(a,faction),second=corners(b,faction);
 for(const angle of [a.angle,a.angle+Math.PI/2,b.angle,b.angle+Math.PI/2]){const x=Math.cos(angle),y=Math.sin(angle),p=first.map(c=>c.x*x+c.y*y),q=second.map(c=>c.x*x+c.y*y);if(Math.min(Math.max(...p),Math.max(...q))-Math.max(Math.min(...p),Math.min(...q))<=.01)return false;}
 return true;
}
function arena(faction='chn'){
 const g=new Game({enemies:1,map:'desert',faction,buffs:['vision'],abilities:false});g.entities=[];g.ore=[];g.map.navalBlocked.fill(0);g.map.blocked.fill(1);
 g.spawn(0,'hq',300,300);const enemy=g.spawn(1,'hq',5800,3900);enemy.hp=enemy.maxHp=1e12;g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});return g;
}
function advance(g,seconds){for(let i=0;i<seconds*20;i++)g.step(.05);}

test('same-batch carrier formation arrives with actual scaled model footprints separated',()=>{
 const g=arena('usa'),units=Array.from({length:6},(_,i)=>g.spawn(0,'carrier',1200+(i%3)*260,1000+Math.floor(i/3)*260));g.command(units.map(e=>e.id),3200,1800);advance(g,90);
 assert.ok(units.every(e=>!e.order),'all six carriers finish their assigned orders');
 for(const e of units)for(const o of units)if(e.id<o.id)assert.equal(overlaps(e,o,'usa'),false,`scaled carrier geometry overlaps: ${e.id}/${o.id}; visual length ${bounds('carrier','usa').length.toFixed(1)}, combat diameter ${e.r*2}`);
});
test('later ship gets a free berth around a previously occupied single-unit destination and actually settles',()=>{
 const g=arena(),parked=g.spawn(0,'destroyer',3000,1800),arrival=g.spawn(0,'destroyer',1800,1800);parked.angle=0;g.command([arrival.id],3000,1800);advance(g,70);
 assert.equal(arrival.order,null,'the second batch must settle in an available berth instead of remaining blocked at the first batch');assert.equal(overlaps(parked,arrival),false);assert.deepEqual([parked.x,parked.y],[3000,1800],'already parked ship must not be pushed');
 const position=[arrival.x,arrival.y,arrival.angle];advance(g,5);assert.deepEqual([arrival.x,arrival.y,arrival.angle],position,'arrived vessel remains still');
});
test('successive fleet batches share a destination without reusing parked hull space',()=>{
 const g=arena(),all=[];
 for(let batch=0;batch<3;batch++){const units=Array.from({length:3},(_,i)=>g.spawn(0,['destroyer','frigate','carrier'][i],1200,1000+batch*400+i*130));all.push(...units);g.command(units.map(e=>e.id),3200,1800);advance(g,90);}
 assert.ok(all.every(e=>!e.order),'all three batches must finish docking');for(const e of all)for(const o of all)if(e.id<o.id)assert.equal(overlaps(e,o),false,`batches overlap at ${e.id}/${o.id}`);
});
test('a carrier ordered against a shoreline keeps the complete scaled hull above water',()=>{
 const g=arena('usa');for(let y=0;y<ROWS;y++)for(let x=100;x<COLS;x++)g.map.navalBlocked[y*COLS+x]=1;
 const ship=g.spawn(0,'carrier',3500,1500);g.command([ship.id],4790,1500);advance(g,50);assert.equal(ship.order,null);
 for(const p of corners(ship,'usa'))assert.equal(g.map.navalBlocked[Math.floor(p.y/T)*COLS+Math.floor(p.x/T)],0,`rendered carrier corner is on land at ${p.x.toFixed(1)},${p.y.toFixed(1)} despite centre being navigable`);
});
test('rapid naval production and a shared rally point do not spawn or park overlapping rendered hulls',()=>{
 const g=arena(),yard=g.spawn(0,'navalyard',1800,1400);g.buffs.add('rapid');g.teams[0].money=1e6;g.setRally([yard.id],3000,1800);
 for(let i=0;i<3;i++)assert.equal(g.train(0,'destroyer'),true);
 for(let tick=0;tick<1400;tick++){g.step(.05);const ships=g.entities.filter(e=>e.team===0&&e.kind==='destroyer');for(const e of ships)for(const o of ships)if(e.id<o.id)assert.equal(overlaps(e,o),false,`produced hull overlap at ${g.time.toFixed(2)}s`);}
 const ships=g.entities.filter(e=>e.team===0&&e.kind==='destroyer');assert.equal(ships.length,3,'production is not permanently blocked');assert.ok(ships.every(e=>!e.order),'each ship completes its rally order');
});

if(process.env.NAVAL_BOUNDS_REPORT){const rows=[];for(const kind of Object.keys(U).filter(k=>U[k].naval))for(const faction of Object.keys(F))rows.push({kind,faction,combatRadius:U[kind].r,...bounds(kind,faction)});require('node:fs').writeFileSync('docs/reviews/naval-model-bounds.json',JSON.stringify({recordedAt:new Date().toISOString(),method:'THREE.Box3 on actual generated models after userData.scale; no GPU',limitations:'USA imported Burke is separately normalized to 24 local units at scale 5.4 = 129.6 world units; this table measures its procedural fallback, not imported texture/render readiness.',rows},null,2)+'\n');}
module.exports={bounds,corners,overlaps,arena,advance};
