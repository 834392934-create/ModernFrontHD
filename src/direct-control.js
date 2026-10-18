/* First-person possession of the live RTS entity. Input and visuals never own health or damage. */
(function(root){
 'use strict';const T=root.THREE,D=root.WarData,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 class DirectControl {
  constructor(renderer,callbacks){
   this.r=renderer;this.cb=callbacks;this.active=false;this.motion=false;this.keys=new Set();this.yaw=0;this.pitch=0;this.ads=false;this.fire=false;this.shots=new WeakSet();this.recoil=0;this.lastAimTime=0;this.hitUntil=0;this.ignoreNextMouse=false;
   this.orbitScope={active:false,latched:false,index:0,zoom:4};this.aimScope={active:false,latched:false,index:0,zoom:1.5};
   this.camera=new T.PerspectiveCamera(70,innerWidth/innerHeight,.08,100000);this.ray=new T.Raycaster();this.ray.far=2500;
   this.hud=document.createElement('div');this.hud.id='direct-hud';this.hud.hidden=true;
   this.hud.innerHTML='<div class="direct-shade"></div><div id="direct-damage"></div><header><span>DIRECT CONTROL <b>01</b></span><div id="direct-compass"></div><button id="direct-exit">返回总指挥 · E / Esc</button></header><div class="direct-orders"><i></i>AI 接管总调度 <span id="direct-economy"></span></div><div id="direct-reticle"><i></i><i></i><i></i><i></i><b></b></div><div id="direct-hit">×</div><div id="direct-target"></div><div id="direct-flight" hidden><b id="direct-layer"></b><span id="direct-altitude"></span><span id="direct-speed"></span><span id="direct-attitude"></span><small>游戏距离 / u · 速度 / u·s⁻¹</small></div><button id="direct-lock">点击画面锁定鼠标 · 开始驾驶</button><div class="direct-bottom"><section><small id="direct-domain"></small><strong id="direct-name"></strong><div class="direct-health"><i id="direct-hp"></i></div><span id="direct-vitals"></span></section><div class="direct-controls">W A S D 移动 · 鼠标观察<br>左键开火 · 右键瞄准 · P 暂停 · M 晃动</div><section class="direct-weapon"><span id="direct-weapon-state"></span><div class="direct-reload"><i id="direct-reload"></i></div><small id="direct-role"></small></section></div>';
   this.hud.innerHTML+='<section id="direct-orbit-panel" hidden><small>ORBITAL OPTICS / 轨道光电</small><div><button id="direct-orbit-toggle">V 开启瞄准</button><button id="direct-orbit-ground">G 对地俯视</button></div><strong id="direct-orbit-zoom"></strong><span id="direct-orbit-contact"></span></section>';
   document.body.append(this.hud);this.el=id=>this.hud.querySelector('#direct-'+id);
   this.el('exit').onclick=()=>this.exit();this.el('lock').onclick=()=>{if(this.cb.paused())this.cb.togglePause();this.lock();};
   this.el('orbit-toggle').onclick=()=>{if(this.toggleOrbitScope())this.lock();};this.el('orbit-ground').onclick=()=>{if(this.lookDownOrbit())this.lock();};
   document.addEventListener('keydown',e=>this.keyDown(e),true);document.addEventListener('keyup',e=>{if(this.operatorUI?.open)return;if(this.active){this.keys.delete(e.code);if(e.code==='Space')this.submit();if(this.cb.canEnter?.()!==false){e.preventDefault();e.stopImmediatePropagation();}}},true);
   document.addEventListener('pointerdown',e=>{if(!this.active||this.operatorUI?.open||this.vehicleMenu?.open||this.cb.canEnter?.()===false||document.hidden||document.hasFocus?.()===false||e.target.closest('button')||e.target.closest('#vehicle-menu'))return;e.preventDefault();e.stopImmediatePropagation();if(document.pointerLockElement!==this.r.canvas){this.lock();return;}if(!this.scopeAvailable())return;if(e.button===0)this.fire=true;if(e.button===2){this.ads=true;this.syncOptics();}this.submit(true);},true);
   document.addEventListener('pointerup',e=>{if(!this.active)return;if(e.button===0)this.fire=false;if(e.button===2){this.ads=false;this.syncOptics();}this.submit(this.fire);if(this.cb.canEnter?.()!==false)e.stopImmediatePropagation();},true);
   document.addEventListener('mousemove',e=>this.mouseMove(e),true);
   document.addEventListener('pointerlockchange',()=>{if(!this.active)return;this.clearInput();this.ignoreNextMouse=true;if(document.pointerLockElement===this.r.canvas&&!this.cb.paused())this.flightReady=true;});
   document.addEventListener('pointerlockerror',()=>{if(this.active){this.clearInput();this.el('lock').textContent='鼠标未锁定，请再次点击画面；E 可返回指挥';}});
   document.addEventListener('contextmenu',e=>{if(this.active)e.preventDefault();},true);
   document.addEventListener('wheel',e=>this.wheel(e),{capture:true,passive:false});
   document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clearInput();});
   addEventListener('blur',()=>this.clearInput());addEventListener('resize',()=>this.resize());
  }
  mouseMove(e){
   if(!this.active||document.pointerLockElement!==this.r.canvas||this.cb.paused()||this.vehicleMenu?.open||this.operatorUI?.open||document.hidden||this.cb.canEnter?.()===false)return;
   // Pointer-lock transitions can report the desktop cursor warp as a relative delta.
   if(this.ignoreNextMouse){this.ignoreNextMouse=false;return;}
   const dx=e.movementX,dy=e.movementY,limit=Math.max(300,Math.min(this.r.width,this.r.height)*.5);
   if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>limit||Math.abs(dy)>limit)return;
   const d=D.U[this.game?.get(this.entityId)?.kind],scoped=d?.space&&this.orbitScope.active,sens=.0020/(this.opticalActive()?this.scopeState().zoom:1),flight=d?.air&&!d.space;
   if(scoped){
    this.orbitScope.rotation.multiply(new T.Quaternion().setFromEuler(new T.Euler(-dy*sens,-dx*sens,0,'YXZ'))).normalize();
    const direction=new T.Vector3(0,0,-1).applyQuaternion(this.orbitScope.rotation);this.yaw=Math.atan2(direction.z,direction.x);this.pitch=Math.asin(clamp(direction.y,-1,1));this.lastAimTime=0;return;
   }
   this.yaw+=dx*sens;this.pitch=clamp(this.pitch+(flight?1:-1)*dy*sens,scoped?-Math.PI/2+.001:-1.48,scoped?Math.PI/2-.001:1.40);this.lastAimTime=0;
  }
  scopeState(){return D.U[this.game?.get(this.entityId)?.kind]?.space?this.orbitScope:this.aimScope;}
  opticalActive(){return !!this.scopeState().active;}
  scopeAvailable(){return this.active&&!this.cb.paused()&&!this.vehicleMenu?.open&&!this.operatorUI?.open&&this.cb.canEnter?.()!==false&&!document.hidden&&document.hasFocus?.()!==false;}
  scopeFOV(){return 2*Math.atan(Math.tan(70*Math.PI/360)/this.scopeState().zoom)*180/Math.PI;}
  syncOptics(){
   const state=this.scopeState(),wasActive=state.active;state.active=!!(state.latched||this.ads);
   if(state===this.orbitScope&&state.active&&!wasActive)state.rotation=this.camera.quaternion.clone();
   this.camera.fov=state.active?this.scopeFOV():70;this.camera.near=this.orbitScope.active?this.scopeNearPlane():(this.game?.get(this.entityId)?.altitude||0)>2000?1:.08;this.camera.updateProjectionMatrix();this.lastAimTime=0;this.aimResult=null;
  }
  scopeNearPlane(){
   const eye=this.eye,g=this.game;if(!eye||!g)return .08;
   let distance=Math.abs(eye.y);const point=this.aimResult?.point;
   if(point&&[point.x,point.y,point.z].every(Number.isFinite))distance=Math.min(distance,eye.distanceTo(point));
   // Baked envelopes avoid a per-frame traversal of every model's meshes.
   // A sphere around each complete envelope also protects nearby same-orbit craft.
   for(const e of g.entities){
    if(e.id===this.entityId||e.hp<=0)continue;
    let radius=g.navigationRadius(e);const b=root.WarNavigationFootprints?.bounds[e.kind+'_'+g.teams[e.team]?.faction];
    const low=b?.[1]??(e.structure?-16:-radius),high=b?.[2]??(e.structure?Math.max(160,radius*3,D.B[e.kind]?.collisionHeight||0):radius);
    if(e.structure)radius*=2;
    const y=g.entityAltitude(e)+(low+high)/2,bound=Math.hypot(radius,(high-low)/2)+4;
    const clearance=Math.hypot(e.x-eye.x,y-eye.y,e.y-eye.z)-bound;
    if(clearance<=0)return .08;distance=Math.min(distance,clearance);
   }
   // Near is camera-axis depth. Include the diagonal view angle when converting
   // radial clearance, then keep another factor of two before the first surface.
   const tangent=Math.tan(this.camera.fov*Math.PI/360),cosDiagonal=1/Math.sqrt(1+tangent*tangent*(1+this.camera.aspect*this.camera.aspect));
   return clamp(distance*cosDiagonal*.5,.08,500);
  }
  resetOrbitScope(){this.orbitScope={active:false,latched:false,index:0,zoom:4};this.aimScope={active:false,latched:false,index:0,zoom:1.5};this.ads=false;this.hud.classList?.toggle('orbit-scoped',false);this.hud.classList?.toggle('optics-scoped',false);this.camera.fov=70;this.camera.near=(this.game?.get(this.entityId)?.altitude||0)>2000?1:.08;this.camera.updateProjectionMatrix();}
  toggleOrbitScope(force){
   if(!this.scopeAvailable())return false;
   const state=this.scopeState();state.latched=typeof force==='boolean'?force:!state.latched;this.syncOptics();this.updateOrbitHUD();return true;
  }
  lookDownOrbit(){if(!this.scopeAvailable()||!D.U[this.game?.get(this.entityId)?.kind]?.space)return false;this.toggleOrbitScope(true);this.orbitScope.rotation.setFromRotationMatrix(new T.Matrix4().lookAt(new T.Vector3(),new T.Vector3(0,-1,0),new T.Vector3(0,0,-1)));this.pitch=-Math.PI/2;this.yaw=0;this.lastAimTime=0;return true;}
  wheel(e){
   if(!this.active||this.operatorUI?.open||this.vehicleMenu?.open||this.cb.canEnter?.()===false)return;e.preventDefault();e.stopImmediatePropagation();
   if(this.cb.paused()||document.pointerLockElement!==this.r.canvas||document.hidden||document.hasFocus?.()===false)return;
   const unit=this.game.get(this.entityId);
   if(this.opticalActive()){
    if(!Number.isFinite(e.deltaY)||e.deltaY===0)return;const state=this.scopeState();state.index=clamp(state.index+(e.deltaY<0?1:-1),0,4);state.zoom=(D.U[unit?.kind]?.space?[4,8,16,32,64]:[1.5,2,4,8,16])[state.index];this.camera.fov=this.scopeFOV();this.camera.updateProjectionMatrix();this.lastAimTime=0;this.aimResult=null;this.updateOrbitHUD();return;
   }
   if(unit?.kind==='operator'){const status=this.game.operatorStatus(this.entityId);this.game.operatorSwitch(this.entityId,1-status.activeSlot);this.fire=false;}
  }
  orbitTargetStatus(){
   const g=this.game,e=g.get(this.entityId),a=this.aimResult,target=g.get(a?.observedTarget?.id??a?.target?.id);
   const status=g.directFireStatus?.(e,target,{aimPoint:a?.point,blocked:!!a?.occluded})||{canFire:false,range:g.rangeProfile(e).attack,rangeState:'none',reason:'no-target'};
   const reasons={ready:'可射击',unarmed:'无攻击武器',inactive:'系统停机',emp:'EMP 停机',dead:'单位已失效','no-target':'移动准星选择目标',friendly:'己方单位',domain:'不支持目标域',undetected:'未侦测',blocked:'准线被遮挡','aim-miss':'准线未对准目标','min-range':'最小射程盲区','out-of-range':'超出射程',reloading:'换弹中','no-ammo':'未装弹',cooldown:'装填中'};
   const rangeText={in:'射程内',out:'超出射程',min:'最小射程盲区',none:'距离待测'}[status.rangeState];
   const label=target?this.cb.unitName(target.kind,g.teams[target.team].faction):a?.targetTreeId?'地表树木':'自由瞄点';
   let reason=reasons[status.reason]||'等待目标';if(this.cb.paused())reason+=' · 已暂停';else if(document.pointerLockElement!==this.r.canvas)reason+=' · 点击锁定后开火';
   const actual=Number.isFinite(status.actualDistance)?Math.round(status.actualDistance)+' u':'—',range=Math.round(status.range||0)+' u';
   const text=label+' · 实际距离 '+actual+' / 射程 '+range+(status.projected?' · 判定 '+Math.round(status.distance)+' u 投影':'')+' · '+rangeText+(reason===rangeText?'':' · '+reason);
   return{...status,canFire:status.canFire&&!this.cb.paused()&&document.pointerLockElement===this.r.canvas,targetId:target?.id,text};
  }
  updateOrbitHUD(){
   const space=!!D.U[this.game?.get(this.entityId)?.kind]?.space,active=this.opticalActive(),state=this.scopeState();this.el('orbit-panel').hidden=false;this.el('orbit-ground').hidden=!space;this.hud.classList?.toggle('orbit-scoped',space&&active);this.hud.classList?.toggle('optics-scoped',active);
   this.el('orbit-panel').querySelector('small').textContent=space?'ORBITAL OPTICS / 轨道光电':'OPTICAL AIM / 光学瞄准';
   this.el('orbit-toggle').textContent=state.latched?'V 收起瞄准':'V 开启瞄准';this.el('orbit-zoom').textContent=active?state.zoom+'× · 视场 '+this.scopeFOV().toFixed(2)+'° · 滚轮调倍率':(space?'4 / 8 / 16 / 32 / 64':'1.5 / 2 / 4 / 8 / 16')+'× · V 切换 / 按住右键';
   const status=this.orbitTargetStatus();this.el('orbit-contact').textContent=status.text;this.el('orbit-contact').classList?.toggle('can-fire',status.canFire);
  }
  keyDown(e){
   if(this.operatorUI?.open)return;
   if(this.vehicleMenu?.open){if(e.code==='Escape'||(e.code==='KeyJ'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))){e.preventDefault();this.vehicleMenu.hide();}e.stopImmediatePropagation();return;}
   if(this.active&&this.cb.canEnter?.()===false){this.clearInput();return;}
   if(!this.active){if(e.code==='KeyE'&&!e.repeat&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!e.target.isContentEditable&&this.cb.canEnter()){e.preventDefault();e.stopImmediatePropagation();this.enter(this.cb.selection()[0]);}return;}
   if(['KeyF','KeyV','KeyG'].includes(e.code)&&(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable))return;
   if(e.code==='F11')return;
   e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
   if(e.code==='Escape'||e.code==='KeyE'){this.exit();return;}
   if(e.code==='KeyJ'){this.vehicleMenu?.show();return;}
   if(e.code==='KeyM'){this.motion=!this.motion;this.cb.toast('驾驶晃动'+(this.motion?'开启':'关闭'));return;}
   const unit=this.game?.get(this.entityId),d=D.U[unit?.kind],inf=(d?.modelKind||unit?.kind)==='infantry';
   if(e.code==='KeyP'||(e.code==='Space'&&!inf)){this.clearInput();this.cb.togglePause();return;}
   if(this.cb.paused()||document.pointerLockElement!==this.r.canvas||document.hidden)return;
   if(e.code==='KeyF'){this.interactVehicle();return;}
   if(e.code==='KeyV'){this.toggleOrbitScope();return;}
   if(d?.space&&e.code==='KeyG'){this.lookDownOrbit();return;}
   if(unit?.kind==='operator'){if(e.code==='KeyR'){this.game.operatorReload(unit.id);return;}if(['Digit1','Digit2'].includes(e.code)){this.game.operatorSwitch(unit.id,e.code==='Digit1'?0:1);this.fire=false;return;}}
   if(/^(Key[WASD]|Arrow|Shift|Control)/.test(e.code))this.flightReady=true;
   if(/^(Key[WASD]|Arrow|Shift|Control)/.test(e.code)||(inf&&e.code==='Space'))this.keys.add(e.code);
   if(inf&&e.code==='Space')this.submit();
  }
  interactVehicle(){
   if(!this.active||this.cb.paused()||this.cb.canEnter?.()===false||this.vehicleMenu?.open||this.operatorUI?.open||document.hidden||document.hasFocus?.()===false||document.pointerLockElement!==this.r.canvas)return false;
   this.clearInput();const result=this.game.vehicleInteract?.(this.entityId);
   if(!result?.ok){this.cb.toast(result?.message||'当前单位无法上下车');return false;}
   const entered=this.enter(result.id);this.cb.toast(result.message);return entered;
  }
  enter(id){
   if(this.active)this.exit(undefined,{keepPointerLock:true});const g=this.cb.game();if(!this.r.is3D){if(document.pointerLockElement===this.r.canvas)document.exitPointerLock();this.cb.toast('第一人称需要三维画面');return false;}if(!this.cb.canEnter()||!g?.beginDirectControl(id)){if(document.pointerLockElement===this.r.canvas)document.exitPointerLock();this.cb.toast(g?.vehicleInteractionMessage||'先选择一个存活的己方作战单位');return false;}
   this.resetOrbitScope();const e=g.get(id),d=D.U[e.kind];this.game=g;g.directObstacles=this.r.vegetationColliders||[];this.active=true;this.entityId=id;this.yaw=e.angle||0;this.pitch=d.underwater?0:d.space?-.4:d.air?(e.pitch||0):-.025;this.underwater=!!d.underwater;this.flightReady=true;this.ads=false;this.fire=false;this.keys.clear();this.lastHP=e.hp;this.lastAimTime=0;this.aimResult=null;this.lastHitAt=-1;this.hitUntil=0;this.hurtUntil=0;this.recoil=0;this.shots=new WeakSet();
   this.old={camera:{...this.r.camera},background:this.r.scene.background,fog:this.r.scene.fog,exposure:this.r.gl.toneMappingExposure,shadow:{left:this.r.sun.shadow.camera.left,right:this.r.sun.shadow.camera.right,top:this.r.sun.shadow.camera.top,bottom:this.r.sun.shadow.camera.bottom},immersive:document.body.classList.contains('immersive')};
   if(!this.sky){const c=document.createElement('canvas');c.width=32;c.height=512;const ctx=c.getContext('2d'),gr=ctx.createLinearGradient(0,0,0,512);gr.addColorStop(0,'#477b9a');gr.addColorStop(.65,'#b8c8c7');gr.addColorStop(1,'#d2cfb8');ctx.fillStyle=gr;ctx.fillRect(0,0,32,512);this.sky=new T.CanvasTexture(c);this.sky.colorSpace=T.SRGBColorSpace;}
   this.r.scene.background=this.underwater?new T.Color(0x073342):this.sky;this.r.scene.fog=this.underwater?new T.FogExp2(0x0d4954,.0065):new T.FogExp2(0xb9c5c1,.0012);Object.assign(this.r.sun.shadow.camera,{left:-260,right:260,top:260,bottom:-260});this.r.sun.shadow.camera.updateProjectionMatrix();this.r.sun.shadow.normalBias=.22;
   this.r.firstPerson=this;document.body.classList.add('direct-view');this.hud.hidden=false;this.el('name').textContent=this.cb.unitName(e.kind,g.teams[0].faction);this.el('domain').textContent=d.underwater?'SUBSEA / 水下':({ground:'GROUND / 陆军',naval:'NAVAL / 海军',air:'AIR / 空军',space:'ORBIT / 太空'})[d.unitGroup];this.el('role').textContent=d.role;this.hud.querySelector('.direct-controls').innerHTML='W A S D 移动 · 鼠标观察<br>'+(d.damage?'左键开火 · 右键瞄准':(d.heal||d.fireControl||d.shield?'支援自动运行':'无武装作业 / 侦察')+' · 右键瞄准')+((d.modelKind||e.kind)==='infantry'?' · 空格跳跃':'')+' · P 暂停 · M 晃动';this.view??=root.WarFPSView?new root.WarFPSView(this.r):null;this.view?.setKind(e.kind,g.teams[0].faction);this.el('flight').hidden=!(d.air||d.underwater);if(d.air||d.underwater){const fixedWing=d.air&&!d.space&&d.modelKind!=='heli';this.hud.querySelector('.direct-controls').innerHTML=(fixedWing?'W / S 加减油门 · A / D 转弯 · 鼠标左右正常 · 上推下降 / 下拉爬升':(d.air&&!d.space?'W A S D 平移 · 鼠标左右正常 · 上推下降 / 下拉爬升':'W A S D 平移 · 鼠标观察'))+'<br>Shift / Ctrl '+(d.underwater?'上浮 / 下潜':'爬升 / 下降')+' · '+(d.damage?'左键开火':'支援自动运行')+' · 右键瞄准 · P 暂停 · E 返回';}this.hud.querySelector('.direct-controls').innerHTML+='<br>V 瞄准 · 按住右键瞄准 · 瞄准时滚轮变焦 · F 上下车';this.updateOrbitHUD();this.cb.onEnter?.();this.resize();this.updateCamera();this.lock();return true;
  }
  lock(){if(!this.active||this.cb.canEnter?.()===false)return;if(!this.cb.paused())this.flightReady=true;if(document.pointerLockElement===this.r.canvas)return;try{const p=this.r.canvas.requestPointerLock();p?.catch(()=>{this.el('lock').hidden=false;});}catch{this.el('lock').hidden=false;}}
  clearInput(){this.flightReady=false;this.keys.clear();this.fire=false;this.ads=false;if(this.scopeState().active&&!this.scopeState().latched)this.syncOptics();const e=this.active&&this.game?.get(this.entityId),d=D.U[e?.kind];if(d?.air&&!d.space){this.yaw=e.angle||0;this.pitch=e.pitch||0;}if(this.active)this.game?.setDirectInput({yaw:this.yaw,pitch:this.pitch,flightEnabled:false,jump:false,cancelJump:true});}
  exit(message,{keepPointerLock=false}={}){this.operatorUI?.hide(false);this.vehicleMenu?.hide(false);if(!this.active)return;this.resetOrbitScope();const e=this.game?.get(this.entityId);this.clearInput();this.game?.endDirectControl();this.active=false;if(!keepPointerLock&&document.pointerLockElement)document.exitPointerLock();this.hud.hidden=true;document.body.classList.remove('direct-view');this.r.firstPerson=null;this.underwater=false;this.camera.up.set(0,1,0);this.r.cam=this.r.strategyCam;this.r.camera={...this.old.camera,x:e?.x??this.old.camera.x,y:e?.y??this.old.camera.y};this.r.scene.background=this.old.background;this.r.scene.fog=this.old.fog;this.r.gl.toneMappingExposure=this.old.exposure;Object.assign(this.r.sun.shadow.camera,this.old.shadow);this.r.sun.shadow.camera.updateProjectionMatrix();this.r.sun.shadow.normalBias=1.1;this.r.syncCamera();this.cb.onExit?.();if(message)this.cb.toast(message);}
  resize(){this.camera.aspect=this.r.width/this.r.height;this.camera.updateProjectionMatrix();this.view?.resize(this.r.width,this.r.height);}
  updateCamera(){
   if(!this.active)return;const e=this.game?.get(this.entityId);if(!e)return;const d=D.U[e.kind],inf=(d.modelKind||e.kind)==='infantry';const height=(inf?this.game.entityAltitude(e):this.r.entityHeight(e))+(d.underwater?4:inf?9.5:d.naval?21:d.air?7:19);this.eye=new T.Vector3(e.x,height,e.y);this.camera.position.copy(this.eye);if(d.space&&this.orbitScope.active){this.camera.quaternion.copy(this.orbitScope.rotation);this.camera.up.set(0,1,0).applyQuaternion(this.orbitScope.rotation);this.camera.near=this.scopeNearPlane();this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.r.cam=this.camera;this.r.camera.x=e.x;this.r.camera.y=e.y;return;}const pitch=(d.air&&!d.space?e.pitch||0:this.pitch)+(this.motion?this.recoil*.012:0),yaw=d.air&&!d.space?e.angle:this.yaw,cp=Math.cos(pitch),look=new T.Vector3(Math.cos(yaw)*cp,Math.sin(pitch),Math.sin(yaw)*cp);this.camera.up.set(0,1,0).applyAxisAngle(look,d.air?(e.roll||0):0);this.camera.lookAt(this.eye.clone().add(look));this.camera.updateMatrixWorld();this.r.cam=this.camera;this.r.camera.x=e.x;this.r.camera.y=e.y;
  }
  cast(origin,direction,max,includeWorld=true){
   const r=this.r,g=this.game;this.ray.set(origin,direction);this.ray.far=max;const hits=[];const box=new T.Box3(),point=new T.Vector3();
   for(const e of g.entities){if(e.id===this.entityId||e.hp<=0||(e.team!==0&&!(D.U[e.kind]?.underwater?g.canDetect(0,e):g.visibleAt(e.x,e.y))))continue;const o=r.objects.get(e.id);if(!o?.visible)continue;box.setFromObject(o);if(!this.ray.ray.intersectBox(box,point)||origin.distanceTo(point)>max)continue;const hit=this.ray.intersectObject(o,true)[0];if(hit)hits.push({...hit,entity:e});}
   if(includeWorld){const solids=r.world.children.filter(o=>o!==r.water&&o.isMesh&&(!o.isInstancedMesh||o.userData.firstPersonOccluder));for(const world of this.ray.intersectObjects(solids,true)){const treeId=root.WarTrees?.resolveHit(world);if(treeId&&!(root.WarTrees.get(g,treeId)?.hp>0))continue;hits.push({...world,treeId:treeId||null});break;}}
   hits.sort((a,b)=>a.distance-b.distance);return hits[0]||null;
  }
  aim(){
   const dir=this.camera.getWorldDirection(new T.Vector3()),hit=this.cast(this.eye,dir,20000);let point=hit?.point||this.eye.clone().addScaledVector(dir,16000),target=hit?.entity||null,targetTreeId=hit?.treeId||null;const actor=this.r.objects.get(this.entityId),anchor=actor?.getObjectByName('muzzle');
   // Legacy unanchored art still checks cover from a conservative body-centred firing point.
   const observedTarget=target;let occluded=false;const unit=this.game.get(this.entityId),base=this.r.entityHeight(unit),origin=anchor?anchor.getWorldPosition(new T.Vector3()):new T.Vector3(unit.x,base+Math.max(3,(this.eye.y-base)*.65),unit.y);
   const delta=point.clone().sub(origin),distance=delta.length();if(distance>.1){const muzzleHit=this.cast(origin,delta.normalize(),distance+.2);if(muzzleHit&&(!muzzleHit.entity||muzzleHit.entity.id!==target?.id)){occluded=!!observedTarget;target=null;targetTreeId=muzzleHit.treeId||null;point=muzzleHit.point;}}
   const legal=target&&this.game.isEnemy(0,target.team)&&(unit.kind==='operator'?this.game.operatorCanTarget(unit,target):this.game.canTargetKind(unit.kind,target.kind));return{point,target:legal?target:null,observedTarget,targetTreeId,occluded,blocked:!!hit&&!legal,origin,originMode:anchor?'model-muzzle':'conservative-body'};
  }
  submit(refresh=false){if(!this.active)return;const e=this.game.get(this.entityId);if(!e)return;if(refresh){this.updateCamera();this.aimResult=this.aim();}const paused=this.cb.paused(),locked=document.pointerLockElement===this.r.canvas;const k=this.keys,d=D.U[e.kind],fixedWing=d.air&&!d.space&&d.modelKind!=='heli';const moving=!paused&&locked&&!this.vehicleMenu?.open&&!this.operatorUI?.open&&!document.hidden&&this.cb.canEnter?.()!==false;const a=this.aimResult||{point:this.eye.clone().add(new T.Vector3(200,0,0)),target:null};this.game.setDirectInput({forward:moving?Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')||k.has('ArrowDown')):0,strafe:moving?Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft')):0,yaw:this.yaw,pitch:this.pitch,turn:fixedWing&&moving?Number(k.has('KeyD'))-Number(k.has('KeyA')):0,lift:moving?Number(k.has('ShiftLeft')||k.has('ShiftRight'))-Number(k.has('ControlLeft')||k.has('ControlRight')):0,throttle:moving?Number(k.has('KeyW'))-Number(k.has('KeyS')):0,flightEnabled:moving&&this.flightReady,jump:moving&&(d.modelKind||e.kind)==='infantry'&&k.has('Space'),fire:moving&&this.fire,ads:this.opticalActive(),targetId:a.target?.id,targetTreeId:a.targetTreeId||null,aimX:a.point.x,aimY:a.point.z,aimHeight:a.point.y});}
  update(dt,time){
   if(!this.active)return;if(this.cb.game()!==this.game||!this.game.directControl||!this.game.get(this.entityId)||this.game.result){this.exit('已返回总指挥');return;}
   const e=this.game.get(this.entityId),d=D.U[e.kind],paused=this.cb.paused();if(paused||e.disabled>this.game.time)this.clearInput();this.recoil*=Math.exp(-dt*14);const desired=this.opticalActive()?this.scopeFOV():70;this.camera.fov+=(desired-this.camera.fov)*(1-Math.exp(-dt*18));this.camera.near=(e.altitude||0)>2000?1:.08;this.camera.updateProjectionMatrix();this.updateCamera();this.r.altitudeScene?.update(this,e,time);if(!this.underwater&&(e.altitude||0)<=700){this.r.scene.background=this.sky;this.r.scene.fog=this.flightFog??=new T.FogExp2(0xb9c5c1,.0012);}
   if(d.air&&!d.space&&d.modelKind!=='heli'&&!paused&&document.pointerLockElement===this.r.canvas)this.yaw+=(Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA')))*.8*dt;
   const operator=e.kind==='operator'?this.game.operatorStatus(e.id):null,held=operator&&root.WarOperatorWeapons.byId[operator.slots[operator.activeSlot].weaponId];if(held&&this.view?.metrics?.weaponId!==held.id){this.view?.setWeapon(held.id,this.game.teams[0].faction);this.lastAimTime=0;this.aimResult=null;}
   if(time-this.lastAimTime>.055||!this.aimResult||this.fire){this.aimResult=this.aim();this.lastAimTime=time;}
   this.submit();let firePulse=false;for(const fx of this.game.effects)if(fx.type==='shot'&&fx.sourceId===e.id&&!this.shots.has(fx)){this.shots.add(fx);this.recoil=Math.min(2,this.recoil+.8);firePulse=true;}if(firePulse)this.playShot();
   const moving=[...this.keys].some(k=>/^(Key[WASD]|Arrow)/.test(k))&&!paused&&document.pointerLockElement===this.r.canvas;const contacts=this.underwater?this.game.entities.filter(t=>this.game.isEnemy(e.team,t.team)&&D.U[t.kind]?.underwater&&this.game.canDetect(e.team,t)).map(t=>({x:t.x-e.x,y:t.y-e.y})):[];this.view?.update({telemetry:{altitude:this.r.entityHeight(e),speed:e.flightSpeed||0,pitch:e.pitch||0,roll:e.roll||0,contacts},time,dt,firePulse,reloading:!!operator?.reloadRemaining,reloadProgress:operator?.reloadRemaining?1-operator.reloadRemaining/operator.reloadTotal:0,ads:this.opticalActive(),moving,motion:this.motion,hp:e.hp/e.maxHp});
   this.el('hp').style.width=(e.hp/e.maxHp*100)+'%';this.el('vitals').textContent=Math.ceil(e.hp)+' / '+Math.ceil(e.maxHp)+'   ·   '+(e.disabled>this.game.time?'EMP 停机':paused?'已暂停':'系统正常');
   this.el('reload').style.width=(100*(1-clamp(e.cool/d.reload,0,1)))+'%';this.el('weapon-state').textContent=!d.damage?(d.heal?'医疗 / 维修自动运行':d.fireControl?'区域支援自动运行':d.shield?'护盾自动运行':'无武装 · 侦察 / 作业'):e.cool>0?'装填 '+(e.cool*this.game.cooldownMultiplier(e)).toFixed(1)+' s':'武器就绪';
   if(d.air||d.underwater){this.el('layer').textContent=this.underwater?'水下声呐 / 深度控制':d.space?'低轨空间 · 200–1200 km':'飞行姿态 · 上限 1800 u';this.el('flight').querySelector('small').textContent=d.space?'轨道垂直压缩100:1 · 1u对应0.1km':'游戏距离 / u · 速度 / u·s⁻¹';this.el('altitude').textContent=(this.underwater?'深度 ':'高度 ')+(d.space?Math.round(e.altitude*.1)+' km · 压缩映射':Math.round(Math.abs(e.altitude))+' u');this.el('speed').textContent='速度 '+Math.round(e.flightSpeed||0)+' u/s';this.el('attitude').textContent='机体俯仰 '+Math.round((e.pitch||0)*180/Math.PI)+'° · 机体滚转 '+Math.round((e.roll||0)*180/Math.PI)+'°';}
   this.vehicleMenu?.update();this.operatorUI?.update();this.updateOrbitHUD();
   this.el('compass').textContent='N  ·  '+String(Math.round(((this.yaw*180/Math.PI)+90+3600)%360)).padStart(3,'0')+'°  ·  E';this.el('economy').textContent='资金 '+(this.game.buffs.has('unlimited')?'∞':Math.floor(this.game.teams[0].money).toLocaleString())+'  ·  生产 '+this.game.teams[0].queue.length;
   const a=this.aimResult,target=a?.target,observed=a?.observedTarget||target;this.el('target').textContent=observed?this.cb.unitName(observed.kind,this.game.teams[observed.team].faction):(this.game.vehicleInteractionHint?.(e.id)||'');this.el('reticle').classList.toggle('enemy',!!target);this.el('reticle').classList.toggle('ads',this.opticalActive());
   const locked=document.pointerLockElement===this.r.canvas;this.el('lock').hidden=this.operatorUI?.open||this.vehicleMenu?.open||(locked&&!paused);if(paused)this.el('lock').textContent='已暂停 · P 继续';else if(!locked)this.el('lock').textContent='点击画面锁定鼠标 · 继续驾驶';
   const hurt=e.hp<this.lastHP;if(hurt){this.hurtUntil=time+.45;this.hurtDirection=e.lastHitFrom?Math.atan2(e.lastHitFrom.y-e.y,e.lastHitFrom.x-e.x)-this.yaw:0;}this.lastHP=e.hp;
   const hurtAmount=Math.max(0,(this.hurtUntil||0)-time)/.45;this.el('damage').style.opacity=String(hurtAmount*.75);this.el('damage').style.transform='rotate('+((this.hurtDirection||0)*180/Math.PI)+'deg)';
   const feedback=this.game.directFeedback;if(feedback?.sourceId===e.id&&feedback.hitAt!==this.lastHitAt){this.lastHitAt=feedback.hitAt;this.hitUntil=time+.18;}this.el('hit').style.opacity=time<this.hitUntil?'1':'0';
  }
  playShot(){if(!this.cb.sound())return;try{this.audio??=new (window.AudioContext||window.webkitAudioContext)();this.audio.resume();const a=this.audio,buffer=a.createBuffer(1,Math.floor(a.sampleRate*.12),a.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*7);const source=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1300;gain.gain.value=.12;source.connect(filter);filter.connect(gain);gain.connect(a.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}catch{}}
  drawOverlay(game,time){
   const r=this.r,g=r.ctx;for(const f of game.effects){if(!game.visibleAt(f.x,f.y)&&f.sourceId!==this.entityId)continue;const t=clamp(1-f.ttl/f.max,0,1);if(f.type==='shot'){const a=f.sourceId===this.entityId?{x:r.width*.53,y:r.height*.57}:r.toScreen(f.x,f.y,f.sourceHeight??8),z=r.toScreen(f.tx,f.ty,f.targetHeight??5);if(!Number.isFinite(a.x)||!Number.isFinite(z.x))continue;const x=a.x+(z.x-a.x)*t,y=a.y+(z.y-a.y)*t;g.strokeStyle=f.weaponFx==='torpedo'?'#b8e1df':'#f1d69b';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x-(z.x-a.x)*.025,y-(z.y-a.y)*.025);g.stroke();}else if(['impact','explosion','nuclear','lance'].includes(f.type)){const p=r.toScreen(f.x,f.y,f.height??4);if(!Number.isFinite(p.x))continue;const distance=Math.max(20,this.eye.distanceTo(new T.Vector3(f.x,f.height||4,f.y))),radius=clamp((f.r||18)*r.height/distance*(.25+t),2,150);const glow=g.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);glow.addColorStop(0,'#fff1c8d9');glow.addColorStop(.12,'#ffc16b99');glow.addColorStop(.38,'#bd6d3044');glow.addColorStop(1,'#3b302000');g.globalAlpha=(1-t)*.8;g.fillStyle=glow;g.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);g.strokeStyle='#ffd696';g.lineWidth=1.2;g.globalAlpha=(1-t)*(1-t);for(let n=0;n<6;n++){const a=n*2.399+(f.x%13),spread=radius*(.15+t*.6),sx=p.x+Math.cos(a)*spread,sy=p.y+Math.sin(a)*spread-t*radius*.25;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx-Math.cos(a)*radius*.09,sy-Math.sin(a)*radius*.09);g.stroke();}g.globalAlpha=1;}}
   if(!this.opticalActive())this.view?.render(this.camera);
  }
 }
 root.WarDirectControl=DirectControl;
})(globalThis);
