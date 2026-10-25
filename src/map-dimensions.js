/* Map-local dimensions. Legacy defaults remain immutable when maps coexist. */
(function(root){
 'use strict';
 const huge=new Set(['north_sea','baltic_sea','persian_gulf']),large=new Set(['english_channel','gibraltar','taiwan_strait',...huge]),cache=new WeakMap();
 function shape(width,height,tileSize){
  const cols=width/tileSize,rows=height/tileSize;
  if(![width,height,tileSize].every(Number.isFinite)||tileSize<=0||!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols*rows>262144)throw new RangeError('Invalid map grid dimensions');
  return Object.freeze({width,height,tileSize,cols,rows,W:width,H:height,T:tileSize,COLS:cols,ROWS:rows});
 }
 const legacy=shape(6144,4224,48),expanded=shape(12288,8448,48),theater=shape(24576,16896,48);
 function forMap(value){
  const map=value?.map||value,id=typeof map==='string'?map:map?.id;
  if(map&&typeof map==='object'&&(map.width!==undefined||map.cols!==undefined)){
   const tile=map.tileSize??48,width=map.width??map.cols*tile,height=map.height??map.rows*tile,old=cache.get(map);
   if(old&&old.width===width&&old.height===height&&old.tileSize===tile){if(map.cols!==undefined&&map.cols!==old.cols||map.rows!==undefined&&map.rows!==old.rows)throw new RangeError('Map dimensions and cells disagree');return old;}
   const result=shape(width,height,tile);
   if(map.cols!==undefined&&map.cols!==result.cols||map.rows!==undefined&&map.rows!==result.rows)throw new RangeError('Map dimensions and cells disagree');
   cache.set(map,result);return result;
  }
  return huge.has(id)?theater:large.has(id)?expanded:legacy;
 }
 const api={forMap,isGeographic:id=>large.has(id),legacy,expanded,theater};root.WarMapDimensions=api;
 if(typeof module!=='undefined')module.exports=api;
})(globalThis);
