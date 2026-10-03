# Sold-price research: how it could work

> **Update, 3 Oct 2026: built, from listing prices instead.** Sold prices are hard to get, so research and the shopping sidekick now read what the same item is *listed* for, and assume it sells 0–15% under that.
>
> **How it works** (`lib/server/comps.ts`, `lib/server/kernel.ts`):
> 1. The fast model writes 2–3 search variations.
> 2. A plain Kernel browser per site searches eBay, Poshmark and Depop. Images are blocked and eBay's error page is retried.
> 3. The main model checks up to 48 listing cards against the item: same, bundle or different.
> 4. Up to 10 matches are kept and balanced across sites, with outliers dropped.
> 5. The median of the used matches gives "sells for" = 85–100% of it, plus notes and a confidence.
>
> **Where it shows up:**
> - Research: a "Listings" step and source (C2/C3).
> - The shopping sidekick at /tools/sidekick (`lib/server/sidekick.ts`, `price_check` table): what it costs over what it sells on for, with a side-by-side "Better buy".
>
> **Left out:**
> - Facebook Marketplace needs a login.
> - Stealth mode broke eBay.
> - Mercari crashed the page every time.
>
> **Speed:** a run takes about 40–60 s, mostly the matching model. The fast model was no quicker and let look-alikes through.
>
> The rest of this note is the original review.

Research (C2/C3, `lib/server/research.ts`) prices items from Channel3 only: what it costs new and what used copies are listed for. Neither is a sold price. The plan was to add sold comps from eBay and Google through Kernel. This note covers how that would work today and what changed since the plan was written.

Researched 3 Oct 2026.

---

## What changed: eBay sold listings now need a login

Several scraping vendors report that eBay put sold and completed search results (`LH_Sold=1&LH_Complete=1`) behind sign-in around late July to August 2026. A signed-out visitor is redirected to signin.ebay.com. We haven't confirmed it ourselves: a plain request gets a 403 from eBay's bot detection before it gets that far. Either way, an anonymous Kernel browser opening eBay's sold search won't work as the plan assumed.

The official routes are closed too:

| Source | Sold data? | Status |
|---|---|---|
| eBay Finding API (`findCompletedItems`) | Yes | Shut down Feb 2025 |
| eBay Marketplace Insights API | Yes, 90 days | Limited release, not open to new apps |
| eBay Browse API | No, active listings only | Open and free |
| Terapeak | Yes, 3 years | Inside Seller Hub only, no API |
| SerpApi eBay engine | No | Its sold filter is deprecated |
| Google Shopping (SerpApi or a browser) | No | New and active prices, some used listings |

## Kernel, briefly

Kernel runs cloud Chromium browsers for agents.

- **SDK:** `@onkernel/sdk`.
- **Create a browser:** `kernel.browsers.create({ stealth: true })` returns a CDP URL and a live-view URL.
- **Run code inside it:** `kernel.browsers.playwright.execute(id, { code })` runs Playwright code in the browser's VM and returns the result. Nothing browser-related has to run on Render.
- **Stealth mode:** adds an ISP proxy and a CAPTCHA solver.
- **Profiles:** keep cookies between sessions (`save_changes: true`).
- **Pricing:** headless costs about $0.06 an hour. The free tier gives $5 of credit a month and 5 browsers at once.
- **Docs:** https://kernel.sh/docs/llms.txt

Kernel is the right tool for pages that have no API. It doesn't fix the eBay problem by itself: getting sold results means signing in, and automated access from a signed-in account breaks eBay's user agreement and risks a ban on that account.

---

## Recommended design

Add a **sold** step to the research run, between `resale` and `price`, that asks several sources behind one interface and keeps whatever comes back:

```ts
type SoldComp = {
  title: string;
  priceCents: number;
  shippingCents?: number;
  soldAt?: string;      // null for asking prices
  kind: "sold" | "asking";
  url: string;
  source: "resell" | "ebay" | "ebay-active" | "google" | "vendor";
  image?: string;
};

interface CompSource {
  key: string;
  enabled: boolean;
  find(q: { query: string; condition?: "used" | "new"; categoryId?: string }): Promise<SoldComp[]>;
}
```

Sources, cheapest and safest first:

1. **Our own sales** (`orders` joined to `listing`). Free, real and allowed. It's thin today but grows with every sale. Match on embedding similarity to the listing, since pgvector is already there.
2. **eBay Browse API**, active used listings. Free and allowed. Label it plainly as "listed now at", never as "sold for".
3. **A sold-comps vendor** behind the adapter, such as an Apify eBay-sold actor or OpenWebNinja's eBay API. They cost cents a lookup. Several claim anonymous sold data after the login wall, so test one on 20 known items before trusting it. The terms risk sits with the vendor, but check their terms.
4. **Kernel**, for two things:
   - **Google:** search the identified item, open the top marketplace and retailer pages (Mercari, Poshmark, Etsy, brand resale programmes), and have Claude pull the price, condition and whether it says sold. Pages change often, so give Claude the page text and don't use CSS selectors.
   - **eBay sold, demo only, opt-in:** a Kernel profile signed in to a throwaway eBay account, `stealth: true`, then `playwright.execute` on the sold search. Gate it behind `COMPS_EBAY_BROWSER=1` and keep it off in production.

**Turning comps into a price.** The fast model checks every comp against what the identify step found (same model, size and colour) and drops:
- lots and bundles
- items sold for parts or broken
- the wrong size
- outliers

Of the matches it keeps:
- Compute p25, median and p75 from the sold comps.
- Give sold comps more weight than asking prices.
- Count how many there were and how recent they are.

The `price` step already returns a band, a suggestion and a confidence, so this feeds it directly. Five or more recent sold matches can lift the confidence to "high".

**Showing it.** Add the comps as another `ResearchSource` with key `sold` in `listing.findings.sources`. Each item gets the title, the price, "Sold 28 Sep" or "Listed now", and a link. The findings card (C3) already renders sources with links and images, so no new UI is needed beyond the tag.

**Building the query.** Use the identify step's brand, model, size and colour. Add exclusions (`-lot -parts -broken -for -repair`), the used condition filter (`LH_ItemCondition=3000`) and a category if Channel3 matched one.

**Running it.** Research runs after the response, and the page polls, so a 10–30 s browser step is fine. Give each source a timeout (20 s for the API sources, 60 s for Kernel) and run the sources in parallel. If they all fail, the step says "Couldn't reach sold listings, priced from new and used prices" and the run carries on. Cache comps per query for 24 hours so a re-run is free.

**Env:**
- `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` (Browse API, client credentials)
- `KERNEL_API_KEY`
- `COMPS_EBAY_BROWSER` (demo flag)
- optional `APIFY_TOKEN`

---

## Order of work

1. The `sold` step with sources 1 and 2, plus the comp filter and the weighting in the price step. Everything here is allowed, it costs nothing, and the screen already exists.
2. A vendor adapter, picked after a 20-item accuracy test against prices checked by hand.
3. Kernel's Google pass for items eBay doesn't cover well (fashion, design and vintage).
4. Kernel on eBay sold, demo flag only, if the vendor results aren't good enough to show.

## Decisions needed

1. Is a signed-in browser on eBay acceptable for a demo-only flag, knowing it breaks their terms?
2. Do we pay for a sold-comps vendor (cents a lookup), or is "listed now" from the Browse API enough for the demo?
3. For launch: apply for Marketplace Insights or license comps data. Until one of those comes through, show sold prices only from our own sales.

## Sources

- https://scavio.dev/blog/ebay-sold-listings-api-login-wall-2026
- https://www.openwebninja.com/blog/how-to-get-ebay-sold-and-completed-listings
- https://developer.ebay.com/develop/get-started/api-deprecation-status
- https://serpapi.com/ebay-search-api
- https://kernel.sh/docs/browsers/playwright-execution.md
- https://kernel.sh/docs/browsers/bot-detection/stealth.md
- https://kernel.sh/docs/browsers/profiles.md
- https://kernel.sh/docs/info/pricing.md
