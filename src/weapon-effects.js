/* Discharge envelopes are visual game timings, independent of damage and hit rays. */
(function(root){
 'use strict';const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const states=new WeakMap(),anchorCaches=new WeakMap();
 const profiles={
  rifle:{flash:.035,size:2,recoil:.18,smoke:.18,trail:9,color:'#ffdcb2'},
  machinegun:{flash:.026,size:2.4,recoil:.13,smoke:.25,trail:14,color:'#ffce80'},
  sniper:{flash:.055,size:3.2,recoil:.45,smoke:.38,trail:18,color:'#ffe4b3'},
  shotgun:{flash:.045,size:3.5,recoil:.5,smoke:.36,trail:6,color:'#ffd8a0'},
  cannon:{flash:.065,size:12,recoil:1,smoke:.75,trail:22,color:'#ffd29a',dust:true},
  howitzer:{flash:.085,size:15,recoil:1.15,smoke:1.1,trail:26,color:'#ffe1a5',dust:true},
  mortar:{flash:.045,size:4.5,recoil:.12,smoke:.55,trail:9,color:'#f3d6aa'},
  autocannon:{flash:.038,size:5,recoil:.45,smoke:.35,trail:17,color:'#ffd79b'},
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
  if(!model?.getObjectByName||!root.THREE)return null;
  weapon=weapon||{};
  const T=root.THREE,kind=options.kind||weapon.sourceKind||weapon.kind||model.userData.kind,faction=options.faction||weapon.sourceFaction||weapon.faction||model.userData.faction,
   explicit=!!(weapon.weaponFamily||weapon.family||weapon.weaponMuzzleClass||weapon.muzzleClass),fam=weapon.weaponFamily||weapon.family||family({...weapon,sourceKind:kind,sourceFaction:faction}),
   cls=weapon.weaponMuzzleClass||weapon.muzzleClass||(fam==='missile'?'launcher':fam==='rocket'?'rocket':fam==='torpedo'?'torpedo':fam==='bomb'?'bombBay':fam==='airWing'?'flightDeck':'gun'),
   port=options.portIndex??weapon.portIndex,id=weapon.weaponId||weapon.id||'',base=model.getObjectByName(Number.isInteger(port)?'muzzle_'+port:'muzzle')||model.getObjectByName('muzzle')||null,u=root.WarData?.U?.[kind]||{},
   primary=model.userData.muzzleFamily||(['submarine','hunter_sub','torpedo_boat','asw_patrol_ship'].includes(kind)?'torpedo':['rocket'].includes(kind)?'rocket':['asat','tank_destroyer','missile_boat','arsenal_ship','air_defense_ship','missile_sub','orbital_missile_barge'].includes(kind)?'missile':kind==='aa'?(['kor','imp'].includes(faction)?'autocannon':'missile'):null);
  if(!explicit)return base;
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
   point.set(center.x+(cls==='bombBay'?0:size.x*.12),box.min.y-.025,cls==='bombBay'?0:size.z*.17);
   source=cls==='bombBay'?'approximate-belly-store-release':'approximate-underwing-store-release';
  }else if(cls==='launcher'&&u.underwater){
   point.set(center.x+size.x*.18,Math.max(.4,size.z*.3),0);source='approximate-submarine-missile-release';
  }else if(cls==='flightDeck'){
   point.set(center.x+size.x*.3,box.min.y+size.y*.28,0);source='approximate-flight-deck-launch-point';
  }else if(cls==='gun'&&fam==='autocannon'&&!model.userData.assetPath&&model.getObjectByName('turret')&&((kind==='aa'&&['usa','rus'].includes(faction))||(kind==='ifv'&&['chn','rus'].includes(faction)))){
   parent=model.getObjectByName('turret');
   point.fromArray(kind==='aa'?(faction==='usa'?[2.062,.53,0]:[2.662,.65,.91]):faction==='rus'?[3.562,.39,-.21]:[3.712,.28,.05]);
   source='existing-secondary-autocannon-barrel-tip';approximate=false;boundary='Matches the existing procedural barrel geometry; not a certified real mount dimension.';
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
  marker.name='weapon_muzzle_'+(id||cls).replace(/[^a-zA-Z0-9_]/g,'_');marker.position.copy(point);marker.userData={weaponAnchor:true,weaponId:id,muzzleClass:cls,source,approximate,boundary};parent.add(marker);marker.updateWorldMatrix(true,false);cache.set(key,marker);return marker;
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
  ctx.restore();if(p.smoke&&age>0&&age<p.smoke){const t=age/p.smoke;ctx.save();ctx.globalAlpha=(1-t)*(p.exhaust?.32:.22);ctx.fillStyle=p.exhaust?'#d8d6c9':'#b9b6a9';for(let i=0;i<4;i++){const a=i*2.399,r=size*(.25+t*.95),shift=p.exhaust?-1:1;ctx.beginPath();ctx.ellipse(head.x+dir.x*size*t*shift+Math.cos(a)*r*.65,head.y+dir.y*size*t*shift+Math.sin(a)*r*.45-size*t*.4,r*.55,r*.4,0,0,Math.PI*2);ctx.fill();}if(p.dust){ctx.globalAlpha=(1-t)*.15;ctx.fillStyle='#9f8c68';ctx.beginPath();ctx.ellipse(head.x,head.y+size*.3,size*(1+t*2),size*.20,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
 }
 function update(renderer,game){let s=states.get(renderer);if(!s||s.game!==game){s={game,seen:new WeakSet(),shots:[]};states.set(renderer,s);}for(const f of game.effects||[]){if(f.type!=='shot'||s.seen.has(f))continue;s.seen.add(f);if(!game.visibleAt(f.x,f.y)&&f.sourceId!==renderer.firstPerson?.entityId)continue;
   const p=profile(f),origin=shotOrigin(renderer,game,f);
   s.shots.push({p,origin,end:[f.tx,f.targetHeight??0,f.ty],at:Number.isFinite(f.firedAt)?f.firedAt:game.time-Math.max(0,f.max-f.ttl),max:f.max});
  }s.shots=s.shots.filter(v=>game.time-v.at<Math.max(v.p.smoke,v.p.flash,v.p.exhaust?1.3:0));if(s.shots.length>160)s.shots.splice(0,s.shots.length-160);return s;
 }
 function draw(renderer,game){const s=update(renderer,game),fp=renderer.firstPerson?.active?renderer.firstPerson:null,T=root.THREE;for(const v of s.shots){const age=game.time-v.at,a=new T.Vector3(...v.origin),b=new T.Vector3(...v.end),direction=b.clone().sub(a).normalize();let head,next,scale;
   if(fp){const segment=fp.projectEffectSegment(a,a.clone().addScaledVector(direction,.2));if(!segment)continue;[head,next]=segment;scale=renderer.height/Math.max(50,fp.eye.distanceTo(a))*.20;}
   else{head=renderer.toScreen(a.x,a.z,a.y);next=renderer.toScreen(a.x+direction.x,a.z+direction.z,a.y+direction.y);scale=renderer.camera.zoom;}
   const dx=next.x-head.x,dy=next.y-head.y,len=Math.hypot(dx,dy)||1;discharge(renderer.ctx,v.p,head,{x:dx/len,y:dy/len},age,scale);
  }}
 root.WarWeaponEffects={profiles,family,profile,weaponAnchor,shotOrigin,discharge,update,draw,state:renderer=>states.get(renderer)};
})(globalThis);
