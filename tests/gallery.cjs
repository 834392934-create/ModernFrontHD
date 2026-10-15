const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ headless: true, channel: "chromium" });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console",m=>{if(m.type()==='error')errors.push(m.text())});
    await p.goto("http://127.0.0.1:8765/gallery.html");
    await p.evaluate(()=>Promise.all([window.WarImported?.ready,window.WarImportedAir?.ready,window.WarImportedGround?.ready]));
    await p.waitForFunction(() => window.Armory?.parts > 400);
    await p.locator("#rotate").click();
    await p.waitForTimeout(400);
    await p.screenshot({ path: "screenshots/11-armory-99a.png" });
    const reports = [];
    for (const key of await p.locator('#model option').evaluateAll(options=>options.map(o=>o.value))) {
      await p.locator("#model").selectOption(key);
      await p.waitForFunction((k) => window.Armory?.key === k, key);
      reports.push(
        await p.evaluate(() => ({
          key: Armory.key,
          parts: Armory.parts,
          triangles: Armory.triangles,
          dimensions: new THREE.Box3().setFromObject(Armory.modelRoot).getSize(new THREE.Vector3()).toArray(),
        })),
      );
      assert.ok(reports.at(-1).parts > 0);
      assert.ok(reports.at(-1).dimensions.every(v=>Number.isFinite(v)&&v>0&&v<200),key+' invalid model bounds '+reports.at(-1).dimensions);
    }
    await p.locator("#model").selectOption("tank_usa");
    await p.waitForFunction(() => Armory.key === "tank_usa");
    await p.mouse.move(900, 450);
    await p.mouse.down();
    await p.mouse.move(1100, 500, { steps: 12 });
    await p.mouse.up();
    await p.screenshot({ path: "screenshots/12-armory-abrams.png" });
    await p.locator("#wire").click();
    await p.locator("#camo").click();
    await p.locator("#light").click();
    for(const key of ['destroyer_usa','heli_usa','heli_kor','tank_rus']){
      await p.locator('#model').selectOption(key);
      assert.ok(await p.evaluate(()=>{let ok=true;Armory.modelRoot.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])ok=ok&&m.wireframe;});return ok;}),key+' wireframe must also apply to imported materials');
    }
    assert.equal(errors.length, 0);
    fs.writeFileSync(
      "docs/gallery-report.json",
      JSON.stringify(
        {
          reports,
          errors,
          interactions:
            "model selection, orbit drag, material, wireframe, lighting",
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ models: reports.length, errors }));
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
