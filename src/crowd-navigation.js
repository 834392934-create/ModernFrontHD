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
  for(let i=1;i<=steps;i++)if(!clear(game,e,e.x+(to.x-e.x)*i/steps,e.y+(to.y-e.y)*i/steps,heading))return false;
  if(e.crowdRouteOrder===e.order)for(const o of game.spatial.query(e.x,e.y,length+260)){
   if(o.id===e.id||o.hp<=0||!game.navigationLayer(e,o))continue;
   const dx=to.x-e.x,dy=to.y-e.y,t=Math.max(0,Math.min(1,((o.x-e.x)*dx+(o.y-e.y)*dy)/Math.max(1,length*length))),safe=game.navigationRadius(e)+(o.structure?o.r:game.navigationRadius(o))+2;
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
  let best=null,bestScore=-Infinity,observedBlocker=null;
  for(const turn of [0,.35,-.35,.7,-.7,1.05,-1.05,1.4,-1.4,1.8,-1.8,null]){
   // A long hull beside a wall may have room to reverse but none to rotate.
   // Preserve body orientation while backing out; all ordinary checks still apply.
   const reverse=turn===null;if(reverse&&best)continue;
   const angle=reverse?e.angle:heading+turn,motion=reverse?angle+Math.PI:angle,vx=Math.cos(motion)*step,vy=Math.sin(motion)*step,x=e.x+vx,y=e.y+vy;
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
   const score=reverse?-2-penalty:Math.cos(turn)-Math.abs(turn)*.04-penalty+(turn>0?.03:0);
   if(score>bestScore){bestScore=score;best={x,y,angle,reverse};}
  }
  // Waiting is tied to a currently observed blocker, never to an expiring permission to cross it.
  if(observedBlocker)e.crowdWaiting={id:observedBlocker.id,since:e.crowdWaiting?.id===observedBlocker.id?e.crowdWaiting.since:game.time};
  else e.crowdWaiting=null;
  if(best){
   e.x=best.x;e.y=best.y;e.angle=best.angle;
   if(e.crowdRouteOrder===e.order){
    const p=e.crowdRouteProgress;
    if(!p||game.time-p.time>=1){if(p&&Math.hypot(e.x-p.x,e.y-p.y)>8)e.crowdDetourUntil=game.time+2;e.crowdRouteProgress={x:e.x,y:e.y,time:game.time};}
   }
   return true;
  }
  return false;
 }
 function detour(game,e,goal,findPath){
  const local=visibilityDetour(game,e,goal);
  if(local){e.path=local;e.crowdRouteOrder=e.order;e.crowdDetourUntil=game.time+2;return 1;}
  const base=U[e.kind].air?new Uint8Array(COLS*ROWS):U[e.kind].naval?game.map.navalBlocked:game.groundNavigation.blocked,blocked=base.slice();
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
