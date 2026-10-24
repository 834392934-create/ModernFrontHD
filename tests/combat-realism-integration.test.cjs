const test=require('node:test'),assert=require('node:assert/strict');
for(const name of ['data','roster','equipment','operator-weapons','sim'])require('../src/'+name+'.js');
const R=WarCombatReadiness,D=WarCombatDamage,P=WarCombatProjectiles,T=WarTransportOperations;

// Production Game and Game.step own all combat transactions. Scenario setup only:
// no replacement of AI, movement, damage, firing, supply or collision methods.
function arena(kind='tank',team=0){
 const g=new WarSim.Game({map:'desert',faction:'usa',enemies:1,buffs:['vision'],abilities:false,rangeMode:'balanced'});
 g.entities=[];g.effects=[];g.ore=[];g.directObstacles=[];
 g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.map.tiles.fill(0);
 g.spawn(0,'hq',250,250);g.spawn(1,'hq',5500,3500);
 for(const t of g.teams){t.money=10000;t.aiClock=1e6;t.queue=[];t.buildQueue=[];}
 const e=g.spawn(team,kind,1800,1600);e.angle=e.turret=0;
 g.spatial.rebuild(g.entities);return {g,e};
}
function advance(g,seconds,observe){for(let i=0;i<Math.ceil(seconds/.05);i++){g.step(.05);observe?.();}}
function enemy(g,kind='tank',x=2000,y=1600){const e=g.spawn(1,kind,x,y);e.disabled=1e6;return e;}
function weapon(g,e,station){const w=g.vehicleWeapons(e).find(w=>w.stationId===station);assert.ok(w,e.kind+' lacks '+station);return w;}
function select(g,e,station){const w=weapon(g,e,station);assert.ok(g.setVehicleWeapon(e.id,w.id));return w;}
function control(g,e,input={}){assert.ok(g.beginDirectControl(e.id));g.teams[0].aiClock=1e6;g.setDirectInput({yaw:e.angle,fire:false,...input});}
function shots(g,e){return g.effects.filter(f=>f.type==='shot'&&f.sourceId===e.id);}

test('actual tank shots consume one station round, shared chamber survives switching, coax stays independent',()=>{
 const {g,e}=arena(),target=enemy(g),person=enemy(g,'infantry',1900,1600),main=select(g,e,'main_gun'),coax=weapon(g,e,'coax_mg');
 R.ensure(g,e);control(g,e);const a=e.combat.stations[main.id],b=e.combat.stations[coax.id],before=[a.ammo,a.reserve,b.ammo,b.reserve];
 assert.equal(g.emitShot(e,target),true);assert.equal(shots(g,e).length,1);assert.equal(a.ammo,before[0]-1);assert.equal(a.reserve,before[1]);assert.ok(a.cooldown>0);
 assert.equal(g.emitShot(e,target),false);assert.equal(a.ammo,before[0]-1);
 assert.equal(g.reloadWeapon(e.id),true);
 select(g,e,'coax_mg');assert.equal(g.emitShot(e,person),true);assert.equal(b.ammo,before[2]-1);assert.equal(b.reserve,before[3]);assert.equal(a.ammo,before[0]-1);
 const cannonVariant=g.vehicleWeapons(e).find(w=>w.family==='cannon'&&w.id!==main.id);assert.ok(cannonVariant);
 g.setVehicleWeapon(e.id,cannonVariant.id);const variant=e.combat.stations[cannonVariant.id],variantAmmo=variant.ammo;
 assert.equal(g.emitShot(e,target),false);assert.equal(variant.ammo,variantAmmo);
 advance(g,4);assert.equal(a.ammo,R.profile(g,e,main).magazine);assert.equal(a.reserve,before[1]-1);
 assert.equal(g.emitShot(e,target),true);assert.equal(variant.ammo,variantAmmo-1);
});

test('artillery deployment and packing gate actual motion and discharge, then permits travel',()=>{
 const {g,e}=arena('arty'),target=enemy(g,'tank',2150,1600);control(g,e,{targetId:target.id,aimX:target.x,aimY:target.y,aimHeight:0});
 assert.equal(g.emitShot(e,target),false);advance(g,1.7);assert.equal(g.combatStatus(e,target).canFire,true);
 const before={x:e.x,y:e.y};g.setDirectInput({yaw:0,forward:1});advance(g,.2);
 assert.equal(e.combat.phase,'pack');assert.equal(e.x,before.x);assert.equal(e.y,before.y);assert.equal(g.emitShot(e,target),false);
 advance(g,1.6);assert.ok(Math.hypot(e.x-before.x,e.y-before.y)>3);assert.equal(e.combat.phase,'ready');
});

test('mount traverse, elevation, real building occlusion and explicit muzzle obstruction reject shots without ammunition loss',()=>{
 const {g,e}=arena(),target=enemy(g,'tank',1800,1800),w=select(g,e,'main_gun');control(g,e,{yaw:Math.PI/2,targetId:target.id,aimX:target.x,aimY:target.y,aimHeight:0});
 const s=R.ensure(g,e).stations[w.id],ammo=s.ammo;assert.equal(g.emitShot(e,target),false);assert.equal(s.ammo,ammo);
 advance(g,1.4);assert.equal(g.combatStatus(e,target).canFire,true);
 assert.equal(g.emitShot(e,target,null,null,{muzzleBlocked:true}),false);assert.equal(s.ammo,ammo);
 const wall=g.spawn(0,'factory',1800,1700);g.spatial.rebuild(g.entities);
 assert.equal(g.emitShot(e,target),false);assert.equal(s.ammo,ammo);
 wall.hp=0;assert.equal(g.emitShot(e,target),true);assert.equal(s.ammo,ammo-1);
 const {g:h,e:ship}=arena('destroyer'),aft=enemy(h,'tank',1600,1600);select(h,ship,'naval_gun');assert.equal(h.combatStatus(ship,aft).reason,'arc');assert.equal(h.emitShot(ship,aft),false);
});

test('actual artillery projectile supplies the identical world position to RTS and FPS projection without render mutation',()=>{
 global.THREE??=require('../assets/vendor/three.min.js');require('../src/weapon-effects.js');
 const {g,e}=arena('arty'),target=enemy(g,'tank',2150,1600);control(g,e,{targetId:target.id,aimX:target.x,aimY:target.y,aimHeight:0});advance(g,1.7);
 assert.equal(g.emitShot(e,target),true);const fx=shots(g,e)[0];assert.equal(fx.projectile.kind,'arc');advance(g,.2);
 const q=P.position(fx);assert.ok(q.height>fx.sourceHeight);const snapshot=JSON.stringify(fx),seen=[];
 const ctx=new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const rts={ctx,camera:{zoom:1},toScreen:(x,y,height)=>{seen.push({x,y,height});return{x,y:height};}};
 assert.equal(WarWeaponEffects.drawProjectile(rts,g,fx),true);assert.deepEqual(seen[0],q);
 const first={ctx,firstPerson:{active:true,projectEffectSegment:(a,b)=>{seen.push({x:a.x,y:a.z,height:a.y});return[{x:a.x,y:a.y},{x:b.x,y:b.y}];}}};
 assert.equal(WarWeaponEffects.drawProjectile(first,g,fx),true);assert.deepEqual(seen[2],q);assert.equal(JSON.stringify(fx),snapshot);
});

test('point defense emits a delayed interceptor before destroying a real incoming missile; unrelated shot survives',()=>{
 const {g,e}=arena('mobile_ciws'),launcher=g.spawn(1,'destroyer',2450,1600),target=g.spawn(0,'tank',1790,1610);
 const observer=g.spawn(1,'recon_vehicle',1950,1450);observer.disabled=1e6;
 assert.ok(g.unitsInSight(e,g.teamEntities(1)),'a real observer must maintain the enemy missile lock');
 launcher.angle=launcher.turret=Math.PI;launcher.weaponId=weapon(g,launcher,'land_attack').id;
 assert.equal(g.emitShot(launcher,e),true);const threat=shots(g,launcher)[0];launcher.disabled=1e6;
 const tank=g.spawn(1,'tank',2100,1700),victim=g.spawn(0,'tank',1920,1700);tank.angle=tank.turret=Math.PI;tank.weaponId=weapon(g,tank,'main_gun').id;
 assert.equal(g.emitShot(tank,victim),true);const unrelated=shots(g,tank)[0],damage=unrelated.damage;tank.disabled=1e6;
 control(g,e);const hp=e.hp;g.step(.05);
 // A finite defensive traverse must acquire a missile approaching the actual
 // 220-unit protection sphere; a point-blank vertical overshoot is not guaranteed.
 for(let i=0;i<79&&!g.effects.some(f=>f.type==='interceptor'&&f.sourceId===e.id);i++)g.step(.05);
 assert.equal(threat.type,'shot','launching interceptor must not instantly cancel threat');assert.equal(unrelated.type,'shot');assert.equal(unrelated.damage,damage);
 assert.ok(g.effects.some(f=>f.type==='interceptor'&&f.sourceId===e.id),'actual interceptor exists');
 advance(g,1);assert.equal(threat.type,'intercepted');assert.equal(threat.damage,0);assert.equal(e.hp,hp);assert.ok(victim.hp<victim.maxHp,'ordinary unrelated shell still settles damage');
 assert.ok(target.hp>0);
});

test('living downed last enemy cannot move, shoot or drive and prevents premature annihilation',()=>{
 const {g}=arena();g.entities=g.entities.filter(e=>e.team===0);const casualty=g.spawn(1,'infantry',2200,1600),target=g.entities.find(e=>e.kind==='tank');
 casualty.hp=casualty.maxHp*.2;g.damage(casualty,casualty.maxHp*.3,0,{sourceId:target.id});
 assert.equal(casualty.components.state,'downed');assert.equal(casualty.hp,1);const point=[casualty.x,casualty.y];
 g.command([casualty.id],2600,1600,true,target.id);assert.equal(g.emitShot(casualty,target),false);
 advance(g,.5);assert.deepEqual([casualty.x,casualty.y],point);assert.equal(g.result,null);assert.equal(g.teams[1].alive,true);assert.equal(shots(g,casualty).length,0);
 advance(g,35);assert.ok(casualty.hp<=0);assert.equal(g.result,'victory');assert.equal(g.teams[1].lost,1);assert.equal(g.get(casualty.id),undefined);
 assert.ok(g.effects.some(f=>f.type==='wreck'&&f.entityId===casualty.id));
});

test('actual medic loop rescues casualty, leaves injury feedback and restores legal movement',()=>{
 const {g,e}=arena('infantry');e.hp=e.maxHp*.2;g.damage(e,e.maxHp*.3,1);assert.equal(e.components.state,'downed');
 assert.equal(g.beginDirectControl(e.id),false);const medic=g.spawn(0,'field_medic',e.x+40,e.y),point=[e.x,e.y];advance(g,2);
 assert.equal(e.components.state,'downed');assert.ok(e.components.personnel.reviveProgress>.2);assert.equal(medic.rescueAction.targetId,e.id);assert.deepEqual([e.x,e.y],point);
 advance(g,4);assert.equal(e.components.state,'operational');assert.ok(e.hp>=e.maxHp*.25);assert.equal(g.teams[0].lost,0);
 g.command([e.id],e.x+150,e.y,false);advance(g,1);assert.ok(Math.hypot(e.x-point[0],e.y-point[1])>2);
});

test('fatal airplane damage preserves a continuous crash until one central death and wreck',()=>{
 const {g,e}=arena('fighter');e.altitude=120;e.flightSpeed=120;const original={x:e.x,y:e.y};g.damage(e,e.maxHp*2,1);
 assert.equal(e.components.state,'crashing');assert.equal(e.hp,1);assert.equal(g.teams[0].lost,0);
 let previous=120,steps=0;advance(g,15,()=>{if(e.hp>0){assert.ok(e.altitude<=previous);assert.ok(previous-e.altitude<3);previous=e.altitude;steps++;}});
 assert.ok(steps>20);assert.ok(Math.hypot(e.x-original.x,e.y-original.y)>50);assert.equal(e.components.state,'dead');assert.ok(e.hp<=0);assert.equal(g.get(e.id),undefined);assert.equal(g.teams[0].lost,1);assert.equal(g.effects.filter(f=>f.type==='wreck'&&f.entityId===e.id).length,1);
});

test('IFV boarding and save/load preserve passenger identity, health, ammo and safe distinct exits',()=>{
 const {g,e}=arena('ifv'),people=Array.from({length:6},(_,i)=>g.spawn(0,'infantry',e.x+30,e.y+i));
 for(const [i,p]of people.entries()){R.ensure(g,p);p.hp-=i;p.combat.stations['infantry:primary'].ammo-=i;}
 const expected=people.map(p=>({id:p.id,hp:p.hp,ammo:p.combat.stations['infantry:primary'].ammo}));
 assert.equal(g.boardPassengers(e.id),6);for(const p of people)assert.equal(g.get(p.id),undefined);advance(g,.1);
 const saved=g.save(),loaded=WarSim.Game.load(saved),truck=loaded.get(e.id);assert.equal(truck.passengers.length,6);
 assert.equal(loaded.unloadPassengers(e.id),6);const positions=new Set();for(const v of expected){const p=loaded.get(v.id);assert.ok(p);assert.equal(p.hp,v.hp);assert.equal(p.combat.stations['infantry:primary'].ammo,v.ammo);assert.equal(p.embarkedIn,undefined);positions.add(p.x+':'+p.y);}
 assert.equal(positions.size,6);assert.equal(T.validateGame(loaded),true);
 const invalid=structuredClone(saved);invalid.entities.push(structuredClone(invalid.entities.find(v=>v.id===e.id).passengers[0]));assert.throws(()=>WarSim.Game.load(invalid));
});

test('IFV destruction settles each real passenger once and does not resurrect cargo',()=>{
 const {g,e}=arena('ifv'),people=Array.from({length:6},(_,i)=>g.spawn(0,'infantry',e.x+30,e.y+i));assert.equal(g.boardPassengers(e.id),6);
 const ids=people.map(p=>p.id);g.damage(e,e.maxHp*3,1,{component:'hull'});assert.equal(e.passengers.length,0);
 const survivors=ids.filter(id=>g.get(id)?.hp>0),lost=ids.filter(id=>!g.get(id));assert.equal(survivors.length+lost.length,6);assert.equal(g.teams[0].lost,lost.length+1);
 const losses=g.teams[0].lost;g.damage(e,e.maxHp*3,1);advance(g,.2);assert.equal(g.teams[0].lost,losses);assert.equal(T.validateGame(g),true);
 for(const id of survivors)assert.equal(g.entities.filter(p=>p.id===id).length,1);
});

test('empty AI ground unit drives toward real supply, pays for rounds and regains ammunition',()=>{
 const {g,e}=arena('ifv',1),base=g.spawn(1,'factory',e.x+380,e.y);g.teams[1].aiClock=0;R.ensure(g,e);for(const s of Object.values(e.combat.stations)){s.ammo=0;s.reserve=0;}
 const initialX=e.x;advance(g,2);assert.ok(e.combat.supplyOrder);assert.equal(e.combat.supplyOrder.sourceId,base.id);assert.ok(e.x>initialX+1);
 advance(g,12);assert.ok(Object.values(e.combat.stations).some(s=>s.ammo>0),'normal AI step must reach/refill at supply');assert.ok(Math.hypot(e.x-base.x,e.y-base.y)<=base.r+160);
});

test('repair vehicle extinguishes engine fire and repairs actual component mobility through Game.step',()=>{
 const {g,e}=arena();g.damage(e,e.maxHp*.56,1,{component:'engine'});assert.equal(e.components.state,'burning');const damaged=e.components.parts.engine.health;
 const support=g.spawn(0,'repair_vehicle',e.x+50,e.y);advance(g,4);assert.ok(support.hp>0);assert.ok(e.components.fireUntil<=g.time);assert.ok(e.components.parts.engine.health>damaged);assert.equal(e.components.state,'operational');
});

test('empty aircraft requests return through actual flight loop and base service loads paid ammunition',()=>{
 const {g,e}=arena('heli'),base=g.spawn(0,'airfield',2200,1600);e.altitude=100;e.flight=undefined;R.ensure(g,e);for(const s of Object.values(e.combat.stations))s.ammo=s.reserve=0;
 advance(g,.1);assert.equal(e.flight.returning,true);assert.equal(e.flight.homeId,base.id);
 advance(g,35);assert.ok(Object.values(e.combat.stations).some(s=>s.ammo>0),'automatic recovery must actually service aircraft');assert.ok(['service','prepare','climb','loiter','cruise'].includes(e.flight.phase),e.flight.phase);
});

test('downed direct operator cannot board through F or be silently chosen as a vehicle driver',()=>{
 const {g,e}=arena('operator'),vehicle=g.spawn(0,'ifv',e.x+40,e.y);control(g,e);e.hp=e.maxHp*.2;g.damage(e,e.maxHp*.3,1);
 assert.equal(e.components.state,'downed');assert.equal(g.vehicleInteract(e.id).ok,false);assert.equal(g.get(e.id),e);assert.equal(vehicle.vehicleCrew,undefined);
 g.endDirectControl();g.beginDirectControl(vehicle.id);assert.notEqual(vehicle.vehicleCrew?.id,e.id);assert.equal(g.get(e.id),e);advance(g,.1);assert.equal(e.components.state,'downed');
});

test('handheld grenade launches an actual arc with one ammunition debit and frozen flight across save/load',()=>{
 const {g,e}=arena('operator');control(g,e);assert.ok(g.operatorEquip(e.id,0,'grenade_01'));advance(g,.25);
 const before=g.operatorState(e).stash.grenade_01.ammo;g.setDirectInput({yaw:0,fire:true,aimX:e.x+230,aimY:e.y,aimHeight:0});g.step(.05);g.setDirectInput({yaw:0,fire:false});
 const fx=shots(g,e)[0];assert.ok(fx);assert.equal(fx.projectile.kind,'arc');assert.equal(g.operatorState(e).stash.grenade_01.ammo,before-1);
 advance(g,.2);const q=P.position(fx),loaded=WarSim.Game.load(g.save()),copy=loaded.effects.find(x=>x.projectileId===fx.projectileId);assert.deepEqual(P.position(copy),q);
 loaded.step(.05);assert.ok(P.position(copy).x>q.x);assert.ok(P.position(copy).height>q.height);assert.equal(copy.projectile.origin.x,fx.projectile.origin.x);
});

test('multiple rocket launch consumes one real rack round per projectile and preserves finite ammunition on release',()=>{
 const {g,e}=arena('rocket'),target=enemy(g,'factory',2300,1600);control(g,e,{targetId:target.id,aimX:target.x,aimY:target.y,aimHeight:0});advance(g,1.8);
 const w=g.vehicleWeapon(e,target),s=e.combat.stations[w.id],before=s.ammo,seen=new Set();
 g.setDirectInput({yaw:0,fire:true,targetId:target.id,aimX:target.x,aimY:target.y,aimHeight:0});advance(g,.22,()=>shots(g,e).forEach(f=>seen.add(f.projectileId)));
 assert.ok(seen.size>=2);assert.equal(s.ammo,before-seen.size);assert.equal(s.reserve,R.profile(g,e,w).reserve);
 g.setDirectInput({yaw:0,fire:false});const stopped=s.ammo;advance(g,.8,()=>shots(g,e).forEach(f=>seen.add(f.projectileId)));assert.equal(s.ammo,stopped);assert.equal(before-s.ammo,seen.size);
 const saved=g.save(),loaded=WarSim.Game.load(saved),copy=loaded.get(e.id);assert.equal(copy.combat.stations[w.id].ammo,stopped);assert.ok(copy.combat.stations[w.id].cooldown>0);assert.equal(WarWeaponSalvos.active(loaded,copy),false);
});

test('nested transport and driver saves reject hidden incapacitated people and corrupt operator fire modes',()=>{
 const {g,e}=arena('ifv'),p=g.spawn(0,'operator',e.x+30,e.y);g.operatorState(p);D.ensure(g,p);assert.equal(g.boardPassengers(e.id),1);const saved=g.save();
 for(const corrupt of [c=>{c.components.state='downed';c.components.personnel.downedAt=0;c.components.personnel.bleedUntil=35;},c=>{c.operatorState.fireModes.rifle_01='impossible-mode';}]){
  const altered=structuredClone(saved);corrupt(altered.entities.find(x=>x.id===e.id).passengers[0]);assert.throws(()=>WarSim.Game.load(altered));
 }
 assert.equal(g.unloadPassengers(e.id),1);control(g,p);assert.equal(g.vehicleInteract(p.id).ok,true);const driverSave=g.save();
 for(const corrupt of [c=>{c.components.state='downed';c.components.personnel.downedAt=0;c.components.personnel.bleedUntil=35;},c=>{c.operatorState.fireModes.rifle_01='impossible-mode';}]){
  const altered=structuredClone(driverSave);corrupt(altered.entities.find(x=>x.id===e.id).vehicleCrew);assert.throws(()=>WarSim.Game.load(altered));
 }
});

test('failed turret removes real weapon fire while track damage prevents motion and casualty is not a traffic obstacle',()=>{
 const {g,e}=arena(),target=enemy(g,'tank',2000,1600);select(g,e,'main_gun');control(g,e);g.damage(e,e.maxHp*.56,1,{component:'turret'});
 assert.equal(g.combatStatus(e,target).reason,'turret-damaged');const before=R.ensure(g,e).stations['tank:main_gun'].ammo;assert.equal(g.emitShot(e,target),false);assert.equal(e.combat.stations['tank:main_gun'].ammo,before);
 const {g:h,e:stopped}=arena();h.damage(stopped,stopped.maxHp*.56,1,{component:'tracks'});control(h,stopped,{forward:1,yaw:0});const point=[stopped.x,stopped.y];advance(h,1);assert.deepEqual([stopped.x,stopped.y],point);
 const casualty=h.spawn(0,'infantry',stopped.x+30,stopped.y);casualty.hp=casualty.maxHp*.2;h.damage(casualty,casualty.maxHp*.3,1);assert.equal(casualty.components.state,'downed');assert.equal(h.navigationLayer(stopped,casualty),false);
});

test('operator launch freezes a rejected observed target while independent free fire can still collide with a legal enemy',()=>{
 for(const reportTarget of [true,false]){
  const {g,e}=arena('operator'),target=enemy(g,'tank',1900,1600);target.hp=target.maxHp=10000;control(g,e);
  assert.equal(g.operatorEquip(e.id,0,'rifle_08'),true);advance(g,.25);
  g.buffs.delete('vision');g.visible.fill(0);
  assert.equal(g.directFireStatus(e,target).reason,'undetected');
  const before=target.hp,ammo=g.operatorState(e).stash.rifle_08.ammo;
  // Use the real launch method at the hidden observation, then let the real
  // main loop reveal this close target before the swept projectile arrives.
  g.stepOperator(e,.05,{fire:true,yaw:0,targetId:reportTarget?target.id:null,aimX:target.x,aimY:target.y,aimHeight:6});
  const fx=shots(g,e)[0];assert.ok(fx);assert.equal(fx.target,null);
  assert.equal(fx.excludedTargetId??null,reportTarget?target.id:null);
  assert.equal(g.operatorState(e).stash.rifle_08.ammo,ammo-1);
  g.updateFog();assert.equal(g.canDetect(e.team,target),true);advance(g,.5);
  assert.equal(target.hp<before,!reportTarget,'rejected candidate freezes only its own ID');
 }
});

test('a same-tick hit leaves only a short harmless discharge record, never a second trajectory or second damage',()=>{
 global.THREE??=require('../assets/vendor/three.min.js');require('../src/weapon-effects.js');
 const {g,e}=arena('operator'),target=enemy(g,'tank',1835,1600);target.hp=target.maxHp=10000;control(g,e);
 assert.equal(g.operatorEquip(e.id,0,'pistol_01'),true);advance(g,.25);
 const ammo=g.operatorState(e).stash.pistol_01.ammo,before=target.hp;
 g.setDirectInput({fire:true,targetId:target.id,yaw:0,aimX:target.x,aimY:target.y,aimHeight:6});g.step(.05);g.setDirectInput({fire:false});
 assert.equal(g.operatorState(e).stash.pistol_01.ammo,ammo-1);assert.ok(target.hp<before);assert.equal(shots(g,e).length,0);
 const records=g.effects.filter(x=>x.type==='discharge'&&x.sourceId===e.id);assert.equal(records.length,1);
 const fx=records[0],after=target.hp;assert.ok(fx.projectileId>0);assert.ok(fx.dischargeId);assert.equal(fx.projectile,undefined);
 assert.equal(WarWeaponEffects.drawProjectile({},g,fx),false,'launch memory must not draw a live trajectory');
 advance(g,1);assert.equal(target.hp,after);assert.equal(g.effects.some(x=>x.type==='discharge'&&x.sourceId===e.id),false);
});
