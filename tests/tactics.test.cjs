const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data.js');require('../src/roster.js');require('../src/equipment.js');require('../src/sim.js');
const {Game}=WarSim;
const advance=(g,s)=>{for(let i=0;i<s*20;i++)g.step(.05);};
test('space weapons hit ground, naval, air, orbit and base',()=>{
 for(const kind of ['tank','destroyer','fighter','satellite','hq']){
  const g=new Game({enemies:1,buffs:['vision'],playerOnlyTech:false});g.entities=[];
  g.spawn(0,'hq',400,400);g.spawn(1,'hq',2600,1800);
  const a=g.spawn(0,'orbital',700,600),b=g.spawn(1,kind,850,600);g.teams[1].aiClock=999;
  const hp=b.hp;advance(g,4);assert.ok(b.hp<hp,kind+' should be damaged');
 }
});
test('independent AI space restriction permits jets and unarmed satellites',()=>{
 const g=new Game({enemies:1,playerOnlyTech:false,aiSpaceWeapons:false});g.spawn(1,'spaceport',2300,1600);g.spawn(1,'airfield',2400,1600);g.teams[1].money=50000;
 assert.equal(g.train(1,'orbital'),false);assert.equal(g.train(1,'satellite'),true);assert.equal(g.train(1,'jet'),true);g.options.aiSpaceWeapons=true;assert.equal(g.train(1,'orbital'),true);
});
test('harvesters gather, deliver credits and persist cargo',()=>{
 const g=new Game({enemies:1});g.teams.forEach(t=>t.aiClock=999);const h=g.entities.find(e=>e.team===0&&e.kind==='harvester');assert.ok(h);
 advance(g,100);assert.ok(g.teams[0].harvested>=500);assert.ok(g.ore.some(o=>o.amount<o.initial));
 const copy=Game.load(JSON.stringify(g.save()));assert.deepEqual(copy.ore,g.ore);assert.equal(copy.teams[0].harvested,g.teams[0].harvested);
});
test('formations keep single unit exact and provide distinct spread',()=>{
 const g=new Game({enemies:1});const units=g.entities.filter(e=>e.team===0&&e.kind==='ifv');g.command([units[0].id],1000,700);assert.equal(units[0].order.x,1000);
 g.command(units.map(e=>e.id),1000,700,false,null,{formation:'line'});const first=units.map(e=>({...e.order}));
 g.command(units.map(e=>e.id),1000,700,false,null,{formation:'column'});assert.notDeepEqual(units.map(e=>e.order),first);
});
test('rally point moves newly produced units and shift queues survive save',()=>{
 const g=new Game({enemies:1,buffs:['rapid']});g.teams.forEach(t=>t.aiClock=999);const f=g.entities.find(e=>e.team===0&&e.kind==='factory');g.setRally([f.id],1000,750);g.train(0,'tank');advance(g,4);
 const tank=g.entities.filter(e=>e.team===0&&e.kind==='tank').at(-1);assert.ok(tank.order);g.command([tank.id],1100,750,false,null,{queue:true});assert.equal(tank.orderQueue.length,1);
 assert.equal(Game.load(JSON.stringify(g.save())).get(tank.id).orderQueue.length,1);
});
test('domination victory and contested capture rule',()=>{
 const g=new Game({enemies:1,mode:'domination',scoreLimit:10});g.teams.forEach(t=>t.aiClock=999);g.nodes.forEach(n=>n.owner=0);advance(g,4);assert.equal(g.result,'victory');
 const g2=new Game({enemies:1});g2.teams.forEach(t=>t.aiClock=999);let n=g2.nodes[0];g2.spawn(0,'infantry',n.x,n.y);g2.spawn(1,'infantry',n.x+10,n.y);advance(g2,.2);assert.equal(n.progress,0);
});
test('blocked destination is resolved to accessible ground',()=>{
 const g=new Game({enemies:1,map:'river'}),e=g.entities.find(e=>e.team===0&&e.kind==='tank');assert.equal(g.map.blocked[Math.floor(1400/48)*WarData.COLS+Math.floor(3000/48)],1);g.command([e.id],3000,1400);
 const k=Math.floor(e.order.y/48)*WarData.COLS+Math.floor(e.order.x/48);assert.equal(g.map.blocked[k],0);
});
test('all land vehicle classes and air reach an ordered point on all three maps',()=>{
 for(const map of ['river','desert','industry'])for(const kind of ['infantry','tank','ifv','arty','rocket','aa','heli','fighter','jet','satellite','orbital','orbital_interceptor','asat']){
  const g=new Game({enemies:1,map,buffs:['vision']});g.entities=[];g.ore=[];g.spawn(0,'hq',300,360);g.spawn(1,'hq',2700,1700);g.teams.forEach(t=>t.aiClock=9999);
  const e=g.spawn(0,kind,720,600);g.command([e.id],2200,1100);advance(g,100);assert.ok(Math.hypot(e.x-2200,e.y-1100)<30,map+' '+kind+' failed to arrive: '+e.x+','+e.y);
 }
});
test('mine loading bay remains accessible; depletion chooses another mine',()=>{
 const g=new Game({enemies:1});g.teams.forEach(t=>t.aiClock=9999);let h=g.entities.find(e=>e.team===0&&e.kind==='harvester');g.ore[0].amount=1;advance(g,8);assert.equal(g.ore[0].amount,0);assert.notEqual(h.oreId,0);assert.ok(g.ore.find(o=>o.id===h.oreId).amount>0);
});
test('CIWS intercepts rockets and does not erase nuclear warning',()=>{
 const g=new Game({enemies:1});g.spawn(0,'power',800,400);g.spawn(0,'ciws',1100,700);g.effects.push({type:'shot',rocket:true,from:1,x:1150,y:700,tx:1100,ty:700,ttl:2,max:2,damage:100});g.effects.push({type:'nuke',from:1,x:1100,y:700,ttl:6,max:6,r:370});g.step(.05);assert.ok(g.effects.some(e=>e.type==='intercepted'));assert.ok(g.effects.some(e=>e.type==='nuke'));
});
test('independent production lanes finish infantry while tank is queued',()=>{
 const g=new Game({enemies:1});g.teams.forEach(t=>t.aiClock=9999);let n=g.entities.filter(e=>e.team===0&&e.kind==='infantry').length;g.train(0,'tank');g.train(0,'infantry');advance(g,3.2);assert.equal(g.entities.filter(e=>e.team===0&&e.kind==='infantry').length,n+1);assert.ok(g.teams[0].queue.some(q=>q.kind==='tank'));
});
test('saved AI space ban removes forbidden platforms and refunds queued ones',()=>{
 const g=new Game({enemies:1,playerOnlyTech:false,aiSpaceWeapons:true});g.spawn(1,'spaceport',2200,1600);g.teams[1].money=30000;g.train(1,'orbital');g.spawn(1,'orbital',2250,1500);const before=g.teams[1].money;g.setAISpaceWeapons(false);assert.equal(g.teams[1].queue.length,0);assert.ok(g.teams[1].money>before);assert.ok(!g.entities.some(e=>e.team===1&&e.kind==='orbital'));assert.equal(Game.load(JSON.stringify(g.save())).options.aiSpaceWeapons,false);
});
test('every mine on every map supports an ordered round trip to a refinery',()=>{
 for(const map of ['river','desert','industry'])for(let i=0;i<5;i++){
  const g=new Game({enemies:1,map});g.teams.forEach(t=>t.aiClock=99999);g.entities=g.entities.filter(e=>e.structure||e.kind==='harvester'&&e.team===0);
  const h=g.entities.find(e=>e.kind==='harvester'),ore=g.ore[i];g.command([h.id],ore.x,ore.y);advance(g,150);
  assert.ok(g.teams[0].harvested>=500,map+' mine '+i+' failed delivery; state='+h.miningState+' at '+Math.round(h.x)+','+Math.round(h.y));
  assert.ok(ore.amount<24000,map+' mine '+i+' was not the chosen mining site');
 }
});
