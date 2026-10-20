/* Photo-referenced exterior art. No internal engineering or exact dimensions.
 * +X bow, +Y up, +Z starboard. References: docs/reviews/naval-defense-reference-review.md. */
(function(root){
  'use strict';
  const T=root.THREE,M=root.WarModels,B=M.Builder;
  const C={hull:0x879395,upper:0xa1aaab,deck:0x454e50,glass:0x263c43,dark:0x323b3d,line:0xd3d0ba};
  function mesh(b,vertices,color){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();b.add(g,color);}
  function slab(b,points,y,h,c){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:1,steps:1});g.rotateX(-Math.PI/2);g.translate(0,y,0);b.add(g,c);}
  function tapered(b,x,z,l,w,y,h,top=.85,c=C.upper){const pts=[[-l/2,-w/2],[l/2,-w/2],[l/2,w/2],[-l/2,w/2]],p=[];
    const a=pts.map(([a,d])=>[x+a,y,z+d]),q=pts.map(([a,d])=>[x+a*top,y+h,z+d*top]);
    for(let i=0;i<4;i++){let j=(i+1)%4;p.push(...a[i],...q[i],...q[j],...a[i],...q[j],...a[j]);}p.push(...q[0],...q[2],...q[1],...q[0],...q[3],...q[2]);mesh(b,p,c);
  }
  function hull(b,L,W,H=1.5){
    // Smooth longitudinal stations and rounded bilge eliminate the old flat triangular blade.
    const control=[[-.5,.69],[-.46,.87],[-.35,.98],[-.1,1],[.15,.97],[.30,.83],[.41,.51],[.47,.22],[.5,.008]],curve=new T.CatmullRomCurve3(control.map(([x,w])=>new T.Vector3(x,w,0))),s=curve.getPoints(64).map(v=>[v.x,Math.max(.008,v.y)]),sections=[[-.54,-.52],[-.77,-.42],[-.91,-.16],[-.98,.25],[-1,.65],[-1,1],[1,1],[1,.65],[.98,.25],[.91,-.16],[.77,-.42],[.54,-.52]],vertices=[],indices=[],N=sections.length;
    for(const [x,w]of s)for(const [z,y]of sections){const rake=Math.max(0,x-.25)*.35*(y-1);vertices.push((x+rake)*L,y<0?y:H*y,z*w*W);}
    for(let i=0;i<s.length-1;i++)for(let j=0;j<N;j++){let a=i*N+j,d=i*N+(j+1)%N,c=(i+1)*N+(j+1)%N,q=(i+1)*N+j;indices.push(a,d,c,a,c,q);}
    for(const k of[0,s.length-1])for(let j=1;j<N-1;j++){const a=k*N;indices.push(a,a+(k?j:j+1),a+(k?j+1:j));}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();b.add(g,C.hull);
    const deck=s.map(([x,w])=>[x*L,-w*W]).concat([...s].reverse().map(([x,w])=>[x*L,w*W]));slab(b,deck,H,.035,C.deck);return {L,W,H,deck};
  }
  function line(b,a,c,r=.025,color=C.line){const av=new T.Vector3(...a),cv=new T.Vector3(...c),d=cv.clone().sub(av),g=new T.CylinderGeometry(r,r,d.length(),4);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate(...av.add(cv).multiplyScalar(.5).toArray());b.add(g,color);}
  function rails(b,x1,x2,z,y){for(let x=x1;x<x2;x+=.65)b.cyl(.015,.26,x,y+.13,z,C.upper,'y',.015,4);line(b,[x1,y+.26,z],[x2,y+.26,z],.012,C.upper);}
  function windows(b,x,y,z,n,axis='x',spacing=.27){for(let i=0;i<n;i++)b.box(axis==='x'?.17:.025,.14,axis==='x'?.025:.17,x+(axis==='x'?i*spacing:0),y,z+(axis==='z'?i*spacing:0),C.glass);}
  function dome(b,x,y,z,r=.22){b.cyl(r*.8,.15,x,y,z,C.upper);b.sphere(r,x,y+.16,z,0xd5d7cc,[1,1.1,1]);}
  function launchDeck(b,x,z,rows,cols,y){b.box(rows*.38+.1,.06,cols*.34+.1,x,y,z,C.upper);for(let i=0;i<rows;i++)for(let j=0;j<cols;j++)b.box(.31,.035,.28,x+(i-(rows-1)/2)*.38,y+.045,z+(j-(cols-1)/2)*.34,0x626d6d);}
  function gun(b,x,y,size=.8){b.cyl(size*.6,.20,x,y,0,C.hull);tapered(b,x,0,size*1.5,size*1.25,y+.1,size*.75,.54);b.cyl(.055,size*2,x+size*1.2,y+size*.55,0,C.upper,'x',.055,8);b.weaponMuzzle=[x+size*2.2+.002,y+size*.55,0];}
  function lattice(b,x,y,h,w=1.0){for(const s of[-1,1])line(b,[x-.30,y,s*w*.5],[x+.02,y+h,s*w*.13],.035,C.upper);for(let i=0;i<4;i++){const yy=y+i*h/4;line(b,[x,yy,-w*.45],[x,yy,w*.45],.025,C.upper);}b.cyl(.025,h+1.4,x,y+h*.5+.5,0,C.upper,'y',.025,6);for(const yy of[y+h*.5,y+h*.84])b.box(.07,.06,w*2.3,x,yy,0,C.upper);}
  function helicopter(b,x,y,z,s=.55){b.sphere(.4,x,y+.3,z,C.upper,[1.8,.8,.65]);b.box(s*2,.06,.07,x,y+.75,z,C.dark,[0,.3,0]);b.box(.06,.06,s*2,x,y+.75,z,C.dark,[0,.3,0]);b.box(.8,.09,.09,x-.65,y+.4,z,C.upper);}
  function markings(b,x,y,z,r=.9){for(let i=0;i<28;i++){let a=i/28*Math.PI*2,q=(i+1)/28*Math.PI*2;line(b,[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(q)*r,y,z+Math.sin(q)*r],.018);}b.box(.07,.02,.6,x-.20,y,z,C.line);b.box(.07,.02,.6,x+.20,y,z,C.line);b.box(.4,.02,.07,x,y,z,C.line);}
  function finish(b,name,status='photo-referenced',scale=5.4){const g=new T.Group();g.add(b.finish());g.userData={scale,parts:b.parts,profile:name,evidenceStatus:status};if(b.weaponMuzzle){const m=new T.Object3D();m.name='muzzle';m.position.fromArray(b.weaponMuzzle);m.userData.motionJointRole='turret';m.userData.source='existing-main-gun-tip';g.add(m);g.userData.muzzleFamily='navalGun';}return g;}
  const destroyers={usa:{name:'Arleigh Burke class exterior study',L:24,W:1.63,bridge:2.9,mast:'open',hangar:3.7},chn:{name:'Type 055 exterior study',L:27,W:1.92,bridge:3.4,mast:'integrated',hangar:4.8},rus:{name:'Admiral Gorshkov Project 22350 exterior study',L:21,W:1.30,bridge:2.7,mast:'pyramid',hangar:3.8},ind:{name:'Kolkata class exterior study',L:25,W:1.68,bridge:2.85,mast:'arraybox',hangar:4.0},kor:{name:'Sejong the Great Batch I exterior study',L:26,W:1.88,bridge:3.15,mast:'open',hangar:4.1}};
  function destroyer(f){const b=new B(),p=destroyers[f],{L,W}=p,H=1.12;hull(b,L,W,H);
    const bx=L*.12,hy=H+1.75;
    if(f==='chn'||f==='rus')tapered(b,-L*.055,0,L*.40,W*1.72,H,.62,.96);
    tapered(b,bx,0,L*.24,W*1.67,H,1.6,.86);tapered(b,bx+.48,0,2.0,W*1.74,hy-.1,.52,.86);
    windows(b,bx+1.49,hy+.15,-W*.62,8,'z',W*.18);for(const s of[-1,1])windows(b,bx-.15,hy+.15,s*W*.75,6);
    // Flat array faces are visibly part of the superstructure, not glass windscreens.
    for(const s of[-1,1]){b.box(1.08,.83,.025,bx-.58,H+.90,s*W*.77,0xb0b5ad);b.box(.025,.83,.9,bx+L*.115,H+.9,s*W*.38,0xb0b5ad);}
    const mastX=bx-.6,mastY=H+2.05;
    if(p.mast==='open')lattice(b,mastX,mastY,2.8,W*.55);
    else{tapered(b,mastX,0,1.35,1.1,mastY,2.7,.26);b.cyl(.025,1.3,mastX,mastY+3.15,0,C.upper);if(p.mast==='arraybox'){b.box(1.25,1.1,1.25,mastX,mastY+2.1,0,C.upper);for(const s of[-1,1]){b.cyl(.44,.025,mastX,mastY+2.1,s*.64,0x566465,'z',.44,20);b.cyl(.44,.025,mastX+s*.64,mastY+2.1,0,0x566465,'x',.44,20);}}else for(const s of[-1,1])b.box(.8,.55,.025,mastX,mastY+1.35,s*.38,0x576b70);}
    for(const x of[-L*.05,-L*.21]){tapered(b,x,0,1.6,W*1.25,H,1.65,.66);b.box(1,.07,W*.74,x,H+1.68,0,C.dark);for(const side of[-1,1])for(let i=0;i<6;i++)b.box(.07,.48,.025,x-.38+i*.15,H+1.03,side*W*.57,0x5c6868);}
    if(f==='rus'){dome(b,bx+.55,H+2.10,0,.55);b.box(.16,.85,1.10,mastX,mastY+2.60,0,0x6c7e82);}
    if(f==='ind')dome(b,bx-.6,mastY+1.5,0,.53);
    tapered(b,-L*.29,0,p.hangar,W*1.65,H,1.3,.93);for(const z of[-W*.40,W*.40])b.box(.025,.95,W*.64,-L*.29-p.hangar*.5-.02,H+.5,z,0x596565);
    launchDeck(b,L*.27,0,f==='rus'?4:5,4,H+.05);if(f!=='rus')launchDeck(b,-L*.17,0,f==='kor'?6:4,4,H+1.0);
    gun(b,L*.38,H+.12,f==='rus'?.7:.83);markings(b,-L*.425,H+.06,0,W*.66);
    for(const s of[-1,1]){rails(b,-L*.46,L*.25,s*W*.94,H+.06);dome(b,bx-.5,H+2.05,s*W*.63,.20);for(let i=0;i<3;i++)b.cyl(.10,.65,-L*.10+i*.3,H+.3,s*W*.83,C.upper,'x',.10,8);
      // Doors, ladders, rescue boat bays and liferaft drums are observed exterior cues.
      for(const x of[-L*.32,-L*.16,bx-.4,bx+1.1]){b.box(.24,.47,.025,x,H+.27,s*W*.85,0x6c7878);b.box(.035,.07,.045,x+.06,H+.26,s*W*.87,C.dark);}
      b.box(1.8,.65,.06,-L*.1,H+.5,s*W*.87,0x45545a);b.sphere(.27,-L*.1,H+.48,s*W*.91,0xa9af9f,[2.6,.66,.60]);
      for(let i=0;i<5;i++)b.cyl(.11,.38,-L*.20+i*.38,H+.30,s*W*.86,0xc3c8bc,'x',.11,8);
      for(let i=0;i<9;i++)b.box(.18,.025,.035,bx-.8,H+.2+i*.16,s*W*.87,C.upper);
    }
    for(const x of[-L*.26,L*.14]){b.cyl(.13,.45,x,H+1.9,0,C.upper);dome(b,x,H+2.15,0,.22);}
    // Mooring fittings and deck equipment are restrained; silhouette carries identity.
    for(const x of[-L*.46,L*.43])for(const s of[-1,1]){b.cyl(.07,.10,x,H+.08,s*W*.50,C.dark,'y',.07,8);}
    return finish(b,p.name);
  }
  function deckJet(b,x,y,z,s=.55){b.sphere(.25,x,y+.12,z,0xaeb5b5,[2.6,.40,.55]);slab(b,[[x-.7,z-s],[x+.25,z-s*.13],[x+.7,z],[x+.25,z+s*.13],[x-.7,z+s]],y+.13,.025,0x9da7a9);for(const side of[-1,1])b.box(.24,.28,.03,x-.5,y+.25,z+side*.16,0x9da7a9,[.25*side,0,-.15]);}
  function carrier(f){const b=new B(),dok=f==='kor',usa=f==='usa',india=f==='ind',L=dok?27:usa?36:india?32:34,W=dok?2.65:usa?3.85:3.35,H=dok?1.8:2.1;hull(b,L,W*.72,H);
    const pts=dok?[[-L*.49,-W],[-L*.49,W],[L*.43,W],[L*.49,W*.70],[L*.49,-W*.70],[L*.43,-W]]:[[-L*.49,-W*.72],[-L*.49,W*.75],[-L*.30,W],[-L*.04,W],[L*.19,W*.76],[L*.45,W*.53],[L*.50,W*.40],[L*.50,-W*.40],[L*.37,-W*.65],[L*.13,-W*.72],[-L*.18,-W*1.12],[-L*.39,-W*1.12]];
    slab(b,pts,H,.16,C.deck);const top=H+.19;
    // Elevators and underside sponsons separate the overhanging flight deck from the hull.
    for(const [x,z]of[[-L*.24,W*.84],[L*.12,W*.70],[-L*.2,-W*.94]]){b.box(2.0,.12,1.0,x,top+.02,z,0x657173);tapered(b,x,z,2.6,1.25,H-.8,.8,1.2,C.hull);}
    const ix=dok?-L*.02:usa?-L*.24:india?-L*.13:-L*.14,iz=W*.76,il=dok?8.8:usa?5.0:india?8.1:7.6,ih=dok?1.9:usa?2.5:india?2.65:2.45;
    tapered(b,ix,iz,il,1.45,top,ih*.57,.91);tapered(b,ix+.65,iz,il*.76,1.35,top+ih*.57,ih*.43,.84);b.box(il*.75,.12,1.62,ix+.7,top+ih*.57,iz,C.upper);
    // Forward bridge wings, separated aft exhaust block and narrower mast base break up the former giant single box.
    tapered(b,ix+il*.31,iz,il*.34,1.9,top+ih*.48,.54,.94);tapered(b,ix-il*.25,iz,il*.24,1.05,top+ih*.87,.72,.90);b.box(il*.20,.05,.80,ix-il*.25,top+ih*.87+.74,iz,C.dark);
    for(const side of[-1,1]){windows(b,ix+il*.17,top+ih*.48+.30,iz+side*.91,Math.max(3,Math.floor(il*.33/.28)),'x',.26);windows(b,ix-il*.33,top+ih*.20,iz+side*.73,Math.floor(il/.34),'x',.28);b.box(il*.38,.09,.28,ix+il*.26,top+ih*.48+.54,iz+side*1.01,C.upper);for(let i=0;i<7;i++)b.box(.08,.14,.025,ix-il*.34+i*.65,top+.22,iz+side*.74,C.dark);}windows(b,ix+il*.48,top+ih*.48+.30,iz-.70,6,'z');
    const mx=ix+il*.17;for(const s of[-1,1])line(b,[mx,top+ih,iz+s*.48],[mx,top+ih+2.4,iz+s*.10],.05,C.upper);
    b.box(.10,.10,2.6,mx,top+ih+1.3,iz,C.upper);b.cyl(.025,3,mx,top+ih+1.6,iz,C.upper);for(const h of[.45,1.25,2]){b.box(.72,.08,1.55,mx,top+ih+h,iz,C.upper);for(const side of[-1,1])b.cyl(.025,.42,mx,top+ih+h+.22,iz+side*.65,C.upper,'y',.025,4);}b.box(.15,.50,1.20,mx,top+ih+2.35,iz,C.dark);
    for(const x of[ix-il*.27,ix+il*.30]){b.box(1.1,.23,1.0,x,top+ih+.02,iz,C.dark);dome(b,x,top+ih+.3,iz,.30);}
    if(usa){tapered(b,ix-il*.75,iz,.60,.70,top,3.4,.42);b.box(.08,.08,1.35,ix-il*.75,top+3.0,iz,C.upper);b.cyl(.025,1.1,ix-il*.75,top+3.7,iz,C.upper,'y',.025,5);}
    if(dok){b.box(.24,.9,2.1,ix-2.2,top+ih+.85,iz,0x45413b);for(let i=0;i<5;i++){markings(b,-L*.36+i*L*.16,top+.03,-.55,.73);if(i%2===0)helicopter(b,-L*.36+i*L*.16,top+.05,-.55,.8);}rails(b,-L*.45,L*.43,-W*.98,top);}
    else{
      // A real angled landing strip; the deck plan is asymmetric on the port side.
      for(const z of[-1.82,-.16])line(b,[-L*.46,top+.035,z],[L*.18,top+.035,z+1.15],.025);
      for(let i=0;i<20;i++){let x=-L*.43+i*.9;line(b,[x,top+.045,-.98+(x+L*.46)/L*1.80],[x+.40,top+.045,-.98+(x+.40+L*.46)/L*1.80],.022,0xdbd2a5);}
      if(usa){for(const z of[-.48,.75])line(b,[L*.10,top+.025,z],[L*.47,top+.025,z],.04,0x9ca29b);for(const z of[-2.3,-1.2])line(b,[-L*.17,top+.027,z],[L*.15,top+.027,z+.85],.035,0x9ca29b);}
      else{
        // Curved ski-jump photographed on Liaoning / Vikramaditya; no catapults.
        const rows=14,p=[];for(let i=0;i<rows;i++){let t=i/rows,u=(i+1)/rows,x=L*.32+t*L*.18,xx=L*.32+u*L*.18,y=top+t*t*.95,yy=top+u*u*.95,w=W*(.63-.23*t),ww=W*(.63-.23*u);p.push(x,y,-w,xx,yy,ww,xx,yy,-ww,x,y,-w,x,y,w,xx,yy,ww);for(const side of[-1,1]){p.push(x,top,side*w,xx,top,side*ww,xx,yy,side*ww,x,top,side*w,xx,yy,side*ww,x,y,side*w);p.push(x,top,side*w,xx,yy,side*ww,xx,top,side*ww,x,top,side*w,x,y,side*w,xx,yy,side*ww);}}mesh(b,p,C.deck);
        for(const side of[-1,1])for(let i=0;i<13;i++){let t=i/14,u=(i+1)/14;line(b,[L*.32+t*L*.18,top+t*t*.95+.025,side*.6],[L*.32+u*L*.18,top+u*u*.95+.025,side*.6],.027);}
      }
      for(let i=0;i<5;i++)deckJet(b,-L*.35+i*2.1,top+.09,W*.55,.65);for(let i=0;i<3;i++)deckJet(b,L*.12+i*1.8,top+.09,-W*.55,.65);
      for(let i=0;i<4;i++)line(b,[-L*.28+i*.35,top+.035,-2.1],[-L*.28+i*.35,top+.035,.40],.012,C.dark);
    }
    for(const s of[-1,1]){for(let i=0;i<18;i++)b.box(.35,.08,.06,-L*.43+i*L*.048,H-.26,s*W*.72,C.dark);
      for(let i=0;i<6;i++){let x=-L*.34+i*L*.10;b.box(1.35,.28,.03,x,H-.52,s*W*.70,0x505e62);b.box(1.48,.10,.4,x,H-.72,s*W*.73,C.upper);for(let j=0;j<3;j++)b.cyl(.10,.24,x-.4+j*.3,H-.38,s*W*.73,0xbdc4b7,'x',.10,8);}
      for(const x of[-L*.35,-L*.10,L*.20]){b.box(.34,.48,.04,x,.65,s*W*.71,0x687777);b.box(.035,.07,.07,x+.08,.68,s*W*.73,C.dark);}
    }
    return finish(b,dok?'Dokdo LPH exterior study':usa?'Nimitz class exterior study':india?'INS Vikramaditya exterior study':'Liaoning Type 001 exterior study');
  }
  function submarine(f){const b=new B(),p={usa:[23,1.25,3.9,2.5,2.4,'Virginia class'],rus:[25,1.55,4.1,3.2,2.5,'Yasen Project 885'],chn:[22,1.30,4.3,2.7,2.9,'Type 093 early exterior'],ind:[16,1.0,2.6,2.4,2.0,'Kalvari / Scorpene'],kor:[19,1.4,3.3,3.4,2.45,'Dosan Ahn Changho Batch I']}[f], [L,R,sx,sl,sh,name]=p;
    // Lofted cylindrical middle and independently rounded bow/stern. A stretched sphere gave the old toy silhouette.
    const stations=[[-.5,.01],[-.46,.38],[-.39,.77],[-.29,.98],[.22,1],[.36,.92],[.45,.68],[.49,.30],[.5,.01]],curve=new T.CatmullRomCurve3(stations.map(([x,r])=>new T.Vector3(r*R,x*L,0))),profile=curve.getPoints(60).map(v=>new T.Vector2(Math.max(.01,v.x),v.y)),body=new T.LatheGeometry(profile,40);body.rotateZ(-Math.PI/2);body.translate(0,-.2,0);b.add(body,0x333e40);
    const sail=[[-sl*.5,-.42],[sl*.35,-.42],[sl*.54,-.22],[sl*.58,0],[sl*.54,.22],[sl*.35,.42],[-sl*.5,.42],[-sl*.61,.23],[-sl*.61,-.23]].map(([x,z])=>[x+sx,z]);slab(b,sail,R*.70,sh,0x3d4849);
    for(let i=0;i<3;i++){b.cyl(.045,.75+i*.24,sx+.35-i*.4,R*.70+sh+.4,0,C.dark,'y',.045,8);b.box(.14,.15,.10,sx+.35-i*.4,R*.70+sh+.8+i*.10,0,C.glass);}
    for(const side of[-1,1]){if(f==='chn'||f==='kor'||f==='ind')slab(b,[[sx-.2,side*.35],[sx-.45,side*R*1.60],[sx+.10,side*R*1.55],[sx+.50,side*.35]],R*.70+sh*.43,.10,0x3d4849);else slab(b,[[L*.30,side*R*.75],[L*.25,side*R*1.58],[L*.31,side*R*1.58],[L*.36,side*R*.75]],.08,.08,0x3d4849);
      slab(b,[[-L*.43,side*.2],[-L*.46,side*R*1.75],[-L*.38,side*R*1.75],[-L*.34,side*.25]],-.1,.12,0x354042);
    }
    b.box(L*.10,R*1.7,.10,-L*.40,R*.35,0,0x354042);b.cyl(R*.24,.55,-L*.5-.12,-.2,0,C.dark,'x',R*.18,16);
    for(const x of[-L*.18,L*.22]){b.cyl(.22,.025,x,R-.17,0,0x526063,'y',.22,12);b.box(.30,.026,.025,x,R-.14,0,C.dark);}
    for(let i=0;i<12;i++)b.box(.25,.055,.025,-L*.26+i*.55,R*.54,R*.82,0x202c2f);
    if(f==='rus'||f==='kor')for(let i=0;i<5;i++)b.box(.55,.025,.65,sx-sl*.8-i*.65,R-.16,0,0x3c484a);
    const g=finish(b,name+' exterior study'),m=new T.Object3D();m.name='muzzle';m.position.set(L*.5+.012,-.2,0);m.userData.source='approximate-forward-hull-exit';g.add(m);g.userData.muzzleFamily='torpedo';g.userData.muzzleBoundary='Forward hull exit for game torpedoes; individual torpedo doors are not modeled or claimed to match this submarine variant.';return g;
  }
  // These are gameplay installations inspired by photos, never claimed to be national equipment variants.
  function defense(kind){const b=new B();b.box(6,.3,5.4,0,.15,0,0x777c72);if(kind==='ciws'){
    b.box(4.6,.45,2.7,0,.55,0,0x9a9e8d);b.cyl(1.05,.45,0,1,0,0xaeb3a2);b.box(1.45,1.9,1.5,-.2,1.95,0,0xc8cbb8);b.cyl(.70,1.05,-.35,3.35,0,0xe5e3d2);b.sphere(.70,-.35,3.86,0,0xe5e3d2,[1,.6,1]);b.box(1.8,.8,1.05,.8,1.85,0,0x979f90);
    for(let j=0;j<6;j++){let a=j*Math.PI/3;b.cyl(.055,2.7,2.0,1.9+Math.cos(a)*.16,Math.sin(a)*.16,C.dark,'x',.055,8);}b.cyl(.25,.22,3.25,1.9,0,C.dark,'x',.25,16);b.box(1.2,.6,1.25,-1.35,1.12,0,0x8e9588);
    for(const side of[-1,1]){line(b,[.25,1.47,side*.52],[1.6,2.18,side*.35],.065,0x8b938a);line(b,[.25,2.18,side*.52],[1.6,1.47,side*.35],.065,0x8b938a);for(let i=0;i<3;i++){b.box(.42,.48,.035,-.35,1.35+i*.52,side*.77,0xa3aa99);b.box(.20,.025,.055,-.35,1.35+i*.52,side*.80,C.dark);}}b.box(.8,.32,.45,.50,3.15,.75,0xc7cabd);b.cyl(.13,.07,.94,3.15,.75,C.glass,'x',.13,12);b.box(.9,.35,.40,.48,2.70,.75,0xbfc4b6);
    }else if(kind==='sam'){
      b.box(3.8,.7,2.5,0,.7,0,0x68705b);b.cyl(.65,.3,0,1.2,0,0x646e57);for(let i=0;i<2;i++)for(let j=0;j<2;j++){b.box(4.9,.63,.65,.0,2+i*.67,(j-.5)*.72,0x737d64,[0,0,.55]);b.box(.12,.60,.62,2.06,3.26+i*.67,(j-.5)*.72,0x424c3f,[0,0,.55]);}for(const side of[-1,1])b.box(.2,.2,5.0,side*1.8,.45,0,0x5d6656);
    }else{b.box(2.5,1.6,2,0,1,0,0x66725e);b.cyl(.18,3.2,0,2.3,0,C.upper);b.box(.26,1.9,3.6,0,4.0,0,0x74816c,[0,0,-.20]);for(let i=0;i<12;i++)b.box(.02,1.7,.025,.20,4,-1.55+i*.28,0x43513f);b.box(1.5,.6,1.4,-2,.6,1.5,0x6d775e);}
    return finish(b,kind==='ciws'?'C-RAM inspired gameplay emplacement':kind==='sam'?'Canister SAM gameplay emplacement':'Rectangular-array gameplay radar','gameplay-inspired',7);
  }
  const references={
    destroyer:{usa:'https://www.usff.navy.mil/Press-Room/News-Stories/Article/3112957/uss-arleigh-burke-responds-to-man-overboard/',chn:'https://eng.mod.gov.cn/xb/News_213114/Photos/16352318.html',rus:'https://commons.wikimedia.org/wiki/File:Admiral_Gorshkov_frigate_03.jpg',ind:'https://www.deccanherald.com/india/ins-kolkatas-weapon-system-marred-2203885',kor:'https://commons.wikimedia.org/wiki/File:ROKS_Sejong_the_Great_(DDG_991).jpg'},
    carrier:{usa:'https://www.dvidshub.net/image/7090267/uss-nimitz-shoots-photo-exercise',chn:'https://eng.chinamil.com.cn/CHINA_209163/TopStories_209189/9476125.html',ind:'https://commons.wikimedia.org/wiki/File:INS_Vikramaditya_-_06.jpg',kor:'https://commons.wikimedia.org/wiki/File:ROKS_Dokdo_(LPH_6111)_underway_in_March_2014.JPG'},
    submarine:{usa:'https://www.navy.mil/Resources/Photo-Gallery/igphoto/2003974517/',chn:'https://mil.news.sina.com.cn/p/2007-09-17/1117464337.html',rus:'https://commons.wikimedia.org/wiki/File:Северодвинск_(АПЛ).jpeg',ind:'https://www.businessinsider.com/india-to-buy-submarines-amid-china-naval-activity-in-the-indian-ocean-2017-7',kor:'https://www.bairdmaritime.com/security/naval/naval-submersibles/south-korean-navy-commissions-first-kss-3-submarine'}
  };
  function register(kind,f,build){M.register(kind,f,()=>{const g=build();g.userData.referenceUrl=references[kind]?.[f]||(kind==='ciws'?'https://www.dvidshub.net/image/1182160/protecting-force':'');g.userData.reviewStatus='needs-multi-view-review';return g;});}
  for(const f of['usa','chn','rus','ind','kor']){register('destroyer',f,()=>destroyer(f));register('submarine',f,()=>submarine(f));if(f!=='rus')register('carrier',f,()=>carrier(f));for(const k of['ciws','sam','radar'])register(k,f,()=>defense(k));}
})(globalThis);
