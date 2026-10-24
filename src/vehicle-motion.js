(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 // Game-scale response constants, not claimed real vehicle specifications.
 const profiles={
  personnel:{accel:0,brake:0,turn:0,reverse:1},
  tracked:{accel:1.5,brake:3,turn:1.8,reverse:.5,pivot:true},
  wheeled:{accel:1.8,brake:3.5,turn:1.6,reverse:.4},
  surface:{accel:.65,brake:1.1,turn:.7,reverse:.3},
  submarine:{accel:.7,brake:1.2,turn:.65,reverse:.35},
  fixedWing:{accel:.7,brake:1.2,turn:.9,reverse:0},
  rotor:{accel:1.4,brake:2,turn:1.3,reverse:.6},
  space:{accel:1,brake:1.6,turn:1,reverse:.6},
 };
 function kind(e){const d=root.WarData.U[e.kind],base=d.modelKind||e.kind,faction=e.faction||e.motionFaction;if(base==='infantry')return 'personnel';if(d.space)return 'space';if(d.underwater)return 'submarine';if(d.naval)return 'surface';if(d.air)return base==='heli'?'rotor':'fixedWing';if(['recon_vehicle','tank_destroyer','mobile_radar'].includes(e.kind))return 'wheeled';if(e.kind==='aa')return ['usa','rus','ind'].includes(faction)?'wheeled':'tracked';return ['tank','ifv','arty'].includes(base)?'tracked':'wheeled';}
 function profile(e,faction){const type=kind(typeof e==='string'?{kind:e,faction}:e);return {kind:type,...profiles[type]};}
 function state(e){if(!e.motion)e.motion={kind:kind(e),signedSpeed:0,turnRate:0,steer:0,throttle:0,distance:0,travel:0,reverse:false,moving:false};return e.motion;}
 function stop(e){const m=state(e);m.signedSpeed=0;m.vx=0;m.vy=0;m.turnRate=0;m.steer=0;m.throttle=0;m.reverse=false;m.moving=false;e.flightSpeed=0;}
 function speed(game,e,throttle,dt,limit=Infinity){const p=profiles[kind(e)],m=state(e),max=game.effectiveSpeed(e),target=clamp(throttle,-1,1)*max*(throttle<0?p.reverse:1),old=m.signedSpeed||0;
  const braking=old*target<0||Math.abs(target)<Math.abs(old),step=max*(braking?p.brake:p.accel)*dt;
  // Braking must cross zero before a reversing command can accelerate backward.
  const desired=old*target<0?0:target,next=old+clamp(desired-old,-step,step);return clamp(next,-limit,limit);
 }
 function record(e,before,dt,throttle=0,steer=0,tick){if(!(dt>0))return;const m=state(e),dx=e.x-before.x,dy=e.y-before.y,travel=Math.hypot(dx,dy),sign=dx*Math.cos(e.angle)+dy*Math.sin(e.angle)<-1e-8?-1:1;
  m.signedSpeed=sign*travel/dt;m.vx=dx/dt;m.vy=dy/dt;m.turnRate=angleDelta(e.angle,before.angle)/dt;m.steer=clamp(steer,-1,1);m.throttle=clamp(throttle,-1,1);m.distance+=sign*travel;m.travel+=travel;m.reverse=m.signedSpeed<-.01;m.moving=travel>1e-6;m.tick=tick;
 }
 function steerRate(game,e,steer,velocity){const p=profiles[kind(e)];return steer*p.turn*(p.pivot?1:clamp(Math.abs(velocity)/Math.max(1,game.effectiveSpeed(e)*.35),0,1))*(velocity<0?-1:1);}
 function bankAircraft(e,turnRate,dt,fixedWing=true){
  if(!(dt>0)||!Number.isFinite(dt))return;
  // World forward is local +X and the right wing is +Z. With the renderer's
  // YZX Euler frame a positive local-X roll lowers that right wing, matching
  // increasing map heading. These are game response constants, not flight data.
  const target=fixedWing?clamp(turnRate*.6,-.68,.68):0;
  e.roll=(e.roll||0)+(target-(e.roll||0))*(1-Math.exp(-4*dt));
 }
 function steerAircraft(e,desiredYaw,dt,{maxRate=.9,response=1.8,turn=0,fixedWing=true}={}){
  if(!(dt>0)||!Number.isFinite(dt))return 0;
  const delta=angleDelta(Number.isFinite(desiredYaw)?desiredYaw:e.angle,e.angle),stick=Number.isFinite(turn)?clamp(turn,-1,1):0;
  let change=clamp(delta*response+stick*.7,-maxRate,maxRate)*dt;
  // A finite mouse pulse selects a heading. Do not overshoot and reverse-bank
  // around that heading on a long frame once keyboard yaw input is released.
  if(!stick&&Math.sign(change)===Math.sign(delta))change=Math.sign(delta)*Math.min(Math.abs(change),Math.abs(delta));
  e.angle+=change;const rate=change/dt;bankAircraft(e,rate,dt,fixedWing);return rate;
 }
 root.WarVehicleMotion={profiles,profile,kind,state,stop,speed,record,steerRate,angleDelta,bankAircraft,steerAircraft};
})(globalThis);
