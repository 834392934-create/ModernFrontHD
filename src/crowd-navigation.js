(function(root){
 'use strict';
 const D=root.WarData,{U,T,COLS,ROWS}=D;
 function clear(game,e,x,y){
  const mask=U[e.kind].naval?game.map.navalBlocked:(game.groundNavigation?.blocked||game.map.blocked),r=e.r;
  for(let i=-1;i<8;i++){
   const px=x+(i<0?0:Math.cos(i*Math.PI/4)*r),py=y+(i<0?0:Math.sin(i*Math.PI/4)*r),cx=Math.floor(px/T),cy=Math.floor(py/T);
   if(cx<0||cy<0||cx>=COLS||cy>=ROWS||mask[cy*COLS+cx])return false;
  }
  return true;
 }
 function segment(game,e,to){
  const length=Math.hypot(to.x-e.x,to.y-e.y),steps=Math.max(1,Math.ceil(length/16));
  for(let i=1;i<=steps;i++)if(!clear(game,e,e.x+(to.x-e.x)*i/steps,e.y+(to.y-e.y)*i/steps))return false;
  return true;
 }
 function waypoint(game,e){
  // A shared tile centre is a routing hint, not a place every vehicle must occupy.
  while(e.path.length>1&&Math.hypot(e.path[0].x-e.x,e.path[0].y-e.y)<Math.max(18,e.r+8)&&segment(game,e,e.path[1]))e.path.shift();
  if(!(e.crowdDetourUntil>game.time)&&(e.path.length<=3||game.tick%4===e.id%4))for(let i=Math.min(e.path.length-1,7);i>0;i--)if(segment(game,e,e.path[i])){e.path.splice(0,i);break;}
  return e.path[0];
 }
 function move(game,e,to,dt){
  const dx=to.x-e.x,dy=to.y-e.y,distance=Math.hypot(dx,dy),speed=game.effectiveSpeed(e),step=Math.min(distance,speed*dt),heading=Math.atan2(dy,dx);
  const neighbors=game.spatial.query(e.x,e.y,e.r+100).filter(o=>o.id!==e.id&&o.hp>0&&!U[o.kind]?.air&&!!U[o.kind]?.naval===!!U[e.kind].naval&&Math.abs(game.entityAltitude(o)-game.entityAltitude(e))<e.r+o.r);
  let best=null,bestScore=-Infinity,observedBlocker=null;
  for(const turn of [0,.35,-.35,.7,-.7,1.05,-1.05,1.4,-1.4,1.8,-1.8]){
   const angle=heading+turn,vx=Math.cos(angle)*step,vy=Math.sin(angle)*step,x=e.x+vx,y=e.y+vy;
   if(!clear(game,e,x,y))continue;
   let blocked=false,penalty=0;
   for(const o of neighbors){
    const safe=e.r+o.r+(o.structure?8:2),now=Math.hypot(e.x-o.x,e.y-o.y),next=Math.hypot(x-o.x,y-o.y);
    if(next<safe&&next<now-.001){if(turn===0&&(!observedBlocker||o.id<observedBlocker.id))observedBlocker=o;blocked=true;break;}
    if(next<safe)penalty+=(safe-next)/safe*2;
    const future=Math.hypot(x+Math.cos(angle)*speed*.25-o.x,y+Math.sin(angle)*speed*.25-o.y);
    if(distance>80&&future<safe+8)penalty+=(safe+8-future)/Math.max(1,safe)*1.2;
   }
   if(blocked)continue;
   const score=Math.cos(turn)-Math.abs(turn)*.04-penalty+(turn>0?.03:0);
   if(score>bestScore){bestScore=score;best={x,y,angle};}
  }
  // Waiting is tied to a currently observed blocker, never to an expiring permission to cross it.
  if(observedBlocker)e.crowdWaiting={id:observedBlocker.id,since:e.crowdWaiting?.id===observedBlocker.id?e.crowdWaiting.since:game.time};
  else e.crowdWaiting=null;
  if(best){e.x=best.x;e.y=best.y;e.angle=best.angle;return true;}
  return false;
 }
 function detour(game,e,goal,findPath){
  const blocked=(U[e.kind].naval?game.map.navalBlocked:game.groundNavigation.blocked).slice();
  for(const o of game.spatial.query(e.x,e.y,350)){
   if(o===e||o.structure||U[o.kind]?.air||!!U[o.kind]?.naval!==!!U[e.kind].naval)continue;
   const r=e.r+o.r+12;
   for(let y=Math.max(0,Math.floor((o.y-r)/T));y<=Math.min(ROWS-1,Math.floor((o.y+r)/T));y++)for(let x=Math.max(0,Math.floor((o.x-r)/T));x<=Math.min(COLS-1,Math.floor((o.x+r)/T));x++)if(Math.hypot(x*T+T/2-o.x,y*T+T/2-o.y)<r)blocked[y*COLS+x]=1;
  }
  let searches=1,path=findPath({blocked},e.x,e.y,goal.x,goal.y);
  // Dense circles can occupy every coarse neighbour cell; retain static routing as a fallback.
  if(!path.length&&game.pathBudget>1){searches++;path=findPath({blocked:U[e.kind].naval?game.map.navalBlocked:game.groundNavigation.blocked},e.x,e.y,goal.x,goal.y);}
  if(path.length){const last=path.at(-1);if(Math.hypot(last.x-goal.x,last.y-goal.y)<T*1.5)path.push({x:goal.x,y:goal.y});e.path=path;e.crowdDetourUntil=game.time+2;}
  return searches;
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
