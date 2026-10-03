#!/usr/bin/env node
/*
 * Renders the Devpost diagrams: each src/NN-*.html to images/NN-*.png at 2x
 * (1200px wide pages, so 2400px PNGs that stay sharp in Devpost's story column).
 *
 *   node docs/devpost/src/render.mjs          # every diagram
 *   node docs/devpost/src/render.mjs 03 04    # only files starting with these
 *
 * Needs Google Chrome and a network connection (Google Fonts).
 * Email thumbnails in src/assets/emails are screenshots of the real
 * packages/email templates rendered with their PreviewProps.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "images");
const width = 1200;
const only = process.argv.slice(2);
const files = readdirSync(here)
  .filter((f) => /^\d\d-.*\.html$/.test(f))
  .filter((f) => !only.length || only.some((p) => f.startsWith(p)))
  .map((f) => join(here, f));
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9344;
const profile = mkdtempSync(join(tmpdir(), "rs-shoot-"));
const proc = spawn(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--allow-file-access-from-files", `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });
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

const ws = new WebSocket(await target());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const listeners = new Set();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  } else if (m.method) for (const l of listeners) l(m);
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params }));
});
const once = (method) => new Promise((r) => {
  const l = (m) => { if (m.method === method) { listeners.delete(l); r(m.params); } };
  listeners.add(l);
});

await send("Page.enable");
mkdirSync(outDir, { recursive: true });
for (const f of files) {
  await send("Emulation.setDeviceMetricsOverride", { width: width, height: 800, deviceScaleFactor: 2, mobile: false });
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: "file://" + f });
  await Promise.race([loaded, sleep(15000)]);
  await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  await sleep(800);
  const { result } = await send("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true });
  const { data } = await send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: width, height: result.value, scale: 1 },
  });
  const out = join(outDir, basename(f).replace(/\.html$/, ".png"));
  writeFileSync(out, Buffer.from(data, "base64"));
  console.log(out, `${width}x${result.value}`);
}
ws.close();
proc.kill();
