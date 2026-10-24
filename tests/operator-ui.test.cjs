const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function fixture(){
 const listeners={};const document={pointerLockElement:{},exitPointerLock(){this.pointerLockElement=null;}};
 const keyName=s=>s.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
 class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attrs={};this.hidden=false;this.disabled=false;this.isConnected=true;this.value='';this.handlers={};this.classes=new Set();this.classList={toggle:(c,v)=>v?this.classes.add(c):this.classes.delete(c)};}
  append(...items){for(const el of items){el.parent=this;el.parentElement=this;this.children.push(el);}}
  insertBefore(el){this.append(el);}
  setAttribute(k,v){this.attrs[k]=String(v);}
  addEventListener(type,fn){this.handlers[type]=fn;}
  contains(el){return!!el&&(el===this||this.children.some(c=>c.contains(el)));}
  focus(){document.activeElement=this;}
  blur(){if(document.activeElement===this)document.activeElement=document.body;}
  closest(selector){const m=selector.match(/^\[(data-[\w-]+)\]$/);return m&&this.dataset[keyName(m[1])]!==undefined?this:this.parent?.closest(selector)||null;}
  all(){return this.children.flatMap(c=>[c,...c.all()]);}
  querySelector(s){let hit;if(s[0]==='#')hit=this.all().find(c=>c.id===s.slice(1));else if(s[0]==='['){const m=s.match(/^\[(data-[\w-]+)="([^"]*)"\]$/);return this.all().find(c=>c.dataset[keyName(m[1])]===m[2])||null;}else hit=this.children.find(c=>c.selector===s);if(hit)return hit;const el=new Element(s==='header'?'header':'div');el.selector=s;if(s[0]==='#')el.id=s.slice(1);this.append(el);return el;}
  querySelectorAll(){return this.all().filter(c=>['BUTTON','INPUT','SELECT'].includes(c.tagName)&&!c.disabled);}
  set innerHTML(html){this._html=html;for(const c of this.children)c.isConnected=false;if(this.contains(document.activeElement))document.activeElement=document.body;this.children=[];for(const m of html.matchAll(/<([a-z]+)\b([^>]*)>/g)){const id=m[2].match(/\bid="([^"]*)"/),attrs=[...m[2].matchAll(/\b(data-[\w-]+)="([^"]*)"/g)];if(!id&&!attrs.length)continue;const el=new Element(m[1]);if(id)el.id=id[1];for(const a of attrs)el.dataset[keyName(a[1])]=a[2];this.append(el);}}
  get innerHTML(){return this._html||'';}
 }
 document.body=new Element('body');document.activeElement=document.body;document.createElement=tag=>new Element(tag);
 const c={document,addEventListener(type,fn){(listeners[type]??=[]).push(fn);},Math};c.globalThis=c;vm.createContext(c);for(const file of ['operator-weapons.js','operator-ui.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),c);
 let state={slots:[{weaponId:'rifle_01',ammo:13,reserve:42},{weaponId:'pistol_01',ammo:5,reserve:20}],activeSlot:0,reloadRemaining:0,reloadTotal:2,canResupply:false},unit={id:7,kind:'operator',team:0,hp:180,maxHp:200},currentGame,eligible=true,equipOK=true,clearCalls=0,locks=0;const equipCalls=[],supplyCalls=[];
 const game={teams:[{faction:'chn'}],get:id=>id===unit.id?unit:null,operatorStatus:()=>state,operatorEquip(id,slot,weaponId){equipCalls.push({id,slot,weaponId});if(!equipOK)return false;state.slots[slot]={...state.slots[slot],weaponId};return true;},operatorResupply(id){supplyCalls.push(id);return state.canResupply;}};currentGame=game;
 const d={active:true,entityId:7,hud:new Element(),el:()=>new Element('button'),clearInput(){clearCalls++;},lock(){locks++;},vehicleMenu:{open:false,hide(){this.open=false;}},cb:{game:()=>currentGame,canEnter:()=>eligible,clearStrategyInput(){},unitName:()=>'<前线行动员>'}};
 const ui=new c.WarOperatorUI(d);d.operatorUI=ui;
 const event=(extra={})=>({code:'KeyB',key:'b',repeat:false,target:{tagName:'DIV'},prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},stopPropagation(){this.stopped=true;},...extra});
 return{ui,d,unit,game,state,document,Element,equipCalls,supplyCalls,weapons:c.WarOperatorWeapons,event,emit(e,type='keydown'){for(const fn of listeners[type]||[])fn(e);},click(target){ui.panel.handlers.click({target});},get clearCalls(){return clearCalls;},get locks(){return locks;},denyEquip(){equipOK=false;},block(){eligible=false;},setGame(g){currentGame=g;}};
}

test('B opens only a live owned operator, consumes the opener, clears input and unlocks without pausing the world',()=>{
 const f=fixture(),e=f.event();f.emit(e);assert.equal(f.ui.open,true);assert.equal(e.prevented,true);assert.equal(e.stopped,true);assert.equal(f.document.pointerLockElement,null);assert.equal(f.document.activeElement.id,'operator-search');assert.ok(f.clearCalls>0);assert.equal(f.ui.el('count').textContent,'72 / 72 款武器');
 for(const change of [x=>x.unit.kind='tank',x=>x.unit.hp=0,x=>x.unit.team=1,x=>x.d.active=false,x=>x.block()]){const x=fixture();change(x);x.emit(x.event());assert.equal(x.ui.open,false);}
});
test('text search retains printable defaults and cannot leak R/1/B into combat; Escape closes and restores focus/lock',()=>{
 const f=fixture(),button=new f.Element('button');f.document.body.append(button);button.focus();f.ui.show();const input=f.ui.el('search');for(const code of ['KeyR','Digit1','KeyB']){const e=f.event({code,target:input});f.emit(e);assert.equal(e.stopped,true);assert.equal(e.prevented,false);assert.equal(f.ui.open,true);}f.emit(f.event({code:'Escape',key:'Escape',target:input}));assert.equal(f.ui.open,false);assert.equal(f.document.activeElement,button);assert.equal(f.locks,1);
});
test('category, search and target-domain filters select actual weapon subsets; every card displays its target domains',()=>{
 const f=fixture();f.ui.show();f.click(f.ui.el('categories').querySelector('[data-operator-category="sniper"]'));assert.equal(f.ui.visibleWeapons().length,8);f.ui.el('target').onchange({target:{value:'space'}});assert.ok(f.ui.visibleWeapons().every(w=>w.category==='sniper'&&w.targets.includes('space')));assert.match(f.ui.el('weapons').innerHTML,/太空/);f.ui.el('search').oninput({target:{value:'绝无此名称'}});assert.equal(f.ui.visibleWeapons().length,0);assert.equal(f.ui.el('equip').disabled,true);assert.equal(f.ui.el('random').disabled,true);assert.match(f.ui.el('weapons').innerHTML,/没有符合/);
});
test('real slot and weapon click handlers apply the chosen weapon through simulation, not UI-only state',()=>{
 const f=fixture();f.ui.show();f.click(f.ui.panel.querySelector('[data-operator-slot="1"]'));assert.equal(f.ui.slot,1);f.click(f.ui.el('weapons').querySelector('[data-operator-weapon="launcher_08"]'));assert.equal(f.ui.selected,'launcher_08');f.ui.el('equip').onclick();assert.deepEqual(f.equipCalls,[{id:7,slot:1,weaponId:'launcher_08'}]);assert.equal(f.state.slots[1].weaponId,'launcher_08');assert.equal(f.state.slots[1].ammo,5);assert.equal(f.state.slots[1].reserve,20);assert.match(f.ui.el('message').textContent,/副武器/);assert.match(f.ui.el('details').innerHTML,/车辆 \/ 基地.*舰艇 \/ 水下.*空中.*太空/);
});
test('failed equip is visible and does not pretend ammunition or slot contents changed',()=>{
 const f=fixture();f.ui.show();f.denyEquip();assert.equal(f.ui.equip('sniper_08'),false);assert.equal(f.state.slots[0].weaponId,'rifle_01');assert.equal(f.state.slots[0].ammo,13);assert.match(f.ui.el('message').textContent,/未成功/);
});
test('random equip selects only visible candidates and empty filters never call simulation',()=>{
 const f=fixture();f.ui.show();f.ui.category='pistol';f.ui.target='space';f.ui.renderCatalog();const ids=f.ui.visibleWeapons().map(w=>w.id);assert.equal(f.ui.randomEquip(),true);assert.ok(ids.includes(f.equipCalls.at(-1).weaponId));assert.equal(f.ui.selected,f.equipCalls.at(-1).weaponId);f.ui.filter='nothing found';f.ui.renderCatalog();const count=f.equipCalls.length;assert.equal(f.ui.randomEquip(),false);assert.equal(f.equipCalls.length,count);
});
test('HUD reads authoritative ammo, active slot and reload progress; base resupply delegates cost to simulation',()=>{
 const f=fixture();f.ui.update();assert.equal(f.ui.hudEl('magazine').textContent,'13');assert.match(f.ui.hudEl('reserve').textContent,/42/);f.state.activeSlot=1;f.state.reloadRemaining=1;f.ui.update();assert.equal(f.ui.hudEl('magazine').textContent,'5');assert.equal(f.ui.hudEl('progress').style.width,'50%');assert.match(f.ui.hudEl('state').textContent,/1.0 秒/);f.ui.show();assert.equal(f.ui.el('resupply').disabled,true);f.state.canResupply=true;f.ui.update();assert.equal(f.ui.el('resupply').disabled,false);f.ui.el('resupply').onclick();assert.deepEqual(f.supplyCalls,[7]);assert.match(f.ui.el('message').textContent,/花费 100/);
});
test('mode control uses the real simulation hook and HUD distinguishes empty/phase/finite chamber with unlimited reserve',()=>{const f=fixture();f.state.fireModes=['auto','semi','burst'];f.state.fireMode='auto';let calls=0;f.game.operatorCycleFireMode=id=>{assert.equal(id,7);calls++;f.state.fireMode='semi';return true;};f.ui.show();f.ui.modeButton.onclick();assert.equal(calls,1);assert.match(f.ui.modeButton.textContent,/半自动/);f.state.unlimitedAmmo=true;f.state.quickReload=true;f.state.reloadRemaining=.3;f.state.reloadTotal=.5;f.state.action={reloadKind:'empty',phase:'chamber'};f.ui.update();assert.equal(f.ui.hudEl('magazine').textContent,'13');assert.match(f.ui.hudEl('reserve').textContent,/∞/);assert.match(f.ui.hudEl('state').textContent,/空仓装填.*恢复待发.*快速装填/);});
test('death, possession change, game replacement and external modal close armory without relocking',()=>{
 for(const change of [f=>f.unit.hp=0,f=>f.d.entityId=99,f=>f.setGame({...f.game}),f=>f.block()]){const f=fixture();f.ui.show();change(f);f.ui.update();assert.equal(f.ui.open,false);assert.equal(f.locks,0);assert.equal(f.document.activeElement,f.document.body);}
});
test('Tab cycles only enabled dialog controls and periodic status updates preserve search/card focus',()=>{
 const f=fixture();f.ui.show();const search=f.ui.el('search');f.ui.update();assert.equal(f.document.activeElement,search);const controls=f.ui.panel.querySelectorAll();controls.at(-1).focus();const e=f.event({code:'Tab',key:'Tab'});f.emit(e);assert.equal(f.document.activeElement,controls[0]);assert.equal(e.prevented,true);assert.equal(e.stopped,true);
});
test('armory cards and details use current simulation range overrides, minimum and evidence labels',()=>{
 const f=fixture(),calls=[];
 f.game.weaponRangeProfile=(e,w)=>{calls.push([e.id,w.id]);return{range:w.category==='pistol'?10:100,min:2,reference:{status:'inferred',record:{note:'公开参照不等于原创枪型认证。',sourceUrl:'https://example.test/spec'}}};};
 f.game.formatRangeDistance=v=>v*5+' m';f.game.rangeReferenceLabel=()=> '同类估算';
 f.ui.show();f.ui.selected='pistol_01';f.ui.renderCatalog();
 assert.match(f.ui.el('weapons').innerHTML,/射程 10 m – 50 m · 同类估算/);
 assert.match(f.ui.el('details').innerHTML,/10 m – 50 m/);
 assert.match(f.ui.el('details').innerHTML,/最小射程内不能攻击/);
 assert.match(f.ui.el('details').innerHTML,/不是这把原创枪的实测/);
 assert.match(f.ui.el('details').innerHTML,/href="https:\/\/example.test\/spec"/);
 assert.ok(calls.some(([id,w])=>id===7&&w==='pistol_01'));
 f.game.weaponRangeProfile=()=>({range:235,min:0,reference:null});f.game.formatRangeDistance=v=>v+' u';f.game.rangeReferenceLabel=()=> '';
 f.ui.renderCatalog();assert.match(f.ui.el('details').innerHTML,/235 u/);assert.match(f.ui.el('details').innerHTML,/游戏平衡/);
});
