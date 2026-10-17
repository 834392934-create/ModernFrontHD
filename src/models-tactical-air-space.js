/* Wave 8 original role art. Proportions are fictional art-space values.
 * +X forward; runtime combat rules live in roster/simulation, never in this file. */
(function(root){
  'use strict';
  const T=root.THREE,M=root.WarModels,H=root.WarDetail,D=root.WarData,B=H.Builder;
  const C={metal:0x58646a,dark:0x202528,glass:0x325a70,solar:0x263e69,foil:0xb09a64,white:0xbcc4c7,orange:0xc18d49};
  const kinds=['air_repair_drone','interceptor_drone','orbital_shield','orbital_missile_barge'];
  const refs={air_repair_drone:'https://www.nasa.gov/image-article/astronaut-megan-mcarthur-photographs-an-astrobee-robotic-free-flyer/',interceptor_drone:'https://www.nasa.gov/aeronautics/x-48b/',orbital_shield:'https://www.esa.int/ESA_Multimedia/Images/2016/07/Shaker_test_of_radiator_panel',orbital_missile_barge:'https://www.esa.int/ESA_Multimedia/Images/2016/07/Shaker_test_of_radiator_panel'};
  const link=(b,a,z,r=.06,c=C.metal)=>H.link(b,a,z,r,c);
  function marker(g,p,name){const o=new T.Object3D();o.name=name;o.position.set(...p);g.add(o);}
  function ring(b,p,r,c,rotation=[0,Math.PI/2,0],thickness=.06){b.add(new T.TorusGeometry(r,thickness,8,32),c,p,rotation);}
  function panel(b,x,y,z,w,d,solar=false){b.box(w,.13,d,x,y,z,C.metal);b.box(w-.12,.025,d-.12,x,y+.08,z,solar?C.solar:C.white);for(const s of [-1,1]){b.box(w,.06,.05,x,y+.09,z+s*d/2,C.metal);b.box(.05,.06,d,x+s*w/2,y+.09,z,C.metal);}if(!solar)for(let i=0;i<5;i++)link(b,[x-w*.43,y+.10,z-d*.38+i*d*.19],[x+w*.43,y+.10,z-d*.38+i*d*.19],.017,C.metal);}
  function hatch(b,x,y,z,c){b.box(.74,.04,.53,x,y,z,C.dark);b.box(.65,.04,.44,x,y+.027,z,c);for(const s of [-1,1])b.box(.06,.035,.10,x+s*.24,y+.06,z,C.metal);}
  function identity(b,f,x,y,z){const n=Object.keys(D.F).indexOf(f);for(let i=0;i<1+n%3;i++)b.box(.08,.035,.31,x+i*.14,y,z,f==='imp'?C.foil:C.white);}
  function color(f){return new T.Color(M.colors[f]||0x657052).lerp(new T.Color(0x71818a),.45).getHex();}
  function finish(kind,f,b,moving=[],scale=5){const g=new T.Group(),m=b.finish();m.name='body';g.add(m,...moving);let parts=0;g.traverse(o=>parts+=o.userData.parts||0);g.userData={scale,parts,original:true,evidenceStatus:'original-role-variant',designRole:D.U[kind]?.role||kind,profile:`original-${kind}-${f}-v2`,detailPass:2,modelFamily:kind,fiction:kind.startsWith('orbital_')||f==='imp',referenceUrl:refs[kind],referenceUse:'Exterior shape inspiration only; not a reproduction of the referenced equipment.'};return g;}
  function repair(f){const b=new B(),c=color(f),moving=[];
    b.box(2.1,.83,1.25,0,0,0,c);b.box(1.50,.27,1.12,-.23,.52,0,C.dark);hatch(b,-.23,.68,0,c);
    b.box(.12,.45,.88,1.10,.04,0,C.dark);for(const z of [-.25,.25])b.sphere(.13,1.18,.09,z,C.glass,[.45,1,1]);
    // Four separated motor nacelles have continuous diagonal arms and fixed guards.
    let i=0;for(const x of [-1.68,1.52])for(const z of [-1.65,1.65]){
      link(b,[x*.42,.12,z*.30],[x,.22,z],.12,c);link(b,[x*.50,-.12,z*.25],[x,.18,z],.045);
      b.cyl(.23,.39,x,.31,z,C.metal,'y',.26,16);ring(b,[x,.58,z],.95,c,[Math.PI/2,0,0],.04);
      for(const s of [-1,1])link(b,[x,.31,z],[x+s*.9,.56,z],.026);
      const r=new B();r.cyl(.12,.12,0,0,0,C.metal);for(let j=0;j<3;j++){const a=j*Math.PI*2/3;r.box(.77,.032,.12,Math.cos(a)*.46,0,Math.sin(a)*.46,C.dark,[0,-a,0]);}
      const rm=r.finish();rm.name=['rotor','rotorCounter','rotor2','rotorCounter2'][i];rm.position.set(x,.62,z);rm.userData.spinAxis='y';rm.userData.spinDirection=i++%2?-1:1;moving.push(rm);
    }
    // Underbody tool cassette and a bent arm with a visible wrist/claw, not a gun.
    b.box(1.15,.48,.82,-.40,-.61,0,C.white);for(const z of [-.44,.44]){link(b,[-.85,-.35,z],[-.85,-.85,z],.06);b.box(.57,.10,.06,-.4,-.66,z,C.orange);}
    const a=[.65,-.41,0],e=[1.10,-.95,0],w=[1.80,-1.02,0];link(b,a,e,.10,c);link(b,e,w,.075,c);for(const p of [a,e,w])b.cyl(.15,.25,...p,C.metal,'z',.15,14);
    for(const s of [-1,1]){link(b,w,[2.03,-1.02,s*.18],.04);link(b,[2.03,-1.02,s*.18],[2.23,-1.02,s*.11],.035,C.orange);}
    for(const s of [-1,1]){link(b,[-.72,-.35,s*.43],[-.9,-1.16,s*.77],.05);link(b,[-1.20,-1.16,s*.77],[.35,-1.16,s*.77],.06,C.dark);}
    identity(b,f,-.65,.72,0);const g=finish('air_repair_drone',f,b,moving,4.2);g.userData.unarmed=true;g.userData.serviceDomain='air';marker(g,[2.23,-1.02,0],'servicePoint');return g;
  }
  function interceptor(f){const b=new B(),c=color(f);
    H.body(b,[[-2.9,0,.19,.18],[-2.3,.03,.63,.31],[-1,.02,.98,.33],[.55,.01,.68,.27],[1.8,0,.33,.18],[2.5,0,.02,.02]],c,24);
    H.wing(b,c,3.35,1.25,-1.85,2.5,0); // Broad blended wing root; no manned canopy.
    for(const s of [-1,1]){b.box(.68,.035,.24,-.55,.29,s*.72,C.dark);b.box(.54,.025,.15,-.55,.316,s*.72,C.white);
      const fin=new T.Shape();fin.moveTo(.15,0);fin.lineTo(-.85,0);fin.lineTo(-.67,.68);fin.lineTo(-.29,.82);fin.closePath();b.add(new T.ExtrudeGeometry(fin,{depth:.055,bevelEnabled:false}),c,[-1.4,.12,s*2.7],[s*.20,0,0]);
      link(b,[-1.1,.07,s*.52],[-1.4,.18,s*2.7],.035,C.metal);
    }
    // Raised intake and recessed rear nozzle use actual cavities, no glowing discs.
    b.box(1.28,.43,.66,-1.44,.37,0,c);H.engine(b,-.78,.37,0,.28,.43,C.metal,-1);H.engine(b,-2.93,.02,0,.29,.51,C.metal,1);
    b.sphere(.12,1.76,.12,0,C.glass,[1.4,.65,1]);b.box(.85,.19,.27,1.0,-.24,0,c);b.cyl(.075,.61,1.67,-.25,0,C.metal,'x');H.engine(b,2.0,-.25,0,.08,.14,C.metal,-1);
    hatch(b,-.15,.35,0,c);identity(b,f,-.95,.605,0);const g=finish('interceptor_drone',f,b,[],4.8);marker(g,[2.05,-.25,0],'muzzle');return g;
  }
  function propulsion(b,x,y,z,r,c){b.add(new T.CylinderGeometry(r*.70,r,.65,20,1,true),c,[x+.25,y,z],[0,0,-Math.PI/2]);H.engine(b,x-.09,y,z,r,.57,C.metal,1);}
  function shield(f){const b=new B(),c=color(f);b.cyl(.79,3.8,-.30,0,0,c,'x',.79,10);b.cyl(.65,.25,1.72,0,0,C.foil,'x',.65,16);
    // Four hollow projection rings on diagonal outriggers, visibly unlike dishes/flat arrays.
    for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,cy=Math.cos(a),sz=Math.sin(a),p=[.6,cy*2.05,sz*2.05];
      const rim=[.60,cy*1.17,sz*1.17];link(b,[-.35,cy*.58,sz*.58],rim,.15,c);link(b,[1.20,cy*.48,sz*.48],rim,.065);b.cyl(.18,.26,...rim,C.foil,'x',.18,12);
      ring(b,p,.88,c,undefined,.10);ring(b,[.68,p[1],p[2]],.71,C.glass,undefined,.035);
      for(let j=0;j<4;j++){const t=j*Math.PI/2;b.box(.22,.19,.19,.61,p[1]+Math.cos(t)*.87,p[2]+Math.sin(t)*.87,C.foil);}
    }
    for(const s of [-1,1]){b.box(1.7,.65,.65,-1.15,.05,s*.85,c);propulsion(b,-2.35,.05,s*.85,.39,c);link(b,[-1.0,-.2,s*.7],[-1.45,-.38,s*2.5],.12);panel(b,-1.55,-.38,s*2.75,2.0,1.6);link(b,[-1.9,-.2,s*.7],[-2.3,-.38,s*2.75],.05);}
    b.box(1.5,.23,.73,-.60,.87,0,C.foil);hatch(b,-.60,1.01,0,c);identity(b,f,-.95,1.08,0);const g=finish('orbital_shield',f,b,[],5.4);g.userData.unarmed=true;g.userData.supportVisual='four-projection-rings';marker(g,[1.86,0,0],'supportPoint');return g;
  }
  function barge(f){const b=new B(),c=color(f);b.box(6.6,.68,1.0,-.3,-.25,0,c);b.box(1.0,.76,.86,-3.13,.1,0,C.foil);
    // Broad paired cassette racks: repeated short boxes, no sniper-like centre barrel.
    for(const s of [-1,1]){
      for(const x of [-1.9,.1,2.0])link(b,[x,-.21,s*.40],[x,-.21,s*2.15],.14,c);
      b.box(5.4,.14,1.4,.25,-.05,s*1.47,C.metal);
      for(let row=0;row<2;row++)for(let col=0;col<3;col++){
        const x=-1.45+col*1.78,y=.25+row*.65,z=s*1.48;b.box(1.56,.56,1.12,x,y,z,c);
        if(col===2){b.box(.055,.47,1.0,x+.80,y,z,C.dark);for(const zz of [-.26,.26]){b.cyl(.18,.06,x+.835,y,z+zz,C.metal,'x',.18,12);b.cyl(.14,.065,x+.872,y,z+zz,C.dark,'x',.14,12);}}
        else{ // Aft modules are stores: visible side access panels, no blocked forward apertures.
          b.box(.97,.38,.035,x,y,z+s*.575,C.dark);b.box(.86,.29,.035,x,y,z+s*.598,c);b.box(.15,.045,.04,x+.23,y,z+s*.624,C.metal);
        }
        b.box(1.23,.035,.11,x,y+.30,z,C.orange);for(const dx of [-.56,.56])b.box(.065,.57,1.13,x+dx,y,z,C.metal);
      }
      // Uprights sit outboard, behind the launch faces; no diagonal crosses a launch axis.
      for(const x of [-2.30,2.74]){link(b,[x,-.12,s*2.10],[x,1.27,s*2.10],.095);link(b,[x,1.27,s*2.10],[x,1.27,s*.94],.075);}
      propulsion(b,-3.85,-.30,s*.75,.40,c);link(b,[-2.4,-.23,s*.5],[-2.65,-.73,s*3.1],.1);panel(b,-2.65,-.73,s*3.1,1.6,1.5,true);
    }
    b.box(1.1,.47,.84,2.30,.28,0,c);b.box(.12,.20,.50,2.90,.32,0,C.glass);hatch(b,-1.5,.12,0,c);identity(b,f,.15,.12,0);const g=finish('orbital_missile_barge',f,b,[],5.7);marker(g,[3.08,.90,1.22],'muzzle');g.userData.weaponVisual='forward-launch-racks-with-aft-storage';return g;
  }
  const make={air_repair_drone:repair,interceptor_drone:interceptor,orbital_shield:shield,orbital_missile_barge:barge};
  for(const kind of kinds)for(const f of Object.keys(D.F))M.register(kind,f,()=>make[kind](f));
})(globalThis);
