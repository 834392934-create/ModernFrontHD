/* Offline original orbital backdrop: decorative geography, not a real Earth map. */
(function(root){
 'use strict';
 const T=root.THREE,D=root.WarData,clamp=T.MathUtils.clamp;
 const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
 const mix=(a,b,t)=>a+(b-a)*t;
 // Continuous 3D value noise is sampled on a sphere, so the longitude seam closes.
 function hash(x,y,z){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
 function noise(x,y,z){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);x-=ix;y-=iy;z-=iz;
  x=x*x*(3-2*x);y=y*y*(3-2*y);z=z*z*(3-2*z);
  return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),x),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),x),y),
   mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),x),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),x),y),z);
 }
 function surface(x,y,z,out){
  const broad=noise(x*2.1+12,y*2.1+7,z*2.1-4),mid=noise(x*4.8-9,y*4.8+13,z*4.8+8);
  const detail=noise(x*12+21,y*12-6,z*12+5),coast=noise(x*31-4,y*31+18,z*31-11);
  const elevation=.62*broad+.25*mid+.09*detail+.04*coast-.53;
  const shelf=smooth(-.09,0,elevation),land=smooth(-.004,.008,elevation);
  const moisture=noise(x*6+31,y*6-17,z*6+4),dry=clamp((.57-moisture)*2.8,0,1);
  const mountain=smooth(.63,.88,detail)*smooth(.015,.16,elevation),ice=smooth(.91,.985,Math.abs(y));
  const ocean=[mix(14,37,shelf),mix(44,86,shelf),mix(66,98,shelf)];
  const vegetation=[mix(62,129,dry),mix(89,119,dry),mix(68,83,dry)];
  for(let i=0;i<3;i++){
   const ridge=mix(vegetation[i],[119,115,106][i],mountain*.72);
   out[i]=mix(mix(ocean[i],ridge,land),[193,210,217][i],ice*.88);
  }
 }
 function cloudDensity(x,y,z){
  const bend=Math.sin(x*4+z*2)*.18,wind=y+bend;
  const broad=noise(x*5+19,wind*8-4,z*5+7),filament=noise(x*20-3,wind*38+2,z*20+11),fine=noise(x*53+7,y*53+23,z*53-6);
  return smooth(.48,.72,.58*broad+.29*filament+.13*fine)*(.5+.5*smooth(-.6,.65,Math.sin(wind*17+x*3)));
 }
 function makeTextures(){
  const width=1024,height=512,ground=document.createElement('canvas'),cloud=document.createElement('canvas');
  ground.width=cloud.width=width;ground.height=cloud.height=height;
  const gc=ground.getContext('2d'),cc=cloud.getContext('2d'),gi=gc.createImageData(width,height),ci=cc.createImageData(width,height);
  const cosine=new Float32Array(width),sine=new Float32Array(width),color=[0,0,0];
  for(let x=0;x<width;x++){const a=x/(width-1)*Math.PI*2;cosine[x]=Math.cos(a);sine[x]=Math.sin(a);}
  for(let row=0;row<height;row++){
   const theta=row/(height-1)*Math.PI,sy=Math.cos(theta),ring=Math.sin(theta);
   for(let col=0;col<width;col++){
    const sx=-cosine[col]*ring,sz=sine[col]*ring,i=(row*width+col)*4;surface(sx,sy,sz,color);
    gi.data[i]=color[0];gi.data[i+1]=color[1];gi.data[i+2]=color[2];gi.data[i+3]=255;
    ci.data[i]=225;ci.data[i+1]=237;ci.data[i+2]=241;ci.data[i+3]=Math.round(cloudDensity(sx,sy,sz)*205);
   }
  }
  gc.putImageData(gi,0,0);cc.putImageData(ci,0,0);
  const texture=new T.CanvasTexture(ground),cloudTexture=new T.CanvasTexture(cloud);
  for(const t of [texture,cloudTexture]){t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;t.anisotropy=2;}
  return {texture,cloudTexture};
 }
 function makePerimeter(earth){
  // A hollow collar only outside the playable rectangle. Nine rings / 2,048 triangles.
  // The first rim meets the map's outer water at y=-0.8; the outer rim joins the sphere.
  const margins=[0,120,300,600,1000,1700,2500,3800,5200],segments=128,perSide=segments/4;
  const positions=[],colors=[],indices=[],halfW=D.W/2,halfH=D.H/2,R=24000,color=[0,0,0];
  const inverse=earth.quaternion.clone().invert(),normal=new T.Vector3(),linear=new T.Color();
  for(let ring=0;ring<margins.length;ring++){
   const margin=margins[ring],blend=smooth(0,2500,margin);
   for(let i=0;i<segments;i++){
    const side=Math.floor(i/perSide),f=(i%perSide)/perSide;
    const bx=side===0?-halfW+f*D.W:side===1?halfW:side===2?halfW-f*D.W:-halfW;
    const bz=side===0?-halfH:side===1?-halfH+f*D.H:side===2?halfH:halfH-f*D.H;
    const x=bx*(halfW+margin)/halfW,z=bz*(halfH+margin)/halfH;
    const sphereY=earth.position.y+Math.sqrt(Math.max(0,R*R-x*x-z*z));
    positions.push(halfW+x,mix(-.8,sphereY+2,blend),halfH+z);
    normal.set(x,sphereY-earth.position.y,z).normalize().applyQuaternion(inverse);surface(normal.x,normal.y,normal.z,color);
    // Match outer-ocean teal first, then the exact same procedural planetary sample.
    const tint=smooth(100,2200,margin);linear.setRGB(mix(49,color[0],tint)/255,mix(94,color[1],tint)/255,mix(104,color[2],tint)/255,T.SRGBColorSpace);
    colors.push(linear.r,linear.g,linear.b);
    if(ring<margins.length-1){const a=ring*segments+i,b=ring*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c);}
   }
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0,transparent:true,depthWrite:true});
  const mesh=new T.Mesh(geometry,material);mesh.name='orbital-ocean-transition';mesh.userData={decorative:true,playableInteriorExcluded:true,triangleCount:indices.length/3};mesh.raycast=()=>{};
  return mesh;
 }
 root.WarAltitudeScene={create(r){
  const group=new T.Group();group.name='high-altitude-backdrop';r.scene.add(group);group.visible=false;
  const {texture,cloudTexture}=makeTextures(),rnd=root.WarSim.rng(18325);
  const earthMat=new T.MeshStandardMaterial({map:texture,roughness:1,metalness:0,transparent:true});
  const earth=new T.Mesh(new T.SphereGeometry(24000,96,64),earthMat);earth.name='procedural-orbital-planet';earth.position.set(D.W/2,-24300,D.H/2);earth.rotation.set(.35,.55,-.45);group.add(earth);
  const perimeter=makePerimeter(earth);group.add(perimeter);
  const cloudMat=new T.MeshStandardMaterial({map:cloudTexture,transparent:true,opacity:.48,depthWrite:false,roughness:1});
  const clouds=new T.Mesh(new T.SphereGeometry(24070,96,64),cloudMat);clouds.name='procedural-cloud-bands';clouds.position.copy(earth.position);clouds.rotation.copy(earth.rotation);group.add(clouds);
  const atmosphereMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,uniforms:{fade:{value:1}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform float fade;varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),4.);gl_FragColor=vec4(.12,.45,.85,rim*.48*fade);}'});
  const atmosphere=new T.Mesh(new T.SphereGeometry(24220,96,64),atmosphereMat);atmosphere.position.copy(earth.position);group.add(atmosphere);
  const points=[];for(let i=0;i<1500;i++){const y=rnd()*2-1,a=rnd()*Math.PI*2,k=Math.sqrt(1-y*y);points.push(Math.cos(a)*k*26000,y*26000,Math.sin(a)*k*26000);}
  const starGeo=new T.BufferGeometry();starGeo.setAttribute('position',new T.Float32BufferAttribute(points,3));
  const starMat=new T.PointsMaterial({color:0xc7d9ef,size:1.6,sizeAttenuation:false,transparent:true,depthWrite:false}),stars=new T.Points(starGeo,starMat);stars.name='orbital-stars';group.add(stars);
  group.traverse(o=>{if(o.isMesh||o.isPoints){o.raycast=()=>{};o.userData.decorative=true;}});
  const sky=new T.Color(),night=new T.Color(0x01040b),fog=new T.FogExp2(0x9eb9c9,.0003);
  return {group,update(d,e,time){
   const h=e?.altitude||0,active=!!d?.active&&!!D.U[e?.kind]?.air&&h>700;group.visible=active;if(!active)return;
   const blend=clamp((h-700)/1500,0,1);earthMat.opacity=blend;perimeter.material.opacity=blend;cloudMat.opacity=.48*blend;atmosphereMat.uniforms.fade.value=blend;
   starMat.opacity=clamp((h-1400)/1800,0,1);stars.position.copy(d.camera.position);clouds.rotation.y=.55+time*.0004;
   sky.set(0x6293ac).lerp(night,blend);r.scene.background=sky;fog.density=.00025*(1-blend);r.scene.fog=blend>.98?null:fog;
  }};
 }};
})(globalThis);
