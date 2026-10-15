const assert = require("node:assert/strict");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
(async () => {
  const browser = await chromium.launch({
      headless: true,
      channel: "chromium",
    }),
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:8765");
  await page.waitForFunction(() => !!window.ModernFront);
  const report = { checks: [], errors };
  for (const faction of ["usa", "rus", "chn", "ind", "kor", "imp"]) {
    await page.evaluate(
      (f) =>
        ModernFront.start({
          faction: f,
          enemies: 4,
          buffs: ["wealth", "vision", "rapid"],
          map: "river",
        }),
      faction,
    );
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(() => ModernFront.game.teams[0].faction),
      faction,
    );
    report.checks.push("启动 " + faction);
  }
  const detail = await page.evaluate(() => {
    const g = ModernFront.game;
    g.teams[0].money = 100000;
    const h = g.entities.find((e) => e.team === 1 && e.kind === "hq");
    const a = g.ability("nuke", h.x, h.y),
      forbidden = g.ability("nuke", 720, 360, 1);
    g.spawn(0, "airfield", 1100, 300);
    g.train(0, "jet");
    g.spawn(0, "spaceport", 1100, 500);
    g.train(0, "orbital");
    g.train(0, "destroyer");
    ModernFront.selectAll();
    return {
      nuke: a,
      AIRejected: !forbidden,
      queue: g.teams[0].queue.map((q) => q.kind),
      domains: {
        land: g.entities.some((e) => e.team === 0 && WarData.U[e.kind]?.ground),
        sea: g.entities.some((e) => e.team === 0 && WarData.U[e.kind]?.naval),
        air: g.entities.some((e) => e.team === 0 && e.kind === "fighter"),
        space: g.entities.some((e) => e.team === 0 && WarData.U[e.kind]?.space),
      },
    };
  });
  assert.ok(detail.nuke && detail.AIRejected);
  assert.ok(Object.values(detail.domains).every(Boolean));
  assert.ok(detail.queue.includes("jet") && detail.queue.includes("orbital"));
  report.checks.push("海陆空天、生产队列、核打击、AI权限");
  await page.locator('[data-tab="buildings"]').click();
  assert.ok(await page.locator('[data-item="shield"]').count());
  await page.locator('[data-item="radar"]').click();
  await page.mouse.click(1000, 600, { button: "right" });
  assert.equal(await page.evaluate(() => ModernFront.mode), null);
  await page.locator("#save").click();
  const saved = await page.evaluate(() => ModernFront.game.time);
  await page.evaluate(() => ModernFront.load());
  assert.ok(
    Math.abs((await page.evaluate(() => ModernFront.game.time)) - saved) < 0.3,
  );
  report.checks.push("建造预览取消与本地存档恢复");
  await page.locator("#graphics").click();
  await page.locator("#night-toggle").check();
  await page.locator("#apply-fx").click();
  assert.ok(await page.evaluate(() => ModernFront.lighting.night));
  report.checks.push("GPU画质夜间切换");
  await page.screenshot({ path: "screenshots/06-imperium-night.png" });
  await page.locator("#buff-settings").click();
  await page.locator('#modal input[data-buff="armor"]').check();
  await page.locator("#apply-buffs").click();
  assert.ok(await page.evaluate(() => ModernFront.game.buffs.has("armor")));
  report.checks.push("对局内增益应用");
  await page.evaluate(() => {
    const g = ModernFront.game;
    for (let i = 0; i < 125; i++) g.step(0.05);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: "screenshots/07-strike-aftermath.png" });
  report.checks.push("大型打击延迟结算");
  await page.evaluate(() => {
    for (const e of ModernFront.game.entities)
      if (e.team > 0 && e.kind === "hq") e.hp = 0;
    ModernFront.game.step(0.05);
  });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => ModernFront.game.result), "victory");
  await page.screenshot({ path: "screenshots/08-victory.png" });
  report.checks.push("浏览器胜利结算");
  await page.goto(
    pathToFileURL(require("node:path").resolve("index.html")).href,
  );
  await page.waitForTimeout(1000);
  await page.locator("#start").click();
  await page.waitForTimeout(700);
  report.file = {
    time: await page.evaluate(() => ModernFront.game.time),
    gpu: await page.evaluate(() => ModernFront.lighting.available),
    spriteLoaded: await page.evaluate(
      () => ModernFront.renderer.sprites.tank.naturalWidth,
    ),
  };
  assert.ok(report.file.time > 0.2);
  assert.equal(report.file.spriteLoaded, 3072);
  await page.locator("#save").click();
  await page.screenshot({ path: "screenshots/09-offline-file.png" });
  report.checks.push("file:// 双击离线运行与CAD素材");
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/10-qhd.png" });
  report.checks.push("2560×1440画面");
  await browser.close();
  fs.writeFileSync(
    "docs/acceptance-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  assert.equal(errors.length, 0);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
