#!/usr/bin/env node
/*
 * Renders the buyer and seller flow diagrams for the Devpost story to PNG.
 *
 *   node docs/devpost/flows/render.mjs            # every diagram
 *   node docs/devpost/flows/render.mjs 04 05      # only files starting with these
 *
 * Each src/*.html is laid out 800px wide and shot at 2x (1600px PNG), so it stays
 * sharp in Devpost's ~700px story column. Needs Google Chrome and network for
 * the Google Fonts (Bricolage Grotesque + Figtree, as on the site).
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "src");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9334;
const WIDTH = 800;
const SCALE = 2;

const only = process.argv.slice(2);
const files = readdirSync(src)
  .filter((f) => f.endsWith(".html"))
  .filter((f) => !only.length || only.some((p) => f.startsWith(p)))
  .sort();

const proc = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "rs-diagrams-"))}`,
  `--remote-debugging-port=${port}`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome didn't start");
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return new Promise((resolve) => (ws.onopen = () => resolve({ send, close: () => ws.close() })));
}

const cdp = await connect(await target());
const evaluate = async (expression) =>
  (await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

try {
  for (const file of files) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 1000, deviceScaleFactor: SCALE, mobile: false });
    await cdp.send("Page.navigate", { url: pathToFileURL(join(src, file)).href });
    for (let i = 0; i < 100 && (await evaluate("document.readyState")) !== "complete"; i++) await sleep(100);
    await evaluate("document.fonts.ready.then(() => true)");
    await sleep(300);
    const height = await evaluate("Math.ceil(document.documentElement.getBoundingClientRect().height)");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height, deviceScaleFactor: SCALE, mobile: false });
    await sleep(200);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    const out = join(here, file.replace(/\.html$/, ".png"));
    writeFileSync(out, Buffer.from(data, "base64"));
    console.log(`${file} → ${out.split("/").pop()} (${WIDTH * SCALE}×${height * SCALE})`);
  }
} finally {
  cdp.close();
  proc.kill();
}
