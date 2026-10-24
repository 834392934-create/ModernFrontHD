/* Original fictional game weapons. All dimensions and combat values are game balance,
 * not real weapon specifications. spread is radians; distances are simulation units. */
(function(root){
 'use strict';
 const families=[
  ['pistol','手枪','微光',32,235,.26,15,90,1.45,.018,.038,false,1,0],
  ['smg','冲锋枪','迅雨',19,285,.075,32,224,1.9,.033,.028,true,1,0],
  ['rifle','突击步枪','远岚',33,460,.115,30,180,2.2,.020,.044,true,1,0],
  ['shotgun','霰弹枪','破晓',12,165,.85,8,56,2.7,.095,.12,false,8,0],
  ['lmg','轻机枪','磐石',29,520,.095,80,320,4.0,.030,.052,true,1,0],
  ['marksman','精确射手步枪','巡隼',79,730,.52,16,96,2.65,.008,.075,false,1,0],
  ['sniper','狙击步枪','长夜',165,1050,1.45,5,35,3.15,.003,.14,false,1,0],
  ['launcher','发射器','雷幕',225,620,1.4,1,9,3.65,.025,.18,false,1,75],
  ['grenade','榴弹发射器','震岳',105,340,1.1,1,12,2.8,.025,.105,false,1,48],
 ];
 const variants=[
  ['标准',1,1,1,1,'iron','box','fixed',0x485557],
  ['紧凑',.94,.83,.90,.86,'reflex','short','folding',0x343f46],
  ['巡逻',1.03,1.12,1.10,1,'reflex','box','fixed',0x74745b],
  ['高容',.96,.96,1.04,1.48,'iron','drum','fixed',0x4b5950],
  ['轻量',.91,.96,.83,.88,'reflex','short','skeleton',0x7a7b74],
  ['精确',1.12,1.25,1.23,.84,'scope','box','precision',0x555967],
  ['突击',1.06,.93,.88,1.12,'reflex','box','folding',0x665849],
  ['守望',1.17,1.32,1.35,1,'scope','box','precision',0x3a4d59],
 ];
 const categories=families.map(f=>Object.freeze({id:f[0],name:f[1]})),list=[];
 for(const f of families)for(let i=0;i<variants.length;i++){
  const [category,label,baseName,damage,range,interval,mag,reserve,reload,spread,recoil,automatic,pellets,splash]=f;
  const [suffix,power,reach,pace,capacity,optic,magazineStyle,stockStyle,color]=variants[i];
  const domains=['ground','naval','air','space'],seed=[...category].reduce((n,c)=>((n*31+c.charCodeAt(0))>>>0),17),mixed=domains.slice().sort((a,b)=>(((seed^(domains.indexOf(a)*2654435761))>>>0)-((seed^(domains.indexOf(b)*2654435761))>>>0))).slice(0,2+(seed%2)),targets=Object.freeze(['personnel',...(i<4?[domains[i]]:i===4?['ground','naval']:i===5?['air','space']:i===6?mixed:domains)]);
  const magazine=['launcher','grenade'].includes(category)?1:Math.max(2,Math.round(mag*capacity));
  const profile=Object.freeze({family:category,variant:i,barrelLength:category==='pistol'?.22:category==='smg'?.43:category==='shotgun'?.83:category==='sniper'?1.1:category==='marksman'?.95:category==='launcher'?.80:category==='lmg'?.9:.72,lengthScale:.87+i*.037,optic:category==='sniper'?'scope':optic,magazineStyle,stockStyle});
  const reloadSeconds=+(reload*(magazineStyle==='drum'?1.15:1)*(i===4?.9:1)).toFixed(2);
  // Mechanism references inform the visible action, never certify these fictional props as real models.
  const mechanism=category==='lmg'?'open-bolt':category==='grenade'?'break-action':category==='launcher'?'rocket-tube':category==='shotgun'&&i!==3&&i!==6?'pump':category==='sniper'&&i!==6?'bolt-action':'closed-bolt';
  const reloadStyle=category==='lmg'?'belt':category==='shotgun'&&i!==3?'shell':['grenade','launcher'].includes(category)?'single':'magazine';
  const fireModes=Object.freeze(category==='rifle'?['auto','semi','burst']:category==='smg'?['auto','semi']:category==='lmg'?['auto']:['semi']);
  const reference=category==='lmg'?'fn-m249':category==='grenade'?'army-m320':category==='shotgun'?(i===3?'original-magazine-shotgun':i===6?'benelli-m4':'mossberg-590'):category==='sniper'?(i===6?'army-m107':'barrett-mrad'):category==='rifle'?'army-m4a1':'original-category';
  list.push(Object.freeze({id:category+'_'+String(i+1).padStart(2,'0'),name:baseName+'-'+String(i+1).padStart(2,'0')+' '+suffix,category,damage:Math.round(damage*power),range:Math.round(range*reach),fireInterval:+(interval*pace).toFixed(3),magazine,reserve:Math.round(reserve*capacity),reloadSeconds,emptyReloadSeconds:+(reloadSeconds+(reloadStyle==='single'?0:mechanism==='open-bolt'?.7:.55)).toFixed(2),mechanism,reloadStyle,fireModes,defaultFireMode:fireModes[0],mechanismReference:reference,burstCount:3,spread:+(spread/(i===5||i===7?1.5:1)).toFixed(4),recoil:+(recoil*power).toFixed(3),automatic,pellets,targets,splash:splash?Math.round(splash*(.9+i*.025)):0,color,profile,description:'原创'+label+' · '+suffix+'配置；动作节奏为游戏设定。'+(targets.includes('air')||targets.includes('space')?'对空/轨道能力为原创科幻游戏设定，非真实轻武器能力。':'伤害、射程与散布为游戏平衡数值。')}));
 }
 function reloadPlan(w,ammo,reserve,scale=1){
  const empty=ammo===0,steps=[];scale=Number.isFinite(scale)?Math.max(.15,Math.min(2,scale)):1;
  const add=(id,duration,transfer=null)=>steps.push({id,duration:Math.max(.02,duration*scale),transfer});
  if(w.reloadStyle==='shell'){add('prepare',.20);for(let n=0;n<Math.min(w.magazine-ammo,reserve);n++)add('insert-shell',.5,'one');add(empty?'chamber':'ready',empty?.55:.22);}
  else{const total=empty?w.emptyReloadSeconds:w.reloadSeconds,phases=w.reloadStyle==='belt'?[['cover-open',.18],['belt-remove',.17],['belt-seat',.3],['cover-close',.2],[empty?'charge':'ready',.15]]:w.reloadStyle==='single'?[['breech-open',.22],['round-in',.42],['breech-close',.36]]:[['mag-out',.25],['mag-in',.45],[empty?'chamber':'ready',.3]];for(const [id,fraction]of phases)add(id,total*fraction);steps[steps.length-1].transfer='all';}
  return steps;
 }
 root.WarOperatorWeapons=Object.freeze({list:Object.freeze(list),byId:Object.freeze(Object.assign(Object.create(null),Object.fromEntries(list.map(w=>[w.id,w])))),categories:Object.freeze(categories),reloadPlan,targetLabels:Object.freeze({personnel:'人员',ground:'陆地 / 建筑',naval:'水面 / 水下',air:'空中',space:'太空'}),allTargetPersonnel:true,defaultPrimary:'rifle_01',defaultSecondary:'pistol_01'});
})(globalThis);
