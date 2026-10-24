const test=require('node:test'),assert=require('node:assert/strict'),{arena,advance}=require('./combat-mechanics-fixture.cjs');
const D=WarCombatDamage;
test('repair pulse restores parts and removes fire/flooding without healing hull HP or bypassing casualty rescue',()=>{
 const {g,e}=arena('destroyer');D.apply(g,e,e.maxHp*.45,{component:'hull'});const c=e.components,hp=e.hp;c.fireUntil=g.time+20;c.flooding=.6;c.listing=.2;const before=c.parts.hull.health;
 assert(D.repairPulse(g,e,.45));assert(c.parts.hull.health>before);assert.equal(c.fireUntil,g.time);assert(c.flooding<.2);assert(c.listing<.2);assert.equal(e.hp,hp);
 const person=g.spawn(0,'infantry',e.x+20,e.y);person.hp=0;D.apply(g,person,person.maxHp*.4,{});const saved=JSON.stringify(person.components);assert.equal(D.repairPulse(g,person,1),false);assert.equal(JSON.stringify(person.components),saved);assert.equal(person.hp,1);
 e.hp=0;assert.equal(D.repairPulse(g,e,1),false);assert.equal(e.hp,0);
});
test('medical and domain-limited support cannot repair building components, but the repair station can',()=>{
 const {g,e}=arena('power');const c=D.ensure(g,e);c.parts.structure.health=.1;c.state='disabled';g.spawn(0,'power',500,500);
 for(const kind of ['field_medic','rescue_helicopter','repair_vehicle','repair_ship','repair_dome']){const source=g.spawn(0,kind,e.x+20,e.y);assert.equal(D.repair(g,e,source,1),false,kind);assert.equal(c.parts.structure.health,.1);}
 const source=g.spawn(0,'repairhub',e.x+20,e.y);assert(D.repair(g,e,source,1));assert(c.parts.structure.health>.1);
});
test('tracks, engine and turret failures change movement and firing then repair removes them',()=>{
 const {g,e}=arena();D.ensure(g,e);D.apply(g,e,e.maxHp*.6,{component:'tracks'});assert.equal(D.mobility(e).canMove,false);D.apply(g,e,e.maxHp*.6,{component:'turret'});assert.equal(D.weaponAvailability(e,{mount:{mode:'turret'}}).available,false);
 const repair=g.spawn(0,'repair_vehicle',e.x+50,e.y);advance(g,20,dt=>D.repair(g,e,repair,dt));assert.equal(D.mobility(e).canMove,true);assert.equal(D.weaponAvailability(e,{mount:{mode:'turret'}}).available,true);assert(D.validate(e));
});
test('damaged engine burns, pause freezes and repairs extinguish; ship hull floods and lists',()=>{
 const {g,e}=arena();D.apply(g,e,e.maxHp*.5,{component:'engine'});assert.equal(e.components.state,'burning');assert(D.step(g,e,.1).damage>0);assert.equal(D.step(g,e,0).damage,0);const repair=g.spawn(0,'repair_vehicle',e.x+50,e.y);advance(g,4,dt=>D.repair(g,e,repair,dt));assert(e.components.fireUntil<=g.time);
 const ship=g.spawn(0,'destroyer',2200,2200);D.apply(g,ship,ship.maxHp*.5,{component:'hull'});const before=D.mobility(ship).speed;assert.equal(ship.components.state,'flooding');assert(D.step(g,ship,1).damage>0);assert.notEqual(ship.components.listing,0);assert(D.mobility(ship).speed<=before);
});
test('aircraft engine failure descends continuously and controlled emergency landing remains an entity',()=>{
 const {g,e}=arena('fighter');e.altitude=200;e.flightSpeed=150;D.apply(g,e,e.maxHp*.6,{component:'engine'});assert.equal(e.components.state,'crashing');const start=[e.x,e.y,e.altitude];const r=D.step(g,e,.1);assert(e.altitude<start[2]);assert(e.x>start[0]);assert(e.altitude>0);assert.equal(r.crashImpact,false);
 advance(g,20,dt=>D.step(g,e,dt));assert.equal(e.components.state,'disabled');assert(e.hp>0);assert.equal(e.altitude,3);assert(D.incapacitated(e));
});
test('personnel lethal injury can become a living casualty, successful medic rescue or timed death',()=>{
 const {g,e}=arena('infantry');e.hp=-1;D.apply(g,e,e.maxHp*.4,{sourceId:20});assert.equal(e.hp,1);assert.equal(e.components.state,'downed');assert(D.incapacitated(e));const until=e.components.personnel.bleedUntil;g.time=until;assert(D.step(g,e,.1).expireDowned);
 g.time=until-15;const medic=g.spawn(0,'field_medic',e.x+30,e.y);advance(g,6,dt=>D.repair(g,e,medic,dt));assert.equal(e.components.state,'operational');assert(e.hp>=e.maxHp*.25);assert.equal(medic.rescueAction.targetId,e.id);assert(!D.incapacitated(e));
});
test('buildings can fail and recover; malformed component data is rejected and wreck snapshots are detached',()=>{
 const {g,e}=arena('factory');g.spawn(0,'power',e.x+300,e.y);D.apply(g,e,e.maxHp*.55,{component:'structure'});assert.equal(e.components.state,'disabled');const source=g.spawn(0,'repairhub',e.x+30,e.y);advance(g,12,dt=>D.repair(g,e,source,dt));assert.equal(e.components.state,'operational');assert(D.validate(e));const wreck=D.wreck(g,e);assert.equal(wreck.entityId,e.id);wreck.components.parts.structure.health=NaN;assert(Number.isFinite(e.components.parts.structure.health));e.components.parts.structure.health=2;assert(!D.validate(e));
});
test('fatal airborne hit enters a continuous crash before central death and null source is accepted',()=>{
 const {g,e}=arena('fighter');e.altitude=120;e.flightSpeed=120;e.hp=0;assert.doesNotThrow(()=>D.apply(g,e,e.maxHp,null));assert.equal(e.hp,1);assert.equal(e.components.state,'crashing');assert.equal(D.step(g,e,.1).damage,0);
 let crash=false;advance(g,12,dt=>{const r=D.step(g,e,dt);if(r.crashImpact){crash=true;assert(r.damage>=e.maxHp);e.hp=0;D.apply(g,e,e.maxHp,{componentTick:true});}});assert(crash);assert.equal(e.components.state,'dead');
});
