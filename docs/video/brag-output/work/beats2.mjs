// Refines the beat grid against local onset peaks and estimates the key.
import { readFileSync, writeFileSync } from "node:fs";
const m = JSON.parse(readFileSync("audio/music.json", "utf8"));
const b = readFileSync("audio/music.f32");
const x = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
const SR = 22050;
// onset envelope (full band log-energy flux, 5ms hop)
const HOP = 110, WIN = 512, nF = Math.floor((x.length - WIN) / HOP);
const e = new Float32Array(nF);
for (let f = 0; f < nF; f++) { let s = 0; for (let k = 0; k < WIN; k++) s += x[f * HOP + k] ** 2; e[f] = Math.log(1e-6 + s); }
const on = new Float32Array(nF); for (let f = 1; f < nF; f++) on[f] = Math.max(0, e[f] - e[f - 1]);
const fps = SR / HOP;
// local peak near each predicted beat (±45ms); keep confident ones; linear fit idx→time
const cand = [];
m.beats.forEach((t, i) => { const c = Math.round(t * fps), r = Math.round(0.06 * fps); let bi = c, bv = 0; for (let f = c - r; f <= c + r; f++) if (on[f] > bv) { bv = on[f]; bi = f; } cand.push([i, bi / fps, bv]); });
const sorted = cand.map((p) => p[2]).sort((a, b) => a - b);
const thr = sorted[Math.floor(sorted.length * 0.55)];
let pts = cand.filter((p) => p[2] >= thr).map(([i, t]) => [i, t]);
// two passes: fit, drop outliers > 35ms, refit
for (let pass = 0; pass < 2; pass++) {
  const n0 = pts.length, sx0 = pts.reduce((a, p) => a + p[0], 0), sy0 = pts.reduce((a, p) => a + p[1], 0), sxx0 = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy0 = pts.reduce((a, p) => a + p[0] * p[1], 0);
  const per0 = (n0 * sxy0 - sx0 * sy0) / (n0 * sxx0 - sx0 * sx0), ph0 = (sy0 - per0 * sx0) / n0;
  pts = pts.filter(([i, t]) => Math.abs(t - (ph0 + i * per0)) < 0.035);
}
const n = pts.length, sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0), sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
const period = (n * sxy - sx * sy) / (n * sxx - sx * sx), phase = (sy - period * sx) / n;
const resid = pts.map(([i, t]) => t - (phase + i * period)); resid.sort((a, b) => a - b);
console.log(`refined: period ${period.toFixed(5)} (bpm ${(60 / period).toFixed(2)}) phase ${phase.toFixed(4)}  confident beats ${n}/${m.beats.length}  median |resid| ${(resid.map(Math.abs).sort((a, b) => a - b)[Math.floor(n / 2)] * 1000).toFixed(1)}ms`);
// Key: chroma via Goertzel on semitones C2..B6 over the whole track (decimated frames)
const notes = []; for (let midi = 36; midi < 96; midi++) notes.push(midi);
const chroma = new Float64Array(12);
const FR = 4096;
for (let start = SR * 12; start + FR < x.length - SR * 3; start += FR * 6) {
  for (const midi of notes) {
    const f = 440 * 2 ** ((midi - 69) / 12), w = 2 * Math.PI * f / SR, c = 2 * Math.cos(w);
    let s1 = 0, s2 = 0; for (let k = 0; k < FR; k++) { const hann = 0.5 - 0.5 * Math.cos(2 * Math.PI * k / FR); const s0 = x[start + k] * hann + c * s1 - s2; s2 = s1; s1 = s0; }
    chroma[midi % 12] += Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2);
  }
}
const maj = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], min = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const corr = (a, b) => { const ma = a.reduce((p, q) => p + q) / 12, mb = b.reduce((p, q) => p + q) / 12; let num = 0, da = 0, db = 0; for (let i = 0; i < 12; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return num / Math.sqrt(da * db); };
const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const scores = [];
for (let k = 0; k < 12; k++) { const rot = (p) => p.map((_, i) => p[(i - k + 12) % 12]); scores.push([`${names[k]} major`, corr([...chroma], rot(maj)), k, "maj"], [`${names[k]} minor`, corr([...chroma], rot(min)), k, "min"]); }
scores.sort((a, b) => b[1] - a[1]);
console.log("key candidates:", scores.slice(0, 4).map((s) => `${s[0]} ${s[1].toFixed(3)}`).join(", "));
console.log("chroma:", names.map((nm, i) => `${nm}:${(chroma[i] / Math.max(...chroma)).toFixed(2)}`).join(" "));
m.period = period; m.phase = phase; m.beats = []; for (let t = phase; t < m.duration; t += period) m.beats.push(+t.toFixed(3));
m.key = { name: scores[0][0], root: scores[0][2], mode: scores[0][3] };
writeFileSync("audio/music.json", JSON.stringify(m, null, 1));
