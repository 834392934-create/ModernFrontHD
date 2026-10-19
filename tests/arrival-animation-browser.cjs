const {_electron,chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const desktop=process.argv.includes('--desktop'),suffix=desktop?'desktop':'browser',report={recordedAt:new Date().toISOString(),checks:[],errors:[]};let host,p;
try{
 host=desktop?await _electron.launch({executablePath:require('./desktop-path.cjs').executable,args:['--windowed']}):await chromium.launch({headless:true,channel:'chromium'});
 p=desktop?await host.firstWindow():await host.newPage({viewport:{width:1600,height:1000}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});if(!desktop)await p.goto('http://127.0.0.1:8765');await p.waitForFunction(()=>window.ModernFront);
 report.models=await p.evaluate(async()=>{
  await Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]);
  if([WarImported,WarImportedAir,WarImportedGround].some(x=>x.status!=='ready'))throw Error('GLB not ready');
  const failures=[];let count=0;
  for(const k of Object.keys(WarData.U))for(const f of Object.keys(WarData.F)){
   const m=WarModels.create(k,f);m.scale.setScalar(m.userData.scale);m.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(m),r=Math.hypot(Math.max(Math.abs(b.min.x),Math.abs(b.max.x)),Math.max(Math.abs(b.min.z),Math.abs(b.max.z))),nav=WarNavigationFootprints.bounds[k+'_'+f];
   if(!nav||nav[0]<r)failures.push(k+'_'+f);count++;
  }return {count,failures};
 });assert.equal(report.models.count,462);assert.deepEqual(report.models.failures,[]);report.checks.push('All 462 runtime models, including ready GLB assets, fit their navigation envelopes');
 await p.evaluate(()=>ModernFront.start({faction:'chn',enemies:1,map:'desert',buffs:['vision']}));await p.locator('#pause').click();
 report.arrivals=await p.evaluate(()=>{
  const out=[];for(const kind of ['tank','destroyer','submarine','fighter','orbital']){
   const g=new WarSim.Game({faction:'chn',enemies:1,map:'desert',buffs:['vision'],abilities:false});g.entities=[];g.ore=[];g.map.blocked.fill(WarData.U[kind].naval?1:0);g.map.navalBlocked.fill(WarData.U[kind].naval?0:1);g.spawn(0,'hq',300,300);g.spawn(1,'hq',5800,3900);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});
   const units=[];for(let batch=0;batch<3;batch++){const e=g.spawn(0,kind,1500,1000+batch*400);units.push(e);g.command([e.id],3000,1800);for(let i=0;i<1400;i++)g.step(.05);}
   let separated=true;for(const a of units)for(const b of units)if(a.id<b.id&&Math.hypot(a.x-b.x,a.y-b.y)<g.navigationRadius(a)+g.navigationRadius(b))separated=false;
   out.push({kind,arrived:units.every(e=>!e.order),separated});
  }return out;
 });assert.ok(report.arrivals.every(x=>x.arrived&&x.separated));report.checks.push('Land, sea, underwater, air and orbital three-batch arrivals settle with model clearance');
 // Drive the actual battlefield renderer while paused: deterministic poses and independent clocks.
 report.animation=await p.evaluate(()=>{
  const g=ModernFront.game,r=ModernFront.renderer;g.entities=[];g.ore=[];g.ai=()=>{};g.map.blocked.fill(0);g.map.navalBlocked.fill(1);g.spawn(0,'hq',300,300);g.spawn(1,'hq',5800,3900);
  const kinds=WarPersonnelAnimation.roles,units=kinds.map((k,i)=>g.spawn(0,k,1800+(i%4)*70,1400+Math.floor(i/4)*65));r.camera={x:1900,y:1440,zoom:3};r.prepare(g);r.draw(g,{},g.time);
  for(let i=0;i<25;i++){g.time+=1/60;for(const e of units)e.x+=.25;r.draw(g,{},g.time);}
  const states=units.map(e=>WarPersonnelAnimation.state(r.objects.get(e.id)));const moving=states.every(s=>s?.moving&&s.people.every(p=>p.skeleton.bones.length===13));
  const pose=()=>states.flatMap(s=>s.people.flatMap(p=>p.bones.flatMap(b=>b.quaternion.toArray()))),before=JSON.stringify(pose());for(let i=0;i<6;i++)r.draw(g,{},g.time);const frozen=before===JSON.stringify(pose());
  return{units:units.length,moving,frozen,meshes:states.reduce((n,s)=>n+s.people.length*2,0)};
 });assert.equal(report.animation.units,8);assert.ok(report.animation.moving&&report.animation.frozen);await p.screenshot({path:'screenshots/personnel-walk-'+suffix+'.png'});report.checks.push('Eight personnel kinds render independent 13-bone gait and freeze at paused simulation time');
 await p.evaluate(()=>{const r=ModernFront.renderer,e=ModernFront.game.entities.find(e=>e.kind==='infantry');r.camera={x:e.x,y:e.y+5,zoom:20};document.querySelector('#pause-banner').hidden=true;r.draw(ModernFront.game,{},ModernFront.game.time);});
 await p.screenshot({path:'screenshots/personnel-close-'+suffix+'.png'});
 report.coast=await p.evaluate(()=>{
  const g=ModernFront.game,r=ModernFront.renderer,{COLS,ROWS}=WarData;g.entities=[];g.ore=[];g.map.tiles.fill(6);g.map.blocked.fill(1);g.map.navalBlocked.fill(0);g.nodes=[];
  for(let y=30;y<ROWS;y++)for(let x=70;x<COLS;x++){const i=y*COLS+x;g.map.tiles[i]=0;g.map.blocked[i]=0;g.map.navalBlocked[i]=1;}
  g.spawn(0,'hq',4500,3000);g.spawn(1,'hq',5800,3900);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});const units=Array.from({length:6},(_,i)=>g.spawn(0,['destroyer','carrier','frigate'][i%3],2000+i%3*260,900+Math.floor(i/3)*260));g.command(units.map(e=>e.id),3200,1400);
  for(let i=0;i<2400;i++)g.step(.05);const xs=units.map(e=>e.x),ys=units.map(e=>e.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),zoom=Math.min(1.2,(innerWidth-500)/(x1-x0+300),(innerHeight-300)/(y1-y0+300));r.camera={x:(x0+x1)/2+180/zoom,y:(y0+y1)/2+25,zoom};document.querySelector('#pause-banner').style.display='none';r.prepare(g);r.draw(g,{},g.time);return{arrived:units.filter(e=>!e.order).length,valid:units.every(e=>WarNavigationFootprints.terrain(g,e,e.x,e.y))};
 });assert.equal(report.coast.arrived,6);assert.ok(report.coast.valid);await p.screenshot({path:'screenshots/coastal-arrival-'+suffix+'.png'});report.checks.push('Six mixed full-size ships settle by a coastal corner, with complete hulls on water');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;if(p)await p.screenshot({path:'.tmp/arrival-animation-failure.png'});}finally{fs.writeFileSync('docs/arrival-animation-'+suffix+'-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await host?.close();}})();
