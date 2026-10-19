const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');require('../src/data.js');require('../src/battle3d.js');
const names=['turret','turretRear','radar','jammerHead','rotor','rotorCounter','rotor2','rotorCounter2','propeller','tailRotor'];
function model(withParts=true){const o=new THREE.Group();if(withParts)for(const name of names){const part=new THREE.Group();part.name=name;o.add(part);}let searches=0;const find=o.getObjectByName;o.getObjectByName=function(...a){searches++;return find.apply(this,a);};return{o,searches:()=>searches};}
function fixture(){
 const r=Object.assign(Object.create(Battle3D.prototype),{scene:new THREE.Scene(),gl:{info:{render:{frame:0,calls:1,triangles:10},memory:{geometries:1}},render(){this.info.render.frame++;}},ctx:{setTransform(){},clearRect(){}},dpr:1,width:800,height:600,camera:{x:0,y:0},sun:new THREE.DirectionalLight(),hemi:new THREE.HemisphereLight(),objects:new Map(),syncCamera(){},updateFog(){},drawMinimap(){},entityScreen(){throw Error('FPS must not compute unused RTS screen projections');}});
 r.firstPerson={active:true,entityId:99,eye:{y:0},drawOverlay(){}};
 const e={id:1,kind:'tank',team:0,x:30,y:40,hp:100,angle:.7,turret:.2,target:2},game={time:0,entities:[e],effects:[],nodes:[],teams:[{faction:'chn',buildQueue:[]}],visibleAt(){return true;}};
 function install(m){r.objects.set(e.id,m.o);r.scene.add(m.o);}const m=model();install(m);
 return{r,e,game,m,install,draw(time){r.draw(game,{},time);}};
}
test('FPS updates all animated parts without unused screen projections',()=>{
 const f=fixture();f.draw(2);for(const part of f.m.o.children){const value=part.rotation[part.name==='propeller'?'x':part.name==='tailRotor'?'z':'y'];const expected={turret:.5,turretRear:.5,radar:.9,jammerHead:.36,rotor:54,rotorCounter:-54,rotor2:54,rotorCounter2:-54,propeller:70,tailRotor:76}[part.name];assert.ok(Math.abs(value-expected)<1e-10,part.name);}
});
test('model part discovery is reused while turret and rotor angles continue updating',()=>{
 const f=fixture();f.r.entityScreen=()=>({x:0,y:0});f.draw(2);const initial=f.m.searches();assert.equal(initial,10);f.e.turret=.6;f.draw(3);assert.equal(f.m.searches(),initial);assert.ok(Math.abs(f.m.o.children[0].rotation.y-.1)<1e-10);assert.equal(f.m.o.children.find(p=>p.name==='rotor').rotation.y,81);
});
test('missing parts are cached and a replacement model gets its own discovery',()=>{
 const f=fixture();f.r.entityScreen=()=>({x:0,y:0});const empty=model(false);f.install(empty);f.draw(1);f.draw(2);assert.equal(empty.searches(),10);f.r.clearObjects();assert.equal(f.r.objects.size,0);const next=model();f.install(next);f.draw(3);assert.equal(next.searches(),10);assert.equal(next.o.children.find(p=>p.name==='tailRotor').rotation.z,114);
});
test('RTS still computes screen visibility and does not create offscreen objects',()=>{
 const f=fixture();f.r.firstPerson.active=false;let projections=0;f.r.entityScreen=()=>{projections++;return{x:10000,y:10000};};f.draw(1);assert.equal(projections,1);assert.equal(f.m.o.visible,false);assert.equal(f.m.searches(),0);
});
