'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),h=require('./combat-desktop-harness.cjs');
if(!process.argv.includes('--source'))process.argv.push('--desktop');
const report={at:new Date().toISOString(),errors:[],checks:[]};
(async()=>{let host;try{
 const session=await h.launch('combat-allocation-317',report);host=session.host;const p=session.p;
 await p.evaluate(()=>{ModernFront.start({faction:'chn',enemies:1,map:'desert',difficulty:'normal',rangeMode:'balanced',buffs:['vision']});ModernFront.paused=true;});
 report.checks=await p.evaluate(()=>{
  const checks=[],P=WarCombatProjectiles,R=WarCombatReadiness;
  function check(name,passed,details){checks.push({name,passed,details});if(!passed)throw new Error(name+' '+JSON.stringify(details));}
  function arena(kind,display=false){const options={map:'desert',faction:'chn',enemies:1,buffs:['vision'],rangeMode:'balanced'};if(display){ModernFront.start(options);ModernFront.paused=true;}const g=display?ModernFront.game:new WarSim.Game(options);g.entities=[];g.effects=[];g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.map.tiles.fill(0);g.ai=()=>{};for(const tree of WarTrees.ensure(g))WarTrees.damage(g,tree.id,tree.maxHp);g.spawn(0,'hq',300,300);g.spawn(1,'hq',5500,3500);g.teams.forEach(t=>{t.money=0;t.queue=[];t.buildQueue=[];});const e=g.spawn(0,kind,1800,1600);e.angle=e.turret=0;g.spatial.rebuild(g.entities);return {g,e};}
  {
   const {g,e}=arena('infantry');e.hp=10;g.damage(e,1000,1);check('wounded-personnel-lethal-hit',e.hp<=0&&e.components.state==='dead',{hp:e.hp,state:e.components.state});
   const t=g.spawn(1,'infantry',1900,1600),a=g.spawn(0,'infantry',1800,1600);t.hp=10;g.damage(t,20,0);g.spatial.rebuild(g.entities);
   const fx=P.decorateLaunch(g,a,{family:'rifle',damage:30,targetDomains:['ground']},{type:'shot',sourceId:a.id,sourceKind:a.kind,from:0,x:1800,y:1600,sourceHeight:2,tx:1900,ty:1600,targetHeight:2,target:t.id,damage:30,baseDamage:30,ttl:.1,max:.1});
   const result=P.step(g,fx,.1);WarCombatImpact.resolve(g,fx);check('casualty-physical-hit',result.impact&&fx.target===t.id&&t.hp<=0,{hp:t.hp,target:fx.target});
  }
  {
   const {g,e}=arena('tank'),friends=[e,...Array.from({length:3},(_,i)=>g.spawn(0,'tank',1780,1635+i*35))],enemies=Array.from({length:4},(_,i)=>g.spawn(1,'tank',1970,1600+i*35));
   enemies.forEach(t=>{t.disabled=1e9;t.hp=t.maxHp=10000;});friends.forEach(t=>t.target=enemies[0].id);for(let i=0;i<15;i++)g.step(.05);
   check('four-unit-fire-distribution',new Set(friends.map(t=>t.target)).size===4,friends.map(t=>t.target));
  }
  {
   const {g,e}=arena('submarine'),target=g.spawn(1,'submarine',2500,1600),other=g.spawn(1,'submarine',1900,1600),w=R.weapons(g,e)[0];g.spatial.rebuild(g.entities);
   const fx=P.decorateLaunch(g,e,w,{type:'shot',sourceId:e.id,sourceKind:e.kind,from:0,x:e.x,y:e.y,sourceHeight:g.entityAltitude(e),tx:target.x,ty:target.y,targetHeight:g.entityAltitude(target),target:target.id,damage:50,baseDamage:50,ttl:5,max:5});e.hp=target.hp=0;g.buffs.delete('vision');let hit;
   for(let i=0;i<50;i++){hit=P.step(g,fx,.05);if(hit.impact||hit.expired)break;}const hp=other.hp;WarCombatImpact.resolve(g,fx);
   check('orphan-torpedo-collision',hit.impact&&fx.target===other.id&&other.hp<hp,{target:fx.target,hpBefore:hp,hpAfter:other.hp});
  }
  {
   const {g,e}=arena('destroyer');e.weaponId='destroyer:land_attack';const targets=[g.spawn(1,'tank',2300,1600),g.spawn(1,'tank',2300,1700)];g.spatial.rebuild(g.entities);const w=g.vehicleWeapon(e,targets[0]);
   for(let i=0;i<60;i++){g.time+=.05;R.step(g,e,.05,{weapon:w,target:targets[0]});}const ammo=e.combat.stations[w.id].ammo;check('ship-fire-trigger',g.emitShot(e,targets[0]));for(let i=0;i<30;i++){g.time+=.05;WarWeaponSalvos.update(g);}
   const shots=g.effects.filter(f=>f.type==='shot');check('guided-ship-salvo',shots.length===4&&new Set(shots.map(f=>f.target)).size===2&&shots.every(f=>f.projectile.phase==='vertical')&&e.combat.stations[w.id].ammo===ammo-4,shots.map(f=>({target:f.target,kind:f.projectile.kind})));
  }
  {
   const {g,e}=arena('rocket',true),targets=[g.spawn(1,'tank',2150,1600),g.spawn(1,'tank',2150,1700),g.spawn(1,'tank',2150,1500)];g.spatial.rebuild(g.entities);const w=g.vehicleWeapon(e,targets[0]);for(let i=0;i<100;i++){g.time+=.05;R.step(g,e,.05,{weapon:w,target:targets[0]});}g.emitShot(e,targets[0]);targets[0].hp=0;for(let i=0;i<60;i++){g.time+=.05;WarWeaponSalvos.update(g);}const shots=g.effects.filter(f=>f.type==='shot');check('rocket-multi-center',shots.length===8&&targets.every(t=>shots.some(f=>Math.hypot(f.tx-t.x,f.ty-t.y)<30)),shots.map(f=>({x:f.tx,y:f.ty,target:f.target})));
   const fx=shots.find(f=>f.target===targets[1].id),hp=targets[1].hp;let hit;for(let i=0;i<100;i++){hit=P.step(g,fx,.05);if(hit.impact||hit.expired)break;}WarCombatImpact.resolve(g,fx);check('salvo-survives-primary-death',hit.impact&&targets[1].hp<hp,{hpBefore:hp,hpAfter:targets[1].hp});
   ModernFront.renderer.prepare(g);ModernFront.renderer.camera={x:2020,y:1600,zoom:1.1};g.updateFog();
  }
  return checks;
 });
 await p.waitForTimeout(250);await p.screenshot({path:'screenshots/combat-allocation-317-desktop.png'});
 assert.deepEqual(report.errors,[]);assert(report.checks.every(c=>c.passed));report.passed=true;
 }catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync('docs/combat-allocation-317-desktop-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,errors:report.errors,failure:report.failure}));await host?.close();}
})();
