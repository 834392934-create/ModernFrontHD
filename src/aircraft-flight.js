/* Deterministic game-scale flight phases, independent of ground pathfinding. */
(function(root){
 'use strict';
 const {U,W,H,T,COLS}=root.WarData,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const labels={prepare:'起飞准备',lineup:'滑行进入跑道',takeoff:'加速滑跑',climb:'离地爬升',cruise:'巡航',attack:'攻击通场',egress:'脱离转弯',loiter:'空中待命',return:'返航',approach:'对正进近',landing:'减速着陆',taxi:'滑行停机',service:'停机维修',manual:'手动驾驶'};
 const groundPhases=new Set(['prepare','lineup','takeoff','landing','taxi','service']);
 const supported=e=>!!U[e.kind]?.air&&!U[e.kind].space;
 const fixed=e=>supported(e)&&(U[e.kind].modelKind||e.kind)!=='heli';
 const point=(r,s)=>({x:r.x+Math.cos(r.angle)*s,y:r.y+Math.sin(r.angle)*s});
 function groundHeight(g,e){return Math.max(12,-(root.WarNavigationFootprints.bounds[e.kind+'_'+g.teams[e.team].faction]?.[1]||0)+3);}
 function runwayContains(r,p,margin=0){const dx=p.x-r.x,dy=p.y-r.y,c=Math.cos(r.angle),s=Math.sin(r.angle),along=dx*c+dy*s;return along>=-margin&&along<=r.length+margin&&Math.abs(-dx*s+dy*c)<=r.width/2+margin;}
 function validRunway(g,r,field){
  for(let s=0;s<=r.length;s+=24)for(const side of [-r.width/2,0,r.width/2]){const p=point(r,s),x=p.x-Math.sin(r.angle)*side,y=p.y+Math.cos(r.angle)*side;if(x<90||y<90||x>W-90||y>H-90||g.map.blocked[Math.floor(y/T)*COLS+Math.floor(x/T)])return false;}
  const approach=point(r,-600);if(approach.x<120||approach.y<120||approach.x>W-120||approach.y>H-120)return false;
  return !g.entities.some(o=>o.hp>0&&o.structure&&o.id!==field.id&&runwayContains(r,o,o.r+20))&&!g.ore.some(o=>runwayContains(r,o,60));
 }
 function runway(g,field){
  if(field.runway&&validRunway(g,field.runway,field))return field.runway;
  // Retain an occupied runway even if a newly introduced obstruction requires waiting.
  if(field.runway&&g.entities.some(e=>e.hp>0&&e.flight?.homeId===field.id&&groundPhases.has(e.flight.phase)))return field.runway;
  for(const offset of [230,360,510,660])for(let i=0;i<8;i++){
   const angle=i*Math.PI/4,c=Math.cos(angle),s=Math.sin(angle),r={x:field.x-s*offset-c*180,y:field.y+c*offset-s*180,angle,length:360,width:160};
   if(validRunway(g,r,field)){field.runway=r;for(const tree of root.WarTrees?.ensure(g)||[])if(tree.hp>0&&runwayContains(r,tree,12))root.WarTrees.damage(g,tree.id,tree.maxHp,{x:field.x,y:field.y});return r;}
  }
  return null;
 }
 function occupied(g,field,e){return g.entities.some(o=>o.hp>0&&o.id!==e?.id&&o.flight?.homeId===field.id&&(o.flight.phase==='approach'||groundPhases.has(o.flight.phase)&&o.flight.phase!=='service'));}
 function runwayClear(g,field,e){const r=field.runway;return r&&validRunway(g,r,field)&&!g.entities.some(o=>o.hp>0&&o.id!==e.id&&o.id!==field.id&&g.entityAltitude(o)<45&&runwayContains(r,o,g.navigationRadius(o)+4));}
 function launchPosition(g,field,kind){const r=runway(g,field),probe={kind,team:field.team,id:-1};if(!r||occupied(g,field)||!runwayClear(g,field,probe))return null;return point(r,0);}
 function launch(g,e,field){
  if(!supported(e))return;
  e.altitude=groundHeight(g,e);e.flightSpeed=0;e.pitch=e.roll=0;
  e.flight={phase:'prepare',homeId:field.id,elapsed:0,airtime:0,anchor:{x:e.x,y:e.y}};
  if(fixed(e))e.angle=field.runway.angle;
 }
 function state(g,e){return e.flight||(e.flight={phase:'cruise',elapsed:0,airtime:0,anchor:{x:e.x,y:e.y},cruiseAltitude:Math.max(160,g.entityAltitude(e))});}
 function phase(f,p){if(f.phase!==p){f.phase=p;f.elapsed=0;}}
 function home(g,e){const f=state(g,e),old=g.get(f.homeId);if(old?.kind==='airfield'&&old.team===e.team)return old;const next=g.teamEntities(e.team).filter(o=>o.kind==='airfield').sort((a,b)=>distance(a,e)-distance(b,e))[0];f.homeId=next?.id??null;return next;}
 function requestReturn(g,e){if(!supported(e))return false;const f=state(g,e),base=home(g,e);if(!base)return false;f.returning=true;f.returnStage=0;e.retreating=true;e.order=null;e.orderQueue=[];e.target=null;e.path=[];if(!groundPhases.has(f.phase))phase(f,'return');return true;}
 function command(g,e){if(!supported(e))return;const f=state(g,e);f.returning=false;e.retreating=false;f.egress=null;f.airtime=0;if(['return','approach','landing'].includes(f.phase))phase(f,'climb');}
 function stop(g,e){if(!supported(e))return;command(g,e);const f=state(g,e);f.anchor={x:e.x,y:e.y};f.resume=null;}
 function clearance(g,e,x,y){return g.flightFloor(e,x,y);}
 function aheadFloor(g,e,x,y,range=200){
  let floor=clearance(g,e,x,y);
  for(let s=0;s<=range;s+=40)floor=Math.max(floor,clearance(g,e,x+Math.cos(e.angle)*s,y+Math.sin(e.angle)*s));
  return floor;
 }
 function move(g,e,goal,altitude,speed,dt,turnRate=.85){
  const m=root.WarVehicleMotion,before={x:e.x,y:e.y,angle:e.angle},desired=Math.atan2(goal.y-e.y,goal.x-e.x),delta=m.angleDelta(desired,e.angle),turn=clamp(delta,-turnRate*dt,turnRate*dt);
  e.angle+=turn;e.flightSpeed+=(clamp(speed,0,g.effectiveSpeed(e)*1.1)-e.flightSpeed)*Math.min(1,dt*1.3);
  const dx=Math.cos(e.angle)*e.flightSpeed*dt,dy=Math.sin(e.angle)*e.flightSpeed*dt,r=g.navigationRadius(e)+4;
  const nx=clamp(e.x+dx,r,W-r),ny=clamp(e.y+dy,r,H-r),floor=aheadFloor(g,e,nx,ny,Math.max(180,e.flightSpeed*2));
  const old=g.entityAltitude(e),wanted=clamp(Math.max(altitude,floor),25,1800);
  e.altitude=Math.max(clearance(g,e,nx,ny),old+clamp(wanted-old,-55*dt,75*dt));
  e.x=nx;e.y=ny;e.pitch+=(Math.atan2(e.altitude-old,Math.max(.001,e.flightSpeed*dt))-e.pitch)*Math.min(1,dt*3);
  e.roll+=(-turn/Math.max(.001,dt)*.55-e.roll)*Math.min(1,dt*4);
  m.record(e,before,dt,speed/g.effectiveSpeed(e),turn/Math.max(.001,dt),g.tick);e.flightSpeed=Math.hypot(dx,dy)/dt;
 }
 function loiterGoal(g,e,anchor){const radius=Math.max(130,g.effectiveSpeed(e)*1.15),a=Math.atan2(e.y-anchor.y,e.x-anchor.x)+.65;return{x:clamp(anchor.x+Math.cos(a)*radius,240,W-240),y:clamp(anchor.y+Math.sin(a)*radius,240,H-240)};}
 function runwayStep(g,e,field,dt){
  const f=e.flight,r=field?.runway;if(!r){phase(f,'climb');return false;}
  const m=root.WarVehicleMotion,before={x:e.x,y:e.y,angle:e.angle},max=g.effectiveSpeed(e),floor=groundHeight(g,e);
  if(!runwayClear(g,field,e)){e.flightSpeed=0;m.stop(e);return true;}
  e.angle=r.angle;e.roll=0;
  e.flightSpeed=f.phase==='landing'?Math.max(0,e.flightSpeed-max*.55*dt):Math.min(max*.8,e.flightSpeed+max*.28*dt);
  e.x+=Math.cos(e.angle)*e.flightSpeed*dt;e.y+=Math.sin(e.angle)*e.flightSpeed*dt;e.altitude=floor;
  e.pitch+=(0-e.pitch)*Math.min(1,dt*5);m.record(e,before,dt,f.phase==='landing'?0:1,0,g.tick);
  if(f.phase==='takeoff'&&e.flightSpeed>=max*.7){phase(f,'climb');e.pitch=.18;}
  if(f.phase==='landing'&&e.flightSpeed<=.1){phase(f,'taxi');e.flight.parking=null;e.retreating=false;}
  return true;
 }
 function groundStep(g,e,dt){
  if(!supported(e)||!e.flight)return false;const f=e.flight;
  if(!groundPhases.has(f.phase))return false;
  const base=home(g,e);if(!base){phase(f,'climb');e.altitude=Math.max(25,e.altitude);return false;}
  f.elapsed+=dt;
  if(['taxi','lineup'].includes(f.phase))return taxi(g,e,base,dt);
  if(f.phase==='prepare'){root.WarVehicleMotion.stop(e);if(f.elapsed>=1.5&&base.disabled<=g.time){if(fixed(e)){if(runwayClear(g,base,e))phase(f,'takeoff');}else phase(f,'climb');}return true;}
  if(f.phase==='service'){
   root.WarVehicleMotion.stop(e);if(base.disabled<=g.time)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.08*dt*(g.power(e.team)<0?.4:1));
   const manual=g.directControl?.id===e.id&&g.directControl.input.throttle>0;
   if((e.order||f.resume||manual)&&f.elapsed>=5&&e.hp>=e.maxHp&&!occupied(g,base,e)&&base.disabled<=g.time){if(!e.order&&f.resume){e.order=f.resume;f.resume=null;}f.returning=false;e.retreating=false;f.airtime=0;phase(f,fixed(e)?'lineup':'prepare');}
   return true;
  }
  return runwayStep(g,e,base,dt);
 }
 function taxi(g,e,base,dt){
  const f=e.flight,r=base.runway;if(!r){phase(f,'climb');return false;}
  if(f.phase==='taxi'&&!f.parking){
   for(let row=0;row<4&&!f.parking;row++)for(const side of [1,-1])for(let col=0;col<3;col++){
    const q=point(r,40+col*140),p={x:q.x-Math.sin(r.angle)*side*(180+row*160),y:q.y+Math.cos(r.angle)*side*(180+row*160)},probe={...e,kind:'tank'};
    if(root.WarNavigationFootprints.terrain(g,probe,p.x,p.y)&&!g.entities.some(o=>o.hp>0&&o.id!==e.id&&g.entityAltitude(o)<45&&distance(o,p)<g.navigationRadius(e)+g.navigationRadius(o)+12)){f.parking=p;break;}
   }
  }
  const goal=f.phase==='lineup'?point(r,0):f.parking;if(!goal){root.WarVehicleMotion.stop(e);return true;}
  const before={x:e.x,y:e.y,angle:e.angle},dd=distance(e,goal),angle=Math.atan2(goal.y-e.y,goal.x-e.x),delta=root.WarVehicleMotion.angleDelta(angle,e.angle);
  e.angle+=clamp(delta,-1.2*dt,1.2*dt);const speed=Math.min(32,dd*1.5)*Math.max(0,Math.cos(delta)),nx=e.x+Math.cos(e.angle)*speed*dt,ny=e.y+Math.sin(e.angle)*speed*dt;
  const probe={...e,kind:'tank'};
  if(root.WarNavigationFootprints.terrain(g,probe,nx,ny)&&!g.entities.some(o=>o.hp>0&&o.id!==e.id&&g.entityAltitude(o)<45&&distance(o,{x:nx,y:ny})<g.navigationRadius(e)+(o.structure?o.r:g.navigationRadius(o))+6)){e.x=nx;e.y=ny;}
  e.pitch=e.roll=0;e.flightSpeed=speed;root.WarVehicleMotion.record(e,before,dt,.2,delta,g.tick);
  if(dd<4){phase(f,f.phase==='lineup'?'prepare':'service');f.parking=null;root.WarVehicleMotion.stop(e);}
  return true;
 }
 function canFire(g,e,target){if(!supported(e))return true;const f=e.flight;if(f&&(groundPhases.has(f.phase)||['climb','return','approach'].includes(f.phase)))return false;return !fixed(e)||Math.abs(root.WarVehicleMotion.angleDelta(Math.atan2(target.y-e.y,target.x-e.x),e.angle))<.9;}
 function update(g,e,dt,target){
  if(!supported(e))return false;
  const f=state(g,e),max=g.effectiveSpeed(e);f.elapsed+=dt;f.airtime+=dt;e.path=[];
  if(f.phase==='manual')phase(f,'cruise');
  const base=g.get(f.homeId);
  if(!f.returning&&(e.hp<e.maxHp*.25||f.airtime>180)&&home(g,e)){f.resume=e.order?{...e.order}:null;requestReturn(g,e);}
  if(f.returning){
   const field=home(g,e),r=field&&(fixed(e)?runway(g,field):null);
   if(!field||(fixed(e)&&!r)){f.returning=false;e.retreating=false;phase(f,'loiter');f.anchor={x:e.x,y:e.y};}
   else if(!fixed(e)){
    const goal={x:field.x+field.r+90,y:field.y},dd=distance(e,goal);
    if(dd<12){e.x=goal.x;e.y=goal.y;e.altitude=Math.max(groundHeight(g,e),e.altitude-45*dt);root.WarVehicleMotion.stop(e);phase(f,'approach');if(e.altitude<=groundHeight(g,e)){phase(f,'service');e.retreating=false;}return true;}
    rotorMove(g,e,goal,Math.max(100,clearance(g,e,goal.x,goal.y)),dt);phase(f,'return');return true;
   }else{
    const start=point(r,-300),end=point(r,0),c=Math.cos(r.angle),s=Math.sin(r.angle),along=(e.x-r.x)*c+(e.y-r.y)*s,cross=-(e.x-r.x)*s+(e.y-r.y)*c;
    if(f.phase!=='approach'){
     phase(f,'return');
     const far=point(r,-600);let side=cross<0?-1:1;
     if(far.x-s*side*350<100||far.x-s*side*350>W-100||far.y+c*side*350<100||far.y+c*side*350>H-100)side=-side;
     const route=[{x:far.x-s*side*350,y:far.y+c*side*350},far,point(r,clamp(along+220,-450,-30))];
     let stage=f.returnStage||0,goal=route[stage];
     if(stage<2&&distance(e,goal)<160){f.returnStage=++stage;goal=route[stage];}
     move(g,e,occupied(g,field,e)?loiterGoal(g,e,start):goal,160,max*.55,dt);
     if(stage===2&&along< -120&&Math.abs(cross)<70&&Math.abs(root.WarVehicleMotion.angleDelta(r.angle,e.angle))<.5&&!occupied(g,field,e)&&runwayClear(g,field,e))phase(f,'approach');
     if(stage===2&&along> -50)f.returnStage=0;
    }else{
     // A stabilized final leg follows the runway heading; a blocked runway triggers a go-around.
     if(occupied(g,field,e)||!runwayClear(g,field,e)){phase(f,'return');return true;}
     const remaining=distance(e,end),before={x:e.x,y:e.y,angle:e.angle},speed=max*.55,step=Math.min(remaining,speed*dt);
     e.angle+=clamp(root.WarVehicleMotion.angleDelta(Math.atan2(end.y-e.y,end.x-e.x),e.angle),-dt*.9,dt*.9);
     e.x+=Math.cos(e.angle)*step;e.y+=Math.sin(e.angle)*step;e.altitude+=clamp(Math.max(groundHeight(g,e),groundHeight(g,e)+remaining/300*100)-e.altitude,-55*dt,55*dt);
     e.pitch=-.16;e.roll*=Math.max(0,1-dt*4);e.flightSpeed=speed;root.WarVehicleMotion.record(e,before,dt,.3,0,g.tick);
     if(remaining<Math.max(10,step*2)){e.altitude=groundHeight(g,e);phase(f,'landing');}
    }return true;
   }
  }
  if(f.phase==='climb'){
   if(fixed(e)){const goal={x:e.x+Math.cos(e.angle)*500,y:e.y+Math.sin(e.angle)*500};move(g,e,goal,160,max*.8,dt);}
   else{e.altitude+=60*dt;e.pitch=e.roll=0;root.WarVehicleMotion.stop(e);}
   if(e.altitude>=155){phase(f,'cruise');}return true;
  }
  const order=e.order,ordered=order?.target&&g.get(order.target);if(ordered&&g.canDetect(e.team,ordered))Object.assign(order,{x:ordered.x,y:ordered.y});
  const fight=target&&(!order||order.attack),goal=fight?target:order;
  if(!fixed(e)){
   if(goal&&!(fight&&g.engagementDistance(e,target)<=g.rangeProfile(e).attack)){rotorMove(g,e,goal,Math.max(100,g.entityAltitude(e)),dt);if(!fight&&distance(e,goal)<6){e.order=e.orderQueue?.shift()||null;e.manualMove=false;}}
   else{e.altitude=Math.max(e.altitude,clearance(g,e,e.x,e.y));root.WarVehicleMotion.stop(e);}phase(f,fight?'attack':goal?'cruise':'loiter');return true;
  }
  const cruise=fight&&U[target.kind]?.air?clamp(g.entityAltitude(target),100,1600):(f.cruiseAltitude??160);
  let aim=goal;
  if(f.egress&&g.time<f.egress.until){aim=f.egress;phase(f,'egress');}
  else if(fight){phase(f,'attack');if(distance(e,target)<Math.max(100,max*.7)){f.egress={x:clamp(e.x+Math.cos(e.angle)*max*2.6,240,W-240),y:clamp(e.y+Math.sin(e.angle)*max*2.6,240,H-240),until:g.time+2.6};aim=f.egress;phase(f,'egress');}}
  else if(order){phase(f,'cruise');if(distance(e,order)<Math.max(45,max*.3)){f.anchor={x:order.x,y:order.y};e.order=e.orderQueue?.shift()||null;e.manualMove=false;}}
  else{phase(f,'loiter');aim=loiterGoal(g,e,f.anchor);}
  if(!aim)aim=loiterGoal(g,e,f.anchor);
  // Turn back before map edges, rather than sticking to the border.
  const margin=Math.max(180,max*1.4);if(e.x<margin||e.x>W-margin||e.y<margin||e.y>H-margin)aim={x:clamp(e.x,margin+150,W-margin-150),y:clamp(e.y,margin+150,H-margin-150)};
  move(g,e,aim,cruise,max*(f.phase==='loiter'?.65:.85),dt);return true;
 }
 function rotorMove(g,e,goal,height,dt){const before={x:e.x,y:e.y,angle:e.angle},max=g.effectiveSpeed(e),dd=distance(e,goal),step=Math.min(dd,max*dt),heading=Math.atan2(goal.y-e.y,goal.x-e.x);e.angle+=clamp(root.WarVehicleMotion.angleDelta(heading,e.angle),-1.3*dt,1.3*dt);e.x+=Math.cos(heading)*step;e.y+=Math.sin(heading)*step;e.altitude=Math.max(clearance(g,e,e.x,e.y),e.altitude+clamp(Math.max(height,aheadFloor(g,e,e.x,e.y))-e.altitude,-60*dt,60*dt));e.roll*=Math.max(0,1-dt*4);e.pitch+=(step>0?-.08-e.pitch:-e.pitch)*Math.min(1,dt*3);root.WarVehicleMotion.record(e,before,dt,step>0?1:0,0,g.tick);e.flightSpeed=step/dt;}
 function validate(e){const f=e.flight;if(!f)return true;return supported(e)&&Object.hasOwn(labels,f.phase)&&[f.elapsed,f.airtime,f.anchor?.x,f.anchor?.y].every(Number.isFinite)&&(f.homeId==null||Number.isInteger(f.homeId))&&(!f.egress||[f.egress.x,f.egress.y,f.egress.until].every(Number.isFinite))&&(!f.resume||[f.resume.x,f.resume.y].every(Number.isFinite))&&(!f.parking||[f.parking.x,f.parking.y].every(Number.isFinite))&&(f.returnStage==null||[0,1,2].includes(f.returnStage));}
 root.WarAircraftFlight={supported,fixed,labels,groundPhases,runwayContains,launchPosition,launch,groundStep,update,canFire,requestReturn,command,stop,aheadFloor,validate};
})(globalThis);
