const test=require('node:test'),assert=require('node:assert/strict');
const {arena}=require('./combat-mechanics-fixture.cjs');const I=WarCombatImpact;
function shell(g,e,target,extra={}){return {type:'shot',sourceId:e.id,sourceKind:e.kind,from:0,target:target?.id??null,tx:target?.x??2100,ty:1600,targetHeight:0,damage:100,baseDamage:100,weaponDomains:['ground','structure'],targetDomain:'ground',ammoType:'HE',splash:150,...extra};}
test('AP direct impact damages once and cannot inherit an old HE blast',()=>{
 const {g,e}=arena(),t=g.spawn(1,'tank',2100,1600),near=g.spawn(1,'tank',2140,1600);g.spatial.rebuild(g.entities);
 const shot=shell(g,e,t,{ammoType:'ap'}),hp=t.hp,other=near.hp;assert.equal(I.resolve(g,shot),1);assert.ok(t.hp<hp);assert.equal(near.hp,other);const after=t.hp;assert.equal(I.resolve(g,shot),0);assert.equal(t.hp,after);
});
test('HE direct surface and area are counted once, distance falls off and buildings provide cover',()=>{
 const {g,e}=arena(),direct=g.spawn(1,'tank',2100,1600),near=g.spawn(1,'tank',2100,1660),far=g.spawn(1,'tank',2100,1730),behind=g.spawn(1,'tank',2220,1600),friend=g.spawn(0,'tank',2100,1640),wall=g.spawn(1,'bunker',2160,1600);
 g.spatial.rebuild(g.entities);const before=[direct,near,far,behind,friend].map(t=>t.hp),shot=shell(g,e,direct);
 assert.equal(I.cover(g,shot,behind),.15);I.resolve(g,shot);const losses=[direct,near,far,behind,friend].map((t,i)=>before[i]-t.hp);
 assert.ok(losses[0]>losses[1]&&losses[1]>losses[2]);assert.ok(losses[3]<losses[1]*.3);assert.equal(losses[4],0);assert.ok(wall.hp<wall.maxHp);
});
test('blast cannot bypass frozen target domains or harm an escaped fixed direct target',()=>{
 const {g,e}=arena(),target=g.spawn(1,'tank',2100,1600),air=g.spawn(1,'fighter',2120,1600);air.altitude=40;g.spatial.rebuild(g.entities);
 const shot=shell(g,e,target,{splash:0,directHitArea:{x:2050,y:1600,altitude:0,r:10,verticalRadius:12}}),before=target.hp;I.resolve(g,shot);assert.equal(target.hp,before);
 I.resolve(g,shell(g,e,null,{splash:180}));assert.equal(air.hp,air.maxHp);
});
test('a wall destroyed by this blast shields consistently regardless of entity insertion order',()=>{
 function damage(reverse){const {g,e}=arena();let wall,t;
  if(reverse){t=g.spawn(1,'tank',2220,1600);wall=g.spawn(1,'bunker',2160,1600);}else{wall=g.spawn(1,'bunker',2160,1600);t=g.spawn(1,'tank',2220,1600);}
  wall.hp=1;t.hp=t.maxHp=10000;g.spatial.rebuild(g.entities);I.resolve(g,shell(g,e,null));assert.ok(wall.hp<=0);return 10000-t.hp;
 }assert.equal(damage(false),damage(true));
});
test('EMP freezes artillery deployment and paid repair restores disabled buildings without reviving casualties',()=>{
 const {g,e}=arena('arty');const w=g.vehicleWeapon(e),R=WarCombatReadiness;
 R.step(g,e,.05,{weapon:w,target:{x:e.x+400,y:e.y,altitude:0}});const s=e.combat.stations[w.id];s.phase='setup';s.phaseAt=g.time;s.phaseUntil=g.time+1;
 e.disabled=g.time+1;for(let n=0;n<10;n++)g.step(.05);assert.ok(s.phaseUntil>=1.45);
 const building=g.spawn(0,'bunker',e.x+100,e.y);g.damage(building,building.maxHp*.55,1,{component:'structure'});assert.equal(building.components.state,'disabled');
 g.options.abilities=true;g.buffs.add('vision');g.updateFog();assert.ok(g.ability('repair',building.x,building.y));assert.ok(building.components.parts.structure.health>.2);assert.notEqual(building.components.state,'disabled');
});
