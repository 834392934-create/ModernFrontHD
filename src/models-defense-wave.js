/* Original defense emplacements: structural public references, no claimed real systems.
 * Shared WarDetail PBR assemblies. Foundations touch y=0; +X is nominal firing direction. */
(function(root){
 'use strict';const T=root.THREE,M=root.WarModels,H=root.WarDetail,D=root.WarData,B=H.Builder;
 const C={concrete:0x85867c,edge:0x575f5b,metal:0x58646a,dark:0x202528,glass:0x325a70,white:0xbcc4c7,foil:0xb09a64,orange:0xc18d49};
 const profiles={sonar_bastion:'shore-sonar-twin-torpedo-pedestal',aerospace_array:'four-face-radar-inclined-sealed-launchers',plasma_bastion:'segmented-heavy-plasma-gun-cooling-lines',repair_dome:'open-half-arch-two-arm-service-yard'};
 function link(b,a,z,r=.05,c=C.metal){H.link(b,a,z,r,c);}
 function plan(b,p,y,h,c,inset=.94){const a=p.reduce((v,q,i)=>v+q[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*q[1],0);b.prism(a<0?[...p].reverse():p,y,h,c,inset);}
 function part(b,name,p=[0,0,0]){const m=b.finish();m.name=name;m.position.set(...p);return m;}
 function marker(g,p,name='muzzle'){const m=new T.Object3D();m.name=name;m.position.set(...p);g.add(m);}
 function col(f){return new T.Color(M.colors[f]).lerp(new T.Color(0x728087),.25).getHex();}
 function cabinet(b,x,y,z,w,d,c){b.box(w,1.2,d,x,y+.6,z,c);b.box(w*.91,1.07,.035,x,y+.6,z+d/2+.022,C.dark);b.box(w*.84,1.0,.035,x,y+.6,z+d/2+.045,c);b.box(.06,.20,.035,x+w*.28,y+.73,z+d/2+.07,C.metal);for(let i=0;i<5;i++)b.box(w*.64,.025,.028,x,y+.19+i*.09,z+d/2+.069,C.dark);}
 function vent(b,x,y,z,w,d){b.box(w,.045,d,x,y,z,C.dark);for(let i=0;i<8;i++)b.box(w*.9,.025,.035,x,y+.035,z-d*.4+i*d*.8/7,C.metal);}
 function hatch(b,x,y,z,r,c){b.cyl(r,.045,x,y,z,C.dark);b.cyl(r*.90,.05,x,y+.025,z,c);link(b,[x-r*.4,y+.065,z],[x+r*.4,y+.065,z],.018);}
 function bolt(b,x,y,z){b.cyl(.05,.035,x,y,z,C.metal,'y',.05,6);}
 function rail(b,a,z,y){link(b,[a[0],y+.65,a[1]],[z[0],y+.65,z[1]],.027);link(b,[a[0],y+.32,a[1]],[z[0],y+.32,z[1]],.018);for(let i=0;i<=5;i++){const t=i/5;link(b,[a[0]+(z[0]-a[0])*t,y,a[1]+(z[1]-a[1])*t],[a[0]+(z[0]-a[0])*t,y+.65,a[1]+(z[1]-a[1])*t],.024);}}
 function base(kind,f){const b=new B(),r=(D.B[kind]?.r||38)/7,c=col(f);b.box(2*r,.32,2*r,0,.16,0,C.concrete);for(const s of [-1,1]){b.box(2*r,.10,.14,0,.37,s*r,C.edge);b.box(.14,.10,2*r,s*r,.37,0,C.edge);for(let i=0;i<6;i++)b.box(.37,.025,.16,-r+.55+i*(2*r-1.1)/5,.44,s*r,C.orange);}for(const s of [-1,1])for(const t of [-1,1]){b.box(.55,.11,.55,s*(r-.48),.41,t*(r-.48),C.metal);bolt(b,s*(r-.48),.48,t*(r-.48));}for(let i=0;i<3;i++)b.box(1.3,.11*(i+1),.35,-r+.55,.055*(i+1),-.95+i*.35,C.concrete);return{b,r,c};}
 function finish(kind,f,b,moving=[],unarmed=false){const g=new T.Group();g.add(part(b,'foundation'),...moving);let parts=0;g.traverse(o=>parts+=o.userData.parts||0);g.userData={scale:7,parts,profile:profiles[kind]+'-'+f+'-v2',detailPass:2,modelFamily:kind,original:true,evidenceStatus:'original-concept-facility',fiction:kind!=='sonar_bastion'||f==='imp',unarmed,reviewStatus:'needs-visual-review',referenceUse:'Original integrated facility. Public components inform visible supports only; no real system/performance claim.'};return g;}
 function sonar(f){const {b,r,c}=base('sonar_bastion',f),t=new B();
  plan(b,[[-2,-1.55],[2.3,-1.55],[2.6,-.95],[2.6,.95],[2.3,1.55],[-2,1.55]],.33,.65,C.edge,.95);b.cyl(1.0,.45,.85,1.15,0,C.metal);t.box(3.7,.25,2.5,0,.10,0,c);
  for(const s of [-1,1]){t.box(.22,.75,.30,-.9,.50,s*.9,c);t.box(.22,.75,.30,1.1,.50,s*.9,c);t.cyl(.37,3.9,.25,.90,s*.9,c,'x',.37,28);H.engine(t,2.22,.90,s*.9,.38,.28,C.metal,-1);for(const x of [-1.1,1.1]){t.add(new T.TorusGeometry(.38,.045,8,24),C.metal,[x,.90,s*.9],[0,Math.PI/2,0]);}t.box(.60,.32,.49,-1.55,.9,s*.9,c);}
  const turret=part(t,'turret',[.85,1.42,0]);marker(turret,[2.27,.90,.9]);
  // Electronics shelter with distinct doors and bounded cooling panels.
  b.box(1.80,1.8,2.5,-2.67,1.23,1.8,c);b.box(1.95,.15,2.65,-2.67,2.20,1.8,C.edge);cabinet(b,-2.67,.33,3.25,1.5,.47,c);vent(b,-2.67,2.31,1.8,1.4,1.8);b.box(.035,.42,.72,-1.75,1.55,1.8,C.glass);
  // Sonar cable winch has bearings, drum, guide roller and a conduit toward the shore edge.
  const x=-2.8,z=-2.4;for(const s of [-1,1]){b.box(.27,.97,.27,x, .83,z+s*.81,c);b.cyl(.65,.12,x,1.32,z+s*.7,c,'z',.65,24);}b.cyl(.52,1.25,x,1.32,z,C.dark,'z',.52,28);for(let i=0;i<7;i++)b.add(new T.TorusGeometry(.53,.02,6,24),C.metal,[x,1.32,z-.55+i*.183]);link(b,[x,1.8,z],[x-.60,1.8,-r+.2],.025,C.dark);link(b,[x-.60,1.8,-r+.2],[x-.60,.40,-r+.2],.025,C.dark);b.box(.5,.55,.45,x-.6,.6,-r+.2,c);
  for(const s of [-1,1])rail(b,[-1.5,s*(r-.3)],[r-.4,s*(r-.3)],.33);link(b,[-2.0,.48,1.8],[.85,.48,.8],.065,C.dark);hatch(b,1.0,.99,.0,.35,c);const g=finish('sonar_bastion',f,b,[turret]);g.userData.referenceUrl='https://www.kongsberg.com/what-we-do/defence-and-security/naval/st2400/';return g;
 }
 function array(f){const {b,c}=base('aerospace_array',f),t=new B();
  plan(b,[[-2.4,-2.0],[2.4,-2.0],[3,-1.3],[3,1.3],[2.4,2.0],[-2.4,2.0]],.33,.90,C.edge,.9);b.cyl(1.15,.33,.75,1.39,0,C.metal);t.box(3.25,.28,2.7,0,.05,0,c);
  const angle=.82,cs=Math.cos(angle),sn=Math.sin(angle);for(const s of [-1,1]){link(t,[-1.5,.15,s*.92],[.7,1.95,s*.92],.12,c);link(t,[1.4,.15,s*.92],[.7,1.95,s*.92],.10,C.metal);for(const side of [-1,1]){const z=s*.72,y=1.55+(side===1?.72:0);t.box(4.6,.63,.64,0,y,z,c,[0,0,angle]);for(const q of [-1,1])t.box(.10,.65,.66,q*2.35*cs,y+q*2.35*sn,z,C.dark,[0,0,angle]);for(let i=0;i<5;i++)t.box(.05,.69,.70,(-1.8+i*.9)*cs,y+(-1.8+i*.9)*sn,z,C.metal,[0,0,angle]);}}
  const turret=part(t,'turret',[.75,1.58,0]);marker(turret,[2.43*cs,2.27+2.43*sn,.72]);turret.userData.muzzleDirection=[cs,sn,0];
  // Four faces share one fixed square tower, kept aft of the launch arcs.
  const x=-3.55;b.box(1.35,3.7,1.35,x,2.18,0,c);b.box(1.85,.18,1.85,x,4.12,0,C.metal);for(let i=0;i<4;i++){const a=i*Math.PI/2,xx=x+Math.cos(a)*.91,zz=Math.sin(a)*.91;b.box(.15,1.62,1.45,xx,3.28,zz,c,[0,-a,0]);b.box(.035,1.45,1.27,xx+Math.cos(a)*.10,3.28,zz+Math.sin(a)*.10,C.dark,[0,-a,0]);for(let k=0;k<5;k++)b.box(.04,.025,1.1,xx+Math.cos(a)*.125,2.73+k*.27,zz+Math.sin(a)*.125,C.metal,[0,-a,0]);}b.cyl(.05,.95,x,4.66,0,C.metal,'y',.012,10);cabinet(b,-3.4,.33,2.7,1.7,1.1,c);cabinet(b,-3.4,.33,-3.0,1.7,1.1,c);for(const s of [-1,1])link(b,[-3.4,.48,s*2.7],[-.9,.48,s*1.5],.075,C.dark);hatch(b,2.1,1.29,0,.33,c);
  const g=finish('aerospace_array',f,b,[turret]);g.userData.referenceUrl='https://lockheedmartin.com/en-us/products/tpq-53.html';g.userData.muzzleAxis='inclined';return g;
 }
 function plasma(f){const {b,c}=base('plasma_bastion',f),t=new B();
  b.cyl(2.2,.70,0,.68,0,C.edge,'y',2.0,16);b.cyl(1.75,.30,0,1.18,0,C.metal,'y',1.75,32);for(let i=0;i<12;i++){const a=i*Math.PI/6;bolt(b,Math.cos(a)*1.92,1.05,Math.sin(a)*1.92);}
  plan(t,[[-1.9,-1.4],[1.25,-1.4],[1.8,-.8],[1.8,.8],[1.25,1.4],[-1.9,1.4]],.1,.95,c,.78);t.cyl(.52,2.3,.95,.85,0,C.metal,'z',.52,24);t.cyl(.29,3.6,2.4,1.0,0,C.metal,'x',.29,28);
  for(let i=0;i<5;i++){const x=.9+i*.67;t.cyl(.48,.25,x,1.0,0,c,'x',.48,12);t.cyl(.34,.12,x+.18,1.0,0,C.foil,'x',.34,20);for(const s of [-1,1]){t.box(.42,.18,.18,x,1.0,s*.48,C.glass);link(t,[x-.18,1.0,s*.47],[x+.17,1.0,s*.47],.04,C.metal);}}
  H.engine(t,4.27,1.0,0,.40,.36,C.metal,-1);for(const s of [-1,1]){t.box(1.4,.8,.55,-1.1,.75,s*1.18,c);vent(t,-1.1,1.18,s*1.18,1.12,.42);link(t,[-1.2,.72,s*1.45],[.1,.45,s*1.45],.10,C.dark);link(t,[.1,.45,s*1.45],[.85,.8,s*.55],.10,C.dark);}t.box(.55,.38,.42,-.25,1.24,-.70,c);t.cyl(.12,.06,.06,1.27,-.70,C.glass,'x');const turret=part(t,'turret',[0,1.35,0]);marker(turret,[4.32,1.0,0]);
  for(const s of [-1,1]){cabinet(b,-2.8,.33,s*2.75,1.55,1.4,c);vent(b,-2.8,1.58,s*2.75,1.25,1.15);b.cyl(.43,1.5,-.90,1.1,s*3.3,C.metal);b.cyl(.38,.1,-.90,1.91,s*3.3,c);link(b,[-.90,.65,s*3.3],[0,.65,s*2.1],.12,C.dark);link(b,[-2.05,.7,s*2.75],[-1,.7,s*2.75],.09,C.dark);rail(b,[-4.2,s*4.35],[1.5,s*4.35],.33);}hatch(b,3.4,.39,2.9,.45,c);
  const g=finish('plasma_bastion',f,b,[turret]);g.userData.weaponVisual='segmented-plasma-barrel-and-cooling-pipes';g.userData.referenceUrl='https://www.nasa.gov/isam/';return g;
 }
 function canopy(b,c){const radius=3.2,y=1.05;for(const x of [-3.35,0,3.35]){b.add(new T.TorusGeometry(radius,.11,8,40,Math.PI),C.metal,[x,y,0],[0,Math.PI/2,0]);for(const s of [-1,1]){b.box(.28,.76,.28,x,.68,s*radius,c);b.box(.65,.13,.65,x,.40,s*radius,C.metal);}}
  // Roof strips cover the upper half only; both long sides and both ends remain open.
  for(let i=0;i<8;i++){const a=.22+i*(Math.PI-.44)/8,a2=.22+(i+1)*(Math.PI-.44)/8,p=[];const v=(x,theta,r)=>[x,y+Math.sin(theta)*r,-Math.cos(theta)*r];for(const r of [radius,radius+.09]){const a0=v(-3.38,a,r),a1=v(3.38,a,r),b0=v(-3.38,a2,r),b1=v(3.38,a2,r);if(r===radius)p.push(...a0,...a1,...b0,...a1,...b1,...b0);else p.push(...a0,...b0,...a1,...a1,...b0,...b1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.computeVertexNormals();b.add(geo,i%2?c:C.edge);}
  for(const a of [.22,Math.PI/2,Math.PI-.22])link(b,[-3.42,y+Math.sin(a)*radius,-Math.cos(a)*radius],[3.42,y+Math.sin(a)*radius,-Math.cos(a)*radius],.06,C.metal);
 }
 function repair(f){const {b,c}=base('repair_dome',f);b.box(6.6,.12,5.7,0,.39,0,C.edge);for(const s of [-1,1]){b.box(5.8,.025,.07,0,.47,s*1.6,C.orange);for(const x of [-2.5,2.5])b.box(.07,.025,3.2,x,.47,0,C.orange);}canopy(b,c);
  // Two braced articulated service arms sit within the shelter, leaving its centre lane open.
  for(const s of [-1,1]){const a=[-1.85,.85,s*2.43],e=[-1.6,2.7,s*2.1],w=[.35,2.15,s*1.35],tip=[.75,1.35,s*.9];b.cyl(.44,.42,a[0],.67,a[2],C.metal);link(b,a,e,.17,c);link(b,e,w,.13,c);link(b,w,tip,.11,c);for(const p of [a,e,w])b.cyl(.23,.40,...p,C.metal,'z',.23,20);link(b,[-1.8,1.06,s*2.6],[-1.65,2.36,s*2.28],.07,C.metal);link(b,[-1.66,2.37,s*2.29],[-1.6,2.69,s*2.25],.04,C.metal);b.sphere(.16,...tip,C.metal);for(const q of [-1,1]){link(b,tip,[1.02,1.25,s*.9+q*.22],.045,C.metal);link(b,[1.02,1.25,s*.9+q*.22],[1.28,1.25,s*.9+q*.12],.035,C.orange);}
    cabinet(b,-4.5,.33,s*2.15,1.25,1.15,c);link(b,[-4.5,.55,s*1.6],[-2.8,.55,s*1.6],.065,C.dark);link(b,[-2.8,.55,s*1.6],a,.065,C.dark);b.box(1.6,.65,.7,1.0,.75,s*4.25,c);vent(b,1.0,1.10,s*4.25,1.3,.5);for(let i=0;i<4;i++)b.box(.28,.44,.35,.4+i*.40,.70,s*4.85,C.white);}
  b.box(.17,1.2,1.25,4.4,.93,-3.7,c);b.box(.025,.50,.72,4.5,1.20,-3.7,C.glass);b.box(.6,.10,1.18,4.2,.63,-3.7,C.metal);hatch(b,4.2,.39,2.9,.38,c);const g=finish('repair_dome',f,b,[],true);marker(g,[1.28,1.25,0],'servicePoint');g.userData.referenceUrl='https://www.nasa.gov/isam/robotic-servicing-arm/';g.userData.supportVisual='open-repair-lane-under-half-arch';return g;
 }
 const make={sonar_bastion:sonar,aerospace_array:array,plasma_bastion:plasma,repair_dome:repair};for(const [kind,build]of Object.entries(make))for(const f of Object.keys(D.F))M.register(kind,f,()=>build(f));
})(globalThis);
