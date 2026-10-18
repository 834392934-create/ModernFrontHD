const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
global.THREE=require('../assets/vendor/three.min.js');
const context=new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
global.document={createElement:()=>({width:512,height:256,getContext:()=>context})};
require('../src/data.js');require('../src/roster.js');require('../src/operator-weapons.js');require('../src/models3d.js');require('../src/model-detail.js');require('../src/fps-viewmodel.js');
const W=WarOperatorWeapons;
test('64 original weapons have complete finite game properties and stable defaults',()=>{
 assert.equal(W.list.length,64);assert.equal(new Set(W.list.map(w=>w.id)).size,64);assert.equal(W.categories.length,8);
 assert.equal(Object.getPrototypeOf(W.byId),null);for(const id of ['__proto__','constructor','toString'])assert.equal(W.byId[id],undefined);
 assert.equal(W.byId[W.defaultPrimary].category,'rifle');assert.equal(W.byId[W.defaultSecondary].category,'pistol');
 for(const c of W.categories)assert.equal(W.list.filter(w=>w.category===c.id).length,8);
 for(const w of W.list){for(const k of ['damage','range','fireInterval','magazine','reserve','reloadSeconds','spread','recoil','pellets'])assert.ok(Number.isFinite(w[k])&&w[k]>0,w.id+' '+k);assert.equal(typeof w.automatic,'boolean');assert.equal(W.byId[w.id],w);assert.ok(w.name&&w.description);assert.equal(w.profile.family,w.category);assert.equal(w.splash>0,w.category==='launcher');assert.equal(w.pellets>1,w.category==='shotgun');assert.ok(w.magazine<=w.reserve);}
});
test('all weapons can target personnel; single, mixed and all-domain distribution is exact',()=>{
 const counts={single:0,mixed:0,all:0};for(const w of W.list){assert.ok(w.targets.includes('personnel'));assert.equal(new Set(w.targets).size,w.targets.length);for(const t of w.targets)assert.ok(W.targetLabels[t]);const n=w.targets.length-1;counts[n===1?'single':n===4?'all':'mixed']++;if(w.targets.includes('air')||w.targets.includes('space'))assert.match(w.description,/科幻/);}
 assert.deepEqual(counts,{single:32,mixed:24,all:8});
 const previous=JSON.stringify(W.list.map(w=>w.targets));delete require.cache[require.resolve('../src/operator-weapons.js')];require('../src/operator-weapons.js');assert.equal(JSON.stringify(WarOperatorWeapons.list.map(w=>w.targets)),previous);
});
test('all 64 selectable weapons build finite distinct geometry with named moving reload parts',t=>{
 const view=new WarFPSView(),signatures=new Set();let maxTriangles=0,maxCalls=0;
 for(const w of W.list){const metrics=view.setWeapon(w.id,'chn');assert.equal(metrics.weaponId,w.id);assert.equal(metrics.weaponCategory,w.category);assert.equal(metrics.mode,'infantry');assert.ok(view.foreground.getObjectByName('operator-reload-part'));const hash=crypto.createHash('sha256');view.foreground.traverse(o=>{if(o.isMesh){for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v),w.id);hash.update(Buffer.from(o.geometry.attributes.position.array.buffer));}});signatures.add(hash.digest('hex'));maxTriangles=Math.max(maxTriangles,metrics.triangles);maxCalls=Math.max(maxCalls,metrics.drawCalls);assert.ok(metrics.triangles<12000,w.id+' triangle budget');assert.ok(metrics.drawCalls<12,w.id+' draw-call budget');}
 assert.equal(signatures.size,64);t.diagnostic(JSON.stringify({models:64,uniqueGeometries:signatures.size,maxTriangles,maxCalls}));view.dispose();
});
test('reload visibly moves magazine and weapon with motion disabled, then restores ready pose',()=>{
 const view=new WarFPSView();for(const category of W.categories){const weapon=W.list.find(w=>w.category===category.id);view.setWeapon(weapon.id);view.update({motion:false,reloading:false,time:0,dt:.1});const idle=view.foreground.position.clone();view.update({motion:false,reloading:true,reloadProgress:.5,ads:true,firePulse:1,dt:.1});assert.ok(view.foreground.position.y<idle.y-.1);assert.ok(view.reloadPart.position.y<-.2);assert.equal(view.flash.visible,false);view.update({motion:false,reloading:false,reloadProgress:1,firePulse:0,dt:.1});assert.ok(view.foreground.position.distanceTo(idle)<1e-9);assert.equal(view.reloadPart.position.length(),0);}
 view.dispose();
});
test('weapon swap disposes old geometry and legacy vehicle view clears weapon state',()=>{
 const view=new WarFPSView();view.setWeapon('rifle_01');let disposed=0;view.foreground.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));view.setWeapon('pistol_02');assert.ok(disposed>0);assert.equal(view.metrics.weaponId,'pistol_02');assert.equal(view.setWeapon('missing'),false);assert.equal(view.metrics.weaponId,'pistol_02');view.setKind('tank','usa');assert.equal(view.metrics.weaponId,null);assert.equal(view.mode,'ground');assert.equal(view.reloadPart,null);view.dispose();
});
test('all existing unit view modes still construct after operator loadout selection',()=>{
 const view=new WarFPSView();for(const [kind,d]of Object.entries(WarData.U)){view.setWeapon('rifle_01');const metrics=view.setKind(kind,'chn');assert.ok(Number.isFinite(metrics.triangles));assert.ok(metrics.triangles>0);assert.equal(metrics.weaponId,kind==='operator'?W.defaultPrimary:null);if(d.air&&!d.space)assert.equal(view.mode,'air');if(d.underwater)assert.equal(view.mode,'underwater');}view.dispose();
});
