/* Scope/evidence export only. This deliberately never grants a visual approval. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chromium'});try{
 const p=await browser.newPage();await p.goto('http://127.0.0.1:8765/gallery.html');await p.waitForFunction(()=>window.Armory);
 const inventory=await p.evaluate(async()=>{
  await Promise.all([window.WarImported?.ready,window.WarImportedAir?.ready,window.WarImportedGround?.ready]);
  const realKinds=['tank','ifv','arty','rocket','aa','heli','fighter','destroyer','carrier','submarine'];
  const units=[];
  for(const f of Object.keys(WarData.F))for(const k of Object.keys(WarData.U)){
   const real=f!=='imp'&&realKinds.includes(k)&&!(f==='rus'&&k==='carrier');
   const category=WarData.U[k].roleVariant?'original-role-variant':['satellite','orbital_interceptor','orbital','asat'].includes(k)?'space-concept-original':real?'known-photo-reference':f==='imp'||['jet','orbital'].includes(k)||k==='carrier'?'concept-frozen':['satellite','asat'].includes(k)?'role-abstraction':'generic-game-role';
   const m=WarModels.create(k,f),u=m.userData;
   units.push({key:k+'_'+f,name:WarData.U[k].index!==undefined?WarData.F[f].names[WarData.U[k].index]:WarData.EXTRA?.[f]?.[k]||WarData.U[k].name,category,profile:u.profile||null,referenceUrl:u.referenceUrl||null,inspirationUrl:u.inspirationUrl||null,assetSource:u.assetSource||null,license:u.license||'Project-original',author:u.author||null,fullVisualAcceptance:false});
  }
  return {units,facilities:Object.entries(WarData.B).map(([key,b])=>({key,name:b.name,category:WarModels.create(key,'chn').userData.evidenceStatus,referenceUrl:WarModels.create(key,'chn').userData.referenceUrl||null,variants:Object.keys(WarData.F).length})),abilities:Object.entries(WarData.ABILITIES).map(([key,a])=>({key,name:a.name,category:'abstract-effect-no-specific-exterior-model'}))};
 });
 const known=inventory.units.filter(u=>u.category==='known-photo-reference');assert.equal(known.length,49);assert.equal(inventory.units.length,336);assert.equal(inventory.abilities.length,7);assert.ok(known.every(u=>u.referenceUrl),'Each known exterior needs its own photo source');
 const report={recordedAt:new Date().toISOString(),scope:'Coverage and source inventory; not a visual acceptance certificate.',knownSlotCount:known.length,conceptGenerationAllowed:false,authorizedExceptions:{unitKinds:['satellite','orbital_interceptor','orbital','asat'],rosterRoleVariants:true,allBuildingKinds:true,reason:'Explicit user instructions 2026-10-16 and reinforcement authorization 2026-10-17'},policy:'ACCEPTANCE_POLICY.md',...inventory};
 fs.writeFileSync('docs/reviews/model-inventory.json',JSON.stringify(report,null,2));
 const rows=known.map(u=>`|${u.key}|${u.name}|[实图](${u.referenceUrl})|${u.assetSource?'授权外部美术':'原创程序网格'}|终验待完成|`).join('\n');
 fs.writeFileSync('docs/reviews/KNOWN_EQUIPMENT.md','# 49个实物参考槽位\n\n全部单位、设施和能力的覆盖清单见 [model-inventory.json](model-inventory.json)。此表只列有实图参考的具体装备；完整视觉终验尚未全部通过，其余概念生成保持冻结；2026-10-16 用户单独授权太空4型与全部建筑。判据见 [验收顺序](ACCEPTANCE_POLICY.md)。\n\n|键|游戏名称|参考|实现|完整视觉验收|\n|---|---|---|---|---|\n'+rows+'\n');
 console.log(JSON.stringify({knownSlots:known.length,unitSlots:inventory.units.length,facilities:inventory.facilities.length,abilities:inventory.abilities.length,conceptGenerationAllowed:false}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
