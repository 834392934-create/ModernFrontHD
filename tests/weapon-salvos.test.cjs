const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data');require('../src/roster');require('../src/equipment');require('../src/sim');
const S=WarWeaponSalvos;
function arena(kind='rocket',faction='chn',options={}){
 const g=new WarSim.Game({map:'desert',faction,enemies:1,buffs:['vision'],advanced:true,playerOnlyTech:false,aiSpaceWeapons:true,...options});
 g.entities=[];g.effects=[];g.ore=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.map.tiles.fill(0);g.ai=()=>{};
 g.spawn(0,'hq',200,200);g.spawn(1,'hq',WarData.W-300,WarData.H-300);
 g.teams.forEach(t=>{t.aiClock=1e9;t.money=0;t.queue=[];t.buildQueue=[];});
 const e=g.spawn(0,kind,2000,1800);e.angle=0;e.cool=0;const r=g.rangeProfile(e),distance=Math.max(r.min+100,Math.min(r.attack-100,400));
 return{g,e,point:{x:e.x+distance,y:e.y,height:g.entityAltitude(e)}};
}
function emit(a,target=null,extra={}){const {g,e,point}=a,aim={...point,...extra,fixedImpact:true},w=g.vehicleWeapon(e,target),R=WarCombatReadiness;
 // Exercise real preparation/traverse time; never force setupReady or clear a chamber.
 for(let i=0;i<100&&!R.status(g,e,w,target,{aimX:aim.x,aimY:aim.y,aimHeight:aim.height}).canFire;i++){g.time+=.05;R.step(g,e,.05,{weapon:w,target,aimX:aim.x,aimY:aim.y,aimHeight:aim.height,moving:false});}
 assert.equal(g.emitShot(e,target,aim),true);return g.effects.at(-1);}
function finish(g,seconds=3){for(let i=0;i<seconds/.05;i++){g.time+=.05;S.update(g);}}
test('actual port counts, timed independent projectiles, conserved total damage and one reload charge',()=>{
 for(const [f,count]of Object.entries(S.counts)){
  const a=arena('rocket',f);emit(a);assert.equal(a.g.effects.length,1);assert(S.active(a.g,a.e));const cool=a.e.cool;
  a.g.time+=.08;S.update(a.g);assert.equal(a.g.effects.length,1);finish(a.g);assert.equal(a.g.effects.length,count);assert.equal(a.e.cool,cool);
  assert.equal(S.active(a.g,a.e),false);assert.deepEqual(a.g.effects.map(f=>f.portIndex),Array.from({length:count},(_,i)=>i));
  assert(Math.abs(a.g.effects.reduce((n,f)=>n+f.baseDamage,0)-WarData.U.rocket.damage)<1e-8);
  assert.equal(new Set(a.g.effects.map(f=>f.firedAt)).size,count);assert.equal(new Set(a.g.effects.map(f=>f.tx.toFixed(3))).size,count);assert.equal(new Set(a.g.effects.map(f=>f.ty.toFixed(3))).size,count);
 }
 const a=arena('orbital_missile_barge');emit(a);finish(a.g);assert.equal(a.g.effects.length,8);assert(a.g.effects.every(f=>f.targetDomain==='space'));
});
test('balanced defaults can be explicitly configured; no second trigger while a burst is pending',()=>{
 const a=arena('rocket','usa',{weaponSalvos:{rocket:{totalDamageMultiplier:2,reloadMultiplier:1.5,interval:.2}}});emit(a);assert.equal(a.e.cool,WarData.U.rocket.reload*1.5);
 a.e.cool=0;assert.equal(a.g.emitShot(a.e,null,a.point),false);finish(a.g);assert.equal(a.g.effects.length,6);assert(Math.abs(a.g.effects.reduce((n,f)=>n+f.baseDamage,0)-WarData.U.rocket.damage*2)<1e-8);
});
test('frozen area endpoints do not follow moving targets; valid live port origins are used for later shots',()=>{
 const a=arena(),t=a.g.spawn(1,'tank',a.point.x,a.point.y);a.g.beginDirectControl(a.e.id);
 const origins=Array.from({length:8},(_,i)=>({x:a.e.x+20,y:a.e.y+i,height:14}));a.g.directControl.input={fire:true,aimOrigins:origins};
 emit(a,t,{origins});const first={...a.g.effects[0]};t.x+=500;t.y+=700;
 a.g.directControl.input.aimOrigins=origins.map(o=>({...o,x:o.x+10}));finish(a.g);
 assert.equal(a.g.effects[0].tx,first.tx);assert.equal(a.g.effects[0].ty,first.ty);assert.equal(a.g.effects[1].x,origins[1].x+10);assert.equal(a.g.effects[1].y,origins[1].y);
 assert(a.g.effects.every(f=>Math.hypot(f.tx-a.point.x,f.ty-a.point.y)<80));
});
test('local origin snapshot follows the moving source without inventing additional port offsets',()=>{
 const a=arena('rocket','usa');emit(a,null,{origin:{x:a.e.x+20,y:a.e.y+3,height:12}});
 a.e.x+=5;a.e.y+=7;a.e.angle=Math.PI/2;a.g.time+=.16;S.update(a.g);
 const f=a.g.effects[1];assert(Math.abs(f.x-(a.e.x-3))<1e-6);assert(Math.abs(f.y-(a.e.y+20))<1e-6);
});
test('stop, move, EMP, source death, faction change and control loss cancel only unlaunched rounds',()=>{
 for(const mode of ['stop','move','emp','death','team','release','exit','takeover']){
  const a=arena();if(['release','exit'].includes(mode)){a.g.beginDirectControl(a.e.id);a.g.directControl.input.fire=true;}emit(a);
  if(mode==='stop')S.cancel(a.g,a.e,'stop');if(mode==='move')a.e.order={x:100,y:100,attack:false};if(mode==='emp')a.e.disabled=99;if(mode==='death')a.e.hp=0;if(mode==='team')a.e.team=1;
  if(mode==='release')a.g.directControl.input.fire=false;if(mode==='exit')a.g.endDirectControl();if(mode==='takeover')a.g.beginDirectControl(a.e.id);
  finish(a.g);assert.equal(a.g.effects.length,1,mode);assert.equal(S.active(a.g,a.e),false,mode);assert(a.e.cool>0,mode+' no reload refund');
 }
});
test('paused simulation is frozen; save/load keeps in-flight rounds and cooldown but cannot resume an ephemeral queue',()=>{
 const a=arena();emit(a);const before=JSON.stringify(a.g.effects),time=a.g.time,cool=a.e.cool;
 for(let i=0;i<5;i++)a.g.step(0);assert.equal(a.g.time,time);assert.equal(JSON.stringify(a.g.effects),before);assert.equal(a.e.cool,cool);
 const loaded=WarSim.Game.load(a.g.save()),e=loaded.get(a.e.id);assert.equal(S.active(loaded,e),false);assert.equal(e.cool,cool);assert.equal(loaded.effects.length,1);
 finish(loaded);assert.equal(loaded.effects.length,1);assert.equal(e.cool,cool);
});
test('free ground coverage damages legal enemy units without a target id, never allies or air/space/underwater units',()=>{
 const a=arena(),g=a.g,e=a.e,enemy=g.spawn(1,'tank',a.point.x,a.point.y),friend=g.spawn(0,'tank',a.point.x,a.point.y),air=g.spawn(1,'fighter',a.point.x,a.point.y),space=g.spawn(1,'orbital_shield',a.point.x,a.point.y),sub=g.spawn(1,'submarine',a.point.x,a.point.y);
 for(const t of [enemy,friend,air,space,sub]){t.hp=1e5;t.disabled=99999;}
 emit(a);for(let i=0;i<80;i++)g.step(.05);
 assert(enemy.hp<1e5,'independent splash damage');for(const t of [friend,air,space,sub])assert.equal(t.hp,1e5,t.kind+' immune');
 assert(e.cool>0);assert(!S.active(g,e));
});
test('space barge area splash respects space-only domains and minimum range guard',()=>{
 const a=arena('orbital_missile_barge'),enemy=a.g.spawn(1,'orbital_shield',a.point.x,a.point.y),ground=a.g.spawn(1,'tank',a.point.x,a.point.y);
 enemy.hp=ground.hp=1e5;enemy.disabled=ground.disabled=99999;emit(a);for(let i=0;i<80;i++)a.g.step(.05);
 assert(enemy.hp<1e5);assert.equal(ground.hp,1e5);
 const fx={salvoRangeOrigin:{x:0,y:0,height:0},salvoRangeMin:120,salvoProjected:true};assert.equal(S.canImpact(a.g,fx,{x:119,y:0}),false);assert.equal(S.canImpact(a.g,fx,{x:120,y:0}),true);
});
test('edge-of-range spread never extends launch endpoints through minimum/maximum range',()=>{
 for(const edge of ['min','max']){
  const a=arena(),r=a.g.rangeProfile(a.e);a.point.x=a.e.x+(edge==='min'?r.min+1:r.attack-1);emit(a);finish(a.g);
  assert.equal(a.g.effects.length,8);for(const f of a.g.effects){const d=Math.hypot(f.tx-a.e.x,f.ty-a.e.y,f.targetHeight-a.g.entityAltitude(a.e));assert(d>=r.min-1e-6&&d<=r.attack+1e-6);}
 }
});
test('cannon, personnel AT and interceptors remain single-shot; AI enters the same salvo path',()=>{
 for(const kind of ['tank','antitank_team','orbital_interceptor','aa']){
  const a=arena(kind);emit(a);finish(a.g);assert.equal(a.g.effects.length,1,kind);assert.equal(S.profile(a.g,a.e),null);
 }
 const a=arena(),t=a.g.spawn(1,'tank',a.point.x,a.point.y);t.hp=1e6;t.disabled=99999;a.e.target=t.id;
 for(let i=0;i<60&&!a.g.effects.some(f=>f.sourceId===a.e.id&&f.salvoCount===8);i++)a.g.step(.05);
 assert(a.g.effects.some(f=>f.sourceId===a.e.id&&f.salvoCount===8));assert(S.active(a.g,a.e));
});
test('cosmetic effect budget cannot silently delete live damage projectiles',()=>{
 const a=arena();a.e.disabled=99999;
 for(let i=0;i<900;i++)a.g.effects.push({type:'shot',x:100,y:100,tx:101,ty:100,ttl:10,max:10,damage:0,from:0});
 for(let i=0;i<900;i++)a.g.effects.push({type:'impact',x:100,y:100,ttl:10,max:10});
 a.g.step(.05);assert.equal(a.g.effects.filter(f=>f.type==='shot').length,900);assert.equal(a.g.effects.filter(f=>f.type==='impact').length,650);
 assert.equal(WarSim.Game.load(a.g.save()).effects.length,1550);
});
