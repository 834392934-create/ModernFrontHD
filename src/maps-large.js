(function (root) {
  'use strict';
  // Terrain only: construction/mining obstacles remain the simulation's responsibility.
  const BASE_W=3072,BASE_H=2112;
  const defaults={river:6812,desert:1239,industry:4521,archipelago:91827};
  const oldSpawns=[[720,360],[2352,1752],[2352,360],[720,1752],[2736,1056]];
  const oldNodes=[[1176,528],[1896,1584],[1176,1584],[1896,528],[1536,1056],[2592,1056]];
  function seeded(seed) {
    return ()=>{seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
  }
  function makeMap(requested='river',rngFactory=seeded) {
    const D=root.WarData||{},W=D.W||6144,H=D.H||4224,T=D.T||48;
    const COLS=D.COLS||W/T,ROWS=D.ROWS||H/T;
    if(!Number.isInteger(COLS)||!Number.isInteger(ROWS)||COLS*T!==W||ROWS*T!==H)
      throw new RangeError('Map dimensions must match whole terrain cells.');
    const id=Object.hasOwn(defaults,requested)?requested:'river';
    const seed=D.MAPS?.find(m=>m.id===id)?.seed??defaults[id],r=rngFactory(seed);
    if(typeof r!=='function')throw new TypeError('makeMap expects rngFactory(seed) returning a random function.');
    const tiles=new Uint8Array(COLS*ROWS),blocked=new Uint8Array(COLS*ROWS);
    const sx=W/BASE_W,sy=H/BASE_H,point=([x,y])=>({x:x*sx,y:y*sy});
    let spawns,nodes,navalSpawns,navalUnitSpawns;
    const ports=(land,outward)=>land.map((p,i)=>({x:p.x+outward[i][0],y:p.y+outward[i][1]}));
    if(id==='archipelago') {
      // Each island has a wide safe interior, an outward-facing harbour inlet,
      // and sea routes that never depend on going under a bridge.
      spawns=[[588,468],[2436,1644],[2364,468],[612,1644],[1548,1068]].map(point);
      const radii=spawns.map((_,i)=>({x:(i===4?312:384)*sx,y:(i===4?264:312)*sy}));
      const phases=spawns.map(()=>r()*Math.PI*2);
      const outward=spawns.map((p,i)=>i===4?[228*sx,0]:[0,(p.y>H/2?228:-228)*sy]);
      navalSpawns=ports(spawns,outward);
      navalUnitSpawns=ports(spawns,outward.map(([x,y])=>[x*1.4,y*1.4]));
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) {
        const i=y*COLS+x,wx=(x+.5)*T,wy=(y+.5)*T;
        let land=false;
        for(let n=0;n<spawns.length;n++) {
          const p=spawns[n],dx=wx-p.x,dy=wy-p.y,rr=radii[n];
          const a=Math.atan2(dy/rr.y,dx/rr.x);
          const coast=1+.035*Math.sin(a*3+phases[n])+.025*Math.cos(a*5-phases[n]);
          if(Math.hypot(dx/rr.x,dy/rr.y)>coast)continue;
          const inlet=n===4?dx>144*sx&&Math.abs(dy)<96*sy:
            Math.abs(dx)<96*sx&&(p.y>H/2?dy>144*sy:dy< -144*sy);
          if(!inlet)land=true;
        }
        const edge=x<2||x>=COLS-2||y<2||y>=ROWS-2;
        tiles[i]=land&&!edge?(r()<.16?1:0):6;
        blocked[i]=tiles[i]===6?1:0;
      }
      // One reachable point on each starting island; the central island has
      // a second objective. Both stay outside the HQ/mining traffic corridor.
      nodes=spawns.map((p,i)=>({x:p.x-(i===4?168:192)*sx,y:p.y+(p.y>H/2?-120:120)*sy}));
      nodes.push({x:spawns[4].x+120*sx,y:spawns[4].y+168*sy});
    } else {
      spawns=oldSpawns.map(point);nodes=oldNodes.map(point);
      // Preserve the original 64x44 topology exactly, including blocked cells,
      // then expand cells. This also preserves doubled legacy save positions.
      const base=new Uint8Array(64*44),obstacles=new Uint8Array(base.length);
      for(let y=0;y<44;y++)for(let x=0;x<64;x++) {
        const i=y*64+x,wx=x*48+24,wy=y*48+24;
        base[i]=r()<.14?1:0;
        if(id==='river'&&x>=30&&x<=33){base[i]=3;obstacles[i]=1;if([8,21,34].some(a=>Math.abs(y-a)<=1)){base[i]=4;obstacles[i]=0;}}
        if(id==='desert'&&((x>23&&x<27&&y>6&&y<17)||(x>36&&x<40&&y>26&&y<37))){base[i]=2;obstacles[i]=1;}
        if(id==='industry'&&((x>23&&x<28&&y>7&&y<16)||(x>35&&x<40&&y>27&&y<36)||(x>21&&x<25&&y>28&&y<33)||(x>39&&x<43&&y>10&&y<15))){base[i]=5;obstacles[i]=1;}
        if(oldSpawns.some(p=>Math.hypot(p[0]-wx,p[1]-wy)<270)||Math.hypot(wx-BASE_W/2,wy-BASE_H/2)<170){obstacles[i]=0;if(base[i]>1)base[i]=id==='river'?4:0;}
        if(x<3||x>=61||y<4||y>=40){base[i]=6;obstacles[i]=1;}
      }
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) {
        const i=y*COLS+x,old=Math.floor(y*44/ROWS)*64+Math.floor(x*64/COLS);
        tiles[i]=base[old];blocked[i]=obstacles[old];
      }
      // Some original objective centres lay inside rock/factory cells. Keep
      // their neighbourhood, but place fresh objectives on a reachable cell.
      nodes=nodes.map(p=>{
        if(!blocked[Math.floor(p.y/T)*COLS+Math.floor(p.x/T)])return p;
        let best=p,bestDistance=Infinity;
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!blocked[y*COLS+x]){
          const q={x:(x+.5)*T,y:(y+.5)*T},distance=Math.hypot(q.x-p.x,q.y-p.y);
          if(distance<bestDistance){best=q;bestDistance=distance;}
        }
        return best;
      });
      navalSpawns=spawns.map((p,i)=>i===4?{x:3000*sx,y:p.y}:{x:p.x,y:(p.y>H/2?1992:120)*sy});
      navalUnitSpawns=navalSpawns.map((p,i)=>i===4?{x:p.x,y:p.y+100*sy}:{x:p.x+100*sx,y:p.y});
    }
    const navalBlocked=Uint8Array.from(tiles,t=>t===3||t===6?0:1);
    return {id,seed,blocked,navalBlocked,tiles,spawns,nodes,navalSpawns,navalUnitSpawns,width:W,height:H,cols:COLS,rows:ROWS,tileSize:T};
  }
  const api={makeMap};root.WarMapLayouts=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
