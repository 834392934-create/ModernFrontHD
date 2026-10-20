const test=require('node:test'),assert=require('node:assert/strict');
require('../src/data');require('../src/ranges');
test('attack and blind-zone labels use scenario metres while support remains game units',()=>{
 const game={formatRangeDistance:v=>v*10/1000+' km',rangeReferenceLabel:()=> '公开数据（公开下限）'};
 const p={zones:[{type:'attack',label:'攻击',radius:7000,domains:['ground']},{type:'blind',label:'最小射程盲区',radius:1500},{type:'sonar',label:'声呐',radius:250}],min:1500,reference:{status:'public'},boosted:false};
 const text=WarRanges.describe(p,game);
 assert.match(text,/攻击 70 km/);assert.match(text,/最小射程 15 km（内侧不能攻击）/);assert.match(text,/声呐 250 u/);assert.match(text,/公开数据（公开下限）/);
 assert.match(WarRanges.describe(p),/攻击 7000 u/);
});
test('collected overlays and 2D circle annotations share the authoritative formatted ranges',()=>{
 const e={id:1,team:0,kind:'tank',hp:100,x:0,y:0},profile={zones:[{type:'attack',label:'攻击',radius:300}],active:true,reference:{status:'inferred'}};
 const game={get:()=>e,rangeProfile:()=>profile,formatRangeDistance:v=>v*10+' m',rangeReferenceLabel:()=> '同类估算'};
 const renderer={width:800,height:600,toScreen:()=>({x:200,y:200})},records=WarRanges.collect(game,{selection:new Set([1]),rangeMode:'selected'},renderer);
 assert.equal(records[0].distances[0],'3000 m');assert.match(records[0].label,/3000 m.*同类估算/);
 const texts=[],ctx={save(){},restore(){},setLineDash(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},measureText(){return{width:100};},fillRect(){},fillText(t){texts.push(t);}};
 WarRanges.draw(ctx,renderer,records);assert.ok(texts.some(t=>t==='攻击 3000 m'));
});
