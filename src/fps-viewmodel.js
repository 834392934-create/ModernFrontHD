/* Original local first-person foreground art. No extracted game assets.
 * Main world renders first, then WarFPSView.render(mainCamera).
 * Coordinates are camera-local: forward -Z, hip weapon lower-right. */
(function(root){
  'use strict';const T=root.THREE;
  const COLORS={paint:0x485357,metal:0x78858a,rubber:0x22292b,cloth:0x4d5944,glass:0x7cbdcc,light:0xc6cbd0,orange:0xc18d49};
  const makeMaterial=(type)=>new T.MeshStandardMaterial({vertexColors:true,metalness:type==='metal'?.82:0.06,roughness:type==='metal'?.38:type==='rubber'?.94:type==='cloth'?.98:.66});
  class Batch{
    constructor(){this.bins=new Map();}
    add(geometry,type='paint',color=COLORS[type]||COLORS.paint,p=[0,0,0],r=[0,0,0],scale=[1,1,1]){const original=geometry,g=geometry.index?geometry.toNonIndexed():geometry,matrix=new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...r)),new T.Vector3(...scale));g.applyMatrix4(matrix);if(!this.bins.has(type))this.bins.set(type,{p:[],n:[],c:[]});const b=this.bins.get(type),c=new T.Color(color);b.p.push(...g.attributes.position.array);b.n.push(...g.attributes.normal.array);for(let i=0;i<g.attributes.position.count;i++)b.c.push(c.r,c.g,c.b);g.dispose();if(g!==original)original.dispose();}
    box(w,h,d,p,type='paint',color=COLORS[type]||COLORS.paint,r=[0,0,0]){const rad=Math.min(w,h,d)*.12;const geo=root.WarDetail&&Math.min(w,h,d)>.035?root.WarDetail.bevelBox(w,h,d,Math.min(rad,.008)):new T.BoxGeometry(w,h,d);this.add(geo,type,color,p,r);}
    rod(a,b,r,type='metal',color=COLORS[type]||COLORS.metal,segments=10){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),rot=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize()));this.add(new T.CylinderGeometry(r,r,d.length(),segments),type,color,av.add(bv).multiplyScalar(.5).toArray(),[rot.x,rot.y,rot.z]);}
    ball(p,scale,type='rubber',color=COLORS[type]||COLORS.rubber){this.add(new T.SphereGeometry(1,10,6),type,color,p,[0,0,0],scale);}
    build(group){for(const [type,b]of this.bins){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));g.setAttribute('color',new T.Float32BufferAttribute(b.c,3));g.computeBoundingSphere();const m=new T.Mesh(g,makeMaterial(type));m.name='fps-'+type;m.frustumCulled=false;group.add(m);}}
  }
  function grip(b,p,left,c){const [x,y,z]=p,s=left?-1:1;b.ball(p,[.045,.060,.037]);b.ball([x+s*.039,y+.018,z-.016],[.022,.038,.024]);for(let i=0;i<4;i++){const yy=y+.035-i*.023;const a=[x-s*.018,yy,z-.018],mid=[x-s*.043,yy-.005,z-.044],end=[x-s*.012,yy-.008,z-.064];b.rod(a,mid,.011,'rubber');b.rod(mid,end,.010,'rubber');b.ball(mid,[.013,.013,.013]);}
    const elbow=[x+s*.17,y-.24,z+.36],wrist=[x+s*.015,y-.055,z+.025];b.rod(elbow,wrist,.055,'cloth',c,12);b.rod([wrist[0],wrist[1]-.035,wrist[2]+.015],wrist,.060,'rubber');for(let i=0;i<3;i++)b.ball([elbow[0]*(1-i*.15)+wrist[0]*i*.15,elbow[1]+i*.035,elbow[2]-i*.045],[.055,.018,.055],'cloth',c);}
  // These silhouettes are original game props, with arbitrary art-space proportions.
  // Rings and recessed dark caps suggest openings without modelling functional internals.
  function shoulderLauncher(b,cloth){
    b.add(new T.CylinderGeometry(.105,.105,.72,16,1,true),'paint',0x69705a,[.13,.015,-.22],[Math.PI/2,0,0]);
    for(const z of [-.58,.14])b.add(new T.TorusGeometry(.105,.014,6,16),'rubber',COLORS.rubber,[.13,.015,z]);
    b.add(new T.CircleGeometry(.093,16),'rubber',0x12191a,[.13,.015,.085]);
    for(const z of [-.43,-.03])b.add(new T.TorusGeometry(.109,.012,6,16),'metal',0x71806f,[.13,.015,z]);
    b.box(.145,.065,.16,[.13,-.115,.045],'rubber');b.box(.055,.14,.065,[.11,-.14,-.03],'rubber');
    b.box(.12,.025,.20,[.035,.105,-.25],'paint');b.box(.025,.06,.14,[0,.13,-.25],'metal');
    for(const side of [-1,1])b.rod([side*.038,.15,-.25],[side*.038,.245,-.25],.006,'rubber');
    for(const y of [.15,.245])b.rod([-.038,y,-.25],[.038,y,-.25],.006,'rubber');
    b.box(.006,.022,.009,[0,.161,-.25],'metal');b.box(.075,.025,.045,[0,.11,.035],'paint');
    for(const side of [-1,1])b.box(.007,.04,.012,[side*.023,.14,.035],'metal');
    grip(b,[.16,-.14,-.005],false,cloth);grip(b,[.025,-.085,-.35],true,cloth);
    return{position:[.13,.015,-.66],direction:[0,0,-1]};
  }
  function mortarStation(b,cloth){
    const base=new T.Vector3(.15,-.35,-.13),top=new T.Vector3(.15,.06,-.20),axis=top.clone().sub(base).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),axis),e=new T.Euler().setFromQuaternion(q);
    b.add(new T.CylinderGeometry(.072,.072,base.distanceTo(top),14,1,true),'paint',0x64725b,base.clone().add(top).multiplyScalar(.5).toArray(),[e.x,e.y,e.z]);
    const ringEuler=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),axis));
    b.add(new T.TorusGeometry(.072,.012,6,14),'metal',COLORS.metal,top.toArray(),[ringEuler.x,ringEuler.y,ringEuler.z]);
    b.add(new T.CircleGeometry(.062,14),'rubber',0x12191a,top.clone().addScaledVector(axis,-.04).toArray(),[ringEuler.x,ringEuler.y,ringEuler.z]);
    b.box(.34,.035,.20,[.15,-.37,-.13],'rubber');b.rod([.15,-.14,-.16],[-.025,-.35,-.30],.015);b.rod([.15,-.14,-.16],[.32,-.35,-.30],.015);
    b.rod([.15,-.13,-.16],[-.11,-.13,-.16],.018);b.box(.085,.08,.065,[-.10,-.10,-.15],'paint');
    // Offset observation optic and adjustment grips keep the centre of the world visible.
    b.rod([-.10,-.065,-.15],[-.10,.105,-.15],.017);b.rod([-.10,.09,-.24],[-.10,.09,.015],.039,'rubber');
    b.add(new T.CircleGeometry(.029,12),'metal',0x547c82,[-.10,.09,.018]);
    b.rod([.21,-.17,-.12],[.29,-.17,-.12],.009);b.rod([.29,-.17,-.12],[.29,-.11,-.12],.012,'rubber');
    grip(b,[.285,-.11,-.10],false,cloth);grip(b,[-.14,-.09,-.09],true,cloth);
    return{position:top.clone().addScaledVector(axis,.08).toArray(),direction:axis.toArray()};
  }
  // Separate family silhouettes, with a removable magazine/canister for reload feedback.
  function operatorProp(b,weapon,cloth,parent){
    const p=weapon.profile,f=weapon.category,c=weapon.color,L=p.barrelLength*p.lengthScale;
    const part=new T.Group();part.name='operator-reload-part';parent.add(part);const m=new Batch();
    let muzzle=[0,.018,-L-.07];
    if(f==='launcher'){
      b.add(new T.CylinderGeometry(.115,.115,L,18,1,true),'paint',c,[.075,.055,-L*.5],[Math.PI/2,0,0]);
      for(const z of [0,-L])b.add(new T.TorusGeometry(.115,.016,6,18),'metal',COLORS.metal,[.075,.055,z]);
      b.add(new T.CircleGeometry(.10,18),'rubber',0x10181c,[.075,.055,-L+.035]);
      b.box(.11,.12,.22,[.075,-.07,.0],'rubber');b.box(.055,.15,.055,[.06,-.13,-.15],'rubber');
      b.box(.065,.15,.13,[-.07,.12,-L*.45],'paint',c);b.box(.025,.08,.08,[-.115,.145,-L*.45],'glass');
      m.rod([.075,-.12,.09],[.075,-.12,.28],.075,'metal',0x7d8273,14);
      grip(b,[.12,-.14,-.13],false,cloth);grip(b,[-.07,-.10,-L*.6],true,cloth);muzzle=[.075,.055,-L-.10];
    }else if(f==='pistol'){
      b.box(.068,.074,L,[0,.03,-L*.43],'metal',c);b.box(.065,.045,L*.82,[0,-.026,-L*.4],'paint',c);
      b.box(.062,.14,.083,[0,-.10,.01],'rubber',COLORS.rubber,[.20,0,0]);
      b.rod([0,.03,-L*.91],[0,.03,-L-.035],.017);b.add(new T.TorusGeometry(.017,.005,5,10),'metal',COLORS.metal,[0,.03,-L-.036]);
      for(let i=0;i<5;i++)for(const side of [-1,1])b.box(.003,.042,.007,[side*.035,.035,.015-i*.012],'rubber');
      m.box(.048,.105,.052,[0,-.145,.012],'metal');m.box(.068,.014,.073,[0,-.205,.012],'rubber');
      grip(b,[.055,-.11,.04],false,cloth);grip(b,[-.055,-.10,.01],true,cloth);muzzle=[0,.03,-L-.08];
    }else{
      const heavy=f==='lmg',long=f==='sniper'||f==='marksman',compact=f==='smg';
      const body=compact?.22:heavy?.37:.31;
      b.box(heavy?.13:.10,heavy?.14:.105,body,[0,0,-.025],'paint',c);
      b.rod([0,.018,-.15],[0,.018,-L],f==='sniper'?.021:.017,'metal');
      b.rod([0,.018,-L+.08],[0,.018,-L-.028],f==='sniper'?.03:.024,'metal');
      const handLength=Math.max(.14,L*(f==='sniper'?.40:.54));
      b.box(.09,.085,handLength,[0,-.015,-.16-handLength*.5],'paint',c);
      const vents=compact?4:long?10:7;for(let i=0;i<vents;i++)for(const side of [-1,1])b.box(.004,.024,.015,[side*.046,.0,-.18-i*(handLength-.04)/vents],'rubber');
      if(f==='shotgun'){
        b.rod([0,-.041,-.15],[0,-.041,-L+.08],.024,'metal',0x55646a);
        b.box(.115,.10,.22,[0,-.02,-L*.53],'rubber');for(let i=0;i<7;i++)b.box(.12,.009,.012,[0,.031,-L*.53+.09-i*.027],'paint',c);
        for(let i=0;i<4;i++){b.rod([-.065,-.015,.04-i*.04],[-.065,-.08,.04-i*.04],.014,'paint',0x98594c);b.ball([-.065,-.012,.04-i*.04],[.015,.009,.015],'metal',0xa18b55);}
      }
      if(p.stockStyle==='folding'||p.stockStyle==='skeleton'){
        for(const side of [-1,1])b.rod([side*.035,.01,.1],[side*.045,.01,.34],.012,'metal');b.box(.10,.12,.04,[0,-.005,.35],'rubber');
      }else{b.box(.10,p.stockStyle==='precision'?.135:.09,.22,[0,-.005,.22],'paint',c);b.box(.11,.135,.035,[0,-.015,.35],'rubber');if(p.stockStyle==='precision')b.box(.075,.026,.13,[0,.077,.23],'rubber');}
      b.box(.065,.135,.066,[0,-.105,.065],'rubber',COLORS.rubber,[.15,0,0]);
      if(heavy){
        m.box(.19,.17,.17,[-.11,-.115,-.05],'paint',c);m.box(.20,.025,.18,[-.11,-.018,-.05],'rubber');
        for(let i=0;i<7;i++)b.rod([-.17+i*.024,.03,.0],[-.17+i*.024,.03,-.08],.008,'metal',0xaa935e,6);
        b.rod([.075,.065,-.15],[.075,.145,-.15],.009);b.rod([.075,.145,-.15],[.075,.145,.01],.012,'rubber');b.rod([.075,.145,.01],[.075,.065,.01],.009);
      }else if(p.magazineStyle==='drum'){
        m.add(new T.CylinderGeometry(.085,.085,.082,16),'paint',c,[0,-.14,-.07],[0,0,Math.PI/2]);for(const side of [-1,1])m.add(new T.CircleGeometry(.066,16),'rubber',COLORS.rubber,[side*.043,-.14,-.07],[0,side*Math.PI/2,0]);
      }else if(f==='shotgun'){
        m.rod([.06,-.10,-.05],[.06,-.19,-.05],.021,'paint',0x98594c);m.ball([.06,-.095,-.05],[.022,.009,.022],'metal',0xaa935e);
      }else{const length=p.magazineStyle==='short'?.10:f==='sniper'?.10:.17;m.box(.068,length,.063,[0,-.08-length*.5,-.065],'metal',c,[-.12,0,0]);for(let i=0;i<3;i++)m.box(.071,.008,.066,[0,-.10-i*length*.24,-.065],'rubber');}
      if(long||heavy)for(const side of [-1,1]){b.rod([side*.04,-.035,-L*.64],[side*.072,-.075,-L*.39],.01);b.box(.024,.014,.045,[side*.072,-.075,-L*.39],'rubber');}
      if(f==='sniper'){b.rod([.05,.025,.035],[.12,.035,.08],.008);b.ball([.125,.035,.08],[.019,.019,.019],'rubber');}
      grip(b,[.06,-.11,.075],false,cloth);grip(b,[-.06,-.07,-Math.min(.37,L*.47)],true,cloth);
    }
    // Open sights/offset optics keep the centre reticle clear in ADS.
    if(p.optic==='scope'){
      const x=.075,z=f==='pistol'?-.05:-.08,length=f==='sniper'?.35:.25;
      for(const zz of [z-.08,z+.06])b.box(.028,.07,.035,[x,.12,zz],'metal');
      b.rod([x,.17,z+length*.5],[x,.17,z-length*.5],f==='sniper'?.039:.032,'rubber');
      b.add(new T.CircleGeometry(f==='sniper'?.030:.024,16),'glass',0x4e7d88,[x,.17,z+length*.5+.002]);
    }else if(p.optic==='reflex'){
      const z=f==='pistol'?-.04:-.02;for(const side of [-1,1])b.rod([side*.035,.07,z],[side*.035,.145,z],.007,'metal');b.rod([-.035,.145,z],[.035,.145,z],.007,'metal');b.box(.075,.015,.045,[0,.07,z],'rubber');
    }else{for(const side of [-1,1])b.box(.009,.035,.018,[side*.024,.084,.025],'metal');b.box(.006,.04,.012,[0,.076,-L*.74],'metal');}
    b.box(.004,.026,.065,[f==='pistol'?.036:.055,.018,-.025],'rubber');
    if(f!=='launcher')for(const side of [-1,1]){b.rod([side*.03,-.065,.07],[side*.03,-.095,.005],.006);b.rod([side*.03,-.095,.005],[side*.03,-.062,-.027],.006);}
    m.build(part);return{muzzle:{position:muzzle,direction:[0,0,-1]},reloadPart:part};
  }
  class WarFPSView{
    constructor(renderer){this.renderer=renderer?.gl||renderer;this.viewScene=new T.Scene();this.viewCamera=new T.PerspectiveCamera(70,1,.01,12);this.viewCamera.position.set(0,0,0);this.viewCamera.lookAt(0,0,-1);this.camera=this.viewCamera;this.foreground=new T.Group();this.viewScene.add(this.foreground);this.viewScene.add(new T.HemisphereLight(0xd9e9ee,0x738178,2.5));const key=new T.DirectionalLight(0xffebd5,2.2);key.position.set(-1,3,2);this.viewScene.add(key);const fill=new T.DirectionalLight(0xc4d9e7,1.3);fill.position.set(2,-.3,2);this.viewScene.add(fill);this.flashLight=new T.PointLight(0xffaf55,0,.6,2);this.foreground.add(this.flashLight);this.kind='';this.faction='';this.ads=0;this.recoil=0;this.flashTime=0;this.lastPulse=0;this.fov=70;this.lastScreenTime=-Infinity;this.width=1;this.height=1;this.disposed=false;this.setKind('infantry','chn');}
    _clear(){const geometries=new Set(),materials=new Set(),textures=new Set();for(const child of this.foreground.children.slice()){if(child===this.flashLight)continue;child.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);if(m.map)textures.add(m.map);}});this.foreground.remove(child);}for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.screenTexture=null;this.flash=null;this.reloadPart=null;}
    _screen(p,w,h,rotation=[0,0,0]){if(!this.screenTexture){this.screenCanvas=document.createElement('canvas');this.screenCanvas.width=512;this.screenCanvas.height=256;this.screenTexture=new T.CanvasTexture(this.screenCanvas);this.screenTexture.colorSpace=T.SRGBColorSpace;this.screenTexture.minFilter=T.LinearFilter;this.screenTexture.magFilter=T.LinearFilter;this.screenTexture.generateMipmaps=false;}const material=new T.MeshBasicMaterial({map:this.screenTexture,toneMapped:false}),m=new T.Mesh(new T.PlaneGeometry(w,h),material);m.name='local-instrument-display';m.position.set(...p);m.rotation.set(...rotation);this.foreground.add(m);}
    _drawScreen(time,hp){if(!this.screenTexture)return;const ctx=this.screenCanvas.getContext('2d'),w=512,h=256;ctx.fillStyle='#071317';ctx.fillRect(0,0,w,h);ctx.fillStyle=this.mode==='medical'?'#b9e4d0':'#8dbec8';ctx.font='bold 30px monospace';ctx.fillText(this.mode==='medical'?'FIELD CARE':'CONTROL',24,34);ctx.font='22px monospace';ctx.fillText(this.mode==='underwater'?'SONAR':'READY',390,34);ctx.strokeStyle='#466a72';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(22,49);ctx.lineTo(490,49);ctx.stroke();for(let i=0;i<=16;i++){const x=32+i*28;ctx.beginPath();ctx.moveTo(x,68);ctx.lineTo(x,i%4?77:87);ctx.stroke();if(i%4===0)ctx.fillText(String(i*15),x-8,104);}ctx.strokeStyle=this.mode==='medical'?'#80c4a1':'#74c0d1';ctx.beginPath();for(let x=20;x<492;x++){const phase=(x+time*36)%100,signal=this.mode==='medical'?(phase>45&&phase<50?-28:phase>50&&phase<56?38:Math.sin(x*.08)*3):Math.sin(x*.025+time*.5)*10;const y=157+signal;x===20?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();ctx.fillStyle='#243e44';ctx.fillRect(22,211,468,13);ctx.fillStyle=hp<.3?'#e7a061':'#79b69e';ctx.fillRect(22,211,468*Math.max(0,Math.min(1,hp)),13);ctx.fillStyle='#98b9be';ctx.font='22px monospace';ctx.fillText('STATUS '+Math.round(hp*100)+'%',24,248);if(this.mode==='underwater'){
      ctx.fillStyle='#071c22';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#477c75';ctx.lineWidth=1;const cx=135,cy=128;for(const r of [30,60,90]){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(cx-100,cy);ctx.lineTo(cx+100,cy);ctx.moveTo(cx,cy-100);ctx.lineTo(cx,cy+100);ctx.stroke();ctx.strokeStyle='#9bd8b5';ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(time*.8)*95,cy+Math.sin(time*.8)*95);ctx.stroke();ctx.fillStyle='#f5be83';for(const c of this.telemetry?.contacts||[]){const x=c.x/600*90,y=c.y/600*90;if(Math.hypot(x,y)<95){ctx.beginPath();ctx.arc(cx+x,cy+y,3.5,0,7);ctx.fill();}}ctx.fillStyle='#a3d6cb';ctx.font='24px monospace';ctx.fillText('SONAR',265,50);ctx.fillText('DEPTH '+Math.round(-(this.telemetry?.altitude||-55)),265,100);ctx.fillText('SPD '+Math.round(this.telemetry?.speed||0),265,145);ctx.fillText('CONTACT '+(this.telemetry?.contacts.length||0),265,190);ctx.font='15px monospace';ctx.fillText('GAME UNITS / U',265,225);
      }this.screenTexture.needsUpdate=true;}
    setWeapon(weaponId,faction=this.faction||'chn'){if(!root.WarOperatorWeapons?.byId[weaponId])return false;return this.setKind('operator',faction,weaponId)||this.metrics;}
    setKind(kind,faction='chn',weaponId=null){if(this.disposed)return;const weapon=root.WarOperatorWeapons?.byId[weaponId||(kind==='operator'?root.WarOperatorWeapons?.defaultPrimary:'')]||null;if(this.kind===kind&&this.faction===faction&&this.weaponId===(weapon?.id||null))return this.metrics;this._clear();this.kind=kind;this.faction=faction;this.weaponId=weapon?.id||null;this.weapon=weapon;const u=root.WarData?.U?.[kind]||{},infantry=!!weapon||kind==='infantry'||kind.endsWith('_team')||u.modelKind==='infantry',medical=infantry&&/medic|medical/.test(kind),space=!!u.space||u.unitGroup==='space'||kind.startsWith('orbital_'),air=!!u.air||u.unitGroup==='air'||/aircraft|helicopter|drone/.test(kind),naval=!!u.naval||u.unitGroup==='naval';this.mode=u.underwater?'underwater':medical?'medical':infantry?'infantry':space?'space':air?'air':naval?'naval':'ground';this.armed=this.mode==='infantry';this.ads=0;this.recoil=0;this.flashTime=0;this.lastPulse=0;this.lastScreenTime=-Infinity;const b=new Batch(),cloth=new T.Color(root.WarModels?.colors?.[faction]||COLORS.cloth).lerp(new T.Color(COLORS.cloth),.65).getHex();
      this.weaponProfile=this.mode==='medical'?'original-medical-device':'original-'+this.mode+'-controls';
      if(this.mode==='infantry'){
        this.weaponProfile=kind==='antitank_team'?'original-shoulder-launcher':kind==='mortar_team'?'original-mortar-observation':kind==='machinegun_team'?'original-belt-fed-machinegun':kind==='sniper_team'?'original-marksman-rifle':'original-rifle';
        let muzzle={position:[0,.006,-.80],direction:[0,0,-1]};
        if(weapon){const prop=operatorProp(b,weapon,cloth,this.foreground);muzzle=prop.muzzle;this.reloadPart=prop.reloadPart;this.weaponProfile='original-operator-'+weapon.category;}
        else if(kind==='antitank_team')muzzle=shoulderLauncher(b,cloth);
        else if(kind==='mortar_team')muzzle=mortarStation(b,cloth);
        else{
        const heavy=kind==='machinegun_team';
        b.box(.10,.115,.32,[0,0,-.04]);b.box(.10,.105,.19,[0,-.005,.19],'rubber');b.box(.11,.14,.045,[0,-.005,.295],'rubber');b.rod([0,.006,-.20],[0,.006,-.69],.018);b.rod([0,.006,-.64],[0,.006,-.73],.024,'metal');
        b.box(.092,.09,.25,[0,-.006,-.30]);for(let i=0;i<6;i++){b.box(.097,.018,.018,[0,.045,-.20-i*.036],'rubber');for(const side of [-1,1])b.box(.003,.028,.018,[side*.047,.003,-.21-i*.035],'rubber');}
        b.box(.064,.021,.39,[0,.072,-.12],'metal');for(let i=0;i<15;i++)b.box(.07,.014,.011,[0,.087,.04-i*.025],'metal');b.box(.068,.13,.064,[0,-.113,.06],'rubber',COLORS.rubber,[.16,0,0]);
        if(heavy){
          b.box(.14,.05,.29,[0,-.035,-.30],'paint');b.box(.145,.027,.20,[0,.057,-.045],'metal');
          b.box(.16,.18,.15,[-.14,-.12,-.045],'paint',0x59634e);b.box(.17,.025,.16,[-.14,-.025,-.045],'rubber');
          for(let i=0;i<8;i++){const x=-.19+i*.02,y=.015+Math.sin(i/7*Math.PI)*.035;b.rod([x,y,.01],[x,y,-.095],.008,'metal',0x9b8b63,6);b.box(.012,.014,.025,[x,y,-.035],'rubber');}
          for(const side of [-1,1]){b.rod([side*.07,-.03,-.42],[side*.085,-.065,-.19],.01);b.box(.018,.012,.045,[side*.085,-.065,-.19],'rubber');}
          b.rod([.08,.055,-.19],[.08,.13,-.19],.009);b.rod([.08,.13,-.19],[.08,.13,-.075],.014,'rubber');b.rod([.08,.13,-.075],[.08,.055,-.075],.009);
        }else{b.box(.078,.155,.065,[0,-.118,-.095],'metal',0x485357,[-.12,0,0]);for(let i=0;i<4;i++)b.box(.081,.007,.067,[0,-.08-i*.024,-.095],'rubber');}
        if(kind==='sniper_team'){
          // Original long-range prop: extended barrel, folded bipod and offset optic.
          b.rod([0,.006,-.69],[0,.006,-.96],.017);b.rod([0,.006,-.88],[0,.006,-1.01],.023);
          for(const side of [-1,1])b.rod([side*.045,-.03,-.43],[side*.055,-.06,-.22],.009);
          for(const z of [-.13,.035])b.box(.025,.05,.035,[.075,.13,z],'metal');
          b.rod([.075,.18,.11],[.075,.18,-.27],.035,'rubber');
          b.rod([.075,.18,-.22],[.075,.18,-.31],.045,'rubber');
          b.add(new T.CircleGeometry(.027,16),'metal',0x547c82,[.075,.18,.112]);
          muzzle={position:[0,.006,-1.08],direction:[0,0,-1]};
        }
        // Open mechanical sights: narrow post and rear U, no opaque centre plate.
        b.box(.033,.074,.038,[0,.057,-.51],'paint');b.box(.008,.065,.012,[0,.127,-.51],'metal');for(const side of [-1,1])b.box(.009,.045,.018,[side*.022,.133,.03],'metal');b.box(.05,.01,.018,[0,.111,.03],'metal');
        b.box(.007,.034,.09,[.054,.014,.008],'rubber');b.box(.025,.012,.047,[.063,.018,.04],'metal');b.rod([.03,-.055,.07],[.03,-.086,.01],.007);b.rod([.03,-.086,.01],[.03,-.055,-.015],.007);grip(b,[.06,-.115,.08],false,cloth);grip(b,[-.065,-.073,-.29],true,cloth);
        }
        const flashMaterial=new T.MeshBasicMaterial({color:0xffd28a,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});this.flash=new T.Mesh(new T.ConeGeometry(.055,.17,7),flashMaterial);this.flash.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...muzzle.direction));this.flash.position.set(...muzzle.position);this.flash.visible=false;this.foreground.add(this.flash);this.flashLight.position.copy(this.flash.position);
      }else if(this.mode==='medical'){
        b.box(.25,.13,.30,[0,0,-.05],'paint',0xa3b1ad);b.box(.27,.055,.32,[0,-.045,-.05],'rubber');for(const side of [-1,1]){b.box(.035,.10,.23,[side*.135,.01,-.05],'rubber');b.box(.018,.07,.08,[side*.155,.015,-.08],'paint',COLORS.orange);}b.box(.19,.14,.025,[0,.111,-.07],'rubber',COLORS.rubber,[-.6,0,0]);b.box(.045,.018,.045,[.072,.076,.064],'paint',COLORS.orange);b.rod([-.07,.07,.08],[-.07,.09,.14],.018);this._screen([0,.121,-.053],.165,.12,[-.6,0,0]);grip(b,[-.16,-.025,.02],true,cloth);grip(b,[.16,-.025,.02],false,cloth);
      }else{
        const sub=this.mode==='underwater',airMode=this.mode==='air',navy=this.mode==='naval',spaceMode=this.mode==='space',w=navy?1.92:1.43,z=navy?-1.15:-.92,y=navy?-.64:-.48;
        b.box(w,.16,.22,[0,y,z],'rubber');b.box(w,.018,.24,[0,y+.09,z],'paint');for(const side of [-1,1]){b.box(.26,.15,.035,[side*.28,y+.02,z+.13],'metal');b.box(.24,.13,.023,[side*.28,y+.02,z+.153],'rubber');this._screen([side*.28,y+.02,z+.167],.215,.108);for(let i=0;i<3;i++){b.rod([side*(.52+i*.075),y+.035,z+.14],[side*(.52+i*.075),y+.035,z+.17],.018,'rubber');b.box(.026,.009,.014,[side*(.52+i*.075),y+.047,z+.19],'paint',COLORS.orange);}}
        if(airMode||spaceMode){for(const side of [-1,1]){b.rod([side*.68,y,z],[side*.77,.37,-1.12],.016,'paint');b.rod([side*.77,.37,-1.12],[side*.90,.65,-1.48],.014,'metal');b.rod([side*.68,y,z],[side*.40,y-.08,-.72],.02,'metal');}const gm=new T.Mesh(new T.PlaneGeometry(.26,.18),new T.MeshStandardMaterial({color:0x70a8b6,transparent:true,opacity:.08,roughness:.08,metalness:.1,depthWrite:false}));gm.position.set(0,-.17,-.86);this.foreground.add(gm);for(const side of [-1,1])b.rod([side*.13,-.26,-.86],[side*.13,-.39,-.87],.009,'metal');if(spaceMode){for(const side of [-1,1]){b.box(.07,.35,.055,[side*.63,-.13,-.92],'paint');b.box(.014,.20,.015,[side*.59,-.13,-.88],'paint',0x65a2ac);}}}
        else if(sub){
          // Pressure-window frame and a compact sonar console, original game interior.
          b.add(new T.TorusGeometry(.63,.065,10,40),'metal',0x6b8586,[0,.09,-1.12]);
          b.add(new T.TorusGeometry(.69,.025,6,40),'rubber',COLORS.rubber,[0,.09,-1.14]);
          for(let i=0;i<12;i++){const a=i*Math.PI/6;b.ball([Math.cos(a)*.64,.09+Math.sin(a)*.64,-1.04],[.017,.017,.017],'metal');}
          for(const side of [-1,1]){b.rod([side*.60,-.31,-1.0],[side*.61,-.53,-.78],.028);b.rod([side*.61,-.53,-.78],[side*.39,-.53,-.78],.028,'rubber');}
        }
        else if(navy){for(const side of [-1,1]){b.rod([side*.88,y,-1.2],[side*.96,.51,-1.48],.018);b.rod([side*.96,.51,-1.48],[side*1.3,.70,-1.6],.018);}b.rod([-.25,y-.11,-.87],[.25,y-.11,-.87],.025,'rubber');}
        else{for(const side of [-1,1]){b.rod([side*.108,-.081,-.72],[side*.108,.081,-.72],.006,'rubber');b.rod([-.108,side*.081,-.72],[.108,side*.081,-.72],.006,'rubber');b.rod([side*.035,-.14,-.75],[side*.055,y+.09,z],.012,'metal');}b.box(.12,.05,.07,[0,-.115,-.75],'paint');}
      }
      b.build(this.foreground);let triangles=0,drawCalls=0;this.foreground.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;drawCalls++;o.frustumCulled=false;}});this.metrics={triangles,drawCalls,mode:this.mode,weaponProfile:this.weaponProfile,weaponId:this.weaponId,weaponCategory:this.weapon?.category||null};if(triangles>=12000||drawCalls>=12)console.warn('[WarFPSView] foreground budget exceeded',this.metrics);this._drawScreen(0,1);this.update({time:0,dt:.1,firePulse:0,ads:false,moving:false,hp:1});return this.metrics;
    }
    update({telemetry=null,time=0,dt=1/60,firePulse=0,ads=false,moving=false,motion=true,hp=1,reloading=false,reloadProgress=0}={}){if(this.disposed)return;if(telemetry)this.telemetry=telemetry;dt=Math.max(0,Math.min(.1,Number(dt)||0));const targetADS=ads&&!reloading?1:0,blend=1-Math.exp(-dt*13);this.ads+=(targetADS-this.ads)*blend;this.fov=70-22*this.ads;this.viewCamera.fov=this.fov;this.viewCamera.updateProjectionMatrix();const pulse=Number(firePulse)||0,shot=this.armed&&!reloading&&pulse>0&&(this.lastPulse<=0||pulse>this.lastPulse);this.lastPulse=pulse;if(shot){this.recoil=Math.min(.09,this.recoil+(this.weapon?Math.min(.09,this.weapon.recoil):.055));this.fireProfile=root.WarWeaponEffects?.profile({sourceKind:this.kind,weaponId:this.weaponId});this.flashTime=this.fireProfile?.flash??.042;}else this.flashTime=Math.max(0,this.flashTime-dt);this.recoil*=Math.exp(-dt*18);if(!motion)this.recoil=0;const move=typeof moving==='number'?Math.max(0,Math.min(1,moving)):moving?1:0,bob=Math.sin(time*8)*.008*move*(1-this.ads*.85)*(motion?1:0),sway=Math.sin(time*1.7)*.002*(1-this.ads*.7)*(motion?1:0);
      if(this.mode==='infantry'){this.foreground.position.set(.26*(1-this.ads)+sway,-.29+.15*this.ads+Math.abs(bob),-.62+this.recoil);this.foreground.rotation.set(this.recoil*.60,bob*.55,-bob*.45);}else if(this.mode==='medical'){this.foreground.position.set(.11+sway,-.29+Math.abs(bob),-.62);this.foreground.rotation.set(-.12,0,-bob*.5);}else{this.foreground.position.set(sway*.2,bob*.14,0);this.foreground.rotation.set(0,0,bob*.07);}
      const progress=Number.isFinite(reloadProgress)?Math.max(0,Math.min(1,reloadProgress)):0,reloadPose=reloading?Math.sin(Math.PI*progress):0;this.reloading=!!reloading;this.reloadProgress=progress;if(this.weapon){this.foreground.position.y-=reloadPose*.14;this.foreground.rotation.x+=reloadPose*.32;this.foreground.rotation.z-=reloadPose*.32;if(this.reloadPart){this.reloadPart.position.set(-reloadPose*.07,-reloadPose*.22,reloadPose*.06);this.reloadPart.rotation.z=-reloadPose*.18;}}
      if(this.flash){this.flash.visible=this.flashTime>0;const p=this.fireProfile;this.flash.scale.set(p?.exhaust?.7:1,p?.exhaust?1.8:p?.name==='shotgun'?1.3:.9,p?.exhaust?.7:1);this.flash.material.color.set(p?.color||'#ffd28a');}this.flashLight.intensity=this.flashTime>0?1.5:0;const health=Number.isFinite(hp)?Math.max(0,Math.min(1,hp>1?hp/100:hp)):1;if(time-this.lastScreenTime>.12||health!==this.lastHP){this._drawScreen(time,health);this.lastScreenTime=time;this.lastHP=health;}
    }
    resize(width,height){if(this.disposed)return;this.width=Math.max(1,width);this.height=Math.max(1,height);this.viewCamera.aspect=this.width/this.height;this.viewCamera.updateProjectionMatrix();}
    render(camera){if(this.disposed||!this.renderer)return;if(camera?.isPerspectiveCamera&&camera.aspect>0){this.viewCamera.aspect=camera.aspect;this.viewCamera.fov=camera.fov;}else this.viewCamera.aspect=this.width/this.height;this.viewCamera.updateProjectionMatrix();const r=this.renderer,old=r.autoClear;try{r.autoClear=false;r.clearDepth();r.render(this.viewScene,this.viewCamera);}finally{r.autoClear=old;}}
    dispose(){if(this.disposed)return;this._clear();this.viewScene.clear();this.flashLight.dispose?.();this.disposed=true;this.renderer=null;this.screenCanvas=null;}
  }
  root.WarFPSView=WarFPSView;
})(globalThis);
