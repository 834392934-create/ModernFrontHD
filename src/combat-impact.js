/* One impact per projectile. Blast values and cover factors are game settings. */
(function(root){
 'use strict';
 const D=root.WarData,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const structureReach=Math.max(160,...Object.values(D.B).map(b=>b.footprint?Math.hypot(b.footprint.halfLength,b.footprint.halfWidth):0));
 function localPoint(g,e,p){const a=D.B[e.kind]?.rotatable?e.angle||0:0,c=Math.cos(a),s=Math.sin(a),dx=p.x-e.x,dy=p.y-e.y;return{x:c*dx+s*dy,y:p.height-g.entityAltitude(e),z:-s*dx+c*dy};}
 function footprintDistance(g,e,p){
  const f=e.structure&&D.B[e.kind]?.footprint;if(!f)return null;const q=localPoint(g,e,p);
  return Math.hypot(Math.max(0,Math.abs(q.x)-f.halfLength),Math.max(0,(f.minY??0)-q.y,q.y-(f.maxY??D.B[e.kind].collisionHeight??2)),Math.max(0,Math.abs(q.z)-f.halfWidth));
 }
 function footprintCover(g,b,start,end){
  const f=D.B[b.kind].footprint,a=localPoint(g,b,start),z=localPoint(g,b,end),lo={x:-f.halfLength,y:f.minY??0,z:-f.halfWidth},hi={x:f.halfLength,y:f.maxY??D.B[b.kind].collisionHeight??2,z:f.halfWidth};let entry=0,exit=1;
  for(const key of ['x','y','z']){const delta=z[key]-a[key];if(Math.abs(delta)<1e-9){if(a[key]<lo[key]||a[key]>hi[key])return false;continue;}let near=(lo[key]-a[key])/delta,far=(hi[key]-a[key])/delta;if(near>far)[near,far]=[far,near];entry=Math.max(entry,near);exit=Math.min(exit,far);if(entry>exit)return false;}
  return exit>.002&&entry<.998;
 }
 function validDirect(g,fx,e){
  if(!e||!root.WarCombatProjectiles.canImpact(g,fx,e))return false;
  const a=fx.directHitArea;if(!a)return true;
  return Math.hypot((e.x-a.x)/Math.max(5,a.r),(e.y-a.y)/Math.max(5,a.r),(g.entityAltitude(e)-(a.altitude??g.entityAltitude(e)))/(a.verticalRadius??Math.max(5,a.r)))<=1;
 }
 function cover(g,fx,e){
  const end={x:e.x,y:e.y,height:g.entityAltitude(e)+Math.min(12,g.hitHeightRadius(e))},start={x:fx.tx,y:fx.ty,height:fx.targetHeight??0};
  const dx=end.x-start.x,dy=end.y-start.y,len=dx*dx+dy*dy;if(len<1)return 1;
  for(const b of g.spatial.query((start.x+end.x)/2,(start.y+end.y)/2,Math.sqrt(len)/2+structureReach)){
   if(!b.structure||b.hp<=0||b.id===e.id)continue;
   if(D.B[b.kind]?.footprint){if(footprintCover(g,b,start,end))return .15;continue;}
   const t=clamp(((b.x-start.x)*dx+(b.y-start.y)*dy)/len,0,1);if(t<=.002||t>=.998)continue;
   const h=start.height+(end.height-start.height)*t,bottom=g.entityAltitude(b),bounds=root.WarNavigationFootprints?.bounds[b.kind+'_'+g.teams[b.team]?.faction],top=bottom+(bounds?.[2]??80);
   if(h>=bottom-2&&h<=top&&Math.hypot(start.x+dx*t-b.x,start.y+dy*t-b.y)<b.r)return .15;
  }return 1;
 }
 function resolve(g,fx){
  if(fx.type!=='shot'||fx.impactResolved)return 0;fx.impactResolved=true;
  const primary=g.get(fx.target),direct=validDirect(g,fx,primary)?primary:null;
  // AP has no blast even if an old save retained a prior HE radius.
  const blast=String(fx.ammoType).toLowerCase()==='ap'?0:Math.max(0,fx.splash||0),targets=blast?g.spatial.query(fx.tx,fx.ty,blast+structureReach):[];
  if(direct)targets.push(direct);const plan=[];
  for(const e of new Set(targets)){
   if(!root.WarCombatProjectiles.canImpact(g,fx,e)||!root.WarWeaponSalvos.canImpact(g,fx,e))continue;
   if(e!==direct){
    if(!blast)continue;
    const domain=g.targetDomain(e.kind);
    if(['air','space','underwater'].includes(fx.targetDomain)?domain!==fx.targetDomain:['air','space','underwater'].includes(domain))continue;
   }
   const distance=Math.hypot(e.x-fx.tx,e.y-fx.ty,g.entityAltitude(e)-(fx.targetHeight??0)),surfaceDistance=footprintDistance(g,e,{x:fx.tx,y:fx.ty,height:fx.targetHeight??0})??Math.max(0,distance-(e.r||0));
   if(e!==direct&&surfaceDistance>blast)continue;
   const base=fx.sourceKind&&fx.baseDamage!==undefined?g.attackDamage(fx.sourceKind,e,fx.baseDamage,fx.weaponDefinition):fx.damage;
   const factor=e===direct?1:Math.max(0,1-surfaceDistance/blast)*cover(g,fx,e);
   if(base>0&&factor>0)plan.push({entity:e,damage:base*factor});
  }
  // Every target sees the same pre-impact cover, including a wall destroyed by this blast.
  for(const hit of plan)g.damage(hit.entity,hit.damage,fx.from,fx);
  return plan.length;
 }
 root.WarCombatImpact={resolve,cover,validDirect};if(typeof module!=='undefined')module.exports=root.WarCombatImpact;
})(globalThis);
