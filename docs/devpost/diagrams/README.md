# AI flow diagrams

Six PNGs for the Devpost project page, in the app's own look (lemon ground,
Bricolage Grotesque and Figtree, the pink agent sparkle). Each is 2400px wide
(1200px at 2x), and no text is smaller than 19px at 1x, so it stays readable
when Devpost shrinks it to its ~750px column.

| File | Shows | Sponsors on it |
| --- | --- | --- |
| `01-overview.png` | Photo to paid in five steps | Channel3, Kernel, Render, PayPal |
| `02-research.png` | The pricing pipeline: identify, three parallel lookups, price | Channel3, Kernel, Render |
| `03-agents.png` | Q&A agent and negotiator: the code does the maths, the AI words it | PayPal |
| `04-paypal.png` | Money held until it arrives, with the PayPal APIs used at each step | PayPal, Render |
| `05-sidekick.png` | Shopping sidekick: is it worth buying to resell? | Kernel, Channel3 |
| `06-mcp.png` | Bring your own agent over MCP, with its guardrails | Render |

Every claim matches the code as of 2026-10-03 (`lib/server/research.ts`,
`comps.ts`, `store-agent.ts`, `negotiator.ts`, `paypal.ts`, `sweeps.ts`,
`sidekick.ts`, `packages/mcp`). Only wired sponsors appear, and the AI model
isn't named. Keep that true when you edit.

## Rebuild

```bash
node docs/devpost/diagrams/render.mjs
```

Edit `diagrams.html` (one `<section class="board">` per image), then rebuild.
Pass id prefixes (`render.mjs 02 04`) to render only some boards. It needs
Google Chrome and a network connection for the fonts.

## Embed on Devpost

Devpost's markdown needs absolute image URLs. You can upload the PNGs through
the editor's image button, or point at the repo once these files are pushed:

```md
## How it works

![From one photo to paid: snap, price, list, sell, get paid](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/diagrams/01-overview.png)

### How the agent prices an item

![Research pipeline: AI identifies the item, Channel3 and Kernel look it up in parallel, then a fair price](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/diagrams/02-research.png)

### The shop agent sells while you're busy

![Q&A agent answers from the listing's facts; the negotiator counters in code and never accepts on its own](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/diagrams/03-agents.png)

### Buyers only pay for what arrives

![PayPal money flow: Partner Referrals, Orders API with platform fees, delayed disbursement, referenced payouts, run by Render Workflows](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/diagrams/04-paypal.png)

### Is it worth buying to resell?

![Shopping sidekick: Kernel reads the page, Channel3 finds the new price, Kernel checks resale listings, then a score](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/diagrams/05-sidekick.png)

### Bring your own agent

![Any MCP client to the resell.store MCP server and public API, with scoped keys, ask-first, a spending cap and an activity log](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/diagrams/06-mcp.png)
```

The raw URLs only work while the repo is public.
