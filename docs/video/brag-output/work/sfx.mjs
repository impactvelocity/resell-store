#!/usr/bin/env node
/*
 * Sound effects for v2, placed on the composition's cues and tuned to the music bed
 * ("Lemonade Skies", E major): pops on the E-major pentatonic, bells on B and E.
 *   node sfx.mjs   → work/sfx.wav (48 kHz stereo, peak-normalized; level is set in mix.sh)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { duration, cues } = JSON.parse(readFileSync(join(here, "cues.json"), "utf8"));
const SR = 48000;
const N = Math.ceil((duration + 0.5) * SR);
const TAU = Math.PI * 2;
const out = [new Float32Array(N), new Float32Array(N)];
const send = [new Float32Array(N), new Float32Array(N)];
let seed = 11;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function add(t0, len, fn, { gain = 1, pan = 0, rev = 0 } = {}) {
  const s0 = Math.round(t0 * SR);
  const n = Math.round(len * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    const v = fn(i / SR, i);
    out[0][k] += v * gl;
    out[1][k] += v * gr;
    send[0][k] += v * gl * rev;
    send[1][k] += v * gr * rev;
  }
}
function noiseHit(t, len, decay, g, { hp = 0.9, pan = 0, rev = 0 } = {}) {
  let lp = 0;
  add(t, len, (tt) => {
    const nz = rand() * 2 - 1;
    lp += (nz - lp) * (1 - hp);
    return (nz - lp) * Math.exp(-tt / decay);
  }, { gain: g, pan, rev });
}
function bell(t, m, g = 1, pan = 0, decay = 1.2) {
  const f = mtof(m);
  add(t, decay * 2.2, (x) => {
    const e = Math.exp(-x / decay);
    return (Math.sin(TAU * f * x) + 0.45 * Math.sin(TAU * f * 2.76 * x) * Math.exp(-x * 2) + 0.2 * Math.sin(TAU * f * 5.4 * x) * Math.exp(-x * 4)) * e * Math.min(1, x / 0.002);
  }, { gain: 0.1 * g, pan, rev: 0.45 });
}

const PENTA = [76, 78, 80, 83, 85]; // E5 F#5 G#5 B5 C#6
for (const c of cues) {
  const g = c.gain ?? 1;
  const t = c.t;
  switch (c.type) {
    case "pop": {
      const f = mtof(PENTA[(c.note ?? 0) % 5]);
      add(t, 0.22, (x) => Math.sin(TAU * f * x * (1 - 0.12 * Math.min(1, x / 0.08))) * Math.exp(-x * 26) * Math.min(1, x / 0.002), { gain: 0.75 * g, pan: ((c.note ?? 0) % 3) * 0.3 - 0.3, rev: 0.25 });
      break;
    }
    case "thud":
      add(t, 0.3, (x) => Math.sin(TAU * (48 * x + 2 * (1 - Math.exp(-x * 30)))) * Math.exp(-x * 14), { gain: 0.42 * g });
      noiseHit(t, 0.08, 0.012, 0.06 * g, { hp: 0.6 });
      break;
    case "stamp":
      add(t, 0.45, (x) => Math.sin(TAU * (42 * x + 3 * (1 - Math.exp(-x * 25)))) * Math.exp(-x * 9), { gain: 0.7 });
      noiseHit(t, 0.18, 0.03, 0.35, { hp: 0.55, rev: 0.2 });
      noiseHit(t, 0.05, 0.006, 0.4, { hp: 0.9 });
      break;
    case "click":
      noiseHit(t, 0.02, 0.0025, 1.5, { hp: 0.85 });
      add(t, 0.03, (x) => Math.sin(TAU * 1900 * x) * Math.exp(-x * 220), { gain: 0.5 });
      break;
    case "type": {
      let x = 0;
      while (x < c.dur) {
        noiseHit(t + x, 0.025, 0.003, 0.45 + rand() * 0.2, { hp: 0.8 + rand() * 0.1, pan: rand() * 0.4 - 0.2 });
        x += 0.045 + rand() * 0.05;
      }
      break;
    }
    case "tick":
      add(t, 0.05, (x) => Math.sin(TAU * mtof(100) * x) * Math.exp(-x * 120), { gain: 0.55 * g });
      break;
    case "count": {
      const n = Math.round(c.dur * 14);
      for (let i = 0; i < n; i++) {
        const p = 1 - Math.pow(1 - i / n, 0.6);
        add(t + p * c.dur, 0.04, (x) => Math.sin(TAU * mtof(88 + [0, 4, 7][i % 3]) * x) * Math.exp(-x * 140), { gain: 0.25 });
      }
      bell(t + c.dur, 83, 0.5, 0, 0.9);
      break;
    }
    case "whoosh":
    case "swoosh": {
      const len = c.type === "whoosh" ? 0.5 : 0.28;
      let lp = 0;
      add(t - len * 0.5, len, (x) => {
        const p = x / len;
        lp += (rand() * 2 - 1 - lp) * (0.04 + 0.25 * Math.sin(Math.PI * p));
        return lp * Math.sin(Math.PI * p);
      }, { gain: (c.type === "whoosh" ? 0.5 : 0.32) * g, rev: 0.3 });
      break;
    }
    case "chime":
      bell(t, 83, 1.5 * g, -0.2, 1.1);
      bell(t + 0.09, 88, 1.3 * g, 0.2, 1.3);
      break;
    case "cash":
      [80, 83, 88].forEach((m, i) => bell(t + i * 0.06, m, 1.2, i * 0.3 - 0.3, 1.2));
      noiseHit(t, 0.4, 0.12, 0.05, { hp: 0.985, rev: 0.4 });
      break;
    case "blip":
      add(t, 0.12, (x) => Math.sin(TAU * (600 * x + 1500 * x * x)) * Math.exp(-x * 30), { gain: 0.45 * g, rev: 0.2 });
      break;
    case "door":
      add(t, 0.35, (x) => Math.sin(TAU * 70 * x) * Math.exp(-x * 16), { gain: 0.25 });
      noiseHit(t, 0.12, 0.02, 0.12, { hp: 0.5 });
      break;
    case "sparkle":
      [88, 92, 95, 100].forEach((m, i) => add(t + i * 0.035, 0.3, (x) => Math.sin(TAU * mtof(m) * x) * Math.exp(-x * 14), { gain: 0.14, pan: i * 0.3 - 0.45, rev: 0.5 }));
      break;
  }
}

// Small shared room so the effects sit in one space.
function reverb(inp, offset) {
  const res = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: Math.round((d + offset) * (SR / 44100)), i: 0, f: 0 }));
  for (const c of combs) c.buf = new Float32Array(c.d);
  for (let i = 0; i < N; i++) {
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.f = y * 0.75 + c.f * 0.25;
      c.buf[c.i] = inp[i] + c.f * 0.8;
      c.i = (c.i + 1) % c.d;
      acc += y;
    }
    res[i] = acc * 0.25;
  }
  for (const d0 of [556, 441]) {
    const d = Math.round((d0 + offset) * (SR / 44100));
    const buf = new Float32Array(d);
    let j = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[j];
      const y = -res[i] + b;
      buf[j] = res[i] + b * 0.5;
      j = (j + 1) % d;
      res[i] = y;
    }
  }
  return res;
}
const wl = reverb(send[0], 0);
const wr = reverb(send[1], 23);
let peak = 0;
for (let i = 0; i < N; i++) {
  out[0][i] += wl[i] * 0.5;
  out[1][i] += wr[i] * 0.5;
  peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i]));
}
const norm = 0.89 / peak;
const pcm = Buffer.alloc(44 + N * 4);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(36 + N * 4, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[0][i] * norm)) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[1][i] * norm)) * 32767), 46 + i * 4);
}
writeFileSync(join(here, "sfx.wav"), pcm);
console.log(`sfx.wav: ${(N / SR).toFixed(1)}s, ${cues.length} cues, peak ${peak.toFixed(2)} → normalized`);
