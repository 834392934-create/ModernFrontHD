const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

// Small DOM fixture exercises the real roster/minimap controller without a browser or GPU.
function fixture(){
 const listeners={},intervals=new Map();let sequence=0;const document={pointerLockElement:null,exitPointerLock(){this.pointerLockElement=null;}};
 class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.nodes=new Map();this.handlers={};this.hidden=false;this.dataset={};this.isConnected=true;this._html='';}
  setAttribute(k,v){this[k]=v;}
  append(...items){for(const el of items){el.parent=this;this.children.push(el);}}
  insertBefore(el){this.append(el);}
  addEventListener(k,fn){this.handlers[k]=fn;}
  contains(el){return!!el&&(el===this||this.children.some(c=>c.contains(el)));}
  focus(){document.activeElement=this;}
  blur(){if(document.activeElement===this)document.activeElement=document.body;}
  closest(selector){return selector==='[data-player-unit]'&&this.dataset.playerUnit?this:null;}
  querySelector(s){if(s.startsWith('[data-player-unit='))return this.children.find(c=>c.dataset.playerUnit===s.match(/"(\d+)"/)[1])||null;if(!this.nodes.has(s)){const el=new Element(s==='canvas'?'canvas':s.includes('search')?'input':s.includes('group')?'select':s.includes('close')?'button':'div');el.id=s.startsWith('#')?s.slice(1):'';this.nodes.set(s,el);this.append(el);}return this.nodes.get(s);}
  querySelectorAll(){return this.children.flatMap(c=>['BUTTON','INPUT','SELECT'].includes(c.tagName)?[c]:c.querySelectorAll());}
  set innerHTML(value){this._html=value;if(this.id!=='vehicle-list')return;for(const c of this.children)c.isConnected=false;if(this.contains(document.activeElement))document.activeElement=document.body;this.children=[];for(const m of value.matchAll(/data-player-unit="(\d+)"/g)){const b=new Element('button');b.dataset.playerUnit=m[1];this.append(b);}}
  get innerHTML(){return this._html;}
 }
 document.body=new Element('body');document.activeElement=document.body;document.createElement=tag=>new Element(tag);
 const game={entities:[{id:1,team:0,kind:'tank',hp:100,maxHp:100},{id:2,team:0,kind:'tank',hp:100,maxHp:100}],teams:[{faction:'chn'}]};
 let currentGame=game,clears=0,strategyClears=0,locks=0;const draws=[];
 const d={active:false,entityId:1,hud:new Element(),el(){return new Element('button');},r:{drawMinimap(g,c){draws.push({game:g,canvas:c});}},cb:{game:()=>currentGame,canEnter:()=>true,unitName:()=>'<Tank>',clearStrategyInput(){strategyClears++;}},clearInput(){clears++;},lock(){locks++;}};
 const context={WarData:{U:{tank:{unitGroup:'ground',role:'测试'}},UNIT_GROUPS:{ground:{name:'陆军'}}},document,addEventListener(n,f){listeners[n]=f;},setInterval(f){intervals.set(++sequence,f);return sequence;},clearInterval(id){intervals.delete(id);}};context.globalThis=context;vm.runInNewContext(fs.readFileSync(require.resolve('../src/player-mode.js'),'utf8'),context);const menu=new context.WarPlayerMode(d);
 return{menu,d,game,draws,document,Element,listeners,intervals,get clears(){return clears;},get strategyClears(){return strategyClears;},get locks(){return locks;},setGame(g){currentGame=g;}};
}

test('FPS minimap uses its independent canvas, refreshes at 10Hz, and follows possession/game changes',()=>{
 const f=fixture();f.menu.drawMinimap(0);assert.equal(f.draws.length,0);assert.equal(f.menu.minimapPanel.hidden,true);
 f.d.active=true;f.menu.drawMinimap(1);assert.equal(f.menu.minimapPanel.hidden,false);assert.equal(f.draws.length,1);assert.equal(f.draws[0].game,f.game);assert.equal(f.draws[0].canvas,f.menu.minimap);
 f.menu.drawMinimap(1.02);assert.equal(f.draws.length,1);f.menu.drawMinimap(1.11);assert.equal(f.draws.length,2);
 f.d.entityId=2;f.menu.drawMinimap(1.12);assert.equal(f.draws.length,3);
 const restored={...f.game};f.setGame(restored);f.menu.drawMinimap(1.13);assert.equal(f.draws.at(-1).game,restored);
 f.d.active=false;f.menu.drawMinimap(1.14);assert.equal(f.menu.minimapPanel.hidden,true);f.d.active=true;f.menu.drawMinimap(1.15);assert.equal(f.draws.length,5);
 assert.deepEqual(f.menu.minimap.handlers,{});
});

test('opening roster clears RTS and driver input, unlocks pointer and focuses search',()=>{
 const f=fixture();f.document.pointerLockElement={};f.menu.show();assert.equal(f.strategyClears,1);assert.equal(f.clears,1);assert.equal(f.document.pointerLockElement,null);assert.equal(f.document.activeElement.id,'vehicle-search');assert.equal(f.intervals.size,1);
 f.menu.show();assert.equal(f.intervals.size,1);
});

test('closing roster restores previous focus instead of leaving a hidden input swallowing shortcuts',()=>{
 const f=fixture(),button=new f.Element('button');f.document.body.append(button);button.focus();f.menu.show();f.menu.hide();assert.equal(f.document.activeElement,button);assert.equal(f.intervals.size,0);assert.equal(f.menu.open,false);assert.equal(f.menu.panel.hidden,true);assert.equal(f.strategyClears,2);
});

test('switching unit/returning to menu clears hidden search focus without relocking',()=>{
 const f=fixture();f.d.active=true;f.menu.show();f.menu.hide(false);assert.equal(f.document.activeElement,f.document.body);assert.equal(f.locks,0);
});

test('live roster refresh preserves keyboard card focus, and a removed card returns focus to search',()=>{
 const f=fixture();f.menu.show();const list=f.menu.panel.querySelector('#vehicle-list');list.children[1].focus();f.menu.render();assert.equal(f.document.activeElement.dataset.playerUnit,'2');assert.equal(f.document.activeElement.isConnected,true);
 f.game.entities[1].hp=0;f.menu.render();assert.equal(f.document.activeElement.id,'vehicle-search');assert.match(list.innerHTML,/&lt;Tank&gt;/);
});

test('Tab remains inside the roster dialog and cannot focus RTS commands behind it',()=>{
 const f=fixture();f.menu.show();const items=f.menu.panel.querySelectorAll();items.at(-1).focus();let prevented=false,stopped=false;f.listeners.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});assert.equal(f.document.activeElement,items[0]);assert.equal(prevented,true);assert.equal(stopped,true);
 f.listeners.keydown({key:'Tab',shiftKey:true,preventDefault(){},stopImmediatePropagation(){}});assert.equal(f.document.activeElement,items.at(-1));
});

test('RTS J consumes its default text action before focusing vehicle search',()=>{
 const f=fixture(),source=fs.readFileSync(require.resolve('../src/app.js'),'utf8');
 // Execute the registered production RTS listener, rather than reimplementing its branch.
 const begin=source.indexOf('  addEventListener("keydown", (e) => {'),end=source.indexOf('  addEventListener("keyup",',begin);assert.ok(begin>=0&&end>begin);
 let handler,prevented=false,stopped=false;const input=f.menu.panel.querySelector('#vehicle-search');input.value='';
 vm.runInNewContext(source.slice(begin,end),{addEventListener(type,fn){assert.equal(type,'keydown');handler=fn;},game:{},$:()=>({hidden:true}),direct:{vehicleMenu:{show(){assert.equal(prevented,true,'default action must be cancelled before focus moves');f.menu.show();}}}});
 handler({target:{tagName:'DIV'},key:'j',repeat:false,preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
 // The browser inserts an unconsumed printable key into the newly focused input.
 if(!prevented&&f.document.activeElement===input)input.value+='j';
 assert.equal(stopped,true);assert.equal(f.document.activeElement,input);assert.equal(input.value,'');assert.equal(f.menu.filter,'');assert.equal(f.menu.open,true);
});

function canvasFixture(){
 const source=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),begin=source.indexOf('  const canvas = $("#battle");'),end=source.indexOf('  $("#minimap").addEventListener',begin);assert.ok(begin>=0&&end>begin);
 const handlers={},calls={capture:0,pan:0,zoom:0,command:0};let captureError=null;
 const canvas={addEventListener(name,fn){handlers[name]=fn;},setPointerCapture(){calls.capture++;if(captureError)throw captureError;}};
 const modal={hidden:true},document={pointerLockElement:null};const own={id:1,team:0,kind:'tank',x:20,y:20},game={entities:[own,{id:2,team:1,kind:'tank',x:25,y:25}],command(){calls.command++;return{rejected:[]};}};
 const context={document,game,paused:false,direct:{active:false,vehicleMenu:{open:false}},pointer:{x:0,y:0},drag:null,middle:null,selection:new Set(),mode:null,B:{},$:s=>s==='#battle'?canvas:modal,r:{camera:{zoom:1},toWorld:(x,y)=>({x,y}),toScreen:(x,y)=>({x,y}),pan(){calls.pan++;},zoomAt(){calls.zoom++;}},selectable:()=>own,enemyAt:()=>null,updateHUD(){},beep(){},toast(){},setMode(){},WarCommandFeedback:{format(){return'';}}};vm.createContext(context);vm.runInContext(source.slice(begin,end),context);
 const event=extra=>({button:0,pointerId:9,clientX:10,clientY:10,shiftKey:false,deltaY:10,preventDefault(){},...extra});
 return{context,canvas,modal,document,calls,emit(name,extra){handlers[name](event(extra));},failCapture(name){captureError=Object.assign(new Error(name),{name});}};
}

test('paused FPS pointer events never reach RTS capture, drag, commands, pan, selection or zoom',()=>{
 const f=canvasFixture();f.context.direct.active=true;f.context.paused=true;f.document.pointerLockElement=f.canvas;
 for(const button of [0,1,2])f.emit('pointerdown',{button});f.emit('pointermove',{clientX:40});f.emit('pointerup',{clientX:50,clientY:50});f.emit('dblclick');f.emit('wheel');
 assert.deepEqual(f.calls,{capture:0,pan:0,zoom:0,command:0});assert.equal(f.context.drag,null);assert.equal(f.context.middle,null);assert.equal(f.context.selection.size,0);assert.equal(f.context.pointer.x,0);
});

test('roster/modal and pending pointer unlock also block every RTS canvas interaction',()=>{
 for(const mode of ['roster','modal','unlock']){const f=canvasFixture();if(mode==='roster')f.context.direct.vehicleMenu.open=true;else if(mode==='modal')f.modal.hidden=false;else f.document.pointerLockElement=f.canvas;
  for(const button of [0,1,2])f.emit('pointerdown',{button});f.emit('pointermove',{clientX:40});f.emit('pointerup',{clientX:50});f.emit('dblclick');f.emit('wheel');assert.deepEqual(f.calls,{capture:0,pan:0,zoom:0,command:0},mode);assert.equal(f.context.selection.size,0,mode);
 }
});

test('ordinary RTS box selection, middle pan and zoom still work, including inspection while paused',()=>{
 const f=canvasFixture();f.context.paused=true;f.emit('pointerdown');assert.equal(f.calls.capture,1);assert.ok(f.context.drag);f.emit('pointermove',{clientX:50,clientY:50});f.emit('pointerup',{clientX:50,clientY:50});assert.deepEqual([...f.context.selection],[1]);assert.equal(f.context.drag,null);
 f.emit('pointerdown',{button:1});f.emit('pointermove',{clientX:20});assert.equal(f.calls.pan,1);f.emit('pointerup',{button:1});assert.equal(f.context.middle,null);f.emit('wheel');assert.equal(f.calls.zoom,1);
});

test('expired pointer capture cancels gesture but unrelated exceptions remain visible; pointercancel always cleans up',()=>{
 for(const button of [0,1]){const f=canvasFixture();f.failCapture('NotFoundError');assert.doesNotThrow(()=>f.emit('pointerdown',{button}));assert.equal(f.context.drag,null);assert.equal(f.context.middle,null);}
 const f=canvasFixture();f.failCapture('TypeError');assert.throws(()=>f.emit('pointerdown'),{name:'TypeError'});
 for(const event of ['pointercancel','lostpointercapture']){f.context.drag={x:10,y:10};f.context.middle={x:20,y:20};f.context.direct.active=true;f.emit(event);assert.equal(f.context.drag,null);assert.equal(f.context.middle,null);}
});
