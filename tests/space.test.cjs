const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data.js');require('../src/roster.js');require('../src/equipment.js');require('../src/sim.js');
const {Game}=WarSim;const {advanceUntil}=require('./combat-preparation.cjs');
function arena(){const g=new Game({enemies:1,buffs:['vision'],playerOnlyTech:false,aiSpaceWeapons:true});g.entities=[];g.spawn(0,'hq',300,300);g.spawn(1,'hq',2700,1800);g.teams.forEach(t=>t.aiClock=999999);return g;}
function step(g,s){for(let i=0;i<s*20;i++)g.step(.05);}
test('interceptor attacks air and orbit, never land, ships or buildings',()=>{
 for(const kind of ['fighter','satellite','tank','destroyer','hq']){const g=arena(),a=g.spawn(0,'orbital_interceptor',700,600),b=g.spawn(1,kind,850,600),hp=b.hp;step(g,3);assert.equal(b.hp<hp,['fighter','satellite'].includes(kind),kind);}
});
test('recon satellite cannot fire even with an explicit attack order',()=>{
 const g=arena(),a=g.spawn(0,'satellite',700,600),b=g.spawn(1,'satellite',702,600);g.command([a.id],b.x,b.y,true,b.id);const hp=b.hp;step(g,3);assert.equal(b.hp,hp);assert.ok(!g.effects.some(f=>f.sourceKind==='satellite'));
});
test('ground ASAT damages only orbit and never aircraft, land, ships or bases',()=>{
 for(const kind of ['satellite','fighter','tank','destroyer','hq']){const g=arena();g.spawn(0,'asat',700,600);const b=g.spawn(1,kind,850,600),hp=b.hp;step(g,3);assert.equal(b.hp<hp,kind==='satellite',kind);}
});
test('live ban removes both orbital weapons, refunds their queue and preserves recon and ground defense',()=>{
 const g=arena();g.spawn(1,'spaceport',2300,1500);g.teams[1].money=50000;for(const k of ['orbital','orbital_interceptor','satellite','asat']){g.spawn(1,k,2200,1500);assert.equal(g.train(1,k),true);}
 const money=g.teams[1].money;g.effects.push({type:'shot',space:true,from:1,ttl:1});g.setAISpaceWeapons(false);
 assert.equal(g.teams[1].money,money+WarData.U.orbital.cost+WarData.U.orbital_interceptor.cost);
 for(const k of ['orbital','orbital_interceptor']){assert.ok(!g.entities.some(e=>e.team===1&&e.kind===k));assert.ok(!g.teams[1].queue.some(q=>q.kind===k));assert.equal(g.train(1,k),false);}
 for(const k of ['satellite','asat'])assert.ok(g.entities.some(e=>e.team===1&&e.kind===k));assert.ok(!g.effects.some(f=>f.from===1&&f.space));
 const copy=Game.load(JSON.stringify(g.save()));assert.equal(copy.options.aiSpaceWeapons,false);assert.ok(copy.entities.some(e=>e.kind==='asat'));
});
test('interceptor build and movement order survive save/load',()=>{
 const g=arena();g.spawn(0,'spaceport',600,500);g.teams[0].money=99999;assert.equal(g.train(0,'orbital_interceptor'),true);const e=g.spawn(0,'orbital_interceptor',700,600);g.command([e.id],1200,800);const copy=Game.load(JSON.stringify(g.save()));assert.equal(copy.get(e.id).kind,e.kind);assert.equal(copy.get(e.id).order.x,1200);assert.equal(copy.teams[0].queue[0].kind,'orbital_interceptor');
});
test('space shot styles preserve origin and target layer including impact',()=>{
 for(const [kind,style,height] of [['orbital','orbital-beam',4000],['orbital_interceptor','interceptor-burst',4000],['asat','missile',12]]){const g=arena();g.spawn(0,kind,700,600);g.spawn(1,'satellite',1000,600);let shot;for(let n=0;n<25&&!shot;n++){g.step(.05);shot=g.effects.find(f=>f.type==='shot'&&f.from===0);}
  assert.ok(shot,kind);assert.equal(shot.weaponFx,style);if(kind==='asat'){assert.equal(shot.weaponFamily,'missile');assert.deepEqual(shot.weaponDomains,['space']);}assert.equal(shot.sourceHeight,height);assert.equal(shot.targetHeight,4000);assert.ok(advanceUntil(g,()=>g.effects.some(f=>f.type==='impact'&&Math.abs(f.height-4000)<40),shot.ttl+.2),kind+' impact remains at the actual orbital hull surface');
 }
});
test('player-only technology remains separate from AI orbital permission',()=>{
 const g=arena();g.spawn(1,'spaceport',2300,1500);g.teams[1].money=99999;g.options.playerOnlyTech=true;assert.equal(g.train(1,'orbital_interceptor'),false);assert.equal(g.train(1,'satellite'),true);g.options.playerOnlyTech=false;assert.equal(g.train(1,'orbital_interceptor'),true);
});
test('all spacecraft names and dossiers explicitly identify the original fiction',()=>{
 for(const f of Object.keys(WarData.F))for(const k of ['satellite','orbital_interceptor','orbital','asat']){assert.match(WarData.EXTRA[f][k],/原创架空/);assert.equal(WarData.EQUIPMENT.dossier(f,k).fiction,true);}
});
