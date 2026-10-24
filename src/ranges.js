/* Rendering-independent range hints. Simulation owns every radius and eligibility rule. */
(function(root){
 'use strict';const {B,U}=root.WarData;
 const names={ground:'陆',naval:'海',air:'空',space:'天',underwater:'水下',structure:'建筑'};
 const fmt=n=>String(Number(n.toFixed(1)));
 const colors={attack:'#f2cd7c',blind:'#ec957e',intercept:'#9cd5ec',repair:'#89d6a4',shield:'#b7a3ed',sonar:'#79c9bc',jam:'#eea3b5',link:'#c5bd89',sight:'#8ac6da',radar:'#80c6ff',orbital:'#b8a1ef',space:'#d8b9fa'};
 function distance(game,zone){return (zone.type==='attack'||zone.type==='blind'||zone.unit==='metric')&&game?.formatRangeDistance?game.formatRangeDistance(zone.radius):fmt(zone.radius)+' u';}
 function evidence(zone,game){const label=zone.unit==='metric'&&game?.rangeReferenceLabel?.(zone.reference);return label?'（'+label+'）':'';}
 function describe(p,game){const scopes=p.zones.filter(z=>z.type!=='blind').map(z=>z.label+' '+distance(game,z)+(z.domains?.length?' ['+z.domains.map(d=>names[d]).join('/')+']':'')+evidence(z,game)),reference=game?.rangeReferenceLabel?.(p.reference);return (p.reason?p.reason+' · 标称范围 · ':'')+scopes.join(' · ')+(p.min?' · 最小射程 '+distance(game,{type:'blind',radius:p.min})+'（内侧不能攻击）':'')+(reference?' · '+reference:'')+(p.boosted?' · 雷达 +15%':'')+(p.preview?' · 建成电力 '+p.power:'');}
 function collect(game,ui,renderer){
  if(ui.demo||ui.rangeMode==='off')return [];
  const records=[],picked=new Map();
  // Selection is already bounded to six entities. Keep off-screen emitters:
  // a long radar/weapon circle may still cross or cover the entire viewport.
  const choose=(e,focus=false)=>{if(!e||e.hp<=0||e.team!==0&&!(game.entityVisible?game.entityVisible(0,e):U[e.kind]?.underwater?game.canDetect(0,e):game.visibleAt(e.x,e.y)))return;const old=picked.get(e.id);picked.set(e.id,{e,focus:focus||old?.focus});};
  if(ui.rangeMode==='defenses')game.entities.filter(e=>e.team===0&&e.structure&&(B[e.kind].damage||B[e.kind].defense)).slice(0,16).forEach(e=>choose(e));
  [...(ui.selection||[])].slice(0,6).forEach(id=>choose(game.get(id),true));choose(game.get(ui.hover),true);
  for(const {e,focus} of picked.values()){const profile=game.rangeProfile(e);if(profile.zones.length)records.push({id:e.id,kind:e.kind,x:e.x,y:e.y,focus,profile,distances:profile.zones.map(z=>distance(game,z)+evidence(z,game)),label:describe(profile,game)});}
  if(B[ui.mode]){const p=renderer.toWorld(ui.pointer.x,ui.pointer.y),e={kind:ui.mode,team:0,x:p.x,y:p.y,hp:1,disabled:0},profile=game.rangeProfile(e,true);records.push({id:'preview',kind:e.kind,x:p.x,y:p.y,focus:true,preview:true,valid:game.canBuild(0,e.kind,p.x,p.y),profile,distances:profile.zones.map(z=>distance(game,z)+evidence(z,game)),label:describe(profile,game)});}
  return records;
 }
 // Clip in screen space with a fixed tessellation budget. Metric ranges never
 // increase mesh work or submit enormous off-canvas coordinates to Canvas2D.
 function clippedSegment(a,b,width,height){
  if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return null;
  const dx=b.x-a.x,dy=b.y-a.y;let lo=0,hi=1;
  for(const [p,q] of [[-dx,a.x],[dx,width-a.x],[-dy,a.y],[dy,height-a.y]]){if(p===0){if(q<0)return null;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;}}
  return [{x:a.x+lo*dx,y:a.y+lo*dy},{x:a.x+hi*dx,y:a.y+hi*dy}];
 }
 function polygonContains(points,x,y){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
 function draw(ctx,renderer,records){
  ctx.save();ctx.font='11px "Microsoft YaHei"';
  for(const rec of records)for(const [zoneIndex,zone] of rec.profile.zones.entries()){
   const enabled=zone.active??rec.profile.active,color=enabled?colors[zone.type]:'#a1a5a6',radius=zone.radius;if(!radius)continue;
   ctx.strokeStyle=rec.preview&&!rec.valid?'#e58f80':color;ctx.lineWidth=rec.focus?1.8:1;ctx.globalAlpha=rec.focus?.9:.3;ctx.setLineDash(zone.type==='blind'?[4,5]:!enabled?[7,6]:zone.type==='link'||zone.type==='intercept'?[9,5]:[]);
   const points=[];for(let i=0;i<72;i++){const a=i/72*Math.PI*2;points.push(renderer.toScreen(rec.x+Math.cos(a)*radius,rec.y+Math.sin(a)*radius));}
   ctx.beginPath();for(let i=0;i<points.length;i++){const segment=clippedSegment(points[i],points[(i+1)%points.length],renderer.width,renderer.height);if(segment){ctx.moveTo(segment[0].x,segment[0].y);ctx.lineTo(segment[1].x,segment[1].y);}}ctx.stroke();
   if(rec.focus){const covers=[[0,0],[renderer.width,0],[0,renderer.height],[renderer.width,renderer.height]].every(([x,y])=>polygonContains(points,x,y)),p=renderer.toScreen(rec.x+radius*.65,rec.y-radius*.76),txt=zone.label+' '+(rec.distances?.[zoneIndex]||fmt(radius)+' u')+(zone.domains?.length?' '+zone.domains.map(d=>names[d]).join('/'):'')+(zone.type==='attack'&&rec.profile.boosted?' +15%':'')+(!enabled?' · '+(rec.profile.reason||'未启用'):'')+(covers?' · 覆盖当前视野':'');const w=ctx.measureText(txt).width,x=Math.max(w/2+6,Math.min(renderer.width-w/2-6,Number.isFinite(p.x)?p.x:renderer.width/2)),y=Math.max(20+zoneIndex*23,Math.min(renderer.height-8,Number.isFinite(p.y)?p.y:20));ctx.globalAlpha=.85;ctx.fillStyle='#14252c';ctx.fillRect(x-w/2-5,y-15,w+10,20);ctx.globalAlpha=1;ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(txt,x,y);}
  }
  ctx.restore();
 }
 root.WarRanges={collect,draw,describe,names};
})(globalThis);
