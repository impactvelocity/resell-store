import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { runSweeps } from "../../../../lib/server/sweeps";

/*
 * One pass of every sweep (lib/server/sweeps.ts), in-process. In production
 * the Render Workflow runs them; this is for local dev, demos with
 * PAYOUT_DEMO_MINUTES_PER_DAY, or a host without workflows. Needs
 * `Authorization: Bearer $CRON_SECRET`; in development it runs without one.
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:5689/api/cron/sweep
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const dev = process.env.NODE_ENV === "development";
  if (!dev && (!secret || req.headers.get("authorization") !== `Bearer ${secret}`))
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const result = await runSweeps();
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, ...result });
}
