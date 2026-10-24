const test=require('node:test'),assert=require('node:assert/strict');
for(const f of ['data','roster','equipment','sim'])require('../src/'+f);
function arena(kind='tank'){const g=new WarSim.Game({faction:'chn',enemies:1,map:'desert',buffs:['vision']});g.entities=[];g.ore=[];g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.ai=()=>{};g.spawn(0,'hq',300,300);g.spawn(1,'hq',5700,3500);const e=g.spawn(0,kind,1800,1400);e.angle=0;g.beginDirectControl(e.id);return {g,e};}
function step(g,s){for(let i=0;i<Math.round(s*20);i++)g.step(.05);}
test('all 77 unit kinds have an explicit game movement profile',()=>{for(const kind of Object.keys(WarData.U)){const p=WarVehicleMotion.profile(kind);assert.ok(Number.isFinite(p.accel)&&Number.isFinite(p.turn)&&p.reverse>=0,kind);}assert.equal(WarVehicleMotion.profile('tank').kind,'tracked');assert.equal(WarVehicleMotion.profile('rocket').kind,'wheeled');assert.equal(WarVehicleMotion.profile('destroyer').kind,'surface');assert.equal(WarVehicleMotion.profile('hunter_sub').kind,'submarine');});
test('wheel and track steering profiles follow actual role models and faction-specific anti-air chassis',()=>{
 for(const kind of ['recon_vehicle','tank_destroyer','mobile_radar']){const {g,e}=arena(kind);assert.equal(WarVehicleMotion.profile(e).kind,'wheeled');g.setDirectInput({strafe:1});step(g,.4);assert.equal(e.angle,0,'wheeled vehicle does not pivot at rest');}
 for(const faction of ['chn','usa','rus','ind','kor','imp']){const expected=['usa','rus','ind'].includes(faction)?'wheeled':'tracked';assert.equal(WarVehicleMotion.profile('aa',faction).kind,expected);assert.equal(WarVehicleMotion.profile({kind:'aa',faction}).kind,expected);const {g}=arena();g.teams[0].faction=faction;const aa=g.spawn(0,'aa',2500,1400);assert.equal(WarVehicleMotion.profile(aa).kind,expected);const loaded=WarSim.Game.load(g.save());assert.equal(WarVehicleMotion.profile(loaded.get(aa.id)).kind,expected);}
});
for(const kind of ['tank','rocket','destroyer','hunter_sub'])test(kind+': accelerates along its hull, mouse only aims, brakes through zero before reversing',()=>{
 const {g,e}=arena(kind),profile=WarVehicleMotion.profile(e);g.setDirectInput({forward:1,yaw:Math.PI/2,flightEnabled:true});g.step(.05);assert.ok(e.motion.signedSpeed>0&&e.motion.signedSpeed<g.effectiveSpeed(e));assert.equal(e.angle,0);assert.equal(e.y,1400);
 const station=WarCombatReadiness.profile(g,e,g.vehicleWeapon(e)),mount=e.combat.mounts[station.mountId];
 if(station.mount.mode==='turret')assert.ok(mount.yaw>0&&mount.yaw<=station.mount.yawRate*.05+1e-9);
 else if(station.mount.mode==='hull')assert.equal(mount.yaw,e.angle,'fixed bow tubes follow the unchanged hull');
 else {assert.equal(station.mount.mode,'vertical');assert.equal(mount.yaw,Math.PI/2,'VLS tracks the requested direction without rotating the hull');}
 step(g,2);const previous=e.motion.signedSpeed;g.setDirectInput({forward:-1,yaw:Math.PI/2,flightEnabled:true});g.step(.05);assert.ok(e.motion.signedSpeed>=0&&e.motion.signedSpeed<previous);step(g,3);assert.ok(e.motion.reverse);assert.ok(Math.abs(e.motion.signedSpeed)<=g.effectiveSpeed(e)*profile.reverse+1e-7);assert.equal(e.y,1400);assert.equal(e.angle,0);
});
test('tracked vehicle can pivot with opposite tracks, wheeled vehicle steers only with translation',()=>{
 for(const kind of ['tank','rocket']){const {g,e}=arena(kind);g.setDirectInput({strafe:1,yaw:0});step(g,.4);assert.equal(e.x,1800);assert.equal(e.y,1400);assert.equal(e.motion.signedSpeed,0);assert.equal(e.motion.travel,0);if(kind==='tank'){assert.ok(e.angle>0);assert.ok(e.motion.turnRate>0);}else assert.equal(e.angle,0);g.setDirectInput({forward:1,strafe:1,yaw:0});step(g,1);assert.ok(e.x!==1800&&e.y!==1400);assert.ok(Math.abs(e.motion.turnRate)<=WarVehicleMotion.profile(e).turn+1e-7);}
});
test('ordinary release brakes, safety cancellation/EMP/exit stops without ghost displacement',()=>{
 for(const action of ['cancel','emp','exit']){const {g,e}=arena();g.setDirectInput({forward:1});step(g,1);g.setDirectInput({});const x=e.x;g.step(.05);assert.ok(e.x>x,'ordinary release decelerates instead of teleporting velocity to zero');if(action==='cancel')g.setDirectInput({cancelJump:true});else if(action==='emp')e.disabled=g.time+5;else g.endDirectControl();const position=[e.x,e.y,e.angle],distance=e.motion.distance;step(g,.5);assert.deepEqual([e.x,e.y,e.angle],position);assert.equal(e.motion.signedSpeed,0);assert.equal(e.motion.distance,distance);}
});
test('blocked translation produces no wheel travel; pause freezes telemetry; load discards transient velocity',()=>{
 const {g,e}=arena();g.setDirectInput({forward:1});step(g,.5);const snapshot=JSON.stringify(e.motion);g.step(0);assert.equal(JSON.stringify(e.motion),snapshot);const saved=g.save(),loaded=WarSim.Game.load(saved),copy=loaded.get(e.id),p=[copy.x,copy.y];step(loaded,.2);assert.deepEqual([copy.x,copy.y],p);assert.equal(copy.motion.signedSpeed,0);
 g.setDirectInput({cancelJump:true});const barrier=g.spawn(0,'factory',e.x+e.r+WarData.B.factory.r+6,e.y);g.setDirectInput({forward:1});step(g,2);const travel=e.motion.travel;step(g,.3);assert.equal(e.motion.travel,travel);assert.equal(e.motion.signedSpeed,0);assert.ok(e.x<barrier.x);
});
test('RTS telemetry measures accepted travel and clears when the unit settles',()=>{
 const {g,e}=arena();g.endDirectControl();g.command([e.id],2400,1600);let travelled=0,turned=false;for(let i=0;i<1600;i++){const x=e.x,y=e.y,angle=e.angle;g.step(.05);travelled+=Math.hypot(e.x-x,e.y-y);if(Math.abs(WarVehicleMotion.angleDelta(e.angle,angle))>.001)turned=true;assert.ok(Math.abs(WarVehicleMotion.angleDelta(e.angle,angle))<=WarVehicleMotion.profile(e).turn*.05+1e-7);}assert.equal(e.order,null);assert.ok(turned);assert.ok(Math.abs(e.motion.travel-travelled)<1e-7);assert.equal(e.motion.signedSpeed,0);assert.equal(e.motion.turnRate,0);
});
