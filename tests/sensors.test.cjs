const test=require('node:test'),assert=require('node:assert/strict');
for(const f of ['data','roster','equipment','sim'])require('../src/'+f);
const S=require('../src/sensors');
function arena(mode='published',scale=1){const g=new WarSim.Game({map:'desert',faction:'chn',enemies:1,buffs:[],rangeMode:mode,metersPerUnit:scale,abilities:false});g.entities=[];g.effects=[];g.ore=[];g.ai=()=>{};g.spawn(0,'hq',300,300);g.spawn(1,'hq',5700,3500);g.spawn(0,'power',600,600);g.teams.forEach(t=>{t.queue=[];t.buildQueue=[];});return g;}
function target(kind,x,y=1000,altitude=0){return{kind,team:1,id:999,hp:100,maxHp:100,x,y,altitude,disabled:0};}
test('classic sensor queries preserve legacy circles, fallback building vision and interception distances',()=>{const g=arena('balanced'),r=g.spawn(0,'radar',1000,1000);assert.equal(S.sightRadius(g,r),750);r.disabled=999;assert.equal(S.sightRadius(g,r),330);r.disabled=0;assert(S.detects(g,r,target('infantry',1700)));const c=g.spawn(0,'ciws',1200,1000);assert.equal(S.interceptionRange(g,c),330);});
test('public radar has separate near optical and air-only horizon-limited instrumented range',()=>{const g=arena(),r=g.spawn(0,'radar',1000,1000),p=S.profiles(g,r);assert.equal(p.find(p=>p.type==='radar').meters,400000);assert.equal(S.sightRadius(g,r),1500);assert(S.detects(g,r,target('fighter',11000,1000,65)));assert(!S.detects(g,r,target('fighter',151000,1000,65)));assert(S.detects(g,r,target('fighter',151000,1000,1800)));assert(!S.detects(g,r,target('fighter',451000,1000,100000)));for(const k of ['infantry','tank','submarine','power','satellite'])assert(!S.detects(g,r,target(k,11000,1000,k==='satellite'?4000:0)),k);});
test('electronic contact coverage stops with EMP or power loss while limited optical observation remains',()=>{const g=arena(),r=g.spawn(0,'radar',1000,1000),air=target('fighter',11000,1000,65);assert(S.detects(g,r,air));r.disabled=100;assert(!S.detects(g,r,air));assert(S.sightRadius(g,r)>0&&S.sightRadius(g,r)<=1500);r.disabled=0;for(let i=0;i<4;i++)g.spawn(0,'laser',2000+i*70,1500);assert(!S.detects(g,r,air));assert.equal(S.profiles(g,r).find(p=>p.type==='radar').active,false);});
test('civilian orbital swath is a scalable coverage analogy, never personnel or submarine identification',()=>{const g=arena(),e=g.spawn(0,'orbital_mapper',1000,1000);e.altitude=4000;let p=S.profiles(g,e).find(p=>p.type==='orbital');assert.equal(S.sightRadius(g,e),0);assert(Math.abs(p.meters-145000*400000/786000)<1e-8);assert.equal(p.reference.status,'inferred');assert.equal(p.reveal,'explored');assert(S.detects(g,e,target('power',3000)));for(const k of ['infantry','operator','tank','submarine','fighter'])assert(!S.detects(g,e,target(k,3000,1000,k==='fighter'?65:0)),k);e.altitude=8000;assert.equal(S.profiles(g,e).find(p=>p.type==='orbital').meters,p.meters*2);g.options.metersPerUnit=10;assert.equal(S.profiles(g,e).find(p=>p.type==='orbital').radius,p.meters*2/10);});
test('ordinary space combat sensors observe only orbit and never reveal terrain',()=>{const g=arena(),e=g.spawn(0,'orbital',1000,1000);e.altitude=4000;assert.equal(S.sightRadius(g,e),0);assert(S.profiles(g,e).every(p=>!p.terrainReveal));assert(S.detects(g,e,target('satellite',1300,1000,4000)));assert(!S.detects(g,e,target('tank',1300)));assert(!S.detects(g,e,target('fighter',1300,1000,65)));});
test('public sensor entity visibility does not inherit global terrain fog or observe submerged contacts without sonar',()=>{const g=arena(),r=g.spawn(0,'radar',1000,1000),tank=target('tank',4000),sub=target('submarine',4000,1000,-55);g.visible.fill(1);assert(!S.entityVisible(g,0,tank));assert(!S.entityVisible(g,0,sub));assert(S.entityVisible(g,0,target('fighter',4000,1000,65)));g.buffs.add('vision');assert(S.entityVisible(g,0,tank));assert(S.entityVisible(g,0,sub));g.buffs.delete('vision');r.hp=0;assert(!S.entityVisible(g,0,target('fighter',4000,1000,65)));});
test('public building CIWS attack, interceptor mechanics and range hint all use the selected calibre analogy',()=>{const g=arena('published',10),c=g.spawn(0,'ciws',1000,1000),range=S.interceptionRange(g,c);assert.equal(range,g.weaponRangeProfile(c).range);const fx={type:'shot',rocket:true,from:1,x:c.x+range-1,y:c.y,sourceHeight:8,tx:c.x,ty:c.y,targetHeight:0,ttl:2,max:2,damage:10};g.effects.push(fx);assert.equal(WarCombatProjectiles.interceptionPlan(g,c)?.range,range);fx.x=c.x+range+1;assert.equal(WarCombatProjectiles.interceptionPlan(g,c),null);assert.equal(S.zones(g,c).find(z=>z.type==='intercept').radius,range);});
test('sensor profiles stay finite and have bounded setup work for huge public footprints',()=>{const g=arena();for(const kind of ['radar','early_warning_aircraft','satellite','orbital_mapper','orbital_sensor','orbital','sonar_bastion']){const e=g.spawn(0,kind,1800,1200);if(WarData.U[kind]?.space)e.altitude=12000;const before=JSON.stringify(e),list=S.profiles(g,e);assert(list.length<=4);for(const p of list){assert(Number.isFinite(p.radius)&&p.radius>=0);assert(p.reference.status);assert.equal(p.radius*g.options.metersPerUnit,p.meters);}assert.equal(JSON.stringify(e),before);}});

test('generic defense public choices keep separate official gun/system evidence and inferred building status',()=>{
 for(const [kind,meters,id] of [['turret',4000,'skyranger35_gun'],['ciws',3000,'skyranger30_gun'],['sam',25000,'nasams_spanish']]){
  const p=WarWeaponRanges.getProfile(kind,'usa').primary;assert.equal(p.status,'inferred');assert.equal(p.estimateM,meters);assert.equal(p.publishedM,null);assert.deepEqual(p.referenceIds,[id]);assert.equal(WarWeaponRanges.catalog[id].publishedM,meters);
 }
});

test('huge sensor rings retain offscreen sources, display metric evidence and submit only clipped fixed-budget lines',()=>{
 require('../src/ranges');const e={id:1,team:0,kind:'radar',hp:100,x:-10000,y:0},p={zones:[{type:'radar',label:'对空雷达量程上限',radius:400000,unit:'metric',domains:['air'],reference:{status:'inferred'},active:true}],active:true};let calls=0;
 const renderer={width:800,height:600,toScreen(x,y){calls++;return{x:x+400,y:y+300};}},g={get:()=>e,rangeProfile:()=>p,formatRangeDistance:v=>v/1000+' km',rangeReferenceLabel:()=> '同类估算'},records=WarRanges.collect(g,{selection:new Set([1]),rangeMode:'selected'},renderer);assert.equal(records.length,1);assert.match(records[0].label,/400 km.*同类估算/);
 const lines=[],texts=[],ctx={save(){},restore(){},setLineDash(){},beginPath(){},moveTo(x,y){lines.push([x,y]);},lineTo(x,y){lines.push([x,y]);},stroke(){},measureText(){return{width:300};},fillRect(){},fillText(t){texts.push(t);}};
 WarRanges.draw(ctx,renderer,records);assert(calls<=74);assert(lines.length<=144);assert(lines.every(([x,y])=>x>=0&&x<=800&&y>=0&&y<=600));assert(texts.some(t=>/覆盖当前视野/.test(t)));assert.equal(p.zones[0].radius,400000);
 e.x=-399900;calls=0;lines.length=0;WarRanges.draw(ctx,renderer,records.map(r=>({...r,x:e.x})));assert(calls<=74);assert(lines.length>0&&lines.length<=144);assert(lines.every(([x,y])=>x>=-1e-6&&x<=800+1e-6&&y>=-1e-6&&y<=600+1e-6));
});

function observedShot(kind,stationId,range){
 const g=arena('published',10),e=g.spawn(0,kind,1000,1000),t=g.spawn(1,'tank',1000+range,1000);g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.map.tiles.fill(0);for(const tree of WarTrees.ensure(g))WarTrees.damage(g,tree.id,tree.maxHp);
 e.angle=e.turret=0;t.disabled=1e9;t.hp=t.maxHp=10000;const w=g.vehicleWeapons(e).find(w=>w.stationId===stationId);assert(w);e.weaponId=w.id;
 if(!g.entityVisible)g.entityVisible=(team,target)=>S.entityVisible(g,team,target);assert(g.entityVisible(0,t));
 for(let i=0;i<40;i++){g.time+=.05;WarCombatReadiness.step(g,e,.05,{target:t,weapon:w,intentFire:true});}g.spatial.rebuild(g.entities);assert(g.emitShot(e,t));const fx=g.effects.find(f=>f.type==='shot');assert(fx);return{g,e,t,fx};
}
test('actual launched kinetic shot keeps physical impact after the observing unit is lost',()=>{
 const {g,e,t,fx}=observedShot('tank','main_gun',250);assert.equal(fx.projectile.kind,'kinetic');e.hp=0;g.visible.fill(0);assert(!g.entityVisible(0,t));assert(WarCombatProjectiles.canImpact(g,fx,t));assert(!WarCombatProjectiles.canTrack(g,fx,t));const before=t.hp;
 for(let i=0;i<20;i++)g.step(.05);assert(t.hp<before);const hp=t.hp;g.step(.1);assert.equal(t.hp,hp);
});
test('actual guided missile stops tracking a live target after contact loss without losing physical collision eligibility',()=>{
 const {g,e,t,fx}=observedShot('destroyer','land_attack',300);assert.equal(fx.projectile.kind,'guided');e.hp=0;g.visible.fill(0);assert(!g.entityVisible(0,t));assert(WarCombatProjectiles.canImpact(g,fx,t));
 for(let i=0;i<12;i++)g.step(.05);assert.equal(fx.projectile.phase,'coast');assert.equal(fx.projectile.lockId,null);assert.equal(t.hp,t.maxHp);
});

test('projectile expiry follows the owning map dimensions, not shared legacy constants',()=>{
 require('../src/map-dimensions');const g=arena(),e=g.spawn(0,'tank',1800,1500),w=g.vehicleWeapons(e)[0];Object.assign(g.map,WarMapDimensions.forMap('english_channel'),{id:'english_channel'});g.entities=[];g.spatial.rebuild([]);
 const shot={type:'shot',sourceId:e.id,sourceKind:e.kind,from:0,weaponFamily:'cannon',x:6500,y:4500,sourceHeight:20,tx:7000,ty:4500,targetHeight:20,ttl:2,max:2,damage:20,weaponDomains:['ground']},fx=WarCombatProjectiles.decorateLaunch(g,e,w,shot);assert.equal(WarCombatProjectiles.step(g,fx,.1).expired,false);Object.assign(g.map,WarMapDimensions.forMap('desert'),{id:'desert'});assert.equal(WarCombatProjectiles.step(g,fx,.1).expired,true);assert.equal(WarData.W,6144);
});

test('sensor profile cache reuses immutable values and invalidates semantic state immediately',()=>{
 const g=arena(),r=g.spawn(0,'radar',1000,1000),air=target('fighter',11000,1000,65),a=S.profiles(g,r);assert.strictEqual(S.profiles(g,r),a);assert(Object.isFrozen(a)&&Object.isFrozen(a[0].reference));
 r.disabled=g.time+20;const emp=S.profiles(g,r);assert.notStrictEqual(emp,a);assert(!S.detects(g,r,air));r.disabled=0;assert(S.detects(g,r,air));
 const supplies=g.entities.filter(e=>e.team===0&&WarData.B[e.kind]?.power>0);for(const e of supplies)e.hp=0;assert(!S.detects(g,r,air));for(const e of supplies)e.hp=e.maxHp;assert(S.detects(g,r,air));
 const restored=S.profiles(g,r);r.x=200000;assert.strictEqual(S.profiles(g,r),restored);assert(!S.detects(g,r,air),'movement must change contact without a profile allocation');r.x=1000;
 g.options.metersPerUnit=10;assert.notStrictEqual(S.profiles(g,r),restored);assert.equal(S.sightRadius(g,r),150);
 const mapper=g.spawn(0,'orbital_mapper',1000,1000),m=S.profiles(g,mapper);mapper.altitude*=2;assert.notStrictEqual(S.profiles(g,mapper),m);assert.equal(S.profiles(g,mapper).find(p=>p.type==='orbital').meters,m.find(p=>p.type==='orbital').meters*2);
});

test('one contact query shares a live power scan across electronic observers without per-pair profile allocation',()=>{
 const g=arena(),radars=Array.from({length:12},(_,i)=>g.spawn(0,'radar',1000+i*30,1000));for(let i=0;i<10;i++)g.spawn(0,'power',300+i*40,1500);const far=target('fighter',800000,1000,1800);let reads=0;const power=g.power.bind(g);g.power=team=>{reads++;return power(team);};assert(!S.unitsInSight(g,far,radars));assert.equal(reads,1);const cached=radars.map(r=>S.profiles(g,r));reads=0;assert(!S.unitsInSight(g,far,radars));assert.equal(reads,1);radars.forEach((r,i)=>assert.strictEqual(S.profiles(g,r),cached[i]));
});

test('high aircraft optical terrain footprint contracts with height and cannot expose personnel beyond 3D optics',()=>{
 const g=arena('published',10),e=g.spawn(0,'fighter',1000,1000),p=S.profiles(g,e).find(p=>p.type==='optical');e.altitude=p.radius*.6;assert(Math.abs(S.sightRadius(g,e)-p.radius*.8)<1e-8);assert.equal(S.terrainZones(g,e)[0].r,S.sightRadius(g,e));
 e.altitude=p.radius+1;assert.equal(S.sightRadius(g,e),0);assert(!S.detects(g,e,target('infantry',e.x,e.y)));assert(S.detects(g,e,target('fighter',e.x,e.y,e.altitude)));g.options.rangeMode='balanced';assert.equal(S.sightRadius(g,e),WarData.U.fighter.sight);
});

test('actual public SAM can engage and hit a radar-only air contact outside optical terrain visibility',()=>{
 const g=arena('published',10),radar=g.spawn(0,'radar',800,1200),sam=g.spawn(0,'sam',1200,1000),t=g.spawn(1,'fighter',2200,1000);t.altitude=65;t.disabled=1e9;t.hp=t.maxHp=10000;g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.map.tiles.fill(0);for(const tree of WarTrees.ensure(g))WarTrees.damage(g,tree.id,tree.maxHp);g.spawn(0,'power',600,1000);g.updateFog();assert(!g.visibleAt(t.x,t.y));assert(g.entityVisible(0,t));
 for(let i=0;i<40;i++){g.time+=.05;WarCombatReadiness.step(g,sam,.05,{target:t,intentFire:true});}g.spatial.rebuild(g.entities);assert(g.emitShot(sam,t));const shot=g.effects.find(f=>f.type==='shot');assert(shot);assert(WarCombatProjectiles.canTrack(g,shot,t));
 for(let i=0;i<200&&t.hp===t.maxHp;i++)g.step(.05);assert(t.hp<t.maxHp,'radar contact must not be discarded by optical-only impact gating');radar.disabled=g.time+10;assert(!g.entityVisible(0,t));
});
