const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data');require('../src/roster');
const R=require('../src/weapon-range-data'),V=require('../src/vehicle-weapons');
const actor=(kind,faction='usa',weaponId='auto')=>({kind,faction,weaponId});

test('all 69 vehicle kinds are explicitly configured; eight personnel roles retain their own system',()=>{
 const vehicles=Object.entries(WarData.U).filter(([k,d])=>(d.modelKind||k)!=='infantry').map(([k])=>k);
 assert.equal(vehicles.length,69);assert.deepEqual(V.kinds.slice().sort(),vehicles.slice().sort());
 assert.deepEqual(Object.fromEntries(['ground','naval','air','space'].map(group=>[group,vehicles.filter(k=>WarData.U[k].unitGroup===group).length])),{ground:14,naval:19,air:18,space:18});
 for(const [kind,d]of Object.entries(WarData.U))if((d.modelKind||kind)==='infantry'){assert.equal(V.supported(kind),false);assert.deepEqual(V.list(kind),[]);}
 assert.equal(V.supported('not_a_vehicle'),false);assert.equal(V.resolve({kind:'operator'}),null);
});

test('every station has independent finite data, immutable target domains and a usable evidence record',()=>{
 for(const faction of Object.keys(WarData.F))for(const kind of V.kinds){
  const weapons=V.list(kind,faction),ids=new Set();
  assert.ok(Object.isFrozen(weapons));
  for(const w of weapons){
   const label=faction+':'+w.id;assert.ok(!ids.has(w.id),label);ids.add(w.id);
   assert.ok(w.id.startsWith(kind+':'));assert.ok(w.name&&w.family&&w.muzzleClass);
   for(const key of ['range','minRange','reload','damage','splash'])assert.ok(Number.isFinite(w[key])&&w[key]>=0,label+' '+key);
   assert.ok(w.range>w.minRange&&w.reload>0,label);assert.ok(Object.isFrozen(w)&&Object.isFrozen(w.targetDomains));
   assert.equal(typeof w.rocket,'boolean');assert.equal(typeof w.beam,'boolean');
   assert.ok(w.targetDomains.every(d=>V.domains.includes(d)),label);
   const range=R.resolve(w.rangeReference);assert.ok(range.known&&range.range>0,label);
   if(w.status!=='public'){assert.equal(w.rangeReference.publishedM,null,label);assert.equal(range.verified,false,label);}
   if(w.action==='airWing')assert.equal(w.damage,0);else assert.ok(w.damage>0,label);
  }
 }
});

test('logistics, radar, repair, reconnaissance and electronic support remain unarmed in every faction',()=>{
 const unarmed=V.kinds.filter(kind=>WarData.U[kind].damage===0);assert.equal(unarmed.length,19);
 for(const kind of unarmed)for(const faction of Object.keys(WarData.F)){
  assert.deepEqual(V.list(kind,faction),[],kind);assert.equal(V.resolve(actor(kind,faction),'ground'),null,kind);
  const d=V.definition(WarData.U[kind],null);assert.equal(d.damage,0);assert.equal(d.range,WarData.U[kind].range,'support radius must survive');
 }
});

test('tank selects coaxial gun for personnel and main gun for armor; saved station selection stays authoritative',()=>{
 const tank=actor('tank');assert.equal(V.resolve(tank,{domain:'ground',personnel:true}).family,'machinegun');
 assert.equal(V.resolve(tank,'ground').family,'cannon');
 tank.weaponId='tank:main_gun';assert.equal(V.resolve(tank,{domain:'ground',personnel:true}).family,'cannon');
 assert.equal(V.resolve(JSON.parse(JSON.stringify(tank)),'ground').id,tank.weaponId);
 tank.weaponId='tank:coax_mg';assert.equal(V.resolve(tank).family,'machinegun');
 assert.equal(V.resolve(tank,'air'),null);assert.equal(V.resolve(tank,'ground'),null,'coax is restricted to personnel');
 assert.equal(V.resolve(tank,{domain:'personnel'}).family,'machinegun');
 tank.weaponId='destroyer:land_attack';assert.equal(V.resolve(tank),null,'another vehicle station is never silently equipped');
});

test('guided missile destroyer chooses the weapon appropriate to surface, shore, air and underwater targets',()=>{
 const ship=actor('destroyer');
 const surface=V.resolve(ship,'naval'),shore=V.resolve(ship,'structure'),air=V.resolve(ship,'air'),sub=V.resolve(ship,'underwater');
 assert.equal(surface.stationId,'anti_ship');assert.equal(shore.stationId,'land_attack');assert.equal(air.stationId,'sam');assert.equal(sub.family,'torpedo');
 assert.equal(surface.rocket,true);assert.equal(shore.rocket,true);assert.equal(air.rocket,true);assert.equal(sub.rocket,false);
 assert.equal(shore.rangeReference.id,'tomahawk_iv_v');assert.ok(!shore.targetDomains.includes('naval'));
 assert.equal(R.resolve(shore.rangeReference).meters,1600000);assert.equal(R.resolve(sub.rangeReference).meters,20000);
 assert.ok(sub.range<shore.range);assert.ok(sub.reload!==shore.reload);assert.equal(sub.splash,0);assert.notEqual(sub.minRange,shore.minRange);
 assert.equal(V.resolve(ship,'space'),null);assert.equal(V.resolve(ship,{domain:'naval',distance:35}).family,'navalGun','inside missile blind zone use available gun');
});

test('carrier primary launches an air wing with zero direct damage and independent short-range self-defense',()=>{
 for(const faction of Object.keys(WarData.F)){
  const ship=actor('carrier',faction),primary=V.list(ship)[0];assert.equal(primary.action,'airWing');assert.equal(primary.damage,0);assert.equal(primary.family,'airWing');
  if(faction==='kor'){assert.equal(V.resolve(ship,'ground'),null);assert.equal(V.resolve(ship,'naval'),null);assert.equal(V.resolve(ship,'structure'),null);assert.equal(V.resolve(ship,'air').action,'airWing');}
  else{assert.equal(V.resolve(ship,'ground').action,'airWing');assert.equal(V.resolve(ship,'naval').action,'airWing');}
  assert.equal(V.resolve(ship,{domain:'air',allowAirWing:false}).family,'autocannon');
  assert.equal(V.resolve(ship,{domain:'ground',allowAirWing:false}),null,'carrier must not magically fire shells at the coast');
  assert.equal(V.definition(WarData.U.carrier,primary).damage,0);
 }
 const korean=V.list('carrier','kor')[0];assert.equal(korean.airWingKind,'escort_helicopter','Dokdo uses the implemented escort rotorcraft role, not land-based Apache');assert.deepEqual(korean.targetDomains,['air']);assert.equal(korean.name,'舰载直升机护航（职责近似）');
});

test('country-specific air defenses preserve missile-only, gun-only and combined stations',()=>{
 assert.deepEqual(V.list('aa','kor').map(w=>w.family),['autocannon']);assert.equal(V.list('aa','kor')[0].rangeReference.estimateM,3000);
 for(const faction of ['chn','ind'])assert.deepEqual(V.list('aa',faction).map(w=>w.family),['missile']);
 assert.deepEqual(V.list('aa','rus').map(w=>w.family),['missile','autocannon']);
 assert.equal(R.resolve(V.list('aa','rus')[0].rangeReference).meters,20000);assert.equal(R.resolve(V.list('aa','rus')[1].rangeReference).meters,4000);
 assert.deepEqual(V.list('aa','usa').map(w=>w.family),['missile','autocannon','machinegun']);
 assert.ok(V.list('aa','usa').every(w=>!w.name.includes('Hellfire')),'historical proposal does not certify present loadout');
});

test('Bradley weapons and BMP dual guns have independent stations; tank guided missile is not universally assigned',()=>{
 const usa=V.list('ifv','usa');assert.deepEqual(usa.map(w=>w.family),['autocannon','missile','machinegun']);
 assert.equal(R.resolve(usa[0].rangeReference).meters,3000);assert.equal(R.resolve(usa[1].rangeReference).meters,3750);
 assert.ok(usa[1].reload>usa[0].reload);assert.ok(usa[0].damage!==usa[1].damage);
 const bmp=V.list('ifv','rus');assert.ok(bmp.some(w=>w.family==='cannon')&&bmp.some(w=>w.family==='autocannon'));
 assert.ok(V.list('tank','ind').some(w=>w.rangeSourceKey==='t90s_guided'));
 for(const faction of ['usa','kor','chn','rus'])assert.ok(!V.list('tank',faction).some(w=>w.rangeSourceKey==='t90s_guided'));
});

test('aircraft cannon, air-to-air missile, ground missile, rocket and bomb retain distinct effects and domains',()=>{
 const fighter=actor('fighter','usa'),air=V.resolve(fighter,'air'),ground=V.resolve(fighter,'structure');
 assert.equal(air.family,'missile');assert.equal(air.rocket,true);assert.deepEqual(air.targetDomains,['air']);
 assert.equal(ground.stationId,'agm');assert.equal(ground.rocket,true);assert.ok(!ground.targetDomains.includes('air'));
 assert.ok(V.list('fighter','chn').every(w=>w.targetDomains.every(d=>d==='air')),'J-20 must not inherit Rafale strike stores');
 const heli=V.list('heli','usa');assert.deepEqual(heli.map(w=>w.family),['missile','autocannon','rocket']);
 const cannon=heli.find(w=>w.family==='autocannon');assert.equal(cannon.rocket,false);assert.ok(R.resolve(cannon.rangeReference).meters<8000);
 const bomber=V.list('heavy_bomber','usa')[0];assert.equal(bomber.family,'bomb');assert.equal(bomber.rocket,false);assert.equal(bomber.muzzleClass,'bombBay');
 const escort=V.list('escort_helicopter','usa');assert.ok(R.resolve(escort[0].rangeReference).meters>R.resolve(escort[1].rangeReference).meters);
});

test('submarine cruise missiles are constrained to evidenced faction and remain separate from torpedoes',()=>{
 assert.deepEqual(V.list('submarine','usa').map(w=>w.family),['torpedo','missile']);
 for(const faction of ['rus','chn','ind','kor'])assert.deepEqual(V.list('submarine',faction).map(w=>w.family),['torpedo']);
 const sub=actor('missile_sub'),shore=V.resolve(sub,'ground'),water=V.resolve(sub,'underwater');
 assert.equal(shore.family,'missile');assert.equal(water.family,'torpedo');assert.ok(shore.range>water.range);assert.ok(shore.minRange>water.minRange);
 assert.equal(V.resolve(sub,'air'),null);
});

test('range-aware selection uses the supplied mode, checks both edges, and does not replace an explicitly selected gun',()=>{
 const ship=actor('destroyer');assert.equal(V.resolve(ship,{domain:'air',distance:2000}),null);
 const rangeFor=w=>R.resolve(w.rangeReference,{metersPerUnit:1});assert.equal(V.resolve(ship,{domain:'air',distance:2000,rangeFor}).stationId,'sam');
 assert.equal(V.resolve(ship,{domain:'air',distance:2000,allowOutOfRange:true}).stationId,'sam');
 ship.weaponId='destroyer:ciws';assert.equal(V.resolve(ship,{domain:'air',distance:500}).stationId,'ciws','fixed selection stays selected; final fire-status enforces range');
});

test('definition clears inherited missile, beam and splash flags when switching to a gun without mutating source data',()=>{
 const original=JSON.stringify(WarData.U),base={...WarData.U.destroyer,rocket:true,beam:true,splash:999,targetBonuses:{tank:7}},p=V.list('destroyer','usa').find(w=>w.family==='navalGun'),d=V.definition(base,p);
 assert.equal(d.rocket,false);assert.equal(d.beam,false);assert.equal(d.splash,p.splash);assert.equal(d.weaponId,p.id);assert.equal(d.weaponFamily,'navalGun');
 assert.equal(d.targetBonuses,null);assert.equal(base.splash,999);assert.equal(JSON.stringify(WarData.U),original);assert.notEqual(d,base);
 const invalid=V.definition(base,null);assert.equal(invalid.damage,0);assert.deepEqual(invalid.targetDomains,[]);assert.equal(invalid.rocket,false);
});

test('space/omni stations are explicit fiction with role-specific domains, rather than a reused all-domain shell',()=>{
 for(const faction of Object.keys(WarData.F))for(const kind of V.kinds.filter(k=>WarData.U[k].space||['jet','omni_striker','high_altitude_interceptor','asat'].includes(k)))for(const w of V.list(kind,faction))assert.equal(w.status,'game-setting',faction+':'+w.id);
 for(const kind of V.kinds)for(const w of V.list(kind,'imp'))assert.equal(w.status,'game-setting',w.id);
 assert.deepEqual(V.list('orbital_point_defense','usa')[0].targetDomains,['air']);
 assert.deepEqual(V.list('orbital_siege','usa')[0].targetDomains,['structure']);
 const omni=actor('omni_striker');assert.equal(V.resolve(omni,'underwater').family,'torpedo');assert.equal(V.resolve(omni,'space').stationId,'omni_space');
 assert.ok(V.list('orbital_carrier','usa').every(w=>w.action==='fire'),'orbital fire carrier is not a real aviation carrier');
});
