/* Discharge envelopes are visual game timings, independent of damage and hit rays. */
(function(root){
 'use strict';const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const states=new WeakMap();
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
 function family(f){const k=f.sourceKind||f.kind||'',u=root.WarData?.U?.[k]||root.WarData?.B?.[k]||{},w=root.WarOperatorWeapons?.byId?.[f.weaponId],fx=f.weaponFx||u.weaponFx;
  if(w)return({lmg:'machinegun',smg:'machinegun',pistol:'rifle',marksman:'sniper',launcher:'rocket'})[w.category]||w.category;
  if(fx==='torpedo')return 'torpedo';if(/beam/.test(fx))return 'beam';if(fx==='interceptor-burst')return 'pulse';
  if(['rocket','rocket_artillery','antitank_team'].includes(k))return 'rocket';
  if(f.rocket||u.rocket||/missile|asat|sam/.test(k)||['heli','aa','fighter','jet','interceptor'].includes(k))return 'missile';
  if(u.air&&!u.space&&/bomber|bombard|strategic_strike/.test(k))return 'bomb';
  if(/mortar/.test(k))return 'mortar';if(/howitzer|arty/.test(k))return 'howitzer';if(/machinegun|ciws|point_defense|mobile_air_defense/.test(k))return 'machinegun';if(/sniper/.test(k))return 'sniper';
  if(u.naval)return 'navalGun';if(['tank','tank_destroyer','assault_gun','railgun'].includes(k)||(u.modelKind==='tank'))return 'cannon';if((u.modelKind||k)==='infantry')return 'rifle';return 'autocannon';
 }
 function profile(f){const name=family(f);return{name,...(profiles[name]||profiles.rifle)};}
 // Screen-space drawing consumes world-projected coordinates supplied by each
 // camera path. It never changes the frozen physical projectile endpoints.
 function discharge(ctx,p,head,dir,age,scale=1){if(!p||age<0)return;const size=clamp(p.size*scale,1,100),fade=1-age/p.flash;ctx.save();
  if(p.flash>0&&fade>0){ctx.translate(head.x,head.y);ctx.rotate(Math.atan2(dir.y,dir.x));ctx.globalAlpha=fade;ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(-size*.2,-size*.25);ctx.lineTo(size*1.8,0);ctx.lineTo(-size*.2,size*.25);ctx.lineTo(size*.35,0);ctx.closePath();ctx.fill();ctx.fillStyle='#fff8dc';ctx.beginPath();ctx.ellipse(size*.2,0,size*.5,size*.18,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();if(p.smoke&&age>0&&age<p.smoke){const t=age/p.smoke;ctx.save();ctx.globalAlpha=(1-t)*(p.exhaust?.32:.22);ctx.fillStyle=p.exhaust?'#d8d6c9':'#b9b6a9';for(let i=0;i<4;i++){const a=i*2.399,r=size*(.25+t*.95),shift=p.exhaust?-1:1;ctx.beginPath();ctx.ellipse(head.x+dir.x*size*t*shift+Math.cos(a)*r*.65,head.y+dir.y*size*t*shift+Math.sin(a)*r*.45-size*t*.4,r*.55,r*.4,0,0,Math.PI*2);ctx.fill();}if(p.dust){ctx.globalAlpha=(1-t)*.15;ctx.fillStyle='#9f8c68';ctx.beginPath();ctx.ellipse(head.x,head.y+size*.3,size*(1+t*2),size*.20,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
 }
 function update(renderer,game){let s=states.get(renderer);if(!s||s.game!==game){s={game,seen:new WeakSet(),shots:[]};states.set(renderer,s);}for(const f of game.effects||[]){if(f.type!=='shot'||s.seen.has(f))continue;s.seen.add(f);if(!game.visibleAt(f.x,f.y)&&f.sourceId!==renderer.firstPerson?.entityId)continue;
   const p=profile(f),origin=[f.x,f.sourceHeight??8,f.y];if(!game.directControl||game.directControl.entityId!==f.sourceId){const anchor=renderer.objects.get(f.sourceId)?.getObjectByName('muzzle');if(anchor){const v=anchor.getWorldPosition(new root.THREE.Vector3());origin[0]=v.x;origin[2]=v.z;const source=game.get(f.sourceId);origin[1]=v.y+(source?renderer.physicalHeight(source)-renderer.entityHeight(source):0);}}
   s.shots.push({p,origin,end:[f.tx,f.targetHeight??0,f.ty],at:Number.isFinite(f.firedAt)?f.firedAt:game.time-Math.max(0,f.max-f.ttl),max:f.max});
  }s.shots=s.shots.filter(v=>game.time-v.at<Math.max(v.p.smoke,v.p.flash,v.p.exhaust?1.3:0));if(s.shots.length>160)s.shots.splice(0,s.shots.length-160);return s;
 }
 function draw(renderer,game){const s=update(renderer,game),fp=renderer.firstPerson?.active?renderer.firstPerson:null,T=root.THREE;for(const v of s.shots){const age=game.time-v.at,a=new T.Vector3(...v.origin),b=new T.Vector3(...v.end),direction=b.clone().sub(a).normalize();let head,next,scale;
   if(fp){const segment=fp.projectEffectSegment(a,a.clone().addScaledVector(direction,.2));if(!segment)continue;[head,next]=segment;scale=renderer.height/Math.max(50,fp.eye.distanceTo(a))*.20;}
   else{head=renderer.toScreen(a.x,a.z,a.y);next=renderer.toScreen(a.x+direction.x,a.z+direction.z,a.y+direction.y);scale=renderer.camera.zoom;}
   const dx=next.x-head.x,dy=next.y-head.y,len=Math.hypot(dx,dy)||1;discharge(renderer.ctx,v.p,head,{x:dx/len,y:dy/len},age,scale);
  }}
 root.WarWeaponEffects={profiles,family,profile,discharge,update,draw,state:renderer=>states.get(renderer)};
})(globalThis);
