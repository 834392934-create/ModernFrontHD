(function(root){
 'use strict';
 const D=root.WarData,{U,T,COLS,ROWS}=D;
 function clear(game,e,x,y,angle=e.angle){
  if(!root.WarNavigationFootprints.terrain(game,e,x,y,angle))return false;
  const r=game.navigationRadius(e);
  if(!U[e.kind].air&&!U[e.kind].naval&&game.ore.some(o=>Math.hypot(o.x-x,o.y-y)<48+r+4))return false;
  return true;
 }
 function segment(game,e,to){
  const length=Math.hypot(to.x-e.x,to.y-e.y),steps=Math.max(1,Math.ceil(length/16));
  const heading=Math.atan2(to.y-e.y,to.x-e.x);
  if(U[e.kind].air){if(!clear(game,e,to.x,to.y,heading))return false;}
  else for(let i=1;i<=steps;i++)if(!clear(game,e,e.x+(to.x-e.x)*i/steps,e.y+(to.y-e.y)*i/steps,heading))return false;
  if(!root.WarNavigationFootprints.buildingSegmentClear(game,e,to))return false;
  if(e.crowdRouteOrder===e.order)for(const o of game.spatial.query(e.x,e.y,length+260)){
   if(o.id===e.id||o.structure||o.hp<=0||!game.navigationLayer(e,o))continue;
   const dx=to.x-e.x,dy=to.y-e.y,t=Math.max(0,Math.min(1,((o.x-e.x)*dx+(o.y-e.y)*dy)/Math.max(1,length*length))),safe=game.navigationRadius(e)+game.navigationRadius(o)+2;
   if(Math.hypot(e.x+t*dx-o.x,e.y+t*dy-o.y)<safe)return false;
  }
  return true;
 }
 function waypoint(game,e){
  // A shared tile centre is a routing hint, not a place every vehicle must occupy.
  while(e.path.length>1&&Math.hypot(e.path[0].x-e.x,e.path[0].y-e.y)<Math.max(18,e.r+8)&&segment(game,e,e.path[1]))e.path.shift();
  if(!(e.crowdDetourUntil>game.time)&&(e.path.length<=3||game.tick%4===e.id%4))for(let i=Math.min(e.path.length-1,7);i>0;i--)if(segment(game,e,e.path[i])){e.path.splice(0,i);break;}
  return e.path[0];
 }
 function move(game,e,to,dt){
  const dx=to.x-e.x,dy=to.y-e.y,distance=Math.hypot(dx,dy),speed=game.effectiveSpeed(e),step=Math.min(distance,speed*dt);let heading=Math.atan2(dy,dx);
  const physics=root.WarVehicleMotion,profile=physics.profile(e),before={x:e.x,y:e.y,angle:e.angle},vehicle=profile.kind!=='personnel';
  const neighbors=game.spatial.query(e.x,e.y,game.navigationRadius(e)+260).filter(o=>o.id!==e.id&&o.hp>0&&game.navigationLayer(e,o));
  const radius=game.navigationRadius(e),contacts=neighbors.map(o=>({o,safe:radius+(o.structure?o.r:game.navigationRadius(o))+(o.structure?8:2),now:Math.hypot(e.x-o.x,e.y-o.y)})).filter(p=>p.now<p.safe+speed*.5+step+32);
  // Keep a chosen passing side while rounding a hull. Re-evaluating the shortest
  // left/right step each frame oscillates at a stationary obstacle's near face.
  let obstruction=null,nearest=Infinity;
  for(const {o,safe,now:near} of contacts){
   const ox=o.x-e.x,oy=o.y-e.y,projection=(ox*dx+oy*dy)/Math.max(1,distance*distance);
   if(projection<=0||projection>=1)continue;
   const gap=Math.hypot(ox-dx*projection,oy-dy*projection);
   if(near>=safe&&gap<safe+4&&near<safe+Math.max(30,speed*.5)&&near<nearest){obstruction=o;nearest=near;}
  }
  if(obstruction&&e.crowdRouteOrder!==e.order){
   if(e.crowdSteer?.order!==e.order)e.crowdSteer={order:e.order,side:1};
   const radial=Math.atan2(e.y-obstruction.y,e.x-obstruction.x),safe=game.navigationRadius(e)+(obstruction.structure?obstruction.r:game.navigationRadius(obstruction))+6;
   heading=radial+e.crowdSteer.side*Math.PI/2;
   if(nearest<safe)heading-=e.crowdSteer.side*.3;
  }else e.crowdSteer=null;
  const overlapping=contacts.filter(p=>p.now<p.safe-.01);
  // Legacy dense saves can start inside several conservative hull envelopes.
  // Turn toward an actually separating direction before trying to translate;
  // otherwise finite steering leaves every initial candidate pointing inward.
  let recoveryHeading=null;
  if(vehicle&&overlapping.length){let score=-Infinity;for(let i=0;i<32;i++){
    const a=i*Math.PI/16,c=Math.cos(a),s=Math.sin(a),outward=Math.min(...overlapping.map(p=>((e.x-p.o.x)*c+(e.y-p.o.y)*s)/Math.max(1,p.now)));
    if(!clear(game,e,e.x+c*radius*2,e.y+s*radius*2,a))continue;
    if(outward>=-.001&&outward+Math.cos(a-heading)*.01>score){score=outward+Math.cos(a-heading)*.01;recoveryHeading=a;}
   }if(recoveryHeading!==null)heading=recoveryHeading;
  }
  // The intended segment remains obstructed while testing a tangent around it.
  // Keep observing that physical hull even when the tangent fails terrain first.
  let best=null,bestScore=-Infinity,observedBlocker=obstruction;
  // A loaded truck must turn for a long haul instead of reversing all the way
  // to its refinery at 40% speed. Use the business goal, not a nearby path node;
  // keep reverse for short docking/escape moves.
  const haul=e.order?Math.hypot(e.order.x-e.x,e.order.y-e.y):distance;
  const reverseCost=e.kind==='harvester'?Math.min(1,haul/Math.max(1,radius*4)):.15;
  const candidates=[0,.35,-.35,.7,-.7,1.05,-1.05,1.4,-1.4,1.8,-1.8].flatMap(turn=>vehicle&&profile.reverse>0?[{turn,reverse:false},{turn,reverse:true}]:[{turn,reverse:false}]);candidates.push({turn:null,reverse:true});
  for(const candidate of candidates){
   // A long hull beside a wall may have room to reverse but none to rotate.
   // Preserve body orientation while backing out; all ordinary checks still apply.
   const {turn,reverse}=candidate;if(turn===null&&best)continue;
   const angle=turn===null?e.angle:heading+turn+(reverse?Math.PI:0),motion=reverse?angle+Math.PI:angle,x=e.x+Math.cos(motion)*step,y=e.y+Math.sin(motion)*step;
   if(!clear(game,e,x,y,angle))continue;
   let blocked=false,penalty=0;
   for(const {o,safe,now} of contacts){
    const next=Math.hypot(x-o.x,y-o.y);
    if(next<safe&&next<now-.001){if(turn===0&&(!observedBlocker||o.id<observedBlocker.id))observedBlocker=o;blocked=true;break;}
    if(next<safe)penalty+=(safe-next)/safe*2;
    const future=Math.hypot(x+Math.cos(motion)*speed*.25-o.x,y+Math.sin(motion)*speed*.25-o.y);
    if(distance>80&&future<safe+8)penalty+=(safe+8-future)/Math.max(1,safe)*1.2;
   }
   if(blocked)continue;
   const score=turn===null?-2-penalty:Math.cos(turn)-Math.abs(turn)*.04-penalty+(turn>0?.03:0)-(reverse?reverseCost:0)-(vehicle?Math.abs(physics.angleDelta(angle,e.angle))*.2:0);
   if(score>bestScore){bestScore=score;best={x,y,angle,reverse,fallback:turn===null,throttle:reverse?-1:1};}
  }
  // Waiting is tied to a currently observed blocker, never to an expiring permission to cross it.
  if(observedBlocker)e.crowdWaiting={id:observedBlocker.id,since:e.crowdWaiting?.id===observedBlocker.id?e.crowdWaiting.since:game.time};
  else e.crowdWaiting=null;
  if(!best&&vehicle){
   // A full-speed geometric probe may not fit a narrow residual gap although a
   // real acceleration-limited creep step does. Try only physically valid poses.
   let score=-Infinity;for(const reverse of [false,true])for(const sign of [0,1,-1]){
    if(reverse&&profile.reverse===0)continue;
    const angle=e.angle+sign*profile.turn*dt,velocity=physics.speed(game,e,reverse?-1:.25,dt),x=e.x+Math.cos(angle)*velocity*dt,y=e.y+Math.sin(angle)*velocity*dt;
    if(!clear(game,e,x,y,angle)||!contacts.every(({o,safe,now})=>{const next=Math.hypot(x-o.x,y-o.y);return next>=safe||next>=now-.001;}))continue;
    const gain=distance-Math.hypot(to.x-x,to.y-y),alignment=Math.cos(physics.angleDelta(heading,angle))*.01,value=gain+alignment;
    if(value>score){score=value;best={x,y,angle,reverse,throttle:reverse?-1:.25,executed:true};}
   }
  }
  if(!best&&recoveryHeading!==null){const delta=physics.angleDelta(recoveryHeading,e.angle),angle=e.angle+Math.max(-profile.turn*dt,Math.min(profile.turn*dt,delta));if(clear(game,e,e.x,e.y,angle))best={x:e.x,y:e.y,angle,reverse:false,throttle:0};}
  if(best){
   if(vehicle&&!best.executed){
    // Select the proven avoidance direction first, then execute it with bounded
    // steering. RTS uses low-speed alignment assistance; manual wheel steering
    // remains non-pivoting. Every accepted translation stays on the hull axis.
    const delta=physics.angleDelta(best.angle,e.angle);let angle=e.angle+Math.max(-profile.turn*dt,Math.min(profile.turn*dt,delta));
    let throttle=best.reverse?-1:Math.abs(delta)>.85?0:1;
    if(e.motionTerrainTurn&&(e.motionTerrainTurn.order!==e.order||e.motionTerrainTurn.path!==e.path))e.motionTerrainTurn=null;
    if((best.fallback||!clear(game,e,e.x,e.y,angle))&&!e.motionTerrainTurn)e.motionTerrainTurn={order:e.order,path:e.path,angle:best.fallback?heading:best.angle,phase:'back'};
    if(e.motionTerrainTurn){
     const turn=physics.angleDelta(e.motionTerrainTurn.angle,e.angle),samples=Math.max(1,Math.ceil(Math.abs(turn)/.08));
     const room=(x,y)=>{let blocked=0;for(let i=1;i<=samples;i++)if(!clear(game,e,x,y,e.angle+turn*i/samples))blocked++;return blocked;};
     const maneuver=e.motionTerrainTurn;
     if(room(e.x,e.y)===0)maneuver.phase='align';
     if(maneuver.phase==='align'){
      angle=e.angle+Math.max(-profile.turn*dt,Math.min(profile.turn*dt,turn));throttle=0;
      if(Math.abs(turn)<.04)e.motionTerrainTurn=null;
     }else{
      angle=e.angle;
      if(!maneuver.direction){const probe=radius*1.5,c=Math.cos(angle)*probe,s=Math.sin(angle)*probe,front=room(e.x+c,e.y+s),back=room(e.x-c,e.y-s);maneuver.direction=back<=front?-1:1;}
      throttle=maneuver.direction;
     }
    }
    const limit=Math.min(Math.sqrt(2*speed*profile.brake*distance),Math.abs(delta)>.2?Math.max(1,distance)*profile.turn*.65/Math.max(.5,Math.abs(delta)):Infinity);
    const velocity=physics.speed(game,e,throttle,dt,limit),travel=Math.min(distance,Math.abs(velocity)*dt),motion=angle+(velocity<0?Math.PI:0),x=e.x+Math.cos(motion)*travel,y=e.y+Math.sin(motion)*travel;
    const accepted=clear(game,e,x,y,angle)&&contacts.every(({o,safe,now})=>{const next=Math.hypot(x-o.x,y-o.y);return next>=safe||next>=now-.001;});
    best={x:accepted?x:e.x,y:accepted?y:e.y,angle:clear(game,e,e.x,e.y,angle)?angle:e.angle,throttle,reverse:velocity<0};
   }
   e.x=best.x;e.y=best.y;e.angle=best.angle;
   physics.record(e,before,dt,best.throttle,physics.angleDelta(e.angle,before.angle)/Math.max(.001,profile.turn*dt),game.tick);
   if(e.crowdRouteOrder===e.order){
    const p=e.crowdRouteProgress;
    if(!p||game.time-p.time>=1){if(p&&Math.hypot(e.x-p.x,e.y-p.y)>8)e.crowdDetourUntil=game.time+2;e.crowdRouteProgress={x:e.x,y:e.y,time:game.time};}
   }
   return true;
  }
  physics.stop(e);
  return false;
 }
 function detour(game,e,goal,findPath){
  const local=visibilityDetour(game,e,goal);
  if(local){e.path=local;e.crowdRouteOrder=e.order;e.crowdDetourUntil=game.time+2;return 1;}
  const base=root.WarNavigationFootprints.pathGrid(game,e).blocked,blocked=base.slice();
  for(const o of game.spatial.query(e.x,e.y,350)){
   if(o===e||o.structure||!game.navigationLayer(e,o))continue;
   const r=game.navigationRadius(e)+game.navigationRadius(o)+12;
   for(let y=Math.max(0,Math.floor((o.y-r)/T));y<=Math.min(ROWS-1,Math.floor((o.y+r)/T));y++)for(let x=Math.max(0,Math.floor((o.x-r)/T));x<=Math.min(COLS-1,Math.floor((o.x+r)/T));x++)if(Math.hypot(x*T+T/2-o.x,y*T+T/2-o.y)<r)blocked[y*COLS+x]=1;
  }
  let searches=1,path=findPath({blocked},e.x,e.y,goal.x,goal.y);
  // Dense circles can occupy every coarse neighbour cell; retain static routing as a fallback.
  let routed=!!path.length;
  if(!path.length&&game.pathBudget>1){searches++;path=findPath({blocked:base},e.x,e.y,goal.x,goal.y);routed=false;}
  if(path.length){const last=path.at(-1);if(Math.hypot(last.x-goal.x,last.y-goal.y)<T*1.5)path.push({x:goal.x,y:goal.y});e.path=path;e.crowdRouteOrder=routed?e.order:null;e.crowdDetourUntil=game.time+2;}
  return searches;
 }
 // A small visibility graph handles parked formations whose inflated circles
 // cover the coarse A* start cell. It changes the route, never the order or position.
 function visibilityDetour(game,e,goal){
  const nearby=game.spatial.query(e.x,e.y,600).filter(o=>o.id!==e.id&&o.hp>0&&game.navigationLayer(e,o));
  const structures=game.entities.filter(o=>o.structure&&o.hp>0&&game.navigationLayer(e,o));
  // Moving dense crowds invalidate visibility graphs before they can be used;
  // keep their existing bounded grid planner, then use the graph for parked obstacles.
  if(nearby.filter(o=>o.order).length>10)return null;
  const obstacles=nearby.sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y)).slice(0,16).map(o=>({x:o.x,y:o.y,r:game.navigationRadius(e)+(o.structure?o.r:game.navigationRadius(o))+(o.structure?10:4)}));
  if(!obstacles.length)return null;
  const points=[{x:e.x,y:e.y},{x:goal.x,y:goal.y}];
  for(const o of obstacles)for(let i=0;i<12;i++){const a=i*Math.PI/6,r=(o.r+6)/Math.cos(Math.PI/12),p={x:o.x+Math.cos(a)*r,y:o.y+Math.sin(a)*r};if(clear(game,e,p.x,p.y)&&obstacles.every(b=>Math.hypot(p.x-b.x,p.y-b.y)>=b.r))points.push(p);}
  const costs=points.map(()=>Infinity),parents=points.map(()=>-1),closed=new Set();costs[0]=0;
  const edge=(a,b)=>{
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<.01)return true;
   for(const o of obstacles){const t=Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.y-a.y)*dy)/(len*len))),near=Math.hypot(a.x+dx*t-o.x,a.y+dy*t-o.y),start=Math.hypot(a.x-o.x,a.y-o.y);if(near<o.r&&!(start<o.r&&t===0))return false;}
   // The small local graph must not invent a shortcut through the unseen rest
   // of a building wall. Fall back to the full map planner when it cannot pass.
   for(const o of structures){const r=game.navigationRadius(e)+o.r+8,t=Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.y-a.y)*dy)/(len*len)));if(Math.hypot(a.x+dx*t-o.x,a.y+dy*t-o.y)<r&&!(t===0&&Math.hypot(a.x-o.x,a.y-o.y)<r))return false;}
   const heading=Math.atan2(dy,dx),steps=Math.ceil(len/24);for(let i=1;i<=steps;i++)if(!clear(game,e,a.x+dx*i/steps,a.y+dy*i/steps,heading))return false;return true;
  };
  while(closed.size<points.length){let id=-1,best=Infinity;for(let i=0;i<points.length;i++)if(!closed.has(i)){const score=costs[i]+Math.hypot(points[i].x-goal.x,points[i].y-goal.y);if(score<best){id=i;best=score;}}if(id<0)return null;if(id===1){const path=[];for(let k=1;k!==0;k=parents[k])path.unshift(points[k]);return path;}
   closed.add(id);for(let i=1;i<points.length;i++){if(closed.has(i))continue;const cost=costs[id]+Math.hypot(points[i].x-points[id].x,points[i].y-points[id].y);if(cost<costs[i]&&edge(points[id],points[i])){costs[i]=cost;parents[i]=id;}}
  }
  return null;
 }
 function enqueue(game,e){
  game._crowdReplans=game._crowdReplans||new Map();
  if(!game._crowdReplans.has(e.id))game._crowdReplans.set(e.id,{order:e.order});
 }
 function process(game,findPath){
  if(!game._crowdReplans)return;
  // FIFO rounds: newly blocked low IDs join the back instead of starving older high IDs.
  for(const [id,request]of game._crowdReplans){
   if(game.pathBudget<=0||game.crowdPathBudget<=0)break;
   game._crowdReplans.delete(id);const e=game.get(id);
   if(!e||!e.order||e.order!==request.order||e.id===game.directControl?.id)continue;
   game.pathBudget-=detour(game,e,e.order,findPath);game.crowdPathBudget--;
   e.crowdRepathCount=(e.crowdRepathCount||0)+1;e.crowdProgress={distance:Math.hypot(e.x-e.order.x,e.y-e.order.y),time:game.time};
  }
 }
 root.WarCrowdNavigation={clear,segment,waypoint,move,detour,enqueue,process};
})(typeof globalThis!=='undefined'?globalThis:this);
