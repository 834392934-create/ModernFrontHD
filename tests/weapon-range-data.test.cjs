const test=require('node:test'),assert=require('node:assert/strict');
for(const f of ['data','roster','equipment','operator-weapons'])require('../src/'+f);
const R=require('../src/weapon-range-data');
test('public entries retain units, primary source, scope and qualifiers without mutating balance',()=>{
 const before=JSON.stringify([WarData.U,WarData.B,WarOperatorWeapons.list]);
 for(const p of Object.values(R.catalog)){assert.ok(p.sourceUrl.startsWith('https://'));assert.ok(R.sources[p.source]);assert.ok(p.scope&&p.note&&p.target.length);if(p.publishedM!==null)assert.ok(p.publishedM>0);if(p.minM!==null)assert.ok(p.minM<p.publishedM);assert.ok(Object.isFrozen(p));}
 for(const faction of Object.keys(WarData.F))for(const kind of Object.keys(WarData.U))R.getProfile(kind,faction);
 assert.equal(JSON.stringify([WarData.U,WarData.B,WarOperatorWeapons.list]),before);
});
test('linear scale preserves real relative ranges, minimum limits and unknowns',()=>{
 assert.equal(R.resolve('gmlrs',{metersPerUnit:10}).range,7000);assert.equal(R.resolve('gmlrs',{metersPerUnit:10}).minRange,1500);
 assert.equal(R.resolve('gmlrs',{metersPerUnit:2}).range/R.resolve('m4a1',{metersPerUnit:2}).range,140);
 assert.equal(R.resolve('mk45_conventional').meters,24076);
 assert.equal(R.resolve('tomahawk_iv_v').range,1600000,'default 1m/u; no arbitrary map-sized cap');
 assert.equal(R.resolve('m4a1').minRange,null,'unknown minimum is not claimed to be zero');
 for(const scale of [0,-1,Infinity,NaN])assert.throws(()=>R.resolve('gmlrs',{metersPerUnit:scale}),RangeError);
});
test('effective, maximum, demonstrated and lower-bound statements never silently substitute',()=>{
 assert.equal(R.resolve('m256_demonstrated',{metric:'effective'}).known,false);
 assert.equal(R.resolve('gmlrs',{metric:'maximum'}).known,false);
 assert.equal(R.resolve('gmlrs').qualifier,'greater-than');
 assert.equal(R.resolve('m249_point',{metric:'effective'}).meters,600);
 assert.equal(R.resolve('m249_area',{metric:'effective'}).meters,800);
 assert.equal(R.resolve('pinaka_guided_trial').minRange,null,'20km trial is not minimum range');
 assert.equal(R.resolve('k2_unverified').range,null,'450km mobility is not gun range');
});
test('munition selection cannot borrow another faction, role or concept weapon',()=>{
 assert.equal(R.getProfile('tank','chn').primary.publishedM,null);
 assert.equal(R.getProfile('tank','rus').status,'inferred','T-90S brochure does not verify T-90M');
 assert.equal(R.getProfile('tank','ind').primary.estimateM,3000,'default main gun cannot inherit guided missile range');
 assert.equal(R.getProfile('tank','ind',{weaponId:'t90s_guided'}).primary.id,'t90s_guided');
 assert.equal(R.getProfile('aa','rus',{weaponId:'pantsir_gun'}).primary.publishedM,4000);
 assert.equal(R.getProfile('aa','rus',{weaponId:'akash'}).primary,null);
 assert.equal(R.getProfile('tank','imp').status,'game-setting');
 assert.equal(R.getProfile('orbital','usa').status,'game-setting');
 assert.equal(R.getProfile('harvester','usa').status,'unarmed');
 assert.equal(R.getProfile('infantry','usa').status,'inferred');
 assert.equal(R.getProfile('not_a_unit','usa').status,'invalid');
});
test('every armed slot has a labelled finite selection while all support remains unscaled',()=>{
 assert.equal(Object.keys(WarData.U).length,77);
 for(const faction of Object.keys(WarData.F))for(const [kind,d] of Object.entries({...WarData.U,...WarData.B})){
  const p=R.getProfile(kind,faction),v=R.resolve(p.primary);
  if(!d.damage){assert.equal(p.status,'unarmed',kind);assert.equal(v.known,false,kind);continue;}
  assert.ok(v.known&&v.range>0&&Number.isFinite(v.range),faction+':'+kind);
  if(p.status!=='public'){assert.equal(v.verified,false);assert.equal(R.resolve(p.primary,{metric:'published'}).known,false);assert.equal(p.primary.effectiveM,null);assert.equal(p.primary.maxM,null);}
  assert.equal(R.resolve(p.primary,{metersPerUnit:5}).range,v.range/5);
  assert.equal(R.resolve(p.primary,{metersPerUnit:10}).range,v.range/10);
 }
});
test('all 64 original weapons use honest category estimates rather than fictional model certifications',()=>{
 assert.equal(WarOperatorWeapons.list.length,64);
 for(const w of WarOperatorWeapons.list){
  const p=R.getOperatorProfile(w),v=R.resolve(p.primary);
  assert.equal(p.status,'inferred');assert.equal(v.verified,false);assert.equal(p.primary.publishedM,null);
  assert.equal(v.meters,R.operatorEstimates[w.category][0]);
  assert.deepEqual(R.getOperatorProfile(w.id),p);
  assert.equal(R.getProfile('operator','usa',{operatorWeapon:w}).primary.id,p.primary.id);
  if(w.category==='pistol'||w.category==='shotgun')assert.ok(v.range<=50);
 }
});
test('family and trial sources remain references, not exact platform performance certification',()=>{
 for(const [kind,faction] of [['ifv','usa'],['heli','usa'],['heli','kor'],['rocket','ind'],['arty','ind']]){
  const p=R.getProfile(kind,faction);assert.equal(p.status,'inferred');assert.equal(R.resolve(p.primary).verified,false);assert.ok(p.records.length);
 }
 assert.equal(R.resolve(R.getProfile('rocket','usa').primary).minRange,15000);
 assert.equal(R.resolve(R.getProfile('aa','ind').primary).minRange,4500);
 assert.equal(R.getProfile('submarine','usa').primary.estimateM,20000,'default torpedo role does not silently become TLAM');
 assert.equal(R.getProfile('destroyer','ind').primary.estimateM,24000,'visible primary naval gun cannot borrow BrahMos range');
 assert.equal(R.getProfile('destroyer','ind',{weaponId:'brahmos_baseline'}).primary.publishedM,290000);
 assert.equal(R.getProfile('aa','kor').primary.estimateM,3000,'gun-only Biho must not borrow missile range');
 assert.equal(R.getProfile('aa','kor').status,'inferred');
});
