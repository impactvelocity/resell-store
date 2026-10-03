import { Render } from "@renderinc/sdk";

/*
 * The Render Cron Job (render.yaml, every 15 minutes): starts the sweep
 * tasks on the "resell-sweeps" workflow and exits. Needs RENDER_API_KEY and
 * RENDER_WORKFLOW_SLUG. An idempotency key per quarter hour means a doubled
 * cron run doesn't start a second sweep.
 *
 *   pnpm --filter app sweeps:start
 */

const slug = process.env.RENDER_WORKFLOW_SLUG ?? "resell-sweeps";
const render = new Render();
const slot = Math.floor(Date.now() / (15 * 60 * 1000));

for (const name of ["offerSweep", "orderSweep", "digestSweep", "webhookSweep"]) {
  const run = await render.workflows.startTask(`${slug}/${name}`, [], { idempotencyKey: `${name}-${slot}` });
  console.log(`Started ${slug}/${name}: ${run.taskRunId}`);
}
