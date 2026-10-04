# app

The main Next.js app: marketing site, seller app and public marketplace in one.

- `app/(marketing)` — the landing page
- `app/(flow)` — sign-up and onboarding (A1, A2), no shell
- `app/(app)` — screens inside the app shell (sidebar at 900px and up, floating tab bar below). The layout requires a signed-in, onboarded user
- `app/(workspace)` — the listing workspace (C1–C7): chat on the left, the listing on the right, a drawer on phones
- `app/(market)`, `app/(checkout)`, `app/store/[store]` — the public marketplace on the root domain, and each store on its own subdomain (`proxy.ts` rewrites `{store}.resell.store` onto `/store/{store}`)
- `app/actions/*` — server actions; `app/api/*` — auth, uploads, research polling, the listing agent's chat, the public API (`v1`) and MCP (`mcp`)
- `app/docs` — the docs site (docs.resell.store)
- `lib/server/*` — data access and services (auth, sessions, shops, listings, files, research, Channel3, embeddings, AI models)

## API, docs and MCP

- The public API is `lib/server/api`: one `route()` per endpoint (method, path, scope, zod schemas, example, handler) in `routes/*`, served by `app/api/v1/[[...path]]`. `proxy.ts` sends `api.resell.store/v1/*` there. Keys (`api_key`) are stored as SHA-256 hashes and shown once; agent links are keys with the scopes chosen on `/tools/agent`. Usage counts per person per month (`api_usage`). Webhooks (`webhook_endpoint`) are signed and fired from `lib/server/commerce.ts` and `messages.ts`.
- The docs site is `app/docs` (docs.resell.store via `proxy.ts`, or `/docs`). The API reference pages render straight from the route definitions, and `/api/v1/openapi.json` is generated from them too, so adding a route documents it.
- The MCP servers come from `@repo/mcp` and are hosted at `app/api/mcp/[[...path]]` (`/u/{token}` for your shops, `/buy` and `/buy/{token}` for shopping). Their tools call the API in-process with the link's token, so permissions and limits are the API's.

## Auth

[Better Auth](https://better-auth.com) with the Drizzle adapter (`lib/server/auth.ts`, handler at `/api/auth/*`). Sign-in is an email link; without `RESEND_API_KEY`, local dev shows the link on the welcome page instead of sending it.

Pages check auth themselves: `requireUser()` from `lib/server/session.ts` sends signed-out people to `/welcome` and people who haven't onboarded to `/welcome/start`.

## Research

`/list/new` creates a draft and starts research in the background (`lib/server/research.ts`): identify the item (Claude, with the photo), look it up in Channel3, gather second-hand prices, then price it and pick the questions to ask. Each step writes to `research_run`, which the research page polls. It's shaped to move onto Render Workflows later. Without `ANTHROPIC_API_KEY` it still runs, pricing from the catalog numbers alone.

## After the sale

- **Refunds and problems** (`lib/server/disputes.ts`, actions in `app/actions/after-sale.ts`): the seller can cancel before shipping, the buyer can cancel once the ship-by date passes, and after shipping the buyer can report a problem. While a problem is open the money stays held; the seller can reply, offer part of it back or refund in full, and either side can ask resell.store to step in (`resolveDispute` decides). Disputes opened in PayPal arrive through the webhook and follow PayPal's outcome.
- **PayPal webhook** at `/api/paypal/webhook` (`lib/server/paypal-webhook.ts`): verified with PayPal, stored by event id so redeliveries are no-ops. Captures, refunds, reversals, disputes, seller onboarding and payout results.
- **Timed jobs** (`lib/server/sweeps.ts`): offers expire (with a reminder 12 hours before), "did you ship it?" at the ship-by date, unshipped orders cancelled and refunded after 7 days, "did it arrive?" a week after shipping, money released when the check window closes, and unanswered problems escalated. Reminders are claimed in the `notice` table so nobody gets one twice. Timings are in `lib/server/payout-policy.ts`; `PAYOUT_DEMO_MINUTES_PER_DAY` shrinks them for a live demo.
  - Production: the `resell-sweeps` Render Workflow (`workflows/main.ts`: `offerSweep`, `orderSweep`, and one `releaseOrder` / `cancelUnshipped` task per order so money moves retry on their own), started every 15 minutes by the `resell-sweeps-cron` Render Cron Job (`scripts/start-sweeps.ts`).
  - Local: `curl -X POST localhost:5689/api/cron/sweep` runs one pass in-process, or run the workflow with the Render CLI: `render workflows dev -- pnpm workflows`.

## Tests

Code tests with [Vitest](https://vitest.dev), no browser. Files sit next to what they test (`*.test.ts`); the harness is in `test/`. Tests that touch Postgres use their own database, `resell_test` on the local Docker server, created and migrated on each run and emptied before each test. PayPal, email, AI and Render are always mocked.

```sh
pnpm db:up          # from the repo root, once
pnpm --filter app test
pnpm test           # every package, through Turborepo
```

## Running it

```sh
pnpm dev --filter app
```
