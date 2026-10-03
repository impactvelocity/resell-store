import type { Metadata } from "next";
import { ActionLink } from "../../../../components/empty/parts";
import { ComingSoon, SoonCard, Steps } from "../../../../components/empty/coming-soon";
import { ago } from "../../../../components/seller-live/data";
import { LiveSidekickScreen, type LiveCheck } from "../../../../components/tools/sidekick-live";
import { requireUser } from "../../../../lib/server/session";
import { checkScore, listChecks, sidekickReady, type CheckRow } from "../../../../lib/server/sidekick";

export const metadata: Metadata = { title: "Shopping sidekick · resell.store" };

/*
 * D4 Shopping sidekick, live: checks run through lib/server/sidekick.ts.
 * Without Kernel and an AI key it can't check anything, so it stays the
 * "soon" page, pointing at the research step that does work.
 */

function toLive(row: CheckRow): LiveCheck {
  const score = checkScore(row);
  const comps = row.comps;
  const sites = comps?.sites.filter((s) => s.ok).map((s) => s.label) ?? [];
  return {
    id: row.id,
    query: row.query,
    name: row.name,
    status: row.status,
    error: row.error,
    bought: row.bought,
    ago: ago(row.createdAt),
    costCents: row.retailCents,
    costSource: row.retailSource,
    sellsForCents: score.sellsForCents,
    sellsForLowCents: comps?.sellsForLowCents ?? null,
    sellsForHighCents: comps?.sellsForHighCents ?? null,
    listedMedianCents: comps?.listedMedianCents ?? null,
    ratio: score.ratio,
    verdict: score.verdict,
    netCostCents: score.netCostCents,
    confidence: comps?.confidence ?? null,
    notes: comps?.notes ?? null,
    looked: comps?.looked ?? 0,
    sitesLine: comps ? `Read ${comps.looked} listings on ${sites.join(", ") || "no sites"}, kept ${comps.listings.length} that match` : null,
    image: comps?.listings.find((l) => l.image)?.image ?? null,
    listings: comps?.listings ?? [],
  };
}

export default async function Page() {
  if (sidekickReady) {
    const user = await requireUser();
    const checks = await listChecks(user.id);
    return <LiveSidekickScreen checks={checks.map(toLive)} />;
  }
  return (
    <ComingSoon
      mobileTitle="Shopping sidekick"
      tone="lemon"
      art="payout"
      eyebrow="Shopping sidekick"
      title="Know what it's worth before you buy it"
      description="Two dresses, same price. One sells on for $70, the other for $25. Your sidekick tells you which before you pay."
    >
      <Steps
        steps={[
          {
            title: "Show it what you're eyeing",
            body: "A photo of the tag, a link, or just the name.",
          },
          {
            title: "See what it sells on for",
            body: "Based on what the same thing really sold for, used.",
          },
          {
            title: "Sell it later in one tap",
            body: "It's already looked up, so the listing is half written.",
          },
        ]}
      />
      <div className="flex flex-col gap-4 desk:flex-row desk:gap-6">
        <SoonCard
          title="Take it shopping"
          description="Add the sidekick to your home screen so it's one tap away in the shop."
          className="pb-5 desk:flex-1 desk:pb-6"
        />
        <SoonCard
          title="Already own it?"
          description="Start a listing and we'll look up what it sells for, used. That part works today."
          className="pb-5 desk:flex-1 desk:pb-6"
        >
          <ActionLink href="/list/new" className="w-full min-[420px]:w-fit">
            Look something up
          </ActionLink>
        </SoonCard>
      </div>
    </ComingSoon>
  );
}
