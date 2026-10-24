const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');
for(const file of ['data','roster','equipment','maps-large','destructible-trees','sim'])require('../src/'+file);
const {prepare,advanceUntil}=require('./combat-preparation.cjs');
const A=WarTrees,{COLS,ROWS,T}=WarData;
function fixture(seed=123){return{map:{id:'forest',seed,tiles:new Uint8Array(COLS*ROWS),spawns:[]},nodes:[],ore:[],time:0};}
function matrix(mesh,index){const m=new THREE.Matrix4();mesh.getMatrixAt(index,m);return m;}
test('tree identity and geometry are deterministic independently of rendering or game RNG',()=>{
 const a=fixture(),b=fixture();assert.deepEqual(A.ensure(a),A.ensure(b));assert.equal(a.trees.length,170);assert.equal(new Set(a.trees.map(t=>t.id)).size,170);assert.notDeepEqual(A.ensure(fixture(124)),a.trees);
 const before=JSON.stringify(a.trees);A.createVisual(a);assert.equal(JSON.stringify(a.trees),before);assert.equal(A.ensure(a),a.trees);
});
test('tree placement excludes water, spawn zones, resources and access lanes',()=>{
 const g=fixture();for(let y=0;y<ROWS;y++)for(let x=0;x<20;x++)g.map.tiles[y*COLS+x]=3;g.map.spawns=[{x:1500,y:1500}];g.nodes=[{x:2600,y:1100}];g.ore=[{x:3400,y:1800}];
 for(const t of A.ensure(g)){assert.ok(t.x>=20*T);assert.ok(Math.hypot(t.x-1500,t.y-1500)>=330);assert.ok(Math.hypot(t.x-2600,t.y-1100)>=120);assert.ok(Math.hypot(t.x-3400,t.y-1800)>=130);}
});
test('repeated small-arms impacts accumulate, reject misses, and remove live collision in place',()=>{
 const g=fixture(),t=A.ensure(g)[0],colliders=A.liveColliders(g);g.directObstacles=colliders;
 assert.equal(A.impact(g,{type:'shot',targetTreeId:t.id,tx:t.x+20,ty:t.y,targetHeight:5,damage:35}),0);
 for(let shot=0;shot<3;shot++)assert.equal(A.impact(g,{type:'shot',targetTreeId:t.id,tx:t.x,ty:t.y,targetHeight:5,damage:35}),1);
 assert.equal(t.hp,0);assert.equal(g.directObstacles,colliders);assert.equal(colliders.includes(t),false);assert.equal(A.damage(g,t.id,10),false);
 assert.equal(A.damage(g,g.trees[1].id,-20),false);assert.equal(A.damage(g,g.trees[1].id,NaN),false);assert.equal(g.trees[1].hp,A.MAX_HP);
});
test('tank shells and explosive radius damage only nearby trees at the actual impact height',()=>{
 const g=fixture(),t=A.ensure(g)[0],far=g.trees.find(o=>Math.hypot(o.x-t.x,o.y-t.y)>500);
 assert.equal(A.impact(g,{type:'shot',tx:t.x,ty:t.y,targetHeight:5000,damage:1000,splash:120}),0);assert.equal(t.hp,A.MAX_HP);
 assert.ok(A.impact(g,{type:'shot',tx:t.x,ty:t.y,targetHeight:3,damage:120,splash:100})>=1);assert.equal(t.hp,0);assert.equal(far.hp,A.MAX_HP);
 const second=g.trees.find(o=>o.hp>0);assert.equal(A.impact(g,{type:'shot',targetTreeId:second.id,tx:second.x,ty:second.y,targetHeight:second.trunkHeight/2,damage:120}),1);assert.equal(second.hp,0);
});
test('RTS large strikes destroy tree cover and reject invalid events',()=>{
 for(const type of ['strike','nuke','bunker','orbital']){const g=fixture(),tree=A.ensure(g)[0];assert.ok(A.impact(g,{type,x:tree.x,y:tree.y,r:90,height:0})>0);assert.equal(tree.hp,0);}
 const g=fixture(),tree=A.ensure(g)[0];assert.equal(A.impact(g,{type:'impact',x:tree.x,y:tree.y,r:1000,damage:1000}),0);assert.equal(A.impact(g,{type:'shot',tx:NaN,ty:0,damage:1000,splash:100}),0);assert.equal(tree.hp,A.MAX_HP);
});
test('save records preserve partially damaged and destroyed trees without sharing mutable state',()=>{
 const g=fixture(),trees=A.ensure(g);g.time=7;A.damage(g,trees[0].id,17);A.damage(g,trees[1].id,100,{x:trees[1].x-10,y:trees[1].y});const saved=A.serialize(g),copy=structuredClone(saved),loaded=fixture();loaded.time=10;A.restore(loaded,saved);
 assert.equal(loaded.trees[0].hp,73);assert.equal(loaded.trees[1].hp,0);assert.equal(loaded.trees[1].destroyedAt,7);assert.equal(A.liveColliders(loaded).length,168+1);assert.deepEqual(saved,copy);
 A.damage(loaded,loaded.trees[0].id,10);assert.equal(g.trees[0].hp,73);assert.equal(saved.damage[0].hp,73);
 const old=fixture();A.restore(old,undefined);assert.ok(old.trees.every(t=>t.hp===A.MAX_HP));
});
test('invalid tree save records are rejected before partially mutating the map',()=>{
 const g=fixture(),tree=A.ensure(g)[0];A.damage(g,tree.id,10);const before=A.serialize(g),bad={...before,damage:[...before.damage,{...before.damage[0],hp:-1}]};assert.throws(()=>A.restore(g,bad));assert.deepEqual(A.serialize(g),before);
 assert.throws(()=>A.restore(fixture(124),before));
});
test('instance hits map to tree IDs; destruction removes ray obstruction immediately and preserves neighbours',()=>{
 const g=fixture(),tree=A.ensure(g)[0],visual=A.createVisual(g),before=matrix(visual.trunks,1).toArray();visual.trunks.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(tree.x+30,tree.trunkHeight/2,tree.y),new THREE.Vector3(-1,0,0),0,60);
 assert.ok(ray.intersectObject(visual.trunks).some(hit=>A.resolveHit(hit)===tree.id));assert.equal(A.resolveHit({object:visual.trunks,instanceId:0}),tree.id);
 A.damage(g,tree.id,100);visual.sync(g);assert.equal(matrix(visual.trunks,0).determinant(),0);assert.deepEqual(matrix(visual.trunks,1).toArray(),before);assert.equal(ray.intersectObject(visual.trunks).some(hit=>A.resolveHit(hit)===tree.id),false);
 assert.ok(matrix(visual.stumps,0).determinant()>0);assert.equal(visual.fallingTrunks.userData.firstPersonOccluder,undefined);assert.equal(visual.stumps.userData.firstPersonOccluder,undefined);
});
test('fall animation uses simulation time, updates only changed instances and never revives on rebuild',()=>{
 const g=fixture(),tree=A.ensure(g)[0],visual=A.createVisual(g);let writes=0;for(const mesh of visual.meshes){const set=mesh.setMatrixAt.bind(mesh);mesh.setMatrixAt=(...args)=>{writes++;return set(...args);};}
 visual.sync(g);assert.equal(writes,0);g.time=.1;visual.sync(g);assert.equal(writes,0,'healthy forest does not rebuild on each frame');A.damage(g,tree.id,100);visual.sync(g);assert.ok(writes<40,'only the damaged tree instances change');const fallenStart=matrix(visual.fallingTrunks,0).toArray(),afterHitWrites=writes;
 visual.sync(g);assert.equal(writes,afterHitWrites,'paused simulation freezes falling and GPU uploads');g.time=.7;visual.sync(g);assert.notDeepEqual(matrix(visual.fallingTrunks,0).toArray(),fallenStart);
 g.time=2;visual.sync(g);assert.equal(matrix(visual.fallingTrunks,0).determinant(),0);assert.equal(visual.activeFalls.size,0);const rebuilt=A.createVisual(g);assert.equal(matrix(rebuilt.trunks,0).determinant(),0);assert.ok(matrix(rebuilt.stumps,0).determinant()>0);
});
test('Game save/load retains tree destruction; old saves without tree state remain compatible',()=>{
 const game=new WarSim.Game({map:'desert',enemies:1,faction:'chn'}),tree=A.ensure(game)[0];game.time=4;A.damage(game,tree.id,100);const saved=game.save(),loaded=WarSim.Game.load(saved);assert.equal(A.get(loaded,tree.id).hp,0);
 delete saved.trees;const old=WarSim.Game.load(saved);assert.equal(A.get(old,tree.id).hp,A.MAX_HP);
});
function combat(){const g=new WarSim.Game({map:'desert',enemies:1,faction:'chn',abilities:false,buffs:['vision']});g.entities=[];g.spawn(0,'hq',300,300);g.spawn(1,'hq',WarData.W-300,WarData.H-300).hp=1e12;g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;});g.random=()=>0;return g;}
function tick(g,seconds){for(let i=0;i<seconds*20;i++)g.step(.05);}
test('real operator rifle fire damages trees through normal ammunition and cooldown handling',()=>{
 const g=combat(),tree=A.ensure(g)[0],operator=g.spawn(0,'operator',tree.x-25,tree.y);g.beginDirectControl(operator.id);g.teams[0].aiClock=1e9;const state=g.operatorState(operator),weapon=g.operatorWeapon(operator),ammo=state.stash[weapon.id],beforeAmmo=ammo.ammo;
 for(let i=0;i<3;i++){g.setDirectInput({fire:true,yaw:0,targetTreeId:tree.id,aimX:tree.x,aimY:tree.y,aimHeight:5});g.step(.05);g.setDirectInput({fire:false});tick(g,.5);}
 assert.equal(ammo.ammo,beforeAmmo-3,'three deliberate shots spend three rounds');assert.equal(tree.hp,0,'normal emitted rifle impacts destroy the tree');
 const next=g.trees.find(t=>t.hp>0);operator.x=next.x-25;operator.y=next.y;ammo.ammo=0;ammo.reserve=0;const hp=next.hp;g.setDirectInput({fire:true,yaw:0,targetTreeId:next.id,aimX:next.x,aimY:next.y,aimHeight:5});tick(g,1);assert.equal(next.hp,hp,'empty magazine cannot apply a manual tree damage shortcut');
});
test('normal tank direct fire and RTS artillery blast both reach tree impact handling',()=>{
 const g=combat(),tree=A.ensure(g)[0],tank=g.spawn(0,'tank',tree.x-80,tree.y);g.beginDirectControl(tank.id);g.teams[0].aiClock=1e9;prepare(g,tank,null,{aimX:tree.x,aimY:tree.y,aimHeight:5});g.setDirectInput({fire:true,yaw:0,targetTreeId:tree.id,aimX:tree.x,aimY:tree.y,aimHeight:5});g.step(.05);g.setDirectInput({fire:false});tick(g,.5);assert.ok(tree.hp<A.MAX_HP,'tank shell damages the aimed tree');g.endDirectControl();
 const next=g.trees.find(t=>t.hp===A.MAX_HP),arty=g.spawn(0,'arty',next.x-200,next.y),target=g.spawn(1,'ifv',next.x+6,next.y);g.spatial.rebuild(g.entities);assert.ok(prepare(g,arty,target));assert.ok(g.emitShot(arty,target));advanceUntil(g,()=>next.hp<A.MAX_HP,5);assert.ok(next.hp<A.MAX_HP,'RTS area damage affects adjacent tree cover');
});
