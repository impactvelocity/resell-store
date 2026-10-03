import { NextResponse } from "next/server";
import { getOwnedListing } from "../../../../../lib/server/listings";
import { latestRun } from "../../../../../lib/server/research";
import { getSession } from "../../../../../lib/server/session";

/** Polled by C2 while research runs: the tool rows, then the findings. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const row = await getOwnedListing(session.user.id, (await params).id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const run = await latestRun(row.listing.id);
  return NextResponse.json({
    run: run && { id: run.id, status: run.status, steps: run.steps },
    listing: {
      name: row.listing.name,
      fields: row.listing.fields,
      findings: row.listing.findings,
      priceCents: row.listing.priceCents,
      lowestCents: row.listing.lowestCents,
    },
  });
}
