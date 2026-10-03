# Resell Store

Turborepo monorepo (pnpm).

## Docs

Everything is documented on the docs site (`apps/app/app/docs`): docs.resell.store in production, http://localhost:5689/docs locally.

- Guides: selling and buying on resell.store (`/docs/guides/*`)
- API and MCP: the public API reference, recipes, and connecting your own AI (`/docs/api`, `/docs/mcp`)
- Developers: running it locally, how it's structured, deploying to Render, environment variables, and how PayPal, the AI model, Channel3, Kernel and Render are used (`/docs/dev`)

## Apps and packages

- `apps/app` — the main Next.js app: marketing site, the seller app (`app/(app)`, `app/(workspace)`), and the public marketplace (`app/(market)`, store subdomains in `app/store/[store]`)
  - `app/mock/**` keeps the front-end prototype of every designed screen. In dev, the tab on the right edge (or `?view=mock` / `?view=live`) flips any URL between the live screen and its mock
- `@repo/db` — Drizzle schema, migrations and client for Postgres (with pgvector)
- `@repo/ui` — the resell.store design system (from the Paper file "Resell.Store"), built on [Base UI](https://base-ui.com) and Tailwind CSS v4
  - tokens live in `packages/ui/src/styles.css`; import it after `@import "tailwindcss";` in an app's CSS
  - import components as `@repo/ui/button`, `@repo/ui/item-card`, …
  - see every foundation and component at `/design-system` in `apps/app`
- `@repo/email` — [React Email](https://react.email) templates: sign-in link, offer received, offer accepted/countered/declined, sold, shipped, new from a followed shop, the agent's evening summary
  - each template exports a component plus a subject builder; send with `sendEmail({ to, subject, react })` from `apps/app/lib/server/email.ts`
  - preview them all with `pnpm email` (http://localhost:5690). Images in emails come from `apps/app/public/email`
- `@repo/mcp` — the MCP servers (one for running your shops, one for shopping), built on the public API. Hosted by `apps/app` at `/api/mcp` (mcp.resell.store); `pnpm --filter @repo/mcp build` makes `dist/stdio.js` to run one locally with `RESELL_API_KEY`
- `@repo/eslint-config` — shared ESLint configs
- `@repo/typescript-config` — shared `tsconfig.json`s

## Services

- Auth: [Better Auth](https://better-auth.com) on the same Postgres. Email sign-in links (local dev shows the link on the page)
- AI: [AI SDK](https://ai-sdk.dev) with Anthropic; models come from `AI_MODEL` / `AI_MODEL_FAST`
- Product research: [Channel3](https://trychannel3.com/developers)
- Uploads: [Cloudflare R2](https://developers.cloudflare.com/r2/) when `R2_*` is set, else Postgres; always served from `/api/files/{id}`
- Search: Postgres full text plus [Jina](https://jina.ai/embeddings) embeddings in pgvector
- Hosting: [Render](https://render.com), see `render.yaml`. The backend plan is in `docs/backend-plan.md`

## Getting started

```sh
cp apps/app/.env.example apps/app/.env.local   # then fill in the keys
pnpm install
pnpm db:up        # Postgres + pgvector in Docker, on port 5433
pnpm db:migrate
pnpm dev          # http://localhost:5689, stores at {slug}.localhost:5689
```

## Commands

```sh
pnpm dev          # run all apps
pnpm build        # build everything
pnpm lint
pnpm check-types
pnpm db:generate  # new migration after changing packages/db/src/schema.ts
pnpm db:migrate
pnpm db:studio
pnpm email        # preview the email templates at http://localhost:5690
```
