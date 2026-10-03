/*
 * resell.store demo, v2: cut to the voiceover (audio/vo.mp3, starting 2.3s in)
 * over "Lemonade Skies" (151.5 BPM, E major). Scene cuts sit on the music's beats;
 * everything inside a scene lands on the words that describe it.
 * Times below are absolute video seconds. Page coordinates come from work/rects/*.json.
 */

/* ---------- timing ---------- */

// Scene cuts, on beats. Video time = music time − 8.07, so beats are at 0.2681 + k × 0.396.
const CUT = [0, 5.02, 17.692, 24.028, 30.364, 43.036, 47.788, 52.54, 58.084, 71.152, 78.676, 87.784, 91.744, 98.476, 104.416, 109.96, 117.88, 126.592, 134.512, 141.98];
// Voiceover moments (video time = VO time + 0.15: the voice starts right away), from align.mjs + syllable timing within lines.
const T = {
  hook: 0.15, fourThousand: 2.83, neverUses: 3.94,
  because: 5.45, pricing: 6.83, photographing: 7.53, writing: 8.68, answering: 9.6, haggling: 12.6, dodging: 13.99, sigh: 15.25, cupboard: 15.91,
  third: 17.95, ifAI: 21.19, built: 22.9, builtEnd: 23.65,
  thisIs: 24.03, hackathon: 25.58, sellStuff: 28.26, sellStuffEnd: 30.31,
  maya: 30.71, snaps: 31.3, work: 33.82, recent: 35.34, maker: 36.1, buyersSay: 37.35, price: 38.83, shows: 41.6,
  asks: 43.43, writes: 45.86, writesEnd: 47.75,
  tap: 48.11, live: 48.71, shop: 49.72, link: 50.75,
  ask: 52.89, answers: 54.39, handsOver: 55.98,
  offer: 58.11, back: 60.3, counter: 62.06, deposit: 62.62, serious: 63.38, ten: 64.93, never: 66.68, yes: 68.92, yesEnd: 71.1,
  says: 71.54, sold: 72.83, pays: 73.83, holds: 75.39, arrives: 76.19, paid: 77.24,
  send: 78.79, sendEnd: 80.63, add: 81.0, limit: 84.17, shops: 85.07, asksPay: 86.2,
  sidekick: 87.93, checks: 89.91,
  resale: 92.03, billion: 93.86, easy: 95.84, easyEnd: 98.37,
  render: 98.77, app: 100.43, everyShop: 100.83, database: 101.64, workflows: 102.45, renderEnd: 104.26,
  channel3: 104.66, product: 106.28, priceNew: 107.09, photos: 107.7, descriptions: 109.12,
  kernel: 110.3, browsers: 111.3, search: 112.69, web: 114.2, signedIn: 114.89,
  moves: 118.02, connect: 120.2, payLater: 121.69, held: 123.04, refunds: 124.7,
  open: 126.69, deploy: 129.07, renderDot: 130.6, included: 132.74, includedEnd: 134.08,
  mission: 134.54, unused: 135.66, unusedEnd: 137.5, resell: 137.9, getStarted: 138.85,
};
let sceneIndex = 0;
/** Register the next scene between consecutive cuts; build gets (root, c, cue, L) where L(abs) → local. */
function shot(name, build, opts) {
  const i = sceneIndex++;
  const s0 = CUT[i];
  scene(name, CUT[i + 1] - s0, (root, c, cue) => build(root, c, (abs, type, extra) => cue(abs - s0, type, extra), (abs) => abs - s0), opts);
}

/* ---------- small builders ---------- */

function txt(parent, text, x, y, style = {}, cls = "") {
  const el = abs(h("div", { class: cls }), x, y);
  Object.assign(el.style, style);
  if (text instanceof Node) el.append(text);
  else el.innerHTML = text;
  parent.append(el);
  return el;
}
const display = (size, color = C.ink, extra = {}) => ({ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: "800", fontSize: `${size}px`, letterSpacing: "-0.035em", lineHeight: "0.98", color, ...extra });
const body = (size, weight = 600, color = C.ink, extra = {}) => ({ fontFamily: "Figtree, sans-serif", fontWeight: String(weight), fontSize: `${size}px`, lineHeight: "1.25", color, ...extra });
const eyebrow = (color) => body(26, 800, color, { letterSpacing: "0.14em", textTransform: "uppercase" });
const hl = (word) => `<span class="hl"><i></i>${word}</span>`;
const bars = (el) => [...el.querySelectorAll(".hl > i")];
const pillEl = (text, { bg = "#fff", color = C.ink, border = `3px solid ${C.ink}`, size = 30, pad = "14px 26px" } = {}) =>
  h("div", { class: "pill", style: { background: bg, color, border, fontSize: `${size}px`, padding: pad, whiteSpace: "nowrap" } }, text);
const CHECK = (size = 34, bg = C.leaf600) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><circle cx="12" cy="12" r="12" fill="${bg}"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const centered = (extra = {}) => ({ width: "1920px", textAlign: "center", ...extra });
const BIG = (size, color = C.ink) => display(size, color, centered({ lineHeight: "1.02" }));

/** The pile of unused things that opens and closes the film. */
const PILE = [
  ["chair", 1180, 690, 240, -6],
  ["record", 1440, 770, 200, 8],
  ["tote", 1640, 700, 200, -10],
  ["lamp", 1290, 520, 200, 12],
  ["sweater", 1520, 560, 220, -14],
  ["camera", 1120, 470, 200, 8],
  ["card", 1700, 470, 170, 16],
  ["dress", 1420, 350, 220, -8],
  ["pot", 1270, 230, 250, 0],
];
const BEAT = 0.396;
const beatAt = (k) => -0.1279 + k * BEAT;

/* ===================== 1. Hook (cold open on the beat) ===================== */
shot("hook", (root, c, cue, L) => {
  root.style.background = C.cream;
  const items = PILE.map(([key, x, y, size, rot], i) => {
    const el = txt(c, art(key, size), x, y);
    const land = beatAt(1 + i); // each lands on a beat
    cue(land, "thud", { gain: key === "pot" ? 1 : 0.6 });
    return { el, at: land - 0.27, y, rot };
  });
  const eb = txt(c, "Look around your home", 120, 250, eyebrow(C.pink600));
  const num = txt(c, "$0", 110, 300, display(240));
  const line = txt(c, `of ${hl("unused")} stuff in the average US home`, 120, 560, display(64, C.ink, { width: "900px", lineHeight: "1.04" }));
  const src = txt(c, "Mercari 2023 Reuse Report · 161 items per household", 120, 730, {}, "src");
  cue(T.fourThousand - 0.5, "count", { dur: 1.4 });
  return (t) => {
    for (const it of items) {
      const p = P(t, it.at, 0.75);
      it.el.style.transform = `translateY(${lerp(-1250, 0, E.bounce(p))}px) rotate(${lerp(it.rot + 50, it.rot, E.out(p))}deg)`;
      setVis(it.el, t >= it.at ? 1 : 0);
    }
    enter(eb, t, L(T.hook));
    enter(num, t, L(T.fourThousand) - 0.6, { y: 40 });
    countUp(num, t, L(T.fourThousand) - 0.5, 1.4, 0, 4267, (v) => money(Math.round(v)));
    enter(line, t, L(T.neverUses) - 0.7);
    sweep(bars(line)[0], t, L(T.neverUses));
    enter(src, t, L(T.neverUses) - 0.3, { y: 10 });
  };
});

/* ===================== 2. Why it stays there ===================== */
shot("friction", (root, c, cue, L) => {
  root.style.background = C.cream;
  const head = txt(c, "Because selling it means…", 120, 110, display(76));
  const chores = [
    ["Working out a price", 150, 300, -3, T.pricing],
    ["Taking good photos", 730, 268, 4, T.photographing],
    ["Writing the listing", 1250, 318, -2, T.writing],
    ["“Is this still available?” ×20", 190, 468, 3, T.answering],
    ["Haggling with lowballers", 960, 500, -4, T.haggling],
    ["Dodging scams", 1430, 470, 5, T.dodging],
  ].map(([text, x, y, r, at], i) => {
    const el = txt(c, pillEl(text, { size: 44, pad: "20px 34px" }), x, y);
    cue(at, "pop", { note: i });
    return { el, at: L(at) - 0.08, r };
  });
  const bubbles = [
    ["is this still available??", 300, 660, -2, T.answering + 0.8],
    ["still available? can pick up now", 330, 760, 2, T.answering + 1.6],
    ["$20 cash today?", 1080, 690, 3, T.haggling + 0.5],
  ].map(([text, x, y, r, at]) => {
    const el = txt(c, text, x, y, body(36, 600, C.ink, { background: "#ecebe4", padding: "18px 28px", borderRadius: "28px 28px 28px 8px" }));
    cue(at, "blip");
    return { el, r, at: L(at) };
  });
  const scam = sticker(c, `$15.9B lost to fraud in 2025 <span style="font:500 20px Figtree;opacity:.8">· FTC</span>`, 1310, 590, { rot: 6, bg: C.pink400, size: 34 });
  cue(T.dodging + 0.5, "pop", { note: 4, gain: 1 });
  // The cupboard.
  const cup = abs(h("div"), 740, 210, 440, 520);
  Object.assign(cup.style, { background: C.leaf900, borderRadius: "28px" });
  const shelf = abs(h("div"), 30, 250, 380, 10);
  shelf.style.background = C.leaf600;
  cup.append(shelf, txt(cup, art("pot", 150), 50, 105), txt(cup, art("camera", 130), 230, 120), txt(cup, art("dress", 150), 140, 300));
  const doorL = abs(h("div"), 0, 0, 220, 520);
  const doorR = abs(h("div"), 220, 0, 220, 520);
  for (const [d, origin, rad] of [[doorL, "0 50%", "28px 0 0 28px"], [doorR, "100% 50%", "0 28px 28px 0"]]) {
    Object.assign(d.style, { background: C.leaf600, border: `6px solid ${C.leaf900}`, borderRadius: rad, transformOrigin: origin, boxSizing: "border-box" });
    d.append(abs(h("div", { style: { background: C.lemon400, borderRadius: "8px" } }), origin === "0 50%" ? 180 : 22, 230, 14, 70));
    cup.append(d);
  }
  c.append(cup);
  const stays = txt(c, "So it stays in the cupboard.", 0, 790, BIG(84));
  const out = L(T.sigh) - 0.15;
  cue(T.sigh + 0.4, "door");
  return (t) => {
    enter(head, t, L(T.because), { out });
    const jam = clamp(P(t, L(T.dodging) + 0.2, 0.3)) * (1 - clamp(P(t, out - 0.2, 0.2)));
    chores.forEach((ch, i) => {
      const wob = Math.sin(t * 38 + i * 1.7) * 2.4 * jam;
      pop(ch.el, t, ch.at, { r: ch.r * 3, base: `rotate(${ch.r + wob}deg)`, out, outY: 120, outS: 0.3 });
    });
    bubbles.forEach((b) => enter(b.el, t, b.at, { y: 20, s: 0.8, base: `rotate(${b.r}deg)`, out, outY: 120, outS: 0.3 }));
    stickerAt(scam, t, L(T.dodging) + 0.45, out);
    pop(cup, t, out + 0.05, { from: 0.7, r: 0 });
    const shut = E.out(P(t, L(T.sigh) + 0.15, 0.3));
    doorL.style.transform = `perspective(900px) rotateY(${lerp(-100, 0, shut)}deg)`;
    doorR.style.transform = `perspective(900px) rotateY(${lerp(100, 0, shut)}deg)`;
    enter(stays, t, L(T.cupboard));
  };
});

/* ===================== 3. The turn ===================== */
shot("turn", (root, c, cue, L) => {
  root.style.background = C.cream;
  const wipe = abs(h("div"), 0, 0, W, H);
  wipe.style.background = C.lemon400;
  root.insertBefore(wipe, c);
  const eb = txt(c, "The good news", 120, 150, eyebrow(C.leaf900));
  const card = (x, big, line) => {
    const el = abs(h("div", { class: "card" }), x, 220, 790, 430);
    Object.assign(el.style, { border: `4px solid ${C.leaf900}`, padding: "44px 52px" });
    el.append(h("div", { style: display(190) }, big), h("div", { style: body(44, 700, C.ink, { marginTop: "26px", lineHeight: "1.18" }) }, line));
    c.append(el);
    return el;
  };
  const c1 = card(120, "1 in 3", "people who never resell say they would, if AI did the listing");
  const c2 = card(1010, "6 in 10", "would use AI to negotiate secondhand deals for them");
  const src = txt(c, "ThredUp 2026 Resale Report · GlobalData survey of 3,268 US adults", 120, 690, { color: C.leaf900, opacity: 0.75 }, "src");
  const built = words(c, "So we *built* that.", 0, 420, BIG(170));
  const out = L(T.built) - 0.25;
  cue(CUT[2], "whoosh");
  cue(T.third + 0.45, "pop", { note: 2 });
  cue(T.ifAI, "pop", { note: 4 });
  cue(T.built, "pop", { note: 0, gain: 1 });
  return (t) => {
    wipe.style.clipPath = `inset(0 ${100 - 100 * E.inOut(P(t, 0, 0.4))}% 0 0)`;
    enter(eb, t, L(T.third), { out });
    pop(c1, t, L(T.third) + 0.45, { from: 0.6, r: -4, out, outY: -60 });
    pop(c2, t, L(T.ifAI), { from: 0.6, r: 4, out, outY: -60 });
    enter(src, t, L(T.third) + 1.2, { y: 10, out });
    wordsAt(built, t, L(T.built), L(T.builtEnd));
  };
});

/* ===================== 4. Meet resell.store (on the downbeat) ===================== */
shot("meet", (root, c, cue, L) => {
  root.style.background = C.cream;
  const group = abs(h("div"), 0, 330, W, 400);
  group.style.textAlign = "center";
  const mark = h("div", { style: { display: "inline-block" } }, wordmark(220));
  group.append(mark);
  const flower = abs(h("div", { html: FLOWER(130) }), 1520, 270);
  const badgeWrap = abs(h("div"), 0, 600, W);
  badgeWrap.style.textAlign = "center";
  const badge = pillEl("", { size: 34, pad: "16px 30px", border: `3px solid ${C.paypal}` });
  badge.style.display = "inline-flex";
  badge.append(paypalLogo(130, C.paypal), h("span", {}, "Built for the PayPal AI Hackathon"));
  badgeWrap.append(badge);
  c.append(group, flower, badgeWrap);
  const tag = words(c, "Sell your stuff *without* doing the selling", 0, 600, BIG(96));
  const conf = confetti(c, 960, 420, { n: 70, seed: 3, power: 0.9 });
  const lift = L(T.sellStuff) - 0.35;
  cue(T.thisIs, "pop", { note: 0, gain: 1.2 });
  cue(T.thisIs, "sparkle");
  cue(T.hackathon, "pop", { note: 3 });
  cue(T.sellStuff - 0.35, "swoosh");
  return (t) => {
    const p = E.back(P(t, L(T.thisIs) - 0.05, 0.45));
    mark.style.transform = `scale(${lerp(1.7, 1, clamp(p, 0, 1.2))}) rotate(${lerp(-6, 0, clamp(p))}deg)`;
    setVis(mark, P(t, L(T.thisIs) - 0.05, 0.1));
    conf(t, L(T.thisIs) + 0.05);
    const fp = E.back(P(t, L(T.thisIs) + 0.2, 0.8));
    flower.style.transform = `rotate(${lerp(-200, 0, clamp(fp, 0, 1.2))}deg) scale(${clamp(fp, 0, 1.15)})`;
    setVis(flower, t >= L(T.thisIs) + 0.2 ? 1 : 0);
    pop(badge, t, L(T.hackathon), { from: 0.4, r: -6 });
    const up = E.inOut(P(t, lift, 0.5));
    group.style.transform = `translateY(${lerp(0, -200, up)}px) scale(${lerp(1, 0.62, up)})`;
    flower.style.left = `${lerp(1520, 1300, up)}px`;
    flower.style.top = `${lerp(270, 120, up)}px`;
    badgeWrap.style.transform = `translateY(${lerp(0, -230, up)}px) scale(${lerp(1, 0.8, up)})`;
    wordsAt(tag, t, L(T.sellStuff), L(T.sellStuffEnd) - 0.3);
  };
});

/* ===================== 5. List it: photo, line, research (live) ===================== */
shot("list-research", (root, c, cue, L) => {
  root.style.background = C.cream;
  const s = new Shot(c, { x: 160, y: 40, w: 1600, h: 1000 });
  // Clip time: hold → typing (1.24×) → click on "her agent goes to work" → research (1.35×) → price lands on "a fair price".
  // Frames 51–55 are the page change (blank white), so cut from frame 50 straight to 56 on the click.
  const map = [[0, 0.85], [L(T.maya + 1.1), 0.85], [L(T.work + 0.02), 3.33], [L(T.work + 0.03), 3.74], [L(T.price - 0.06), 10.35], [L(CUT[5]), 14.95]];
  const photo = s.add(h("div"), 715, 300, 170, 170);
  Object.assign(photo.style, { background: C.leaf100, borderRadius: "22px", border: `3px solid ${C.leaf900}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 });
  photo.append(art("pot", 140));
  const cur = new Cursor(s);
  const click = L(T.work + 0.02);
  cue(T.snaps + 0.1, "thud", { gain: 0.8 });
  cue(T.maya + 1.1, "type", { dur: 1.3 });
  cue(T.work + 0.02, "click");
  const rPrice = ring(s, 585, 233, 250, 40);
  const rSrc = ring(s, 733, 403, 402, 28, C.pink400, 10);
  const timer = sticker(c, "⏱ 38 seconds", 1380, 120, { rot: 6 });
  const tagA = sticker(c, "Channel3 · product data", 1400, 860, { rot: -4, bg: "#fff", size: 26 });
  const tagB = sticker(c, "Kernel · cloud browsers", 1420, 930, { rot: 3, bg: "#fff", size: 26 });
  cue(T.price, "chime");
  cue(T.price + 0.15, "pop", { note: 3 });
  return (t) => {
    s.clip("start-to-research", clipTime(t, map));
    s.cam(t, [
      { r: [400, 110, 800, 560] },
      { t: L(T.work + 0.1), d: 0.6, r: [0, 0, 1600, 1000] },
      { t: L(T.work + 0.9), d: 0.8, r: [16, 190, 500, 560] },
      { t: L(T.price - 0.35), d: 0.7, r: [560, 180, 1010, 300] },
    ]);
    const land = P(t, L(T.snaps) - 0.35, 0.5);
    photo.style.transform = `translate(${lerp(600, 0, E.out(land))}px, ${lerp(-520, 0, E.bounce(land))}px) rotate(${lerp(25, -3, E.out(land))}deg)`;
    setVis(photo, t >= L(T.snaps) - 0.35 && t < click + 0.02 ? 1 : 0); // gone on the cut to research
    cur.update(t, [{ x: 1250, y: 820 }, { t: click - 0.85, d: 0.7, x: 1054, y: 566 }], [click], [click - 1.0, click + 0.5]);
    ringAt(rPrice, t, L(T.price) + 0.2, L(T.shows) - 0.1);
    ringAt(rSrc, t, L(T.shows), L(CUT[5]) - 0.1);
    stickerAt(timer, t, L(T.price) + 0.15);
    stickerAt(tagA, t, L(T.recent));
    stickerAt(tagB, t, L(T.maker));
  };
});

/* ===================== 6. It asks, then it writes ===================== */
shot("asks-writes", (root, c, cue, L) => {
  root.style.background = C.cream;
  const a = new Shot(c, { x: 160, y: 40, w: 1600, h: 1000 });
  const b = new Shot(c, { src: `${CAP}/desktop/c6-words.png`, x: 160, y: 40, w: 1600, h: 1000 });
  const map = [[0, 0.95], [L(CUT[6]), 0.95 + (CUT[6] - CUT[5])]];
  const click = 2.2 - 0.95;
  const cur = new Cursor(a);
  const swap = L(T.writes) - 0.15;
  const rGift = ring(b, 241, 348, 246, 48);
  const rTitle = ring(b, 577, 233, 572, 42, C.pink400, 10);
  cue(CUT[5] + click, "click");
  cue(T.writes - 0.15, "swoosh");
  cue(T.writes + 1.0, "type", { dur: 0.6 });
  return (t) => {
    const second = t >= swap;
    a.root.style.display = second ? "none" : "block";
    b.root.style.display = second ? "block" : "none";
    a.clip("findings-answer", clipTime(t, map));
    a.cam(t, [{ r: [16, 360, 1060, 540] }]);
    cur.update(t, [{ x: 520, y: 950 }, { t: click - 0.8, d: 0.7, x: 143, y: 733 }], [click], [0, click + 0.6]);
    b.cam(t, [{ r: [16, 140, 520, 420] }, { t: swap + 0.6, d: 0.7, r: [560, 190, 1000, 330] }]);
    b.root.style.transform = `scale(${lerp(1.04, 1, E.out(P(t, swap, 0.3)))})`;
    ringAt(rGift, t, swap + 0.1, swap + 0.65);
    ringAt(rTitle, t, swap + 1.2);
  };
});

/* ===================== 7. One tap, it's live, in her own shop ===================== */
shot("publish-shop", (root, c, cue, L) => {
  root.style.background = C.cream;
  const a = new Shot(c, { x: 160, y: 40, w: 1600, h: 1000 });
  const click = L(T.tap + 0.28);
  const map = [[0, 1.15], [click, 1.6], [L(T.live + 0.1), 3.3], [L(T.shop), 4.0]];
  const cur = new Cursor(a);
  const rLive = ring(a, 552, 98, 180, 46);
  const conf = confetti(c, 960, 520, { n: 90, seed: 11 });
  const storeAt = L(T.shop) - 0.1;
  const store = new Shot(c, { src: `${CAP}/desktop/p2-store.png`, x: 110, y: 70, w: 1360, h: 850, url: "maya.resell.store" });
  const phone = new Shot(c, { src: `${CAP}/phone/m-p2-store.png`, pageW: 390, pageH: 844, x: 1450, y: 150, w: 360, h: 779, radius: 54, border: 7 });
  const toast = txt(c, "", 1150, 945);
  const tb = pillEl("", { bg: C.ink, color: C.cream, border: "none", size: 28, pad: "16px 28px" });
  tb.innerHTML = `${CHECK(30, C.lemon400)}<span>Link copied. Go show it off.</span>`;
  toast.append(tb);
  cue(T.tap + 0.28, "click");
  cue(T.live + 0.1, "sparkle");
  cue(T.live + 0.1, "chime");
  cue(T.shop - 0.1, "swoosh");
  cue(T.link, "whoosh");
  cue(T.link + 0.9, "pop", { note: 3 });
  return (t) => {
    const onStore = t >= storeAt;
    a.root.style.display = onStore ? "none" : "block";
    a.clip("publish-live", clipTime(t, map));
    a.cam(t, [{ r: [540, 90, 1040, 560] }]);
    cur.update(t, [{ x: 1150, y: 780 }, { t: click - 0.75, d: 0.6, x: 815, y: 549 }], [click], [0, click + 0.6]);
    ringAt(rLive, t, L(T.live) + 0.15, storeAt);
    conf(t, L(T.live) + 0.1);
    store.cam(t, [{ r: [0, 0, 1600, 1000] }]);
    enter(store.root, t, storeAt, { x: 120, y: 0, dur: 0.5 });
    phone.cam(t, [{ r: [0, 0, 390, 844] }]);
    enter(phone.root, t, L(T.link), { y: 260, dur: 0.6, r: 6, base: "rotate(-4deg)" });
    pop(toast, t, L(T.link) + 0.9, { from: 0.6, r: -3 });
  };
});

/* ===================== 8. It answers buyers ===================== */
shot("answers", (root, c, cue, L) => {
  root.style.background = C.cream;
  const a = new Shot(c, { src: `${CAP}/desktop/a5-inbox.png`, x: 160, y: 40, w: 1600, h: 1000 });
  const rows = [[317, 337, 374, 88], [317, 429, 374, 68], [317, 501, 374, 68]].map((r) => ring(a, ...r, C.pink400, 4));
  const rNeeds = ring(a, 317, 113, 374, 178, C.leaf600, 6);
  // Stickers live in page coordinates so they ride the camera next to what they point at.
  const spark = sticker(a.layer, `<span style="color:${C.pink400}">✦</span> Answered by her agent`, 505, 286, { rot: 4, bg: "#fff", size: 17 });
  const needs = sticker(a.layer, "Needs Maya", 590, 104, { rot: -5, bg: C.lemon400, size: 18 });
  [0, 0.45, 0.9].forEach((d, i) => cue(T.answers + d, "pop", { note: i + 1, gain: 0.6 }));
  cue(T.handsOver, "pop", { note: 0 });
  return (t) => {
    a.cam(t, [{ r: [300, 100, 800, 560] }]);
    rows.forEach((r, i) => ringAt(r, t, L(T.answers) + i * 0.45, L(T.handsOver) - 0.1));
    stickerAt(spark, t, L(T.answers) + 0.2);
    ringAt(rNeeds, t, L(T.handsOver));
    stickerAt(needs, t, L(T.handsOver) + 0.2);
  };
});

/* ===================== 9. Two agents haggle ===================== */
shot("haggle", (root, c, cue, L) => {
  root.style.background = C.cream;
  const s = new Shot(c, { src: `${CAP}/desktop/c10-offer.png`, x: 160, y: 40, w: 1600, h: 1000 });
  const rows = [[329, 233, 670, 76], [329, 312, 670, 76], [329, 391, 670, 76], [329, 470, 670, 100], [329, 573, 670, 102]].map((r) => cover(s, ...r));
  const rowTimes = [T.offer + 0.6, T.back + 0.1, T.counter, T.deposit, T.serious];
  rowTimes.forEach((at, i) => cue(at, "pop", { note: [0, 2, 1, 3, 4][i], gain: 0.8 }));
  const rHold = ring(s, 375, 635, 129, 28, C.leaf600);
  const rPrices = ring(s, 1214, 193, 318, 66);
  const rTake = ring(s, 1092, 393, 448, 104);
  const vs = sticker(c, `Agent <span style="color:${C.pink400}">↔</span> agent`, 1230, 96, { rot: 5, bg: "#fff", size: 32 });
  const stat = sticker(c, `Only 12% are OK with AI paying without asking <span style="font:500 20px Figtree;opacity:.75">· Accenture 2026</span>`, 220, 900, { rot: -2, bg: C.ink, color: C.cream, size: 30 });
  const panel = abs(h("div"), 0, 1080, W, 620);
  Object.assign(panel.style, { background: C.lemon400, borderRadius: "56px 56px 0 0", zIndex: 30 });
  panel.style.setProperty("--hl", "#fff");
  const big = words(panel, "Good offers wait for *YOUR* yes.", 0, 150, BIG(124));
  c.append(panel);
  const panelAt = L(T.yes) - 0.4;
  cue(T.yes - 0.4, "whoosh");
  cue(T.ten + 0.2, "pop", { note: 2 });
  cue(T.never + 0.1, "pop", { note: 1 });
  return (t) => {
    s.cam(t, [{ r: [300, 60, 720, 640] }, { t: L(T.ten) - 0.35, d: 0.6, r: [1040, 170, 520, 560] }]);
    rows.forEach((r, i) => reveal(r, t, L(rowTimes[i]), 0.35));
    stickerAt(vs, t, L(T.back), L(T.ten) - 0.4);
    ringAt(rHold, t, L(T.serious) + 0.2, L(T.ten) - 0.4);
    ringAt(rPrices, t, L(T.ten) + 0.2, L(T.never) - 0.1);
    ringAt(rTake, t, L(T.never) + 0.1);
    stickerAt(stat, t, L(T.never) + 0.3, panelAt + 0.2);
    panel.style.top = `${lerp(1080, 460, E.outQuint(P(t, panelAt, 0.5)))}px`;
    wordsAt(big, t, L(T.yes), L(T.yesEnd) - 0.5);
  };
});

/* ===================== 10. Yes, SOLD, PayPal does the rest ===================== */
shot("paypal-yes", (root, c, cue, L) => {
  root.style.background = C.cream;
  const a = new Shot(c, { x: 160, y: 40, w: 1600, h: 1000 });
  const clickA = L(T.says + 0.35);
  const clickB = L(T.sold - 0.12);
  const map = [[0, 1.35], [clickA, 1.81], [clickB, 4.4], [clickB + 0.6, 5.0]];
  const cur = new Cursor(a);
  const st = stamp(c, "SOLD", 960, 470, -12);
  const impact = clickB + 0.12 + 0.2;
  const conf = confetti(c, 960, 470, { n: 60, seed: 5, power: 0.8 });
  cue(T.says + 0.35, "click");
  cue(T.sold - 0.12, "click");
  cue(CUT[9] + impact, "stamp");
  cue(CUT[9] + impact, "cash");
  // Money path.
  const pathAt = L(T.pays) - 0.12;
  const path = abs(h("div"), 0, 0, W, H);
  path.style.background = C.cream;
  const ppEb = txt(path, "", 120, 150);
  ppEb.append(paypalLogo(230, C.paypal));
  const ppHead = txt(path, "Held by PayPal until it arrives.", 120, 260, display(96));
  const nodes = [
    ["1", "Jess pays", "the other $150, through PayPal", T.pays],
    ["2", "PayPal holds it", "safe until the pot arrives", T.holds],
    ["3", "It ships and lands", "Jess gets 3 days to check it", T.arrives],
    ["4", "Maya gets paid", "our 10% fee comes off on its own", T.paid],
  ].map(([n, title, sub, at], i) => {
    const x = 120 + i * 440;
    const dot = txt(path, n, x, 520, display(52, C.ink, { width: "110px", height: "110px", borderRadius: "50%", background: i === 3 ? C.lemon400 : "#fff", border: `5px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }));
    const label = txt(path, `<div style="font:800 46px 'Bricolage Grotesque';letter-spacing:-.02em;color:${C.ink}">${title}</div><div style="margin-top:8px">${sub}</div>`, x, 670, body(30, 600, C.textMuted, { width: "380px" }));
    cue(at, "pop", { note: i });
    return { dot, label, at: L(at) };
  });
  const line = abs(h("div"), 230, 571, 1320, 8);
  Object.assign(line.style, { background: C.leaf600, transformOrigin: "0 50%", borderRadius: "4px" });
  path.insertBefore(line, path.firstChild);
  c.append(path);
  const payConf = confetti(path, 1430, 560, { n: 50, seed: 9, power: 0.7 });
  cue(T.pays - 0.12, "swoosh");
  cue(T.paid + 0.05, "cash");
  return (t) => {
    const onPath = t >= pathAt;
    a.root.style.display = onPath ? "none" : "block";
    path.style.display = onPath ? "block" : "none";
    a.clip("offer-accept", clipTime(t, map));
    a.cam(t, [{ r: [880, 170, 700, 560] }, { t: clickA + 0.1, d: 0.45, r: [480, 250, 900, 500] }]);
    cur.update(t, [{ x: 1180, y: 800 }, { t: clickA - 0.5, d: 0.45, x: 1297, y: 531 }, { t: clickA + 0.3, d: 0.5, x: 961, y: 555 }], [clickA, clickB], [0, clickB + 0.3]);
    const [sx, sy] = shake(t, impact);
    a.root.style.transform = `translate(${sx}px, ${sy}px)`;
    stampAt(st, t, clickB + 0.12);
    if (t >= pathAt) setVis(st, 0);
    conf(t, impact);
    enter(ppEb, t, pathAt + 0.05);
    enter(ppHead, t, pathAt + 0.15);
    line.style.transform = `scaleX(${E.inOut(P(t, nodes[0].at, nodes[3].at - nodes[0].at))})`;
    nodes.forEach((n) => {
      pop(n.dot, t, n.at, { from: 0.3, r: -20 });
      enter(n.label, t, n.at + 0.12);
    });
    payConf(t, nodes[3].at + 0.05);
  };
});

/* ===================== 11. Buyers send their own agent ===================== */
shot("buyer-agent", (root, c, cue, L) => {
  root.style.background = C.leaf900;
  const eb = txt(c, "For buyers", 120, 150, eyebrow(C.pink400));
  const head = words(c, "Send your own agent shopping.", 120, 200, display(104, C.cream, { width: "820px" }));
  const stat = txt(c, `<div style="font:800 38px 'Bricolage Grotesque';letter-spacing:-.02em;color:#fffdf2">AI shopping traffic to US stores: up 693% last holiday season</div><div class="src" style="color:${C.leaf300};margin-top:8px">Adobe Analytics via Digital Commerce 360, January 2026</div>`, 120, 440, { width: "780px" });
  const ceil = abs(h("div", { class: "card" }), 120, 620, 640, 150);
  Object.assign(ceil.style, { border: "none", padding: "26px 34px" });
  const ceilAmt = h("span", { style: display(70) });
  const ceilCaret = h("span", { style: { display: "inline-block", width: "5px", height: "62px", background: C.ink, marginLeft: "6px", verticalAlign: "-6px" } });
  ceil.append(h("div", { style: body(28, 600, C.textMuted) }, "Go no higher than"), h("div", { style: { marginTop: "6px" } }, ceilAmt, ceilCaret));
  c.append(ceil);
  const hand = txt(c, pillEl("Hand it to your agent", { bg: C.lemon400, border: "none", size: 32, pad: "20px 36px" }), 120, 800);
  const asks = txt(c, `${CHECK(34, C.leaf300)}<span>It asks you before it pays.</span>`, 120, 910, body(32, 700, C.leaf300, { display: "flex", gap: "14px", alignItems: "center" }));
  const s = new Shot(c, { src: `${CAP}/desktop/p7-buyer-agent.png`, x: 960, y: 130, w: 840, h: 640, border: 0 });
  const covers = [[1050, 190, 400, 88], [930, 284, 510, 92], [930, 378, 510, 114], [930, 494, 510, 60]].map((r) => cover(s, ...r));
  const coverTimes = [T.add + 0.1, T.add + 0.9, T.add + 1.7, T.shops];
  coverTimes.forEach((at, i) => cue(at, "blip", { note: i }));
  const mcp = txt(c, pillEl("mcp.resell.store/buy", { bg: C.cream, border: "none", size: 28, pad: "12px 24px" }), 960, 820);
  mcp.firstChild.classList.add("mono");
  const any = txt(c, "Works with the AI you already use", 1375, 830, body(26, 600, C.leaf300));
  cue(T.limit, "type", { dur: 0.4 });
  cue(T.shops + 0.4, "pop", { note: 2 });
  cue(T.asksPay, "chime", { gain: 0.6 });
  return (t) => {
    enter(eb, t, L(T.send) - 0.1);
    wordsAt(head, t, L(T.send), L(T.sendEnd) - 0.3);
    enter(s.root, t, L(T.add) - 0.25, { x: 60, y: 0, dur: 0.5 });
    s.cam(t, [{ r: [925, 186, 525, 400] }]);
    covers.forEach((cv, i) => reveal(cv, t, L(coverTimes[i]), 0.35));
    enter(stat, t, L(T.add) + 1.0);
    enter(mcp, t, L(T.add) + 1.4);
    enter(any, t, L(T.add) + 1.6);
    enter(ceil, t, L(T.limit) - 0.2);
    typeOn(ceilAmt, "$126", t, L(T.limit), 9, ceilCaret);
    pop(hand, t, L(T.shops) + 0.4, { from: 0.5, r: -4 });
    enter(asks, t, L(T.asksPay));
  };
});

/* ===================== 12. The shopping sidekick (live) ===================== */
shot("sidekick", (root, c, cue, L) => {
  root.style.background = C.cream;
  const s = new Shot(c, { x: 160, y: 40, w: 1600, h: 1000 });
  const click = L(T.sidekick + 1.15);
  const map = [[0, 0.5], [click, 2.63], [L(T.checks) - 0.15, 3.95], [L(CUT[12]), 5.9]];
  const cur = new Cursor(s);
  const rBetter = ring(s, 1018, 43, 112, 51);
  const rRow = ring(s, 325, 752, 690, 62, C.leaf600);
  cue(CUT[11] + 0.2, "type", { dur: 0.8 });
  cue(T.sidekick + 1.15, "click");
  cue(T.checks, "chime");
  return (t) => {
    s.clip("sidekick-check", clipTime(t, map));
    s.cam(t, [{ r: [330, 30, 1230, 450] }, { t: L(T.checks) - 0.45, d: 0.55, r: [320, 690, 720, 320] }]);
    cur.update(t, [{ x: 1200, y: 700 }, { t: click - 0.75, d: 0.6, x: 941, y: 346 }], [click], [0, click + 0.4]);
    ringAt(rBetter, t, 0.1, click - 0.1);
    ringAt(rRow, t, L(T.checks) + 0.15);
  };
});

/* ===================== 13. Close ===================== */
shot("close", (root, c, cue, L) => {
  root.style.background = C.cream;
  const num = txt(c, "$0B", 0, 250, BIG(240));
  const sub = txt(c, "US resale market by 2030 (projected)", 0, 520, BIG(60));
  const src = txt(c, "OfferUp 2025 Recommerce Report", 0, 610, centered(), "src");
  const line = words(c, "We made selling as easy as *saying* *yes.*", 280, 330, display(124, C.ink, { width: "1360px", textAlign: "center", lineHeight: "1.04" }));
  const conf = confetti(c, 960, 640, { n: 70, seed: 17, power: 0.85 });
  const out = L(T.easy) - 0.3;
  cue(T.resale + 0.05, "count", { dur: 2.4 });
  cue(T.easy, "pop", { note: 0, gain: 1 });
  cue(T.easyEnd - 0.6, "sparkle");
  return (t) => {
    enter(num, t, L(T.resale), { y: 40, out });
    countUp(num, t, L(T.resale) + 0.05, 2.4, 0, 306.5, (v) => `$${v.toFixed(1)}B`);
    enter(sub, t, L(T.resale) + 0.3, { out });
    enter(src, t, L(T.resale) + 0.8, { y: 10, out });
    wordsAt(line, t, L(T.easy), L(T.easyEnd) - 0.5);
    conf(t, L(T.easyEnd) - 0.6);
  };
});

/* ===================== 14–17. How each sponsor powers it ===================== */
function sponsorLeft(c, cue, L, { name, role, bullets, nameAt, roleAt }) {
  const eb = txt(c, "Built with", 120, 130, eyebrow(C.pink600));
  const nm = txt(c, name, 120, 180, display(150));
  const rl = txt(c, role, 120, 350, display(52, C.textMuted, { width: "760px", lineHeight: "1.05" }));
  const items = bullets.map(([b, at], i) => {
    const el = txt(c, `${CHECK(36, C.leaf600)}<span>${b}</span>`, 120, 480 + i * 100, body(34, 600, C.ink, { display: "flex", gap: "18px", alignItems: "flex-start", width: "760px" }));
    el.firstChild.style.flexShrink = "0";
    el.firstChild.style.marginTop = "2px";
    cue(at, "pop", { note: i, gain: 0.5 });
    return { el, at: L(at) };
  });
  cue(nameAt - 0.1, "whoosh");
  return (t) => {
    enter(eb, t, 0.05);
    pop(nm, t, L(nameAt) - 0.1, { from: 0.6, r: -3 });
    enter(rl, t, L(roleAt));
    items.forEach((it) => enter(it.el, t, it.at, { x: -30, y: 0 }));
  };
}
const box = (title, sub) => {
  const el = h("div", { class: "card" });
  Object.assign(el.style, { border: `3px solid ${C.ink}`, padding: "22px 26px" });
  el.append(h("div", { class: "mono", style: { fontSize: "28px", fontWeight: "700" } }, title), h("div", { style: body(24, 500, C.textMuted, { marginTop: "6px" }) }, sub));
  return el;
};
function svgLine(parent, x1, y1, x2, y2, color = C.ink) {
  const sv = h("svg", { width: W, height: H, style: { position: "absolute", left: "0", top: "0", overflow: "visible" } });
  const len = Math.hypot(x2 - x1, y2 - y1);
  const l = h("line", { svg: true, x1, y1, x2, y2, stroke: color, "stroke-width": 5, "stroke-linecap": "round", "stroke-dasharray": `${len}`, "stroke-dashoffset": `${len}` });
  sv.append(l);
  parent.append(sv);
  return (p) => l.setAttribute("stroke-dashoffset", String(len * (1 - p)));
}

shot("sponsor-render", (root, c, cue, L) => {
  root.style.background = C.cream;
  const left = sponsorLeft(c, cue, L, {
    name: "Render",
    role: "Where it all runs",
    nameAt: T.render,
    roleAt: T.render + 0.6,
    bullets: [["Hosts the app, and every shop", T.app], ["Postgres with pgvector", T.database], ["Workflows for the timed jobs", T.workflows], ["One render.yaml deploys it all", T.workflows + 0.8]],
  });
  const lines = [svgLine(c, 1360, 230, 1420, 230), svgLine(c, 1600, 290, 1600, 470), svgLine(c, 1360, 530, 1420, 530)];
  const boxes = [
    [box("resell-store", "web service"), 1000, 170, T.app],
    [box("resell-db", "Postgres + pgvector"), 1420, 170, T.database],
    [box("resell-sweeps", "Render Workflow"), 1420, 470, T.workflows],
    [box("sweeps-cron", "starts it on a timer"), 1000, 470, T.workflows + 0.25],
  ].map(([el, x, y, at], i) => {
    abs(el, x, y, 360);
    c.append(el);
    cue(at, "pop", { note: i + 1, gain: 0.5 });
    return { el, at: L(at) };
  });
  const subs = ["maya.resell.store", "api. · docs. · mcp."].map((s, i) => txt(c, pillEl(s, { size: 22, pad: "8px 16px", border: `2px solid ${C.ink}`, bg: C.lemon100 }), 1000 + i * 230, 318));
  const jobsHead = txt(c, "Timed jobs in the workflow", 1000, 600, eyebrow(C.textMuted));
  const jobs = ["Offers expire", "Ship-by reminders", "Unshipped orders cancel", "“Did it arrive?” check", "Payouts release", "Quiet disputes escalate"].map((j, i) => {
    const el = txt(c, `${CHECK(30, C.leaf600)}<span>${j}</span>`, 1000 + (i % 2) * 420, 640 + Math.floor(i / 2) * 70, body(30, 600, C.ink, { display: "flex", gap: "12px", alignItems: "center" }));
    const at = T.workflows + 0.5 + i * 0.18;
    cue(at, "tick", { gain: 0.8 });
    return { el, at: L(at) };
  });
  return (t) => {
    left(t);
    boxes.forEach((b) => pop(b.el, t, b.at, { from: 0.6, r: 0 }));
    lines.forEach((l, i) => l(E.inOut(P(t, L(T.workflows) + i * 0.12, 0.35))));
    subs.forEach((s, i) => pop(s, t, L(T.everyShop) + i * 0.2, { from: 0.5, r: 4 }));
    enter(jobsHead, t, L(T.workflows) + 0.3);
    jobs.forEach((j) => enter(j.el, t, j.at, { x: -20, y: 0, dur: 0.3 }));
  };
});

shot("sponsor-channel3", (root, c, cue, L) => {
  root.style.background = C.cream;
  const left = sponsorLeft(c, cue, L, {
    name: "Channel3",
    role: "What the product really is",
    nameAt: T.channel3,
    roleAt: T.channel3 + 0.6,
    bullets: [["Identifies the product", T.product], ["The price new", T.priceNew], ["The maker's own photos", T.photos], ["And their descriptions", T.descriptions]],
  });
  const req = abs(h("div"), 1000, 170, 800, 110);
  Object.assign(req.style, { background: C.ink, borderRadius: "24px", padding: "34px 36px" });
  const code = h("span", { class: "mono", style: { color: C.lemon300, fontSize: "30px" } });
  req.append(code);
  c.append(req);
  const card = (i, label) => {
    const el = abs(h("div", { class: "card" }), 1000 + (i % 2) * 410, 330 + Math.floor(i / 2) * 210, 390, 180);
    Object.assign(el.style, { border: `3px solid ${C.ink}`, padding: "24px 28px" });
    el.append(h("div", { style: body(28, 700, C.textMuted) }, label));
    c.append(el);
    return el;
  };
  const c1 = card(0, "It's a Le Creuset");
  c1.append(h("div", { style: display(34, C.ink, { marginTop: "12px", lineHeight: "1.08" }) }, "Round dutch oven, 5.5 qt"));
  const c2 = card(1, "Still sold new");
  c2.append(h("div", { style: display(64, C.ink, { marginTop: "12px" }) }, "$420"));
  const c3 = card(2, "Maker photos");
  const row = h("div", { style: { display: "flex", gap: "12px", marginTop: "12px" } });
  for (let k = 0; k < 3; k++) row.append(h("div", { style: { background: C.leaf100, borderRadius: "14px", padding: "6px" } }, art("pot", 64)));
  c3.append(row);
  const c4 = card(3, "Description");
  const lines = h("div", { style: { marginTop: "16px", display: "grid", gap: "12px" } });
  for (const w of [100, 88, 94, 60]) lines.append(h("div", { style: { height: "12px", width: `${w}%`, background: C.border, borderRadius: "6px" } }));
  c4.append(lines);
  const cards = [[c1, T.product], [c2, T.priceNew], [c3, T.photos], [c4, T.descriptions]];
  cards.forEach(([, at], i) => cue(at + 0.1, "pop", { note: i + 1, gain: 0.6 }));
  cue(T.channel3 + 0.5, "type", { dur: 1.1 });
  return (t) => {
    left(t);
    enter(req, t, L(T.channel3) + 0.3);
    typeOn(code, 'search("Le Creuset dutch oven, yellow")', t, L(T.channel3) + 0.5, 32);
    cards.forEach(([el, at], i) => pop(el, t, L(at) + 0.1, { from: 0.6, r: i % 2 ? 4 : -4 }));
  };
});

shot("sponsor-kernel", (root, c, cue, L) => {
  root.style.background = C.cream;
  const left = sponsorLeft(c, cue, L, {
    name: "Kernel",
    role: "Real browsers in the cloud",
    nameAt: T.kernel,
    roleAt: T.browsers,
    bullets: [["Browsers the agent drives", T.browsers + 0.3], ["Searches resale marketplaces", T.search], ["…and the open web", T.web], ["Signed in to the seller's own accounts", T.signedIn]],
  });
  const prices = ["$165", "$190", "$175", "$205"];
  const wins = [
    ["Resale marketplace", 1000, 150, T.search],
    ["The web", 1430, 150, T.web],
    ["Your account", 1215, 400, T.signedIn],
  ].map(([label, x, y, at], wi) => {
    const win = abs(h("div", { class: "card" }), x, y, 380, 300);
    Object.assign(win.style, { border: `3px solid ${C.ink}`, overflow: "hidden", boxShadow: "0 30px 60px -30px rgba(20,38,29,.4)" });
    const bar = h("div", { style: { height: "48px", background: C.muted, borderBottom: `2px solid ${C.border}`, display: "flex", alignItems: "center", gap: "8px", padding: "0 16px" } });
    for (const col of ["#ff6b5e", "#ffbd2e", "#28c840"]) bar.append(h("span", { style: { width: "11px", height: "11px", borderRadius: "50%", background: col } }));
    bar.append(h("span", { style: body(20, 700, C.ink, { marginLeft: "10px" }) }, wi === 2 ? "🔒 " : "", label));
    win.append(bar);
    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "16px" } });
    const cards = prices.map((p) => {
      const cardEl = h("div", { style: { background: C.muted, borderRadius: "12px", padding: "8px", display: "flex", alignItems: "center", gap: "8px" } }, art("pot", 44), h("span", { style: body(24, 800) }, p));
      grid.append(cardEl);
      return cardEl;
    });
    win.append(grid);
    if (wi === 2) win.append(h("div", { style: body(20, 700, C.leaf600, { padding: "0 16px" }) }, "Signed in as you"));
    const scan = abs(h("div"), 0, 48, 380, 6);
    scan.style.background = C.pink400;
    win.append(scan);
    c.append(win);
    cue(at, "pop", { note: wi + 1, gain: 0.6 });
    return { win, cards, scan, at: L(at) };
  });
  const range = abs(h("div", { class: "card" }), 1000, 760, 810, 200);
  Object.assign(range.style, { border: `3px solid ${C.ink}`, padding: "26px 34px" });
  const track = h("div", { style: { position: "relative", height: "14px", borderRadius: "7px", background: C.leaf100, marginTop: "20px" } });
  const band = abs(h("div"), 0, 0, 0, 14);
  Object.assign(band.style, { background: C.leaf300, borderRadius: "7px" });
  const knob = abs(h("div"), 0, -7, 28, 28);
  Object.assign(knob.style, { background: C.leaf600, borderRadius: "50%", border: "4px solid #fff" });
  track.append(band, knob);
  range.append(h("div", { style: body(24, 800, C.textMuted, { letterSpacing: ".1em", textTransform: "uppercase" }) }, "Used ones sell for"), h("div", { style: display(64, C.ink, { marginTop: "6px" }) }, "$160 to $210"), track);
  c.append(range);
  const rangeAt = L(T.signedIn) + 1.2;
  cue(T.signedIn + 1.6, "chime", { gain: 0.6 });
  return (t) => {
    left(t);
    wins.forEach((w, wi) => {
      pop(w.win, t, w.at, { from: 0.7, r: wi === 1 ? 4 : -3 });
      const sp = P(t, w.at + 0.3, 1.2);
      w.scan.style.top = `${lerp(48, 300, sp)}px`;
      setVis(w.scan, sp > 0 && sp < 1 ? 0.7 : 0);
      w.cards.forEach((cd, k) => enter(cd, t, w.at + 0.35 + k * 0.18, { y: 10, s: 0.9, dur: 0.3 }));
    });
    enter(range, t, rangeAt);
    const fill = E.inOut(P(t, rangeAt + 0.4, 0.8));
    band.style.left = `${lerp(370, 250, fill)}px`;
    band.style.width = `${lerp(0, 260, fill)}px`;
    knob.style.left = `${lerp(370, 356, fill)}px`;
    setVis(knob, P(t, rangeAt + 0.4, 0.3));
  };
});

shot("sponsor-paypal", (root, c, cue, L) => {
  root.style.background = C.leaf900;
  const eb = txt(c, "Lead sponsor", 120, 120, eyebrow(C.lemon300));
  const logo = txt(c, paypalLogo(520, "#fff"), 120, 180);
  const line = words(c, "Every dollar, start to finish.", 120, 390, display(72, C.cream));
  const steps = [
    ["Connect", "Sellers connect PayPal in a tap", T.connect],
    ["Pay", "Checkout, Pay Later, deposits on offers", T.payLater],
    ["Hold", "Held until the item arrives", T.held],
    ["Fee", "Our 10% comes off automatically", T.held + 1.1],
    ["Payout", "Paid out when it lands", T.held + 1.9],
  ];
  const rail = abs(h("div"), 180, 600, 1460, 8);
  Object.assign(rail.style, { background: C.lemon300, transformOrigin: "0 50%", borderRadius: "4px" });
  c.append(rail);
  const nodes = steps.map(([name, sub, at], i) => {
    const x = 120 + i * 365;
    const dot = txt(c, name, x, 548, display(34, C.ink, { minWidth: "120px", height: "112px", padding: "0 24px", borderRadius: "56px", background: i === 4 ? C.lemon400 : C.cream, display: "flex", alignItems: "center", justifyContent: "center" }));
    const lab = txt(c, sub, x, 690, body(30, 600, "rgba(255,253,242,.85)", { width: "320px" }));
    cue(at, "pop", { note: i });
    return { dot, lab, at: L(at) };
  });
  const branch = txt(c, pillEl("↳ Refunds and disputes, synced by webhook", { bg: C.pink400, color: C.ink, border: "none", size: 30, pad: "16px 28px" }), 850, 880);
  cue(T.moves, "whoosh");
  cue(T.refunds + 0.1, "pop", { note: 2 });
  cue(T.held + 1.9, "cash");
  return (t) => {
    enter(eb, t, L(T.moves) - 0.1);
    pop(logo, t, L(T.moves), { from: 0.6, r: -3 });
    wordsAt(line, t, L(T.moves) + 0.4, L(T.moves) + 1.5);
    rail.style.transform = `scaleX(${E.inOut(P(t, nodes[0].at, nodes[4].at - nodes[0].at))})`;
    nodes.forEach((n) => {
      pop(n.dot, t, n.at, { from: 0.3, r: -10 });
      enter(n.lab, t, n.at + 0.15);
    });
    pop(branch, t, L(T.refunds) + 0.1, { from: 0.6, r: -3 });
  };
});

/* ===================== 18. Open source: deploy your own on Render, everything included ===================== */
shot("open-source", (root, c, cue, L) => {
  root.style.background = C.cream;
  const title = words(c, "resell.store is *open* *source.*", 120, 70, display(100));
  // Deploy card.
  const card = abs(h("div"), 360, 250, 1200, 440);
  Object.assign(card.style, { background: C.ink, borderRadius: "40px", padding: "54px 64px", boxShadow: "0 40px 80px -40px rgba(20,38,29,.6)" });
  const repo = h("div", { class: "mono", style: { color: C.cream, fontSize: "30px", opacity: ".85" } }, "github.com/impactvelocity/resell-store");
  const btnRow = h("div", { style: { display: "flex", alignItems: "center", gap: "26px", marginTop: "40px" } });
  const btn = h("div", { class: "pill", style: { background: C.lemon400, color: C.ink, fontSize: "46px", fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: "800", padding: "22px 44px", borderRadius: "999px" } }, "Deploy to Render");
  const yaml = h("div", { class: "mono", style: { color: C.leaf300, fontSize: "24px", lineHeight: "1.4" } }, "render.yaml", h("br"), "web · postgres · workflows");
  btnRow.append(btn, yaml);
  const track = h("div", { style: { position: "relative", height: "16px", borderRadius: "8px", background: "rgba(255,253,242,.15)", marginTop: "50px", overflow: "hidden" } });
  const fill = abs(h("div"), 0, 0, 0, 16);
  Object.assign(fill.style, { background: C.lemon400, borderRadius: "8px" });
  track.append(fill);
  const status = h("div", { style: body(32, 700, C.cream, { marginTop: "22px", position: "relative", height: "40px" }) });
  const s1 = h("span", { style: { position: "absolute", left: "0", top: "0" } }, "Deploying your own marketplace…");
  const s2 = h("span", { style: { position: "absolute", left: "0", top: "0", color: C.leaf300, display: "flex", gap: "12px", alignItems: "center" }, html: `${CHECK(34, C.leaf600)}<span>Your marketplace is live</span>` });
  status.append(s1, s2);
  card.append(repo, btnRow, track, status);
  c.append(card);
  const onRender = sticker(c, "on Render ✦", 1380, 220, { rot: 6, bg: C.lemon400, size: 34 });
  const cursor = abs(h("div", { class: "cursor", html: CURSOR_SVG }), 0, 0);
  c.append(cursor);
  const btnX = 360 + 64 + 200, btnY = 250 + 54 + 36 + 40 + 50;
  const doneAt = L(T.renderDot) + 0.9;
  const conf = confetti(c, 960, 640, { n: 60, seed: 29, power: 0.8 });
  // Everything included: the tiles burst in.
  const burst = L(T.included) - 0.05;
  const eb = txt(c, "Everything included", 120, 205, eyebrow(C.pink600));
  const tiles = [
    ["Sales page", "desktop/l1-landing-hero.png"],
    ["Sign-in", "desktop/a1-welcome.png"],
    ["Two-sided marketplace", "desktop/p1-discover.png"],
    ["Selling and buying agents", "desktop/c10-offer.png"],
    ["API, MCP and docs", "desktop/d6-api-docs.png"],
    ["Notification emails", "email/e-offer-received.png"],
    ["Design system", "desktop/d5-design-system.png"],
    ["PayPal payments", "desktop/p4-checkout.png"],
  ];
  const els = tiles.map(([label, src], i) => {
    const tile = abs(h("div", { class: "card" }), 121 + (i % 4) * 426, 270 + Math.floor(i / 4) * 360, 400, 330);
    Object.assign(tile.style, { overflow: "hidden", border: `3px solid ${C.ink}` });
    const thumb = abs(h("div"), 0, 0, 400, 256);
    Object.assign(thumb.style, { overflow: "hidden", background: C.muted, borderBottom: `2px solid ${C.border}` });
    const img = h("img", { src: `${CAP}/${src}`, alt: "" });
    Object.assign(img.style, { position: "absolute", left: "0", top: "0", width: "400px" });
    thumb.append(img);
    tile.append(thumb, abs(h("div", { html: `${CHECK(30)}<span>${label}</span>`, style: body(25, 700, C.ink, { display: "flex", gap: "12px", alignItems: "center", padding: "0 18px", height: "74px" }) }), 0, 256, 400));
    c.append(tile);
    const at = burst + i * 0.14;
    cue(CUT[17] + at, "pop", { note: i % 5, gain: 0.7 });
    return { tile, at };
  });
  cue(T.open + 1.2, "whoosh");
  cue(T.deploy, "click");
  cue(T.renderDot, "pop", { note: 3 });
  cue(CUT[17] + doneAt, "chime");
  cue(CUT[17] + doneAt, "sparkle");
  cue(T.included - 0.1, "swoosh");
  return (t) => {
    wordsAt(title, t, L(T.open), L(T.open) + 1.3);
    enter(card, t, L(T.open) + 1.2, { y: 60, dur: 0.5, out: burst - 0.2, outY: -40, outS: 0.9 });
    const press = t >= L(T.deploy) - 0.05 && t < L(T.deploy) + 0.15 ? 0.94 : 1;
    btn.style.transform = `scale(${press})`;
    // Stage cursor glides to the button and clicks on "deploy".
    const cp = E.inOut(P(t, L(T.deploy) - 0.8, 0.7));
    cursor.style.left = `${lerp(1500, btnX, cp)}px`;
    cursor.style.top = `${lerp(960, btnY, cp)}px`;
    cursor.style.transform = `scale(${press < 1 ? 0.85 : 1})`;
    setVis(cursor, clamp(P(t, L(T.deploy) - 0.9, 0.2)) * (1 - P(t, L(T.deploy) + 0.5, 0.25)));
    const fp = E.inOut(P(t, L(T.deploy) + 0.15, doneAt - L(T.deploy) - 0.15));
    fill.style.width = `${fp * 1072}px`;
    setVis(s1, t >= L(T.deploy) + 0.1 && t < doneAt ? 1 : 0);
    setVis(s2, t >= doneAt ? 1 : 0);
    stickerAt(onRender, t, L(T.renderDot), burst - 0.2);
    conf(t, doneAt);
    enter(eb, t, burst);
    els.forEach((e, i) => pop(e.tile, t, e.at, { from: 0.45, r: i % 2 ? 6 : -6, dur: 0.4 }));
  };
});

/* ===================== 19. The mission, into the end card ===================== */
shot(
  "mission",
  (root, c, cue, L) => {
    root.style.background = C.cream;
    const dests = [
      [100, 120, "A"], [520, 70, "B"], [980, 60, "D"], [1460, 80, "K"], [1720, 230, "L"], [1730, 600, "N"], [1600, 930, "P"], [1080, 960, "S"], [420, 950, "J"],
    ];
    const flyAt = (i) => 0.45 + i * (BEAT / 2);
    const items = PILE.map(([key, x, y, size, rot], i) => {
      const el = txt(c, art(key, size), x, y);
      const [dx, dy, who] = dests[i];
      const chip = txt(c, "", dx, dy);
      const chipPill = pillEl("", { size: 26, pad: "8px 18px 8px 8px", border: `3px solid ${C.ink}` });
      chipPill.innerHTML = `<span style="display:flex;width:44px;height:44px;border-radius:50%;background:${i % 2 ? C.pink100 : C.leaf100};align-items:center;justify-content:center;font:800 24px 'Bricolage Grotesque'">${who}</span><span>${key === "pot" ? "Sold to Jess" : "New home"}</span>`;
      chip.append(chipPill);
      cue(CUT[18] + flyAt(i) + 0.4, "pop", { note: i % 5, gain: 0.5 });
      return { el, chip, at: flyAt(i), x, y, size, rot, dx, dy };
    });
    const eb = txt(c, "Our mission", 120, 330, eyebrow(C.pink600));
    const head = words(c, "Nothing good goes *unused.*", 120, 380, display(150, C.ink, { width: "1000px", lineHeight: "1.0" }));
    // End card.
    const sunAt = L(T.unusedEnd) - 0.05;
    const sun = abs(h("div"), W / 2, H / 2, 0, 0);
    Object.assign(sun.style, { background: C.lemon400, borderRadius: "50%" });
    c.append(sun);
    const end = abs(h("div"), 0, 0, W, H);
    end.style.textAlign = "center";
    const mark = h("div", { style: { display: "inline-block", marginTop: "250px" } }, wordmark(180, C.ink, "#fff"));
    const tagline = h("div", { style: display(66, C.ink, { marginTop: "34px" }) }, "Snap a photo. Say yes. Get paid.");
    const cta = h("div", { style: { marginTop: "44px" } }, pillEl("Get started at resell.store", { bg: C.ink, color: C.cream, border: "none", size: 36, pad: "20px 40px" }));
    const pills = h("div", { style: { display: "flex", justifyContent: "center", gap: "20px", marginTop: "40px" } });
    const p1 = pillEl("", { size: 26, pad: "12px 24px", border: `3px solid ${C.ink}` });
    p1.append(paypalLogo(96, C.paypal), h("span", {}, "Built for the PayPal AI Hackathon"));
    const p2 = pillEl("Open source on GitHub", { size: 26, pad: "12px 24px", border: `3px solid ${C.ink}` });
    pills.append(p1, p2);
    end.append(mark, tagline, cta, pills);
    const flower = abs(h("div", { html: FLOWER(110) }), 1430, 200);
    end.append(flower);
    c.append(end);
    const conf = confetti(c, 960, 400, { n: 110, seed: 23, power: 1.1 });
    const markAt = L(T.resell);
    cue(T.unusedEnd - 0.05, "whoosh");
    cue(T.resell, "pop", { note: 0, gain: 1.2 });
    cue(T.resell, "sparkle");
    cue(T.getStarted, "pop", { note: 3 });
    cue(T.mission, "pop", { note: 2 });
    return (t) => {
      items.forEach((it, i) => {
        setVis(it.el, t < it.at + 0.45 ? clamp(P(t, i * 0.03, 0.15)) : 0);
        const p = E.inOut(P(t, it.at, 0.45));
        const lift = Math.sin(p * Math.PI) * -160;
        it.el.style.transformOrigin = "0 0";
        it.el.style.transform = `translate(${lerp(0, it.dx - it.x, p)}px, ${lerp(0, it.dy - it.y, p) + lift}px) scale(${lerp(1, 70 / it.size, p)}) rotate(${lerp(it.rot, it.rot + 200, p)}deg)`;
        pop(it.chip, t, it.at + 0.4, { from: 0.4, r: -6, out: sunAt - 0.15, outY: 0, outS: 0.8 });
      });
      enter(eb, t, L(T.mission), { out: sunAt });
      wordsAt(head, t, L(T.unused), L(T.unusedEnd) - 0.5);
      if (t >= sunAt) setVis(head, 1 - P(t, sunAt, 0.2));
      const sp = E.inOut(P(t, sunAt, 0.5));
      const r = lerp(0, 1250, sp);
      Object.assign(sun.style, { left: `${W / 2 - r}px`, top: `${H / 2 - r}px`, width: `${2 * r}px`, height: `${2 * r}px` });
      setVis(sun, t >= sunAt ? 1 : 0);
      setVis(end, t >= markAt - 0.1 ? 1 : 0);
      pop(mark, t, markAt - 0.05, { from: 0.5, r: -4 });
      conf(t, markAt);
      enter(tagline, t, markAt + 0.45);
      pop(cta, t, L(T.getStarted), { from: 0.5, r: -3 });
      pop(p1, t, L(T.getStarted) + 0.5, { from: 0.6, r: -4 });
      pop(p2, t, L(T.getStarted) + 0.7, { from: 0.6, r: 4 });
      const fp = E.back(P(t, markAt + 0.15, 0.8));
      flower.style.transform = `rotate(${lerp(-220, 0, clamp(fp, 0, 1.2))}deg) scale(${clamp(fp, 0, 1.15)})`;
      setVis(flower, t >= markAt + 0.15 ? 1 : 0);
    };
  },
  { noExit: true },
);
