# resell.store

**Sell your stuff without doing the selling.**

!resell.store: snap a photo, an AI agent prices it, lists it, answers buyers and haggles, and PayPal holds the money until it arrives

Snap a photo. An AI agent works out a fair price, writes the listing, puts it live in your own shop, answers buyers and haggles with them (or with their agents). PayPal holds the money until the item arrives. You just say yes.

[resell.store](https://resell.store) · [Demo video](https://www.youtube.com/watch?v=Nus5lpO5wL0) · [docs.resell.store](https://docs.resell.store) · [Source on GitHub (MIT)](https://github.com/impactvelocity/resell-store)

---

## Inspiration

The average American home holds about **$4,267 of stuff nobody uses**, around $560B across the country (Mercari Reuse Report). Most of it never gets sold, and it isn't because nobody wants it. Selling is a chore: work out a price, take photos, write the listing, answer "is this still available?" twenty times, deal with lowballers, dodge scams, then wait to be paid.

Every one of those steps is something an agent can do now. People are ready for it:

- **1 in 3** people who have never resold say they would if AI did the listing (ThredUp 2026 Resale Report, p.12).
- **6 in 10** shoppers say they'd use AI to negotiate secondhand deals for them (same report, p.11).
- AI shopping traffic to US retail was **up 693%** last holiday season (Adobe via Digital Commerce 360).
- US resale is heading for **$306.5B by 2030** (OfferUp 2025 Recommerce Report).

But trust is the catch. Only **12%** of people are comfortable with an AI agent deciding alone at payment (Accenture Consumer Pulse 2026), and US consumers lost **$15.9B** to fraud in 2025, with shopping scams the most-reported scam on social media (FTC).

So I set out to build a marketplace where agents do the work on both sides of a secondhand sale, while people keep the decisions that matter and PayPal makes sure nobody gets scammed. The mission: nothing good goes unused.

## What it does

resell.store is one app with three ways in: a seller app, a marketplace of little shops, and an API and MCP server so anyone's own AI can sell or shop.

![How a sale happens: Maya lists her dutch oven, the shop agent answers and haggles with Jess, PayPal holds the money until it arrives](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/flows/01-how-a-sale-happens.png)

### An agent that sells for you

- **One photo to a priced listing.** The agent identifies the item, finds what it costs new, and reads what the same thing is listed for on eBay, Poshmark and Depop right now. It suggests a price and shows where every number came from.
- **It writes the listing.** It only asks what a photo can't show (does it have chips, does the lid fit), then writes the title, description and details.
- **Your own shop.** Every seller gets a storefront on their own subdomain, like `claspandcarry.resell.store`, with a link to share anywhere.
- **It answers buyers.** Questions get answered at any hour, only from the listing's facts and your earlier replies. When it doesn't know, it says so kindly and flags the thread "Needs you."
- **It haggles inside your limits.** Low offers get a counter halfway between the offer and your price, never under your lowest. Offers at or above your lowest wait for your yes, with a note: "I'd take it."

![The shop agent: a Q&A agent that answers from the listing, and a negotiator where code does the maths and the AI only picks the words](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/diagrams/03-agents.png)

The rule I built everything around: **money decisions live in code, not the model.** The negotiator's moves are plain, tested functions. The AI only words the message, and a reply that carries any number other than the one the code chose is thrown away and replaced with a template. The seller's lowest price is never shown to a buyer.

### An agent that shops for you

- **Search by meaning.** "A warm coat for a toddler" finds the right things across every shop, not just keyword matches.
- **A shopping sidekick.** Paste a link before you buy and it tells you what the item costs new, what it resells for, and whether it's a better buy than the one you were comparing it to. Good for flippers, and for anyone who just wants to know.
- **Bring your own AI.** Add resell.store to the assistant you already use. It can search, ask sellers questions and make offers, inside a spending cap you set ($200 to start), and it asks before it does anything you've marked "ask me first."

![Bring your own agent: any MCP client talks to the resell.store MCP server and public API, with scoped keys, ask-me-first, a spending cap and an activity log](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/diagrams/06-mcp.png)

When a buyer's agent meets a seller's agent, they haggle with each other, and the deal still only closes on terms a person set: the buyer's cap on one side, the seller's lowest on the other.

### Money held until it arrives

Buyers pay with PayPal, Pay Later or a card. The money goes to the seller's own PayPal and waits there until the buyer confirms it arrived (or a timer decides it did). Problems after shipping get a proper flow: reply, offer a part refund, refund in full, or escalate. Nobody pays for something that never shows up, and nobody ships to a buyer who hasn't paid.

## How I use the sponsors

Every sponsor listed here is wired into the running app. I left out anything that's only planned.

![Where each sponsor does its work: PayPal, Channel3, Kernel and Render across listing, shops, checkout, after the sale, the sidekick and timed jobs](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/images/06-sponsors.png)

### PayPal: under every sale

PayPal is the trust layer, so I used it end to end rather than as a pay button:

| Step | PayPal API |
| --- | --- |
| Seller connects their PayPal | **Partner Referrals** onboarding, verified with the merchant-integrations lookup on return |
| Buyer pays | **Orders v2** with the seller as payee, the marketplace's 10% fee in `platform_fees`, and `DELAYED` disbursement |
| Money held | Captured into the seller's account but not released |
| Item arrives | **Referenced Payouts** releases the held money to the seller |
| Something goes wrong | **Refunds** (full or part), **Disputes** synced from PayPal webhooks, and a live dispute blocks the payout |
| At checkout | Pay Later messaging, and partner attribution on every call |

Timers keep it moving without anyone babysitting: ship within 3 days or the order cancels, a 3-day check after delivery, delivered assumed 10 days after shipping, and every release lands before PayPal's own 28-day auto-release. It all runs in the PayPal sandbox, so judges can buy things without real money moving.

![PayPal money flow: Partner Referrals, Orders API with platform fees, delayed disbursement and referenced payouts, run on time by Render Workflows](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/diagrams/04-paypal.png)

### Channel3: what is it, and what does it cost new?

Channel3's product catalogue (100M+ products) turns a photo and a line of text into a named item, its price new, and the maker's own photos and description. That anchors every price the agent suggests, and the sidekick uses it to find the new price of whatever link you paste.

### Kernel: what's it going for right now?

Kernel's cloud browsers read live listings for the same item on eBay, Poshmark and Depop, one browser per site, all in parallel. I match the cards with the model, keep only used or unstated-condition listings, and price from those. The sidekick uses Kernel twice: once to read the page you pasted, and once to check resale listings.

### Render: the whole thing runs here

One Render web service hosts the marketing site, the seller app, the marketplace, every shop subdomain, the docs, the API and the MCP servers, routed by host. Render Postgres with pgvector holds everything, including the embeddings for search. **Render Workflows** run the jobs that have to happen on time even when nobody is looking: offer expiry and reminders, ship-by reminders, auto-cancel, "did it arrive?" check-ins, auto-release of held money, webhook retries, follower digests, the agent's evening summary, and the demo reset. The whole stack deploys from one `render.yaml` Blueprint.

## How I built it

- **Next.js 16 + React** in a Turborepo monorepo on pnpm, with my own design system (24 components on Base UI and Tailwind CSS v4), designed in Paper first and built from a clickable prototype of every screen.
- **AI SDK** for every agent: research, the listing chat with tools, the Q&A agent, the negotiator's wording, card matching and the sidekick. A fast model handles chat, a stronger one handles matching and research.
- **Postgres + Drizzle**, with hybrid search (full text plus Jina embeddings in pgvector).
- **One route definition per endpoint** drives the handler, the docs page and the OpenAPI file, so the API, docs and MCP can't drift apart. The MCP servers only call the public API, so they get the same permissions and logging as anything else.
- **Better Auth** magic-link sign-in, **React Email** templates, **Cloudflare R2** for photos.
- **Vitest** against a real test database, with the money paths (offers, checkout, release, refunds, disputes, sweeps) covered.

## Challenges I ran into

- **Letting an agent haggle without letting it give money away.** My first instinct was to let the model negotiate. I ended up with deterministic moves in code and the model on wording only, validated so it can't slip in a different number.
- **Held funds.** Getting a marketplace fee, delayed disbursement, release, refunds and disputes to agree with each other took a lot of sandbox runs. A dispute must block a payout, a refund must adjust what's released, and a sweep that runs twice must not pay twice.
- **Reading resale sites.** Some sites need a login, some crash headless browsers, and stealth mode broke others. I settled on plain Kernel browsers, one per site, with retries, deadlines and a cap that fits the free plan.
- **Lookalikes.** A fast model happily matched a branded pot to a cheaper lookalike, which dragged the price down. Card matching moved to the stronger model.
- **Subdomain shops in development.** Browsers won't share cookies across `*.localhost`, so I built a one-time handoff to carry the session into a store.
- **A demo judges can actually use.** Shared logins that let you list and buy for real, without anyone being able to wreck the public marketplace, plus a reset every 10 minutes.

## Accomplishments that I'm proud of

- A real sale works end to end: photo, research, listing, a buyer question, a haggle, PayPal checkout, held funds, shipping, delivery and payout.
- Agents on both sides of the deal, with people in charge at the two moments that matter: what you'll accept, and what you'll spend.
- Everything you can do in the app, an agent can do too: **72 API endpoints**, a seller MCP server with **38 tools** and a buyer MCP server with **31**.
- It's open source and deploys with one Blueprint, so anyone can run their own marketplace.

## What I learned

Agents earn trust through limits you can see, not through being clever. "Good offers wait for your yes" did more for the product than any prompt. Also, the boring parts (timers, reminders, retries, refunds) are what make a marketplace feel safe, and they're exactly the parts a person shouldn't have to watch.

## What's next for resell.store

- Sold prices alongside listing prices, from logged-in research sessions.
- Cross-listing a single item to other marketplaces from the same listing.
- OAuth for MCP connectors, and the MCP server on npm.
- PayPal's agent-ready payments, so a buyer's agent can pay without leaving the chat.

---

## The whole app on one page

![One app, three ways in: the seller app, the marketplace and the API and MCP servers, with PayPal under every sale](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/images/01-overview.png)

### The parts

| Part | Where | What it is |
| --- | --- | --- |
| Seller app | `resell.store/home` | Home, shops, a five-step listing workspace with the agent beside it, inbox, offers, sales, stats, and tools (agent links, API keys, connections, sidekick) |
| Marketplace | `resell.store/discover` | Search by meaning, browse stores, follow shops, like items, ask, offer, buy |
| Shops | `{shop}.resell.store` | Each seller's storefront, with reviews and branded share images |
| Shop agent | inside every shop | Q&A agent and negotiator working every listing |
| Shopping sidekick | `/tools/sidekick` | Paste a link, find out if it's worth it |
| Public API | `api.resell.store/v1` | REST API with an OpenAPI file, scoped keys and signed webhooks |
| MCP servers | `mcp.resell.store` | One to run your shops, one to go shopping |
| Docs | `docs.resell.store` | Guides for sellers and buyers, API and MCP reference, developer docs |
| Timed jobs | Render Workflows | Expiry, reminders, cancellations, payouts, retries, digests |

## Under the hood

![Architecture: one web app on Render routing by host, one Postgres database with vector search, a Render Workflow for timed jobs, and the services it talks to](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/images/05-architecture.png)

## What's included

Everything in the repo is the real, running app:

- **`apps/app`**: the Next.js app (marketing site, seller app, marketplace, store subdomains, docs, API, hosted MCP) plus the Render Workflow for timed jobs.
- **`packages/db`**: Drizzle schema and migrations for Postgres with pgvector.
- **`packages/mcp`**: the seller and buyer MCP servers, hosted or run locally over stdio with an API key.
- **`packages/ui`**: the resell.store design system, with every foundation and component shown at `/design-system`.
- **`packages/email`**: 10 React Email templates, from new offer to paid out, plus the agent's evening summary.
- **Seed data**: 10 stores, 70 items with hand-drawn flat art, sales, reviews, questions and follows, so the marketplace is alive on first run.
- **Demo accounts**: "Sell as Dana" and "Shop as Ava" on the welcome page, so you can try both sides without signing up.
- **Tests**: 47 Vitest files covering commerce, PayPal, disputes, sweeps, messages, search and more.
- **A clickable prototype** of every designed screen under `app/mock`, which you can flip to from any live page.

## Open source

resell.store is MIT licensed. Fork it, run your own marketplace for a school, a neighbourhood or a hobby, or lift the parts you need: the held-funds PayPal flow, the negotiator, the research pipeline or the MCP servers.

```sh
pnpm install
pnpm db:up && pnpm db:migrate
pnpm dev   # http://localhost:5689, shops at {slug}.localhost:5689
```

Deploying is one click: **New → Blueprint** in Render, pick the repo, fill in the keys. The full guide is at [docs.resell.store](https://docs.resell.store).

## Try it out

- Main site: [resell.store](https://resell.store)
- Marketplace: [resell.store/discover](https://resell.store/discover)
- Example store: [claspandcarry.resell.store](https://claspandcarry.resell.store)
- Sign up or use a demo login: [resell.store/welcome](https://resell.store/welcome)
- Docs: [docs.resell.store](https://docs.resell.store)
- API: [api.resell.store/v1/openapi.json](https://api.resell.store/v1/openapi.json), MCP servers at `mcp.resell.store`
- Demo video: [youtube.com/watch?v=Nus5lpO5wL0](https://www.youtube.com/watch?v=Nus5lpO5wL0)

How each sponsor is used, in the developer docs:

- PayPal: [docs.resell.store/dev/stack/paypal](https://docs.resell.store/dev/stack/paypal)
- Channel3: [docs.resell.store/dev/stack/channel3](https://docs.resell.store/dev/stack/channel3)
- Kernel: [docs.resell.store/dev/stack/kernel](https://docs.resell.store/dev/stack/kernel)
- Render: [docs.resell.store/dev/stack/render](https://docs.resell.store/dev/stack/render)

PayPal runs in sandbox mode, so no real money moves.

## Built with

PayPal Channel3 Kernel Render Next.js React TypeScript PostgreSQL pgvector Drizzle Turborepo MCP Vercel-AI-SDK Tailwind
