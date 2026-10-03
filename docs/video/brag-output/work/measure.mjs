#!/usr/bin/env node
// Dumps every visible text element (and buttons/inputs) with its page rect for the
// screens the video animates, at the same viewport as docs/video/capture.mjs.
// Output: work/rects/<shot>.json  [{ text, x, y, w, h, tag }]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = "http://localhost:5689";
const store = (s, path = "/") => `http://${s}.localhost:5689${path}`;
const desktop = { width: 1600, height: 1000, scale: 1, mobile: false };
const phone = { width: 390, height: 844, scale: 1, mobile: true };

const pages = [
  ["l1-landing-hero", `${root}/`, false, desktop],
  ["a5-inbox", `${root}/inbox`, true, desktop],
  ["b5-sales-payouts", `${root}/sales`, true, desktop],
  ["c2-research", `${root}/list/dutch-oven/research`, true, desktop],
  ["c2-research-done", `${root}/list/dutch-oven/research`, true, desktop, 15000],
  ["c3-findings", `${root}/list/dutch-oven/research?view=findings`, true, desktop],
  ["c5-photos", `${root}/list/dutch-oven/photos`, true, desktop],
  ["c6-words", `${root}/list/dutch-oven/words`, true, desktop],
  ["c7-publish", `${root}/list/dutch-oven/publish`, true, desktop],
  ["c10-offer", `${root}/offers/jess-dutch-oven`, true, desktop],
  ["d3-api", `${root}/tools/api`, true, desktop],
  ["d4-sidekick", `${root}/tools/sidekick`, true, desktop],
  ["p2-store", store("maya"), true, desktop],
  ["p4-checkout", `${root}/checkout/35mm-film-camera`, true, desktop],
  ["p6-messages", `${root}/messages`, true, desktop],
  ["p7-buyer-agent", `${root}/agent`, true, desktop],
  ["c1-start", `${root}/list/new`, true, desktop],
  ["m-c1-start", `${root}/list/new`, true, phone],
  ["m-d4-sidekick", `${root}/tools/sidekick`, true, phone],
  ["m-p2-store", store("maya"), true, phone],
];

const only = process.argv.slice(2);
const todo = only.length ? pages.filter(([id]) => only.some((p) => id.startsWith(p))) : pages;
const out = join(here, "rects");
mkdirSync(out, { recursive: true });

const dump = `(() => {
  const res = [];
  const seen = new Set();
  const vis = (el) => {
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05;
  };
  for (const el of document.querySelectorAll("body *")) {
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || !vis(el)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ").replace(/\\s+/g, " ").trim();
    const isCtl = ["BUTTON", "A", "INPUT", "TEXTAREA", "IMG", "svg"].includes(el.tagName);
    const text = own || (isCtl ? (el.getAttribute("placeholder") || el.getAttribute("aria-label") || el.textContent || "").replace(/\\s+/g, " ").trim() : "");
    if (!text && !isCtl) continue;
    const key = el.tagName + Math.round(r.x) + "," + Math.round(r.y) + text;
    if (seen.has(key)) continue;
    seen.add(key);
    res.push({ text: text.slice(0, 120), tag: el.tagName.toLowerCase(), x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return res;
})()`;

const hide = `a[href="?view=live"], a[href="?view=mock"], nextjs-portal { display: none !important; }`;
const cdp = await launch(9341);
const { send, once, evaluate } = cdp;
await send("Page.enable");
await send("Network.enable");
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = ${JSON.stringify(hide)}; document.head.appendChild(s); });`,
});
for (const [id, url, mock, device, wait = 3500] of todo) {
  const host = new URL(url).origin;
  if (mock) await send("Network.setCookie", { name: "rs_view", value: "1", url: host, path: "/" });
  else await send("Network.deleteCookies", { name: "rs_view", url: host });
  await send("Emulation.setDeviceMetricsOverride", {
    width: device.width,
    height: device.height,
    deviceScaleFactor: 1,
    mobile: device.mobile,
  });
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url });
  await Promise.race([loaded, sleep(20000)]);
  await sleep(wait);
  await evaluate("document.fonts.ready.then(() => window.scrollTo(0, 0))");
  await sleep(300);
  const rects = await evaluate(dump);
  writeFileSync(join(out, `${id}.json`), JSON.stringify(rects, null, 0));
  console.log(`${id.padEnd(20)} ${rects.length} elements`);
}
cdp.kill();
