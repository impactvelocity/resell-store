"use client";

import Link from "next/link";
import { Button } from "@repo/ui/button";
import { CheckIcon, SparkleIcon, TruckIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { shops, visibilityLabel, type Shop } from "../../lib/mock";
import { earnings, jessOffer, shipTask } from "../../lib/mock-home";
import { ShopTile } from "./illustrations";
import { Pill, SectionHeader, SidekickPromo } from "./parts";

/* A3 Home (selling). */

export type SellingState = {
  offerAccepted: boolean;
  onAcceptOffer: () => void;
};

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function VisibilityPill({ shop }: { shop: Shop }) {
  const tone =
    shop.visibility === "public"
      ? "secondary"
      : shop.visibility === "link"
        ? "primary"
        : "muted";
  return (
    <Pill tone={tone} dot={shop.visibility === "public"}>
      {visibilityLabel[shop.visibility]}
    </Pill>
  );
}

function shopSummary(shop: Shop) {
  if (shop.visibility === "private" && shop.live === 0) {
    return `Not open yet, ${plural(shop.drafts, "draft")}`;
  }
  const extra =
    shop.offers > 0
      ? `, ${shop.offers} offers waiting`
      : shop.drafts > 0
        ? `, ${plural(shop.drafts, "draft")}`
        : "";
  return `${shop.live} live${extra}`;
}

/** Up to three numbers for a shop card: live, offers or drafts, this week. */
function shopStats(shop: Shop) {
  const stats: { value: string; label: string }[] = [
    { value: String(shop.live), label: "live" },
  ];
  if (shop.offers > 0) {
    stats.push({ value: String(shop.offers), label: "offers" });
  } else if (shop.drafts > 0) {
    stats.push({
      value: String(shop.drafts),
      label: shop.drafts === 1 ? "draft" : "drafts",
    });
  }
  if (shop.thisWeek > 0) {
    stats.push({ value: `$${shop.thisWeek}`, label: "this week" });
  }
  return stats;
}

function EarningsFigure() {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-display text-5xl font-extrabold tracking-tight">
        ${earnings.thisWeek}
      </span>
      <span className="text-base font-medium text-text-muted">
        from {earnings.sales} sales
      </span>
    </div>
  );
}

function Eyebrow() {
  return (
    <div className="text-sm font-semibold tracking-wide text-text-muted uppercase">
      You made this week
    </div>
  );
}

function AgentBadge({ size }: { size: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent text-text",
        size === "sm" ? "size-8" : "size-10",
      )}
    >
      <SparkleIcon size={size === "sm" ? 16 : 18} />
    </span>
  );
}

function OfferActions({ accepted, onAccept }: { accepted: boolean; onAccept: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {accepted ? (
        <span className="inline-flex h-11 items-center gap-2 rounded-full bg-secondary-soft px-5 text-sm font-bold text-secondary">
          <CheckIcon size={16} strokeWidth={2.8} />
          Accepted ${jessOffer.amount}
        </span>
      ) : (
        <Button variant="secondary" size="md" onClick={onAccept}>
          Accept ${jessOffer.amount}
        </Button>
      )}
      <Button
        variant="ghost"
        size="md"
        render={<Link href={`/offers/${jessOffer.id}`} />}
        nativeButton={false}
      >
        See the offer
      </Button>
    </div>
  );
}

const offerTitle = `${jessOffer.buyer} offered $${jessOffer.amount} for ${jessOffer.item}`;

/* ---------- Phone ---------- */

function ShopRow({ shop }: { shop: Shop }) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-[14px] transition-colors hover:bg-surface-muted"
    >
      <ShopTile shop={shop} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-bold">{shop.name}</span>
        <span className="truncate text-sm text-text-muted">
          {shopSummary(shop)}
        </span>
      </span>
      <VisibilityPill shop={shop} />
    </Link>
  );
}

function AgentPromo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-secondary p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-on-secondary">
          Let your own AI run the shop
        </h2>
        <p className="text-base text-leaf-100">
          Connect Claude or ChatGPT and it can list things, answer buyers, and
          tell you how sales are going.
        </p>
      </div>
      <Button
        size="md"
        className="w-fit"
        render={<Link href="/tools/agent" />}
        nativeButton={false}
      >
        Connect your agent
      </Button>
    </div>
  );
}

export function SellingPhone({ offerAccepted, onAcceptOffer }: SellingState) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-5 px-4 pt-7">
        <Link href="/sales" className="flex flex-col gap-1 px-1">
          <Eyebrow />
          <EarningsFigure />
        </Link>
        <Button
          className="h-[60px] w-full px-7"
          render={<Link href="/list/new" />}
          nativeButton={false}
        >
          <SparkleIcon size={20} />
          List something new
        </Button>
      </div>

      <div className="px-4 pt-5">
        <div className="flex flex-col gap-[14px] rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2.5">
            <AgentBadge size="sm" />
            <span className="min-w-0 flex-1 text-sm font-semibold text-accent-text">
              {jessOffer.meta}
            </span>
            <Pill tone="secondary">${jessOffer.hold} hold paid</Pill>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg leading-6 font-bold">{offerTitle}</h2>
            <p className="text-base text-text-muted">{jessOffer.note}</p>
          </div>
          <OfferActions accepted={offerAccepted} onAccept={onAcceptOffer} />
        </div>
      </div>

      <section className="flex flex-col gap-3 px-4 pt-8">
        <SectionHeader
          title="Your shops"
          href="/shops/new"
          action="New shop"
          className="px-1"
        />
        {shops.map((shop) => (
          <ShopRow key={shop.slug} shop={shop} />
        ))}
      </section>

      <div className="flex flex-col gap-3 px-4 pt-8">
        <AgentPromo />
        <SidekickPromo />
      </div>
    </div>
  );
}

/* ---------- Desktop ---------- */

function ShopCard({ shop }: { shop: Shop }) {
  const stats = shopStats(shop);
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="flex min-w-0 flex-1 flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-text-muted/40 hover:bg-surface-muted/40"
    >
      <span className="flex w-full items-center gap-3">
        <ShopTile shop={shop} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-bold">{shop.shortName}</span>
          {shop.visibility === "private" ? (
            <span className="truncate text-sm font-medium text-text-muted">
              Not open yet
            </span>
          ) : (
            <span className="truncate text-sm font-medium text-secondary">
              {shop.domain}
            </span>
          )}
        </span>
        <VisibilityPill shop={shop} />
      </span>
      <span className="grid w-full grid-cols-3 border-t border-border pt-[14px]">
        {stats.map((stat) => (
          <span key={stat.label} className="flex flex-col">
            <span className="font-display text-xl font-extrabold">
              {stat.value}
            </span>
            <span className="text-sm font-medium text-text-muted">
              {stat.label}
            </span>
          </span>
        ))}
      </span>
    </Link>
  );
}

export function SellingDesktop({
  offerAccepted,
  onAcceptOffer,
}: SellingState) {
  const toast = useToast();
  return (
    <>
      <div className="flex flex-col gap-4 xl:flex-row">
        <Link
          href="/sales"
          className="group flex min-w-0 flex-col justify-between gap-6 rounded-xl xl:flex-1 border border-border bg-surface p-7 transition-colors hover:bg-surface-muted/40"
        >
          <span className="flex flex-col gap-1.5">
            <Eyebrow />
            <EarningsFigure />
          </span>
          <span className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <span className="text-sm font-medium text-text-muted">
              ${earnings.payout} lands in your PayPal on {earnings.payoutDay}
            </span>
            <span className="text-sm font-bold text-secondary group-hover:underline">
              See sales
            </span>
          </span>
        </Link>

        <div className="flex min-w-0 grow-[1.4] basis-auto flex-col rounded-xl border xl:basis-0 border-border bg-surface px-6 py-2">
          <div className="flex w-full items-start gap-[14px] border-b border-border py-[18px]">
            <AgentBadge size="md" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h2 className="text-lg leading-6 font-bold">{offerTitle}</h2>
                  <Pill tone="secondary">${jessOffer.hold} hold paid</Pill>
                </div>
                <p className="text-base text-text-muted">{jessOffer.note}</p>
              </div>
              <OfferActions accepted={offerAccepted} onAccept={onAcceptOffer} />
            </div>
          </div>
          <div className="flex w-full items-center gap-[14px] py-[18px]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
              <TruckIcon size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="text-base font-bold">{shipTask.title}</div>
              <div className="text-sm text-text-muted">{shipTask.detail}</div>
            </div>
            <Button
              variant="soft"
              size="md"
              onClick={() =>
                toast.add({ title: "Label ready. Print it and tape it on." })
              }
            >
              Get the label
            </Button>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-[14px]">
        <SectionHeader title="Your shops" href="/shops/new" action="New shop" />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {shops.map((shop) => (
            <ShopCard key={shop.slug} shop={shop} />
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row">
        <AgentPromo className="min-w-0 lg:grow-[1.4] lg:basis-0" />
        <SidekickPromo className="min-w-0 lg:flex-1" />
      </div>
    </>
  );
}
