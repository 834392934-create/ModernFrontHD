/* First-person possession of the live RTS entity. Input and visuals never own health or damage. */
(function(root){
 'use strict';const T=root.THREE,D=root.WarData,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 class DirectControl {
  constructor(renderer,callbacks){
   this.r=renderer;this.cb=callbacks;this.active=false;this.motion=true;this.keys=new Set();this.yaw=0;this.pitch=0;this.ads=false;this.fire=false;this.shots=new WeakSet();this.recoil=0;this.lastAimTime=0;this.hitUntil=0;
   this.camera=new T.PerspectiveCamera(70,innerWidth/innerHeight,.08,4500);this.ray=new T.Raycaster();this.ray.far=2500;
   this.hud=document.createElement('div');this.hud.id='direct-hud';this.hud.hidden=true;
   this.hud.innerHTML='<div class="direct-shade"></div><div id="direct-damage"></div><header><span>DIRECT CONTROL <b>01</b></span><div id="direct-compass"></div><button id="direct-exit">返回总指挥 · E / Esc</button></header><div class="direct-orders"><i></i>AI 接管总调度 <span id="direct-economy"></span></div><div id="direct-reticle"><i></i><i></i><i></i><i></i><b></b></div><div id="direct-hit">×</div><div id="direct-target"></div><button id="direct-lock">点击画面锁定鼠标 · 开始驾驶</button><div class="direct-bottom"><section><small id="direct-domain"></small><strong id="direct-name"></strong><div class="direct-health"><i id="direct-hp"></i></div><span id="direct-vitals"></span></section><div class="direct-controls">W A S D 移动 · 鼠标观察<br>左键开火 · 右键瞄准 · 空格暂停 · M 晃动</div><section class="direct-weapon"><span id="direct-weapon-state"></span><div class="direct-reload"><i id="direct-reload"></i></div><small id="direct-role"></small></section></div>';
   document.body.append(this.hud);this.el=id=>this.hud.querySelector('#direct-'+id);
   this.el('exit').onclick=()=>this.exit();this.el('lock').onclick=()=>{if(this.cb.paused())this.cb.togglePause();this.lock();};
   document.addEventListener('keydown',e=>this.keyDown(e),true);document.addEventListener('keyup',e=>{if(this.active){this.keys.delete(e.code);e.preventDefault();e.stopImmediatePropagation();}},true);
   document.addEventListener('pointerdown',e=>{if(!this.active||e.target.closest('button'))return;e.preventDefault();e.stopImmediatePropagation();if(document.pointerLockElement!==this.r.canvas){this.lock();return;}if(e.button===0)this.fire=true;if(e.button===2)this.ads=true;},true);
   document.addEventListener('pointerup',e=>{if(!this.active)return;if(e.button===0)this.fire=false;if(e.button===2)this.ads=false;e.stopImmediatePropagation();},true);
   document.addEventListener('mousemove',e=>{if(!this.active||document.pointerLockElement!==this.r.canvas||this.cb.paused())return;const sens=this.ads?.0011:.0020;this.yaw+=e.movementX*sens;this.pitch=clamp(this.pitch-e.movementY*sens,-1.48,1.40);this.lastAimTime=0;},true);
   document.addEventListener('pointerlockchange',()=>{if(this.active&&document.pointerLockElement!==this.r.canvas)this.clearInput();});
   document.addEventListener('pointerlockerror',()=>{if(this.active){this.clearInput();this.el('lock').textContent='鼠标未锁定，请再次点击画面；E 可返回指挥';}});
   document.addEventListener('contextmenu',e=>{if(this.active)e.preventDefault();},true);
   document.addEventListener('wheel',e=>{if(this.active){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
   addEventListener('blur',()=>this.clearInput());addEventListener('resize',()=>this.resize());
  }
  keyDown(e){
   if(!this.active){if(e.code==='KeyE'&&!e.repeat&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!e.target.isContentEditable&&this.cb.canEnter()){e.preventDefault();e.stopImmediatePropagation();this.enter(this.cb.selection()[0]);}return;}
   if(e.code==='F11')return;
   e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
   if(e.code==='Escape'||e.code==='KeyE'){this.exit();return;}
   if(e.code==='KeyM'){this.motion=!this.motion;this.cb.toast('驾驶晃动'+(this.motion?'开启':'关闭'));return;}
   if(e.code==='Space'){this.clearInput();this.cb.togglePause();return;}
   this.keys.add(e.code);
  }
  enter(id){
   if(this.active)this.exit();const g=this.cb.game();if(!this.r.is3D){this.cb.toast('第一人称需要三维画面');return false;}if(!this.cb.canEnter()||!g?.beginDirectControl(id)){this.cb.toast('先选择一个存活的己方作战单位');return false;}
   const e=g.get(id),d=D.U[e.kind];this.game=g;g.directObstacles=this.r.vegetationColliders||[];this.active=true;this.entityId=id;this.yaw=e.angle||0;this.pitch=d.space?-.45:d.air?-.15:-.025;this.ads=false;this.fire=false;this.keys.clear();this.lastHP=e.hp;this.lastAimTime=0;this.aimResult=null;this.lastHitAt=-1;this.hitUntil=0;this.hurtUntil=0;this.recoil=0;this.shots=new WeakSet();
   this.old={camera:{...this.r.camera},background:this.r.scene.background,fog:this.r.scene.fog,exposure:this.r.gl.toneMappingExposure,shadow:{left:this.r.sun.shadow.camera.left,right:this.r.sun.shadow.camera.right,top:this.r.sun.shadow.camera.top,bottom:this.r.sun.shadow.camera.bottom},immersive:document.body.classList.contains('immersive')};
   if(!this.sky){const c=document.createElement('canvas');c.width=32;c.height=512;const ctx=c.getContext('2d'),gr=ctx.createLinearGradient(0,0,0,512);gr.addColorStop(0,'#477b9a');gr.addColorStop(.65,'#b8c8c7');gr.addColorStop(1,'#d2cfb8');ctx.fillStyle=gr;ctx.fillRect(0,0,32,512);this.sky=new T.CanvasTexture(c);this.sky.colorSpace=T.SRGBColorSpace;}
   this.r.scene.background=this.sky;this.r.scene.fog=new T.FogExp2(0xb9c5c1,.0012);Object.assign(this.r.sun.shadow.camera,{left:-260,right:260,top:260,bottom:-260});this.r.sun.shadow.camera.updateProjectionMatrix();this.r.sun.shadow.normalBias=.22;
   this.r.firstPerson=this;document.body.classList.add('direct-view');this.hud.hidden=false;this.el('name').textContent=this.cb.unitName(e.kind,g.teams[0].faction);this.el('domain').textContent=({ground:'GROUND / 陆军',naval:'NAVAL / 海军',air:'AIR / 空军',space:'ORBIT / 太空'})[d.unitGroup];this.el('role').textContent=d.role;this.view??=root.WarFPSView?new root.WarFPSView(this.r):null;this.view?.setKind(e.kind,g.teams[0].faction);this.resize();this.updateCamera();this.lock();return true;
  }
  lock(){if(!this.active)return;try{const p=this.r.canvas.requestPointerLock();p?.catch(()=>{this.el('lock').hidden=false;});}catch{this.el('lock').hidden=false;}}
  clearInput(){this.keys.clear();this.fire=false;this.ads=false;if(this.active)this.game?.setDirectInput({yaw:this.yaw});}
  exit(message){if(!this.active)return;const e=this.game?.get(this.entityId);this.clearInput();this.game?.endDirectControl();this.active=false;if(document.pointerLockElement)document.exitPointerLock();this.hud.hidden=true;document.body.classList.remove('direct-view');this.r.firstPerson=null;this.r.cam=this.r.strategyCam;this.r.camera={...this.old.camera,x:e?.x??this.old.camera.x,y:e?.y??this.old.camera.y};this.r.scene.background=this.old.background;this.r.scene.fog=this.old.fog;this.r.gl.toneMappingExposure=this.old.exposure;Object.assign(this.r.sun.shadow.camera,this.old.shadow);this.r.sun.shadow.camera.updateProjectionMatrix();this.r.sun.shadow.normalBias=1.1;this.r.syncCamera();this.cb.onExit?.();if(message)this.cb.toast(message);}
  resize(){this.camera.aspect=this.r.width/this.r.height;this.camera.updateProjectionMatrix();this.view?.resize(this.r.width,this.r.height);}
  updateCamera(){
   if(!this.active)return;const e=this.game?.get(this.entityId);if(!e)return;const d=D.U[e.kind],inf=(d.modelKind||e.kind)==='infantry';const height=this.r.entityHeight(e)+(inf?9.5:d.naval?21:d.air?7:19);this.eye=new T.Vector3(e.x,height,e.y);this.camera.position.copy(this.eye);const cp=Math.cos(this.pitch+(this.motion?this.recoil*.012:0)),look=new T.Vector3(Math.cos(this.yaw)*cp,Math.sin(this.pitch+(this.motion?this.recoil*.012:0)),Math.sin(this.yaw)*cp);this.camera.lookAt(this.eye.clone().add(look));this.camera.updateMatrixWorld();this.r.cam=this.camera;this.r.camera.x=e.x;this.r.camera.y=e.y;
  }
  cast(origin,direction,max,includeWorld=true){
   const r=this.r,g=this.game;this.ray.set(origin,direction);this.ray.far=max;const hits=[];const box=new T.Box3(),point=new T.Vector3();
   for(const e of g.entities){if(e.id===this.entityId||e.hp<=0||(e.team!==0&&!g.visibleAt(e.x,e.y)))continue;const o=r.objects.get(e.id);if(!o?.visible)continue;box.setFromObject(o);if(!this.ray.ray.intersectBox(box,point)||origin.distanceTo(point)>max)continue;const hit=this.ray.intersectObject(o,true)[0];if(hit)hits.push({...hit,entity:e});}
   if(includeWorld){const solids=r.world.children.filter(o=>o.isMesh&&(!o.isInstancedMesh||o.userData.firstPersonOccluder));const world=this.ray.intersectObjects(solids,true)[0];if(world)hits.push(world);}
   hits.sort((a,b)=>a.distance-b.distance);return hits[0]||null;
  }
  aim(){
   const dir=this.camera.getWorldDirection(new T.Vector3()),hit=this.cast(this.eye,dir,2200);let point=hit?.point||this.eye.clone().addScaledVector(dir,1800),target=hit?.entity||null;const actor=this.r.objects.get(this.entityId),anchor=actor?.getObjectByName('muzzle');
   // Legacy unanchored art still checks cover from a conservative body-centred firing point.
   const unit=this.game.get(this.entityId),base=this.r.entityHeight(unit),origin=anchor?anchor.getWorldPosition(new T.Vector3()):new T.Vector3(unit.x,base+Math.max(3,(this.eye.y-base)*.65),unit.y);
   const delta=point.clone().sub(origin),distance=delta.length();if(distance>.1){const muzzleHit=this.cast(origin,delta.normalize(),distance+.2);if(muzzleHit&&(!muzzleHit.entity||muzzleHit.entity.id!==target?.id)){target=null;point=muzzleHit.point;}}
   const legal=target&&this.game.isEnemy(0,target.team)&&this.game.canTargetKind(this.game.get(this.entityId).kind,target.kind);return{point,target:legal?target:null,blocked:!!hit&&!legal,origin,originMode:anchor?'model-muzzle':'conservative-body'};
  }
  submit(){if(!this.active)return;const e=this.game.get(this.entityId);if(!e)return;const paused=this.cb.paused(),locked=document.pointerLockElement===this.r.canvas;const k=this.keys;const moving=!paused&&locked;const a=this.aimResult||{point:this.eye.clone().add(new T.Vector3(200,0,0)),target:null};this.game.setDirectInput({forward:moving?Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')||k.has('ArrowDown')):0,strafe:moving?Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft')):0,yaw:this.yaw,fire:moving&&this.fire,targetId:a.target?.id,aimX:a.point.x,aimY:a.point.z,aimHeight:a.point.y});}
  update(dt,time){
   if(!this.active)return;if(this.cb.game()!==this.game||!this.game.directControl||!this.game.get(this.entityId)||this.game.result){this.exit('已返回总指挥');return;}
   const e=this.game.get(this.entityId),d=D.U[e.kind],paused=this.cb.paused();if(paused||e.disabled>this.game.time)this.clearInput();this.recoil*=Math.exp(-dt*14);const desired=this.ads?48:70;this.camera.fov+=(desired-this.camera.fov)*(1-Math.exp(-dt*18));this.camera.updateProjectionMatrix();this.updateCamera();
   if(time-this.lastAimTime>.055||!this.aimResult){this.aimResult=this.aim();this.lastAimTime=time;}
   this.submit();let firePulse=false;for(const fx of this.game.effects)if(fx.type==='shot'&&fx.sourceId===e.id&&!this.shots.has(fx)){this.shots.add(fx);this.recoil=Math.min(2,this.recoil+.8);firePulse=true;this.playShot();}
   const moving=this.keys.size>0&&!paused&&document.pointerLockElement===this.r.canvas;this.view?.update({time,dt,firePulse,ads:this.ads,moving,motion:this.motion,hp:e.hp/e.maxHp});
   this.el('hp').style.width=(e.hp/e.maxHp*100)+'%';this.el('vitals').textContent=Math.ceil(e.hp)+' / '+Math.ceil(e.maxHp)+'   ·   '+(e.disabled>this.game.time?'EMP 停机':paused?'已暂停':'系统正常');
   this.el('reload').style.width=(100*(1-clamp(e.cool/d.reload,0,1)))+'%';this.el('weapon-state').textContent=!d.damage?(d.heal?'医疗 / 维修自动运行':d.fireControl?'区域支援自动运行':'无武装 · 侦察 / 作业'):e.cool>0?'装填 '+(e.cool*this.game.cooldownMultiplier(e)).toFixed(1)+' s':'武器就绪';
   this.el('compass').textContent='N  ·  '+String(Math.round(((this.yaw*180/Math.PI)+90+3600)%360)).padStart(3,'0')+'°  ·  E';this.el('economy').textContent='资金 '+Math.floor(this.game.teams[0].money).toLocaleString()+'  ·  生产 '+this.game.teams[0].queue.length;
   const a=this.aimResult,target=a?.target;this.el('target').textContent=target?this.cb.unitName(target.kind,this.game.teams[target.team].faction)+' · '+Math.round(Math.hypot(target.x-e.x,target.y-e.y))+' 距离单位':'';this.el('reticle').classList.toggle('enemy',!!target);this.el('reticle').classList.toggle('ads',this.ads);
   const locked=document.pointerLockElement===this.r.canvas;this.el('lock').hidden=locked&&!paused;if(paused)this.el('lock').textContent='已暂停 · 空格继续';else if(!locked)this.el('lock').textContent='点击画面锁定鼠标 · 继续驾驶';
   const hurt=e.hp<this.lastHP;if(hurt){this.hurtUntil=time+.45;this.hurtDirection=e.lastHitFrom?Math.atan2(e.lastHitFrom.y-e.y,e.lastHitFrom.x-e.x)-this.yaw:0;}this.lastHP=e.hp;
   const hurtAmount=Math.max(0,(this.hurtUntil||0)-time)/.45;this.el('damage').style.opacity=String(hurtAmount*.75);this.el('damage').style.transform='rotate('+((this.hurtDirection||0)*180/Math.PI)+'deg)';
   const feedback=this.game.directFeedback;if(feedback?.sourceId===e.id&&feedback.hitAt!==this.lastHitAt){this.lastHitAt=feedback.hitAt;this.hitUntil=time+.18;}this.el('hit').style.opacity=time<this.hitUntil?'1':'0';
  }
  playShot(){if(!this.cb.sound())return;try{this.audio??=new (window.AudioContext||window.webkitAudioContext)();this.audio.resume();const a=this.audio,buffer=a.createBuffer(1,Math.floor(a.sampleRate*.12),a.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*7);const source=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1300;gain.gain.value=.12;source.connect(filter);filter.connect(gain);gain.connect(a.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}catch{}}
  drawOverlay(game,time){
   const r=this.r,g=r.ctx;for(const f of game.effects){if(!game.visibleAt(f.x,f.y)&&f.sourceId!==this.entityId)continue;const t=clamp(1-f.ttl/f.max,0,1);if(f.type==='shot'){const a=f.sourceId===this.entityId?{x:r.width*.53,y:r.height*.57}:r.toScreen(f.x,f.y,f.sourceHeight||8),z=r.toScreen(f.tx,f.ty,f.targetHeight||5);if(!Number.isFinite(a.x)||!Number.isFinite(z.x))continue;const x=a.x+(z.x-a.x)*t,y=a.y+(z.y-a.y)*t;g.strokeStyle=f.weaponFx==='torpedo'?'#b8e1df':'#f1d69b';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x-(z.x-a.x)*.025,y-(z.y-a.y)*.025);g.stroke();}else if(['impact','explosion','nuclear','lance'].includes(f.type)){const p=r.toScreen(f.x,f.y,f.height||4);if(!Number.isFinite(p.x))continue;const distance=Math.max(20,this.eye.distanceTo(new T.Vector3(f.x,f.height||4,f.y))),radius=clamp((f.r||18)*r.height/distance*(.25+t),2,150);const glow=g.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);glow.addColorStop(0,'#fff1c8d9');glow.addColorStop(.12,'#ffc16b99');glow.addColorStop(.38,'#bd6d3044');glow.addColorStop(1,'#3b302000');g.globalAlpha=(1-t)*.8;g.fillStyle=glow;g.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);g.strokeStyle='#ffd696';g.lineWidth=1.2;g.globalAlpha=(1-t)*(1-t);for(let n=0;n<6;n++){const a=n*2.399+(f.x%13),spread=radius*(.15+t*.6),sx=p.x+Math.cos(a)*spread,sy=p.y+Math.sin(a)*spread-t*radius*.25;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx-Math.cos(a)*radius*.09,sy-Math.sin(a)*radius*.09);g.stroke();}g.globalAlpha=1;}}
   this.view?.render(this.camera);
  }
 }
 root.WarDirectControl=DirectControl;
})(globalThis);
