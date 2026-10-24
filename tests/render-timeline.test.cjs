const test=require('node:test'),assert=require('node:assert/strict');
for(const f of ['data','roster','equipment','sim'])require('../src/'+f);
const {Timeline}=require('../src/render-timeline');
function arena(kind='tank'){
 const g=new WarSim.Game({seed:712,map:'desert',enemies:1,buffs:['vision'],abilities:false});g.entities=[];g.effects=[];g.ore=[];g.nodes=[];g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(1);g.spawn(0,'hq',300,300);g.spawn(1,'hq',5500,3500);const e=g.spawn(0,kind,1800,1400);e.angle=0;g.beginDirectControl(e.id);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});g.setDirectInput({forward:1,yaw:0});g.step(.05);return{g,e};
}
function step(t,g){t.captureBefore(g);g.step(.05);t.captureAfter(g);}
test('actual 20 Hz Game movement is continuous at 40, 60 and 120 Hz without modifying physics',()=>{
 for(const hz of [40,60,120]){
  const {g,e}=arena(),control=arena();for(let i=0;i<40;i++){g.step(.05);control.g.step(.05);}const t=new Timeline();t.reset(g);t.beginFrame(g,0);let acc=0,last=null;const increments=[];
  for(let f=0;f<hz*2;f++){
   acc+=1/hz;while(acc>=.05-1e-9){step(t,g);control.g.step(.05);acc-=.05;}
   t.beginFrame(g,acc/.05);const p=t.controlledPose(g,e),again=t.controlledPose(g,e);assert.deepEqual(again,p,'multiple camera/model requests in a frame are idempotent');
   if(f>=Math.ceil(hz*.1)&&last!==null)increments.push(p.x-last);last=p.x;
   assert.ok(p.x<=e.x+1e-6,'render does not extrapolate ahead of legal simulation');assert.equal(e.x,control.e.x);assert.equal(e.y,control.e.y);assert.equal(e.angle,control.e.angle);assert.deepEqual(g.directControl,control.g.directControl);
  }
  const expected=g.effectiveSpeed(e)/hz;assert.ok(increments.every(v=>Math.abs(v-expected)<1e-6),`${hz} Hz must move by ${expected} units per frame, not repeated zero/3.25u jumps`);
 }
});
test('sampling does not advance Game time, consume ammo, create shots or accumulate position drift',()=>{
 const {g,e}=arena(),t=new Timeline();t.reset(g);step(t,g);t.beginFrame(g,.25);const before=JSON.stringify(g.save()),first=t.controlledPose(g,e);for(let i=0;i<1000;i++)assert.deepEqual(t.controlledPose(g,e),first);assert.equal(JSON.stringify(g.save()),before);
});
test('pause, resume, control changes and explicit reset discard old render positions',()=>{
 const {g,e}=arena(),t=new Timeline();t.reset(g);t.beginFrame(g,0);step(t,g);t.beginFrame(g,.2);assert.ok(t.controlledPose(g,e).x<e.x);
 t.beginFrame(g,.3,{paused:true});assert.equal(t.controlledPose(g,e),e);t.beginFrame(g,.7,{paused:true});assert.equal(t.controlledPose(g,e),e);
 t.beginFrame(g,0);assert.equal(t.controlledPose(g,e),e);
 const next=g.spawn(0,'infantry',2200,1800);g.beginDirectControl(next.id);t.beginFrame(g,.1);assert.equal(t.controlledPose(g,next),next);assert.equal(t.controlledPose(g,e),e);
 step(t,g);t.beginFrame(g,.3);t.reset(g);assert.equal(t.controlledPose(g,next),next);g.endDirectControl();t.beginFrame(g,.4);assert.equal(t.controlledPose(g),null);
});
test('teleports, unrecorded changes, new game and same-ID replacement return the authoritative entity',()=>{
 const {g,e}=arena(),t=new Timeline();t.reset(g);t.captureBefore(g);e.x+=1000;g.step(.05);t.captureAfter(g);t.beginFrame(g,.5);assert.equal(t.controlledPose(g,e),e);
 step(t,g);t.beginFrame(g,.2);e.x+=20;assert.equal(t.controlledPose(g,e),e);
 const replacement={...e};g.entities[g.entities.indexOf(e)]=replacement;assert.equal(t.controlledPose(g,replacement),replacement);
 const next=arena();assert.equal(t.controlledPose(next.g,next.e),next.e);t.beginFrame(next.g,.4);assert.equal(t.controlledPose(next.g,next.e),next.e);
});
test('yaw uses the short arc, and actual jump/altitude are interpolated independently without double height',()=>{
 const {g,e}=arena('infantry'),t=new Timeline();e.angle=Math.PI-.02;t.reset(g);t.captureBefore(g);g.time+=.05;e.angle=-Math.PI+.02;t.captureAfter(g);t.beginFrame(g,.5);assert.ok(Math.abs(Math.abs(t.controlledPose(g,e).angle)-Math.PI)<1e-9);
 g.setDirectInput({forward:0,yaw:0,jump:true});step(t,g);t.beginFrame(g,1);assert.equal(g.entityAltitude(t.controlledPose(g,e)),g.entityAltitude(e));assert.ok(e.jumpHeight>0);const height=g.entityAltitude(t.controlledPose(g,e));for(let i=0;i<50;i++)assert.equal(g.entityAltitude(t.controlledPose(g,e)),height);
});
test('downed/dead and EMP transitions snap rather than blending across the state change',()=>{
 const {g,e}=arena('infantry'),t=new Timeline();t.reset(g);step(t,g);e.components.state='downed';t.captureAfter(g);t.beginFrame(g,.1);assert.equal(t.controlledPose(g,e),e);
 e.components.state='operational';t.reset(g);t.captureBefore(g);e.disabled=g.time+5;g.step(.05);t.captureAfter(g);t.beginFrame(g,.1);assert.equal(t.controlledPose(g,e),e);
});
