'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/maps-large.js'),'utf8');
const dims={W:6144,H:4224,T:48,COLS:128,ROWS:88};
function load(extra={}) {const context={WarData:{...dims,...extra}};vm.runInNewContext(source,context);return context.WarMapLayouts;}
const layouts=load();
const ids=['river','desert','industry','archipelago'];
const index=(p,m)=>Math.floor(p.y/m.tileSize)*m.cols+Math.floor(p.x/m.tileSize);
function reach(m,mask,p) {
  const start=index(p,m),seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length);
  if(mask[start])return seen;
  let head=0,tail=1;queue[0]=start;seen[start]=1;
  while(head<tail){const i=queue[head++],x=i%m.cols,y=Math.floor(i/m.cols);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,n=yy*m.cols+xx;
      if(xx<0||xx>=m.cols||yy<0||yy>=m.rows||seen[n]||mask[n])continue;
      seen[n]=1;queue[tail++]=n;
    }
  }
  return seen;
}
function clearance(m,mask,radius) {
  const out=Uint8Array.from(mask),pad=Math.ceil(radius/m.tileSize);
  for(let y=0;y<m.rows;y++)for(let x=0;x<m.cols;x++) {
    if(out[y*m.cols+x])continue;
    for(let dy=-pad;dy<=pad;dy++)for(let dx=-pad;dx<=pad;dx++) {
      // Grid-conservative footprint, deliberately larger than current ship radii.
      if(Math.hypot(dx,dy)*m.tileSize>radius+m.tileSize*.5)continue;
      const xx=x+dx,yy=y+dy;
      if(xx<0||yy<0||xx>=m.cols||yy>=m.rows||mask[yy*m.cols+xx])out[y*m.cols+x]=1;
    }
  }
  return out;
}
function assertFootprint(m,mask,p,r,label) {
  for(let y=Math.floor((p.y-r)/m.tileSize);y<=Math.floor((p.y+r)/m.tileSize);y++)
    for(let x=Math.floor((p.x-r)/m.tileSize);x<=Math.floor((p.x+r)/m.tileSize);x++)
      assert.equal(mask[y*m.cols+x],0,`${label} overlaps terrain at ${x},${y}`);
}
function mineFor(p,i,H){return{x:p.x+(i===4?-280:300),y:p.y+(p.y>H/2?-140:180)};}
for(const id of ids) {
  test(`${id}: four times the original area; repeatable and bounded terrain`,()=>{
    const m=layouts.makeMap(id),again=layouts.makeMap(id);
    assert.equal(m.width*m.height,3072*2112*4);assert.equal(m.cols*m.rows,64*44*4);
    for(const k of ['tiles','blocked','navalBlocked'])assert.equal(m[k].length,128*88);
    assert.deepEqual(m,again);assert.equal(m.spawns.length,5);assert.equal(m.nodes.length,6);
    for(const p of [...m.spawns,...m.nodes,...m.navalSpawns,...m.navalUnitSpawns])
      assert.ok(p.x>0&&p.x<m.width&&p.y>0&&p.y<m.height,JSON.stringify(p));
    for(let i=0;i<m.tiles.length;i++){
      assert.ok(m.tiles[i]<=6);assert.ok(m.blocked[i]===0||m.blocked[i]===1);
      assert.equal(m.navalBlocked[i],m.tiles[i]===3||m.tiles[i]===6?0:1);
      if(m.tiles[i]===3||m.tiles[i]===6)assert.equal(m.blocked[i],1);
    }
    for(let x=0;x<m.cols;x++){assert.equal(m.tiles[x],6);assert.equal(m.tiles[(m.rows-1)*m.cols+x],6);}
    for(let y=0;y<m.rows;y++){assert.equal(m.tiles[y*m.cols],6);assert.equal(m.tiles[y*m.cols+m.cols-1],6);}
  });
  test(`${id}: all five bases, mine approaches and loading routes fit`,()=>{
    const m=layouts.makeMap(id);
    m.spawns.forEach((p,i)=>{
      const dir=p.y>m.height/2?-1:1;
      const structures=[{x:p.x,y:p.y,r:50},{x:p.x-130,y:p.y-90*dir,r:30},
        {x:p.x+130,y:p.y-90*dir,r:38},{x:p.x-120,y:p.y+110*dir,r:32},
        {x:p.x+130,y:p.y+120*dir,r:45}];
      structures.forEach((s,n)=>assertFootprint(m,m.blocked,s,s.r,`${i}: building ${n}`));
      const mine=mineFor(p,i,m.height),entrance={x:mine.x-75,y:mine.y+35};
      assertFootprint(m,m.blocked,mine,80,`${i}: mine`);
      assertFootprint(m,m.blocked,entrance,24,`${i}: loading area`);
      const dynamic=Uint8Array.from(m.blocked);
      for(let y=0;y<m.rows;y++)for(let x=0;x<m.cols;x++){
        const wx=(x+.5)*m.tileSize,wy=(y+.5)*m.tileSize;
        if(structures.some(s=>Math.hypot(wx-s.x,wy-s.y)<s.r+10)||Math.hypot(wx-mine.x,wy-mine.y)<45)dynamic[y*m.cols+x]=1;
      }
      const start={x:p.x+210,y:p.y+140*dir},seen=reach(m,dynamic,start);
      assert.equal(seen[index(entrance,m)],1,`${i}: harvester cannot reach loading entrance`);
      const refinery=structures[2],unload={x:refinery.x+90,y:refinery.y};
      assert.equal(seen[index(unload,m)],1,`${i}: harvester cannot return to refinery apron`);
      const home=reach(m,m.blocked,p);
      assert.ok(m.nodes.some(n=>home[index(n,m)]),`${i}: no reachable island objective`);
    });
  });
  test(`${id}: five harbours and ships share a sea route with 72 px clearance`,()=>{
    const m=layouts.makeMap(id),sea=clearance(m,m.navalBlocked,72);
    const seen=reach(m,sea,m.navalUnitSpawns[0]);
    for(let i=0;i<5;i++){
      assertFootprint(m,m.navalBlocked,m.navalSpawns[i],42,`harbour ${i}`);
      assert.equal(seen[index(m.navalSpawns[i],m)],1,`harbour ${i} disconnected`);
      assert.equal(seen[index(m.navalUnitSpawns[i],m)],1,`ship ${i} disconnected`);
    }
    if(id==='river')for(let i=0;i<m.tiles.length;i++)if(m.tiles[i]===4)assert.equal(m.navalBlocked[i],1,'ships must not pass through bridge tiles');
  });
}
test('archipelago: five separate starting islands, six objectives on reachable island land',()=>{
  const m=layouts.makeMap('archipelago'),regions=m.spawns.map(p=>reach(m,m.blocked,p));
  for(let i=0;i<5;i++)for(let j=0;j<5;j++)assert.equal(regions[i][index(m.spawns[j],m)],i===j?1:0);
  for(const n of m.nodes)assert.equal(regions.filter(s=>s[index(n,m)]).length,1);
  // The harbour inlet lies within building-chain reach of an initial structure.
  m.spawns.forEach((p,i)=>{
    const dir=p.y>m.height/2?-1:1,near=i===4?{x:p.x+130,y:p.y+120*dir}:{x:p.x-130,y:p.y-90*dir};
    assert.ok(Math.hypot(near.x-m.navalSpawns[i].x,near.y-m.navalSpawns[i].y)<400);
  });
});
test('legacy maps retain exact doubled land and obstacle topology',()=>{
  const small=load({W:3072,H:2112,COLS:64,ROWS:44});
  for(const id of ids.slice(0,3)){
    const old=small.makeMap(id),big=layouts.makeMap(id);
    old.spawns.forEach((p,i)=>{assert.equal(big.spawns[i].x,p.x*2);assert.equal(big.spawns[i].y,p.y*2);});
    for(let y=0;y<88;y++)for(let x=0;x<128;x++){
      const oi=Math.floor(y/2)*64+Math.floor(x/2),ni=y*128+x;
      assert.equal(big.tiles[ni],old.tiles[oi]);assert.equal(big.blocked[ni],old.blocked[oi]);
    }
    const seen=reach(big,big.blocked,big.spawns[0]);
    for(const p of [...big.spawns,...big.nodes])assert.equal(seen[index(p,big)],1,`${id}: disconnected land route`);
  }
});
test('seed factory contract, unknown map fallback, and invalid dimensions are explicit',()=>{
  let called=null;const m=layouts.makeMap('archipelago',seed=>{called=seed;return()=>.5;});
  assert.equal(called,m.seed);assert.equal(layouts.makeMap('missing').id,'river');
  assert.throws(()=>layouts.makeMap('river',()=>.5),/rngFactory/);
  assert.throws(()=>load({W:6143}).makeMap('river'),/whole terrain cells/);
});
test('actual simulation: all twenty starting mines deliver ore on enlarged maps',()=>{
  require('../src/data.js');require('../src/roster.js');require('../src/equipment.js');require('../src/sim.js');
  assert.equal(WarData.W,6144);assert.equal(WarData.COLS,128);
  for(const id of ids){
    const g=new WarSim.Game({map:id,enemies:4});g.teams.forEach(t=>t.aiClock=1e9);
    // Economy-only scenario retains all ground building obstructions, miners,
    // and actual update/pathfinding. Remove combatants to isolate mine access.
    g.entities=g.entities.filter(e=>e.structure||e.kind==='harvester');
    for(let tick=0;tick<2400;tick++)g.step(.05);
    for(let i=0;i<5;i++){
      assert.ok(g.teams[i].harvested>=500,`${id}: team ${i} failed a full cargo round trip`);
      assert.ok(g.ore[i].amount<g.ore[i].initial,`${id}: mine ${i} untouched`);
    }
  }
});
