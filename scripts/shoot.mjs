/**
 * Screenshots every screen and fails on any console error.
 *
 * Run against the production build (`npm run build && npm run preview`) rather
 * than the dev server, so what is captured is what deploys.
 *
 *   node scripts/shoot.mjs [baseUrl] [outDir]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:4173";
const outDir = process.argv[3] ?? "docs/screens";
await mkdir(outDir, { recursive: true });

// The container ships a Chromium build that may not match this Playwright
// version's expected revision, so point at it explicitly rather than
// downloading another copy.
const executablePath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const browser = await chromium.launch(
  existsSync(executablePath) ? { executablePath } : {},
);
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 2,
});

const problems = [];
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

const shot = async (name) => {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log(`  captured ${name}`);
};

const nav = async (label) => {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(250);
};

console.log("Onboarding");
await page.goto(base, { waitUntil: "networkidle" });
await shot("01-welcome");

await page.getByPlaceholder("Your first name").fill("Harlie");
await page.getByRole("button", { name: /Continue/ }).click();
await shot("02-goal");

await page.getByRole("button", { name: /Start investing/ }).click();
await page.getByRole("button", { name: /Start the placement test/ }).click();
await shot("03-placement");

// Answer the twelve items: correct on investing and budgeting, wrong elsewhere,
// so the resulting path is visibly shaped by the answers rather than uniform.
for (let i = 0; i < 12; i += 1) {
  const buttons = page.locator(".answer");
  const count = await buttons.count();
  const badge = await page.locator(".question .badge").innerText();
  const strong = badge === "investing" || badge === "budgeting";
  await buttons.nth(strong ? 0 : Math.min(count - 1, 3)).click();
  const next = page.getByRole("button", { name: /^Next$/ });
  if (await next.isVisible().catch(() => false)) await next.click();
  else break;
}
await page.getByRole("button", { name: /See where you stand/ }).click();
await shot("04-results");

await page.getByRole("button", { name: /Build my path/ }).click();
await page.waitForTimeout(400);

console.log("App");
await shot("05-today");

await nav("Learn");
await shot("06-learn");

// Open the first unlocked lesson and walk it end to end.
await page.locator(".lesson-row:not([disabled])").first().click();
await shot("07-lesson");

await page.getByRole("button", { name: /Practice this/ }).click();
await page.waitForTimeout(200);
for (let i = 0; i < 4; i += 1) {
  const answers = page.locator(".answer:not([disabled])");
  if ((await answers.count()) === 0) break;
  await answers.first().click();
  await page.waitForTimeout(150);
  const next = page.getByRole("button", { name: /Next question/ });
  const finish = page.getByRole("button", { name: /^Finish$/ });
  if (await next.isEnabled().catch(() => false)) await next.click();
  else if (await finish.isEnabled().catch(() => false)) {
    await finish.click();
    break;
  }
}
await shot("08-practice-summary");

await nav("Simulator");
await page.waitForTimeout(300);
await shot("09-simulator-empty");

// Build a deliberately concentrated portfolio so the feedback panel fires.
await page.locator(".instrument-row", { hasText: "NOVA" }).click();
await page.locator(".card input.input").last().fill("20");
await page.getByRole("button", { name: /^Buy$/ }).click();
await page.locator(".instrument-row", { hasText: "QNTL" }).click();
await page.locator(".card input.input").last().fill("30");
await page.getByRole("button", { name: /^Buy$/ }).click();
await page.getByRole("button", { name: /\+1 quarter/ }).click();
await page.waitForTimeout(300);
await shot("10-simulator-held");

await nav("Budget lab");
await shot("11-budget");

await nav("Community");
await shot("12-community");

await nav("Progress");
await shot("13-progress");

console.log("Mobile");
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await shot("14-mobile-progress");
await nav("Today");
await shot("15-mobile-today");

await browser.close();

if (problems.length > 0) {
  console.error(`\n${problems.length} console problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("\nNo console errors.");
