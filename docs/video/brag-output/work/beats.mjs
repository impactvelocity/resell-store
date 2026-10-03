// Tempo, beat grid and energy map of the music bed.
import { readFileSync, writeFileSync } from "node:fs";
const b = readFileSync("audio/music.f32");
const x = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
const SR = 22050, HOP = 256, WIN = 1024;
const nF = Math.floor((x.length - WIN) / HOP);
// Onset strength: half-wave rectified log-energy flux in 4 bands (crude filterbank via one-pole filters).
const bands = [[0, 200], [200, 800], [800, 3000], [3000, 11000]];
const bandSig = bands.map(([lo, hi]) => {
  const out = new Float32Array(x.length);
  const aLo = lo ? Math.exp(-2 * Math.PI * lo / SR) : 0, aHi = Math.exp(-2 * Math.PI * hi / SR);
  let lpHi = 0, lpLo = 0;
  for (let i = 0; i < x.length; i++) { lpHi = (1 - aHi) * x[i] + aHi * lpHi; lpLo = (1 - aLo) * x[i] + aLo * lpLo; out[i] = lo ? lpHi - lpLo : lpHi; }
  return out;
});
const energy = bandSig.map((s) => { const e = new Float32Array(nF); for (let f = 0; f < nF; f++) { let acc = 0; for (let k = 0; k < WIN; k += 2) acc += s[f * HOP + k] ** 2; e[f] = Math.log(1e-6 + acc); } return e; });
const onset = new Float32Array(nF);
for (let f = 1; f < nF; f++) for (const e of energy) onset[f] += Math.max(0, e[f] - e[f - 1]);
const fps = SR / HOP;
// Tempo by autocorrelation over 70–180 BPM.
let best = 0, bestLag = 0;
for (let lag = Math.round(fps * 60 / 180); lag <= Math.round(fps * 60 / 70); lag++) {
  let acc = 0; for (let f = lag; f < nF; f++) acc += onset[f] * onset[f - lag];
  // prefer 90–140
  const bpm = 60 * fps / lag; const w = Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.6) ** 2);
  if (acc * w > best) { best = acc * w; bestLag = lag; }
}
// refine lag with parabolic interpolation
const ac = (lag) => { let acc = 0; for (let f = lag; f < nF; f++) acc += onset[f] * onset[f - lag]; return acc; };
const [y0, y1, y2] = [ac(bestLag - 1), ac(bestLag), ac(bestLag + 1)];
const lagF = bestLag + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2);
const period = lagF / fps, bpm = 60 / period;
// Phase: maximize onset sum on the grid.
let bestPh = 0, bestS = -1;
for (let ph = 0; ph < period; ph += 0.002) { let s = 0; for (let t = ph; t < x.length / SR; t += period) s += onset[Math.round(t * fps)] || 0; if (s > bestS) { bestS = s; bestPh = ph; } }
// Downbeat: which of 4 phases has the most low-band onset.
const low = new Float32Array(nF); for (let f = 1; f < nF; f++) low[f] = Math.max(0, energy[0][f] - energy[0][f - 1]);
let bestD = 0, bestDS = -1;
for (let d = 0; d < 4; d++) { let s = 0; for (let t = bestPh + d * period; t < x.length / SR; t += 4 * period) s += low[Math.round(t * fps)] || 0; if (s > bestDS) { bestDS = s; bestD = d; } }
const dur = x.length / SR;
const beats = []; for (let t = bestPh; t < dur; t += period) beats.push(+t.toFixed(3));
const downbeat0 = +(bestPh + bestD * period).toFixed(3);
// Energy per bar.
const bar = 4 * period; const bars = [];
for (let t = downbeat0 - Math.ceil(downbeat0 / bar) * bar; t < dur; t += bar) {
  let s = 0, n = 0, lo = 0; for (let i = Math.max(0, Math.round(t * SR)); i < Math.min(x.length, Math.round((t + bar) * SR)); i += 4) { s += x[i] * x[i]; lo += bandSig[0][i] ** 2; n++; }
  bars.push({ t: +t.toFixed(2), db: +(10 * Math.log10(s / Math.max(1, n) + 1e-12)).toFixed(1), lowDb: +(10 * Math.log10(lo / Math.max(1, n) + 1e-12)).toFixed(1) });
}
writeFileSync("audio/music.json", JSON.stringify({ bpm, period, phase: bestPh, downbeat0, beats, bars, duration: dur }, null, 1));
console.log(`bpm ${bpm.toFixed(2)} period ${period.toFixed(4)} first beat ${bestPh.toFixed(3)} first downbeat ${downbeat0}`);
console.log(bars.map((b) => `${b.t.toFixed(1)}:${b.db}/${b.lowDb}`).join("  "));
