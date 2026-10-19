/* Native before/after fixed-scene samples. No mocked renderer or AI model. */
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const baseline=process.argv.includes('--baseline'),output=baseline?'.tmp/render-cache-baseline.json':'docs/render-cache-desktop-report.json';
const report={recordedAt:new Date().toISOString(),baseline,scenes:[],errors:[]};let host,p;
(async()=>{try{
 host=await _electron.launch({executablePath:require('./desktop-path.cjs').executable,args:[],timeout:45000});p=await host.firstWindow();p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});await p.waitForFunction(()=>window.ModernFront);
 report.imported=await p.evaluate(async()=>{await Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]);return[WarImported.status,WarImportedAir.status,WarImportedGround.status];});assert.deepEqual(report.imported,['ready','ready','ready']);
 await p.evaluate(()=>ModernFront.start({faction:'chn',enemies:1,map:'desert',buffs:[]}));
 report.runtime=await p.evaluate(()=>{const r=ModernFront.renderer,gl=r.gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[innerWidth,innerHeight],drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],dpr:r.dpr,userAgent:navigator.userAgent};});
 for(const mode of ['128-idle-personnel','64-idle-64-moving-personnel']){
  await p.evaluate(mode=>{
   const g=ModernFront.game,r=ModernFront.renderer;g.entities=[];g.ore=[];g.effects=[];g.result=null;g.map.blocked.fill(0);g.map.navalBlocked.fill(1);g.ai=()=>{};g.teams.forEach(t=>{t.money=0;t.queue=[];t.buildQueue=[];t.aiClock=1e9;});g.spawn(0,'hq',300,300);g.spawn(1,'hq',5700,3600);
   const kinds=WarPersonnelAnimation.roles;for(let i=0;i<128;i++){const e=g.spawn(0,kinds[i%kinds.length],1800+i%16*42,1400+Math.floor(i/16)*42);e.__cacheMotion=mode!=='128-idle-personnel'&&i%2===1;}
   // Repeatable no-combat visual trajectory at the normal fixed simulation step.
   const original=g.__cacheOriginalStep||g.step;g.__cacheOriginalStep=original;g.step=function(dt){const out=original.call(this,dt);for(const e of this.entities)if(e.__cacheMotion)e.x+=dt*12;return out;};
   g.spatial.rebuild(g.entities);g.updateFog();r.camera={x:2200,y:1530,zoom:1.2};r.prepare(g);
  },mode);await p.waitForTimeout(1800);
  const sample=await p.evaluate(()=>new Promise(resolve=>{
   const r=ModernFront.renderer,g=ModernFront.game,A=WarPersonnelAnimation,draw=r.draw,update=A.update,put=r.fogCtx.putImageData,create=r.fogCtx.createImageData,clone=THREE.Vector3.prototype.clone;
   let animationMs=0,animationCalls=0,fogUploads=0,imageAllocations=0,vectorClones=0;const drawMs=[],frameMs=[];
   A.update=function(...args){const start=performance.now();try{return update.apply(this,args);}finally{animationMs+=performance.now()-start;animationCalls++;}};
   r.draw=function(...args){const start=performance.now();try{return draw.apply(this,args);}finally{drawMs.push(performance.now()-start);}};
   r.fogCtx.putImageData=function(...args){fogUploads++;return put.apply(this,args);};r.fogCtx.createImageData=function(...args){imageAllocations++;return create.apply(this,args);};THREE.Vector3.prototype.clone=function(){vectorClones++;return clone.call(this);};
   const started=performance.now(),startTick=g.tick;let last=started;
   function done(t){
    frameMs.push(t-last);last=t;if(t-started<8000)return requestAnimationFrame(done);
    r.draw=draw;A.update=update;r.fogCtx.putImageData=put;r.fogCtx.createImageData=create;THREE.Vector3.prototype.clone=clone;
    const percentile=(a,q)=>a.slice().sort((a,b)=>a-b)[Math.floor((a.length-1)*q)],units=g.entities.filter(e=>!e.structure);
    resolve({durationMs:t-started,frames:frameMs.length,meanFPS:frameMs.length*1000/(t-started),p95FrameMs:percentile(frameMs,.95),meanDrawSubmitMs:drawMs.reduce((a,b)=>a+b,0)/drawMs.length,p95DrawSubmitMs:percentile(drawMs,.95),animationMs,animationCalls,vectorClones,fogUploads,imageAllocations,simulationTicks:g.tick-startTick,entities:g.entities.length,personnel:units.length,finite:units.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)),stats:{...r.stats}});
   }requestAnimationFrame(done);
  }));assert.equal(sample.personnel,128);assert.equal(sample.finite,true);assert.ok(sample.simulationTicks>100);report.scenes.push({mode,...sample});console.log(JSON.stringify({mode,...sample}));
 }
 if(!baseline){const old=JSON.parse(fs.readFileSync('.tmp/render-cache-baseline.json','utf8'));assert.equal(old.passed,true);assert.equal(old.runtime.gpu,report.runtime.gpu);assert.deepEqual(old.runtime.drawingBuffer,report.runtime.drawingBuffer);report.before=old;report.comparison=report.scenes.map((s,i)=>({mode:s.mode,animationMsBefore:old.scenes[i].animationMs,animationMsAfter:s.animationMs,clonesBefore:old.scenes[i].vectorClones,clonesAfter:s.vectorClones,fogUploadsBefore:old.scenes[i].fogUploads,fogUploadsAfter:s.fogUploads,imageAllocationsBefore:old.scenes[i].imageAllocations,imageAllocationsAfter:s.imageAllocations,meanFPSBefore:old.scenes[i].meanFPS,meanFPSAfter:s.meanFPS,p95FrameMsBefore:old.scenes[i].p95FrameMs,p95FrameMsAfter:s.p95FrameMs}));}
 report.scope='Two sequential 8-second controlled native scenes, 128 personnel and two bases. Moving half uses a repeatable 12 u/s visual trajectory. JS draw-submit timings exclude isolated GPU completion. Counters wrap real functions identically before/after; no sustained-combat or AI-render claim.';assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({output,passed:report.passed,errors:report.errors,failure:report.failure}));await host?.close();}})();
