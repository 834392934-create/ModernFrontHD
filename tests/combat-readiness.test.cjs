const test=require('node:test'),assert=require('node:assert/strict'),{arena,advance}=require('./combat-mechanics-fixture.cjs');
const R=WarCombatReadiness;
const weapon=(g,e,id)=>R.weapons(g,e).find(w=>w.stationId===id)||R.weapons(g,e)[0];
test('finite ammunition, magazine transfer and shared cannon chamber survive station changes',()=>{
 const {g,e}=arena(),w=weapon(g,e,'main_gun'),p=R.profile(g,e,w),c=R.ensure(g,e),s=c.stations[p.id];
 assert(R.consumeRound(g,e,w));assert.equal(s.ammo,p.magazine-1);assert(!R.consumeRound(g,e,w));
 const he=R.weapons(g,e).find(x=>x.id!==w.id&&x.mountId===w.mountId&&x.family==='cannon');if(he)assert(!R.consumeRound(g,e,he));
 s.reserve=3;assert(R.requestReload(g,e,p.id));const ammo=s.ammo;R.step(g,e,0);assert.equal(s.ammo,ammo);
 advance(g,p.reloadSeconds+.1,dt=>R.step(g,e,dt,{weapon:w}));assert.equal(s.ammo,p.magazine);assert.equal(s.reserve,2);assert(R.validate(e,g));
});
test('player infinite reserve still reloads and never alters enemy reserve or finite stock on toggle',()=>{
 const {g,e}=arena(),enemy=g.spawn(1,'tank',2200,1600);g.buffs.add('ammo');g.buffs.add('reload');
 for(const a of [e,enemy]){const w=weapon(g,a),p=R.profile(g,a,w),s=R.ensure(g,a).stations[p.id];s.ammo=0;s.reserve=0;const ok=R.requestReload(g,a,p.id);assert.equal(ok,a.team===0);if(ok){assert.equal(s.reloadRemaining,p.reloadSeconds*.25);advance(g,s.reloadRemaining+.1,dt=>R.step(g,a,dt,{weapon:w}));assert.equal(s.ammo,p.magazine);assert.equal(s.reserve,0);}}
 g.buffs.delete('ammo');const p=R.profile(g,e,weapon(g,e)),s=e.combat.stations[p.id];s.ammo=0;assert.equal(R.requestReload(g,e,p.id),false);
});
test('artillery prepares, raises barrel, gates fire and packs before movement',()=>{
 const {g,e}=arena('arty'),w=weapon(g,e),t=g.spawn(1,'tank',2200,1600);assert.equal(R.status(g,e,w,t).reason,'preparing');
 advance(g,2,dt=>R.step(g,e,dt,{target:t,weapon:w}));assert.equal(R.status(g,e,w,t).canFire,true);assert.ok(e.turretPitch>=.15);
 g.time+=.05;R.step(g,e,.05,{target:t,weapon:w,moving:true});assert.equal(R.movementMultiplier(e),0);assert.equal(R.status(g,e,w,t).reason,'packing');
 advance(g,2,dt=>R.step(g,e,dt,{weapon:w,moving:true}));assert.equal(R.movementMultiplier(e),1);assert.equal(e.combat.stations[w.id].setupReady,false);
});
test('finite traverse, firing arcs, blocked muzzles and stationary ship bridge reject fire',()=>{
 const {g,e}=arena(),w=weapon(g,e),t=g.spawn(1,'tank',1800,1900);assert.equal(R.status(g,e,w,t).reason,'traversing');advance(g,2,dt=>R.step(g,e,dt,{target:t,weapon:w}));assert(R.status(g,e,w,t).canFire);assert.equal(R.status(g,e,w,t,{muzzleBlocked:true}).reason,'blocked');
 const ship=g.spawn(0,'destroyer',3000,2200),gun=weapon(g,ship,'naval_gun');ship.angle=0;R.ensure(g,ship);const ctx={aimX:ship.x-300,aimY:ship.y,aimHeight:g.entityAltitude(ship)};assert.equal(R.status(g,ship,gun,null,ctx).reason,'arc');assert.equal(R.status(g,ship,{...gun,mount:{...gun.mount,arc:Math.PI}},null,ctx).reason,'blocked');
});
test('all ordinary infantry and vehicle roles initialize valid state; operator is not double counted',()=>{
 const {g}=arena();for(const [kind,d]of Object.entries(WarData.U)){const e=g.spawn(0,kind,2400,2200);R.ensure(g,e);assert(R.validate(e,g),kind);if(kind==='operator')assert.equal(e.combat,undefined);}
 const infantry=g.spawn(0,'infantry',2500,2200),w=R.weapons(g,infantry)[0];assert(w.id.endsWith(':primary'));R.consumeRound(g,infantry,w);assert.equal(R.snapshot(g,infantry,w).event,'fire');
});
test('paid supply restores depleted stock only within a valid friendly source and stops without funds',()=>{
 const {g,e}=arena(),w=weapon(g,e),p=R.profile(g,e,w),s=R.ensure(g,e).stations[p.id];s.ammo=s.reserve=0;const base=g.spawn(0,'repairhub',e.x+80,e.y),money=g.teams[0].money;
 advance(g,8,dt=>R.service(g,e,base,dt));assert(s.ammo>0);assert(g.teams[0].money<money);
 s.ammo=s.reserve=0;g.teams[0].money=0;advance(g,4,dt=>R.service(g,e,base,dt));assert.equal(s.ammo,0);assert.equal(s.reserve,0);
 g.teams[0].money=10000;base.x+=1000;assert.equal(R.service(g,e,base,1),false);
});
test('aircraft dry weapons require actual service; save snapshots reject corrupt counts and preserve state',()=>{
 const {g,e}=arena('fighter');const c=R.ensure(g,e);for(const s of Object.values(c.stations)){s.ammo=0;assert.equal(s.reserve,0);}assert(R.needsReturn(g,e));assert.equal(R.requestReload(g,e),false);
 const base=g.spawn(0,'airfield',e.x+150,e.y);assert.equal(R.service(g,e,base,1),false);e.flight={phase:'service',homeId:base.id};advance(g,15,dt=>R.service(g,e,base,dt));assert(!R.needsReturn(g,e));
 const saved=structuredClone(e);assert(R.validate(saved,g));Object.values(saved.combat.stations)[0].ammo=-1;assert(!R.validate(saved,g));assert.deepEqual(structuredClone(c),e.combat);
});
test('short burst schedules only due actual rounds; stopping cancels remainder without losing reserve',()=>{
 const {g,e}=arena('ifv'),w=weapon(g,e,'autocannon'),p=R.profile(g,e,w),s=R.ensure(g,e).stations[p.id],before=s.ammo;
 assert(R.consumeRound(g,e,w));assert(R.beginBurst(g,e,w,null,{x:e.x+100,y:e.y,height:0}));assert.equal(R.takeBurst(g,e),null);g.time+=.081;const next=R.takeBurst(g,e);assert.equal(next.weaponId,w.id);assert(R.consumeRound(g,e,w,{deferCooldown:true}));assert.equal(s.ammo,before-2);assert(R.cancelBurst(e));g.time+=2;assert.equal(R.takeBurst(g,e),null);assert.equal(s.ammo,before-2);
});
test('a burst target destroyed between rounds cancels before emitting without a destination',()=>{
 const {g,e}=arena('ifv'),target=g.spawn(1,'infantry',e.x+100,e.y),w=weapon(g,e,'autocannon');assert(R.consumeRound(g,e,w));assert(R.beginBurst(g,e,w,target,null));const ammo=e.combat.stations[w.id].ammo;target.hp=0;g.time+=.2;assert.equal(R.takeBurst(g,e),null);assert.equal(e.combat.burst,null);assert.equal(e.combat.stations[w.id].ammo,ammo);
});
test('actual Game arc settles one impact and readiness ammo survives save/load',()=>{
 const {g,e}=arena('arty'),t=g.spawn(1,'tank',e.x+350,e.y);t.disabled=1e9;t.hp=t.maxHp=10000;const w=weapon(g,e),p=R.profile(g,e,w);advance(g,2,dt=>R.step(g,e,dt,{target:t,weapon:w}));const before=R.ensure(g,e).stations[p.id].ammo;
 assert(g.emitShot(e,t));const shot=g.effects.find(f=>f.sourceId===e.id&&f.type==='shot');assert.equal(shot.projectile.kind,'arc');assert.equal(e.combat.stations[p.id].ammo,before-1);e.disabled=1e9;
 const saved=WarSim.Game.load(g.save()),copy=saved.get(e.id);assert.equal(copy.combat.stations[p.id].ammo,before-1);const hp=saved.get(t.id).hp;for(let i=0;i<100;i++)saved.step(.05);assert(saved.get(t.id).hp<hp);const after=saved.get(t.id).hp;for(let i=0;i<40;i++)saved.step(.05);assert.equal(saved.get(t.id).hp,after);
});
test('fixed forward aircraft pitch limits are relative to the actual diving hull',()=>{
 const {g,e}=arena('close_support_aircraft'),w=weapon(g,e,'aircraft_gun'),t=g.spawn(1,'tank',e.x+200,e.y);e.altitude=110;e.pitch=Math.atan2(-110,200);e.angle=0;assert(R.status(g,e,w,t).canFire);e.pitch=0;assert.equal(R.status(g,e,w,t).canFire,false);
});
test('standalone rocket save validation accepts faction-only and minimal team contexts without mutating them',()=>{
 const {g,e}=arena('rocket');R.ensure(g,e);const context={teams:g.teams};assert(R.validate(e,context));assert(R.validate(e,'usa'));assert.equal(context.options,undefined);
});
test('real naval yards and spaceports supply their declared service domains with paid rounds',()=>{
 for(const [kind,sourceKind]of [['destroyer','navalyard'],['submarine','navalyard'],['orbital','spaceport']]){
  const {g,e}=arena(kind),s=g.spawn(0,sourceKind,e.x+100,e.y),w=R.weapons(g,e)[0],p=R.profile(g,e,w),c=R.ensure(g,e),stock=c.stations[p.id];g.spawn(0,'power',400,800);stock.ammo=stock.reserve=0;const before=g.teams[0].money;assert.equal(R.supplyPlan(g,e)?.sourceId,s.id,kind);advance(g,5,dt=>R.service(g,e,s,dt));assert(stock.ammo>0);assert(g.teams[0].money<before);
 }
});
test('explicit aim point wins over target and stale Euler input; real muzzle determines readiness',()=>{
 const {g,e}=arena('tank'),w=weapon(g,e),target=g.spawn(1,'tank',e.x+100,e.y+200),origin={x:e.x-30,y:e.y,height:20},ctx={weapon:w,target,aimOrigin:origin,aimX:e.x+200,aimY:e.y,aimHeight:20,aimYaw:2,aimPitch:1.5};
 advance(g,3,dt=>R.step(g,e,dt,ctx));const state=R.status(g,e,w,target,ctx);assert(state.canFire);assert(state.aimError<.01);assert(state.pitchError<.01);
});
test('static profiles are cached without sharing ammo, reload buffs or mutable configuration across games',()=>{
 const {g,e}=arena('tank'),w=weapon(g,e),p=R.profile(g,e,w),other=g.spawn(1,'tank',e.x+50,e.y);assert.strictEqual(R.profile(g,e,w),p);assert.strictEqual(R.profile(g,e,p),p);
 const s=R.ensure(g,e).stations[p.id];R.consumeRound(g,e,w);assert.equal(R.ensure(g,other).stations[p.id].ammo,p.magazine);assert(s.ammo<p.magazine);
 g.buffs.add('ammo');assert.equal(R.status(g,e,w).reserve,Infinity);g.buffs.delete('ammo');assert(Number.isFinite(R.status(g,e,w).reserve));g.options.weaponSalvos={};assert.notStrictEqual(R.profile(g,e,w),p);
});
