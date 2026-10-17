/* Original altitude-wave role art. +X forward; dimensions are art-space proportions.
 * Licensed third-party assets are not used. WarDetail batches every static assembly. */
(function(root){
 'use strict';
 const T=root.THREE,M=root.WarModels,H=root.WarDetail,D=root.WarData,B=H.Builder;
 const C={metal:0x58646a,dark:0x202528,glass:0x325a70,white:0xbcc4c7,foil:0xb09a64,orange:0xc18d49,solar:0x263e69};
 const profiles={assault_gun:'low-tracked-casemate-short-gun',mobile_radar:'eight-wheel-three-panel-folding-array',asw_patrol_ship:'narrow-patrol-aft-sonar-a-frame-torpedo',missile_sub:'long-missile-spine-double-vls',high_altitude_interceptor:'slender-twin-engine-tall-tails',strategic_strike_aircraft:'broad-delta-four-engine-ventral-bay',orbital_carrier:'broad-capital-dual-gun-pod-long-arrays',orbital_sensor:'three-face-warning-mast-aft-solar'};
 const reference={assault_gun:'https://www.army.mil/article/275419',mobile_radar:'https://lockheedmartin.com/en-us/products/tpq-53.html',asw_patrol_ship:'https://www.kongsberg.com/what-we-do/defence-and-security/naval/st2400/',missile_sub:'https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169613/guided-missile-submarines-ssgn/',high_altitude_interceptor:'https://www.nasa.gov/image-article/sr-71/',strategic_strike_aircraft:'https://www.nasa.gov/aeronautics/x-48b/',orbital_carrier:'https://www.esa.int/ESA_Multimedia/Images/2016/07/Shaker_test_of_radiator_panel',orbital_sensor:'https://lockheedmartin.com/en-us/products/tpq-53.html'};
 function col(f,dark=false){return new T.Color(M.colors[f]).lerp(new T.Color(dark?0x293a40:0x77828a),dark?.62:.30).getHex();}
 function link(b,a,z,r=.04,c=C.metal){H.link(b,a,z,r,c);}
 function plan(b,p,y,h,c,inset=.94){const a=p.reduce((v,q,i)=>v+q[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*q[1],0);b.prism(a<0?[...p].reverse():p,y,h,c,inset);}
 function mark(g,p,name='muzzle'){const m=new T.Object3D();m.name=name;m.position.set(...p);g.add(m);}
 function part(b,name,p=[0,0,0]){const m=b.finish();m.name=name;m.position.set(...p);return m;}
 function finish(kind,f,b,scale,moving=[],unarmed=false){const g=new T.Group();g.add(part(b,'body'),...moving);let count=0;g.traverse(o=>count+=o.userData.parts||0);g.userData={scale,parts:count,original:true,evidenceStatus:'original-role-variant',detailPass:2,profile:profiles[kind]+'-'+f+'-v2',modelFamily:kind,designRole:D.U[kind]?.role||kind,fiction:kind.startsWith('orbital_')||f==='imp',referenceUrl:reference[kind],referenceUse:'Public role/structural inspiration only. Not a reproduction of a real platform.',unarmed};return g;}
 function hatch(b,x,y,z,r,c){b.cyl(r,.045,x,y,z,C.dark);b.cyl(r*.89,.05,x,y+.025,z,c);link(b,[x-r*.4,y+.06,z],[x+r*.4,y+.06,z],.018);}
 function ident(b,f,x,y,z){for(let i=0;i<1+Object.keys(D.F).indexOf(f)%3;i++)b.box(.08,.025,.26,x+i*.14,y,z,f==='imp'?C.foil:C.white);}
 function vent(b,x,y,z,w,d){b.box(w,.04,d,x,y,z,C.dark);for(let i=0;i<7;i++)b.box(w*.90,.02,.035,x,y+.03,z-d*.4+i*d*.8/6,C.metal);}
 function ring(b,p,r,c=C.metal,rot=[0,Math.PI/2,0],tube=.05){b.add(new T.TorusGeometry(r,tube,8,28),c,p,rot);}
 function lens(b,x,y,z,r=.12){b.cyl(r,.05,x,y,z,C.metal,'x',r,16);b.cyl(r*.73,.025,x+.037,y,z,C.glass,'x',r*.73,16);}
 function cannon(b,x,y,z,l,r,c){b.cyl(r*1.7,.38,x,y,z,c,'x',r*1.7,24);b.cyl(r,l,x+l*.5,y,z,C.metal,'x',r,24);H.engine(b,x+l+.015,y,z,r*1.35,.19,C.metal,-1);}
 function tracks(b,c){for(const s of [-1,1]){const z=s*1.46;b.box(5.75,.12,.61,0,.10,z,C.dark);b.box(5.75,.12,.61,0,1.08,z,C.dark);for(const x of [-2.8,2.8])b.cyl(.51,.62,x,.59,z,C.dark,'z',.51,24);for(let i=0;i<6;i++){const x=-2.35+i*.94;b.cyl(.41,.65,x,.54,z,c,'z',.41,20);b.cyl(.23,.69,x,.54,z,C.metal,'z',.23,14);b.cyl(.10,.72,x,.54,z,c,'z',.10,10);}for(let i=0;i<23;i++){const x=-2.82+i*.255;for(const yy of [.027,1.15])b.box(.15,.055,.65,x,yy,z,C.metal);}for(const x of [-2.8,2.8])for(let i=0;i<10;i++){const a=(x>0?-Math.PI/2:Math.PI/2)+i*Math.PI/9;b.box(.16,.06,.65,x+Math.cos(a)*.53,.59+Math.sin(a)*.53,z,C.metal,[0,0,a-Math.PI/2]);}for(let i=0;i<4;i++)b.box(1.28,.39,.13,-2.0+i*1.33,1.22,s*1.77,c);}}
 function assault(f){const b=new B(),gun=new B(),c=col(f);tracks(b,c);
  plan(b,[[-3.15,-1.3],[2.5,-1.3],[3.25,-.86],[3.25,.86],[2.5,1.3],[-3.15,1.3]],.72,.70,c,.9);
  plan(b,[[-1.65,-1.12],[1.25,-1.12],[1.92,-.68],[1.92,.68],[1.25,1.12],[-1.65,1.12]],1.27,.73,c,.78);
  for(const s of [-1,1]){b.box(.10,.18,.24,3.16,1.15,s*.78,C.white);b.box(.12,.12,.22,-3.19,1.0,s*.85,0x87584e);link(b,[-2.9,1.46,s*.91],[-1.6,1.46,s*.91],.03);b.box(.55,.23,.32,-2.6,1.53,s*.86,c);b.box(.57,.12,.34,1.58,1.37,s*1.0,c);}
  vent(b,-2.37,1.47,0,1.05,1.55);hatch(b,-.69,2.03,-.48,.31,c);hatch(b,-.66,2.03,.46,.27,c);lens(b,.64,1.96,-.62,.13);b.cyl(.023,1.1,-1.18,2.5,.72,C.metal,'y',.009,8);ident(b,f,-.35,2.02,.4);
  gun.box(.45,.46,.65,0,0,0,c);cannon(gun,.18,0,0,1.75,.22,c);gun.cyl(.25,.18,1.45,0,0,c,'x',.25,24);const m=part(gun,'turret',[1.70,1.68,0]);mark(m,[1.96,0,0]);const g=finish('assault_gun',f,b,6.4,[m]);g.userData.weaponVisual='short-heavy-assault-barrel';return g;
 }
 function radarTruck(f){const b=new B(),r=new B(),c=col(f);b.box(8.0,.32,2.25,-.2,.82,0,C.metal);for(const s of [-1,1])for(const x of [-3.05,-1.55,1.25,2.75]){H.tire(b,x,s*1.26,.61,c);b.box(1.3,.10,.38,x,1.27,s*1.15,c);}b.box(5.2,.20,2.3,-1.55,1.1,0,c);
  plan(b,[[1.25,-1.15],[3.65,-1.1],[4.0,-.65],[4.0,.65],[3.65,1.1],[1.25,1.15]],1.08,1.5,c,.87);
  for(const s of [-1,1]){b.box(.045,.50,.69,3.85,2.18,s*.43,C.glass,[0,0,.16]);b.box(1.02,.48,.035,2.43,2.19,s*1.055,C.glass,[-s*.10,0,0]);b.box(.55,.64,.025,1.82,1.65,s*1.12,C.dark);b.box(.48,.56,.026,1.82,1.65,s*1.14,c);b.box(.15,.035,.03,1.74,1.81,s*1.17,C.metal);link(b,[3.4,2.42,s*1.02],[3.48,2.40,s*1.48],.025);b.box(.09,.24,.17,3.48,2.30,s*1.48,C.dark);b.box(.05,.15,.24,4.0,1.42,s*.78,C.white);b.box(.8,.07,.28,2.12,.98,s*1.25,C.metal);}
  b.box(.13,.28,1.65,4.00,1.13,0,C.dark);b.box(1.65,1.1,2.0,-2.75,1.73,0,c);vent(b,-2.75,2.31,0,1.3,1.5);
  for(const x of [-3.3,.4])for(const s of [-1,1]){b.box(.31,.28,.65,x,1.12,s*1.4,c);b.cyl(.07,.72,x,.76,s*1.65,C.metal);b.box(.43,.08,.4,x,.36,s*1.65,C.dark);}
  b.cyl(.65,.20,-.75,1.38,0,C.metal);b.cyl(.22,1.2,-.75,2.03,0,c);for(const s of [-1,1])link(b,[-.75,1.5,s*.60],[-.75,2.53,0],.06);
  // Three hinged panel leaves are deployed; hinge cylinders and rear triangular braces are visible.
  for(let i=-1;i<=1;i++){const z=i*1.03;r.box(.19,1.65,.98,0,.72,z,c);r.box(.035,1.47,.84,.12,.72,z,C.dark);for(let row=0;row<5;row++)for(let cell=0;cell<3;cell++)r.box(.025,.18,.17,.145,.15+row*.28,z-.27+cell*.27,C.metal);for(const zz of [z-.48,z+.48])r.cyl(.045,1.62,-.025,.72,zz,C.metal);link(r,[-.3,-.02,z],[-.11,1.44,z],.04);}
  r.cyl(.22,.18,0,-.1,0,C.metal);r.box(.44,.15,2.97,-.10,-.13,0,c);const array=part(r,'radar',[-.75,2.58,0]);ident(b,f,1.65,2.61,0);const g=finish('mobile_radar',f,b,5.4,[array],true);g.userData.supportVisual='three-hinged-array-leaves';return g;
 }
 function hull(b,c,L=17,w=1.8,deck=1){
  const curve=[[-.5,.72],[-.42,1],[-.15,1],[.15,.90],[.32,.65],[.44,.29],[.51,.01]],outline=[...curve.map(([x,v])=>[x*L,-v*w]),...curve.slice().reverse().map(([x,v])=>[x*L,v*w])],n=outline.length;
  // Four longitudinal loft rings form a tapered chine and narrow keel, with a raked bow.
  const levels=[{y:-1.15,wide:.055,len:.78},{y:-.65,wide:.53,len:.88},{y:.05,wide:.91,len:.98},{y:deck-.1,wide:.97,len:1}],verts=[],idx=[];
  for(const level of levels)for(const [x,z]of outline)verts.push(x*level.len,level.y,z*level.wide);
  for(let row=0;row<levels.length-1;row++)for(let i=0;i<n;i++){const j=(i+1)%n,a=row*n+i,d=row*n+j,k=a+n,v=d+n;idx.push(a,k,v,a,v,d);}
  for(let i=1;i<n-1;i++)idx.push(0,i,i+1);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();b.add(g,c);
  plan(b,outline.map(([x,z])=>[x,z*.97]),deck-.1,.09,0x525d61,1);
  // Dark narrow keel strip stays below the chines rather than a vertical slab.
  link(b,[-L*.36,-1.145,0],[L*.34,-1.145,0],.045,C.dark);
  for(const side of [-1,1]){for(let x=-L*.4;x<L*.22;x+=.85)b.cyl(.018,.35,x,deck+.16,side*w*.89,C.metal,'y',.018,6);link(b,[-L*.4,deck+.34,side*w*.89],[L*.22,deck+.34,side*w*.89],.018);}
 }
 function asw(f){const b=new B(),c=col(f);hull(b,c);const y=1.0;
  plan(b,[[-1.8,-1.19],[1.8,-1.19],[2.2,-.7],[2.2,.7],[1.8,1.19],[-1.8,1.19]],y,1.35,c,.82);
  for(const s of [-1,1]){for(let i=0;i<5;i++)b.box(.42,.3,.03,-1.25+i*.62,2.0,s*1.03,C.glass);for(let i=0;i<3;i++)b.box(.03,.29,.38,2.04,2.0,(i-1)*.47,C.glass);b.box(.45,.82,.025,-1.15,1.45,s*1.13,C.dark);b.box(.38,.74,.028,-1.15,1.45,s*1.15,c);}
  b.box(3.85,.10,2.14,.10,2.4,0,c);b.cyl(.12,2.15,-.55,3.5,0,C.metal);for(const s of [-1,1])link(b,[-1.1,2.45,s*.6],[-.55,4.32,0],.045);b.box(.16,.35,1.55,-.55,4.58,0,C.dark);b.cyl(.35,.26,.70,2.62,0,C.white);b.sphere(.35,.70,2.80,0,C.white,[1,.7,1]);
  // Twin bow torpedo banks face clear water beside the narrow bow.
  for(const s of [-1,1]){b.box(2.5,.16,.7,4.45,1.15,s*1.35,C.metal);for(const zz of [-.20,.20]){b.cyl(.18,2.2,4.55,1.43,s*1.35+zz,c,'x',.18,20);H.engine(b,5.67,1.43,s*1.35+zz,.18,.18,C.metal,-1);}b.box(1.05,.55,.7,-2.8,1.30,s*.83,c);vent(b,-2.8,1.60,s*.83,.8,.45);}
  // Working stern: drum with cable grooves and an attached A-frame above the ramp.
  b.box(2.0,.17,2.1,-5.3,1.07,0,C.metal);b.cyl(.66,1.45,-5.3,1.85,0,C.dark,'z',.66,28);for(const s of [-1,1]){b.cyl(.75,.11,-5.3,1.85,s*.79,c,'z',.75,28);b.box(.18,.94,.18,-5.3,1.48,s*.99,C.metal);link(b,[-6.45,1.0,s*1.2],[-7.1,3.05,s*.85],.10,c);}link(b,[-7.1,3.05,-.85],[-7.1,3.05,.85],.11,c);for(let i=0;i<7;i++)ring(b,[-5.3,1.85,-.59+i*.197],.67,C.metal,[0,0,0],.018);link(b,[-5.3,2.55,0],[-7.1,3.02,0],.025,C.dark);link(b,[-7.1,3.02,0],[-7.7,1.20,0],.025,C.dark);b.sphere(.38,-7.7,.92,0,C.orange,[1.4,.6,.8]);b.box(1.7,.10,1.4,-7.7,1.0,0,C.metal,[0,0,.12]);hatch(b,2.9,1.03,0,.32,c);ident(b,f,.1,2.47,0);
  const g=finish('asw_patrol_ship',f,b,4.4);mark(g,[5.71,1.43,1.55]);g.userData.weaponVisual='bow-torpedo-banks-aft-towed-sonar';return g;
 }
 function missileSub(f){const b=new B(),c=col(f,true);
  H.body(b,[[-10,0,.02,.03],[-8.7,0,.55,.55],[-6.8,0,1.23,1.12],[-3,0,1.32,1.20],[4.8,0,1.32,1.2],[7.8,0,1.1,1.0],[9.0,0,.5,.55],[9.5,0,.02,.03]],c,36);
  plan(b,[[-6.6,-.91],[3.6,-.91],[4.1,-.65],[4.1,.65],[3.6,.91],[-6.6,.91]],.92,.38,c,.99);
  for(let i=0;i<7;i++)for(const s of [-1,1]){const x=-5.7+i*1.22,z=s*.46;b.cyl(.39,.045,x,1.33,z,C.dark);b.cyl(.34,.05,x,1.35,z,c);b.box(.45,.035,.045,x,1.39,z,C.metal);for(const dx of [-.25,.25])b.box(.07,.04,.11,x+dx,1.4,z-.22,C.metal);}
  plan(b,[[3.6,-.37],[6.2,-.37],[6.65,-.10],[6.65,.1],[6.2,.37],[3.6,.37]],1.0,1.56,c,.78);for(const x of [4.1,4.65,5.6]){b.cyl(.055,.77,x,2.88,0,C.metal);b.box(.20,.09,.12,x+.04,3.31,0,C.dark);}hatch(b,5.1,2.61,0,.24,c);
  for(const s of [-1,1]){plan(b,[[6.6,s*.7],[7.7,s*.7],[7.0,s*2.1],[6.4,s*2.1]],.05,.11,c,.99);plan(b,[[-9.1,s*.25],[-7.8,s*.25],[-8.5,s*1.9],[-9.2,s*1.9]],0,.11,c,.99);}
  const tail=new T.Shape();tail.moveTo(-9.3,-1.65);tail.lineTo(-8.5,-1.65);tail.lineTo(-7.7,0);tail.lineTo(-8.5,1.8);tail.lineTo(-9.3,1.8);tail.closePath();b.add(new T.ExtrudeGeometry(tail,{depth:.09,bevelEnabled:false}),c,[0,0,-.045]);
  b.cyl(.43,.45,-9.9,0,0,C.metal,'x',.28,24);const rotor=new B();rotor.cyl(.16,.24,0,0,0,C.metal,'x',.08,20);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;rotor.box(.06,.6,.17,0,Math.cos(a)*.44,Math.sin(a)*.44,C.metal,[a,0,.22]);}const p=part(rotor,'propeller',[-10.20,0,0]);p.userData.spinAxis='x';p.userData.spinDirection=1;ident(b,f,4.7,2.65,0);
  const g=finish('missile_sub',f,b,4.0,[p]);mark(g,[-5.7,1.46,.46]);g.userData.muzzleAxis='y';g.userData.underwaterVisual=true;g.userData.weaponVisual='two-rows-of-vertical-launch-covers';return g;
 }
 function tail(b,c,x,y,z,h,lean=0){const s=new T.Shape();s.moveTo(.6,0);s.lineTo(-2.0,0);s.lineTo(-1.6,h);s.lineTo(-.9,h);s.closePath();b.add(new T.ExtrudeGeometry(s,{depth:.09,bevelEnabled:false}),c,[x,y,z],[lean,0,0]);}
 function cockpit(b,x,y,l,w,h,c){b.sphere(1,x,y,0,C.glass,[l,h,w]);for(const t of [-.45,.45]){let prev;const q=Math.sqrt(1-t*t);for(let i=0;i<=16;i++){const a=i*Math.PI/16,p=[x+t*l,y+Math.sin(a)*h*q,Math.cos(a)*w*q];if(prev)link(b,prev,p,.018,c);prev=p;}}}
 function enginePod(b,x,y,z,l,r,c){b.cyl(r,l,x,y,z,c,'x',r*.92,28);H.engine(b,x+l/2+.02,y,z,r,.55,C.metal,-1);H.engine(b,x-l/2-.02,y,z,r*.92,.60,C.metal,1);for(let i=0;i<8;i++)b.box(.035,.035,r*.9,x-l*.27+i*l*.075,y+r*.93,z,C.metal);}
 function interceptor(f){const b=new B(),c=col(f);H.body(b,[[-7.5,0,.05,.05],[-6.5,0,.6,.4],[-3,0,.95,.55],[1.3,.05,1.0,.62],[4.4,.03,.5,.40],[6.9,0,.12,.13],[7.7,0,.015,.02]],c,32);H.wing(b,c,5.2,.7,-4.5,3.5,0);H.wing(b,c,2.7,-4.7,-6.1,1.4,.12);cockpit(b,3.35,.58,1.18,.37,.35,c);
  for(const s of [-1,1]){enginePod(b,-2.1,.08,s*1.52,7.3,.63,c);tail(b,c,-4.75,.45,s*1.63,2.35,s*.1);b.box(1.10,.44,.18,-3.3,-.24,s*3.3,c);b.box(2.10,.10,.29,-3.3,-.47,s*3.3,C.metal);for(const x of [-3.68,-2.92])b.box(.16,.15,.32,x,-.40,s*3.3,c);b.cyl(.14,2.4,-3.0,-.64,s*3.3,C.white,'x',.14,20);b.cyl(.14,.39,-1.61,-.64,s*3.3,C.white,'x',0,20);for(const zz of [-.18,.18])b.box(.5,.025,.3,-3.7,-.64,s*3.3+zz,c);b.box(1.4,.035,.20,-1.3,.65,s*.55,C.dark);}
  lens(b,5.7,.13,0,.10);ident(b,f,.1,.68,0);const g=finish('high_altitude_interceptor',f,b,5.8);mark(g,[-1.39,-.64,3.3]);g.userData.weaponVisual='long-wing-mounted-interceptor-missiles';return g;
 }
 function strike(f){const b=new B(),c=col(f);H.body(b,[[-7.8,0,.04,.04],[-6.8,0,.9,.52],[-3.8,0,1.4,.72],[.5,0,1.45,.80],[3.8,.05,.85,.60],[6.3,0,.3,.32],[7.4,0,.02,.025]],c,30);H.wing(b,c,9.3,3.0,-5.6,7.2,0);cockpit(b,4.1,.55,1.25,.58,.38,c);tail(b,c,-5.8,.5,0,2.3);
  for(const s of [-1,1]){for(const z of [2.3,3.8]){b.box(1.8,.26,.15,-2.6,-.20,s*z,c);enginePod(b,-2.8,-.58,s*z,3.8,.45,c);}for(const x of [-2.3,-.5,1.3]){b.box(1.5,.035,.32,x,.74,s*.42,c);b.box(.95,.025,.045,x,.77,s*.42,C.metal);}b.box(4.9,.10,.69,-.6,-.78,s*.39,C.dark);b.box(4.80,.035,.61,-.6,-.85,s*.39,c);for(const x of [-2.5,1.3])b.box(.10,.045,.55,x,-.88,s*.39,C.metal);}
  // A visible forward belly launch face is ahead of the closed bomb-bay doors.
  b.box(.24,.28,.73,2.0,-.68,0,C.dark);b.box(.035,.16,.56,2.14,-.68,0,C.metal);ident(b,f,.1,.87,0);const g=finish('strategic_strike_aircraft',f,b,4.5);mark(g,[2.20,-.75,0]);g.userData.weaponVisual='ventral-long-range-launch-bay';return g;
 }
 function panel(b,x,y,z,w,d,solar){b.box(w,.15,d,x,y,z,C.metal);b.box(w-.13,.025,d-.13,x,y+.09,z,solar?C.solar:C.white);for(const s of [-1,1]){b.box(w,.055,.06,x,y+.12,z+s*d/2,C.metal);b.box(.06,.055,d,x+s*w/2,y+.12,z,C.metal);}if(!solar)for(let i=0;i<6;i++)link(b,[x-w*.43,y+.12,z-d*.39+i*d*.78/5],[x+w*.43,y+.12,z-d*.39+i*d*.78/5],.017);}
 function drive(b,x,y,z,r,c){b.cyl(r*.9,.75,x+.37,y,z,c,'x',r,24);H.engine(b,x-.02,y,z,r,.54,C.metal,1);}
 function carrier(f){const b=new B(),c=col(f);plan(b,[[-8,-3.0],[2.5,-3.0],[6.3,-1.75],[7.6,-.6],[7.6,.6],[6.3,1.75],[2.5,3.0],[-8,3.0]],-.75,1.5,c,.92);
  // Two broad longitudinal armored weapon arrays; no hangar or production-bay art.
  for(const s of [-1,1]){
    // Each long array has an actual open maintenance/weapon trough ahead of four closed cassettes.
    b.box(10.8,.13,1.30,-1.4,.815,s*2.05,C.dark);
    for(const dz of [-.61,.61])b.box(10.8,.68,.12,-1.4,1.16,s*2.05+dz,c);
    for(const x of [-6.75,-.72,3.95])b.box(.14,.68,1.30,x,1.16,s*2.05,c);
    for(let i=0;i<4;i++){const x=-5.9+i*1.43;b.box(1.30,.10,1.10,x,1.42,s*2.05,C.dark);b.box(1.08,.055,.87,x,1.50,s*2.05,c);b.box(.12,.035,.57,x+.30,1.55,s*2.05,C.foil);}
    for(const dz of [-.34,.34]){b.box(4.15,.12,.10,1.55,.94,s*2.05+dz,C.metal);for(const x of [.1,1.5,2.9])b.box(.22,.20,.18,x,1.01,s*2.05+dz,c);}
    b.box(.90,.18,.55,2.70,.97,s*2.05,C.foil);
    // External rib brackets and underside longitudinal girders break the slab silhouette.
    for(const x of [-6.4,-4.8,-3.2,-1.6,0]){link(b,[x,.40,s*2.87],[x,-.95,s*2.6],.095,C.metal);link(b,[x,-.95,s*2.6],[x,-1.25,s*1.25],.075,C.metal);}
    b.box(12.0,.24,.24,-1.0,-1.20,s*1.2,C.metal);
    for(const x of [-5.6,-2.6,.4,3.4])link(b,[x,-.73,s*.25],[x,-1.2,s*1.2],.11,c);
    link(b,[2.1,-.1,s*2.4],[2.1,-.1,s*3.75],.21,c);link(b,[-1,-.1,s*2.4],[-1,-.1,s*3.75],.21,c);plan(b,[[-2.1,s*3.1],[3.0,s*3.1],[3.7,s*3.65],[3.0,s*4.2],[-2.1,s*4.2]],-.35,1.10,c,.86);
    for(const zz of [-.27,.27])cannon(b,3.3,.23,s*3.65+zz,2.8,.19,c);for(const x of [-1.2,.3,1.8])b.box(.9,.10,.84,x,.84,s*3.65,c);
    for(const z of [1.1,2.35])drive(b,-8.45,-.03,s*z,.57,c);link(b,[-5.5,-.3,s*2.6],[-5.5,-.6,s*4.6],.13,c);panel(b,-5.5,-.6,s*4.6,3.0,1.9,false);
  }
  plan(b,[[-5.6,-.95],[-2.5,-.95],[-1.9,-.55],[-1.9,.55],[-2.5,.95],[-5.6,.95]],.80,1.15,c,.84);b.box(3.2,.13,1.78,-3.7,2.0,0,c);for(const s of [-1,1])b.box(1.8,.22,.035,-3.6,1.79,s*.80,C.glass);b.box(.035,.22,.82,-2.15,1.79,0,C.glass);b.cyl(.08,1.2,-4.5,2.6,0,C.metal);b.box(.11,.38,1.1,-4.5,3.26,0,C.dark);vent(b,.15,.87,0,3.0,1.4);hatch(b,4.1,.85,0,.45,c);ident(b,f,-3.8,2.1,0);
  const g=finish('orbital_carrier',f,b,4.7);mark(g,[6.16,.23,3.92]);g.userData.weaponVisual='side-batteries-and-longitudinal-arrays';g.userData.noAircraftProduction=true;g.userData.openWeaponTroughs=2;return g;
 }
 function sensor(f){const b=new B(),r=new B(),c=col(f);b.cyl(1.05,2.4,0,0,0,c,'y',.85,12);b.cyl(.69,.28,0,1.32,0,C.foil);b.cyl(.26,1.15,0,1.95,0,C.metal);
  // Three separate phased-array faces around a supported triangular mast.
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,xx=Math.cos(a)*1.6,zz=Math.sin(a)*1.6,cs=Math.cos(a),sn=Math.sin(a),face=(w,h,d,x,y,z,color)=>r.box(w,h,d,xx+cs*x-sn*z,.10+y,zz+sn*x+cs*z,color,[0,-a,0]);face(.22,2.35,2.50,0,0,0,c);face(.035,2.16,2.30,.14,0,0,C.dark);for(let row=0;row<6;row++)for(let k=0;k<6;k++)face(.025,.25,.25,.165,-.87+row*.35,-.87+k*.35,C.metal);link(r,[0,-1.12,0],[xx,-1.12,zz],.13,c);link(r,[0,1.32,0],[xx,1.32,zz],.10,c);link(r,[0,-.72,0],[xx,.90,zz],.065);}
  // The common support stays separate from the three outward-facing panel surfaces.
  r.cyl(.25,2.5,0,.10,0,C.metal);const array=part(r,'radar',[0,2.7,0]);
  for(const s of [-1,1]){link(b,[-.55,-.35,s*.6],[-3.2,-.35,s*2.8],.12,c);link(b,[.55,-.35,s*.6],[-1.8,-.35,s*2.8],.07);panel(b,-3.15,-.35,s*3.15,3.5,2.5,true);drive(b,-1.35,-.66,s*.6,.3,c);}for(const x of [-.50,.50])lens(b,.92,.25,x,.13);hatch(b,0,1.52,0,.32,c);ident(b,f,-.3,1.58,0);
  const g=finish('orbital_sensor',f,b,5.2,[array],true);g.userData.supportVisual='three-face-phased-array-and-aft-solar';return g;
 }
 const make={assault_gun:assault,mobile_radar:radarTruck,asw_patrol_ship:asw,missile_sub:missileSub,high_altitude_interceptor:interceptor,strategic_strike_aircraft:strike,orbital_carrier:carrier,orbital_sensor:sensor};
 for(const [kind,build] of Object.entries(make))for(const f of Object.keys(D.F))M.register(kind,f,()=>build(f));
})(globalThis);
