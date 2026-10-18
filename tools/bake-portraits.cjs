/* Build-time only: render the exact runtime models into RA-style unit cameos. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chromium'});try{
const page=await browser.newPage();await page.goto('http://127.0.0.1:8765');
await page.evaluate(()=>Promise.all([window.WarImported?.ready,window.WarImportedAir?.ready,window.WarImportedGround?.ready]));
let keys=await page.evaluate(()=>[...Object.keys(WarData.U),...Object.keys(WarData.B)]);if(process.argv[2])keys=keys.filter(k=>process.argv.slice(2).includes(k));fs.mkdirSync('assets/portraits',{recursive:true});
await page.evaluate(()=>{const T=THREE,renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setSize(240,144);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;const scene=new T.Scene();scene.add(new T.HemisphereLight(0xdde7e5,0x77735a,2.1));const sun=new T.DirectionalLight(0xffe5bf,3);sun.position.set(10,18,8);scene.add(sun);window.PortraitBake={renderer,scene,material:WarModels.createMaterial()}});
for(const faction of ['chn','usa','rus','ind','kor','imp'])for(const kind of keys){
 const data=await page.evaluate(({kind,faction})=>{const {renderer,scene,material}=PortraitBake,obj=WarModels.create(kind,faction);obj.traverse(m=>{if(m.isMesh&&!m.userData.preserveMaterial)m.material=material});scene.add(obj);const box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),span=Math.max(size.x,size.z)*.75;const cam=new THREE.OrthographicCamera(-span,span,span*.6,-span*.6,.1,200);cam.position.set(center.x+15,center.y+11,center.z+18);cam.lookAt(center);cam.updateMatrixWorld(true);let xx=0,yy=0;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const v=new THREE.Vector3(x,y,z).applyMatrix4(cam.matrixWorldInverse);xx=Math.max(xx,Math.abs(v.x));yy=Math.max(yy,Math.abs(v.y));}const half=Math.max(yy,xx*144/240)*1.1;cam.left=-half*240/144;cam.right=half*240/144;cam.top=half;cam.bottom=-half;cam.updateProjectionMatrix();renderer.render(scene,cam);const data=renderer.domElement.toDataURL('image/png');scene.remove(obj);return data.split(',')[1]},{kind,faction});
 fs.writeFileSync(path.join('assets/portraits',kind+'_'+faction+'.png'),Buffer.from(data,'base64'));
}
console.log('Baked '+keys.length*6+' unit and building portraits');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
