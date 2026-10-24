/* Actual aircraft sorties from a moving deck. Capacity, timings and deck motion are game-scale. */
(function(root){
 'use strict';
 const {U,W,H}=root.WarData,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const deckPhases=new Set(['prepare','takeoff','landing','taxi','lineup','service']);
 const fixedKinds=['naval_strike_aircraft','close_support_aircraft','interceptor'];
 const carrier=e=>e?.kind==='carrier';
 function config(g,c){const rotor=g.teams[c.team]?.faction==='kor';return{capacity:rotor?2:3,rotor,kinds:rotor?['escort_helicopter']:fixedKinds,serviceSeconds:5,launchInterval:4,description:rotor?'旋翼航空舰 · 护航职责近似':'舰载航空联队 · 现有原创职责近似'};}
 function ensure(g,c){
  if(!carrier(c))return null;const cfg=config(g,c);
  if(!c.airWing)c.airWing={capacity:cfg.capacity,slots:Array.from({length:cfg.capacity},(_,i)=>({planeId:null,kind:cfg.kinds[i%cfg.kinds.length],readyAt:g.time+2})),mission:null,nextLaunchAt:g.time+2};
  return c.airWing;
 }
 function deck(g,c){
  const shape=root.WarNavigationFootprints.bounds['carrier_'+g.teams[c.team].faction],length=shape?shape[4]-shape[3]:170;
  return{start:-length*.30,end:length*.32,cross:-5,height:g.entityAltitude(c)+(g.teams[c.team].faction==='kor'?1.99:2.29)*5.4};
 }
 function point(c,along,cross=0){const a=c.angle||0;return{x:c.x+Math.cos(a)*along-Math.sin(a)*cross,y:c.y+Math.sin(a)*along+Math.cos(a)*cross};}
 function deckHeight(g,c,e){const shape=root.WarNavigationFootprints.bounds[e.kind+'_'+g.teams[e.team].faction];return deck(g,c).height+Math.max(3,-(shape?.[1]||0)+1);}
 function attached(e){return !!e.flight?.deck&&deckPhases.has(e.flight.phase);}
 function occupied(g,c,except){return g.entities.some(e=>e.hp>0&&e.id!==except?.id&&e.flight?.homeId===c.id&&(attached(e)||e.flight.phase==='approach'));}
 function compatible(g,c,e){return carrier(c)&&c.hp>0&&c.team===e.team&&config(g,c).kinds.includes(e.kind);}
 function canRecover(g,c,e){if(!compatible(g,c,e))return false;const wing=ensure(g,c);return wing.slots.some(s=>s.planeId===e.id||s.planeId===null||!g.get(s.planeId));}
 function adopt(g,c,e){
  if(!canRecover(g,c,e))return false;const wing=ensure(g,c),slot=wing.slots.find(s=>s.planeId===e.id)||wing.slots.find(s=>!g.get(s.planeId));
  slot.planeId=e.id;slot.kind=e.kind;e.carrierOriginId=c.id;e.flight.homeId=c.id;return true;
 }
 function phase(e,name){if(e.flight.phase!==name){e.flight.phase=name;e.flight.elapsed=0;}}
 function align(g,c,e){const f=e.flight,q=point(c,f.deck.along,f.deck.cross);e.x=clamp(q.x,1,W-1);e.y=clamp(q.y,1,H-1);e.angle=c.angle||0;e.altitude=deckHeight(g,c,e);e.pitch=0;e.roll=0;}
 function kindFor(g,c,target){const cfg=config(g,c),domain=target?g.targetDomain(target.kind):'ground';return cfg.kinds.find(k=>g.targetDomains(k).includes(domain))||null;}
 function requestStrike(g,c,targetOrPoint){
  if(!carrier(c)||c.hp<=0||!g.operational(c)||!targetOrPoint)return false;
  const target=Number.isInteger(targetOrPoint.id)?g.get(targetOrPoint.id):null;
  if(target&&(!g.isEnemy(c.team,target.team)||!g.canDetect(c.team,target)))return false;
  if(Number.isInteger(targetOrPoint.id)&&!target)return false;
  const p=target||targetOrPoint;if(![p.x,p.y].every(Number.isFinite)||p.x<0||p.y<0||p.x>W||p.y>H)return false;
  const range=g.rangeProfile(c).attack;if(dist(c,p)>range+.001)return false;
  const kind=kindFor(g,c,target);if(!kind)return false;
  const wing=ensure(g,c);wing.mission={x:p.x,y:p.y,targetId:target?.id??null,kind,until:g.time+180};
  c.cool=Math.max(c.cool||0,g.vehicleWeapons?.(c).find(w=>w.action==='airWing')?.reload||U.carrier.reload);return true;
 }
 function mission(g,c){const w=ensure(g,c),m=w.mission;if(!m)return null;const target=m.targetId&&g.get(m.targetId);if(m.until<g.time||(m.targetId&&!target)){w.mission=null;return null;}if(target&&g.canDetect(c.team,target)){m.x=target.x;m.y=target.y;}return m;}
 function assignMission(g,c,e,m){
  if(g.directControl?.id===e.id||e.flight?.returning)return;
  const t=m?.targetId&&g.get(m.targetId);if(m&&(!t||g.canTargetKind(e,t.kind))){
   const order=e.order;if(!order||order.target!==(t?.id??null)||dist(order,m)>120){g.command([e.id],m.x,m.y,true,t?.id??null);if(e.order)e.order.carrierMission=true;}
  }else{if(e.order?.carrierMission){e.order=null;e.target=null;}if(!e.order){const p=point(c,260,140);e.flight.anchor={x:clamp(p.x,240,W-240),y:clamp(p.y,240,H-240)};}}
 }
 function canLaunch(g,c){if(!carrier(c)||c.hp<=0||!g.operational(c))return false;const w=ensure(g,c);return g.time>=w.nextLaunchAt&&!occupied(g,c)&&!g.entities.some(e=>e.hp>0&&e.flight?.homeId===c.id&&e.flight.returning&&dist(c,e)<650);}
 function launch(g,e,c){const d=deck(g,c);e.flight={phase:'prepare',homeId:c.id,elapsed:0,airtime:0,anchor:point(c,260,140),deck:{along:d.start,cross:d.cross}};e.carrierOriginId=c.id;e.flightSpeed=0;e.pitch=e.roll=0;align(g,c,e);}
 function updateCarrier(g,c,dt){
  if(!carrier(c)||dt<=0)return null;
  if(c.hp<=0){for(const e of g.entities)if(e.hp>0&&e.flight?.homeId===c.id&&attached(e))e.hp=0;return null;}
  const w=ensure(g,c);
  if(c._carrierTick===g.tick)return status(g,c);c._carrierTick=g.tick;
  // Deck occupants follow the hull even while the player has released mouse lock.
  for(const e of g.entities)if(e.hp>0&&e.flight?.homeId===c.id&&attached(e))align(g,c,e);
  const m=mission(g,c);
  for(const slot of w.slots){
   const e=g.get(slot.planeId);
   if(slot.planeId!==null&&(!e||e.carrierOriginId!==c.id)){
    slot.planeId=null;slot.readyAt=g.time+Math.max(8,U[slot.kind]?.time||20);
   }
   if(e&&e.carrierOriginId===c.id)assignMission(g,c,e,m);
  }
  if(!m||!canLaunch(g,c)||g.entities.filter(e=>e.hp>0).length>=950)return status(g,c);
  const available=w.slots.filter(s=>s.planeId===null&&s.readyAt<=g.time),slot=available.find(s=>s.kind===m.kind)||available.find(s=>g.canAfford(c.team,g.cost(c.team,s.kind||m.kind)));if(!slot)return status(g,c);
  const kind=slot.kind||m.kind,cost=g.cost(c.team,kind);if(g.spend(c.team,cost)===null)return status(g,c);
  const p=point(c,deck(g,c).start,deck(g,c).cross),e=g.spawn(c.team,kind,p.x,p.y);launch(g,e,c);slot.planeId=e.id;slot.kind=kind;
  w.nextLaunchAt=g.time+config(g,c).launchInterval;assignMission(g,c,e,m);return status(g,c);
 }
 function groundStep(g,e,c,dt){
  const f=e.flight;if(!f.deck||!deckPhases.has(f.phase))return false;
  f.elapsed+=dt;const d=deck(g,c),cfg=config(g,c),before={x:e.x,y:e.y,angle:e.angle},max=g.effectiveSpeed(e),rotor=!root.WarAircraftFlight.fixed(e);
  align(g,c,e);
  if(!g.operational(c)){root.WarVehicleMotion.stop(e);return true;}
  if(f.phase==='prepare'){
   root.WarVehicleMotion.stop(e);
   if(f.elapsed>=1.5&&!occupied(g,c,e)){if(rotor){delete f.deck;phase(e,'climb');}else phase(e,'takeoff');}
  }else if(f.phase==='takeoff'){
   e.flightSpeed=Math.min(max*.8,e.flightSpeed+max*.85*dt);f.deck.along+=e.flightSpeed*dt;align(g,c,e);
   if(e.flightSpeed>=max*.7||f.deck.along>=d.end){delete f.deck;phase(e,'climb');e.pitch=.18;}
  }else if(f.phase==='landing'){
   e.flightSpeed=Math.max(0,e.flightSpeed-max*1.15*dt);f.deck.along=Math.min(d.end,f.deck.along+e.flightSpeed*dt);align(g,c,e);
   if(e.flightSpeed<=.1){phase(e,'taxi');e.retreating=false;}
  }else if(['taxi','lineup'].includes(f.phase)){
   const delta=d.start-f.deck.along;f.deck.along+=clamp(delta,-25*dt,25*dt);e.flightSpeed=Math.abs(delta)>1?25:0;align(g,c,e);
   if(Math.abs(delta)<1){f.deck.along=d.start;phase(e,'service');root.WarVehicleMotion.stop(e);}
  }else if(f.phase==='service'){
   root.WarVehicleMotion.stop(e);e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.10*dt);
   if(f.elapsed>=cfg.serviceSeconds&&e.hp>=e.maxHp){
    f.returning=false;e.retreating=false;f.airtime=0;f.resume=null;phase(e,'prepare');assignMission(g,c,e,mission(g,c));
   }
  }
  root.WarVehicleMotion.record(e,before,dt,e.flightSpeed>0?1:0,0,g.tick);return true;
 }
 function updateReturn(g,e,c,dt,flight){
  const f=e.flight,d=deck(g,c),max=g.effectiveSpeed(e),a=c.angle||0,dx=e.x-c.x,dy=e.y-c.y,along=dx*Math.cos(a)+dy*Math.sin(a),cross=-dx*Math.sin(a)+dy*Math.cos(a),end=point(c,d.start,d.cross),height=deckHeight(g,c,e);
  if(!root.WarAircraftFlight.fixed(e)){
   const distance=dist(e,end);
   if(occupied(g,c,e)){phase(e,'return');flight.rotorMove(g,e,point(c,-250,220),120,dt);return true;}
   if(distance<Math.max(8,max*dt*2)){
    phase(e,'approach');e.x=end.x;e.y=end.y;e.altitude=Math.max(height,e.altitude-45*dt);root.WarVehicleMotion.stop(e);
    if(e.altitude<=height){f.deck={along:d.start,cross:d.cross};phase(e,'service');e.retreating=false;align(g,c,e);}return true;
   }
   phase(e,'return');flight.rotorMove(g,e,end,120,dt);return true;
  }
  if(f.phase!=='approach'){
   phase(e,'return');const side=cross<0?-1:1,route=[point(c,-650,side*330),point(c,-650,d.cross),point(c,-260,d.cross)];let stage=f.returnStage||0,goal=route[stage];
   if(stage<2&&dist(e,goal)<145){f.returnStage=++stage;goal=route[stage];}
   if(occupied(g,c,e))goal=flight.loiterGoal(g,e,point(c,-500,0));
   flight.move(g,e,goal,160,max*.68,dt,1.05);
   if(stage===2&&along<d.start-90&&Math.abs(cross-d.cross)<60&&Math.abs(root.WarVehicleMotion.angleDelta(a,e.angle))<.55&&!occupied(g,c,e))phase(e,'approach');
   if(stage===2&&along>d.start-40)f.returnStage=0;
  }else{
   if(occupied(g,c,e)||Math.abs(root.WarVehicleMotion.angleDelta(a,e.angle))>1){phase(e,'return');f.returnStage=0;return true;}
   const distance=dist(e,end),before={x:e.x,y:e.y,angle:e.angle},speed=max*.65,step=Math.min(distance,speed*dt);
   e.angle+=clamp(root.WarVehicleMotion.angleDelta(Math.atan2(end.y-e.y,end.x-e.x),e.angle),-dt*1.3,dt*1.3);
   e.x+=Math.cos(e.angle)*step;e.y+=Math.sin(e.angle)*step;e.altitude+=clamp(height+Math.max(0,distance-25)*.27-e.altitude,-60*dt,60*dt);
   e.pitch=-.13;e.roll*=Math.max(0,1-dt*4);e.flightSpeed=speed;root.WarVehicleMotion.record(e,before,dt,.4,0,g.tick);
   if(distance<=Math.max(8,speed*dt*1.5)&&e.altitude<=height+12){f.deck={along:d.start,cross:d.cross};phase(e,'landing');e.flightSpeed=max*.35;align(g,c,e);}
   else if(along>d.start+20){phase(e,'return');f.returnStage=0;}
  }return true;
 }
 function status(g,c){const w=ensure(g,c);if(!w)return null;const planes=w.slots.map(s=>g.get(s.planeId)).filter(Boolean),m=w.mission;return{...config(g,c),active:planes.length,airborne:planes.filter(e=>!attached(e)).length,onDeck:planes.filter(attached).length,repairing:planes.filter(e=>e.flight?.phase==='service').length,planeIds:planes.map(e=>e.id),mission:m,waitingForFunds:!!m&&!g.canAfford(c.team,g.cost(c.team,m.kind)),replacementCost:m?g.cost(c.team,m.kind):0};}
 function validate(e){
  const finite=Number.isFinite,w=e.airWing,f=e.flight;
  if(e.carrierOriginId!==undefined&&(!Number.isInteger(e.carrierOriginId)||e.carrierOriginId<1))return false;
  if(f?.deck&&(!U[e.kind]?.air||!deckPhases.has(f.phase)||![f.deck.along,f.deck.cross].every(finite)||Math.abs(f.deck.along)>150||Math.abs(f.deck.cross)>50||!Number.isInteger(f.homeId)))return false;
  if(!w)return true;
  if(!carrier(e)||![2,3].includes(w.capacity)||!Array.isArray(w.slots)||w.slots.length!==w.capacity||!finite(w.nextLaunchAt))return false;
  const ids=w.slots.map(s=>s.planeId).filter(id=>id!==null);if(new Set(ids).size!==ids.length)return false;
  if(w.slots.some(s=>!(s.planeId===null||Number.isInteger(s.planeId)&&s.planeId>0)||!(s.kind===null||[...fixedKinds,'escort_helicopter'].includes(s.kind))||!finite(s.readyAt)))return false;
  const m=w.mission;return m===null||!!m&&[m.x,m.y,m.until].every(finite)&&m.x>=0&&m.y>=0&&m.x<=W&&m.y<=H&&[...fixedKinds,'escort_helicopter'].includes(m.kind)&&(m.targetId===null||Number.isInteger(m.targetId)&&m.targetId>0);
 }
 function validateGame(g){
  for(const c of g.entities.filter(e=>e.hp>0&&e.airWing)){
   const cfg=config(g,c);
   if(!validate(c)||c.airWing.capacity!==cfg.capacity||c.airWing.slots.some(s=>!cfg.kinds.includes(s.kind))||(c.airWing.mission&&!cfg.kinds.includes(c.airWing.mission.kind)))return false;
   for(const s of c.airWing.slots){const e=g.get(s.planeId);if(e&&(!e.flight||e.team!==c.team||e.carrierOriginId!==c.id||e.kind!==s.kind||!config(g,c).kinds.includes(e.kind)))return false;}
  }
  for(const e of g.entities)if(e.hp>0&&e.flight?.deck){const c=g.get(e.flight.homeId);if(!c||!compatible(g,c,e)||!c.airWing?.slots.some(s=>s.planeId===e.id))return false;}
  return true;
 }
 root.WarCarrierOperations={config,ensure,deck,point,deckHeight,attached,occupied,compatible,canRecover,adopt,requestStrike,canLaunch,launch,updateCarrier,groundStep,updateReturn,status,validate,validateGame};
})(globalThis);
