/* Original game exterior meshes. Observed silhouettes; no manufacturing dimensions.
 * References and remaining uncertainty: docs/reviews/ground-reference-review.md. */
(function(root){
 'use strict';
 const T=root.THREE,M=root.WarModels,{Builder:B,colors,steel,rubber,glass,dark}=M;
 const names={usa:['M2A3 Bradley','M109A7 Paladin','M142 HIMARS','Stryker M-SHORAD'],rus:['BMP-3','2S19 Msta-S','BM-30 Smerch','Pantsir-S1'],chn:['ZBD-04A','PLZ-05','PHL-191','HQ-17'],ind:['BMP-2 Sarath','K9 Vajra-T','Pinaka','Akash'],kor:['K21','K9 Thunder','K239 Chunmoo','K30 Biho']};
 // Source pages of photographs actually inspected; research reference, not asset licences.
 const referenceUrls={
  "ifv_usa": "https://www.dvidshub.net/image/6775085/iron-rangers-off-load-military-vehicles-mk-air-base",
  "ifv_rus": "https://defence-ua.com/news/zsu_na_pjatij_misjats_vijni_prodovzhujut_zbirati_trofejni_bmp_3_rashistiv_foto-8320.html",
  "ifv_chn": "https://odin.t2com.army.mil/WEG/Asset/ZBD-04A_Chinese_Amphibious_Infantry_Fighting_Vehicle_%28IFV%29",
  "ifv_ind": "https://timesofindia.indiatimes.com/defence/weapons/tank/bmp-2-sarath",
  "ifv_kor": "https://historia.org.pl/2022/05/30/k21-i-as21-redback-czyli-koreanskie-bojowe-wozy-piechoty/",
  "arty_usa": "https://babel.ua/amp/news/46776-ssha-pochinaye-vikoristovuvati-suputniki-dlya-navedennya-artileriji-na-cili",
  "arty_rus": "https://commons.wikimedia.org/wiki/File%3AArtillery_exercise_with_2S19_Msta-S_at_the_Mulino_Training_Ground_%2825-03-2020%29_06.jpg",
  "arty_chn": "https://www.sohu.com/picture/752175627",
  "arty_ind": "https://m.economictimes.com/news/defence/lt-bags-its-biggest-defence-order-worth-rs-4500-crore-to-supply-self-propelled-guns-to-indian-army/articleshow/58644663.cms",
  "arty_kor": "https://medium.com/lessons-from-history/5-most-dangerous-artillery-guns-in-the-world-9a35d8a1e491",
  "rocket_usa": "https://thegaze.media/news/victorys-arsenal-its-himars-oclock",
  "rocket_rus": "https://truck-encyclopedia.com/coldwar/ussr/BM-30_Smerch.php",
  "rocket_chn": "https://www.g-enews.com/article/General-News/2019/12/201912091306401342c5557f8da8_1",
  "rocket_ind": "https://tribune.com.pk/story/2527703/france-in-talks-to-purchase-rocket-launcher-from-india-officials-confirm",
  "rocket_kor": "https://commons.wikimedia.org/wiki/File:K239_Chunmoo_MLRS.png",
  "aa_usa": "https://odin.t2com.army.mil/WEG/Asset/d8e35b53d1a96872dcc5ca0865253b54",
  "aa_rus": "https://commons.wikimedia.org/wiki/File:Bronnitsy_-_02_-_Pantsir-S1_SAM.jpg",
  "aa_chn": "https://www.popsci.com/blog-network/eastern-arsenal/hq-17-classic-russian-missile-new-chinese-twist/",
  "aa_ind": "https://m.rediff.com/news/report/r-day-parade-indian-army-showcases-its-might-at-rajpath/20220126.htm",
  "aa_kor": "https://w.atwiki.jp/namacha/pages/60.html"
};
 // Extrude a side silhouette along the vehicle width. Unlike a uniformly inset box,
 // this preserves a low bow, vertical rear door and long flat engine/deck areas.
 function section(b,pts,w,c,z=0){
   const shape=new T.Shape();pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
   const geo=new T.ExtrudeGeometry(shape,{depth:w,bevelEnabled:false,steps:1});b.add(geo,c,[0,0,z-w/2],[0,0,0],[1,1,1],1);
 }
 function faceted(b,lower,upper,h,c){
   const pos=[],n=lower.length,v=(a,i)=>[a[i][0],a===lower?0:h,a[i][1]];
   for(let i=0;i<n;i++){let j=(i+1)%n;pos.push(...v(lower,i),...v(upper,i),...v(upper,j),...v(lower,i),...v(upper,j),...v(lower,j));}
   for(let i=1;i<n-1;i++)pos.push(...v(upper,0),...v(upper,i+1),...v(upper,i));
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();b.add(g,c,[0,0,0],[0,0,0],[1,1,1],1);
 }
 function plate(b,w,h,x,y,z,c){b.box(w,h,.045,x,y,z,c,[0,0,0],1);for(let q of [-1,1])for(let s of [-1,1])b.cyl(.026,.017,x+q*w*.4,y+s*h*.36,z+Math.sign(z)*.03,steel,'z',.026,6);}
 function hatch(b,x,y,z,c,r=.3){b.cyl(r,.045,x,y,z,dark);b.cyl(r*.91,.045,x,y+.035,z,c);b.box(.19,.04,.04,x,y+.08,z,steel);}
 function optic(b,x,y,z,c){b.box(.25,.2,.3,x,y,z,c);b.box(.015,.12,.2,x+.133,y,z,glass);}
 function antenna(b,x,y,z){b.cyl(.04,.16,x,y,z,steel);b.cyl(.009,1.3,x,y+.68,z,dark,'y',.005,6);}
 function lights(b,x,y,w,c){for(let s of [-1,1]){b.box(.16,.23,.37,x,y,s*w,c);b.cyl(.075,.025,x+.1,y,s*w,0xe0dfbe,'x');b.cyl(.04,.025,x+.1,y,s*w+s*.12,0xd38f43,'x');}}
 function vent(b,x,y,z,w=.7){for(let j=0;j<9;j++)b.box(w,.018,.035,x,y,z+(j-4)*.075,dark);}
 // M109 exterior-only interpretation of ground/5.jpg. These art-space values
 // stay inside the previous brake envelope; they are not engineering dimensions.
 function paladinBrake(b,end,y,z,r,c){
   const halfY=r*1.3,halfZ=r*1.35,back=end-.07,front=end+.23;
   function rim(x,depth,inner){
     const shape=new T.Shape(),corner=.025;
     shape.moveTo(-halfZ+corner,-halfY);shape.lineTo(halfZ-corner,-halfY);shape.lineTo(halfZ,-halfY+corner);shape.lineTo(halfZ,halfY-corner);shape.lineTo(halfZ-corner,halfY);shape.lineTo(-halfZ+corner,halfY);shape.lineTo(-halfZ,halfY-corner);shape.lineTo(-halfZ,-halfY+corner);shape.closePath();
     const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
     b.add(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:16}),c,[x,y,z],[0,Math.PI/2,0]);
   }
   // Three perforated exterior edges and continuous upper/lower shell strips
   // leave two genuinely open side windows, rather than dark painted rectangles.
   rim(back,.025,r*.85);rim(end+.095,.026,r*.74);rim(front-.03,.03,r*.68);
   for(const s of [-1,1])b.box(front-back,.026,halfZ*2,(front+back)/2,y+s*(halfY-.013),z,c);
 }
 function barrel(b,x,y,z,len,r,c,muzzle=false){
   if(muzzle==='m109-open'){
     const geo=new T.CylinderGeometry(r*.85,r,len,16),cap=geo.groups.find(g=>g.materialIndex===1),ids=Array.from(geo.index.array);
     // Remove only the outward cap. Keep the original tube, rear closure and
     // primitive identity so the existing recoil rig still owns the barrel.
     geo.setIndex(ids.filter((_,i)=>i<cap.start||i>=cap.start+cap.count));geo.clearGroups();b.add(geo,c,[x+len/2,y,z],[0,0,-Math.PI/2]);
   }else b.cyl(r,len,x+len/2,y,z,c,'x',r*.85,16);
   b.cyl(r*1.35,.35,x+len*.3,y,z,c,'x');
   if(muzzle==='m109-open')paladinBrake(b,x+len,y,z,r,c);
   else if(muzzle){b.box(.3,r*2.6,r*2.7,x+len+.08,y,z,c);for(let s of [-1,1])b.box(.15,r*1.3,.01,x+len+.04,y,z+s*r*1.37,dark);}
   else b.cyl(r*.7,.008,x+len+.008,y,z,dark,'x');
 }
 function chassis(b,f,L=6.6,height=1.7,skirt=true){
   const c=colors[f];M.tracks(b,L,c,6);
   section(b,[[-L/2,.68],[L/2-.35,.68],[L/2,1.08],[L/2-(height<1.7?1.65:.95),height],[-L/2,height]],2.75,c);
   for(let s of [-1,1]){b.box(L-.15,.07,.6,0,1.35,s*1.55,c);if(skirt)for(let i=0;i<6;i++)plate(b,(L-.5)/6-.03,height-.85,-L/2+.45+i*(L-.5)/6,(height+.85)/2,s*1.78,c);else b.box(L-.3,.24,.08,0,1.39,s*1.75,c);}
   lights(b,L/2-.55,height-.18,1.2,c);b.box(.04,height-.82,1.4,-L/2-.03,(height+.82)/2,0,c);for(let s of [-1,1])b.box(.07,.08,.14,-L/2-.08,height-.3,s*.5,steel);
   hatch(b,L/2-1,height+.025,-.75,c,.28);optic(b,L/2-.82,height+.13,-.75,c);vent(b,1.4,height+.016,.45);
 }
 function wheel(b,x,y,z,c,r=.61){
   b.cyl(r,.47,x,y,z,rubber,'z',r,24);const s=Math.sign(z);b.cyl(r*.59,.03,x,y,z+s*.25,c,'z',r*.59,20);b.cyl(.16,.07,x,y,z+s*.28,steel,'z');
   for(let a=0;a<24;a++){let v=a*Math.PI/12;b.box(.13,.05,.5,x+Math.cos(v)*r,y+Math.sin(v)*r,z,0x333832,[0,0,v-Math.PI/2]);}
   for(let a=0;a<8;a++){let v=a*Math.PI/4;b.cyl(.025,.02,x+Math.cos(v)*r*.35,y+Math.sin(v)*r*.35,z+s*.28,steel,'z',.025,6);}
 }
 function truck(b,f,L=9,axles=4,cab='flat'){
   const c=colors[f],front=L/2,rear=-L/2;
   b.box(L,.3,2.4,0,.94,0,steel);b.box(L-2.3,.14,2.8,-1.1,1.45,0,c);
   const positions=axles===3?[front-1.1,rear+2.1,rear+.65]:[front-1.05,front-2.45,rear+2.15,rear+.7];
   for(let x of positions)for(let s of [-1,1]){wheel(b,x,.7,s*1.35,c);b.box(.9,.07,.65,x,1.4,s*1.35,c);}
   const z=cab==='smerch'?-.64:0,w=cab==='smerch'?1.28:2.75;
   const cabTop=f==='kor'?3.35:f==='chn'?3.12:3.0,lean=f==='ind'?.15:f==='kor'?.24:.4;
   section(b,[[front-2,1.4],[front,1.4],[front,2.35],[front-lean,cabTop],[front-2,cabTop]],w,c,z);
   for(let s of [-1,1]){
     const wy=(cabTop+2.35)/2,wx=front-lean/2+.025;
     b.box(.025,(cabTop-2.35)*.8,w*.41,wx,wy,z+s*w*.25,glass,[0,0,Math.atan(lean/(cabTop-2.35))]);
     b.box(1.25,cabTop-2.35,.02,front-1.18,(cabTop+2.2)/2,z+s*w*.505,glass);plate(b,1.1,.75,front-1.2,1.91,z+s*w*.505,c);
     b.box(.23,.035,.05,front-1.6,2.12,z+s*(w*.51),steel);b.box(.13,.3,.12,front-.6,2.58,z+s*(w*.63),steel);b.box(.8,.06,.25,front-1.25,1.25,z+s*(w*.52),steel);
   }
   b.box(.16,.22,2.82,front+.04,1.32,0,c);lights(b,front+.14,1.42,1.05,c);for(let i=0;i<5;i++)b.box(.025,.035,1.1,front+.02,1.7+i*.07,z,dark);
   for(let s of [-1,1]){b.box(.26,.035,.035,front-.05,2.48,z+s*w*.25,steel,[0,0,.2]);b.cyl(.028,.2,front-.2,3.12,z+s*w*.4,0xc78b31);}
   for(let s of [-1,1]){b.box(1.2,.45,.55,.25,1.04,s*1.1,c);b.cyl(.35,.95,-.8,1.05,s*.96,c,'x');}
   return front;
 }
 function finish(b,t,f,k,ty,tx=0){const g=new T.Group();g.add(b.finish());let mesh=t.finish();mesh.name='turret';mesh.position.set(tx,ty,0);g.add(mesh);g.userData={scale:6.4,parts:b.parts+t.parts,profile:names[f][['ifv','arty','rocket','aa'].indexOf(k)],referenceUrl:referenceUrls[k+'_'+f],evidenceStatus:'photo-referenced',modelRevision:3};return g;}
 // Coordinates are derived from the existing visible primitive's outer face.
 // The tiny normal offset avoids coplanar flashes; no geometry or envelope changes.
 function firingPoint(g,face,source,family='cannon',normal=[1,0,0]){const a=new T.Object3D();a.name='muzzle';a.position.set(...face).addScaledVector(new T.Vector3(...normal),.012);a.userData={source,face:face.slice(),outward:normal.slice(),artOffset:.012};g.getObjectByName('turret').add(a);g.userData.muzzleSource=source;g.userData.muzzleFamily=family;return g;}
 function ifv(f){
   const b=new B(),t=new B(),c=colors[f],low=f==='rus'||f==='ind',h=low?1.58:f==='usa'?2.03:1.9,L=f==='usa'?6.8:f==='chn'?7.0:6.7;
   chassis(b,f,L,h,!low);const tx=f==='ind'?-.35:f==='chn'?-.5:f==='usa'?-.15:0;
   if(low){t.cyl(.95,.45,0,.3,0,c,'y',.73,20);t.cyl(.65,.12,0,.58,0,c);for(let s of [-1,1]){hatch(t,-.22,.68,s*.45,c,.23);for(let i=0;i<3;i++)t.cyl(.045,.25,.2-i*.18,.42,s*.92,steel,'z');}barrel(t,.7,.3,0,f==='rus'?3:2.7,f==='rus'?.09:.045,c);if(f==='rus'){barrel(t,.65,.39,-.21,2.9,.042,steel);for(let s of [-1,1])b.cyl(.025,.6,L/2-.1,1.35,s*.9,steel,'x');}else{t.box(.55,.08,.08,0,.9,0,steel);t.cyl(.1,.7,0,.95,0,c,'x');}}
   else{
     const tall=f==='usa';
     if(f==='kor')faceted(t,[[-1.25,-1.1],[.8,-1.1],[1.15,-.7],[1.15,.7],[.8,1.1],[-1.25,1.1]],[[-1.12,-.96],[.55,-.96],[.7,-.6],[.7,.6],[.55,.96],[-1.12,.96]],.85,c);
     else t.prism([[-1.15,-.9],[.65,-.85],[1.15,-.4],[1.15,.4],[.65,.85],[-1.15,.9]],0,tall?.95:.72,c,.8);
     if(tall){t.box(1.5,.65,.45,-.2,.7,-1.06,c);for(let z of [-1.18,-.94])t.cyl(.12,.018,.56,.7,z,dark,'x');t.box(.55,.7,.7,-.6,1.15,.6,c);optic(t,-.28,1.35,.6,c);}
     if(f==='chn'){for(let s of [-1,1])for(let j=0;j<4;j++)plate(t,.38,.4,-.8+j*.42,.4,s*.91,c);barrel(t,.9,.28,-.2,3.0,.085,c);barrel(t,.9,.28,.05,2.8,.038,steel);}
     else{barrel(t,.85,.34,0,f==='kor'?2.35:2.65,f==='kor'?.055:.04,steel);}
     for(let s of [-1,1]){hatch(t,-.25,.9,s*.45,c,.27);optic(t,.2,1.05,s*.55,c);for(let j=0;j<3;j++)t.cyl(.045,.27,.6-j*.15,.43,s*(f==='kor'?1.12:.9),steel,'z');}
     if(f==='kor'){for(let s of [-1,1]){for(let i=0;i<4;i++)t.box(.035,.4,.035,-1.25+i*.3,.45,s*1.15,steel);t.box(1.0,.035,.035,-.8,.66,s*1.15,steel);}}
   }
   for(let s of [-1,1]){antenna(t,-.7,.75,s*.65);for(let i=0;i<3;i++)hatch(b,-1-i*.65,h+.025,s*.63,c,.22);}
   const primary=f==='rus'?[.7+3+.012,.3,0]:f==='ind'?[.7+2.7+.012,.3,0]:f==='chn'?[.9+3+.012,.28,-.2]:[.85+(f==='kor'?2.35:2.65)+.012,.34,0];
   return firingPoint(finish(b,t,f,'ifv',h+.04,tx),primary,'ifv-primary-barrel-front-cap',f==='rus'||f==='chn'?'cannon':'autocannon');
 }
 function arty(f){
   const b=new B(),t=new B(),c=colors[f],msta=f==='rus',paladin=f==='usa',L=paladin?7.2:msta?7.4:7.5;
   chassis(b,f,L,1.62,false);const len=msta?4.5:paladin?3.9:4.2,w=msta?2.95:2.85,h=paladin?1.42:msta?1.85:1.48;
   const lower=[[-len/2,-w*.42],[-len/2+.25,-w/2],[len/2-.4,-w/2],[len/2,-w*.35],[len/2,w*.35],[len/2-.4,w/2],[-len/2+.25,w/2],[-len/2,w*.42]];
   const upper=lower.map(([x,z])=>[x>0?x-(paladin?.5:.3):x+.1,z*.88]);faceted(t,lower,upper,h,c);
   // Gun cradle is visibly recessed between shaped cheeks, rather than one flat wall.
   t.box(.045,.85,1.03,len/2-.03,.79,0,dark);for(let s of [-1,1])section(t,[[len/2-.5,.25],[len/2+.22,.25],[len/2+.22,.9],[len/2-.15,1.2],[len/2-.5,1.2]],.25,c,s*.51);
   t.cyl(.29,.84,len/2-.07,.85,0,c,'z');t.box(.35,.45,.45,len/2+.06,.85,0,c);const gunLength=paladin?4.1:5.0;barrel(t,len/2,.85,0,gunLength,.11,c,paladin?'m109-open':true);
   t.cyl(.21,.8,len/2+1,.85,0,c,'x');for(let j=0;j<5;j++)t.cyl(.19,.025,len/2+.2+j*.15,.85,0,steel,'x');
   for(let s of [-1,1]){plate(t,1.05,1.15,-.45,.8,s*(w/2+.025),c);t.box(.3,.07,.07,-.3,1.1,s*(w/2+.06),steel);for(let i=0;i<4;i++)t.box(.2,.35,.35,-1.45,.65+i*.05,s*(w/2+.17),c);hatch(t,-.6,h+.04,s*.6,c,.3);antenna(t,-1.3,h+.03,s*.9);}
   t.cyl(.18,.18,.1,h+.15,-.65,c);barrel(t,.15,h+.25,-.65,.75,.025,steel);for(let s of [-1,1])t.box(.25,.4,.025,.1,h+.25,-.65+s*.22,c);
   if(f==='kor'||f==='ind')for(let s of [-1,1]){t.cyl(.36,.055,-.55,.78,s*(w/2+.04),c,'z',.36,24);t.box(.15,.04,.035,-.55,.89,s*(w/2+.08),steel);}
   if(msta){t.box(.2,1.4,.55,-len/2-.13,.8,.6,c);t.box(1,.08,.45,-len/2-.5,.1,.6,steel,[0,0,.3]);}
   else{for(let i=0;i<5;i++)t.box(.05,.4,.045,-len/2-.07,h-.2,-1+i*.5,steel);t.box(.05,.04,2.1,-len/2-.07,h+.01,0,steel);}
   b.box(.2,.45,.4,L/2-.7,1.88,0,c);vent(b,2,1.64,.7);const g=firingPoint(finish(b,t,f,'arty',1.68,-.65),[len/2+gunLength+.08+.3/2,.85,0],paladin?'arty-open-brake-exit-plane':'arty-primary-muzzle-brake-front');
   if(paladin){g.userData.muzzleDetail='original-perforated-shell-from-public-exterior-photo';g.userData.modelRevision=4;g.getObjectByName('muzzle').userData.aperture=true;}return g;
 }
 function rocket(f){
   const b=new B(),t=new B(),c=colors[f],us=f==='usa',smerch=f==='rus',L=us?7.6:f==='chn'?10.4:f==='kor'?10:9.7;
   truck(b,f,L,us?3:4,smerch?'smerch':'flat');if(smerch)b.box(2.1,1.0,1.25,L/2-1.1,1.95,.68,c);
   b.cyl(.65,.64,-1.4,1.75,0,steel);b.box(1.9,.3,1.4,-1.4,1.68,0,c);b.box(.22,.65,1.3,-2.6,1.8,0,c);for(let s of [-1,1]){b.box(1.6,.5,.45,.7,1.82,s*1.13,c);b.cyl(.08,1.2,-1.7,1.8,s*.85,steel,'x');}
   t.cyl(.8,.26,0,.2,0,steel);t.box(3.8,.2,2.6,0,.42,0,c);const count=us?1:2,podW=us?2:1.3,rows=2,cols=f==='chn'?2:3,r=f==='chn'?.27:.18,plen=us?4.3:smerch?5.1:4.7;
   if(smerch){for(let row=0;row<3;row++)for(let col=0;col<4;col++){let z=(col-1.5)*.59,y=.9+row*.55;t.cyl(.25,plen,0,y,z,c,'x');t.cyl(.20,.015,plen/2+.01,y,z,dark,'x');}for(let x of [-1.9,-.5,1])t.box(.12,1.75,2.65,x,1.42,0,c);}
   else for(let p=0;p<count;p++){
     let z=count===1?0:(p-.5)*1.5;
     if(f==='chn'){for(let rr=0;rr<2;rr++)for(let cc=0;cc<2;cc++)t.cyl(.29,plen,0,.87+rr*.54,z+(cc-.5)*.64,c,'x');t.box(plen,.075,podW,0,.54,z,c);}
     else t.box(plen,1.25,podW,0,1.15,z,c,[0,0,0],1);
     for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){let zz=z+(col-(cols-1)/2)*(podW/(cols+.25)),yy=.87+row*.54;t.cyl(r*1.1,.025,plen/2+.02,yy,zz,steel,'x');t.cyl(r,.035,plen/2+.04,yy,zz,f==='ind'?0xbca354:dark,'x');}
     for(let x of [-plen/2+.15,plen/2-.15])t.box(.1,1.36,podW+.1,x,1.15,z,steel);for(let i=0;i<5;i++)t.box(.07,.75,.06,-1.7+i*.8,1.15,z+podW/2+.04,steel);
   }
   for(let s of [-1,1]){b.box(.2,.6,.25,-L/2+.4,1.1,s*1.3,c);b.cyl(.075,.75,-L/2+.4,.8,s*1.3,steel);b.box(.45,.08,.4,-L/2+.4,.43,s*1.3,steel);}
   const g=finish(b,t,f,'rocket',1.85,-1.4);const turret=g.getObjectByName('turret');turret.rotation.z=.08;
   const face=smerch?[plen/2+.01+.015/2,.9+2*.55,(1-1.5)*.59]:[plen/2+.04+.035/2,.87+.54,us?0:-.75+(f==='chn'?.5*(podW/(cols+.25)):0)];
   firingPoint(g,face,'rocket-top-row-existing-port-disc','rocket');
   const faces=[];
   if(smerch){for(let row=0;row<3;row++)for(let col=0;col<4;col++)faces.push([plen/2+.01+.015/2,.9+row*.55,(col-1.5)*.59]);}
   else for(let p=0;p<count;p++)for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)faces.push([plen/2+.04+.035/2,.87+row*.54,(count===1?0:(p-.5)*1.5)+(col-(cols-1)/2)*(podW/(cols+.25))]);
   faces.sort((a,b)=>Math.hypot(...a.map((v,i)=>v-face[i]))-Math.hypot(...b.map((v,i)=>v-face[i])));
   g.userData.firePorts=faces.map((p,i)=>{const a=new T.Object3D();a.name='muzzle_'+i;a.position.set(p[0]+.012,p[1],p[2]);a.userData={source:'existing-rocket-port-disc',face:p.slice(),outward:[1,0,0],artOffset:.012};turret.add(a);return{node:a.name,parent:'turret',position:a.position.toArray(),direction:[1,0,0]};});
   return g;
 }
 function missile(b,x,y,z,len=3.0){
   b.cyl(.15,len,x,y,z,0xb7bcb3,'x');b.cyl(.15,.45,x+len/2+.225,y,z,0x5f715c,'x',0,16);
   // Swept external fins, observed in parade photographs; purely visual mesh.
   for(let a=0;a<4;a++)for(const [xx,span,chord] of [[.2,.6,1.35],[-len*.36,.38,.65]]){
     const q=a*Math.PI/2,pts=[[xx+chord/2,.14],[xx-chord*.16,span],[xx-chord/2,span],[xx-chord/2,.14]],v=[];
     const point=i=>[x+pts[i][0],y+Math.cos(q)*pts[i][1],z+Math.sin(q)*pts[i][1]];
     for(const tri of [[0,1,2],[0,2,3],[2,1,0],[3,2,0]])for(const i of tri)v.push(...point(i));
     const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.computeVertexNormals();b.add(geo,0xb7bcb3,[0,0,0],[0,0,0],[1,1,1],1);
   }
 }
 function aa(f){
   const b=new B(),t=new B(),c=colors[f];let ty,tx=0;
   if(f==='usa'){
     for(let x of [-2.4,-.9,.75,2.3])for(let s of [-1,1])wheel(b,x,.67,s*1.45,c,.63);
     section(b,[[-3.5,.85],[3.4,.85],[3.6,1.45],[2.6,1.95],[-3.5,1.95]],2.85,c);for(let s of [-1,1]){for(let i=0;i<6;i++)plate(b,.88,.46,-2.8+i*1.03,1.69,s*1.49,c);b.box(6.9,.08,.47,0,1.28,s*1.52,c);antenna(b,-2.7,2,s*1.15);for(let x of [-2.3,2.1])b.box(.37,.4,.09,x,2.14,s*1.38,0x344840);}
     lights(b,3.43,1.48,1.2,c);hatch(b,1.4,1.96,-.6,c);t.cyl(.6,.25,0,.2,0,c);t.box(1.3,.5,.9,0,.5,0,c);barrel(t,.6,.53,0,1.45,.035,steel);
     for(let s of [-1,1]){t.box(1.35,.48,.47,-.1,.82,s*.85,c);for(let a of [-1,1])for(let z of [-1,1])t.cyl(.075,.01,.59,.82+a*.115,s*.85+z*.115,dark,'x');}optic(t,.2,1.02,0,c);ty=1.99;tx=-.2;
   }else if(f==='rus'){
     truck(b,f,9.5,4);b.box(2.2,1.35,2.65,.1,2.15,0,c);b.box(2.45,1.05,2.55,-2.28,2.02,0,c);b.box(.65,1.2,2.55,-3.85,2.15,0,c);
     for(let s of [-1,1]){plate(b,1.2,1.05,.1,2.18,s*1.36,c);wheel(b,1.4,2.12,s*1.1,c,.51);for(let i=0;i<9;i++){b.box(.035,.55,.035,-3.45+i*.19,2.18,s*1.38,steel);b.box(1.55,.035,.035,-2.7,2.43,s*1.38,steel);}}
     t.cyl(.85,.45,0,.25,0,c);t.box(1.6,1.1,1.5,0,.85,0,c);
     for(let s of [-1,1]){for(let row=0;row<3;row++)for(let col=0;col<2;col++){let z=s*(1.1+col*.34),y=.85+row*.36;t.cyl(.145,2.75,0,y,z,c,'x');t.cyl(.13,.015,1.39,y,z,dark,'x');}plate(t,1.45,.84,-.35,1.02,s*1.63,c);t.box(.25,.8,1.0,-.5,.62,s*.95,c);for(let j of [-.08,.08])barrel(t,.4,.65,s*.83+j,2.25,.035,steel);}
     t.cyl(.38,.2,1.0,1.05,0,c,'x');t.cyl(.3,.02,1.12,1.05,0,0x344445,'x');t.cyl(.07,1.4,-.45,1.8,0,steel);t.box(.22,.8,1.45,-.45,2.55,0,0x344445);t.box(.28,.86,1.55,-.57,2.55,0,c);ty=2.48;tx=-2.0;
   }else if(f==='chn'){
     chassis(b,f,7.3,1.95,false);faceted(t,[[-1.9,-1.3],[1.9,-1.3],[1.9,1.3],[-1.9,1.3]],[[-1.8,-.98],[1.65,-.98],[1.65,.98],[-1.8,.98]],1.12,c);for(let i=0;i<4;i++)for(let s of [-1,1]){t.box(.73,.04,.77,-1.35+i*.84,1.14,s*.45,c);t.box(.68,.025,.02,-1.35+i*.84,1.17,s*.45,steel);}
     t.cyl(.42,.25,1.95,.8,0,c,'x');t.cyl(.34,.015,2.09,.8,0,0x42535b,'x');t.box(.23,1.0,.22,-1.3,1.55,0,steel);t.box(.19,.72,2.2,-1.3,2.25,0,c);t.box(.02,.6,2.05,-1.19,2.25,0,0x314847);for(let i=0;i<8;i++)t.box(.04,.13,.04,-1.26,2.68,-.9+i*.26,steel);ty=1.98;
   }else if(f==='ind'){
     truck(b,f,9.5,4);b.box(3,1.2,2.65,.2,2.07,0,c);b.box(2,.9,2.45,-1.9,2.1,0,c);b.cyl(.7,.75,-1.7,2.7,0,c);t.cyl(.75,.3,0,.2,0,c);for(let s of [-1,0,1]){t.box(3.9,.12,.17,0,.5,s*.9,steel);missile(t,.2,1.0,s*.9,5.2);t.cyl(.19,.28,.95,.85,s*.9,c);}t.box(.35,.85,2.4,-.6,.6,0,c);for(let s of [-1,1]){plate(b,1.1,.75,.75,2.13,s*1.35,c);for(let i=0;i<8;i++)b.box(.035,.6,.035,-.6+i*.12,2.13,s*1.35,dark);}ty=3.0;tx=-1.7;
   }else{
     chassis(b,f,6.9,1.7,false);t.prism([[-1.3,-1],[.8,-1],[1.2,-.5],[1.2,.5],[.8,1],[-1.3,1]],0,.9,c,.84);
     for(let s of [-1,1]){t.cyl(.48,.55,.2,.82,s*1.05,c,'z',.48,16);t.box(.9,.6,.55,.1,.75,s*1.05,c);barrel(t,.85,1.1,s*1.05,3.1,.046,steel);for(let j=0;j<3;j++)t.cyl(.047,.3,-.8+j*.16,.45,s*1.15,steel,'z');for(let j=0;j<4;j++)t.box(.03,.45,.035,-1.75+j*.19,.5,s*1.12,steel);t.box(.7,.04,.035,-1.45,.75,s*1.12,steel);}
     t.cyl(.07,.9,-.8,1.45,0,steel);t.box(.22,.67,1.8,-.8,2.1,0,c);t.box(.025,.56,1.65,-.67,2.1,0,0x3b4c49);hatch(t,-.65,.95,.6,c);optic(t,.5,1.13,0,c);ty=1.76;
   }
   const g=finish(b,t,f,'aa',ty,tx);
   if(f==='usa')return firingPoint(g,[.59+.01/2,.82+.115,.85-.115],'aa-existing-missile-port-disc','missile');
   if(f==='rus')return firingPoint(g,[1.39+.015/2,.85+2*.36,1.1],'aa-existing-missile-port-disc','missile');
   if(f==='chn')return firingPoint(g,[-1.35,1.17+.025/2,.45],'aa-existing-vls-cover-top-closed-art','missile',[0,1,0]);
   if(f==='ind')return firingPoint(g,[.2+5.2/2+.45,1,0],'aa-existing-exposed-missile-nose','missile');
   return firingPoint(g,[.85+3.1+.012,1.1,1.05],'aa-existing-primary-cannon-front-cap','autocannon');
 }
 for(const f of Object.keys(names))for(const [kind,fn] of Object.entries({ifv,arty,rocket,aa}))M.register(kind,f,()=>fn(f));
})(globalThis);
