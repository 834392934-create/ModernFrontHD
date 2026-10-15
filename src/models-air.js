/* Photo-referenced original exterior meshes, not engineering/CAD reproductions.
 * Known aircraft only. Concept jets remain frozen pending their own review.
 * +X nose, +Y up, +Z starboard. See docs/reviews/air-reference-review.md. */
(function(root){
  'use strict';
  const T=root.THREE,M=root.WarModels,B=M.Builder;
  const steel=0x444b4c,dark=0x202a2d,glass=0x344b53,rubber=0x232624;
  const sources={fighter:{usa:'https://www.dvidshub.net/image/8627178/f-35a-demo-team-mcconnell-afb',kor:'https://www.mindef.gov.sg/news-and-events/latest-releases/28feb24_fs/',chn:'https://www.mod.gov.cn/gfbw/sy/rt/16285349.html',rus:'https://commons.wikimedia.org/wiki/File:Su-57_052_and_Su-57_051_in_MAKS_2019.jpg',ind:'https://www.dassault-aviation.com/en/defense/rafale/introduction/'},heli:{usa:'https://www.dvidshub.net/image/6422832/tf-expect-no-mercy-flyover-greece',kor:'https://www.boeing.com/content/theboeingcompany/us/en/defense/military-rotorcraft/ah-64-apache.html',chn:'https://eng.mod.gov.cn/2025xb/H_251589/F/16452384.html',rus:'https://russianplanes.net/id112234',ind:'https://www.ddpmod.gov.in/en/resources/products/light-combat-helicopter-lch'}};
  // Smooth continuous elliptical sections replace the former flat box fuselage.
  // Section: [x, centreY, halfWidth, halfHeight]. Units are exterior art proportions.
  function loft(b,sections,color,z=0,segments=20,paint=0){
    const pos=[],idx=[];
    for(const [x,y,w,h] of sections)for(let j=0;j<segments;j++){
      const a=j/segments*Math.PI*2;pos.push(x,y+Math.cos(a)*h,z+Math.sin(a)*w);
    }
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<segments;j++){
      const a=i*segments+j,d=i*segments+(j+1)%segments,c=d+segments,e=a+segments;
      idx.push(a,d,e,d,c,e);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();b.add(geo,color,[0,0,0],[0,0,0],[1,1,1],paint);
  }
  function chinedBody(b,sections,color){
    // Broad shoulder and flat lower facets observed in frontal F-35 photographs.
    // Normalised cross-section follows the visible skin, not internal construction.
    const ring=[[0,1],[.45,.88],[.78,.52],[1,.12],[.97,-.26],[.67,-.83],[.25,-1],[0,-1],[-.25,-1],[-.67,-.83],[-.97,-.26],[-1,.12],[-.78,.52],[-.45,.88]];
    const p=[],idx=[],n=ring.length;
    for(const [x,y,w,h] of sections)for(const [z,dy] of ring)p.push(x,y+dy*h,z*w);
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<n;j++){let a=i*n+j,c=i*n+(j+1)%n;idx.push(a,c,a+n,c,c+n,a+n);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();b.add(geo,color);
  }
  function seam(b,points,color=0x53616a,r=.007,closed=false){for(let i=1;i<points.length;i++)rod(b,points[i-1],points[i],r,color);if(closed)rod(b,points.at(-1),points[0],r,color);}
  function badge(b,f,x,y,z,r,vertical=false){
    let layer=0;
    const put=(pts,c)=>{layer+=.002;const to3=([a,d])=>vertical?[x+a,y+d,z+Math.sign(z||1)*layer]:[x+a,y+layer,z+d],p=[],centre=to3([0,0]);for(let i=0;i<pts.length;i++){const a=to3(pts[i]),d=to3(pts[(i+1)%pts.length]);p.push(...centre,...a,...d,...centre,...d,...a);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();b.add(g,c);};
    const disk=(radius,c)=>put(Array.from({length:32},(_,i)=>[Math.sin(i*Math.PI/16)*radius,Math.cos(i*Math.PI/16)*radius]),c);
    const star=(radius,c)=>put(Array.from({length:10},(_,i)=>[Math.sin(i*Math.PI/5)*(i%2?radius*.40:radius),Math.cos(i*Math.PI/5)*(i%2?radius*.40:radius)]),c);
    if(f==='usa'){disk(r,0x3c4850);put([[-r*1.8,-r*.35],[r*1.8,-r*.35],[r*1.8,r*.35],[-r*1.8,r*.35]],0x86929a);star(r*.9,0x98a2a7);}
    else if(f==='rus'){star(r,0xc9c7bb);star(r*.80,0x873c39);}
    else if(f==='chn'){put([[-r*1.8,-r*.26],[r*1.8,-r*.26],[r*1.8,r*.26],[-r*1.8,r*.26]],0x8d3d37);star(r,0x9d4840);star(r*.64,0xbaa46a);}
    else if(f==='ind'){disk(r,0xae7756);disk(r*.69,0xc2c7bf);disk(r*.36,0x466c57);}
    else {disk(r,0x536e80);put(Array.from({length:17},(_,i)=>[Math.sin(i*Math.PI/16)*r,Math.cos(i*Math.PI/16)*r]),0x89504f);}
  }
  function panel(b,points,color,thick=.035){
    const p=[],n=points.length;
    for(let i=1;i<n-1;i++){p.push(...points[0],...points[i],...points[i+1]);p.push(...points[0].map((v,k)=>v-(k===1?thick:0)),...points[i+1].map((v,k)=>v-(k===1?thick:0)),...points[i].map((v,k)=>v-(k===1?thick:0)));}
    for(let i=0;i<n;i++){const j=(i+1)%n,a=points[i],c=points[j],d=a.map((v,k)=>v-(k===1?thick:0)),e=c.map((v,k)=>v-(k===1?thick:0));p.push(...a,...d,...c,...c,...d,...e);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();b.add(g,color);
  }
  function rod(b,a,c,r,color){const av=new T.Vector3(...a),cv=new T.Vector3(...c),d=cv.clone().sub(av),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());const g=new T.CylinderGeometry(r,r,d.length(),7);g.applyQuaternion(q);g.translate(...av.add(cv).multiplyScalar(.5).toArray());b.add(g,color);}
  function wing(b,points,side,color,y=.05){
    // Taper to a fine tip rather than leaving a constant-thickness sheet.
    const span=Math.max(...points.map(p=>p[1])),p=points.map(([x,z])=>[x,y+.012+.09*(1-z/span),z*side]);if(side>0)p.reverse();
    const n=p.length,out=[],low=p.map(([x,h,z])=>[x,y-(h-y)*.42,z]);
    for(let i=1;i<n-1;i++){out.push(...p[0],...p[i],...p[i+1],...low[0],...low[i+1],...low[i]);}
    for(let i=0;i<n;i++){const j=(i+1)%n;out.push(...p[i],...low[i],...p[j],...p[j],...low[i],...low[j]);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();b.add(g,color);
  }
  function fin(b,x,z,height,chord,side,color){
    // Swept canted tail, with an actual thickness and rudder seam.
    const p=[[x+.45,.18,z],[x-.12,height,z+side*.48],[x-chord*.72,height*.92,z+side*.45],[x-chord,.18,z]];
    panel(b,p,color,.045);rod(b,[x-chord*.63,height*.8,z+side*.39],[x-chord*.85,.24,z],.009,0x68747a);
  }
  function nozzle(b,x,z,r){
    b.cyl(r,.44,x,0,z,0x60656a,'x',r*.89,24);b.cyl(r*.8,.025,x-.235,0,z,0x11191d,'x',r*.8,24);
    for(let j=0;j<16;j++){const a=j*Math.PI/8;rod(b,[x-.2,Math.cos(a)*r*.95,z+Math.sin(a)*r*.95],[x+.18,Math.cos(a)*r,z+Math.sin(a)*r],.012,0x939796);}
  }
  function intake(b,x,z,w,h,color){
    loft(b,[[x-.85,-.15,w*.85,h*.85],[x-.2,-.14,w,h],[x,-.14,w*.93,h*.94]],color,z,12);
    const p=[[x+.008,-.14+h*.75,z-w*.8],[x+.008,-.14-h*.72,z-w*.64],[x+.008,-.14-h*.72,z+w*.64],[x+.008,-.14+h*.75,z+w*.8]];
    panel(b,p,dark,.003);
  }
  function f35Intake(b,side,color){
    // Front photo: the outer wall leans in towards the bottom; the top lip is wider.
    const opening=[[2.05,.19,side*.55],[1.84,.32,side*1.10],[1.63,-.36,side*.96],[1.90,-.43,side*.72]];
    const rim=opening.map(([x,y,z])=>[x+.02,y*1.12,z+side*.035]);
    const back=opening.map(([x,y,z])=>[x-.66,y*.83,z-side*.06]);
    for(let i=0;i<4;i++){const j=(i+1)%4;panel(b,[rim[i],rim[j],opening[j],opening[i]],color,.008);panel(b,[opening[i],opening[j],back[j],back[i]],0x35434c,.008);}
    panel(b,back,0x111b24,.003);
    const shoulder=[[-2.7,.46,side*.47],[-2.7,.13,side*.94],[-2.7,-.23,side*.85],[-2.7,-.37,side*.52]];
    for(let i=0;i<4;i++){
      const j=(i+1)%4,p=[],idx=[];
      for(let k=0;k<6;k++){const t=k/5,u=t*t*(3-2*t);for(const v of [i,j])p.push(rim[v][0]*(1-t)+shoulder[v][0]*t,rim[v][1]*(1-u)+shoulder[v][1]*u,rim[v][2]*(1-u)+shoulder[v][2]*u);if(k<5){const a=k*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();b.add(g,color);
    }
    // The visible DSI bulge is a shallow blended patch on the inner intake wall.
    loft(b,[[.65,.05,.10,.23],[1.25,.02,.18,.32],[1.85,.01,.09,.22],[2.18,.02,.025,.08]],color,side*.54,12);
  }
  function translatedBuilder(b,part,dx,dy,dz){for(let i=0;i<part.p.length;i+=3)b.p.push(part.p[i]+dx,part.p[i+1]+dy,part.p[i+2]+dz);b.n.push(...part.n);b.c.push(...part.c);b.paint.push(...part.paint);b.parts+=part.parts;}
  function suIntake(b,s,c){
    const front=[[1.24,.12,s*.66],[1.08,.13,s*1.49],[.90,-.55,s*1.43],[1.10,-.55,s*.72]],back=front.map(([x,y,z])=>[x-.65,y,z]);
    for(let i=0;i<4;i++){const j=(i+1)%4;panel(b,[front[i],front[j],back[j],back[i]],0x32424a,.015);rod(b,front[i],front[j],.035,c);}
    panel(b,back,0x18242b,.005);
    const aft=[[-2,.18,s*.61],[-2,.18,s*1.43],[-2,-.40,s*1.38],[-2,-.40,s*.70]];
    for(let i=0;i<4;i++){const j=(i+1)%4;panel(b,[front[i],aft[i],aft[j],front[j]],c,.012);}
  }
  function cockpit(b,x,length,width,base,color){
    loft(b,[[x-length*.55,base,width*.06,.02],[x-length*.35,base+.14,width*.65,.25],[x,base+.22,width,.32],[x+length*.35,base+.12,width*.72,.26],[x+length*.55,base,width*.04,.015]],glass,0,20);
    for(const side of [-1,1])rod(b,[x-length*.43,base+.04,side*width*.54],[x+length*.35,base+.05,side*width*.65],.025,color);
    rod(b,[x+length*.25,base+.07,-width*.72],[x+length*.32,base+.48,0],.018,color);rod(b,[x+length*.32,base+.48,0],[x+length*.25,base+.07,width*.72],.018,color);
  }
  function fighter(f){
    const b=new B(),f35=f==='usa'||f==='kor',j20=f==='chn',su=f==='rus',rafale=f==='ind';
    const c=f35?0x58646e:j20?0x737f85:su?0x758994:0x7b898f,edge=f35?0x899298:0xa1abad;
    const L=f35?10:j20?12.8:su?12.3:9.75,halfSpan=f35?3.407:j20?3.95:su?4.42:3.4725;
    const front=L*.5,rear=-L*.5;
    const sections=f35?[
      [rear+.1,0,.43,.38],[-4.0,.05,.62,.43],[-3.1,.1,.90,.47],[-1.7,.09,1.18,.51],[-.2,.10,1.17,.53],[.95,.12,.91,.53],[1.8,.10,.61,.49],[2.7,.08,.56,.38],[3.6,.03,.43,.27],[4.3,0,.24,.15],[front,0,.015,.012]
    ]:j20?[
      [rear+.3,0,.7,.35],[-4.6,.05,.91,.4],[-2.8,.08,1.01,.4],[0,.04,.93,.42],[2,.08,.67,.45],[3.7,.02,.48,.3],[4.8,0,.36,.23],[front,0,.012,.012]
    ]:su?[
      [rear+.1,.06,.63,.19],[-4,.08,1.16,.3],[-2,.08,1.53,.34],[0,.05,1.33,.34],[1.8,.12,.72,.47],[3.1,.1,.55,.38],[4.45,.02,.38,.24],[front,0,.015,.014]
    ]:[
      [rear+.15,0,.58,.32],[-3.1,.06,.68,.42],[-1.4,.1,.78,.47],[.2,.08,.69,.46],[1.7,.04,.5,.4],[3.1,0,.34,.27],[front,0,.012,.012]
    ];
    if(f35||j20)chinedBody(b,sections,c);else loft(b,sections,c,0,24);
    cockpit(b,f35?2.25:j20?3.4:su?2.8:2.35,f35?2:j20?2.4:su?2.3:1.9,f35?.34:.32,f35?.43:.36,c);
    const wings=f35?[[1.0,.65],[-1.9,halfSpan],[-2.7,halfSpan*.95],[-2.62,.72]]:
      j20?[[1.0,.85],[-3.48,halfSpan],[-4.6,halfSpan*.9],[-4.62,.83]]:
      su?[[1.1,1.07],[-2.45,halfSpan],[-3.22,halfSpan*.96],[-3.35,1.0]]:
      [[1.2,.59],[-2.3,halfSpan],[-3.25,halfSpan],[-3.25,.58]];
    for(const s of [-1,1]){
      wing(b,wings,s,c,.08);
      // Small trailing-edge break, subtle panel separation; no raised grid of boxes.
      const wx=wings[wings.length-2][0],wz=wings[wings.length-2][1];rod(b,[wx+.18,.087,s*wz*.92],[wx+.45,.087,s*.97],.009,edge);
      if(f35){
        wing(b,[[-2.6,.61],[-3.9,2.18],[-4.8,2.08],[-4.65,.45]],s,c,.12);
        fin(b,-2.75,s*.68,1.52,1.8,s,c);f35Intake(b,s,c);
        // Closed dorsal panels and wing-root shoulder treatment.
        seam(b,[[.58,.616,s*.25],[-.26,.641,s*.34],[-1.25,.588,s*.37],[-1.65,.57,s*.22]],edge,.012);
        seam(b,[[-2.27,.536,s*.48],[-2.55,.515,s*.61],[-3.10,.478,s*.48],[-2.87,.50,s*.31]],0x46545e,.007,true);
        // Flush closed wheel-bay panel, kept underneath flying model.
        seam(b,[[-.25,-.458,s*.83],[-.50,-.47,s*.62],[-1.93,-.47,s*.65],[-2.2,-.43,s*.85]],0x36434c,.008,true);
      }else if(j20){
        wing(b,[[3.48,.58],[2.20,1.87],[1.54,1.81],[2.05,.68]],s,c,.18);
        fin(b,-3.6,s*.84,1.59,2.1,s,c);const duct=new B();f35Intake(duct,s,c);for(let k=0;k<duct.p.length;k+=3){duct.p[k+1]*=.8;duct.p[k+2]*=.85;}for(let k=0;k<duct.n.length;k+=3){const n=new T.Vector3(duct.n[k],duct.n[k+1]/.8,duct.n[k+2]/.85).normalize();duct.n[k]=n.x;duct.n[k+1]=n.y;duct.n[k+2]=n.z;}translatedBuilder(b,duct,.52,-.04,s*.17);
        // Rear ventral strakes, not horizontal elevators.
        panel(b,[[-4.45,-.23,s*.8],[-5.4,-.2,s*.78],[-5.07,-.7,s*1.1],[-4.0,-.48,s*1.1]],c);
      }else if(su){
        wing(b,[[-3.05,.95],[-4.25,2.65],[-5.54,2.5],[-5.3,.76]],s,c,.03);
        fin(b,-3.25,s*1.15,1.32,1.74,s,c);suIntake(b,s,c);
        // Widely separated engine nacelles and tail boom are defining Su-57 geometry.
        loft(b,[[rear+.45,-.09,.42,.39],[-3.8,-.03,.47,.43],[-1.8,-.10,.53,.38],[.8,-.12,.44,.33]],c,s*.99,20);
      }else{
        wing(b,[[2.64,.47],[1.76,1.49],[1.10,1.39],[1.36,.57]],s,c,.30);
        intake(b,1.0,s*.63,.3,.37,c);
        b.cyl(.052,.72,-2.49,.12,s*halfSpan,0x65737b,'x');
      }
      // Visible flap/aileron breaks, leading-edge seam, inspection covers and emblem.
      const lead=wings[0],tip=wings[1],trail=wings[2],root=wings[3],sy=z=>.08+.012+.09*(1-z/halfSpan)+.006;
      seam(b,[[lead[0]-.18,sy(lead[1]+.08),s*(lead[1]+.08)],[tip[0]-.09,sy(tip[1]-.15),s*(tip[1]-.15)]],0x53656f,.007);
      seam(b,[[trail[0]+.25,sy(trail[1]-.15),s*(trail[1]-.15)],[root[0]+.34,sy(root[1]+.25),s*(root[1]+.25)]],0x53656f,.009);
      seam(b,[[trail[0]+.22,sy(halfSpan*.72),s*halfSpan*.72],[trail[0]-.03,sy(halfSpan*.72),s*halfSpan*.72]],0x475963,.009);
      badge(b,f,(tip[0]+trail[0])*.5+.15,sy(halfSpan*.72)+.008,s*halfSpan*.72,.16);
    }
    if(f35)nozzle(b,rear+.22,0,.43);
    else{const offset=su?.99:j20?.55:.36,r=su?.40:j20?.39:.32;for(const s of [-1,1])nozzle(b,rear+.22,s*offset,r);}
    if(rafale){
      fin(b,-2.5,0,1.8,2.05,0,c);
      // Fixed refuelling probe on the starboard shoulder, an unmistakable Rafale cue.
      rod(b,[2.55,.32,.35],[3.12,.64,.51],.035,c);rod(b,[3.12,.64,.51],[3.78,.65,.51],.025,steel);
    }
    if(su){b.sphere(.16,3.42,.48,.22,0x6c777a,[1,1,1]);loft(b,[[rear-.03,.14,.025,.02],[rear+.85,.15,.25,.18]],c);}
    // Radome boundary and canopy sill, not fabricated aircraft serial numbers.
    const nr=f35?[3.6,.03,.43,.27]:j20?[4.8,0,.36,.23]:su?[4.45,.02,.38,.24]:[3.1,0,.34,.27];
    const ring=Array.from({length:25},(_,i)=>[nr[0],nr[1]+Math.cos(i*Math.PI/12)*nr[3]*1.008,Math.sin(i*Math.PI/12)*nr[2]*1.008]);seam(b,ring,0x5c6c76,.008);
    if(f35){
      // Under-nose faceted EOTS window is a distinguishing exterior detail.
      panel(b,[[2.45,-.37,-.13],[2.92,-.31,-.11],[3.02,-.43,0],[2.55,-.52,0]],glass);
      panel(b,[[2.45,-.37,.13],[2.92,-.31,.11],[3.02,-.43,0],[2.55,-.52,0]],glass);
    }
    // Closed gear-door seams remain on flying aircraft; no permanently exposed wheels.
    for(const s of [-1,1])rod(b,[-1.1,-.39,s*.5],[-2.05,-.37,s*.5],.012,0x697478);
    const g=new T.Group();g.add(b.finish());g.userData={scale:7.4,parts:b.parts,profile:f35?'F-35A':j20?'J-20':su?'Su-57':'Rafale C',evidenceStatus:'photo-referenced',referenceUrl:sources.fighter[f],spanLengthRatio:2*halfSpan/L,visualReview:'second-pass silhouette and surface revision; not photogrammetry'};return g;
  }
  function gear(b,x,z,y=-1.03,r=.24){
    rod(b,[x+.16,x<-3?.25:-.23,z*.56],[x,y+.18,z],.045,steel);b.cyl(r,.13,x,y,z,rubber,'z',r,16);b.cyl(r*.46,.145,x,y,z,0x8a9291,'z',r*.46,12);
  }
  function canopyPanel(b,points){panel(b,points,glass,.012);for(let i=0;i<points.length;i++)rod(b,points[i],points[(i+1)%points.length],.026,0x5d655b);}
  function helicopter(f){
    const b=new B(),c=f==='usa'||f==='kor'?0x555d49:f==='chn'?0x505b47:f==='rus'?0x657257:0x63706b;
    const ka=f==='rus',apache=f==='usa'||f==='kor',z10=f==='chn',lch=f==='ind';
    const nose=ka?3.5:apache?3.35:z10?3.15:3.05,tail=ka?-5.25:apache?-5.8:z10?-5.45:-5.35;
    const body=ka?[[tail,.28,.06,.08],[tail+1,.20,.20,.18],[-2.3,.03,.43,.33],[-1.2,-.04,.85,.60],[.4,-.04,.93,.61],[1.8,-.10,.84,.53],[2.7,-.19,.74,.40],[3.25,-.22,.61,.32],[3.5,-.22,.25,.18],[3.57,-.22,.02,.02]]:
      [[tail,.28,.06,.08],[tail+1.0,.20,.17,.16],[-2.3,.03,.31,.31],[-1.2,-.04,.50,.60],[.4,-.04,.43,.66],[1.8,-.12,.40,.57],[nose-.34,-.24,.28,.27],[nose,-.28,.04,.05]];
    if(lch)chinedBody(b,body,c);else loft(b,body,c,0,ka?24:16);
    // Engine housings run along the upper shoulders instead of a spherical cabin.
    for(const s of [-1,1]){
      if(lch){
        const z=s*.49;loft(b,[[-2.2,.36,.13,.15],[-1.65,.58,.27,.32],[-.4,.65,.29,.39],[.17,.60,.23,.34],[.38,.45,.15,.18]],c,z,8);
        b.box(.48,.38,.035,-1.1,.68,s*.78,dark);for(let k=0;k<7;k++)b.box(.025,.38,.042,-1.31+k*.064,.68,s*.80,steel);
        b.box(.4,.06,.25,-1.8,.71,z,steel,[0,0,-.1]);
      }else{
        loft(b,[[-1.75,.46,.26,.3],[-.8,.62,.34,.35],[.12,.62,.34,.34],[.58,.45,.19,.22]],c,s*(ka?.78:apache?.65:.51),16);
        b.cyl(.22,.03,.40,.55,s*(ka?.81:apache?.70:.53),dark,'x',.22,16);
        b.cyl(.22,.44,-1.68,.49,s*(ka?.77:apache?.65:.54),steel,'x',.25,16);
        b.cyl(.17,.02,-1.91,.49,s*(ka?.77:apache?.65:.54),dark,'x',.17,16);
      }
      const wingZ=ka?2.25:apache?2.12:z10?1.93:1.8;
      wing(b,[[.65,.38],[.18,wingZ],[-.43,wingZ],[-.72,.43]],s,c,-.2);
      for(const z of [wingZ*.64,wingZ*.93]){
        b.box(.43,.13,.1,-.05,-.34,s*z,steel);b.cyl(.17,.89,.05,-.55,s*z,c,'x',.17,16);
        // Dark pod mouths and rim suggest stores without exposing internal construction.
        b.cyl(.145,.016,.505,-.55,s*z,dark,'x',.145,16);
      }
      if(ka){
        canopyPanel(b,[[2.72,.20,s*.64],[2.27,.63,s*.68],[1.37,.77,s*.74],[1.14,.36,s*.82]]);
        canopyPanel(b,[[2.82,.22,s*.045],[2.49,.65,s*.045],[2.27,.63,s*.68],[2.72,.20,s*.64]]);
        canopyPanel(b,[[2.49,.65,s*.045],[1.42,.82,s*.045],[1.37,.77,s*.74],[2.27,.63,s*.68]]);
        panel(b,[[1.42,.82,0],[.8,.5,0],[1.14,.36,s*.82],[1.37,.77,s*.74]],c);
        // Larger rearward main gear doors and short struts seen in the front photo.
        panel(b,[[-.6,-.12,s*.94],[-1.34,-.12,s*.86],[-1.38,-.58,s*.84],[-.65,-.62,s*.92]],0x55624f);
      }else{
        // Two genuinely stepped tandem cockpits with separately framed windscreens.
        canopyPanel(b,[[2.80,.11,s*.27],[2.15,.69,s*.32],[1.23,.77,s*.35],[1.14,.29,s*.42]]);
        canopyPanel(b,[[1.21,.29,s*.42],[1.15,.77,s*.35],[.52,1.14,s*.32],[-.15,1.12,s*.31],[-.36,.42,s*.43]]);
        canopyPanel(b,[[2.80,.11,s*.27],[2.15,.69,s*.32],[2.15,.78,0],[2.80,.18,0]]);
        canopyPanel(b,[[1.15,.77,s*.35],[.52,1.14,s*.32],[.52,1.21,0],[1.15,.84,0]]);
        panel(b,[[2.15,.78,0],[1.23,.85,0],[1.23,.77,s*.35],[2.15,.69,s*.32]],c);
        panel(b,[[.52,1.21,0],[-.15,1.19,0],[-.15,1.12,s*.31],[.52,1.14,s*.32]],c);
        panel(b,[[-.15,1.19,0],[-.6,.5,0],[-.36,.42,s*.43],[-.15,1.12,s*.31]],c);
      }
      // Visible maintenance panels, fasteners, door handle and a subdued nationality mark.
      const zz=s*(ka?.86:.50);
      seam(b,[[-1.30,.05,zz],[-.62,.06,zz],[-.62,-.35,zz],[-1.30,-.31,zz]],0x394638,.008,true);
      for(let i=0;i<7;i++)rod(b,[-1.15+i*.14,.43,s*(ka?1.08:.95)],[-1.13+i*.14,.67,s*(ka?1.08:.95)],.013,0x374237);
      rod(b,[.66,.34,s*(ka?.84:.47)],[.95,.34,s*(ka?.84:.47)],.023,steel);
      badge(b,f,tail+1.40,.22,s*.20,.13,true);
      if(apache){
        // Apache avionics cheek fairing runs along the cockpit base.
        loft(b,[[1.15,-.26,.18,.20],[2.25,-.23,.19,.21],[2.96,-.22,.12,.16]],c,s*.43,8);
        rod(b,[1.20,-.05,s*.52],[2.75,-.05,s*.43],.012,0x344037);
      }
      if(ka)gear(b,-.92,s*.87,-1.03,.25);else gear(b,1.03,s*.89,-1.09,.24);
    }
    if(ka){for(const z of [-.10,.10])gear(b,2.35,z,-1.00,.18);}else gear(b,tail+.75,0,-.61,.15);
    // Tail surfaces differ visibly: Ka-52 has no tail rotor at all.
    panel(b,[[tail+.90,.22,0],[tail+.18,1.52,0],[tail-.45,1.57,0],[tail+.15,.19,0]],c);
    for(const s of [-1,1])wing(b,[[tail+1.63,.10],[tail+1.04,1.02],[tail+.52,1.08],[tail+.72,.08]],s,c,.18);
    if(!ka){
      const tr=new B();for(let j=0;j<4;j++){const a=j*Math.PI/2+(apache?(j%2)*.32:0);rod(tr,[Math.cos(a)*.12,Math.sin(a)*.12,0],[Math.cos(a)*.88,Math.sin(a)*.88,0],.055,dark);}
      const tm=tr.finish();tm.name='tailRotor';tm.position.set(tail+.05,1.03,.16);b.parts+=tr.parts;
      b.userDataTail=tm;
    }
    // Distinct chin optics and visible turret silhouette.
    if(apache){b.box(.48,.26,.52,2.96,-.1,0,c);b.sphere(.25,3.19,-.25,0,dark,[.7,.85,1]);b.sphere(.10,3.37,-.25,.08,0x496b73);b.sphere(.19,2.23,-.77,0,steel);b.cyl(.038,.78,2.56,-.86,0,steel,'x');}
    else if(ka){b.sphere(.25,2.90,-.62,0,0x5b6462);b.sphere(.1,3.1,-.64,.05,glass);b.cyl(.05,1.26,1.35,-.43,.90,steel,'x');}
    else{b.sphere(.22,2.73,-.44,0,c);b.sphere(.12,2.9,-.43,0,glass);b.sphere(.17,2.30,-.72,0,steel);b.cyl(.032,.77,2.66,-.78,0,steel,'x');}
    // Main rotor assemblies are independent animated meshes; Ka-52 counter-rotates.
    const g=new T.Group();g.add(b.finish());if(b.userDataTail)g.add(b.userDataTail);
    const count=z10?5:ka?3:4,radius=ka?4.3:apache?4.78:z10?4.2:4.22,levels=ka?[1.62,2.35]:[1.50];
    for(let k=0;k<levels.length;k++){
      const r=new B();r.cyl(.13,.38,0,0,0,steel);r.cyl(.28,.11,0,.02,0,steel);
      for(let j=0;j<count;j++){
        const a=j/count*Math.PI*2+k*.34;
        // Blades pivot around hub: old code rotated boxes around their own centres.
        const ca=Math.cos(a),sa=Math.sin(a),pts=[[.32,-.09],[radius*.75,-.10],[radius,.015],[radius,.18],[.32,.12]].map(([x,z])=>[x*ca-z*sa,.05,x*sa+z*ca]);
        panel(r,pts,dark,.028);rod(r,[.13*ca,.02,.13*sa],[.62*ca,.02,.62*sa],.055,steel);
      }
      const rotor=r.finish();rotor.name=k?'rotorCounter':'rotor';rotor.position.set(-.42,levels[k],0);g.add(rotor);b.parts+=r.parts;
    }
    // Aircraft-specific mast and transmission, not an oversized radar on every version.
    const mast=new B();mast.cyl(.11,ka?1.65:.9,-.42,ka?1.65:1.12,0,steel);mast.sphere(.36,-.42,.91,0,c,[1,.7,1]);g.add(mast.finish());
    g.userData={scale:8,parts:b.parts+mast.parts,profile:ka?'Ka-52':apache?'AH-64E':z10?'Z-10':'LCH Prachand',evidenceStatus:'photo-referenced',referenceUrl:sources.heli[f],rotorBlades:count,rotorLevels:levels.length,visualReview:'second-pass cockpit and gear revision; not photogrammetry'};return g;
  }
  for(const f of ['usa','rus','chn','ind','kor']){M.register('fighter',f,()=>fighter(f));M.register('heli',f,()=>helicopter(f));}
})(globalThis);
