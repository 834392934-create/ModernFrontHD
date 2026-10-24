const test=require('node:test'),assert=require('node:assert/strict');
for(const file of ['data','roster','equipment','operator-weapons','sim'])require('../src/'+file);
const unarmedRoles=new Set(['harvester','repair_vehicle','mobile_radar','repair_ship','fleet_command_ship','electronic_warfare_ship','abyss_tender','recon_drone','early_warning_aircraft','rescue_helicopter','electronic_warfare_aircraft','air_repair_drone','satellite','orbital_repair','orbital_mapper','orbital_relay','orbital_jammer','orbital_shield','orbital_sensor']);

// Use the production Game entry point, including its dependency loading.
function arena(kind='destroyer',faction='usa',options={}){
 const g=new WarSim.Game({map:'desert',faction,enemies:1,buffs:['vision'],abilities:false,rangeMode:'balanced',...options});
 g.entities=[];g.effects=[];g.ore=[];g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.ai=()=>{};
 g.spawn(0,'hq',250,250);g.spawn(1,'hq',5800,3900);
 g.teams.forEach(t=>{t.money=0;t.aiClock=1e9;t.queue=[];t.buildQueue=[];});
 return{g,e:g.spawn(0,kind,1400,1400)};
}
function enemy(g,kind,x=1900,y=1400){const e=g.spawn(1,kind,x,y);e.disabled=1e9;e.hp=e.maxHp=100000;return e;}
function advance(g,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)g.step(.05);}
function slot(g,e,id){const w=g.vehicleWeapons(e).find(w=>w.stationId===id);assert.ok(w,e.kind+' missing '+id);return w;}
function select(g,e,id){const w=slot(g,e,id);assert.equal(g.setVehicleWeapon(e.id,w.id),true);return w;}
function shots(g,e){return g.effects.filter(f=>['shot','discharge'].includes(f.type)&&f.sourceId===e.id);}
function waitShot(g,e){for(let i=0;i<160&&!shots(g,e).length;i++)g.step(.05);return shots(g,e)[0];}
function fireInput(g,e,target){assert.equal(g.beginDirectControl(e.id),true);g.setDirectInput({yaw:Math.atan2(target.y-e.y,target.x-e.x),fire:true,targetId:target.id,aimX:target.x,aimY:target.y,aimHeight:g.entityAltitude(target)});g.step(.05);}

test('all 69 vehicle roles and six factions resolve through Game; unarmed roles never acquire guns',()=>{
 const kinds=Object.keys(WarData.U).filter(k=>(WarData.U[k].modelKind||k)!=='infantry');assert.equal(kinds.length,69);
 for(const faction of Object.keys(WarData.F)){
  const {g}=arena('tank',faction);
  for(const kind of kinds){
   const e=g.spawn(0,kind,3200,2000),weapons=g.vehicleWeapons(e);assert.ok(Array.isArray(weapons),faction+':'+kind);
   if(unarmedRoles.has(kind)){assert.equal(weapons.length,0,kind);assert.equal(g.directFireStatus(e,null,{aimX:e.x+20,aimY:e.y,aimHeight:g.entityAltitude(e)}).armed,false,kind);assert.equal(g.emitShot(e,enemy(g,'infantry',e.x+30,e.y)),false,kind);}
   else{assert.ok(weapons.length>0,kind);for(const w of weapons){assert.ok(w.id&&w.family&&w.targetDomains.length,kind);assert.equal(g.setVehicleWeapon(e.id,w.id),true,kind);assert.equal(g.weaponDefinition(e).weaponId,w.id,kind);}}
  }
 }
});

for(const [kind,stationId,family]of [['destroyer','anti_ship','missile'],['tank','land_attack','missile'],['fighter','sam','missile'],['submarine','torpedo','torpedo']])
 test('AI destroyer selects '+stationId+' against '+kind+' and produces a matching actual projectile',()=>{
  const {g,e}=arena(),target=enemy(g,kind,1650,1400);if(kind==='fighter')target.altitude=120;
  assert.equal(g.setVehicleWeapon(e.id,'auto'),true);e.target=target.id;e.order={x:target.x,y:target.y,attack:true,target:target.id};
  const shot=waitShot(g,e);assert.ok(shot,'AI must finish traversing and fire');
  assert.equal(shot.weaponId,slot(g,e,stationId).id);assert.equal(shot.weaponFamily,family);
  assert.equal(shot.weaponMuzzleClass,family==='torpedo'?'torpedo':'launcher');assert.equal(shot.rocket,family==='missile');
  assert.ok(shot.weaponDomains.includes(g.targetDomain(target.kind)));assert.ok(shot.weaponDefinition&&typeof shot.weaponDefinition==='object');assert.ok(Number.isFinite(shot.baseDamage)&&shot.baseDamage>0);
 });

test('each destroyer station supplies its own published range and manual HUD uses the selected station',()=>{
 const {g,e}=arena('destroyer','usa',{rangeMode:'published',metersPerUnit:10}),profiles={};
 for(const id of ['anti_ship','land_attack','sam','naval_gun','torpedo','ciws']){select(g,e,id);profiles[id]=g.rangeProfile(e);}
 assert.equal(profiles.land_attack.attack,160000,'Tomahawk public land-attack range');
 assert.equal(profiles.torpedo.attack,2000,'torpedo retains separate estimated 20km range');
 assert.ok(profiles.sam.attack>profiles.ciws.attack);assert.ok(profiles.naval_gun.attack<profiles.anti_ship.attack);
 select(g,e,'torpedo');const target=enemy(g,'submarine',3900,1400);assert.equal(g.directFireStatus(e,target).rangeState,'out');
 target.x=e.x+500;assert.equal(g.directFireStatus(e,target).rangeState,'in');
 assert.equal(g.directFireStatus(e,enemy(g,'tank',e.x+500,e.y)).domainAllowed,false);
});

test('destroyer short-range self defense chooses a close weapon inside missile minimum range',()=>{
 const {g,e}=arena(),target=enemy(g,'fighter',e.x+22,e.y);target.altitude=20;
 const sam=slot(g,e,'sam');assert.ok(g.engagementDistance(e,target)<sam.minRange);
 const chosen=g.vehicleWeapon(e,target);assert.ok(chosen);assert.equal(chosen.family,'autocannon');
 e.target=target.id;assert.equal(waitShot(g,e)?.weaponFamily,'autocannon');
});

test('tank switches between main gun and anti-personnel coax without permitting coax anti-armor fire',()=>{
 const {g,e}=arena('tank'),soldier=enemy(g,'infantry',1500,1400),armor=enemy(g,'tank',1510,1450);
 select(g,e,'coax_mg');assert.equal(g.canTargetKind(e,soldier.kind),true);assert.equal(g.canTargetKind(e,armor.kind),false);
 fireInput(g,e,soldier);assert.equal(shots(g,e)[0]?.weaponFamily,'machinegun');
 g.setDirectInput({});const cooldown=e.cool;select(g,e,'main_gun');assert.equal(e.cool,cooldown);
 assert.equal(g.emitShot(e,armor),false,'changing station cannot clear shared reload');
 advance(g,cooldown+.1);g.effects=[];assert.equal(g.emitShot(e,armor),true);assert.equal(shots(g,e)[0].weaponFamily,'cannon');
});

test('explicitly selecting an incompatible weapon blocks both direct control and autonomous damage',()=>{
 const {g,e}=arena(),target=enemy(g,'tank',1650,1400);select(g,e,'sam');
 assert.equal(g.canTargetKind(e,target.kind),false);assert.equal(g.canTargetKind('destroyer','tank'),true,'legacy kind query remains a coarse capability filter');
 assert.equal(g.directFireStatus(e,target).canFire,false);fireInput(g,e,target);assert.equal(shots(g,e).length,0);
 g.endDirectControl();e.target=target.id;g.command([e.id],target.x,target.y,true,target.id);advance(g,.5);
 assert.equal(shots(g,e).length,0);assert.equal(target.hp,target.maxHp);
});

test('an in-flight anti-ship missile keeps frozen damage domains after switching to land attack',()=>{
 const {g,e}=arena(),ship=enemy(g,'destroyer',1900,1400),person=enemy(g,'infantry',1901,1400),sub=enemy(g,'submarine',1900,1400);
 select(g,e,'anti_ship');assert.equal(g.emitShot(e,ship),true);const shot=shots(g,e)[0],snapshot=JSON.stringify(shot.weaponDefinition);
 assert.deepEqual(shot.weaponDomains,['naval']);const damage=shot.damage;
 select(g,e,'land_attack');assert.equal(JSON.stringify(shot.weaponDefinition),snapshot);assert.equal(shot.damage,damage);assert.deepEqual(shot.weaponDomains,['naval']);
 // Prevent a second attack while still exercising production impact settlement.
 e.disabled=1e9;advance(g,shot.max+.1);assert.ok(ship.hp<ship.maxHp);assert.equal(person.hp,person.maxHp,'no newly enabled land splash');assert.equal(sub.hp,sub.maxHp,'no water-layer leakage');
});

test('a cannon direct hit reaches the aimed model surface exactly once while movement still escapes',()=>{
 for(const edge of [false,true])for(const moved of [false,true]){
  const {g,e}=arena('tank'),target=enemy(g,'tank',1550,1400);target.angle=0;
  const bounds=WarNavigationFootprints.bounds['tank_'+g.teams[target.team].faction];
  const aim={aimX:target.x+(edge?bounds[4]-2:0),aimY:target.y,aimHeight:edge?bounds[2]-1:0};
  assert.equal(g.directAimValid(target,aim),true,'fixture aims inside the rendered model envelope');
  select(g,e,'main_gun');g.beginDirectControl(e.id);g.setDirectInput({...aim,targetId:target.id,fire:true});g.step(.05);
  const shot=shots(g,e)[0];assert.ok(shot?.directHitArea);assert.equal(shot.splash,12);
  if(edge)assert.ok(Math.hypot(shot.tx-target.x,shot.targetHeight)>shot.splash+target.r,'model hit lies beyond old centre sphere');
  if(moved)target.y+=600;e.disabled=1e9;g.setDirectInput({});advance(g,shot.ttl+.1);
  const damage=target.maxHp-target.hp;
  if(moved)assert.equal(damage,0,'the frozen hit volume cannot follow a departing target');
  else{assert.ok(damage>0,'an aimed stationary model surface must receive damage');assert.ok(damage<=shot.damage*(WarData.F[g.teams[e.team].faction].damage||1)+1e-8,'direct and splash must not double count the primary target');}
 }
});

test('weapon station persists through save/load and forged or foreign IDs are rejected',()=>{
 const {g,e}=arena(),w=select(g,e,'torpedo');e.cool=2.25;
 const copy=WarSim.Game.load(g.save()),restored=copy.get(e.id);assert.equal(restored.weaponId,w.id);assert.equal(restored.cool,2.25);assert.equal(copy.vehicleWeapon(restored).id,w.id);
 assert.equal(g.setVehicleWeapon(e.id,'not-a-weapon'),false);assert.equal(e.weaponId,w.id);
 for(const invalid of ['tank:main_gun','destroyer:missing',123,{}]){const save=structuredClone(g.save());save.entities.find(x=>x.id===e.id).weaponId=invalid;assert.throws(()=>WarSim.Game.load(save),'invalid weaponId '+JSON.stringify(invalid));}
 const old=structuredClone(g.save());delete old.entities.find(x=>x.id===e.id).weaponId;const legacy=WarSim.Game.load(old);assert.ok(legacy.vehicleWeapon(legacy.get(e.id)),'old saves default to valid automatic selection');
});

test('carrier main weapon launches real aircraft without a direct hull damage projectile',()=>{
 const {g,e}=arena('carrier'),target=enemy(g,'destroyer',2100,1400);g.teams[0].money=100000;
 const wing=select(g,e,'air_wing');assert.equal(wing.damage,0);assert.equal(g.directFireStatus(e,target).armed,true);assert.equal(g.directFireStatus(e,target).canFire,true);
 fireInput(g,e,target);g.setDirectInput({});assert.equal(shots(g,e).length,0,'the carrier must not also fire an invisible attack shell');
 const phases=new Set();for(let i=0;i<500;i++){g.step(.05);for(const p of g.entities.filter(p=>p.carrierOriginId===e.id&&p.hp>0))phases.add(p.flight?.phase);}
 const planes=g.entities.filter(p=>p.carrierOriginId===e.id&&p.hp>0);assert.ok(planes.length>0);assert.ok(planes.every(p=>WarData.U[p.kind].air&&!p.structure));
 assert.ok(phases.has('prepare'),'real deck preparation');assert.ok(phases.has('climb'),'aircraft take off');assert.ok(planes.some(p=>g.entityAltitude(p)>100));
 assert.equal(shots(g,e).length,0);assert.ok(g.teams[0].money<100000,'sorties have a production cost');
 const copy=WarSim.Game.load(g.save());assert.ok(copy.entities.some(p=>p.carrierOriginId===e.id&&p.hp>0));
});

test('carrier advertised mission domains match executable aircraft tasks in every faction',()=>{
 for(const faction of Object.keys(WarData.F))for(const kind of ['tank','destroyer','fighter']){
  const {g,e}=arena('carrier',faction),target=enemy(g,kind,1900,1400);select(g,e,'air_wing');
  const status=g.directFireStatus(e,target),accepted=g.emitShot(e,target);
  assert.equal(accepted,status.canFire,faction+':'+kind+' HUD and dispatch must agree');
  if(kind==='fighter')assert.equal(accepted,true,faction+' has an air-defense sortie');
  if(accepted){assert.ok(e.airWing?.mission);assert.ok(g.targetDomains(e.airWing.mission.kind).includes(g.targetDomain(kind)),faction+':'+kind+' dispatched aircraft must support its task');}
 }
});

test('carrier FPS rejects an invalid entity task without converting it to a free ground sortie',()=>{
 for(const mode of ['out-of-range','friendly','undetected','aim-miss','cooldown','emp']){
  const {g,e}=arena('carrier'),target=enemy(g,'destroyer',1900,1400);g.teams[0].money=100000;select(g,e,'air_wing');
  g.beginDirectControl(e.id);
  if(mode==='out-of-range')target.x=e.x+1000;
  if(mode==='friendly')target.team=e.team;
  if(mode==='undetected'){g.buffs.delete('vision');g.visibleAt=()=>false;}
  if(mode==='cooldown')e.cool=10;
  if(mode==='emp')e.disabled=100;
  const input={fire:true,targetId:target.id,aimX:target.x,aimY:target.y,aimHeight:g.entityAltitude(target)};
  if(mode==='aim-miss')input.aimY+=600;
  assert.equal(g.directFireStatus(e,target,input).reason,mode);const cooldown=e.cool;
  g.setDirectInput(input);g.stepDirectControl(e,.05);
  assert.equal(e.airWing?.mission??null,null,mode+' cannot create another task');
  assert.equal(e.cool,cooldown,mode+' rejected task cannot consume/reset cooldown');assert.equal(shots(g,e).length,0);
 }
});

test('carrier saves reject empty slots and missions incompatible with the actual faction',()=>{
 const {g,e}=arena('carrier','kor'),target=enemy(g,'fighter',1900,1400);select(g,e,'air_wing');assert.equal(g.emitShot(e,target),true);
 for(const mutate of [w=>{w.slots[0].kind='naval_strike_aircraft';},w=>{w.mission.kind='close_support_aircraft';}]){
  const save=structuredClone(g.save());mutate(save.entities.find(x=>x.id===e.id).airWing);
  assert.throws(()=>WarSim.Game.load(save),'rotor-only faction cannot restore a fixed-wing task or empty slot');
 }
 const restored=WarSim.Game.load(g.save());assert.equal(restored.get(e.id).cool,e.cool);assert.equal(restored.emitShot(restored.get(e.id),restored.get(target.id)),false,'loading cannot bypass shared aviation cooldown');
});

test('an airborne carrier aircraft survives mothership loss and prevents premature annihilation victory',()=>{
 const {g}=arena('tank');g.teams[1].money=100000;g.teams[1].faction='usa';
 const carrier=g.spawn(1,'carrier',2800,2300),target=g.spawn(0,'destroyer',3300,2300);assert.equal(g.vehicleWeapon(carrier,target).action,'airWing');
 assert.equal(g.emitShot(carrier,target),true);advance(g,18);
 const plane=g.entities.find(p=>p.carrierOriginId===carrier.id&&p.hp>0&&g.entityAltitude(p)>100);assert.ok(plane,'enemy carrier launches an actual aircraft');
 for(const e of g.entities)if(e.team===1&&e.id!==plane.id)e.hp=0;
 plane.disabled=1e9;g.step(.05);assert.ok(g.get(plane.id)?.hp>0,'airborne aircraft is not deleted with its carrier');assert.equal(g.result,null,'last surviving aircraft blocks victory');
 plane.hp=0;g.step(.05);assert.ok(g.result,'eliminating the final aircraft ends the battle');
});
