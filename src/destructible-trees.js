/* Deterministic gameplay vegetation. HP is a game-balance value, not timber physics.
 * Keep the trees-v1 generator stable while save schema 1 is supported. */
(function(root){
 'use strict';
 const MAX_TREES=170,MAX_HP=90,FALL_SECONDS=1.2,LEAVES=12;
 function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
 function random(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 const key=game=>{const {W,H}=root.WarMapDimensions?.forMap(game.map)||root.WarData;return `${game.map.id}:${game.map.seed}:${W}:${H}`;};
 function ensure(game){
  if(game._treeState?.mapKey===key(game))return game.trees;
  const {W,H,COLS,T}=root.WarMapDimensions?.forMap(game.map)||root.WarData,rnd=random(hash('trees-v1:'+key(game))),desert=game.map.id==='desert',trees=[];
  for(let attempt=0;attempt<1800&&trees.length<MAX_TREES;attempt++){
   const x=170+rnd()*(W-340),y=210+rnd()*(H-420),idx=Math.floor(y/T)*COLS+Math.floor(x/T);
   if(game.map.tiles[idx]>1||!game.map.geography&&(Math.abs(y-H/2)<75||[720,2352].some(a=>Math.abs(x-a*W/3072)<85))||(game.map.spawns||[]).some(p=>Math.hypot(x-p.x,y-p.y)<330)||(game.nodes||[]).some(n=>Math.hypot(x-n.x,y-n.y)<120)||(game.ore||[]).some(o=>Math.hypot(x-o.x,y-o.y)<130))continue;
   const crownY=desert?12+rnd()*12:22+rnd()*22;
   trees.push({id:`tree:${hash(key(game)).toString(16)}:${attempt}`,x,y,r:4,height:crownY*1.28+8,trunkHeight:crownY*.8,crownY,hp:MAX_HP,maxHp:MAX_HP,destroyedAt:null,fallAngle:rnd()*Math.PI*2});
  }
  game.trees=trees;game._treeState={mapKey:key(game),byId:new Map(trees.map(t=>[t.id,t])),colliders:trees.slice(),revision:0};
  return trees;
 }
 function get(game,id){ensure(game);return game._treeState.byId.get(id)||null;}
 function liveColliders(game){ensure(game);return game._treeState.colliders;}
 function damage(game,id,value,source={}){
  const tree=get(game,id);if(!tree||tree.hp<=0||!Number.isFinite(value)||value<=0)return false;
  tree.hp=Math.max(0,tree.hp-value);game._treeState.revision++;
  if(tree.hp===0){tree.destroyedAt=Number.isFinite(game.time)?game.time:0;if(Number.isFinite(source?.x)&&Number.isFinite(source?.y)&&Math.hypot(tree.x-source.x,tree.y-source.y)>.01)tree.fallAngle=Math.atan2(tree.y-source.y,tree.x-source.x);
   const index=game._treeState.colliders.indexOf(tree);if(index>=0)game._treeState.colliders.splice(index,1);
  }
  return true;
 }
 function impact(game,fx){
  if(!fx||!['shot','strike','nuke','bunker','orbital'].includes(fx.type))return 0;
  const shot=fx.type==='shot',x=shot?fx.tx:fx.x,y=shot?fx.ty:fx.y,z=shot?(fx.targetHeight??0):(fx.height??0);
  if(![x,y,z].every(Number.isFinite))return 0;
  const amount=shot?(fx.treeDamage??fx.damage??fx.baseDamage):({nuke:2300,bunker:280,orbital:1700,strike:420}[fx.type]);
  if(!Number.isFinite(amount)||amount<=0)return 0;
  const splash=fx.treeSplash??fx.splash;
  const radius=shot?(Number.isFinite(splash)?Math.max(0,splash):0):(Number.isFinite(fx.r)?Math.max(0,fx.r):0);let hits=0;
  if(radius>0){for(const tree of ensure(game)){if(tree.hp<=0)continue;const vertical=Math.max(0,-z,z-tree.height),distance=Math.hypot(tree.x-x,tree.y-y,vertical);if(distance<=radius+tree.r&&damage(game,tree.id,amount*Math.max(.25,1-distance/(radius+tree.r)),{x:fx.x??x,y:fx.y??y}))hits++;}}
  else if(fx.targetTreeId){const tree=get(game,fx.targetTreeId);if(tree&&Math.hypot(tree.x-x,tree.y-y)<=tree.r+2&&z>=-2&&z<=tree.height+2&&damage(game,tree.id,amount,{x:fx.x??x,y:fx.y??y}))hits++;}
  return hits;
 }
 function serialize(game){return{schema:1,mapKey:key(game),damage:ensure(game).filter(t=>t.hp<t.maxHp).map(t=>({id:t.id,hp:t.hp,destroyedAt:t.destroyedAt,fallAngle:t.fallAngle}))};}
 function restore(game,saved){
  ensure(game);if(saved===undefined||saved===null)return;
  if(saved.schema!==1||saved.mapKey!==key(game)||!Array.isArray(saved.damage)||saved.damage.length>MAX_TREES)throw Error('树木存档数据与当前地图不匹配');
  const seen=new Set();for(const row of saved.damage){const tree=get(game,row?.id);if(!tree||seen.has(row.id)||!Number.isFinite(row.hp)||row.hp<0||row.hp>tree.maxHp||!Number.isFinite(row.fallAngle)||(row.hp===0&&!Number.isFinite(row.destroyedAt)))throw Error('树木存档损伤记录无效');seen.add(row.id);}
  for(const tree of game.trees){tree.hp=tree.maxHp;tree.destroyedAt=null;}
  for(const row of saved.damage){const tree=get(game,row.id);tree.hp=row.hp;tree.destroyedAt=row.hp===0?Math.min(game.time??0,row.destroyedAt):null;tree.fallAngle=row.fallAngle;}
  game._treeState.colliders.splice(0,game._treeState.colliders.length,...game.trees.filter(t=>t.hp>0));game._treeState.revision++;
 }
 function resolveHit(hit){return Number.isInteger(hit?.instanceId)?hit.object?.userData?.treeIds?.[hit.instanceId]??null:null;}
 function createVisual(game,fogify=material=>material){
  const T=root.THREE;if(!T)throw Error('Tree rendering requires THREE');
  const data=ensure(game),count=data.length,desert=game.map.id==='desert',leafGeometry=new T.IcosahedronGeometry(1,1),woodGeometry=new T.CylinderGeometry(1,2,1,5),leafMaterial=fogify(new T.MeshStandardMaterial({color:desert?0x71704a:0x3c583b,roughness:1})),woodMaterial=fogify(new T.MeshStandardMaterial({color:0x65614a,roughness:1}));
  const make=(geo,mat,n,name)=>{const mesh=new T.InstancedMesh(geo,mat,n);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;return mesh;};
  const canopy=make(leafGeometry,leafMaterial,count*LEAVES,'destructible-tree-canopy'),trunks=make(woodGeometry,woodMaterial,count,'destructible-tree-trunks'),stumps=make(woodGeometry,woodMaterial,count,'tree-stumps'),fallingTrunks=make(woodGeometry,woodMaterial,count,'falling-tree-trunks'),fallingCanopy=make(leafGeometry,leafMaterial,count*LEAVES,'falling-tree-canopy');
  trunks.userData.firstPersonOccluder=true;trunks.userData.treeIds=data.map(t=>t.id);canopy.userData.treeIds=data.flatMap(t=>Array(LEAVES).fill(t.id));
  const dummy=new T.Object3D(),zero=new T.Matrix4().makeScale(0,0,0),baseTrunks=[],baseLeaves=[],active=new Set(),health=data.map(()=>NaN);let revision=-1,lastTime=NaN;
  for(let i=0;i<count;i++){
   const tree=data[i],rnd=random(hash('art:'+tree.id)),h=tree.crownY;
   dummy.position.set(tree.x,h*.4,tree.y);dummy.scale.set(2,h*.8,2);dummy.rotation.set(0,0,0);dummy.updateMatrix();baseTrunks.push(dummy.matrix.clone());fallingTrunks.setMatrixAt(i,zero);stumps.setMatrixAt(i,zero);
   for(let j=0;j<LEAVES;j++){const a=j*2.4,rad=8+rnd()*6,index=i*LEAVES+j;dummy.position.set(tree.x+Math.cos(a)*rad,h+Math.sin(j*1.6)*8,tree.y+Math.sin(a)*rad);dummy.scale.set(h*.23,h*.28,h*.22);dummy.rotation.set(rnd(),rnd(),rnd());dummy.updateMatrix();baseLeaves.push(dummy.matrix.clone());const color=new T.Color().setHSL(.25+rnd()*.07,.19+rnd()*.1,.63+rnd()*.2);canopy.setColorAt(index,color);fallingCanopy.setColorAt(index,color);fallingCanopy.setMatrixAt(index,zero);}
  }
  function sync(currentGame){
   if(currentGame!==game)throw Error('Tree visual belongs to another game');
   const changed=revision!==game._treeState.revision,now=game.time??0;if(!changed&&now===lastTime)return;
   let standingDirty=false,fallingDirty=false;
   if(changed){for(let i=0;i<count;i++){const tree=data[i];if(health[i]===tree.hp)continue;health[i]=tree.hp;standingDirty=true;const alive=tree.hp>0;trunks.setMatrixAt(i,alive?baseTrunks[i]:zero);trunks.setColorAt(i,new T.Color(0xffffff).multiplyScalar(alive?.6+.4*tree.hp/tree.maxHp:1));
     for(let j=0;j<LEAVES;j++)canopy.setMatrixAt(i*LEAVES+j,alive?baseLeaves[i*LEAVES+j]:zero);
     if(alive){stumps.setMatrixAt(i,zero);active.delete(i);fallingTrunks.setMatrixAt(i,zero);for(let j=0;j<LEAVES;j++)fallingCanopy.setMatrixAt(i*LEAVES+j,zero);fallingDirty=true;}
     else{dummy.position.set(tree.x,1.5,tree.y);dummy.scale.set(2,3,2);dummy.rotation.set(0,tree.fallAngle,0);dummy.updateMatrix();stumps.setMatrixAt(i,dummy.matrix);if(now-tree.destroyedAt<FALL_SECONDS)active.add(i);}
    }revision=game._treeState.revision;}
   for(const i of active){const tree=data[i],t=Math.max(0,Math.min(1,(now-tree.destroyedAt)/FALL_SECONDS));fallingDirty=true;
    if(t>=1){fallingTrunks.setMatrixAt(i,zero);for(let j=0;j<LEAVES;j++)fallingCanopy.setMatrixAt(i*LEAVES+j,zero);active.delete(i);continue;}
    const axis=new T.Vector3(Math.sin(tree.fallAngle),0,-Math.cos(tree.fallAngle)),matrix=new T.Matrix4().makeTranslation(tree.x,0,tree.y).multiply(new T.Matrix4().makeRotationAxis(axis,(t*t)*Math.PI*.48)).multiply(new T.Matrix4().makeTranslation(-tree.x,0,-tree.y)),fade=t>.8?Math.max(.001,(1-t)/.2):1,scale=new T.Vector3(fade,fade,fade);
    fallingTrunks.setMatrixAt(i,new T.Matrix4().multiplyMatrices(matrix,baseTrunks[i]).scale(scale));for(let j=0;j<LEAVES;j++)fallingCanopy.setMatrixAt(i*LEAVES+j,new T.Matrix4().multiplyMatrices(matrix,baseLeaves[i*LEAVES+j]).scale(scale));
   }
   if(standingDirty){for(const mesh of [trunks,canopy,stumps])mesh.instanceMatrix.needsUpdate=true;trunks.instanceColor.needsUpdate=true;}
   if(fallingDirty)for(const mesh of [fallingTrunks,fallingCanopy])mesh.instanceMatrix.needsUpdate=true;
   lastTime=now;
  }
  sync(game);return{meshes:[canopy,trunks,stumps,fallingTrunks,fallingCanopy],canopy,trunks,stumps,fallingTrunks,fallingCanopy,sync,activeFalls:active};
 }
 root.WarTrees={MAX_HP,FALL_SECONDS,ensure,get,damage,impact,serialize,restore,liveColliders,resolveHit,createVisual};
})(globalThis);
