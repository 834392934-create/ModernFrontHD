// Measure the same loaded model factories as the game, including licensed GLB replacements.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chromium'});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8765');
 const rows=await page.evaluate(async()=>{
  await Promise.all([WarImported.ready,WarImportedAir.ready,WarImportedGround.ready]);
  if([WarImported,WarImportedAir,WarImportedGround].some(x=>x.status!=='ready'))throw Error('Imported models unavailable');
  const rows=[];
  for(const kind of Object.keys(WarData.U))for(const faction of Object.keys(WarData.F)){
   const m=WarModels.create(kind,faction);m.scale.setScalar(m.userData.scale);m.updateMatrixWorld(true);
   const b=new THREE.Box3().setFromObject(m),r=Math.hypot(Math.max(Math.abs(b.min.x),Math.abs(b.max.x)),Math.max(Math.abs(b.min.z),Math.abs(b.max.z)));
   const personnel=!!m.userData.personnelRig;
   rows.push({kind,faction,radius:Math.ceil(r+4+(personnel?4:0)),minY:Math.floor(b.min.y-3),maxY:Math.ceil(b.max.y+3),bounds:[b.min.toArray(),b.max.toArray()],source:m.userData.assetSource||'original procedural model'});
  }return rows;
 });
 const file='src/navigation-footprints.js',source=fs.readFileSync(file,'utf8'),data=Object.fromEntries(rows.map(r=>[r.kind+'_'+r.faction,[r.radius,r.minY,r.maxY,...[r.bounds[0][0]-2,r.bounds[1][0]+2,r.bounds[0][2]-2,r.bounds[1][2]+2].map(x=>Math.round(x*100)/100)]]));
 fs.writeFileSync(file,source.replace(/const bounds=.*?;/,'const bounds='+JSON.stringify(data)+';'));
 fs.writeFileSync('docs/reviews/runtime-model-bounds.json',JSON.stringify({recordedAt:new Date().toISOString(),method:'Runtime factories with all three imported GLB loaders ready; world scaled XZ envelope, separate combat radius.',rows},null,2));
 console.log(JSON.stringify({models:rows.length,imported:rows.filter(r=>r.source!=='original procedural model')}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
