'use strict';
const {chromium,_electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
  const desktop=process.argv.includes('--desktop'),environment=desktop?'desktop':'browser';
  const reportDir='docs/maps-browser',shots='screenshots/maps';
  fs.mkdirSync(reportDir,{recursive:true});fs.mkdirSync(shots,{recursive:true});
  const report={recordedAt:new Date().toISOString(),environment,checks:[],errors:[],fixture:'AI clocks disabled; full vision selected in setup; overview camera framing only. All selection and movement orders use trusted pointer input.'};
  let host,page;
  try {
    if(desktop){
      const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      for(const file of ['index.html','src/data.js','src/sim.js','src/maps-large.js'])
        assert.equal(digest(path.join('release/ModernFrontHD/resources/app',file)),digest(file),'Stale packaged map source: '+file);
      report.packageSourceMatch=true;
    }
    host=desktop?await _electron.launch({executablePath:path.resolve('release/ModernFrontHD/ModernFrontHD.exe'),args:[],timeout:45000}):await chromium.launch({headless:true,channel:'chromium'});
    page=desktop?await host.firstWindow():await host.newPage({viewport:{width:1600,height:1000}});
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    if(!desktop)await page.goto('http://127.0.0.1:8765');
    await page.waitForFunction(()=>window.ModernFront);
    await page.evaluate(()=>Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]));
    assert.equal(await page.locator('[data-map="archipelago"]').count(),1);
    await page.locator('[data-map="archipelago"]').click();
    await page.locator('#enemies').selectOption('4');
    await page.locator('#buffs [data-buff="vision"]').check();
    await page.screenshot({path:`${shots}/deployment-${environment}.png`});
    await page.locator('#start').click();
    await page.waitForFunction(()=>ModernFront.game?.map.id==='archipelago');
    if(!await page.evaluate(()=>ModernFront.paused))await page.keyboard.press('Space');
    report.layout=await page.evaluate(()=>{
      const g=ModernFront.game,m=g.map;
      g.teams.forEach(t=>{t.aiClock=1e9;});g.updateFog();
      const cell=p=>Math.floor(p.y/WarData.T)*WarData.COLS+Math.floor(p.x/WarData.T);
      return {width:WarData.W,height:WarData.H,cols:WarData.COLS,rows:WarData.ROWS,is3D:ModernFront.renderer.is3D,teams:g.teams.length,
        spawns:m.spawns,mines:g.ore.map(o=>({id:o.id,x:o.x,y:o.y,ground:!m.blocked[cell(o)],amount:o.amount})),nodes:m.nodes,
        harbours:g.entities.filter(e=>e.kind==='navalyard').map(e=>({id:e.id,team:e.team,x:e.x,y:e.y,water:!m.navalBlocked[cell(e)]})),
        ships:g.entities.filter(e=>e.kind==='destroyer').map(e=>({id:e.id,team:e.team,x:e.x,y:e.y,water:!m.navalBlocked[cell(e)]})),
        view: {width:innerWidth,height:innerHeight,dpr:devicePixelRatio}};
    });
    assert.equal(report.layout.width,6144);assert.equal(report.layout.height,4224);
    assert.equal(report.layout.cols,128);assert.equal(report.layout.rows,88);assert.equal(report.layout.is3D,true);
    assert.equal(report.layout.teams,5);assert.equal(report.layout.mines.length,5);assert.equal(report.layout.harbours.length,5);assert.equal(report.layout.ships.length,5);assert.equal(report.layout.nodes.length,6);
    for(const mine of report.layout.mines)assert.equal(mine.ground,true);
    for(const e of [...report.layout.harbours,...report.layout.ships])assert.equal(e.water,true);
    for(let team=0;team<5;team++){
      const actual=report.layout.harbours.find(e=>e.team===team),expected=await page.evaluate(i=>ModernFront.game.map.navalSpawns[i],team);
      assert.equal(actual.x,expected.x);assert.equal(actual.y,expected.y);
    }
    report.checks.push('Real deployment UI selects archipelago, five teams spawn with five land mines, five water harbours, five ships and six objectives on 6144x4224 terrain');
    await page.evaluate(()=>{
      const r=ModernFront.renderer,sidebar=document.querySelector('#sidebar').getBoundingClientRect();
      const usableWidth=Math.min(sidebar.left,r.width),zoom=Math.min((usableWidth-80)/WarData.W,(r.height-180)/(WarData.H*Math.sin(r.elevation)));
      r.camera={x:WarData.W/2+(r.width-usableWidth)/2/zoom,y:WarData.H/2,zoom};
    });
    if(await page.evaluate(()=>ModernFront.paused))await page.keyboard.press('Space');
    await page.waitForTimeout(350);
    await page.screenshot({path:`${shots}/archipelago-overview-${environment}.png`});
    await page.locator('#minimap').screenshot({path:`${shots}/archipelago-minimap-${environment}.png`});
    if(!await page.evaluate(()=>ModernFront.paused))await page.keyboard.press('Space');
    report.checks.push('Full terrain overview and live minimap captured from actual WebGL game');
    const ship=report.layout.ships.find(e=>e.team===0),mini=await page.locator('#minimap').boundingBox();
    assert.ok(mini&&mini.width>0);
    // Real minimap navigation, then a camera-only zoom fixture for a readable hit target.
    await page.mouse.click(mini.x+ship.x/report.layout.width*mini.width,mini.y+ship.y/report.layout.height*mini.height);
    await page.evaluate(()=>{ModernFront.renderer.camera.zoom=.9;window.__mapPointers=[];document.querySelector('#battle').addEventListener('pointerdown',e=>window.__mapPointers.push({button:e.button,trusted:e.isTrusted}),{capture:true});});
    await page.waitForTimeout(150);
    const start=await page.evaluate(id=>{const e=ModernFront.game.get(id);return{id:e.id,x:e.x,y:e.y,screen:ModernFront.renderer.entityScreen(e)};},ship.id);
    const bounds=await page.locator('#battle').boundingBox();assert.ok(bounds);
    report.canvasBounds=bounds;assert.equal(bounds.x,0);assert.equal(bounds.y,0);
    await page.mouse.click(bounds.x+start.screen.x,bounds.y+start.screen.y);
    assert.deepEqual(await page.evaluate(()=>ModernFront.selection),[ship.id]);
    const goal=await page.evaluate(id=>{
      const e=ModernFront.game.get(id),p={x:e.x+320,y:Math.max(144,e.y-160)},m=ModernFront.game.map;
      const index=Math.floor(p.y/WarData.T)*WarData.COLS+Math.floor(p.x/WarData.T);
      if(m.navalBlocked[index])throw Error('Movement fixture must target open sea');
      return {...p,screen:ModernFront.renderer.toScreen(p.x,p.y)};
    },ship.id);
    // The application intentionally ignores right-click orders while paused.
    if(await page.evaluate(()=>ModernFront.paused))await page.keyboard.press('Space');
    await page.mouse.click(bounds.x+goal.screen.x,bounds.y+goal.screen.y,{button:'right'});
    report.order=await page.evaluate(id=>ModernFront.game.get(id).order,ship.id);
    assert.ok(report.order,'Right-click did not create a movement order');
    assert.ok(Math.hypot(report.order.x-goal.x,report.order.y-goal.y)<60);
    await page.waitForFunction(({id,x,y})=>{const e=ModernFront.game.get(id);return Math.hypot(e.x-x,e.y-y)>60;},start,{timeout:10000});
    report.movement=await page.evaluate(({id,x,y})=>{const e=ModernFront.game.get(id);return{id,from:{x,y},to:{x:e.x,y:e.y},distance:Math.hypot(e.x-x,e.y-y),input:window.__mapPointers};},start);
    assert.ok(report.movement.input.some(e=>e.button===0&&e.trusted));
    assert.ok(report.movement.input.some(e=>e.button===2&&e.trusted));
    await page.screenshot({path:`${shots}/ship-moving-${environment}.png`});
    report.checks.push('Actual left-click selects own ship and trusted right-click sea order moves it over 60 world units; no direct simulation command used');
    if(desktop)report.desktop=await host.evaluate(async({app,BrowserWindow})=>({electron:process.versions.electron,fullscreen:BrowserWindow.getAllWindows()[0].isFullScreen(),gpu:await app.getGPUInfo('basic')}));
    assert.deepEqual(report.errors,[]);report.passed=true;
  }catch(error){report.passed=false;report.failure=error.stack;if(page)try{await page.screenshot({path:`${shots}/failure-${environment}.png`});}catch{}process.exitCode=1;}
  finally{fs.writeFileSync(`${reportDir}/${environment}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,errors:report.errors,failure:report.failure}));if(host)await host.close();}
})();
