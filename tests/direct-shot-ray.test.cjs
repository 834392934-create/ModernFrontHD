const test=require('node:test'),assert=require('node:assert/strict');
for(const file of ['data','roster','equipment','operator-weapons','sim'])require('../src/'+file);
function arena(kind='operator',x=2000,y=1800){const g=new WarSim.Game({map:'desert',faction:'chn',enemies:1,buffs:['vision']});g.entities=[];g.effects=[];g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.random=()=>0;const e=g.spawn(0,kind,x,y);g.beginDirectControl(e.id);e.cool=0;return{g,e};}
function fire(g,e,input){g.setDirectInput({...input,fire:true});g.stepDirectControl(e,.05);return g.effects.find(f=>f.type==='shot'&&f.sourceId===e.id);}
function near(a,b,label){assert.ok(Math.abs(a-b)<1e-7,label+': '+a+' != '+b);}
test('free sky rays preserve direction at every map edge and across the old 2000-height threshold',()=>{
 for(const kind of ['operator','tank','heli','submarine','orbital'])for(const [x,y]of [[2000,1800],[200,200],[WarData.W-200,WarData.H-200]])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2,.7])for(const pitch of [-.2,0,.05,.12,.13,.2,.7]){
  const {g,e}=arena(kind,x,y),origin={x:e.x+2,y:e.y-1,height:g.entityAltitude(e)+9.5},dir=[Math.cos(yaw)*Math.cos(pitch),Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch)],length=16000,input={yaw,pitch,aimOrigin:origin,aimX:origin.x+dir[0]*length,aimY:origin.y+dir[1]*length,aimHeight:origin.height+dir[2]*length};
  const status=g.directFireStatus(e,null,input);assert.equal(status.projected,false,kind+' free ray must not acquire orbital projection from height');const shot=fire(g,e,input);assert.ok(shot);const range=g.rangeProfile(e).attack;
  near(shot.x,origin.x,'source x');near(shot.y,origin.y,'source map y');near(shot.sourceHeight,origin.height,'source height');near(shot.tx-origin.x,dir[0]*range,kind+' ray x');near(shot.ty-origin.y,dir[1]*range,kind+' ray y');near(shot.targetHeight-origin.height,dir[2]*range,kind+' ray height');assert.equal(shot.target,null);
 }
});
test('all armed roles keep a far untargeted endpoint within their full 3D range',()=>{
 for(const [kind,d]of Object.entries(WarData.U).filter(([,d])=>d.damage>0)){
  const {g,e}=arena(kind),origin={x:e.x,y:e.y,height:g.entityAltitude(e)+8},shot=fire(g,e,{aimOrigin:origin,aimX:e.x+21000,aimY:e.y-8000,aimHeight:origin.height+20000});assert.ok(shot,kind);const distance=Math.hypot(shot.tx-shot.x,shot.ty-shot.y,shot.targetHeight-shot.sourceHeight);assert.ok(distance<=g.rangeProfile(e).attack+1e-7,kind+' 3D range '+distance);
 }
});
test('real cross-layer targets retain projected reach and exact aimed target height',()=>{
 for(const [kind,targetKind]of [['asat','orbital'],['orbital_bombardment','tank'],['operator','orbital']]){
  const {g,e}=arena(kind);if(kind==='operator'){assert.ok(g.operatorEquip(e.id,0,'rifle_06'));e.cool=0;}
  const target=g.spawn(1,targetKind,e.x+150,e.y),input={targetId:target.id,aimOrigin:{x:e.x,y:e.y,height:g.entityAltitude(e)+8},aimX:target.x,aimY:target.y,aimHeight:g.entityAltitude(target)};assert.equal(g.directFireStatus(e,target,input).projected,true);const shot=fire(g,e,input);assert.equal(shot.target,target.id);near(shot.tx,target.x,'cross x');near(shot.ty,target.y,'cross y');near(shot.targetHeight,g.entityAltitude(target),'cross height');
 }
});
test('a queued short click freezes its muzzle origin and launch point despite later mouse/entity changes',()=>{
 const {g,e}=arena('tank'),origin={x:e.x+18,y:e.y+4,height:21};g.setDirectInput({fire:true,aimOrigin:origin,aimX:e.x+600,aimY:e.y,aimHeight:100});origin.x+=999;g.setDirectInput({fire:false,yaw:2,aimOrigin:{x:e.x+40,y:e.y+50,height:99},aimX:e.x-500,aimY:e.y,aimHeight:200});e.x+=5;g.stepDirectControl(e,.05);const shot=g.effects.find(f=>f.type==='shot');assert.ok(shot);near(shot.x,2018,'captured x');near(shot.y,1804,'captured y');near(shot.sourceHeight,21,'captured height');const saved=[shot.x,shot.y,shot.sourceHeight,shot.tx,shot.ty,shot.targetHeight];e.x+=400;e.angle=1.7;g.setDirectInput({yaw:-1});assert.deepEqual([shot.x,shot.y,shot.sourceHeight,shot.tx,shot.ty,shot.targetHeight],saved);
});
test('dispersion that misses a real orbital hull preserves the cross-layer endpoint without applying a hit',()=>{
 const {g,e}=arena();g.operatorEquip(e.id,0,'rifle_06');e.cool=0;g.random=()=>.01;const target=g.spawn(1,'orbital',e.x+150,e.y),b=WarNavigationFootprints.bounds['orbital_'+g.teams[1].faction],height=g.entityAltitude(target)+(b[1]+b[2])/2,input={targetId:target.id,aimOrigin:{x:e.x,y:e.y,height:9.5},aimX:target.x+b[4]+1.99,aimY:target.y,aimHeight:height};
 target.angle=0;assert.equal(g.directAimValid(target,input),true);const shot=fire(g,e,input);assert.equal(shot.target,null);assert.equal(shot.damage,0);near(shot.targetHeight,height,'orbital missed height');assert.ok(shot.ttl<1,'real cross-layer miss retains projected travel time');
});
test('invalid origins fall back safely and finite extreme aim coordinates cannot yield NaN shots',()=>{
 for(const origin of [undefined,{x:NaN,y:3,height:4},{x:3,y:Infinity,height:4},{x:3,y:4,height:Infinity},{x:-Number.MAX_VALUE,y:Number.MAX_VALUE,height:-Number.MAX_VALUE},{x:1e6,y:1e6,height:1e6}]){
  const {g,e}=arena('tank'),shot=fire(g,e,{aimOrigin:origin,aimX:Number.MAX_VALUE,aimY:-Number.MAX_VALUE,aimHeight:Number.MAX_VALUE});assert.ok(shot);for(const value of [shot.x,shot.y,shot.sourceHeight,shot.tx,shot.ty,shot.targetHeight,shot.ttl])assert.ok(Number.isFinite(value));near(shot.x,e.x,'fallback x');near(shot.y,e.y,'fallback y');near(shot.sourceHeight,g.entityAltitude(e)+12,'fallback height');assert.ok(Math.hypot(shot.tx-shot.x,shot.ty-shot.y,shot.targetHeight-shot.sourceHeight)<=g.rangeProfile(e).attack+1e-7);
 }
});
test('untargeted operator spread still consumes ammo but cannot extend full 3D range',()=>{
 const {g,e}=arena();g.random=()=>.7;const w=g.operatorWeapon(e),ammo=g.operatorState(e).stash[w.id].ammo;const shot=fire(g,e,{aimOrigin:{x:e.x,y:e.y,height:10},aimX:e.x+16000,aimY:e.y+16000,aimHeight:12000});assert.equal(g.operatorState(e).stash[w.id].ammo,ammo-1);assert.ok(Math.hypot(shot.tx-shot.x,shot.ty-shot.y,shot.targetHeight-shot.sourceHeight)<=w.range+1e-7);assert.equal(shot.damage,0);
});
test('a HUD-valid target at the centre-based range edge keeps its exact aimed point behind a rearward muzzle',()=>{
 for(const kind of ['tank','operator']){
  const {g,e}=arena(kind),range=g.rangeProfile(e).attack,target=g.spawn(1,'infantry',e.x+range,e.y),origin={x:e.x-40,y:e.y,height:20},input={targetId:target.id,aimOrigin:origin,aimX:target.x,aimY:target.y,aimHeight:5};
  assert.equal(g.directFireStatus(e,target,input).canFire,true);const shot=fire(g,e,input);assert.equal(shot.target,target.id);near(shot.tx,input.aimX,'range-edge target x');near(shot.ty,input.aimY,'range-edge target y');near(shot.targetHeight,input.aimHeight,'range-edge target height');assert.equal(g.directAimValid(target,{aimX:shot.tx,aimY:shot.ty,aimHeight:shot.targetHeight}),true);
 }
});
test('actual missile-submarine muzzle preserves a legal near-range infantry hit instead of shortening the shot before the hull',()=>{
 global.THREE=require('../assets/vendor/three.min.js');for(const name of ['models3d','model-detail','models-altitude-wave'])require('../src/'+name);
 const {g,e}=arena('missile_sub',2500,1800);e.angle=0;const model=WarModels.create(e.kind,'chn');model.scale.setScalar(model.userData.scale);model.position.set(e.x,g.entityAltitude(e),e.y);model.updateMatrixWorld(true);const muzzle=model.getObjectByName('muzzle').getWorldPosition(new THREE.Vector3()),origin={x:muzzle.x,y:muzzle.z,height:muzzle.y};
 const range=g.rangeProfile(e).attack,target=g.spawn(1,'infantry',e.x+Math.sqrt(range*range-g.entityAltitude(e)**2)-.01,e.y);target.disabled=1e9;target.hp=target.maxHp=1000;g.spawn(0,'hq',300,300);g.spawn(1,'hq',5500,3500);g.ai=()=>{};g.spatial.rebuild(g.entities);
 const input={targetId:target.id,aimOrigin:origin,aimX:target.x,aimY:target.y,aimHeight:5},status=g.directFireStatus(e,target,input);assert.equal(status.canFire,true);assert.ok(status.distance<range);assert.ok(Math.hypot(target.x-origin.x,target.y-origin.y,5-origin.height)>range,'actual rearward launch anchor is beyond muzzle-distance range');
 const shot=fire(g,e,input);assert.equal(shot.target,target.id);near(shot.x,muzzle.x,'actual muzzle x');near(shot.y,muzzle.z,'actual muzzle map y');near(shot.sourceHeight,muzzle.y,'actual muzzle height');near(shot.tx,target.x,'exact legal endpoint');near(shot.targetHeight,5,'exact legal surface height');assert.equal(g.directAimValid(target,{aimX:shot.tx,aimY:shot.ty,aimHeight:shot.targetHeight}),true);
 g.setDirectInput({fire:false});for(let time=0;time<shot.max+.15;time+=.05)g.step(.05);assert.ok(target.hp<1000,'the visually reached stationary target receives normal arrival damage');
});
