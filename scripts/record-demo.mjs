import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const root = process.cwd();
const baseUrl = process.env.UI_BASE_URL || "https://ledgerwise-sdr.vercel.app";
const browserPath = process.env.BROWSER_PATH
  || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const password = process.env.APP_PASSWORD;
const outputDir = path.resolve(".demo-video");
const narrationDir = path.join(outputDir, "narration");
const manifestPath = path.join(narrationDir, "manifest.json");
const rawVideo = path.join(outputDir, "ledgerwise-walkthrough.webm");
const narrationAudio = path.join(outputDir, "ledgerwise-narration.wav");
const finalVideo = path.join(outputDir, "ledgerwise-loom-ready.mp4");

if (!password) throw new Error("APP_PASSWORD is required.");
await mkdir(outputDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout.trim();
}

run("powershell.exe", [
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", path.join(root, "scripts", "generate-demo-narration.ps1"),
  "-OutputDirectory", narrationDir
]);

const scenes = JSON.parse((await readFile(manifestPath, "utf8")).replace(/^\uFEFF/, ""));
for (const scene of scenes) {
  scene.duration = Number(execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    scene.audio
  ], { encoding: "utf8" }).trim());
}

const concatFile = path.join(outputDir, "narration-concat.txt");
const concatLines = scenes.map((scene) => `file '${scene.audio.replaceAll("'", "'\\''").replaceAll("\\", "/")}'`);
await writeFile(concatFile, `${concatLines.join("\n")}\n`, "utf8");
run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c:a", "pcm_s16le", narrationAudio]);

const browser = await puppeteer.launch({
  executablePath: browserPath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"]
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
page.setDefaultTimeout(20_000);

const problems = [];
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`Console: ${message.text()}`);
});
page.on("pageerror", (error) => problems.push(`Page: ${error.message}`));
page.on("response", (response) => {
  if (response.status() >= 500) problems.push(`HTTP ${response.status()}: ${response.url()}`);
});

async function pause(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickNav(label) {
  const clicked = await page.evaluate((value) => {
    const button = [...document.querySelectorAll("button")]
      .find((item) => item.textContent?.trim().includes(value));
    if (!button) return false;
    button.click();
    return true;
  }, label);
  if (!clicked) throw new Error(`Navigation button not found: ${label}`);
  await pause(700);
}

async function login() {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const passwordField = await page.$('input[type="password"]');
  if (passwordField) {
    await passwordField.type(password, { delay: 25 });
    const passwordMatches = await page.$eval('input[type="password"]', (input, expected) => input.value === expected, password);
    if (!passwordMatches) throw new Error("The browser did not enter the complete reviewer password.");
    await Promise.all([
      page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.ok()),
      page.click('button[type="submit"]')
    ]);
  }
  await page.waitForSelector(".task-nav", { timeout: 30_000 });
}

async function installOverlay() {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "demo-video-style";
    style.textContent = `
      #demo-chapter { position: fixed; inset: 0; z-index: 999999; display: grid; place-content: center; padding: 8vw; color: #fff; background: radial-gradient(circle at 75% 20%, rgba(44,120,74,.7), transparent 32%), linear-gradient(135deg, #17120f, #2c211b); opacity: 0; pointer-events: none; transition: opacity .35s ease; text-align: left; }
      #demo-chapter[data-visible="true"] { opacity: 1; }
      #demo-chapter small { color: #a7f3d0; font: 700 18px/1.2 ui-sans-serif, system-ui; letter-spacing: .14em; text-transform: uppercase; }
      #demo-chapter h2 { max-width: 1000px; margin: 20px 0 14px; font: 700 70px/1.02 Georgia, serif; letter-spacing: -.04em; }
      #demo-chapter p { max-width: 900px; margin: 0; color: #eadfd8; font: 400 27px/1.4 ui-sans-serif, system-ui; }
      #demo-caption { position: fixed; z-index: 999998; left: 50%; bottom: 28px; width: min(1160px, calc(100vw - 80px)); transform: translateX(-50%); padding: 18px 24px; border: 1px solid rgba(255,255,255,.18); border-radius: 14px; color: #fff; background: rgba(23,18,15,.92); box-shadow: 0 18px 60px rgba(0,0,0,.22); font: 500 20px/1.45 ui-sans-serif, system-ui; opacity: 0; transition: opacity .25s ease; }
      #demo-caption[data-visible="true"] { opacity: 1; }
      #demo-focus { position: fixed; z-index: 999997; border: 3px solid #0b7a53; border-radius: 12px; box-shadow: 0 0 0 6px rgba(11,122,83,.14); pointer-events: none; opacity: 0; transition: left .35s ease, top .35s ease, width .35s ease, height .35s ease, opacity .2s ease; }
      #demo-focus[data-visible="true"] { opacity: 1; }
    `;
    document.head.appendChild(style);
    const chapter = document.createElement("section");
    chapter.id = "demo-chapter";
    chapter.innerHTML = "<small>Ledgerwise walkthrough</small><h2></h2><p></p>";
    document.body.appendChild(chapter);
    const caption = document.createElement("div");
    caption.id = "demo-caption";
    document.body.appendChild(caption);
    const focus = document.createElement("div");
    focus.id = "demo-focus";
    document.body.appendChild(focus);
  });
}

async function setChapter(scene, visible) {
  await page.evaluate(({ scene, visible }) => {
    const chapter = document.querySelector("#demo-chapter");
    chapter.querySelector("h2").textContent = scene.title;
    chapter.querySelector("p").textContent = scene.subtitle;
    chapter.dataset.visible = String(visible);
  }, { scene, visible });
}

async function setCaption(text, visible = true) {
  await page.evaluate(({ text, visible }) => {
    const caption = document.querySelector("#demo-caption");
    caption.textContent = text;
    caption.dataset.visible = String(visible);
  }, { text, visible });
}

async function focus(selector) {
  await page.evaluate((value) => {
    const target = document.querySelector(value);
    const marker = document.querySelector("#demo-focus");
    if (!target || !marker) {
      marker.dataset.visible = "false";
      return;
    }
    const rect = target.getBoundingClientRect();
    marker.style.left = `${Math.max(8, rect.left - 7)}px`;
    marker.style.top = `${Math.max(8, rect.top - 7)}px`;
    marker.style.width = `${Math.max(20, rect.width + 14)}px`;
    marker.style.height = `${Math.max(20, rect.height + 14)}px`;
    marker.dataset.visible = "true";
  }, selector);
}

async function hideFocus() {
  await page.evaluate(() => { document.querySelector("#demo-focus").dataset.visible = "false"; });
}

async function selectLead(name) {
  const found = await page.evaluate((value) => {
    const lead = [...document.querySelectorAll(".lead-row")]
      .find((item) => item.textContent?.includes(value));
    if (!lead) return false;
    lead.click();
    return true;
  }, name);
  if (!found) throw new Error(`Lead not found: ${name}`);
  await pause(900);
}

async function runScene(scene, action) {
  const started = Date.now();
  await setChapter(scene, true);
  await setCaption(scene.narration, false);
  await pause(Math.min(2600, scene.duration * 250));
  await setChapter(scene, false);
  await pause(450);
  await action();
  await setCaption(scene.narration, true);
  const remaining = Math.max(1000, scene.duration * 1000 - (Date.now() - started));
  await pause(remaining);
  await setCaption("", false);
  await hideFocus();
}

try {
  await login();
  await installOverlay();
  const recorder = await page.screencast({ path: rawVideo, fps: 30, format: "webm" });

  await runScene(scenes[0], async () => {
    await clickNav("Today");
    await focus(".today-grid");
  });
  await runScene(scenes[1], async () => {
    await clickNav("Research");
    await selectLead("Nulo");
    await focus(".score-block");
    await pause(3500);
    await page.evaluate(() => document.querySelector(".lead-workbench")?.scrollTo({ top: 520, behavior: "smooth" }));
    await pause(800);
    await focus(".evidence-pane .evidence-item");
  });
  await runScene(scenes[2], async () => {
    await clickNav("Outreach");
    await selectLead("Nulo");
    await focus(".draft-pane .grounding-note");
    await pause(4000);
    await page.evaluate(() => document.querySelector(".draft-pane")?.scrollTo({ top: 900, behavior: "smooth" }));
  });
  await runScene(scenes[3], async () => {
    await clickNav("Conversations");
    await focus(".thread-detail");
  });
  await runScene(scenes[4], async () => {
    await clickNav("Bookings");
    await focus(".availability-panel");
  });
  await runScene(scenes[5], async () => {
    await clickNav("Activity");
    await focus(".activity-event");
    await pause(3000);
    await page.evaluate(() => window.scrollTo({ top: 550, behavior: "smooth" }));
  });
  await runScene(scenes[6], async () => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await focus(".booking-view__header");
  });
  await runScene(scenes[7], async () => {
    await setChapter(scenes[7], true);
  });

  await recorder.stop();
} finally {
  await browser.close();
}

const uniqueProblems = [...new Set(problems)].filter((problem) => !problem.includes("favicon"));
if (uniqueProblems.length) throw new Error(`Browser problems:\n${uniqueProblems.join("\n")}`);

run("ffmpeg", [
  "-y", "-i", rawVideo, "-i", narrationAudio,
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", finalVideo
]);

const probe = run("ffprobe", [
  "-v", "error", "-show_entries", "format=duration,size", "-of", "json", finalVideo
]);
console.log(`Loom-ready video: ${finalVideo}`);
console.log(probe);
