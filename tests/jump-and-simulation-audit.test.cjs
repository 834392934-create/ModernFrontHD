const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data.js');require('../src/roster.js');require('../src/sim.js');
const {Game}=WarSim,{U,T,COLS,ROWS}=WarData;
function arena(options={}){const g=new Game({map:'desert',enemies:1,buffs:['vision'],abilities:false,...options});g.entities=[];g.ore=[];g.map.blocked.fill(0);g.spawn(0,'hq',300,300);g.spawn(1,'hq',5000,3000);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});return g;}
function advance(g,seconds,dt=.05){for(let i=0;i<Math.round(seconds/dt);i++)g.step(dt);}
function drive(g,kind='infantry'){const e=g.spawn(0,kind,1000,750);g.beginDirectControl(e.id);return e;}

test('every personnel family jumps, rises with matching physical altitude and lands without base altitude drift',()=>{
 const kinds=Object.keys(U).filter(k=>(U[k].modelKind||k)==='infantry');assert.ok(kinds.length>1);
 for(const kind of kinds){const g=arena(),e=drive(g,kind),base=e.altitude;g.setDirectInput({jump:true});advance(g,.2);assert.ok(e.jumpHeight>0,kind);assert.equal(g.entityAltitude(e),base+e.jumpHeight);assert.equal(e.altitude,base);advance(g,1);assert.equal(e.jumpHeight,0);assert.equal(e.jumpVelocity,0);assert.equal(g.entityAltitude(e),base);}
});
test('jump is edge triggered: holding does not repeat and release/repress in midair gives no second impulse',()=>{
 const g=arena(),e=drive(g);g.setDirectInput({jump:true});advance(g,.1);const velocity=e.jumpVelocity;g.setDirectInput({jump:false});g.step(.05);g.setDirectInput({jump:true});g.step(.05);assert.ok(e.jumpVelocity<velocity);advance(g,2);assert.equal(e.jumpHeight,0);g.setDirectInput({jump:false});g.step(.05);g.setDirectInput({jump:true});g.step(.05);assert.ok(e.jumpHeight>0);
});
test('jump edges between simulation ticks survive short taps and immediate release/repress',()=>{
 const g=arena(),e=drive(g);g.setDirectInput({jump:true});g.setDirectInput({jump:false});g.step(.05);assert.ok(e.jumpHeight>0,'short tap survives release before the next simulation tick');advance(g,1);
 g.setDirectInput({jump:true});g.step(.05);advance(g,1);assert.equal(e.jumpHeight,0);
 g.setDirectInput({jump:false});g.setDirectInput({jump:true});g.step(.05);assert.ok(e.jumpHeight>0,'release and repress between ticks starts a second jump');
});
test('midair jump requests are discarded and clearing input cancels only a pending ground jump',()=>{
 const g=arena(),e=drive(g);g.setDirectInput({jump:true});g.setDirectInput({jump:false,cancelJump:true});g.step(.05);assert.equal(e.jumpHeight,0);
 g.setDirectInput({jump:true});g.step(.1);const height=e.jumpHeight;g.setDirectInput({jump:false,cancelJump:true});assert.equal(e.jumpHeight,height,'clearing input does not teleport an airborne unit');
 g.setDirectInput({jump:true});g.setDirectInput({jump:false});advance(g,1);assert.equal(e.jumpHeight,0);g.step(.05);assert.equal(e.jumpHeight,0,'midair tap must not become a buffered landing jump');
});
test('vehicles cannot jump and infantry jump keeps existing terrain, ore and building collision',()=>{
 for(const kind of ['tank','destroyer','fighter','satellite']){const g=arena(),e=drive(g,kind),base=g.entityAltitude(e);g.setDirectInput({jump:true});advance(g,.4);assert.equal(e.jumpHeight||0,0);assert.equal(g.entityAltitude(e),base);}
 for(const obstacle of ['terrain','building','ore']){const g=arena(),e=drive(g);if(obstacle==='terrain')for(let y=0;y<ROWS;y++)g.map.blocked[y*COLS+22]=1;else if(obstacle==='building')g.spawn(0,'power',1100,750);else g.ore=[{id:0,x:1100,y:750,amount:1000,initial:1000}];g.setDirectInput({forward:1,jump:true,yaw:0});advance(g,2);assert.ok(e.x<(obstacle==='terrain'?22*T:1100));assert.ok(e.x<1100-e.r,obstacle);}
});
test('zero simulation time freezes jump and exit, swap, death and EMP discard airborne state safely',()=>{
 for(const action of ['exit','swap','death','emp']){const g=arena(),e=drive(g);g.setDirectInput({jump:true});g.step(.1);assert.ok(e.jumpHeight>0);const h=e.jumpHeight,v=e.jumpVelocity;g.step(0);assert.equal(e.jumpHeight,h);assert.equal(e.jumpVelocity,v);if(action==='exit')g.endDirectControl();if(action==='swap')g.beginDirectControl(g.spawn(0,'tank',1200,750).id);if(action==='death')g.damage(e,e.maxHp*3,1);if(action==='emp'){e.disabled=g.time+1;g.step(.05);}assert.equal(e.jumpHeight,0,action);assert.equal(e.jumpVelocity,0,action);}
});
test('jump save/load drops transient jump without moving the live player or accepting invalid height',()=>{
 const g=arena(),e=drive(g);g.setDirectInput({jump:true});g.step(.1);const h=e.jumpHeight,s=g.save(),se=s.entities.find(o=>o.id===e.id);assert.ok(h>0);assert.equal(se.jumpHeight||0,0);assert.equal(e.jumpHeight,h);const loaded=Game.load(s);assert.equal(loaded.get(e.id).jumpHeight||0,0);assert.equal(loaded.directControl,null);const bad=structuredClone(s);bad.entities[0].jumpHeight=NaN;assert.throws(()=>Game.load(bad),/实体/);
});
test('jump parameters are bounded and the ballistic arc is independent of tick rate',()=>{
 for(const dt of [.02,.05,.1]){const g=arena({playerJump:{impulse:32,gravity:80}}),e=drive(g);g.setDirectInput({jump:true});advance(g,.4,dt);assert.ok(Math.abs(e.jumpHeight-6.4)<1e-8);advance(g,.4,dt);assert.ok(e.jumpHeight<1e-8);}
 const g=arena({playerJump:{impulse:Infinity,gravity:-1}});assert.equal(g.options.playerJump.impulse,WarSim.PLAYER_JUMP_DEFAULTS.impulse);assert.ok(g.options.playerJump.gravity>0);
});
test('automatic protection, crowd separation and enemy threats never rotate or translate an idle ground driver',()=>{
 for(const kind of ['infantry','tank']){const g=arena(),e=drive(g,kind);e.angle=.7;g.setDirectInput({yaw:.7});g.spawn(0,'tank',1003,752);g.spawn(1,'tank',1300,750);const before=[e.x,e.y,e.angle];advance(g,3);assert.deepEqual([e.x,e.y,e.angle],before);assert.equal(e.order,null);}
});
test('saved snapshots and loaded games do not alias or mutate the original game or save object',()=>{
 const g=arena(),e=g.spawn(0,'tank',1000,750),s=g.save(),before=JSON.stringify(s),copy=Game.load(s);copy.get(e.id).x+=10;copy.teams[0].money=4321;copy.step(.05);assert.equal(JSON.stringify(s),before);assert.equal(e.x,1000);assert.notEqual(g.teams[0].money,4321);g.teams[0].money=5432;e.y+=1;assert.equal(JSON.stringify(s),before);
});
test('save loading rejects duplicate identities and a nextId that would overwrite an existing entity',()=>{
 const g=arena(),s=g.save();s.entities[1].id=s.entities[0].id;assert.throws(()=>Game.load(s),/标识/);const b=g.save();b.nextId=b.entities.at(-1).id;assert.throws(()=>Game.load(b),/标识/);
});
test('building on a mine is rejected without spending resources or queuing construction',()=>{
 const g=arena();g.ore=[{id:0,x:530,y:300,amount:1000,initial:1000}];g.teams[0].money=10000;
 assert.equal(g.canBuild(0,'power',530,300),false);assert.equal(g.build(0,'power',530,300),false);assert.equal(g.teams[0].money,10000);assert.equal(g.teams[0].buildQueue.length,0);
 assert.equal(g.build(0,'power',300,530),true);
});

