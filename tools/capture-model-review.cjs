/* Reproducible art-review views. This records evidence; it does not assert photorealism. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chromium'});try{
 const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8765/gallery.html');await page.waitForFunction(()=>window.Armory);
 await page.evaluate(()=>Promise.all([window.WarImported?.ready,window.WarImportedAir?.ready,window.WarImportedGround?.ready]));
 await page.addStyleTag({content:'.bar,.info,.controls,.views{display:none!important}'});
 const keys=process.argv.slice(2).length?process.argv.slice(2):['tank_chn','tank_usa','tank_rus','tank_ind','tank_kor'];
 fs.mkdirSync('screenshots/model-review',{recursive:true});const report=[];
 for(const key of keys){await page.evaluate(k=>{document.querySelector('#model').value=k;Armory.load(k)},key);
  const metadata=await page.evaluate(()=>({key:Armory.key,...Armory.modelRoot.userData,triangles:Armory.triangles,dimensions:new THREE.Box3().setFromObject(Armory.modelRoot).getSize(new THREE.Vector3()).toArray()}));
  for(const view of ['perspective','side','front','rear','top']){await page.evaluate(v=>Armory.setView(v),view);await page.waitForTimeout(80);await page.screenshot({path:'screenshots/model-review/'+key+'-'+view+'.png'});}report.push(metadata);
 }
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync('docs/reviews/model-capture-'+keys[0]+'.json',JSON.stringify({recordedAt:new Date().toISOString(),models:report,errors,scope:'Rendered multi-view evidence only; no automatic photo-realism approval.'},null,2));
 console.log(JSON.stringify({models:report.length,views:report.length*5,errors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
