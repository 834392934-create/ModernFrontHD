(function(root){
  'use strict';
  const T=root.THREE,D=root.WarData,{W,H,COLS,ROWS,U,B,F}=D,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  if(!T)return;
  const Legacy=root.WarRenderer;
  class Battle3D {
    constructor(canvas,mini){
      this.canvas=canvas;this.mini=mini;this.mc=mini.getContext('2d');
      this.gl=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
      this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.05;
      this.gl.shadowMap.enabled=true;this.gl.shadowMap.type=T.PCFSoftShadowMap;
      this.scene=new T.Scene();this.scene.background=new T.Color(0x283b41);
      this.cam=new T.OrthographicCamera(-800,800,500,-500,1,9000);this.strategyCam=this.cam;
      this.camera={x:720,y:550,zoom:1.15};this.elevation=.78;
      this.hemi=new T.HemisphereLight(0xd5e6e9,0x786e4f,2);this.scene.add(this.hemi);
      this.sun=new T.DirectionalLight(0xffead0,3.0);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);
      Object.assign(this.sun.shadow.camera,{left:-1100,right:1100,top:1100,bottom:-1100,near:10,far:4000});
      this.sun.shadow.bias=-.00025;this.sun.shadow.normalBias=1.1;this.scene.add(this.sun,this.sun.target);
      this.objects=new Map();this.world=new T.Group();this.scene.add(this.world);this.effects=[];
      this.overlay=document.createElement('canvas');this.overlay.id='battle-overlay';this.overlay.style.cssText='position:absolute;inset:0;pointer-events:none;width:100%;height:100%';canvas.after(this.overlay);this.ctx=this.overlay.getContext('2d');
      this.fogCanvas=document.createElement('canvas');this.fogCanvas.width=COLS;this.fogCanvas.height=ROWS;this.fogCtx=this.fogCanvas.getContext('2d');this.fogTex=new T.CanvasTexture(this.fogCanvas);this.fogTex.minFilter=this.fogTex.magFilter=T.LinearFilter;
      this.fogUniform={value:this.fogTex};this.fogEnabled={value:0};this.fogify(root.WarModels.material);
      this.hover=null;this.is3D=true;this.resize();
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;});
      canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;this.fogTex.needsUpdate=true;});
      addEventListener('war-models-ready',()=>this.clearObjects());
      // Compatibility sprites for the 2D fallback and existing asset diagnostics.
      this.sprites={};for(const k of ['tank','tank_chn']){const i=new Image();i.src='assets/sprites/'+k+'.png';this.sprites[k]=i;}
    }
    fogify(mat){
      if(mat.userData.battleFog)return mat;mat.userData.battleFog=true;
      const previous=mat.onBeforeCompile;mat.onBeforeCompile=s=>{
        previous?.call(mat,s);s.uniforms.warFog=this.fogUniform;s.uniforms.warFogEnabled=this.fogEnabled;
        s.vertexShader='varying vec3 vWarWorld;\n'+s.vertexShader;
        s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
          vec4 warPos=vec4(transformed,1.0);
          #ifdef USE_INSTANCING
          warPos=instanceMatrix*warPos;
          #endif
          vWarWorld=(modelMatrix*warPos).xyz;`);
        s.fragmentShader='uniform sampler2D warFog; uniform float warFogEnabled; varying vec3 vWarWorld;\n'+s.fragmentShader;
        s.fragmentShader=s.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
          float obscured=texture2D(warFog,vec2(vWarWorld.x/${W.toFixed(1)},1.0-vWarWorld.z/${H.toFixed(1)})).a*warFogEnabled;
          gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.045,.075,.087),obscured);`);
      };mat.needsUpdate=true;return mat;
    }
    resize(){this.width=innerWidth;this.height=innerHeight;this.dpr=this.quality&&this.quality!=='high'?1:Math.min(1.5,devicePixelRatio||1);this.gl.setPixelRatio(this.dpr);this.gl.setSize(this.width,this.height,false);this.overlay.width=this.width*this.dpr;this.overlay.height=this.height*this.dpr;this.syncCamera();}
    syncCamera(){if(this.firstPerson?.active){this.firstPerson.updateCamera();return;}this.cam=this.strategyCam;const z=this.camera.zoom,c=this.cam;Object.assign(c,{left:-this.width/2/z,right:this.width/2/z,top:this.height/2/z,bottom:-this.height/2/z});c.position.set(this.camera.x,2200*Math.sin(this.elevation),this.camera.y+2200*Math.cos(this.elevation));c.lookAt(this.camera.x,0,this.camera.y);c.updateProjectionMatrix();c.updateMatrixWorld();}
    toWorld(x,y){if(this.firstPerson?.active){const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x/this.width*2-1,1-y/this.height*2),this.cam);const hit=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());return{x:hit?.x??this.camera.x,y:hit?.z??this.camera.y};}return{x:(x-this.width/2)/this.camera.zoom+this.camera.x,y:(y-this.height/2)/this.camera.zoom/Math.sin(this.elevation)+this.camera.y};}
    toScreen(x,y,height=0){if(this.firstPerson?.active){const p=new T.Vector3(x,height,y).project(this.cam);if(p.z< -1||p.z>1)return{x:Infinity,y:Infinity};return{x:(p.x+1)*this.width/2,y:(1-p.y)*this.height/2};}height=this.displayHeight(height);return{x:(x-this.camera.x)*this.camera.zoom+this.width/2,y:((y-this.camera.y)*Math.sin(this.elevation)-height*Math.cos(this.elevation))*this.camera.zoom+this.height/2};}
    physicalHeight(e){const d=U[e.kind],base=Number.isFinite(e.altitude)?e.altitude:d?.underwater?-55:d?.space?4000:d?.air?65:d?.naval?2:0;return base+((d?.modelKind||e.kind)==='infantry'&&Number.isFinite(e.jumpHeight)?Math.max(0,e.jumpHeight):0);}
    displayHeight(h){return this.firstPerson?.active?h:h>=2000?145+(h-4000)*.003:h>65?65+Math.log(h/65)*20:h;}
    entityHeight(e){return this.displayHeight(this.physicalHeight(e));}
    entityScreen(e){return this.toScreen(e.x,e.y,U[e.kind]?.underwater&&!this.firstPerson?.active?0:this.physicalHeight(e));}
    pick(game,x,y,enemy=false){
      let best=null,score=Infinity;for(const e of game.entities){if(enemy?!game.isEnemy(0,e.team):e.team!==0)continue;if(enemy&&!(U[e.kind]?.underwater?game.canDetect(0,e):game.visibleAt(e.x,e.y)))continue;const p=this.entityScreen(e),d=Math.hypot(x-p.x,y-p.y);if(d<Math.max(16,e.r*this.camera.zoom+7)&&d<score){best=e;score=d;}}return best;
    }
    pan(dx,dy){this.camera.x=clamp(this.camera.x+dx,0,W);this.camera.y=clamp(this.camera.y+dy/Math.sin(this.elevation),0,H);}
    zoomAt(f,x,y){let a=this.toWorld(x,y);this.camera.zoom=clamp(this.camera.zoom*f,.18,4.5);let b=this.toWorld(x,y);this.camera.x=clamp(this.camera.x+a.x-b.x,0,W);this.camera.y=clamp(this.camera.y+a.y-b.y,0,H);}
    removeObject(id){const o=this.objects.get(id);if(!o)return;root.WarPersonnelAnimation?.release(o);this.scene.remove(o);this.objects.delete(id);}
    clearObjects(){for(const id of this.objects.keys())this.removeObject(id);}
    disposeWorld(){
      this.treeVisual=null;
      const geos=new Set(),mats=new Set();this.world.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});
      geos.forEach(g=>g.dispose());mats.forEach(m=>{m.map?.dispose();m.normalMap?.dispose();m.userData.detailTexture?.dispose();m.dispose();});this.world.clear();
      this.clearObjects();
    }
    prepare(game){
      this.disposeWorld();this.mapId=game.map.id;const rnd=root.WarSim.rng(game.map.seed),desert=game.map.id==='desert';
      const c=document.createElement('canvas');c.width=2048;c.height=1408;const g=c.getContext('2d'),sx=c.width/W,sy=c.height/H;
      g.fillStyle=desert?'#9b8d6b':'#627257';g.fillRect(0,0,c.width,c.height);
      // Continuous mottled ground instead of visible checkerboard tiles.
      for(let i=0;i<8000;i++){const x=rnd()*c.width,y=rnd()*c.height,r=5+rnd()*45;g.globalAlpha=.025+rnd()*.035;g.fillStyle=rnd()>.5?'#d5c59c':'#1e3328';g.beginPath();g.ellipse(x,y,r,r*.55,0,0,7);g.fill();}g.globalAlpha=1;
      g.save();g.scale(sx,sy);g.strokeStyle=desert?'#aa9976':'#7b7963';g.lineWidth=67;g.lineCap='round';g.beginPath();g.moveTo(180*W/3072,H/2);g.lineTo(W-182*W/3072,H/2);for(const x of [720,2352].map(v=>v*W/3072)){g.moveTo(x,200*H/2112);g.lineTo(x,H-202*H/2112);}g.stroke();g.strokeStyle='#c4b28b35';g.lineWidth=2;g.setLineDash([22,26]);g.stroke();g.setLineDash([]);
      for(const p of game.map.spawns){g.fillStyle='#6c746655';g.fillRect(p.x-220,p.y-160,440,340);}
      g.restore();
      for(let i=0;i<90000;i++){g.fillStyle=rnd()>.5?'#b8b29b24':'#18241f20';g.fillRect(rnd()*c.width,rnd()*c.height,1+rnd()*2,1);}
      const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=this.gl.capabilities.getMaxAnisotropy();
      const groundMat=this.fogify(new T.MeshStandardMaterial({map:tex,roughness:1}));
      if(root.GroundTextures){
        const loader=new T.TextureLoader(),detail=loader.load(root.GroundTextures.diffuse),normal=loader.load(root.GroundTextures.normal);
        detail.colorSpace=T.SRGBColorSpace;detail.wrapS=detail.wrapT=normal.wrapS=normal.wrapT=T.RepeatWrapping;normal.repeat.set(38,26);normal.anisotropy=4;detail.anisotropy=4;
        groundMat.normalMap=normal;groundMat.normalScale=new T.Vector2(.65,.65);groundMat.userData.detailTexture=detail;
        const prev=groundMat.onBeforeCompile;groundMat.onBeforeCompile=s=>{prev(s);s.uniforms.groundDetail={value:detail};s.fragmentShader='uniform sampler2D groundDetail;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb *= mix(vec3(1.0), texture2D(groundDetail,vMapUv*vec2(38.0,26.0)).rgb*2.3, .60);');};
      }
      // A real seabed replaces the opaque flat plane below ocean tiles.
      const terrainVertices=[],terrainUV=[],wet=(x,y)=>x>=0&&y>=0&&x<COLS&&y<ROWS&&[3,6].includes(game.map.tiles[y*COLS+x]);
      const face=(a,b,c,d)=>{for(const p of [a,b,c,a,c,d]){terrainVertices.push(...p);terrainUV.push(p[0]/W,1-p[2]/H);}};
      // Flat navigable sea tiles and vertical shore faces keep deep boats above the seabed,
      // including the last navigable coastal tile. A sloped visual floor could intersect them.
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const sea=wet(x,y),h=sea?-180:-.8,x0=x*48,x1=x0+48,z0=y*48,z1=z0+48;
        face([x0,h,z0],[x0,h,z1],[x1,h,z1],[x1,h,z0]);
        if(sea){if(y>0&&!wet(x,y-1))face([x0,-180,z0],[x1,-180,z0],[x1,-.8,z0],[x0,-.8,z0]);
          if(y<ROWS-1&&!wet(x,y+1))face([x1,-180,z1],[x0,-180,z1],[x0,-.8,z1],[x1,-.8,z1]);
          if(x>0&&!wet(x-1,y))face([x0,-180,z1],[x0,-180,z0],[x0,-.8,z0],[x0,-.8,z1]);
          if(x<COLS-1&&!wet(x+1,y))face([x1,-180,z0],[x1,-180,z1],[x1,-.8,z1],[x1,-.8,z0]);}
      }
      const groundGeo=new T.BufferGeometry();groundGeo.setAttribute('position',new T.Float32BufferAttribute(terrainVertices,3));groundGeo.setAttribute('uv',new T.Float32BufferAttribute(terrainUV,2));groundGeo.computeVertexNormals();
      const ground=new T.Mesh(groundGeo,groundMat);ground.name='terrain-with-seabed';ground.receiveShadow=true;this.world.add(ground);
      this.miniTerrain=c;this.terrain=c;
      const water=new root.WarModels.Builder(),rocks=new root.WarModels.Builder(),bridges=new root.WarModels.Builder();
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        const type=game.map.tiles[y*COLS+x],px=x*48+24,pz=y*48+24;
        if(type===3||type===6){water.add(new T.PlaneGeometry(48,48),0x315e68,[px,0,pz],[-Math.PI/2,0,0]);g.fillStyle='#31515a';g.fillRect(x*48*sx,y*48*sy,48*sx,48*sy);}
        if(type===2)rocks.add(new T.DodecahedronGeometry(1,0),desert?0x9b8c70:0x697369,[px,8,pz],[rnd(),rnd(),rnd()],[25+rnd()*12,15+rnd()*22,25+rnd()*12]);
        if(type===5){rocks.box(40,28+rnd()*45,40,px,10,pz,0x687977);rocks.box(41,2,41,px,43,pz,0x4d5b5c);}
        if(type===4){bridges.box(48,2,48,px,1,pz,0x8d9082);if(![4].includes(game.map.tiles[(y-1)*COLS+x]))bridges.box(48,4,1,px,4,pz-23,0xa7a697);if(game.map.tiles[(y+1)*COLS+x]!==4)bridges.box(48,4,1,px,4,pz+23,0xa7a697);}
      }
      for(const b of [water,rocks,bridges]){const mesh=b.finish();mesh.material=this.fogify(new T.MeshStandardMaterial({vertexColors:true,roughness:b===water?.32:.95,metalness:b===water?.25:0}));if(b===water){mesh.castShadow=false;mesh.name='water-surface';mesh.material.side=T.DoubleSide;mesh.material.transparent=true;mesh.material.opacity=.66;mesh.material.depthWrite=false;this.water=mesh;}this.world.add(mesh);}
      this.treeVisual=root.WarTrees.createVisual(game,material=>this.fogify(material));this.world.add(...this.treeVisual.meshes);this.vegetationColliders=root.WarTrees.liveColliders(game);
      for(const n of game.nodes){const b=new root.WarModels.Builder();b.box(48,2,46,n.x,1,n.y,0x8c8b75);for(const side of [-1,1]){b.box(21,15,14,n.x+side*17,9,n.y,0x6b7763);for(let k=0;k<6;k++)b.box(1,14,14.2,n.x+side*17-9+k*3.4,9,n.y,0x7b8978);}b.cyl(1,40,n.x,22,n.y,0x9c9f8d);const m=b.finish();m.material=this.fogify(new T.MeshStandardMaterial({vertexColors:true,roughness:.9}));this.world.add(m);}
      this.oreObjects=[];
      for(const ore of game.ore||[]){
        const b=new root.WarModels.Builder(),x=ore.x,z=ore.y;
        // Rock mass, reinforced adit, working hoist and an accessible loading apron.
        for(let i=0;i<11;i++){const a=rnd()*Math.PI*2,rad=rnd()*29;b.add(new T.DodecahedronGeometry(1,0),i%2?0x7b7b6d:0x8e8b77,[x+Math.cos(a)*rad,7,z+Math.sin(a)*rad],[rnd(),rnd(),rnd()],[18+rnd()*15,15+rnd()*25,18+rnd()*15]);}
        b.box(45,1,60,x-66,1,z+25,0x92917f);
        b.box(3,23,28,x-38,11,z+17,0x333e3b);b.box(4,4,34,x-41,24,z+17,0xa4a38d);
        for(const s of [-1,1])b.box(4,24,4,x-41,12,z+17+s*15,0xa4a38d);
        for(const s of [-1,1]){b.box(67,.5,1,x-65,2,z+17+s*5,0x494f48);for(let i=0;i<6;i++)b.box(2,.5,15,x-95+i*10,1.8,z+17,0x695d48);}
        for(const dx of [-12,12])for(const dz of [-10,10])b.box(2,58,2,x+dx,34,z+dz,0x747c6d,[0,0,dx<0?-.05:.05]);
        b.box(30,3,25,x,63,z,0x8f957f);b.cyl(9,3,x,69,z,0x454e45,'z');b.cyl(6.5,3.2,x,69,z,0x959c86,'z');
        for(let h=15;h<60;h+=14){b.box(26,1.5,1.5,x,h,z-10,0x737b6d);b.box(26,1.5,1.5,x,h,z+10,0x737b6d);}
        b.box(45,2,9,x+31,21,z,0x48534a,[0,0,-.30]);b.box(25,20,23,x+60,12,z,0x8c937c);b.box(26,2,24,x+60,23,z,0x4d5b50);
        b.box(18,13,17,x-65,8,z-29,0x737f6a);b.box(20,1.5,19,x-65,15,z-29,0x3c4b42);
        const m=b.finish();m.material=this.fogify(new T.MeshStandardMaterial({vertexColors:true,roughness:.96}));this.world.add(m);this.oreObjects.push({m,ore});
      }
      this.underwaterScene=root.WarUnderwater?.create(this,game);this.altitudeScene??=root.WarAltitudeScene?.create(this);this.syncCamera();
    }
    updateFog(game,demo){
      if(this.lastFogTick===game.tick&&this.lastDemo===demo)return;this.lastFogTick=game.tick;this.lastDemo=demo;
      const im=this.fogCtx.createImageData(COLS,ROWS);for(let i=0;i<COLS*ROWS;i++){im.data[i*4]=14;im.data[i*4+1]=23;im.data[i*4+2]=26;im.data[i*4+3]=demo||game.buffs.has('vision')||game.visible[i]?0:game.explored[i]?155:248;}this.fogCtx.putImageData(im,0,0);this.fogTex.needsUpdate=true;this.fogEnabled.value=demo?0:1;
    }
    draw(game,ui={},time=0){
      this.treeVisual?.sync(game);
      this.syncCamera();this.updateFog(game,!!ui.demo);this.underwaterScene?.update(this.firstPerson?.underwater===true,time);if(this.altitudeScene&&!this.firstPerson?.active)this.altitudeScene.group.visible=false;const g=this.ctx;g.setTransform(this.dpr,0,0,this.dpr,0,0);g.clearRect(0,0,this.width,this.height);
      for(const {m,ore}of this.oreObjects||[])m.material.color.setHex(ore.amount>0?0xffffff:0x7a7e78);
      if(this.contextLost){g.fillStyle='#dbe3d8';g.fillText('图形设备正在恢复…',40,90);return;}
      const night=root.ModernFront?.lighting?.night;this.sun.intensity=night?1:this.firstPerson?.active?2.6:3;this.hemi.intensity=night?.6:this.firstPerson?.active?1.2:2;
      const lightHeight=this.firstPerson?.active?this.firstPerson.eye.y:0;this.sun.position.set(this.camera.x-600,lightHeight+1400,this.camera.y+350);this.sun.target.position.set(this.camera.x,lightHeight,this.camera.y);this.sun.target.updateMatrixWorld();
      const alive=new Set();let visibleCount=0;
      for(const e of game.entities){alive.add(e.id);let o=this.objects.get(e.id),p=this.entityScreen(e);const visible=(ui.demo||e.team===0||(U[e.kind]?.underwater?game.canDetect(0,e):game.visibleAt(e.x,e.y)))&&(this.firstPerson?.active?(this.firstPerson.orbitScope?.active||Math.hypot(e.x-this.camera.x,e.y-this.camera.y)<3200):p.x>-140&&p.x<this.width+140&&p.y>-160&&p.y<this.height+180);
        if(!visible){if(o)o.visible=false;continue;}
        if(!o){o=root.WarModels.create(e.kind,game.teams[e.team].faction);o.scale.setScalar(o.userData.scale);o.traverse(m=>{if(m.isMesh&&m.userData.preserveMaterial)for(const mat of Array.isArray(m.material)?m.material:[m.material])this.fogify(mat)});this.objects.set(e.id,o);this.scene.add(o);}
        o.visible=e.id!==this.firstPerson?.entityId;visibleCount++;o.position.set(e.x,this.entityHeight(e),e.y);o.rotation.set(e.roll||0,e.structure?0:-e.angle,e.pitch||0,'YZX');
        root.WarPersonnelAnimation?.update(o,e,game.time);
        for(const name of ['turret','turretRear']){const turret=o.getObjectByName(name);if(turret)turret.rotation.y=e.target?(e.structure?0:e.angle)-e.turret:0;}
        const radar=o.getObjectByName('radar');if(radar)radar.rotation.y=time*.45;
        const jammer=o.getObjectByName('jammerHead');if(jammer)jammer.rotation.y=time*.18;
        const rotor=o.getObjectByName('rotor');if(rotor)rotor.rotation.y=time*27;
        const rotorCounter=o.getObjectByName('rotorCounter');if(rotorCounter)rotorCounter.rotation.y=-time*27;
        const rotor2=o.getObjectByName('rotor2');if(rotor2)rotor2.rotation.y=time*27;
        const rotorCounter2=o.getObjectByName('rotorCounter2');if(rotorCounter2)rotorCounter2.rotation.y=-time*27;
        const propeller=o.getObjectByName('propeller');if(propeller)propeller.rotation.x=time*35;
        const tailRotor=o.getObjectByName('tailRotor');if(tailRotor)tailRotor.rotation.z=time*38;
      }
      for(const id of this.objects.keys())if(!alive.has(id))this.removeObject(id);
      this.gl.render(this.scene,this.cam);this.stats={calls:this.gl.info.render.calls,triangles:this.gl.info.render.triangles,visibleEntities:visibleCount,geometries:this.gl.info.memory.geometries};
      if(this.firstPerson?.active){this.rangeOverlays=[];this.firstPerson.drawOverlay(game,time);if(this.firstPerson.view){this.stats.foregroundCalls=this.gl.info.render.calls;this.stats.foregroundTriangles=this.gl.info.render.triangles;this.stats.calls+=this.stats.foregroundCalls;this.stats.triangles+=this.stats.foregroundTriangles;}return;}
      const ring=(x,y,rad,color,width=1,alpha=1)=>{const p=this.toScreen(x,y);g.globalAlpha=alpha;g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.ellipse(p.x,p.y,rad*this.camera.zoom,rad*this.camera.zoom*Math.sin(this.elevation),0,0,7);g.stroke();g.globalAlpha=1;};
      const text=(s,x,y,color='#d7e3d4')=>{g.font='12px "Microsoft YaHei"';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#172229';g.strokeText(s,x,y);g.fillStyle=color;g.fillText(s,x,y);};
      this.commandPaths=[];
      this.rangeOverlays=root.WarRanges?.collect(game,ui,this)||[];root.WarRanges?.draw(g,this,this.rangeOverlays);
      for(const ore of game.ore||[])if(!ui.demo&&game.visibleAt(ore.x,ore.y)){const p=this.toScreen(ore.x,ore.y);text('矿山 '+(ore.id+1)+' · '+(ore.amount>0?Math.ceil(ore.amount/1000)+'k':'已采空'),p.x,p.y+45,'#d9cd9a');}
      for(const n of game.nodes){const p=this.toScreen(n.x,n.y,48),color=n.owner<0?'#e5d5a6':n.owner===0?'#94d6d4':'#e59a7e';ring(n.x,n.y,65,color,1.4,.6);text(String.fromCharCode(65+n.id)+'  '+(n.owner<0?'补给据点':F[game.teams[n.owner].faction].name),p.x,p.y,color);if(n.progress>0){g.fillStyle='#0f2126';g.fillRect(p.x-24,p.y+6,48,4);g.fillStyle=color;g.fillRect(p.x-24,p.y+6,48*n.progress/7,4);}}
      for(const e of game.entities){const o=this.objects.get(e.id);if(!o?.visible)continue;const p=this.entityScreen(e),selected=ui.selection?.has(e.id),color=e.team===0?'#a7e0d1':'#e89978';if(U[e.kind]?.underwater)text('▽ 水下 '+Math.round(-this.physicalHeight(e)),p.x,p.y-25,color);if(U[e.kind]?.space)text('◇ 轨道 '+Math.round(this.physicalHeight(e)*.1)+' km',p.x,p.y-30,color);
        if(selected||ui.hover===e.id)ring(e.x,e.y,e.r+7,color,selected?2:1);
        if(!ui.demo&&(selected||e.hp<e.maxHp||ui.hover===e.id)){const yy=p.y-(e.structure?28:16)*Math.min(2,this.camera.zoom)-10;g.fillStyle='#112126dd';g.fillRect(p.x-23,yy,46,5);g.fillStyle=e.hp/e.maxHp>.35?'#9cceb0':'#ed9b6b';g.fillRect(p.x-22,yy+1,44*e.hp/e.maxHp,3);}
        if(selected&&e.order&&this.commandPaths.length<32){
          const path=e.path?.length?e.path:[e.order],queued=e.orderQueue||[],known=!!e.path?.length;
          this.commandPaths.push({id:e.id,known,activePoints:path.length,queuedPoints:queued.length});
          g.strokeStyle=known?'#9edbd4bb':'#d1dcc688';g.lineWidth=1.5;g.setLineDash(known?[]:[5,7]);g.beginPath();g.moveTo(p.x,p.y);
          for(const v of path){const q=this.toScreen(v.x,v.y);g.lineTo(q.x,q.y);}g.stroke();
          ring(e.order.x,e.order.y,8,color,1);const end=this.toScreen(e.order.x,e.order.y);g.strokeStyle='#e4bf78aa';g.setLineDash([3,7]);g.beginPath();g.moveTo(end.x,end.y);
          for(const v of queued){const q=this.toScreen(v.x,v.y);g.lineTo(q.x,q.y);}g.stroke();g.setLineDash([]);
          queued.forEach((v,i)=>{const q=this.toScreen(v.x,v.y);ring(v.x,v.y,9,'#e4bf78',1);text(String(i+2),q.x,q.y-13,'#e4bf78');});
        }
        if(selected&&e.rally){const q=this.toScreen(e.rally.x,e.rally.y);g.strokeStyle='#a4d8df';g.setLineDash([4,5]);g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.stroke();g.setLineDash([]);text('集结',q.x,q.y);}
        if(e.kind==='harvester'&&(selected||e.cargo>0)){text(Math.floor(e.cargo)+'/500',p.x,p.y+16,'#e1d39d');}
        if(e.order&&!e.structure&&!U[e.kind]?.air&&!U[e.kind]?.naval&&Math.sin(time*8+e.id)>.1){const a=this.toScreen(e.x-Math.cos(e.angle)*25,e.y-Math.sin(e.angle)*25,3);g.fillStyle='#c2b38c22';g.beginPath();g.ellipse(a.x,a.y,12*this.camera.zoom,5*this.camera.zoom,0,0,7);g.fill();}
      }
      for(const fx of game.effects){const p=this.toScreen(fx.x,fx.y,fx.height||0),t=clamp(1-fx.ttl/fx.max,0,1);
        if(!ui.demo&&!game.visibleAt(fx.x,fx.y)&&!['nuke','orbital'].includes(fx.type))continue;
        if(fx.type==='shot'){
          const target=game.get(fx.target),end=this.toScreen(fx.tx,fx.ty,fx.targetHeight??(target?this.physicalHeight(target):0));
          if(!fx.visualOrigin){const anchor=this.objects.get(fx.sourceId)?.getObjectByName('muzzle');if(anchor){const pos=anchor.getWorldPosition(new T.Vector3());const source=game.get(fx.sourceId);fx.visualOrigin=[pos.x,pos.z,pos.y+(source?this.physicalHeight(source)-this.entityHeight(source):0)];}}
          const start=fx.visualOrigin?this.toScreen(...fx.visualOrigin):this.toScreen(fx.x,fx.y,fx.sourceHeight??(fx.space?145:9));
          const beam=fx.weaponFx==='orbital-beam'||fx.weaponFx==='laser-beam',imperial=game.teams[fx.from]?.faction==='imp';
          if(beam){
            const color=imperial?'#edc989':fx.space?'#8fd5ef':'#dfb797';
            // Visible charge halo followed by a short continuous strike, not a falling bullet.
            g.save();g.strokeStyle=color;g.shadowColor=color;g.shadowBlur=14;g.lineWidth=2;g.beginPath();g.arc(start.x,start.y,3+Math.sin(Math.min(1,t/.28)*Math.PI/2)*5,0,7);g.stroke();
            if(t>.28){g.globalAlpha=Math.sin((t-.28)/.72*Math.PI)*.8+.2;g.lineWidth=fx.space?5:2.5;g.beginPath();g.moveTo(start.x,start.y);g.lineTo(end.x,end.y);g.stroke();g.shadowBlur=0;g.strokeStyle='#f1f7ef';g.lineWidth=1;g.stroke();}g.restore();
          }else{
            const burst=fx.weaponFx==='interceptor-burst',asat=fx.weaponFx==='asat-missile',count=burst?3:1;
            for(let n=0;n<count;n++){const u=Math.max(0,t-n*.11),x=start.x+(end.x-start.x)*u,y=start.y+(end.y-start.y)*u-Math.sin(u*Math.PI)*(fx.weaponFx==='torpedo'?0:asat?65:fx.rocket?40:8);g.strokeStyle=fx.weaponFx==='torpedo'?'#b8e1df':burst?'#a9dbf6':asat?'#ffe4b5':'#ffdba0';g.lineWidth=burst?2.6:1.8;g.beginPath();g.moveTo(x,y);g.lineTo(x-(end.x-start.x)*.045,y-(end.y-start.y)*.045);g.stroke();if(asat){g.strokeStyle='#c9c3ae66';g.lineWidth=3;g.beginPath();g.moveTo(start.x,start.y);g.quadraticCurveTo((start.x+x)/2,(start.y+y)/2-40*u,x,y);g.stroke();}}
            if(t<.2){g.fillStyle='#fff1bc';g.beginPath();g.arc(start.x,start.y,4,0,7);g.fill();}
          }
        }else if(['nuke','bunker','strike','orbital'].includes(fx.type)){ring(fx.x,fx.y,fx.r,'#f19b76',2,.6+.4*Math.sin(time*12));text((fx.type==='nuke'?'核打击':'打击倒计时')+' '+fx.ttl.toFixed(1),p.x,p.y-20,'#ffd0a0');}
        else if(['impact','explosion','nuclear','lance'].includes(fx.type)){
          const r=(fx.r||30)*this.camera.zoom*(.2+t*.9),grad=g.createRadialGradient(p.x,p.y,0,p.x,p.y,r);grad.addColorStop(0,'#fff4c9');grad.addColorStop(.25,'#e6a853aa');grad.addColorStop(.65,'#856c4844');grad.addColorStop(1,'#42382d00');g.globalAlpha=1-t;g.fillStyle=grad;g.beginPath();g.arc(p.x,p.y,r,0,7);g.fill();g.globalAlpha=1;if(!fx.height)ring(fx.x,fx.y,(fx.r||25)*t*1.3,'#ead3ac',2,1-t);
          if(fx.type==='lance'){g.strokeStyle='#c4e5ff';g.lineWidth=5*(1-t);g.beginPath();g.moveTo(p.x,p.y-600);g.lineTo(p.x,p.y);g.stroke();}
        }else ring(fx.x,fx.y,12+t*25,fx.attack?'#eeb195':'#b6dfca',2,1-t);
      }
      for(const b of game.teams[0].buildQueue){ring(b.x,b.y,B[b.kind].r+4,'#b2d1ad',2);const p=this.toScreen(b.x,b.y);text('建造 '+Math.round((1-b.remaining/b.total)*100)+'%',p.x,p.y);}
      if(ui.mode){const p=this.toWorld(ui.pointer.x,ui.pointer.y),good=!B[ui.mode]||game.canBuild(0,ui.mode,p.x,p.y);ring(p.x,p.y,B[ui.mode]?.r||D.ABILITIES[ui.mode]?.radius||20,good?'#d6e7b2':'#ff8c71',2);}
      if(ui.drag){g.fillStyle='#abd1c41c';g.strokeStyle='#b1d6c9';g.lineWidth=1;g.fillRect(ui.drag.x,ui.drag.y,ui.pointer.x-ui.drag.x,ui.pointer.y-ui.drag.y);g.strokeRect(ui.drag.x,ui.drag.y,ui.pointer.x-ui.drag.x,ui.pointer.y-ui.drag.y);}
      if(!ui.demo)this.drawMinimap(game);
    }
    drawMinimap(game,targetCanvas=this.mini){
      const c=targetCanvas===this.mini?this.mc:targetCanvas.getContext('2d'),w=targetCanvas.width,h=targetCanvas.height;
      c.clearRect(0,0,w,h);c.drawImage(this.miniTerrain,0,0,w,h);c.drawImage(this.fogCanvas,0,0,w,h);
      for(const n of game.nodes){c.fillStyle=n.owner<0?'#e1d5ad':n.owner===0?'#94d7c8':'#e89978';c.fillRect(n.x/W*w-2,n.y/H*h-2,4,4);}
      for(const e of game.entities){if(e.hp<=0||(e.team!==0&&!(U[e.kind]?.underwater?game.canDetect(0,e):game.visibleAt(e.x,e.y))))continue;c.fillStyle=e.team===0?'#b5e7d7':'#f1a38a';const r=e.structure?3:1.5;c.fillRect(e.x/W*w-r,e.y/H*h-r,r*2,r*2);}
      if(this.firstPerson?.active){
        const actor=game.get(this.firstPerson.entityId);if(!actor)return;
        const yaw=U[actor.kind]?.air&&!U[actor.kind]?.space?actor.angle:this.firstPerson.yaw;
        c.save();c.translate(actor.x/W*w,actor.y/H*h);c.rotate(yaw);
        c.fillStyle='#ffe39a';c.strokeStyle='#152a31';c.lineWidth=1.5;
        c.beginPath();c.moveTo(9,0);c.lineTo(-5,-5);c.lineTo(-2,0);c.lineTo(-5,5);c.closePath();c.fill();c.stroke();c.restore();
      }else{const a=this.toWorld(0,70),b=this.toWorld(this.width-230,this.height-140);c.strokeStyle='#f0e4b9';c.strokeRect(a.x/W*w,a.y/H*h,(b.x-a.x)/W*w,(b.y-a.y)/H*h);}
    }
  }
  root.WarRenderer2D=Legacy;
  root.WarRenderer=function(canvas,mini){try{return new Battle3D(canvas,mini);}catch(e){console.warn('三维渲染不可用，启用兼容画面',e);document.querySelector('#battle-overlay')?.remove();const replacement=canvas.cloneNode();canvas.replaceWith(replacement);return new Legacy(replacement,mini);}};
  root.Battle3D=Battle3D;
})(globalThis);
