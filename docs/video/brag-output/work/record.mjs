#!/usr/bin/env node
// Records the real app (mock mode) as a JPEG frame sequence, optionally driving it
// with typing and clicks, so the video shows the UI actually working.
//
//   node record.mjs <clip>            # see `clips` below
// Output: work/clips/<clip>/0000.jpg … and meta.json { fps, frames, width, height }
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = "http://localhost:5689";

// Each clip: url, viewport, seconds to record, fps, and timed actions.
// Actions: { at, type: "click", text } clicks the smallest visible element containing text;
//          { at, type: "type", selector, text, cps } types into a field.
const clips = {
  "research-probe": { url: `${root}/list/dutch-oven/research`, seconds: 16, fps: 2, scale: 1 },
  "offer-probe": { url: `${root}/offers/jess-dutch-oven`, seconds: 8, fps: 2, scale: 1, actions: [{ at: 1, type: "click", text: "Accept $170" }] },
  "publish-probe": { url: `${root}/list/dutch-oven/publish`, seconds: 8, fps: 2, scale: 1, actions: [{ at: 1, type: "click", text: "Publish listing" }] },
  "words-probe": { url: `${root}/list/dutch-oven/words`, seconds: 8, fps: 2, scale: 1 },
  "findings-probe": { url: `${root}/list/dutch-oven/research?view=findings`, seconds: 8, fps: 2, scale: 1 },
  "sidekick-probe": {
    url: `${root}/tools/sidekick`, seconds: 14, fps: 2, scale: 1,
    actions: [
      { at: 0.5, type: "type", selector: "input", text: "black wrap dress, $120", cps: 25 },
      { at: 2, type: "click", text: "Check it" },
    ],
  },
  "findings-answer": {
    url: `${root}/list/dutch-oven/research?view=findings`, seconds: 7, fps: 15, scale: 2,
    actions: [{ at: 2.2, type: "click", text: "Yes, the original box" }],
  },
  "publish-live": {
    url: `${root}/list/dutch-oven/publish`, seconds: 7, fps: 15, scale: 2,
    actions: [{ at: 1.6, type: "click", text: "Publish listing" }],
  },
  "offer-accept": {
    url: `${root}/offers/jess-dutch-oven`, seconds: 9, fps: 15, scale: 2,
    actions: [{ at: 1.8, type: "click", text: "Accept $170" }, { at: 4.4, type: "click", text: "Sell it" }],
  },
  "sidekick-check": {
    url: `${root}/tools/sidekick`, seconds: 10, fps: 15, scale: 2,
    // The prototype prices a check at random; pin it to $70 so it matches the hero's "better buy".
    init: "{ const r = Math.random; Math.random = function () { return /addCheck/.test(new Error().stack) ? 0.625 : r(); }; }",
    actions: [
      { at: 0.8, type: "type", selector: "input", text: "black wrap dress, $120", cps: 18 },
      { at: 2.6, type: "click", text: "Check it" },
    ],
  },
  "start-probe": {
    url: `${root}/list/new`, seconds: 9, fps: 2, scale: 1,
    actions: [
      { at: 0.8, type: "type", selector: "input, textarea", text: "Le Creuset dutch oven, the yellow one", cps: 22 },
      { at: 3.4, type: "click", text: "Look it up for me" },
    ],
  },
  "start-to-research": {
    url: `${root}/list/new`,
    seconds: 22,
    fps: 15,
    scale: 2,
    actions: [
      { at: 0.8, type: "type", selector: "input, textarea", text: "Le Creuset dutch oven, the yellow one", cps: 22 },
      { at: 3.4, type: "click", text: "Look it up for me" },
    ],
  },
};

const name = process.argv[2];
const clip = clips[name];
if (!clip) throw new Error(`Unknown clip ${name}. Try: ${Object.keys(clips).join(", ")}`);
const dir = join(here, "clips", name);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const hide = `a[href="?view=live"], a[href="?view=mock"], nextjs-portal { display: none !important; } *{caret-color:transparent!important}`;
const cdp = await launch(9351);
const { send, once, evaluate } = cdp;
await send("Page.enable");
await send("Network.enable");
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = ${JSON.stringify(hide)}; document.head.appendChild(s); });`,
});
if (clip.init) await send("Page.addScriptToEvaluateOnNewDocument", { source: clip.init });
await send("Network.setCookie", { name: "rs_view", value: "1", url: new URL(clip.url).origin, path: "/" });
const width = clip.width ?? 1600;
const height = clip.height ?? 1000;
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: clip.scale, mobile: Boolean(clip.mobile) });
const loaded = once("Page.loadEventFired");
await send("Page.navigate", { url: clip.url });
await Promise.race([loaded, sleep(20000)]);
await evaluate("document.fonts.ready");
await sleep(clip.settle ?? 1200);

async function act(a) {
  if (a.type === "click") {
    const pt = await evaluate(`(() => {
      const els = [...document.querySelectorAll("button, a, [role=button], label, div, span")].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && el.textContent.replace(/\\s+/g, " ").includes(${JSON.stringify(a.text)});
      });
      const area = (el) => el.getBoundingClientRect().width * el.getBoundingClientRect().height;
      // Prefer real buttons/links whose own text is exactly the label, then the smallest match.
      const rank = (el) => (/^(BUTTON|A)$/.test(el.tagName) || el.getAttribute("role") === "button" ? 0 : 2) + (el.textContent.replace(/\s+/g, " ").trim() === ${JSON.stringify(a.text)} ? 0 : 1);
      els.sort((x, y) => rank(x) - rank(y) || area(x) - area(y));
      const r = els[0]?.getBoundingClientRect();
      return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    })()`);
    if (!pt) return console.warn(`click target not found: ${a.text}`);
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
      await send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", clickCount: 1 });
    a.point = pt;
  } else if (a.type === "type") {
    // Clear any pre-filled value the React way, then focus and type.
    await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(a.selector)});
      if (!el) return;
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, "");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.focus();
    })()`);
    a.pending = [...a.text];
    log.push({ at: (Date.now() - t0) / 1000, frame: currentFrame, typing: a.text });
    a.nextAt = a.at;
  }
}

const frames = Math.round(clip.seconds * clip.fps);
const actions = (clip.actions ?? []).map((a) => ({ ...a }));
const t0 = Date.now();
const log = [];
let currentFrame = 0;
for (let i = 0; i < frames; i++) {
  currentFrame = i;
  const target = i / clip.fps;
  // Wall clock drives the app's own animations; wait until this frame's time.
  const wait = t0 + target * 1000 - Date.now();
  if (wait > 0) await sleep(wait);
  const now = (Date.now() - t0) / 1000;
  for (const a of actions) {
    if (!a.done && !a.started && now >= a.at) {
      a.started = true;
      await act(a);
      if (a.type === "click") (a.done = true), log.push({ at: now, frame: i, click: a.point, text: a.text });
    }
    if (a.pending) {
      while (a.pending.length && now >= a.nextAt) {
        await send("Input.insertText", { text: a.pending.shift() });
        a.nextAt += 1 / a.cps;
      }
      if (!a.pending.length) (a.done = true), (a.pending = null), log.push({ at: now, frame: i, typed: a.text });
    }
  }
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  writeFileSync(join(dir, `${String(i).padStart(4, "0")}.jpg`), Buffer.from(data, "base64"));
}
const real = (Date.now() - t0) / 1000;
writeFileSync(join(dir, "meta.json"), JSON.stringify({ fps: clip.fps, frames, width: width * clip.scale, height: height * clip.scale, realSeconds: real, log }, null, 1));
console.log(`${name}: ${frames} frames in ${real.toFixed(1)}s (target ${clip.seconds}s)`);
cdp.kill();
