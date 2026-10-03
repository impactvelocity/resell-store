/*
 * resell.store demo — scenes. Follows docs/video/STORYBOARD.md.
 * Page coordinates come from work/rects/*.json (CSS px of the captured viewport).
 */

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
/** "word" with a lemon highlighter bar; returns [html, getBar]. */
const hl = (word) => `<span class="hl"><i></i>${word}</span>`;
const bars = (el) => [...el.querySelectorAll(".hl > i")];
const pillEl = (text, { bg = "#fff", color = C.ink, border = `3px solid ${C.ink}`, size = 30, pad = "14px 26px" } = {}) =>
  h("div", { class: "pill", style: { background: bg, color, border, fontSize: `${size}px`, padding: pad, whiteSpace: "nowrap" } }, text);
const CHECK = (size = 34, bg = C.leaf600) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><circle cx="12" cy="12" r="12" fill="${bg}"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** The item pile used to open and close the film. */
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

/* ===================== 1. Hook ===================== */
scene("hook", 7, (root, c, cue) => {
  root.style.background = C.cream;
  const items = PILE.map(([key, x, y, size, rot], i) => {
    const el = txt(c, art(key, size), x, y);
    const at = 0.35 + i * 0.26;
    cue(at + 0.25, "thud", { gain: key === "pot" ? 1 : 0.6 });
    return { el, at, y, rot };
  });
  const eb = txt(c, "Look around your home", 120, 250, eyebrow(C.pink600));
  const num = txt(c, "$0", 110, 300, display(240));
  const line = txt(c, `of ${hl("unused")} stuff in the average US home`, 120, 560, display(64, C.ink, { width: "900px", lineHeight: "1.04" }));
  const src = txt(c, "Mercari 2023 Reuse Report · 161 items per household", 120, 730, {}, "src");
  cue(0.5, "count", { dur: 2 });
  return (t) => {
    for (const it of items) {
      const p = P(t, it.at, 0.75);
      it.el.style.transform = `translateY(${lerp(-1250, 0, E.bounce(p))}px) rotate(${lerp(it.rot + 50, it.rot, E.out(p))}deg)`;
      setVis(it.el, t >= it.at ? 1 : 0);
    }
    enter(eb, t, 0.2);
    enter(num, t, 0.4, { y: 40 });
    countUp(num, t, 0.5, 2.0, 0, 4267, (v) => money(Math.round(v)));
    enter(line, t, 1.5);
    sweep(bars(line)[0], t, 2.3);
    enter(src, t, 2.2, { y: 10 });
  };
});

/* ===================== 2. Why it stays there ===================== */
scene("friction", 10, (root, c, cue) => {
  root.style.background = C.cream;
  const head = txt(c, "Because selling it means…", 120, 110, display(76));
  const chores = [
    ["Working out a price", 150, 300, -3],
    ["Taking good photos", 730, 268, 4],
    ["Writing the listing", 1250, 318, -2],
    ["“Is this still available?”", 230, 468, 3],
    ["Haggling with lowballers", 900, 500, -4],
    ["Dodging scams", 1400, 470, 5],
  ].map(([text, x, y, r], i) => {
    const el = txt(c, pillEl(text, { size: 44, pad: "20px 34px" }), x, y);
    const at = 0.7 + i * 0.5;
    cue(at, "pop", { note: i });
    return { el, at, r };
  });
  const bubbles = [
    ["is this still available??", 300, 660, -2, 3.3],
    ["$20 cash today? can pick up now", 1000, 690, 2, 3.9],
  ].map(([text, x, y, r, at]) => {
    const el = txt(c, text, x, y, body(36, 600, C.ink, { background: "#ecebe4", padding: "18px 28px", borderRadius: "28px 28px 28px 8px" }));
    cue(at, "blip");
    return { el, r, at };
  });
  const fraud = h("div", { style: { position: "absolute", left: "0", top: "250px", width: "1920px", textAlign: "center" } });
  const fraudNum = txt(fraud, "$0B", 0, 0, display(230, C.pink600, { position: "relative" }));
  const fraudLine = txt(fraud, "lost to fraud in the US in 2025", 0, 0, display(64, C.ink, { position: "relative", marginTop: "18px" }));
  const fraudSrc = txt(fraud, "FTC, March 2026", 0, 0, { position: "relative", marginTop: "22px" }, "src");
  c.append(fraud);
  cue(5.5, "count", { dur: 1.2 });
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
  const stays = txt(c, "So it stays in the cupboard.", 0, 790, display(84, C.ink, { width: "1920px", textAlign: "center" }));
  cue(8.0, "door");
  return (t) => {
    enter(head, t, 0.15, { out: 5.1 });
    const jam = clamp(P(t, 4.5, 0.3)) * (1 - clamp(P(t, 5.0, 0.2)));
    chores.forEach((ch, i) => {
      const wob = Math.sin(t * 38 + i * 1.7) * 2.2 * jam;
      pop(ch.el, t, ch.at, { r: ch.r * 3, base: `rotate(${ch.r + wob}deg)`, out: 5.1, outY: -40 });
    });
    bubbles.forEach((b) => enter(b.el, t, b.at, { y: 20, s: 0.8, base: `rotate(${b.r}deg)`, out: 5.1, outY: -40 }));
    enter(fraudNum, t, 5.35, { y: 40, out: 7.3 });
    countUp(fraudNum, t, 5.5, 1.2, 0, 15.9, (v) => `$${v.toFixed(1)}B`);
    enter(fraudLine, t, 5.9, { out: 7.3 });
    enter(fraudSrc, t, 6.3, { y: 10, out: 7.3 });
    pop(cup, t, 7.45, { from: 0.7, r: 0 });
    const shut = E.out(P(t, 7.75, 0.3));
    doorL.style.transform = `perspective(900px) rotateY(${lerp(-100, 0, shut)}deg)`;
    doorR.style.transform = `perspective(900px) rotateY(${lerp(100, 0, shut)}deg)`;
    enter(stays, t, 8.1);
  };
});

/* ===================== 3. The turn ===================== */
scene("turn", 8, (root, c, cue) => {
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
  const built = txt(c, "So we built that.", 0, 420, display(170, C.ink, { width: "1920px", textAlign: "center" }));
  cue(0, "whoosh");
  cue(0.6, "pop", { note: 2 });
  cue(1.4, "pop", { note: 4 });
  cue(5.7, "pop", { note: 0, gain: 1 });
  return (t) => {
    wipe.style.clipPath = `inset(0 ${100 - 100 * E.inOut(P(t, 0, 0.5))}% 0 0)`;
    enter(eb, t, 0.35, { out: 5.3 });
    pop(c1, t, 0.6, { from: 0.6, r: -4, out: 5.3, outY: -60 });
    pop(c2, t, 1.4, { from: 0.6, r: 4, out: 5.35, outY: -60 });
    enter(src, t, 2.0, { y: 10, out: 5.3 });
    pop(built, t, 5.7, { from: 0.5, r: -3 });
  };
});

/* ===================== 4. Meet resell.store ===================== */
scene("meet", 6.5, (root, c, cue) => {
  root.style.background = C.cream;
  const group = abs(h("div"), 0, 300, W, 400);
  group.style.textAlign = "center";
  const mark = h("div", { style: { display: "inline-block" } }, wordmark(200));
  const flower = abs(h("div", { html: FLOWER(120) }), 1480, 250);
  const tag = h("div", { style: display(80, C.ink, { marginTop: "36px" }) }, "Sell your stuff without doing the selling");
  group.append(mark, tag);
  c.append(group, flower);
  const hero = new Shot(c, { src: `${CAP}/desktop/l1-landing-hero.png`, x: 210, y: 1100, w: 1500, h: 938 });
  const badge = abs(h("div"), 1250, 440);
  const b = pillEl("", { size: 28, pad: "14px 26px", border: `3px solid ${C.paypal}` });
  b.append(paypalLogo(110, C.paypal), h("span", {}, "Built for the PayPal AI Hackathon"));
  badge.append(b);
  c.append(badge);
  cue(0.15, "pop", { note: 0, gain: 1 });
  cue(0.45, "sparkle");
  cue(2.7, "whoosh");
  cue(3.6, "pop", { note: 4 });
  return (t) => {
    pop(mark, t, 0.15, { from: 0.5, r: -4 });
    const flowerP = E.back(P(t, 0.45, 0.8));
    flower.style.transform = `rotate(${lerp(-200, 0, clamp(flowerP, 0, 1.2))}deg) scale(${clamp(flowerP, 0, 1.15)})`;
    setVis(flower, t >= 0.45 ? 1 : 0);
    enter(tag, t, 1.1);
    const up = E.inOut(P(t, 2.7, 0.8));
    group.style.transform = `translateY(${lerp(0, -250, up)}px) scale(${lerp(1, 0.62, up)})`;
    flower.style.left = `${lerp(1480, 1215, up)}px`;
    flower.style.top = `${lerp(250, 70, up)}px`;
    hero.root.style.top = `${lerp(1100, 330, E.outQuint(P(t, 2.8, 1.0)))}px`;
    hero.cam(t, [{ r: [0, 0, 1600, 1000] }]);
    pop(badge, t, 3.6, { from: 0.4, r: 8, base: "rotate(4deg)" });
  };
});

/* ===================== 5–6. List it: photo, line, research ===================== */
scene("list-research", 19, (root, c, cue) => {
  root.style.background = C.cream;
  const shot = new Shot(c, { x: 160, y: 40, w: 1600, h: 1000 });
  const map = [[0, 0.85], [0.4, 0.85], [19, 19.45]];
  const lt = (clipT) => 0.4 + (clipT - 0.85);
  // The photo landing in the drop zone (the prototype has no file picker to drive).
  const photo = shot.add(h("div"), 715, 300, 170, 170);
  Object.assign(photo.style, { background: C.leaf100, borderRadius: "22px", border: `3px solid ${C.leaf900}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 });
  photo.append(art("pot", 140));
  const cur = new Cursor(shot);
  const click = lt(3.4);
  cue(0.55, "thud", { gain: 0.8 });
  cue(lt(0.81), "type", { dur: 1.66 });
  cue(click, "click");
  const ringPrice = ring(shot, 585, 233, 250, 40, C.pink400);
  const ringSrc = ring(shot, 733, 403, 402, 28, C.pink400, 10);
  const tags = abs(h("div"), 1430, 70);
  Object.assign(tags.style, { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px", zIndex: 20 });
  const tagA = pillEl("Channel3 · product data", { size: 24, pad: "10px 20px" });
  const tagB = pillEl("Kernel · cloud browsers", { size: 24, pad: "10px 20px" });
  tags.append(tagA, tagB);
  c.append(tags);
  const caps = captions(c, [
    { at: 0.3, out: 2.9, text: "Maya snaps her old dutch oven and adds one line." },
    { at: 3.6, out: 9.6, text: "Her agent checks what it really sells for.", spark: true },
    { at: 10.2, out: 18.5, text: "38 seconds: a fair price, with sources.", spark: true },
  ]);
  cue(10.0, "chime");
  return (t) => {
    shot.clip("start-to-research", clipTime(t, map));
    shot.cam(t, [
      { r: [400, 110, 800, 560] },
      { t: 3.15, d: 0.8, r: [0, 0, 1600, 1000] },
      { t: 4.0, d: 1.0, r: [16, 190, 500, 560] },
      { t: 9.8, d: 1.0, r: [560, 180, 1010, 300] },
      { t: 15.2, d: 1.2, r: [16, 300, 1060, 560] },
    ]);
    const land = P(t, 0.1, 0.55);
    photo.style.transform = `translate(${lerp(600, 0, E.out(land))}px, ${lerp(-520, 0, E.bounce(land))}px) rotate(${lerp(25, -3, E.out(land))}deg)`;
    setVis(photo, (t >= 0.1 ? 1 : 0) * (1 - P(t, 3.05, 0.2)));
    cur.update(t, [{ x: 1250, y: 820 }, { t: 1.6, d: 1.0, x: 1054, y: 566 }], [click], [0.6, 3.4]);
    ringAt(ringPrice, t, 10.7, 12.4);
    ringAt(ringSrc, t, 12.5, 14.6);
    enter(tagA, t, 5.0, { x: 30, y: 0, out: 18.4 });
    enter(tagB, t, 5.35, { x: 30, y: 0, out: 18.4 });
    caps(t);
  };
});

/* ===================== 7. It asks, then it writes ===================== */
scene("asks-writes", 8, (root, c, cue) => {
  root.style.background = C.cream;
  const a = new Shot(c, { x: 160, y: 40, w: 1600, h: 1000 });
  const b = new Shot(c, { src: `${CAP}/desktop/c6-words.png`, x: 160, y: 40, w: 1600, h: 1000 });
  const map = [[0, 0.5], [4.3, 4.8]];
  const click = 0 + (2.2 - 0.5);
  const cur = new Cursor(a);
  const rGift = ring(b, 241, 348, 246, 48);
  const rTitle = ring(b, 577, 233, 572, 42, C.pink400, 10);
  const caps = captions(c, [
    { at: 0.3, out: 4.0, text: "It only asks what a photo can't show." },
    { at: 4.6, out: 7.7, text: "Then it writes the listing for her.", spark: true },
  ]);
  cue(click, "click");
  cue(4.3, "swoosh");
  cue(6.4, "type", { dur: 0.6 });
  return (t) => {
    const second = t >= 4.3;
    a.root.style.display = second ? "none" : "block";
    b.root.style.display = second ? "block" : "none";
    if (!second) {
      a.clip("findings-answer", clipTime(t, map));
      a.cam(t, [{ r: [16, 360, 1060, 540] }]);
      cur.update(t, [{ x: 520, y: 950 }, { t: 0.6, d: 0.9, x: 143, y: 733 }], [click], [0.3, 2.6]);
    } else {
      b.cam(t - 4.3, [{ r: [16, 140, 520, 420] }, { t: 1.4, d: 1.0, r: [560, 190, 1000, 330] }]);
      b.root.style.transform = `scale(${lerp(1.03, 1, E.out(P(t, 4.3, 0.35)))})`;
      ringAt(rGift, t, 4.6, 5.6);
      ringAt(rTitle, t, 6.5, 7.6);
    }
    caps(t);
  };
});

/* ===================== 8. Live in her own shop ===================== */
scene("publish-shop", 9, (root, c, cue) => {
  root.style.background = C.cream;
  const a = new Shot(c, { x: 160, y: 40, w: 1600, h: 1000 });
  const map = [[0, 0.4], [5.6, 6.0]];
  const click = 1.6 - 0.4;
  const cur = new Cursor(a);
  const rLive = ring(a, 552, 98, 180, 46);
  const store = new Shot(c, { src: `${CAP}/desktop/p2-store.png`, x: 110, y: 70, w: 1360, h: 850, url: "maya.resell.store" });
  const phone = new Shot(c, { src: `${CAP}/phone/m-p2-store.png`, pageW: 390, pageH: 844, x: 1450, y: 150, w: 360, h: 779, radius: 54, border: 7 });
  const toast = txt(c, "", 1150, 945);
  const tb = pillEl("", { bg: C.ink, color: C.cream, border: "none", size: 28, pad: "16px 28px" });
  tb.innerHTML = `${CHECK(30, C.lemon400)}<span>Link copied. Go show it off.</span>`;
  toast.append(tb);
  const caps = captions(c, [
    { at: 0.3, out: 5.2, text: "One tap, and it's live." },
    { at: 5.9, out: 8.7, text: "In her own shop, with a link to share anywhere." },
  ]);
  cue(click, "click");
  cue(3.2, "chime");
  cue(5.6, "swoosh");
  cue(6.2, "whoosh");
  cue(7.0, "pop", { note: 3 });
  return (t) => {
    const onStore = t >= 5.6;
    a.root.style.display = onStore ? "none" : "block";
    if (!onStore) {
      a.clip("publish-live", clipTime(t, map));
      a.cam(t, [{ r: [540, 90, 1040, 560] }, { t: 3.4, d: 1.0, r: [0, 0, 1600, 1000] }]);
      cur.update(t, [{ x: 1150, y: 780 }, { t: 0.2, d: 0.8, x: 815, y: 549 }], [click], [0.1, 2.2]);
      ringAt(rLive, t, 3.2, 4.6);
    }
    store.cam(t, [{ r: [0, 0, 1600, 1000] }]);
    enter(store.root, t, 5.6, { x: 120, y: 0, dur: 0.6 });
    phone.cam(t, [{ r: [0, 0, 390, 844] }]);
    enter(phone.root, t, 6.2, { y: 260, dur: 0.7, r: 6, base: "rotate(-4deg)" });
    pop(toast, t, 7.0, { from: 0.6, r: -3 });
    caps(t);
  };
});

/* ===================== 9. It answers buyers ===================== */
scene("answers", 7, (root, c, cue) => {
  root.style.background = C.cream;
  const a = new Shot(c, { src: `${CAP}/desktop/a5-inbox.png`, x: 160, y: 40, w: 1600, h: 1000 });
  const rows = [[317, 337, 374, 88], [317, 429, 374, 68], [317, 501, 374, 68]].map((r) => ring(a, ...r, C.pink400, 4));
  const b = new Shot(c, { src: `${CAP}/desktop/p6-messages.png`, x: 160, y: 40, w: 1600, h: 1000 });
  cover(b, 1130, 96, 470, 904); // the right rail names an assistant
  const rAns = ring(b, 512, 160, 462, 152);
  const caps = captions(c, [
    { at: 0.3, out: 3.4, text: "Buyers ask. Her agent answers from the listing.", spark: true },
    { at: 3.9, out: 6.7, text: "In seconds, and it hands over when it can't.", spark: true },
  ]);
  [0.9, 1.5, 2.1].forEach((at, i) => cue(at, "pop", { note: i + 2, gain: 0.5 }));
  cue(3.6, "swoosh");
  return (t) => {
    const second = t >= 3.6;
    a.root.style.display = second ? "none" : "block";
    b.root.style.display = second ? "block" : "none";
    a.cam(t, [{ r: [300, 100, 800, 560] }]);
    rows.forEach((r, i) => ringAt(r, t, 0.9 + i * 0.6, 3.3));
    b.cam(t, [{ r: [490, 110, 620, 520] }]);
    b.root.style.transform = `scale(${lerp(1.03, 1, E.out(P(t, 3.6, 0.35)))})`;
    ringAt(rAns, t, 4.1, 6.5);
    caps(t);
  };
});

/* ===================== 10. Two agents haggle ===================== */
scene("haggle", 14, (root, c, cue) => {
  root.style.background = C.cream;
  const s = new Shot(c, { src: `${CAP}/desktop/c10-offer.png`, x: 160, y: 40, w: 1600, h: 1000 });
  const rows = [[329, 233, 670, 76], [329, 312, 670, 76], [329, 391, 670, 76], [329, 470, 670, 100], [329, 573, 670, 102]].map((r) => cover(s, ...r));
  const rowTimes = [1.0, 2.2, 3.4, 4.6, 5.8];
  rowTimes.forEach((at, i) => cue(at, "pop", { note: [0, 2, 1, 3, 4][i], gain: 0.7 }));
  const rHold = ring(s, 375, 635, 129, 28, C.leaf600);
  const rTake = ring(s, 1092, 393, 448, 104);
  const caps = captions(c, [
    { at: 0.5, out: 6.9, text: "Jess's agent makes an offer. Maya's agent haggles back.", spark: true },
    { at: 7.8, out: 10.3, text: "$10 over her lowest, with money down. Then it waits.", spark: true },
  ]);
  const panel = abs(h("div"), 0, 1080, W, 620);
  Object.assign(panel.style, { background: C.lemon400, borderRadius: "56px 56px 0 0", zIndex: 30 });
  const big = txt(panel, "Good offers wait for your yes.", 0, 120, display(124, C.ink, { width: "1920px", textAlign: "center" }));
  const stat = txt(panel, "Only 12% of shoppers are comfortable letting AI pay without asking.", 0, 330, body(40, 700, C.ink, { width: "1920px", textAlign: "center" }));
  const statSrc = txt(panel, "Accenture Consumer Pulse 2026 · 25,590 consumers in 16 countries", 0, 400, { width: "1920px", textAlign: "center", color: C.leaf900 }, "src");
  c.append(panel);
  cue(6.5, "chime", { gain: 0.5 });
  cue(10.4, "whoosh");
  cue(10.9, "pop", { note: 0, gain: 1 });
  return (t) => {
    s.cam(t, [{ r: [300, 60, 720, 640] }, { t: 7.3, d: 1.1, r: [1040, 170, 520, 560] }]);
    rows.forEach((r, i) => reveal(r, t, rowTimes[i]));
    ringAt(rHold, t, 6.4, 7.4);
    ringAt(rTake, t, 8.5, 10.3);
    panel.style.top = `${lerp(1080, 470, E.outQuint(P(t, 10.4, 0.7)))}px`;
    pop(big, t, 10.9, { from: 0.7, r: -2 });
    enter(stat, t, 11.6);
    enter(statSrc, t, 11.9, { y: 10 });
    caps(t);
  };
});

/* ===================== 11. Say yes, PayPal does the rest ===================== */
scene("paypal-yes", 12.6, (root, c, cue) => {
  root.style.background = C.cream;
  const a = new Shot(c, { x: 160, y: 40, w: 1600, h: 1000 });
  const map = [[0, 1.0], [5.6, 6.6]];
  const cur = new Cursor(a);
  const clickA = 1.81 - 1.0;
  const clickB = 4.4 - 1.0;
  const rSold = ring(a, 1058, 383, 484, 200, C.leaf600);
  cue(clickA, "click");
  cue(clickB, "click");
  cue(clickB + 0.4, "chime");
  // Money path.
  const path = abs(h("div"), 0, 0, W, H);
  path.style.background = C.cream;
  const ppEb = txt(path, "", 120, 150);
  ppEb.append(paypalLogo(230, C.paypal));
  const ppHead = txt(path, "Held by PayPal until it arrives.", 120, 260, display(96));
  const nodes = [
    ["1", "Jess pays", "the other $150, Pay Later if she likes"],
    ["2", "PayPal holds it", "safe until the pot arrives"],
    ["3", "It ships and lands", "Jess gets 3 days to check it"],
    ["4", "Maya gets paid", "our 10% fee comes off on its own"],
  ].map(([n, title, sub], i) => {
    const x = 120 + i * 440;
    const dot = txt(path, n, x, 520, display(52, C.ink, { width: "110px", height: "110px", borderRadius: "50%", background: i === 3 ? C.lemon400 : "#fff", border: `5px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }));
    const label = txt(path, `<div style="font:800 46px 'Bricolage Grotesque';letter-spacing:-.02em">${title}</div><div style="margin-top:8px">${sub}</div>`, x, 670, body(30, 600, C.textMuted, { width: "380px" }));
    return { dot, label, at: 6.2 + i * 0.7 };
  });
  const line = abs(h("div"), 230, 571, 1320, 8);
  Object.assign(line.style, { background: C.leaf600, transformOrigin: "0 50%", borderRadius: "4px" });
  path.insertBefore(line, path.firstChild);
  c.append(path);
  nodes.forEach((n, i) => cue(n.at, "pop", { note: i }));
  cue(5.6, "swoosh");
  cue(8.4, "cash");
  // Payouts.
  const b = new Shot(c, { src: `${CAP}/desktop/b5-sales-payouts.png`, x: 160, y: 40, w: 1600, h: 1000 });
  const r96 = ring(b, 326, 128, 360, 116, C.leaf600);
  cue(9.8, "swoosh");
  cue(10.3, "cash");
  const caps = captions(c, [
    { at: 0.3, out: 3.1, text: "Maya says yes." },
    { at: 3.8, out: 5.4, text: "Sold to Jess." },
    { at: 10.0, out: 12.4, text: "And the money lands in her PayPal." },
  ]);
  return (t) => {
    const phase = t < 5.6 ? 0 : t < 9.8 ? 1 : 2;
    a.root.style.display = phase === 0 ? "block" : "none";
    path.style.display = phase === 1 ? "block" : "none";
    b.root.style.display = phase === 2 ? "block" : "none";
    if (phase === 0) {
      a.clip("offer-accept", clipTime(t, map));
      a.cam(t, [{ r: [880, 170, 700, 560] }, { t: 1.1, d: 0.8, r: [480, 250, 900, 500] }, { t: 3.7, d: 1.0, r: [880, 170, 700, 560] }]);
      cur.update(t, [{ x: 1180, y: 800 }, { t: 0.05, d: 0.6, x: 1297, y: 531 }, { t: 2.3, d: 0.8, x: 961, y: 555 }], [clickA, clickB], [0.05, 4.0]);
      ringAt(rSold, t, 4.5, 5.5);
    }
    if (phase === 1) {
      enter(ppEb, t, 5.7);
      enter(ppHead, t, 5.85);
      line.style.transform = `scaleX(${E.inOut(P(t, 6.3, 2.1))})`;
      nodes.forEach((n) => {
        pop(n.dot, t, n.at, { from: 0.3, r: -20 });
        enter(n.label, t, n.at + 0.15);
      });
    }
    if (phase === 2) {
      b.cam(t, [{ r: [290, 90, 800, 520] }]);
      b.root.style.transform = `scale(${lerp(1.03, 1, E.out(P(t, 9.8, 0.35)))})`;
      ringAt(r96, t, 10.3, 12.3);
    }
    caps(t);
  };
});

/* ===================== 12. Buyers send their own agent ===================== */
scene("buyer-agent", 10, (root, c, cue) => {
  root.style.background = C.leaf900;
  const eb = txt(c, "For buyers", 120, 150, eyebrow(C.pink400));
  const head = txt(c, "Send your own agent shopping.", 120, 200, display(104, C.cream, { width: "800px" }));
  const sub = txt(c, "Add resell.store to the AI assistant you already use. It shops, makes offers, and asks before it pays.", 120, 440, body(34, 500, "rgba(255,253,242,.82)", { width: "760px" }));
  const ceil = abs(h("div", { class: "card" }), 120, 620, 640, 150);
  Object.assign(ceil.style, { border: "none", padding: "26px 34px" });
  const ceilLabel = h("div", { style: body(28, 600, C.textMuted) }, "Go no higher than");
  const ceilAmt = h("span", { style: display(70) });
  const ceilCaret = h("span", { style: { display: "inline-block", width: "5px", height: "62px", background: C.ink, marginLeft: "6px", verticalAlign: "-6px" } });
  ceil.append(ceilLabel, h("div", { style: { marginTop: "6px" } }, ceilAmt, ceilCaret));
  c.append(ceil);
  const hand = txt(c, pillEl("Hand it to your agent", { bg: C.lemon400, border: "none", size: 32, pad: "20px 36px" }), 120, 800);
  const asks = txt(c, `${CHECK(34, C.leaf300)}<span>It asks you before it pays.</span>`, 120, 910, body(32, 700, C.leaf300, { display: "flex", gap: "14px", alignItems: "center" }));
  const shot = new Shot(c, { src: `${CAP}/desktop/p7-buyer-agent.png`, x: 960, y: 130, w: 840, h: 640, border: 0 });
  const covers = [[1050, 190, 400, 88], [930, 284, 510, 92], [930, 378, 510, 114], [930, 494, 510, 60]].map((r) => cover(shot, ...r));
  const coverTimes = [0.6, 1.3, 2.0, 2.6];
  coverTimes.forEach((at, i) => cue(at, "blip", { note: i }));
  const stat = txt(c, `<div style="font:800 40px 'Bricolage Grotesque';letter-spacing:-.02em;color:#fffdf2">AI shopping traffic to US stores: up 693% last holiday season</div><div class="src" style="color:${C.leaf300};margin-top:8px">Adobe Analytics via Digital Commerce 360, January 2026</div>`, 960, 820, { width: "860px" });
  const mcp = txt(c, pillEl("mcp.resell.store/buy", { bg: C.cream, border: "none", size: 28, pad: "12px 24px" }), 960, 960);
  mcp.firstChild.classList.add("mono");
  cue(5.1, "type", { dur: 0.4 });
  cue(5.8, "pop", { note: 2 });
  cue(6.4, "chime", { gain: 0.5 });
  return (t) => {
    enter(eb, t, 0.15);
    enter(head, t, 0.3);
    enter(sub, t, 1.0);
    enter(shot.root, t, 0.5, { x: 60, y: 0, dur: 0.6 });
    shot.cam(t, [{ r: [925, 186, 525, 400] }]);
    covers.forEach((cv, i) => reveal(cv, t, coverTimes[i]));
    enter(ceil, t, 4.7);
    typeOn(ceilAmt, "$126", t, 5.1, 9, ceilCaret);
    pop(hand, t, 5.8, { from: 0.5, r: -4 });
    enter(asks, t, 6.4);
    enter(stat, t, 7.1);
    pop(mcp, t, 7.8, { from: 0.6, r: 3 });
  };
});

/* ===================== 13. The shopping sidekick ===================== */
scene("sidekick", 11, (root, c, cue) => {
  root.style.background = C.cream;
  const s = new Shot(c, { x: 160, y: 40, w: 1600, h: 1000 });
  const map = [[0, 0.6], [9.4, 10.0]];
  const click = 2.63 - 0.6;
  const cur = new Cursor(s);
  const rBetter = ring(s, 1018, 43, 112, 51);
  const rRow = ring(s, 325, 752, 690, 62, C.leaf600);
  cue(0.82 - 0.6, "type", { dur: 1.2 });
  cue(click, "click");
  cue(4.9, "chime");
  const caps = captions(c, [
    { at: 0.3, out: 3.5, text: "Buyers get a shopping sidekick too." },
    { at: 3.9, out: 7.3, text: "It checks what a thing will be worth later.", spark: true },
    { at: 7.7, out: 10.7, text: "Not to flip it. Just to know." },
  ], { bottom: 900 });
  return (t) => {
    s.clip("sidekick-check", clipTime(t, map));
    s.cam(t, [{ r: [330, 30, 1230, 450] }, { t: 3.4, d: 1.0, r: [320, 690, 720, 320] }]);
    cur.update(t, [{ x: 1200, y: 700 }, { t: 1.0, d: 0.8, x: 941, y: 346 }], [click], [0.6, 2.9]);
    ringAt(rBetter, t, 0.5, 1.9);
    ringAt(rRow, t, 5.0, 7.4);
    caps(t);
  };
});

/* ===================== 14. Close ===================== */
scene("close", 6.5, (root, c, cue) => {
  root.style.background = C.cream;
  const num = txt(c, "$0B", 0, 250, display(240, C.ink, { width: "1920px", textAlign: "center" }));
  const sub = txt(c, "US resale market by 2030 (projected)", 0, 520, display(60, C.ink, { width: "1920px", textAlign: "center" }));
  const src = txt(c, "OfferUp 2025 Recommerce Report", 0, 610, { width: "1920px", textAlign: "center" }, "src");
  const line = txt(c, `We made selling as easy<br>as ${hl("saying yes.")}`, 0, 340, display(124, C.ink, { width: "1920px", textAlign: "center", lineHeight: "1.04" }));
  cue(0.2, "count", { dur: 1.6 });
  cue(3.2, "pop", { note: 0, gain: 1 });
  return (t) => {
    enter(num, t, 0.1, { y: 40, out: 2.9 });
    countUp(num, t, 0.2, 1.6, 0, 306.5, (v) => `$${v.toFixed(1)}B`);
    enter(sub, t, 0.7, { out: 2.9 });
    enter(src, t, 1.1, { y: 10, out: 2.9 });
    pop(line, t, 3.2, { from: 0.7, r: -2 });
    sweep(bars(line)[0], t, 4.0, 0.5);
  };
});

/* ===================== 15–18. How each sponsor powers it ===================== */
function sponsorLeft(c, cue, { name, role, bullets, color = C.ink, sub = C.textMuted, check = C.leaf600, nameNode = null }) {
  const eb = txt(c, "Built with", 120, 130, eyebrow(color === C.ink ? C.pink600 : C.lemon300));
  const nm = txt(c, nameNode ?? name, 120, 180, display(150, color));
  const rl = txt(c, role, 120, 350, display(52, sub, { width: "760px", lineHeight: "1.05" }));
  const items = bullets.map((b, i) => {
    const el = txt(c, `${CHECK(36, check)}<span>${b}</span>`, 120, 480 + i * 100, body(34, 600, color, { display: "flex", gap: "18px", alignItems: "flex-start", width: "760px" }));
    el.firstChild.style.flexShrink = "0";
    el.firstChild.style.marginTop = "2px";
    const at = 1.1 + i * 0.4;
    cue(at, "pop", { note: i, gain: 0.45 });
    return { el, at };
  });
  cue(0.2, "whoosh");
  return (t) => {
    enter(eb, t, 0.1);
    pop(nm, t, 0.2, { from: 0.6, r: -3 });
    enter(rl, t, 0.5);
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
  const s = h("svg", { width: W, height: H, style: { position: "absolute", left: "0", top: "0", overflow: "visible" } });
  const len = Math.hypot(x2 - x1, y2 - y1);
  const l = h("line", { svg: true, x1, y1, x2, y2, stroke: color, "stroke-width": 5, "stroke-linecap": "round", "stroke-dasharray": `${len}`, "stroke-dashoffset": `${len}` });
  s.append(l);
  parent.append(s);
  return (p) => l.setAttribute("stroke-dashoffset", String(len * (1 - p)));
}

scene("sponsor-render", 7.5, (root, c, cue) => {
  root.style.background = C.cream;
  const left = sponsorLeft(c, cue, {
    name: "Render",
    role: "Where it all runs",
    bullets: ["Hosts the app, with every shop on its own subdomain", "Postgres with pgvector for search", "Workflows run the timed jobs", "One render.yaml deploys it all"],
  });
  const lines = [svgLine(c, 1360, 230, 1420, 230), svgLine(c, 1600, 290, 1600, 470), svgLine(c, 1360, 530, 1420, 530)];
  const boxes = [
    [box("resell-store", "web service"), 1000, 170],
    [box("resell-db", "Postgres + pgvector"), 1420, 170],
    [box("resell-sweeps", "Render Workflow"), 1420, 470],
    [box("sweeps-cron", "starts it on a timer"), 1000, 470],
  ].map(([el, x, y], i) => {
    abs(el, x, y, 360);
    c.append(el);
    cue(0.6 + i * 0.25, "pop", { note: i + 1, gain: 0.5 });
    return el;
  });
  const subs = ["maya.resell.store", "api. · docs. · mcp."].map((s, i) => txt(c, pillEl(s, { size: 22, pad: "8px 16px", border: `2px solid ${C.ink}`, bg: C.lemon100 }), 1000 + i * 230, 318));
  const jobs = ["Offers expire", "Ship-by reminders", "Unshipped orders cancel", "“Did it arrive?” check", "Payouts release", "Quiet disputes escalate"].map((j, i) => {
    const el = txt(c, `${CHECK(30, C.leaf600)}<span>${j}</span>`, 1000 + (i % 2) * 420, 640 + Math.floor(i / 2) * 70, body(30, 600, C.ink, { display: "flex", gap: "12px", alignItems: "center" }));
    const at = 2.8 + i * 0.35;
    cue(at, "tick", { gain: 0.6 });
    return { el, at };
  });
  const jobsHead = txt(c, "Timed jobs in the workflow", 1000, 600, eyebrow(C.textMuted));
  return (t) => {
    left(t);
    boxes.forEach((b, i) => pop(b, t, 0.6 + i * 0.25, { from: 0.6, r: 0 }));
    lines.forEach((l, i) => l(E.inOut(P(t, 1.7 + i * 0.15, 0.4))));
    subs.forEach((s, i) => pop(s, t, 2.1 + i * 0.2, { from: 0.5, r: 4 }));
    enter(jobsHead, t, 2.6);
    jobs.forEach((j) => enter(j.el, t, j.at, { x: -20, y: 0 }));
  };
});

scene("sponsor-channel3", 7.5, (root, c, cue) => {
  root.style.background = C.cream;
  const left = sponsorLeft(c, cue, {
    name: "Channel3",
    role: "What the item really is",
    bullets: ["Identifies it from a photo and a line", "The live price new", "What it sells for used, across retailers", "The maker's own photos for the listing"],
  });
  const req = abs(h("div"), 1000, 170, 800, 110);
  Object.assign(req.style, { background: C.ink, borderRadius: "24px", padding: "34px 36px" });
  const code = h("span", { class: "mono", style: { color: C.lemon300, fontSize: "30px" } });
  req.append(code);
  c.append(req);
  const results = [
    ["It's a Le Creuset", "Round dutch oven, 5.5 qt"],
    ["Still sold new", "$420"],
    ["Resale offers", "From retailers selling used"],
    ["Maker photos", ""],
  ].map(([a, b], i) => {
    const el = abs(h("div", { class: "card" }), 1000 + (i % 2) * 410, 330 + Math.floor(i / 2) * 200, 390, 170);
    Object.assign(el.style, { border: `3px solid ${C.ink}`, padding: "24px 28px" });
    el.append(h("div", { style: body(28, 700, C.textMuted) }, a));
    if (i === 3) {
      const row = h("div", { style: { display: "flex", gap: "12px", marginTop: "12px" } });
      for (let k = 0; k < 3; k++) row.append(h("div", { style: { background: C.leaf100, borderRadius: "14px", padding: "6px" } }, art("pot", 64)));
      el.append(row);
    } else el.append(h("div", { style: display(i === 1 ? 64 : 34, C.ink, { marginTop: "12px", lineHeight: "1.08" }) }, b));
    c.append(el);
    cue(2.0 + i * 0.3, "pop", { note: i + 1, gain: 0.5 });
    return el;
  });
  const shot = new Shot(c, { src: "clips/start-to-research/0329.jpg", x: 1000, y: 760, w: 800, h: 190, radius: 22, border: 3 });
  const rNew = ring(shot, 1440, 216, 100, 28, C.pink400, 6);
  cover(shot, 900, 150, 170, 260); // left edge of the price card
  cue(0.7, "type", { dur: 1.2 });
  return (t) => {
    left(t);
    enter(req, t, 0.5);
    typeOn(code, 'search("Le Creuset dutch oven, yellow")', t, 0.7, 30);
    results.forEach((r, i) => pop(r, t, 2.0 + i * 0.3, { from: 0.6, r: i % 2 ? 4 : -4 }));
    shot.cam(t, [{ r: [1070, 200, 480, 160] }]);
    enter(shot.root, t, 3.6);
    ringAt(rNew, t, 4.2);
  };
});

scene("sponsor-kernel", 8, (root, c, cue) => {
  root.style.background = C.cream;
  const left = sponsorLeft(c, cue, {
    name: "Kernel",
    role: "Research in real browsers",
    bullets: ["Cloud browsers the agent drives", "Searches popular resale marketplaces and the web", "Managed sign-in, so sellers can use their own accounts", "Prices from real listings, not guesses"],
  });
  const prices = [["$165", "pot"], ["$190", "pot"], ["$175", "pot"], ["$205", "pot"]];
  const wins = [
    ["Resale marketplace", 1000, 150],
    ["The web", 1430, 150],
    ["Your account", 1215, 400],
  ].map(([label, x, y], wi) => {
    const win = abs(h("div", { class: "card" }), x, y, 380, 300);
    Object.assign(win.style, { border: `3px solid ${C.ink}`, overflow: "hidden", boxShadow: "0 30px 60px -30px rgba(20,38,29,.4)" });
    const bar = h("div", { style: { height: "48px", background: C.muted, borderBottom: `2px solid ${C.border}`, display: "flex", alignItems: "center", gap: "8px", padding: "0 16px" } });
    for (const col of ["#ff6b5e", "#ffbd2e", "#28c840"]) bar.append(h("span", { style: { width: "11px", height: "11px", borderRadius: "50%", background: col } }));
    bar.append(h("span", { style: body(20, 700, C.ink, { marginLeft: "10px" }) }, wi === 2 ? "🔒 " : "", label));
    win.append(bar);
    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "16px" } });
    const cards = prices.map(([p, a]) => {
      const cardEl = h("div", { style: { background: C.muted, borderRadius: "12px", padding: "8px", display: "flex", alignItems: "center", gap: "8px" } }, art(a, 44), h("span", { style: body(24, 800) }, p));
      grid.append(cardEl);
      return cardEl;
    });
    win.append(grid);
    if (wi === 2) win.append(h("div", { style: body(20, 700, C.leaf600, { padding: "0 16px" }) }, "Signed in as you"));
    const scan = abs(h("div"), 0, 48, 380, 6);
    scan.style.background = C.pink400;
    win.append(scan);
    c.append(win);
    const at = 0.7 + wi * 0.35;
    cue(at, "pop", { note: wi + 1, gain: 0.5 });
    return { win, cards, scan, at };
  });
  const range = abs(h("div", { class: "card" }), 1000, 760, 810, 200);
  Object.assign(range.style, { border: `3px solid ${C.ink}`, padding: "26px 34px" });
  const rTitle = h("div", { style: body(24, 800, C.textMuted, { letterSpacing: ".1em", textTransform: "uppercase" }) }, "Used ones sell for");
  const rNum = h("div", { style: display(64, C.ink, { marginTop: "6px" }) }, "$160 to $210");
  const track = h("div", { style: { position: "relative", height: "14px", borderRadius: "7px", background: C.leaf100, marginTop: "20px" } });
  const band = abs(h("div"), 0, 0, 0, 14);
  Object.assign(band.style, { background: C.leaf300, borderRadius: "7px" });
  const knob = abs(h("div"), 0, -7, 28, 28);
  Object.assign(knob.style, { background: C.leaf600, borderRadius: "50%", border: "4px solid #fff" });
  track.append(band, knob);
  range.append(rTitle, rNum, track);
  c.append(range);
  cue(4.6, "chime");
  return (t) => {
    left(t);
    wins.forEach((w, wi) => {
      pop(w.win, t, w.at, { from: 0.7, r: wi === 1 ? 4 : -3 });
      const sp = P(t, w.at + 0.6, 1.6);
      w.scan.style.top = `${lerp(48, 300, sp)}px`;
      setVis(w.scan, sp > 0 && sp < 1 ? 0.7 : 0);
      w.cards.forEach((cd, k) => enter(cd, t, w.at + 0.7 + k * 0.3, { y: 10, s: 0.9, dur: 0.35 }));
    });
    enter(range, t, 4.2);
    const fill = E.inOut(P(t, 4.6, 0.9));
    band.style.left = `${lerp(370, 250, fill)}px`;
    band.style.width = `${lerp(0, 260, fill)}px`;
    knob.style.left = `${lerp(370, 356, fill)}px`;
    setVis(knob, P(t, 4.6, 0.3));
  };
});

scene("sponsor-paypal", 9, (root, c, cue) => {
  root.style.background = C.leaf900;
  const eb = txt(c, "Lead sponsor", 120, 120, eyebrow(C.lemon300));
  const logo = txt(c, paypalLogo(520, "#fff"), 120, 180);
  const line = txt(c, "Every dollar, start to finish.", 120, 390, display(72, C.cream));
  const steps = [
    ["Connect", "Sellers connect PayPal in a tap"],
    ["Pay", "Checkout, Pay Later, and deposits on offers"],
    ["Hold", "Held until the item arrives"],
    ["Fee", "Our 10% comes off automatically"],
    ["Payout", "Paid out when it lands"],
  ];
  const rail = abs(h("div"), 180, 600, 1460, 8);
  Object.assign(rail.style, { background: C.lemon300, transformOrigin: "0 50%", borderRadius: "4px" });
  c.append(rail);
  const nodes = steps.map(([name, sub], i) => {
    const x = 120 + i * 365;
    const dot = txt(c, name, x, 548, display(34, C.ink, { minWidth: "120px", height: "112px", padding: "0 24px", borderRadius: "56px", background: i === 4 ? C.lemon400 : C.cream, display: "flex", alignItems: "center", justifyContent: "center" }));
    const lab = txt(c, sub, x, 690, body(30, 600, "rgba(255,253,242,.85)", { width: "320px" }));
    const at = 1.4 + i * 0.6;
    cue(at, "pop", { note: i });
    return { dot, lab, at };
  });
  const branch = txt(c, pillEl("↳ Refunds and disputes, synced by webhook", { bg: C.pink400, color: C.ink, border: "none", size: 30, pad: "16px 28px" }), 850, 880);
  cue(4.6, "pop", { note: 2 });
  cue(4.2, "cash");
  return (t) => {
    enter(eb, t, 0.1);
    pop(logo, t, 0.25, { from: 0.6, r: -3 });
    enter(line, t, 0.7);
    rail.style.transform = `scaleX(${E.inOut(P(t, 1.3, 2.6))})`;
    nodes.forEach((n) => {
      pop(n.dot, t, n.at, { from: 0.3, r: -10 });
      enter(n.lab, t, n.at + 0.2);
    });
    pop(branch, t, 4.6, { from: 0.6, r: -3 });
  };
});

/* ===================== 19. Open source, every step covered ===================== */
scene("open-source", 12, (root, c, cue) => {
  root.style.background = C.cream;
  const title = txt(c, `resell.store is ${hl("open source.")}`, 120, 64, display(92));
  const sub = txt(c, "Everything it takes to run a two-sided resale marketplace:", 120, 178, body(34, 500, C.textMuted));
  const tiles = [
    ["Sales page", "desktop/l1-landing-hero.png", 1600],
    ["Sign-in", "desktop/a1-welcome.png", 1600],
    ["Seller app", "desktop/a3-home-selling.png", 1600],
    ["Two-sided marketplace", "desktop/p1-discover.png", 1600],
    ["Shop pages", "desktop/p2-store.png", 1600],
    ["Selling and buying agents", "desktop/c10-offer.png", 1600],
    ["Shopping sidekick", "desktop/d4-sidekick.png", 1600],
    ["API, MCP and docs", "desktop/d6-api-docs.png", 1600],
    ["PayPal payments", "desktop/p4-checkout.png", 1600],
    ["Notification emails", "email/e-offer-received.png", 680],
    ["Design system", "desktop/d5-design-system.png", 1600],
    ["Tests, and a one-file deploy", null, 0],
  ];
  const grid = abs(h("div"), 0, 0, W, H);
  c.append(grid);
  const els = tiles.map(([label, src, pageW], i) => {
    const x = 121 + (i % 4) * 426;
    const y = 262 + Math.floor(i / 4) * 262;
    const tile = abs(h("div", { class: "card" }), x, y, 400, 236);
    Object.assign(tile.style, { overflow: "hidden", border: `3px solid ${C.ink}` });
    const thumb = abs(h("div"), 0, 0, 400, 170);
    Object.assign(thumb.style, { overflow: "hidden", background: C.muted, borderBottom: `2px solid ${C.border}` });
    if (src) {
      const img = h("img", { src: `${CAP}/${src}`, alt: "" });
      const scale = 400 / pageW;
      Object.assign(img.style, { position: "absolute", left: "0", top: "0", width: `${pageW * scale}px` });
      thumb.append(img);
    } else {
      thumb.style.background = C.ink;
      thumb.append(abs(h("pre", { class: "mono", style: { margin: "0", fontSize: "17px", lineHeight: "1.45", color: C.lemon300 } }, "services:\n  - type: web\n  - type: workflow\n  - type: cron\n$ pnpm test  ✓ Vitest"), 26, 18));
    }
    const lab = abs(h("div", { html: `${CHECK(30)}<span>${label}</span>`, style: body(25, 700, C.ink, { display: "flex", gap: "12px", alignItems: "center", padding: "0 18px", height: "66px" }) }), 0, 170, 400);
    tile.append(thumb, lab);
    grid.append(tile);
    const at = 1.0 + i * 0.3;
    cue(at, "pop", { note: i % 5, gain: 0.45 });
    return { tile, at };
  });
  const covered = txt(c, "Every step, covered.", 0, 380, display(160, C.ink, { width: "1920px", textAlign: "center" }));
  const gh = txt(c, pillEl("github.com/impactvelocity/resell-store", { bg: C.ink, color: C.cream, border: "none", size: 36, pad: "18px 34px" }), 0, 600);
  gh.style.width = "1920px";
  gh.style.textAlign = "center";
  gh.firstChild.classList.add("mono");
  cue(6.4, "pop", { note: 0, gain: 1 });
  cue(6.4, "whoosh");
  cue(7.2, "chime");
  return (t) => {
    enter(title, t, 0.15);
    sweep(bars(title)[0], t, 0.8);
    enter(sub, t, 0.5);
    els.forEach((e) => pop(e.tile, t, e.at, { from: 0.6, r: 0, dur: 0.5 }));
    const dim = E.inOut(P(t, 6.1, 0.5));
    grid.style.opacity = String(lerp(1, 0.16, dim));
    grid.style.filter = `blur(${dim * 3}px)`;
    title.style.opacity = String(lerp(1, 0.16, dim) * clamp(P(t, 0.15, 0.3)));
    sub.style.opacity = String(lerp(1, 0.16, dim) * clamp(P(t, 0.5, 0.3)));
    pop(covered, t, 6.4, { from: 0.6, r: -2 });
    enter(gh, t, 7.2);
  };
});

/* ===================== 20. The mission ===================== */
scene(
  "mission",
  11,
  (root, c, cue) => {
    root.style.background = C.cream;
    const dests = [
      [100, 120, "A"], [520, 70, "B"], [980, 60, "D"], [1460, 80, "K"], [1720, 230, "L"], [1730, 600, "N"], [1600, 930, "P"], [1080, 960, "S"], [420, 950, "J"],
    ];
    const items = PILE.map(([key, x, y, size, rot], i) => {
      const el = txt(c, art(key, size), x, y);
      const [dx, dy, who] = dests[i];
      const chip = txt(c, "", dx, dy);
      const chipPill = pillEl("", { size: 26, pad: "8px 18px 8px 8px", border: `3px solid ${C.ink}` });
      chipPill.innerHTML = `<span style="display:flex;width:44px;height:44px;border-radius:50%;background:${i % 2 ? C.pink100 : C.leaf100};align-items:center;justify-content:center;font:800 24px 'Bricolage Grotesque'">${who}</span><span>${key === "pot" ? "Sold to Jess" : "New home"}</span>`;
      chip.append(chipPill);
      const at = 2.7 + i * 0.22;
      cue(at + 0.45, "pop", { note: i % 5, gain: 0.5 });
      return { el, chip, at, x, y, size, rot, dx, dy };
    });
    const num = txt(c, "$0", 110, 280, display(200));
    const numSub = txt(c, "of unused stuff in US homes", 120, 500, display(60));
    const numSrc = txt(c, "Mercari 2023 Reuse Report · $559.8B across 21.1B items", 120, 590, {}, "src");
    cue(0.2, "count", { dur: 1.6 });
    const head = txt(c, "Nothing good goes unused.", 0, 360, display(136, C.ink, { width: "1920px", textAlign: "center" }));
    const subl = txt(c, "Sellers get the value back. Buyers pay a fair price.<br>Everything finds its next home.", 0, 540, body(40, 600, C.textMuted, { width: "1920px", textAlign: "center", lineHeight: "1.35" }));
    cue(5.0, "pop", { note: 0, gain: 1 });
    // End card.
    const sun = abs(h("div"), W / 2, H / 2, 0, 0);
    Object.assign(sun.style, { background: C.lemon400, borderRadius: "50%" });
    c.append(sun);
    const end = abs(h("div"), 0, 0, W, H);
    end.style.textAlign = "center";
    const mark = h("div", { style: { display: "inline-block", marginTop: "250px" } }, wordmark(180, C.ink, "#fff"));
    const tagline = h("div", { style: display(66, C.ink, { marginTop: "34px" }) }, "Snap a photo. Say yes. Get paid.");
    const pills = h("div", { style: { display: "flex", justifyContent: "center", gap: "20px", marginTop: "56px" } });
    const p1 = pillEl("", { size: 28, pad: "14px 26px", border: `3px solid ${C.ink}` });
    p1.append(paypalLogo(104, C.paypal), h("span", {}, "Built for the PayPal AI Hackathon"));
    const p2 = pillEl("Open source on GitHub", { bg: C.ink, color: C.cream, border: "none", size: 28, pad: "17px 28px" });
    pills.append(p1, p2);
    const cta = h("div", { style: body(36, 700, C.ink, { marginTop: "44px" }) }, "Open your shop in 5 minutes at resell.store");
    end.append(mark, tagline, pills, cta);
    const flower = abs(h("div", { html: FLOWER(110) }), 1430, 200);
    end.append(flower);
    c.append(end);
    cue(7.9, "whoosh");
    cue(8.4, "pop", { note: 0, gain: 1 });
    cue(8.5, "sparkle");
    cue(8.4, "end");
    return (t) => {
      items.forEach((it, i) => {
        setVis(it.el, t < it.at + 0.5 ? clamp(P(t, i * 0.05, 0.3)) : 0);
        const p = E.inOut(P(t, it.at, 0.5));
        const lift = Math.sin(p * Math.PI) * -160;
        const scale = lerp(1, 70 / it.size, p);
        it.el.style.transform = `translate(${lerp(0, it.dx - it.x, p)}px, ${lerp(0, it.dy - it.y, p) + lift}px) scale(${scale}) rotate(${lerp(it.rot, it.rot + 200, p)}deg)`;
        it.el.style.transformOrigin = "0 0";
        pop(it.chip, t, it.at + 0.45, { from: 0.4, r: -6, out: 4.9, outY: 0, outS: 0.8 });
      });
      enter(num, t, 0.1, { y: 40, out: 2.5 });
      countUp(num, t, 0.2, 1.6, 0, 560, (v) => `$${Math.round(v)} billion`);
      enter(numSub, t, 0.6, { out: 2.5 });
      enter(numSrc, t, 1.0, { y: 10, out: 2.5 });
      pop(head, t, 5.0, { from: 0.7, r: -2, out: 7.8 });
      enter(subl, t, 5.8, { out: 7.8 });
      const sp = E.inOut(P(t, 7.9, 0.7));
      const r = lerp(0, 1250, sp);
      Object.assign(sun.style, { left: `${W / 2 - r}px`, top: `${H / 2 - r}px`, width: `${2 * r}px`, height: `${2 * r}px` });
      setVis(sun, t >= 7.9 ? 1 : 0);
      setVis(end, t >= 8.3 ? 1 : 0);
      pop(mark, t, 8.4, { from: 0.5, r: -4 });
      enter(tagline, t, 8.9);
      pop(p1, t, 9.4, { from: 0.6, r: -4 });
      pop(p2, t, 9.6, { from: 0.6, r: 4 });
      enter(cta, t, 10.0);
      const fp = E.back(P(t, 8.5, 0.8));
      flower.style.transform = `rotate(${lerp(-220, 0, clamp(fp, 0, 1.2))}deg) scale(${clamp(fp, 0, 1.15)})`;
      setVis(flower, t >= 8.5 ? 1 : 0);
    };
  },
  { noExit: true },
);
