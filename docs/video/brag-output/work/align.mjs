// Aligns script lines to the VO's speech segments by speaking rate, snapping to silences.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const sil = execSync(`ffmpeg -hide_banner -i audio/vo.mp3 -af silencedetect=noise=-38dB:d=0.25 -f null - 2>&1`).toString()
  .split("\n").filter((l) => /silence_(start|end)/.test(l)).map((l) => +l.match(/silence_(?:start|end): ([\d.]+)/)[1]);
const dur = +execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 audio/vo.mp3`).toString();
// speech segments
const segs = [];
let s = 0;
for (let i = 0; i < sil.length; i += 2) { segs.push([s, sil[i]]); s = sil[i + 1]; }
segs.push([s, dur]);
const lines = readFileSync("audio/script.txt", "utf8").trim().split("\n").map((l) => l.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim());
const weight = (t) => t.replace(/[^a-zA-Z0-9]/g, "").length + 6 * (t.match(/[.,:?!]/g) || []).length;
const W = lines.map(weight);
const totalW = W.reduce((a, b) => a + b, 0);
const speech = segs.reduce((a, [x, y]) => a + (y - x), 0);
// map cumulative weight -> time inside speech
const at = (w) => { let acc = 0; for (const [x, y] of segs) { const d = (y - x) / speech * totalW; if (acc + d >= w) return x + (w - acc) / d * (y - x); acc += d; } return dur; };
let cw = 0;
const starts = segs.map((g) => g[0]);
const out = lines.map((text, i) => { const est = at(cw + 0.01); cw += W[i]; let best = 0; for (let k = 1; k < starts.length; k++) if (Math.abs(starts[k] - est) < Math.abs(starts[best] - est)) best = k; return { i: i + 1, est: +est.toFixed(2), seg: best, start: +starts[best].toFixed(2), text }; });
for (let k = 1; k < out.length; k++) if (out[k].seg <= out[k - 1].seg) console.log("COLLISION at line", k + 1);
out.forEach((o, k) => { const endSeg = (k + 1 < out.length ? out[k + 1].seg : segs.length) - 1; o.end = +segs[endSeg][1].toFixed(2); o.segs = `${o.seg}-${endSeg}`; console.log(String(o.i).padStart(2), o.start.toFixed(2).padStart(7), "→", o.end.toFixed(2).padStart(7), `(est ${o.est})`, o.segs.padEnd(6), o.text.slice(0, 70)); });
writeFileSync("audio/lines.json", JSON.stringify(out, null, 1));
console.log("segments:", segs.length, "speech", speech.toFixed(1), "dur", dur.toFixed(2));
console.log(segs.map((g, k) => `${k}:${g[0].toFixed(2)}-${g[1].toFixed(2)}(${(g[1] - g[0]).toFixed(2)})`).join("  "));
