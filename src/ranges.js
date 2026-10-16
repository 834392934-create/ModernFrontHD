/* Rendering-independent range hints. Simulation owns every radius and eligibility rule. */
(function(root){
 'use strict';const {B,U}=root.WarData;
 const names={ground:'陆',naval:'海',air:'空',space:'天',structure:'建筑'};
 const fmt=n=>String(Number(n.toFixed(1)));
 const colors={attack:'#f2cd7c',blind:'#ec957e',intercept:'#9cd5ec',repair:'#89d6a4',shield:'#b7a3ed',jam:'#eea3b5',link:'#c5bd89',sight:'#8ac6da'};
 function describe(p){const scopes=p.zones.filter(z=>z.type!=='blind').map(z=>z.label+' '+fmt(z.radius)+(z.domains?.length?' ['+z.domains.map(d=>names[d]).join('/')+']':''));return (p.reason?p.reason+' · 标称范围 · ':'')+scopes.join(' · ')+(p.min?' · 盲区 '+p.min:'')+(p.boosted?' · 雷达 +15%':'')+(p.preview?' · 建成电力 '+p.power:'')+(scopes.length?'（游戏单位）':'');}
 function collect(game,ui,renderer){
  if(ui.demo||ui.rangeMode==='off')return [];
  const records=[],picked=new Map();
  const choose=(e,focus=false)=>{if(!e||e.hp<=0||e.team!==0&&!game.visibleAt(e.x,e.y))return;const p=renderer.toScreen(e.x,e.y);if(p.x< -250||p.x>renderer.width+250||p.y< -250||p.y>renderer.height+250)return;const old=picked.get(e.id);picked.set(e.id,{e,focus:focus||old?.focus});};
  if(ui.rangeMode==='defenses')game.entities.filter(e=>e.team===0&&e.structure&&(B[e.kind].damage||B[e.kind].defense)).slice(0,16).forEach(e=>choose(e));
  [...(ui.selection||[])].slice(0,6).forEach(id=>choose(game.get(id),true));choose(game.get(ui.hover),true);
  for(const {e,focus} of picked.values()){const profile=game.rangeProfile(e);if(profile.zones.length)records.push({id:e.id,kind:e.kind,x:e.x,y:e.y,focus,profile,label:describe(profile)});}
  if(B[ui.mode]){const p=renderer.toWorld(ui.pointer.x,ui.pointer.y),e={kind:ui.mode,team:0,x:p.x,y:p.y,hp:1,disabled:0},profile=game.rangeProfile(e,true);records.push({id:'preview',kind:e.kind,x:p.x,y:p.y,focus:true,preview:true,valid:game.canBuild(0,e.kind,p.x,p.y),profile,label:describe(profile)});}
  return records;
 }
 function draw(ctx,renderer,records){
  ctx.save();ctx.font='11px "Microsoft YaHei"';
  for(const rec of records)for(const zone of rec.profile.zones){
   const enabled=zone.active??rec.profile.active,color=enabled?colors[zone.type]:'#a1a5a6',radius=zone.radius;if(!radius)continue;
   ctx.strokeStyle=rec.preview&&!rec.valid?'#e58f80':color;ctx.lineWidth=rec.focus?1.8:1;ctx.globalAlpha=rec.focus?.9:.3;ctx.setLineDash(zone.type==='blind'?[4,5]:!enabled?[7,6]:zone.type==='link'||zone.type==='intercept'?[9,5]:[]);
   ctx.beginPath();for(let i=0;i<=72;i++){let a=i/72*Math.PI*2,p=renderer.toScreen(rec.x+Math.cos(a)*radius,rec.y+Math.sin(a)*radius);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();
   if(rec.focus){const p=renderer.toScreen(rec.x+radius*.65,rec.y-radius*.76),txt=zone.label+' '+fmt(radius)+(zone.domains?.length?' '+zone.domains.map(d=>names[d]).join('/'):'')+(zone.type==='attack'&&rec.profile.boosted?' +15%':'')+(!enabled?' · '+rec.profile.reason:'');const w=ctx.measureText(txt).width;ctx.globalAlpha=.85;ctx.fillStyle='#14252c';ctx.fillRect(p.x-w/2-5,p.y-15,w+10,20);ctx.globalAlpha=1;ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(txt,p.x,p.y);}
  }
  ctx.restore();
 }
 root.WarRanges={collect,draw,describe,names};
})(globalThis);
