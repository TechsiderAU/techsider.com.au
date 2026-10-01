// Record the local synthetic example. Requires the project's Playwright Chromium and ffmpeg.
// No external page, customer record, AI model or connector is used.
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync, mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { permits } from "./workflow-control-check.mjs";

const root = new URL("../", import.meta.url);
const walkthrough = JSON.parse(readFileSync(new URL("public/downloads/synthetic-workflow-walkthrough.json", root)));
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const states = walkthrough.steps.map((step, i) => {
  const item = { id: walkthrough.item, version: i < 3 ? 1 : 2, action: "send", authorised: true, canWrite: true, paused: false, alreadyExecuted: i === 6 };
  if (i >= 4) item.approval = { item: walkthrough.item, version: 2 };
  return { ...step, allowed: Boolean(permits(item)) };
});
const working = mkdtempSync(join(tmpdir(), "techsider-workflow-"));
const output = new URL("public/downloads/", root);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: working, size: { width: 1280, height: 720 } } });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:48px 64px;background:#f2f1ec;color:#191919;font-family:Arial,sans-serif}
    .label{font-size:19px;color:#225c34}h1{font-size:40px;margin:20px 0 12px}p{font-size:22px;line-height:1.5}
    .row{display:grid;grid-template-columns:300px 1fr;gap:32px;margin-top:30px}ol{margin:0;padding:0;list-style:none}
    li{padding:12px 16px;margin-bottom:6px;border-left:3px solid #c8c8be;color:#55564e;font-size:21px}
    li.active{background:#dfecd9;border-color:#225c34;color:#191919;font-weight:bold}.panel{background:white;border:1px solid #ccc;border-radius:12px;padding:28px}
    #state{font-size:18px;color:#55564e}#decision{padding:14px;background:#f2f1ec;font-size:23px;font-weight:bold}
    .limits{position:absolute;bottom:36px;font-size:18px;color:#55564e}
  </style><div class="label">TECHSIDER · SYNTHETIC EXAMPLE</div><h1>Review a draft before action</h1>
  <p>Local permission rules. Invented request ${escape(walkthrough.item)}.</p><div class="row"><ol>${states.map((s, i) => `<li data-step="${i}">${escape(s.step[0].toUpperCase() + s.step.slice(1))}</li>`).join("")}</ol>
  <section class="panel"><div id="state"></div><h2 id="title"></h2><p id="action"></p><p id="decision"></p><p>No message or system update is performed.</p></section></div>
  <p class="limits">No AI model, customer data or external connector. This recording does not measure AI quality or time saved.</p></html>`);
  for (const [i, state] of states.entries()) {
    await page.evaluate(({ i, state }) => {
      document.querySelectorAll("li").forEach((li, n) => li.classList.toggle("active", i === n));
      document.querySelector("#state").textContent = `STEP ${i + 1} / 7 · ${state.version ? "VERSION " + state.version : "REVIEW RECORD"}`;
      document.querySelector("#title").textContent = state.state.replaceAll("-", " ");
      document.querySelector("#action").textContent = state.action;
      document.querySelector("#decision").textContent = state.allowed ? "Permission check: allowed · simulation only" : "Permission check: blocked";
    }, { i, state });
    if (i === 1) await page.screenshot({ path: new URL("workflow-control-poster.png", output).pathname });
    await page.waitForTimeout(3000);
  }
  const video = page.video();
  await context.close();
  const raw = await video.path();
  copyFileSync(raw, join(working, "recording.webm"));
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", join(working, "recording.webm"), "-an", "-c:v", "libx264", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", new URL("workflow-controls.mp4", output).pathname]);
  console.log("Recorded seven local control states; no external actions.");
} finally {
  await browser.close();
  rmSync(working, { recursive: true, force: true });
}
