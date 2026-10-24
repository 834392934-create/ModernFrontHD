const test=require('node:test'),assert=require('node:assert/strict');require('../src/data.js');require('../src/roster.js');require('../src/sim.js');const {Game}=WarSim,{U}=WarData;
function arena(options={}){const g=new Game({faction:'chn',enemies:1,buffs:['vision'],...options});g.entities=[];g.ore=[];g.map.blocked.fill(0);g.spawn(0,'hq',500,500);g.spawn(1,'hq',5000,3000);g.teams.forEach(t=>{t.money=0;t.aiClock=9999;});g.teams[1].faction='usa';return g;}
function protect(g,player){g.beginDirectControl(player.id);g.ai(g.teams[0],.05);}
test('protection assigns valid nearest counters, base guards and player escorts without commanding the driver',()=>{const g=arena(),player=g.spawn(0,'tank',1800,1000),aa=g.spawn(0,'aa',600,500),guard=g.spawn(0,'tank',550,500),escort=g.spawn(0,'tank',1750,1000),extra=g.spawn(0,'ifv',1700,1000),air=g.spawn(1,'fighter',700,500),enemy=g.spawn(1,'tank',1950,1000);protect(g,player);assert.equal(player.order,null);assert.equal(aa.order?.target,air.id);assert.equal(escort.order?.target,enemy.id);assert.ok(g.protectionStatus.baseThreats>0&&g.protectionStatus.playerThreats>0);assert.equal(g.protectionStatus.guardIds.length,2);assert.ok(g.protectionStatus.escortIds.includes(escort.id));assert.match(g.protectionStatus.summary,/基地/);for(const e of [aa,guard,escort,extra])if(e.order?.target)assert.equal(g.canTargetKind(e.kind,g.get(e.order.target).kind),true);});
test('reserved base guards stay home when general AI launches its offensive',()=>{const g=arena(),player=g.spawn(0,'tank',1800,1000);for(let i=0;i<10;i++)g.spawn(0,'tank',550+i*70,600);g.time=200;g.teams[0].attackAt=0;protect(g,player);assert.equal(g.protectionStatus.guardIds.length,2);for(const id of g.protectionStatus.guardIds){const e=g.get(id);assert.ok(!e.order||Math.hypot(e.order.x-500,e.order.y-500)<350);assert.notEqual(e.order?.target,g.entities[1].id);}assert.equal(player.order,null);});
test('critical driver receives compatible repair escort and retreat advice without forced movement or invulnerability',()=>{const g=arena(),player=g.spawn(0,'fighter',1800,1000),repair=g.spawn(0,'air_repair_drone',1300,1000),wrong=g.spawn(0,'field_medic',1600,1000);player.altitude=700;player.hp=player.maxHp*.2;protect(g,player);assert.ok(g.protectionStatus.critical);assert.ok(g.protectionStatus.supportIds.includes(repair.id));assert.ok(!g.protectionStatus.supportIds.includes(wrong.id));assert.ok(repair.altitude>65&&repair.altitude<700);assert.ok(repair.order);assert.ok(g.protectionStatus.fallback);assert.equal(player.order,null);const hp=player.hp;g.spatial.rebuild(g.entities);g.damage(player,10,1);assert.ok(player.hp<hp);});
test('production prioritizes missing counters while respecting funds and technology gates',()=>{const g=arena(),player=g.spawn(0,'tank',1800,1000);g.spawn(0,'factory',700,500);g.spawn(0,'power',900,500);g.spawn(1,'fighter',700,500);g.teams[0].money=5000;protect(g,player);assert.ok(g.teams[0].queue.length);assert.ok(g.canTargetKind(g.teams[0].queue[0].kind,'fighter'));const limited=arena({advanced:false}),p=limited.spawn(0,'tank',1800,1000);limited.spawn(0,'factory',700,500);limited.spawn(1,'orbital',700,500);protect(limited,p);assert.equal(limited.teams[0].queue.length,0);assert.equal(limited.teams[0].money,0);});
test('base threat assessment uses the actual fighter faction instead of another faction loadout',()=>{
 for(const faction of ['chn','usa']){
  const g=arena(),player=g.spawn(0,'tank',1800,1000);g.teams[1].faction=faction;
  const defense=g.spawn(0,'aa',600,500),air=g.spawn(1,'fighter',700,500);
  protect(g,player);
  assert.equal(g.protectionStatus.baseThreats>0,faction==='usa',faction+' ground-attack capability');
  assert.equal(defense.order?.target===air.id,faction==='usa',faction+' needs a counter only when it can threaten the base');
 }
});
test('power deficit inserts power first without cancelling paid work',()=>{const g=arena(),player=g.spawn(0,'tank',1800,1000);g.spawn(0,'factory',700,500);g.spawn(0,'airfield',700,700);g.teams[0].money=10000;const old={kind:'refinery',x:1100,y:600,remaining:20,total:20,paid:1400};g.teams[0].buildQueue.push(old);protect(g,player);assert.equal(g.teams[0].buildQueue[0].kind,'power');assert.ok(g.teams[0].buildQueue.includes(old));});
test('protection respects detection and operational status and runs only on bounded AI ticks',()=>{const g=arena({buffs:[]}),player=g.spawn(0,'tank',1800,1000);g.spawn(0,'tank',600,500);const enemy=g.spawn(1,'tank',1850,1000);g.visible.fill(0);protect(g,player);assert.equal(g.protectionStatus.playerThreats,0);g.buffs.add('vision');enemy.disabled=999;g.teams[0].aiClock=0;g.ai(g.teams[0],.05);assert.equal(g.protectionStatus.playerThreats,0);let n=0;const run=g.updatePlayerProtection.bind(g);g.updatePlayerProtection=(...args)=>{n++;return run(...args);};for(let i=0;i<100;i++)g.ai(g.teams[0],.05);assert.ok(n>=4&&n<=6,n);});
test('exit and saves remove transient protection orders and restore original player AI clocks',()=>{const g=arena(),player=g.spawn(0,'tank',1800,1000),guard=g.spawn(0,'tank',550,500);g.teams[0].aiClock=123;g.teams[0].attackAt=456;protect(g,player);assert.ok(guard.protectionRole);const copy=Game.load(JSON.stringify(g.save()));assert.equal(copy.protectionStatus,null);assert.equal(copy.get(guard.id).protectionRole,undefined);assert.equal(copy.get(guard.id).order,null);g.endDirectControl();assert.equal(g.protectionStatus,null);assert.equal(guard.protectionRole,undefined);assert.equal(guard.order,null);assert.equal(g.teams[0].aiClock,123);assert.equal(g.teams[0].attackAt,456);});
test('emergency repair consumes actual funds, respects cooldown and ability toggle',()=>{
 for(const enabled of [true,false]){const g=arena({abilities:enabled}),p=g.spawn(0,'tank',1800,1000);p.hp=p.maxHp*.2;g.teams[0].money=400;protect(g,p);
 assert.equal(g.teams[0].money,enabled?0:400);assert.ok(Math.abs(p.hp/p.maxHp-(enabled?.65:.2))<.0001);
 if(enabled){assert.equal(g.cooldowns.repair,70);p.hp=p.maxHp*.2;g.teams[0].money=400;g.teams[0].aiClock=0;g.ai(g.teams[0],.05);assert.equal(g.teams[0].money,400);assert.equal(p.hp,p.maxHp*.2);}}
});
test('underwater and orbit repair follow their own depth layer and heal during simulation',()=>{
 for(const [kind,healer,height] of [['submarine','abyss_tender',-130],['orbital','orbital_repair',6000]]){
 const g=arena({abilities:false}),p=g.spawn(0,kind,1500,1000),support=g.spawn(0,healer,1510,1000);g.map.navalBlocked.fill(0);p.altitude=height;p.hp=p.maxHp*.5;
 protect(g,p);assert.ok(g.protectionStatus.supportIds.includes(support.id));assert.notEqual(support.altitude,height);
 for(let i=0;i<140;i++)g.step(.05);assert.ok(p.hp>p.maxHp*.5);assert.ok(Math.abs(support.altitude-height)<=U[healer].range);assert.equal(p.order,null);
 }
});
test('inaccessible island troops are not reported as guards, escorts or repair support',()=>{
 const g=arena(),p=g.spawn(0,'tank',1800,1000),far=g.spawn(0,'tank',3000,1000),repair=g.spawn(0,'repair_vehicle',3000,1100);
 for(let y=0;y<WarData.ROWS;y++)g.map.blocked[y*WarData.COLS+50]=1;
 protect(g,p);assert.ok(!g.protectionStatus.guardIds.includes(far.id));assert.ok(!g.protectionStatus.escortIds.includes(far.id));assert.ok(!g.protectionStatus.supportIds.includes(repair.id));assert.equal(far.protectionRole,undefined);
});
test('coastal response uses a reachable sea attack destination without a land target overriding it',()=>{
 const g=arena(),p=g.spawn(0,'tank',1800,1000),ship=g.spawn(0,'destroyer',1800,180),enemy=g.spawn(1,'tank',1900,500);
 g.spawn(0,'tank',550,500);g.spawn(0,'tank',600,500);
 g.map.navalBlocked.fill(1);for(let y=0;y<8;y++)for(let x=0;x<WarData.COLS;x++)g.map.navalBlocked[y*WarData.COLS+x]=0;
 protect(g,p);assert.ok(ship.order?.attack);assert.equal(ship.order.target,null);assert.equal(g.map.navalBlocked[Math.floor(ship.order.y/48)*WarData.COLS+Math.floor(ship.order.x/48)],0);
 const hp=enemy.hp;for(let i=0;i<160;i++)g.step(.05);assert.ok(enemy.hp<hp,'coastal automatic fire actually damages the threat');assert.ok(ship.y<384);
});
