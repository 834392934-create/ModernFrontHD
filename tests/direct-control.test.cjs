const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data.js');require('../src/roster.js');require('../src/sim.js');
const {Game}=WarSim,{U,T,COLS,ROWS}=WarData;
function arena(){const g=new Game({map:'desert',faction:'chn',enemies:1,buffs:['vision'],abilities:false,playerOnlyTech:false,aiSpaceWeapons:true});g.entities=[];g.spawn(0,'hq',300,300);g.spawn(1,'hq',2700,1800);g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(1);g.teams.forEach(t=>{t.aiClock=999999;t.money=0;});return g;}
function step(g,seconds){for(let n=0;n<Math.ceil(seconds*20);n++)g.step(.05);}
test('direct control only accepts living friendly units; entry clears orders and exit preserves position',()=>{
 const g=arena(),a=g.spawn(0,'tank',1000,750),enemy=g.spawn(1,'tank',1500,750),dead=g.spawn(0,'infantry',1050,700);dead.hp=0;
 assert.equal(g.beginDirectControl(enemy.id),false);assert.equal(g.beginDirectControl(g.entities[0].id),false);assert.equal(g.beginDirectControl(dead.id),false);assert.equal(g.beginDirectControl(999999),false);
 g.command([a.id],1300,750,true,enemy.id);a.orderQueue=[{x:1400,y:750}];assert.equal(g.beginDirectControl(a.id),true);assert.equal(a.order,null);assert.equal(a.target,null);assert.deepEqual(a.orderQueue,[]);assert.equal(a.manualMove,true);
 g.setDirectInput({forward:1,yaw:0,flightEnabled:true});step(g,.3);const x=a.x;assert.ok(x>1000);assert.equal(g.endDirectControl(),true);assert.equal(a.x,x);assert.equal(a.manualMove,false);assert.equal(g.directControl,null);assert.equal(g.endDirectControl(),false);
});
test('driving uses original effective speed, normalized diagonal input, absolute yaw and positive right strafe',()=>{
 for(const input of [{forward:1,yaw:0},{strafe:1,yaw:0},{forward:1,strafe:1,yaw:Math.PI/2}]){const g=arena(),a=g.spawn(0,'tank',1000,750);g.beginDirectControl(a.id);g.setDirectInput(input);step(g,.5);assert.ok(Math.abs(Math.hypot(a.x-1000,a.y-750)-g.effectiveSpeed(a)*.5)<1e-8);if(input.strafe&&!input.forward)assert.ok(a.y>750&&a.x===1000);assert.equal(a.angle,input.yaw);}
 const g=arena(),a=g.spawn(0,'fighter',1000,750);g.beginDirectControl(a.id);g.setDirectInput({forward:99,strafe:Infinity,yaw:NaN,aimX:Infinity,aimY:NaN,aimHeight:999});assert.equal(g.directControl.input.forward,1);assert.equal(g.directControl.input.strafe,0);assert.equal(g.directControl.input.aimHeight,999);step(g,.2);assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));
});
test('ground driving cannot cross blocked tiles, buildings or ore; aircraft can fly above them',()=>{
 for(const obstacle of ['grid','building','ore']){const g=arena(),a=g.spawn(0,'tank',1050,750);if(obstacle==='grid')for(let y=0;y<ROWS;y++)g.map.blocked[y*COLS+25]=1;else if(obstacle==='building')g.spawn(0,'power',1200,750);else g.ore=[{id:0,x:1200,y:750,amount:1000,initial:1000}];g.beginDirectControl(a.id);g.setDirectInput({forward:1,yaw:0,flightEnabled:true});step(g,4);assert.ok(a.x>1050,obstacle+' approach');assert.ok(a.x<1200-a.r,obstacle+' collision');}
 const g=arena(),a=g.spawn(0,'fighter',1050,750);a.altitude=120;g.spawn(0,'power',1200,750);g.ore=[{id:0,x:1170,y:750,amount:1000,initial:1000}];g.map.blocked.fill(1);g.beginDirectControl(a.id);g.setDirectInput({forward:1,yaw:0,flightEnabled:true});step(g,3);assert.ok(a.x>1250);
});
test('ground driving respects renderer-supplied tree trunks while aircraft pass overhead',()=>{
 for(const kind of ['infantry','tank','fighter']){const g=arena(),a=g.spawn(0,kind,1000,750);g.directObstacles=[{x:1080,y:750,r:4}];g.beginDirectControl(a.id);g.setDirectInput({forward:1,yaw:0,flightEnabled:true});step(g,2);if(U[kind].air)assert.ok(a.x>1080);else assert.ok(a.x+a.r<=1076);}
});

test('naval driving remains in navigable water and blocks the whole hull before shoreline',()=>{
 const g=arena();for(let y=0;y<ROWS;y++)for(let x=0;x<25;x++)g.map.navalBlocked[y*COLS+x]=0;const a=g.spawn(0,'destroyer',1050,750);g.beginDirectControl(a.id);g.setDirectInput({forward:1,yaw:0,flightEnabled:true});step(g,4);assert.ok(a.x>1050&&a.x+a.r<=1200);assert.equal(a.y,750);
});
test('controlled units never auto-fire and trigger only explicit valid-target shots with existing damage',()=>{
 const g=arena(),a=g.spawn(0,'tank',1000,750),target=g.spawn(1,'tank',1150,750);target.disabled=999;g.beginDirectControl(a.id);step(g,1);assert.equal(target.hp,target.maxHp);assert.equal(a.target,null);
 g.setDirectInput({fire:true,targetId:target.id,yaw:0,aimX:target.x,aimY:target.y,aimHeight:5});g.step(.05);const shot=g.effects.find(e=>e.sourceId===a.id);assert.ok(shot&&!shot.miss);assert.equal(shot.target,target.id);assert.equal(shot.damage,U.tank.damage);assert.equal(a.target,target.id);step(g,.4);assert.equal(target.hp,target.maxHp-U.tank.damage);assert.ok(a.cool>0);
 g.setDirectInput({fire:false,yaw:0});step(g,3);assert.equal(target.hp,target.maxHp-U.tank.damage);
});
test('wrong domain, friendly, absent, hidden, too-near and too-far targets produce harmless misses without lock-on',()=>{
 const cases=[['fighter',1,150,'tank',false],['tank',0,150,'tank',false],['tank',1,150,'tank',true],['tank',1,400,'tank',false],['tank',1,60,'arty',false],['tank',1,150,'tank','missing']];
 for(const [kind,team,offset,driver,hidden] of cases){const g=arena(),a=g.spawn(0,driver,1000,750),target=g.spawn(team,kind,1000+offset,750);target.disabled=999;g.beginDirectControl(a.id);if(hidden===true){g.buffs.delete('vision');g.visible.fill(0);}g.setDirectInput({fire:true,yaw:0,targetId:hidden==='missing'?999:target.id,aimX:target.x,aimY:target.y,aimHeight:kind==='fighter'?65:5});g.step(.05);const shot=g.effects.find(e=>e.sourceId===a.id);assert.ok(shot?.miss,JSON.stringify([kind,team,offset,driver,hidden]));assert.equal(shot.damage,0);assert.equal(shot.splash,0);assert.equal(shot.target,null);assert.equal(a.target,null);g.setDirectInput({});step(g,1);assert.equal(target.hp,target.maxHp);}
});
test('manual splash uses the existing allowed-domain damage and cannot affect an excluded neighbor',()=>{
 const g=arena(),a=g.spawn(0,'orbital_bombardment',1000,750),tank=g.spawn(1,'tank',1200,750),base=g.spawn(1,'power',1210,750);tank.disabled=base.disabled=999;g.beginDirectControl(a.id);g.setDirectInput({fire:true,yaw:0,targetId:tank.id,aimX:1200,aimY:750});g.step(.05);assert.ok(g.effects.some(e=>e.sourceId===a.id&&e.splash===U.orbital_bombardment.splash));g.setDirectInput({});step(g,.6);assert.ok(tank.hp<tank.maxHp);assert.equal(base.hp,base.maxHp);
});
test('unarmed support and harvesters can be driven, never emit weapons or get pulled into AI orders',()=>{
 for(const kind of ['field_medic','satellite','harvester']){const g=arena(),a=g.spawn(0,kind,1000,750);g.spawn(0,'refinery',1400,750);g.ore=[{id:0,x:1400,y:1000,amount:1000,initial:1000}];g.beginDirectControl(a.id);g.command([a.id],1600,1000,true);assert.equal(a.order,null);g.setDirectInput({forward:1,yaw:0,flightEnabled:true,fire:true,targetId:g.entities[1].id});step(g,.4);assert.ok(a.x>1000);assert.equal(a.order,null);assert.equal(a.target,null);assert.ok(!g.effects.some(e=>e.sourceId===a.id));}
});
test('friendly AI runs production, construction and other-unit orders only during direct control',()=>{
 const g=arena();g.teams[0].money=50000;g.spawn(0,'barracks',500,400);g.spawn(0,'factory',500,520);const a=g.spawn(0,'tank',1000,750),capturer=g.spawn(0,'ifv',1100,850);let calls=0;const ai=g.ai.bind(g);g.ai=(t,dt)=>{if(t.id===0)calls++;return ai(t,dt);};g.beginDirectControl(a.id);g.setDirectInput({forward:1,yaw:0,flightEnabled:true});g.step(.05);assert.equal(calls,1);assert.ok(g.teams[0].queue.length>0);assert.ok(g.teams[0].buildQueue.length>0);assert.ok(capturer.order);assert.equal(a.order,null);g.endDirectControl();step(g,.4);assert.equal(calls,1);assert.ok(capturer.order);
});
test('EMP clears held inputs and requires a fresh command; destruction automatically exits',()=>{
 const g=arena(),a=g.spawn(0,'tank',1000,750);g.beginDirectControl(a.id);g.setDirectInput({forward:1,yaw:0,fire:true});g.step(.05);a.disabled=g.time+.2;const x=a.x;step(g,.3);assert.equal(a.x,x);assert.equal(g.directControl.input.forward,0);assert.equal(g.directControl.input.fire,false);g.setDirectInput({forward:1,yaw:0,flightEnabled:true});g.step(.05);assert.ok(a.x>x);g.damage(a,a.maxHp*3,1);assert.equal(g.directControl,null);assert.equal(a.manualMove,false);
});
test('zero-time pause does not move, fire, run AI or advance simulation; save/load discards driving state',()=>{
 const g=arena(),a=g.spawn(0,'tank',1000,750),beforeAI=g.teams[0].aiClock;g.beginDirectControl(a.id);g.setDirectInput({forward:1,yaw:0,fire:true});const old=JSON.stringify(g.save()),tick=g.tick;g.step(0);assert.equal(JSON.stringify(g.save()),old);assert.equal(g.tick,tick);g.step(.05);const saved=g.save();assert.ok(!('directControl'in saved));assert.equal(saved.entities.find(e=>e.id===a.id).manualMove,false);assert.equal(saved.teams[0].aiClock,beforeAI);const copy=Game.load(JSON.stringify(saved));assert.equal(copy.directControl,null);assert.equal(copy._directTeamAI,null);assert.equal(copy.get(a.id).manualMove,false);assert.equal(copy.get(a.id).x,a.x);const x=copy.get(a.id).x;step(copy,.1);assert.equal(copy.get(a.id).x,x);
});
test('hit feedback comes from actual controlled-projectile damage, after shielding and overkill limits',()=>{
 const g=arena(),a=g.spawn(0,'tank',1000,750),target=g.spawn(1,'tank',1150,750);target.disabled=999;target.hp=20;g.beginDirectControl(a.id);g.setDirectInput({fire:true,targetId:target.id,yaw:0});g.step(.05);assert.equal(g.directFeedback,null);const shot=g.effects.find(e=>e.sourceId===a.id);assert.ok(shot);const origin={x:shot.x,y:shot.y};g.setDirectInput({});step(g,.4);assert.equal(g.directFeedback.sourceId,a.id);assert.equal(g.directFeedback.targetId,target.id);assert.equal(g.directFeedback.damage,20);assert.ok(g.directFeedback.hitAt>.05);assert.equal(target.lastHitSourceId,a.id);assert.equal(target.lastHitFrom.x,origin.x);assert.equal(target.lastHitFrom.y,origin.y);
 g.endDirectControl();g.beginDirectControl(a.id);const other=g.spawn(0,'ifv',900,750),enemy=g.spawn(1,'tank',1150,750);g.damage(enemy,10,0,{sourceId:other.id,x:other.x,y:other.y});assert.equal(g.directFeedback,null);g.damage(enemy,0,0,{sourceId:a.id,x:a.x,y:a.y});assert.equal(g.directFeedback,null);const friend=g.spawn(0,'tank',1080,750);g.damage(friend,10,0,{sourceId:a.id,x:a.x,y:a.y});assert.equal(g.directFeedback,null);
 const shield=g.spawn(1,'shield',1150,750);g.spawn(1,'power',1300,750);g.spawn(1,'power',1400,750);g.spatial.rebuild(g.entities);const hp=enemy.hp;g.damage(enemy,100,0,{sourceId:a.id,x:a.x,y:a.y});assert.ok(Math.abs(g.directFeedback.damage-(hp-enemy.hp))<1e-9);assert.ok(g.directFeedback.damage<100);assert.equal(g.rangeProfile(shield).active,true);
});
test('incoming projectiles provide actual firing coordinates and misses never create hit confirmation',()=>{
 const g=arena(),a=g.spawn(0,'tank',1000,750),enemy=g.spawn(1,'tank',1150,750);g.beginDirectControl(a.id);g.setDirectInput({fire:true,yaw:0,targetId:null});g.step(.05);const miss=g.effects.find(e=>e.sourceId===a.id);assert.equal(miss.miss,true);g.setDirectInput({});step(g,.6);assert.equal(g.directFeedback,null);assert.equal(a.lastHitSourceId,enemy.id);assert.equal(a.lastHitFrom.x,1150);assert.equal(a.lastHitFrom.y,750);assert.ok(a.lastHitFrom.time>0);
});
test('directly controlled medical units keep healing and corvettes keep passive interception without primary auto-fire',()=>{
 const g=arena(),medic=g.spawn(0,'field_medic',1000,750),inf=g.spawn(0,'infantry',1020,750);inf.hp-=40;const hp=inf.hp;g.beginDirectControl(medic.id);step(g,.3);assert.ok(inf.hp>hp);assert.ok(!g.effects.some(e=>e.sourceId===medic.id));g.endDirectControl();const ship=g.spawn(0,'escort_corvette',1000,100),enemy=g.spawn(1,'fighter',1100,100);enemy.disabled=999;g.beginDirectControl(ship.id);const rocket={type:'shot',rocket:true,from:1,x:1190,y:100,tx:1000,ty:100,ttl:2,max:2,damage:100};g.effects.push(rocket);g.step(.05);assert.equal(rocket.type,'intercepted');assert.ok(!g.effects.some(e=>e.sourceId===ship.id));assert.equal(enemy.hp,enemy.maxHp);assert.equal(g.directFeedback,null);
});

test('manual projectiles keep the aimed impact point and miss a target that leaves its original hit area',()=>{
 const g=arena(),a=g.spawn(0,'tank',1000,750),target=g.spawn(1,'tank',1150,750);target.disabled=999;g.beginDirectControl(a.id);g.setDirectInput({fire:true,targetId:target.id,yaw:0,aimX:1140,aimY:750,aimHeight:14});g.step(.05);const shot=g.effects.find(e=>e.sourceId===a.id);assert.equal(shot.tx,1140);assert.equal(shot.targetHeight,14);assert.equal(shot.directHitArea.x,1150);g.setDirectInput({});target.y+=100;step(g,.5);assert.equal(target.hp,target.maxHp);assert.equal(g.directFeedback,null);
 // Strategic AI weapons retain their original targeting behavior.
 g.endDirectControl();a.cool=0;g.emitShot(a,target);const strategic=g.effects.find(e=>e.type==='shot');assert.equal(strategic.directHitArea,undefined);target.y+=100;step(g,.5);assert.ok(target.hp<target.maxHp);
});
