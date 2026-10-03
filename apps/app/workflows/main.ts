import { task, type TaskContext } from "@renderinc/sdk/workflows";
import {
  cancelUnshipped,
  checkArrivals,
  dueCancellations,
  dueReleases,
  escalateQuiet,
  expireOffers,
  releaseDue,
  remindOffers,
  remindShipping,
  runDigests,
  webhookSweep,
} from "../lib/server/sweeps";

/*
 * The Render Workflow service ("resell-sweeps" in render.yaml): the timed
 * side of offers and orders, from lib/server/sweeps.ts. A Render Cron Job
 * (scripts/start-sweeps.ts) starts offerSweep, orderSweep, digestSweep and
 * webhookSweep every 15 minutes. Money moves in their own small tasks, one per order, so a PayPal
 * hiccup retries that order alone with backoff.
 *
 * Start: `pnpm --filter app workflows` (Render runs the same; locally wrap it
 * in `render workflows dev -- …`).
 */

const sweepRetry = { maxRetries: 2, waitDurationMs: 30_000, backoffScaling: 2 };
const moneyRetry = { maxRetries: 6, waitDurationMs: 60_000, backoffScaling: 2 };

/** Pays the seller for one order whose check window has closed. */
export const releaseOrderTask = task(
  { name: "releaseOrder", retry: moneyRetry, timeoutSeconds: 120 },
  async function releaseOrder(_ctx: TaskContext, orderId: string) {
    return { orderId, released: await releaseDue(orderId) };
  },
);

/** Calls off one order that never shipped and refunds the buyer. */
export const cancelOrderTask = task(
  { name: "cancelUnshipped", retry: moneyRetry, timeoutSeconds: 120 },
  async function cancelUnshippedOrder(_ctx: TaskContext, orderId: string) {
    return { orderId, cancelled: await cancelUnshipped(orderId) };
  },
);

/** Expire lapsed offers, remind whoever's turn it is before one runs out. */
export const offerSweep = task(
  { name: "offerSweep", retry: sweepRetry, timeoutSeconds: 600 },
  async function offerSweep() {
    const expired = await expireOffers();
    const reminded = await remindOffers();
    return { expired, reminded };
  },
);

/** Follower digests, the seller's evening agent summary, review requests. */
export const digestSweep = task(
  { name: "digestSweep", retry: sweepRetry, timeoutSeconds: 1800 },
  async function digestSweep() {
    return runDigests();
  },
);

/** Try failed webhook deliveries again; clear out old API activity. */
export const webhookSweepTask = task(
  { name: "webhookSweep", retry: sweepRetry, timeoutSeconds: 900 },
  async function webhookSweepRun() {
    return webhookSweep();
  },
);

/**
 * Ship reminders, arrival checks and stepping in on quiet problems here;
 * cancellations and releases fanned out to their own tasks.
 */
export const orderSweep = task(
  { name: "orderSweep", retry: sweepRetry, timeoutSeconds: 1800 },
  async function orderSweep(ctx: TaskContext) {
    const shipReminders = await remindShipping();
    const arrivalChecks = await checkArrivals();
    const escalated = await escalateQuiet();
    const [cancel, release] = await Promise.all([dueCancellations(), dueReleases()]);
    const outcomes = await Promise.allSettled([
      ...cancel.map((id) => ctx.run(cancelOrderTask, id)),
      ...release.map((id) => ctx.run(releaseOrderTask, id)),
    ]);
    const failed = outcomes.filter((o) => o.status === "rejected").length;
    return { shipReminders, arrivalChecks, escalated, cancellations: cancel.length, releases: release.length, failed };
  },
);
