/* Read-only presentation of authoritative components and frozen wreck events.
 * Distances, smoke density and collapse timings are game art, not physical models.
 * Shared model geometry/PBR materials are never changed by a damage instance. */
(function(root){
 'use strict';const T=root.THREE,states=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const limits={low:{live:10,wreck:5,range:700,particles:2},medium:{live:18,wreck:8,range:1100,particles:3},high:{live:26,wreck:12,range:1600,particles:5}};
 function dispose(entry){entry.group.removeFromParent();root.WarPersonnelAnimation?.release(entry.group);root.WarVehicleAnimation?.release(entry.group);for(const m of entry.owned||[])m.dispose();}
 function clear(renderer){const s=states.get(renderer);if(!s)return;for(const e of [...s.live.values(),...s.wrecks.values(),...s.wash.values(),...s.marks.values()])dispose(e);s.smokeTexture.dispose();s.fireTexture.dispose();s.ring.dispose();s.scar.dispose();states.delete(renderer);}
 function texture(fire){const pixels=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const dx=(x-31.5)/32,dy=(y-31.5)/32,r=Math.hypot(dx,dy),noise=.82+.18*Math.sin(x*.51+Math.cos(y*.43)*2)*Math.sin(y*.36+x*.21),alpha=Math.max(0,1-r);const i=(y*64+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(255*Math.pow(alpha,fire?1.6:1.25)*noise);}const tex=new T.DataTexture(pixels,64,64,T.RGBAFormat);tex.needsUpdate=true;tex.minFilter=tex.magFilter=T.LinearFilter;return tex;}
 function state(renderer,game){let s=states.get(renderer);if(s?.game!==game){clear(renderer);s=null;}if(!s){s={game,live:new Map(),wrecks:new Map(),wash:new Map(),marks:new Map(),seen:new WeakSet(),smokeTexture:texture(false),fireTexture:texture(true),ring:new T.RingGeometry(.85,1,24),scar:new T.CircleGeometry(1,9),time:-1};states.set(renderer,s);}return s;}
 function near(renderer,e,max){const fp=renderer.firstPerson,eye=fp?.active?fp.eye:null;return eye?Math.hypot(e.x-eye.x,e.y-eye.z,(e.height??e.altitude??0)-eye.y)<max:Math.hypot(e.x-(renderer.camera?.x||0),e.y-(renderer.camera?.y||0))<max;}
 function visible(game,e){return e.team===0||!game.visibleAt||game.visibleAt(e.x,e.y);}
 function waterAt(game,x,y){const d=root.WarData||{},size=d.TILE||48,cols=d.COLS||Math.ceil((d.W||6240)/size),tiles=game.map?.tiles;return !!tiles&&[3,6].includes(tiles[Math.floor(y/size)*cols+Math.floor(x/size)]);}
 function material(color,opacity=1){return new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false});}
 function particle(s,color,opacity,fire=false){return new T.Sprite(new T.SpriteMaterial({color,map:fire?s.fireTexture:s.smokeTexture,transparent:true,opacity,depthWrite:false,toneMapped:false,blending:fire?T.AdditiveBlending:T.NormalBlending}));}
 function applyBodyPose(renderer,model,e){const u=root.WarData?.U?.[e.kind]||{},c=e.components,scale=model.userData.scale||1;if(u.naval&&!u.underwater&&c){model.rotation.x=(e.roll||0)+(c.listing||0);model.position.y=(renderer.entityHeight?.(e)??e.altitude??0)-(c.flooding||0)*scale*.35;}if(u.air&&!u.space&&(u.modelKind||e.kind)==='heli'){const m=e.motion||{},side=-(m.vx||0)*Math.sin(e.angle||0)+(m.vy||0)*Math.cos(e.angle||0);model.rotation.x=(e.roll||0)+clamp(side/Math.max(30,u.speed||80),-.22,.22);}}
 function liveEntry(s,renderer,e){const group=new T.Group(),owned=[],smoke=[],flame=[];group.name='component-damage-'+e.id;group.userData.damageEffect=true;
  for(let i=0;i<3;i++){const o=particle(s,0x454b4b,.28);owned.push(o.material);smoke.push(o);group.add(o);}
  for(let i=0;i<2;i++){const o=particle(s,i?0xffcb6b:0xff671e,.7,true);owned.push(o.material);flame.push(o);group.add(o);}
  const mat=material(0x171b1c,.85),scar=new T.Mesh(s.scar,mat);mat.side=T.DoubleSide;owned.push(mat);group.add(scar);renderer.scene.add(group);return {group,owned,smoke,flame,scar,anchor:null,hit:-Infinity};
 }
 function livePose(entry,model,e,time,detail,renderer){const c=e.components,u=root.WarData?.U?.[e.kind]||{},scale=model.userData.scale||1,fire=c.fireUntil>time&&!u.underwater;
  const hp=Object.values(c.parts||{}).reduce((m,p)=>Math.min(m,p.health),1),severity=1-hp,engine=c.parts?.engine?.health??1;
  // Hit point is a frozen simulation-space point; retain its local face location
  // after the vehicle moves. Continuous fires prefer the damaged engine end.
  if(entry.hit!==c.lastHitAt){entry.hit=c.lastHitAt;const p=c.hitPoint;if(p){model.updateMatrixWorld(true);entry.anchor=model.worldToLocal(new T.Vector3(p.x,renderer.displayHeight?.(p.height)??p.height,p.y));}else entry.anchor=null;}
  const local=entry.anchor?.clone()||new T.Vector3(engine<.7?-1.7:0,1.2,0),world=model.localToWorld(local.clone());entry.group.position.copy(world);
  // Internal component hits still vent through the exterior. Resolve the top
  // surface only when the local hit changes; no per-frame scene raycast.
  if(!entry.surfaceAt||entry.surfaceAt.distanceToSquared(local)>.25){entry.surfaceAt=local.clone();model.updateMatrixWorld(true);const start=new T.Vector3(world.x,model.position.y+Math.max(150,scale*14),world.z),ray=new T.Raycaster(start,new T.Vector3(0,-1,0),0,Math.max(300,scale*28));const hit=ray.intersectObject(model,true).find(h=>!h.object.userData.motionEffect);entry.surfaceLift=hit?Math.max(1,hit.point.y-world.y+1):Math.max(1,(renderer.entityHeight?.(e)??e.altitude??0)+scale*(e.structure?3.5:u.naval?1.8:1.4)-world.y);}
  const surfaceLift=entry.surfaceLift;
  entry.scar.visible=severity>.15&&!!entry.anchor;entry.scar.scale.setScalar(clamp((e.r||15)*.13,1.2,7));entry.scar.lookAt(new T.Vector3(e.x,(model.position.y||0)+(e.structure?12:2),e.y));
  for(let i=0;i<3;i++){const o=entry.smoke[i],on=(severity>.25||fire)&&i<detail&&!(u.space||u.underwater);o.visible=on;if(!on)continue;const phase=((time*.37+i*.33+e.id*.07)%1+1)%1,r=(1.5+phase*4)*Math.max(1,scale*.34);o.position.set(Math.sin(i*2.4+time*.31)*phase*6,surfaceLift+phase*28,Math.cos(i*2.4)*phase*5);o.scale.set(r*2,r*2.6,r);o.material.opacity=(1-phase)*(.22+severity*.28);}
  for(let i=0;i<2;i++){const o=entry.flame[i];o.visible=(fire||u.space&&severity>.6)&&i<detail;if(!o.visible)continue;const pulse=.8+.2*Math.sin(time*17+e.id+i*2),r=clamp(scale*.35,1.1,4)*pulse;o.position.set(i*1.2,surfaceLift+2+i*2,0);o.scale.set(r*2,r*(u.space?2:4.2),r);o.material.color.setHex(u.space?0x86d4f7:i?0xffcb6b:0xff671e);o.material.opacity=u.space?.45:.6;}
  // Pose is derived from current state; the renderer resets the base pose every
  // frame. Repairs therefore restore an upright hull without accumulated drift.
  if(u.naval&&!u.underwater){model.rotation.x=(e.roll||0)+(c.listing||0);model.position.y=(renderer.entityHeight?.(e)??e.altitude??0)-(c.flooding||0)*scale*.35;}
 }
 function wreckEntry(s,renderer,game,fx){const faction=fx.faction||game.teams?.[fx.team]?.faction||'chn',group=root.WarModels.create(fx.kind,faction),owned=[];group.name='combat-wreck-'+fx.entityId;group.scale.setScalar(group.userData.scale||1);const scale=group.scale.clone();
  // Copy only materials: original geometries/textures and author credits survive.
  const copies=new Map();group.traverse(o=>{if(!o.isMesh)return;const copy=m=>{if(!copies.has(m)){const c=m.clone();if(c.color)c.color.multiplyScalar(.42);if(c.emissive)c.emissive.setHex(0);c.transparent=true;c.depthWrite=true;copies.set(m,c);owned.push(c);}return copies.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);o.raycast=()=>{};});
  const debris=[];if(!fx.personnel)for(let i=0;i<3;i++){const o=particle(s,i===2?0xffa34f:0x44494b,i===2?.6:.2,i===2);o.userData.motionEffect=true;o.raycast=()=>{};group.add(o);owned.push(o.material);debris.push(o);}
  renderer.scene.add(group);return {group,owned,scale,fx,debris};
 }
 function washEntry(s,renderer,e){const group=new T.Group(),owned=[];group.name='rotor-ground-wash-'+e.id;for(let i=0;i<2;i++){const mat=material(0xb6aa82,.2);mat.side=T.DoubleSide;owned.push(mat);const o=new T.Mesh(s.ring,mat);o.rotation.x=-Math.PI/2;group.add(o);}renderer.scene.add(group);return{group,owned};}
 function update(renderer,game){if(!T||!renderer.scene)return;const s=state(renderer,game),time=Number(game.time)||0,l=limits[renderer.quality]||limits.high,live=new Set(),wash=new Set();
  const candidates=(game.entities||[]).filter(e=>e.hp>0&&visible(game,e)&&near(renderer,e,l.range)&&renderer.objects?.get(e.id)?.visible).sort((a,b)=>Math.hypot(a.x-(renderer.camera?.x||0),a.y-(renderer.camera?.y||0))-Math.hypot(b.x-(renderer.camera?.x||0),b.y-(renderer.camera?.y||0)));
  for(const e of candidates){const model=renderer.objects.get(e.id),c=e.components,u=root.WarData?.U?.[e.kind]||{},damaged=c&&!c.personnel&&(c.fireUntil>time||c.flooding>0||Object.values(c.parts||{}).some(p=>p.health<.9));
   if(damaged&&live.size<l.live){live.add(e.id);let entry=s.live.get(e.id);if(!entry){entry=liveEntry(s,renderer,e);s.live.set(e.id,entry);}livePose(entry,model,e,time,near(renderer,e,400)?l.particles:1,renderer);}
   applyBodyPose(renderer,model,e);
   if(u.air&&!u.space&&(u.modelKind||e.kind)==='heli'&&(e.altitude??65)<55&&wash.size<6){wash.add(e.id);let w=s.wash.get(e.id);if(!w){w=washEntry(s,renderer,e);s.wash.set(e.id,w);}const wet=waterAt(game,e.x,e.y);w.group.position.set(e.x,.25,e.y);for(let i=0;i<w.group.children.length;i++){const o=w.group.children[i],phase=(time*.7+i*.5)%1,r=(e.r||20)*(.7+phase*1.5);o.scale.setScalar(r);o.material.color.setHex(wet?0x9bc2cb:0xb6aa82);o.material.opacity=(1-phase)*.16*clamp(1-(e.altitude||0)/55,0,1);}}
  }
  for(const [id,v]of s.live)if(!live.has(id)){dispose(v);s.live.delete(id);}for(const [id,v]of s.wash)if(!wash.has(id)){dispose(v);s.wash.delete(id);}
  for(const fx of game.effects||[]){if(!['impact','explosion'].includes(fx.type)||s.seen.has(fx))continue;s.seen.add(fx);const style=root.WarWeaponEffects?.impactStyle(fx,game);if(style?.medium!=='ground'||(fx.height||0)>1||!visible(game,fx)||!near(renderer,fx,l.range)||s.marks.size>=(renderer.quality==='low'?8:16))continue;const mat=material(0x272a26,.55),group=new T.Group(),mark=new T.Mesh(s.scar,mat),radius=fx.ammoType==='ap'?.7:clamp(Math.sqrt(style.visualRadius||8)*.75,1,8);mark.rotation.x=-Math.PI/2;mark.scale.setScalar(radius);group.add(mark);group.position.set(fx.x,.05,fx.y);renderer.scene.add(group);s.marks.set(fx,{group,owned:[mat],at:time,fx});}
  for(const [key,v]of s.marks){const age=time-v.at;if(age>18){dispose(v);s.marks.delete(key);}else{v.group.visible=visible(game,v.fx)&&near(renderer,v.fx,l.range);v.owned[0].opacity=.55*clamp((18-age)/4,0,1);}}
  for(const fx of game.effects||[]){if(fx.type!=='wreck'||s.seen.has(fx))continue;s.seen.add(fx);if(s.wrecks.size>=l.wreck||!visible(game,fx)||!near(renderer,fx,l.range))continue;const age=time-(fx.createdAt??time);if(age>(fx.max||35))continue;s.wrecks.set(fx,wreckEntry(s,renderer,game,fx));}
  for(const [key,v]of s.wrecks){const f=v.fx,age=Math.max(0,time-(f.createdAt??time)),life=f.max||35;if(age>=life||f.ttl<=0){dispose(v);s.wrecks.delete(key);continue;}const u=root.WarData?.U?.[f.kind]||{},building=!!root.WarData?.B?.[f.kind],sink=f.naval&&!u.underwater?Math.min(1,age/18):0,collapse=building?clamp(age/2.2,0,1):0;
   v.group.visible=visible(game,f)&&near(renderer,f,l.range);v.group.position.set(f.x,renderer.displayHeight?.(f.height||0)??f.height??0,f.y);v.group.rotation.set((f.roll||0)+sink*.7,-(f.angle||0),(f.pitch||0)+(f.aircraft?clamp(age/2,0,1)*.26:0),'YZX');v.group.scale.copy(v.scale);v.group.scale.y*=1-collapse*.82;v.group.position.y-=sink*(f.r||20)*1.7;if(f.personnel)root.WarPersonnelAnimation?.update(v.group,{...f,id:f.entityId,hp:0,components:f.components},time);for(const m of v.owned)m.opacity=clamp((life-age)/4,0,1);
   for(let i=0;i<v.debris.length;i++){const o=v.debris[i],fire=i===2,active=fire?(f.components?.fireUntil||0)>time:age<10;o.visible=active&&!u.underwater&&!u.space&&near(renderer,f,600)&&sink<.45;if(!o.visible)continue;const p=(time*.5+i*.45)%1;o.position.set(Math.sin(i+time*.2)*p,1.5+(fire?.3:p*4),0);o.scale.setScalar(fire?.35+.1*Math.sin(time*15):.6+p);o.scale.y*=fire?2.5:1;o.material.opacity=fire?.5:(1-p)*.22;}
  }s.time=time;return {live:s.live.size,wrecks:s.wrecks.size,wash:s.wash.size,marks:s.marks.size,limits:l};
 }
 root.WarCombatDamageVisuals={update,clear,state:r=>states.get(r),limits,applyBodyPose};
})(globalThis);
