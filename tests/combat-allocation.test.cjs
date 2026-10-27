const test=require('node:test'),assert=require('node:assert/strict');
const {arena}=require('./combat-mechanics-fixture.cjs');
const P=WarCombatProjectiles,R=WarCombatReadiness;
function round(g,e,t,family='rifle',extra={}){
 const w={id:'regression',family,damage:30,splash:0,targetDomains:['ground','naval','underwater']};
 g.spatial.rebuild(g.entities);
 return P.decorateLaunch(g,e,w,{type:'shot',sourceId:e.id,sourceKind:e.kind,from:e.team,x:e.x,y:e.y,sourceHeight:2,tx:t.x,ty:t.y,targetHeight:2,target:t.id,damage:30,baseDamage:30,splash:0,weaponFamily:family,max:.1,ttl:.1,...extra});
}
test('wounded personnel cannot survive an overwhelming hit at one HP; death counts once',()=>{
 const {g,e}=arena('infantry');e.hp=e.maxHp*.2;const lost=g.teams[0].lost;
 g.damage(e,e.maxHp*10,1);assert(e.hp<=0);assert.equal(e.components.state,'dead');
 g.damage(e,100,1);assert.equal(g.teams[0].lost,lost+1);
 assert.equal(g.effects.filter(f=>f.type==='wreck'&&f.entityId===e.id).length,1);
});
test('a recoverable casualty can still be hit by a swept bullet',()=>{
 const {g,e}=arena('infantry'),t=g.spawn(1,'infantry',e.x+100,e.y);t.hp=10;g.damage(t,20,0);
 assert.equal(t.components.state,'downed');const fx=round(g,e,t);
 assert(P.step(g,fx,.1).impact);assert.equal(fx.target,t.id);WarCombatImpact.resolve(g,fx);assert(t.hp<=0);
});
test('torpedo physical collision survives loss of target and all sonar',()=>{
 const {g,e}=arena('submarine'),t=g.spawn(1,'submarine',e.x+700,e.y),other=g.spawn(1,'submarine',e.x+100,e.y);
 const fx=round(g,e,t,'torpedo',{sourceHeight:g.entityAltitude(e),targetHeight:g.entityAltitude(t),max:5,ttl:5});
 e.hp=t.hp=0;g.buffs.delete('vision');assert.equal(g.canDetect(0,other),false);
 let result;for(let i=0;i<30;i++){result=P.step(g,fx,.05);if(result.impact||result.expired)break;}
 assert(result.impact);assert.equal(fx.target,other.id);const hp=other.hp;WarCombatImpact.resolve(g,fx);assert(other.hp<hp);
});
test('lost guided rounds remain live beyond the old 1.5 second cutoff without chasing a dead target',()=>{
 const {g,e}=arena('fighter'),t=g.spawn(1,'fighter',e.x+1800,e.y);e.altitude=t.altitude=200;e.flightSpeed=100;
 const w=R.weapons(g,e).find(w=>w.family==='missile');const fx=P.decorateLaunch(g,e,w,{type:'shot',sourceId:e.id,sourceKind:e.kind,from:0,x:e.x,y:e.y,sourceHeight:200,tx:t.x,ty:t.y,targetHeight:200,target:t.id,damage:50,baseDamage:50,max:6,ttl:6});t.hp=0;
 for(let i=0;i<50;i++)P.step(g,fx,.05);
 assert.equal(fx.type,'shot');assert.equal(fx.projectile.phase,'coast');assert.equal(fx.projectile.lockId,null);assert.equal(fx.baseDamage,50);
});
function allocation(){const {g,e}=arena('tank');e.weaponId='tank:main_gun';const friends=[e,...Array.from({length:3},(_,i)=>g.spawn(0,'tank',e.x-20,e.y+(i+1)*35))];
 const enemies=Array.from({length:4},(_,i)=>g.spawn(1,'tank',e.x+170,e.y+i*35));enemies.forEach(t=>{t.disabled=1e9;t.hp=t.maxHp=10000;});
 friends.forEach(f=>{f.target=enemies[0].id;f.disabled=0;});return {g,friends,enemies};}
test('existing autonomous focus fire spreads over legal enemies and stays stable',()=>{
 const {g,friends}=allocation();for(let i=0;i<15;i++)g.step(.05);
 assert.equal(new Set(friends.map(e=>e.target)).size,4);const ids=friends.map(e=>e.target);
 for(let i=0;i<10;i++)g.step(.05);assert.deepEqual(friends.map(e=>e.target),ids);
});
test('explicit player focus and plain movement are not overwritten by allocation',()=>{
 const {g,friends,enemies}=allocation();g.command(friends.map(e=>e.id),enemies[0].x,enemies[0].y,true,enemies[0].id);
 friends.forEach(e=>e.order={x:enemies[0].x,y:enemies[0].y,attack:true,target:enemies[0].id,playerAttack:true});
 for(let i=0;i<10;i++)g.step(.05);assert(friends.every(e=>e.target===enemies[0].id));
 const {g:g2,e}=arena('tank');g2.spawn(1,'tank',e.x+100,e.y);g2.command([e.id],e.x-500,e.y,false);
 for(let i=0;i<10;i++)g2.step(.05);assert.equal(e.target,null);
});
test('one area salvo freezes distinct legal target centers and remains lethal after primary removal',()=>{
 const {g,e}=arena('rocket');g.teams[0].faction='chn';
 const enemies=[g.spawn(1,'tank',e.x+350,e.y),g.spawn(1,'tank',e.x+350,e.y+100),g.spawn(1,'tank',e.x+350,e.y-100)];
 const w=g.vehicleWeapon(e,enemies[0]);g.spatial.rebuild(g.entities);
 for(let i=0;i<100;i++){g.time+=.05;R.step(g,e,.05,{weapon:w,target:enemies[0],moving:false});}
 assert(g.emitShot(e,enemies[0]));enemies[0].hp=0;
 for(let i=0;i<60;i++){g.time+=.05;WarWeaponSalvos.update(g);}
 const shots=g.effects.filter(f=>f.type==='shot');assert.equal(shots.length,8);
 for(const t of enemies)assert(shots.some(f=>Math.hypot(f.tx-t.x,f.ty-t.y)<30),'coverage for '+t.id);
 const fx=shots.find(f=>Math.hypot(f.tx-enemies[1].x,f.ty-enemies[1].y)<30),hp=enemies[1].hp;
 let r;for(let i=0;i<100;i++){r=P.step(g,fx,.05);if(r.impact||r.expired)break;}
 assert(r.impact);WarCombatImpact.resolve(g,fx);assert(enemies[1].hp<hp);
 assert(Math.abs(shots.reduce((s,f)=>s+f.baseDamage,0)-w.damage)<1e-8);
});
test('missile ships salvo across nearby surface targets using guided vertical launches and real ammunition',()=>{
 const {g,e}=arena('destroyer');e.weaponId='destroyer:land_attack';const t=g.spawn(1,'tank',e.x+500,e.y),t2=g.spawn(1,'tank',e.x+500,e.y+100),air=g.spawn(1,'fighter',e.x+500,e.y+30);
 const w=g.vehicleWeapon(e,t);g.spatial.rebuild(g.entities);
 for(let i=0;i<50;i++){g.time+=.05;R.step(g,e,.05,{weapon:w,target:t});}
 const stock=e.combat.stations[w.id],ammo=stock.ammo;assert(g.emitShot(e,t));
 for(let i=0;i<30;i++){g.time+=.05;WarWeaponSalvos.update(g);}
 const shots=g.effects.filter(f=>f.sourceId===e.id);assert.equal(shots.length,4);assert.equal(stock.ammo,ammo-4);
 assert.deepEqual(new Set(shots.map(f=>f.target)),new Set([t.id,t2.id]));assert(shots.every(f=>f.projectile.kind==='guided'&&f.projectile.phase==='vertical'));
 assert(!shots.some(f=>f.target===air.id));assert(Math.abs(shots.reduce((n,f)=>n+f.baseDamage,0)-w.damage)<1e-8);
});
test('free aimed missile ships retain one controlled launch instead of auto-targeting a group',()=>{
 const {g,e}=arena('destroyer');e.weaponId='destroyer:land_attack';const t=g.spawn(1,'tank',e.x+500,e.y);g.spawn(1,'tank',e.x+500,e.y+50);g.beginDirectControl(e.id);
 const w=g.vehicleWeapon(e,t);g.spatial.rebuild(g.entities);for(let i=0;i<50;i++){g.time+=.05;R.step(g,e,.05,{weapon:w,target:t});}
 assert(g.emitShot(e,t,{x:t.x,y:t.y,height:0,fixedImpact:true}));assert.equal(WarWeaponSalvos.active(g,e),false);assert.equal(g.effects.filter(f=>f.type==='shot').length,1);
});
test('overlapping allies cannot be selected as additional salvo centers and range boundaries stay enforced',()=>{
 const {g,e}=arena('rocket'),t=g.spawn(1,'tank',e.x+350,e.y),ally=g.spawn(0,'tank',e.x+350,e.y+100),far=g.spawn(1,'tank',e.x+550,e.y),blind=g.spawn(1,'tank',e.x+50,e.y);
 const w=g.vehicleWeapon(e,t);g.spatial.rebuild(g.entities);for(let i=0;i<100;i++){g.time+=.05;R.step(g,e,.05,{weapon:w,target:t});}assert(g.emitShot(e,t));
 for(let i=0;i<60;i++){g.time+=.05;WarWeaponSalvos.update(g);}assert(g.effects.every(f=>![ally.id,far.id,blind.id].includes(f.target)));
});
test('a free aimed explosive shell retains its area damage without a target ID',()=>{
 const {g,e}=arena('arty'),point={x:e.x+350,y:e.y,height:0,fixedImpact:true},near=g.spawn(1,'infantry',point.x,point.y+25);
 const w=g.vehicleWeapon(e);g.spatial.rebuild(g.entities);for(let i=0;i<100;i++){g.time+=.05;R.step(g,e,.05,{weapon:w,aimX:point.x,aimY:point.y,aimHeight:0});}
 assert(g.emitShot(e,null,point));const fx=g.effects.at(-1);assert(fx.splash>0);const hp=near.hp;
 let r;for(let i=0;i<300;i++){r=P.step(g,fx,.025);if(r.impact||r.expired)break;}assert(r.impact);WarCombatImpact.resolve(g,fx);assert(near.hp<hp);
});
test('hull rocket salvos reject off-axis centers and cancel unlaunched rounds after turning away',()=>{
 const {g,e}=arena('heli');e.altitude=40;e.pitch=Math.atan2(-40,140);e.weaponId='heli:rockets';const t=g.spawn(1,'tank',e.x+140,e.y),side=g.spawn(1,'tank',e.x+100,e.y+85),w=g.vehicleWeapon(e,t);g.spatial.rebuild(g.entities);
 for(let i=0;i<60;i++){g.time+=.05;R.step(g,e,.05,{weapon:w,target:t});}
 assert.equal(R.status(g,e,w,side).reason,'arc');assert(g.emitShot(e,t));g.time+=.13;WarWeaponSalvos.update(g);
 assert(g.effects.every(f=>f.target!==side.id));const ammo=e.combat.stations[w.id].ammo,shots=g.effects.length;
 e.angle=Math.PI;g.time+=1;WarWeaponSalvos.update(g);assert.equal(g.effects.length,shots);assert.equal(e.combat.stations[w.id].ammo,ammo);assert(!WarWeaponSalvos.active(g,e));
});
