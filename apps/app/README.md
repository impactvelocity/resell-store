# app

The main Next.js app: marketing site and SaaS product in one.

- `app/(marketing)` — public website (shows the user's avatar when signed in)
- `app/(auth)` — Clerk sign-in / sign-up at `/sign-in` and `/sign-up`
- `app/(dashboard)` — the product at `/dashboard` (signed-in only)

## Clickable prototype

Every screen from the Paper file "Resell.Store" is built as a front-end-only prototype: mock data, local state, no backend. `/screens` lists them all by artboard code (A1–D4).

- `app/(app)` — screens inside the app shell (sidebar at 900px and up, floating tab bar below)
- `app/(flow)` — sign-up and onboarding, no shell
- `app/(workspace)` — the listing workspace (C1–C8): chat on the left, the listing on the right, a drawer on phones
- `components/shell`, `components/agent-chat`, `components/workspace` — shared pieces from `04 Component specs`
- `lib/mock*.ts` — the prototype's cast and props

## Auth

[Clerk](https://clerk.com) handles authentication. Copy `.env.example` to `.env.local` and fill in the keys.

`proxy.ts` runs `clerkMiddleware()` to load auth state. It does not protect routes on its own:
every protected page or layout must call `await auth.protect()` (from `@clerk/nextjs/server`).

```sh
pnpm dev --filter app
```
