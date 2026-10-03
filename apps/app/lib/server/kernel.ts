import "server-only";
import Kernel from "@onkernel/sdk";
import type { CompSite } from "@repo/db";

/*
 * Kernel (https://kernel.sh): cloud browsers that read public marketplace
 * search pages for comps.ts. One browser per site, side by side, so a site
 * that hangs or blocks us can't take the others down. Each search page gives
 * back listing cards (link, the card's text with its price, a photo); making
 * sense of them is comps.ts's job.
 *
 * Plain browsers, not stealth: in testing (Oct 2026) the stealth proxy made
 * eBay serve error pages and timed out elsewhere. Mercari crashed the page
 * every time, so it isn't searched signed out.
 *
 * With a seller's signed-in profile (market-logins.ts, Kernel managed auth)
 * more opens up: eBay's sold search and Facebook Marketplace. Those browsers
 * use stealth, like the managed-auth browser that signed in, so the session
 * looks the same to the site.
 */

export const kernelConfigured = Boolean(process.env.KERNEL_API_KEY);

export type SiteKey = CompSite;

export const sites: Record<
  SiteKey,
  { label: string; search: (q: string) => string; link: string; sold?: (q: string) => string; needsLogin?: boolean }
> = {
  ebay: {
    label: "eBay",
    search: (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`,
    // Sold and completed, newest first: only shown to signed-in accounts since 2026
    sold: (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1&_sop=13`,
    link: "/itm/",
  },
  facebook: {
    label: "Facebook Marketplace",
    search: (q) => `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(q)}`,
    link: "/marketplace/item/",
    needsLogin: true,
  },
  poshmark: { label: "Poshmark", search: (q) => `https://poshmark.com/search?query=${encodeURIComponent(q)}`, link: "/listing/" },
  depop: { label: "Depop", search: (q) => `https://www.depop.com/search/?q=${encodeURIComponent(q)}`, link: "/products/" },
  mercari: { label: "Mercari", search: (q) => `https://www.mercari.com/search/?keyword=${encodeURIComponent(q)}`, link: "/item/" },
};

export type RawCard = { site: SiteKey; url: string; text: string; image: string | null; sold: boolean };

let client: Kernel | null = null;
const kernel = () => (client ??= new Kernel({ apiKey: process.env.KERNEL_API_KEY }));

/*
 * Kernel caps browsers open at once per account (5 on the free plan). Two
 * checks at the same moment would ask for 6, so browsers queue here, and a
 * create that still hits the cap (another process) waits and tries again.
 */
const MAX_BROWSERS = Number(process.env.KERNEL_MAX_BROWSERS ?? 5);
let open = 0;
const waiting: (() => void)[] = [];

async function withBrowser<T>(fn: (sessionId: string) => Promise<T>, profileName?: string): Promise<T> {
  if (open >= MAX_BROWSERS) await new Promise<void>((resolve) => waiting.push(resolve));
  open++;
  let sessionId: string | null = null;
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        sessionId = (
          await kernel().browsers.create(
            profileName
              ? // Signed in: load the session read-only (Kernel's managed auth keeps it fresh)
                { headless: true, timeout_seconds: 120, stealth: true, profile: { name: profileName, save_changes: false } }
              : { headless: true, timeout_seconds: 120 },
          )
        ).session_id;
        break;
      } catch (error) {
        const busy = error instanceof Error && /429|concurrent/i.test(error.message);
        if (!busy || attempt >= 5) throw error;
        await new Promise((r) => setTimeout(r, 3000 + attempt * 2000));
      }
    }
    return await fn(sessionId);
  } finally {
    if (sessionId) await kernel().browsers.deleteByID(sessionId).catch(() => {});
    open--;
    waiting.shift()?.();
  }
}

/**
 * Runs in the page: each listing link's own card (the biggest box around it
 * holding no other listing), if it shows a price.
 */
const extractCards = `(pattern) => {
  const links = [...document.querySelectorAll('a[href*="' + pattern + '"]')];
  const key = (a) => a.href.split("?")[0].split("#")[0];
  const count = (el) => new Set([...el.querySelectorAll('a[href*="' + pattern + '"]')].map(key)).size;
  const seen = new Set();
  const out = [];
  for (const a of links) {
    const url = key(a);
    if (seen.has(url) || /\\/itm\\/123456$/.test(url)) continue;
    let card = a;
    while (card.parentElement && card.parentElement !== document.body && count(card.parentElement) <= 1) card = card.parentElement;
    const text = (card.innerText || "").replace(/\\s+/g, " ").trim();
    if (!/[$£€]\\s?\\d/.test(text) || text.length > 600) continue;
    seen.add(url);
    const img = card.querySelector("img");
    // Some sites (Depop) show only brand and price; the photo's alt text often has the title
    const alt = img && img.alt && !text.includes(img.alt) ? " | " + img.alt.trim() : "";
    out.push({ url, text: (text + alt).slice(0, 300), image: img ? (img.currentSrc || img.src || null) : null });
    if (out.length >= 24) break;
  }
  return out;
}`;

/** Skip images, fonts and video: the cards keep their image links, pages load faster and don't crash. */
const LIGHT = `
  if (!context.__light) {
    context.__light = true;
    await context.route("**/*", (route) =>
      ["image", "media", "font"].includes(route.request().resourceType()) ? route.abort() : route.continue(),
    );
  }`;

function searchCode(url: string, link: string) {
  return `${LIGHT}
    const selector = 'a[href*="${link}"]';
    const blocked = () => /error page|pardon our interruption|access denied/i.test(document.title);
    // Sent to a sign-in page: signed out (or never signed in)
    const signIn = () => /signin\.ebay\.|\/login|\/checkpoint|\/signin|accounts\.google/i.test(location.href) ||
      (!!document.querySelector('input[type="password"]') && !document.querySelector('a[href*="${link}"]'));
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.goto(${JSON.stringify(url)}, { waitUntil: "commit", timeout: 25000 });
      // Listings, or a block page: whichever comes first
      await page
        .waitForFunction((sel) => document.querySelector(sel) || /error page|pardon our interruption|access denied/i.test(document.title), selector, { timeout: 12000 })
        .catch(() => {});
      // eBay often serves "Something went wrong" to a fresh browser; asking again usually works
      if (await page.evaluate(signIn)) return { cards: [], signIn: true };
      if ((await page.evaluate(blocked)) && attempt < 2) { await page.waitForTimeout(800 + attempt * 1500); continue; }
      await page.waitForTimeout(600);
      return { cards: await page.evaluate(${extractCards}, ${JSON.stringify(link)}), signIn: false };
    }
    return { cards: [], signIn: false };`;
}

/**
 * Searches one site for each query in turn until it has `enough` cards.
 * Never throws: a site that fails comes back with an error and no cards.
 */
/** Longest a site gets before comps go ahead with whatever it found so far. */
const SITE_DEADLINE_MS = 45_000;

export async function searchSite(
  site: SiteKey,
  queries: string[],
  opts: { enough?: number; profileName?: string; sold?: boolean } = {},
) {
  const { link } = sites[site];
  const search = opts.sold ? sites[site].sold : sites[site].search;
  const enough = opts.enough ?? 12;
  let signIn = false;
  if (!search) return { site, cards: [] as RawCard[], error: "no sold search for this site", signIn };
  const cards: RawCard[] = [];
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => (timer = setTimeout(resolve, SITE_DEADLINE_MS)));
  try {
    const work = withBrowser(async (sessionId) => {
      for (const q of queries) {
        // Another query only while there's time: a slow site shouldn't hold up the rest
        if (cards.length && Date.now() - started > 25_000) break;
        const res = await kernel().browsers.playwright.execute(sessionId, { code: searchCode(search(q), link), timeout_sec: 55 });
        if (!res.success) throw new Error(res.error ?? "the page didn't load");
        const out = res.result as { cards: Omit<RawCard, "site" | "sold">[]; signIn: boolean };
        if (out.signIn) {
          signIn = true;
          break;
        }
        for (const c of out.cards ?? [])
          if (!cards.some((x) => x.url === c.url)) cards.push({ ...c, site, sold: !!opts.sold });
        if (cards.length >= enough) break;
      }
    }, opts.profileName);
    work.catch(() => {}); // a late failure after the deadline has nobody to tell
    await Promise.race([work, deadline]);
    const late = Date.now() - started >= SITE_DEADLINE_MS;
    return {
      site,
      cards: [...cards],
      error: signIn ? "signed out" : late && !cards.length ? "ran out of time" : null,
      signIn,
    };
  } catch (error) {
    return { site, cards, error: error instanceof Error ? error.message : String(error), signIn };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A product page's name and price, for the sidekick's "paste a link": the
 * structured data shops publish (JSON-LD, og: tags) plus the start of the
 * page text for the model to read.
 */
export async function readProductPage(url: string) {
  const code = `
    await page.goto(${JSON.stringify(url)}, { waitUntil: "commit", timeout: 30000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    return await page.evaluate(() => {
      const meta = (n) => document.querySelector('meta[property="' + n + '"], meta[name="' + n + '"]')?.content || null;
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent || "").join(" ").slice(0, 3000);
      return {
        title: document.title,
        ogTitle: meta("og:title"),
        price: meta("product:price:amount") || meta("og:price:amount"),
        currency: meta("product:price:currency") || meta("og:price:currency"),
        image: meta("og:image"),
        ld,
        text: (document.body?.innerText || "").replace(/\\s+/g, " ").slice(0, 2500),
      };
    });`;
  return withBrowser(async (sessionId) => {
    const res = await kernel().browsers.playwright.execute(sessionId, { code, timeout_sec: 55 });
    if (!res.success) throw new Error(res.error ?? "the page didn't load");
    return res.result as {
      title: string;
      ogTitle: string | null;
      price: string | null;
      currency: string | null;
      image: string | null;
      ld: string;
      text: string;
    };
  });
}
