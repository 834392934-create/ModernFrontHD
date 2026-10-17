const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data.js');require('../src/roster.js');require('../src/sim.js');
const {Game}=WarSim,{U,ROSTER}=WarData;
function arena(){const g=new Game({faction:'chn',enemies:1,buffs:['vision'],playerOnlyTech:false,aiSpaceWeapons:true});g.entities=[];g.ore=[];g.spawn(0,'hq',300,300);g.spawn(1,'hq',2700,1800);g.teams.forEach(t=>{t.aiClock=999999;t.money=0;});return g;}
function tick(g,s){for(let i=0;i<s*20;i++)g.step(.05);}
function hit(g,e){g.spatial.rebuild(g.entities);const before=e.hp;g.damage(e,100,0);return before-e.hp;}
test('eight tactical roles add two units per domain without inheriting real equipment names',()=>{
 assert.equal(ROSTER.tacticalWave.length,8);for(const domain of ['ground','naval','air','space'])assert.equal(ROSTER.tacticalWave.filter(k=>U[k].unitGroup===domain).length,2);assert.equal(Object.keys(U).length,64);for(const k of ROSTER.tacticalWave){assert.equal(U[k].index,undefined);assert.equal(U[k].roleVariant,true);}assert.equal(U.orbital_shield.combatRole,'support');
});
test('mobile shield protects only friendly orbit, includes itself, never stacks and stops on EMP/death',()=>{
 const g=arena(),a=g.spawn(1,'orbital_shield',1000,750),b=g.spawn(1,'orbital_shield',1020,750),orbit=g.spawn(1,'orbital',1040,750),plane=g.spawn(1,'fighter',1040,760),tank=g.spawn(1,'tank',1040,770),enemy=g.spawn(0,'orbital',1040,780);
 assert.equal(hit(g,orbit),75);assert.equal(hit(g,a),75);assert.equal(hit(g,plane),100);assert.equal(hit(g,tank),100);assert.equal(hit(g,enemy),100);
 a.disabled=999;b.hp=0;assert.equal(hit(g,orbit),100);a.disabled=0;orbit.x=1300;assert.equal(hit(g,orbit),100);orbit.x=1040;assert.equal(hit(g,orbit),75);
 const profile=g.rangeProfile(a);assert.deepEqual(profile.zones.find(z=>z.type==='shield').domains,['space']);a.disabled=999;assert.equal(g.rangeProfile(a).active,false);
});
test('mobile and powered base shields choose the strongest eligible field without stacking',()=>{
 const g=arena(),mobile=g.spawn(1,'orbital_shield',1000,750),base=g.spawn(1,'shield',1040,750),e=g.spawn(1,'orbital',1070,750);g.spawn(1,'power',1500,750);g.spawn(1,'power',1600,750);assert.ok(g.power(1)>=0);assert.ok(Math.abs(hit(g,e)-100*(1-WarData.B.shield.shield))<1e-8);base.disabled=999;assert.equal(hit(g,e),75);mobile.disabled=999;assert.equal(hit(g,e),100);
});
test('aerial maintenance heals aircraft but never land, sea or orbit, including direct control and save/load',()=>{
 const g=arena(),repair=g.spawn(0,'air_repair_drone',1000,750),samples=['fighter','tank','destroyer','orbital'].map((k,i)=>{const e=g.spawn(0,k,1030+i*3,750);e.hp-=80;e.disabled=999;return e;});const hp=samples.map(e=>e.hp);g.beginDirectControl(repair.id);tick(g,.5);samples.forEach((e,i)=>assert.equal(e.hp>hp[i],i===0));assert.ok(!g.effects.some(e=>e.sourceId===repair.id));const copy=Game.load(JSON.stringify(g.save()));assert.ok(copy.get(repair.id));assert.equal(copy.directControl,null);
});
test('fleet command and naval jamming change only ship cooldowns and follow friendly ships',()=>{
 const g=arena(),command=g.spawn(1,'fleet_command_ship',1000,100),jam=g.spawn(0,'electronic_warfare_ship',1100,100),ship=g.spawn(1,'destroyer',1150,100),air=g.spawn(1,'fighter',1150,100);assert.equal(g.cooldownMultiplier(ship),1);jam.disabled=999;assert.equal(g.cooldownMultiplier(ship),.8);command.disabled=999;assert.equal(g.cooldownMultiplier(ship),1);command.disabled=0;jam.disabled=0;assert.equal(g.cooldownMultiplier(air),1);
 ship.x=1300;g.commandSupport(1,g.teamEntities(1).filter(e=>!e.structure));assert.ok(command.order);assert.equal(command.order.attack,false);
});
test('shield AI follows orbit and unarmed support stays legal under the AI orbital ban',()=>{
 const g=arena(),shield=g.spawn(1,'orbital_shield',1000,750),escort=g.spawn(1,'orbital_escort',1400,750);g.spawn(1,'spaceport',2200,1500);g.teams[1].money=1e6;g.commandSupport(1,[shield,escort]);assert.ok(shield.order);assert.equal(shield.order.attack,false);g.setAISpaceWeapons(false);assert.ok(g.get(shield.id));assert.equal(g.train(1,'orbital_shield'),true);assert.equal(g.train(1,'orbital_missile_barge'),false);const save=Game.load(JSON.stringify(g.save()));assert.ok(save.get(shield.id));
});
test('mobile CIWS intercepts hostile rockets while directly controlled and cannot intercept torpedoes',()=>{
 const g=arena(),ciws=g.spawn(0,'mobile_ciws',1000,750);g.beginDirectControl(ciws.id);const rocket={type:'shot',rocket:true,from:1,x:1100,y:750,tx:1000,ty:750,ttl:2,max:2,damage:100},torpedo={...rocket,rocket:false,weaponFx:'torpedo'};g.effects.push(rocket,torpedo);tick(g,.05);assert.equal(rocket.type,'intercepted');assert.equal(torpedo.type,'shot');assert.equal(g.rangeProfile(ciws).zones.find(z=>z.type==='intercept').radius,220);
});
test('orbital missile splash hits orbital groups, excludes aircraft, and can be intercepted',()=>{
 const g=arena(),a=g.spawn(0,'orbital_missile_barge',1000,750),target=g.spawn(1,'orbital',1300,750),near=g.spawn(1,'satellite',1320,750),plane=g.spawn(1,'fighter',1310,750);target.disabled=near.disabled=plane.disabled=999;g.emitShot(a,target);assert.equal(g.effects[0].rocket,true);tick(g,.6);assert.ok(target.hp<target.maxHp);assert.ok(near.hp<near.maxHp);assert.equal(plane.hp,plane.maxHp);
 a.cool=0;const ciws=g.spawn(1,'mobile_ciws',1200,750);g.emitShot(a,target);const missile=g.effects.find(e=>e.type==='shot');tick(g,.05);assert.equal(missile.type,'intercepted');
});
