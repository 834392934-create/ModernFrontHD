/* Real packaged-renderer acceptance. Run serially with --desktop; no mocked GL.
 * Instrument one synchronous real Battle3D.draw per input mode, then restore gl.render. */
const {_electron,chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const desktop=process.argv.includes('--desktop'),suffix=desktop?'desktop':'browser',report={recordedAt:new Date().toISOString(),environment:suffix,checks:[],samples:[],errors:[]};let host,p;
function check(label){report.checks.push(label);console.log(label);}
async function lock(){
 await p.bringToFront();if(await p.evaluate(()=>document.pointerLockElement===ModernFront.renderer.canvas))return;
 for(let attempt=0;attempt<3;attempt++){await p.waitForTimeout(1400);await p.mouse.click(650,400);try{await p.waitForFunction(()=>document.pointerLockElement===ModernFront.renderer.canvas,null,{timeout:1800});return;}catch(error){if(attempt===2)throw error;}}
}
async function sample(label,expectedPasses){
 const snapshot=await p.evaluate(label=>{
  const r=ModernFront.renderer,d=ModernFront.direct,g=ModernFront.game,gl=r.gl,original=gl.render,passes=[];
  // Each record is copied immediately after the real renderer returns, before
  // the next render resets Three's default per-pass counters.
  gl.render=function(scene,camera){const before=this.info.render.frame;const result=original.call(this,scene,camera);passes.push({scene:scene===r.scene?'world':scene===d.view?.viewScene?'foreground':'other',beforeFrame:before,afterFrame:this.info.render.frame,calls:this.info.render.calls,triangles:this.info.render.triangles,points:this.info.render.points,lines:this.info.render.lines});return result;};
  let stats;try{r.draw(g,{},g.time);stats={...r.stats};}finally{gl.render=original;}
  return{label,passes,stats,autoReset:gl.info.autoReset,active:d.active,optical:d.active&&d.opticalActive(),locked:document.pointerLockElement===r.canvas,fire:g.directControl?.input.fire??false,frame:gl.info.render.frame,restored:gl.render===original};
 },label);
 report.samples.push(snapshot);assert.equal(snapshot.restored,true,label+' instrumentation restored');assert.equal(snapshot.autoReset,true,'bundled renderer uses default per-render counter reset');assert.equal(snapshot.passes.length,expectedPasses,label+' actual render pass count');assert.equal(snapshot.passes[0].scene,'world');
 const world=snapshot.passes.filter(x=>x.scene==='world'),foreground=snapshot.passes.filter(x=>x.scene==='foreground');assert.equal(world.length,1);assert.equal(snapshot.passes.filter(x=>x.scene==='other').length,0,'unexpected render pass must be explicitly investigated');
 for(const pass of snapshot.passes){assert.equal(pass.afterFrame,pass.beforeFrame+1);assert.ok(pass.calls>0&&pass.triangles>0,'actual scene geometry must render');}
 for(const [key,field]of [['calls','foregroundCalls'],['triangles','foregroundTriangles']]){assert.equal(snapshot.stats[key],snapshot.passes.reduce((n,x)=>n+x[key],0),label+' total '+key);assert.equal(snapshot.stats[field],foreground.reduce((n,x)=>n+x[key],0),label+' '+field);}
 check(label+': actual world/foreground calls and triangles exactly match published stats');return snapshot;
}
async function ammo(){return p.evaluate(()=>{const s=ModernFront.game.operatorStatus(ModernFront.direct.entityId);return s.slots[s.activeSlot].ammo;});}
(async()=>{try{
 for(const dir of ['.tmp','docs'])fs.mkdirSync(dir,{recursive:true});
 const executablePath=require('./desktop-path.cjs').executable;report.executable=desktop?executablePath:null;
 host=desktop?await _electron.launch({executablePath,args:[],timeout:45000}):await chromium.launch({headless:true,channel:'chromium'});
 p=desktop?await host.firstWindow():await host.newPage({viewport:{width:1600,height:1000}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});if(!desktop)await p.goto(process.env.GAME_URL||'http://127.0.0.1:8765');await p.waitForFunction(()=>window.ModernFront);
 report.imported=await p.evaluate(async()=>{await Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]);return{ship:WarImported.status,air:WarImportedAir.status,ground:WarImportedGround.status,errors:[...WarImported.errors,...WarImportedAir.errors,...WarImportedGround.errors]};});for(const k of ['ship','air','ground'])assert.equal(report.imported[k],'ready');assert.deepEqual(report.imported.errors,[]);
 await p.locator('#enemies').selectOption('1');await p.locator('#player-mode').selectOption('driver');await p.locator('#initial-vehicle').selectOption('operator');await p.locator('#start').click();await p.waitForFunction(()=>ModernFront.direct.active&&ModernFront.game.get(ModernFront.direct.entityId)?.kind==='operator');
 // Small deterministic threat-free fixture; input and renderer state are untouched.
 await p.evaluate(()=>{const g=ModernFront.game;for(const t of g.teams){t.aiClock=1e9;t.money=0;t.queue=[];t.buildQueue=[];}for(const e of g.entities)if(e.team!==0)e.disabled=1e9;});
 await lock();await p.waitForFunction(()=>ModernFront.direct.view?.metrics.weaponId==='rifle_01'&&!ModernFront.direct.opticalActive()&&!ModernFront.game.directControl.input.fire);
 report.runtime=await p.evaluate(()=>{const r=ModernFront.renderer,gl=r.gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{title:document.title,userAgent:navigator.userAgent,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[innerWidth,innerHeight],drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],dpr:r.dpr,entities:ModernFront.game.entities.length};});
 const ordinary=await sample('ordinary FPS',2);assert.equal(ordinary.optical,false);assert.equal(ordinary.fire,false);
 const beforeObservation=await ammo();await p.keyboard.press('v');await p.waitForFunction(()=>ModernFront.direct.opticalActive()&&!ModernFront.game.directControl.input.fire);const observation=await sample('V observation',1);assert.equal(observation.optical,true);assert.equal(observation.fire,false);assert.equal(await ammo(),beforeObservation,'V observation must not shoot');
 await lock();await p.keyboard.press('v');await p.waitForFunction(()=>!ModernFront.direct.opticalActive());await sample('V released: foreground restored',2);
 const beforeFire=await ammo();await p.mouse.down({button:'right'});await p.waitForFunction(()=>ModernFront.direct.opticalActive()&&ModernFront.game.directControl.input.fire);await p.waitForFunction(before=>{const s=ModernFront.game.operatorStatus(ModernFront.direct.entityId);return s.slots[s.activeSlot].ammo<before;},beforeFire,{timeout:5000});
 const firing=await sample('RMB actual firing',1);report.ammunition={before:beforeFire,after:await ammo()};assert.equal(firing.optical,true);assert.equal(firing.fire,true);assert.ok(report.ammunition.after<report.ammunition.before,'actual trigger must consume ammunition');
 await p.mouse.up({button:'right'});await p.waitForFunction(()=>!ModernFront.direct.opticalActive()&&!ModernFront.game.directControl.input.fire);await sample('RMB released: foreground restored',2);
 await p.keyboard.press('e');await p.waitForFunction(()=>!ModernFront.direct.active&&!document.pointerLockElement);const rts=await sample('RTS after E',1);assert.equal(rts.active,false);assert.equal(rts.stats.foregroundCalls,0);assert.equal(rts.stats.foregroundTriangles,0);
 report.scope='Correctness of render-pass accounting only; no FPS improvement claim or GPU performance benchmark.';assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;if(p)await p.screenshot({path:'.tmp/render-pass-stats-failure-'+suffix+'.png'}).catch(()=>{});
 }finally{fs.writeFileSync('docs/render-pass-stats-'+suffix+'-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await host?.close();}
})();
