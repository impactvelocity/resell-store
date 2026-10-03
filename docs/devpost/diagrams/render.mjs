#!/usr/bin/env node
/*
 * Renders each .board in diagrams.html to its own PNG at 2x.
 *
 *   node docs/devpost/diagrams/render.mjs            # every board
 *   node docs/devpost/diagrams/render.mjs 02 04      # only boards whose id starts with these
 *
 * Needs Google Chrome and a network connection (Google Fonts).
 * Writes docs/devpost/diagrams/<board id>.png.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const page = pathToFileURL(join(here, "diagrams.html")).href;
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9334;
const scale = 2;

const only = process.argv.slice(2);
const profile = mkdtempSync(join(tmpdir(), "rs-diagrams-"));
const proc = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--allow-file-access-from-files",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const tab = list.find((t) => t.type === "page");
      if (tab) return tab.webSocketDebuggerUrl;
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

const evaluate = async (cdp, expression) =>
  (await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

try {
  const cdp = await connect(await target());
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 1000, deviceScaleFactor: scale, mobile: false });
  await cdp.send("Page.navigate", { url: page });
  // Fonts and logos loaded, templates expanded
  await evaluate(cdp, `new Promise((r) => {
    const go = () => document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {})))).then(r);
    document.readyState === "complete" ? go() : addEventListener("load", go);
  })`);
  await sleep(300);

  const boards = await evaluate(cdp, `[...document.querySelectorAll(".board")].map((b) => {
    const r = b.getBoundingClientRect();
    return { id: b.id, x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
  })`);

  for (const b of boards) {
    if (only.length && !only.some((p) => b.id.startsWith(p))) continue;
    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: Math.round(b.x), y: Math.ceil(b.y), width: b.width, height: Math.floor(b.y + b.height) - Math.ceil(b.y), scale: 1 },
    });
    const file = join(here, `${b.id}.png`);
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`${b.id}.png  ${b.width * scale}×${Math.round(b.height * scale)}`);
  }
  cdp.close();
} finally {
  proc.kill();
}
