const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
global.THREE=require('../assets/vendor/three.min.js');for(const file of ['models3d','model-detail','models-operator','personnel-animation'])require('../src/'+file);
const T=THREE,A=WarPersonnelAnimation,repo=path.resolve(__dirname,'..');
// Pinned pre-optimization repository implementation, not a rewritten oracle.
// Its byte-for-byte snapshot ships with the tests, including shallow clones and archives.
const BASELINE='2de5cd59e2cae1b066393e0f175a40c59464df47';
const oldSource=fs.readFileSync(path.join(__dirname,'fixtures/baselines/personnel-animation.pre-pose-cache.js'),'utf8');
const context=vm.createContext({THREE:T,WarModels:{colors:WarModels.colors,register(){}},WarDetail,WarOperatorModel});vm.runInContext(oldSource,context,{filename:'baseline-personnel-animation.js'});const old=context.WarPersonnelAnimation;
function fixture(api=A,kind='infantry',faction='chn'){
 const model=WarModels.create(kind,faction),e={kind,x:120,y:140,angle:0,jumpHeight:0};model.scale.setScalar(model.userData.scale);let time=0;
 function update(dt=1/60,dx=0,dy=0,angle=e.angle,jump=e.jumpHeight){time+=dt;e.x+=dx;e.y+=dy;e.angle=angle;e.jumpHeight=jump;model.position.set(e.x,jump,e.y);model.rotation.set(0,-angle,0,'YZX');const state=api.update(model,e,time);return state;}
 update(0);return{model,e,update,api};
}
function pose(f,excludeReboundMedicalArm=false){
 // Emulate the scene world-matrix and skeleton uploads that real Three performs
 // after the animation callback, including parent motion on cached idle frames.
 f.model.updateMatrixWorld(true);const s=f.api.state(f.model),out=[s.phase,s.distance,s.settle,s.teleports,Number(s.moving),Number(s.jumping)];
 for(const p of s.people){p.skeleton.update();for(const [i,b]of p.bones.entries()){if(excludeReboundMedicalArm&&i>=7&&i<=9)continue;out.push(...b.position.toArray(),...b.quaternion.toArray(),...b.matrixWorld.elements);}for(const foot of p.feet)out.push(...foot.target.toArray(),...foot.world.toArray(),...foot.start.toArray(),foot.phase,Number(foot.stance),Number(foot.planted));for(let i=0;i<p.skeleton.boneMatrices.length;i++){if(excludeReboundMedicalArm&&i>=7*16&&i<10*16)continue;out.push(p.skeleton.boneMatrices[i]);}}return out;
}
function measured(work){
 const clone=T.Vector3.prototype.clone,solve=T.Quaternion.prototype.setFromUnitVectors;let vectorClones=0,ikRotations=0;
 T.Vector3.prototype.clone=function(){vectorClones++;return clone.call(this);};T.Quaternion.prototype.setFromUnitVectors=function(...args){ikRotations++;return solve.apply(this,args);};const start=performance.now();try{work();return{milliseconds:performance.now()-start,vectorClones,ikRotations};}finally{T.Vector3.prototype.clone=clone;T.Quaternion.prototype.setFromUnitVectors=solve;}
}
test('48 variants preserve pre-cache locomotion; newly rebound medic left arm has its own anatomical regression',t=>{
 const trajectory=[];const add=(n,...step)=>{for(let i=0;i<n;i++)trajectory.push(step);};
 add(10,1/60,0,0,0,0);add(30,1/60,.35,0,0,0);add(18,1/30,0,.4,.7,0);add(15,1/60,-.7,0,1.2,0);add(8,1/60,.2,.15,1.2,4);add(4,0,0,0,1.2,4);add(18,1/60,.25,-.1,.3,0);add(30,1/60,0,0,.3,0);add(4,1/60,0,0,1.8,0);add(8,1/60,0,0,1.8,0);
 trajectory.push([-.7,0,0,1.8,0],[1/60,0,0,1.8,0],[.8,0,0,1.8,0],[1/60,0,0,1.8,0],[1/60,2000,-500,2.3,0]);add(10,1/60,0,0,2.3,0);add(15,1/60,0,.6,-.5,0);add(24,1/60,0,0,-.5,0);
 let maxError=0,comparisons=0;
 for(const kind of A.roles)for(const faction of Object.keys(WarModels.colors)){
  const a=fixture(A,kind,faction),b=fixture(old,kind,faction);
  // The new unarmed left forearm intentionally has the same length as its right
  // counterpart. Its real joint positions are checked in personnel-combat-pose;
  // compare every other joint, both feet and the complete gait against history.
  for(const [stepIndex,step]of trajectory.entries()){a.update(...step);b.update(...step);const av=pose(a,kind==='field_medic'),bv=pose(b,kind==='field_medic');assert.equal(av.length,bv.length);for(let i=0;i<av.length;i++){const error=Math.abs(av[i]-bv[i]);maxError=Math.max(maxError,error);assert.ok(error<1e-6,`${kind}_${faction} step ${stepIndex} value ${i}: ${av[i]} vs ${bv[i]}`);comparisons++;}}
  A.release(a.model);old.release(b.model);
 }
 t.diagnostic(JSON.stringify({baseline:BASELINE,variants:48,trajectoryFrames:trajectory.length,comparisons,maxError,includes:'local bones, world bone matrices, uploaded skeleton matrices, foot target/world/start, gait state'}));
});
test('medic establishes its distinct rest pose before idle cache and performs no repeated IK',()=>{
 const f=fixture(A,'field_medic'),before=pose(f);assert.equal(A.state(f.model).poseStable,false);const first=measured(()=>f.update());assert.equal(first.ikRotations,8);const resting=pose(f);assert.notDeepEqual(resting,before);assert.equal(A.state(f.model).poseStable,true);
 const idle=measured(()=>{for(let i=0;i<90;i++)f.update();});assert.equal(idle.vectorClones,0);assert.equal(idle.ikRotations,0);assert.deepEqual(pose(f),resting);
 const rotation=measured(()=>f.update(1/60,0,0,.8));assert.equal(rotation.ikRotations,8);assert.notDeepEqual(pose(f),resting);assert.equal(A.state(f.model).poseAngle,.8);
});
test('cache leaves pause frozen and invalidates movement, jump, rewind, gap and teleport',()=>{
 const f=fixture();f.update();assert.equal(A.state(f.model).poseStable,true);const before=pose(f),state=A.state(f.model);
 assert.equal(measured(()=>f.update(0)).ikRotations,0);assert.deepEqual(pose(f),before);
 assert.equal(measured(()=>f.update(1/60,.2,.15)).ikRotations,8);assert.equal(state.poseStable,false);const phase=state.phase;
 f.update(1/60,0,0,0,3);assert.equal(state.jumping,true);assert.equal(state.phase,phase);f.update(1/60,0,0,0,0);for(let i=0;i<20;i++)f.update();assert.equal(state.poseStable,true);
 for(const args of [[-.5,0,0],[.7,0,0],[1/60,500,100]]){const count=state.teleports;f.update(...args);assert.equal(state.teleports,count+1);assert.equal(state.poseStable,false);assert.equal(measured(()=>f.update()).ikRotations,8);assert.equal(state.poseStable,true);}
});
test('release and reuse rebuild exactly one independent rig without changing shared mesh assets',()=>{
 const legacy=fixture(old);legacy.update(1/60,.3);old.release(legacy.model);legacy.update();let legacyRigs=0;legacy.model.traverse(o=>{legacyRigs+=o.name==='personnelRig';});assert.equal(legacyRigs,2,'baseline evidence: reuse previously accumulated a disposed rig');old.release(legacy.model);
 const a=fixture(A,'field_medic'),b=fixture(A,'field_medic');a.update(1/60,.3);b.update();const first=A.state(a.model),other=A.state(b.model),body=a.model.getObjectByName('operatorBody'),geometry=body.geometry,material=body.material,marker=a.model.getObjectByName('servicePoint'),otherPose=pose(b);let disposed=0;
 first.people[0].skeleton.computeBoneTexture();first.people[0].skeleton.boneTexture.addEventListener('dispose',()=>disposed++);assert.equal(A.release(a.model),true);assert.equal(disposed,1);a.update();a.update();const rebuilt=A.state(a.model);let rigs=0,bones=0,skins=0;a.model.traverse(o=>{rigs+=o.name==='personnelRig';bones+=!!o.isBone;skins+=!!o.isSkinnedMesh;});
 assert.equal(rigs,1);assert.equal(bones,13);assert.equal(skins,2);assert.notEqual(rebuilt.people[0].skeleton,first.people[0].skeleton);assert.notEqual(rebuilt.people[0].skeleton,other.people[0].skeleton);assert.notEqual(rebuilt.scratch,other.scratch);assert.equal(a.model.getObjectByName('operatorBody').geometry,geometry);assert.equal(a.model.getObjectByName('operatorBody').material,material);assert.equal(a.model.getObjectByName('servicePoint'),marker);assert.equal(marker.parent,rebuilt.people[0].bones[0]);a.update(1/60,.3);assert.deepEqual(pose(b),otherPose);
});
test('2040-clone CPU update microbenchmark counts actual redundant work before and after',t=>{
 const count=2040,frames=20,factions=Object.keys(WarModels.colors),results={};
 for(const [label,api]of [['baseline',old],['optimized',A]]){
  const units=Array.from({length:count},(_,i)=>fixture(api,A.roles[i%A.roles.length],factions[Math.floor(i/A.roles.length)%factions.length]));
  for(const f of units)for(let i=0;i<3;i++)f.update(); // Warm each role's true stop pose.
  const idle=measured(()=>{for(let frame=0;frame<frames;frame++)for(const f of units)f.update();});
  const moving=measured(()=>{for(let frame=0;frame<5;frame++)for(const f of units)f.update(1/60,.35,.1);});
  results[label]={idle,moving};for(const f of units)api.release(f.model);
 }
 assert.ok(results.baseline.idle.vectorClones>0&&results.baseline.idle.ikRotations>0);assert.equal(results.optimized.idle.vectorClones,0);assert.equal(results.optimized.idle.ikRotations,0);assert.equal(results.optimized.moving.vectorClones,0);assert.equal(results.optimized.moving.ikRotations,results.baseline.moving.ikRotations);
 const report={recordedAt:new Date().toISOString(),baseline:BASELINE,node:process.version,cpu:os.cpus()[0]?.model,count,idleFrames:frames,movingFrames:5,variants:48,results,scope:'CPU animation update only, single measured batch per case, clone/IK wrappers active; excludes construction, rendering, GPU, scene matrix uploads, and full-game simulation. Timings are observations, not FPS gains or a timing test threshold.'};
 fs.mkdirSync(path.join(repo,'.tmp'),{recursive:true});fs.writeFileSync(path.join(repo,'.tmp/personnel-animation-cache-benchmark.json'),JSON.stringify(report,null,2));t.diagnostic(JSON.stringify(report));
});
