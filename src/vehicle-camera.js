/* Vehicle presentation only: no movement, visibility or damage rules live here. */
(function(root){
 'use strict';const T=root.THREE,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function frame(e,d,b,height,yaw,pitch,aspect,fov=70){
  const r=Math.max(12,b?.[0]||e.r||20),lo=b?.[1]??-r*.2,hi=b?.[2]??r*.6;
  const center=new T.Vector3(b?.length>3?(b[3]+b[4])/2:0,(lo+hi)/2,b?.length>5?(b[5]+b[6])/2:0);
  const radius=Math.max(12,b?.length>5?Math.hypot((b[4]-b[3])/2,(hi-lo)/2,(b[6]-b[5])/2):Math.hypot(r,(hi-lo)/2));
  center.applyEuler(new T.Euler(e.roll||0,-(e.angle||0),e.pitch||0,'YZX')).add(new T.Vector3(e.x,height,e.y));
  const look=new T.Vector3(Math.cos(yaw)*Math.cos(pitch),Math.sin(pitch),Math.sin(yaw)*Math.cos(pitch));
  // A raised boom leaves the hull below the crosshair. Sphere-based framing works
  // for long ships, wide aircraft, imported art and a narrow window alike.
  const lift=radius*(d.underwater?.32:.65),half=Math.atan(Math.tan(fov*Math.PI/360)*Math.min(1,aspect));
  const distance=(radius+lift)/Math.tan(half)*1.15;
  const desired=center.clone().addScaledVector(look,-distance).add(new T.Vector3(0,lift,0));
  const unclampedY=desired.y;
  if(d.underwater)desired.y=clamp(desired.y,-175,-3);else desired.y=Math.max(3,desired.y);
  // Looking steeply upward can put the boom below the floor. Clamping only Y
  // would leave its horizontal component inside the hull: retain rear clearance.
  if(desired.y!==unclampedY){const horizontal=Math.hypot(desired.x-center.x,desired.z-center.z),safe=Math.max(horizontal,radius*2);desired.x=center.x-Math.cos(yaw)*safe;desired.z=center.z-Math.sin(yaw)*safe;}
  return{pivot:center,desired,look,radius,distance,padding:3};
 }
 class Boom {
  constructor(){this.ray=new T.Raycaster();this.box=new T.Box3();this.point=new T.Vector3();this.worldBounds=new WeakMap();}
  resolve(frame,renderer,game,actor){
   const {pivot,desired,padding}=frame,delta=desired.clone().sub(pivot),length=delta.length();
   if(length<.001)return desired.clone();const direction=delta.clone().divideScalar(length),side=new T.Vector3().crossVectors(direction,new T.Vector3(0,1,0)).normalize();
   if(side.lengthSq()<.1)side.set(1,0,0);const up=new T.Vector3().crossVectors(side,direction).normalize();
   const offsets=[new T.Vector3(),side.clone().multiplyScalar(padding),side.clone().multiplyScalar(-padding),up.clone().multiplyScalar(padding),up.clone().multiplyScalar(-padding)];
   // Five parallel rays protect a small camera volume rather than one pixel.
   // AABBs are broad phase only; actual meshes decide solid obstruction.
   const candidates=[];
   for(const e of game.entities){if(e.id===actor.id||e.hp<=0||!e.structure)continue;const model=renderer.objects.get(e.id);if(!model?.visible)continue;model.updateWorldMatrix(true,true);this.box.setFromObject(model);if(this.box.distanceToPoint(pivot)>length+padding)continue;candidates.push(model);}
   for(const o of renderer.world.children){
    if(o===renderer.water||!o.visible||!o.isMesh||o.userData.decorative||(o.isInstancedMesh&&!o.userData.firstPersonOccluder))continue;
    o.updateWorldMatrix(true,false);let cached=this.worldBounds.get(o),box=cached?.box;
    // Instanced trees change as they fall; never retain their old envelopes.
    if(!box||o.isInstancedMesh||cached.matrix.some((n,i)=>n!==o.matrixWorld.elements[i])){box=new T.Box3().setFromObject(o);if(!o.isInstancedMesh)this.worldBounds.set(o,{box,matrix:o.matrixWorld.elements.slice()});}
    if(box.distanceToPoint(pivot)<=length+padding)candidates.push(o);
   }
   let allowed=length;
   for(const offset of offsets){
    const start=pivot.clone().add(offset);this.ray.set(start,direction);this.ray.far=allowed+padding;
    for(const hit of this.ray.intersectObjects(candidates,true)){
     const treeId=root.WarTrees?.resolveHit(hit);if(treeId&&!(root.WarTrees.get(game,treeId)?.hp>0))continue;
     allowed=Math.min(allowed,Math.max(.25,hit.distance-padding));break;
    }
   }
   this.distance=allowed;this.obstructed=allowed<length-.01;
   return pivot.clone().addScaledVector(direction,allowed);
  }
 }
 root.WarVehicleCamera={frame,Boom};
})(globalThis);
