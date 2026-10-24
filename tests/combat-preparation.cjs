/* Test fixtures advance the real readiness state machine, never clear ammunition,
 * force a ready flag or bypass target/range/visibility validation. */
const R=global.WarCombatReadiness;
function prepare(g,e,target=null,input={},limit=10){
 if(e.kind==='operator')return true;
 const w=g.vehicleWeapon(e,target)||g.weaponDefinition(e,target);
 if(!R.profile(g,e,w))return true;
 const ctx={target,weapon:w,moving:false,aimOrigin:input.aimOrigin,aimX:input.aimX,aimY:input.aimY,aimHeight:input.aimHeight,aimYaw:input.aimYaw,aimPitch:input.aimPitch};
 for(let i=0;i<=Math.ceil(limit/.05);i++){
  const status=R.status(g,e,w,target,ctx);if(status.canFire)return true;
  if(!['preparing','packing','reloading','cooldown','traversing','no-ammo'].includes(status.reason))return false;
  g.time+=.05;R.step(g,e,.05,ctx);
 }
 return false;
}
function face(g,e,target){
 e.angle=e.turret=Math.atan2(target.y-e.y,target.x-e.x);
 if(WarData.U[e.kind]?.air&&!WarData.U[e.kind]?.space)e.pitch=Math.atan2(g.entityAltitude(target)-g.entityAltitude(e),Math.hypot(target.x-e.x,target.y-e.y));
}
function advanceUntil(g,condition,limit=12){for(let i=0;i<Math.ceil(limit/.05)&&!condition();i++)g.step(.05);return condition();}
function emptyVegetation(g){for(const tree of WarTrees.ensure(g))WarTrees.damage(g,tree.id,tree.maxHp);g.directObstacles=[];}
module.exports={prepare,face,advanceUntil,emptyVegetation};
