/* CPU geometry/visual semantics checks; not a photorealism acceptance claim. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'..');global.THREE=require('../assets/vendor/three.min.js');const T=THREE;
const load=f=>vm.runInThisContext(fs.readFileSync(path.join(dir,f),'utf8'),{filename:f});
for(const f of ['src/data.js','src/roster.js','src/equipment.js','src/vehicle-motion.js','src/weapon-range-data.js','src/vehicle-weapons.js'])load(f);
for(const [,f]of fs.readFileSync(path.join(dir,'index.html'),'utf8').matchAll(/script src="([^"]+)"/g))if(/^src\/(models3d|model-detail|models-(?!imported)|vehicle-rig-|vehicle-animation|weapon-effects)/.test(f))load(f);
const E=WarWeaponEffects,V=WarVehicleWeapons;
const asShot=(p,extra={})=>({type:'shot',sourceKind:p.kind,sourceFaction:p.faction,weaponId:p.id,weaponFamily:p.family,weaponMuzzleClass:p.muzzleClass,weaponFx:p.weaponFx,rocket:p.rocket,...extra});
function model(kind,faction='chn'){const m=WarModels.create(kind,faction);m.position.set(300,40,220);m.scale.setScalar(m.userData.scale||1);WarVehicleAnimation.attach(m);m.updateMatrixWorld(true);return m;}
const near=(a,b)=>assert.ok(a.distanceTo(b)<1e-6,`${a.toArray()} != ${b.toArray()}`);

test('null vehicle weapon from personnel, unarmed or incompatible-target aim safely preserves legacy behavior',()=>{
 const empty=new T.Group();assert.equal(E.weaponAnchor(empty,null,{kind:'operator',faction:'usa'}),null);assert.equal(E.weaponAnchor(null,null),null);
 const m=model('tank'),base=m.getObjectByName('muzzle');assert.equal(E.weaponAnchor(m,null,{kind:'tank',faction:'chn'}),base);
 const support=model('harvester');assert.equal(E.weaponAnchor(support,null,{kind:'harvester'}),support.getObjectByName('muzzle')||null);WarVehicleAnimation.release(m);WarVehicleAnimation.release(support);
});

test('explicit station families override old vehicle/faction and inherited missile heuristics',()=>{
 for(const [kind,faction,families]of [['destroyer','usa',['missile','navalGun','torpedo','autocannon']],['ifv','chn',['autocannon','cannon','missile','machinegun']],['aa','usa',['missile','autocannon','machinegun']],['heli','usa',['missile','autocannon','rocket']],['heavy_bomber','usa',['bomb','missile']]]){
  for(const family of families){const p=V.list(kind,faction).find(p=>p.family===family);assert.ok(p);assert.equal(E.family(asShot(p)),family);assert.equal(E.profile(asShot(p)).name,family);}
 }
 assert.equal(E.family({sourceKind:'aa',sourceFaction:'kor',weaponFamily:'missile'}),'missile','explicit event is authoritative even for legacy country overrides');
 assert.equal(E.profile({sourceKind:'heavy_bomber',weaponFamily:'bomb'}).flash,0);assert.equal(E.profile({sourceKind:'destroyer',weaponFamily:'torpedo'}).smoke,0);
});

test('ship guns retain the exact barrel while missiles and torpedoes use independent deck and water exits',()=>{
 const m=model('destroyer'),base=m.getObjectByName('muzzle'),weapons=V.list('destroyer','chn'),gun=weapons.find(w=>w.family==='navalGun'),missile=weapons.find(w=>w.stationId==='anti_ship'),torpedo=weapons.find(w=>w.family==='torpedo');
 assert.equal(E.weaponAnchor(m,gun),base);
 const launch=E.weaponAnchor(m,missile),wet=E.weaponAnchor(m,torpedo),ciws=E.weaponAnchor(m,weapons.find(w=>w.stationId==='ciws'));assert.notEqual(launch,base);assert.notEqual(wet,base);assert.notEqual(launch,wet);
 assert.notEqual(ciws,base,'CIWS cannot flash from the main naval gun');assert.equal(ciws.userData.source,'approximate-deck-self-defense-station');assert.equal(ciws.userData.approximate,true);
 assert.equal(launch.userData.source,'existing-forward-vls-deck-cell');assert.equal(launch.userData.approximate,false);assert.equal(wet.userData.source,'approximate-side-torpedo-exit');assert.equal(wet.userData.approximate,true);
 assert.ok(wet.getWorldPosition(new T.Vector3()).y<launch.getWorldPosition(new T.Vector3()).y);
 assert.equal(E.weaponAnchor(m,missile),launch,'reuse per-instance marker');WarVehicleAnimation.release(m);
});

test('dual-armament IFVs and air defense vehicles emit gun flash at their existing secondary gun',()=>{
 for(const [kind,faction,local]of [['ifv','chn',[3.712,.28,.05]],['ifv','rus',[3.562,.39,-.21]],['aa','usa',[2.062,.53,0]],['aa','rus',[2.662,.65,.91]]]){
  const m=model(kind,faction),p=V.list(kind,faction).find(w=>w.family==='autocannon'),a=E.weaponAnchor(m,p),base=m.getObjectByName('muzzle');assert.notEqual(a,base,kind+':'+faction);
  near(a.getWorldPosition(new T.Vector3()),m.getObjectByName('turret').localToWorld(new T.Vector3(...local)));assert.equal(a.userData.source,'existing-secondary-autocannon-barrel-tip');
  const before=a.getWorldPosition(new T.Vector3());m.getObjectByName('turret').rotation.y+=.5;m.updateMatrixWorld(true);assert.ok(a.getWorldPosition(new T.Vector3()).distanceTo(before)>.1);WarVehicleAnimation.release(m);
 }
});

test('aircraft bombs, missiles and cannon use different release locations with explicit approximation metadata',()=>{
 const m=model('fighter','usa'),weapons=V.list('fighter','usa'),gun=E.weaponAnchor(m,weapons.find(w=>w.family==='autocannon')),missile=E.weaponAnchor(m,weapons.find(w=>w.family==='missile')),bomb=E.weaponAnchor(m,weapons.find(w=>w.family==='bomb'));
 assert.notEqual(gun,missile);assert.notEqual(missile,bomb);assert.equal(bomb.userData.source,'approximate-belly-store-release');assert.equal(missile.userData.source,'approximate-underwing-store-release');
 for(const a of [gun,missile,bomb]){assert.ok(a.userData.approximate);assert.ok(a.userData.boundary.includes('exact'));assert.ok(a.getWorldPosition(new T.Vector3()).toArray().every(Number.isFinite));}
 assert.notEqual(bomb.position.z,missile.position.z);assert.ok(gun.position.x>bomb.position.x);WarVehicleAnimation.release(m);
});

test('existing rocket ports and missile-sub launch covers are preserved, while its torpedo has a separate bow exit',()=>{
 const m=model('rocket','usa'),rocket=V.list('rocket','usa')[0];assert.equal(E.weaponAnchor(m,asShot(rocket,{portIndex:2})),m.getObjectByName('muzzle_2'));
 const sub=model('missile_sub'),weapons=V.list('missile_sub','chn'),launch=E.weaponAnchor(sub,weapons[0]),tube=E.weaponAnchor(sub,weapons.find(w=>w.family==='torpedo'));
 assert.equal(launch,sub.getObjectByName('muzzle'));assert.notEqual(tube,launch);assert.ok(tube.position.x>launch.position.x);assert.equal(tube.userData.source,'approximate-forward-torpedo-exit');
 WarVehicleAnimation.release(m);WarVehicleAnimation.release(sub);
});

test('shared RTS/discharge origin freezes exactly once across movement, turret motion and weapon switching',()=>{
 const m=model('destroyer'),p=V.list('destroyer','chn')[0],shot=asShot(p,{sourceId:8,x:300,y:220,tx:900,ty:500,sourceHeight:40,targetHeight:0,max:1,ttl:1,firedAt:1}),game={time:1,effects:[shot],get:()=>({id:8}),visibleAt:()=>true},renderer={objects:new Map([[8,m]]),physicalHeight:()=>40,entityHeight:()=>40};
 const physics=[shot.x,shot.y,shot.sourceHeight,shot.tx,shot.ty,shot.targetHeight],origin=E.shotOrigin(renderer,game,shot),state=E.update(renderer,game);
 assert.deepEqual(state.shots[0].origin,origin);assert.equal(shot.visualAnchor.source,'existing-forward-vls-deck-cell');
 m.position.x+=500;m.rotation.y=1;shot.weaponFamily='navalGun';m.updateMatrixWorld(true);
 assert.deepEqual(E.shotOrigin(renderer,game,shot),origin);assert.deepEqual(E.update(renderer,game).shots[0].origin,origin);assert.deepEqual([shot.x,shot.y,shot.sourceHeight,shot.tx,shot.ty,shot.targetHeight],physics);
 assert.equal(state.shots.length,1);WarVehicleAnimation.release(m);
});

test('direct-control source remains the emitted frozen point even after exiting before the first rendered frame',()=>{
 const m=model('destroyer'),p=V.list('destroyer','chn')[0],shot=asShot(p,{sourceId:8,x:11,y:22,sourceHeight:33,tx:50,ty:90,targetHeight:40,max:1,ttl:1,originFrozen:true}),game={time:1,effects:[shot],get:()=>({id:8}),visibleAt:()=>true},renderer={objects:new Map([[8,m]]),physicalHeight:()=>40,entityHeight:()=>40};
 assert.equal(game.directControl,undefined);assert.deepEqual(E.shotOrigin(renderer,game,shot),[11,33,22]);assert.deepEqual(E.update(renderer,game).shots[0].origin,[11,33,22]);WarVehicleAnimation.release(m);
});

test('markers have no mesh geometry, no cross-instance state, and preserve existing material/geometry references',()=>{
 const a=model('destroyer'),b=model('destroyer'),p=V.list('destroyer','chn')[0],meshes=[];a.traverse(n=>{if(n.isMesh)meshes.push([n,n.geometry,n.material]);});
 const marker=E.weaponAnchor(a,p);assert.ok(!marker.isMesh);assert.equal(b.getObjectByName(marker.name),undefined);const peer=E.weaponAnchor(b,p);assert.notEqual(marker,peer);marker.position.x+=1;assert.notEqual(marker.position.x,peer.position.x);
 for(const [m,g,mat]of meshes){assert.equal(m.geometry,g);assert.equal(m.material,mat);}WarVehicleAnimation.release(a);WarVehicleAnimation.release(b);
});

test('legacy shots retain their original model muzzle and visual family',()=>{
 for(const [kind,faction,want]of [['tank','chn','cannon'],['rocket','usa','rocket'],['destroyer','chn','navalGun'],['submarine','chn','torpedo'],['heavy_bomber','chn','bomb']]){
  const m=model(kind,faction),shot={sourceKind:kind,sourceFaction:faction,weaponFx:WarData.U[kind].weaponFx};assert.equal(E.family(shot),want);assert.equal(E.weaponAnchor(m,shot),m.getObjectByName('muzzle')||null);WarVehicleAnimation.release(m);
 }
});

test('licensed Burke gun remains exact while missile launch stays on a separately labelled approximate deck point',async()=>{
 global.self=globalThis;global.dispatchEvent=()=>{};global.CustomEvent=class{};load('assets/vendor/GLTFLoader.bundle.js');const Loader=T.GLTFLoader;
 T.GLTFLoader=class extends Loader{constructor(){super();this.register(()=>({name:'CPUAnchorTextureFixture',loadTexture:()=>Promise.resolve(new T.Texture())}));}};
 load('assets/models/burke-data.js');load('src/models-imported.js');await WarImported.ready;assert.equal(WarImported.status,'ready');
 const m=model('destroyer','usa');assert.equal(m.userData.assetPath,'assets/models/burke.glb');assert.equal(m.userData.license,'CC-BY-4.0');
 const weapons=V.list('destroyer','usa'),gun=E.weaponAnchor(m,weapons.find(w=>w.family==='navalGun')),missile=E.weaponAnchor(m,weapons[0]),ciws=E.weaponAnchor(m,weapons.find(w=>w.stationId==='ciws'));
 assert.equal(gun,m.getObjectByName('muzzle'));assert.equal(gun.userData.source,'licensed-original-main-gun-tip');assert.notEqual(missile,gun);
 assert.equal(missile.userData.approximate,true);assert.equal(missile.userData.source,'approximate-licensed-burke-forward-launch-deck');assert.ok(missile.position.toArray().every(Number.isFinite));WarVehicleAnimation.release(m);T.GLTFLoader=Loader;
 assert.notEqual(ciws,gun,'licensed Burke CIWS cannot reuse Mk45 aperture');assert.equal(ciws.userData.source,'approximate-deck-self-defense-station');assert.equal(ciws.userData.approximate,true);
});
