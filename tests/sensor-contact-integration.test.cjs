const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');
for(const f of ['data','roster','equipment','sim','render','battle3d','direct-control'])require('../src/'+f);
const R=WarCombatReadiness,C=WarCarrierOperations;
function arena(){
 const g=new WarSim.Game({map:'desert',seed:325,faction:'usa',enemies:1,buffs:[],abilities:false,rangeMode:'published',metersPerUnit:10});g.entities=[];g.effects=[];g.ore=[];g.nodes=[];g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.map.tiles.fill(0);g.ai=()=>{};g.setCommanderAI(false);
 for(const tree of WarTrees.ensure(g))WarTrees.damage(g,tree.id,tree.maxHp);
 g.spawn(0,'hq',250,250);g.spawn(1,'hq',5700,3500);g.spawn(0,'power',500,500);g.teams.forEach(t=>{t.money=100000;t.queue=[];t.buildQueue=[];});return g;
}
function ticks(g,n){for(let i=0;i<n;i++)g.step(.05);}
function target(g,kind,x,y){const e=g.spawn(1,kind,x,y);e.disabled=1e9;e.hp=e.maxHp=100000;return e;}
function mappedOrder(kind){
 const g=arena(),e=g.spawn(0,kind,1300,1500),t=target(g,'power',2800,1500),mapper=g.spawn(0,'orbital_mapper',1100,1700);e.angle=e.turret=0;assert(g.entityVisible(0,t));assert(g.command([e.id],t.x,t.y,true,t.id).accepted.includes(e.id));assert.equal(e.order.target,t.id);return{g,e,t,mapper};
}

test('ground units retain the last observed order point and drop hidden target IDs after orbital contact loss',()=>{
 for(const kind of ['tank','arty']){const {g,e,t,mapper}=mappedOrder(kind),known={x:e.order.x,y:e.order.y};mapper.hp=0;t.x=3600;t.y=2300;assert(!g.entityVisible(0,t));ticks(g,1);assert.equal(e.target,null,kind);assert.equal(e.order.target,null,kind);assert.deepEqual({x:e.order.x,y:e.order.y},known,kind);ticks(g,8);assert.deepEqual({x:e.order.x,y:e.order.y},known,kind);assert.equal(g.effects.some(f=>f.type==='shot'&&f.sourceId===e.id&&f.target===t.id),false,kind);}
});

test('fixed-wing and helicopter movement do not chase updated hidden coordinates after a mapped order loses contact',()=>{
 for(const kind of ['attack_drone','heli']){const snapshots=[];for(const hiddenY of [2200,3200]){const {g,e,t,mapper}=mappedOrder(kind),known={x:e.order.x,y:e.order.y};mapper.hp=0;t.x=3700;t.y=hiddenY;assert(!g.entityVisible(0,t));ticks(g,10);assert.equal(e.target,null,kind);assert.equal(e.order.target,null,kind);assert.deepEqual({x:e.order.x,y:e.order.y},known,kind);snapshots.push({x:e.x,y:e.y,altitude:e.altitude,angle:e.angle,phase:e.flight.phase});}assert.deepEqual(snapshots[0],snapshots[1],kind+' flight must depend on last-known point, not hidden target position');}
});

test('carrier mission and real spawned aircraft retain a last-known point instead of hidden ship telemetry',()=>{
 const g=arena(),c=g.spawn(0,'carrier',2500,1800),t=target(g,'destroyer',3300,1800),mapper=g.spawn(0,'orbital_mapper',2300,2100);c.angle=0;assert(g.entityVisible(0,t));assert(C.requestStrike(g,c,t));const known={x:c.airWing.mission.x,y:c.airWing.mission.y};mapper.hp=0;t.x=4800;t.y=2800;assert(!g.entityVisible(0,t));ticks(g,1);assert.equal(c.airWing.mission.targetId,null);assert.deepEqual({x:c.airWing.mission.x,y:c.airWing.mission.y},known);assert.equal(C.requestStrike(g,c,t),false);
 ticks(g,42);const child=g.entities.find(e=>e.carrierOriginId===c.id);assert(child,'retained point mission launches an actual funded aircraft');assert.equal(child.order.target,null);assert.equal(child.target,null);assert.deepEqual({x:child.order.x,y:child.order.y},known);assert.equal(c.airWing.mission.targetId,null);
});

test('automatic ground fire requires live contact and reacquires a newly mapped structure',()=>{
 const g=arena(),e=g.spawn(0,'arty',1300,1500),t=target(g,'power',2800,1500);e.angle=e.turret=0;assert(g.rangeProfile(e).attack>1500);assert(!g.entityVisible(0,t));ticks(g,45);assert.equal(e.target,null);assert.equal(g.effects.some(f=>f.type==='shot'&&f.sourceId===e.id),false);
 const mapper=g.spawn(0,'orbital_mapper',1100,1700);let fired=false;for(let i=0;i<100&&!fired;i++){g.step(.05);fired=g.effects.some(f=>f.type==='shot'&&f.sourceId===e.id&&f.target===t.id);}assert(fired);mapper.hp=0;t.y+=500;ticks(g,1);assert.equal(e.target,null);
});

test('enemy strategic orders cannot read a never-observed surviving unit position after its HQ is gone',()=>{
 const decisions=[];for(const [x,y] of [[1200,1500],[2200,800]]){const g=arena();for(const e of g.entities)if(e.team===0)e.hp=0;const hidden=g.spawn(0,'tank',x,y),army=Array.from({length:10},(_,i)=>g.spawn(1,'tank',4200+i*70,2800));g.teams[1].money=0;g.teams[1].aiClock=0;g.teams[1].attackAt=0;g.time=200;assert(!g.entityVisible(1,hidden));WarSim.Game.prototype.ai.call(g,g.teams[1],.05);decisions.push(army.map(e=>e.order&&{x:e.order.x,y:e.order.y,target:e.order.target}));}
 assert.deepEqual(decisions[0],decisions[1],'strategic movement may scout but must not depend on hidden live coordinates');
});

test('both player and enemy SAM auto-acquisition use radar contacts and clear the target when radar is lost',()=>{
 for(const team of [0,1]){const g=arena(),sam=g.spawn(team,'sam',2600,1800),radar=g.spawn(team,'radar',2200,2100),air=g.spawn(1-team,'fighter',3600,1800);g.spawn(team,'power',2000,2300);air.altitude=65;air.disabled=1e9;air.hp=air.maxHp=100000;assert(g.entityVisible(team,air));let fired=false;for(let i=0;i<100&&!fired;i++){g.step(.05);fired=g.effects.some(f=>f.type==='shot'&&f.sourceId===sam.id&&f.target===air.id);}assert(fired,'team '+team+' must launch at its radar contact');radar.hp=0;air.y+=700;assert(!g.entityVisible(team,air));ticks(g,1);assert.equal(sam.target,null,'team '+team+' must drop contact');}
});

test('combat readiness clears hidden targets before traversing the weapon mount',()=>{
 const {g,e,t,mapper}=mappedOrder('arty');mapper.hp=0;t.y=2100;assert(!g.entityVisible(0,t));ticks(g,1);assert.equal(e.target,null);assert(Object.values(e.combat.mounts).every(m=>m.targetId!==t.id),'readiness must not preserve hidden target ID or turn toward hidden updated coordinates');
});

test('the authoritative targeted fire entry point rejects a now-hidden target before ammunition consumption',()=>{
 const {g,e,t,mapper}=mappedOrder('arty'),w=g.vehicleWeapon(e,t);for(let i=0;i<50;i++){g.time+=.05;R.step(g,e,.05,{target:t,weapon:w,intentFire:true});}g.spatial.rebuild(g.entities);assert(R.status(g,e,w,t).canFire);mapper.hp=0;assert(!g.entityVisible(0,t));const ammo=e.combat.stations[w.id].ammo;assert.equal(g.emitShot(e,t),false);assert.equal(e.combat.stations[w.id].ammo,ammo);assert.equal(g.effects.some(f=>f.type==='shot'&&f.sourceId===e.id),false);
});

function radarScene(){const g=arena(),radar=g.spawn(0,'radar',1000,1800),air=target(g,'fighter',3200,1800),hidden=target(g,'tank',3400,1900);air.altitude=65;g.updateFog();assert(!g.visibleAt(air.x,air.y));assert(g.entityVisible(0,air));assert(!g.entityVisible(0,hidden));return{g,radar,air,hidden};}
function minimap(prototype,g){const marks=[],ctx={clearRect(){},drawImage(){},strokeRect(){},fillRect(x,y,w,h){marks.push({x,y,w,h,color:this.fillStyle});}},r=Object.assign(Object.create(prototype),{mini:{width:256,height:176},mc:ctx,miniTerrain:{},fogCanvas:{},width:800,height:600,firstPerson:null,toWorld:()=>({x:0,y:0})});r.drawMinimap(g);return marks;}

test('both real minimap implementations and RTS picking follow entity contacts rather than terrain fog',()=>{
 const {g,radar,air,hidden}=radarScene();g.visible.fill(1);const marker=(marks,e)=>marks.some(m=>Math.abs(m.x-(e.x/g.map.width*256-1.5))<1e-6&&Math.abs(m.y-(e.y/g.map.height*176-1.5))<1e-6);
 for(const prototype of [WarRenderer2D.prototype,Battle3D.prototype]){const marks=minimap(prototype,g);assert(marker(marks,air));assert(!marker(marks,hidden));}
 const r=Object.assign(Object.create(Battle3D.prototype),{camera:{zoom:1},entityScreen:e=>({x:e.x,y:e.y})});assert.strictEqual(r.pick(g,air.x,air.y,true),air);assert.equal(r.pick(g,hidden.x,hidden.y,true),null);radar.disabled=g.time+10;assert.equal(r.pick(g,air.x,air.y,true),null);for(const prototype of [WarRenderer2D.prototype,Battle3D.prototype])assert(!marker(minimap(prototype,g),air));
});

test('FPS exact triangle picking accepts a radar-only aircraft and rejects a fog-only hidden vehicle',()=>{
 const {g,radar,air,hidden}=radarScene();g.visible.fill(1);const material=new THREE.MeshBasicMaterial(),geometry=new THREE.BoxGeometry(18,18,18),objects=new Map();for(const e of [air,hidden]){const o=new THREE.Mesh(geometry,material);o.position.set(e.x,g.entityAltitude(e)+8,e.y);o.updateMatrixWorld(true);objects.set(e.id,o);}
 const direct=Object.assign(Object.create(WarDirectControl.prototype),{game:g,entityId:radar.id,ray:new THREE.Raycaster(),r:{objects,world:{children:[]}}}),origin=new THREE.Vector3(2600,70,1800),aim=e=>new THREE.Vector3(e.x,g.entityAltitude(e)+8,e.y).sub(origin).normalize();
 assert.strictEqual(direct.cast(origin,aim(air),3000,false)?.entity,air);assert.equal(direct.cast(origin,aim(hidden),3000,false),null);radar.disabled=g.time+10;assert.equal(direct.cast(origin,aim(air),3000,false),null);geometry.dispose();material.dispose();
});
