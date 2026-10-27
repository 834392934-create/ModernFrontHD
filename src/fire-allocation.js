/* Shared, staggered fire allocation. O(units + projectiles) bookkeeping per
 * simulation step; candidate discovery stays in the existing spatial query. */
(function(root){
 'use strict';
 const games=new WeakMap();
 const key=(team,id)=>team+':'+id;
 function begin(g){
  const counts=new Map(),incoming=new Map(),owners=new Map();
  for(const e of g.entities){
   if(e.hp<=0||e.disabled>g.time||root.WarCombatDamage.incapacitated(e))continue;
   const t=g.get(e.target);if(!t||t.hp<=0||!g.isEnemy(e.team,t.team))continue;
   const k=key(e.team,t.id);counts.set(k,(counts.get(k)||0)+1);owners.set(e.id,k);
  }
  for(const fx of g.effects){
   if(fx.type!=='shot'||fx.impactResolved||fx.target==null)continue;
   const t=g.get(fx.target);if(!t||t.hp<=0)continue;
   const k=key(fx.from,t.id);incoming.set(k,(incoming.get(k)||0)+Math.max(0,fx.baseDamage||fx.damage||0));
  }
  games.set(g,{counts,incoming,owners});
 }
 function score(g,e,t,distance,range,previous){
  const s=games.get(g),k=key(e.team,t.id),others=Math.max(0,(s?.counts.get(k)||0)-(s?.owners.get(e.id)===k?1:0));
  const damage=s?.incoming.get(k)||0;
  // Spread first, then avoid already-lethal incoming fire; a small preference
  // for the current lock prevents equivalent targets from thrashing turrets.
  return others*4+Math.min(2,damage/Math.max(1,t.hp))+(distance/Math.max(1,range))*.5-(previous?.id===t.id ? .2 : 0);
 }
 function assign(g,e,t){
  const s=games.get(g);if(!s)return;
  const old=s.owners.get(e.id),next=t&&g.isEnemy(e.team,t.team)?key(e.team,t.id):null;
  if(old===next)return;
  if(old)s.counts.set(old,Math.max(0,(s.counts.get(old)||0)-1));
  if(next){s.counts.set(next,(s.counts.get(next)||0)+1);s.owners.set(e.id,next);}else s.owners.delete(e.id);
 }
 function needsReview(g,e,t){const s=games.get(g),k=key(e.team,t.id);return (s?.counts.get(k)||0)>1||(s?.incoming.get(k)||0)>=t.hp;}
 root.WarFireAllocation={begin,score,assign,needsReview};
})(globalThis);
