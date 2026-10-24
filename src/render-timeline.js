/* Controlled-entity render interpolation. Never writes entities, inputs or projectiles. */
(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
 const fields=['x','y','altitude','jumpHeight','angle','pitch','roll'],angles=new Set(['angle','pitch','roll']);
 const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 function read(e){const p={};for(const k of fields)p[k]=finite(e[k]);return p;}
 function same(a,b){return fields.every(k=>a[k]===b[k]);}
 function entity(game){return game?.get(game.directControl?.id)||null;}
 function snapshot(game,e=entity(game)){
  if(!e)return null;const speed=finite(game.effectiveSpeed?.(e)),space=root.WarData?.U[e.kind]?.space;
  return{ref:e,kind:e.kind,state:e.components?.state,disabled:e.disabled>game.time,pose:read(e),speed:Math.max(speed*1.5,Math.abs(finite(e.flightSpeed)),Math.abs(finite(e.jumpVelocity)),space?450:0)};
 }
 class Timeline{
  constructor(){this.game=null;this.previous=null;this.current=null;this.cached=null;this.alpha=1;this.previousTime=0;this.currentTime=0;this.controlledId=null;this.paused=false;}
  reset(game){this.game=game;this.current=snapshot(game);this.previous=this.current;this.previousTime=this.currentTime=game?.time||0;this.alpha=1;this.cached=null;this.controlledId=game?.directControl?.id??null;return this;}
  captureBefore(game){if(game!==this.game||this.controlledId!==(game.directControl?.id??null))this.reset(game);this.previous=snapshot(game);this.previousTime=game.time;this.cached=null;}
  captureAfter(game){if(game!==this.game||this.controlledId!==(game.directControl?.id??null))return this.reset(game);this.current=snapshot(game);this.currentTime=game.time;this.cached=null;return this;}
  beginFrame(game,alpha,{paused=false}={}){
   const reset=game!==this.game||paused||paused!==this.paused||this.controlledId!==(game?.directControl?.id??null);
   if(reset)this.reset(game);this.paused=paused;this.alpha=reset?1:clamp(finite(alpha,1),0,1);this.cached=null;return this;
  }
  controlledPose(game,e=entity(game)){
   if(!e||game!==this.game||this.paused||e.id!==game.directControl?.id)return e;
   const a=this.previous,b=this.current,dt=this.currentTime-this.previousTime,physical=read(e);
   // Replaced identities, state changes, unrecorded movement and teleports snap
   // to the real entity. Repeated calls read the same frame; no recursive lerp.
   if(!a||!b||a.ref!==e||b.ref!==e||a.kind!==e.kind||b.kind!==e.kind||a.state!==b.state||b.state!==e.components?.state||a.disabled!==b.disabled||b.disabled!==(e.disabled>game.time)||dt<=0||dt>.25||!same(physical,b.pose))return e;
   const limit=Math.max(16,Math.max(a.speed,b.speed)*dt*2+4);
   if(Math.hypot(b.pose.x-a.pose.x,b.pose.y-a.pose.y,(b.pose.altitude+b.pose.jumpHeight)-(a.pose.altitude+a.pose.jumpHeight))>limit)return e;
   if(this.cached)return this.cached;
   const p={...e};for(const k of fields)p[k]=angles.has(k)?angle(a.pose[k],b.pose[k],this.alpha):a.pose[k]+(b.pose[k]-a.pose[k])*this.alpha;
   this.cached=p;return p;
  }
 }
 const api={Timeline,read,angle};root.WarRenderTimeline=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
