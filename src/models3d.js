/* Original exterior art. Model units describe proportions, not manufacturing dimensions.
 * Shared merged geometry: one draw per animated assembly, independent of simulation. */
(function (root) {
  'use strict';
  const T = root.THREE, cache = new Map(), builders = new Map();
  const colors = {chn:0x657052,usa:0xb5a17b,rus:0x536047,ind:0x8b805a,kor:0x59664b,imp:0x66717c};
  const rubber=0x242724, steel=0x454a43, glass=0x254c5c, dark=0x2a302b;
  function material() {
    const m = new T.MeshStandardMaterial({vertexColors:true,metalness:0.16,roughness:0.82});
    m.userData.camo = {value:1};
    m.onBeforeCompile = s => {
      s.uniforms.camoAmount=m.userData.camo;
      s.vertexShader='attribute float paint; attribute float surface; varying float vSurface; varying float vPaint; varying vec3 vLocal;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaint=paint; vSurface=surface; vLocal=position;');
      s.fragmentShader='uniform float camoAmount; varying float vSurface; varying float vPaint; varying vec3 vLocal;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 cell=floor(vLocal*3.8); float grain=fract(sin(dot(cell,vec3(12.9898,78.233,39.425)))*43758.5453);
        float macro=sin(floor(vLocal.x*2.0)*1.7+sin(floor(vLocal.z*2.0)*1.2)+floor(vLocal.y*2.0)*1.5);
        float camoPatch=mix(1.0,mix(0.47,1.17,step(-0.12,macro)),min(vPaint,1.0)*step(vPaint,1.5)*camoAmount*.75);
        diffuseColor.rgb*=camoPatch*(.96+grain*.08);
        if(vPaint>1.5){
          vec2 tile=floor(vec2(vLocal.x+vLocal.y*.65,vLocal.z+vLocal.y*.7)*5.0);
          float broad=sin(floor(tile.x*.24)*2.3+sin(floor(tile.y*.24)*2.1));
          float speck=fract(sin(dot(tile,vec2(127.1,311.7)))*43758.5453);
          float patchTone=broad+speck*.65;
          vec3 base=diffuseColor.rgb;
          if(vPaint<2.5){base=mix(vec3(.115,.148,.103),vec3(.32,.30,.23),step(.15,patchTone));base=mix(base,vec3(.042,.055,.046),step(1.0,patchTone));}
          else if(vPaint<3.5){base=diffuseColor.rgb*1.10;}
          else if(vPaint<4.5){base=diffuseColor.rgb*1.12;}
          else if(vPaint<5.5){base=mix(vec3(.16,.19,.11),vec3(.29,.23,.13),step(.3,patchTone));}
          else{float organic=sin(vLocal.x*2.2+sin(vLocal.z*2.7+vLocal.y*2.0))+cos(vLocal.z*2.5+vLocal.y*2.8);base=mix(vec3(.115,.15,.09),vec3(.28,.25,.17),smoothstep(.25,.32,organic));base=mix(base,vec3(.035,.043,.031),smoothstep(1.15,1.21,organic));}
          diffuseColor.rgb=mix(diffuseColor.rgb,base,camoAmount)*(.96+grain*.08);
        }
        float dust=(1.0-smoothstep(.15,1.15,vLocal.y))*.16;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.26,.23,.16),dust);
      `);
      s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        if(vSurface>.5&&vSurface<1.5)roughnessFactor=.20;
        else if(vSurface>1.5&&vSurface<2.5)roughnessFactor=.48;
        else roughnessFactor=.81+fract(sin(dot(floor(vLocal*24.0),vec3(13.7,53.1,17.3)))*16345.3)*.10;`);
      s.fragmentShader=s.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
        metalnessFactor=vSurface>1.5&&vSurface<2.5?.63:.08;`);
    };
    return m;
  }
  const mat=material();
  // Builder merges colored triangles. Components remain documented in metadata.
  class Builder {
    constructor(){this.p=[];this.n=[];this.c=[];this.paint=[];this.surface=[];this.parts=0;this.motionPrimitives=[];}
    add(geo,color,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1],paint=0){
      const original=geo;this.motionPrimitives.push({start:this.p.length/3,count:geo.index?.count||geo.attributes.position.count,type:geo.type,params:Object.fromEntries(Object.entries(geo.parameters||{}).filter(([k,v])=>typeof v==='number')),pos:pos.slice(),rot:rot.slice()}); if(geo.index)geo=geo.toNonIndexed();
      const matrix=new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(...scale));
      geo.applyMatrix4(matrix); const c=new T.Color(color);
      const finish=[0x233b42,0x344b53,0x254c5c,0x263c43,0x314847,0x3b4c49].includes(color)?1:[0x454a43,0x41423d,0x444b4c,0x60656a,0x939796].includes(color)?2:0;
      this.p.push(...geo.attributes.position.array);this.n.push(...geo.attributes.normal.array);
      for(let i=0;i<geo.attributes.position.count;i++){this.c.push(c.r,c.g,c.b);this.paint.push(paint);this.surface.push(finish);}
      this.parts++;geo.dispose();if(geo!==original)original.dispose();
    }
    box(w,h,d,x,y,z,c,rot=[0,0,0],paint=0){this.add(new T.BoxGeometry(w,h,d),c,[x,y,z],rot,[1,1,1],paint);}
    cyl(r,len,x,y,z,c,axis='y',r2=r,segments=16){this.add(new T.CylinderGeometry(r2,r,len,segments),c,[x,y,z],axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,-Math.PI/2]:[0,0,0]);}
    sphere(r,x,y,z,c,scale=[1,1,1]){this.add(new T.SphereGeometry(r,12,8),c,[x,y,z],[0,0,0],scale);}
    // An arbitrary convex plan with an independently inset top gives sloped armor panels.
    prism(points,y,h,c,inset=.8,paint=1){
      const p=[], count=points.length; const v=(i,top)=>[points[i][0]*(top?inset:1),y+(top?h:0),points[i][1]*(top?inset:1)];
      for(let i=0;i<count;i++){let j=(i+1)%count;p.push(...v(i,0),...v(i,1),...v(j,1),...v(i,0),...v(j,1),...v(j,0));}
      for(let i=1;i<count-1;i++)p.push(...v(0,1),...v(i+1,1),...v(i,1),...v(0,0),...v(i,0),...v(i+1,0));
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();
      this.add(g,c,[0,0,0],[0,0,0],[1,1,1],paint);
    }
    finish(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.n,3));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.setAttribute('paint',new T.Float32BufferAttribute(this.paint,1));g.setAttribute('surface',new T.Float32BufferAttribute(this.surface,1));g.computeBoundingSphere();const mesh=new T.Mesh(g,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.parts=this.parts;mesh.userData.motionPrimitives=this.motionPrimitives;return mesh;}
  }
  function wheel(b,x,z,r=.49,c=colors.chn){
    b.cyl(r,.36,x,.65,z,rubber,'z');
    const sign=Math.sign(z);b.cyl(r*.77,.07,x,.65,z+sign*.21,c,'z');
    b.cyl(r*.23,.1,x,.65,z+sign*.27,steel,'z');
    for(let a=0;a<6;a++){let t=a*Math.PI/3;b.cyl(.037,.028,x+Math.cos(t)*r*.48,.65+Math.sin(t)*r*.48,z+sign*.256,steel,'z',.037,6);}
  }
  function tracks(b,length,c,wheels=6){
    for(const side of [-1,1]){
      let z=side*1.52,half=length/2-.65;
      for(let i=0;i<wheels;i++)wheel(b,-half+i*2*half/(wheels-1),z,.49,c);
      for(const x of [-half-.4,half+.4]){b.cyl(.48,.45,x,.72,z,steel,'z');b.cyl(.22,.52,x,.72,z,c,'z');}
      // Individually articulated track shoes following a continuous capsule loop.
      const a=half+.4,r=.59,straight=4*a,perimeter=straight+2*Math.PI*r,n=100;
      for(let i=0;i<n;i++){
        let t=i/n*perimeter,x,y,angle;
        if(t<2*a){x=-a+t;y=.72+r;angle=0;}
        else if(t<2*a+Math.PI*r){let q=(t-2*a)/r;x=a+Math.sin(q)*r;y=.72+Math.cos(q)*r;angle=-q;}
        else if(t<4*a+Math.PI*r){x=a-(t-2*a-Math.PI*r);y=.72-r;angle=Math.PI;}
        else {let q=(t-4*a-Math.PI*r)/r;x=-a-Math.sin(q)*r;y=.72-Math.cos(q)*r;angle=Math.PI-q;}
        b.box(perimeter/n*.88,.10,.65,x,y,z,steel,[0,0,angle]);
        b.box(perimeter/n*.62,.025,.42,x,y+.065,z,rubber,[0,0,angle]);
      }
    }
  }
  function tank(f='chn',kind='tank'){
    const c=colors[f],usa=f==='usa',round=f==='rus'||f==='ind',korea=f==='kor',fantasy=f==='imp';
    const b=new Builder(),t=new Builder(),L=usa?7.9:round?6.9:7.4;
    tracks(b,L,c,usa?7:6);
    b.prism([[-L/2,-1.36],[L/2-.4,-1.36],[L/2,0],[L/2-.4,1.36],[-L/2,1.36]],.55,.65,c,.94);
    b.prism([[-L/2,-1.65],[L/2-.6,-1.65],[L/2, -.95],[L/2,.95],[L/2-.6,1.65],[-L/2,1.65]],1.2,.5,c,.84);
    // Engine deck, exhaust louvers, towing eyes and mudguards.
    for(let i=0;i<13;i++)b.box(.075,.035,2.0,-L/2+.25+i*.10,1.72,0,dark);
    for(const side of [-1,1]){
      for(let i=0;i<7;i++){
        b.box(.83,.58,.09,-2.95+i*.94,1.23,side*1.86,c,[0,0,0],1);
        b.box(.74,.06,.13,-2.95+i*.94,1.54,side*1.86,steel);
        for(const dx of [-.30,.30])b.sphere(.032,-2.95+i*.94+dx,1.43,side*1.92,steel);
      }
      b.box(.65,.15,.69,L/2-.2,1.44,side*1.52,c,[0,0,-.22],1);
      b.box(.14,.20,.30,L/2+.05,1.46,side*1.18,dark);
      b.box(.025,.13,.22,L/2+.13,1.46,side*1.18,0xd8debb);
      b.cyl(.1,.18,L/2-.1,.76,side*.9,steel,'z');
      b.box(.18,.4,.57,-L/2-.03,.73,side*1.5,rubber);
    }
    b.box(.55,.07,.65,2.35,1.72,-.1,c,[0,0,0],1);
    b.box(.2,.09,.32,2.58,1.81,-.1,glass);
    b.cyl(1.13,.16,-.1,1.78,0,steel);
    const ty=1.86;
    let outline=usa?[[-2.25,-1.45],[.3,-1.55],[2.15,-1.05],[2.35,-.45],[2.35,.45],[2.15,1.05],[.3,1.55],[-2.25,1.45]]:
      round?[[-1.85,-1.25],[.1,-1.48],[1.72,-.9],[1.95,-.35],[1.95,.35],[1.72,.9],[.1,1.48],[-1.85,1.25]]:
      [[-1.8,-1.27],[-.1,-1.48],[2.05,-.85],[2.35,-.35],[2.35,.35],[2.05,.85],[-.1,1.48],[-1.8,1.27]];
    if(round)t.sphere(1,0,.28,0,c,[1.62,.5,1.25]);
    t.prism(outline,0,korea?.65:usa?.88:.78,c,usa?.78:.72);
    // 99A/T-90 distinct modular cheeks; Abrams retains large continuous wedges.
    if(!usa)for(const side of [-1,1])for(let i=0;i<4;i++){
      t.box(.48,.36,.42,.35+i*.43,.30,side*(1.13-i*.15),c,[0,side*.31,-.32],1);
      t.box(.43,.04,.38,.35+i*.43,.53,side*(1.13-i*.15),steel,[0,side*.31,-.32]);
    }
    if(usa||f==='rus'){
      for(let i=0;i<6;i++)t.box(.045,.55,.045,-2.27,.55,-1.34+i*.54,steel);
      t.box(.065,.055,2.75,-2.27,.82,0,steel);
      for(const side of [-1,1]){t.box(1.15,.055,.045,-1.8,.82,side*1.35,steel);t.box(.8,.35,.45,-1.83,.18,side*.7,c);}
    }
    for(const side of [-1,1]){
      t.cyl(.37,.07,-.2,.86,side*.65,c);
      t.cyl(.23,.06,-.2,.9,side*.65,steel);
      for(let j=0;j<4;j++)t.cyl(.07,.28,-.45+j*.19,.51,side*1.48,steel,'z');
      t.cyl(.015,1.75,-1.25,1.55,side*.94,steel,'y',.006,5);
    }
    t.box(.37,.35,.38,.62,.94,-.57,c);t.box(.025,.15,.26,.82,.97,-.57,glass);
    t.cyl(.23,.37,-.5,1.04,.63,c);t.box(.35,.11,.13,-.15,1.28,.63,steel);t.cyl(.025,.63,.24,1.28,.63,steel,'x',.025,8);
    t.box(.55,.48,.65,1.61,.3,0,c,[0,0,0],1);
    t.cyl(.12,4.4,3.78,.36,0,c,'x');t.cyl(.18,.62,3.08,.36,0,c,'x');
    for(let i=0;i<7;i++)t.cyl(.134,.045,1.9+i*.51,.36,0,steel,'x');
    t.cyl(.135,.13,6.02,.36,0,steel,'x');t.cyl(.09,.009,6.09,.36,0,0x101411,'x');
    if(fantasy){t.box(2,1.5,2,-1,1,0,c);for(const s of [-1,1])t.cyl(.23,2.3,2.1,.3,s*.65,steel,'x');}
    const group=new T.Group();group.add(b.finish());let turret=t.finish();turret.name='turret';turret.position.y=ty;group.add(turret);
    group.userData={scale:6.6,kind,parts:b.parts+t.parts};return group;
  }
  function vehicle(f,kind){
    if(kind==='tank')return tank(f);
    const b=new Builder(),t=new Builder(),c=colors[f],truck=kind==='rocket'||kind==='asat'||kind==='harvester';
    if(truck){
      b.box(7,.35,2.3,0,.75,0,steel);
      for(const side of [-1,1])for(const x of [-2.7,-1.6,1.5,2.6])wheel(b,x,side*1.25,.55,c);
      b.box(2,1.4,2.4,2.2,1.65,0,c,[0,0,0],1);b.box(.04,.55,1.9,3.22,1.9,0,glass);
      for(const side of [-1,1])b.box(.8,.55,.04,2.5,1.9,side*1.22,glass);
      if(kind==='harvester'){t.box(4,1.5,2.5,-1,.9,0,0x9c8b57);t.box(3.5,.06,2,-1,1.68,0,0x3e4540);for(let j=0;j<6;j++)t.box(.12,1.55,2.57,-2.7+j*.64,.9,0,c);b.box(.6,.7,3.2,3.6,.7,0,0x8c8b68);}
      else for(let i=0;i<2;i++)for(let j=0;j<3;j++)t.box(4.3,.55,.55,-.6,1+i*.58,(j-1)*.6,c,[0,0,.15],1);
    }else{
      tracks(b,6.5,c,6);b.prism([[-3.4,-1.4],[2.5,-1.4],[3.4,-.9],[3.4,.9],[2.5,1.4],[-3.4,1.4]],.65,1.25,c,.8);
      for(let i=0;i<6;i++)for(const s of [-1,1])b.box(.93,.55,.10,-2.6+i*.97,1.3,s*1.85,c,[0,0,0],1);
      if(kind==='arty'){t.box(2.8,1.4,2.5,-.6,.7,0,c,[0,0,0],1);t.cyl(.15,5.5,2.6,.7,0,c,'x');t.box(.36,.28,.3,5.4,.7,0,steel);}
      else if(kind==='aa'){t.box(2,.65,1.8,0,.4,0,c);for(const s of [-1,1])for(let i=0;i<4;i++)t.box(2.4,.3,.3,0,.75+i*.32,s*1.05,c,[0,0,-.24]);t.box(.1,1.1,1.5,-.5,1.9,0,dark,[0,0,.2]);}
      else {t.prism([[-.9,-.8],[.9,-.55],[.9,.55],[-.9,.8]],0,.65,c,.7);t.cyl(.075,2.5,1.5,.35,0,steel,'x');t.box(.6,.25,.4,-.5,.85,0,c);}
    }
    const g=new T.Group();g.add(b.finish());const turret=t.finish();turret.name='turret';turret.position.y=truck?1.4:1.9;g.add(turret);g.userData={scale:6.4,parts:b.parts+t.parts};
    // Legacy exteriors expose closed canister faces, not newly invented apertures.
    let face,normal=[1,0,0],source,family='cannon';
    if(kind==='rocket'||kind==='asat'){const angle=.15;normal=[Math.cos(angle),Math.sin(angle),0];face=[-.6+4.3/2*normal[0],1+.58+4.3/2*normal[1],0];source='legacy-closed-canister-front-face';family='rocket';}
    else if(kind==='aa'){const angle=-.24;normal=[Math.cos(angle),Math.sin(angle),0];face=[2.4/2*normal[0],.75+3*.32+2.4/2*normal[1],1.05];source='legacy-closed-aa-canister-front-face';family='missile';}
    else if(kind==='arty'){face=[5.4+.36/2,.7,0];source='legacy-primary-muzzle-brake-front';}
    else if(kind==='ifv'){face=[1.5+2.5/2,.35,0];source='legacy-primary-barrel-front';family='autocannon';}
    if(face){const a=new T.Object3D();a.name='muzzle';a.position.set(...face).addScaledVector(new T.Vector3(...normal),.012);a.userData={source,face:face.slice(),outward:normal.slice(),artOffset:.012};turret.add(a);g.userData.muzzleSource=source;g.userData.muzzleFamily=family;}
    if(kind==='rocket'){
      const faces=[];for(let row=0;row<2;row++)for(let col=0;col<3;col++)faces.push([-.6+4.3/2*normal[0],1+row*.58+4.3/2*normal[1],(col-1)*.6]);
      faces.sort((a,b)=>Math.hypot(...a.map((v,i)=>v-face[i]))-Math.hypot(...b.map((v,i)=>v-face[i])));
      g.userData.firePorts=faces.map((p,i)=>{const a=new T.Object3D();a.name='muzzle_'+i;a.position.set(...p).addScaledVector(new T.Vector3(...normal),.012);a.userData={source,face:p.slice(),outward:normal.slice(),artOffset:.012};turret.add(a);return{node:a.name,parent:'turret',position:a.position.toArray(),direction:normal.slice()};});
    }
    return g;
  }
  function aircraft(f,kind){
    const b=new Builder(),r=new Builder(),c=kind==='jet'?0x414b52:f==='chn'?0x7c888a:0x8c9497;
    if(kind==='heli'){
      b.sphere(1,0,.1,0,colors[f],[2.5,.75,.7]);b.sphere(.7,1.1,.35,0,glass,[1.4,.7,.85]);
      b.cyl(.2,3.3,-3,.15,0,colors[f],'x',.08);b.box(.7,1.2,.12,-4.4,.5,0,colors[f]);
      for(const s of [-1,1]){b.box(1,.16,2,.1,0,s*1.3,colors[f]);b.cyl(.2,1.3,.4,-.1,s*1.8,steel,'x');b.cyl(.12,3,0,-.8,s*.65,steel,'x');}
      b.cyl(.1,.6,0,1,0,steel);for(let i=0;i<4;i++)r.box(5.7,.035,.19,1.8,0,0,dark,[0,i*Math.PI/2,0]);
      const g=new T.Group();g.add(b.finish());const rotor=r.finish();rotor.name='rotor';rotor.position.y=1.3;g.add(rotor);g.userData={scale:8,parts:b.parts+r.parts};return g;
    }
    const concept=kind==='jet'||f==='imp',j20=f==='chn'&&!concept,rafale=f==='ind'&&!concept,su=f==='rus'&&!concept;
    const length=concept?({chn:13,usa:10.2,rus:14.2,ind:9.3,kor:10.8,imp:12}[f]):j20?11.5:su?10.9:8.8,twin=j20||rafale||su||concept;
    b.prism([[-length*.45,-.7],[length*.15,-.92],[length*.55,0],[length*.15,.92],[-length*.45,.7]],-.2,.65,c,.77,0);
    b.sphere(.55,length*.20,.47,0,glass,[1.85,.6,.65]);
    for(const side of [-1,1]){
      const conceptPlans={chn:[[-5.6,.7],[-3.3,6.5],[3.6,1.7],[5.7,.6]],usa:[[-4,.6],[-3.6,4.7],[-1.8,5.1],[3,.7]],rus:[[-5.9,.6],[-4.1,4.7],[-1.6,5.2],[4.8,.6]],ind:[[-3.8,.6],[-2.9,4.3],[2.7,.7]],kor:[[-4.6,.6],[-3.7,4.8],[-2.2,5.0],[3.5,.65]],imp:[[-5,.6],[-5.1,5.6],[.5,4.3],[3.9,.6]]};
      const wing=concept?conceptPlans[f].map(([x,z])=>[x,side*z]):
        j20?[[-4.3,side*.65],[-4.2,side*4.2],[-2.6,side*4.8],[1.4,side*.75]]:
        rafale?[[-3.6,side*.6],[-3.1,side*4.3],[2,side*.65]]:
        [[-2.7,side*.7],[-2.5,side*4.2],[-1.1,side*4.3],[1.8,side*.7]];
      if(side<0)wing.reverse();b.prism(wing,0,.09,c,1,0);
      if(j20||rafale){let p=[[1.8,side*.7],[1.5,side*2],[2.4,side*2.15],[3.3,side*.65]];if(side<0)p.reverse();b.prism(p,.1,.075,c,1,0);}
      if(concept&&(f==='usa'||f==='ind')){let p=[[2.3,side*.6],[1.8,side*1.9],[2.5,side*2.1],[3.8,side*.6]];if(side<0)p.reverse();b.prism(p,.13,.06,c,1,0);}
      if(!concept&&!rafale){
        let fin=new T.BufferGeometry(),points=[-4,.1,side*.85,-3.8,1.8,side*1.55,-2.6,1.95,side*1.65,-2,.1,side*.85];fin.setAttribute('position',new T.Float32BufferAttribute(points,3));fin.setIndex([0,1,2,0,2,3,2,1,0,3,2,0]);fin.computeVertexNormals();b.add(fin,c);
        if(!j20){let p=[[-4.5,side*.6],[-4.2,side*2.6],[-3.2,side*2.8],[-2.3,side*.8]];if(side<0)p.reverse();b.prism(p,.02,.08,c,1,0);}
      }
      b.box(.8,.4,.35,1.3,-.1,side*.85,dark,[0,side*.1,0]);
    }
    if(rafale){b.box(1.5,1.6,.08,-3.2,.8,0,c,[0,0,-.2]);}
    for(const z of concept&&f==='chn'?[-.65,0,.65]:twin?[-.5,.5]:[0]){b.cyl(twin?.34:.46,1,-length*.43,-.02,z,steel,'x');b.cyl(twin?.27:.39,.01,-length*.49,-.02,z,0x131a21,'x');}
    const g=new T.Group();g.add(b.finish());g.userData={scale:7.4,parts:b.parts,profile:concept?'concept':j20?'J-20':rafale?'Rafale':su?'Su-57':'F-35A'};return g;
  }
  function ship(f,kind){
    const b=new Builder(),c=0x7f8b8e,carrier=kind==='carrier',sub=kind==='submarine';
    if(sub){b.sphere(1,0,0,0,0x344247,[10,1,1.2]);b.box(2,1.5,.8,-1,1,0,0x344247);b.box(1,.15,4,-6,.1,0,steel);}
    else{
      const w=carrier?3.5:1.65,L=carrier?15:12;
      b.prism([[-L,-w],[L*.6,-w],[L,0],[L*.6,w],[-L,w]],-.6,1.5,c,.95,0);
      b.prism([[-L,-w*.96],[L*.6,-w*.96],[L*.97,0],[L*.6,w*.96],[-L,w*.96]],.91,.06,0x444f51,1,0);
      if(carrier){b.box(5,2.4,1.3,-2,2,-2.5,c);b.box(24,.04,.08,0,1.02,0,0xd6d4b9);for(let i=0;i<6;i++)b.box(.7,.03,2.2,-9+i*1.5,1.02,1.3,0xd6d4b9);}
      else{
        b.prism([[-3,-1.3],[4,-1.3],[4,1.3],[-3,1.3]],1,2,c,.69,0);
        b.box(2.2,.35,2.0,2.3,2.8,0,glass);b.box(3,1.5,2.6,-7,1.6,0,c);
        for(let i=0;i<4;i++)for(let j=0;j<4;j++)b.box(.42,.04,.43,5+i*.49,1.05,(j-1.5)*.49,steel);
        b.cyl(.7,.5,9,1.2,0,c);b.cyl(.09,2.1,10.2,1.5,0,c,'x');
        b.prism([[-.7,-.7],[.7,-.7],[.7,.7],[-.7,.7]],3,2.1,c,.25,0);
        for(const side of [-1,1])b.box(1.6,.8,.035,.3,3.3,side*.8,0x4c585c);
        for(let i=0;i<4;i++)b.box(1.3,.08,.06,-10+i*.6,1.05,0,0xd8d7c9);
      }
      b.cyl(.06,3.2,0,4,0,steel);b.box(.08,.15,3.4,0,5.4,0,steel);
      for(const side of [-1,1])for(let i=0;i<20;i++){b.cyl(.018,.3,-10+i*.95,1.12,side*w*.96,c,'y',.018,4);}
    }
    const g=new T.Group();g.add(b.finish());g.userData={scale:5.4,parts:b.parts};
    if(!carrier){const a=new T.Object3D();a.name='muzzle';a.position.set(sub?10.012:10.2+2.1/2+.012,sub?0:1.5,0);a.userData={source:sub?'approximate-forward-hull-exit':'legacy-existing-forward-gun-barrel',outward:[1,0,0],...(!sub?{motionJointRole:'turret'}:{})};g.add(a);g.userData.muzzleSource=a.userData.source;g.userData.muzzleFamily=sub?'torpedo':'navalGun';}
    return g;
  }
  function other(kind,f){
    const b=new Builder(),c=colors[f]||0x777c6b;
    if(kind==='infantry')for(const [x,z] of [[0,0],[-1.1,-1],[-1.1,1]]){
      b.box(.42,.55,.6,x,.9,z,c);b.sphere(.24,x,1.45,z,c,[1,.85,1]);
      for(const s of [-1,1]){b.box(.18,.55,.2,x, .3,z+s*.19,dark);b.box(.45,.16,.15,x+.22,1,z+s*.35,c,[0,0,-.35]);}
      b.box(.85,.09,.10,x+.48,1,z+.25,steel);
    } else if(kind==='satellite'||kind==='orbital'){
      b.box(2,1.4,1.3,0,0,0,0xb3ac89);
      for(const s of [-1,1]){b.box(.15,.15,6,0,0,s*3,steel);b.box(4,.08,4.4,0,0,s*3.4,0x214666);for(let i=0;i<8;i++)b.box(.02,.01,4.4,-1.8+i*.5,.06,s*3.4,0x829ba8);}
      b.cyl(.8,.13,1.3,0,0,0xc8c5b0,'x');if(kind==='orbital')b.cyl(.25,5,0,-1,0,steel,'x');
    } else {
      const def=root.WarData?.B[kind],rr=(def?.r||36)/7;
      b.box(rr*2,.4,rr*2,0,0,0,0x747b71);
      if(['turret','laser','ciws','sam','shield','jammer','asat'].includes(kind)){
        b.cyl(rr*.7,1.1,0,.7,0,0x7b8272);b.box(2.5,1.5,2,0,1.7,0,c);
        if(kind==='sam')for(let s of [-1,1])for(let i=0;i<3;i++)b.box(3,.4,.4,0,2+i*.45,s*1.3,c,[0,0,-.4]);
        else if(kind==='shield'||kind==='jammer'){b.cyl(.12,5,0,3,0,steel);b.sphere(.8,0,5.6,0,glass);}
        else {b.cyl(kind==='laser'?.24:.15,3,2,2,0,steel,'x');b.box(.6,.5,.6,-.6,2.8,0,glass);}
      }else if(kind==='power'||kind==='refinery'){
        b.box(rr*1.4,2.2,rr*1.4,0,1.3,0,0x747d71);for(const s of [-1,1])b.cyl(rr*.38,3.8,s*rr*.55,2,0,0x9b9e8f);
        b.box(rr*1.5,.2,.25,0,3.6,rr*.6,steel);
      }else if(kind==='radar'||kind==='spaceport'){
        b.box(rr*1.5,1.8,rr*1.5,0,1,0,0x6a786e);b.cyl(.14,5,0,3,0,steel);b.sphere(2,0,5,0,0xc3c5b0,[1,.38,1]);
      }else {
        b.box(rr*1.65,kind==='hq'?3:2,rr*1.55,0,1.4,0,0x7c8377);
        b.box(rr*1.72,.22,rr*1.65,0,kind==='hq'?3:2.5,0,0x4a5a53);
        for(let i=0;i<5;i++)b.box(rr*.23,.65,.06,-rr*.65+i*rr*.32,1.8,rr*.79,glass);
        b.box(rr*.7,1.6,.06,0,1.1,-rr*.79,steel);
        for(let i=0;i<7;i++)b.box(rr*1.75,.1,.12,0,kind==='hq'?3.16:2.65,-rr*.7+i*rr*.23,0x68766d);
        if(kind==='hq'){b.box(2.3,1.6,2.6,-1,3.8,0,c);b.cyl(.04,4,1,4.4,1,steel);b.box(.03,.8,1.4,1,6,1.7,colors[f]);}
        if(kind==='navalyard'){for(const s of [-1,1]){b.box(.5,9,.5,s*rr*.8,4,0,0xb3a06a);}b.box(rr*1.7,.5,.5,0,8.5,0,0xb3a06a);}
        if(kind==='airfield')for(let i=0;i<6;i++)b.box(.5,.04,2,rr+1+i,0,0,0xd1d0b8);
        if(kind==='repairhub'){b.box(2,.05,.5,0,2.82,0,0xd0d4c8);b.box(.5,.05,2,0,2.83,0,0xd0d4c8);}
      }
    }
    const g=new T.Group();g.add(b.finish());g.userData={scale:kind==='infantry'?5:7,parts:b.parts};return g;
  }
  function create(kind,f='chn'){
    const key=kind+'_'+f;
    if(!cache.has(key)){
      let g=builders.has(key)?builders.get(key)():['tank','ifv','arty','rocket','aa','asat','harvester'].includes(kind)?vehicle(f,kind):['fighter','jet','heli'].includes(kind)?aircraft(f,kind):['destroyer','carrier','submarine'].includes(kind)?ship(f,kind):other(kind,f);
      g.userData.kind=kind;g.userData.faction=f;root.WarAirRig?.attach(g,kind,f);root.WarNavalRig?.attach(g,kind,f);root.WarGroundRig?.attach(g,kind,f);g.traverse(o=>{delete o.userData.motionPrimitives;});cache.set(key,g);
    }
    return cache.get(key).clone(true);
  }
  function register(kind,faction,builder){builders.set(kind+'_'+faction,builder);cache.delete(kind+'_'+faction);}
  root.WarModels={create,register,Builder,material:mat,createMaterial:material,cache,colors,steel,rubber,glass,dark,tracks,wheel};
})(globalThis);
