# Resell Store

Turborepo monorepo (pnpm).

## Apps and packages

- `apps/app` — the main Next.js app: marketing site (`app/(marketing)`) and SaaS product (`app/(dashboard)`)
- `@repo/ui` — the resell.store design system (from the Paper file "Resell.Store"), built on [Base UI](https://base-ui.com) and Tailwind CSS v4
  - tokens live in `packages/ui/src/styles.css`; import it after `@import "tailwindcss";` in an app's CSS
  - import components as `@repo/ui/button`, `@repo/ui/item-card`, …
  - see every foundation and component at `/design-system` in `apps/app`
- `@repo/eslint-config` — shared ESLint configs
- `@repo/typescript-config` — shared `tsconfig.json`s

## Commands

```sh
pnpm dev          # run all apps
pnpm build        # build everything
pnpm lint
pnpm check-types
```
