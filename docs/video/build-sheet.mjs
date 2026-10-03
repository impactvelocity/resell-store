#!/usr/bin/env node
/*
 * Turns STORYBOARD.md into storyboard.html, a contact sheet for reviewing the
 * plan: one card per frame with its main capture, timing, on-screen type and VO.
 *
 *   node docs/video/build-sheet.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(here, "STORYBOARD.md"), "utf8");

const esc = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unquote = (s = "") => s.replace(/^"(.*)"$/, "$1");

const message = unquote(md.match(/^message: (.*)$/m)?.[1]);
const frames = md
  .split(/^## Frame /m)
  .slice(1)
  .map((block) => {
    const [head, ...rest] = block.split("\n");
    const [num, title] = head.split(" — ");
    const meta = {};
    const narrative = [];
    for (const line of rest) {
      if (line.startsWith("---") || line.startsWith("## ")) break;
      const m = line.match(/^- (\w+): (.*)$/);
      if (m) meta[m[1]] = unquote(m[2]);
      else if (line.trim()) narrative.push(line.trim());
    }
    const shot = meta.assets?.match(/captures\/(?:desktop|phone)\/[\w-]+\.png/)?.[0];
    const shots = [...(meta.assets ?? "").matchAll(/(?:captures\/(desktop|phone)\/)?([\w-]+)\.png/g)];
    let dir = "desktop";
    const all = shots.map(([, d, name]) => {
      if (d) dir = d;
      return `captures/${dir}/${name}.png`;
    });
    return { num, title, meta, narrative: narrative.join(" "), shot, all };
  });

let t = 0;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const cards = frames
  .map((f) => {
    const dur = parseFloat(f.meta.duration) || 0;
    const start = clock(t);
    t += dur;
    const visual = f.shot
      ? `<img src="${f.shot}" alt="" loading="lazy">`
      : `<div class="type">${esc(f.meta.card ?? f.meta.scene)}</div>`;
    const more = f.all.filter((a) => a !== f.shot);
    return `
    <article>
      <div class="visual">${visual}<span class="num">${f.num}</span></div>
      <div class="body">
        <p class="when">${start}–${clock(t)} · ${dur}s · ${esc(f.meta.transition_in ?? "")}</p>
        <h2>${esc(f.title)}</h2>
        <p class="scene">${esc(f.meta.scene)}</p>
        ${f.meta.on_screen ? `<p class="label">On screen</p><p class="onscreen">${esc(f.meta.on_screen)}</p>` : ""}
        <p class="label">Voiceover</p>
        <p class="vo">“${esc(f.meta.voiceover)}”</p>
        <details><summary>Direction</summary><p>${esc(f.narrative)}</p>
        ${more.length ? `<div class="more">${more.map((a) => `<a href="${a}" target="_blank"><img src="${a}" alt="" loading="lazy"></a>`).join("")}</div>` : ""}
        </details>
      </div>
    </article>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demo Video Storyboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #fffdf2; --card: #ffffff; --ink: #14261d; --muted: #56675e; --line: #e8e3c8;
    --lemon: #ffd934; --leaf: #256b4c; --pink: #ff5fa8; --soft: #f7f3df;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0f1c15; --card: #16271e; --ink: #f3f1e4; --muted: #a7b5ac; --line: #26392e; --soft: #1d3127;
    }
  }
  :root[data-theme="dark"] {
    --bg: #0f1c15; --card: #16271e; --ink: #f3f1e4; --muted: #a7b5ac; --line: #26392e; --soft: #1d3127;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 Figtree, system-ui, sans-serif; }
  header { max-width: 1280px; margin: 0 auto; padding: 48px 16px 24px; }
  h1 { font: 800 clamp(36px, 6vw, 64px)/1 "Bricolage Grotesque", system-ui, sans-serif; letter-spacing: -0.03em; margin: 0 0 12px; }
  header p { margin: 0; color: var(--muted); font-size: 18px; max-width: 760px; }
  header .total { display: inline-block; margin-top: 16px; background: var(--lemon); color: #14261d; font-weight: 700; padding: 4px 14px; border-radius: 999px; }
  main { max-width: 1280px; margin: 0 auto; padding: 8px 16px 64px; display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); }
  article { background: var(--card); border: 1px solid var(--line); border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; }
  .visual { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: var(--soft); border-bottom: 1px solid var(--line); }
  .visual img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block; }
  .visual img[src*="/phone/"] { object-fit: contain; object-position: center; padding: 12px 0; }
  .visual .type { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; font: 800 clamp(24px, 3vw, 34px)/1.05 "Bricolage Grotesque", system-ui, sans-serif; letter-spacing: -0.02em; }
  .num { position: absolute; top: 12px; left: 12px; width: 36px; height: 36px; border-radius: 50%; background: var(--lemon); color: #14261d; font: 800 18px/36px "Bricolage Grotesque", sans-serif; text-align: center; }
  .body { padding: 18px 20px 20px; }
  .when { margin: 0; color: var(--muted); font-size: 13px; font-weight: 600; }
  h2 { margin: 2px 0 6px; font: 800 24px/1.15 "Bricolage Grotesque", system-ui, sans-serif; letter-spacing: -0.01em; }
  .scene { margin: 0 0 10px; color: var(--muted); }
  .label { margin: 12px 0 2px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--leaf); }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .label { color: #8cc9a4; } }
  :root[data-theme="dark"] .label { color: #8cc9a4; }
  .onscreen { margin: 0; font-weight: 600; }
  .vo { margin: 0; font-style: italic; border-left: 3px solid var(--pink); padding-left: 10px; }
  details { margin-top: 14px; color: var(--muted); font-size: 15px; }
  summary { cursor: pointer; font-weight: 700; color: var(--ink); }
  .more { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .more img { height: 64px; border-radius: 8px; border: 1px solid var(--line); }
</style>
</head>
<body>
<header>
  <h1>resell.store demo storyboard</h1>
  <p>${esc(message)}</p>
  <span class="total">${frames.length} frames · ${clock(t)}</span>
</header>
<main>${cards}
</main>
</body>
</html>
`;

writeFileSync(join(here, "storyboard.html"), html);
console.log(`storyboard.html: ${frames.length} frames, ${clock(t)}`);
