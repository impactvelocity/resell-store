#!/usr/bin/env node
/*
 * Writes the soundtrack: an original score (F major, 112 BPM) plus sound effects
 * placed on the composition's cues, mixed together with one shared reverb.
 *   node music.mjs   → work/soundtrack.wav (48 kHz stereo)
 * Reads work/cues.json (node render.mjs cues).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { duration, cues } = JSON.parse(readFileSync(join(here, "cues.json"), "utf8"));
const SR = 48000;
const N = Math.ceil((duration + 0.5) * SR);
const TAU = Math.PI * 2;

// Buses: dry music, reverb send, sfx (dry), sidechain-able music (ducked by the kick).
const bus = () => [new Float32Array(N), new Float32Array(N)];
const dry = bus();
const duckable = bus();
const send = bus();
const sfx = bus();
const kickEnv = new Float32Array(N);

let seed = 7;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Add a mono voice (fn of local time → sample) into a stereo bus with pan and reverb send. */
function add(target, t0, len, fn, { gain = 1, pan = 0, rev = 0 } = {}) {
  const s0 = Math.round(t0 * SR);
  const n = Math.round(len * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    const v = fn(i / SR, i);
    target[0][k] += v * gl;
    target[1][k] += v * gr;
    if (rev) {
      send[0][k] += v * gl * rev;
      send[1][k] += v * gr * rev;
    }
  }
}

/* ---------------- instruments ---------------- */

function kick(t, g = 1) {
  add(dry, t, 0.45, (x) => {
    const f = 45 + 75 * Math.exp(-x * 38);
    const ph = TAU * (45 * x + (75 / 38) * (1 - Math.exp(-x * 38)));
    return Math.sin(ph) * Math.exp(-x * 7.5) * 0.9 + (x < 0.004 ? (rand() - 0.5) * 0.4 : 0) + 0 * f;
  }, { gain: 0.55 * g });
  const s0 = Math.round(t * SR);
  for (let i = 0; i < 0.3 * SR; i++) if (s0 + i < N && s0 + i >= 0) kickEnv[s0 + i] = Math.max(kickEnv[s0 + i], g * Math.exp(-i / SR / 0.09));
}
function noiseHit(t, len, decay, g, { hp = 0.9, pan = 0, rev = 0, target = dry } = {}) {
  let lp = 0;
  add(target, t, len, (x) => {
    const n = rand() * 2 - 1;
    lp += (n - lp) * (1 - hp);
    return (n - lp) * Math.exp(-x / decay);
  }, { gain: g, pan, rev });
}
const clap = (t, g = 1) => {
  for (const [o, gg] of [[0, 0.6], [0.011, 0.5], [0.022, 1]]) noiseHit(t + o, 0.22, o === 0.022 ? 0.06 : 0.008, 0.32 * g * gg, { hp: 0.75, rev: 0.25 });
};
const hat = (t, g = 1, open = false) => noiseHit(t, open ? 0.2 : 0.06, open ? 0.06 : 0.014, 0.16 * g, { hp: 0.97, pan: 0.25 });
const shaker = (t, g = 1) => noiseHit(t, 0.09, 0.025, 0.07 * g, { hp: 0.96, pan: -0.3 });

function bass(t, m, len, g = 1) {
  const f = mtof(m);
  add(duckable, t, len + 0.05, (x) => {
    const env = Math.min(1, x / 0.006) * Math.exp(-x * 2.2) * (x > len ? Math.exp(-(x - len) * 60) : 1);
    const v = Math.sin(TAU * f * x) + 0.35 * Math.sin(TAU * 2 * f * x) + 0.12 * Math.sin(TAU * 3 * f * x);
    return Math.tanh(v * 1.4) * env;
  }, { gain: 0.42 * g });
}
/** Electric-piano-ish chord tone. */
function ep(t, m, len, g = 1, pan = 0) {
  const f = mtof(m);
  add(duckable, t, len + 1.2, (x) => {
    const env = Math.min(1, x / 0.004) * Math.exp(-x * 1.6) * (x > len ? Math.exp(-(x - len) * 6) : 1);
    const tine = Math.sin(TAU * f * 7.1 * x) * Math.exp(-x * 40) * 0.25;
    return (Math.sin(TAU * f * x + 0.6 * Math.sin(TAU * f * x) * Math.exp(-x * 5)) + 0.18 * Math.sin(TAU * 2 * f * x) + tine) * env;
  }, { gain: 0.11 * g, pan, rev: 0.35 });
}
/** Soft pad: a few detuned partials with a slow swell. */
function pad(t, m, len, g = 1) {
  const f = mtof(m);
  const det = [0.996, 1, 1.004];
  add(duckable, t, len + 1.5, (x) => {
    const att = Math.min(1, x / 0.9);
    const rel = x > len ? Math.exp(-(x - len) * 2.2) : 1;
    let v = 0;
    for (const d of det) for (let k = 1; k <= 4; k++) v += Math.sin(TAU * f * d * k * x + k) / (k * k);
    return v * att * rel * 0.33;
  }, { gain: 0.07 * g, pan: (m % 3) * 0.2 - 0.2, rev: 0.6 });
}
/** Karplus–Strong pluck. */
function pluck(t, m, g = 1, pan = 0) {
  const f = mtof(m);
  const L = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(L).map(() => rand() * 2 - 1);
  let idx = 0;
  add(duckable, t, 1.4, (x) => {
    const a = buf[idx];
    const b = buf[(idx + 1) % L];
    buf[idx] = 0.4985 * (a + b);
    idx = (idx + 1) % L;
    return a * Math.min(1, x / 0.002);
  }, { gain: 0.16 * g, pan, rev: 0.4 });
}
function lead(t, m, len, g = 1) {
  const f = mtof(m);
  add(duckable, t, len + 0.4, (x) => {
    const vib = 1 + 0.004 * Math.sin(TAU * 5.2 * x) * Math.min(1, x / 0.3);
    const env = Math.min(1, x / 0.015) * (x > len ? Math.exp(-(x - len) * 9) : 1) * (0.75 + 0.25 * Math.exp(-x * 3));
    const ph = TAU * f * vib * x;
    return (Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)) * env;
  }, { gain: 0.085 * g, pan: 0.1, rev: 0.45 });
}
function bell(t, m, g = 1, pan = 0, decay = 1.8) {
  const f = mtof(m);
  add(dry, t, decay * 2.2, (x) => {
    const e = Math.exp(-x / decay);
    return (Math.sin(TAU * f * x) + 0.5 * Math.sin(TAU * f * 2.76 * x) * Math.exp(-x * 2) + 0.25 * Math.sin(TAU * f * 5.4 * x) * Math.exp(-x * 4)) * e * Math.min(1, x / 0.002);
  }, { gain: 0.1 * g, pan, rev: 0.5 });
}
function riser(t, len, g = 1) {
  let lp = 0;
  add(dry, t, len, (x) => {
    const p = x / len;
    const n = rand() * 2 - 1;
    lp += (n - lp) * (0.02 + 0.5 * p * p);
    return lp * p * p * (p > 0.97 ? (1 - p) / 0.03 : 1);
  }, { gain: 0.5 * g, rev: 0.3 });
}

/* ---------------- arrangement ---------------- */

const BPM = 112;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const GRID0 = 25.0 - 12 * BAR; // a bar starts exactly when the title lands (meet scene)
const sceneStart = Object.fromEntries(JSON.parse(readFileSync(join(here, "cues.json"), "utf8")).scenes.map((s) => [s.name, s.start]));
const S = sceneStart;
const sections = [
  [0, "intro"],
  [S.friction, "intro2"],
  [S.friction + 8.0, "hush"],
  [S.turn, "build"],
  [S.meet, "groove"],
  [S.haggle, "tension"],
  [S.haggle + 10.45, "break"],
  [S["paypal-yes"] + 0.79, "groove2"],
  [S.close - 0.15, "resolve"],
  [S["sponsor-render"] - 0.75, "credits"],
  [S["open-source"] - 0.6, "build2"],
  [S.mission + 0.25, "finale"],
  [S.mission + 7.9, "end"],
];
const sectionAt = (t) => {
  let cur = "intro";
  for (const [st, name] of sections) if (t >= st - 1e-6) cur = name;
  return cur;
};

const PROG = {
  main: [[41, [57, 60, 65, 67]], [36, [55, 60, 64, 67]], [38, [57, 62, 65, 69]], [34, [58, 62, 65, 69]]], // F C Dm Bb
  tension: [[38, [57, 62, 65]], [34, [58, 62, 65]], [43, [55, 58, 62]], [36, [55, 60, 64]]], // Dm Bb Gm C
};
const MELODY = [
  [[0, 0.5, 72], [0.5, 0.5, 74], [1, 1.5, 77], [2.5, 0.5, 76], [3, 1, 74]],
  [[0, 1.5, 72], [2, 0.5, 67], [2.5, 0.5, 69], [3, 1, 72]],
  [[0, 0.5, 74], [0.5, 0.5, 77], [1, 1.5, 81], [2.5, 0.5, 79], [3, 1, 77]],
  [[0, 1.5, 77], [1.5, 0.5, 74], [2, 2, 72]],
];

const firstBar = Math.floor((0 - GRID0) / BAR);
const lastBar = Math.ceil((duration - GRID0) / BAR);
for (let b = firstBar; b <= lastBar; b++) {
  const bt = GRID0 + b * BAR;
  const barSec = sectionAt(bt + 0.01);
  const prog = barSec === "tension" || barSec === "break" ? PROG.tension : PROG.main;
  const [root, chord] = prog[((b % 4) + 4) % 4];
  const melody = MELODY[((b % 4) + 4) % 4];

  // Harmony per bar.
  if (["intro", "intro2", "hush", "build", "break", "resolve", "tension"].includes(barSec)) {
    const g = barSec === "hush" ? 0.9 : barSec === "break" ? 1.4 : barSec === "resolve" ? 1.5 : barSec === "tension" ? 1 : 1.6;
    if (bt + BAR > 0) for (const m of chord) pad(Math.max(0, bt), m, BAR, g);
  }
  if (["groove", "groove2", "credits", "build2", "finale"].includes(barSec)) {
    // Syncopated EP stabs: 1, and-of-2, 4.
    for (const [beat, len] of [[0, 1.2], [1.5, 0.8], [3, 0.9]]) chord.forEach((m, i) => ep(bt + beat * BEAT, m, len * BEAT, barSec === "credits" ? 0.8 : 1, i * 0.15 - 0.2));
    if (barSec !== "credits") for (const m of chord.slice(0, 3)) pad(bt, m, BAR, 0.45);
  }

  for (let beat = 0; beat < 4; beat++) {
    const t = bt + beat * BEAT;
    if (t < 0 || t > duration) continue;
    const sec = sectionAt(t + 0.005);
    const half = BEAT / 2;
    const q = BEAT / 4;
    // Arpeggio plucks.
    const arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 12];
    if (["intro", "intro2"].includes(sec)) {
      pluck(t, arp[beat % 4], 1.3, beat % 2 ? 0.3 : -0.3);
      if (sec === "intro2") pluck(t + half, arp[(beat + 2) % 4], 0.75, 0.2);
    }
    if (sec === "build") for (let k = 0; k < 4; k++) pluck(t + k * q, arp[(beat * 4 + k) % 4] + (k === 3 ? 12 : 0), 0.5 + 0.5 * ((t - S.turn) / 8), (k % 2) * 0.4 - 0.2);
    if (sec === "resolve" && beat % 2 === 0) pluck(t, arp[beat], 0.6);
    if (["groove", "groove2", "finale", "build2"].includes(sec) && beat % 2 === 1) pluck(t + half, arp[(beat + b) % 4] + 12, 0.35, 0.35);
    // Drums.
    if (sec === "intro2") shaker(t + half, 0.8), shaker(t, 0.5);
    if (sec === "build") {
      kick(t, 0.35 + 0.45 * ((t - S.turn) / 8));
      hat(t + half, 0.5);
    }
    if (["groove", "groove2", "finale", "build2", "credits"].includes(sec)) {
      const k = sec === "credits" ? 0.8 : 1;
      if (beat === 0 || beat === 2) kick(t, k);
      if (beat === 2 && sec !== "credits") kick(t + half + q, 0.5 * k);
      if ((beat === 1 || beat === 3) && sec !== "credits") clap(t, 1);
      if ((beat === 1 || beat === 3) && sec === "credits") clap(t, 0.55);
      hat(t, 0.55 * k);
      hat(t + half, 0.9 * k, beat === 3 && sec !== "credits");
      if (sec === "groove2" || sec === "finale") shaker(t + q, 0.7), shaker(t + 3 * q, 0.7);
      if (sec === "build2") {
        const p = (t - (S["open-source"] - 0.6)) / 12.6;
        hat(t + q, 0.4 * p), hat(t + 3 * q, 0.4 * p);
      }
      // Bass: root 8ths with an octave pop.
      for (const [o, mm, len] of [[0, root, half * 0.9], [half, root, half * 0.6], [half * 3, root + 12, q], [half * 3 + q, root, q]]) bass(t + o, mm, len, sec === "credits" ? 0.85 : 1);
    }
    if (sec === "tension") {
      if (beat === 0) kick(t, 0.6);
      hat(t + q, 0.35), hat(t + 3 * q, 0.35);
      for (let k = 0; k < 2; k++) bass(t + k * half, root, half * 0.5, 0.6);
      if (beat % 2 === 0) pluck(t, chord[2] + 24, 0.3, 0.4);
    }
  }
  // Lead melody where the film lifts.
  if (barSec === "groove2" || barSec === "finale") for (const [o, len, m] of melody) if (sectionAt(bt + o * BEAT) === barSec) lead(bt + o * BEAT, m, len * BEAT * 0.92);
}
// Risers and set pieces.
riser(S.meet - 2.2, 2.2, 1);
riser(S.mission + 0.25 - 2.4, 2.4, 0.8);
riser(S["paypal-yes"] + 0.79 - 1.6, 1.6, 0.6);
for (const m of [53, 57, 60, 65, 69]) bell(S.close - 0.15, m + 12, 0.5, (m % 2) * 0.4 - 0.2, 2.4);
// Final chord.
const END = S.mission + 7.9;
kick(END, 1.1);
for (const m of [41, 53]) bass(END, m, 2.6, 1);
for (const m of [57, 60, 65, 67, 72]) pad(END, m, 2.8, 1.6), ep(END, m, 2.4, 1.2);
for (const [i, m] of [77, 81, 84, 89].entries()) bell(END + 0.35 + i * 0.07, m, 0.35, i * 0.25 - 0.4, 2);

/* ---------------- sound effects ---------------- */

const PENTA = [77, 79, 81, 84, 86]; // F5 G5 A5 C6 D6
for (const c of cues) {
  const g = c.gain ?? 1;
  const t = c.t;
  switch (c.type) {
    case "pop": {
      const f = mtof(PENTA[(c.note ?? 0) % 5]);
      add(sfx, t, 0.22, (x) => Math.sin(TAU * f * x * (1 - 0.12 * Math.min(1, x / 0.08))) * Math.exp(-x * 26) * Math.min(1, x / 0.002), { gain: 0.5 * g, pan: ((c.note ?? 0) % 3) * 0.3 - 0.3, rev: 0.25 });
      break;
    }
    case "thud":
      add(sfx, t, 0.3, (x) => Math.sin(TAU * (48 * x + (60 / 30) * (1 - Math.exp(-x * 30)))) * Math.exp(-x * 14), { gain: 0.32 * g });
      noiseHit(t, 0.08, 0.012, 0.05 * g, { hp: 0.6, target: sfx });
      break;
    case "click":
      noiseHit(t, 0.02, 0.0025, 0.75, { hp: 0.85, target: sfx });
      add(sfx, t, 0.03, (x) => Math.sin(TAU * 1900 * x) * Math.exp(-x * 220), { gain: 0.25 });
      break;
    case "type": {
      let x = 0;
      while (x < c.dur) {
        noiseHit(t + x, 0.025, 0.003, 0.22 + rand() * 0.1, { hp: 0.8 + rand() * 0.1, target: sfx, pan: rand() * 0.4 - 0.2 });
        x += 0.045 + rand() * 0.05;
      }
      break;
    }
    case "tick":
      add(sfx, t, 0.05, (x) => Math.sin(TAU * mtof(96) * x) * Math.exp(-x * 120), { gain: 0.26 * g });
      break;
    case "count": {
      const n = Math.round(c.dur * 14);
      for (let i = 0; i < n; i++) {
        const p = 1 - Math.pow(1 - i / n, 0.6);
        add(sfx, t + p * c.dur, 0.04, (x) => Math.sin(TAU * mtof(88 + (i % 3) * 2) * x) * Math.exp(-x * 140), { gain: 0.11 });
      }
      bell(t + c.dur, 84, 0.35, 0, 0.9);
      break;
    }
    case "whoosh":
    case "swoosh": {
      const len = c.type === "whoosh" ? 0.5 : 0.28;
      let lp = 0;
      add(sfx, t - len * 0.5, len, (x) => {
        const p = x / len;
        lp += (rand() * 2 - 1 - lp) * (0.04 + 0.25 * Math.sin(Math.PI * p));
        return lp * Math.sin(Math.PI * p);
      }, { gain: (c.type === "whoosh" ? 0.5 : 0.32) * g, rev: 0.3 });
      break;
    }
    case "chime":
      bell(t, 84, 0.45 * g, -0.2, 1.1);
      bell(t + 0.09, 89, 0.4 * g, 0.2, 1.3);
      break;
    case "cash":
      [81, 84, 89].forEach((m, i) => bell(t + i * 0.06, m, 0.4, i * 0.3 - 0.3, 1.2));
      noiseHit(t, 0.4, 0.12, 0.04, { hp: 0.985, target: sfx, rev: 0.4 });
      break;
    case "blip":
      add(sfx, t, 0.12, (x) => Math.sin(TAU * (600 * x + 1500 * x * x)) * Math.exp(-x * 30), { gain: 0.26 * g, rev: 0.2 });
      break;
    case "door":
      add(sfx, t, 0.35, (x) => Math.sin(TAU * (70 * x)) * Math.exp(-x * 16), { gain: 0.42 });
      noiseHit(t, 0.12, 0.02, 0.12, { hp: 0.5, target: sfx });
      break;
    case "sparkle":
      [89, 93, 96, 101].forEach((m, i) => add(sfx, t + i * 0.035, 0.3, (x) => Math.sin(TAU * mtof(m) * x) * Math.exp(-x * 14), { gain: 0.05, pan: i * 0.3 - 0.45, rev: 0.5 }));
      break;
  }
}

/* ---------------- mix ---------------- */

// Sidechain: the kick ducks pads, keys and bass a little.
for (let i = 0; i < N; i++) {
  const d = 1 - 0.3 * kickEnv[i];
  dry[0][i] += duckable[0][i] * d;
  dry[1][i] += duckable[1][i] * d;
}
// Schroeder reverb on the send.
function reverb(inp, offset) {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: Math.round((d + offset) * (SR / 44100)), buf: null, i: 0, f: 0 }));
  for (const c of combs) c.buf = new Float32Array(c.d);
  for (let i = 0; i < N; i++) {
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.f = y * 0.75 + c.f * 0.25;
      c.buf[c.i] = inp[i] + c.f * 0.82;
      c.i = (c.i + 1) % c.d;
      acc += y;
    }
    out[i] = acc * 0.25;
  }
  for (const d0 of [556, 441]) {
    const d = Math.round((d0 + offset) * (SR / 44100));
    const buf = new Float32Array(d);
    let j = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[j];
      const y = -out[i] + b;
      buf[j] = out[i] + b * 0.5;
      j = (j + 1) % d;
      out[i] = y;
    }
  }
  return out;
}
// SFX share the room too.
for (let i = 0; i < N; i++) {
  send[0][i] += sfx[0][i] * 0.18;
  send[1][i] += sfx[1][i] * 0.18;
}
const wetL = reverb(send[0], 0);
const wetR = reverb(send[1], 23);
const L = new Float32Array(N);
const R = new Float32Array(N);
let peak = 0;
const fadeOut = (i) => {
  const t = i / SR;
  return t > duration - 1.6 ? Math.max(0, (duration - t) / 1.6) : 1;
};
for (let i = 0; i < N; i++) {
  const f = fadeOut(i);
  L[i] = (dry[0][i] * 0.9 + wetL[i] * 0.55 + sfx[0][i]) * f;
  R[i] = (dry[1][i] * 0.9 + wetR[i] * 0.55 + sfx[1][i]) * f;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
// Gentle soft clip, then normalize to -1 dBFS (loudness is set later with ffmpeg).
const norm = 0.89 / Math.tanh(peak * 1.1);
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
  pcm.writeInt16LE(Math.round(clamp16(Math.tanh(L[i] * 1.1) * norm) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(clamp16(Math.tanh(R[i] * 1.1) * norm) * 32767), 46 + i * 4);
}
function clamp16(v) {
  return Math.max(-1, Math.min(1, v));
}
writeFileSync(join(here, "soundtrack.wav"), pcm);
if (process.env.STEMS) {
  // RMS of music vs effects around each cue, for a quick balance check.
  const win = (arr, t) => { let s2 = 0, n = 0; for (let i = Math.round(t * SR); i < Math.min(N, Math.round((t + 0.15) * SR)); i++) { s2 += arr[i] * arr[i]; n++; } return Math.sqrt(s2 / Math.max(1, n)); };
  const byType = {};
  for (const c of cues) {
    const m = win(dry[0], c.t) + 1e-9;
    const e = win(sfx[0], c.t) + 1e-9;
    (byType[c.type] ??= []).push(20 * Math.log10(e / m));
  }
  for (const [k, v] of Object.entries(byType)) console.log(k.padEnd(8), "sfx vs music dB (median)", v.sort((a, b) => a - b)[Math.floor(v.length / 2)].toFixed(1), "n", v.length);
}
console.log(`soundtrack.wav: ${(N / SR).toFixed(1)}s, peak before norm ${peak.toFixed(2)}`);
