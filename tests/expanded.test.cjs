const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data.js');require('../src/roster.js');require('../src/equipment.js');require('../src/sim.js');require('../src/ranges.js');
const {Game}=WarSim,{U,B,ROSTER}=WarData;
function arena(){const g=new Game({faction:'chn',enemies:1,buffs:['vision'],playerOnlyTech:false,aiSpaceWeapons:true});g.entities=[];g.spawn(0,'hq',300,300);g.spawn(1,'hq',2700,1800);g.teams.forEach(t=>t.aiClock=999999);return g;}
function step(g,s){for(let i=0;i<Math.ceil(s*20);i++)g.step(.05);}
const targets={underwater:'submarine',ground:'tank',naval:'destroyer',air:'fighter',space:'satellite',structure:'hq'};
test('four groups have 20/19/18/18 roles, with harvester separately counted',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(ROSTER.groups).map(([k,v])=>[k,v.length])),{ground:20,naval:19,air:18,space:18});assert.equal(Object.keys(U).length,76);
 assert.equal(new Set(Object.values(ROSTER.groups).flat()).size,75);assert.ok(!Object.values(ROSTER.groups).flat().includes('harvester'));
 for(const k of ROSTER.added){assert.ok(B[U[k].producer],k);assert.equal(U[k].index,undefined);assert.match(WarData.EQUIPMENT.dossier('chn',k).status,/原创/);}
});
test('every added armed role really hits only its declared target domains (246 armed firing scenarios)',()=>{
 for(const k of ROSTER.added.filter(k=>U[k].damage))for(const [domain,kind] of Object.entries(targets)){
  const g=arena(),d=U[k],distance=Math.max(d.minRange||0,0)+Math.min(70,(d.range-(d.minRange||0))/2),a=g.spawn(0,k,1000,750),b=g.spawn(1,kind,1000+distance,750),hp=b.hp;
  b.disabled=999;g.command([a.id],a.x,a.y,true,b.id);step(g,distance/700+1);
  assert.equal(b.hp<hp,d.targetDomains.includes(domain),k+' -> '+domain);
 }
});
test('restricted splash cannot bypass domain rules',()=>{
 for(const [kind,target,protectedKind] of [['orbital_bombardment','tank','hq'],['shore_bombardment','hq','destroyer'],['heavy_bomber','hq','fighter']]){
  const g=arena(),a=g.spawn(0,kind,1000,750),b=g.spawn(1,target,1400,750),other=g.spawn(1,protectedKind,1410,750),hp=other.hp; b.disabled=other.disabled=999;
  g.command([a.id],a.x,a.y,true,b.id);step(g,2);assert.ok(b.hp<b.maxHp,kind);assert.equal(other.hp,hp,kind+' protects '+protectedKind);
 }
});
test('role damage bonuses apply by target family without inflating structures',()=>{
 const g=arena();assert.equal(g.attackDamage('machinegun_team',{kind:'assault_team'},10),18);
 assert.equal(g.attackDamage('antitank_team',{kind:'tank'},100),170);assert.equal(g.attackDamage('heavy_bomber',{kind:'hq'},100),120);
 assert.equal(g.attackDamage('machinegun_team',{kind:'hq'},10),10);
});
test('support repairs only its own domain, never buildings or enemies, and never fires',()=>{
 for(const [kind,domain] of [['repair_vehicle','ground'],['repair_ship','naval'],['orbital_repair','space']]){
  const g=arena(),a=g.spawn(0,kind,1000,750),samples=Object.entries(targets).map(([d,k],i)=>{const e=g.spawn(0,k,1030+i*3,750);e.hp-=100;e.disabled=999;return {e,d,hp:e.hp};});
  const enemy=g.spawn(1,'tank',1050,750);enemy.disabled=999;enemy.hp-=100;const hp=enemy.hp;step(g,.5);
  for(const s of samples)assert.equal(s.e.hp>s.hp,s.d===domain,kind+' repairs '+s.d);assert.equal(enemy.hp,hp);assert.ok(!g.effects.some(e=>e.sourceKind===kind));
 }
});
test('all 76 units can be trained, completed and loaded using their real production lanes',()=>{
 for(const k of Object.keys(U)){
  const g=arena();g.spawn(0,'power',450,450);g.spawn(0,'power',550,450);g.spawn(0,U[k].producer,U[k].naval?720:700,U[k].naval?120:600);g.teams[0].money=100000;
  assert.equal(g.train(0,k),true,k);const saved=Game.load(JSON.stringify(g.save()));assert.equal(saved.teams[0].queue[0].kind,k);step(saved,U[k].time+2);
  assert.ok(saved.entities.some(e=>e.team===0&&e.kind===k),k+' completed');
 }
});
test('AI choices include fractional-weight support and obey advanced and orbital bans',()=>{
 const g=arena();for(const k of new Set(Object.values(U).map(d=>d.producer)))g.spawn(1,k,2200,1500);g.teams[1].money=1e6;
 const choices=g.availableUnitKinds(1);for(const k of ROSTER.added)assert.ok(choices.includes(k),k);
 g.random=()=>0;assert.equal(g.chooseUnitKind(['repair_ship','tank']),'repair_ship');g.random=()=>.999;assert.equal(g.chooseUnitKind(['repair_ship','tank']),'tank');
 g.options.aiSpaceWeapons=false;assert.ok(g.availableUnitKinds(1).every(k=>!U[k].spaceWeapon));assert.ok(g.availableUnitKinds(1).includes('orbital_repair'));assert.ok(g.availableUnitKinds(1).includes('jet'));
 g.options.playerOnlyTech=true;assert.ok(g.availableUnitKinds(1).every(k=>!U[k].advanced));
});
test('new orbital restriction removes armed platforms, refunds queues, preserves unarmed orbit',()=>{
 const g=arena();g.spawn(1,'spaceport',2200,1500);g.teams[1].money=1e6;const kinds=ROSTER.groups.space;
 for(const k of kinds)g.spawn(1,k,2300,1500);
 // The production queue is capped at 12; verify both batches against the real queue API.
 for(let offset=0;offset<kinds.length;offset+=12){
 g.options.aiSpaceWeapons=true;g.teams[1].queue=[];
 const batch=kinds.slice(offset,offset+12);for(const k of batch)assert.equal(g.train(1,k),true,k);
 const before=g.teams[1].money,refund=batch.filter(k=>U[k].spaceWeapon).reduce((s,k)=>s+g.cost(1,k),0);
 g.setAISpaceWeapons(false);assert.equal(g.teams[1].money,before+refund);assert.ok(g.teams[1].queue.every(q=>!U[q.kind].spaceWeapon));
 }
 for(const k of kinds)assert.equal(g.entities.some(e=>e.team===1&&e.kind===k),!U[k].spaceWeapon,k);
});
test('defense profiles separate attack, interception, radar links and powered vision',()=>{
 const g=arena();g.spawn(0,'power',450,450);const c=g.spawn(0,'ciws',1000,750),r=g.spawn(0,'radar',1100,750);
 let p=g.rangeProfile(c);assert.equal(p.attack,330*1.15);assert.equal(p.zones.find(z=>z.type==='intercept').radius,330);assert.equal(g.rangeProfile(r).zones.find(z=>z.type==='link').radius,450);
 r.disabled=100;assert.equal(g.rangeProfile(c).attack,330);assert.equal(g.sightRadius(r),330*WarData.F.chn.vision);
 c.disabled=100;assert.equal(g.rangeProfile(c).reason,'EMP停机');c.disabled=0;r.disabled=0;
 for(let i=0;i<5;i++)g.spawn(0,'laser',2000+i*40,1000);assert.equal(g.rangeProfile(c).active,false);assert.equal(g.rangeProfile(c).boosted,false);
 const t=g.spawn(0,'turret',800,750);assert.equal(g.rangeProfile(t).active,true);assert.equal(g.sightRadius(r),330*WarData.F.chn.vision);
});
test('shown boosted defense range agrees with actual fire at its edge',()=>{
 for(const [radar,offset,expected] of [[true,-2,true],[true,2,false],[false,-2,true],[false,2,false]]){
  const g=arena();g.spawn(0,'power',450,450);const a=g.spawn(0,'ciws',1000,750);if(radar)g.spawn(0,'radar',1030,850);
  const p=g.rangeProfile(a),b=g.spawn(1,'fighter',1000+Math.sqrt(p.attack*p.attack-65*65)+offset,750);b.disabled=999;const hp=b.hp;step(g,1.5);assert.equal(b.hp<hp,expected,JSON.stringify({radar,offset,p}));
 }
});
test('placement preview projects electrical load and min-range troops do not freeze attack-move',()=>{
 const g=arena(),p=g.rangeProfile({kind:'laser',team:0,x:700,y:600,hp:1,disabled:0},true);assert.equal(p.power,30+B.laser.power);assert.equal(p.active,false);
 const a=g.spawn(0,'mortar_team',1000,750),b=g.spawn(1,'tank',1040,750);b.disabled=999;g.command([a.id],1500,750,true);const start={x:a.x,y:a.y};step(g,1);assert.ok(Math.hypot(a.x-start.x,a.y-start.y)>10);assert.ok(!g.effects.some(e=>e.sourceId===a.id));
});
test('range hints do not expose hidden enemies; off mode and unarmed sight work',()=>{
 const g=arena(),a=g.spawn(0,'recon_drone',600,600),enemy=g.spawn(1,'ciws',650,600),r={width:1600,height:1000,toScreen:(x,y)=>({x,y}),toWorld:(x,y)=>({x,y})};g.visibleAt=()=>false;
 assert.deepEqual(WarRanges.collect(g,{hover:enemy.id,selection:new Set(),rangeMode:'selected'},r),[]);
 const ui={selection:new Set([a.id]),rangeMode:'selected'},p=WarRanges.collect(g,ui,r);assert.equal(p.length,1);assert.equal(p[0].profile.attack,0);assert.equal(p[0].profile.zones[0].type,'sight');
 assert.deepEqual(WarRanges.collect(g,{...ui,rangeMode:'off'},r),[]);
});

test('AI fleet attacks eligible ships and support follows friendly ships instead of enemies',()=>{
 const g=arena();g.time=100;g.spawn(1,'navalyard',2300,WarData.H-240);const missile=g.spawn(1,'missile_boat',2100,WarData.H-240),repair=g.spawn(1,'repair_ship',2600,WarData.H-240),enemy=g.spawn(0,'destroyer',1700,WarData.H-240);g.spawn(1,'recon_boat',2000,WarData.H-240);
 g.teams[1].money=0;g.teams[1].aiClock=0;g.ai(g.teams[1],.05);
 assert.equal(missile.order?.target,enemy.id);assert.ok(repair.order);assert.notEqual(repair.order.target,enemy.id);assert.equal(repair.order.attack,false);
 const idx=Math.floor(missile.order.y/48)*WarData.COLS+Math.floor(missile.order.x/48);assert.equal(g.map.navalBlocked[idx],0);
 step(g,3);assert.ok(enemy.hp<enemy.maxHp);assert.ok(repair.x<2600);
});
test('AI coast approach stays on water on every map',()=>{
 for(const map of ['river','desert','industry']){const g=new Game({map,enemies:1}),ship=g.entities.find(e=>e.team===1&&U[e.kind]?.naval),hq=g.entities.find(e=>e.team===0&&e.kind==='hq'),p=g.navalApproach(ship,hq);assert.ok(p);assert.equal(g.map.navalBlocked[Math.floor(p.y/48)*WarData.COLS+Math.floor(p.x/48)],0);}
});

test('AI naval approach rejects disconnected river pockets behind bridges',()=>{
 const g=new Game({map:'river',enemies:1}),ship=g.spawn(1,'shore_bombardment',4704,WarData.H-240),p=g.navalApproach(ship,{x:2600,y:1800});assert.ok(p);assert.ok(WarSim.findPath({blocked:g.map.navalBlocked},ship.x,ship.y,p.x,p.y).length>0);
});
