const test=require('node:test'),assert=require('node:assert/strict'),{arena}=require('./combat-mechanics-fixture.cjs');
const T=WarTransportOperations;
test('IFV carries six real personnel identities, unloads to legal distinct positions and preserves ammunition',()=>{
 const {g,e}=arena('ifv'),people=Array.from({length:7},(_,i)=>g.spawn(0,'infantry',e.x+30,e.y+i*3));for(const p of people)WarCombatReadiness.ensure(g,p);
 for(let i=0;i<6;i++)assert(T.board(g,e,people[i]));assert.equal(T.board(g,e,people[6]),false);assert.equal(T.status(g,e).occupied,6);assert(people.slice(0,6).every(p=>!g.get(p.id)));assert(T.validateGame(g));
 const identities=e.passengers.map(p=>p.id);assert.equal(T.disembark(g,e),6);assert.equal(e.passengers.length,0);for(const id of identities)assert(g.get(id));assert.equal(new Set(identities.map(id=>g.get(id).x+':'+g.get(id).y)).size,6);
});
test('moving, distant, enemy, downed and occupied driver states cannot create extra passengers',()=>{
 const {g,e}=arena('ifv'),p=g.spawn(0,'infantry',e.x+30,e.y);e.motion={signedSpeed:10};assert(!T.board(g,e,p));e.motion.signedSpeed=0;p.x+=300;assert(!T.board(g,e,p));p.x=e.x+30;p.team=1;assert(!T.board(g,e,p));p.team=0;WarCombatDamage.ensure(g,p).state='downed';assert(!T.board(g,e,p));
});
test('blocked unloading retains passengers and corrupted or duplicate saved identities are rejected',()=>{
 const {g,e}=arena('ifv'),p=g.spawn(0,'infantry',e.x+30,e.y);assert(T.board(g,e,p));const exit=g.vehicleExitPoint;g.vehicleExitPoint=()=>null;assert.equal(T.disembark(g,e),0);assert.equal(e.passengers[0],p);g.vehicleExitPoint=exit;assert(T.validateGame(g));g.entities.push(p);assert.equal(T.validateGame(g),false);g.entities.pop();p.passengerSeat=9;assert.equal(T.validateGame(g),false);
});
test('destroyed IFV resolves each passenger once and survives only through legal extraction',()=>{
 const {g,e}=arena('ifv'),people=Array.from({length:6},(_,i)=>g.spawn(0,'infantry',e.x+30,e.y+i));people.forEach(p=>assert(T.board(g,e,p)));e.hp=0;const result=T.destroyed(g,e,1);assert.equal(result.survivors.length+result.lost.length,6);assert.equal(e.passengers.length,0);for(const id of result.survivors)assert(g.get(id)?.hp>0);for(const id of result.lost)assert.equal(g.get(id),undefined);assert.deepEqual(T.destroyed(g,e,1),{survivors:[],lost:[]});assert(T.validateGame(g));
});
test('nested downed passengers and malformed operator fire modes cannot hide inside valid transport saves',()=>{
 const {g,e}=arena('ifv'),p=g.spawn(0,'operator',e.x+30,e.y);g.operatorState(p);assert(T.board(g,e,p));assert(T.validateGame(g));const s=WarCombatDamage.ensure(g,p);s.state='downed';assert.equal(T.validateGame(g),false);s.state='operational';p.operatorState.fireModes[p.operatorState.slots[0]]='illegal-mode';assert.equal(T.validateGame(g),false);
});
