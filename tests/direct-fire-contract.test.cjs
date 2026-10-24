const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data');require('../src/roster');require('../src/equipment');require('../src/operator-weapons');require('../src/sim');
const {prepare,face,advanceUntil,emptyVegetation}=require('./combat-preparation.cjs');
function arena(kind='tank',targetKind='tank',distance=150){const g=new WarSim.Game({map:'desert',faction:'chn',enemies:1,buffs:['vision']});g.entities=[];g.effects=[];g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.ai=()=>{};g.spawn(0,'hq',200,200);g.spawn(1,'hq',5500,3500);const e=g.spawn(0,kind,2000,1800),t=g.spawn(1,targetKind,2000+distance,1800);g.beginDirectControl(e.id);e.cool=0;t.disabled=99999;g.random=()=>0;emptyVegetation(g);face(g,e,t);prepare(g,e,t);return{g,e,t};}
const aim=(g,t,more={})=>({targetId:t.id,aimX:t.x,aimY:t.y,aimHeight:g.entityAltitude(t),...more});
function tap(g,e,t,more={}){const a=aim(g,t,more);g.setDirectInput({...a,fire:true});g.setDirectInput({...a,fire:false});g.stepDirectControl(e,.05);return g.effects.filter(f=>f.type==='shot'&&f.sourceId===e.id);}
test('every armed unit captures one short trigger edge between simulation ticks',()=>{
 for(const [kind,d]of Object.entries(WarData.U).filter(([k,d])=>d.damage>0)){
  const probe=arena(kind),targetKind=kind==='operator'?'infantry':[...Object.keys(WarData.U),...Object.keys(WarData.B)].find(k=>probe.g.canTargetKind(kind,k));assert.ok(targetKind,kind+' has a legal target domain');
  const {g,e,t}=arena(kind,targetKind,((d.minRange||0)+d.range)*.5);
  const shots=tap(g,e,t);
  if(kind==='carrier'){
   assert.equal(shots.length,0,'carrier short click requests an actual sortie, never a hull shell');
   const mission=e.airWing?.mission;assert.equal(mission?.targetId,t.id,'short click preserves the requested aviation target');
   g.stepDirectControl(e,.05);assert.equal(e.airWing.mission,mission,'edge consumed once');
   g.teams[0].money=100000;for(let i=0;i<120;i++)g.step(.05);
   assert.ok(g.entities.some(p=>p.carrierOriginId===e.id&&p.hp>0&&WarData.U[p.kind].air),'accepted click produces an actual aircraft');
   assert.equal(g.effects.filter(f=>f.type==='shot'&&f.sourceId===e.id).length,0);continue;
  }
  assert.equal(shots.length,1,kind+' short click');assert.equal(shots[0].target,t.id,kind+' legal target');
  g.stepDirectControl(e,.05);assert.equal(g.effects.filter(f=>f.type==='shot'&&f.sourceId===e.id).length,1,kind+' edge consumed once');
 }
});
test('actual model roof and long hull surface are valid direct aim rather than logical-radius misses',()=>{
 for(const kind of ['tank','destroyer','omni_dreadnought']){
  const {g,e,t}=arena('omni_dreadnought',kind,250),b=WarNavigationFootprints.bounds[kind+'_chn'];
  // Target belongs to the default opponent; use its actual faction envelope.
  const box=WarNavigationFootprints.bounds[kind+'_'+g.teams[t.team].faction]||b;t.angle=0;
  const height=g.entityAltitude(t)+box[2]-1,x=t.x+box[4]-2;
  g.setDirectInput({...aim(g,t,{aimX:x,aimHeight:height}),fire:true});g.stepDirectControl(e,.05);
  assert.equal(g.effects.find(f=>f.sourceId===e.id)?.target,t.id,kind+' surface height '+height);
 }
});
test('status distinguishes range, projection, domain, fog, blocking and actual model aim',()=>{
 const {g,e,t}=arena();let s=g.directFireStatus(e,t,aim(g,t));assert.equal(s.canFire,true);assert.equal(s.rangeState,'in');assert.equal(s.reason,'ready');assert.equal(s.ammo,e.combat.stations[s.readiness.weaponId].ammo);
 t.x=e.x+s.range+1;s=g.directFireStatus(e,t);assert.equal(s.inRange,false);assert.equal(s.reason,'out-of-range');
 t.x=e.x+150;assert.equal(g.directFireStatus(e,t,{blocked:true}).reason,'blocked');assert.equal(g.directFireStatus(e,t,{aimHeight:500}).reason,'aim-miss');
 const aircraft=g.spawn(1,'fighter',e.x+150,e.y);assert.equal(g.directFireStatus(e,aircraft).reason,'domain');
 g.buffs.delete('vision');g.visibleAt=()=>false;assert.equal(g.directFireStatus(e,t).reason,'undetected');
 const o=arena('asat','orbital',300);s=o.g.directFireStatus(o.e,o.t);assert.equal(s.projected,true);assert.equal(s.distance,300);assert.ok(s.actualDistance>3000);assert.equal(s.canFire,true);
 const same=arena('orbital','orbital',300);same.t.altitude=12000;s=same.g.directFireStatus(same.e,same.t);assert.equal(s.projected,false);assert.equal(s.inRange,false);
});
test('operator status uses equipped weapon, exact ammo, reload and cooldown without spending ammo',()=>{
 const {g,e,t}=arena('operator','infantry');const w=g.operatorWeapon(e),a=g.operatorState(e).stash[w.id];let s=g.directFireStatus(e,t);assert.equal(s.range,w.range);assert.equal(s.ammo,a.ammo);assert.equal(s.canFire,true);
 a.ammo=0;s=g.directFireStatus(e,t);assert.equal(s.reason,'no-ammo');assert.equal(s.canFire,false);assert.equal(a.ammo,0);
 a.ammo=1;g.operatorState(e).reloadRemaining=.5;s=g.directFireStatus(e,t);assert.equal(s.reloading,true);assert.equal(s.reason,'reloading');
 g.operatorState(e).reloadRemaining=0;e.cool=.2;assert.equal(g.directFireStatus(e,t).reason,'cooldown');
});
test('minimum range, no weapon, EMP and cancelled trigger never acquire or damage forbidden targets',()=>{
 const a=arena('arty','tank',20);assert.equal(a.g.directFireStatus(a.e,a.t).reason,'min-range');assert.equal(tap(a.g,a.e,a.t).length,0,'inside the minimum range no projectile is launched');assert.equal(a.e.cool,0);
 for(const kind of ['harvester','field_medic']){const f=arena(kind);assert.equal(f.g.directFireStatus(f.e,f.t).reason,'unarmed');assert.equal(tap(f.g,f.e,f.t).length,0);}
 const f=arena();f.e.disabled=f.g.time+2;assert.equal(f.g.directFireStatus(f.e,f.t).reason,'emp');assert.equal(tap(f.g,f.e,f.t).length,0);
 f.e.disabled=0;f.g.setDirectInput({...aim(f.g,f.t),fire:true});f.g.setDirectInput({cancelJump:true});f.g.stepDirectControl(f.e,.05);assert.equal(f.g.effects.length,0);
});
test('a click during cooldown is consumed and is never queued for a later unsolicited shot',()=>{
 const {g,e,t}=arena();const w=g.vehicleWeapon(e,t),c=WarCombatReadiness.ensure(g,e);c.stations[w.id].cooldown=.4;c.mounts[w.mountId].cooldown=.4;assert.equal(tap(g,e,t).length,0);prepare(g,e,t);g.stepDirectControl(e,.05);assert.equal(g.effects.length,0);assert.equal(tap(g,e,t).length,1);
});
test('rotated visible hull extremities receive operator damage and a moving target still escapes fixed impact',()=>{
 for(const moved of [false,true])for(const angle of [0,Math.PI/2,Math.PI*.73]){
  const {g,e,t}=arena('operator','destroyer',150);g.operatorEquip(e.id,0,'rifle_08');e.cool=0;t.angle=angle;
  const b=WarNavigationFootprints.bounds['destroyer_'+g.teams[t.team].faction],offset=b[4]-3;
  assert.ok(offset>t.r,'fixture must hit beyond the old combat radius');
  const point={aimX:t.x+Math.cos(angle)*offset,aimY:t.y+Math.sin(angle)*offset,aimHeight:g.entityAltitude(t)+12};
  assert.equal(g.directFireStatus(e,t,point).canFire,true);
  const [shot]=tap(g,e,t,point);assert.equal(shot.target,t.id);assert.deepEqual([shot.directHitArea.x,shot.directHitArea.y],[t.x,t.y]);
  const hp=t.hp;if(moved)t.y+=600;g.setDirectInput({fire:false});e.disabled=99999;
  const steps=Math.ceil(shot.ttl/.05)+1;for(let i=0;i<steps;i++)g.step(.05);
  assert.equal(t.hp<hp,!moved,`angle ${angle} moved ${moved}`);
 }
});
test('off-model aim, wrong domain, fog and missing sonar cannot acquire or damage a target',()=>{
 for(const mode of ['off-model','domain','fog','sonar']){
  const {g,e,t}=arena(mode==='sonar'?'destroyer':'tank',mode==='domain'?'fighter':mode==='sonar'?'submarine':'tank',150);
  const point=mode==='off-model'?{aimX:t.x+500,aimY:t.y+500}:{};
  if(mode==='fog'){g.buffs.delete('vision');g.visibleAt=()=>false;}
  if(mode==='sonar'){g.buffs.delete('vision');e.disabled=99999;g.beginDirectControl(e.id);e.disabled=0;g.canDetect=()=>false;}
  const s=g.directFireStatus(e,t,{...aim(g,t),...point});assert.equal(s.canFire,false,mode);
  prepare(g,e,null,{...aim(g,t),...point});const [shot]=tap(g,e,t,point);if(mode==='domain'){assert.equal(shot,undefined,'no station can launch against an unsupported domain');assert.equal(e.cool,0);}else{assert.ok(shot,mode);assert.equal(shot.target,null,mode);}const hp=t.hp;e.disabled=99999;
  for(let i=0;i<20;i++)g.step(.05);assert.equal(t.hp,hp,mode);
 }
});
test('status uses radar-boosted rangeProfile and changing operator weapon instead of unit base range',()=>{
 const {g,e,t}=arena('operator','infantry',350);g.operatorEquip(e.id,0,'pistol_01');e.cool=0;assert.equal(g.directFireStatus(e,t).reason,'out-of-range');
 g.operatorEquip(e.id,0,'sniper_01');e.cool=0;assert.equal(g.directFireStatus(e,t).canFire,true);assert.equal(g.directFireStatus(e,t).range,WarOperatorWeapons.byId.sniper_01.range);
 const turret=g.spawn(0,'turret',1000,1000);g.spawn(0,'power',800,1000);g.spawn(0,'radar',1100,1100);const profile=g.rangeProfile(turret);assert.equal(profile.boosted,true);assert.equal(g.directFireStatus(turret,null,{aimPoint:{x:1200,y:0,z:1000}}).range,profile.attack);
});
test('pending clicks do not survive possession exit, EMP or saving/loading',()=>{
 for(const mode of ['exit','emp','save']){const {g,e,t}=arena();g.setDirectInput({...aim(g,t),fire:true});g.setDirectInput({...aim(g,t),fire:false});
  if(mode==='exit'){g.endDirectControl();g.beginDirectControl(e.id);g.stepDirectControl(e,.05);assert.equal(g.effects.length,0);}
  if(mode==='emp'){e.disabled=g.time+1;g.step(.05);e.disabled=0;g.stepDirectControl(e,.05);assert.equal(g.effects.filter(f=>f.sourceId===e.id).length,0);}
  if(mode==='save'){const loaded=WarSim.Game.load(g.save()),actor=loaded.get(e.id);loaded.beginDirectControl(actor.id);loaded.stepDirectControl(actor,.05);assert.equal(loaded.effects.length,0);}
 }
});
test('Three YZX pitch and roll rotate model hit bounds; points beyond the local box remain misses',()=>{
 const T=require('../assets/vendor/three.min.js');
 for(const kind of ['fighter','heavy_bomber','omni_dreadnought','orbital_carrier'])for(const [angle,pitch,roll]of [[.7,1.1,.8],[-1.2,-.9,-.65],[2.4,.5,1.3]]){
  const {g,t}=arena('omni_dreadnought',kind,250);Object.assign(t,{angle,pitch,roll});
  const b=WarNavigationFootprints.bounds[kind+'_'+g.teams[t.team].faction],matrix=new T.Matrix4().makeRotationFromEuler(new T.Euler(roll,-angle,pitch,'YZX'));
  const point=(x,y,z)=>{const v=new T.Vector3(x,y,z).applyMatrix4(matrix);return{aimX:t.x+v.x,aimY:t.y+v.z,aimHeight:g.entityAltitude(t)+v.y};};
  for(const local of [[b[3]+1,b[1]+1,b[5]+1],[b[4]-1,b[2]-1,b[6]-1],[(b[3]+b[4])/2,(b[1]+b[2])/2,(b[5]+b[6])/2]])assert.equal(g.directAimValid(t,point(...local)),true,kind+' rotated interior '+local);
  assert.equal(g.directAimValid(t,point(b[4]+150,b[2]+150,b[6]+150)),false,kind+' outside local box');
 }
});
test('target-ID-only input defaults to the target centre without overwriting explicit aim or free aim',()=>{
 for(const kind of ['tank','operator']){
  const {g,e,t}=arena(kind,kind==='operator'?'infantry':'tank');g.setDirectInput({fire:true,targetId:t.id,yaw:Math.PI/2});
  assert.deepEqual([g.directControl.input.aimX,g.directControl.input.aimY,g.directControl.input.aimHeight],[t.x,t.y,g.entityAltitude(t)]);
  g.setDirectInput({fire:false,targetId:t.id});g.stepDirectControl(e,.05);const shot=g.effects.find(f=>f.sourceId===e.id);assert.equal(shot.target,t.id);assert.equal(shot.tx,t.x);assert.equal(shot.ty,t.y);
  e.cool=0;prepare(g,e,t);g.effects=[];g.setDirectInput({fire:true,targetId:t.id,aimX:t.x+300});assert.equal(g.directControl.input.aimX,t.x+300);assert.equal(g.directControl.input.aimY,t.y);g.stepDirectControl(e,.05);assert.equal(g.effects.find(f=>f.sourceId===e.id).target,null);
  g.setDirectInput({fire:false,yaw:Math.PI/2});assert.ok(Math.abs(g.directControl.input.aimX-e.x)<1e-6);assert.equal(g.directControl.input.aimY,e.y+(WarData.U[kind].range||250));
 }
});
