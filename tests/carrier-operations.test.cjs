const test=require('node:test'),assert=require('node:assert/strict');
for(const f of ['data','roster','equipment','sim','carrier-operations'])require('../src/'+f);
const C=WarCarrierOperations;
function wire(g){
 // Game owns the carrier and firing hooks; do not advance the module twice.
 g.ai=()=>{};return g;
}
function arena(faction='usa'){
 const g=wire(new WarSim.Game({faction,enemies:1,map:'desert',buffs:['vision'],abilities:false}));g.entities=[];g.effects=[];g.ore=[];g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);
 g.spawn(0,'hq',300,300);g.spawn(1,'hq',5700,3500);g.teams.forEach(t=>{t.money=100000;t.queue=[];t.buildQueue=[];});
 const c=g.spawn(0,'carrier',2600,1800);c.angle=0;return{g,c};
}
function step(g,seconds,fn=()=>{}){for(let i=0;i<Math.ceil(seconds*20);i++){g.step(.05);fn();}}
function launchOne(faction='usa',targetKind='destroyer'){
 const {g,c}=arena(faction),t=g.spawn(1,targetKind,3200,1800);t.disabled=1e9;t.hp=t.maxHp=1e7;assert.equal(C.requestStrike(g,c,t),true);step(g,2.1);
 const e=g.entities.find(x=>x.carrierOriginId===c.id);assert.ok(e);c.airWing.mission=null;c.cool=1e9;return{g,c,e,t};
}
test('carrier dispatch costs resources and creates bounded real aircraft, never carrier projectiles',()=>{
 const {g,c}=arena(),t=g.spawn(1,'destroyer',3200,1800);t.disabled=1e9;t.hp=t.maxHp=1e7;const before=g.teams[0].money;
 assert.ok(C.requestStrike(g,c,t));assert.equal(g.effects.length,0);const phases=new Set();step(g,50,()=>{for(const e of g.entities.filter(e=>e.carrierOriginId===c.id))phases.add(e.flight.phase);assert.ok(C.status(g,c).active<=3);assert.ok(C.status(g,c).onDeck<=1);});
 const status=C.status(g,c);assert.equal(status.active,3);assert.ok(g.teams[0].money<before-3000);assert.ok(phases.has('takeoff'));assert.ok(phases.has('climb'));assert.ok(phases.has('attack'));assert.ok(t.hp<t.maxHp);assert.equal(g.effects.some(f=>f.sourceId===c.id&&f.type==='shot'),false);
});
test('unaffordable sorties wait, loss replacement takes time and charges again',()=>{
 const {g,c}=arena(),t=g.spawn(1,'destroyer',3200,1800);t.disabled=1e9;t.hp=1e7;g.teams[0].money=0;C.requestStrike(g,c,t);step(g,5);assert.equal(C.status(g,c).active,0);assert.equal(C.status(g,c).waitingForFunds,true);
 const spent=g.teams[0].spent;g.teams[0].money=g.cost(0,'naval_strike_aircraft');step(g,2);const e=g.entities.find(e=>e.carrierOriginId===c.id);assert.ok(e);assert.equal(g.teams[0].spent-spent,g.cost(0,'naval_strike_aircraft'));e.hp=0;step(g,.1);const slot=c.airWing.slots.find(s=>s.kind==='naval_strike_aircraft');assert.equal(slot.planeId,null);assert.ok(slot.readyAt>=g.time+19);
 // Reserve unused slots so this assertion specifically checks the replacement slot.
 for(const s of c.airWing.slots)if(s!==slot)s.readyAt=g.time+1000;
 g.teams[0].money=g.cost(0,'naval_strike_aircraft');step(g,10);assert.equal(C.status(g,c).active,0);step(g,12);assert.equal(C.status(g,c).active,1);assert.equal(g.teams[0].spent-spent,g.cost(0,'naval_strike_aircraft')*2);
});
test('requested target domain selects appropriate existing role without conferring extra target domains',()=>{
 for(const [targetKind,expected] of [['destroyer','naval_strike_aircraft'],['tank','close_support_aircraft'],['fighter','interceptor']]){
  const {g,c}=arena(),t=g.spawn(1,targetKind,3100,1800);t.disabled=1e9;C.requestStrike(g,c,t);step(g,2.1);const e=g.entities.find(e=>e.carrierOriginId===c.id);assert.equal(e.kind,expected);assert.ok(g.canTargetKind(e.kind,t.kind));
 }
 const {g,c}=arena('kor'),sea=g.spawn(1,'destroyer',3100,1800),air=g.spawn(1,'fighter',3100,1800);air.disabled=1e9;assert.equal(C.requestStrike(g,c,sea),false);assert.ok(C.requestStrike(g,c,air));step(g,3);const e=g.entities.find(e=>e.carrierOriginId===c.id);assert.equal(e.kind,'escort_helicopter');assert.equal(WarAircraftFlight.fixed(e),false);
});
test('deck occupant follows hull translation and rotation while manual input is suspended',()=>{
 const {g,c,e}=launchOne();g.beginDirectControl(e.id);g.setDirectInput({flightEnabled:false});const initialPhase=e.flight.phase;c.x+=80;c.y+=40;c.angle=.7;step(g,.1);
 const p=C.point(c,e.flight.deck.along,e.flight.deck.cross);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)<.001);assert.equal(e.flight.phase,initialPhase);assert.equal(e.angle,c.angle);assert.ok(Math.abs(e.altitude-C.deckHeight(g,c,e))<.001);
});
test('airborne fixed wing returns to a moving deck, repairs and launches again',()=>{
 const {g,c,e}=launchOne();step(g,20);e.hp=e.maxHp*.65;assert.ok(g.returnAircraft(e.id));const phases=new Set();let prior={x:e.x,y:e.y};
 step(g,200,()=>{if(g.time<130)c.x+=.45;phases.add(e.flight.phase);assert.ok(Math.hypot(e.x-prior.x,e.y-prior.y)<Math.max(16,g.effectiveSpeed(e)*.1),'continuous recovery');prior={x:e.x,y:e.y};});
 for(const phase of ['approach','landing','taxi','service','prepare','takeoff'])assert.ok(phases.has(phase),phase+': '+[...phases]);assert.equal(e.hp,e.maxHp);assert.ok(e.altitude>100);assert.equal(e.flight.homeId,c.id);
});
test('two returning aircraft share deck and service lock, never land simultaneously',()=>{
 const {g,c}=arena(),t=g.spawn(1,'destroyer',3200,1800);t.disabled=1e9;t.hp=1e7;C.requestStrike(g,c,t);step(g,30);c.airWing.mission=null;c.cool=1e9;const planes=g.entities.filter(e=>e.carrierOriginId===c.id);for(const e of planes)g.returnAircraft(e.id);const serviced=new Set();
 step(g,250,()=>{assert.ok(g.entities.filter(e=>e.hp>0&&e.flight?.homeId===c.id&&(C.attached(e)||e.flight.phase==='approach')).length<=1);for(const e of planes)if(e.flight.phase==='service')serviced.add(e.id);});assert.equal(serviced.size,planes.length);
});
test('helicopter returns vertically to the moving deck and restarts service',()=>{
 const {g,c,e}=launchOne('kor','fighter');step(g,15);assert.ok(g.returnAircraft(e.id));const phases=new Set();step(g,150,()=>{if(g.time<60)c.x+=.25;phases.add(e.flight.phase);});assert.ok(phases.has('service'),[...phases].join(','));assert.ok(phases.has('climb'));assert.ok(e.hp>0);
});
test('sunken carrier loses deck occupants while airborne aircraft survive and still prevent elimination',()=>{
 const {g,c,e}=launchOne();step(g,20);const deckPlane=g.spawn(0,'interceptor',c.x,c.y);C.launch(g,deckPlane,c);const free=c.airWing.slots.find(s=>!s.planeId);free.planeId=deckPlane.id;free.kind=deckPlane.kind;
 for(const x of g.teamEntities(0))if(x.id!==e.id&&x.id!==deckPlane.id)x.hp=0;
 step(g,1);assert.equal(deckPlane.hp,0);assert.ok(e.hp>0);assert.equal(g.teams[0].alive,true);assert.equal(g.result,null);assert.ok(e.flightSpeed>0);assert.equal(g.returnAircraft(e.id),false);
});
test('save and restore preserve aircraft/deck ownership and reject malformed carrier data',()=>{
 const {g,c,e}=launchOne();const saved=g.save(),copy=wire(WarSim.Game.load(saved));assert.equal(C.validateGame(copy),true);assert.deepEqual(copy.get(c.id).airWing,c.airWing);step(copy,10);assert.ok(copy.get(e.id).altitude>100);
 for(const mutate of [c=>c.airWing.capacity=999,c=>c.airWing.slots.push({...c.airWing.slots[0]}),c=>c.airWing.nextLaunchAt=NaN]){const bad=structuredClone(c);mutate(bad);assert.equal(C.validate(bad),false);}
 const bad=structuredClone(e);bad.flight.deck.along=NaN;assert.equal(WarAircraftFlight.validate(bad),false);
 const wrong=wire(WarSim.Game.load(saved));wrong.get(e.id).team=1;assert.equal(C.validateGame(wrong),false);
});
test('off-map/hostile/friendly/unsupported dispatch requests do not spend or spawn',()=>{
 const {g,c}=arena(),friend=g.spawn(0,'tank',2800,1800),orbit=g.spawn(1,'orbital',2800,1800),spent=g.teams[0].spent;
 for(const point of [friend,orbit,{x:NaN,y:1800},{x:-50,y:1800},{x:5000,y:1800}])assert.equal(C.requestStrike(g,c,point),false);
 step(g,5);assert.equal(C.status(g,c).active,0);assert.equal(g.teams[0].spent,spent);
});
test('a full mixed wing can retask from naval strike to land attack without creating extra planes',()=>{
 const {g,c}=arena(),sea=g.spawn(1,'destroyer',3200,1800);sea.disabled=1e9;sea.hp=1e7;C.requestStrike(g,c,sea);step(g,24);const ids=C.status(g,c).planeIds;assert.equal(ids.length,3);
 const land=g.spawn(1,'tank',3100,1900);land.disabled=1e9;land.hp=land.maxHp=1e7;assert.ok(C.requestStrike(g,c,land));c.cool=1e9;step(g,40);assert.deepEqual(C.status(g,c).planeIds,ids);assert.ok(land.hp<land.maxHp);const naval=ids.map(id=>g.get(id)).find(e=>e.kind==='naval_strike_aircraft');assert.notEqual(naval.order?.target,land.id);
});
test('manual aircraft commands are not overwritten by its carrier mission',()=>{
 const {g,c,e,t}=launchOne();step(g,12);g.beginDirectControl(e.id);g.setDirectInput({flightEnabled:false});const state=JSON.stringify({x:e.x,y:e.y,flight:e.flight,order:e.order});assert.ok(C.requestStrike(g,c,t));step(g,2);assert.equal(JSON.stringify({x:e.x,y:e.y,flight:e.flight,order:e.order}),state);
});
test('return tracks a hull using real naval movement and turn orders',()=>{
 const {g,c,e}=launchOne();step(g,15);g.command([c.id],3200,2250);g.returnAircraft(e.id);const phases=new Set();step(g,180,()=>phases.add(e.flight.phase));assert.ok(c.x>2850);assert.ok(c.y>1950);assert.ok(phases.has('service'),[...phases].join(','));
});
test('manual aircraft aboard a destroyed carrier cannot survive by leaving mouse unlocked',()=>{
 const {g,c,e}=launchOne();g.beginDirectControl(e.id);g.setDirectInput({flightEnabled:false});c.hp=0;step(g,.1);assert.equal(e.hp,0);assert.equal(g.directControl,null);
});
test('go-around order during deck landing releases the attachment and remains saveable',()=>{
 const {g,c,e}=launchOne();step(g,20);g.returnAircraft(e.id);for(let i=0;i<4000&&e.flight.phase!=='landing';i++)g.step(.05);assert.equal(e.flight.phase,'landing');assert.ok(e.flight.deck);g.command([e.id],3500,2300);assert.equal(e.flight.phase,'climb');assert.equal(e.flight.deck,undefined);assert.equal(C.validate(e),true);assert.ok(WarSim.Game.load(g.save()).get(e.id));step(g,5);assert.ok(e.altitude>100);
});
