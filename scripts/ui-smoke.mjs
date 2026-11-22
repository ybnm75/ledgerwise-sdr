import { mkdir } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.UI_BASE_URL || "http://localhost:3000";
const browserPath = process.env.BROWSER_PATH
  || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const password = process.env.APP_PASSWORD;
const outputDir = path.resolve(".ui-smoke");

if (!password) throw new Error("APP_PASSWORD is required for the UI smoke test.");

await mkdir(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: browserPath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

const problems = [];
const page = await browser.newPage();

page.on("console", (message) => {
  if (message.type() === "error") {
    const source = message.location().url;
    problems.push(`Console error${source ? ` (${source})` : ""}: ${message.text()}`);
  }
});
page.on("pageerror", (error) => problems.push(`Page error: ${error.message}`));
page.on("response", (response) => {
  if (response.status() >= 500) problems.push(`HTTP ${response.status()}: ${response.url()}`);
});

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForText(text) {
  await page.waitForFunction(
    (value) => document.body.innerText.includes(value),
    { timeout: 15_000 },
    text
  );
}

async function clickButton(label) {
  const clicked = await page.evaluate((value) => {
    const button = [...document.querySelectorAll("button")]
      .find((item) => item.textContent?.trim().includes(value));
    if (!button) return false;
    button.click();
    return true;
  }, label);
  expect(clicked, `Button not found: ${label}`);
  await new Promise((resolve) => setTimeout(resolve, 250));
}

async function loginIfNeeded() {
  const passwordField = await page.$('input[type="password"]');
  if (!passwordField) return;
  await page.waitForNetworkIdle({ idleTime: 400, timeout: 10_000 }).catch(() => undefined);
  await passwordField.focus();
  await passwordField.type(password);
  const passwordMatches = await page.$eval('input[type="password"]', (input, expected) => input.value === expected, password);
  if (!passwordMatches) throw new Error("The browser did not enter the complete reviewer password.");
  const requestPromise = page.waitForRequest((request) => request.url().endsWith("/api/auth/login"), { timeout: 15_000 });
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/auth/login"), { timeout: 15_000 });
  await page.click('button[type="submit"]');
  const request = await requestPromise;
  const response = await responsePromise;
  const submittedPassword = JSON.parse(request.postData() || "{}").password;
  if (submittedPassword !== password) throw new Error("The login form submitted a different password than the browser entered.");
  if (!response.ok()) throw new Error(`Login request failed with HTTP ${response.status()}.`);
  await page.waitForSelector(".task-nav", { timeout: 30_000 });
}

async function assertInteractionNames() {
  const unnamed = await page.$$eval("button, a[href], input, select, textarea", (items) => items
    .filter((item) => {
      const ariaLabel = item.getAttribute("aria-label")?.trim();
      const labelledBy = item.getAttribute("aria-labelledby")?.trim();
      const text = item.textContent?.trim();
      const placeholder = item.getAttribute("placeholder")?.trim();
      const label = item.id ? document.querySelector(`label[for="${CSS.escape(item.id)}"]`)?.textContent?.trim() : "";
      const wrappingLabel = item.closest("label")?.textContent?.trim();
      return !ariaLabel && !labelledBy && !text && !placeholder && !label && !wrappingLabel;
    })
    .map((item) => item.outerHTML.slice(0, 160)));
  expect(unnamed.length === 0, `Unnamed controls: ${unnamed.join(" | ")}`);
}

try {
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await loginIfNeeded();
  await waitForText("Ledgerwise");

  const views = [
    ["Today", "Work that needs a human decision"],
    ["Research", "Evidence queue"],
    ["Outreach", "Approval queue"],
    ["Conversations", "Conversations"],
    ["Bookings", "Booked calls"],
    ["Activity", "Consequential actions"]
  ];

  for (const [button, expectedText] of views) {
    await clickButton(button);
    await waitForText(expectedText);
  }

  await clickButton("Research");
  const firstLead = await page.$(".lead-row");
  expect(Boolean(firstLead), "Research queue has no selectable lead.");
  await firstLead.click();
  await page.waitForSelector(".lead-workbench");
  await assertInteractionNames();

  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(!desktopOverflow, "Desktop layout has horizontal overflow.");
  await page.screenshot({ path: path.join(outputDir, "desktop.png"), fullPage: true });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await loginIfNeeded();
  await clickButton("Research");
  const mobileLead = await page.$(".lead-row");
  expect(Boolean(mobileLead), "Mobile research queue has no selectable lead.");
  await mobileLead.click();
  await page.waitForSelector('.lead-workbench[data-mobile-open="true"]');
  const backVisible = await page.$eval(".mobile-back", (item) => getComputedStyle(item).display !== "none");
  expect(backVisible, "Mobile lead detail has no visible back control.");
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(!mobileOverflow, "Mobile layout has horizontal overflow.");
  const draftOrderIsReadable = await page.evaluate(() => {
    const message = document.querySelector(".draft-pane .field textarea");
    const actions = document.querySelector(".draft-actions");
    if (!message || !actions) return false;
    return message.getBoundingClientRect().top < actions.getBoundingClientRect().top;
  });
  expect(draftOrderIsReadable, "Mobile draft actions appear before the message they control.");
  await assertInteractionNames();
  await page.screenshot({ path: path.join(outputDir, "mobile.png"), fullPage: true });

  const uniqueProblems = [...new Set(problems)];
  expect(uniqueProblems.length === 0, uniqueProblems.join("\n"));
  console.log("UI smoke passed: 6 desks, authentication, desktop/mobile layouts, accessible control names, and runtime errors.");
} finally {
  await browser.close();
}
