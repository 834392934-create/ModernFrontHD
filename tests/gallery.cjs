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
    await p.goto("http://127.0.0.1:8765/gallery.html");
    await p.waitForFunction(() => window.Armory?.parts > 400);
    await p.locator("#rotate").click();
    await p.waitForTimeout(400);
    await p.screenshot({ path: "screenshots/11-armory-99a.png" });
    const reports = [];
    for (const key of [
      "tank_usa",
      "tank_rus",
      "tank_chn",
      "tank_ind",
      "tank_kor",
      "tank_imp",
      "destroyer",
      "fighter",
      "satellite",
      "orbital",
      "defense",
    ]) {
      await p.locator("#model").selectOption(key);
      await p.waitForFunction((k) => window.Armory?.key === k, key);
      reports.push(
        await p.evaluate(() => ({
          key: Armory.key,
          parts: Armory.parts,
          triangles: Armory.triangles,
        })),
      );
      assert.ok(reports.at(-1).parts > 0);
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
