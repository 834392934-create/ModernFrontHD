/* Original depth/all-domain role art; art-space proportions are not real engineering data.
 * +X forward. Static surfaces are batched; named propeller/rotor assemblies retain pivots. */
(function(root){
 'use strict';
 const T=root.THREE,M=root.WarModels,H=root.WarDetail,D=root.WarData,B=H.Builder;
 const C={metal:0x58646a,dark:0x202528,glass:0x325a70,white:0xbcc4c7,foil:0xb09a64,orange:0xc18d49};
 const refs={hunter_sub:'https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169558/attack-submarines-ssn/',abyss_tender:'https://oceanexplorer.noaa.gov/technology/subs-deep-discoverer/',omni_striker:'https://ntrs.nasa.gov/citations/20220017632',omni_dreadnought:'https://www.esa.int/ESA_Multimedia/Images/2016/07/Shaker_test_of_radiator_panel'};
 const profiles={hunter_sub:'tapered-single-hull-cruciform-pumpjet',abyss_tender:'twin-pressure-pod-open-tool-frame',omni_striker:'swept-wing-twin-engine-liftfan-striker',omni_dreadnought:'armoured-spinal-capital-ship-radiator-outriggers'};
 const link=(b,a,z,r=.05,c=C.metal)=>H.link(b,a,z,r,c);
 function plan(b,p,y,h,c,inset=.9){const a=p.reduce((s,q,i)=>s+q[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*q[1],0);b.prism(a<0?[...p].reverse():p,y,h,c,inset);}
 function mark(g,p,name='muzzle'){const m=new T.Object3D();m.name=name;m.position.set(...p);g.add(m);}
 function part(b,name,p=[0,0,0]){const m=b.finish();m.name=name;m.position.set(...p);return m;}
 function color(f,dark=false){return new T.Color(M.colors[f]).lerp(new T.Color(dark?0x27373c:0x71818a),dark?.62:.3).getHex();}
 function finish(kind,f,b,scale,moving=[]){const g=new T.Group();g.add(part(b,'body'),...moving);let count=0;g.traverse(o=>count+=o.userData.parts||0);g.userData={scale,parts:count,original:true,evidenceStatus:'original-role-variant',designRole:D.U[kind]?.role||kind,profile:profiles[kind]+'-'+f+'-v2',detailPass:2,modelFamily:kind,fiction:kind.startsWith('omni_')||f==='imp',referenceUrl:refs[kind],referenceUse:'Structural inspiration only; original game role, not a replica or real performance claim.'};return g;}
 function hatch(b,x,y,z,c,r=.28){b.cyl(r,.045,x,y,z,C.dark);b.cyl(r*.89,.05,x,y+.026,z,c);link(b,[x-.09,y+.06,z],[x+.09,y+.06,z],.017);}
 function ring(b,p,r,c=C.metal,rotation=[0,Math.PI/2,0],tube=.055){b.add(new T.TorusGeometry(r,tube,8,28),c,p,rotation);}
 function label(b,f,x,y,z){const count=Object.keys(D.F).indexOf(f)%3+1;for(let i=0;i<count;i++)b.box(.08,.024,.27,x+i*.14,y,z,f==='imp'?C.foil:C.white);}
 function lens(b,x,y,z,r=.12){b.cyl(r,.07,x,y,z,C.metal,'x',r,16);b.cyl(r*.72,.025,x+.047,y,z,C.glass,'x',r*.72,16);}
 function thruster(b,x,y,z,r,c){b.cyl(r*.87,.65,x+.3,y,z,c,'x',r,20);H.engine(b,x-.05,y,z,r,.52,C.metal,1);}
 function propeller(radius,name,x,y,z){const b=new B();b.cyl(radius*.22,.22,0,0,0,C.metal,'x',radius*.11,16);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;b.box(.055,radius*.66,radius*.19,0,Math.cos(a)*radius*.48,Math.sin(a)*radius*.48,C.metal,[a,0,.24]);}const p=part(b,name,[x,y,z]);p.userData.spinAxis='x';p.userData.spinDirection=1;return p;}
 function hunter(f){const b=new B(),c=color(f,true);
  H.body(b,[[-7.6,0,.04,.04],[-6.7,0,.43,.43],[-4.8,0,1.00,.96],[-2.7,0,1.14,1.05],[2.8,0,1.14,1.05],[5.3,0,1.03,.98],[6.25,0,.81,.81],[6.85,0,.40,.46],[7.0,0,.025,.04]],c,36);
  // Sonar bow is a smooth fairing; no windows on the attack submarine pressure hull.
  H.body(b,[[5.1,0,1.05,1.0],[5.8,0,.95,.93],[6.6,0,.64,.67],[7.05,0,.025,.04]],C.dark,36);
  plan(b,[[-1.8,-.34],[.85,-.34],[1.35,-.1],[1.35,.1],[.85,.34],[-1.8,.34]],.86,1.4,c,.77);
  for(const x of [-1.24,-.7,.15]){b.cyl(.055,.67,x,2.49,0,C.metal);b.box(.18,.12,.10,x+.045,2.86,0,C.dark);}hatch(b,-.3,2.29,0,c,.22);
  // Bow planes and cross-tail control surfaces stay attached to the hull.
  for(const s of [-1,1]){plan(b,[[2.4,s*.8],[3.2,s*.8],[2.65,s*2.1],[2.2,s*2.15]],.12,.10,c,.99);plan(b,[[-6.5,s*.22],[-5.15,s*.22],[-5.95,s*2.05],[-6.55,s*1.95]],0,.12,c,.98);}
  for(const sign of [-1,1]){const sh=new T.Shape();sh.moveTo(-6.6,sign*.15);sh.lineTo(-5.0,sign*.15);sh.lineTo(-6.0,sign*1.8);sh.lineTo(-6.6,sign*1.7);sh.closePath();b.add(new T.ExtrudeGeometry(sh,{depth:.10,bevelEnabled:false}),c,[0,0,-.05]);}
  // Open pumpjet shroud with visible independent rotor, not a solid black end cap.
  const sleeve=new T.CylinderGeometry(.81,.81,1.05,32,1,true);b.add(sleeve,c,[-7.4,0,0],[0,0,Math.PI/2]);const inward=sleeve.clone();const idx=inward.index.array;for(let i=0;i<idx.length;i+=3)[idx[i],idx[i+1]]=[idx[i+1],idx[i]];inward.computeVertexNormals();b.add(inward,C.metal,[-7.4,0,0],[0,0,Math.PI/2],[.91,1,.91]);ring(b,[-7.93,0,0],.79,c);ring(b,[-6.87,0,0],.79,c);
  for(const s of [-1,1]){for(let i=0;i<3;i++)b.box(1.05,.07,.07,-3.9+i*1.18,-.14,s*1.05,C.dark);for(const y of [-.30,.25]){b.cyl(.21,.48,6.08,y,s*.79,c,'x',.21,20);H.engine(b,6.34,y,s*.79,.18,.15,C.metal,-1);}}
  for(const x of [-3.8,2.0,3.3])hatch(b,x,1.06,0,c,.24);label(b,f,-.85,2.31,0);
  const g=finish('hunter_sub',f,b,4.4,[propeller(.67,'propeller',-7.54,0,0)]);mark(g,[6.38,.25,.79]);g.userData.underwaterVisual=true;return g;
 }
 function tender(f){const b=new B(),c=color(f),yellow=f==='imp'?C.foil:C.orange;
  // Separate pressure pods and their open central work frame make the service role readable.
  for(const s of [-1,1]){const pod=new B();H.body(pod,[[-4.9,0,.02,.03],[-4.2,0,.64,.74],[-3,0,.76,.86],[2.5,0,.76,.86],[3.5,0,.64,.74],[3.95,0,.02,.03]],c,28);b.add(pod.finish().geometry,c,[0,.25,s*1.65]);
    // The pod exterior uses the same painted surface class as its parent assembly.
    for(const x of [-2.8,.3,2.2]){ring(b,[x,.25,s*1.65],.77,C.metal);b.box(.24,1.55,.17,x,.25,s*1.65,C.metal);}
    thruster(b,-4.6,.25,s*1.65,.54,c);b.box(6.1,.15,.24,-.3,-.85,s*1.65,C.metal);link(b,[-2.8,-.42,s*1.65],[-2.8,-.85,s*1.65],.08);link(b,[2.2,-.42,s*1.65],[2.2,-.85,s*1.65],.08);
    for(const x of [-2.8,1.6]){link(b,[x,.5,s*1.18],[x,1.95,s*.8],.09,yellow);link(b,[x,1.95,s*.8],[x,1.95,-s*.8],.09,yellow);}link(b,[-2.8,1.95,s*.8],[1.6,1.95,s*.8],.09,yellow);
    // Two articulated arms with actual elbows/wrists and paired tool fingers.
    const a=[1.85,.05,s*.72],e=[3.2,-.35,s*1.0],w=[4.05,-.22,s*.74];link(b,a,e,.13,yellow);link(b,e,w,.095,yellow);for(const p of [a,e,w])b.cyl(.18,.24,...p,C.metal,'z',.18,16);for(const j of [-1,1]){link(b,w,[4.4,-.22,s*.74+j*.19],.045);link(b,[4.4,-.22,s*.74+j*.19],[4.67,-.22,s*.74+j*.10],.035,yellow);}
    link(b,[2.3,-.42,s*.56],[2.3,.80,s*.56],.085,C.metal);link(b,[2.5,.80,s*.56],[2.5,1.21,s*.56],.065,C.metal);lens(b,2.58,1.21,s*.56,.18);lens(b,2.60,.75,s*.55,.14);b.box(.14,.30,.27,2.5,1.21,s*.56,C.white);
  }
  b.box(5.4,.20,2.1,-.45,-.42,0,C.metal);b.box(2.1,.9,1.15,-1.55,.18,0,c);b.box(.06,.52,.72,-.47,.18,0,C.dark);hatch(b,-1.55,.66,0,c,.36);
  for(const s of [-1,1]){b.box(1.65,.08,.10,.8,-.2,s*.62,yellow);link(b,[-.2,-.3,s*.65],[-.2,.48,s*.65],.045);link(b,[1.65,-.3,s*.65],[1.65,.48,s*.65],.045);link(b,[-.2,.48,s*.65],[1.65,.48,s*.65],.045);}
  for(let i=0;i<4;i++)b.box(.23,.42,.65,.1+i*.37,-.03,0,C.white);b.box(.65,.24,1.42,2.17,.80,0,c);label(b,f,-2.05,.72,0);
  const g=finish('abyss_tender',f,b,4.6);g.userData.unarmed=true;g.userData.underwaterVisual=true;mark(g,[4.67,-.22,0],'servicePoint');return g;
 }
 function striker(f){const b=new B(),c=color(f),moving=[];
  H.body(b,[[-5.5,0,.1,.1],[-4.8,0,.82,.50],[-2.5,0,1.0,.62],[.7,.02,1.13,.63],[2.7,.02,.76,.52],[4.6,0,.30,.24],[5.4,0,.02,.025]],c,30);
  H.wing(b,c,5.9,1.1,-3.4,3.55,.02);H.wing(b,c,2.15,3.15,1.8,.8,.12);
  b.sphere(.5,1.45,.61,0,C.glass,[2.2,.72,.72]);for(const x of [.65,1.25,1.9])ring(b,[x,.57,0],.39,c,undefined,.025);
  for(const s of [-1,1]){const z=s*1.5;b.cyl(.59,4.6,-2.3,.1,z,c,'x',.67,28);H.engine(b,.03,.1,z,.61,.65,C.metal,-1);H.engine(b,-4.67,.1,z,.59,.75,C.metal,1);for(let i=0;i<5;i++)b.box(.045,.55,.05,-2.9+i*.33,.65,z,C.metal);
    const sh=new T.Shape();sh.moveTo(-4.5,0);sh.lineTo(-2.2,0);sh.lineTo(-3.35,1.62);sh.lineTo(-4.1,1.76);sh.closePath();b.add(new T.ExtrudeGeometry(sh,{depth:.08,bevelEnabled:false}),c,[0,.2,s*2.1],[s*.23,0,0]);
    // Liftfan with open gap, centre motor, radial blades and fixed protective ring.
    ring(b,[-.40,.18,s*3.1],.85,c,[Math.PI/2,0,0],.11);for(const dx of [-.8,.8])link(b,[-.4+dx,.12,s*3.1],[-.4,.12,s*3.1],.04);
    const r=new B();r.cyl(.15,.15,0,0,0,C.metal);for(let i=0;i<8;i++){const a=i*Math.PI/4;r.box(.51,.04,.13,Math.cos(a)*.46,0,Math.sin(a)*.46,C.dark,[0,-a,0]);}const rotor=part(r,s===1?'rotor':'rotorCounter',[-.40,.24,s*3.1]);rotor.userData.spinAxis='y';rotor.userData.spinDirection=s;moving.push(rotor);
    b.box(2.4,.29,.49,.2,-.36,s*1.0,c);b.box(1.6,.035,.29,.2,-.53,s*1.0,C.dark);b.cyl(.13,.58,1.7,-.35,s*1.0,C.metal,'x',.13,20);H.engine(b,2.01,-.35,s*1.0,.13,.2,C.metal,-1);
    for(const x of [-1.8,-.5,.75])b.box(.80,.035,.34,x,.61,s*.35,c);b.box(.56,.04,.13,-3.7,.65,z,C.orange);
  }
  // Armoured chin weapon has a clear firing axis beyond the nose contour.
  b.box(1.1,.35,.48,3.0,-.43,0,c);b.cyl(.12,1.1,4.02,-.46,0,C.metal,'x',.10,20);H.engine(b,4.60,-.46,0,.13,.18,C.metal,-1);label(b,f,-1.3,.68,0);
  const g=finish('omni_striker',f,b,5.9,moving);mark(g,[4.63,-.46,0]);return g;
 }
 function radiator(b,x,y,z,w,d){b.box(w,.14,d,x,y,z,C.metal);b.box(w-.14,.035,d-.14,x,y+.09,z,C.white);for(const s of [-1,1])b.box(w,.10,.07,x,y+.10,z+s*d/2,C.metal);for(let i=0;i<7;i++)link(b,[x-w*.44,y+.13,z-d*.4+i*d*.8/6],[x+w*.44,y+.13,z-d*.4+i*d*.8/6],.018,C.metal);}
 function dreadnought(f){const b=new B(),c=color(f);
  plan(b,[[-7.6,-1.7],[2.5,-1.7],[5.4,-.85],[6.5,-.5],[6.5,.5],[5.4,.85],[2.5,1.7],[-7.6,1.7]],-.60,1.2,c,.87);
  b.box(12.7,.34,.86,-.65,.76,0,C.metal);b.box(8.2,.60,.84,-1.6,.30,0,C.dark);
  // Long open-ended spinal launcher, two rails and paired collars.
  for(const s of [-1,1]){b.box(8.5,.24,.26,2.4,.44,s*.48,C.metal);b.box(5.2,.16,.22,3.1,.64,s*.48,c);for(const x of [.1,1.4,2.7,4])b.box(.20,.52,.30,x,.44,s*.48,C.foil);}
  b.box(.16,.24,.82,6.7,.44,0,C.metal);b.box(.035,.15,.59,6.80,.44,0,C.dark);
  for(const s of [-1,1]){
    for(const x of [-5.6,-2.6,.5]){link(b,[x,-.12,s*1.25],[x,-.12,s*3.0],.20,c);link(b,[x,.35,s*1.2],[x,-.12,s*3.0],.08);}
    plan(b,[[-7.0,s*2.35],[1.7,s*2.35],[2.5,s*3.0],[1.7,s*3.65],[-7.0,s*3.65]],-.55,1.1,c,.9);
    for(const x of [-6.3,-4.6,-2.9,-1.2,.5]){b.box(1.3,.12,1.04,x,.64,s*3.0,c);for(const dz of [-.40,.40])b.box(.16,.04,.08,x+.4,.73,s*3.0+dz,C.metal);}
    thruster(b,-7.6,-.03,s*3.0,.69,c);thruster(b,-7.65,-.08,s*.80,.46,c);
    link(b,[-3.3,-.23,s*3.3],[-3.3,-.50,s*5.0],.15,c);link(b,[-6.5,-.23,s*3.3],[-6.5,-.50,s*5.0],.15,c);radiator(b,-4.8,-.5,s*5.15,3.9,2.8);
    // Forward paired mission modules, not duplicated cannon barrels.
    b.box(2.0,.58,.75,.25,1.0,s*1.1,c);for(const x of [-.35,.3,.9])b.box(.43,.04,.53,x,1.31,s*1.1,C.dark);
    b.box(1.7,.12,.18,-6.3,.75,s*3.0,C.orange);
  }
  plan(b,[[-5.9,-.95],[-3.5,-.95],[-2.8,-.55],[-2.8,.55],[-3.5,.95],[-5.9,.95]],.9,1.05,c,.78);
  b.box(2.5,.15,1.65,-4.56,2.03,0,c);for(const s of [-1,1]){b.box(1.45,.19,.025,-4.5,1.79,s*.76,C.glass);link(b,[-5.0,2.08,s*.55],[-5.0,2.65,s*.55],.04);b.box(.09,.32,.35,-5.0,2.74,s*.55,C.metal);}b.box(.035,.22,.85,-3.03,1.77,0,C.glass);hatch(b,-4.45,2.14,0,c,.25);label(b,f,-5.3,2.18,0);
  const g=finish('omni_dreadnought',f,b,5.0);mark(g,[6.85,.44,0]);g.userData.weaponVisual='spinal-launcher-with-side-mission-pods';return g;
 }
 const make={hunter_sub:hunter,abyss_tender:tender,omni_striker:striker,omni_dreadnought:dreadnought};
 for(const [kind,fn]of Object.entries(make))for(const f of Object.keys(D.F))M.register(kind,f,()=>fn(f));
})(globalThis);
