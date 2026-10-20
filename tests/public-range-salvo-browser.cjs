/* Native serial acceptance. Fixtures place targets; only real LMB starts salvos.
 * No fake effects, clock jumps or damage writes after firing. Parent runs GPU. */
const {chromium,_electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const desktop=process.argv.includes('--desktop'),suffix=desktop?'desktop':'browser';
const report={recordedAt:new Date().toISOString(),checks:[],errors:[],scope:'Public ranges, real-input eight-port salvo, normalized damage and cancellation; CPU metadata does not certify real weapon fidelity'};
let host,p;
function check(s){report.checks.push(s);console.log(s);}
async function pause(v){if(await p.evaluate(()=>ModernFront.paused)!==v)await p.keyboard.press(await p.evaluate(()=>ModernFront.direct.active?'KeyP':'Space'));await p.waitForFunction(v=>ModernFront.paused===v,v);}
async function lock(){await p.bringToFront();for(let n=0;n<3;n++){if(await p.evaluate(()=>!!document.pointerLockElement))return;await p.waitForTimeout(1400);await p.mouse.click(720,400);}await p.waitForFunction(()=>!!document.pointerLockElement,null,{timeout:2000});}
async function enter(id){await p.keyboard.press('KeyJ');await p.waitForFunction(()=>ModernFront.direct.vehicleMenu.open);await p.locator('#vehicle-search').fill('');await p.locator('#vehicle-group').selectOption('all');await p.locator(`[data-player-unit="${id}"]`).click();await p.waitForFunction(id=>ModernFront.direct.entityId===id&&ModernFront.direct.active,id);await pause(false);await lock();}
async function fixture(kind='rocket',faction='chn'){
 if(await p.evaluate(()=>ModernFront.direct.active)){await p.keyboard.press('KeyE');await p.waitForFunction(()=>!ModernFront.direct.active);}
 await pause(true);
 const ids=await p.evaluate(({kind,faction})=>{
  window.__publicSalvo?.restore?.();const g=ModernFront.game,r=ModernFront.renderer;
  g.entities=[];g.effects=[];g.ore=[];g.result=null;g.buffs.add('vision');g.options.rangeMode='published';g.options.metersPerUnit=1;
  g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.teams[0].faction=faction;g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;t.queue=[];t.buildQueue=[];});
  g.spawn(0,'hq',300,3200);g.spawn(1,'hq',5700,3500);const e=g.spawn(0,kind,1800,1400),target=g.spawn(1,'tank',2100,1400);
  target.hp=target.maxHp=10000;target.disabled=1e9;e.angle=e.pitch=e.roll=0;e.cool=0;
  for(const child of [...r.world.children])if(child!==r.water&&child.name!=='terrain-with-seabed')r.world.remove(child);
  r.vegetationColliders=[];g.directObstacles=[];g.spatial.rebuild(g.entities);g.updateFog();return{actor:e.id,target:target.id};
 },{kind,faction});
 await enter(ids.actor);
 await p.evaluate(id=>{const d=ModernFront.direct,g=ModernFront.game,t=g.get(id);for(let i=0;i<3;i++){d.updateCamera();const v=new THREE.Vector3(t.x,12,t.y).sub(d.eye);d.yaw=Math.atan2(v.z,v.x);d.pitch=Math.atan2(v.y,Math.hypot(v.x,v.z));}d.updateCamera();d.aimResult=d.aim();d.submit(true);},ids.target);
 await p.waitForTimeout(120);
 await p.evaluate(ids=>{
  const g=ModernFront.game,d=ModernFront.direct,a=window.__publicSalvo={shots:[],ids,initialHp:g.get(ids.target).hp};
  const emit=g.emitShot,update=WarWeaponSalvos.update,seen=new WeakSet();
  function observe(){const model=d.r.objects.get(ids.actor);for(const f of g.effects)if(f.type==='shot'&&f.sourceId===ids.actor&&!seen.has(f)){seen.add(f);const index=f.portIndex??0,port=model?.userData.firePorts?.[index],node=port?model.getObjectByName(port.node):model?.getObjectByName('muzzle'),muzzle=node?.getWorldPosition(new THREE.Vector3()).toArray();a.shots.push({portIndex:f.portIndex,salvoIndex:f.salvoIndex,count:f.salvoCount,origin:[f.x,f.sourceHeight,f.y],muzzle:muzzle??null,end:[f.tx,f.targetHeight,f.ty],baseDamage:f.baseDamage,damage:f.damage,firedAt:f.firedAt});}}
  g.emitShot=function(...args){const result=emit.apply(this,args);observe();return result;};
  WarWeaponSalvos.update=function(game,...args){const result=update.call(this,game,...args);if(game===g)observe();return result;};
  a.restore=()=>{g.emitShot=emit;WarWeaponSalvos.update=update;};
 },ids);return ids;
}
async function state(){return p.evaluate(()=>{const g=ModernFront.game,a=window.__publicSalvo,e=g.get(a.ids.actor),target=g.get(a.ids.target);return{time:g.time,shots:a.shots,hp:target?.hp,initialHp:a.initialHp,active:WarWeaponSalvos.active(g,e),cool:e.cool,range:g.rangeProfile(e),damageBudget:g.attackDamage(e.kind,target,WarData.U[e.kind].damage),unitDamage:WarData.U[e.kind].damage,aim:ModernFront.direct.aimResult?.point?.toArray(),contact:ModernFront.direct.el('orbit-contact').textContent};});}
(async()=>{try{
 for(const name of ['.tmp','docs','screenshots'])fs.mkdirSync(name,{recursive:true});
 if(desktop){const {executable,appRoot}=require('./desktop-path.cjs');const profile=path.resolve(process.env.MODERN_FRONT_TEST_PROFILE||`.tmp/native-profile-public-range-${process.pid}`);fs.mkdirSync(profile,{recursive:true});report.profile=profile;report.executable=executable;report.sourceHashes={};
  for(const f of ['src/sim.js','src/weapon-salvos.js','src/weapon-range-data.js','src/operator-ui.js','src/direct-control.js','src/models-vehicles.js','src/models3d.js','src/vehicle-animation.js','index.html']){const source=fs.readFileSync(f),packaged=fs.readFileSync(path.join(appRoot,f));assert.ok(source.equals(packaged),'packaged mismatch '+f);report.sourceHashes[f]=crypto.createHash('sha256').update(source).digest('hex');}
  host=await _electron.launch({executablePath:executable,args:['--windowed'],env:{...process.env,MODERN_FRONT_TEST_PROFILE:profile},timeout:45000});report.version=await host.evaluate(({app})=>app.getVersion());assert.equal(report.version,require('../package.json').version);p=await host.firstWindow();
 }else{host=await chromium.launch({headless:true});p=await host.newPage({viewport:{width:1600,height:1000}});await p.goto(process.env.GAME_URL||'http://127.0.0.1:8765');}
 p.on('pageerror',e=>report.errors.push(e.message));await p.waitForFunction(()=>window.ModernFront);await p.evaluate(async()=>Promise.all([WarImported.ready,WarImportedGround.ready,WarImportedAir.ready]));
 assert.equal(await p.locator('#range-mode').inputValue(),'published');assert.equal(await p.locator('#range-scale').inputValue(),'1');
 await p.locator('#enemies').selectOption('1');await p.locator('#start').click();await p.waitForFunction(()=>ModernFront.game);
 report.defaults=await p.evaluate(()=>({mode:ModernFront.game.options.rangeMode,scale:ModernFront.game.options.metersPerUnit}));assert.deepEqual(report.defaults,{mode:'published',scale:1});check('New game defaults: published, 1 metre per unit');
 // Real armory interaction; independently derive each expected range from active game rules.
 await fixture('operator');await p.keyboard.press('KeyB');await p.waitForFunction(()=>ModernFront.direct.operatorUI.open);
 await p.locator('[data-operator-category="all"]').click();await p.locator('#operator-search').fill('');await p.locator('#operator-target').selectOption('all');
 const cards=await p.evaluate(()=>{const g=ModernFront.game,e=g.get(ModernFront.direct.entityId);return WarOperatorWeapons.list.map(w=>({id:w.id,expected:g.formatRangeDistance(g.weaponRangeProfile(e,w).range),text:document.querySelector(`[data-operator-weapon="${w.id}"]`)?.textContent}));});
 assert.equal(cards.length,64);for(const card of cards){assert.ok(card.text,card.id+' missing');assert.ok(card.text.includes(card.expected),card.id+' stale range '+card.expected);}
 for(const id of ['pistol_01','rifle_01','launcher_08']){await p.locator(`[data-operator-weapon="${id}"]`).click();const expected=cards.find(c=>c.id===id).expected;assert.ok((await p.locator('#operator-details').textContent()).includes(expected));}
 report.armory=cards;check('64 armory cards and sampled details display actual published-mode ranges');await p.locator('#operator-close').click();
 await fixture();let s=await state();const expected=await p.evaluate(()=>{const g=ModernFront.game,e=g.get(ModernFront.direct.entityId);return g.formatRangeDistance(g.rangeProfile(e).attack);});assert.ok(s.contact.includes(expected),'HUD range mismatch: '+s.contact+' / '+expected);assert.match(s.contact,/\b(?:m|km)\b/);
 await p.mouse.down({button:'right'});await p.waitForTimeout(300);await p.mouse.up({button:'right'});assert.equal((await state()).shots.length,0);check('RMB observes only, no shot');
 await p.mouse.down({button:'left'});await p.waitForFunction(()=>window.__publicSalvo.shots.length>=8,null,{timeout:4500});await p.mouse.up({button:'left'});await p.waitForTimeout(1200);
 s=await state();assert.equal(s.shots.length,8);assert.deepEqual(s.shots.map(f=>f.portIndex),[0,1,2,3,4,5,6,7]);assert.ok(s.shots.every(f=>f.count===8));
 for(const f of s.shots){assert.ok(f.muzzle,'missing real port '+f.portIndex);f.portError=Math.hypot(...f.origin.map((v,i)=>v-f.muzzle[i]));assert.ok(f.portError<=.05,'port error '+f.portIndex+': '+f.portError);}
 assert.equal(new Set(s.shots.map(f=>f.origin.map(v=>v.toFixed(4)).join(','))).size,8,'different tubes must not share centre');
 assert.ok(Math.max(...s.shots.map(f=>f.end[0]))-Math.min(...s.shots.map(f=>f.end[0]))>1);assert.ok(Math.max(...s.shots.map(f=>f.end[2]))-Math.min(...s.shots.map(f=>f.end[2]))>1,'spread is not two dimensional');
 assert.ok(Math.abs(s.shots.reduce((n,f)=>n+f.baseDamage,0)-s.unitDamage)<1e-7,'salvo multiplies damage by eight');
 const loss=s.initialHp-s.hp;assert.ok(loss>0,'real impacts caused no target damage');assert.ok(loss<=s.damageBudget+1e-6,'actual impact damage exceeds one weapon budget');
 report.fullSalvo=s;check('Real LMB completes eight unique model ports, 2D impacts and normalized actual damage');
 await pause(true);const frozen=await state();await p.waitForTimeout(450);assert.equal((await state()).time,frozen.time);await p.screenshot({path:`screenshots/public-range-salvo-${suffix}.png`});check('Pause freezes simulation time');
 // Each cancellation uses a fresh fixture: cooldown from another salvo cannot mask a leak.
 for(const mode of ['release','exit','pause']){await fixture();await p.mouse.down({button:'left'});await p.waitForFunction(()=>window.__publicSalvo.shots.length>=1,null,{timeout:2500});if(mode==='release')await p.mouse.up({button:'left'});else if(mode==='exit'){await p.keyboard.press('KeyE');await p.mouse.up({button:'left'});}else{await pause(true);await p.mouse.up({button:'left'});}
  const before=await state();assert.ok(before.shots.length<8,mode+' fixture missed cancellation window');await p.waitForTimeout(450);const after=await state();assert.equal(after.shots.length,before.shots.length,mode+' emitted more shots');
  if(mode==='pause'){assert.equal(after.time,before.time);await pause(false);await p.waitForTimeout(450);assert.equal((await state()).shots.length,before.shots.length,'resume released a cancelled salvo');}check(mode+' cancels pending launches');}
 // Published GMLRS inner boundary and wide spatial query, with wall-clock measurements.
 await fixture('rocket','usa');await pause(true);
 report.rangeBoundary=await p.evaluate(()=>{const g=ModernFront.game,e=g.get(ModernFront.direct.entityId),t=g.get(window.__publicSalvo.ids.target);g.options.metersPerUnit=10;const r=g.rangeProfile(e),results=[];
  for(const distance of [1499,1501,r.attack-1,r.attack+1]){t.x=e.x+distance;t.y=e.y;t.altitude=0;const st=g.directFireStatus(e,t);results.push({distance,rangeState:st.rangeState,inRange:st.inRange,reason:st.reason});}
  g.spatial.rebuild(g.entities);const start=performance.now();let found=0;for(let i=0;i<20;i++)found+=g.spatial.query(e.x,e.y,r.attack).length;return{min:r.min,attack:r.attack,formatted:g.formatRangeDistance(r.attack),results,queryMs:performance.now()-start,queries:20,found};});
 assert.equal(report.rangeBoundary.min,1500);assert.equal(report.rangeBoundary.results[0].rangeState,'min');assert.equal(report.rangeBoundary.results[1].rangeState,'in');assert.equal(report.rangeBoundary.results[2].rangeState,'in');assert.equal(report.rangeBoundary.results[3].rangeState,'out');assert.ok(report.rangeBoundary.queryMs<2000,'large-range spatial query stalled');check('GMLRS 15 km inner limit becomes 1500 units at 10 m/u; long-range query completes');
 assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;if(p){report.last=await state().catch(e=>({error:e.message}));await p.screenshot({path:'.tmp/public-range-salvo-failure-'+suffix+'.png'}).catch(()=>{});}}
 finally{if(p)await p.evaluate(()=>window.__publicSalvo?.restore?.()).catch(()=>{});fs.writeFileSync(`docs/public-range-salvo-${suffix}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await host?.close();}
})();
