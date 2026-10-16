/* Original role art, not real aircraft or orbital weapon reproductions.
 * +X forward. Static surfaces batch once; rescue main/tail rotors batch separately. */
(function(root){
  'use strict';
  const T=root.THREE,M=root.WarModels,H=root.WarDetail,D=root.WarData,B=H.Builder;
  const C={metal:0x58646a,dark:0x273138,rubber:0x202528,glass:0x325a70,white:0xbcc4c7,orange:0xc18d49,solar:0x263e69,foil:0xb09a64};
  const kinds=['rescue_helicopter','naval_strike_aircraft','electronic_warfare_aircraft','orbital_escort','orbital_relay','orbital_jammer'];
  const colors={chn:0x697b83,usa:0x74818a,rus:0x697973,ind:0x8b8b7e,kor:0x637780,imp:0x505a66};
  function mesh(b,name){const m=b.finish();m.name=name;return m;}
  function link(b,a,z,r=.04,c=C.metal){H.link(b,a,z,r,c);}
  function marker(g,x,y,z,name='muzzle'){const p=new T.Object3D();p.name=name;p.position.set(x,y,z);g.add(p);}
  function plan(b,points,y,h,c,inset=.88){const area=points.reduce((s,p,i)=>{const n=points[(i+1)%points.length];return s+p[0]*n[1]-n[0]*p[1]},0);b.prism(area<0?[...points].reverse():points,y,h,c,inset,0);}
  function plate(b,points,c){const p=[];for(let i=1;i<points.length-1;i++)p.push(...points[0],...points[i],...points[i+1],...points[0],...points[i+1],...points[i]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();b.add(g,c);}
  function frame(b,points,r=.025,c=C.metal){for(let i=0;i<points.length;i++)link(b,points[i],points[(i+1)%points.length],r,c);}
  function fin(b,x,y,z,h,c,lean=0){const s=new T.Shape();s.moveTo(.48,0);s.lineTo(-.9,0);s.lineTo(-1.15,h);s.lineTo(-.5,h);s.closePath();b.add(new T.ExtrudeGeometry(s,{depth:.08,bevelEnabled:false}),c,[x,y,z-.04],[lean,0,0]);}
  function fuselage(b,c,l,w,h){H.body(b,[[-l*.5,0,.02,.02],[-l*.43,0,w*.43,h*.48],[-l*.27,0,w*.85,h*.82],[0,0,w,h],[l*.24,.02,w*.83,h*.88],[l*.38,.04,w*.52,h*.58],[l*.47,.01,w*.18,h*.2],[l*.5,0,.01,.01]],c,28);}
  function canopy(b,x,y,l,w,h){b.sphere(1,x,y,0,C.glass,[l,h,w]);for(const side of [-1,1]){let last;for(let i=0;i<=14;i++){const a=i/14*Math.PI,p=[x+Math.cos(a)*l,y+Math.sin(a)*h,side*w*.66*Math.sin(a)];if(last)link(b,last,p,.021);last=p;}}for(const t of [-.35,.5]){let last;for(let i=0;i<=12;i++){const a=i/12*Math.PI,k=Math.sqrt(1-t*t),p=[x+t*l,y+Math.sin(a)*h*k,Math.cos(a)*w*k];if(last)link(b,last,p,.019);last=p;}}}
  function nacelle(b,c,x,y,z,length,r){b.add(new T.CylinderGeometry(r,r*.94,length,24,1,true),c,[x,y,z],[0,0,-Math.PI/2]);H.engine(b,x-length/2,y,z,r,.48,C.metal,1);H.engine(b,x+length/2,y,z,r*.94,.44,C.metal,-1);for(let i=0;i<8;i++)b.box(.04,.025,r*.9,x-.4+i*.12,y+r*.98,z,C.dark);}
  function serviceHatch(b,x,y,z,w=.7,d=.5,c=C.white){b.box(w,.045,d,x,y,z,C.dark);b.box(w-.07,.04,d-.07,x,y+.027,z,c);for(const side of [-1,1])b.cyl(.025,.018,x+side*(w*.5-.10),y+.055,z,C.metal,'y',.025,8);}
  function identity(b,f,x,y,z,c){const n=Object.keys(D.F).indexOf(f);for(let i=0;i<1+n%3;i++)b.box(.07,.035,.34,x+i*.15,y,z,f==='imp'?C.foil:C.white);if(f==='imp'){for(const side of [-1,1])b.box(.08,.28,.08,x+.15,y+.14,z+side*.25,C.foil);}else b.sphere(.1,x-.15,y+.05,z,c,[1.6,.5,.8]);}
  function finish(kind,f,b,moving=[],scale=6){const g=new T.Group();g.add(mesh(b,'body'),...moving);let parts=0;g.traverse(o=>parts+=o.userData.parts||0);g.userData={scale,parts,original:true,evidenceStatus:'original-role-variant',designRole:D.U[kind]?.role||kind,profile:`original-${kind}-${f}-v2`,detailPass:2,modelFamily:kind,fiction:kind.startsWith('orbital_')||f==='imp'};return g;}
  function rescue(f){const b=new B(),c=colors[f],moving=[];
    // A genuine cabin opening: central near-side wall is absent, with floor,
    // ceiling, far bulkhead, stretcher and door rails meeting the end sections.
    H.body(b,[[1.10,.05,.95,.85],[1.65,.08,.89,.82],[2.5,-.03,.72,.62],[3.25,-.18,.20,.24],[3.5,-.19,.025,.025]],c,28);
    H.body(b,[[-6.15,.43,.10,.13],[-5.1,.35,.16,.21],[-3.0,.05,.32,.4],[-2.1,.02,.69,.70],[-1.10,.05,.95,.85]],c,28);
    b.box(2.28,.22,1.87,0,-.66,0,c);b.box(2.28,.22,1.87,0,.80,0,c);b.box(2.28,1.3,.13,0,.04,-.91,c);
    for(const x of [-1.1,1.1])b.box(.12,1.5,.12,x,.06,.91,c);
    b.box(1.96,.08,1.58,0,-.50,0,C.dark);b.box(.15,.8,.12,-.95,-.06,-.78,C.orange);
    for(const side of [-1,1]){link(b,[-.72,-.3,side*.36],[.72,-.3,side*.36],.035);b.box(1.42,.12,.66,0,-.23,0,C.white);b.box(.34,.14,.6,-.48,-.10,0,C.white);for(const x of [-.6,.6])link(b,[x,-.30,side*.36],[x,-.47,side*.40],.025);}
    for(const x of [-.5,.36]){b.box(.65,.43,.04,x,.30,-.987,C.dark);b.box(.57,.35,.025,x,.30,-1.01,C.glass);}
    // Sliding door remains visibly parked aft, not closing the stretcher opening.
    b.box(.96,1.30,.075,-1.57,.05,1.00,c);b.box(.70,.43,.03,-1.57,.31,1.048,C.glass);b.box(.20,.06,.06,-1.2,-.12,1.06,C.metal);
    for(const y of [-.65,.79])link(b,[-2.10,y,1.03],[1.16,y,1.03],.032);
    link(b,[.8,.85,.67],[.8,1.0,1.35],.07,c);b.cyl(.19,.45,.8,1.0,1.36,C.metal,'x');link(b,[.8,.86,1.39],[.8,-.33,1.39],.014,C.dark);b.add(new T.TorusGeometry(.11,.026,7,14,Math.PI*1.65),C.metal,[.8,-.44,1.39]);
    canopy(b,1.95,.34,1.05,.87,.66);
    for(const side of [-1,1]){const wind=[[1.62,.68,side*.73],[2.30,.41,side*.59],[2.67,.08,side*.48],[1.73,.08,side*.84]];plate(b,wind,C.glass);frame(b,wind);b.box(.64,.13,.035,-1.58,-.27,side*1.05,C.orange);nacelle(b,c,-.8,1.05,side*.65,1.65,.28);
      link(b,[1.24,-.4,side*.7],[1.12,-1.1,side*.94],.055);b.cyl(.24,.15,1.12,-1.25,side*.94,C.rubber,'z',.24,20);b.cyl(.11,.17,1.12,-1.25,side*.94,C.metal,'z');}
    fin(b,-5.5,.43,0,1.35,c);H.wing(b,c,1.55,-4.7,-5.0,.7,.44);link(b,[-5.3,.22,0],[-5.42,-.45,0],.045);b.cyl(.17,.13,-5.42,-.57,0,C.rubber,'z');
    b.cyl(.12,.75,-.42,1.38,0,C.metal);b.cyl(.30,.20,-.42,1.64,0,c);const r=new B();r.cyl(.23,.16,0,0,0,C.metal);for(let i=0;i<4;i++){const a=i*Math.PI/2,ca=Math.cos(a),sa=Math.sin(a);link(r,[.07*ca,0,.07*sa],[.52*ca,0,.52*sa],.07);r.box(3.95,.045,.21,2.42*ca,.01,2.42*sa,C.dark,[0,-a,0]);}const rm=mesh(r,'rotor');rm.position.set(-.42,1.82,0);moving.push(rm);
    const tr=new B();tr.cyl(.12,.16,0,0,0,C.metal,'z');for(const a of [0,Math.PI*.4,Math.PI,Math.PI*1.4]){tr.box(.8,.12,.035,.48*Math.cos(a),.48*Math.sin(a),0,C.dark,[0,0,a]);}const tm=mesh(tr,'tailRotor');tm.position.set(-5.7,1.42,.21);moving.push(tm);link(b,[-5.7,1.42,0],[-5.7,1.42,.21],.09);identity(b,f,-1.6,.93,0,c);
    const g=finish('rescue_helicopter',f,b,moving,6.2);marker(g,.8,-.44,1.39,'servicePoint');g.userData.unarmed=true;g.userData.cabinOpening=true;return g;
  }
  function strikeMissile(b,x,y,z){const r=.23,l=2.75;b.cyl(r,l,x,y,z,C.white,'x',r,24);b.cyl(r,.62,x+l/2+.30,y,z,C.white,'x',.012,24);H.engine(b,x-l/2-.02,y,z,r,.34,C.metal,1);for(const side of [-1,1]){plan(b,[[x-.95,z+side*.15],[x-1.22,z+side*.57],[x-.55,z+side*.52],[x-.35,z+side*.16]],y,.035,C.metal,.98);b.box(.55,.36,.035,x-.80,y+side*.24,z,C.metal);}return x+l/2+.62;}
  function fixedWing(kind,f){const b=new B(),c=colors[f],strike=kind==='naval_strike_aircraft';fuselage(b,c,strike?11.2:12.2,strike?.88:.80,strike?.68:.77);H.wing(b,c,strike?6.1:7.1,strike?1.35:1.0,strike?-2.45:-1.6,strike?3.05:2.65,-.02);canopy(b,strike?2.8:4.05,.52,strike?1.24:.85,.40,.43);
    H.wing(b,c,strike?2.8:3.0,-3.25,-4.4,1.3,.15);for(const side of [-1,1]){if(strike){fin(b,-3.7,.26,side*.62,1.55,c,side*.16);nacelle(b,c,-2.0,-.38,side*.64,5.0,.38);b.box(.85,.40,.15,-.35,-.30,side*2.8,c);strikeMissile(b,-.30,-.77,side*2.8);}else{nacelle(b,c,-3.55,.35,side*.95,2.25,.43);link(b,[-3.3,.22,side*.52],[-3.3,.35,side*.96],.19,c);const tip=new B();H.body(tip,[[-3.3,0,.015,.015],[-3.05,0,.22,.23],[-1.3,0,.26,.26],[-.55,0,.18,.20],[-.2,0,.015,.015]],c,24);b.add(tip.finish().geometry,c,[0,0,side*7.02]);for(const x of [-2.65,-1.6])b.box(.35,.035,.30,x,.24,side*7.02,C.dark);for(let i=0;i<6;i++)b.box(.25,.18,.035,2.45-i*.62,.26,side*.77,C.glass);}}
    if(!strike){fin(b,-4.8,.25,0,1.98,c);for(const x of [-1.6,1.1])b.box(.45,.53,.50,x,.81,0,c);b.sphere(1,-.30,1.14,0,c,[2.15,.37,.43]);b.box(3.2,.05,.44,-.30,1.46,0,C.dark);for(const side of [-1,1]){b.box(2.5,.20,.055,-.30,1.18,side*.415,C.white);b.sphere(.14,2.9,-.53,side*.25,C.glass);} }
    for(const side of [-1,1]){serviceHatch(b,-1.1,.66,side*.24,.8,.33,c);b.box(1.1,.025,.38,.7,-.64,side*.42,C.dark);}identity(b,f,-2.3,.61,0,c);const g=finish(kind,f,b,[],strike?6:5.3);if(strike)marker(g,1.72,-.77,2.8);else g.userData.unarmed=true;return g;
  }
  function thermalWing(b,x,y,z,w,d,solar){b.box(w,.10,d,x,y,z,C.metal);b.box(w-.10,.035,d-.10,x,y+.066,z,solar?C.solar:C.dark);for(const side of [-1,1]){b.box(w,.06,.05,x,y+.08,z+side*d/2,C.metal);b.box(.05,.06,d,x+side*w/2,y+.08,z,C.metal);}if(!solar)for(let i=0;i<8;i++)link(b,[x-w/2+.12,y+.09,z-d/2+.16+i*(d-.32)/7],[x+w/2-.12,y+.09,z-d/2+.16+i*(d-.32)/7],.017,C.metal);}
  function spaceEngine(b,x,y,z,r){b.add(new T.CylinderGeometry(r*.70,r,.82,24,1,true),C.metal,[x+.32,y,z],[0,0,-Math.PI/2]);H.engine(b,x-.10,y,z,r,.63,C.metal,1);for(let i=0;i<8;i++){const a=i*Math.PI/4;link(b,[x-.03,y+Math.cos(a)*r,z+Math.sin(a)*r],[x+.65,y+Math.cos(a)*r*.7,z+Math.sin(a)*r*.7],.022);}}
  function dish(b,x,y,z,r,c){const points=[];for(let i=0;i<=18;i++){const radius=r*i/18;points.push(new T.Vector2(radius,.34*(radius/r)**2));}const g=new T.LatheGeometry(points,40);b.add(g,C.white,[x,y,z],[0,0,-Math.PI/2]);const back=new T.LatheGeometry(points.map(p=>new T.Vector2(p.x,p.y-.045)),40);back.scale(-1,1,1);b.add(back,c,[x,y,z],[0,0,-Math.PI/2]);b.add(new T.TorusGeometry(r,.035,8,40),C.metal,[x+.34,y,z],[0,Math.PI/2,0]);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;link(b,[x+.34,y+Math.cos(a)*r,z+Math.sin(a)*r],[x+.92,y,z],.021);}b.cyl(.105,.23,x+.85,y,z,C.foil,'x');link(b,[x-.25,y,z],[x,y,z],.10,c);}
  function trussWing(b,side){for(const x of [-.65,.65])link(b,[x,-.05,side*.8],[x,-.05,side*3.2],.075);for(let i=0;i<4;i++){const z=side*(.9+i*.58);link(b,[-.65,-.05,z],[.65,-.05,z+side*.58],.035);link(b,[.65,-.05,z],[-.65,-.05,z+side*.58],.035);}thermalWing(b,0,-.05,side*4.6,3.4,3.0,true);for(const x of [-.65,.65])link(b,[x,-.05,side*3.1],[x,-.05,side*3.3],.075);}
  function gun(b,x,y,z,c){b.cyl(.22,.52,x,y,z,c,'x');b.cyl(.12,1.10,x+.72,y,z,C.metal,'x');H.engine(b,x+1.30,y,z,.14,.24,C.metal,-1);for(const xx of [.3,.7])b.cyl(.17,.10,x+xx,y,z,c,'x');}
  function spacecraft(kind,f){const b=new B(),c=new T.Color(colors[f]).lerp(new T.Color(C.white),.23).getHex();
    if(kind==='orbital_escort'){plan(b,[[-2.5,-.85],[-.9,-1.2],[2.4,-.7],[3.0,0],[2.4,.7],[-.9,1.2],[-2.5,.85]],-.45,.9,c,.86);for(const side of [-1,1]){b.box(2.3,.62,.76,-1.6,0,side*1.45,c);link(b,[-1.8,0,side*.75],[-1.8,0,side*1.47],.18,c);spaceEngine(b,-2.95,0,side*1.45,.50);thermalWing(b,-1.3,.15,side*2.55,1.5,.85,false);link(b,[-1.3,0,side*1.4],[-1.3,.15,side*2.55],.09);b.box(1.35,.40,.40,1.45,.05,side*.96,c);gun(b,2.05,.05,side*.96,c);serviceHatch(b,-.65,.48,side*.46,.8,.45,c);}b.sphere(.25,.85,.49,0,C.glass,[1.5,.7,1]);identity(b,f,-1.2,.5,0,c);}
    if(kind==='orbital_relay'){b.cyl(.97,2.7,0,0,0,C.foil,'x',.97,8);b.cyl(.84,.20,1.45,0,0,c,'x',.84,24);b.cyl(.84,.20,-1.45,0,0,c,'x',.84,24);for(const side of [-1,1]){trussWing(b,side);link(b,[.25,.50,side*.5],[.55,1.38,side*1.45],.10,c);dish(b,.55,1.38,side*1.45,1.03,c);for(const xx of [-.72,.55])b.box(.42,.07,.43,xx,1.0,0,C.white);}b.box(.75,.65,.65,-1.35,0,0,c);spaceEngine(b,-1.93,0,0,.29);identity(b,f,-.8,1.05,0,c);}
    if(kind==='orbital_jammer'){b.cyl(.86,2.5,-.35,0,0,c,'x',.86,8);for(let i=0;i<3;i++){const a=i*Math.PI*2/3,cy=Math.cos(a),sz=Math.sin(a),point=(r,t,x)=>[x,cy*r-sz*t,sz*r+cy*t];link(b,[.3,cy*.55,sz*.55],point(1.65,0,.63),.12,c);
        const outline=[[.75,-.33],[2.60,-.85],[3.05,-.5],[3.05,.5],[2.6,.85],[.75,.33]],front=outline.map(([r,t])=>point(r,t,1.02)),back=outline.map(([r,t])=>point(r,t,.86));plate(b,front,C.dark);plate(b,back,c);frame(b,front,.045,c);for(let j=0;j<front.length;j++){const k=(j+1)%front.length;plate(b,[front[j],back[j],back[k],front[k]],c);}for(let row=0;row<7;row++){const r=1.1+row*.25,half=.35+row*.045;for(let col=-2;col<=2;col++){const p=point(r,col*half*.34,1.035);b.cyl(.048,.015,p[0],p[1],p[2],C.metal,'x',.048,6);}}
        link(b,[-.05,cy*.70,sz*.70],point(2.3,0,.84),.045,C.foil);}
      for(const side of [-1,1]){thermalWing(b,-2.25,-.5,side*2.35,3.3,1.10,false);link(b,[-.9,-.25,side*.45],[-1.5,-.5,side*2.35],.13,c);link(b,[-1.6,-.2,side*.45],[-3.5,-.5,side*2.35],.075);for(let i=0;i<3;i++)link(b,[-1.4+i*.16,.28,side*.6],[-2+i*.16,-.42,side*2.25],.026,C.foil);}spaceEngine(b,-1.95,0,0,.40);identity(b,f,-1,.88,0,c);}
    const g=finish(kind,f,b,[],kind==='orbital_escort'?6.3:5.8);if(kind==='orbital_escort')marker(g,3.43,.05,.96);else g.userData.unarmed=true;return g;
  }
  for(const kind of kinds)for(const f of Object.keys(D.F))M.register(kind,f,()=>kind==='rescue_helicopter'?rescue(f):kind.startsWith('orbital_')?spacecraft(kind,f):fixedWing(kind,f));
})(globalThis);
