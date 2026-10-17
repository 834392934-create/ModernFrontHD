/* Original tactical roles; reference-informed silhouettes, not named equipment replicas.
 * +X forward. Geometry is merged by animated assembly with WarDetail PBR surfaces. */
(function(root){
 'use strict';
 const T=root.THREE,M=root.WarModels,Q=root.WarDetail,B=Q.Builder,D=root.WarData;
 const C={metal:0x58646a,dark:0x273138,rubber:0x202528,glass:0x325a70,cloth:0x4d5944,skin:0x887b64,white:0xbcc4c7,deck:0x525d61,gold:0xb09a64};
 const profiles={sniper_team:'prone-shooter-kneeling-tripod-observer',mobile_ciws:'six-wheel-autocannon-independent-search-radar',fleet_command_ship:'twin-hull-wide-bridge-communications',electronic_warfare_ship:'single-hull-distributed-ew-array-trusses'};
 function part(b,name){const p=b.finish();p.name=name;return p;}
 function mark(g,x,y,z,name='muzzle'){const m=new T.Object3D();m.name=name;m.position.set(x,y,z);g.add(m);}
 function plan(b,points,y,h,c,inset=.9,paint=0){const area=points.reduce((s,p,i)=>s+p[0]*points[(i+1)%points.length][1]-points[(i+1)%points.length][0]*p[1],0);b.prism(area<0?[...points].reverse():points,y,h,c,inset,paint);}
 function finish(kind,f,parts,scale,extra={}){const g=new T.Group();parts.forEach(p=>g.add(p));let count=0;g.traverse(p=>count+=p.userData.parts||0);g.userData={scale,parts:count,original:true,evidenceStatus:'original-role-variant',designRole:D.U[kind]?.role||kind,profile:profiles[kind]+'-'+f+'-v2',detailPass:2,modelFamily:kind,fiction:f==='imp',...extra};return g;}
 function hatch(b,x,y,z,r,c){b.cyl(r,.06,x,y,z,C.dark);b.cyl(r*.9,.07,x,y+.04,z,c);Q.link(b,[x-.12,y+.1,z],[x+.12,y+.1,z],.02,C.metal);}
 function vent(b,x,y,z,w,d){b.box(w,.045,d,x,y,z,C.dark);for(let i=0;i<8;i++)b.box(w*.9,.018,.025,x,y+.031,z-d*.4+i*d*.8/7,C.metal);}
 function aerial(b,x,y,z,h){b.cyl(.055,.2,x,y+.1,z,C.metal);b.cyl(.018,h,x,y+.2+h/2,z,C.dark,'y',.008,8);}
 function optic(b,x,y,z,r){b.sphere(r,x,y,z,C.dark);b.cyl(r*.69,.025,x+r*.84,y,z,C.metal,'x',r*.69,20);b.cyl(r*.53,.03,x+r*.9,y,z,C.glass,'x',r*.53,20);}
 function boltedPanel(b,x,y,z,w,h,c){b.box(w,h,.045,x,y,z,C.dark);b.box(w*.94,h*.88,.05,x,y,z+.025,c);for(const sx of [-1,1])for(const sy of [-1,1])b.cyl(.022,.025,x+sx*w*.4,y+sy*h*.35,z+.065,C.metal,'z',.022,6);}
 function nationalDetail(b,f,x,y,z,c){
  // Small attached fittings distinguish faction finishes; the role silhouette stays honest.
  b.box(.48,.12,.4,x,y+.06,z,c);
  if(f==='imp'){b.box(.32,.055,.25,x,y+.14,z,C.gold);for(const side of [-1,1])Q.link(b,[x-.14,y+.18,z+side*.14],[x+.12,y+.35,z+side*.14],.035,C.gold);}
  else if(f==='rus'){b.cyl(.12,.15,x,y+.2,z,C.metal);b.cyl(.1,.025,x,y+.29,z,C.glass);}
  else if(f==='chn'||f==='kor'){for(const s of [-1,1])optic(b,x+.15,y+.19,z+s*.11,.08);}
  else aerial(b,x,y+.12,z,.35);
 }
 function glove(b,p){b.sphere(.047,...p,C.rubber,[1.12,.78,.85]);for(let i=0;i<3;i++)Q.link(b,[p[0]+.015,p[1]-.015,p[2]-.025+i*.024],[p[0]+.055,p[1]-.018,p[2]-.025+i*.024],.009,C.rubber,.009,6);}
 function boot(b,x,y,z){b.sphere(.12,x,y,z,C.rubber,[1.2,.58,.68]);b.add(Q.bevelBox(.25,.035,.16,.012),C.rubber,[x+.025,y-.06,z]);}
 function head(b,x,y,z,c,tilt=0){
  b.cyl(.052,.11,x-.018,y-.125,z,C.skin);b.sphere(.118,x,y,z,C.skin,[.88,1.12,.83]);b.sphere(.023,x+.108,y-.015,z,C.skin,[1,.8,.7]);
  b.add(new T.SphereGeometry(.137,20,12,0,Math.PI*2,0,Math.PI*.59),c,[x-.015,y+.06,z],[0,0,tilt],[1,.8,1]);
  b.add(new T.TorusGeometry(.122,.012,6,24),C.dark,[x-.015,y+.032,z],[Math.PI/2,0,0],[1,1,.88]);
  for(const s of [-1,1]){b.sphere(.034,x-.01,y,z+s*.108,C.dark);Q.link(b,[x,y-.015,z+s*.105],[x+.04,y-.09,z+s*.045],.008,C.dark,.008,6);}
 }
 function sniper(f){const b=new B(),c=M.colors[f];
  // Prone adult: long torso/legs, small helmet, elbows planted below the rifle.
  b.sphere(.25,-.78,.27,-.52,C.cloth,[1.4,.55,.88]);b.sphere(.24,-.4,.34,-.52,C.cloth,[1.15,.62,.9]);b.sphere(.2,-1.08,.23,-.52,C.cloth,[1.1,.58,1]);
  for(const s of [-1,1]){const knee=[-1.58,.15,-.52+s*.23],ankle=[-2.08,.12,-.52+s*.29];Q.link(b,[-1.12,.23,-.52+s*.14],knee,.095,C.cloth,.108);Q.link(b,knee,ankle,.068,C.cloth,.085);b.sphere(.08,...knee,C.cloth);boot(b,-2.16,.1,ankle[2]);}
  b.add(Q.bevelBox(.42,.12,.35,.03),C.cloth,[-.73,.45,-.52]);for(const s of [-1,1])Q.link(b,[-.93,.47,-.52+s*.14],[-.33,.45,-.52+s*.15],.018,C.dark);
  head(b,-.1,.55,-.52,c,.13);
  for(const s of [-1,1]){const elbow=[-.12,.12,-.52+s*.37],hand=[s===1?.28:.65,.4,-.39];Q.link(b,[-.4,.35,-.52+s*.21],elbow,.076,C.cloth,.083);b.sphere(.075,...elbow,C.cloth);Q.link(b,elbow,hand,.055,C.cloth,.068);glove(b,hand);}
  const wz=-.39,wy=.46;
  b.box(.37,.085,.085,-.04,wy,wz,c);b.box(.33,.09,.08,.31,wy,wz,C.dark);b.box(.39,.075,.085,.67,wy,wz,C.dark);b.box(.055,.13,.065,.29,wy-.09,wz,C.dark);
  Q.link(b,[.84,wy,wz],[1.57,wy,wz],.025,C.metal,.022,20);b.cyl(.039,.18,1.61,wy,wz,C.metal,'x',.039,20);b.cyl(.026,.025,1.715,wy,wz,C.dark,'x',.026,16);
  for(const x of [.25,.56]){b.box(.06,.075,.075,x,wy+.07,wz,C.metal);b.cyl(.047,.055,x,wy+.14,wz,C.dark,'x');}b.cyl(.048,.48,.44,wy+.14,wz,C.dark,'x',.063,20);b.cyl(.049,.02,.69,wy+.14,wz,C.glass,'x');
  for(const s of [-1,1]){Q.link(b,[.91,wy-.025,wz],[1.03,.055,wz+s*.23],.016,C.metal);b.box(.095,.035,.07,1.03,.035,wz+s*.23,C.rubber);}
  // Observer kneels with his head at the eyepiece; hands and scope meet.
  const x=-.63,z=.73;for(const s of [-1,1]){const knee=[x+(s===1?.3:-.2),.16,z+s*.14],ankle=[x+(s===1?.21:-.47),.11,z+s*.15];Q.link(b,[x,.5,z+s*.12],knee,.095,C.cloth,.105);Q.link(b,knee,ankle,.065,C.cloth,.088);b.sphere(.084,...knee,C.cloth);boot(b,ankle[0]+.06,.085,ankle[2]);}
  b.sphere(.23,x,.58,z,C.cloth,[.7,.65,.95]);b.sphere(.245,x+.065,.83,z,C.cloth,[.7,1.04,.91]);b.add(Q.bevelBox(.12,.28,.31,.03),C.cloth,[x-.1,.8,z]);head(b,x+.19,1.15,z,c,-.1);
  const scopeX=.16,scopeY=1.135;Q.link(b,[scopeX,.08,z],[scopeX,scopeY-.1,z],.025,C.metal);for(const [dx,dz]of [[-.28,-.25],[-.28,.25],[.33,0]]){Q.link(b,[scopeX,.68,z],[scopeX+dx,.035,z+dz],.018,C.metal);b.box(.08,.035,.06,scopeX+dx,.02,z+dz,C.rubber);}
  b.cyl(.082,.65,scopeX,scopeY,z,C.dark,'x',.11,24);b.cyl(.084,.025,scopeX+.34,scopeY,z,C.glass,'x');b.cyl(.048,.15,scopeX-.4,scopeY,z,C.rubber,'x');
  for(const s of [-1,1]){const elbow=[x+.18,.75,z+s*.3],hand=[scopeX-.08,scopeY-.06,z+s*.08];Q.link(b,[x+.04,.99,z+s*.21],elbow,.075,C.cloth,.083);Q.link(b,elbow,hand,.054,C.cloth,.064);glove(b,hand);}
  b.add(Q.bevelBox(.46,.17,.28,.025),c,[-1.16,.11,1.1]);b.box(.22,.025,.15,-1.16,.21,1.1,C.dark);Q.link(b,[-1.3,.23,1.1],[-1.02,.23,1.1],.02,C.metal);aerial(b,-1.3,.2,1.12,.26);
  const team=part(b,'turret');mark(team,1.73,wy,wz);return finish('sniper_team',f,[team],5.7,{squadMembers:2,personnelFamily:'infantry',poses:['prone','kneeling']});
 }
 function mobile(f){const b=new B(),t=new B(),r=new B(),c=M.colors[f];
  plan(b,[[-3.2,-1.2],[2.15,-1.2],[3.15,-.85],[3.15,.85],[2.15,1.2],[-3.2,1.2]],.7,.82,c,.93,1);b.box(5.9,.22,2.1,-.05,.64,0,C.metal);
  for(const side of [-1,1]){for(const x of [-2.15,0,2.15]){Q.tire(b,x,side*1.24,.6,c);b.box(1.4,.12,.34,x,1.27,side*1.13,c);}for(const x of [-2.55,-1.55,-.55])boltedPanel(b,x,1.3,side*1.19,.75,.3,c);b.box(.13,.18,.25,3.05,1.19,side*.73,C.white);b.box(.1,.16,.21,-3.23,1.11,side*.8,0x915e4d);b.box(.65,.08,.3,1.85,.77,side*1.22,C.metal);Q.link(b,[-2.9,1.55,side*1.04],[.85,1.55,side*1.04],.025,C.metal);}
  plan(b,[[1.1,-1.05],[2.75,-.85],[3.05,-.6],[3.05,.6],[2.75,.85],[1.1,1.05]],1.45,.55,c,.82,1);
  for(const s of [-1,1]){b.box(.045,.28,.51,2.95,1.78,s*.34,C.glass,[0,0,.3]);b.box(.65,.27,.035,1.91,1.78,s*.947,C.glass,[s*.33,0,0]);Q.link(b,[2.44,1.96,s*.83],[2.44,2.02,s*1.34],.023,C.metal);b.box(.09,.21,.18,2.44,1.95,s*1.35,C.dark);}
  hatch(b,1.45,2.02,0,.29,c);vent(b,-2.42,1.59,0,1.0,1.5);b.cyl(.75,.14,-.42,1.56,0,C.metal);aerial(b,-2.9,1.57,-.92,.65);
  // Compact high-elevation cannon station; this is an original role, not a Skyranger copy.
  t.cyl(.71,.18,0,.04,0,C.metal);plan(t,[[-.85,-.77],[.5,-.77],[.95,-.35],[.95,.35],[.5,.77],[-.85,.77]],.12,.72,c,.82,1);
  t.cyl(.31,1.35,.48,.64,0,C.metal,'z',.31,24);t.box(.5,.42,.49,.69,.7,0,c);Q.link(t,[.73,.74,0],[2.8,1.15,0],.082,C.metal,.063,24);Q.link(t,[2.65,1.12,0],[2.98,1.185,0],.112,C.metal,.095,24);Q.link(t,[2.98,1.185,0],[3.0,1.189,0],.063,C.dark,.063,20);
  for(const s of [-1,1]){boltedPanel(t,-.27,.51,s*.74,.74,.4,c);t.box(.6,.22,.39,-.5,.94,s*.54,c);}optic(t,.5,1.03,-.54,.2);t.box(.39,.42,.1,-.77,.68,0,C.dark);nationalDetail(t,f,-.5,1.07,0,c);
  // Radar pivot has a real support column. Only its panel assembly rotates.
  b.cyl(.24,.18,-1.92,1.65,0,C.metal);b.cyl(.12,1.4,-1.92,2.4,0,c);for(const s of [-1,1])Q.link(b,[-2.25,1.6,s*.42],[-1.92,2.85,0],.045,C.metal);
  r.cyl(.15,.15,0,0,0,C.metal);r.box(.18,.65,.18,0,.34,0,c);r.box(.14,.65,1.65,0,.68,0,c);r.box(.035,.54,1.5,.092,.68,0,C.dark);for(const z of [-.66,-.33,0,.33,.66])r.box(.045,.49,.025,.12,.68,z,C.metal);for(const s of [-1,1])Q.link(r,[-.1,.08,0],[-.1,.61,s*.72],.032,C.metal);
  const gun=part(t,'turret');gun.position.set(-.42,1.68,0);mark(gun,3.02,1.193,0);const radar=part(r,'radar');radar.position.set(-1.92,3.11,0);return finish('mobile_ciws',f,[part(b,'sixWheelHull'),gun,radar],6.2,{axles:3});
 }
 function hull(b,L,w,deck,z,c){
  const stations=[[-.5,.74],[-.43,.94],[-.25,1],[0,1],[.23,.86],[.38,.5],[.48,.16],[.51,.008]],section=[[-.86,deck],[-1,deck-.27],[-.92,-.2],[-.6,-.77],[0,-.98],[.6,-.77],[.92,-.2],[1,deck-.27],[.86,deck]],positions=[],indices=[],n=section.length;
  for(let j=0;j<stations.length;j++){const [sx,wide]=stations[j];for(const [sz,y]of section)positions.push(sx*L-(j>5?.45*(deck-y)/(deck+.98):0),y,z+sz*w*wide);}
  for(let j=0;j<stations.length-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,k=a+n;indices.push(a,k,a+1,k,k+1,a+1);}for(let i=1;i<n-1;i++)indices.push(0,i+1,i);const base=(stations.length-1)*n;for(let i=1;i<n-1;i++)indices.push(base,base+i,base+i+1);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();b.add(geo,c);
  const outline=[...stations.map(([x,v])=>[x*L,z-v*w*.86]),...stations.map(([x,v])=>[x*L,z+v*w*.86]).reverse()];plan(b,outline,deck-.025,.07,C.deck,1);
  for(let i=0;i<outline.length;i++){const a=outline[i],q=outline[(i+1)%outline.length];Q.link(b,[a[0],deck+.07,a[1]],[q[0],deck+.07,q[1]],.025,c);}
  for(const s of [-1,1]){Q.link(b,[-L*.4,-.25,z+s*w*.85],[L*.18,-.25,z+s*w*.85],.035,C.dark);for(let x=-L*.4;x<L*.22;x+=.8){b.cyl(.014,.35,x,deck+.22,z+s*w*.85,C.metal,'y',.014,6);}Q.link(b,[-L*.4,deck+.39,z+s*w*.85],[L*.22,deck+.39,z+s*w*.85],.015,C.metal);for(const x of [-L*.37,L*.25]){b.cyl(.055,.18,x,deck+.1,z+s*w*.65,C.metal);b.box(.32,.035,.14,x,deck+.2,z+s*w*.65,C.metal);}}
 }
 function bridge(b,x,y,z,l,w,h,c){
  plan(b,[[x-l*.5,z-w],[x+l*.4,z-w],[x+l*.5,z-w*.6],[x+l*.5,z+w*.6],[x+l*.4,z+w],[x-l*.5,z+w]],y,h,c,.84);
  plan(b,[[x-l*.51,z-w*.91],[x+l*.5,z-w*.91],[x+l*.5,z+w*.91],[x-l*.51,z+w*.91]],y+h,.08,c,.99);
  const windowT=(h-.3)/h,sideZ=w*(1-.16*windowT),doorZ=w*(1-.16*.4/h),sideSlope=Math.atan(.16*w/h),frontX=x+l*(.5-(.5-2/15)*.16*windowT),frontSlope=Math.atan(l*(.5-2/15)*.16/h);
  for(const s of [-1,1]){for(let i=0;i<5;i++)b.box(l*.13,.32,.025,x-l*.31+i*l*.15,y+h-.3,z+s*(sideZ+.016),C.glass,[-s*sideSlope,0,0]);b.box(.36,.72,.03,x-l*.33,y+.4,z+s*(doorZ+.018),C.dark,[-s*sideSlope,0,0]);b.box(.29,.65,.025,x-l*.33,y+.4,z+s*(doorZ+.04),c,[-s*sideSlope,0,0]);}
  for(let i=0;i<5;i++)b.box(.025,.33,w*.25,frontX+.016,y+h-.3,z+(i-2)*w*.29,C.glass,[0,0,frontSlope]);return y+h+.08;
 }
 function dome(b,x,y,z,r){b.cyl(r*.66,r*.5,x,y+r*.25,z,C.white,'y',r*.78,24);b.sphere(r,x,y+r*.86,z,C.white,[1,.88,1]);for(const s of [-1,1])Q.link(b,[x-r*.5,y,z+s*r*.5],[x,y+r*.28,z],.035,C.metal);}
 function truss(b,x,y,z,h,w){
  for(const sx of [-1,1])for(const sz of [-1,1])Q.link(b,[x+sx*w,y,z+sz*w],[x+sx*w*.42,y+h,z+sz*w*.42],.055,C.metal);
  for(let i=0;i<3;i++){const t=i/3,yy=y+h*t,ww=w*(1-.58*t),yn=y+h*(t+1/3),wn=w*(1-.58*(t+1/3));for(const s of [-1,1]){Q.link(b,[x-ww,yy,z+s*ww],[x+wn,yn,z+s*wn],.028,C.metal);Q.link(b,[x+s*ww,yy,z-ww],[x+s*wn,yn,z+wn],.028,C.metal);}}
  b.box(w*.94,.12,w*.94,x,y+h,z,C.metal);
 }
 function ship(kind,f){const b=new B(),c=new T.Color(M.colors[f]).lerp(new T.Color(C.white),.58).getHex(),command=kind==='fleet_command_ship',moving=[],deck=1.1;
  if(command){
   // Two separated hulls and a transverse bridge are the primary readable silhouette.
   for(const s of [-1,1])hull(b,20,1.05,deck,s*2.12,c);
   plan(b,[[-7,-2.85],[5.7,-2.85],[6.9,-1.8],[6.9,1.8],[5.7,2.85],[-7,2.85]],.84,.58,c,.98);plan(b,[[-6.5,-2.7],[5.4,-2.7],[6.3,-1.8],[6.3,1.8],[5.4,2.7],[-6.5,2.7]],1.42,.045,C.deck,1);
   for(const x of [-5.8,-2.5,1,4.5])b.box(.36,.4,5.6,x,.75,0,C.metal);
   const top=bridge(b,2,1.48,0,5.2,2.22,1.48,c);b.box(5.3,.08,4.38,1.95,top+.03,0,c);for(const s of [-1,1]){dome(b,.9,top+.07,s*1.35,.56);vent(b,-3.9,1.51,s*1.75,1.8,.6);b.box(1.6,.65,.8,-4.1,1.8,s*1.75,c);for(let i=0;i<4;i++)b.box(.9,.025,.035,-4.1,2.14,s*1.75-.23+i*.15,C.dark);aerial(b,-5.8,1.48,s*2.16,1.65);for(let i=0;i<3;i++)b.cyl(.15,.55,-5.1+i*.62,1.65,s*2.35,C.white,'x',.15,16);}
   truss(b,-1.6,1.48,0,3.75,.7);const rr=new B();rr.box(.16,.15,2.15,0,.03,0,C.metal);rr.box(.12,.4,1.75,.02,.26,0,C.dark);for(const s of [-1,1])Q.link(rr,[0,-.1,0],[0,.2,s*.9],.028,C.metal);const radar=part(rr,'radar');radar.position.set(-1.6,5.32,0);moving.push(radar);
   for(const s of [-1,1]){Q.link(b,[-1.6,4.4,s*.3],[-1.6,4.4,s*1.05],.04,C.metal);b.cyl(.1,.56,-1.6,4.7,s*1.05,C.white);b.cyl(.05,.65,-1.6,5.15,s*1.05,C.metal);}nationalDetail(b,f,3.8,top+.08,0,c);hatch(b,-3.1,1.52,0,.4,c);
   // Broad aft operations deck has floor marking and tied-down cases, no VLS or guns.
   for(const s of [-1,1])Q.link(b,[-6.6,1.5,s*1.1],[-2.8,1.5,s*1.1],.018,C.white);b.box(.04,.025,2.2,-6.6,1.51,0,C.white);b.box(.04,.025,2.2,-2.8,1.51,0,C.white);
  }else{
   hull(b,24,2.6,deck,0,c);const top=bridge(b,5.1,1.16,0,4.1,1.72,1.58,c);nationalDetail(b,f,5.8,top,0,c);dome(b,4.1,top,0,.43);
   // Large distributed EW faces are mounted to load-bearing sponsons and visible trusses.
   for(const x of [-5.1,.7]){
    b.box(2.1,.55,2.7,x,1.4,0,c);vent(b,x,1.71,0,1.8,1.85);truss(b,x,1.71,0,2.75,.62);
    for(const s of [-1,1]){const z=s*1.98;b.box(2.5,.22,1.1,x,1.8,z,c);for(const xx of [-.82,.82]){Q.link(b,[x+xx,1.45,s*.94],[x+xx,2.24,z],.065,C.metal);Q.link(b,[x+xx,2.17,s*.58],[x+xx,2.95,z],.055,C.metal);}b.box(2.28,1.05,.22,x,2.61,z,c,[s*-.1,0,0]);b.box(2.05,.86,.055,x,2.61,z+s*.145,C.dark,[s*-.1,0,0]);for(let i=0;i<5;i++)b.box(.028,.78,.035,x-.8+i*.4,2.61,z+s*.18,C.metal,[s*-.1,0,0]);}
    b.cyl(.2,.23,x,4.58,0,C.metal);b.cyl(.34,.55,x,4.93,0,C.white);b.sphere(.34,x,5.2,0,C.white,[1,.45,1]);for(const s of [-1,1]){Q.link(b,[x,4.0,0],[x,4.0,s*1.03],.045,C.metal);b.cyl(.1,.77,x,4.39,s*1.03,C.dark);b.cyl(.06,.3,x,4.94,s*1.03,C.metal);}
   }
   for(const s of [-1,1]){b.box(1.3,.67,.7,-9,1.45,s*1.35,c);b.cyl(.18,.65,-9,2.02,s*1.35,C.metal);b.cyl(.14,.025,-9,2.36,s*1.35,C.dark);aerial(b,2.7,1.18,s*2,1.1);for(let i=0;i<3;i++)b.cyl(.14,.5,-7.3+i*.58,1.33,s*2.02,C.white,'x',.14,16);}hatch(b,8.5,1.18,0,.34,c);
  }
  const g=finish(kind,f,[part(b,command?'twinHullCommandVessel':'distributedEWVessel'),...moving],command?4.7:4.6,{unarmed:true,hullType:command?'catamaran-command':'single-hull-ew'});mark(g,command?-1.6:.7,command?4.7:4.9,0,'servicePoint');return g;
 }
 for(const f of Object.keys(D.F)){M.register('sniper_team',f,()=>sniper(f));M.register('mobile_ciws',f,()=>mobile(f));for(const k of ['fleet_command_ship','electronic_warfare_ship'])M.register(k,f,()=>ship(k,f));}
})(globalThis);
