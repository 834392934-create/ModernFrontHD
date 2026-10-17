/* Player possession roster. Lists only live owned entities; it never spawns equipment. */
(function(root){
 'use strict';
 const D=root.WarData,escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 class PlayerMode {
  constructor(d){
   this.direct=d;this.open=false;this.filter='';this.group='all';
   const panel=document.createElement('section');panel.id='vehicle-menu';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','选择驾驶单位');
   panel.innerHTML='<div class="vehicle-shell"><header><div><small>PLAYER CONTROL</small><h2>选择驾驶单位</h2></div><button id="vehicle-close">关闭 · Esc / J</button></header><p id="vehicle-description"></p><div class="vehicle-filters"><input id="vehicle-search" placeholder="搜索名称 / 职责" aria-label="搜索可驾驶单位"><select id="vehicle-group" aria-label="筛选军种"><option value="all">全部单位</option><option value="ground">陆军</option><option value="naval">海军 / 水下</option><option value="air">空军</option><option value="space">太空</option></select></div><div id="vehicle-list"></div><footer id="vehicle-count"></footer></div>';
   document.body.append(panel);this.panel=panel;
   panel.querySelector('#vehicle-close').onclick=()=>this.hide();
   panel.querySelector('#vehicle-search').oninput=e=>{this.filter=e.target.value;this.render();};
   panel.querySelector('#vehicle-group').onchange=e=>{this.group=e.target.value;this.render();};
   panel.addEventListener('click',e=>{const b=e.target.closest('[data-player-unit]');if(!b)return;const id=Number(b.dataset.playerUnit),game=d.cb.game(),unit=game?.get(id);if(!unit||unit.team!==0||unit.structure||unit.hp<=0){this.render();return;}this.hide(false);if(d.entityId===id&&d.active){d.lock();return;}d.enter(id);});
   const button=document.createElement('button');button.id='direct-switch';button.textContent='换乘载具 · J';button.onclick=()=>this.show();d.hud.querySelector('header').insertBefore(button,d.el('exit'));
   const status=document.createElement('span');status.id='direct-protection';d.hud.querySelector('.direct-orders').append(status);
  }
  show(){if(!this.direct.cb.canEnter())return;this.open=true;this.direct.clearInput();if(document.pointerLockElement)document.exitPointerLock();this.panel.hidden=false;this.render();this.panel.querySelector('#vehicle-list').scrollTop=0;this.panel.querySelector('#vehicle-search').focus();clearInterval(this.timer);this.timer=setInterval(()=>{if(!this.direct.cb.game()||this.direct.cb.game().result)this.hide(false);else this.render();},750);}
  hide(relock=true){this.open=false;this.panel.hidden=true;clearInterval(this.timer);this.direct.clearInput();if(relock&&this.direct.active)this.direct.lock();}
  render(){const d=this.direct,g=d.cb.game();if(!g)return;this.panel.querySelector('#vehicle-description').textContent=d.active?'选择当前存活的己方单位。换乘期间 AI 继续生产与防守；当前载具停止驾驶输入。':'选择当前存活的己方单位进入驾驶；接管后 AI 自动建造、生产和安排护卫。';const q=this.filter.trim().toLowerCase(),all=g.entities.filter(e=>e.team===0&&!e.structure&&e.hp>0&&D.U[e.kind]);const visible=all.filter(e=>(this.group==='all'||D.U[e.kind].unitGroup===this.group)&&(!q||(d.cb.unitName(e.kind,g.teams[0].faction)+' '+D.U[e.kind].role).toLowerCase().includes(q)));
   this.panel.querySelector('#vehicle-list').innerHTML=visible.map(e=>{const def=D.U[e.kind],name=d.cb.unitName(e.kind,g.teams[0].faction),hp=Math.max(0,Math.min(100,Math.ceil(e.hp/e.maxHp*100)));return '<button data-player-unit="'+e.id+'"'+(e.id===d.entityId&&d.active?' class="current"':'')+'><img alt="" src="assets/portraits/'+e.kind+'_'+g.teams[0].faction+'.png"><span><strong>'+escape(name)+'</strong><small>'+escape(D.UNIT_GROUPS[def.unitGroup]?.name||'后勤')+' · #'+e.id+' · 耐久 '+hp+'%</small><small>'+escape(def.role||'')+'</small></span><b>'+(e.id===d.entityId&&d.active?'当前驾驶':'驾驶')+'</b></button>';}).join('')||'<p class="vehicle-empty">没有符合条件的存活己方单位；AI 新生产的单位会自动加入列表。</p>';
   this.panel.querySelector('#vehicle-count').textContent='可驾驶 '+visible.length+' / '+all.length+' · Esc 关闭列表 · 驾驶中 E 返回总指挥 · 新生产单位自动列出';
  }
  update(){const s=this.direct.game?.protectionStatus;const el=this.direct.hud.querySelector('#direct-protection');if(!s){el.textContent='护卫调度准备中';return;}el.textContent=s.summary||'AI 优先保护驾驶员与基地';}
 }
 root.WarPlayerMode=PlayerMode;
})(globalThis);
