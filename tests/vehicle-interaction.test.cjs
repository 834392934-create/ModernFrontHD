const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
require('../src/data');require('../src/roster');require('../src/equipment');require('../src/sim');require('../src/operator-sim');require('../src/vehicle-interaction');
const {Game}=WarSim;
function arena(){const g=new Game({map:'desert',enemies:1,buffs:['vision']});g.entities=[];g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});g.spawn(0,'hq',300,300);g.spawn(1,'hq',5400,3600);return g;}
function pair(kind='operator',vehicleKind='tank'){const g=arena(),crew=g.spawn(0,kind,1000,1000),body=g.spawn(0,vehicleKind,1080,1000);if(kind==='operator'){g.operatorState(crew).stash.rifle_01={ammo:3,reserve:7};}crew.hp=Math.round(crew.maxHp*.55);assert.equal(g.beginDirectControl(crew.id),true);return{g,crew,body};}
test('F boards and exits as the same person: HP, identity and spent ammunition survive repeated cycles',()=>{
 const {g,crew,body}=pair(),hp=crew.hp,nextId=g.nextId;
 for(let i=0;i<20;i++){let r=g.vehicleInteract(crew.id);assert.equal(r.ok,true,r.message);assert.equal(r.id,body.id);assert.equal(g.get(crew.id),undefined);assert.equal(body.vehicleCrew,crew);assert.equal(g.directControl.id,body.id);r=g.vehicleInteract(body.id);assert.equal(r.ok,true,r.message);assert.equal(r.id,crew.id);assert.equal(g.get(crew.id),crew);assert.equal(g.directControl.id,crew.id);assert.equal(body.vehicleCrew,undefined);assert.equal(crew.hp,hp);assert.deepEqual(g.operatorState(crew).stash.rifle_01,{ammo:3,reserve:7});}
 assert.equal(g.nextId,nextId);assert.equal(g.entities.filter(e=>e.kind==='operator').length,1);
});
test('all personnel roles retain their original kind instead of cloning an operator on exit',()=>{
 for(const kind of Object.keys(WarData.U).filter(k=>(WarData.U[k].modelKind||k)==='infantry')){const {g,crew,body}=pair(kind),count=g.nextId;assert.equal(g.vehicleInteract(crew.id).ok,true,kind);assert.equal(g.vehicleInteract(body.id).ok,true,kind);assert.equal(g.get(crew.id).kind,kind);assert.equal(g.nextId,count);}
});
test('direct E vehicle possession binds the nearest existing operator and never creates repeated free drivers',()=>{
 const g=arena(),far=g.spawn(0,'operator',700,1000),near=g.spawn(0,'operator',1030,1000),body=g.spawn(0,'tank',1100,1000),next=g.nextId;
 near.hp=41;g.operatorState(near).stash.rifle_01={ammo:1,reserve:0};assert.equal(g.beginDirectControl(body.id),true);assert.equal(body.vehicleCrew?.id,near.id);assert.ok(g.get(far.id));assert.equal(g.nextId,next);
 for(let i=0;i<10;i++){g.endDirectControl();assert.equal(g.beginDirectControl(body.id),true);}assert.equal(g.nextId,next);assert.equal(g.vehicleInteract(body.id).id,near.id);assert.equal(near.hp,41);assert.deepEqual(g.operatorState(near).stash.rifle_01,{ammo:1,reserve:0});
 const empty=arena(),tank=empty.spawn(0,'tank',1000,1000),before=empty.nextId;assert.equal(empty.beginDirectControl(tank.id),true);const id=tank.vehicleCrew.id;assert.equal(empty.nextId,before+1);assert.equal(empty.vehicleInteract(tank.id).id,id);empty.get(id).hp=0;empty.entities=empty.entities.filter(e=>e.hp>0);empty.endDirectControl();assert.equal(empty.beginDirectControl(tank.id),false);assert.equal(empty.nextId,before+1);
});
test('distance, ownership, occupancy, vertical separation, EMP and control identity gate boarding',()=>{
 for(const mode of ['far','enemy','occupied','height','emp','other-control']){const {g,crew,body}=pair();if(mode==='far')body.x=2000;if(mode==='enemy')body.team=1;if(mode==='occupied')body.vehicleCrew={id:999,hp:1};if(mode==='height')body.altitude=100;if(mode==='emp')body.disabled=g.time+10;if(mode==='other-control')g.directControl.id=body.id;const r=g.vehicleInteract(crew.id);assert.equal(r.ok,false,mode);assert.equal(g.get(crew.id),crew,mode);}
 const {g,crew}=pair();crew.disabled=g.time+3;assert.equal(g.vehicleInteract(crew.id).ok,false);
});
test('embarked personnel are absent from target acquisition and retain no active orders or jump',()=>{
 const {g,crew,body}=pair();crew.jumpHeight=3;crew.jumpVelocity=10;g.operatorReload(crew.id);assert.equal(g.vehicleInteract(crew.id).ok,true);assert.equal(g.entities.includes(crew),false);assert.equal(g.teamEntities(0).includes(crew),false);assert.equal(crew.jumpHeight,0);assert.equal(crew.path.length,0);assert.equal(crew.operatorState.reloadRemaining,0);assert.equal(body.vehicleCrew,crew);g.step(0);assert.equal(body.vehicleCrew.hp,crew.hp);
});
test('naval, underwater, air and orbital exits use safe land and preserve first-person ownership',()=>{
 for(const kind of ['destroyer','submarine','fighter','satellite']){const g=arena(),crew=g.spawn(0,'operator',1000,1000),body=g.spawn(0,kind,3000,2000);g.operatorState(crew).stash.rifle_01={ammo:2,reserve:3};g.map.blocked.fill(1);for(let y=2;y<16;y++)for(let x=2;x<16;x++)g.map.blocked[y*WarData.COLS+x]=0;g.beginDirectControl(body.id);const r=g.vehicleInteract(body.id);assert.equal(r.ok,true,kind+' '+r.message);assert.equal(r.emergency,true);assert.match(r.message,/游戏救生转移/);assert.equal(g.directControl.id,crew.id);assert.equal(g.entityAltitude(crew),0);assert.equal(WarNavigationFootprints.terrain(g,crew,crew.x,crew.y),true);assert.ok(Math.hypot(crew.x-body.x,crew.y-body.y)>1000);assert.deepEqual(g.operatorState(crew).stash.rifle_01,{ammo:2,reserve:3});}
});
test('no legal landing keeps the original crew inside and never searches an unbounded map',()=>{
 const {g,crew,body}=pair();g.vehicleInteract(crew.id);g.map.blocked.fill(1);let checks=0,original=WarNavigationFootprints.terrain;WarNavigationFootprints.terrain=(...a)=>{checks++;return original(...a);};let result;try{result=g.vehicleInteract(body.id);}finally{WarNavigationFootprints.terrain=original;}
 assert.equal(result.ok,false);assert.match(result.message,/无安全落点/);assert.equal(body.vehicleCrew,crew);assert.equal(g.get(crew.id),undefined);assert.equal(g.directControl.id,body.id);assert.ok(checks<=624,`landing terrain checks ${checks}`);
});
test('disembark position avoids alive tree colliders and other ground actors',()=>{
 const {g,crew,body}=pair();g.vehicleInteract(crew.id);const first=g.vehicleExitPoint(body,crew);assert.ok(first);const obstacle={x:first.x,y:first.y,r:24};if(global.WarTrees)WarTrees.liveColliders(g).push(obstacle);else g.directObstacles=[obstacle];const r=g.vehicleInteract(body.id);assert.equal(r.ok,true);assert.ok(Math.hypot(crew.x-first.x,crew.y-first.y)>=g.navigationRadius(crew)+24+3);
});
test('vehicle death destroys its embarked crew instead of duplicating or reviving them',()=>{
 const {g,crew,body}=pair();g.vehicleInteract(crew.id);const lost=g.teams[0].lost;g.damage(body,1e9,1);assert.ok(body.hp<=0);assert.equal(body.vehicleCrew,undefined);assert.equal(crew.hp,0);assert.equal(g.get(crew.id),undefined);assert.equal(g.vehicleInteract(body.id).ok,false);assert.equal(g.teams[0].lost,lost+2);
});
test('save/load keeps a single hidden crew with original HP and all stash ammunition',()=>{
 const {g,crew,body}=pair();for(const w of WarOperatorWeapons.list)g.operatorState(crew).stash[w.id]={ammo:1,reserve:2};g.vehicleInteract(crew.id);const hp=crew.hp,saved=g.save(),loaded=Game.load(saved),copy=loaded.get(body.id);
 assert.equal(loaded.directControl,null);assert.equal(loaded.get(crew.id),undefined);assert.equal(copy.vehicleCrew.hp,hp);assert.equal(Object.keys(copy.vehicleCrew.operatorState.stash).length,WarOperatorWeapons.list.length);assert.equal(loaded.beginDirectControl(body.id),true);assert.equal(loaded.vehicleInteract(body.id).id,crew.id);assert.equal(loaded.get(crew.id).hp,hp);for(const a of Object.values(loaded.get(crew.id).operatorState.stash))assert.deepEqual(a,{ammo:1,reserve:2});assert.ok(saved.entities.find(e=>e.id===body.id).vehicleCrew,'loading never mutates source snapshot');
});
test('invalid nested crew identities, types and ammunition are rejected on load',()=>{
 const {g,crew,body}=pair();g.vehicleInteract(crew.id);for(const mode of ['duplicate','kind','team','hp','ammo']){const s=g.save(),b=s.entities.find(e=>e.id===body.id),c=b.vehicleCrew;if(mode==='duplicate'){c.id=s.entities[0].id;b.vehicleDriverId=c.id;}if(mode==='kind')c.kind='tank';if(mode==='team')c.team=1;if(mode==='hp')c.hp=Infinity;if(mode==='ammo')c.operatorState.stash.rifle_01.ammo=-1;assert.throws(()=>Game.load(s),/(乘员|载员)/,mode);}
});
function inputFixture(){
 const THREE=require('../assets/vendor/three.min.js'),nodes=new Map(),el=()=>({hidden:false,style:{},querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s);}}),document={hidden:false,pointerLockElement:null,createElement:el,body:{append(){}},addEventListener(){}};
 const c={THREE,WarData,WarCombatReadiness,document,innerWidth:1600,innerHeight:1000,addEventListener(){},console};c.globalThis=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/direct-control.js'),'utf8'),c);
 let paused=false,allowed=true,calls=0,entered=null;const actor={id:1,kind:'operator',angle:0},game={get:()=>actor,setDirectInput(input){this.input=input;},vehicleInteract(){calls++;return{ok:true,id:2,message:'登乘'};}};
 const d=new c.WarDirectControl({canvas:{},width:1600,height:1000},{paused:()=>paused,canEnter:()=>allowed,toast(){}});d.active=true;d.game=game;d.entityId=1;d.enter=id=>{entered=id;return true;};document.pointerLockElement=d.r.canvas;
 return{d,document,c,game,THREE,get calls(){return calls;},get entered(){return entered;},pause:v=>paused=v,allow:v=>allowed=v,key:(repeat=false)=>d.keyDown({code:'KeyF',repeat,target:{tagName:'DIV'},preventDefault(){},stopImmediatePropagation(){}})};
}
test('F input obeys pause, focus lock, modals and key-repeat while preserving FPS after switching',()=>{
 for(const mode of ['paused','unlocked','hidden','blurred','vehicle-menu','operator-menu','modal','repeat']){const f=inputFixture();if(mode==='paused')f.pause(true);if(mode==='unlocked')f.document.pointerLockElement=null;if(mode==='hidden')f.document.hidden=true;if(mode==='blurred')f.document.hasFocus=()=>false;if(mode==='vehicle-menu')f.d.vehicleMenu={open:true};if(mode==='operator-menu')f.d.operatorUI={open:true};if(mode==='modal')f.allow(false);f.key(mode==='repeat');assert.equal(f.calls,0,mode);}
 for(const target of [{tagName:'INPUT'},{tagName:'TEXTAREA'},{tagName:'DIV',isContentEditable:true}]){const f=inputFixture();f.d.keyDown({code:'KeyF',repeat:false,target,preventDefault(){},stopImmediatePropagation(){}});assert.equal(f.calls,0);}
 const f=inputFixture();f.key();assert.equal(f.calls,1);assert.equal(f.entered,2);assert.equal(f.d.active,true);f.key(true);assert.equal(f.calls,1);
});
test('first-person ray skips dead tree instances and submits the live tree ID',()=>{
 const {d,c,game,THREE}=inputFixture(),make=(x,id)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(2,6,2),new THREE.MeshBasicMaterial());m.position.set(x,2,0);m.userData.treeId=id;m.updateMatrixWorld();return m;};
 const dead=make(20,'dead'),live=make(50,'live');d.r.world={children:[dead,live]};d.r.objects=new Map();game.entities=[];
 c.WarTrees={resolveHit:h=>h.object.userData.treeId,get:(_g,id)=>({hp:id==='live'?90:0})};const hit=d.cast(new THREE.Vector3(0,2,0),new THREE.Vector3(1,0,0),200);
 assert.equal(hit.treeId,'live');d.eye=new THREE.Vector3(0,2,0);d.aimResult={point:hit.point,target:null,targetTreeId:hit.treeId};d.submit();assert.equal(game.input.targetTreeId,'live');
 dead.geometry.dispose();live.geometry.dispose();dead.material.dispose();live.material.dispose();
});
