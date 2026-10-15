/* Original cinematic space silhouettes. Exterior art only; no real weapon specifications. */
(function(root){
 'use strict';
 const T=root.THREE,M=root.WarModels,B=M.Builder;
 const metal=new T.MeshStandardMaterial({vertexColors:true,metalness:.48,roughness:.57});
 const glow=new T.MeshStandardMaterial({vertexColors:true,metalness:.25,roughness:.32,emissive:0x83c8dd,emissiveIntensity:.65});
 const C={white:0xc5c9c5,steel:0x586775,dark:0x222e39,gold:0xb29453,solar:0x203e70,glass:0x397c99,red:0x794449};
 const palette={chn:0xb9c6cc,usa:0xb1b7b4,rus:0x7e928a,ind:0xc0a77b,kor:0xa2b4cb,imp:0x505963};
 const refs={ship:'https://www.aboutamazon.com/news/entertainment/the-expanses-new-space',ring:'https://image-engine.com/case-studies/elysium/',real:'https://www.nasa.gov/international-space-station/'};
 function mesh(b,name,material=metal){const m=b.finish();m.name=name;m.material=material;m.userData.preserveMaterial=true;return m;}
 function muzzle(g,x,y,z){const a=new T.Object3D();a.name='muzzle';a.position.set(x,y,z);g.add(a);}
 function access(b,x,y,z,w,h,c){b.box(w,h,.045,x,y,z,C.dark);b.box(w*.9,h*.88,.055,x,y,z+.025,c);for(const s of [-1,1])for(const t of [-1,1])b.cyl(.025,.035,x+s*w*.38,y+t*h*.35,z+.07,C.gold,'z',.025,6);b.box(w*.3,.035,.065,x,y+h*.23,z+.065,C.steel);}
 function link(b,a,c,r=.055,color=C.steel){const from=new T.Vector3(...a),to=new T.Vector3(...c),v=to.clone().sub(from),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()),e=new T.Euler().setFromQuaternion(q);b.add(new T.CylinderGeometry(r,r,v.length(),6),color,from.add(to).multiplyScalar(.5).toArray(),[e.x,e.y,e.z]);}
 function panel(b,x,y,z,w,d,solar=true){b.box(w,.07,d,x,y,z,solar?C.solar:C.white);for(let i=0;i<=Math.floor(w/.45);i++)b.box(.016,.018,d,x-w/2+i*w/Math.floor(w/.45),y+.05,z,solar?0x617c9b:C.steel);for(let i=0;i<=Math.floor(d/.6);i++)b.box(w,.018,.018,x,y+.051,z-d/2+i*d/Math.floor(d/.6),solar?0x617c9b:C.steel);}
 function engine(b,g,x,y,z,r=.45){b.cyl(r,.8,x,y,z,C.steel,'x',r*.7);b.cyl(r*.87,.12,x-.46,y,z,C.dark,'x');g.cyl(r*.64,.025,x-.53,y,z,0x80c8df,'x');for(let i=0;i<8;i++){const a=i*Math.PI/4;b.box(.55,.04,.05,x,y+Math.cos(a)*r,z+Math.sin(a)*r,C.gold);}}
 function dish(b,x,y,z,r=.6){b.cyl(.09,.6,x,y-.5,z,C.steel);b.add(new T.SphereGeometry(r,20,8,0,Math.PI*2,0,.95),C.white,[x,y,z],[0,0,Math.PI]);link(b,[x,y,z],[x,y-.6,z],.025,C.gold);}
 function finished(parts,f,kind,role,scale,extra={}){const g=new T.Group();for(const p of parts)g.add(p);g.userData={scale,parts:parts.reduce((n,m)=>n+(m.userData.parts||0),0),profile:`${f}-${kind}-cinematic-v1`,evidenceStatus:'space-concept-original',designRole:role,inspirationUrl:kind==='satellite'?refs.real:kind==='orbital_interceptor'?refs.ship:refs.ring,fiction:true,...extra};return g;}
 function satellite(f){const b=new B(),lens=new B(),c=palette[f],i=Object.keys(palette).indexOf(f);
  b.cyl(.91,1.7,0,0,0,C.gold,'x',.91,f==='chn'?8:12);b.box(1.1,.9,1.6,-.2,.45,0,c);
  for(const s of [-1,1]){link(b,[0,0,s*.7],[0,0,s*3.5],.09);panel(b,f==='rus'?-.5:0,0,s*3.6,f==='usa'?3.4:2.8,3.4);b.cyl(.19,.6,0,0,s*1.3,C.steel,'z');}
  b.cyl(.57,1.8,1.4,0,0,c,'x',.62);b.cyl(.5,.09,2.34,0,0,C.dark,'x');lens.cyl(.36,.025,2.4,0,0,C.glass,'x');
  for(let n=0;n<5;n++)b.cyl(.64,.06,.6+n*.31,0,0,C.steel,'x');
  dish(b,-.6,1.6,0,.58);panel(b,-1.2,.1,0,1.1,1.5,false);
  for(const s of [-1,1])for(const z of [-.65,.65]){b.cyl(.08,.32,-1.05,s*.52,z,C.steel,'x');b.cyl(.1,.09,-1.25,s*.52,z,C.dark,'x');}
  // Each country has a distinct antenna/array arrangement; all remain unarmed.
  if(f==='chn')for(const s of [-1,1])link(b,[-.3,.5,s*.6],[-1,1.4,s*1.8],.018,C.gold);
  if(f==='usa')panel(b,-2.1,0,0,1.2,2.4,false);
  if(f==='rus')b.sphere(.68,-1.6,0,0,C.gold,[1.2,1,1]);
  if(f==='ind')for(let a=0;a<3;a++){let t=a*Math.PI*2/3;link(b,[0,.8,0],[Math.cos(t)*1.6,1.8,Math.sin(t)*1.6],.03,C.gold);}
  if(f==='kor')for(const s of [-1,1]){b.box(.6,.55,.55,.8,.7,s*.7,C.white);lens.cyl(.17,.05,1.12,.7,s*.7,C.glass,'x');}
  if(f==='imp'){b.box(1.5,.3,2.4,0,1,0,C.red);for(let n=0;n<3;n++)b.cyl(.16,1.2,-.6+n*.6,1.65,0,C.gold,'y',.03,4);}
  return finished([mesh(b,'satelliteBus'),mesh(lens,'optics',glow)],f,'satellite','unarmed-recon',5.8,{variant:i});
 }
 function interceptor(f){const b=new B(),g=new B(),c=palette[f],tur=new B(),wide=f==='kor'?1.35:1;
  b.prism([[-4,-.65],[-2.7,-1],[2,-.8],[4.7,-.3],[4.7,.3],[2,.8],[-2.7,1],[-4,.65]],-.45,1.1,c,.78,0);
  b.box(6,.12,.45,-.3,.77,0,C.steel);
  for(const s of [-1,1]){
   b.box(3.4,.6,.52,-2.6,0,s*wide*1.15,c);engine(b,g,-4.5,0,s*wide*1.15,.49);
   panel(b,-1,.05,s*2.1,2.4,1.1,false);link(b,[-2,0,s*.7],[-1,0,s*2.5],.085);
   b.box(2.5,.24,.24,2.2,.25,s*.9,C.steel);b.box(.06,.17,.17,3.5,.25,s*.9,C.dark);
   for(let n=0;n<9;n++)b.box(.27,.045,.7,-3.4+n*.46,.64,s*.5,n%3===0?C.gold:C.steel);
   for(let n=0;n<3;n++)b.box(.7,.24,.26,-1+n*.85,-.45,s*.85,C.dark);
  }
  tur.cyl(.35,.25,0,0,0,C.steel);tur.box(.9,.36,.65,.1,.23,0,c);for(const s of [-1,1])tur.cyl(.06,1.05,.85,.23,s*.18,C.steel,'x');
  const turret=mesh(tur,'turret');turret.position.set(1,.75,0);muzzle(turret,1.4,.23,0);
  if(f==='chn')b.prism([[-2,-.6],[.8,-.6],[2,0],[.8,.6],[-2,.6]],.7,.55,C.white,.65,0);
  if(f==='usa'){b.prism([[-1.7,-.5],[.4,-.5],[.75,0],[.4,.5],[-1.7,.5]],.7,.75,C.white,.82,0);dish(b,-1.3,1.7,0,.34);}
  if(f==='rus')for(const s of [-1,1]){b.cyl(.48,2.2,-2,.7,s*1.1,C.gold,'x');engine(b,g,-3.2,.7,s*1.1,.38);}
  if(f==='ind'){b.box(1.8,.4,.6,-1,1.05,0,C.gold);engine(b,g,-3.5,1,0,.46);}
  if(f==='kor')for(const s of [-1,1])b.box(2,.55,.48,3,.1,s*1.25,C.white);
  if(f==='imp'){for(let n=0;n<3;n++){b.box(.65,1.1+n*.25,1,-1.6+n,1.2,0,C.red);b.cyl(.18,.8,-1.6+n,2.1+n*.1,0,C.gold,'y',.02,4);}b.prism([[2,-1],[5,0],[2,1]],-.6,.8,C.gold,.8,0);}
  for(const s of [-1,1])for(let n=0;n<9;n++){let x=-3.3+n*.72;access(b,x,.12,s*.91,.56,.45,n%3===0?C.steel:c);b.box(.49,.04,.44,x,.67,s*.36,C.white);for(let j=0;j<3;j++)b.box(.05,.025,.25,x-.16+j*.15,.7,s*.36,C.dark);}
  for(const s of [-1,1]){link(b,[-3.3,-.3,s*.85],[2.7,-.3,s*.85],.035,C.gold);b.box(1.1,.16,.3,1.8,.75,s*.55,C.dark);}
  return finished([mesh(b,'interceptorHull'),mesh(g,'thrusters',glow),turret],f,'orbital_interceptor','air-space-interceptor',6.7);
 }
 function ringFrame(b,c,n,rx,rz){const points=[];for(let i=0;i<n;i++){let a=i*Math.PI*2/n;points.push([Math.cos(a)*rx,0,Math.sin(a)*rz]);}for(let i=0;i<n;i++){let a=points[i],d=points[(i+1)%n];link(b,[a[0],-.45,a[2]],[d[0],-.45,d[2]],.15,c);link(b,[a[0],.55,a[2]],[d[0],.55,d[2]],.15,c);link(b,[a[0],-.45,a[2]],[d[0],.55,d[2]],.065,C.steel);link(b,[a[0],.55,a[2]],[a[0],-.45,a[2]],.1,C.gold);b.box(.7,1.25,.7,a[0],0,a[2],c);}}
 function orbital(f){if(f==='imp')return imperial();const b=new B(),g=new B(),c=palette[f];
  if(f==='chn'||f==='ind'){ringFrame(b,c,f==='chn'?8:6,5.1,4.5);for(let i=0;i<(f==='chn'?4:3);i++){let a=i*Math.PI*2/(f==='chn'?4:3);link(b,[Math.cos(a)*5,.4,Math.sin(a)*4.4],[0,-1.2,0],.16,c);} }
  if(f==='usa'){for(const s of [-1,1]){b.box(10,.8,1.3,0,0,s*3.6,c);for(const x of [-4,0,4])link(b,[x,-.3,-3.6],[x,.3,3.6],.14);for(let n=0;n<9;n++)link(b,[-4.5+n,.4,s*3.6],[-3.5+n,-.4,s*3.6],.065,C.gold);}}
  if(f==='rus'){b.cyl(.75,10,0,0,0,c,'x');for(const s of [-1,1]){b.cyl(.65,4,-2,0,s*2.6,C.gold,'x');link(b,[-2,0,0],[-2,0,s*3],.24);b.box(3,.4,2.2,1,0,s*3.2,c);} }
  if(f==='kor'){for(const s of [-1,1]){b.prism([[-5,s*2.6-.6],[3.5,s*2.6-.6],[5,s*2.6],[3.5,s*2.6+.6],[-5,s*2.6+.6]],-.4,1.1,c,.95,0);link(b,[-4,0,s*2.6],[-3,0,0],.25);link(b,[0,0,s*2.6],[0,-1,0],.15);} }
  b.cyl(1.15,1.3,0,-.8,0,c);b.cyl(.88,.4,0,-1.6,0,C.gold);b.cyl(.65,.1,0,-1.86,0,C.dark);g.cyl(.44,.025,0,-1.93,0,0x62cde1);
  for(let i=0;i<8;i++){let a=i*Math.PI/4;link(b,[Math.cos(a)*1.1,-.3,Math.sin(a)*1.1],[Math.cos(a)*.85,-1.7,Math.sin(a)*.85],.07,C.steel);}
  for(const s of [-1,1]){panel(b,-2,.8,s*5.1,4,1.65,false);panel(b,2,.5,s*5.1,2.6,1.65,true);link(b,[-5.3,0,s*2.6],[-3.7,0,s*3.6],.23,c);engine(b,g,-5.5,0,s*2.6,.7);for(let i=0;i<5;i++){b.box(.6,.55,.65,-2+i*.9,.8,s*3.6,c);b.box(.45,.045,.5,-2+i*.9,1.1,s*3.6,C.dark);}dish(b,-3,1.6,s*3.5,.4);}
  const sensor=new B();sensor.box(1,.6,1,0,0,0,c);sensor.cyl(.22,.8,.6,0,0,C.glass,'x');const turret=mesh(sensor,'turret');turret.position.set(0,1,0);
  for(const s of [-1,1])for(let n=0;n<5;n++){const x=-2+n*.9;access(b,x,.77,s*3.95,.5,.35,c);for(let j=0;j<5;j++)b.box(.06,.025,.44,x-.2+j*.1,1.14,s*3.6,C.steel);}
  for(let n=0;n<12;n++){let a=n*Math.PI/6;b.box(.1,.6,.15,Math.cos(a)*1.12,-.7,Math.sin(a)*1.12,C.steel,[0,-a,0]);}
  const model=finished([mesh(b,'orbitalTruss'),mesh(g,'emitters',glow),turret],f,'orbital','heavy-all-domain-strike',6.5);muzzle(model,0,-1.93,0);return model;
 }
 function imperial(){const b=new B(),g=new B(),c=palette.imp;
  b.prism([[-7,-1.2],[-4,-2],[3,-2],[7,-.5],[7,.5],[3,2],[-4,2],[-7,1.2]],-.8,1.9,c,.8,0);
  b.box(11,.4,1.3,-.6,1.2,0,C.red);b.prism([[3,-1.3],[8,0],[3,1.3]],-.9,1.1,C.gold,.85,0);
  for(const s of [-1,1]){for(let n=0;n<6;n++){const x=-4.4+n*1.5;b.box(1.1,1.1,.7,x,.1,s*2,C.red);b.box(.85,.08,.83,x,.72,s*2,C.gold);b.cyl(.18,1.6,x,.1,s*2.8,C.steel,'z');b.cyl(.12,.05,x,.1,s*3.65,C.dark,'z');link(b,[x-.5,.8,s*.6],[x-.5,-.6,s*2.3],.12,C.gold);}engine(b,g,-7.2,0,s*.85,.75);}
  for(let n=0;n<3;n++){const x=-3+n*2.2,h=2.4-n*.35;b.box(1.1,h,1.3,x,1+h/2,0,c);b.prism([[x-.75,-.8],[x+.75,-.8],[x+.75,.8],[x-.75,.8]],1+h,.35,C.gold,.9,0);b.cyl(.22,1.2,x,1.8+h,0,C.gold,'y',.01,4);for(let j=0;j<4;j++)for(const s of [-1,1])g.box(.1,.35,.025,x-.4+j*.26,1+h*.7,s*.66,0xcab274);}
  for(let n=0;n<15;n++)b.box(.045,.2,2.8,-5+n*.65,1.05,0,C.gold);
  for(const s of [-1,1]){
   for(let n=0;n<13;n++){const x=-5.5+n*.82;access(b,x,-.32,s*1.9,.64,.52,C.steel);b.box(.08,.12,.12,x,.5,s*2.42,C.gold);}
   for(let n=0;n<3;n++){let x=-3+n*2.2,h=2.4-n*.35;
    for(const dx of [-.6,.6]){link(b,[x+dx,1.2,s*1.2],[x+dx,2.3,s*.64],.09,C.gold);b.box(.075,h,.09,x+dx,1+h/2,s*.67,C.gold);}
    for(let row=0;row<3;row++)for(let j=0;j<3;j++){const xx=x-.34+j*.34,yy=1.35+row*.52;b.box(.14,.32,.035,xx,yy,s*.67,C.dark);b.prism([[xx-.12,s*.68-.04],[xx+.12,s*.68-.04],[xx+.12,s*.68+.04],[xx-.12,s*.68+.04]],yy+.16,.12,C.gold,.4,0);}
    for(let j=0;j<4;j++)b.box(.13,.07,.55,x-.45+j*.3,1+h+.37,s*.5,C.steel);
   }
   for(let n=0;n<6;n++){let x=-4.4+n*1.5;access(b,x,.12,s*2.37,.8,.66,C.red);b.box(1,.04,.6,x,.78,s*2,C.steel);for(let j=0;j<4;j++)b.box(.1,.04,.48,x-.33+j*.22,.82,s*2,C.gold);}
  }
  b.cyl(.7,.55,1,-1.1,0,C.gold);g.cyl(.45,.035,1,-1.42,0,0xcdb076);
  const model=finished([mesh(b,'cathedralHull'),mesh(g,'emitters',glow)],'imp','orbital','heavy-all-domain-strike',7.2,{inspirationUrl:'https://www.starwars.com/databank/imperial-star-destroyer'});muzzle(model,1,-1.42,0);return model;
 }
 function asat(f){const b=new B(),t=new B(),c=M.colors[f];
  b.box(7.5,.42,2.45,0,.8,0,C.steel);for(const s of [-1,1])for(const x of [-2.9,-1.75,1.55,2.7])M.wheel(b,x,s*1.3,.56,c);
  b.prism([[1.5,-1.22],[3.6,-1.22],[3.75,-.9],[3.75,.9],[3.6,1.22],[1.5,1.22]],.95,1.5,c,.92,0);b.box(.035,.6,1.96,3.51,1.97,0,C.glass,[0,0,.13]);b.box(.055,.62,.04,3.53,1.97,0,C.steel);b.box(.13,.3,1.5,3.76,1.3,0,C.dark);
  for(const s of [-1,1]){b.box(.85,.58,.035,2.8,1.98,s*1.15,C.glass);b.box(.45,.15,.1,3.55,1.2,s*.82,C.white);b.box(.045,.5,.045,2.1,1.45,s*1.2,C.steel);b.box(.23,.055,.06,2.2,1.65,s*1.22,C.steel);b.box(.9,.13,.5,2.3,.88,s*1.25,C.steel);link(b,[3.1,2.2,s*1.16],[3.1,2.2,s*1.65],.035);b.box(.12,.32,.2,3.1,2.1,s*1.65,C.dark);for(let i=0;i<8;i++)b.box(.16,.08,.45,-3.2+i*.6,1.1,s*1.25,C.steel);}
  b.box(1.1,1.1,2.1,.7,1.6,0,c);b.cyl(.7,.25,-1.5,1.3,0,C.steel);
  const count=f==='rus'?3:f==='kor'?4:2;
  for(let i=0;i<count;i++){let z=(i-(count-1)/2)*.55;t.cyl(.23,4.9,-.65,2.25,z,c,'y');t.cyl(.25,.16,-.65,4.78,z,C.steel);t.cyl(.2,.018,-.65,4.88,z,C.dark);for(let n=0;n<6;n++)t.cyl(.25,.055,-.65,.2+n*.83,z,C.steel);}
  t.box(.65,3.3,1.7,-1.15,1.65,0,C.steel);link(t,[-.8,.5,0],[.4,.5,0],.13);link(t,[.4,.5,0],[.4,1.4,0],.09);dish(t,.4,1.75,0,.55);
  if(f==='usa')t.box(.15,.9,1.2,.6,1.3,0,c,[0,0,-.2]);
  if(f==='chn')t.box(.6,.4,1.5,-1.2,3.4,0,c);
  if(f==='ind')t.cyl(.18,1.1,.4,2.5,0,C.gold);
  if(f==='imp'){b.box(4,.4,3,-1,1.2,0,C.red);for(const s of [-1,1])b.cyl(.2,1.3,0,2,s*1.5,C.gold,'y',.02,4);}
  const turret=mesh(t,'turret');turret.position.set(-1,1.5,0);muzzle(turret,-.65,4.9,0);
  return finished([mesh(b,'asatChassis'),turret],f,'asat','ground-space-defense',6.2,{inspirationUrl:refs.real});
 }
 for(const f of Object.keys(palette)){M.register('satellite',f,()=>satellite(f));M.register('orbital_interceptor',f,()=>interceptor(f));M.register('orbital',f,()=>orbital(f));M.register('asat',f,()=>asat(f));}
})(globalThis);
