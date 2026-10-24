/* Original procedural audio, not recordings of named real weapons. Presentation only. */
(function(root){
 'use strict';
 const profiles=Object.freeze({
  pistol:{duration:.16,cutoff:3200,tone:185,gain:.12,decay:25},smg:{duration:.12,cutoff:2500,tone:145,gain:.10,decay:32},
  rifle:{duration:.23,cutoff:3700,tone:115,gain:.15,decay:22},lmg:{duration:.27,cutoff:2800,tone:90,gain:.16,decay:18},
  marksman:{duration:.30,cutoff:3100,tone:85,gain:.17,decay:18},sniper:{duration:.43,cutoff:2400,tone:62,gain:.19,decay:13},
  shotgun:{duration:.33,cutoff:1800,tone:72,gain:.18,decay:16},grenade:{duration:.28,cutoff:850,tone:95,gain:.16,decay:19},
  launcher:{duration:.48,cutoff:1200,tone:48,gain:.16,decay:8},cannon:{duration:.62,cutoff:1300,tone:42,gain:.20,decay:9},
  missile:{duration:.48,cutoff:1450,tone:50,gain:.16,decay:7},energy:{duration:.31,cutoff:2200,tone:540,gain:.12,decay:12},
  torpedo:{duration:.32,cutoff:520,tone:95,gain:.10,decay:15},bomb:{duration:.12,cutoff:1100,tone:300,gain:.05,decay:35},
  dry:{duration:.055,cutoff:4300,tone:830,gain:.055,decay:85},magazine:{duration:.13,cutoff:2400,tone:330,gain:.055,decay:38},
  chamber:{duration:.18,cutoff:3600,tone:510,gain:.06,decay:30},belt:{duration:.22,cutoff:2700,tone:260,gain:.055,decay:24},
  shell:{duration:.11,cutoff:1800,tone:410,gain:.05,decay:40},hit:{duration:.20,cutoff:700,tone:75,gain:.10,decay:23},
 });
 function family(shot,entity,weapon){const id=String(weapon?.category||shot?.weaponFamily||weapon?.family||root.WarOperatorWeapons?.byId[shot?.weaponId]?.category||shot?.sourceKind||entity?.kind||'rifle').toLowerCase();if(profiles[id])return id;if(/machine|coax|ciws/.test(id))return'lmg';if(/missile|rocket/.test(id))return'missile';if(/cannon|gun|tank|artillery|howitzer|mortar/.test(id))return'cannon';if(/laser|beam|energy|pulse/.test(id))return'energy';return'rifle';}
 class CombatAudio{
  constructor({context=null,enabled=()=>true,maxVoices=16}={}){this.context=context;this.ownsContext=!context;this.enabled=typeof enabled==='function'?enabled:()=>!!enabled;this.maxVoices=Math.max(1,Math.min(32,Math.floor(maxVoices)||16));this.buffers=new Map();this.voices=new Set();this.objects=new WeakSet();this.keys=new Set();this.keyOrder=[];this.disposed=false;this.lastTime=-Infinity;}
  _remember(key){if(this.keys.has(key))return false;this.keys.add(key);this.keyOrder.push(key);while(this.keyOrder.length>256)this.keys.delete(this.keyOrder.shift());return true;}
  unlock(){if(this.disposed||!this.enabled())return false;try{if(!this.context){const C=root.AudioContext||root.webkitAudioContext;if(!C)return false;this.context=new C();}const p=this.context.resume?.();p?.catch?.(()=>{});return true;}catch{return false;}}
  _buffer(name){if(this.buffers.has(name))return this.buffers.get(name);const p=profiles[name],a=this.context,n=Math.max(1,Math.floor(a.sampleRate*p.duration)),buffer=a.createBuffer(1,n,a.sampleRate),data=buffer.getChannelData(0);let seed=17;for(const c of name)seed=((seed*31)^c.charCodeAt(0))>>>0;let low=0;for(let i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const t=i/a.sampleRate,noise=seed/2147483648-1;low=low*.86+noise*.14;const envelope=Math.min(1,t/.0018)*Math.exp(-t*p.decay),body=Math.sin(t*p.tone*Math.PI*2)*Math.exp(-t*10);data[i]=Math.max(-1,Math.min(1,(noise*.52+low*.33+body*.24)*envelope));}this.buffers.set(name,buffer);return buffer;}
  _play(name){if(!profiles[name]||this.disposed||!this.enabled()||!this.unlock())return false;try{while(this.voices.size>=this.maxVoices)this.voices.values().next().value.stop();const a=this.context,p=profiles[name],source=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain(),voice={source,done:false,stop:()=>{if(voice.done)return;voice.done=true;try{source.stop();}catch{}source.disconnect();filter.disconnect();gain.disconnect();this.voices.delete(voice);}};source.buffer=this._buffer(name);filter.type='lowpass';filter.frequency.value=p.cutoff;gain.gain.value=p.gain;source.connect(filter);filter.connect(gain);gain.connect(a.destination);source.onended=voice.stop;this.voices.add(voice);source.start();return true;}catch{return false;}}
  playShot(shot,entity,weapon){if(!shot||typeof shot!=='object'||!['shot','discharge'].includes(shot.type)||this.disposed)return false;
   // The launch snapshot may arrive after newer shots when a long-flight round
   // expires. Scene changes use reset(); old firedAt values must not clear IDs.
   if(Number.isFinite(shot.firedAt))this.lastTime=Math.max(this.lastTime,shot.firedAt);
   if(this.objects.has(shot))return false;this.objects.add(shot);
   const key=shot.dischargeId?'discharge:'+shot.dischargeId:Number.isInteger(shot.projectileId)?'projectile:'+shot.projectileId:null;
   if(key&&!this._remember('shot:'+key))return false;return this._play(family(shot,entity,weapon));}
  playAction(action,entity=null){if(!action||this.disposed)return 0;let played=0;
   if(!action.events&&['reload','setup','pack','stow'].includes(action.phase)&&this._remember('station:'+entity?.id+':'+action.weaponId+':'+action.sequence+':'+action.phase))return this._play(/machine|lmg/.test(action.category)?'belt':'chamber')?1:0;
   for(const e of action.events||[]){if(e.type==='fire'||!Number.isFinite(e.sequence)||!this._remember('action:'+e.sourceId+':'+e.sequence))continue;if(Number.isFinite(action.time)&&action.time-e.time>.35)continue;const phase=e.phase||'',name=e.type==='dry'?'dry':e.type==='mode'?'dry':/cover|belt/.test(phase)?'belt':/shell|round-in/.test(phase)?'shell':/charge|chamber|breech/.test(phase)?'chamber':'magazine';if(this._play(name))played++;}return played;}
  playHit(entity,time){const at=entity?.components?.lastHitAt;if(!Number.isFinite(at)||!Number.isFinite(time)||time-at>.35||time<at||!this._remember('hit:'+entity.id+':'+at))return false;return this._play('hit');}
  reset(){for(const v of [...this.voices])v.stop();this.objects=new WeakSet();this.keys.clear();this.keyOrder=[];this.lastTime=-Infinity;}
  dispose(){if(this.disposed)return;this.reset();this.buffers.clear();if(this.ownsContext)try{this.context?.close?.()?.catch?.(()=>{});}catch{}this.disposed=true;this.context=null;}
 }
 CombatAudio.profiles=profiles;CombatAudio.family=family;root.WarCombatAudio=CombatAudio;
})(globalThis);
