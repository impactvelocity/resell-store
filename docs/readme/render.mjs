#!/usr/bin/env node
/*
 * Renders the README hero: hero.html to hero.png at 2x (2560x1280, the
 * GitHub social preview ratio). The screens in it are the mock-mode
 * captures from docs/video/captures.
 *
 *   node docs/readme/render.mjs
 *
 * Needs Google Chrome and a network connection (Google Fonts).
 */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const width = 1280;
const height = 640;
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9345;
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
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: false });
const loaded = once("Page.loadEventFired");
await send("Page.navigate", { url: "file://" + join(here, "hero.html") });
await Promise.race([loaded, sleep(15000)]);
await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
await sleep(800);
const { data } = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } });
const out = join(here, "hero.png");
writeFileSync(out, Buffer.from(data, "base64"));
console.log(out, `${width * 2}x${height * 2}`);
ws.close();
proc.kill();
