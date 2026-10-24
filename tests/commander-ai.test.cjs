const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
require('../src/data.js');require('../src/roster.js');const C=require('../src/commander-ai.js');require('../src/sim.js');
function arena(){
 const g=new WarSim.Game({map:'desert',seed:714,faction:'chn',enemies:1,buffs:['vision'],abilities:false,rangeMode:'balanced'});g.entities=[];g.effects=[];g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(1);g.spawn(0,'hq',1000,1000);g.spawn(1,'hq',5000,3000);g.spawn(0,'power',800,800);g.spawn(0,'factory',1200,800);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});C.initialize(g);return g;
}
function tick(g,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)g.step(.05);}
test('commander defaults off; enable starts real funded construction/production and remains idempotent',()=>{
 const g=arena(),e=g.spawn(0,'tank',1600,1200);assert.equal(g.commanderAI.enabled,false);assert.equal(C.run(g,g.teams[0],.05),false);g.teams[0].money=10000;
 assert.equal(C.setEnabled(g,true),true);g.step(.05);assert(g.teams[0].queue.length>0);assert(g.teams[0].buildQueue.length>0);assert(g.teams[0].spent>0);assert.equal(g._commanderAIContext,undefined);
 C.markManual(g,[e.id]);const before=C.save(g);C.setEnabled(g,true);assert.deepEqual(C.save(g),before);assert.equal(C.eligible(g,e),false);
});
test('manual ownership applies only to friendly units and stops repeated AI support/offensive replacement',()=>{
 const g=arena();g.time=200;g.teams[0].attackAt=0;C.setEnabled(g,true);const manual=g.spawn(0,'tank',1600,1200),support=g.spawn(0,'repair_vehicle',1630,1260),enemy=g.spawn(1,'tank',1700,1200);
 for(let i=0;i<9;i++)g.spawn(0,'tank',1800+i*90,1400);const report=g.command([manual.id],1600,1650,false);assert(report.accepted.includes(manual.id));C.markManual(g,[manual.id,support.id,enemy.id,g.entities[0].id,999999]);const order=structuredClone(manual.order);
 C.run(g,g.teams[0],.05);assert.deepEqual(manual.order,order);assert.equal(support.order,null);assert.equal(C.eligible(g,enemy),true);assert.deepEqual(g.commanderAI.manualIds.sort((a,b)=>a-b),[manual.id,support.id].sort((a,b)=>a-b));
});
test('disabling cancels only tagged AI orders while preserving manual orders and paid queues',()=>{
 const g=arena(),a=g.spawn(0,'tank',1600,1200),b=g.spawn(0,'tank',1600,1400);C.setEnabled(g,true);
 g.command([a.id],1800,1200,true);C.markOrders(g,[a.id],true);g.command([b.id],1800,1400,false);C.markManual(g,[b.id]);const manual=structuredClone(b.order);
 g.teams[0].money=10000;assert(g.train(0,'tank'));assert(g.build(0,'power',1000,1250));const paid=structuredClone([g.teams[0].queue,g.teams[0].buildQueue]),balance=g.teams[0].money;
 assert(C.setEnabled(g,false));assert.equal(a.order,null);assert.equal(a.target,null);assert.deepEqual(a.orderQueue,[]);assert.deepEqual(b.order,manual);assert.deepEqual([g.teams[0].queue,g.teams[0].buildQueue],paid);assert.equal(g.teams[0].money,balance);
 assert(g.commanderAI.manualIds.includes(b.id));assert(C.setEnabled(g,true));assert.deepEqual(g.commanderAI.manualIds,[]);
});
test('manual stop reservation survives multiple AI periods and only explicit re-enable releases it',()=>{
 const g=arena(),e=g.spawn(0,'tank',1600,1200);for(let i=0;i<9;i++)g.spawn(0,'tank',1800+i*90,1400);g.time=200;g.teams[0].attackAt=0;C.setEnabled(g,true);C.markManual(g,[e.id]);
 for(let i=0;i<4;i++){g.teams[0].aiClock=0;C.run(g,g.teams[0],.05);assert.equal(e.order,null);assert.equal(e.target,null);}
 C.setEnabled(g,false);C.setEnabled(g,true);assert(C.eligible(g,e));g.teams[0].attackAt=0;C.run(g,g.teams[0],.05);assert(e.order);
});
test('real Game save/load preserves takeover and manual ownership without resuming a driver',()=>{
 const g=arena(),e=g.spawn(0,'tank',1600,1200);C.setEnabled(g,true);C.markManual(g,[e.id]);const saved=g.save();assert.equal(saved.commanderAI.enabled,true);assert.equal(saved._commanderAIContext,undefined);const copy=WarSim.Game.load(saved);assert.deepEqual(copy.commanderAI,g.commanderAI);assert.equal(copy.directControl,null);assert.equal(C.eligible(copy,copy.get(e.id)),false);
 delete saved.commanderAI;const legacy=WarSim.Game.load(saved);assert.equal(legacy.commanderAI.enabled,false);
});
test('FPS preserves enabled commander preference and does not rewind its active schedule on exit',()=>{
 const g=arena(),e=g.spawn(0,'tank',1600,1200);C.setEnabled(g,true);g.teams[0].aiClock=7;g.teams[0].attackAt=240;assert(g.beginDirectControl(e.id));g.teams[0].aiClock=2;g.teams[0].attackAt=280;g.endDirectControl();assert.equal(g.commanderAI.enabled,true);assert.equal(g.teams[0].aiClock,2);assert.equal(g.teams[0].attackAt,280);
 C.setEnabled(g,false);g.teams[0].aiClock=11;g.teams[0].attackAt=300;g.beginDirectControl(e.id);g.teams[0].aiClock=1;g.teams[0].attackAt=310;g.endDirectControl();assert.equal(g.teams[0].aiClock,11);assert.equal(g.teams[0].attackAt,300);
});
test('run has bounded scheduling, exception-safe context, no pause progression and respects game over',()=>{
 const g=arena();C.setEnabled(g,true);const before=JSON.stringify(g.save());assert.equal(C.run(g,g.teams[0],0),false);assert.equal(JSON.stringify(g.save()),before);assert.equal(C.run(g,g.teams[1],.05),false);
 const ai=g.ai;g.ai=function(){assert.equal(this._commanderAIContext,true);throw Error('test decision failure');};try{assert.throws(()=>C.run(g,g.teams[0],.05),/decision failure/);assert.equal(g._commanderAIContext,undefined);g._commanderAIContext='outer';assert.throws(()=>C.run(g,g.teams[0],.05));assert.equal(g._commanderAIContext,'outer');}finally{g.ai=ai;delete g._commanderAIContext;}
 g.result={win:true};assert.equal(C.run(g,g.teams[0],.05),false);C.setEnabled(g,false);assert.equal(C.setEnabled(g,true),false);
});
test('observed contacts obey actual fog/sonar and commander never gets an implicit vision buff',()=>{
 const g=arena();g.buffs.delete('vision');g.visible.fill(0);const enemy=g.spawn(1,'tank',4500,2500),friend=g.spawn(0,'tank',1600,1200),sub=g.spawn(1,'submarine',4300,500);C.setEnabled(g,true);assert.equal(C.observed(g,enemy),false);assert.equal(C.observed(g,friend),false);assert.equal(C.observed(g,sub),false);assert.equal(g.buffs.has('vision'),false);
 g.visible[Math.floor(enemy.y/WarData.T)*WarData.COLS+Math.floor(enemy.x/WarData.T)]=1;assert(C.observed(g,enemy));enemy.hp=0;assert.equal(C.observed(g,enemy),false);
});
test('actual commander decisions cannot lock an unseen enemy entity through strategic attack orders',()=>{
 const g=arena();g.buffs.delete('vision');g.visible.fill(0);g.nodes=[];g.time=200;g.teams[0].attackAt=0;const units=[];for(let i=0;i<10;i++)units.push(g.spawn(0,'tank',1500+i*55,1500));C.setEnabled(g,true);C.run(g,g.teams[0],.05);
 for(const e of units)assert.equal(e.order?.target??null,null,'unknown enemy identity must not be passed to attack orders');assert.equal(g.buffs.has('vision'),false);
});
test('explicit helper invokes actual funded Game AI without advancing the simulation clock',()=>{
 const g=arena();C.setEnabled(g,true);g.teams[0].money=10000;const time=g.time;assert(C.run(g,g.teams[0],.05));assert(g.teams[0].queue.length>0);assert(g.teams[0].buildQueue.length>0);assert(g.teams[0].money<10000);assert.equal(g.time,time);assert.equal(g._commanderAIContext,undefined);
});
test('disabling cancels unlaunched real MLRS rounds and leaves the already emitted projectile intact',()=>{
 const g=arena(),e=g.spawn(0,'rocket',2000,1500),target=g.spawn(1,'tank',2400,1500);C.setEnabled(g,true);e.angle=e.turret=0;target.disabled=9999;g.updateFog();g.spatial.rebuild(g.entities);
 const w=g.vehicleWeapons(e).find(w=>w.stationId==='rocket_salvo');assert(w);g.setVehicleWeapon(e.id,w.id);for(let i=0;i<120&&!WarCombatReadiness.status(g,e,w,target).canFire;i++){g.time+=.05;WarCombatReadiness.step(g,e,.05,{weapon:w,target});}
 assert(g.emitShot(e,target));assert(WarWeaponSalvos.active(g,e));const emitted=g.effects.find(f=>f.sourceId===e.id&&f.type==='shot'),ammo=e.combat.stations[w.id].ammo;assert(emitted);const snapshot=structuredClone(emitted);
 C.markOrders(g,[e.id],true);C.setEnabled(g,false);assert.equal(WarWeaponSalvos.active(g,e),false);assert.deepEqual(emitted,snapshot);assert.equal(e.combat.stations[w.id].ammo,ammo);
});
test('manual ownership remains attached to a living embarked person and is pruned only after death',()=>{
 const g=arena(),p=g.spawn(0,'infantry',1600,1200),vehicle=g.spawn(0,'ifv',1620,1200);C.setEnabled(g,true);C.markManual(g,[p.id]);assert(WarTransportOperations.board(g,vehicle,p));assert.equal(g.get(p.id),undefined);const s=C.save(g);assert(s.manualIds.includes(p.id));assert(C.validate(s,g));p.hp=0;assert.deepEqual(C.save(g).manualIds,[]);
});
test('serialization is isolated, legacy optional, and malformed authority is rejected',()=>{
 const g=arena(),e=g.spawn(0,'tank',1600,1200);C.setEnabled(g,true);C.markManual(g,[e.id]);const s=C.save(g);s.manualIds.length=0;assert(g.commanderAI.manualIds.includes(e.id));assert(C.validate(undefined,g));
 for(const bad of [null,{},false,{schema:2,enabled:true,manualIds:[],aiOrderIds:[]},{schema:1,enabled:'yes',manualIds:[],aiOrderIds:[]},{schema:1,enabled:true,manualIds:[e.id,e.id],aiOrderIds:[]},{schema:1,enabled:true,manualIds:[e.id],aiOrderIds:[e.id]},{schema:1,enabled:true,manualIds:[g.entities[1].id],aiOrderIds:[]}]){assert.equal(C.validate(bad,g),false);assert.throws(()=>C.load(g,bad));}
 e.hp=0;assert.deepEqual(C.save(g).manualIds,[]);C.load(g,undefined);assert.equal(g.commanderAI.enabled,false);
});
test('actual retreat button preserves its human return order when takeover is switched off',()=>{
 const g=arena(),e=g.spawn(0,'tank',1600,1200);C.setEnabled(g,true);g.command([e.id],2000,1400,true);C.markOrders(g,[e.id],true);
 const source=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),match=source.match(/retreatButton\.onclick=(.*?);\$\('\.command-buttons'\)/);assert(match,'actual retreat button callback must be found');
 const callback=vm.runInNewContext('('+match[1]+')',{game:g,selection:new Set([e.id]),toast(){}});callback();assert(e.order);const order=structuredClone(e.order);assert(g.commanderAI.manualIds.includes(e.id));C.setEnabled(g,false);assert.deepEqual(e.order,order);
});
test('actual successful resupply button reserves the selected unit for the player',()=>{
 const g=arena(),e=g.spawn(0,'tank',1600,1200);C.setEnabled(g,true);const w=g.vehicleWeapon(e),st=WarCombatReadiness.ensure(g,e).stations[w.id];st.reserve=0;
 const source=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),line=source.split(/\r?\n/).find(s=>s.includes("$('#combat-supply').onclick="));assert(line);const expression=line.slice(line.indexOf('.onclick=')+9).trim().replace(/;$/,'');
 const callback=vm.runInNewContext('('+expression+')',{game:g,vehicle:e,toast(){},updateHUD(){}});callback();assert(e.combat.supplyOrder,'actual Game accepts a real supply request');assert(g.commanderAI.manualIds.includes(e.id));
});
test('a long match recycles dead authority entries instead of silently losing new manual commands',()=>{
 const g=arena();C.setEnabled(g,true);for(let i=0;i<1000;i++){const e=g.spawn(0,'infantry',1600,1200);C.markManual(g,[e.id]);e.hp=0;g.entities=g.entities.filter(x=>x!==e);}
 const current=g.spawn(0,'tank',1600,1200);C.markManual(g,[current.id]);assert.equal(C.eligible(g,current),false);assert(g.commanderAI.manualIds.length<=1000);
});
test('long-match AI ownership cleanup still cancels newly assigned orders on disable',()=>{
 const g=arena();C.setEnabled(g,true);for(let i=0;i<1000;i++){const e=g.spawn(0,'infantry',1600,1200);C.markOrders(g,[e.id],true);e.hp=0;g.entities=g.entities.filter(x=>x!==e);}
 const e=g.spawn(0,'tank',1600,1200);assert(g.command([e.id],1850,1200,false).accepted.includes(e.id));C.markOrders(g,[e.id],true);assert(g.commanderAI.aiOrderIds.includes(e.id));C.setEnabled(g,false);assert.equal(e.order,null);
});
test('authority compaction preserves living embarked personnel while reclaiming dead IDs',()=>{
 const g=arena(),p=g.spawn(0,'infantry',1600,1200),vehicle=g.spawn(0,'ifv',1620,1200);C.setEnabled(g,true);C.markManual(g,[p.id]);assert(WarTransportOperations.board(g,vehicle,p));
 for(let i=0;i<999;i++){const e=g.spawn(0,'infantry',1800,1200);C.markManual(g,[e.id]);e.hp=0;g.entities=g.entities.filter(x=>x!==e);}
 const current=g.spawn(0,'tank',1600,1200);C.markManual(g,[current.id]);assert.deepEqual(new Set(g.commanderAI.manualIds),new Set([p.id,current.id]));assert.equal(C.eligible(g,p),false);assert(C.validate(C.save(g),g));
});
test('FPS protection respects commander manual exclusions and an in-seat save preserves the running schedule',()=>{
 const g=arena(),driver=g.spawn(0,'tank',1600,1200),manual=g.spawn(0,'tank',1700,1200),support=g.spawn(0,'repair_vehicle',1600,1300);C.setEnabled(g,true);
 assert(g.command([manual.id],1900,1500,false,null,{source:'player'}).accepted.includes(manual.id));g.manualCommand([support.id]);const order=structuredClone(manual.order);assert(g.beginDirectControl(driver.id));driver.hp=driver.maxHp*.4;
 C.run(g,g.teams[0],.05);assert.deepEqual(manual.order,order);assert.equal(manual.protectionRole,undefined);assert.equal(support.protectionRole,undefined);assert.equal(support.order,null);
 g.teams[0].aiClock=3.25;g.teams[0].attackAt=288;const copy=WarSim.Game.load(g.save());assert.equal(copy.directControl,null);assert.equal(copy.commanderAI.enabled,true);assert.equal(copy.teams[0].aiClock,3.25);assert.equal(copy.teams[0].attackAt,288);assert.equal(C.eligible(copy,copy.get(manual.id)),false);assert.equal(C.eligible(copy,copy.get(support.id)),false);
});
