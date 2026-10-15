const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: "chromium",
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://127.0.0.1:8765");
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: "screenshots/01-deployment.png",
    fullPage: true,
  });
  console.log(
    "menu",
    await page.locator("[data-faction]").count(),
    await page.title(),
  );
  await page.locator("#enemies").selectOption("4");
  await page.locator("#all-buffs").click();
  await page.locator("#start").click();
  await page.waitForTimeout(1500);
  console.log(
    "start",
    await page.evaluate(() => ({
      entities: ModernFront.game.entities.length,
      time: ModernFront.game.time,
      fps: ModernFront.fps,
    })),
  );
  await page.locator('[data-item="tank"]').click();
  await page.locator("#select-all").click();
  await page.mouse.click(900, 540, { button: "right" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "screenshots/02-battle.png" });
  await page.locator('[data-tab="abilities"]').click();
  console.log("nuke button", await page.locator('[data-item="nuke"]').count());
  await page.locator('[data-item="nuke"]').click();
  await page.mouse.click(800, 430);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "screenshots/03-nuclear-warning.png" });
  await page.locator("#save").click();
  console.log(
    "saved",
    await page.evaluate(
      () => localStorage.getItem("modern-front-save-v1").length,
    ),
  );
  console.log("errors", errors);
  await page.setViewportSize({ width: 700, height: 900 });
  await page.screenshot({ path: "screenshots/04-narrow-battle.png" });
  await page.evaluate(() => ModernFront.returnMenu());
  await page.screenshot({
    path: "screenshots/05-narrow-menu.png",
    fullPage: true,
  });
  fs.writeFileSync(
    "screenshots/browser-report.json",
    JSON.stringify(
      {
        errors,
        checked:
          "menu, five AI slots, start, unit production, select all, right click, nuclear button/target, save, desktop/narrow screenshots",
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
