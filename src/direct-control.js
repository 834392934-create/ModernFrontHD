/* First-person possession of the live RTS entity. Input and visuals never own health or damage. */
(function(root){
 'use strict';const T=root.THREE,D=root.WarData,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 class DirectControl {
  constructor(renderer,callbacks){
   this.r=renderer;this.cb=callbacks;this.active=false;this.motion=false;this.keys=new Set();this.yaw=0;this.pitch=0;this.ads=false;this.leftFire=false;this.fire=false;this.shots=new WeakSet();this.dischargeKeys=new Set();this.recoil=0;this.lastAimTime=0;this.hitUntil=0;this.ignoreNextMouse=false;
   this.orbitScope={active:false,latched:false,index:0,zoom:4};this.aimScope={active:false,latched:false,index:0,zoom:1.5};this.externalView=false;
   this.camera=new T.PerspectiveCamera(70,innerWidth/innerHeight,.08,100000);this.ray=new T.Raycaster();this.ray.far=2500;
   this.hud=document.createElement('div');this.hud.id='direct-hud';this.hud.hidden=true;
   this.hud.innerHTML='<div class="direct-shade"></div><div id="direct-damage"></div><header><span>DIRECT CONTROL <b>01</b></span><div id="direct-compass"></div><button id="direct-exit">返回总指挥 · E / Esc</button></header><div class="direct-orders"><i></i>AI 接管总调度 <span id="direct-economy"></span></div><div id="direct-reticle"><i></i><i></i><i></i><i></i><b></b></div><div id="direct-hit">×</div><div id="direct-target"></div><div id="direct-flight" hidden><b id="direct-layer"></b><span id="direct-altitude"></span><span id="direct-speed"></span><span id="direct-attitude"></span><small>游戏距离 / u · 速度 / u·s⁻¹</small></div><button id="direct-lock">点击画面锁定鼠标 · 开始驾驶</button><div class="direct-bottom"><section><small id="direct-domain"></small><strong id="direct-name"></strong><div class="direct-health"><i id="direct-hp"></i></div><span id="direct-vitals"></span></section><div class="direct-controls">W A S D 移动 · 鼠标观察<br>左键开火 · 右键仅瞄准 · P 暂停 · M 晃动</div><section class="direct-weapon"><span id="direct-weapon-state"></span><div class="direct-reload"><i id="direct-reload"></i></div><small id="direct-role"></small></section></div>';
   this.hud.innerHTML+='<section id="direct-orbit-panel" hidden><small>ORBITAL OPTICS / 轨道光电</small><div><button id="direct-orbit-toggle">V 开启瞄准</button><button id="direct-orbit-ground">G 对地俯视</button></div><strong id="direct-orbit-zoom"></strong><span id="direct-orbit-contact"></span></section>';
   this.hud.innerHTML+='<div id="direct-camera-mode" hidden></div>';
   document.body.append(this.hud);this.el=id=>this.hud.querySelector('#direct-'+id);
   this.el('exit').onclick=()=>this.exit();this.el('lock').onclick=()=>{if(this.cb.paused())this.cb.togglePause();this.lock();};
   this.el('orbit-toggle').onclick=()=>{if(this.toggleOrbitScope())this.lock();};this.el('orbit-ground').onclick=()=>{if(this.lookDownOrbit())this.lock();};
   document.addEventListener('keydown',e=>this.keyDown(e),true);document.addEventListener('keyup',e=>{if(this.operatorUI?.open)return;if(this.active){this.keys.delete(e.code);if(e.code==='Space')this.submit();if(this.cb.canEnter?.()!==false){e.preventDefault();e.stopImmediatePropagation();}}},true);
   // Mouse events report each button in a chord; pointerdown/up only report first/last.
   document.addEventListener('mousedown',e=>{if(!this.active||this.operatorUI?.open||this.vehicleMenu?.open||this.cb.canEnter?.()===false||document.hidden||document.hasFocus?.()===false||e.target.closest('button')||e.target.closest('#vehicle-menu'))return;e.preventDefault();e.stopImmediatePropagation();if(document.pointerLockElement!==this.r.canvas){this.lock();return;}if(!this.scopeAvailable()||![0,2].includes(e.button))return;if(e.button===0)this.leftFire=true;if(e.button===2){this.ads=true;this.syncOptics();}this.fire=!!this.leftFire;this.submit(true);},true);
   document.addEventListener('mouseup',e=>{if(!this.active||![0,2].includes(e.button))return;if(e.button===0)this.leftFire=false;if(e.button===2){this.ads=false;this.syncOptics();}this.fire=!!this.leftFire;this.submit(this.fire);if(this.cb.canEnter?.()!==false)e.stopImmediatePropagation();},true);
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
  vehicleAvailable(){const e=this.game?.get(this.entityId),d=D.U[e?.kind];return !!(this.active&&e&&!e.structure&&d&&(d.modelKind||e.kind)!=='infantry');}
  exteriorActive(){return this.externalView&&this.vehicleAvailable()&&!this.opticalActive();}
  toggleExternalView(){
   if(!this.vehicleAvailable()||!this.scopeAvailable()||document.pointerLockElement!==this.r.canvas)return false;
   this.externalView=!this.externalView;this.cameraPoseKey=null;this.lastAimTime=0;this.aimResult=null;this.updateCamera();this.updateCameraHUD();
   this.cb.toast(this.externalView?'车外跟随 · 按住右键进入光学瞄准':'第一人称驾驶 · C 切换车外');return true;
  }
  updateCameraHUD(){const node=this.el('camera-mode');node.hidden=!this.vehicleAvailable();node.textContent=this.exteriorActive()?'C · 车外跟随':this.externalView?'光学瞄准 · 收起后恢复车外':'C · 第一人称驾驶';}
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
   if(unit?.kind==='operator'){const status=this.game.operatorStatus(this.entityId);this.game.operatorSwitch(this.entityId,1-status.activeSlot);this.leftFire=false;this.fire=false;}
  }
  orbitTargetStatus(){
   const g=this.game,e=g.get(this.entityId),a=this.aimResult,target=g.get(a?.observedTarget?.id??a?.target?.id);
   const status=g.directFireStatus?.(e,target,{aimPoint:a?.point,blocked:!!a?.occluded})||{canFire:false,range:g.rangeProfile(e).attack,rangeState:'none',reason:'no-target'};
   const reasons={ready:'可射击',unarmed:'无攻击武器',inactive:'系统停机',emp:'EMP 停机',dead:'单位已失效','no-target':'移动准星选择目标',friendly:'己方单位',domain:'不支持目标域',undetected:'未侦测',blocked:'准线被遮挡','aim-miss':'准线未对准目标','min-range':'最小射程盲区','out-of-range':'超出射程',reloading:'换弹中','no-ammo':'缺弹，需补给',cooldown:'装填中',preparing:'准备 / 抬炮中',packing:'撤收中',traversing:'炮座转向中',arc:'超出射界',elevation:'超出俯仰射界','turret-damaged':'炮塔故障',downed:'倒地待救',crashing:'失能下降',disabled:'失能'};
   const rangeText={in:'射程内',out:'超出射程',min:'最小射程盲区',none:'距离待测'}[status.rangeState];
   const label=target?this.cb.unitName(target.kind,g.teams[target.team].faction):a?.targetTreeId?'地表树木':'自由瞄点';
   let reason=reasons[status.reason]||'等待目标';if(this.cb.paused())reason+=' · 已暂停';else if(document.pointerLockElement!==this.r.canvas)reason+=' · 点击锁定后开火';
   const format=v=>g.formatRangeDistance?g.formatRangeDistance(v):Number.isFinite(v)?Math.round(v)+' u':'—',actual=format(status.actualDistance),range=format(status.range||0),rangeProfile=g.rangeProfile(e,false,target),reference=g.rangeReferenceLabel?.(rangeProfile.reference)||'';
   const text=label+' · 实际距离 '+actual+' / 射程 '+range+(status.projected?' · 判定 '+format(status.distance)+' 投影':'')+' · '+rangeText+(reason===rangeText?'':' · '+reason)+(reference?' · '+reference:'');
   return{...status,canFire:status.canFire&&!this.cb.paused()&&document.pointerLockElement===this.r.canvas,targetId:target?.id,text};
  }
  updateOrbitHUD(){
   const unitType=D.U[this.game?.get(this.entityId)?.kind],space=!!unitType?.space,armed=!!unitType?.damage,active=this.opticalActive(),state=this.scopeState();this.el('orbit-panel').hidden=false;this.el('orbit-ground').hidden=!space;this.hud.classList?.toggle('orbit-scoped',space&&active);this.hud.classList?.toggle('optics-scoped',active);
   this.el('orbit-panel').querySelector('small').textContent=space?'ORBITAL OPTICS / 轨道光电':'OPTICAL AIM / 光学瞄准';
   this.el('orbit-toggle').textContent=state.latched?'V 收起瞄准':'V 开启瞄准';this.el('orbit-zoom').textContent=active?state.zoom+'× · 视场 '+this.scopeFOV().toFixed(2)+'° · 滚轮调倍率':(space?'4 / 8 / 16 / 32 / 64':'1.5 / 2 / 4 / 8 / 16')+'× · '+(armed?'右键仅瞄准':'右键观察')+' / V 观察';
   const status=this.orbitTargetStatus();this.el('orbit-contact').textContent=status.text;this.el('orbit-contact').classList?.toggle('can-fire',status.canFire);
  }
  keyDown(e){
   if(this.operatorUI?.open)return;
   if(this.vehicleMenu?.open){if(e.code==='Escape'||(e.code==='KeyJ'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))){e.preventDefault();this.vehicleMenu.hide();}e.stopImmediatePropagation();return;}
   if(this.active&&this.cb.canEnter?.()===false){this.clearInput();return;}
   if(!this.active){if(e.code==='KeyE'&&!e.repeat&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!e.target.isContentEditable&&this.cb.canEnter()){e.preventDefault();e.stopImmediatePropagation();this.enter(this.cb.selection()[0]);}return;}
   if(['KeyF','KeyV','KeyG','KeyC'].includes(e.code)&&(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable))return;
   if(e.code==='F11')return;
   e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
   if(e.code==='Escape'||e.code==='KeyE'){this.exit();return;}
   if(e.code==='KeyJ'){this.vehicleMenu?.show();return;}
   if(e.code==='KeyM'){this.motion=!this.motion;this.cb.toast('驾驶晃动'+(this.motion?'开启':'关闭'));return;}
   const unit=this.game?.get(this.entityId),d=D.U[unit?.kind],inf=(d?.modelKind||unit?.kind)==='infantry';
   if(e.code==='KeyP'||(e.code==='Space'&&!inf)){this.clearInput();this.cb.togglePause();return;}
   if(this.cb.paused()||document.pointerLockElement!==this.r.canvas||document.hidden)return;
   if(e.code==='KeyF'){this.interactVehicle();return;}
   if(e.code==='KeyC'){this.toggleExternalView();return;}
   if(e.code==='KeyV'){this.toggleOrbitScope();return;}
   if(d?.space&&e.code==='KeyG'){this.lookDownOrbit();return;}
   if(d?.air&&!d.space&&e.code==='KeyR'){this.leftFire=false;this.fire=false;const accepted=this.game.returnAircraft(unit.id);if(accepted){this.flightReady=true;this.submit();}this.cb.toast(accepted?'飞控接管返航；暂停后按 W 恢复，降落后维修':'没有存活机场，继续手动驾驶');return;}
   if(unit?.kind==='operator'&&e.code==='KeyX'){this.game.operatorCycleFireMode(unit.id);return;}
   if(e.code==='KeyZ'){this.cb.toast(this.game.resupplyUnit(unit.id)?'补给请求已登记 · 接近己方补给设施':'没有可用补给设施');return;}
   if(e.code==='KeyQ'&&d?.naval){this.cb.toast(this.game.deployDecoy(unit.id)?'声学诱饵已释放':'诱饵未就绪或已用尽');return;}
   if(e.code==='KeyL'&&root.WarTransportOperations.capacity(unit)){this.cb.toast('载入 '+this.game.boardPassengers(unit.id)+' 名附近人员');return;}
   if(e.code==='KeyU'&&root.WarTransportOperations.capacity(unit)){this.cb.toast('下车 '+this.game.unloadPassengers(unit.id)+' 名人员');return;}
   if(e.code==='KeyR'&&unit?.kind!=='operator'){this.game.reloadWeapon(unit.id);return;}
   if(unit?.kind==='operator'){if(e.code==='KeyR'){this.game.operatorReload(unit.id);return;}if(['Digit1','Digit2'].includes(e.code)){this.game.operatorSwitch(unit.id,e.code==='Digit1'?0:1);this.leftFire=false;this.fire=false;return;}}
   if(['BracketLeft','BracketRight'].includes(e.code)){
    const weapons=this.game.vehicleWeapons(unit),ids=['auto',...weapons.map(w=>w.id)];if(weapons.length){const current=Math.max(0,ids.indexOf(unit.weaponId||'auto')),id=ids[(current+(e.code==='BracketLeft'?ids.length-1:1))%ids.length];this.game.setVehicleWeapon(unit.id,id);this.leftFire=false;this.fire=false;this.aimResult=null;this.cb.toast(id==='auto'?'自动按目标选择武器':weapons.find(w=>w.id===id).name);}return;
   }
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
   this.externalView=false;this.cameraPoseKey=null;this.cameraBoom=null;this.resetOrbitScope();const e=g.get(id),d=D.U[e.kind];this.game=g;g.directObstacles=this.r.vegetationColliders||[];this.active=true;this.entityId=id;this.yaw=e.angle||0;this.pitch=d.underwater?0:d.space?-.4:d.air?(e.pitch||0):-.025;this.underwater=!!d.underwater;this.flightReady=true;this.ads=false;this.leftFire=false;this.fire=false;this.keys.clear();this.lastHP=e.hp;this.lastAimTime=0;this.aimResult=null;this.lastHitAt=-1;this.hitUntil=0;this.hurtUntil=0;this.recoil=0;this.shots=new WeakSet();this.dischargeKeys=new Set();
   this.old={camera:{...this.r.camera},background:this.r.scene.background,fog:this.r.scene.fog,exposure:this.r.gl.toneMappingExposure,shadow:{left:this.r.sun.shadow.camera.left,right:this.r.sun.shadow.camera.right,top:this.r.sun.shadow.camera.top,bottom:this.r.sun.shadow.camera.bottom},immersive:document.body.classList.contains('immersive')};
   if(!this.sky){const c=document.createElement('canvas');c.width=32;c.height=512;const ctx=c.getContext('2d'),gr=ctx.createLinearGradient(0,0,0,512);gr.addColorStop(0,'#477b9a');gr.addColorStop(.65,'#b8c8c7');gr.addColorStop(1,'#d2cfb8');ctx.fillStyle=gr;ctx.fillRect(0,0,32,512);this.sky=new T.CanvasTexture(c);this.sky.colorSpace=T.SRGBColorSpace;}
   this.r.scene.background=this.underwater?new T.Color(0x073342):this.sky;this.r.scene.fog=this.underwater?new T.FogExp2(0x0d4954,.0065):new T.FogExp2(0xb9c5c1,.0012);Object.assign(this.r.sun.shadow.camera,{left:-260,right:260,top:260,bottom:-260});this.r.sun.shadow.camera.updateProjectionMatrix();this.r.sun.shadow.normalBias=.22;
   this.r.firstPerson=this;document.body.classList.add('direct-view');this.hud.hidden=false;this.el('name').textContent=this.cb.unitName(e.kind,g.teams[0].faction);this.el('domain').textContent=d.underwater?'SUBSEA / 水下':({ground:'GROUND / 陆军',naval:'NAVAL / 海军',air:'AIR / 空军',space:'ORBIT / 太空'})[d.unitGroup];this.el('role').textContent=d.role;this.hud.querySelector('.direct-controls').innerHTML=((d.modelKind||e.kind)==='infantry'?'W A S D 移动 · 鼠标观察<br>':'W / S 前进、刹车及倒车 · A / D 转向 · 鼠标瞄准<br>')+(d.damage?'左键开火 · 右键仅瞄准':(d.heal||d.fireControl||d.shield?'支援自动运行':'无武装作业 / 侦察')+' · 右键观察')+((d.modelKind||e.kind)==='infantry'?' · 空格跳跃':'')+' · P 暂停 · M 晃动';this.view??=root.WarFPSView?new root.WarFPSView(this.r):null;this.view?.setKind(e.kind,g.teams[0].faction);this.el('flight').hidden=!(d.air||d.underwater);if(d.air||d.underwater){const fixedWing=d.air&&!d.space&&d.modelKind!=='heli';this.hud.querySelector('.direct-controls').innerHTML=(fixedWing?'W / S 加减油门 · A / D 转弯 · 鼠标左右正常 · 上推下降 / 下拉爬升':(d.air&&!d.space?'W A S D 平移 · 鼠标左右正常 · 上推下降 / 下拉爬升':(d.underwater?'W / S 前进、刹车及倒车 · A / D 转向 · 鼠标观察':'W A S D 平移 · 鼠标观察')))+'<br>Shift / Ctrl '+(d.underwater?'上浮 / 下潜':'爬升 / 下降')+' · '+(d.damage?'左键开火 · 右键仅瞄准':'支援自动运行 · 右键观察')+' · P 暂停 · E 返回';}this.hud.querySelector('.direct-controls').innerHTML+='<br>V 观察 · 按住右键'+(d.damage?'仅瞄准':'观察')+' · 瞄准时滚轮变焦 · F 上下车'+((d.modelKind||e.kind)!=='infantry'?' · C 内外视角':'');this.updateOrbitHUD();this.updateCameraHUD();this.cb.onEnter?.();this.resize();this.updateCamera();this.lock();return true;
  }
  lock(){if(!this.active||this.cb.canEnter?.()===false)return;if(!this.cb.paused())this.flightReady=true;if(document.pointerLockElement===this.r.canvas)return;try{const p=this.r.canvas.requestPointerLock();p?.catch(()=>{this.el('lock').hidden=false;});}catch{this.el('lock').hidden=false;}}
  clearInput(){this.flightReady=false;this.keys.clear();this.leftFire=false;this.fire=false;this.ads=false;if(this.scopeState().active&&!this.scopeState().latched)this.syncOptics();const e=this.active&&this.game?.get(this.entityId),d=D.U[e?.kind];if(e){this.game.operatorCancelTrigger?.(e.id);root.WarCombatReadiness.cancelBurst?.(e);}if(d?.air&&!d.space){this.yaw=e.angle||0;this.pitch=e.pitch||0;}if(this.active)this.game?.setDirectInput({yaw:this.yaw,pitch:this.pitch,flightEnabled:false,jump:false,cancelJump:true});}
  exit(message,{keepPointerLock=false}={}){this.operatorUI?.hide(false);this.vehicleMenu?.hide(false);if(!this.active)return;this.resetOrbitScope();const e=this.game?.get(this.entityId);this.clearInput();this.game?.endDirectControl();this.active=false;this.externalView=false;this.cameraPoseKey=null;this.cameraBoom=null;if(!keepPointerLock&&document.pointerLockElement)document.exitPointerLock();if(!this.cb.audio)this.audio?.dispose();this.audio=null;this.hud.hidden=true;document.body.classList.remove('direct-view');this.r.firstPerson=null;this.underwater=false;this.camera.up.set(0,1,0);this.r.cam=this.r.strategyCam;this.r.camera={...this.old.camera,x:e?.x??this.old.camera.x,y:e?.y??this.old.camera.y};this.r.scene.background=this.old.background;this.r.scene.fog=this.old.fog;this.r.gl.toneMappingExposure=this.old.exposure;Object.assign(this.r.sun.shadow.camera,this.old.shadow);this.r.sun.shadow.camera.updateProjectionMatrix();this.r.sun.shadow.normalBias=1.1;this.r.syncCamera();this.cb.onExit?.();if(message)this.cb.toast(message);}
  resize(){this.camera.aspect=this.r.width/this.r.height;this.camera.updateProjectionMatrix();this.view?.resize(this.r.width,this.r.height);}
  updateCamera(){
   if(!this.active)return;const e=this.game?.get(this.entityId);if(!e)return;const d=D.U[e.kind],inf=(d.modelKind||e.kind)==='infantry';const height=(inf?this.game.entityAltitude(e):this.r.entityHeight(e))+(d.underwater?4:inf?(e.components?.state==='downed'?2.4:9.5):d.naval?21:d.air?7:19);
   this.vehicleEye=new T.Vector3(e.x,height,e.y);this.eye=this.vehicleEye.clone();this.camera.position.copy(this.eye);
   if(d.space&&this.orbitScope.active){this.camera.quaternion.copy(this.orbitScope.rotation);this.camera.up.set(0,1,0).applyQuaternion(this.orbitScope.rotation);this.camera.near=this.scopeNearPlane();this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.r.cam=this.camera;this.r.camera.x=e.x;this.r.camera.y=e.y;return;}
   const pitch=(d.air&&!d.space?e.pitch||0:this.pitch)+(this.motion?this.recoil*.012:0),yaw=d.air&&!d.space?e.angle:this.yaw,cp=Math.cos(pitch),look=new T.Vector3(Math.cos(yaw)*cp,Math.sin(pitch),Math.sin(yaw)*cp);
   if(this.exteriorActive()){
    const b=root.WarNavigationFootprints?.bounds[e.kind+'_'+this.game.teams[e.team]?.faction];
    const pose=root.WarVehicleCamera.frame(e,d,b,this.r.entityHeight(e),yaw,pitch,this.camera.aspect,this.camera.fov);
    // Pure follow pose; no per-call lerp. Render, input and resize may request the
    // same pose multiple times in one frame without introducing camera drift.
    const solids=this.game.entities.filter(o=>o.structure).map(o=>[o.id,o.hp,o.x,o.y,o.altitude].join(',')).join(';');
    const key=[this.game.time,e.id,e.x,e.y,e.altitude,e.angle,e.pitch,e.roll,yaw,pitch,this.camera.aspect,this.camera.fov,this.r.world.children.length,this.r.objects.size,this.game._treeState?.revision,solids].join('|');
    if(this.cameraPoseKey!==key){this.cameraBoom??=new root.WarVehicleCamera.Boom();this.exteriorEye=this.cameraBoom.resolve(pose,this.r,this.game,e);this.cameraPoseKey=key;}
    this.eye.copy(this.exteriorEye);this.camera.position.copy(this.eye);this.camera.up.set(0,1,0);this.camera.near=.08;this.camera.updateProjectionMatrix();
   }else this.camera.up.set(0,1,0).applyAxisAngle(look,d.air?(e.roll||0):0);
   this.camera.lookAt(this.eye.clone().add(look));this.camera.updateMatrixWorld();this.r.cam=this.camera;this.r.camera.x=e.x;this.r.camera.y=e.y;
  }
  cast(origin,direction,max,includeWorld=true){
   const r=this.r,g=this.game;this.ray.set(origin,direction);this.ray.far=max;const hits=[];const box=new T.Box3(),point=new T.Vector3();
   for(const e of g.entities){if(e.id===this.entityId||e.hp<=0||(e.team!==0&&!(D.U[e.kind]?.underwater?g.canDetect(0,e):g.visibleAt(e.x,e.y))))continue;const o=r.objects.get(e.id);if(!o?.visible)continue;box.setFromObject(o);if(!this.ray.ray.intersectBox(box,point)||origin.distanceTo(point)>max)continue;const hit=this.ray.intersectObject(o,true)[0];if(hit)hits.push({...hit,entity:e});}
   if(includeWorld){const solids=r.world.children.filter(o=>o!==r.water&&o.isMesh&&(!o.isInstancedMesh||o.userData.firstPersonOccluder));for(const world of this.ray.intersectObjects(solids,true)){const treeId=root.WarTrees?.resolveHit(world);if(treeId&&!(root.WarTrees.get(g,treeId)?.hp>0))continue;hits.push({...world,treeId:treeId||null});break;}}
   hits.sort((a,b)=>a.distance-b.distance);return hits[0]||null;
  }
  aim(){
   const dir=this.camera.getWorldDirection(new T.Vector3()),hit=this.cast(this.eye,dir,20000);let point=hit?.point||this.eye.clone().addScaledVector(dir,16000),target=hit?.entity||null,targetTreeId=hit?.treeId||null;const unit=this.game.get(this.entityId),actor=this.r.objects.get(this.entityId),anchor=root.WarWeaponEffects?.weaponAnchor(actor,this.game.vehicleWeapon(unit,target),{kind:unit.kind,faction:this.game.teams[unit.team]?.faction,portIndex:unit.combat?.stations[this.game.vehicleWeapon(unit,target)?.id]?.nextPort||0})||actor?.getObjectByName('muzzle');
   // Legacy unanchored art still checks cover from a conservative body-centred firing point.
   const observedTarget=target;let occluded=false;const base=this.r.entityHeight(unit),origin=anchor?anchor.getWorldPosition(new T.Vector3()):new T.Vector3(unit.x,base+Math.max(3,((this.vehicleEye||this.eye).y-base)*.65),unit.y);
   const delta=point.clone().sub(origin),distance=delta.length();if(distance>.1){const muzzleHit=this.cast(origin,delta.normalize(),distance+.2);if(muzzleHit&&(!muzzleHit.entity||muzzleHit.entity.id!==target?.id)){occluded=!!observedTarget;target=null;targetTreeId=muzzleHit.treeId||null;point=muzzleHit.point;}}
   if(anchor&&(D.U[unit.kind]?.modelKind||unit.kind)!=='infantry'&&this.game.vehicleWeapon(unit,target)?.mount?.mode!=='vertical'&&actor){this.ray.set(origin,point.clone().sub(origin).normalize());this.ray.far=origin.distanceTo(point);const selfHit=this.ray.intersectObject(actor,true).find(h=>h.distance>2&&h.object.isMesh&&h.object.material?.transparent!==true);if(selfHit){occluded=true;target=null;targetTreeId=null;point=selfHit.point;}}
   const legal=target&&this.game.isEnemy(0,target.team)&&(unit.kind==='operator'?this.game.operatorCanTarget(unit,target):this.game.canTargetKind(unit,target.kind));const origins=(actor?.userData.firePorts||[]).map(port=>actor.getObjectByName(port.node)?.getWorldPosition(new T.Vector3())).filter(Boolean);return{point,target:legal?target:null,observedTarget,targetTreeId,occluded,blocked:!!hit&&!legal,origin,origins,originMode:anchor?'model-muzzle':'conservative-body'};
  }
  submit(refresh=false){if(!this.active)return;const e=this.game.get(this.entityId);if(!e)return;if(refresh){this.updateCamera();this.aimResult=this.aim();}const paused=this.cb.paused(),locked=document.pointerLockElement===this.r.canvas;const k=this.keys,d=D.U[e.kind],fixedWing=d.air&&!d.space&&d.modelKind!=='heli';const moving=!paused&&locked&&!this.vehicleMenu?.open&&!this.operatorUI?.open&&!document.hidden&&this.cb.canEnter?.()!==false;const a=this.aimResult||{point:this.eye.clone().add(new T.Vector3(200,0,0)),target:null};this.game.setDirectInput({forward:moving?Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')||k.has('ArrowDown')):0,strafe:moving?Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft')):0,yaw:this.yaw,pitch:this.pitch,turn:fixedWing&&moving?Number(k.has('KeyD'))-Number(k.has('KeyA')):0,lift:moving?Number(k.has('ShiftLeft')||k.has('ShiftRight'))-Number(k.has('ControlLeft')||k.has('ControlRight')):0,throttle:moving?Number(k.has('KeyW'))-Number(k.has('KeyS')):0,flightEnabled:moving&&this.flightReady,jump:moving&&(d.modelKind||e.kind)==='infantry'&&k.has('Space'),fire:moving&&this.fire,ads:this.opticalActive(),targetId:a.target?.id??a.observedTarget?.id,aimBlocked:!!a.occluded||!!a.observedTarget&&!a.target,targetTreeId:a.targetTreeId||null,aimOrigin:a.origin?{x:a.origin.x,y:a.origin.z,height:a.origin.y}:undefined,aimOrigins:(a.origins||[]).map(p=>({x:p.x,y:p.z,height:p.y})),aimX:a.point.x,aimY:a.point.z,aimHeight:a.point.y});}
  update(dt,time){
   if(!this.active)return;if(this.cb.game()!==this.game||!this.game.directControl||!this.game.get(this.entityId)||this.game.result){this.exit('已返回总指挥');return;}
   const e=this.game.get(this.entityId),d=D.U[e.kind],paused=this.cb.paused();if(paused||e.disabled>this.game.time||root.WarCombatDamage.incapacitated(e))this.clearInput();this.recoil*=Math.exp(-dt*14);const desired=this.opticalActive()?this.scopeFOV():70;this.camera.fov+=(desired-this.camera.fov)*(1-Math.exp(-dt*18));this.camera.near=(e.altitude||0)>2000?1:.08;this.camera.updateProjectionMatrix();this.updateCamera();this.r.altitudeScene?.update(this,e,time);if(!this.underwater&&(e.altitude||0)<=700){this.r.scene.background=this.sky;this.r.scene.fog=this.flightFog??=new T.FogExp2(0xb9c5c1,.0012);}
   if(d.air&&!d.space&&d.modelKind!=='heli'&&!paused&&document.pointerLockElement===this.r.canvas)this.yaw+=(Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA')))*.8*dt;
   const operator=e.kind==='operator'?this.game.operatorStatus(e.id):null,held=operator&&root.WarOperatorWeapons.byId[operator.slots[operator.activeSlot].weaponId];if(held&&this.view?.metrics?.weaponId!==held.id){this.view?.setWeapon(held.id,this.game.teams[0].faction);this.lastAimTime=0;this.aimResult=null;}
   if(time-this.lastAimTime>.055||!this.aimResult||this.fire){this.aimResult=this.aim();this.lastAimTime=time;}
   this.submit();this.audio??=this.cb.audio?.()||new root.WarCombatAudio({enabled:()=>this.cb.sound(),maxVoices:16});let firePulse=false;this.dischargeKeys??=new Set();const discharges=this.dischargeKeys;for(const fx of this.game.effects)if(['shot','discharge'].includes(fx.type)&&fx.sourceId===e.id&&this.game.time-(fx.firedAt??this.game.time)<.25&&!this.shots.has(fx)){this.shots.add(fx);const key=fx.dischargeId||fx.projectileId||fx;if(!discharges.has(key)){discharges.add(key);if(discharges.size>128)discharges.delete(discharges.values().next().value);this.recoil=Math.min(2,this.recoil+.8);firePulse=true;}this.audio.playShot(fx,e,held);}const weaponAction=operator?.action||root.WarCombatReadiness.snapshot(this.game,e,this.game.vehicleWeapon(e));if(!paused){this.audio.playAction(weaponAction,e);this.audio.playHit(e,this.game.time);}
   const moving=[...this.keys].some(k=>/^(Key[WASD]|Arrow)/.test(k))&&!paused&&document.pointerLockElement===this.r.canvas;const contacts=this.underwater?this.game.entities.filter(t=>this.game.isEnemy(e.team,t.team)&&D.U[t.kind]?.underwater&&this.game.canDetect(e.team,t)).map(t=>({x:t.x-e.x,y:t.y-e.y})):[];this.view?.update({weaponAction,injury:e.components,telemetry:{altitude:this.r.entityHeight(e),speed:e.flightSpeed||0,pitch:e.pitch||0,roll:e.roll||0,contacts},time:this.game.time,dt:paused?0:dt,firePulse,reloading:!!operator?.reloadRemaining,reloadProgress:operator?.reloadRemaining?1-operator.reloadRemaining/operator.reloadTotal:0,ads:this.opticalActive(),moving,motion:this.motion,hp:e.hp/e.maxHp});
   this.el('hp').style.width=(e.hp/e.maxHp*100)+'%';this.el('vitals').textContent=Math.ceil(e.hp)+' / '+Math.ceil(e.maxHp)+'   ·   '+(e.disabled>this.game.time?'EMP 停机':paused?'已暂停':this.componentText(e));
   const vehicleWeapon=this.game.vehicleWeapon(e,this.aimResult?.target),weaponName=vehicleWeapon?.name,weaponReload=vehicleWeapon?.reload||d.reload;
   this.el('reload').style.width=(100*(1-clamp(e.cool/weaponReload,0,1)))+'%';this.el('weapon-state').textContent=(weaponName?weaponName+' · ':'')+(!d.damage?(d.heal?'医疗 / 维修自动运行':d.fireControl?'区域支援自动运行':d.shield?'护盾自动运行':'无武装 · 侦察 / 作业'):e.cool>0?'装填 '+(e.cool*this.game.cooldownMultiplier(e)).toFixed(1)+' s':'武器就绪')+(this.game.vehicleWeapons(e).length?' · [ / ] 切换':'');
   const readiness=e.kind!=='operator'?this.game.combatStatus(e,this.aimResult?.target):null;if(readiness?.weaponId){const reserve=readiness.reserve===Infinity?'∞':readiness.reserve;this.el('weapon-state').textContent=(weaponName||d.name)+' · '+readiness.ammo+' / '+reserve+' · '+this.readinessText(readiness.reason);this.el('reload').style.width=(readiness.reloadRemaining?100*(1-readiness.reloadRemaining/Math.max(.01,e.combat.stations[readiness.weaponId].reloadTotal)):100*(1-clamp(readiness.cooldown/weaponReload,0,1)))+'%';}
   if(e.kind==='carrier'){const s=WarCarrierOperations.status(this.game,e);this.el('weapon-state').textContent+=' · 航空队 '+s.active+'/'+s.capacity+' · 在空 '+s.airborne+(s.waitingForFunds?' · 补机等待资金':'');}
   if(d.air||d.underwater){this.el('layer').textContent=this.underwater?'水下声呐 / 深度控制':d.space?'低轨空间 · 200–1200 km':'飞行姿态 · '+(WarAircraftFlight.labels[e.flight?.phase]||'手动驾驶')+' · R 返航';this.el('flight').querySelector('small').textContent=d.space?'轨道垂直压缩100:1 · 1u对应0.1km':'游戏距离 / u · 速度 / u·s⁻¹';this.el('altitude').textContent=(this.underwater?'深度 ':'高度 ')+(d.space?Math.round(e.altitude*.1)+' km · 压缩映射':Math.round(Math.abs(e.altitude))+' u');this.el('speed').textContent='速度 '+Math.round(e.flightSpeed||0)+' u/s';this.el('attitude').textContent='机体俯仰 '+Math.round((e.pitch||0)*180/Math.PI)+'° · 机体滚转 '+Math.round((e.roll||0)*180/Math.PI)+'°';}
   this.vehicleMenu?.update();this.operatorUI?.update();this.updateOrbitHUD();this.updateCameraHUD();
   this.el('compass').textContent='N  ·  '+String(Math.round(((this.yaw*180/Math.PI)+90+3600)%360)).padStart(3,'0')+'°  ·  E';this.el('economy').textContent='资金 '+(this.game.buffs.has('unlimited')?'∞':Math.floor(this.game.teams[0].money).toLocaleString())+'  ·  生产 '+this.game.teams[0].queue.length;
   const a=this.aimResult,target=a?.target,observed=a?.observedTarget||target;this.el('target').textContent=observed?this.cb.unitName(observed.kind,this.game.teams[observed.team].faction):(this.game.vehicleInteractionHint?.(e.id)||'');this.el('reticle').classList.toggle('enemy',!!target);this.el('reticle').classList.toggle('ads',this.opticalActive());
   const locked=document.pointerLockElement===this.r.canvas;this.el('lock').hidden=this.operatorUI?.open||this.vehicleMenu?.open||(locked&&!paused);if(paused)this.el('lock').textContent='已暂停 · P 继续';else if(!locked)this.el('lock').textContent='点击画面锁定鼠标 · 继续驾驶';
   const hurt=e.hp<this.lastHP;if(hurt){this.hurtUntil=time+.45;this.hurtDirection=e.lastHitFrom?Math.atan2(e.lastHitFrom.y-e.y,e.lastHitFrom.x-e.x)-this.yaw:0;}this.lastHP=e.hp;
   const hurtAmount=Math.max(0,(this.hurtUntil||0)-time)/.45;this.el('damage').style.opacity=String(hurtAmount*.75);this.el('damage').style.transform='rotate('+((this.hurtDirection||0)*180/Math.PI)+'deg)';
   const feedback=this.game.directFeedback;if(feedback?.sourceId===e.id&&feedback.hitAt!==this.lastHitAt){this.lastHitAt=feedback.hitAt;this.hitUntil=time+.18;}this.el('hit').style.opacity=time<this.hitUntil?'1':'0';
  }
  componentText(e){const c=e.components;if(!c)return '系统正常';if(c.state==='downed')return '倒地待救 · 医疗单位可救援';if(c.state==='crashing')return '失能下降 · F 尝试离舱';const labels={burning:'局部起火',flooding:'进水',disabled:'设施失能',dead:'已摧毁'};const parts=Object.entries(c.parts||{}).filter(([,p])=>p.health<.7).map(([k])=>({tracks:'行走系统受损',engine:'动力受损',turret:'炮塔受损',hull:'舰体受损',control:'操纵受损',structure:'结构受损'}[k]||k));return labels[c.state]||parts.join(' / ')||(c.personnel?.limp>.3?'负伤':'系统正常');}
  readinessText(reason){return {ready:'就绪',preparing:'展开 / 抬炮',packing:'撤收',reloading:'换弹',cooldown:'装填',traversing:'炮座转向',arc:'目标超出射界',elevation:'俯仰超出射界',blocked:'炮口遮挡','no-ammo':'缺弹，需补给','turret-damaged':'炮塔故障',downed:'倒地待救',crashing:'失能下降',disabled:'失能'}[reason]||reason;}

  // Clip in homogeneous camera space before dividing by W. A visible part of a
  // segment must survive even when one endpoint is behind the near/far plane.
  projectEffectSegment(start,end){
   const a=new T.Vector4(start.x,start.y,start.z,1).applyMatrix4(this.camera.matrixWorldInverse).applyMatrix4(this.camera.projectionMatrix),b=new T.Vector4(end.x,end.y,end.z,1).applyMatrix4(this.camera.matrixWorldInverse).applyMatrix4(this.camera.projectionMatrix);
   if(![...a.toArray(),...b.toArray()].every(Number.isFinite))return null;
   const magnitude=Math.max(...a.toArray().map(Math.abs),...b.toArray().map(Math.abs));if(!magnitude)return null;
   for(const axis of ['x','y','z','w']){a[axis]/=magnitude;b[axis]/=magnitude;}
   let low=0,high=1;
   for(const axis of ['x','y','z'])for(const sign of [-1,1]){
    const da=a.w+sign*a[axis],db=b.w+sign*b[axis];
    if(da<0&&db<0)return null;
    if(da<0)low=Math.max(low,da/(da-db));else if(db<0)high=Math.min(high,da/(da-db));
    if(low>high)return null;
   }
   const screen=t=>{const w=a.w+(b.w-a.w)*t;if(w<=0)return null;return{x:(1+(a.x+(b.x-a.x)*t)/w)*this.r.width/2,y:(1-(a.y+(b.y-a.y)*t)/w)*this.r.height/2};};
   const head=screen(low),tail=screen(high);return head&&tail?[head,tail]:null;
  }
  drawShotEffect(f){
   if(root.WarWeaponEffects?.drawProjectile(this.r,this.game,f))return;
   if(!(f.max>0)||!Number.isFinite(f.ttl))return;
   const t=clamp(1-f.ttl/f.max,0,1),beam=['laser-beam','orbital-beam'].includes(f.weaponFx);
   if(t<=0||(beam&&t<=.28))return;
   // Shot endpoints are frozen by the simulation when fired. Never derive an
   // in-flight bullet from the current screen centre, camera or gun transform.
   const start=new T.Vector3(f.x,f.sourceHeight??8,f.y),end=new T.Vector3(f.tx,f.targetHeight??5,f.ty),length=start.distanceTo(end);
   if(!Number.isFinite(length)||length<1e-6)return;
   const fireProfile=root.WarWeaponEffects?.profile(f),trail=fireProfile?.trail||(f.rocket?22:12),head=beam?end:start.clone().lerp(end,t),tail=beam?start:start.clone().lerp(end,Math.max(0,t-trail/length)),segment=this.projectEffectSegment(head,tail);
   if(!segment)return;
   const [a,b]=segment,g=this.r.ctx,color=fireProfile?.color||(f.weaponFx==='torpedo'?'#a9dedc':beam?'#b8e4f5':f.weaponFx==='interceptor-burst'?'#c4e8ff':'#ffcf80');
   g.save();g.lineCap='round';g.strokeStyle=color;g.globalAlpha=beam?Math.sin((t-.28)/.72*Math.PI)*.5+.2:.22;g.lineWidth=beam?6:4;
   g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.globalAlpha=beam?.85:.95;g.lineWidth=beam?1.8:1.3;g.strokeStyle='#fff2d8';g.stroke();if(fireProfile?.exhaust){g.strokeStyle='#d2cfc388';g.lineWidth=3;g.globalAlpha=.28;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.fillStyle='#fff1bc';g.globalAlpha=.9;g.beginPath();g.arc(a.x,a.y,2.5,0,7);g.fill();}else if(fireProfile?.wake){g.setLineDash([2,5]);g.lineWidth=4;g.globalAlpha=.3;g.stroke();}g.restore();
  }
  drawOverlay(game,time){
   const r=this.r,g=r.ctx;for(const f of game.effects){if(!game.visibleAt(f.x,f.y)&&f.sourceId!==this.entityId)continue;const t=clamp(1-f.ttl/f.max,0,1);if(['shot','interceptor','decoy','intercepted'].includes(f.type)){this.drawShotEffect(f);}else if(['impact','explosion','nuclear','lance'].includes(f.type)){if(root.WarWeaponEffects?.drawImpact(r,game,f))continue;const p=r.toScreen(f.x,f.y,f.height??4);if(!Number.isFinite(p.x))continue;const distance=Math.max(20,this.eye.distanceTo(new T.Vector3(f.x,f.height??4,f.y))),radius=clamp((f.r||18)*r.height/distance*(.25+t),2,150);const glow=g.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);glow.addColorStop(0,'#fff1c8d9');glow.addColorStop(.12,'#ffc16b99');glow.addColorStop(.38,'#bd6d3044');glow.addColorStop(1,'#3b302000');g.globalAlpha=(1-t)*.8;g.fillStyle=glow;g.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);g.strokeStyle='#ffd696';g.lineWidth=1.2;g.globalAlpha=(1-t)*(1-t);for(let n=0;n<6;n++){const a=n*2.399+(f.x%13),spread=radius*(.15+t*.6),sx=p.x+Math.cos(a)*spread,sy=p.y+Math.sin(a)*spread-t*radius*.25;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx-Math.cos(a)*radius*.09,sy-Math.sin(a)*radius*.09);g.stroke();}g.globalAlpha=1;}}
   if(!this.opticalActive()&&!this.exteriorActive())this.view?.render(this.camera);
  }
 }
 root.WarDirectControl=DirectControl;
})(globalThis);
