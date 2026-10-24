/* Independent, destructible game-scale runways. Queries never create facilities. */
(function(root){
 'use strict';
 const {B,U,W,H,T,COLS}=root.WarData,LENGTH=360,WIDTH=160,LINK_RADIUS=600;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function geometry(e){const angle=e.angle||0;return{x:e.x-Math.cos(angle)*180,y:e.y-Math.sin(angle)*180,angle,length:LENGTH,width:WIDTH};}
 function local(e,p){const c=Math.cos(e.angle||0),s=Math.sin(e.angle||0),dx=p.x-e.x,dy=p.y-e.y;return{x:dx*c+dy*s,y:-dx*s+dy*c};}
 function signedDistance(e,p){const q=local(e,p),x=Math.abs(q.x)-180,y=Math.abs(q.y)-80;return Math.hypot(Math.max(0,x),Math.max(0,y))+Math.min(0,Math.max(x,y));}
 function overlaps(a,b,padding=20){
  if(b.kind!=='runway')return signedDistance(a,b)<(B[b.kind]?.r||b.r||0)+padding;
  for(const angle of [a.angle||0,(a.angle||0)+Math.PI/2,b.angle||0,(b.angle||0)+Math.PI/2]){
   const axis={x:Math.cos(angle),y:Math.sin(angle)},extent=e=>180*Math.abs(Math.cos((e.angle||0)-angle))+80*Math.abs(Math.sin((e.angle||0)-angle));
   if(Math.abs((a.x-b.x)*axis.x+(a.y-b.y)*axis.y)>=extent(a)+extent(b)+padding)return false;
  }return true;
 }
 function usable(g,r,team){return !!r&&r.kind==='runway'&&r.hp>0&&r.team===team&&(r.disabled||0)<=g.time&&!['disabled','dead'].includes(r.components?.state)&&!(r.components?.parts?.structure?.health<=.15);}
 function terrain(g,r){
  const c=Math.cos(r.angle||0),s=Math.sin(r.angle||0);
  // Sample full surface, not merely three lines: a small water cell cannot hide inside.
  for(let along=-180;along<=180;along+=20)for(let cross=-80;cross<=80;cross+=20){const x=r.x+c*along-s*cross,y=r.y+s*along+c*cross;if(x<90||y<90||x>W-90||y>H-90||g.map.blocked[Math.floor(y/T)*COLS+Math.floor(x/T)])return false;}
  const x=r.x-c*780,y=r.y-s*780;return x>=120&&y>=120&&x<=W-120&&y<=H-120;
 }
 function siteClear(g,r,ignoreQueue=null){return terrain(g,r)&&!g.entities.some(o=>o.hp>0&&o.structure&&o.id!==r.id&&overlaps(r,o))&&!g.ore.some(o=>signedDistance(r,o)<60)&&!g.teams.some(t=>t.buildQueue.some(q=>q!==ignoreQueue&&overlaps(r,q)));}
 function plan(g,team,x,y,angle,ignoreQueue=null){
  if(![x,y].every(Number.isFinite)||!g.entities.some(e=>e.hp>0&&e.team===team&&e.kind==='airfield'&&distance(e,{x,y})<=LINK_RADIUS))return null;
  const angles=Number.isFinite(angle)?[angle]:Array.from({length:8},(_,i)=>i*Math.PI/4);
  for(const a of angles){const r={kind:'runway',team,x,y,angle:a};if(siteClear(g,r,ignoreQueue))return r;}return null;
 }
 function select(g,field,e){
  if(!field||field.kind!=='airfield'||field.hp<=0)return null;
  const candidates=g.entities.filter(r=>usable(g,r,field.team)&&distance(r,field)<=LINK_RADIUS);
  return candidates.find(r=>r.id===e?.flight?.runwayId)||candidates.sort((a,b)=>distance(a,field)-distance(b,field)||a.id-b.id)[0]||null;
 }
 function occupied(g,r,e){return g.entities.some(o=>o.hp>0&&o.id!==e?.id&&o.flight?.runwayId===r.id&&['prepare','lineup','takeoff','approach','landing','taxi'].includes(o.flight.phase));}
 function clear(g,r,e){return usable(g,r,e.team)&&siteClear(g,r)&&!g.entities.some(o=>o.hp>0&&o.id!==r.id&&o.id!==e.id&&!o.structure&&g.entityAltitude(o)<45&&signedDistance(r,o)<g.navigationRadius(o)+4);}
 function findSite(g,field){for(const offset of [260,340,390])for(let i=0;i<16;i++){const angle=i*Math.PI/8,p=plan(g,field.team,field.x+Math.cos(angle)*offset,field.y+Math.sin(angle)*offset);if(p)return p;}return null;}
 function available(g,team,kind){return !root.WarAircraftFlight?.fixed({kind})||g.entities.some(e=>e.team===team&&e.hp>0&&e.kind==='airfield'&&select(g,e));}
 function migrate(g,schema){
  if(schema===1)return;
  for(const field of g.entities.slice())if(field.kind==='airfield'&&field.runway){
   const old=field.runway,c=Math.cos(old.angle),s=Math.sin(old.angle),x=old.x+c*180,y=old.y+s*180;
   let r=g.entities.find(o=>o.kind==='runway'&&o.team===field.team&&distance(o,{x,y})<.01&&Math.abs((o.angle||0)-old.angle)<.001);
   if(!r){r=g.spawn(field.team,'runway',x,y);r.angle=old.angle;}
   for(const e of g.entities)if(e.flight?.homeId===field.id&&root.WarAircraftFlight.fixed(e))e.flight.runwayId=r.id;
   delete field.runway;
  }
 }
 function validateGame(g){return g.entities.every(e=>e.flight?.runwayId==null||Number.isInteger(e.flight.runwayId)&&(!g.get(e.flight.runwayId)||g.get(e.flight.runwayId).kind==='runway'&&g.get(e.flight.runwayId).team===e.team));}
 const api={LENGTH,WIDTH,LINK_RADIUS,geometry,signedDistance,overlaps,usable,terrain,siteClear,plan,select,occupied,clear,findSite,available,migrate,validateGame};root.WarAirbaseRunways=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
