# Backend plan

Everything in `apps/app` is a front-end prototype. No route handler, server action or fetch exists. Every mutation is `useState`, a toast, a `setTimeout`, or one of two in-memory stores (`components/listing-later/store.ts`, `components/offers/offer-store.ts`). Every `[id]`/`[slug]` route except `shops/[slug]` ignores its param, and the listing flow is hard-wired to the dutch oven.

The plan below ranks the work by what a live demo needs. Each tier depends on the tiers above it.

**The demo's thin slice:** sign in → open a shop → list an item with AI research → publish → a buyer finds it and pays with PayPal (sandbox) → the seller sees the sale and ships it → the buyer confirms → the seller is paid. Tiers 0–1 are that slice. Everything after them makes the demo richer.

---

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Hosting | Render web service (Next.js) with `render.yaml` blueprint | Wildcard custom domain `*.resell.store` for store subdomains |
| Database | Render Postgres with **Drizzle** | pgvector is available on every Render Postgres plan. The basic plan is about $6/mo. The free plan expires, so don't demo on it. |
| Background work | **Render Workflows** (TypeScript SDK) | Durable tasks with retries, run on demand, billed per second, nothing idle. There is no built-in scheduling, so a Render cron job kicks off the sweeps. |
| Auth | **Better Auth** on the same Postgres | Magic link and "Log in with PayPal" (generic OAuth/OIDC). Plugins: `apiKey`, `mcp`/`oauth-provider`. |
| Email | Resend (or Postmark) | Magic links need it, so it is in tier 0 |
| Files | **Cloudflare R2** (S3 API) | Render has no object storage. R2 has no egress fees. |
| AI | AI SDK with `@ai-sdk/anthropic`; model chosen by env | `AI_MODEL`, `AI_MODEL_FAST`, resolved through a provider registry so you can swap providers without code changes |
| Chat UI | Keep `components/agent-chat/*`, wire it to `useChat` | See the note on AI Elements below |
| Payments | **PayPal** multiparty (Complete Payments Platform) | Sandbox works now. Live needs partner approval, so apply early. |
| Product data | **Channel3** search and lookup | Identifies the item, MSRP, retail and resale prices, maker photos |
| Headless browser | **Kernel** | Sold comps (eBay, Google), and later cross-listing to sites with no API |
| Search | Postgres full-text plus pgvector (hybrid) | Elastic only if this stops being enough |
| Embeddings | Voyage or OpenAI small embeddings | Anthropic has no embeddings model, so you need a second provider |
| Tables | AG Grid Community, desktop only | Low priority |
| Integrations | Zapier app on top of the public API and webhooks | Low priority |

**AI Elements.** It is built on shadcn/ui. This app uses its own Base UI design system, and `components/agent-chat/agent-chat.tsx` already has Thread, AgentMessage, ToolActivityCard (queued/running/done/failed), Composer and AnswerPicker, matched to the Paper designs. Wire those to `useChat` and its tool-call parts. Borrow individual AI Elements pieces where they save work (auto-scrolling Conversation, attachment handling in PromptInput) and restyle them with the tokens. Don't adopt the whole kit.

---

## Tier 0: Foundation (nothing works without it)

### 0.1 Database, schema and Render blueprint
- `packages/db`: Drizzle schema, migrations and a client, shared by `apps/app` and the workflows service.
- `render.yaml`: web service, Postgres, workflows service, cron job, env groups.
- Turn the mock types in `lib/mock*.ts` into tables. Core tables: `user` (Better Auth), `shop`, `listing`, `listing_photo`, `listing_draft_version`, `research_run`, `research_step`, `offer`, `offer_event`, `order`, `thread`, `message`, `follow`, `favourite`, `review`.
- Seed script built from the current mock data, so the demo looks populated from day one.

### 0.2 Auth: Better Auth
Clerk has been removed: no package, provider, middleware, routes or env vars are left. Auth is Better Auth on the same Postgres (`lib/server/auth.ts`, `lib/auth-client.ts`).

The designed flow (`components/welcome/sign-up.tsx`) offers **PayPal** and an **email magic link**. Every button currently just routes to `/welcome/start`.

Work:
- `/api/auth/[...all]` handler and an auth client.
- Session check in `app/(app)/layout.tsx` and `app/(workspace)` that redirects to `/welcome`.
- Onboarding (A2, `components/welcome/choose-mode.tsx`): save `preferredMode` and `onboardedAt` on the user. They currently live only in localStorage. The selling path goes on to create the first shop.
- Cross-subdomain cookies (`.resell.store`, and `*.localhost:5689` in dev) so the store header knows who is signed in. Add `trustedOrigins`.
- Replace the fake signed-in state in `components/market/site-header.tsx` (`signedInPaths`).
- Log out, change email and delete account (`components/me/profile-settings.tsx`).
- Delete the leftover `/dashboard` scaffold. The `(app)` shell replaces it. (Done.)

### 0.3 Shops, listings and photos (the core CRUD)
- **Create shop** (B1, `components/shops/create-shop.tsx`): check the slug against the DB and reserved names (`www`, `app`, `api`, `mcp`, `sidekick`), upload the picture, then route to the real shop. It currently always goes to `mayas-closet`.
- **Shop settings** (B3): save, pause, delete. The agent policy fields (`answerQuestions`, `haggle`, `lowest`, `askHold`) are what the offer agent reads in tier 1.
- **Listing draft** (C1–C7): create a draft from the start screen, then autosave (the fake "Saving…" label in `listing-workspace.tsx`). Load by `[id]` instead of the dutch oven. Publish sets the status and visibility. Fold `components/listing-later/live-workspace.tsx` back into the shared workspace while doing this.
- **Photos** (C5): presigned R2 uploads with progress, reordering, cover rule, one video.
- **Read paths:** replace mock reads in shop listings (B2), manage (C9), Discover (P1), store subdomain (P2) and listing page (P3) with queries. Make `proxy.ts` and the store layout 404 on unknown slugs.
- App shell (`components/shell/app-shell.tsx`): session user, the user's shops (the Shop link is hard-coded) and unread count.

---

## Tier 1: Core experience (the money and the magic)

### 1.1 PayPal: checkout, escrow and payouts
This is the core of the product promise. The copy on P4 and C10 says PayPal holds the money, the seller ships, the buyer has 3 days after arrival to check, then the seller is paid.

- **Seller onboarding:** Partner Referrals API ("Connect PayPal" in onboarding and `/tools/connections`). Store the seller's `merchant_id`. "Log in with PayPal" from 0.2 can prefill it but is a separate grant.
- **Checkout** (P4/P10, `components/market/checkout/*`): server creates an Orders v2 order with the seller as `payee` and `platform_fees` for the cut. Capture with **delayed disbursement**. That is the escrow: the money is captured, but it stays with PayPal until we release it.
- **Release:** "It's all good" on P8 calls Referenced Payouts to disburse to the seller. An auto-release sweep runs 3 days after delivery (**Render Workflow**, kicked off by cron). *Built:* `lib/server/sweeps.ts` + `apps/app/workflows/main.ts` (offerSweep, orderSweep, releaseOrder, cancelUnshipped), started every 15 minutes by the `resell-sweeps-cron` job. The same sweep sends "did you ship it?" at the ship-by date, cancels and refunds orders that never ship (7 days), and asks the buyer "did it arrive?" a week after shipping.
- **Inventory lock:** single-quantity items. Mark the listing sold when the order is created, and release it if payment fails.
- PayPal webhooks route (`PAYMENT.CAPTURE.*`, disputes, merchant onboarding). Verify signatures, keep handlers idempotent. *Built:* `/api/paypal/webhook` → `lib/server/paypal-webhook.ts`.
- Pay Later messaging and card fields come from the JS SDK, so they are mostly front-end.
- **Order entity** feeds Sales and payouts (B5), buyer account orders (P8) and home earnings (A3).
- "Report a problem" uses the Disputes API, or starts as an internal flag. *Built* as our own flow (`lib/server/disputes.ts`): cancel before shipping, report a problem, reply, part or full refund, escalate; PayPal disputes are mirrored from the webhook.

Env: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PARTNER_MERCHANT_ID`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV=sandbox`.

### 1.2 AI listing agent: research, details, words
The headline feature. Everything is currently canned: `research-flow.tsx` tick loop, `details-flow.tsx` regex parser, `draft-card.tsx` `rewrite()` and `use-agent-chat.tsx`.

**Research (C2/C3) as a Render Workflow.** It is long, it has many steps and each step can fail, so it is a natural fit. The fake rows in `researchRows` map directly to tasks:

| Row in the UI | Task |
|---|---|
| Photo | Vision identify (Claude): brand, model, colour, size, condition hints |
| Sales | **Kernel**: eBay sold listings, Google Shopping, FB Marketplace. eBay's sold data is gated behind the restricted Marketplace Insights API, so the browser is the practical route. eBay has since put sold search behind a login; see [sold-prices.md](sold-prices.md) for the revised plan. |
| Maker's site | **Channel3** `search` (text and image) and `lookup`: MSRP, specs, maker images, resale-platform prices |
| Buyer reviews | Kernel or Channel3, then summarise with the fast model |
| (final) | Price band and suggestion; questions to ask (condition, box, bought, size) |

- Each task writes a `research_step` row. The page streams them over SSE (Postgres `LISTEN/NOTIFY`, or polling at first) into the existing ToolActivityCard.
- **Details (C4):** `streamText` in a route handler with tools `set_field` and `set_price`, constrained by the price band.
- **Words (C6):** streaming copywriting with tone, shorter, longer and another take. Save each version as a `listing_draft_version` row. "Save as usual style" becomes a user preference fed into the prompt.
- **Photos (C5):** offer Channel3's maker images with source attribution. The UI already supports `source: "lecreuset.com"`.
- New-listing dialog (`components/new-listing-dialog.tsx`) creates a draft and starts the research workflow.

Env: `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_MODEL_FAST`, `CHANNEL3_API_KEY`, `KERNEL_API_KEY`, `RENDER_API_KEY` (to trigger workflow runs).

### 1.3 Offers and messages
- **Offer state machine:** open → countered → accepted / declined / expired / withdrawn. It replaces `offer-store.ts` for the inbox (A5), manage (C9), offer (C10), home (A3), buyer offer (P5) and buyer messages (P6).
- **Deposits:** a PayPal authorization, voided on decline or expiry and applied on accept.
- **Expiry:** 48-hour offers and pay-by deadlines on accepted offers, run as a Render Workflow sweep.
- **Threads and messages:** one model for both sides (seller inbox and buyer messages), with unread counts and an author kind (human or agent; sellers always see agent-written messages).
- **Store agent Q&A:** an LLM answers buyers from the listing data and its answered questions. Answers saved on C9 ("Added to your listing") go back into that context. It escalates to the owner when unsure. *Built:* `lib/server/store-agent.ts`. Earlier owner replies on the same listing feed later answers; a handoff sets `thread.needs_seller`.
- **Seller negotiation agent:** counters within the shop policy (`haggle`, `lowest`, `askHold`) and writes the C10 timeline. Run it as a workflow task triggered by each offer event. *Built:* `lib/server/negotiator.ts`, run after each new offer. The maths is plain code and the model only words the message. Offers at or above the lowest wait for the owner.
- Fix the conflict in the designs while doing this: Jess's offer is the linen dress for $20 on Home and Inbox, but the dutch oven for $170 on C9/C10.
- Real-time: start with polling or SSE. Web sockets aren't needed for the demo.

### 1.4 Transactional email
Order placed, offer received or countered, shipped, delivered, paid out. This is the minimum set of notification preferences (`notify` in `components/me/profile-context.tsx`).

---

## Tier 2: Differentiators

### 2.1 Search
- Discover (P1), the header search, store search (P2) and `/search` all filter mock arrays client-side today.
- Postgres `tsvector` plus a pgvector embedding on `listing`, with hybrid ranking (reciprocal rank fusion).
- Facets: category, price, condition, size and ships-to. Ships-to is chosen in the UI but never applied today. Use cursor pagination.
- Natural-language queries ("a film camera under $150 that ships to Canada"): the fast model turns them into filters plus a vector query.
- Embed listings on publish, as a workflow task.

**Elastic:** not for the demo. Elastic Cloud doesn't scale to zero, and pgvector on the Postgres you already pay for costs nothing extra. Revisit if relevance tuning or facet performance becomes the bottleneck.

### 2.2 MCP server: "Connect your agent" (D2 seller, P7 buyer)
- A remote MCP server (streamable HTTP) at `/mcp`, behind Better Auth's `mcp`/`oauth-provider` plugin. It needs OAuth 2.1 with dynamic client registration, which is what Claude and ChatGPT connectors expect.
- D2 currently shows a secret-in-URL link (`mcp.resell.store/u/maya-<secret>`). OAuth is the safer default. If the URL form stays, store only a hash and show it once.
- Seller tools: listings, sales, stats, reply to buyers, answer offers. Enforce the D2 permissions server-side: `read`, `listings` (drafts only), `reply`, `offers` (Always / Ask me first / Never). `money` is never available to the agent.
- Buyer tools: search, get listing, watch, offer, message seller, checkout. Enforce the P7 limits: `spendLimit`, `askBeforePaying`, `makeOffers`, `messageSellers`.
- "Ask me first" needs an approval queue in the inbox.
- Activity log ("What it did lately") and the list of connected clients with revoke.
- The PayPal Agent Toolkit (AI SDK support) can handle the buyer agent's checkout step.
- The buyer agent hand-off on P6 ("Let your agent finish" up to a ceiling) is a delegation record that the negotiation runner reads.

### 2.3 Shipping
- B5 "Get label", the inbox "Print label" and the delivery ETAs on P3/P4 are all fake.
- Demo route: the seller enters a tracking number, and we push it to PayPal's tracking API. That also protects seller payouts.
- Later: Shippo or EasyPost for rates, labels and tracking webhooks, which feed the "delivered" event that starts the 3-day release timer.

### 2.4 Social and engagement data
- Follows, favourites and reviews.
- "New since last visit" on P8.
- View events, which feed Stats (B4) and the counts on C9. Roll them up with a nightly workflow.

### 2.5 Profile and preferences
- The `/me` fields: about, location (city only is shown), interests, notification preferences, reach-by channels.
- Avatar upload to R2.
- Push and SMS can wait. Email covers the demo.

---

## Tier 3: Ecosystem

### 3.1 Public API, keys and webhooks (D3)
- `/v1/shops`, `/listings`, `/research`, `/offers`, `/sales`.
- API keys through Better Auth `apiKey`: hashed, rotated, rate-limited, with the usage meter.
- Webhook delivery as a **Render Workflow**: signed payloads, retries with backoff, a delivery log. Events: `listing.sold`, `offer.received`, `question.asked`, `payout.sent`.
- Docs page.

### 3.2 Zapier
- A Zapier app built on 3.1: REST-hook triggers using the same four events, plus actions (create listing, read sales). Auth by API key, or OAuth through the provider from 2.2.
- It only becomes worth doing once the API is stable.

### 3.3 Share kit (C7)
- Square, story and QR images rendered with `next/og`, plus OG tags on listing pages.

### 3.4 Shopping sidekick (D4)
- Reuses the research pipeline: Channel3 `lookup` for pasted URLs, vision for tag photos, then the comps step.
- "Things you've checked" history.
- "I bought it" creates a draft listing.

### 3.5 AG Grid
Useful only on desktop, where the tables get dense:
- Sales and payouts (B5): filter, sort, CSV export. That replaces the hand-rolled `downloadCsv`.
- Shop listings (B2): bulk edit of price, lowest and status.
- An internal admin view of orders, holds and disputes, for running the demo.

Theme it with the design tokens. The phone layouts stay card-based.

---

## Tier 4: Later (not important for the demo)

- **Cross-listing** (C8, D1):
  - eBay is the only one with a real API (Sell/Inventory). Do it first if any.
  - Facebook Marketplace, Poshmark and Depop have no public listing APIs. That means Kernel automation with stored sessions, which is fragile and against most of their terms. "Delist everywhere on sale" depends on all of it.
- **Social posting:** Instagram, Facebook page, TikTok, Pinterest.
- **Elastic**, if 2.1 runs out of road.
- **WebMCP** in-page tools, and the Grok/ChatGPT connector listings.
- **SMS and web push.**

---

## Where Render Workflows fit

| Workflow | Trigger | Why it's a workflow |
|---|---|---|
| Listing research | Draft created or photo added | Several slow external calls (Kernel, Channel3, LLM), each with its own retries |
| Seller negotiation turn | Offer or counter event | Policy check, LLM, write the event, notify, all of which must happen exactly once |
| Escrow auto-release | Cron sweep → per-order task | Moves money; must be durable and idempotent |
| Offer and pay-by expiry | Cron sweep | Voids deposits, notifies both sides |
| Embed listing | Listing published or edited | Keeps the search index fresh off the request path |
| Webhook delivery | Domain event | Retries with backoff over hours |
| Stats roll-up | Nightly cron | Batch aggregation |
| Cross-list sync (tier 4) | Publish, sold | Long browser sessions |

The research workflow is the showcase: it fans out in parallel and you can watch each step land on the C2 screen.

---

## Env vars (new)

```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
RESEND_API_KEY=
EMAIL_FROM=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_PARTNER_MERCHANT_ID=
PAYPAL_WEBHOOK_ID=
ANTHROPIC_API_KEY=
AI_MODEL=anthropic:claude-sonnet-5
AI_MODEL_FAST=anthropic:claude-haiku-4-5
EMBEDDING_MODEL=
CHANNEL3_API_KEY=
KERNEL_API_KEY=
RENDER_API_KEY=
NEXT_PUBLIC_ROOT_DOMAIN=localhost:5689
```

## Open decisions

1. **File storage:** R2 (recommended) or S3.
2. **Embeddings provider:** Voyage or OpenAI.
3. **PayPal partner approval for live:** sandbox covers the demo. A live launch waits on approval.
4. **Scraping exposure:** Kernel against eBay and Google for comps is fine for a demo. Before launch, check each site's terms or license a comps feed.
