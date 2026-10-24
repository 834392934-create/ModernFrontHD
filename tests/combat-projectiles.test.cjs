const test=require('node:test'),assert=require('node:assert/strict'),{arena,advance}=require('./combat-mechanics-fixture.cjs');
const P=WarCombatProjectiles,R=WarCombatReadiness;
function shot(g,e,w,target,overrides={}){g.spatial.rebuild(g.entities);return P.decorateLaunch(g,e,w,{type:'shot',sourceId:e.id,sourceKind:e.kind,from:e.team,weaponFamily:w.family,weaponFx:w.family,rocket:w.rocket,x:e.x,y:e.y,sourceHeight:g.entityAltitude(e),tx:target.x,ty:target.y,targetHeight:g.entityAltitude(target),target:target.id,firedAt:g.time,ttl:2,max:2,damage:w.damage,baseDamage:w.damage,treeDamage:w.damage,splash:w.splash||0,...overrides});}
test('bomb release inherits frozen aircraft velocity and gravity rather than teleporting toward target',()=>{
 const {g,e}=arena('fighter');e.altitude=200;e.flightSpeed=150;e.angle=0;e.motion=undefined;const target=g.spawn(1,'tank',2500,1600),w=R.weapons(g,e).find(w=>w.family==='bomb'),fx=shot(g,e,w,target),origin=P.position(fx);assert.equal(fx.projectile.releaseVelocity.x,150);e.angle=Math.PI;e.flightSpeed=10;
 P.step(g,fx,.1);const q=P.position(fx);assert(q.x>origin.x);assert(q.height<origin.height);assert.equal(q.y,origin.y);assert.notEqual(fx.tx,target.x);assert(P.validate(fx));
 const copy=structuredClone(fx);assert.deepEqual(P.position(copy),P.position(fx));P.step(g,fx,0);assert.deepEqual(P.position(fx),P.position(copy));
});
test('CIWS launches a finite interceptor, respects altitude and only removes threat after actual travel',()=>{
 const {g,e}=arena('mobile_ciws'),enemy=g.spawn(1,'rocket',e.x+180,e.y),w=R.weapons(g,enemy)[0],fx=shot(g,enemy,w,e);fx.sourceHeight=fx.targetHeight=20;fx.max=fx.ttl=4;g.effects.push(fx);R.ensure(g,e);
 let fired=false;advance(g,1,dt=>{R.step(g,e,dt);if(!fired)fired=P.tryIntercept(g,e,dt);});assert(fired);assert.equal(fx.type,'shot');const interceptor=g.effects.find(f=>f.type==='interceptor');assert(interceptor);const own=R.weapons(g,e)[0],s=e.combat.stations[own.id];assert.equal(s.ammo,R.profile(g,e,own).magazine-1);
 advance(g,.5,dt=>P.step(g,interceptor,dt));assert.equal(fx.type,'intercepted');assert.equal(fx.damage,0);
 const high=shot(g,enemy,w,e,{sourceHeight:4000,targetHeight:4000});g.effects=[high];assert.equal(P.interceptionPlan(g,e),null);
});
test('real Game CIWS can keep traversing a raised threat across idle ticks and never erases a nuclear warning',()=>{
 const {g}=arena('tank'),defense=g.spawn(0,'ciws',2300,1700);g.spawn(0,'power',2000,1900);const missile={type:'shot',rocket:true,from:1,x:2450,y:1700,sourceHeight:130,tx:2300,ty:1700,targetHeight:70,ttl:4,max:4,damage:80},nuke={type:'nuke',from:1,x:2300,y:1700,ttl:6,max:6,r:370};g.effects.push(missile,nuke);
 let intercepted=false;for(let i=0;i<40&&!intercepted;i++){g.step(.05);intercepted=missile.type==='intercepted';}assert(intercepted);assert(g.effects.includes(nuke));assert(Object.values(defense.combat.stations).some(s=>s.shotSerial>0));
});
test('idle manual camera does not fight the passive CIWS servo, while a deliberate trigger owns its shared mount',()=>{
 const {g,e}=arena('mobile_ciws');g.beginDirectControl(e.id);g.setDirectInput({yaw:0,pitch:0,fire:false});const threat={type:'shot',rocket:true,from:1,x:e.x+150,y:e.y,sourceHeight:120,tx:e.x,ty:e.y,targetHeight:40,ttl:5,max:5,damage:80};g.effects.push(threat);
 let intercepted=false;for(let i=0;i<40&&!intercepted;i++){g.step(.05);intercepted=threat.type==='intercepted';}assert(intercepted);assert.equal(e.hp,e.maxHp);
 const second=arena('mobile_ciws'),w=R.weapons(second.g,second.e)[0];second.g.beginDirectControl(second.e.id);const incoming={type:'shot',rocket:true,from:1,x:second.e.x+140,y:second.e.y,sourceHeight:10,tx:second.e.x,ty:second.e.y,targetHeight:10,ttl:3,max:3,damage:80};second.g.effects.push(incoming);const stock=R.ensure(second.g,second.e).stations[w.id],ammo=stock.ammo;second.g.setDirectInput({fire:true,yaw:0});assert.equal(P.tryIntercept(second.g,second.e,.1),false);assert.equal(stock.ammo,ammo);second.g.setDirectInput({fire:false,cancelJump:true});assert(P.tryIntercept(second.g,second.e,.1));assert.equal(stock.ammo,ammo-1);
});
test('skyward bomb free aim falls from its release point and cannot impact above the launch altitude',()=>{
 const {g,e}=arena('heavy_bomber'),w=R.weapons(g,e).find(w=>w.family==='bomb'),target=g.spawn(1,'tank',e.x+300,e.y);e.altitude=180;e.flightSpeed=150;const fx=shot(g,e,w,target,{target:null,targetHeight:220});const result=P.step(g,fx,.05);assert.equal(result.impact,false);assert(P.position(fx).height<180);assert(P.position(fx).height>170);assert.equal(fx.projectile.impactHeight,0);
});
test('fast kinetic rounds sweep the nearest hull, respect friendly cover and allow a moving target to miss',()=>{
 for(const mode of ['enemy','friendly','moved']){
  const {g,e}=arena('tank'),target=g.spawn(1,'tank',e.x+400,e.y),w=R.weapons(g,e)[0],fx=shot(g,e,w,target,{max:.05,ttl:.05,sourceHeight:10,targetHeight:10});
  const blocker=mode==='moved'?null:g.spawn(mode==='friendly'?0:1,'ifv',e.x+180,e.y);if(mode==='moved')target.y+=100;g.spatial.rebuild(g.entities);
  const result=P.step(g,fx,.05);assert(result.impact);assert.equal(fx.target,mode==='enemy'?blocker.id:null);
  if(blocker)assert(P.position(fx).x<blocker.x);if(mode==='friendly')assert.equal(fx.damage+fx.baseDamage+fx.splash,0);
 }
});
test('continuous hull hits respect rotation, height and frozen target domain restrictions',()=>{
 const {g,e}=arena('tank'),target=g.spawn(1,'tank',e.x+300,e.y),w=R.weapons(g,e)[0];target.angle=Math.PI/2;
 const restricted=shot(g,e,w,target,{max:.1,weaponDomains:['air'],sourceHeight:10,targetHeight:10});assert(P.step(g,restricted,.1).impact);assert.equal(restricted.target,null);assert.equal(restricted.damage,0);
 const high=shot(g,e,w,target,{max:.1,sourceHeight:90,targetHeight:90});P.step(g,high,.1);assert.equal(high.target,null);assert.equal(P.position(high).height,90);
 const hit=shot(g,e,w,target,{max:.1,sourceHeight:10,targetHeight:10});P.step(g,hit,.1);assert.equal(hit.target,target.id);assert.equal(hit.targetDomain,'ground');
});
test('a tree blocks a swept round before its original target and is damaged at the actual impact',()=>{
 const {g,e}=arena('tank'),target=g.spawn(1,'tank',e.x+300,e.y),w=R.weapons(g,e)[0],tree=WarTrees.ensure(g)[0];tree.x=e.x+120;tree.y=e.y;tree.hp=tree.maxHp;tree.height=40;g._treeState.colliders=[tree];
 const fx=shot(g,e,w,target,{max:.05,sourceHeight:10,targetHeight:10,splash:0,treeDamage:20,treeSplash:0});P.step(g,fx,.05);assert.equal(fx.target,null);assert.equal(fx.targetTreeId,tree.id);assert.equal(WarTrees.impact(g,fx),1);assert.equal(tree.hp,tree.maxHp-20);
});
test('FPS fixed aim and sky misses keep the launch ray without acquiring a target or falling to ground',()=>{
 const {g,e}=arena('fighter'),target=g.spawn(1,'fighter',e.x+400,e.y),w=R.weapons(g,e).find(w=>w.family==='missile');e.altitude=300;target.altitude=500;
 const fx=shot(g,e,w,target,{max:.4,sourceHeight:300,targetHeight:500,directHitArea:{x:target.x,y:target.y,altitude:500,r:10}});assert.equal(fx.projectile.kind,'kinetic');const end={...fx.projectile.destination};target.y+=300;P.step(g,fx,.4);assert.equal(fx.target,null);assert.deepEqual(P.position(fx),end);assert.equal(end.height,500);
});
test('air-launched missiles separate at inherited velocity then turn continuously; pause and save retain phases',()=>{
 const {g,e}=arena('fighter'),target=g.spawn(1,'fighter',e.x+600,e.y),w=R.weapons(g,e).find(w=>w.family==='missile');e.altitude=target.altitude=200;e.flightSpeed=140;e.angle=0;
 const fx=shot(g,e,w,target),p=fx.projectile;assert.equal(p.phase,'separation');const start=P.position(fx);P.step(g,fx,.1);assert.equal(p.position.x,start.x+14);assert(p.position.height<start.height);assert.equal(p.heading,0);
 P.step(g,fx,.1);assert.equal(p.phase,'ignition');P.step(g,fx,.15);assert.equal(p.phase,'powered');target.y+=500;g.spatial.rebuild(g.entities);const old=p.heading,point=P.position(fx);P.step(g,fx,.05);assert(p.heading>old);assert(p.heading-old<=p.turnRate*.05+1e-9);assert(Math.hypot(p.position.x-point.x,p.position.y-point.y,p.position.height-point.height)<=p.cruiseSpeed*.05+1e-9);
 const copy=structuredClone(fx);assert(P.validate(copy));P.step(g,fx,0);assert.deepEqual(fx,copy);fx.projectile.turnRate=NaN;assert.equal(P.validate(fx),false);
});
test('vertical launch clears the deck before ignition and guides to a real collision',()=>{
 const {g,e}=arena('destroyer'),target=g.spawn(1,'tank',e.x+500,e.y),w=R.weapons(g,e).find(w=>w.family==='missile'&&w.targetDomains.includes('ground'));assert(w);
 const fx=shot(g,e,w,target,{sourceHeight:12});assert.equal(fx.projectile.phase,'vertical');P.step(g,fx,.15);assert.equal(P.position(fx).x,e.x);assert(P.position(fx).height>12);let hit=false;
 for(let i=0;i<300&&!hit&&fx.type==='shot';i++)hit=P.step(g,fx,.025).impact;assert(hit);assert.equal(fx.target,target.id);
});
test('actual Game swept impact damages once and a moved target avoids original target-ID damage',()=>{
 for(const moved of [false,true]){
  const {g,e}=arena('tank'),target=g.spawn(1,'tank',e.x+400,e.y),w=R.weapons(g,e)[0],fx=shot(g,e,w,target,{max:.04,sourceHeight:10,targetHeight:10,splash:0});target.disabled=e.disabled=1e9;target.hp=target.maxHp=10000;if(moved)target.y+=100;g.effects=[fx];const hp=target.hp;
  g.step(.05);assert.equal(target.hp<hp,!moved);const after=target.hp;g.step(.05);assert.equal(target.hp,after);
 }
});
test('torpedo loses sonar contact and expires without magical target ID damage',()=>{
 const {g,e}=arena('submarine'),target=g.spawn(1,'submarine',e.x+300,e.y),w=R.weapons(g,e)[0],fx=shot(g,e,w,target);g.buffs.delete('vision');g.effects.push(fx);assert(g.canDetect(e.team,target));P.step(g,fx,.1);assert.equal(fx.projectile.state,'tracking');target.x+=1800;
 let result;advance(g,4,dt=>{if(fx.type==='shot')result=P.step(g,fx,dt);});assert.equal(result.expired,true);assert.equal(fx.target,null);assert.equal(fx.damage,0);assert.equal(fx.projectile.state,'searching');
});
test('naval decoys consume charges and lure nearby torpedoes without duplicate impacts',()=>{
 const {g,e}=arena('submarine'),target=g.spawn(1,'submarine',e.x+200,e.y),w=R.weapons(g,e)[0],fx=shot(g,e,w,target);g.effects.push(fx);assert(P.deployDecoy(g,target));assert.equal(target.countermeasures.charges,2);assert.equal(P.deployDecoy(g,target),false);
 let sawDecoy=false;advance(g,2,dt=>{if(fx.type==='shot'){P.step(g,fx,dt);sawDecoy||=fx.projectile.state==='decoy';}});assert(sawDecoy);assert.equal(fx.type,'spent-projectile');assert.equal(fx.damage,0);
});
test('projectile validators reject corrupted trajectory state and preserve old frozen shots',()=>{
 assert(P.validate({type:'shot',x:0,y:0}));const {g,e}=arena('fighter'),w=R.weapons(g,e).find(w=>w.family==='bomb'),t=g.spawn(1,'tank',e.x+400,e.y);e.altitude=200;const fx=shot(g,e,w,t);fx.projectile.velocity.x=NaN;assert.equal(P.validate(fx),false);
});
test('howitzer, mortar and grenade arcs share exact frozen endpoints and an elevated midpoint in either direction',()=>{
 for(const family of ['howitzer','mortar','grenade'])for(const direction of [-1,1]){
  const {g,e}=arena('arty'),target=g.spawn(1,'tank',e.x+400*direction,e.y-100),w={id:'test',family,damage:40,splash:20},fx=shot(g,e,w,target),start=P.position(fx),duration=fx.projectile.duration;
  assert.deepEqual(start,{x:e.x,y:e.y,height:g.entityAltitude(e)});P.step(g,fx,duration/2);assert(P.position(fx).height>start.height+10);assert.equal(P.position(fx).x,(start.x+target.x)/2);
  assert.deepEqual(fx.projectile.destination,{x:target.x,y:target.y,height:g.entityAltitude(target)});const end=P.step(g,fx,duration/2);assert(end.impact);assert.equal(fx.target,target.id);assert(Math.abs(P.position(fx).x-target.x)<50);assert(P.position(fx).height>=g.entityAltitude(target));assert(P.validate(fx));
 }
});
test('arcing shells and falling bombs share swept solid collision before their planned ground endpoint',()=>{
 const {g,e}=arena('arty'),target=g.spawn(1,'tank',e.x+400,e.y),w={id:'test',family:'howitzer',damage:40,splash:20},fx=shot(g,e,w,target),obstacle=g.spawn(1,'hq',e.x+200,e.y);g.spatial.rebuild(g.entities);
 let result;for(let i=0;i<100;i++){result=P.step(g,fx,.04);if(result.impact||result.expired)break;}assert(result.impact);assert.equal(fx.target,obstacle.id);assert(P.position(fx).x<target.x);
 const {g:g2,e:plane}=arena('fighter');plane.altitude=200;plane.flightSpeed=0;const below=g2.spawn(1,'tank',plane.x,plane.y),bomb=shot(g2,plane,R.weapons(g2,plane).find(w=>w.family==='bomb'),below);
 for(let i=0;i<100;i++){result=P.step(g2,bomb,.04);if(result.impact||result.expired)break;}assert(result.impact);assert.equal(bomb.target,below.id);assert(P.position(bomb).height>g2.entityAltitude(below));
});
