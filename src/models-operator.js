/* Original single-person operator. No commercial character geometry or textures. */
(function(root){
 'use strict';
 const T=root.THREE,M=root.WarModels,D=root.WarDetail;
 // Per-part bind tags let the optional personnel animator preserve this exterior
 // while skinning independent limbs; ordinary static previews remain unchanged.
 class B extends D.Builder{
  constructor(){super();this.rigPart=0;this.rigParts=[];}
  add(...args){const first=this.p.length/3;super.add(...args);for(let i=first;i<this.p.length/3;i++)this.rigParts.push(this.rigPart);}
  finish(){const mesh=super.finish();mesh.geometry.setAttribute('rigPart',new T.Uint8BufferAttribute(this.rigParts,1));return mesh;}
 }
 const C={rubber:0x202528,metal:0x58646a,glass:0x325a70,skin:0x887b64};
 const kits={
  chn:{cloth:0x4d5944,patch:0xb49a55,visor:0x325a70,pack:.20,antenna:.30},
  usa:{cloth:0x797463,patch:0xa9b6b5,visor:0x325a70,pack:.22,antenna:.23},
  rus:{cloth:0x303a31,patch:0x849378,visor:0x325a70,pack:.24,antenna:.26},
  ind:{cloth:0x797463,patch:0xc58d54,visor:0x325a70,pack:.18,antenna:.28},
  kor:{cloth:0x4d5944,patch:0x9db9c8,visor:0x325a70,pack:.19,antenna:.21},
  imp:{cloth:0x303a31,patch:0xb09a64,visor:0x325a70,pack:.26,antenna:.25}
 };
 function build(f){
  const kit=kits[f],armor=M.colors[f],b=new B(),w=new B();
  const link=(builder,a,z,r,color,r2=r)=>D.link(builder,a,z,r,color,r2,10);
  const box=(builder,width,height,depth,x,y,z,color,r=.015)=>builder.add(D.bevelBox(width,height,depth,Math.min(r,width*.24,height*.24,depth*.24)),color,[x,y,z]);
  // +X is forward; raw height follows the 1.75-unit standing roster soldier.
  // Legs remain one person, with a slight stagger to read clearly from RTS view.
  for(const side of [-1,1]){
   const joint=side===-1?1:4;b.rigPart=joint;
   const z=side*.135,step=side*.045,knee=[step+.025,.48,z],ankle=[step-.015,.135,z];
   link(b,[0,.88,z],knee,.092,kit.cloth,.105);b.rigPart=joint+1;link(b,knee,ankle,.067,kit.cloth,.087);
   b.sphere(.085,...knee,kit.cloth,[1,1.12,1]);box(b,.065,.15,.135,knee[0]+.075,.48,z,armor,.02);
   for(const y of [.44,.53])b.box(.11,.025,.15,knee[0]+.015,y,z,C.rubber);
   b.rigPart=joint+2;box(b,.24,.12,.17,ankle[0]+.055,.085,z,C.rubber,.025);
   b.box(.25,.035,.18,ankle[0]+.055,.026,z,C.rubber);
   for(let i=0;i<3;i++)b.box(.02,.012,.12,ankle[0]+.015+i*.035,.149,z,C.metal);
   b.rigPart=joint;box(b,.105,.16,.09,-.025,.68,z+side*.09,kit.cloth);
  }
  b.rigPart=0;
  b.sphere(.25,0,.94,0,kit.cloth,[.65,.52,.95]);
  b.sphere(.25,0,1.20,0,kit.cloth,[.65,1.05,.91]);
  box(b,.29,.35,.37,.015,1.205,0,armor,.03);
  box(b,.08,.27,.32,.185,1.23,0,armor,.025);
  b.box(.32,.06,.41,0,1.015,0,C.rubber);
  for(const z of [-.12,0,.12]){
   box(b,.09,.15,.095,.238,1.12,z,kit.cloth);
   b.box(.012,.023,.075,.29,1.16,z,C.rubber);
  }
  for(const side of [-1,1]){
   box(b,.08,.28,.055,.18,1.24,side*.19,kit.cloth);
   box(b,.1,.12,.08,.06,1.1,side*.245,armor);
   b.box(.04,.04,.07,.118,1.1,side*.245,kit.patch);
  }
  box(b,kit.pack,.32,.32,-.20-kit.pack*.2,1.19,0,kit.cloth,.025);
  box(b,.045,.19,.19,-.235-kit.pack*.7,1.17,0,armor);
  box(b,.10,.18,.11,-.16,1.36,-.20,C.rubber);
  b.cyl(.008,kit.antenna,-.16,1.45+kit.antenna*.5,-.20,C.metal,'y',.005,6);
  b.cyl(.06,.1,0,1.465,0,C.skin,'y',.062,12);
  b.sphere(.12,.012,1.585,0,C.skin,[.86,1.12,.85]);
  // Helmet shell, rail mounts, goggles, headset and a small microphone.
  b.add(new T.SphereGeometry(.142,20,12,0,Math.PI*2,0,Math.PI*.60),armor,[-.012,1.645,0],[0,0,0],[1,.80,1]);
  for(const side of [-1,1]){
   b.box(.12,.024,.023,-.013,1.66,side*.136,C.rubber);
   b.sphere(.043,-.005,1.585,side*.13,C.rubber,[.85,1.2,.55]);
   b.box(.065,.075,.018,-.005,1.585,side*.156,armor);
   link(b,[.005,1.54,side*.12],[.065,1.50,side*.035],.009,C.rubber);
  }
  b.box(.028,.058,.19,.119,1.603,0,C.rubber);
  for(const side of [-1,1])b.box(.018,.035,.074,.14,1.604,side*.043,kit.visor);
  box(b,.037,.055,.06,.13,1.682,0,C.rubber,.009);
  link(b,[.015,1.57,.155],[.12,1.53,.075],.008,C.metal);
  b.sphere(.014,.126,1.529,.068,C.rubber);
  // Covered gloved hands hold an original compact rifle; no naked skin arms.
  const gunY=1.335,gunZ=.17;
  for(const side of [-1,1]){
   const shoulder=[0,1.385,side*.235],elbow=[.13,1.115,side*.25],hand=[side===1?.31:.53,1.275,gunZ];
   const joint=side===-1?7:10;b.rigPart=joint;
   link(b,shoulder,elbow,.072,kit.cloth,.082);b.sphere(.075,...elbow,kit.cloth);
   box(b,.12,.17,.075,.015,1.34,side*.26,armor,.02);
   b.box(.07,.07,.015,.015,1.35,side*.304,kit.patch);
   b.rigPart=joint+1;link(b,elbow,hand,.054,kit.cloth,.064);b.rigPart=joint+2;box(b,.065,.075,.09,hand[0]-.045,hand[1]-.012,hand[2],C.rubber);
   b.sphere(.052,...hand,C.rubber,[1.14,.82,.80]);
   for(const offset of [-.025,0,.025])b.box(.045,.018,.012,hand[0]+.028,hand[1],hand[2]+offset,armor);
  }
  b.rigPart=0;
  box(w,.28,.095,.075,.37,gunY,gunZ,C.rubber);
  box(w,.18,.09,.073,.15,gunY-.005,gunZ,armor);
  w.box(.035,.12,.08,.045,gunY-.017,gunZ,C.rubber);
  box(w,.24,.076,.075,.62,gunY,gunZ,armor);
  for(let i=0;i<5;i++)for(const side of [-1,1])w.box(.021,.024,.006,.53+i*.038,gunY,gunZ+side*.041,C.rubber);
  w.cyl(.018,.29,.885,gunY,gunZ,C.metal,'x',.018,12);
  w.cyl(.024,.055,1.03,gunY,gunZ,C.rubber,'x',.024,12);
  w.cyl(.012,.008,1.06,gunY,gunZ,C.rubber,'x',.012,10);
  box(w,.065,.13,.055,.37,gunY-.105,gunZ,C.rubber);
  w.box(.055,.09,.048,.28,gunY-.075,gunZ,C.rubber,[0,0,-.25]);
  w.box(.37,.018,.045,.43,gunY+.058,gunZ,C.metal);
  w.cyl(.033,.10,.41,gunY+.103,gunZ,C.rubber,'x',.033,12);
  w.cyl(.023,.008,.465,gunY+.103,gunZ,C.glass,'x',.023,12);
  if(f==='imp'){
   // Original restrained powered-armor detail, not a franchise character copy.
   for(const side of [-1,1])box(b,.16,.12,.09,-.025,1.395,side*.27,armor,.02);
   box(b,.05,.09,.10,.235,1.33,0,kit.patch);
  }
  const body=b.finish(),rifle=w.finish(),g=new T.Group();body.name='operatorBody';rifle.name='operatorRifle';g.add(body,rifle);
  const muzzle=new T.Object3D();muzzle.name='muzzle';muzzle.position.set(1.065,gunY,gunZ);g.add(muzzle);
  g.userData={scale:5.6,parts:body.userData.parts+rifle.userData.parts,original:true,evidenceStatus:'original-fictional-operator',squadMembers:1,modelFamily:'operator',profile:`operator-${f}-v1`,fiction:true,detailPass:1,designRole:'独立玩家行动员',gear:['helmet','goggles','headset','armor','magazinePouches','gloves','kneePads','boots','rifle'],weaponAppearance:'original-default-rifle'};
  return g;
 }
 for(const f of Object.keys(kits))M.register('operator',f,()=>build(f));
 root.WarOperatorModel={build};
})(globalThis);
