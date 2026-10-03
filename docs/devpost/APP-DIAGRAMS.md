# App diagrams for the Devpost story

Six images that explain the whole app: what it is, the seller app, the marketplace, the emails, how it's built, and where each sponsor is used. Sources are in `src/` (one HTML page each, styled with the app's tokens); `node docs/devpost/src/render.mjs` rebuilds `images/`.

The block below is ready to paste into the Devpost story. The links point at `main` on GitHub, so they work once this folder is pushed. You can also drag each PNG into Devpost's editor, which hosts it for you.

---

## The whole app on one page

![resell.store overview: the seller app, the marketplace, and the API and MCP servers, with PayPal under every sale](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/images/01-overview.png)

## The seller app

![The seller app: a five-step listing workspace with the agent chatting beside it, plus home, shops, stats, inbox, offers, sales and tools](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/images/02-seller-app.png)

## The marketplace

![The marketplace: search by meaning, every shop on its own address, and ask, offer, buy or keep on every listing](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/images/03-marketplace.png)

## The emails

![The emails: what the seller and the buyer get at each step of a sale, from new offer to paid out](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/images/04-emails.png)

## Under the hood

![Architecture: one Next.js app on Render routing by host, Postgres with pgvector, a Render Workflow for timed jobs, and the services it talks to](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/images/05-architecture.png)

## Where each sponsor does its work

![Sponsor map: where PayPal, Channel3, Kernel and Render are used across listing, shops, checkout, after the sale, the sidekick and timed jobs](https://raw.githubusercontent.com/impactvelocity/resell-store/main/docs/devpost/images/06-sponsors.png)
