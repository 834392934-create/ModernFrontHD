(function(){
 'use strict';const T=THREE,$=s=>document.querySelector(s),select=$('#model');
 const labels={chn:'中国',usa:'美国',rus:'俄罗斯',ind:'印度',kor:'韩国',imp:'帝国'};
 const tanks={chn:'ZTZ-99A',usa:'M1A2',rus:'T-90M',ind:'T-90S',kor:'K2',imp:'帝国重装（科幻）'};
 const fighters={chn:'J-20',usa:'F-35A',rus:'Su-57',ind:'Rafale',kor:'F-35A',imp:'帝国战鹰（科幻）'};
 const jets={chn:'新型无尾机 · 观察外形推演',usa:'F-47 · 官方概念外形参考',rus:'俄方未来战机 · 原创推演',ind:'印方未来战机 · 原创推演',kor:'韩方未来战机 · 原创推演',imp:'帝国次世代战鹰 · 科幻'};
 const kinds=['tank','ifv','arty','rocket','aa','heli','fighter','destroyer','carrier','submarine'];
 const name=(k,f)=>WarData.U[k]?.index!==undefined?WarData.F[f].names[WarData.U[k].index]:WarData.EXTRA?.[f]?.[k]||WarData.U[k]?.name||k;
 select.innerHTML=Object.keys(labels).map(f=>`<optgroup label="${labels[f]} · ${f==='imp'?'虚构占位':'实物外观复核'}">`+kinds.map(k=>`<option value="${k}_${f}">${name(k,f)}</option>`).join('')+'</optgroup>').join('')+'<optgroup label="概念暂缓 / 游戏设施">'+Object.keys(labels).map(f=>`<option value="jet_${f}">${jets[f]} · 原型占位</option>`).join('')+[['harvester','装甲采矿车 · 游戏后勤'],['infantry','步兵小组 · 游戏角色'],['asat','陆基反轨平台 · 用途抽象'],['orbital','轨道武装 · 暂缓'],['satellite','轨道平台 · 用途抽象'],['turret','防御炮塔 · 游戏设施'],['bunker','火力堡垒 · 游戏设施'],['ciws','C-RAM 外观参考'],['radar','雷达站 · 通用外观'],['laser','激光塔 · 暂缓'],['shield','护盾塔 · 暂缓'],['jammer','干扰站 · 用途抽象'],['sam','防空阵地 · 通用外观']].map(([k,n])=>`<option value="${k}_chn">${n}</option>`).join('')+'</optgroup>';
 select.value='tank_chn';
 $('.bar small').textContent='REAL-TIME GAME MODELS · PHOTO-REFERENCED EXTERIORS';
 const renderer=new T.WebGLRenderer({canvas:$('#view'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(2,devicePixelRatio));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 const scene=new T.Scene();scene.background=new T.Color(0x263239);scene.fog=new T.Fog(0x263239,55,130);scene.add(new T.HemisphereLight(0xcddbe4,0x686248,2.0));
 const sun=new T.DirectionalLight(0xffe1b4,3.2);sun.position.set(15,22,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:70});sun.shadow.bias=-.0001;sun.shadow.normalBias=.02;scene.add(sun);
 const rim=new T.DirectionalLight(0xc2d8e3,1.8);rim.position.set(-10,9,-10);scene.add(rim);
 const ground=new T.Mesh(new T.PlaneGeometry(300,300),new T.MeshStandardMaterial({color:0x4d5752,roughness:.94}));ground.rotation.x=-Math.PI/2;ground.position.y=-.05;ground.receiveShadow=true;scene.add(ground);
 const grid=new T.GridHelper(100,100,0x5f6963,0x3e4845);grid.position.y=-.02;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
 let camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.05,500),view='perspective',modelSpan=10;
 let obj,key='tank_chn',yaw=.8,pitch=.29,distance=20,target=new T.Vector3(0,1,0),auto=false,wire=false,drag=null,parts=0;
 const material=WarModels.createMaterial();
 function load(value){
   key=value;const at=value.lastIndexOf('_'),kind=value.slice(0,at),f=value.slice(at+1);if(obj)scene.remove(obj);obj=WarModels.create(kind,f);parts=obj.userData.parts||0;let triangles=0;obj.traverse(m=>{if(m.isMesh){if(!m.userData.preserveMaterial)m.material=material;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;}});scene.add(obj);
   let bounds=new T.Box3().setFromObject(obj);obj.position.y-=bounds.min.y;bounds=new T.Box3().setFromObject(obj);const size=bounds.getSize(new T.Vector3());target=bounds.getCenter(new T.Vector3());target.y=size.y*.4;modelSpan=Math.max(size.x,size.z);distance=modelSpan*1.8;pitch=.28;view='perspective';camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.05,500);
   $('#model-name').textContent=select.selectedOptions[0].textContent;$('#stats').textContent=parts+' 个外观部件 · '+Math.round(triangles).toLocaleString()+' 三角面 · 与战场同一模型';$('#loading').hidden=true;
   $('#reference-note').textContent=obj.userData.evidenceStatus==='photo-referenced'?'已依据实物图重建外形 · 正在按多视角复核；不等于精确复刻。':kind==='jet'||f==='imp'||['orbital','laser','shield'].includes(kind)?'旧版概念占位：本轮暂缓生成，待已知实物装备复核后再细化。':'通用游戏外观：不作为已核验的真实型号复刻。';
   if(obj.userData.author)$('#reference-note').textContent+=' 模型：'+obj.userData.author+' / '+obj.userData.license+'，离线美术资产。';
   applyWireframe();
   window.Armory={scene,modelRoot:obj,renderer,camera,key,parts,triangles,setView,load};
 }
 const note=document.createElement('p');note.id='reference-note';$('.info').append(note);
 function setView(preset){auto=false;$('#rotate').textContent='自动旋转 关';view=preset;
   if(preset==='perspective'){camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.05,500);yaw=.8;pitch=.28;distance=modelSpan*1.8;}
   else{const span=modelSpan*.66,aspect=innerWidth/innerHeight;camera=new T.OrthographicCamera(-span,span,span/aspect,-span/aspect,.05,500);distance=40;yaw=preset==='front'?0:preset==='rear'?Math.PI:Math.PI/2;pitch=preset==='top'?Math.PI/2-.0001:0;}
   if(window.Armory)Armory.camera=camera;
 }
 const views=document.createElement('div');views.className='views';views.style.cssText='position:fixed;left:26px;top:83px;display:flex;gap:5px';
 for(const [v,title] of [['perspective','透视'],['side','侧视'],['front','正视'],['rear','后视'],['top','俯视']]){const button=document.createElement('button');button.textContent=title;button.onclick=()=>setView(v);views.append(button);}document.body.append(views);
 const ref=document.createElement('button');ref.textContent='查看实图来源';ref.onclick=()=>{const url=obj.userData.referenceUrl;if(url&&/^https?:\/\//.test(url))window.open(url,'_blank');else $('#reference-note').textContent='此项暂无已核验的具体实物来源：属于游戏抽象或暂缓细化的概念。完整研究记录在项目 docs/reviews 目录。';};$('.controls').append(ref);
 const credit=document.createElement('button');credit.textContent='模型署名';credit.onclick=()=>{if(obj.userData.assetSource)window.open(obj.userData.assetSource,'_blank');else $('#reference-note').textContent='本项目原创程序网格；真实照片只供外观对照，未作为模型贴图。';};$('.controls').append(credit);
 function applyWireframe(){obj?.traverse(m=>{if(m.isMesh)for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.wireframe=wire;});}
 select.onchange=e=>load(e.target.value);$('#rotate').textContent='自动旋转 关';$('#rotate').onclick=()=>{$('#rotate').textContent='自动旋转 '+((auto=!auto)?'开':'关');};$('#wire').onclick=()=>{wire=!wire;applyWireframe();$('#wire').textContent='线框 '+(wire?'开':'关');};$('#camo').onclick=()=>{material.userData.camo.value=1-material.userData.camo.value;$('#camo').textContent='迷彩 '+(material.userData.camo.value?'开':'关');if(obj.userData.assetSource)$('#reference-note').textContent='此模型保留作者材质；程序迷彩开关只影响本项目程序模型。';};$('#light').onclick=()=>{sun.position.x=-sun.position.x;};
 const canvas=$('#view');canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)};canvas.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.006;pitch=Math.max(.05,Math.min(1.35,pitch+(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY}};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;canvas.onwheel=e=>{e.preventDefault();distance=Math.max(6,Math.min(100,distance*Math.exp(e.deltaY*.001)))};canvas.ondblclick=()=>{yaw=.8;load(key)};
 addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);if(camera.isPerspectiveCamera){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}else setView(view)});
 addEventListener('war-models-ready',()=>{const oldView=view;load(key);setView(oldView)});
 function frame(){if(auto)yaw+=.002;camera.position.set(target.x+Math.cos(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.sin(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);renderer.render(scene,camera);requestAnimationFrame(frame)}load(key);frame();
})();
