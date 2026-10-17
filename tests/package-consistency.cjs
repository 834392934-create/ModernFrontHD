/* Verify the tested local desktop payload matches source. Electron's package manifest is generated. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
require('../src/data.js');require('../src/roster.js');
const base='release/ModernFrontHD/resources/app',roots=['src','assets','desktop','index.html','gallery.html','style.css','desktop.css','favicon.svg','README.md','LICENSE','THIRD_PARTY_NOTICES.md'];
function files(p){return fs.statSync(p).isDirectory()?fs.readdirSync(p).flatMap(n=>files(path.join(p,n))):[p];}
const all=roots.flatMap(files),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const mismatches=all.filter(p=>!fs.existsSync(path.join(base,p))||hash(p)!==hash(path.join(base,p)));assert.deepEqual(mismatches,[]);
const packaged=JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8').replace(/^\uFEFF/,''));assert.equal(packaged.version,require('../package.json').version);assert.equal(packaged.main,'desktop/main.cjs');
const portraits=fs.readdirSync('assets/portraits').filter(p=>p.endsWith('.png')).length;assert.equal(portraits,(Object.keys(WarData.U).length+Object.keys(WarData.B).length)*Object.keys(WarData.F).length);
const runtimeChecks=['desktop-report.json','expanded-desktop-report.json','first-person-desktop-report.json','depth-flight-desktop-report.json'];for(const name of runtimeChecks){const r=JSON.parse(fs.readFileSync('docs/'+name,'utf8'));assert.notEqual(r.passed,false,name);assert.deepEqual(r.errors||[],[],name);if(name==='first-person-desktop-report.json'){assert.equal(r.passed,true);assert.equal(r.possession.length,Object.keys(WarData.U).length);}if(name==='depth-flight-desktop-report.json'){assert.equal(r.passed,true);assert.ok(r.nativeFlightFocus.trustedBlur);assert.equal(r.checks.length,7);}} 
const report={recordedAt:new Date().toISOString(),version:packaged.version,sha256Matches:all.length,portraits,executable:'release/ModernFrontHD/ModernFrontHD.exe',runtimeChecks,mismatches};fs.writeFileSync('docs/depth-package-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
