import Link from "next/link";
import { ChevronLeftIcon } from "@repo/ui/icons";
import { FlowBar, roundButton } from "../shops/parts";
import { EmptyState } from "../empty-state";
import { ActionLink, CountTile } from "./parts";
import { things, type SellerSummary } from "./summary";

/*
 * B4 Stats, live, before there's anything to chart. The counts are real
 * (listings by status across every shop); what you made, the weekly chart and
 * where buyers came from wait for sales.
 */

function Counts({ seller }: { seller: SellerSummary }) {
  return (
    <section aria-label="Your listings" className="grid grid-cols-3 gap-3 desk:gap-5">
      <CountTile label="Live now" value={seller.live} />
      <CountTile label="Drafts" value={seller.drafts} />
      <CountTile label="Sold" value={seller.sold} />
    </section>
  );
}

function NoNumbers({ seller }: { seller: SellerSummary }) {
  const hasLive = seller.live > 0;
  return (
    <EmptyState
      art="chart"
      tone={hasLive ? "lemon" : "muted"}
      sticker={hasLive ? "On its way" : "Nothing yet"}
      stickerTone={hasLive ? "secondary" : "accent"}
      title={
        hasLive ? "Your numbers are on their way" : "Stats start with your first listing"
      }
      actions={
        hasLive && seller.shopHref ? (
          <ActionLink href={seller.shopHref}>See your shop</ActionLink>
        ) : (
          <ActionLink href="/list/new">List something</ActionLink>
        )
      }
    >
      {hasLive
        ? `You have ${things(seller.live)} live. What you made each week, what sold and where buyers came from show up here as sales come in.`
        : "Once something's live, what you made, what sold and where buyers came from show up here."}
    </EmptyState>
  );
}

export function StatsEmpty({ seller }: { seller: SellerSummary }) {
  return (
    <>
      {/* ---------- Phone ---------- */}
      <div className="flex flex-col desk:hidden">
        <FlowBar
          left={
            <Link href="/me" aria-label="Back" className={roundButton}>
              <ChevronLeftIcon />
            </Link>
          }
          title="Stats"
        />
        <div className="flex flex-col gap-3 px-4 pt-6 pb-9">
          <Counts seller={seller} />
          <div className="rounded-lg border border-border bg-surface">
            <NoNumbers seller={seller} />
          </div>
        </div>
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden w-full flex-col gap-6 px-12 pt-8 pb-14 desk:flex">
        <h1 className="font-display text-3xl leading-[44px] font-extrabold tracking-tight">
          Stats
        </h1>
        <Counts seller={seller} />
        <div className="rounded-xl border border-border bg-surface px-7">
          <NoNumbers seller={seller} />
        </div>
      </div>
    </>
  );
}
