#!/usr/bin/env node
/*
 * Renders work/index.html frame by frame in headless Chrome.
 *
 *   node render.mjs stills 3.2 10 41.5     # PNG stills → work/stills/
 *   node render.mjs sheet                   # one still per scene (mid + transition) → work/stills/
 *   node render.mjs cues                    # → work/cues.json (scene starts + SFX cues)
 *   node render.mjs video [workers]         # → work/video-silent.mp4
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch } from "./cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(join(here, "index.html")).href;
const FPS = 30;
const [mode = "sheet", ...args] = process.argv.slice(2);

async function openPage(port) {
  const cdp = await launch(port);
  const { send, once, evaluate } = cdp;
  await send("Page.enable");
  await send("Runtime.enable");
  cdp.errors = [];
  cdp.ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.method === "Runtime.exceptionThrown") cdp.errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") cdp.errors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
  });
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: pageUrl });
  await loaded;
  await evaluate("window.__ready");
  cdp.duration = await evaluate("window.__duration");
  return cdp;
}

async function shoot(cdp, t, format = "png") {
  await cdp.evaluate(`window.__seek(${t})`);
  const { data } = await cdp.send("Page.captureScreenshot", {
    format,
    ...(format === "jpeg" ? { quality: 94 } : {}),
    clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 },
  });
  return Buffer.from(data, "base64");
}

if (mode === "stills" || mode === "sheet") {
  const cdp = await openPage(9361);
  const dir = join(here, "stills");
  mkdirSync(dir, { recursive: true });
  let times = args.map(Number);
  if (mode === "sheet") {
    const scenes = await cdp.evaluate("window.__scenes");
    times = scenes.flatMap((s) => [s.start + Math.min(s.dur * 0.55, s.dur - 0.6), s.start + s.dur - 0.12]);
  }
  for (const t of times) {
    const file = join(dir, `t${t.toFixed(2).padStart(7, "0")}.png`);
    writeFileSync(file, await shoot(cdp, t));
    console.log(file);
  }
  if (cdp.errors.length) console.error("PAGE ERRORS:\n" + [...new Set(cdp.errors)].join("\n"));
  cdp.kill();
} else if (mode === "cues") {
  const cdp = await openPage(9362);
  const out = { duration: cdp.duration, scenes: await cdp.evaluate("window.__scenes"), cues: await cdp.evaluate("window.__cues") };
  writeFileSync(join(here, "cues.json"), JSON.stringify(out, null, 1));
  console.log(`duration ${out.duration.toFixed(2)}s, ${out.scenes.length} scenes, ${out.cues.length} cues`);
  if (cdp.errors.length) console.error("PAGE ERRORS:\n" + [...new Set(cdp.errors)].join("\n"));
  cdp.kill();
} else if (mode === "video") {
  const workers = Number(args[0] ?? 6);
  const probe = await openPage(9370);
  const total = Math.round(probe.duration * FPS);
  probe.kill();
  const segDir = join(here, "segments");
  rmSync(segDir, { recursive: true, force: true });
  mkdirSync(segDir, { recursive: true });
  const per = Math.ceil(total / workers);
  const started = Date.now();
  const done = new Array(workers).fill(0);
  const tick = setInterval(() => {
    const n = done.reduce((a, b) => a + b, 0);
    process.stdout.write(`\r${n}/${total} frames  ${((Date.now() - started) / 1000).toFixed(0)}s   `);
  }, 2000);
  await Promise.all(
    Array.from({ length: workers }, async (_, w) => {
      const from = w * per;
      const to = Math.min(total, from + per);
      if (from >= to) return;
      const cdp = await openPage(9380 + w);
      const file = join(segDir, `${String(w).padStart(2, "0")}.mp4`);
      const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), file], { stdio: ["pipe", "inherit", "inherit"] });
      for (let f = from; f < to; f++) {
        const buf = await shoot(cdp, f / FPS, "jpeg");
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
        done[w]++;
      }
      ff.stdin.end();
      await new Promise((r) => ff.on("close", r));
      if (cdp.errors.length) console.error(`\nworker ${w} PAGE ERRORS:\n` + [...new Set(cdp.errors)].join("\n"));
      cdp.kill();
    }),
  );
  clearInterval(tick);
  const list = Array.from({ length: workers }, (_, w) => `file '${join(segDir, `${String(w).padStart(2, "0")}.mp4`)}'`).join("\n");
  writeFileSync(join(segDir, "list.txt"), list);
  await new Promise((r) => spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(segDir, "list.txt"), "-c", "copy", join(here, "video-silent.mp4")], { stdio: "inherit" }).on("close", r));
  console.log(`\nvideo-silent.mp4: ${total} frames in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
