# Buyer and seller flow diagrams

Images for the Devpost project story, in the landing page's look (lemon ground, Bricolage Grotesque + Figtree, leaf ink, pink for the agent). All four follow the demo video's story: Maya's yellow dutch oven, listed at $185 with a lowest of $160, sold to Jess.

| File | Shows |
|---|---|
| `01-how-a-sale-happens.png` | The whole loop as a sequence: seller, shop agent, buyer, PayPal |
| `02-seller-flow.png` | What the seller does vs what the agent does, photo to payout |
| `03-offers.png` | The negotiator: counter halfway under the lowest, "I'd take it" at or over it |
| `04-buyer-flow.png` | Two ways in (browse or your own AI via MCP), then ask, offer, pay, ship, arrive, review |

The numbers come from the code: `planMove` in `apps/app/lib/server/negotiator.ts` turns $140 into a $165 counter, and the timers come from `apps/app/lib/server/payout-policy.ts`.

## Editing

Edit `src/*.html` (shared styles in `src/diagram.css`), then:

```sh
node docs/devpost/flows/render.mjs        # all
node docs/devpost/flows/render.mjs 03     # one
```

Each page is laid out 800px wide and shot at 2x (1600px PNG), so the smallest text still reads at about 13px in Devpost's ~700px story column.

## Embedding in the Devpost story

Devpost's editor accepts Markdown images. Either upload the PNGs with the editor's image button, or link them from GitHub once they're pushed:

```md
## How a sale happens
![Maya lists her dutch oven, the shop agent answers and haggles with Jess, PayPal holds the money until it arrives](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/flows/01-how-a-sale-happens.png)

## For sellers
![Seller flow: snap a photo, the agent prices and writes the listing, you publish, it runs the shop, you say yes and ship, PayPal pays you when it arrives](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/flows/02-seller-flow.png)

## How the agent haggles
![Offer flow: under the lowest the agent counters halfway; at or over it, it leaves the offer for the seller with a note](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/flows/03-offers.png)

## For buyers
![Buyer flow: browse or send your own AI, ask, buy or offer, pay with PayPal, it ships within 3 days, confirm it arrived, leave a review](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/flows/04-buyer-flow.png)
```
