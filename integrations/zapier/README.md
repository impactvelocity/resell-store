# resell.store on Zapier

A [Zapier Platform CLI](https://docs.zapier.com/platform/build-cli/overview) app that starts a Zap when something happens on a seller's shops. There's one trigger per webhook event, and each is a REST hook on the public API, so Zaps fire straight away with no polling.

| Trigger | Event | Fires when |
| --- | --- | --- |
| New Sale | `listing.sold` | Something sells |
| New Offer | `offer.received` | A buyer makes an offer |
| Updated Offer | `offer.updated` | A buyer takes a counter, turns it down or withdraws |
| New Buyer Message | `question.asked` | A buyer messages a shop |
| Order Completed | `order.completed` | A buyer says it arrived and it's all good |
| Problem Reported | `order.problem` | A buyer reports a problem |
| Order Refunded | `order.refunded` | An order is cancelled or refunded |
| Payout Sent | `payout.sent` | The money goes to the seller's PayPal |
| New Review | `review.created` | A buyer leaves a review |

Every trigger has an optional **Shop** field, so a seller with several shops can start a Zap for just one of them.

## How it works

- **Sign in.** The seller pastes their secret key from resell.store/tools/api (`rs_live_…`). Zapier tests it with `GET /v1/me` and names the connection after the account.
- **Turning a Zap on** calls `POST /v1/webhooks/subscriptions` with the Zap's hook address and the trigger's one event. resell.store keeps it as a `webhook_subscription` with `source = "zapier"`, and it shows under **Start a Zap** on /tools/api.
- **When the event happens**, resell.store POSTs the signed event to that address, the same body a webhook gets. `perform` flattens it into one record: the object's fields, plus `event_type`, `event_id`, `event_created_at` and `test`.
- **Testing the trigger** in the Zap editor calls `GET /v1/webhooks/samples/:event`. That returns the seller's own latest matching things, or a made-up one if they have none yet.
- **Turning the Zap off** calls `DELETE /v1/webhooks/subscriptions/:id`. If the seller already removed it on resell.store, the 404 is ignored. And if a Zap's address ever answers 410 Gone, resell.store deletes the subscription itself.

Every request sends `resell-client: Zapier`, so the seller's activity log says Zapier did it.

## Work on it

It's a standalone npm package, not part of the pnpm workspace, because Zapier builds it with npm.

```bash
cd integrations/zapier
npm install
npm test
npx zapier-platform-cli validate --without-style
```

The tests fake `z.request`, so they need no network. They check the app against Zapier's schema and check that each trigger subscribes, unsubscribes, unwraps events and lists samples the way the API expects. apps/app also has a test (`lib/server/api/webhook-subscriptions.test.ts`) that fails if `lib/events.js` is missing a webhook event. When you add an event to the API, add a line there too.

## Put it on Zapier

You need a Zapier account and the CLI (`npm i -g zapier-platform-cli`).

```bash
zapier login
zapier register "resell.store"   # once; writes .zapierapprc, which you commit
zapier push                       # uploads this version as a private app
```

To point a version at somewhere other than production (staging, or a tunnel to your machine), set `RESELL_API_BASE`:

```bash
zapier env:set 1.0.0 RESELL_API_BASE=https://your-tunnel.example.com/api/v1
```

Then share it:

1. In the [Zapier developer platform](https://developer.zapier.com), open the app, go to **Manage → Sharing**, and copy the public invite link.
2. Set `ZAPIER_APP_URL` to that link on the web service (Render). /tools/api then shows **Connect on Zapier**. Without it, the card only offers the Webhooks by Zapier route.
3. To list it in Zapier's directory for everyone, follow Zapier's [publishing requirements](https://docs.zapier.com/platform/publish/integration-publishing-requirements). That needs a few live users and their review.

To release a change, bump `version` in package.json, run `zapier push`, then `zapier migrate <old> <new>` to move existing Zaps over.
