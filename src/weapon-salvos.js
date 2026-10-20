(function(root){
  'use strict';
  // These are game balance values and counts of the visible model ports,
  // not measured weapon performance. Pending launches deliberately do not save.
  const counts=Object.freeze({usa:6,rus:12,chn:8,ind:12,kor:12,imp:6});
  const defaults=Object.freeze({
    rocket:Object.freeze({interval:.16,spreadX:52,spreadY:38,totalDamageMultiplier:1,reloadMultiplier:1}),
    orbital_missile_barge:Object.freeze({interval:.18,spreadX:46,spreadY:34,totalDamageMultiplier:1,reloadMultiplier:1})
  });
  const games=new WeakMap(),finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function pending(game){let q=games.get(game);if(!q){q=new Map();games.set(game,q);}return q;}
  function profile(game,e){
    const base=defaults[e.kind];if(!base)return null;
    const f=game.teams[e.team]?.faction,config=game.options.weaponSalvos?.[e.kind]||{},p={...base,count:e.kind==='rocket'?counts[f]||6:8};
    for(const key of ['interval','spreadX','spreadY','totalDamageMultiplier','reloadMultiplier'])if(finite(config[key]))p[key]=clamp(config[key],key==='interval'?.05:key.includes('Multiplier')?.1:0,key==='interval'?1:key.includes('Multiplier')?5:200);
    return p;
  }
  function cancel(game,e,reason='stop'){const q=games.get(game),id=typeof e==='object'?e.id:e;return q?.delete(id)||false;}
  function active(game,e){return games.get(game)?.has(e.id)||false;}
  function validOrigin(p){return p&&finite(p.x)&&finite(p.y)&&finite(p.height);}
  function localOrigin(e,o){const a=e.angle||0,c=Math.cos(a),s=Math.sin(a),dx=o.x-e.x,dy=o.y-e.y;return{x:dx*c+dy*s,y:-dx*s+dy*c,height:o.height};}
  function worldOrigin(game,e,p){const a=e.angle||0,c=Math.cos(a),s=Math.sin(a);return{x:e.x+p.x*c-p.y*s,y:e.y+p.x*s+p.y*c,height:game.entityAltitude(e)+p.height};}
  function legalPoint(game,e,p,range,projected){
    const dz=projected?0:p.height-game.entityAltitude(e),dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy,dz);
    return dist>=range.min-1e-6&&dist<=range.attack+1e-6;
  }
  function freezePoints(game,e,fx,p,range,projected){
    const angle=((e.id*2.399963229728653+game.time*.73)%(Math.PI*2)),c=Math.cos(angle),s=Math.sin(angle),points=[];
    for(let i=0;i<p.count;i++){
      const r=i?Math.sqrt(i/(p.count-1)):0,a=i*2.399963229728653,dx=Math.cos(a)*r*p.spreadX,dy=Math.sin(a)*r*p.spreadY;
      let x=fx.tx+dx*c-dy*s,y=fx.ty+dx*s+dy*c;
      const dz=projected?0:fx.targetHeight-game.entityAltitude(e),maximum=Math.sqrt(Math.max(0,range.attack**2-dz**2)),minimum=Math.sqrt(Math.max(0,range.min**2-dz**2)),length=Math.hypot(x-e.x,y-e.y),distance=clamp(length,minimum,maximum),heading=length?Math.atan2(y-e.y,x-e.x):(e.angle||0);
      x=clamp(e.x+Math.cos(heading)*distance,0,root.WarData.W);y=clamp(e.y+Math.sin(heading)*distance,0,root.WarData.H);
      const point={x,y,height:fx.targetHeight};if(!legalPoint(game,e,point,range,projected))return null;points.push(point);
    }
    return points;
  }
  function stillValid(game,b){
    const e=game.get(b.id);if(!e||e.hp<=0||e.team!==b.team||e.disabled>game.time||game.result)return false;
    if(e.order&&!e.order.attack)return false;
    const dc=game.directControl;
    if(b.controlled)return dc?.id===e.id&&!!dc.input.fire;
    return dc?.id!==e.id;
  }
  function launch(game,b,index){
    const e=game.get(b.id),point=b.points[index];if(!e||!legalPoint(game,e,point,b.range,b.projected))return false;
    const input=game.directControl?.id===e.id?game.directControl.input:null;
    const live=input?.aimOrigins?.[index],single=input?.aimOrigin;
    // Keep the snapshot offset if the caller has no verified per-port origin.
    // Do not invent spacing from alleged real weapon dimensions.
    const origin=validOrigin(live)?live:index===0&&validOrigin(single)?single:worldOrigin(game,e,b.origins[index]||b.origins[0]);
    const travel=Math.max(.08,Math.hypot(point.x-origin.x,point.y-origin.y,b.projected?0:point.height-origin.height)/(e.kind==='rocket'?400:700));
    const fx={...b.template,x:origin.x,y:origin.y,sourceHeight:origin.height,tx:point.x,ty:point.y,targetHeight:point.height,
      firedAt:game.time,ttl:travel,max:travel,salvoIndex:index,portIndex:index,salvoCount:b.points.length,
      salvoRangeMin:b.range.min,salvoRangeOrigin:{x:e.x,y:e.y,height:game.entityAltitude(e)},salvoProjected:b.projected};
    // Each shot is a frozen area impact. Neither a target id nor the renderer
    // may steer it after launch; splash still uses normal domain/armor checks.
    delete fx.directHitArea;delete fx.miss;game.effects.push(fx);return true;
  }
  function begin(game,e,target,aim,d,fx){
    const p=profile(game,e);if(!p)return false;
    const range=game.rangeProfile(e),projected=!!aim?.projected||(!!root.WarData.U[e.kind]?.space!==!!root.WarData.U[target?.kind]?.space&&!!target),
      points=freezePoints(game,e,fx,p,range,projected);
    // The normal fire-status checks reject out-of-range commands. Keep this
    // final guard for external callers without charging a failed launch.
    if(!points){e.cool=0;return true;}
    const originals=aim?.origins||aim?.aimOrigins||[],fallback={x:fx.x,y:fx.y,height:fx.sourceHeight},
      origins=points.map((_,i)=>{const o=localOrigin(e,validOrigin(originals[i])?originals[i]:fallback);o.height-=game.entityAltitude(e);return o;}),
      multiplier=p.totalDamageMultiplier/p.count,template={...fx,damage:fx.damage*multiplier,baseDamage:d.damage*multiplier,
        treeDamage:d.damage*multiplier,splash:d.splash||0,targetDomain:e.kind==='orbital_missile_barge'?'space':target?game.targetDomain(target.kind):'ground'};
    const b={id:e.id,team:e.team,controlled:game.directControl?.id===e.id,origins,points,range:{min:range.min,attack:range.attack},
      projected,template,next:1,interval:p.interval,due:game.time+p.interval};
    e.cool=d.reload*p.reloadMultiplier;pending(game).set(e.id,b);launch(game,b,0);return true;
  }
  function update(game){
    const q=games.get(game);if(!q)return;
    for(const [id,b] of q){
      if(!stillValid(game,b)){q.delete(id);continue;}
      while(b.next<b.points.length&&game.time+1e-9>=b.due){
        if(!launch(game,b,b.next++)){q.delete(id);break;}b.due+=b.interval;
      }
      if(b.next>=b.points.length)q.delete(id);
    }
  }
  function canImpact(game,fx,e){
    if(!fx.salvoRangeOrigin)return true;
    const o=fx.salvoRangeOrigin;
    return Math.hypot(e.x-o.x,e.y-o.y,fx.salvoProjected?0:game.entityAltitude(e)-o.height)>=fx.salvoRangeMin-1e-6;
  }
  root.WarWeaponSalvos={defaults,counts,profile,begin,update,cancel,active,canImpact};
})(globalThis);
