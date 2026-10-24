'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
require('../src/data.js');require('../src/roster.js');require('../src/equipment.js');require('../src/sim.js');

test('A* respects each map size without changing global dimensions or another game',()=>{
 const old=WarSim.makeMap('river'),large={width:12288,height:8448,tileSize:48,cols:256,rows:176,blocked:new Uint8Array(256*176)};
 const path=WarSim.findPath(large,10008,7008,11976,7992);
 assert.ok(path.length>0);assert.deepEqual(path.at(-1),{x:11976,y:7992});
 assert.equal(WarData.W,6144);assert.equal(WarData.H,4224);assert.equal(old.blocked.length,128*88);
 const legacy=WarSim.findPath(old,old.spawns[0].x,old.spawns[0].y,old.spawns[1].x,old.spawns[1].y);
 assert.ok(legacy.length>0);assert.ok(legacy.every(p=>p.x<6144&&p.y<4224));
});

const ids=['english_channel','gibraltar','taiwan_strait'];
const historical={river:'d7ab8b0206e47f64284e869c1f2119adff9ff4744b82f11016b9fdbb41f617bf',desert:'719fccccba893116b423e6f8d12b5df68f024cf3f1b408aa9e5e0616bc1a499d',industry:'aea40d23c4e3722fe90fa6b41bd67111eb6989f5f439bc351b815906bcfb6cbd',archipelago:'6fe0f647ec3493a3318cc0ac4ecbc5a79f9b388650e420f1266b19836fdf469e'};
const index=(m,p)=>Math.floor(p.y/m.tileSize)*m.cols+Math.floor(p.x/m.tileSize);
function flood(m,mask,p){const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length),start=index(m,p);if(mask[start])return seen;seen[start]=1;queue[0]=start;let head=0,tail=1;while(head<tail){const i=queue[head++],x=i%m.cols,y=Math.floor(i/m.cols);for(const j of [x?i-1:-1,x+1<m.cols?i+1:-1,y?i-m.cols:-1,y+1<m.rows?i+m.cols:-1])if(j>=0&&!seen[j]&&!mask[j]){seen[j]=1;queue[tail++]=j;}}return seen;}
function clear(m,mask,p,r,label){for(let y=Math.floor((p.y-r)/48);y<=Math.floor((p.y+r)/48);y++)for(let x=Math.floor((p.x-r)/48);x<=Math.floor((p.x+r)/48);x++)assert.equal(mask[y*m.cols+x],0,label);}

test('all four legacy maps retain their exact v3.14 terrain and deployment hashes',()=>{
 for(const [id,expected]of Object.entries(historical)){const m=WarSim.makeMap(id),h=crypto.createHash('sha256');for(const k of ['tiles','blocked','navalBlocked'])h.update(m[k]);h.update(JSON.stringify([m.spawns,m.nodes,m.navalSpawns,m.navalUnitSpawns]));assert.equal(h.digest('hex'),expected,id);assert.equal(m.width,6144);assert.equal(m.height,4224);}
});
for(const id of ids){
 test(`${id}: offline coast is unchanged and five complete bases have mine/objective access`,()=>{
  const g=new WarSim.Game({map:id,enemies:4}),m=g.map,source=WarMapGeography.regions[id];
  assert.deepEqual([m.width,m.height,m.tileSize,m.cols,m.rows],[12288,8448,48,256,176]);assert.equal(m.spawns.length,5);assert.equal(m.nodes.length,6);assert.equal(m.geography.coastModified,false);
  let at=0;for(let i=0;i<source.landRuns.length;i+=2)for(let n=0;n<source.landRuns[i];n++){assert.equal(m.blocked[at],1-source.landRuns[i+1]);assert.equal(m.navalBlocked[at],source.landRuns[i+1]);at++;}assert.equal(at,45056);
  for(const e of g.entities){if(e.structure)clear(m,WarData.B[e.kind].water?m.navalBlocked:m.blocked,e,e.r,`${id}/${e.team}/${e.kind} building footprint`);else if(!WarData.U[e.kind].air)assert.equal(WarNavigationFootprints.terrain(g,e,e.x,e.y),true,`${id}/${e.team}/${e.kind} full unit footprint`);}
  for(const [team,p]of m.spawns.entries()){const mine=g.ore[team],miner=g.entities.find(e=>e.team===team&&e.kind==='harvester');clear(m,m.blocked,mine,80,`${id} team ${team} mine`);g.harvest(miner,.05);const entrance=miner.mineApproach,refinery=g.entities.find(e=>e.team===team&&e.kind==='refinery');assert.ok(entrance&&g.directPositionFree(miner,entrance.x,entrance.y),'physical loading approach');const land=flood(m,m.blocked,p);assert.equal(land[index(m,entrance)],1,'loading area shares the base land region');assert.equal(land[index(m,refinery)],1,'refinery shares the base land region');assert.ok(m.nodes.some(n=>land[index(m,n)]),'an objective is reachable on each starting land mass');}
 });
 test(`${id}: all harbours share sea and largest faction carrier fits at every bearing`,()=>{
  const g=new WarSim.Game({map:id,enemies:4}),m=g.map,sea=flood(m,m.navalBlocked,m.navalUnitSpawns[0]);
  for(const p of [...m.navalSpawns,...m.navalUnitSpawns]){assert.equal(sea[index(m,p)],1);clear(m,m.navalBlocked,p,150,'carrier turning water');}
  for(const faction of Object.keys(WarData.F)){g.teams[0].faction=faction;for(const p of m.navalUnitSpawns)for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){const carrier={id:-1,kind:'carrier',team:0,r:WarData.U.carrier.r,angle};assert.equal(WarNavigationFootprints.terrain(g,carrier,p.x,p.y,angle),true,`${id}/${faction} carrier`);}}
 });
 test(`${id}: real game economy delivers cargo for all five teams`,()=>{
  const g=new WarSim.Game({map:id,enemies:4});g.teams.forEach(t=>t.aiClock=1e9);g.entities=g.entities.filter(e=>e.structure||e.kind==='harvester');
  for(let tick=0;tick<2400;tick++){g.step(.05);for(const e of g.entities.filter(e=>e.kind==='harvester'))assert.equal(WarNavigationFootprints.terrain(g,e,e.x,e.y),true,'cargo route preserves full vehicle terrain footprint');}
  for(let team=0;team<5;team++){assert.ok(g.teams[team].harvested>=500,`${id}/${team} no complete cargo return: ${g.teams[team].harvested}`);assert.ok(g.ore[team].amount<g.ore[team].initial);}
 });
 test(`${id}: independent visibility, local A* masks and save/load preserve far-side coordinates`,()=>{
  const g=new WarSim.Game({map:id,enemies:4}),legacy=new WarSim.Game({map:'river',enemies:1});
  const far=g.map.spawns.find(p=>p.x>6144),target=g.spawn(0,'recon_vehicle',far.x+250,far.y+260);g.updateFog();assert.equal(g.visible.length,45056);assert.equal(g.visibleAt(target.x,target.y),true);assert.equal(legacy.visible.length,11264);
  const mask=WarNavigationFootprints.pathGrid(g,target);assert.equal(mask.cols,256);assert.equal(mask.width,12288);
  const destination=g.destination(target,target.x+100,target.y);assert.ok(destination&&destination.x>6144);g.command([target.id],destination.x,destination.y);assert.ok(target.order.x>6144);
  const saved=g.save(),loaded=WarSim.Game.load(saved);assert.equal(loaded.get(target.id).x,target.x);assert.deepEqual(loaded.map.spawns,g.map.spawns);assert.equal(loaded.visible.length,45056);
  const old=legacy.save();delete old.mapGeometry;assert.equal(WarSim.Game.load(old).map.width,6144);
  const bad=structuredClone(saved);bad.mapGeometry.width=6144;assert.throws(()=>WarSim.Game.load(bad),/geometry/i);assert.equal(WarData.W,6144);
 });
}

test('independent geographic spot checks distinguish documented land and sea',()=>{
 const points={english_channel:[[-2,50,0],[0,51.5,1]],gibraltar:[[-4,36,0],[-4,37,1],[-5,35,1]],taiwan_strait:[[119.5,24,0],[121,23.5,1],[118,25,1]]};
 for(const [id,list]of Object.entries(points)){const m=WarSim.makeMap(id),b=m.geography.bounds;for(const [lon,lat,land]of list){const p={x:(lon-b[0])/(b[2]-b[0])*m.width,y:(b[3]-lat)/(b[3]-b[1])*m.height};assert.equal(m.navalBlocked[index(m,p)],land,`${id}: ${lon},${lat}`);}}
});

test('CPU renderer uses bounded terrain textures and local minimap/camera scales across map switches',()=>{
 const previous=global.document,draws=[],canvas=()=>({width:0,height:0,getContext(){return context;}}),context=new Proxy({scale(){},drawImage(){},fillRect(...args){draws.push(args);}}, {get:(o,k)=>k in o?o[k]:(()=>{})});global.document={createElement:canvas};
 try{
  require('../src/render.js');const Renderer=WarRenderer,r=Object.create(Renderer.prototype);r.fogCanvas=canvas();r.camera={x:0,y:0,zoom:1};r.width=1400;r.height=900;r.mini={width:256,height:176};r.mc=context;r.toWorld=()=>({x:0,y:0});
  for(const id of ['river','english_channel','river']){const g=new WarSim.Game({map:id,enemies:1,buffs:['vision']});r.prepare(g);assert.equal(r.terrain.width,2048);assert.equal(r.terrain.height,1408);assert.deepEqual([r.fogCanvas.width,r.fogCanvas.height],[g.map.cols,g.map.rows]);r.pan(999999,999999);assert.deepEqual([r.camera.x,r.camera.y],[g.map.width,g.map.height]);
   const e=g.entities.find(e=>e.team===0&&!e.structure);e.x=g.map.width*.75;e.y=g.map.height*.75;draws.length=0;r.drawMinimap(g);assert.ok(draws.some(p=>Math.abs(p[0]-(192-1.5))<1e-6&&Math.abs(p[1]-(132-1.5))<1e-6),'unit marker uses this map extent');}
 }finally{global.document=previous;}
});

test('CPU 3D fog reallocates for old/large/old maps and shader dimensions are uniforms',()=>{
 global.THREE=require('../assets/vendor/three.min.js');require('../src/battle3d.js');
 const r=Object.create(Battle3D.prototype),sizes=[];r.fogCtx={createImageData(w,h){sizes.push([w,h]);return{data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};r.fogTex=new THREE.Texture();r.fogUniform={value:r.fogTex};r.fogEnabled={value:0};
 for(const id of ['river','english_channel','river']){const g=new WarSim.Game({map:id,enemies:1,buffs:['vision']});r.updateFog(g,false);assert.equal(r.fogImage.data.length,g.map.cols*g.map.rows*4);}
 assert.deepEqual(sizes,[[128,88],[256,176],[128,88]]);
 r.mapSizeUniform={value:new THREE.Vector2(12288,8448)};const material=new THREE.MeshStandardMaterial();r.fogify(material);const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <dithering_fragment>'};material.onBeforeCompile(shader);assert.strictEqual(shader.uniforms.warMapSize,r.mapSizeUniform);assert.match(shader.fragmentShader,/vWarWorld\.x\/warMapSize\.x/);
});

test('map dimension validation remains strict after a cached lookup',()=>{
 const size={width:12288,height:8448,tileSize:48,cols:256,rows:176};assert.equal(WarMapDimensions.forMap(size).width,12288);size.cols=128;assert.throws(()=>WarMapDimensions.forMap(size),/disagree/);assert.throws(()=>WarMapDimensions.forMap({width:12289,height:8448,tileSize:48}),/dimensions/);
});

test('offline geography includes clipped source polygons and pinned public-domain provenance',()=>{
 const manifest=require('../assets/maps/geography-source.json');assert.equal(manifest.source.sha256,'e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b');assert.deepEqual(manifest.source,WarMapGeography.source);
 for(const id of ids){const data=WarMapGeography.regions[id],b=data.bounds;assert.ok(data.landPolygons.length);for(const polygon of data.landPolygons)for(const ring of polygon)for(const [lon,lat]of ring){assert.ok(lon>=b[0]-1e-6&&lon<=b[2]+1e-6&&lat>=b[1]-1e-6&&lat<=b[3]+1e-6,'offline points are clipped to this region');}}
});

test('every geographic base can build an airport and a full independent runway on existing land',()=>{
 for(const id of ids){const g=new WarSim.Game({map:id,enemies:4});for(let team=0;team<5;team++){const home=g.map.spawns[team];let found=false;for(let ring=200;ring<=480&&!found;ring+=80)for(let n=0;n<16&&!found;n++){const a=n*Math.PI/8,x=home.x+Math.cos(a)*ring,y=home.y+Math.sin(a)*ring;if(!g.canBuild(team,'airfield',x,y))continue;const field=g.spawn(team,'airfield',x,y),site=WarAirbaseRunways.findSite(g,field);if(site&&g.canBuild(team,'runway',site.x,site.y)){assert.equal(WarAirbaseRunways.siteClear(g,site),true);assert.equal(WarAirbaseRunways.terrain(g,site),true);found=true;}else g.entities=g.entities.filter(e=>e.id!==field.id);}assert.equal(found,true,`${id}/${team} has a legal full runway and approach`);}}
});
