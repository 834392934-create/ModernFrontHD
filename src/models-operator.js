/* Original single-person operator. No commercial character geometry or textures. */
(function(root){
 'use strict';
 const T=root.THREE,M=root.WarModels,D=root.WarDetail;
 // Per-part bind tags let the optional personnel animator preserve this exterior
 // while skinning independent limbs; ordinary static previews remain unchanged.
 class B extends D.Builder{
  constructor(){super();this.rigPart=0;this.rigParts=[];this.fabrics=new Set();}
  add(...args){const first=this.p.length/3;if(this.fabrics.has(args[1]))args[6]=D.Surface.cloth;super.add(...args);for(let i=first;i<this.p.length/3;i++)this.rigParts.push(this.rigPart);}
  finish(){const mesh=super.finish();mesh.geometry.setAttribute('rigPart',new T.Uint8BufferAttribute(this.rigParts,1));return mesh;}
 }
 const C={rubber:0x202528,metal:0x58646a,glass:0x325a70,skin:0x887b64};
 const kits={
  chn:{cloth:0x596254,armor:0x515b48,patch:0x96936d,visor:0x325a70,pack:.20,antenna:.26,helmet:[1.04,.80,1.04,.70],helmetProfile:'covered-full-cut',pattern:'grey-green-pixel',rails:false,eyewear:false,headset:false,nvg:false,pouches:3,pouchHeight:.19},
  usa:{cloth:0x797463,armor:0x756c55,patch:0x969582,visor:0x325a70,pack:.22,antenna:.23,helmet:[1.04,.81,1.05,.63],helmetProfile:'covered-modular-rail',pattern:'tan-organic',rails:true,eyewear:true,headset:true,nvg:true,pouches:3,pouchHeight:.15},
  rus:{cloth:0x535d3c,armor:0x454e35,patch:0x798166,visor:0x325a70,pack:.24,antenna:.26,helmet:[1.09,.83,1.08,.72],helmetProfile:'covered-rounded-generic',pattern:'olive-fine-pixel',rails:false,eyewear:true,headset:false,nvg:false,pouches:3,pouchHeight:.20},
  ind:{cloth:0x576147,armor:0x595d3b,patch:0x9a8a5b,visor:0x325a70,pack:.18,antenna:.28,helmet:[1.06,.80,1.08,.70],helmetProfile:'smooth-full-cut-brim',pattern:'olive-layered',rails:false,eyewear:false,headset:false,nvg:false,pouches:3,pouchHeight:.19},
  kor:{cloth:0x525b47,armor:0x4d5541,patch:0x8b927e,visor:0x325a70,pack:.19,antenna:.21,helmet:[1.02,.81,1.06,.67],helmetProfile:'covered-medium-cut-generic',pattern:'brown-green-pixel',rails:false,eyewear:true,headset:true,nvg:true,pouches:4,pouchHeight:.16},
  imp:{cloth:0x303a31,armor:0x414b49,patch:0xb09a64,visor:0x325a70,pack:.26,antenna:.25,helmet:[1.13,.84,1.12,.65],helmetProfile:'original-powered',pattern:'original-solid',rails:true,eyewear:true,headset:true,nvg:true,pouches:2,pouchHeight:.17}
 };
 const materials=new Map();
 function kitMaterial(f){if(materials.has(f))return materials.get(f);const mat=D.createMaterial(),base=mat.onBeforeCompile,pattern=kits[f].pattern;
  mat.name='PersonnelFabric_'+f;mat.onBeforeCompile=shader=>{base(shader);const digital=pattern.includes('pixel');
   shader.fragmentShader=shader.fragmentShader.replace('float pat=sin(dPos.x*27.0+sin(dPos.z*31.0))+sin(dPos.y*23.0+dPos.z*17.0);',digital?'float pat=dh(floor(dPos*'+(f==='rus'?'94.0':'64.0')+'))*2.0-1.0;':f==='imp'?'float pat=.25;':'float pat=sin(dPos.x*31.0+sin(dPos.z*19.0))+sin(dPos.y*28.0+dPos.z*21.0);');
  };mat.customProgramCacheKey=()=> 'personnel-fabric-'+f+'-v2';materials.set(f,mat);return mat;
 }
 function build(f){
  const kit=kits[f],armor=kit.armor,b=new B(),w=new B();b.fabrics=new Set([kit.cloth,armor]);
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
  for(let i=0;i<kit.pouches;i++){const z=(i-(kit.pouches-1)/2)*.10;
   box(b,.09,kit.pouchHeight,.085,.238,1.12,z,kit.cloth);
   b.box(.012,.023,.075,.29,1.16,z,C.rubber);
  }
  // Sewn webbing, carrier shoulder straps and an exposed central release tab.
  for(const y of [1.22,1.27,1.32])for(const z of [-.11,0,.11])b.box(.012,.011,.078,.231,y,z,kit.cloth);
  b.box(.028,.044,.044,.235,1.36,0,C.rubber);
  for(const side of [-1,1]){
   link(b,[-.13,1.39,side*.15],[.17,1.39,side*.15],.026,kit.cloth);
   b.box(.055,.024,.047,.12,1.398,side*.15,C.rubber);
   box(b,.12,.13,.07,-.08,1.04,side*.25,kit.cloth);
   b.box(.016,.035,.044,-.013,1.07,side*.25,C.rubber);
  }
  // Small asymmetric IFAK and utility pouch; a rear hydration hose is routed over the shoulder.
  box(b,.13,.17,.13,-.13,.99,-.24,kit.cloth);b.box(.018,.05,.08,-.057,.99,-.24,C.rubber);
  link(b,[-.29,1.30,.13],[-.12,1.42,.18],.012,C.rubber);link(b,[-.12,1.42,.18],[.16,1.36,.18],.012,C.rubber);
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
  b.add(new T.SphereGeometry(.142,20,12,0,Math.PI*2,0,Math.PI*kit.helmet[3]),f==='ind'?armor:kit.cloth,[-.012,1.645,0],[0,0,0],kit.helmet.slice(0,3));
  // The rim follows the dome instead of using the same high-cut rails for every army.
  for(let i=0;i<18;i++){const a=i*Math.PI*2/18,aa=(i+1)*Math.PI*2/18,r=.142*Math.sin(Math.PI*kit.helmet[3]),yy=1.645+.142*kit.helmet[1]*Math.cos(Math.PI*kit.helmet[3]);link(b,[-.012+Math.cos(a)*r*kit.helmet[0],yy,Math.sin(a)*r*kit.helmet[2]],[-.012+Math.cos(aa)*r*kit.helmet[0],yy,Math.sin(aa)*r*kit.helmet[2]],.005,C.rubber);}
  if(f==='ind')b.box(.065,.012,.18,.115,1.621,0,armor);
  if(f==='rus'){box(b,.10,.11,.28,-.12,1.45,0,kit.cloth);box(b,.04,.10,.24,.16,1.405,0,kit.cloth);}
  for(const side of [-1,1]){
   if(kit.rails)b.box(.12,.024,.023,-.013,1.66,side*.136,C.rubber);
   if(kit.headset){b.sphere(.043,-.005,1.585,side*.13,C.rubber,[.85,1.2,.55]);b.box(.065,.075,.018,-.005,1.585,side*.156,armor);}
   else b.sphere(.022,.005,1.575,side*.105,C.skin,[.45,1,.65]);
   link(b,[.005,1.54,side*.12],[.065,1.50,side*.035],.009,C.rubber);
   b.box(.012,.020,.025,.027,1.526,side*.08,C.rubber);
  }
  if(kit.eyewear){b.box(.028,.049,.19,.119,1.603,0,C.rubber);for(const side of [-1,1])b.box(.018,.031,.074,.14,1.604,side*.043,kit.visor);}
  else{for(const side of [-1,1])b.box(.008,.012,.030,.118,1.601,side*.045,C.rubber);b.sphere(.021,.13,1.565,0,C.skin,[.65,1.1,.65]);}
  if(kit.nvg)box(b,.037,.055,.06,.13,1.682,0,C.rubber,.009);
  if(kit.headset){link(b,[.015,1.57,.155],[.12,1.53,.075],.008,C.metal);b.sphere(.014,.126,1.529,.068,C.rubber);}
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
  const body=b.finish(),rifle=w.finish(),g=new T.Group();body.material=rifle.material=kitMaterial(f);body.name='operatorBody';rifle.name='operatorRifle';g.add(body,rifle);
  const muzzle=new T.Object3D();muzzle.name='muzzle';muzzle.position.set(1.065,gunY,gunZ);g.add(muzzle);
  g.userData={scale:5.6,parts:body.userData.parts+rifle.userData.parts,original:true,evidenceStatus:'reference-informed-game-kit',squadMembers:1,personnelKit:f,uniformPattern:kit.pattern,helmetProfile:kit.helmetProfile,referenceStatus:f==='imp'?'original-fiction':'reference-informed-game-kit',modelFamily:'operator',profile:`operator-${f}-v2`,fiction:true,detailPass:2,designRole:'独立玩家行动员',gear:['helmet','armor','magazinePouches','webbing','IFAK','hydrationHose','gloves','kneePads','boots','rifle',...(kit.eyewear?['goggles']:[]),...(kit.headset?['headset']:[])],weaponAppearance:'original-default-rifle'};
  return g;
 }
 for(const f of Object.keys(kits))M.register('operator',f,()=>build(f));
 root.WarOperatorModel={build,kits};
})(globalThis);
