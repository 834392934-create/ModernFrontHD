/* Local ocean presentation. It never changes combat visibility or targeting. */
(function(root){'use strict';const T=root.THREE;
 root.WarUnderwater={create(renderer,game){const group=new T.Group();group.name='underwater-details';const random=root.WarSim.rng(game.map.seed+81),positions=[];
  const geo=new T.IcosahedronGeometry(1,0),mat=new T.MeshStandardMaterial({color:0x526b68,roughness:.95}),rocks=new T.InstancedMesh(geo,mat,180),dummy=new T.Object3D();let count=0;
  for(let i=0;i<2200&&count<180;i++){const x=48+random()*(root.WarData.W-96),z=48+random()*(root.WarData.H-96),idx=Math.floor(z/48)*root.WarData.COLS+Math.floor(x/48);if(game.map.navalBlocked[idx])continue;dummy.position.set(x,-177,z);dummy.scale.set(4+random()*8,3+random()*6,4+random()*9);dummy.rotation.set(random(),random(),random());dummy.updateMatrix();rocks.setMatrixAt(count++,dummy.matrix);for(let n=0;n<3;n++)positions.push(x+(random()-.5)*60,-20-random()*130,z+(random()-.5)*60);}
  rocks.count=count;rocks.instanceMatrix.needsUpdate=true;group.add(rocks);const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));const dust=new T.Points(dustGeo,new T.PointsMaterial({color:0xaddac6,size:1.3,transparent:true,opacity:.36,depthWrite:false}));group.add(dust);group.visible=false;renderer.world.add(group);
  return{group,update(active,time){group.visible=active;dust.position.y=Math.sin(time*.2)*2;}};
 }};
})(globalThis);
