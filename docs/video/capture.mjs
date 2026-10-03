#!/usr/bin/env node
/*
 * Captures the app's screens for the demo video.
 *
 *   node docs/video/capture.mjs            # every shot
 *   node docs/video/capture.mjs c2 p4      # only shots whose id starts with these
 *
 * Needs the dev server on :5689 and Google Chrome. Mock shots set the rs_view
 * cookie on each host so the designed prototype (the dutch oven story) shows.
 * Email shots need the email preview on :5690 (`pnpm email`) and render just
 * the email, without the preview tool around it.
 * Writes PNGs to docs/video/captures/{desktop,phone,email}/.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "captures");
const root = "http://localhost:5689";
const store = (s, path = "/") => `http://${s}.localhost:5689${path}`;
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9333;

const desktop = { width: 1600, height: 1000, scale: 2, mobile: false };
const phone = { width: 390, height: 844, scale: 3, mobile: true };
const email = { width: 680, height: 900, scale: 2, mobile: false, folder: "email" };
const mail = (name) => `http://localhost:5690/preview/${name}`;

// id, url, view (mock | live), device, full (whole page)
const shots = [
  // Landing
  ["l1-landing-hero", `${root}/`, "live", desktop],
  ["l1-landing-full", `${root}/`, "live", desktop, true],
  // Seller onboarding
  ["a1-welcome", `${root}/welcome`, "mock", desktop],
  ["a2-buying-or-selling", `${root}/welcome/start`, "mock", desktop],
  ["a3-home-selling", `${root}/home?mode=selling`, "mock", desktop],
  ["a5-inbox", `${root}/inbox`, "mock", desktop],
  ["b1-create-shop", `${root}/shops/new`, "mock", desktop],
  ["b2-shop-listings", `${root}/shops/mayas-closet`, "mock", desktop],
  ["b3-shop-settings", `${root}/shops/mayas-closet/settings`, "mock", desktop, true],
  ["b4-stats", `${root}/stats`, "mock", desktop],
  ["b5-sales-payouts", `${root}/sales`, "mock", desktop],
  // Listing an item: the dutch oven
  ["c1-start", `${root}/list/new`, "mock", desktop],
  ["c2-research", `${root}/list/dutch-oven/research`, "mock", desktop],
  ["c3-findings", `${root}/list/dutch-oven/research?view=findings`, "mock", desktop],
  ["c4-details", `${root}/list/dutch-oven/details`, "mock", desktop],
  ["c5-photos", `${root}/list/dutch-oven/photos`, "mock", desktop],
  ["c6-words", `${root}/list/dutch-oven/words`, "mock", desktop],
  ["c7-publish", `${root}/list/dutch-oven/publish`, "mock", desktop],
  ["c8-elsewhere", `${root}/list/dutch-oven/publish?view=elsewhere`, "mock", desktop],
  ["c9-manage", `${root}/listings/dutch-oven`, "mock", desktop],
  ["c10-offer", `${root}/offers/jess-dutch-oven`, "mock", desktop],
  // Agents and API
  ["d1-connections", `${root}/tools/connections`, "mock", desktop],
  ["d2-connect-agent", `${root}/tools/agent`, "mock", desktop, true],
  ["d3-api", `${root}/tools/api`, "mock", desktop],
  ["d4-sidekick", `${root}/tools/sidekick`, "mock", desktop],
  ["d5-design-system", `${root}/design-system`, "live", desktop],
  ["d6-api-docs", "http://docs.localhost:5689/", "live", desktop],
  ["d4-sidekick-full", `${root}/tools/sidekick`, "mock", desktop, true],
  // Buyers
  ["p1-discover", `${root}/discover`, "mock", desktop],
  ["p2-store", store("maya"), "mock", desktop],
  ["p3-listing", store("secondshutter", "/35mm-film-camera"), "mock", desktop],
  ["p4-checkout", `${root}/checkout/35mm-film-camera`, "mock", desktop],
  ["p5-offer", `${root}/offer/35mm-film-camera`, "mock", desktop],
  ["p6-messages", `${root}/messages`, "mock", desktop],
  ["p7-buyer-agent", `${root}/agent`, "mock", desktop],
  ["p8-account", `${root}/account`, "mock", desktop],
  // Phone
  ["m-c1-start", `${root}/list/new`, "mock", phone],
  ["m-c2-research", `${root}/list/dutch-oven/research`, "mock", phone],
  ["m-c10-offer", `${root}/offers/jess-dutch-oven`, "mock", phone],
  ["m-a3-home-selling", `${root}/home?mode=selling`, "mock", phone],
  ["m-p2-store", store("maya"), "mock", phone],
  ["m-p3-listing", store("secondshutter", "/35mm-film-camera"), "mock", phone],
  ["m-p4-checkout", `${root}/checkout/35mm-film-camera`, "mock", phone],
  ["m-p6-messages", `${root}/messages`, "mock", phone],
  ["m-d4-sidekick", `${root}/tools/sidekick`, "mock", phone],
  // Notification emails
  ["e-offer-received", mail("offer-received"), "email", email, true],
  ["e-sold", mail("sold"), "email", email, true],
  ["e-paid-out", mail("paid-out"), "email", email, true],
  ["e-agent-summary", mail("agent-summary"), "email", email, true],
];

// Dev-only chrome that shouldn't be in the video.
const hideDevChrome = `
  a[href="?view=live"], a[href="?view=mock"], nextjs-portal { display: none !important; }
  *, *::before, *::after { caret-color: transparent !important; }
`;

const only = process.argv.slice(2);
const todo = only.length ? shots.filter(([id]) => only.some((p) => id.startsWith(p))) : shots;

const profile = mkdtempSync(join(tmpdir(), "rs-capture-"));
const proc = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  `--user-data-dir=${profile}`,
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
  return new Promise((resolve) => (ws.onopen = () => resolve({ send, once, ws })));
}

const cdp = await connect(await target());
const { send, once } = cdp;
await send("Page.enable");
await send("Network.enable");
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = ${JSON.stringify(hideDevChrome)};
    document.head.appendChild(s);
  });`,
});

for (const [shotId, url, view, device, full] of todo) {
  const host = new URL(url).origin;
  if (view === "mock") await send("Network.setCookie", { name: "rs_view", value: "1", url: host, path: "/" });
  else await send("Network.deleteCookies", { name: "rs_view", url: host });

  await send("Emulation.setDeviceMetricsOverride", {
    width: device.width,
    height: device.height,
    deviceScaleFactor: device.scale,
    mobile: device.mobile,
  });
  await send("Emulation.setUserAgentOverride", {
    userAgent: device.mobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  });

  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url });
  await Promise.race([loaded, sleep(20000)]);
  if (view === "email") {
    // The preview shows the email in an iframe's srcdoc; render that alone.
    await sleep(2500);
    const { result } = await send("Runtime.evaluate", {
      expression: `document.querySelector("iframe")?.srcdoc ?? ""`,
      returnByValue: true,
    });
    const { frameTree } = await send("Page.getFrameTree");
    const done = once("Page.loadEventFired");
    await send("Page.setDocumentContent", { frameId: frameTree.frame.id, html: result.value });
    await Promise.race([done, sleep(5000)]);
  }
  // Let fonts, images and entrance animations settle.
  await sleep(3500);
  await send("Runtime.evaluate", {
    expression: `document.fonts.ready.then(() => window.scrollTo(0, 0))`,
    awaitPromise: true,
  });
  await sleep(500);

  let clip;
  if (full) {
    const { result } = await send("Runtime.evaluate", {
      expression: "document.documentElement.scrollHeight",
      returnByValue: true,
    });
    clip = { x: 0, y: 0, width: device.width, height: result.value, scale: 1 };
  }
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: Boolean(full),
    ...(clip ? { clip } : {}),
  });
  const dir = join(out, device.folder ?? (device.mobile ? "phone" : "desktop"));
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${shotId}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log(`${shotId.padEnd(24)} ${url}`);
}

cdp.ws.close();
proc.kill();
