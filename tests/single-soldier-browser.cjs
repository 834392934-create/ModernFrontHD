/* Native/browser verification only. Uses original in-game models and real RTS input. */
const {_electron,chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const desktop=process.argv.includes('--desktop'),suffix=desktop?'desktop':'browser',report={recordedAt:new Date().toISOString(),environment:suffix,checks:[],errors:[],screenshots:[]};let host,p;
function check(label){report.checks.push(label);console.log(label);}
async function pause(value){if(await p.evaluate(()=>ModernFront.paused)!==value)await p.locator('#pause').click();await p.waitForFunction(v=>ModernFront.paused===v,value);}
async function screenshot(name){const file=`screenshots/single-soldier-${name}-${suffix}.png`;await p.screenshot({path:file});report.screenshots.push(file);}
async function gallery(mode){
 const materialAudit=await p.evaluate(mode=>{
  const r=ModernFront.renderer,T=THREE,A=WarPersonnelAnimation,root=document.createElement('section');root.id='soldier-acceptance-gallery';root.style.cssText='position:fixed;inset:0;z-index:999999;background:#263238;color:#e4e7df;font:13px "Microsoft YaHei",sans-serif;pointer-events:none';document.body.append(root);
  const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%';root.append(canvas);
  const title=document.createElement('div');title.style.cssText='position:absolute;top:10px;left:18px';title.textContent=mode==='factions'?'六阵营单兵 · 正面 / 背面 / 头盔与携行装备（帝国为原创科幻）':'八种单兵职责 · 同源战场模型';root.append(title);
  const gl=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});gl.setPixelRatio(Math.min(devicePixelRatio,2));gl.setSize(innerWidth,innerHeight,false);gl.outputColorSpace=r.gl.outputColorSpace;gl.toneMapping=r.gl.toneMapping;gl.toneMappingExposure=r.gl.toneMappingExposure;gl.setScissorTest(true);
  const factions=['chn','usa','rus','ind','kor','imp'],roles=A.roles,columns=mode==='factions'?6:4,rows=mode==='factions'?3:2,top=42,w=innerWidth/columns,h=(innerHeight-top)/rows,models=[],materials=[],materialChecks=[];
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const faction=mode==='factions'?factions[col]:'chn',kind=mode==='factions'?'infantry':roles[row*columns+col],scene=new T.Scene();scene.background=new T.Color(0x263238);
   const hemi=r.hemi.clone(),sun=r.sun.clone();sun.castShadow=false;sun.position.set(-60,140,35);sun.target=new T.Object3D();scene.add(hemi,sun,sun.target);
   const model=WarModels.create(kind,faction);model.scale.setScalar(model.userData.scale);A.update(model,{x:0,y:0,angle:0},0);models.push(model);
   // Material.clone does not copy shader hooks: preserve the actual fabric/camouflage
   // program and its cache key, including any live battlefield shader extensions.
   model.traverse(o=>{if(o.isMesh){const clone=m=>{const c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;const compileSame=c.onBeforeCompile===m.onBeforeCompile,cacheSame=c.customProgramCacheKey===m.customProgramCacheKey;if(!compileSame||!cacheSame||c.customProgramCacheKey()!==m.customProgramCacheKey())throw Error('Gallery lost original material shader hooks: '+m.name);materialChecks.push({kind,faction,material:m.name,compileSame,cacheSame,programKey:c.customProgramCacheKey()});materials.push(c);return c;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);}});scene.add(model);model.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),close=mode==='factions'&&row===2;
   const camera=new T.PerspectiveCamera(36,w/(h-28),.05,1000),height=close?size.y*.49:size.y*1.12;
   if(close)center.y=box.min.y+size.y*.78;const distance=Math.max(height/2/Math.tan(Math.PI/10),size.z/camera.aspect/2/Math.tan(Math.PI/10))*1.12;
   const direction=new T.Vector3(mode==='factions'&&row===1?-1:1,.16,mode==='factions'&&row===1?-.7:.7).normalize();camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);camera.updateMatrixWorld();
   const x=Math.round(col*w),y=Math.round(innerHeight-top-(row+1)*h);gl.setViewport(x,y,w,h-28);gl.setScissor(x,y,w,h-28);gl.render(scene,camera);
   const label=document.createElement('div');label.style.cssText=`position:absolute;left:${x+10}px;top:${top+row*h+5}px;width:${w-16}px;font-size:12px;line-height:20px`;label.textContent=mode==='factions'?WarData.F[faction].name+' · '+['正面','背面','装备近景'][row]:ModernFront.unitName(kind,faction);root.append(label);
  }
  window.__singleSoldierGalleryCleanup=()=>{for(const model of models)A.release(model);for(const material of materials)material.dispose();gl.dispose();root.remove();delete window.__singleSoldierGalleryCleanup;};
  return{mode,materials:materialChecks};
 },mode);assert.ok(materialAudit.materials.length>0&&materialAudit.materials.every(m=>m.compileSame&&m.cacheSame));(report.galleryMaterials??=[]).push(materialAudit);await p.waitForTimeout(120);await screenshot(mode);await p.evaluate(()=>window.__singleSoldierGalleryCleanup());
}
(async()=>{try{
 fs.mkdirSync('.tmp',{recursive:true});fs.mkdirSync('screenshots',{recursive:true});
 host=desktop?await _electron.launch({executablePath:require('./desktop-path.cjs').executable,args:[],timeout:45000}):await chromium.launch({headless:true,channel:'chromium'});
 p=desktop?await host.firstWindow():await host.newPage({viewport:{width:1600,height:1000}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});if(!desktop)await p.goto(process.env.GAME_URL||'http://127.0.0.1:8765');await p.waitForFunction(()=>window.ModernFront);
 await p.evaluate(()=>Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]));
 report.models=await p.evaluate(()=>{
  const A=WarPersonnelAnimation,out=[],failures=[],skeletons=new Set(),roles=A.roles,factions=Object.keys(WarData.F);
  for(const kind of roles)for(const faction of factions){
   const model=WarModels.create(kind,faction);model.scale.setScalar(model.userData.scale);A.update(model,{x:0,y:0,angle:0},0);model.updateMatrixWorld(true);const state=A.state(model);let bones=0,meshes=0,skinned=0,vertices=0,finite=true;
   model.traverse(o=>{if(o.isBone)bones++;if(!o.isMesh)return;meshes++;for(const a of Object.values(o.geometry.attributes))for(const v of a.array)if(!Number.isFinite(v))finite=false;
    for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m||!m.color||![m.color.r,m.color.g,m.color.b,m.opacity,m.roughness??0,m.metalness??0].every(Number.isFinite))finite=false;}
    if(o.isSkinnedMesh){skinned++;vertices+=o.geometry.attributes.position.count;const weights=o.geometry.attributes.skinWeight,indices=o.geometry.attributes.skinIndex;if(!weights||!indices){finite=false;return;}for(let i=0;i<weights.count;i++){let sum=0;for(let j=0;j<4;j++){const weight=weights.array[i*4+j],index=indices.array[i*4+j];sum+=weight;if(index<0||index>=13)finite=false;}if(Math.abs(sum-1)>.00001)finite=false;}o.skeleton.update();if(!Array.from(o.skeleton.boneMatrices).every(Number.isFinite))finite=false;}
   });
   const people=state?.people||[],one=people.length===1&&model.children.filter(o=>o.name.startsWith('personnel_')).length===1&&model.userData.squadMembers===1,unique=!!people[0]&&!skeletons.has(people[0].skeleton);if(people[0])skeletons.add(people[0].skeleton);
   if(!one||bones!==13||!people.every(p=>p.bones.length===13)||!finite||!unique||skinned<2)failures.push(kind+'_'+faction);
   out.push({kind,faction,people:people.length,bones,meshes,skinned,vertices,finite,unique,kit:model.userData.personnelKit,pattern:model.userData.uniformPattern,helmet:model.userData.helmetProfile});A.release(model);
  }return{roles,factions,models:out,failures};
 });assert.equal(report.models.roles.length,8);assert.equal(report.models.factions.length,6);assert.equal(report.models.models.length,48);assert.deepEqual(report.models.failures,[]);check('48个最终模型均为独立单人、13骨骼、有限材质与归一化蒙皮权重');
 await p.evaluate(()=>ModernFront.start({faction:'chn',enemies:1,map:'desert',buffs:['vision']}));await pause(true);
 const fixture=await p.evaluate(()=>{
  const g=ModernFront.game,r=ModernFront.renderer;g.entities=[];g.ore=[];g.effects=[];g.map.blocked.fill(0);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;t.queue=[];});g.spawn(0,'hq',300,300);g.spawn(1,'hq',5700,3600);
  const a=g.spawn(0,'infantry',1800,1400),b=g.spawn(0,'infantry',1800,1500),c=g.spawn(0,'operator',1900,1500);g.spatial.rebuild(g.entities);g.updateFog();r.camera={x:1830,y:1400,zoom:3};r.prepare(g);r.draw(g,{},g.time);return{id:a.id,otherIds:[b.id,c.id],before:[a,b,c].map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp})),click:r.entityScreen(a),destination:r.toScreen(1800,1250,0)};
 });
 await p.mouse.click(fixture.click.x,fixture.click.y);await p.waitForFunction(id=>ModernFront.selection.length===1&&ModernFront.selection[0]===id,fixture.id);
 await pause(false);await p.mouse.click(fixture.destination.x,fixture.destination.y,{button:'right'});await p.waitForFunction(id=>{const g=ModernFront.game,r=ModernFront.renderer,e=g.get(id),s=WarPersonnelAnimation.state(r.objects.get(id));return Math.hypot(e.x-1800,e.y-1400)>15&&s?.moving&&s.people.length===1;},fixture.id,{timeout:8000});await pause(true);
 report.battle=await p.evaluate(({id,otherIds,before})=>{
  const g=ModernFront.game,r=ModernFront.renderer,e=g.get(id),model=r.objects.get(id),state=WarPersonnelAnimation.state(model),pose=()=>state.people.flatMap(p=>p.bones.flatMap(b=>b.quaternion.toArray()));const first=JSON.stringify(pose()),at=[e.x,e.y];for(let n=0;n<12;n++)r.draw(g,{},g.time);
  const frozen=first===JSON.stringify(pose())&&at[0]===e.x&&at[1]===e.y,others=otherIds.map(id=>g.get(id)),hp=others.map(e=>e.hp);g.damage(e,13,1);const independentlyDamaged=others.every((e,i)=>e.hp===hp[i])&&e.hp<before[0].hp;
  const copy=WarSim.Game.load(g.save()),identity=[id,...otherIds].every(id=>copy.entities.filter(e=>e.id===id).length===1&&copy.get(id).kind===g.get(id).kind&&copy.get(id).hp===g.get(id).hp);
  const independentPositions=others.every(e=>{const old=before.find(x=>x.id===e.id);return Math.hypot(e.x-old.x,e.y-old.y)<.001;});return{selected:ModernFront.selection,people:state.people.length,bones:state.people[0].bones.length,frozen,independentlyDamaged,independentPositions,saveIdentity:identity,travel:Math.hypot(e.x-before[0].x,e.y-before[0].y)};
 },fixture);assert.equal(report.battle.people,1);assert.equal(report.battle.bones,13);assert.ok(report.battle.frozen&&report.battle.independentlyDamaged&&report.battle.independentPositions&&report.battle.saveIdentity);await screenshot('battle');check('真实鼠标只选择并移动一个兵；其余兵静止、伤害生命独立、保存重载身份保持、暂停不漂移');
 report.roles=await p.evaluate(()=>{
  const g=ModernFront.game,r=ModernFront.renderer;g.entities=g.entities.filter(e=>e.structure);const units=WarPersonnelAnimation.roles.map((k,i)=>g.spawn(0,k,1800+i%4*55,1400+Math.floor(i/4)*55));r.camera={x:1880,y:1430,zoom:4};r.draw(g,{},g.time);
  for(let i=0;i<25;i++){g.time+=1/60;for(const e of units)e.x+=.25;r.draw(g,{},g.time);}const states=units.map(e=>WarPersonnelAnimation.state(r.objects.get(e.id))),moving=states.every(s=>s?.moving&&s.people.length===1&&s.people[0].bones.length===13),pose=()=>JSON.stringify(states.flatMap(s=>s.people[0].bones.flatMap(b=>b.quaternion.toArray()))),before=pose();for(let i=0;i<8;i++)r.draw(g,{},g.time);const paused=before===pose();for(let i=0;i<20;i++){g.time+=1/60;r.draw(g,{},g.time);}return{count:units.length,moving,paused,settled:states.every(s=>!s.moving&&s.settle===1)};
 });assert.deepEqual(report.roles,{count:8,moving:true,paused:true,settled:true});check('实际r.draw验证八角色位移驱动、暂停姿态冻结和停步归位');
 await gallery('factions');await gallery('roles');
 report.renderEnvironment=await p.evaluate(()=>{const r=ModernFront.renderer,gl=r.gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[innerWidth,innerHeight],drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],dpr:r.dpr};});report.visualScope='Contact sheets use the final WarModels.create geometry, original standard-material parameters and live battlefield light colors/intensities; isolated close views do not establish photographic realism.';assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;if(p)await p.screenshot({path:'.tmp/single-soldier-failure-'+suffix+'.png'}).catch(()=>{});}finally{fs.writeFileSync('docs/single-soldier-'+suffix+'-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await host?.close();}})();
