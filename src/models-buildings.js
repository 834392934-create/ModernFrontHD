/* Photo-inspired emplacements and original industrial game architecture.
 * These combined installations are not replicas of national deployed systems. */
(function(root){
 'use strict';const T=root.THREE,M=root.WarModels,B=M.Builder;
 const C={concrete:0x85867c,edge:0x575f5b,steel:0x495455,dark:0x263230,glass:0x304c59,white:0xc7cbbd,sand:0xa69a77,yellow:0xb7a057};
 const references={ciws:'https://www.dvidshub.net/image/1182160/protecting-force',sam:'https://www.rtx.com/raytheon/what-we-do/integrated-air-and-missile-defense/patriot',radar:'https://news.lockheedmartin.com/2022-05-04-Lockheed-Martins-First-TPY-4-Radar-Completes-Production-Bringing-Unmatched-Tracking-Precision-and-Speed-to-the-US-and-its-Allies',bunker:'https://www.dvidshub.net/image/1380277/mwss-271-completes-field-exercise-camp-lejeune',laser:'https://www.rtx.com/raytheon/what-we-do/integrated-air-and-missile-defense/lasers'};
 function link(b,a,d,r=.05,c=C.steel){let p=new T.Vector3(...a),q=new T.Vector3(...d),v=q.clone().sub(p),e=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()));b.add(new T.CylinderGeometry(r,r,v.length(),6),c,p.add(q).multiplyScalar(.5).toArray(),[e.x,e.y,e.z]);}
 function rail(b,x,y,z,w){for(let i=0;i<=4;i++)b.box(.04,.65,.04,x-w/2+i*w/4,y+.32,z,C.steel);b.box(w,.045,.045,x,y+.65,z,C.steel);b.box(w,.035,.035,x,y+.3,z,C.steel);}
 function cabinet(b,x,y,z,w=1,d=.7,c=C.edge){b.box(w,1.15,d,x,y+.575,z,c);b.box(w*.88,.95,.025,x,y+.58,z+d/2+.02,C.steel);b.box(.06,.2,.05,x+w*.29,y+.65,z+d/2+.05,C.white);for(let i=0;i<5;i++)b.box(w*.65,.035,.03,x,y+.2+i*.1,z+d/2+.04,C.dark);}
 function stairs(b,x,z,n=5,w=1.2){for(let i=0;i<n;i++)b.box(w,.16*(i+1),.32,x,.08*(i+1),z-i*.32,C.concrete);}
 function crate(b,x,z,c){b.box(.8,.6,.7,x,.6,z,c);for(const s of [-1,1])b.box(.08,.62,.72,x+s*.25,.6,z,C.edge);}
 function wall(b,x,z,w,h,d,c){b.box(w,h,d,x,.3+h/2,z,c);b.box(w+.14,.15,d+.14,x,.3+h,z,C.edge);for(let i=0;i<Math.floor(w/.9);i++)b.box(.025,h,.02,x-w/2+.4+i*.9,.3+h/2,z+d/2+.02,C.edge);}
 function cage(b,x,z,w=1.15,h=1.1){b.box(w,h,.8,x,.3+h/2,z,C.sand);for(let i=0;i<=6;i++)b.box(w,.018,.014,x,.3+i*h/6,z+.41,C.steel);for(let i=0;i<=6;i++)b.box(.018,h,.014,x-w/2+i*w/6,.3+h/2,z+.415,C.steel);b.box(w,.04,.86,x,.3+h,z,C.edge);}
 function roof(b,x,y,z,w,d,c){b.prism([[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]],y,.24,c,.98,0);for(let i=0;i<Math.floor(w/.5);i++)b.box(.035,.025,d,x-w/2+.25+i*.5,y+.27,z,C.edge);}
 function building(kind,f){const b=new B(),t=new B(),c=M.colors[f],r=root.WarData.B[kind].r/7,small=['turret','ciws','sam','laser','shield','jammer','radar','bunker'].includes(kind),w=r*1.65,d=r*1.55;
  if(kind==='runway'){
   // Original 360 x 160 game-scale facility; markings and inset lights stay below its 2u collider.
   const length=360/7,width=160/7;b.box(length,.12,width,0,.06,0,0x535958);b.box(length-.6,.035,width-.6,0,.14,0,0x3b4243);
   for(const side of [-1,1]){b.box(length-1,.025,.13,0,.175,side*(width/2-.5),C.white);for(let x=-24;x<=24;x+=4)b.box(.13,.045,.13,x,.195,side*(width/2-.23),0xb2cfda);}
   for(let x=-18;x<=18;x+=6)b.box(2.5,.025,.18,x,.175,0,C.white);
   for(const end of [-1,1])for(const side of [-1,1])for(let i=0;i<4;i++)b.box(3.3,.025,.24,end*(length/2-3),.175,side*(1.3+i*.65),C.white);
   for(const end of [-1,1])for(const side of [-1,1])b.box(2,.025,.65,end*(length/2-8),.175,side*3.8,C.white);
   const group=new T.Group(),surface=b.finish();surface.name='runway-surface';group.add(surface);group.userData={scale:7,parts:b.parts,profile:'independent-runway-v1',evidenceStatus:'original-game-facility',fiction:false,reviewStatus:'needs-visual-review'};return group;
  }
  if(kind==='navalyard'){for(const s of [-1,1])b.box(1.6,.28,r*2,s*(r-.8),.14,0,C.concrete);b.box(r*2,.28,1.1,0,.14,-r+.55,C.concrete);}
  else b.box(r*2,.28,r*2,0,.14,0,C.concrete);
  for(const s of [-1,1]){b.box(r*2,.12,.12,0,.33,s*r,C.edge);for(let n=0;n<4;n++)b.box(.24,.025,.12,-r+.55+n*(r*2-1.1)/3,.4,s*r,C.yellow);}
  let moving=null;
  if(kind==='ciws'){
   b.box(4.3,.45,2.7,0,.58,0,c);for(const s of [-1,1]){b.box(.35,.25,4.8,s*1.7,.42,0,C.steel);for(const z of [-2,2])b.cyl(.28,.2,s*1.7,.4,z,C.steel);}
   b.cyl(.95,.45,0,.96,0,C.edge);t.box(1.5,1.7,1.55,-.15,.9,0,C.white);t.cyl(.72,1.05,-.3,2.3,0,C.white);t.sphere(.72,-.3,2.83,0,C.white,[1,.6,1]);
   t.box(1.6,.65,.85,.6,.6,0,c);for(let n=0;n<6;n++){let a=n*Math.PI/3;t.cyl(.055,2.7,1.9,.78+Math.cos(a)*.17,Math.sin(a)*.17,C.dark,'x',.055,8);}t.cyl(.25,.18,3.15,.78,0,C.edge,'x');
   for(const s of [-1,1]){link(t,[.15,.4,s*.55],[1.9,1.1,s*.4],.055);link(t,[.15,1.1,s*.55],[1.9,.4,s*.4],.055);if(s===1){t.cyl(.23,.35,.35,1.9,.95,C.edge);t.box(.55,.3,.45,.5,2.15,.95,C.white);t.cyl(.13,.06,.81,2.15,.95,C.glass,'x');}}
   t.cyl(.49,.9,-.6,.55,-1.05,c,'z');for(let n=0;n<14;n++){const a=n/13*Math.PI;t.box(.18,.14,.22,.15+Math.cos(a)*.8,.55+Math.sin(a)*.5,-.86,C.steel,[0,0,-a]);}
   for(const s of [-1,1])for(let row=0;row<3;row++){t.box(.65,.39,.035,-.3,.45+row*.48,s*.795,C.edge);t.box(.5,.31,.04,-.3,.45+row*.48,s*.82,C.white);t.box(.22,.035,.055,-.3,.55+row*.48,s*.85,C.steel);}
   cabinet(b,-1.6,.8,-.8,1.1,.6,c);moving='turret';
  }else if(kind==='sam'){
   b.box(3.5,.5,2.3,0,.6,0,c);b.cyl(.7,.35,0,1.02,0,C.steel);
   for(const s of [-1,1]){b.box(.22,.18,5.2,s*1.5,.42,0,C.steel);for(const z of [-2.4,2.4])b.cyl(.28,.28,s*1.5,.43,z,C.steel);link(t,[-1.9,.1,s*.9],[.9,2.6,s*.9],.11,c);link(t,[1.5,.1,s*.9],[.9,2.6,s*.9],.08,C.steel);}
   // Four inclined canisters share a rotation pivot, with separate endcaps and support cradle.
   const angle=.62;for(let i=0;i<2;i++)for(let j=0;j<2;j++){let z=(j-.5)*.75,y=1.45+i*.7;t.box(4.7,.64,.65,0,y,z,c,[0,0,angle]);for(const s of [-1,1])t.box(.1,.61,.62,s*2.37*Math.cos(angle),y+s*2.37*Math.sin(angle),z,C.edge,[0,0,angle]);for(let n=0;n<5;n++)t.box(.045,.68,.69,(-1.9+n*.9)*Math.cos(angle),y+(-1.9+n*.9)*Math.sin(angle),z,C.steel,[0,0,angle]);}
   t.box(3.8,.22,2.1,-.2,.06,0,c);for(const s of [-1,1])t.box(3.8,.12,.12,-.2,.22,s*.92,C.steel);
   cabinet(b,-2.2,.3,1.8,.9,.6,c);moving='turret';
  }else if(kind==='radar'){
   cabinet(b,-1.9,.3,1.7,1.7,1.3,c);b.box(2.8,1.1,2.1,0,.9,0,c);b.cyl(.65,.45,0,1.65,0,C.steel);t.box(.85,2.8,3.1,-.15,1.45,0,c,[0,0,-.12]);t.box(.08,2.45,2.85,.45,1.5,0,C.dark,[0,0,-.12]);
   for(let i=0;i<12;i++)for(let j=0;j<12;j++){const y=.4+i*.2;t.cyl(.065,.035,.51+(y-1.5)*.12,y,-1.29+j*.235,0x91998a,'x',.065,8);}
   for(const s of [-1,1])link(t,[-.5,.05,s*1.1],[-.8,2.65,s*1.1],.07);t.box(.5,.7,1.9,-.8,1.2,0,C.edge);moving='radar';
  }else if(kind==='bunker'){
   b.prism([[-2.8,-2.1],[2.8,-2.1],[3,-1.4],[3,1.4],[2.8,2.1],[-2.8,2.1]],.3,1.8,C.concrete,.87,0);b.box(5.4,.4,4.2,0,2.25,0,C.edge);
   for(const s of [-1,1]){for(let i=0;i<4;i++)cage(b,-2.15+i*1.4,s*2.5,1.32,.95);b.box(2.1,.23,.04,.9,1.5,s*1.88,C.dark);}
   b.box(.04,.25,2.8,2.7,1.5,0,C.dark);t.box(1,.4,.8,0,0,0,c);t.cyl(.08,1.7,1,0,0,C.steel,'x');b.cyl(.8,.2,.6,2.55,0,c);stairs(b,-2.5,0,3,.8);moving='turret';
  }else if(kind==='turret'){
   b.cyl(1.7,.7,0,.6,0,C.edge);b.cyl(1.1,.45,0,1.15,0,c);t.prism([[-1.1,-.9],[.7,-.9],[1.4,-.5],[1.4,.5],[.7,.9],[-1.1,.9]],0,.85,c,.72,1);t.cyl(.12,2.6,2,.35,0,C.steel,'x');t.cyl(.18,.3,3.25,.35,0,C.dark,'x');t.box(.55,.35,.4,.4,1,-.5,c);t.cyl(.13,.06,.71,1,-.5,C.glass,'x');for(const s of [-1,1])for(let n=0;n<3;n++)t.cyl(.07,.32,-.6+n*.24,.4,s*.95,C.steel,'z');moving='turret';
  }else if(kind==='laser'){
   b.box(3.6,1.1,2.9,0,.85,0,c);for(const s of [-1,1])cabinet(b,-1.1,.3,s*1.9,1.4,.6,c);b.cyl(.6,.35,.4,1.58,0,C.steel);
   t.box(1.65,1.05,1.7,0,.6,0,C.white);for(const s of [-1,1]){t.cyl(s===1?.37:.26,.16,.9,.6,s*.43,C.steel,'x');t.cyl(s===1?.29:.19,.025,1,.6,s*.43,C.glass,'x');t.box(.7,.08,.2,-.3,1.18,s*.7,C.edge);}moving='turret';
  }else if(kind==='shield'){
   b.cyl(1.9,.8,0,.7,0,c,'y',1.7,8);b.cyl(.6,3.2,0,2.4,0,C.steel);for(let n=0;n<6;n++){let a=n*Math.PI/3,x=Math.cos(a)*2,z=Math.sin(a)*2;b.box(.6,1.9,.6,x,1.3,z,c);link(b,[x,2.2,z],[0,3.3,0],.1,C.white);b.cyl(.17,.75,x,2.45,z,C.glass,'y',.1,8);}b.add(new T.TorusGeometry(1.25,.15,8,24),C.glass,[0,3.75,0],[Math.PI/2,0,0]);b.sphere(.42,0,3.75,0,C.white);
  }else if(kind==='jammer'){
   b.box(3.1,1.5,2.6,0,1.05,0,c);b.cyl(.14,4.6,0,3.3,0,C.steel);for(let n=0;n<4;n++){let a=n*Math.PI/2;t.box(.18,1.7,.72,Math.cos(a)*.75,0,Math.sin(a)*.75,C.white,[0,-a,0]);link(t,[0,-.6,0],[Math.cos(a)*.8,-.6,Math.sin(a)*.8],.06);}for(const s of [-1,1]){b.cyl(.035,4.2,s*1.1,3.1,1,C.steel);b.cyl(.14,.5,s*1.1,5.2,1,C.dark);}moving='jammerHead';
  }else if(kind==='power'){
   for(const s of [-1,1]){b.cyl(1.15,2.7,s*1.6,1.7,0,c);b.cyl(1.04,.12,s*1.6,3.12,0,C.dark);for(let i=0;i<12;i++){let a=i*Math.PI/6;link(b,[s*1.6+Math.cos(a)*.97,3.21,Math.sin(a)*.97],[s*1.6-Math.cos(a)*.97,3.21,-Math.sin(a)*.97],.025);}b.box(.9,.7,1.1,s*1.6,.65,2,C.edge);}cabinet(b,0,.3,-2,1.8,1,c);for(let n=0;n<3;n++){b.cyl(.1,3,-1+n,1,-1.8,C.steel,'x');b.cyl(.19,.5,-2.5+n,1.5,-1.8,C.white);}
  }else if(kind==='refinery'){
   wall(b,-1,-.6,w*.5,2.8,d*.65,c);for(const x of [-2.4,-.8,.8]){b.cyl(.75,3.1,x,1.9,-1.5,C.white);b.cyl(.85,.18,x,3.5,-1.5,C.edge);link(b,[x,2,-1.5],[x,2,1.2],.12);}
   b.box(2.8,.3,4,1.7,.45,1.1,C.edge);for(let n=0;n<12;n++)b.cyl(.11,2.6,1.7,.7,-.5+n*.28,C.steel,'x');for(const s of [-1,1])b.box(.16,.18,4,1.7+s*1.4,.75,1.1,C.yellow);b.box(2.2,1.2,1.3,1.7,1.2,-1.6,c);rail(b,-1,3.2,1.4,3.8);
  }else if(kind==='navalyard'){
   for(const s of [-1,1]){b.box(1.5,.55,d, s*(r-.8),.5,0,C.edge);b.box(.35,5.5,.35,s*(r-1),3,-1,C.yellow);for(let n=0;n<5;n++){b.cyl(.15,.4,s*(r-.8),.95,-d/2+.5+n*d/5,C.steel);b.box(.08,.2,1,s*(r-.1),.8,-d/2+.5+n*d/5,C.dark);}}b.box(r*2-1.5,.45,.65,0,5.65,-1,C.yellow);b.box(1,.4,.9,.5,5.3,-1,C.edge);b.cyl(.025,2.5,.5,3.85,-1,C.steel);b.add(new T.TorusGeometry(.25,.055,6,12,Math.PI*1.7),C.steel,[.5,2.5,-1]);wall(b,-r+1.6,1.6,1.8,2,2,c);
  }else if(kind==='spaceport'){
   b.cyl(2.2,.35,.8,.52,.8,C.edge,'y',2.2,12);b.add(new T.TorusGeometry(1.75,.065,6,32),C.yellow,[.8,.72,.8],[Math.PI/2,0,0]);for(const s of [-1,1]){b.box(.22,6.2,.22,-2.5,3.4,s*.7,C.steel);for(let n=0;n<6;n++)link(b,[-2.5,.7+n,s*.7],[-2.5,1.7+n,-s*.7],.06);}b.box(2.4,.25,1.5,-1.5,4.8,0,c);wall(b,2.5,-2,2.3,1.8,1.6,c);cabinet(b,-1.5,.3,-2,1.2,.7,c);
  }else if(kind==='airfield'){
   // Offset hangar leaves a large, readable flight apron and independent control tower.
   wall(b,-2.3,-1.2,4.4,2.5,6.7,c);roof(b,-2.3,2.85,-1.2,4.7,7,C.edge);
   b.box(.04,1.8,4,-.05,1.35,-1.2,C.dark);for(let n=0;n<9;n++)b.box(.06,.1,3.95,0,2.25-n*.13,-1.2,C.steel);
   b.cyl(2.35,.06,2.9,.36,2.1,C.dark,'y',2.35,32);b.add(new T.TorusGeometry(2,.045,5,40),C.yellow,[2.9,.41,2.1],[Math.PI/2,0,0]);
   for(const s of [-1,1])b.box(.18,.035,1.6,2.9+s*.55,.42,2.1,C.white);b.box(1.2,.035,.18,2.9,.43,2.1,C.white);
   wall(b,3,-3.5,1.65,3.5,1.8,c);b.box(2.2,1.05,2.3,3,4.3,-3.5,C.glass);roof(b,3,4.85,-3.5,2.5,2.6,C.edge);for(const s of [-1,1])for(const z of [-1,1])b.box(.1,1.05,.1,3+s*1.06,4.3,-3.5+z*1.1,c);
   b.cyl(.035,1.2,3,5.7,-3.5,C.steel);for(const s of [-1,1]){b.box(.1,.1,4,1,.45,s*2,C.yellow);cabinet(b,-4.8,.3,s*2,1,.65,c);}
  }else if(kind==='repairhub'){
   // Three open sides, exposed maintenance pit and overhead hoist, rather than a closed factory box.
   wall(b,-2.8,0,.6,2.4,5.5,c);b.box(5.1,.06,1.7,.15,.34,0,C.dark);for(const s of [-1,1])b.box(5.3,.06,.13,.15,.4,s*.92,C.yellow);
   for(const x of [-2.3,2.5])for(const s of [-1,1])b.box(.19,2.9,.19,x,1.75,s*2,C.steel);
   roof(b,-1.6,3.25,0,2.8,4.5,C.edge);for(const s of [-1,1])b.box(5.15,.25,.2,.1,3.25,s*2,C.yellow);
   b.box(.3,.35,4.3,1.5,3.18,0,C.yellow);b.box(.6,.42,.65,1.5,2.93,.4,C.edge);b.cyl(.035,1.4,1.5,2.05,.4,C.steel);b.add(new T.TorusGeometry(.2,.045,6,14,Math.PI*1.7),C.steel,[1.5,1.32,.4]);
   for(const s of [-1,1]){cabinet(b,-2,.3,s*2.8,1,.65,c);b.box(.65,.18,.7,.6,1.05,s*1.4,C.steel);b.cyl(.12,.7,.6,.7,s*1.4,C.steel);}
   b.box(1.2,.035,.3,-1.6,3.55,0,C.white);b.box(.3,.035,1.2,-1.6,3.56,0,C.white);
  }else{
   const h=kind==='hq'?2.8:kind==='factory'?3:2;
   wall(b,-.7,-.4,w*.78,h,d*.77,c);roof(b,-.7,h+.35,-.4,w*.82,d*.81,C.edge);
   if(kind==='factory'||kind==='repairhub'||kind==='airfield'){
    b.box(.04,1.8,d*.51,w*.39-.65,1.25,-.4,C.dark);for(let n=0;n<9;n++)b.box(.065,.12,d*.5,w*.39-.6,2.35-n*.13,-.4,C.steel);
    b.box(2,.15,d*.56,w*.39+.2,.4,-.4,C.edge);for(const s of [-1,1])b.box(2,.025,.13,w*.39+.2,.5,-.4+s*d*.24,C.yellow);
    if(kind==='repairhub'){for(const s of [-1,1])b.box(.2,2.3,.2,1.6,1.5,s*1.4,C.yellow);b.box(.2,.2,3,1.6,2.7,0,C.yellow);b.cyl(.04,1.1,1.6,2.1,0,C.steel);b.box(1.3,.05,.32,-.7,h+.65,-.4,C.white);b.box(.32,.05,1.3,-.7,h+.66,-.4,C.white);}
    if(kind==='factory'){for(let n=0;n<3;n++)cabinet(b,-1.8+n*1.4,h+.6,-.4,1,.75,c);b.cyl(.25,3,-w*.3,3,-d*.33,C.steel);}
    if(kind==='airfield'){b.box(2.3,.04,d+1,r-.85,.4,0,C.dark);for(let n=0;n<7;n++)b.box(.13,.025,.45,r-.85,.44,-d/2+n*d/7,C.white);wall(b,-2,-1,1.25,3.5,1.4,c);for(const s of [-1,1])b.box(.03,.7,1.2,-2+s*.65,3.45,-1,C.glass);}
   }else{
    for(let n=0;n<5;n++)b.box(.62,.55,.04,-w*.35+n*w*.14,1.6,d*.385-.38,C.glass);b.box(1,1.5,.06,-.5,1.08,d*.385-.33,C.edge);stairs(b,-.5,d*.385+.5,3,1.2);
    if(kind==='hq'){wall(b,-1.4,-.5,2.5,4.3,2.5,c);b.cyl(.08,3,1.2,4.1,-1,C.steel);b.add(new T.SphereGeometry(.85,18,8,0,Math.PI*2,0,1),C.white,[1.2,5,-1],[0,0,Math.PI]);rail(b,-1.4,4.7,1,2.8);}
    if(kind==='barracks'){for(let n=0;n<4;n++)crate(b,-2+n*1.1,-r+.65,c);b.cyl(.035,4,r-.7,2.4,0,C.steel);b.box(.035,.65,1,r-.7,3.8,.5,c);}
   }
   cabinet(b,-r+.8,.3,r-.8,1.2,.7,c);rail(b,-.8,h+.6,-d*.39-.4,w*.76);
  }
  // Common maintenance scale: access hatches, bolt plates, drain and electrical boxes.
  for(let i=0;i<4;i++)b.cyl(.05,.025,-r+.3+i*.2,.3,-r+.3,C.steel);b.box(1.2,.02,.6,r-.9,.3,-r+.6,C.edge);for(let n=0;n<8;n++)b.box(.04,.025,.58,r-1.4+n*.14,.32,-r+.6,C.dark);
  if(!small)for(const s of [-1,1]){b.box(.045,1.1,.045,s*(r-.3),.9,-r+.3,C.steel);b.box(.18,.18,.18,s*(r-.3),1.5,-r+.3,C.white);}
  if(f==='imp'){for(const s of [-1,1]){b.box(.35,1.9,.45,s*(r-.45),1.25,0,0x754748);b.cyl(.2,.85,s*(r-.45),2.6,0,C.yellow,'y',.015,4);}b.box(r*1.6,.13,.14,0,.5,r-.1,C.yellow);}
  const group=new T.Group(),body=b.finish();body.name='foundation';group.add(body);
  if(moving){
   if(['ciws','sam','turret'].includes(kind))t.cyl(.48,.46,0,-.11,0,C.steel);
   if(kind==='laser')t.cyl(.4,.3,0,.03,0,C.steel);
   const top=t.finish();top.name=moving;top.position.y=kind==='bunker'?2.65:kind==='jammer'?4.6:kind==='radar'?1.9:kind==='laser'?1.8:1.35;group.add(top);
   const ports={ciws:[3.3,.78,0],sam:[2.37*Math.cos(.62),1.8+2.37*Math.sin(.62),0],turret:[3.4,.35,0],bunker:[1.85,0,0],laser:[1,.6,.43]};if(ports[kind]){const anchor=new T.Object3D();anchor.name='muzzle';anchor.position.set(...ports[kind]);top.add(anchor);}
  }
  group.userData={scale:7,parts:b.parts+t.parts,profile:kind+'-detailed-emplacement-v1',evidenceStatus:['laser','shield','jammer'].includes(kind)?'original-concept-facility':references[kind]?'photo-inspired-facility':'original-game-facility',referenceUrl:references[kind]||null,fiction:['laser','shield','jammer'].includes(kind),reviewStatus:'needs-visual-review'};return group;
 }
 for(const f of Object.keys(root.WarData.F))for(const k of Object.keys(root.WarData.B))M.register(k,f,()=>building(k,f));
})(globalThis);
