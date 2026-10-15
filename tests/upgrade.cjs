const {chromium,_electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
async function verifyImported(page){
 const result=await page.evaluate(async()=>{
  await Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]);
  return {ship:WarImported.status,air:WarImportedAir.status,ground:WarImportedGround.status,errors:[...WarImported.errors,...WarImportedAir.errors,...WarImportedGround.errors],models:[['destroyer','usa'],['heli','usa'],['heli','kor'],['tank','rus']].map(([k,f])=>{const m=WarModels.create(k,f);let meshes=0,preserved=0;m.traverse(o=>{if(o.isMesh){meshes++;if(o.userData.preserveMaterial)preserved++}});return {key:k+'_'+f,source:m.userData.assetSource,license:m.userData.license,meshes,preserved}})};
 });
 assert.equal(result.ship,'ready');assert.equal(result.air,'ready');assert.equal(result.ground,'ready');assert.deepEqual(result.errors,[]);
 for(const model of result.models){assert.ok(model.source,model.key);assert.equal(model.license,'CC-BY-4.0');assert.ok(model.meshes>0);assert.equal(model.preserved,model.meshes);}
 return result;
}
(async()=>{const browser=await chromium.launch({headless:true,channel:'chromium'});const checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8765');await page.waitForFunction(()=>window.ModernFront);
 await verifyImported(page);checks.push('licensed T-90M, ship and AH-64 load from embedded GLB with preserved materials');
 assert.equal(await page.locator('#difficulty option').count(),4);assert.equal(await page.locator('[data-faction]').count(),6);
 await page.locator('#enemies').selectOption('1');await page.locator('#difficulty').selectOption('normal');await page.locator('#game-mode').selectOption('domination');
 await page.screenshot({path:'screenshots/15-deployment-v2.png'});
 await page.locator('#start').click();await page.waitForTimeout(1400);
 assert.ok(await page.evaluate(()=>ModernFront.renderer.is3D));checks.push('desktop deployment, six factions, four AI difficulties, real WebGL battlefield');
 const initial=await page.evaluate(()=>{const e=ModernFront.game.entities.find(e=>e.team===0&&e.kind==='tank');return {id:e.id,x:e.x,y:e.y,screen:ModernFront.renderer.entityScreen(e)}});
 await page.mouse.click(initial.screen.x,initial.screen.y);assert.deepEqual(await page.evaluate(()=>ModernFront.selection),[initial.id]);
 const destination=await page.evaluate(()=>ModernFront.renderer.toScreen(1060,700));await page.mouse.click(destination.x,destination.y,{button:'right'});
 await page.waitForTimeout(1700);assert.ok(await page.evaluate(i=>{const e=ModernFront.game.get(i.id);return Math.hypot(e.x-i.x,e.y-i.y)>20},initial));checks.push('3D picking and right-click move through real pointer input');
 await page.keyboard.down('Shift');await page.mouse.click(destination.x+70,destination.y+30,{button:'right'});await page.keyboard.up('Shift');assert.equal(await page.evaluate(()=>ModernFront.game.get(ModernFront.selection[0]).orderQueue.length),1);checks.push('Shift appends waypoints');
 await page.locator('#formation').selectOption('spread');assert.equal(await page.evaluate(()=>ModernFront.game.formation),'spread');await page.locator('#retreat').click();assert.ok(await page.evaluate(()=>ModernFront.game.get(ModernFront.selection[0]).retreating));checks.push('formation and retreat commands');
 const factory=await page.evaluate(()=>{const e=ModernFront.game.entities.find(e=>e.team===0&&e.kind==='factory');return{id:e.id,p:ModernFront.renderer.entityScreen(e)}});
 await page.mouse.click(factory.p.x,factory.p.y);await page.mouse.click(destination.x,destination.y,{button:'right'});assert.ok(await page.evaluate(id=>ModernFront.game.get(id).rally,factory.id));checks.push('production rally via selecting factory and right-click');
 await page.locator('[data-item="tank"]').click();assert.ok(await page.evaluate(()=>ModernFront.game.teams[0].queue.some(q=>q.kind==='tank')));
 await page.locator('#buff-settings').click();await page.locator('#live-player-only').uncheck();await page.locator('#live-ai-space-ban').uncheck();await page.locator('#apply-buffs').click();assert.equal(await page.evaluate(()=>ModernFront.game.options.aiSpaceWeapons),true);
 await page.locator('#buff-settings').click();await page.locator('#live-ai-space-ban').check();await page.locator('#apply-buffs').click();assert.equal(await page.evaluate(()=>ModernFront.game.options.aiSpaceWeapons),false);checks.push('independent live AI space permission');
 await page.locator('#graphics').click();await page.locator('#quality').selectOption('medium');await page.locator('#night-toggle').check();await page.locator('#apply-fx').click();assert.equal(await page.evaluate(()=>ModernFront.lighting.night),true);
 await page.screenshot({path:'screenshots/16-night-command.png'});await page.locator('#graphics').click();await page.locator('#night-toggle').uncheck();await page.locator('#apply-fx').click();
 await page.locator('#select-all').click();await page.screenshot({path:'screenshots/17-battle-v2.png'});
 await page.keyboard.press('Tab');assert.ok(await page.locator('body').evaluate(el=>el.classList.contains('immersive')));assert.equal(await page.locator('#sidebar').isVisible(),false);await page.screenshot({path:'screenshots/18-immersive.png'});await page.locator('#restore-hud').click();checks.push('night, quality and immersive HUD restoration');
 await page.locator('#save').click();assert.ok(await page.evaluate(()=>localStorage.length>0));
 await page.setViewportSize({width:700,height:900});await page.waitForTimeout(250);await page.screenshot({path:'screenshots/19-narrow-v2.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('narrow layout without horizontal overflow');
 const local=await browser.newPage({viewport:{width:1280,height:800}});local.on('pageerror',e=>errors.push(e.message));local.on('console',m=>{if(m.type()==='error')errors.push(m.text())});let networkRequests=0;local.on('request',r=>{if(/^https?:/.test(r.url()))networkRequests++});await local.goto('file:///'+path.resolve('index.html').replaceAll('\\','/'));await local.waitForFunction(()=>window.ModernFront);await verifyImported(local);await local.locator('#start').click();await local.waitForTimeout(1000);assert.ok(await local.evaluate(()=>ModernFront.renderer.is3D&&ModernFront.game.time>0));assert.equal(networkRequests,0);checks.push('offline file startup, embedded textures/models, zero HTTP requests');
 for(const f of ['usa','rus','chn','ind','kor','imp']){await page.evaluate(f=>ModernFront.start({faction:f,enemies:1,map:'desert',buffs:['vision']}),f);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>ModernFront.game.teams[0].faction),f);}checks.push('all factions start in new renderer');
 const stats=await page.evaluate(()=>({fps:ModernFront.fps,...ModernFront.renderer.stats}));
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync('docs/upgrade-browser-report.json',JSON.stringify({checks,errors,stats},null,2));console.log(JSON.stringify({checks:checks.length,errors,stats}));
}finally{await browser.close()}
const exe=path.resolve('release/ModernFrontHD/ModernFrontHD.exe');
const scripts=[...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
for(const file of ['index.html','gallery.html','src/armory3d.js','desktop/main.cjs',...scripts]){
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 assert.equal(hash(path.join('release/ModernFrontHD/resources/app',file)),hash(file),'Packaged source is stale: '+file);
}
const desktop=await _electron.launch({executablePath:exe,args:['--windowed'],timeout:45000});
try{
 const win=await desktop.firstWindow();const nativeErrors=[];win.on('pageerror',e=>nativeErrors.push(e.message));win.on('console',m=>{if(m.type()==='error')nativeErrors.push(m.text())});await win.waitForFunction(()=>window.ModernFront);const imported=await verifyImported(win);await win.locator('#start').click();await win.waitForTimeout(1600);
 assert.ok(await win.evaluate(()=>!!window.DesktopGame&&ModernFront.renderer.is3D));
 await win.keyboard.press('F11');await win.waitForTimeout(1000);assert.equal(await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen()),true);
 await win.screenshot({path:'screenshots/20-native-fullscreen.png'});await win.keyboard.press('Tab');await win.waitForTimeout(250);await win.screenshot({path:'screenshots/21-native-immersive.png'});
 await win.keyboard.press('Tab');await win.keyboard.press('F11');await win.waitForTimeout(600);assert.equal(await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen()),false);
 const report=await desktop.evaluate(async({app,BrowserWindow})=>({version:process.versions.electron,windows:BrowserWindow.getAllWindows().length,gpu:await app.getGPUInfo('basic'),fullscreenToggle:true}));assert.equal(nativeErrors.length,0,nativeErrors.join('\n'));fs.writeFileSync('docs/desktop-report.json',JSON.stringify({...report,packageSourceMatch:true,imported,errors:nativeErrors},null,2));console.log('Packaged Windows executable: licensed models, launch, 3D, fullscreen, immersion passed');
}finally{await desktop.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
