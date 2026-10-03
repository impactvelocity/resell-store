/*
 * A tiny deterministic motion engine. Every frame is a pure function of time:
 * scenes build their DOM once, then update(lt) sets every style from lt alone.
 * render.mjs drives it through window.__seek(t).
 */
const W = 1920;
const H = 1080;
const FPS = 30;

const C = {
  cream: "#fffdf2",
  surface: "#ffffff",
  muted: "#f7f3df",
  border: "#e8e3c8",
  ink: "#14261d",
  textMuted: "#56675e",
  lemon100: "#fff6c2",
  lemon300: "#ffe873",
  lemon400: "#ffd934",
  lemon500: "#f5be0b",
  leaf100: "#ddf0e3",
  leaf300: "#8cc9a4",
  leaf600: "#256b4c",
  leaf900: "#14261d",
  pink100: "#ffdceb",
  pink400: "#ff5fa8",
  pink600: "#c9246f",
  paypal: "#002991",
};

const E = {
  linear: (x) => x,
  in: (x) => x * x * x,
  out: (x) => 1 - Math.pow(1 - x, 3),
  outQuint: (x) => 1 - Math.pow(1 - x, 5),
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: (x) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  bounce: (x) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  },
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const P = (t, at, dur) => (dur <= 0 ? (t >= at ? 1 : 0) : clamp((t - at) / dur));
const lerp = (a, b, p) => a + (b - a) * p;

/* ---------- DOM ---------- */

function h(tag, props = {}, ...kids) {
  const el = tag === "svg" || props.svg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "svg") continue;
    if (k === "style") Object.assign(el.style, v);
    else if (k === "class") el.setAttribute("class", v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
const abs = (el, x, y, w, hgt) => {
  Object.assign(el.style, { position: "absolute", left: `${x}px`, top: `${y}px` });
  if (w != null) el.style.width = `${w}px`;
  if (hgt != null) el.style.height = `${hgt}px`;
  return el;
};

/* ---------- animation helpers (all pure in t) ---------- */

function setVis(el, op) {
  el.style.opacity = String(clamp(op));
  el.style.visibility = op <= 0.001 ? "hidden" : "visible";
}

/** Enter at `at` (fade + move + scale + rotate); optional exit at `out`. */
function enter(el, t, at, o = {}) {
  const { dur = 0.5, x = 0, y = 26, s = 1, r = 0, ease = E.out, out = null, outDur = 0.3, outY = -14, outX = 0, outS = 1, fade = true, base = "" } = o;
  const p = ease(P(t, at, dur));
  const q = out != null ? E.in(P(t, out, outDur)) : 0;
  const op = (fade ? clamp(P(t, at, dur * 0.6)) : t >= at ? 1 : 0) * (1 - q);
  const tx = x * (1 - p) + outX * q;
  const ty = y * (1 - p) + outY * q;
  const sc = lerp(s, 1, p) * lerp(1, outS, q);
  el.style.transform = `${base} translate(${tx}px, ${ty}px) scale(${sc}) rotate(${r * (1 - p)}deg)`;
  setVis(el, op);
  return p;
}
/** Springy pop-in. */
function pop(el, t, at, o = {}) {
  return enter(el, t, at, { dur: 0.6, y: 0, s: o.from ?? 0.35, r: o.r ?? -8, ease: E.back, ...o });
}
/** Type text into el; returns progress. */
function typeOn(el, text, t, at, cps = 30, caret = null) {
  const n = t < at ? 0 : clamp(Math.floor((t - at) * cps), 0, text.length);
  el.textContent = text.slice(0, n);
  if (caret) {
    const typing = t >= at && n < text.length;
    const blink = t >= at && t < at + text.length / cps + 1.4 && Math.floor(t * 2.2) % 2 === 0;
    setVis(caret, typing || blink ? 1 : 0);
  }
  return n / text.length;
}
/** Count a number up. */
function countUp(el, t, at, dur, from, to, fmt) {
  const v = lerp(from, to, E.outQuint(P(t, at, dur)));
  el.textContent = fmt(v);
}
const money = (v, d = 0) => `$${v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

/** A highlight sweep under text (scaleX 0 → 1). */
function sweep(el, t, at, dur = 0.45) {
  el.style.transform = `scaleX(${E.out(P(t, at, dur))})`;
}

/* ---------- media ---------- */

const pending = [];
function setSrc(img, src) {
  if (img.getAttribute("src") === src) return;
  img.setAttribute("src", src);
  pending.push(img.decode().catch(() => {}));
}
const pad4 = (n) => String(n).padStart(4, "0");

const CAP = "../../captures";
const CLIPS = {
  "start-to-research": { fps: 15, frames: 330 },
  "findings-answer": { fps: 15, frames: 105 },
  "publish-live": { fps: 15, frames: 105 },
  "offer-accept": { fps: 15, frames: 135 },
  "sidekick-check": { fps: 15, frames: 150 },
};
/** Piecewise-linear map from scene time to clip time: [[lt, clipT], ...]. */
function clipTime(lt, map) {
  if (lt <= map[0][0]) return map[0][1];
  for (let i = 1; i < map.length; i++) {
    const [a, ca] = map[i - 1];
    const [b, cb] = map[i];
    if (lt <= b) return lerp(ca, cb, (lt - a) / (b - a));
  }
  return map[map.length - 1][1];
}

/**
 * A screen in a card: a window onto a page image (page coordinates in CSS px of
 * the captured viewport), with a camera that frames rects of the page.
 */
class Shot {
  constructor(parent, { src = null, pageW = 1600, pageH = 1000, x, y, w, h: vh, url = null, radius = 28, border = 4, phone = false, shadow = true, bg = "#fff" }) {
    this.pageW = pageW;
    this.pageH = pageH;
    this.vw = w;
    this.vh = vh;
    this.bar = url ? 56 : 0;
    this.root = abs(h("div", { class: "shot" }), x, y, w, vh + this.bar);
    Object.assign(this.root.style, {
      borderRadius: `${radius}px`,
      border: `${border}px solid ${C.leaf900}`,
      background: bg,
      overflow: "hidden",
      boxSizing: "content-box",
      boxShadow: shadow ? "0 40px 80px -40px rgba(20,38,29,.45)" : "none",
    });
    if (url) {
      const barEl = abs(h("div"), 0, 0, w, this.bar);
      Object.assign(barEl.style, { background: C.muted, borderBottom: `2px solid ${C.border}`, display: "flex", alignItems: "center", gap: "10px", padding: "0 22px", boxSizing: "border-box" });
      for (const c of ["#ff6b5e", "#ffbd2e", "#28c840"]) barEl.append(h("span", { style: { width: "14px", height: "14px", borderRadius: "50%", background: c, opacity: ".8" } }));
      this.urlEl = h("span", { class: "url" }, url);
      barEl.append(h("span", { style: { flex: "1", display: "flex", justifyContent: "center" } }, this.urlEl));
      this.root.append(barEl);
    }
    this.view = abs(h("div"), 0, this.bar, w, vh);
    this.view.style.overflow = "hidden";
    this.layer = abs(h("div"), 0, 0, pageW, pageH);
    this.layer.style.transformOrigin = "0 0";
    this.img = abs(h("img", { alt: "" }), 0, 0, pageW, pageH);
    if (src) this.img.setAttribute("src", src);
    this.layer.append(this.img);
    this.view.append(this.layer);
    this.root.append(this.view);
    parent.append(this.root);
    this.s = 1;
  }
  setPage(src, pageW, pageH) {
    this.pageW = pageW;
    this.pageH = pageH;
    Object.assign(this.img.style, { width: `${pageW}px`, height: `${pageH}px` });
    setSrc(this.img, src);
  }
  clip(name, ct) {
    const meta = CLIPS[name];
    const i = clamp(Math.round(ct * meta.fps), 0, meta.frames - 1);
    setSrc(this.img, `clips/${name}/${pad4(i)}.jpg`);
  }
  /** keys: [{ t, r: [x, y, w, h], d }] — move to r over [t, t + d]. */
  cam(t, keys, maxS = 2) {
    let cur = keys[0].r;
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i];
      if (t < k.t) break;
      const p = E.inOut(P(t, k.t, k.d ?? 1));
      const prev = keys[i - 1].r;
      cur = prev.map((v, j) => lerp(v, k.r[j], p));
    }
    const [rx, ry, rw, rh] = cur;
    let s = Math.min(this.vw / rw, this.vh / rh, maxS);
    let tx = this.vw / 2 - (rx + rw / 2) * s;
    let ty = this.vh / 2 - (ry + rh / 2) * s;
    // Keep the page covering the view where it can.
    if (this.pageW * s >= this.vw) tx = clamp(tx, this.vw - this.pageW * s, 0);
    else tx = (this.vw - this.pageW * s) / 2;
    if (this.pageH * s >= this.vh) ty = clamp(ty, this.vh - this.pageH * s, 0);
    this.s = s;
    this.tx = tx;
    this.ty = ty;
    this.layer.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  }
  /** Add an overlay positioned in page coordinates. */
  add(el, x, y, w, hgt) {
    this.layer.append(abs(el, x, y, w, hgt));
    return el;
  }
}

/** A cover in page coords that hides part of a screenshot until revealed. */
function cover(shot, x, y, w, hgt, color = "#fff") {
  const el = shot.add(h("div"), x, y, w, hgt);
  el.style.background = color;
  return el;
}
function reveal(el, t, at, dur = 0.45) {
  const p = E.out(P(t, at, dur));
  el.style.opacity = String(1 - p);
  el.style.visibility = p >= 1 ? "hidden" : "visible";
}

/** A rounded highlight ring in page coords that draws in, then fades. */
function ring(shot, x, y, w, hgt, color = C.pink400, pad = 8) {
  const el = shot.add(h("div", { class: "ring" }), x - pad, y - pad, w + pad * 2, hgt + pad * 2);
  el.style.borderColor = color;
  return el;
}
function ringAt(el, t, at, out = null) {
  const p = E.back(P(t, at, 0.45));
  const q = out != null ? P(t, out, 0.3) : 0;
  setVis(el, clamp(P(t, at, 0.2)) * (1 - q));
  el.style.transform = `scale(${lerp(1.12, 1, clamp(p))})`;
}

/* ---------- cursor ---------- */

const CURSOR_SVG = `<svg viewBox="0 0 32 32" width="44" height="44"><path d="M6 3 L6 25 L11.5 20 L15.5 29 L19.5 27.2 L15.6 18.6 L23 18.4 Z" fill="#fff" stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
class Cursor {
  constructor(shot) {
    this.shot = shot;
    this.el = shot.add(h("div", { class: "cursor", html: CURSOR_SVG }), 0, 0);
    this.ripple = shot.add(h("div", { class: "ripple" }), 0, 0, 0, 0);
  }
  /** keys: [{ t, x, y, d }], clicks: [t] — page coords. */
  update(t, keys, clicks = [], show = [0, 1e9]) {
    let x = keys[0].x;
    let y = keys[0].y;
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i];
      if (t < k.t) break;
      const p = E.inOut(P(t, k.t, k.d ?? 0.7));
      x = lerp(keys[i - 1].x, k.x, p);
      y = lerp(keys[i - 1].y, k.y, p);
    }
    const inv = 1 / this.shot.s;
    let press = 1;
    let rip = null;
    for (const c of clicks) {
      if (t >= c - 0.08 && t < c + 0.18) press = 0.82;
      if (t >= c && t < c + 0.5) rip = (t - c) / 0.5;
    }
    const op = clamp(P(t, show[0], 0.25)) * (1 - clamp(P(t, show[1], 0.25)));
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.style.transform = `scale(${inv * press})`;
    setVis(this.el, op);
    if (rip != null) {
      const size = 70 * inv * (0.4 + rip);
      Object.assign(this.ripple.style, { left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`, borderWidth: `${4 * inv}px` });
      setVis(this.ripple, (1 - rip) * op);
    } else setVis(this.ripple, 0);
  }
}

/* ---------- captions ---------- */

const SPARK = `<svg viewBox="0 0 64 64" width="34" height="34"><path d="M32 4c2 17 11 26 28 28-17 2-26 11-28 28-2-17-11-26-28-28 17-2 26-11 28-28Z" fill="${C.pink400}"/></svg>`;
/** Timed lower-third key lines: [{ at, out, text, spark }]. */
function captions(parent, items, pos = {}) {
  const els = items.map((it) => {
    const el = h("div", { class: "caption" });
    if (it.spark) el.append(h("span", { class: "spark", html: SPARK }));
    el.append(h("span", {}, it.text));
    Object.assign(el.style, { left: `${pos.x ?? 96}px`, bottom: `${pos.bottom ?? 64}px`, ...(pos.style ?? {}) });
    parent.append(el);
    return el;
  });
  return (t) => items.forEach((it, i) => enter(els[i], t, it.at, { y: 30, dur: 0.45, out: it.out, outDur: 0.28, outY: 12 }));
}

/* ---------- art ---------- */

const ART = {
  pot: `<rect x="5" y="42" width="12" height="7" rx="3.5" fill="${C.lemon500}"/><rect x="63" y="42" width="12" height="7" rx="3.5" fill="${C.lemon500}"/><path d="M14 40h52v18c0 6-5 10-11 10H25c-6 0-11-4-11-10Z" fill="${C.lemon400}"/><path d="M16 38c0-9 11-13 24-13s24 4 24 13Z" fill="${C.lemon500}"/><circle cx="40" cy="22" r="4.5" fill="${C.leaf900}"/>`,
  dress: `<path d="M29 8h5c0 5 3 8 6 8s6-3 6-8h5l2 22 12 42H15l12-42Z" fill="${C.leaf600}"/><path d="M27 30h26" fill="none" stroke="${C.lemon400}" stroke-width="3" stroke-linecap="round"/>`,
  camera: `<rect x="12" y="26" width="56" height="38" rx="8" fill="${C.leaf900}"/><rect x="28" y="18" width="18" height="10" rx="3" fill="${C.leaf900}"/><circle cx="40" cy="45" r="13" fill="${C.leaf300}"/><circle cx="40" cy="45" r="6" fill="${C.leaf900}"/><circle cx="59" cy="34" r="3" fill="${C.lemon400}"/>`,
  sweater: `<path d="M28 12c2 5 6 7 12 7s10-2 12-7l10 4 10 22-9 5-5-9v34H22V34l-5 9-9-5 10-22Z" fill="${C.pink400}"/><path d="M22 60h36" fill="none" stroke="${C.pink600}" stroke-width="3" stroke-linecap="round"/>`,
  record: `<circle cx="40" cy="40" r="30" fill="${C.leaf900}"/><circle cx="40" cy="40" r="20" fill="none" stroke="#FFFFFF40" stroke-width="1.5"/><circle cx="40" cy="40" r="11" fill="${C.pink400}"/><circle cx="40" cy="40" r="2.5" fill="#FFFFFF"/>`,
  lamp: `<path d="M28 14h24l8 24H20Z" fill="${C.lemon400}"/><rect x="38" y="38" width="4" height="24" fill="${C.leaf900}"/><rect x="26" y="62" width="28" height="6" rx="3" fill="${C.leaf900}"/>`,
  tote: `<path d="M29 34c0-18 22-18 22 0" fill="none" stroke="${C.leaf900}" stroke-width="3" stroke-linecap="round"/><path d="M16 32h48l-4 38H20Z" fill="${C.lemon400}"/><circle cx="40" cy="51" r="7" fill="${C.leaf600}"/>`,
  chair: `<rect x="24" y="12" width="32" height="30" rx="6" fill="${C.leaf600}"/><rect x="18" y="42" width="44" height="10" rx="4" fill="${C.leaf600}"/><path d="M24 52v18M56 52v18" fill="none" stroke="${C.leaf900}" stroke-width="4" stroke-linecap="round"/>`,
  card: `<rect x="22" y="10" width="36" height="60" rx="5" fill="${C.lemon400}"/><rect x="27" y="16" width="26" height="24" rx="3" fill="#FFFFFF"/><circle cx="40" cy="28" r="7" fill="${C.pink400}"/><path d="M28 48h24M28 56h16" fill="none" stroke="${C.leaf900}" stroke-width="3" stroke-linecap="round"/>`,
  blackDress: `<path d="M29 8h5c0 5 3 8 6 8s6-3 6-8h5l2 22 12 42H15l12-42Z" fill="${C.leaf900}"/>`,
};
const art = (key, size) => h("div", { class: "art", html: `<svg viewBox="0 0 80 80" width="${size}" height="${size}">${ART[key]}</svg>` });
const FLOWER = (size) =>
  `<svg viewBox="0 0 64 64" width="${size}" height="${size}"><g fill="${C.pink400}"><circle cx="32" cy="18" r="11"/><circle cx="45.3" cy="27.7" r="11"/><circle cx="40.2" cy="43.3" r="11"/><circle cx="23.8" cy="43.3" r="11"/><circle cx="18.7" cy="27.7" r="11"/></g><circle cx="32" cy="32" r="8" fill="${C.lemon400}"/></svg>`;
const PAYPAL_PATH =
  "M1309.9993,0v328.2999h-74.7V0h74.7ZM1207.7994,110.7999v218.0999h-66.4v-18.8c-8.4,8.2-18,14.4-28.6,18.8-10.7,4.6-22.3,7-34.7,7-15.6,0-30.1-2.9-43.3999-8.7-13.3-6.1-24.9-14.4-34.7-24.8-9.9-10.5-17.7-22.7-23.5-36.6-5.5-14.2-8.2-29.5-8.2-45.8s2.7-31.4,8.2-45.3c5.8-14.2,13.6-26.6,23.5-37.1,9.7768-10.4201,21.5868-18.7245,34.7-24.4,13.3-6.1,27.8-9.2,43.3999-9.2,12.4,0,24,2.3,34.7,7,10.7,4.4,20.3,10.6,28.6,18.8v-18.8h66.4v-.2ZM1090.0994,269.4999c13.6,0,24.7-4.6,33.3999-14,9-9.3,13.5-21.2,13.5-35.7s-4.5-26.5-13.5-35.7c-8.7-9.3-19.9-14-33.3999-14s-24.9,4.6-33.9,14c-8.7,9.3-13,21.2-13,35.7s4.4,26.5,13,35.7c9,9.3,20.3,14,33.9,14ZM861.6996,0c19.7,0,36.5,2.8,50.4,8.3s25.6,13.2,35.1999,23.1c9.8,10.2,17.5,21.8,23,34.9s8.2,27.2,8.2,42.3-2.7,29.2-8.2,42.3c-5.3982,12.9791-13.202,24.8205-23,34.9-9.5,9.9-21.3,17.6-35.1999,23.1s-30.7,8.3-50.4,8.3h-36v111.6h-75.9999V0h111.9999ZM850.7996,149.5999c10.2,0,17.9-1,23.5-3.1,5.8-2.3,10.6-5.3,14.3-8.7,7.8-7.3,11.7-17,11.7-29.2s-3.9-21.9-11.7-29.2c-3.8-3.5-8.5-6.3-14.3-8.3-5.5-2.3-13.3-3.5-23.5-3.5h-25.2v82h25.2ZM469.6998,110.7999h82.5l56,104.6h.9l49.9-104.6h76.4l-163.6999,328.7998h-75.9999l74.7-150.3999-100.6999-178.3999ZM454.9998,110.7999v218.0999h-66.4v-18.8c-8.4,8.2-18,14.4-28.6,18.8-10.7,4.6-22.3,7-34.7,7-15.6,0-30.1-2.9-43.4-8.7-13.3-6.1-24.9-14.4-34.7-24.8-9.8-10.5-17.7-22.7-23.5-36.6-5.5-14.2-8.2-29.5-8.2-45.8s2.7-31.4,8.2-45.3c5.8-14.2,13.6-26.6,23.5-37.1,9.758-10.4418,21.5728-18.7496,34.7-24.4,13.3-6.1,27.8-9.2,43.4-9.2,12.4,0,24,2.3,34.7,7,10.7,4.4,20.3,10.6,28.6,18.8v-18.8h66.4v-.2ZM337.2998,269.4999c13.6,0,24.7-4.6,33.5-14,9-9.3,13.5-21.2,13.5-35.7s-4.5-26.5-13.5-35.7c-8.7-9.3-19.9-14-33.5-14s-24.9,4.6-33.9,14c-8.7,9.3-13,21.2-13,35.7s4.4,26.5,13,35.7c9,9.3,20.3,14,33.9,14ZM111.9999,0c19.7,0,36.5,2.8,50.4,8.3s25.6,13.2,35.2,23.1c9.8,10.2,17.5,21.8,23,34.9s8.2,27.2,8.2,42.3-2.7,29.2-8.2,42.3c-5.3982,12.9791-13.2019,24.8205-23,34.9-9.5,9.9-21.3,17.6-35.2,23.1-13.9,5.5-30.7,8.3-50.4,8.3h-36v111.6H0V0h111.9999ZM101.1999,149.5999c10.2,0,17.9-1,23.5-3.1,5.8-2.3,10.6-5.3,14.3-8.7,7.8-7.3,11.7-17,11.7-29.2s-3.9-21.9-11.7-29.2c-3.8-3.5-8.5-6.3-14.3-8.3-5.5-2.3-13.3-3.5-23.5-3.5h-25.2v82s25.2,0,25.2,0Z";
const paypalLogo = (width, color) => h("div", { class: "pp", html: `<svg viewBox="0 0 1310 439.6" width="${width}" height="${(width * 439.6) / 1310}"><path fill="${color}" d="${PAYPAL_PATH}"/></svg>` });

function wordmark(size, color = C.ink, dot = C.lemon400) {
  const el = h("div", { class: "wordmark", style: { fontSize: `${size}px`, color } });
  el.append("resell", h("span", { class: "dot", style: { background: dot } }), "store");
  return el;
}


/* ---------- fun bits ---------- */

/** Text split into words that pop in one by one; *word* gets the lemon highlighter. */
function words(parent, text, x, y, style = {}) {
  const el = abs(h("div"), x, y);
  Object.assign(el.style, style);
  el.spans = text.split(" ").map((w) => {
    const hlw = /^\*.*\*[.,!?]*$/.test(w);
    const clean = w.replace(/\*/g, "");
    const sp = h("span", { class: hlw ? "hl" : "", style: { display: "inline-block", marginRight: "0.22em" } });
    if (hlw) sp.innerHTML = `<i></i>${clean}`;
    else sp.textContent = clean;
    el.append(sp);
    return sp;
  });
  parent.append(el);
  return el;
}
/** Pop each word in across [t0, t1], spaced by word length (roughly how it's spoken). */
function wordsAt(el, t, t0, t1, o = {}) {
  const lens = el.spans.map((sp) => sp.textContent.length + 2);
  const total = lens.reduce((a, b) => a + b, 0);
  let acc = 0;
  el.spans.forEach((sp, i) => {
    const at = t0 + ((t1 - t0) * acc) / total;
    acc += lens[i];
    pop(sp, t, at, { from: 0.55, r: 0, y: 22, dur: 0.38, ...o });
    const bar = sp.querySelector("i");
    if (bar) sweep(bar, t, at + 0.15, 0.35);
  });
}

/** Deterministic confetti burst from (x, y) in parent coords. Returns update(t, at). */
function confetti(parent, x, y, { n = 80, seed = 7, spread = 1, power = 1 } = {}) {
  let st = seed;
  const rnd = () => (st = (st * 16807) % 2147483647) / 2147483647;
  const cols = [C.lemon400, C.pink400, C.leaf300, C.leaf600, C.lemon300, C.pink600];
  const parts = Array.from({ length: n }, () => {
    const w = 12 + rnd() * 14;
    const el = h("div");
    Object.assign(el.style, { position: "absolute", left: "0", top: "0", width: `${w}px`, height: `${rnd() < 0.5 ? w : w * 0.45}px`, background: cols[Math.floor(rnd() * cols.length)], borderRadius: rnd() < 0.3 ? "50%" : "3px", zIndex: "60", visibility: "hidden" });
    parent.append(el);
    const ang = -Math.PI / 2 + (rnd() - 0.5) * Math.PI * 1.2 * spread;
    const sp = (900 + rnd() * 1100) * power;
    return { el, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, rot: rnd() * 360, vr: (rnd() - 0.5) * 1000, flip: 4 + rnd() * 8 };
  });
  return (t, at) => {
    const dt = t - at;
    for (const p of parts) {
      if (dt < 0 || dt > 2.6) {
        p.el.style.visibility = "hidden";
        continue;
      }
      const k = 2.2;
      const px = x + (p.vx * (1 - Math.exp(-k * dt))) / k;
      const py = y + (p.vy * (1 - Math.exp(-k * dt))) / k + 0.5 * 1500 * dt * dt * 0.6;
      p.el.style.visibility = "visible";
      p.el.style.opacity = String(clamp(1 - (dt - 1.8) / 0.8));
      p.el.style.transform = `translate(${px}px, ${py}px) rotate(${p.rot + p.vr * dt}deg) scaleY(${Math.cos(dt * p.flip)})`;
    }
  };
}

/** A rubber stamp that slams down. */
function stamp(parent, text, x, y, rot = -12) {
  const el = abs(h("div", { class: "stamp" }, text), x, y);
  el.rot = rot;
  parent.append(el);
  return el;
}
function stampAt(el, t, at) {
  const p = P(t, at, 0.2);
  el.style.transform = `translate(-50%, -50%) rotate(${el.rot}deg) scale(${lerp(2.8, 1, E.in(p))})`;
  setVis(el, P(t, at, 0.06));
}
/** Camera shake offset after an impact. */
const shake = (t, at, amp = 16) => {
  const d = t - at;
  if (d < 0 || d > 0.45) return [0, 0];
  const a = amp * Math.exp(-d * 9);
  return [a * Math.sin(d * 90), a * Math.cos(d * 70)];
};

/** A tilted sticker label. */
function sticker(parent, html, x, y, { rot = -6, bg = C.lemon400, color = C.ink, size = 30 } = {}) {
  const el = abs(h("div", { class: "sticker", html }), x, y);
  Object.assign(el.style, { background: bg, color, fontSize: `${size}px` });
  el.rot = rot;
  parent.append(el);
  return el;
}
const stickerAt = (el, t, at, out = null) => pop(el, t, at, { from: 0.3, r: el.rot * 3, base: `rotate(${el.rot}deg)`, out, outS: 0.7, outY: 0 });

/* ---------- timeline ---------- */

const SCENES = [];
const CUES = [];
/** Register a scene: build(root, cue) returns update(lt). */
function scene(name, dur, build, opts = {}) {
  SCENES.push({ name, dur, build, opts });
}

async function boot() {
  const stage = document.getElementById("stage");
  let start = 0;
  for (const sc of SCENES) {
    sc.start = start;
    start += sc.dur;
    sc.root = h("section", { class: "scene", "data-name": sc.name });
    sc.content = h("div", { class: "content" });
    sc.root.append(sc.content);
    stage.append(sc.root);
    const cue = (lt, type, extra = {}) => CUES.push({ t: +(sc.start + lt).toFixed(3), type, scene: sc.name, ...extra });
    sc.update = sc.build(sc.root, sc.content, cue);
  }
  window.__duration = start;
  window.__cues = CUES.sort((a, b) => a.t - b.t);
  window.__scenes = SCENES.map((s) => ({ name: s.name, start: s.start, dur: s.dur }));
  // Fonts only load when first used, which would blank text on its first frame; load them all up front.
  const faces = ['800 100px "Bricolage Grotesque"', '700 100px "Bricolage Grotesque"', ...[400, 500, 600, 700, 800].map((w) => `${w} 40px Figtree`), '500 30px "JetBrains Mono"', '700 30px "JetBrains Mono"'];
  await Promise.all(faces.map((f) => document.fonts.load(f, "resell $0123456789 Aa")));
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => (img.getAttribute("src") ? img.decode().catch(() => {}) : null)));
}

/** Show the frame at time t. */
window.__seek = async (t) => {
  for (const sc of SCENES) {
    const on = t >= sc.start && (t < sc.start + sc.dur || (sc === SCENES[SCENES.length - 1] && t <= sc.start + sc.dur));
    sc.root.style.display = on ? "block" : "none";
    if (!on) continue;
    const lt = t - sc.start;
    sc.update(lt);
    // Shared exit: content dips out over the last 0.2s; a small zoom bump lands each cut on the beat.
    const q = sc.opts.noExit ? 0 : E.in(P(lt, sc.dur - 0.2, 0.2));
    const bump = sc.opts.bump === false ? 1 : lerp(1.035, 1, E.out(P(lt, 0, 0.32)));
    sc.content.style.opacity = String(1 - q);
    sc.content.style.transform = `translateY(${-14 * q}px) scale(${bump})`;
  }
  if (pending.length) await Promise.all(pending.splice(0));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = new Promise((resolve) => window.addEventListener("load", () => boot().then(resolve)));
