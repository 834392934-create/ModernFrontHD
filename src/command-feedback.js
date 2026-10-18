(function(root){
  'use strict';
  // Independent implementation for this game's grid contract. Research provenance:
  // docs/reviews/warzone2100-reference.md. No upstream source or assets included.
  const cache=new WeakMap();
  function dimensions(map){
    const d=root.WarData||{};
    return {cols:map.cols??d.COLS,rows:map.rows??d.ROWS,tile:map.tileSize??d.T};
  }
  function validSize({cols,rows,tile}){
    return Number.isInteger(cols)&&cols>0&&Number.isInteger(rows)&&rows>0&&Number.isFinite(tile)&&tile>0;
  }
  function labels(mask,cols,rows){
    const regions=new Int32Array(mask.length),queue=new Int32Array(mask.length);
    let count=0;
    for(let start=0;start<mask.length;start++){
      if(mask[start]||regions[start])continue;
      let head=0,tail=1;queue[0]=start;regions[start]=++count;
      while(head<tail){
        const at=queue[head++],x=at%cols,y=Math.floor(at/cols);
        // Four-connected components exactly match connectivity of the game's
        // eight-way A* which forbids cutting diagonally between blocked cells.
        for(const next of [x>0?at-1:-1,x+1<cols?at+1:-1,y>0?at-cols:-1,y+1<rows?at+cols:-1]){
          if(next<0||mask[next]||regions[next])continue;
          regions[next]=count;queue[tail++]=next;
        }
      }
    }
    return {regions,count};
  }
  function entry(map,size){
    let saved=cache.get(map);
    if(!saved||saved.cols!==size.cols||saved.rows!==size.rows||saved.tile!==size.tile||saved.revision!==map.navigationRevision){
      saved={...size,revision:map.navigationRevision,layers:{},builds:0,checks:0};cache.set(map,saved);
    }
    return saved;
  }
  function check(map,definition,from,to){
    const domain=definition?.space?'space':definition?.air?'air':definition?.naval?'water':'land';
    const result=(reachable,reason)=>({reachable,reason,domain});
    if(!map||typeof map!=='object')return result(null,'invalid-map');
    const size=dimensions(map);
    if(!validSize(size))return result(null,'invalid-map');
    const inside=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<size.cols*size.tile&&p.y<size.rows*size.tile;
    if(!inside(from)||!inside(to))return result(false,'out-of-bounds');
    if(domain==='air'||domain==='space')return result(true,'unrestricted');
    const mask=domain==='water'?map.navalBlocked:map.blocked;
    if(!mask||mask.length!==size.cols*size.rows)return result(null,'invalid-map');
    const saved=entry(map,size);saved.checks++;
    let layer=saved.layers[domain];
    if(!layer||layer.mask!==mask){
      layer={mask,...labels(mask,size.cols,size.rows)};saved.layers[domain]=layer;saved.builds++;
    }
    const cell=p=>Math.floor(p.y/size.tile)*size.cols+Math.floor(p.x/size.tile);
    const origin=layer.regions[cell(from)],destination=layer.regions[cell(to)];
    // Units may be displaced onto a blocked cell; existing destination/path
    // recovery remains authoritative. Never invent a snap to a different island.
    if(!origin||!destination)return result(null,'blocked-endpoint');
    return origin===destination?result(true,'connected'):result(false,domain==='water'?'separated-water':'separated-land');
  }
  function invalidate(map){cache.delete(map);}
  function stats(map){
    const saved=cache.get(map);
    return saved?{builds:saved.builds,checks:saved.checks,landRegions:saved.layers.land?.count??0,waterRegions:saved.layers.water?.count??0}:{builds:0,checks:0,landRegions:0,waterRegions:0};
  }
  function format(report){
    if(!report)return '';
    const accepted=Array.isArray(report.accepted)?report.accepted.length:(report.accepted||0),rejected=report.rejected||[];
    if(!rejected.length)return '';
    const reasons=new Set(rejected.map(item=>item.reason));
    const descriptions={'separated-land':'陆军无法跨越海域或断开的陆路','separated-water':'舰船无法进入不连通的海域','out-of-bounds':'目的地超出地图','queue-full':'路线队列已满（最多 16 个后续点）','no-free-berth':'附近没有足够的可通行停位，请选择更开阔的位置'};
    const detail=[...reasons].map(reason=>descriptions[reason]||'目的地不可达').join('；');
    return `${accepted?`${accepted} 个单位${report.queued?'已加入路线':'接受指令'}；`:''}${rejected.length} 个单位未接受：${detail}。已保留原有命令。`;
  }
  const api={check,invalidate,stats,format};root.WarCommandFeedback=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
