const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../assets/vendor/three.min.js'),context={THREE:T,WarData:{U:{}}};context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../src/direct-control.js'),'utf8'),context);
function fixture(){
 const camera=new T.PerspectiveCamera(70,1.6,.08,10000);camera.lookAt(0,0,-1);camera.updateMatrixWorld(true);
 const lines=[],ctx={globalAlpha:1,save(){},restore(){},beginPath(){},moveTo(x,y){this.start={x,y};},lineTo(x,y){this.end={x,y};},stroke(){lines.push({a:this.start,b:this.end});}};
 const r={width:1600,height:1000,ctx,toScreen(x,y,h=0){const p=new T.Vector3(x,h,y).project(camera);return p.z< -1||p.z>1?{x:Infinity,y:Infinity}:{x:(p.x+1)*800,y:(1-p.y)*500};}};
 const d=Object.create(context.WarDirectControl.prototype);Object.assign(d,{camera,r,entityId:1,eye:camera.position,opticalActive:()=>true});
 const shot={type:'shot',sourceId:1,x:1,y:-10,sourceHeight:-1,tx:12,ty:-110,targetHeight:8,ttl:.5,max:1,weaponFx:'projectile'};
 const g={effects:[shot],visibleAt:()=>true};return{d,r,camera,shot,g,lines,draw(){lines.length=0;d.drawOverlay(g,0);return lines;}};
}
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} vs ${expected}`);
test('first-person tracer head is the projection of its actual world position, for own and other shots',()=>{
 const f=fixture();for(const sourceId of [1,2])for(const t of [.08,.3,.7,.97]){f.shot.sourceId=sourceId;f.shot.ttl=1-t;const expected=f.r.toScreen(1+11*t,-10-100*t,-1+9*t),lines=f.draw();assert.ok(lines.length);near(lines[0].a.x,expected.x,'world head x');near(lines[0].a.y,expected.y,'world head y');}
});
test('turning or translating the camera reprojects the existing world path without reattaching it to the gun',()=>{
 const f=fixture();for(const x of [-4,0,8]){f.camera.position.set(x,2,3);f.camera.lookAt(3,0,-100);f.camera.updateMatrixWorld(true);const expected=f.r.toScreen(6.5,-60,3.5),lines=f.draw();assert.ok(lines.length);near(lines[0].a.x,expected.x,'moved camera head x');near(lines[0].a.y,expected.y,'moved camera head y');}
});
test('visible mid-flight tracer survives when its distant endpoint is outside the current camera far plane',()=>{
 const f=fixture();f.camera.far=90;f.camera.updateProjectionMatrix();assert.ok(f.draw().length,'mid-flight head at z=-60 remains visible although endpoint is z=-110');
});
test('segments crossing the near plane or viewport edge are clipped to finite visible coordinates',()=>{
 const f=fixture();assert.equal(typeof f.d.projectEffectSegment,'function');
 for(const [a,b]of [[new T.Vector3(-.02,0,1),new T.Vector3(.2,0,-3)],[new T.Vector3(0,0,-10),new T.Vector3(100,0,-10)],[new T.Vector3(0,-100,-10),new T.Vector3(0,100,-10)]]){
  const segment=f.d.projectEffectSegment(a,b);assert.ok(segment);for(const p of segment){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x>=-1e-6&&p.x<=1600+1e-6&&p.y>=-1e-6&&p.y<=1000+1e-6);}
 }
 assert.equal(f.d.projectEffectSegment(new T.Vector3(0,0,1),new T.Vector3(1,0,2)),null);
 assert.equal(f.d.projectEffectSegment(new T.Vector3(NaN,0,0),new T.Vector3(0,0,-1)),null);
 for(const x of [-1e308,0,1e308])for(const y of [-1e308,0,1e308]){const segment=f.d.projectEffectSegment(new T.Vector3(x,y,-1e308),new T.Vector3(-x,-y,-1));if(segment)for(const p of segment)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=-1e-6&&p.x<=1600+1e-6&&p.y>=-1e-6&&p.y<=1000+1e-6);}
});
test('laser and orbital beam effects draw a continuous world segment; zero-age bullets have no backwards trail',()=>{
 const f=fixture();for(const type of ['laser-beam','orbital-beam']){f.shot.weaponFx=type;f.shot.ttl=.2;const lines=f.draw(),expected=f.r.toScreen(f.shot.tx,f.shot.ty,f.shot.targetHeight);assert.ok(lines.some(l=>Math.abs(l.a.x-expected.x)<1e-7&&Math.abs(l.a.y-expected.y)<1e-7||Math.abs(l.b.x-expected.x)<1e-7&&Math.abs(l.b.y-expected.y)<1e-7),'continuous beam reaches endpoint');}
 f.shot.weaponFx='projectile';f.shot.ttl=1;assert.equal(f.draw().length,0);
});
