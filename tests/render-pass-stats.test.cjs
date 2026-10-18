const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');
for(const file of ['data','fps-viewmodel','direct-control','battle3d'])require('../src/'+file);

// Exercise the real world/overlay/view render chain without creating a GPU context.
// The renderer double mirrors this bundled Three's per-render counter reset/frame increment.
function fixture(){
 const r=Object.create(Battle3D.prototype),scene=new THREE.Scene(),viewScene=new THREE.Scene();
 const gl={autoClear:true,info:{render:{frame:0,calls:0,triangles:0},memory:{geometries:9}},clearDepth(){},render(s){const n=this.info.render;n.frame++;n.calls=s===scene?137:7;n.triangles=s===scene?12000:800;}};
 Object.assign(r,{scene,gl,cam:new THREE.PerspectiveCamera(),ctx:{setTransform(){},clearRect(){}},dpr:1,width:800,height:600,camera:{x:0,y:0},sun:new THREE.DirectionalLight(),hemi:new THREE.HemisphereLight(),objects:new Map(),syncCamera(){},updateFog(){},drawMinimap(){}});
 const view=Object.assign(Object.create(WarFPSView.prototype),{renderer:gl,viewScene,viewCamera:new THREE.PerspectiveCamera(),width:800,height:600});
 const fp=Object.assign(Object.create(WarDirectControl.prototype),{active:true,r,view,camera:r.cam,eye:new THREE.Vector3(),scoped:false,opticalActive(){return this.scoped;}});r.firstPerson=fp;
 const game={entities:[],effects:[],nodes:[],teams:[{buildQueue:[]}],visibleAt(){return true;}};
 return{r,fp,view,draw(){r.draw(game,{},0);return r.stats;}};
}
test('ordinary FPS sums one world pass and one actual foreground pass',()=>{
 const f=fixture(),s=f.draw();assert.equal(s.calls,144);assert.equal(s.triangles,12800);assert.equal(s.foregroundCalls,7);assert.equal(s.foregroundTriangles,800);assert.equal(f.r.gl.info.render.frame,2);assert.equal(f.r.gl.autoClear,true);
});
test('optical aiming retains only world statistics while the view object still exists',()=>{
 const f=fixture();f.fp.scoped=true;const s=f.draw();assert.equal(s.calls,137);assert.equal(s.triangles,12000);assert.equal(s.foregroundCalls,0);assert.equal(s.foregroundTriangles,0);assert.equal(f.r.gl.info.render.frame,1);
});
test('a disposed foreground view does not duplicate world statistics',()=>{
 const f=fixture();f.view.disposed=true;const s=f.draw();assert.equal(s.calls,137);assert.equal(s.triangles,12000);assert.equal(s.foregroundCalls,0);assert.equal(s.foregroundTriangles,0);
});
test('a clearDepth-only overlay is not mistaken for a new render pass',()=>{
 const f=fixture();f.fp.scoped=true;const overlay=f.fp.drawOverlay;f.fp.drawOverlay=function(...args){this.r.gl.clearDepth();overlay.apply(this,args);};const s=f.draw();assert.equal(s.calls,137);assert.equal(s.triangles,12000);assert.equal(s.foregroundCalls,0);assert.equal(f.r.gl.info.render.frame,1);
});
test('FPS without a foreground view retains only the world pass',()=>{
 const f=fixture();f.fp.view=null;const s=f.draw();assert.equal(s.calls,137);assert.equal(s.triangles,12000);assert.equal(s.foregroundCalls,0);assert.equal(s.foregroundTriangles,0);
});
test('RTS with no first-person controller reports one world pass and zero foreground',()=>{
 const f=fixture();f.r.firstPerson=null;const s=f.draw();assert.equal(s.calls,137);assert.equal(s.triangles,12000);assert.equal(s.foregroundCalls,0);assert.equal(s.foregroundTriangles,0);
});
test('scope and RTS transitions cannot carry stale foreground counts across draws',()=>{
 const f=fixture();assert.equal(f.draw().calls,144);f.fp.scoped=true;assert.equal(f.draw().calls,137);f.fp.scoped=false;assert.equal(f.draw().calls,144);f.fp.active=false;const s=f.draw();assert.equal(s.calls,137);assert.equal(s.foregroundCalls,0);assert.equal(s.foregroundTriangles,0);assert.equal(f.r.gl.info.render.frame,6);
});
