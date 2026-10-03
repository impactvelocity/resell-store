// Minimal Chrome DevTools Protocol helpers shared by measure.mjs and render.mjs.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch(port) {
  const profile = mkdtempSync(join(tmpdir(), "rs-brag-"));
  const proc = spawn(
    chromePath,
    [
      "--headless=new",
      "--hide-scrollbars",
      "--no-first-run",
      "--allow-file-access-from-files",
      "--force-color-profile=srgb",
      "--font-render-hinting=none",
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let wsUrl;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      wsUrl = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
    } catch {}
    if (!wsUrl) await sleep(150);
  }
  if (!wsUrl) throw new Error("Chrome didn't start");
  const cdp = await connect(wsUrl);
  cdp.kill = () => {
    cdp.ws.close();
    proc.kill();
  };
  return cdp;
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      for (const l of listeners) l(msg);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const once = (method) =>
    new Promise((resolve) => {
      const l = (m) => {
        if (m.method === method) {
          listeners.delete(l);
          resolve(m.params);
        }
      };
      listeners.add(l);
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  return new Promise((resolve) => (ws.onopen = () => resolve({ send, once, evaluate, ws })));
}
