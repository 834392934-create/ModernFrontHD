/* Original geometry and per-vertex PBR surface classes; assemblies remain batched. */
(function(root){
 'use strict';const T=root.THREE,M=root.WarModels;
 const Surface={paint:0,glass:1,metal:2,rubber:3,cloth:4,solar:5,foil:6};
 const finishes=new Map([[0x58646a,2],[0x454a43,2],[0x65777d,2],[0x202528,3],[0x242724,3],[0x325a70,1],[0x254c5c,1],[0x263e69,5],[0xb09a64,6],[0x4d5944,4],[0x303a31,4],[0x797463,4]]);
 function material(){const m=new T.MeshStandardMaterial({vertexColors:true,metalness:.15,roughness:.65});m.name='RoleSurfaces_v2';m.userData.camo={value:1};
  m.onBeforeCompile=s=>{s.uniforms.detailCamo=m.userData.camo;
   s.vertexShader='attribute float surface; attribute float paint; varying float dSurface; varying float dPaint; varying vec3 dPos;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndSurface=surface;dPaint=paint;dPos=position;');
   s.fragmentShader='uniform float detailCamo; varying float dSurface; varying float dPaint; varying vec3 dPos;\nfloat dh(vec3 p){return fract(sin(dot(p,vec3(17.13,43.77,91.17)))*43758.5453);}\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float gr=dh(floor(dPos*145.0));diffuseColor.rgb*=.98+gr*.04;
    if(dSurface>3.5&&dSurface<4.5){float pat=sin(dPos.x*27.0+sin(dPos.z*31.0))+sin(dPos.y*23.0+dPos.z*17.0);vec3 cloth=mix(diffuseColor.rgb*.55,diffuseColor.rgb*1.15,smoothstep(-.3,.2,pat));diffuseColor.rgb=mix(diffuseColor.rgb,cloth,detailCamo*.65);}
    if(dSurface<.5&&dPaint>.5){float paintPatch=sin(dPos.x*2.4+sin(dPos.y*3.7+dPos.z*2.9))+cos(dPos.z*3.1);diffuseColor.rgb*=mix(1.0,mix(.72,1.08,smoothstep(-.1,.2,paintPatch)),detailCamo*.65);}
    if(dSurface>4.5&&dSurface<5.5){vec2 uv=dPos.xz*7.5;vec2 aa=max(fwidth(uv)*1.2,vec2(.01));vec2 edge=min(fract(uv),1.0-fract(uv));vec2 grid=smoothstep(vec2(.02)-aa,vec2(.02)+aa,edge);float cell=min(grid.x,grid.y);float fade=1.0-smoothstep(.15,.45,max(aa.x,aa.y));diffuseColor.rgb*=mix(.96,mix(.75,1.0,cell),fade);}
   `);
   s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    roughnessFactor=dSurface<.5?.61:dSurface<1.5?.13:dSurface<2.5?.32:dSurface<3.5?.94:dSurface<4.5?.96:dSurface<5.5?.24:.43;
    roughnessFactor+=dh(floor(dPos*110.0))*.035;`);
   s.fragmentShader=s.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
    metalnessFactor=dSurface<.5?.12:dSurface<1.5?.18:dSurface<2.5?.8:dSurface<4.5?.0:dSurface<5.5?.33:.78;`);
  };m.customProgramCacheKey=()=> 'role-detail-v2';return m;
 }
 const mat=material();
 function bevelBox(w,h,d,r){const dims=[w,h,d],g=new T.BoxGeometry(1,1,1,3,3,3),p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++){const old=[p.getX(i),p.getY(i),p.getZ(i)],v=old.map((a,j)=>Math.sign(a)*(Math.abs(a)>.4?dims[j]/2:dims[j]/2-r)),base=v.map((a,j)=>T.MathUtils.clamp(a,-dims[j]/2+r,dims[j]/2-r)),normal=new T.Vector3(v[0]-base[0],v[1]-base[1],v[2]-base[2]).normalize();p.setXYZ(i,base[0]+normal.x*r,base[1]+normal.y*r,base[2]+normal.z*r);n.setXYZ(i,normal.x,normal.y,normal.z);}return g;
 }
 class Builder extends M.Builder{
  add(geo,color,pos,rot,scale,paint=0,surface){const start=this.surface.length;super.add(geo,color,pos,rot,scale,paint);this.surface.fill(surface??finishes.get(color)??0,start);}
  box(w,h,d,x,y,z,c,rot=[0,0,0],paint=0){const min=Math.min(w,h,d),beveled=min>.12&&Math.max(w,h,d)>.4;this.add(beveled?bevelBox(w,h,d,Math.min(.07,min*.13)):new T.BoxGeometry(w,h,d),c,[x,y,z],rot,[1,1,1],paint);}
  sphere(r,x,y,z,c,scale=[1,1,1]){this.add(new T.SphereGeometry(r,r>.3?24:16,r>.3?14:10),c,[x,y,z],[0,0,0],scale);}
  prism(points,y,h,c,inset=.8,paint=1){const p=[],cx=points.reduce((s,a)=>s+a[0],0)/points.length,cz=points.reduce((s,a)=>s+a[1],0)/points.length,n=points.length,v=(i,t)=>[cx+(points[i][0]-cx)*(t?inset:1),y+(t?h:0),cz+(points[i][1]-cz)*(t?inset:1)];
   for(let i=0;i<n;i++){let j=(i+1)%n;p.push(...v(i,0),...v(i,1),...v(j,1),...v(i,0),...v(j,1),...v(j,0));}for(let i=1;i<n-1;i++)p.push(...v(0,1),...v(i+1,1),...v(i,1),...v(0,0),...v(i,0),...v(i+1,0));const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();this.add(g,c,[0,0,0],[0,0,0],[1,1,1],paint);
  }
  finish(){const mesh=super.finish();mesh.material=mat;mesh.userData.preserveMaterial=true;mesh.userData.surfaceFinish='role-detail-v2';return mesh;}
 }
 function link(b,a,z,r=.05,c=0x58646a,r2=r,segments=12){const p=new T.Vector3(...a),q=new T.Vector3(...z),v=q.clone().sub(p),e=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()));b.add(new T.CylinderGeometry(r2,r,v.length(),segments),c,p.add(q).multiplyScalar(.5).toArray(),[e.x,e.y,e.z]);}
 function body(b,sections,c,radial=28){const p=[],idx=[];for(const [x,y,w,h] of sections)for(let i=0;i<=radial;i++){const a=i/radial*Math.PI*2;p.push(x,y+Math.cos(a)*h,w*Math.sin(a));}for(let j=0;j<sections.length-1;j++)for(let i=0;i<radial;i++){const a=j*(radial+1)+i,z=a+radial+1;idx.push(a,z,a+1,a+1,z,z+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));for(let j=0;j<idx.length;j+=3)[idx[j],idx[j+1]]=[idx[j+1],idx[j]];g.setIndex(idx);g.computeVertexNormals();b.add(g,c);}
 function wing(b,c,span,rootX,tipX,chord,y=0){for(const side of [-1,1]){const rows=9,profile=18,p=[],idx=[];
  for(let j=0;j<=rows;j++){const v=j/rows,z=side*(.35+(span-.35)*v),leading=rootX+(tipX-rootX)*v,localChord=chord*(1-.56*v),thick=localChord*(.105-.045*v);for(let i=0;i<profile;i++){const angle=i/profile*Math.PI*2,u=(1-Math.cos(angle))/2,t=.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u*u*u-.1015*u*u*u*u,sy=Math.sin(angle)>=0?1:-1;p.push(leading-u*localChord,y+sy*5*thick*t+.035*Math.sin(Math.PI*u),z);}}
  for(let j=0;j<rows;j++)for(let i=0;i<profile;i++){const a=j*profile+i,z=(j+1)*profile+i,an=j*profile+(i+1)%profile,zn=(j+1)*profile+(i+1)%profile;if(side===1)idx.push(a,z,an,an,z,zn);else idx.push(a,an,z,an,zn,z);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));for(let j=0;j<idx.length;j+=3)[idx[j],idx[j+1]]=[idx[j+1],idx[j]];g.setIndex(idx);g.computeVertexNormals();b.add(g,c);
  const point=(v,u)=>{const cc=chord*(1-.56*v),th=cc*(.105-.045*v),curve=.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u*u*u-.1015*u*u*u*u;return[rootX+(tipX-rootX)*v-u*cc,y+5*th*curve+.035*Math.sin(Math.PI*u)+.006,side*(.35+(span-.35)*v)];};
  for(const v of [.22,.78]){let previous;for(let i=0;i<=8;i++){const p=point(v,.70+i*.035);if(previous)link(b,previous,p,.008,0x39454a);previous=p;}}
  let previous;for(let i=0;i<=22;i++){const p=point(.12+i*.038,.77);if(previous)link(b,previous,p,.008,0x39454a);previous=p;}

 }}
 function flyingWing(b,c){const rows=[[0,5,-3.4,.68],[1,3.5,-3.4,.50],[4,1.45,-4.7,.29],[6.2,-.04,-3.3,.19],[9.2,-2.1,-5,.12],[10,-2.7,-2.82,.012]],count=24;
  for(const side of [-1,1]){const p=[],idx=[];for(const [z,front,back,th] of rows)for(let i=0;i<count;i++){const a=i/count*Math.PI*2,u=(1-Math.cos(a))/2;p.push(front+(back-front)*u,Math.sin(a)*th/2+.05*Math.sin(Math.PI*u),side*z);}
   for(let j=0;j<rows.length-1;j++)for(let i=0;i<count;i++){const a=j*count+i,n=j*count+(i+1)%count,z=a+count,nn=n+count;if(side===1)idx.push(z,a,n,z,n,nn);else idx.push(a,z,n,n,z,nn);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();b.add(g,c);
   for(let j=1;j<rows.length-2;j++){const [z,front,back,th]=rows[j],[zz,ff,bb,tt]=rows[j+1],u=.84;link(b,[front+(back-front)*u,Math.sqrt(1-(1-2*u)**2)*th/2+.05*Math.sin(Math.PI*u)+.008,side*z],[ff+(bb-ff)*u,Math.sqrt(1-(1-2*u)**2)*tt/2+.05*Math.sin(Math.PI*u)+.008,side*zz],.009,0x39454a);}}
 }
 function tire(b,x,z,r,c){const side=Math.sign(z),cy=.65,tyre=new T.TorusGeometry(r*.76,r*.24,10,28);b.add(tyre,0x202528,[x,cy,z]);b.cyl(r*.58,.32,x,cy,z,c,'z',r*.58,24);b.cyl(r*.37,.37,x,cy,z,0x58646a,'z',r*.37,20);b.cyl(r*.15,.43,x,cy,z,c,'z',r*.15,16);
  for(let i=0;i<32;i++){const a=i*Math.PI/16;for(const s of [-1,1])b.box(.075,.025,.14,x+Math.sin(a)*(r-.005),cy+Math.cos(a)*(r-.005),z+s*.075,0x202528,[0,s*.35,-a]);}for(let i=0;i<8;i++){const a=i*Math.PI/4;b.cyl(.026,.025,x+Math.sin(a)*r*.28,cy+Math.cos(a)*r*.28,z+side*.21,0x65777d,'z',.026,6);}
 }
 function inside(g){if(g.index){const a=g.index.array;for(let i=0;i<a.length;i+=3)[a[i],a[i+1]]=[a[i+1],a[i]];}const n=g.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,-n.getX(i),-n.getY(i),-n.getZ(i));return g;}
 function engine(b,x,y,z,r=.4,length=1,c=0x58646a,dir=1){b.add(new T.TorusGeometry(r*.84,r*.16,10,28),c,[x,y,z],[0,Math.PI/2,0]);b.add(inside(new T.CylinderGeometry(r*.61,r*.78,length,28,1,true)),0x58646a,[x+dir*length/2,y,z],[0,0,dir===1?-Math.PI/2:Math.PI/2]);b.cyl(r*.61,.025,x+dir*length,y,z,0x202528,'x',r*.61,28);b.cyl(r*.17,.14,x+dir*(length-.09),y,z,0x65777d,'x',.015,18);for(let i=0;i<14;i++){const a=i*Math.PI/7;b.box(.025,r*.38,.045,x+dir*(length-.035),y+Math.cos(a)*r*.36,z+Math.sin(a)*r*.36,0x58646a,[a+.35,0,0]);}}
 root.WarDetail={Builder,material:mat,createMaterial:material,Surface,bevelBox,link,body,wing,flyingWing,tire,engine};
})(globalThis);
