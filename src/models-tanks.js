/* Exterior artwork rebuilt against the source-photo review, not engineering CAD.
 * Coordinates are relative art units. No internal armor or weapon construction data. */
(function(){
  'use strict';
  const T=THREE,M=WarModels,B=M.Builder,metal=0x41423d,tire=0x252722,lens=0x233b42;
  // Each section has its own roof and shoulder: a turret is not a uniformly inset box.
  function shell(b,sections,c,paint=0){
    const p=[],rings=sections.map(s=>{const [x,bottom,top,wb,wt]=s;return [[x,bottom,-wb],[x,bottom,wb],[x,top,wt],[x,top,-wt]];});
    const tri=(a,b,c)=>p.push(...a,...b,...c);
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<4;j++){let k=(j+1)%4;tri(rings[i][j],rings[i+1][j],rings[i+1][k]);tri(rings[i][j],rings[i+1][k],rings[i][k]);}
    tri(rings[0][0],rings[0][1],rings[0][2]);tri(rings[0][0],rings[0][2],rings[0][3]);const q=rings.at(-1);tri(q[0],q[2],q[1]);tri(q[0],q[3],q[2]);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();b.add(g,c,[0,0,0],[0,0,0],[1,1,1],paint);
  }
  function beam(b,a,z,r,c){const v=new T.Vector3(...a),w=new T.Vector3(...z),d=w.clone().sub(v),g=new T.CylinderGeometry(r,r,d.length(),7);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate(...v.add(w).multiplyScalar(.5).toArray());b.add(g,c);}
  function lid(b,x,y,z,r,c){b.cyl(r,.045,x,y,z,c,'y',r,24);b.cyl(r*.91,.022,x,y+.03,z,metal,'y',r*.91,24);b.cyl(r*.84,.026,x,y+.044,z,c,'y',r*.84,24);b.box(.22,.035,.045,x,y+.077,z,metal);}
  function gear(b,c,L,count,wide){
    const spread=L*.70, xs=Array.from({length:count},(_,i)=>-spread/2+i*spread/(count-1));
    for(const side of [-1,1]){
      const z=side*wide,r=.50;
      for(let i=0;i<count;i++){
        const x=xs[i];b.cyl(r,.32,x,.61,z,tire,'z',r,32);b.cyl(r*.82,.035,x,.61,z+side*.19,c,'z',r*.82,32);
        b.cyl(r*.57,.035,x,.61,z+side*.213,metal,'z',r*.57,28);b.cyl(r*.48,.046,x,.61,z+side*.24,c,'z',r*.48,24);
        b.cyl(.12,.09,x,.61,z+side*.28,metal,'z',.12,16);
        for(let k=0;k<8;k++){let a=k*Math.PI/4;b.cyl(.025,.026,x+Math.cos(a)*.17,.61+Math.sin(a)*.17,z+side*.271,0xa1a18b,'z',.025,6);}
      }
      const front=L/2-.13,back=-L/2+.16;
      for(const x of [back,front]){b.cyl(.37,.4,x,.91,z,metal,'z',.37,28);b.cyl(.27,.025,x,.91,z+side*.22,c,'z',.27,24);b.cyl(.105,.05,x,.91,z+side*.25,metal,'z');}
      // Flat loaded lower run, short rising noses and upper return under the skirt.
      const pts=[[back-.33,.92],[back-.23,.48],[xs[0]-.22,.12],[xs.at(-1)+.22,.12],[front+.25,.48],[front+.33,.92],[front+.22,1.27],[back-.22,1.27]];
      for(let j=0;j<pts.length;j++){
        const a=pts[j],e=pts[(j+1)%pts.length],len=Math.hypot(e[0]-a[0],e[1]-a[1]),n=Math.ceil(len/.17),angle=Math.atan2(e[1]-a[1],e[0]-a[0]);
        for(let k=0;k<n;k++){
          const t=(k+.5)/n,x=a[0]+t*(e[0]-a[0]),y=a[1]+t*(e[1]-a[1]);
          b.box(len/n*.94,.075,.58,x,y,z,metal,[0,0,angle]);
          const nx=-Math.sin(angle),ny=Math.cos(angle);
          b.box(len/n*.68,.026,.37,x+nx*.046,y+ny*.046,z,tire,[0,0,angle]);
          for(const edge of [-1,1])b.cyl(.035,.05,x,y,z+edge*.30,0x686455,'z',.035,6);
        }
      }
    }
  }
  const defs={
    chn:{name:'ZTZ-99A',L:7.3,c:0x7a8065,paint:2,w:1.54,n:6,roof:1.48,ring:1.57,barrel:5.4,skirt:.44},
    usa:{name:'M1A2 SEPv3 exterior approximation',L:7.9,c:0xb3a17e,paint:3,w:1.58,n:7,roof:1.48,ring:1.57,barrel:4.7,skirt:.70},
    rus:{name:'T-90M',L:6.95,c:0x657052,paint:4,w:1.48,n:6,roof:1.41,ring:1.5,barrel:5.25,skirt:.47},
    ind:{name:'T-90S Bhishma',L:6.9,c:0x858262,paint:5,w:1.48,n:6,roof:1.4,ring:1.49,barrel:5.2,skirt:.43},
    kor:{name:'K2 Black Panther',L:7.5,c:0x7a7a5b,paint:6,w:1.53,n:6,roof:1.45,ring:1.54,barrel:5.3,skirt:.64}
  };
  function build(f){
    const d=defs[f],b=new B(),t=new B(),{L,c,paint,roof}=d,us=f==='usa',ru=f==='rus',ind=f==='ind',cn=f==='chn',ko=f==='kor';
    gear(b,c,L,d.n,d.w);
    // Lower tub and the long, shallow glacis are separate surfaces.
    shell(b,[[-L/2,.52,1.18,1.23,1.47],[-L/2+.6,.42,1.23,1.26,1.49],[L/2-.65,.42,1.13,1.19,1.43],[L/2,.58,1.02,1.22,1.40]],c,paint);
    shell(b,[[-L/2,1.12,roof,1.72,1.70],[-1.5,1.13,roof,1.73,1.70],[1.6,1.13,roof,1.74,1.65],[L/2-.1,1.01,1.13,1.72,1.68]],c,paint);
    for(const s of [-1,1]){
      const panels=us?7:cn?7:6,begin=-L/2+.15,len=(L-.25)/panels;
      for(let i=0;i<panels;i++){
        const x=begin+len*(i+.5),h=d.skirt+(ru&&i>3?.14:0);
        b.box(len-.035,h,.065,x,roof-.13-h/2,s*(d.w+.32),c,[0,0,0],paint);
        b.box(len-.09,.035,.11,x,roof-.15,s*(d.w+.34),c);
        for(const dx of [-len*.38,len*.38])b.cyl(.022,.026,x+dx,roof-.23,s*(d.w+.36),metal,'z',.022,6);
        if(ru&&i>=3){b.box(len-.12,.26,.15,x,roof-.38,s*(d.w+.38),c,[.08*s,0,0],paint);}
      }
      b.box(.50,.08,.68,L/2-.2,1.15,s*d.w,c,[0,0,-.16],paint);
      b.box(.08,.36,.61,-L/2-.06,.92,s*d.w,tire);
      b.box(.065,.32,.63,L/2+.02,.93,s*d.w,tire,[0,0,.16]);
      // Headlight housings, guards and tow loops at the low glacis.
      b.box(.13,.17,.34,L/2-.02,1.24,s*1.16,metal);b.cyl(.065,.018,L/2+.058,1.24,s*1.16,0xc5c4a9,'x',.065,16);
      beam(b,[L/2-.22,1.17,s*1.38],[L/2-.22,1.42,s*1.38],.022,c);
      beam(b,[L/2-.22,1.42,s*1.38],[L/2+.12,1.42,s*1.38],.022,c);
      b.cyl(.085,.12,L/2-.04,.79,s*.92,metal,'z');
      // Fine fender seams are on the surface, not thick decorative bars.
      for(let j=0;j<7;j++)b.box(.014,.012,.43,-L/2+.4+j*(L-.7)/7,roof+.008,s*1.47,metal);
    }
    // Engine rear grille with closely spaced slots and separate hatch outlines.
    b.box(1.48,.018,2.15,-L/2+.85,roof+.015,0,metal);
    for(let i=0;i<18;i++)b.box(.045,.027,2.06,-L/2+.16+i*.078,roof+.032,0,c);
    for(const z of [-.67,.67]){b.box(.68,.018,.50,-1.98,roof+.018,z,metal);b.box(.64,.022,.46,-1.98,roof+.032,z,c);}
    b.box(.045,.55,2.15,-L/2-.022,.96,0,metal);
    for(let j=0;j<12;j++)b.box(.05,.028,2.04,-L/2-.05,.73+j*.039,0,c);
    // Tow cables are loops on the rear/engine deck; never structural armor.
    for(const s of [-1,1]){beam(b,[-L/2+.15,roof+.08,s*1.04],[-1.9,roof+.08,s*1.16],.026,metal);b.box(.24,.15,.26,-L/2-.06,1.30,s*1.18,c);}
    const driver=us?1.68:cn?2.07:1.65;lid(b,driver,roof+.025,us?0:-.34,.30,c);for(const z of [-.22,0,.22])b.box(.14,.08,.13,driver+.26,roof+.09,z+(us?0:-.34),lens);
    b.cyl(1.03,.08,-.15,d.ring-.065,0,metal,'y',1.03,48);
    // Independent profiles: large Abrams bustle, long flat 99A cheeks,
    // welded T-90M, rounded T-90S and low, angular K2.
    if(us){
      shell(t,[[-2.25,.03,.65,1.37,1.21],[-1.5,.02,.74,1.51,1.17],[.35,.02,.73,1.61,1.21]],c,paint);
      // Separate cheek wedges and recessed center mantlet restore the split frontal silhouette.
      for(const s of [-1,1]){
        const lower=[[.30,.02,s*.30],[1.98,.03,s*.30],[1.57,.03,s*1.35],[.30,.02,s*1.61]];
        const upper=[[.12,.73,s*.32],[1.52,.60,s*.32],[1.15,.59,s*1.10],[.12,.73,s*1.21]],p=[];
        const tri=(a,b,c)=>p.push(...a,...b,...c);
        for(let j=0;j<4;j++){let k=(j+1)%4;if(s>0){tri(lower[j],upper[k],lower[k]);tri(lower[j],upper[j],upper[k]);}else{tri(lower[j],lower[k],upper[k]);tri(lower[j],upper[k],upper[j]);}}
        for(let j=1;j<3;j++){if(s>0)tri(upper[0],upper[j+1],upper[j]);else tri(upper[0],upper[j],upper[j+1]);}
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.computeVertexNormals();t.add(geo,c,[0,0,0],[0,0,0],[1,1,1],paint);
      }
      t.box(1.15,.44,.52,1.01,.31,0,0x8a816b);t.box(.30,.44,.58,1.62,.30,0,c);
      for(const s of [-1,1]){t.box(1.35,.025,.84,-1.39,.751,s*.52,c);}
      // Blow-off panel seams, bustle basket and rear auxiliary equipment.
      for(const x of [-1.98,-1.48,-.98])t.box(.014,.012,2.2,x,.755,0,metal);
      t.box(.65,.52,.55,-2.18,.33,-1.2,c);
    }else if(cn){
      shell(t,[[-2.04,.03,.63,1.32,1.29],[-.65,.02,.75,1.42,1.24],[.68,.02,.73,1.47,1.14],[1.26,.03,.58,1.27,.90],[1.91,.04,.30,.92,.79]],c,paint);
      // Two broad tapered cheeks; no ladder of four square ERA boxes.
      for(const s of [-1,1]){
        const q=new B();shell(q,[[.30,.10,.62,.62,.51],[1.30,.07,.52,.50,.40],[1.95,.08,.24,.30,.25]],c,paint);
        const mesh=q.finish();mesh.geometry.translate(.06,0,s*.77);b.parts+=0;t.add(mesh.geometry,c,[0,0,0],[0,0,0],[1,1,1],paint);
        t.box(.045,.24,.23,1.75,.25,s*.72,lens);
        for(const x of [-1.55,-1.02,-.49])t.box(.018,.42,.025,x,.36,s*1.32,metal);
      }
    }else if(ru){
      shell(t,[[-2.02,.06,.67,1.05,1.02],[-1.1,.02,.73,1.36,1.1],[.4,0,.65,1.45,1.03],[1.5,.04,.30,1.04,.74],[1.86,.05,.25,.45,.40]],c,paint);
      t.box(.55,.57,1.95,-1.93,.38,0,c,[0,0,0],paint);
      for(const s of [-1,1])for(let i=0;i<3;i++)t.box(.50,.36,.43,.18+i*.49,.27,s*(1.15-i*.12),c,[0,s*.23,-.28],paint);
    }else if(ind){
      // Broad domed base beneath the distinct ERA tiles of the export vehicle.
      t.sphere(1,0,.16,0,c,[1.65,.51,1.28]);
      shell(t,[[-1.4,0,.30,1.02,.90],[-.65,.01,.58,1.35,.98],[.55,.02,.52,1.26,.85],[1.6,.03,.22,.6,.44]],c,paint);
      for(const s of [-1,1])for(let i=0;i<4;i++)t.box(.38,.28,.40,.0+i*.37,.25,s*(1.13-i*.16),c,[0,s*.31,-.33],paint);
      for(const s of [-1,1])t.box(.24,.26,.32,1.14,.35,s*.61,0x393b36);
    }else{
      shell(t,[[-2.02,.04,.56,1.25,1.22],[-1.15,.02,.64,1.39,1.20],[.42,.02,.63,1.43,1.12],[1.35,.03,.43,1.29,1.09],[1.62,.04,.30,1.23,1.08]],c,paint);
      for(const s of [-1,1]){t.box(.46,.27,.07,.1,.41,s*1.43,metal);t.box(.38,.21,.08,.1,.42,s*1.48,0x6e7568);}
      for(const x of [-1.85,-1.35,-.85])t.box(.018,.012,2.08,x,.65,0,metal);
      for(const s of [-1,1]){t.box(.16,.24,.51,1.62,.27,s*.99,c,[0,s*.10,0],paint);t.box(.025,.13,.35,1.72,.28,s*.99,0x596150);}
      t.box(.52,.64,.91,1.62,.43,0,c,[0,0,-.10],paint);t.box(.025,.13,.48,1.91,.66,0,lens);
      t.cyl(.215,.16,1.96,.43,0,c,'x',.215,32);t.cyl(.17,.03,2.05,.43,0,metal,'x',.17,32);
      t.box(.49,.22,.45,.86,.74,.63,c);t.box(.025,.15,.34,1.12,.75,.63,lens);
    }
    const roofT=us?.75:cn?.75:ru?.74:ind?.61:.65;
    // Hatches, rotating commander optic, gunner optic and roof weapon silhouette.
    lid(t,-.55,roofT,-.60,.32,c);lid(t,-.43,roofT,.59,.34,c);
    if(us){
      t.cyl(.25,.21,.57,roofT+.12,-.66,c,'y',.23,24);t.box(.32,.30,.34,.58,roofT+.35,-.66,c);t.box(.025,.16,.23,.755,roofT+.36,-.66,lens);
      t.box(.48,.31,.43,.76,roofT+.10,.45,c);t.box(.025,.13,.30,1.01,roofT+.12,.45,lens);
    }else{
      t.box(.36,.27,.40,.45,roofT+.09,-.60,c);t.box(.024,.14,.29,.644,roofT+.11,-.60,lens);
      t.cyl(.17,.32,-.72,roofT+.18,-.9,c);t.box(.27,.19,.25,-.72,roofT+.4,-.9,c);t.box(.02,.11,.17,-.575,roofT+.41,-.9,lens);
      if(cn){t.box(.28,.20,.33,-.69,roofT+.19,.99,c);t.cyl(.08,.05,-.52,roofT+.22,.99,lens,'x');}
    }
    if(us){
      t.cyl(.20,.17,-.48,roofT+.14,.59,c);t.box(.20,.26,.22,-.48,roofT+.32,.59,c);
      t.box(.46,.19,.25,-.25,roofT+.53,.59,metal);t.cyl(.028,.93,.40,roofT+.53,.59,metal,'x',.028,12);
      t.box(.24,.26,.26,-.31,roofT+.49,.88,c);t.box(.018,.13,.16,-.18,roofT+.51,.88,lens);
      t.box(.26,.23,.21,-.43,roofT+.43,.30,c);
    }else{t.cyl(.085,.30,-.48,roofT+.23,.59,metal);t.box(.42,.11,.14,-.17,roofT+.44,.59,metal);t.cyl(.025,.79,.42,roofT+.44,.59,metal,'x',.025,10);t.box(.18,.20,.24,-.30,roofT+.31,.77,c);}
    for(const s of [-1,1]){
      const count=cn?6:us?6:ru?6:ind?6:6;
      for(let j=0;j<count;j++){
        let x=(cn?-.3:us?.0:-.45)+(j%3)*.18,y=.31+Math.floor(j/3)*.17;
        t.cyl(.052,.23,x,y,s*(us?1.5:1.36),c,'z',.052,12);
        t.cyl(.041,.012,x,y,s*(us?1.624:1.484),metal,'z',.041,12);
      }
      beam(t,[-1.45,roofT,s*.93],[-1.48,roofT+1.48,s*.93],.009,metal);
      t.cyl(.045,.14,-1.45,roofT+.07,s*.93,metal);
    }
    // Bustle rail and mesh, especially visible on M1A2/T-90M rear views.
    if(us||ru||cn){
      const back=us?-2.60:ru?-2.32:-2.16,span=us?1.47:1.25;
      for(const y of [.16,.66])beam(t,[back,y,-span],[back,y,span],.024,metal);
      for(let i=0;i<12;i++){const z=-span+i*span*2/11;beam(t,[back,.16,z],[back,.66,z],.012,metal);}
      for(const s of [-1,1]){beam(t,[back,.66,s*span],[-1.7,.66,s*span],.024,metal);t.box(.42,.28,.33,back+.2,.28,s*.77,c);}
      if(us)for(const z of [-.86,0,.82]){t.sphere(.26,back+.23,.49,z,0x8f8569,[1,.7,1.1]);t.box(.055,.30,.43,back+.28,.43,z,0x605e4d);}
    }
    // Barrel jacket and a single fume extractor, without repeated oversized rings.
    if(!ko)t.box(.46,.35,.49,1.60,.29,0,c,[0,0,0],paint);
    const start=ko?2.02:1.65,end=1.65+d.barrel,axis=ko?.43:.30;
    t.cyl(.108,end-start,(start+end)/2,axis,0,c,'x',.080,32);
    t.cyl(.16,.43,start+1.55,axis,0,c,'x',.16,32);
    for(const x of [start+.12,start+.8,start+1.33,start+1.79,start+3.3])t.cyl(.116,.035,x,axis,0,metal,'x',.116,24);
    t.cyl(.093,.15,end-.04,axis,0,metal,'x',.093,32);t.cyl(.062,.002,end+.037,axis,0,0x090c0c,'x',.062,24);
    t.box(.16,.13,.12,end-.30,axis+.11,0,c);
    const group=new T.Group(),hull=b.finish(),turret=t.finish();hull.name='hull';turret.name='turret';turret.position.set(-.15,d.ring,0);group.add(hull,turret);const muzzle=new T.Object3D();muzzle.name='muzzle';muzzle.position.set(end+.038,axis,0);turret.add(muzzle);
    const references={chn:'https://www.mod.gov.cn/gfbw/jmsd/4806118.html',usa:'https://www.dvidshub.net/image/5852204/abram-tank-operations',rus:'https://warfiles.ru/231820-novejshaja-versija-tanka-t-90m-obzavelas-vydvizhnoj-sistemoj-nabljudenija.html',ind:'https://sputniknews.in/20250407/indian-army-to-procure-anti-drone-systems-for-t-72-and-t-90-tanks-8956117.html',kor:'https://www.hyundai-rotem.co.kr/en/business/defense/details.do?productCt03=defense0101'};
    group.userData={scale:6.6,parts:b.parts+t.parts,profile:d.name,evidenceStatus:'photo-referenced',reviewStage:'silhouette-rebuilt',referenceUrl:references[f],sourceReview:'docs/reviews/ground-reference-review.md'};
    return group;
  }
  for(const f of Object.keys(defs))M.register('tank',f,()=>build(f));
})();
