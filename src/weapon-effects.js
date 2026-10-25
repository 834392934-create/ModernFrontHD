/* Discharge envelopes are visual game timings, independent of damage and hit rays. */
(function(root){
 'use strict';const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const states=new WeakMap(),anchorCaches=new WeakMap(),projectileStates=new WeakMap();
 const profiles={
  rifle:{flash:.035,size:2,recoil:.18,smoke:.18,trail:9,color:'#ffdcb2',eject:true},
  machinegun:{flash:.026,size:2.4,recoil:.13,smoke:.25,trail:14,color:'#ffce80',eject:true},
  sniper:{flash:.055,size:3.2,recoil:.45,smoke:.38,trail:18,color:'#ffe4b3'},
  shotgun:{flash:.045,size:3.5,recoil:.5,smoke:.36,trail:6,color:'#ffd8a0'},
  grenade:{flash:.03,size:3.2,recoil:.32,smoke:.25,trail:4,color:'#dfc798'},
  cannon:{flash:.065,size:12,recoil:1,smoke:.75,trail:22,color:'#ffd29a',dust:true},
  howitzer:{flash:.085,size:15,recoil:1.15,smoke:1.1,trail:26,color:'#ffe1a5',dust:true},
  mortar:{flash:.045,size:4.5,recoil:.12,smoke:.55,trail:9,color:'#f3d6aa'},
  autocannon:{flash:.038,size:5,recoil:.45,smoke:.35,trail:17,color:'#ffd79b',eject:true},
  navalGun:{flash:.06,size:11,recoil:.85,smoke:.7,trail:24,color:'#ffe1ac'},
  rocket:{flash:.15,size:16,recoil:.025,smoke:1.2,trail:38,color:'#ffba6c',exhaust:true},
  missile:{flash:.22,size:11,recoil:0,smoke:1.1,trail:42,color:'#ffc77e',exhaust:true},
  torpedo:{flash:0,size:3,recoil:0,smoke:0,trail:28,color:'#9cdedb',wake:true},
  bomb:{flash:0,size:4,recoil:0,smoke:0,trail:2,color:'#b5b8b4'},
  beam:{flash:0,size:8,recoil:0,smoke:0,trail:0,color:'#a9e3ff',beam:true},
  pulse:{flash:.1,size:5,recoil:.08,smoke:0,trail:28,color:'#a4dbff'},
 };
 function family(f){if(Object.prototype.hasOwnProperty.call(profiles,f.weaponFamily))return f.weaponFamily;
  const k=f.sourceKind||f.kind||'',u=root.WarData?.U?.[k]||root.WarData?.B?.[k]||{},w=root.WarOperatorWeapons?.byId?.[f.weaponId],fx=f.weaponFx||u.weaponFx;
  if(w)return({lmg:'machinegun',smg:'machinegun',pistol:'rifle',marksman:'sniper',launcher:'rocket'})[w.category]||w.category;
  if(k==='aa'&&f.sourceFaction==='kor')return 'autocannon';
  if(k==='ifv'&&['chn','rus'].includes(f.sourceFaction))return 'cannon';
  if(fx==='torpedo')return 'torpedo';if(/beam/.test(fx))return 'beam';if(fx==='interceptor-burst')return 'pulse';
  if(['rocket','rocket_artillery','antitank_team'].includes(k))return 'rocket';
  if(f.rocket||u.rocket||/missile|asat|sam/.test(k)||['heli','aa','fighter','jet','interceptor'].includes(k))return 'missile';
  if(u.air&&!u.space&&/bomber|bombard|strategic_strike/.test(k))return 'bomb';
  if(/mortar/.test(k))return 'mortar';if(/howitzer|arty/.test(k))return 'howitzer';if(/machinegun|ciws|point_defense|mobile_air_defense/.test(k))return 'machinegun';if(/sniper/.test(k))return 'sniper';
  if(u.naval)return 'navalGun';if(['tank','tank_destroyer','assault_gun','railgun'].includes(k)||(u.modelKind==='tank'))return 'cannon';if((u.modelKind||k)==='infantry')return 'rifle';return 'autocannon';
 }
 function profile(f){const name=family(f);return{name,...(profiles[name]||profiles.rifle)};}
 function modelBounds(model){const T=root.THREE,box=new T.Box3(),part=new T.Box3();model.updateMatrixWorld(true);const inverse=model.matrixWorld.clone().invert();
  model.traverse(node=>{if(!node.isMesh||node.userData.motionEffect)return;const geometry=node.geometry;if(!geometry?.attributes?.position)return;if(!geometry.boundingBox)geometry.computeBoundingBox();part.copy(geometry.boundingBox).applyMatrix4(inverse.clone().multiply(node.matrixWorld));box.union(part);});
  if(box.isEmpty())box.set(new T.Vector3(-2,0,-1),new T.Vector3(2,2,1));return box;
 }
 // Public renderer/FPS API. Existing accurately identified barrels are retained.
 // Additional stations only add invisible anchors, never invent mesh hardware or
 // claim a model has passed real equipment verification. Their metadata exposes
 // whether a point is an original modeled port or a conservative approximation.
 function weaponAnchor(model,weapon={},options={}){
  if(!model)return null;weapon=weapon||{};
  let cache=anchorCaches.get(model);if(!cache){cache=new Map();anchorCaches.set(model,cache);}
  const key='resolved|'+[options.kind||weapon.sourceKind||weapon.kind||model.userData.kind,options.faction||weapon.sourceFaction||weapon.faction||model.userData.faction,weapon.weaponId||weapon.id,weapon.weaponFamily||weapon.family,weapon.weaponMuzzleClass||weapon.muzzleClass,options.portIndex??weapon.portIndex??'base'].join('|');
  if(cache.has(key))return cache.get(key);
  const anchor=buildWeaponAnchor(model,weapon,options);if(anchor)cache.set(key,anchor);return anchor;
 }
 function buildWeaponAnchor(model,weapon={},options={}){
  if(!model?.getObjectByName||!root.THREE)return null;
  weapon=weapon||{};
  const T=root.THREE,kind=options.kind||weapon.sourceKind||weapon.kind||model.userData.kind,faction=options.faction||weapon.sourceFaction||weapon.faction||model.userData.faction,
   explicit=!!(weapon.weaponFamily||weapon.family||weapon.weaponMuzzleClass||weapon.muzzleClass),fam=weapon.weaponFamily||weapon.family||family({...weapon,sourceKind:kind,sourceFaction:faction}),
   cls=weapon.weaponMuzzleClass||weapon.muzzleClass||(fam==='missile'?'launcher':fam==='rocket'?'rocket':fam==='torpedo'?'torpedo':fam==='bomb'?'bombBay':fam==='airWing'?'flightDeck':'gun'),
   port=options.portIndex??weapon.portIndex,id=weapon.weaponId||weapon.id||'',base=model.getObjectByName(Number.isInteger(port)?'muzzle_'+port:'muzzle')||model.getObjectByName('muzzle')||null,u=root.WarData?.U?.[kind]||{},
   primary=model.userData.muzzleFamily||(['submarine','hunter_sub','torpedo_boat','asw_patrol_ship'].includes(kind)?'torpedo':['rocket'].includes(kind)?'rocket':['asat','tank_destroyer','missile_boat','arsenal_ship','air_defense_ship','missile_sub','orbital_missile_barge'].includes(kind)?'missile':kind==='aa'?(['kor','imp'].includes(faction)?'autocannon':'missile'):null);
  if(!explicit)return base;
  const pods=model.userData.rocketPodRig?.slots||0;if(cls==='rocket'&&pods)return model.getObjectByName('weapon_port_rocket_'+((Number.isInteger(port)?port:0)%pods));
  const storeCount=model.userData.payloadRig?.slots||0,store=storeCount&&['launcher','rocket','bombBay'].includes(cls)?model.getObjectByName('weapon_port_payload_'+((Number.isInteger(port)?port:0)%storeCount)):null;if(store)return store;
  if(cls==='gun'&&fam==='autocannon'&&model.getObjectByName('weapon_port_chin'))return model.getObjectByName('weapon_port_chin');
  const named=model.getObjectByName('weapon_muzzle_'+id.replace(/[^a-zA-Z0-9_]/g,'_'));if(named)return named;
  // Primary torpedo ports and existing rocket racks are real model exit points.
  if(base&&((cls==='torpedo'&&primary==='torpedo')||(cls==='rocket'&&primary==='rocket')||(cls==='launcher'&&primary==='missile')))return base;
  const matchingGun=primary===null||primary===fam||(primary==='cannon'&&fam==='howitzer');
  if(base&&cls==='gun'&&matchingGun&&!['missile','rocket','torpedo'].includes(primary)&&!(fam==='machinegun'&&['tank','ifv','aa','assault_gun'].includes(kind))&&!(kind==='ifv'&&fam==='autocannon'&&['rus','chn'].includes(faction)))return base;
  let cache=anchorCaches.get(model);if(!cache){cache=new Map();anchorCaches.set(model,cache);}const key=[id,cls,kind,faction,port??0].join('|');if(cache.has(key))return cache.get(key);
  const box=modelBounds(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),point=new T.Vector3(),marker=new T.Object3D();
  let parent=model,source='approximate-'+cls+'-station',approximate=true,boundary='Conservative game launch station; this exterior does not establish the exact weapon port or variant.';
  if(cls==='launcher'&&u.naval&&!u.underwater){
   const length={usa:24,chn:27,rus:21,ind:25,kor:26}[faction];
   if(kind==='destroyer'&&length&&!model.userData.assetPath){point.set(length*.27,1.2445,0);source='existing-forward-vls-deck-cell';approximate=false;boundary='Aligned with the existing procedural forward VLS cell surface; not a claim of real variant cell placement.';}
   else if(kind==='destroyer'&&model.userData.assetPath?.includes('burke')){point.set(4.7,1.38,0);source='approximate-licensed-burke-forward-launch-deck';boundary='Licensed exterior retained; forward deck launch point is approximate, not an audited cell opening.';}
   else if(kind==='frigate'){point.set(3.7,1.495,.4);source='existing-original-frigate-launch-cover';approximate=false;boundary='Existing original role-model deck cover, not a certified real frigate installation.';}
   else point.set(center.x+size.x*.22,Math.max(.8,box.min.y+size.y*.20),0);
  }else if(cls==='torpedo'){
   if(u.underwater)point.set(box.max.x+.02,Math.min(0,center.y),0);
   else point.set(center.x+size.x*.08,-.1,box.max.z+.02);
   source=u.underwater?'approximate-forward-torpedo-exit':'approximate-side-torpedo-exit';
  }else if((cls==='launcher'||cls==='rocket'||cls==='bombBay')&&u.air&&!u.space){
   point.set(center.x+(cls==='bombBay'?0:size.x*.12),box.min.y-.025,cls==='bombBay'?0:size.z*.17*(Number.isInteger(port)&&port%2?-1:1));
   source=cls==='bombBay'?'approximate-belly-store-release':'approximate-underwing-store-release';
  }else if(cls==='launcher'&&u.underwater){
   point.set(center.x+size.x*.18,Math.max(.4,size.z*.3),0);source='approximate-submarine-missile-release';
  }else if(cls==='flightDeck'){
   point.set(center.x+size.x*.3,box.min.y+size.y*.28,0);source='approximate-flight-deck-launch-point';
  }else if(cls==='gun'&&fam==='autocannon'&&!model.userData.assetPath&&model.getObjectByName('turret')&&((kind==='aa'&&['usa','rus'].includes(faction))||(kind==='ifv'&&['chn','rus'].includes(faction)))){
   parent=model.getObjectByName('turret');
   point.fromArray(kind==='aa'?(faction==='usa'?[2.062,.53,0]:[2.662,.65,.91]):faction==='rus'?[3.562,.39,-.21]:[3.712,.28,.05]);
   source='existing-secondary-autocannon-barrel-tip';approximate=false;boundary='Matches the existing procedural barrel geometry; not a certified real mount dimension.';
  }else if(cls==='gun'&&weapon.mountId==='roof'&&model.userData.motionRig?.some(d=>d.mountId==='roof')){
   const recoil=model.userData.motionRig.find(d=>d.mountId==='roof'&&d.role==='recoil');parent=model.getObjectByName((recoil||model.userData.motionRig.find(d=>d.mountId==='roof')).node);point.set(recoil?1.127:1.357,recoil?0:.39,0);source='existing-roof-machinegun-tip';approximate=false;boundary='Existing roof gun geometry; CROWS family role does not certify this enclosure or variant.';
  }else if(cls==='gun'&&fam==='machinegun'&&base&&!u.naval){
   // Keep a secondary gun on the existing turret assembly, not at the long main barrel tip.
   parent=model.getObjectByName('turret')||base.parent;point.set(.95,.65,.24);source='approximate-secondary-turret-gun';
  }else if(cls==='gun'&&u.naval){
   point.set(center.x+size.x*.24,Math.max(.8,box.min.y+size.y*.23),box.min.z*.78);source='approximate-deck-self-defense-station';
  }else if(cls==='gun'&&u.air&&!u.space){
   point.set(box.max.x+.025,Math.min(center.y,0),0);source='approximate-aircraft-gun-exit';
  }else if(cls==='launcher'||cls==='rocket'){
   const turret=model.getObjectByName('turret');if(turret){parent=turret;point.set(.35,.75,.60);}else point.set(center.x+size.x*.2,center.y+size.y*.12,center.z+size.z*.25);
  }else{point.set(box.max.x+.025,center.y,0);}
  marker.name='weapon_muzzle_'+(id||cls).replace(/[^a-zA-Z0-9_]/g,'_')+'__port_'+(port??0);marker.position.copy(point);marker.userData={weaponAnchor:true,weaponId:id,muzzleClass:cls,source,approximate,boundary};parent.add(marker);marker.updateWorldMatrix(true,false);cache.set(key,marker);return marker;
 }
 // The shared frozen visual origin is consumed by both discharge and RTS trails.
 // Explicit direct origins must survive leaving the vehicle before first render.
 function shotOrigin(renderer,game,shot){
  if(Array.isArray(shot.visualOrigin)&&shot.visualOrigin.length===3)return [shot.visualOrigin[0],shot.visualOrigin[2],shot.visualOrigin[1]];
  const origin=[shot.x,shot.sourceHeight??8,shot.y];
  if(!shot.originFrozen&&!shot.directOrigin&&game.directControl?.id!==shot.sourceId){
   const model=renderer.objects?.get(shot.sourceId),anchor=weaponAnchor(model,shot);if(anchor){const p=anchor.getWorldPosition(new root.THREE.Vector3()),source=game.get(shot.sourceId);origin[0]=p.x;origin[2]=p.z;origin[1]=p.y+(source?(renderer.physicalHeight?.(source)||0)-(renderer.entityHeight?.(source)||0):0);shot.visualAnchor={source:anchor.userData.source||'existing-model-muzzle',approximate:!!anchor.userData.approximate||/^approximate-/.test(anchor.userData.source||''),muzzleClass:anchor.userData.muzzleClass||shot.weaponMuzzleClass||'gun'};}
  }
  shot.visualOrigin=[origin[0],origin[2],origin[1]];return origin;
 }
 // Screen-space drawing consumes world-projected coordinates supplied by each
 // camera path. It never changes the frozen physical projectile endpoints.
 function discharge(ctx,p,head,dir,age,scale=1){if(!p||age<0)return;const size=clamp(p.size*scale,1,100),fade=1-age/p.flash;ctx.save();
  if(p.flash>0&&fade>0){ctx.translate(head.x,head.y);ctx.rotate(Math.atan2(dir.y,dir.x));ctx.globalAlpha=fade;ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(-size*.2,-size*.25);ctx.lineTo(size*1.8,0);ctx.lineTo(-size*.2,size*.25);ctx.lineTo(size*.35,0);ctx.closePath();ctx.fill();ctx.fillStyle='#fff8dc';ctx.beginPath();ctx.ellipse(size*.2,0,size*.5,size*.18,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();if(p.eject&&age>0&&age<.24){ctx.save();ctx.globalAlpha=1-age/.24;ctx.fillStyle='#bc9b58';const offset=age*50*scale;ctx.translate(head.x+dir.y*offset,head.y-dir.x*offset+age*age*90*scale);ctx.rotate(age*18);ctx.fillRect(-1,-.5,Math.max(1,2*scale),Math.max(.5,scale));ctx.restore();}if(p.smoke&&age>0&&age<p.smoke){const t=age/p.smoke;ctx.save();ctx.globalAlpha=(1-t)*(p.exhaust?.32:.22);ctx.fillStyle=p.exhaust?'#d8d6c9':'#b9b6a9';for(let i=0;i<4;i++){const a=i*2.399,r=size*(.25+t*.95),shift=p.exhaust?-1:1;ctx.beginPath();ctx.ellipse(head.x+dir.x*size*t*shift+Math.cos(a)*r*.65,head.y+dir.y*size*t*shift+Math.sin(a)*r*.45-size*t*.4,r*.55,r*.4,0,0,Math.PI*2);ctx.fill();}if(p.dust){ctx.globalAlpha=(1-t)*.15;ctx.fillStyle='#9f8c68';ctx.beginPath();ctx.ellipse(head.x,head.y+size*.3,size*(1+t*2),size*.20,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
 }
 function update(renderer,game){let s=states.get(renderer);if(!s||s.game!==game){s={game,seen:new WeakSet(),projectiles:new Map(),shots:[]};states.set(renderer,s);}for(const [id,at]of s.projectiles)if(game.time-at>2)s.projectiles.delete(id);for(const f of game.effects||[]){if(!['shot','interceptor','discharge'].includes(f.type)||s.seen.has(f))continue;s.seen.add(f);if(f.projectileId!=null&&s.projectiles.has(f.projectileId))continue;if(f.projectileId!=null)s.projectiles.set(f.projectileId,Number.isFinite(f.firedAt)?f.firedAt:game.time);if(!game.visibleAt(f.x,f.y)&&f.sourceId!==renderer.firstPerson?.entityId)continue;
   const p=profile(f),origin=shotOrigin(renderer,game,f);if(['separation','vertical'].includes(f.projectile?.phase)){p.flash=0;p.smoke=0;}
   s.shots.push({p,origin,end:[f.tx,f.targetHeight??0,f.ty],at:Number.isFinite(f.firedAt)?f.firedAt:game.time-Math.max(0,f.max-f.ttl),max:f.max});
  }s.shots=s.shots.filter(v=>game.time-v.at<Math.max(v.p.smoke,v.p.flash,v.p.exhaust?1.3:0));if(s.shots.length>160)s.shots.splice(0,s.shots.length-160);return s;
 }
 function draw(renderer,game){const s=update(renderer,game),fp=renderer.firstPerson?.active?renderer.firstPerson:null,T=root.THREE;for(const v of s.shots){const age=game.time-v.at,a=new T.Vector3(...v.origin),b=new T.Vector3(...v.end),direction=b.clone().sub(a).normalize();let head,next,scale;
   if(fp){const segment=fp.projectEffectSegment(a,a.clone().addScaledVector(direction,.2));if(!segment)continue;[head,next]=segment;scale=renderer.height/Math.max(50,fp.eye.distanceTo(a))*.20;}
   else{head=renderer.toScreen(a.x,a.z,a.y);next=renderer.toScreen(a.x+direction.x,a.z+direction.z,a.y+direction.y);scale=renderer.camera.zoom;}
   const dx=next.x-head.x,dy=next.y-head.y,len=Math.hypot(dx,dy)||1;discharge(renderer.ctx,v.p,head,{x:dx/len,y:dy/len},age,scale);
  }}
 function project(renderer,a,b){const fp=renderer.firstPerson;if(fp?.active)return fp.projectEffectSegment(new root.THREE.Vector3(a.x,a.height,a.y),new root.THREE.Vector3(b.x,b.height,b.y));const out=[renderer.toScreen(a.x,a.y,a.height),renderer.toScreen(b.x,b.y,b.height)];return out.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))?out:null;}
 function projectileType(fx){const f=family(fx);return ['rifle','machinegun','sniper','shotgun','autocannon'].includes(f)?'bullet':['cannon','navalGun','howitzer','mortar','grenade'].includes(f)?'shell':['rocket','missile','torpedo','bomb','pulse'].includes(f)?f:null;}
 function projectileAppearance(fx){const type=projectileType(fx),phase=fx.projectile?.phase||'powered',powered=['ignition','powered'].includes(phase);return{type,powered:powered&&['rocket','missile'].includes(type),tracer:type!=='bullet'||((fx.shotSerial??fx.projectileId??0)%3===0),phase};}
 function projectileGeometry(type){const T=root.THREE,b=new root.WarModels.Builder(),metal=type==='torpedo'?0x56656a:type==='bomb'?0x627362:type==='shell'?0x777c78:0xc4cac7,r=type==='bullet'?.09:type==='shell'?.23:type==='rocket'?.24:type==='missile'?.38:type==='torpedo'?.45:type==='pulse'?.18:.40,len=type==='bullet'?1:type==='shell'?2.1:type==='rocket'?4.5:type==='missile'?5.8:type==='torpedo'?5.5:type==='pulse'?2:2.7;
  b.cyl(r,len,0,0,0,metal,'x',r,16);if(['torpedo','bomb'].includes(type))b.add(new T.SphereGeometry(r,16,10,0,Math.PI*2,0,Math.PI/2),metal,[len/2,0,0],[0,0,-Math.PI/2]);else b.add(new T.ConeGeometry(r,type==='bullet'?.38:r*3,16),metal,[len/2+r*.5,0,0],[0,0,-Math.PI/2]);
  // These are original, category-readable projectiles, never exact national rounds.
  if(!['bullet','shell'].includes(type)){const outline=new T.Shape();outline.moveTo(-.5,r*.7);outline.lineTo(-.65,r*2.3);outline.lineTo(.15,r*2.1);outline.lineTo(.65,r*.7);outline.closePath();for(let i=0;i<4;i++)b.add(new T.ExtrudeGeometry(outline,{depth:.035,bevelEnabled:false}),metal,[-len*.35,0,0],[i*Math.PI/2,0,0]);}
  if(type==='torpedo'){b.cyl(.16,.35,-len/2-.15,0,0,0x656f6f,'x',.16,12);for(let i=0;i<4;i++)b.box(.055,.08,.56,-len/2-.24,0,0,0x777f7a,[i*Math.PI/2+.3,0,0]);}
  if(type==='shell')b.cyl(r*1.03,.17,-len*.30,0,0,0xa58b51,'x',r*1.03,12);
  const mesh=b.finish();return {geometry:mesh.geometry,length:len};
 }
 function clearProjectiles(renderer){const s=projectileStates.get(renderer);if(!s)return;s.group.removeFromParent();for(const v of s.geometries.values())v.geometry.dispose();s.material.dispose();s.energyMaterial.dispose();s.flameMaterial.dispose();s.flameGeometry.dispose();projectileStates.delete(renderer);}
 function updateProjectiles(renderer,game){if(!root.WarCombatProjectiles?.position||!renderer.scene||!root.WarModels)return;const T=root.THREE,quality=renderer.quality||'high',budget=quality==='low'?24:quality==='medium'?44:64,range=quality==='low'?400:quality==='medium'?650:900;let s=projectileStates.get(renderer);
  if(s?.game!==game){clearProjectiles(renderer);s=null;}if(!s){const group=new T.Group();group.name='physical-projectile-pool';renderer.scene.add(group);const flameGeometry=new T.ConeGeometry(.35,2.8,8);flameGeometry.rotateZ(Math.PI/2);s={game,group,entries:[],geometries:new Map(),shown:new Set(),material:new T.MeshStandardMaterial({vertexColors:true,roughness:.45,metalness:.55}),energyMaterial:new T.MeshBasicMaterial({color:0x9bdcf7,toneMapped:false}),flameMaterial:new T.MeshBasicMaterial({color:0xffbb66,transparent:true,opacity:.7,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),flameGeometry};projectileStates.set(renderer,s);}
  s.shown.clear();let n=0;const eye=renderer.firstPerson?.active?renderer.firstPerson.eye:null;
  for(const fx of game.effects||[]){if(n>=budget)break;if(!['shot','interceptor'].includes(fx.type)||fx.ttl<=0)continue;const style=projectileAppearance(fx);if(!style.type)continue;const p=root.WarCombatProjectiles.position(fx);if(![p.x,p.y,p.height].every(Number.isFinite)||game.visibleAt&&!game.visibleAt(p.x,p.y)||p.height<-3&&!renderer.firstPerson?.underwater)continue;
   const distance=eye?Math.hypot(p.x-eye.x,p.y-eye.z,p.height-eye.y):Math.hypot(p.x-(renderer.camera?.x||0),p.y-(renderer.camera?.y||0));if(distance>range)continue;
   let geo=s.geometries.get(style.type);if(!geo){geo=projectileGeometry(style.type);s.geometries.set(style.type,geo);}let entry=s.entries[n];if(!entry){const group=new T.Group(),body=new T.Mesh(geo.geometry,s.material),flame=new T.Mesh(s.flameGeometry,s.flameMaterial);group.userData.motionEffect=true;body.raycast=flame.raycast=()=>{};group.add(body,flame);s.group.add(group);entry={group,body,flame};s.entries.push(entry);}
   entry.group.visible=true;entry.body.geometry=geo.geometry;entry.body.material=style.type==='pulse'?s.energyMaterial:s.material;entry.group.position.set(p.x,renderer.displayHeight?.(p.height)??p.height,p.y);
   const before=fx.projectile?.previous||{x:fx.x,y:fx.y,height:fx.sourceHeight||0},v=fx.projectile?.velocity||{x:p.x-before.x,y:p.y-before.y,height:p.height-before.height},axis=new T.Vector3(v.x,v.height,v.y);if(axis.lengthSq()<1e-10)axis.set(fx.tx-fx.x,(fx.targetHeight||0)-(fx.sourceHeight||0),fx.ty-fx.y);if(axis.lengthSq()<1e-10)axis.set(1,0,0);entry.group.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),axis.normalize());entry.flame.visible=style.powered;entry.flame.position.set(-geo.length/2-1.1,0,0);entry.flame.scale.x=style.phase==='ignition'?.6:1;s.shown.add(fx);n++;
  }for(let i=n;i<s.entries.length;i++)s.entries[i].group.visible=false;return {visible:n,allocated:s.entries.length,budget,geometryKinds:s.geometries.size};
 }
 // One simulation trajectory feeds both camera paths. No view-specific arcs,
 // retargeting or damage; launch origin and previous physical point stay frozen.
 function drawProjectile(renderer,game,fx){if(!root.WarCombatProjectiles?.position)return false;const fam=family(fx);if(fam==='beam')return false;
  if(!['shot','interceptor','decoy','intercepted'].includes(fx.type))return false;
  const q=fx.interceptedAt||root.WarCombatProjectiles.position(fx);if(!q||![q.x,q.y,q.height].every(Number.isFinite)||game.visibleAt&&!game.visibleAt(q.x,q.y)||q.height<-3&&!renderer.firstPerson?.underwater)return true;
  const appearance=projectileAppearance(fx),hasBody=projectileStates.get(renderer)?.shown.has(fx);if(!appearance.tracer&&fx.type!=='interceptor')return true;
  const end=fx.projectile?.previous||{x:fx.x,y:fx.y,height:fx.sourceHeight||0},segment=project(renderer,q,end);if(!segment)return true;
  const [head,tail]=segment,p=profile(fx),g=renderer.ctx,dx=head.x-tail.x,dy=head.y-tail.y,len=Math.hypot(dx,dy)||1,trail=Math.min(Math.max(2,len),p.trail||4),tx=head.x-dx/len*trail,ty=head.y-dy/len*trail;
  g.save();if(fx.type==='decoy'){g.strokeStyle='#a5dcd6';g.globalAlpha=.5;g.lineWidth=1;g.beginPath();g.arc(head.x,head.y,4+Math.sin(game.time*7)*2,0,Math.PI*2);g.stroke();}
  else if(fx.type==='intercepted'){g.strokeStyle='#ffe9b1';g.globalAlpha=clamp(fx.ttl/.12,0,1);for(let i=0;i<6;i++){const a=i*Math.PI/3;g.beginPath();g.moveTo(head.x,head.y);g.lineTo(head.x+Math.cos(a)*10,head.y+Math.sin(a)*10);g.stroke();}}
  else if(fam==='bomb'){if(!hasBody){g.fillStyle='#a3aaa3';g.fillRect(head.x,head.y,2,1);}}
  else{g.strokeStyle=fx.type==='interceptor'?'#f6f0c9':p.color;g.lineWidth=appearance.type==='bullet'?.8:fx.type==='interceptor'?1.2:fam==='torpedo'?2:1.2;g.globalAlpha=hasBody?.55:.85;g.beginPath();g.moveTo(tx,ty);g.lineTo(head.x,head.y);g.stroke();if(fam==='torpedo'){g.globalAlpha=.3;g.strokeStyle='#a9dce4';g.setLineDash([1.5,3]);g.lineWidth=5;g.stroke();}else if(p.exhaust&&appearance.powered){g.strokeStyle='#c5c9bf';g.globalAlpha=.32;g.lineWidth=2;g.beginPath();g.moveTo(tx,ty);g.lineTo(tx-dx/len*12,ty-dy/len*12);g.stroke();}}
  g.restore();return true;
 }
 function impactStyle(fx,game){const medium=fx.medium||(fx.height<-.5?'underwater':fx.height>30?'air':game.tileAt&&[3,6].includes(game.tileAt(fx.x,fx.y))?'surface':'ground'),radii={rifle:3,machinegun:4,sniper:4,autocannon:8,cannon:15,navalGun:22,howitzer:25,mortar:14,grenade:13,rocket:23,missile:27,bomb:34,pulse:14,torpedo:25,beam:18};return {medium,kind:medium==='underwater'?'bubble':medium==='surface'?'splash':fx.ammoType==='ap'?'sparks':medium==='space'?'energy':'blast',visualRadius:fx.visualRadius??radii[fx.weaponFamily]??18};}
 function drawImpact(renderer,game,fx){if(!['impact','explosion'].includes(fx.type))return false;const p=renderer.toScreen(fx.x,fx.y,fx.height||0);if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return true;const g=renderer.ctx,t=clamp(1-fx.ttl/fx.max,0,1),style=impactStyle(fx,game),fp=renderer.firstPerson?.active,scale=fp?clamp(renderer.height/Math.max(30,renderer.firstPerson.eye.distanceTo(new root.THREE.Vector3(fx.x,fx.height||0,fx.y)))*.12,.15,3):renderer.camera.zoom,r=clamp(style.visualRadius*scale*(.2+t),2,95);g.save();g.globalAlpha=1-t;
  if(style.kind==='splash'){g.fillStyle='#c9e4e8';for(let i=0;i<5;i++){const x=p.x+(i-2)*r*.24,h=r*(.5+(i%2)*.7)*Math.sin(Math.PI*t);g.beginPath();g.ellipse(x,p.y-h*.5,r*.10,h*.5+1,0,0,Math.PI*2);g.fill();}g.strokeStyle='#b4d6d9';g.lineWidth=2;g.beginPath();g.ellipse(p.x,p.y,r,r*.27,0,0,Math.PI*2);g.stroke();}
  else if(style.kind==='bubble'){g.strokeStyle='#9bcfda';g.lineWidth=1.5;for(let i=0;i<5;i++){const a=i*2.399;g.beginPath();g.arc(p.x+Math.cos(a)*r*.55,p.y+Math.sin(a)*r*.4-t*r*.5,r*(.1+.08*t),0,Math.PI*2);g.stroke();}}
  else if(style.kind==='sparks'){g.strokeStyle='#ffe3b2';g.lineWidth=1.5;for(let i=0;i<8;i++){const a=i*2.399;g.beginPath();g.moveTo(p.x+Math.cos(a)*r*.25,p.y+Math.sin(a)*r*.25);g.lineTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);g.stroke();}}
  else{const grad=g.createRadialGradient(p.x,p.y,0,p.x,p.y,r);grad.addColorStop(0,style.medium==='space'?'#def7ff':'#fff0bd');grad.addColorStop(.3,style.medium==='space'?'#74b9e688':'#e09e6599');grad.addColorStop(1,'#4b4e5100');g.fillStyle=grad;g.beginPath();g.arc(p.x,p.y,r,0,Math.PI*2);g.fill();
   if(style.medium!=='space'&&t>.15){g.fillStyle='#606361';g.globalAlpha=(1-t)*.3;for(let i=0;i<4;i++){const a=i*2.399;g.beginPath();g.ellipse(p.x+Math.cos(a)*r*.35,p.y+Math.sin(a)*r*.2-r*t*.4,r*(.20+t*.18),r*(.18+t*.13),0,0,Math.PI*2);g.fill();}g.strokeStyle='#bdb6a1';g.lineWidth=1;g.globalAlpha=(1-t)*.6;for(let i=0;i<5;i++){const a=i*2.399+(fx.projectileId||0)*.1,x=p.x+Math.cos(a)*r*t,y=p.y+Math.sin(a)*r*t+t*t*r*.4;g.beginPath();g.moveTo(x,y);g.lineTo(x-Math.cos(a)*3,y-Math.sin(a)*3);g.stroke();}}
   if(style.medium==='ground'){g.fillStyle='#a28f6c';g.globalAlpha=(1-t)*.18;g.beginPath();g.ellipse(p.x,p.y+r*.12,r*1.2,r*.20,0,0,Math.PI*2);g.fill();}
  }
  g.restore();return true;
 }
 root.WarWeaponEffects={profiles,family,profile,weaponAnchor,shotOrigin,discharge,update,draw,drawProjectile,drawImpact,impactStyle,projectileAppearance,updateProjectiles,clearProjectiles,projectileState:renderer=>projectileStates.get(renderer),state:renderer=>states.get(renderer)};
})(globalThis);
