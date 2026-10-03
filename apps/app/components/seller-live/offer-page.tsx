"use client";

import Link from "next/link";
import { Button } from "@repo/ui/button";
import { CheckIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { MobileBackHeader } from "../shell/page";
import { Breadcrumb, LetterAvatar } from "../offers/offer-parts";
import { useViewer } from "../viewer";
import type { SellerOffer, SellerOrder, TimelineRow } from "./data";
import { money, offerNote, PAYMENT_NOTE, versusLowest } from "./format";
import { AgentAvatar } from "../agent-chat/agent-chat";
import { AgentNote, DepositBadge, OfferActions, OfferTag } from "./parts";

/*
 * C10 Listing / Offer on real data: one buyer's offer, the numbers, the
 * seller's answer and how it went, rebuilt from the offer row.
 */

function Numbers({ offer }: { offer: SellerOffer }) {
  const vs = versusLowest(offer.amountCents, offer.lowestCents);
  const cols = [
    { label: "You're asking", value: offer.askingCents, tone: "text-text" },
    { label: `${offer.buyer.firstName}'s offer`, value: offer.amountCents, tone: "text-secondary" },
    ...(offer.counterCents != null
      ? [{ label: "Your counter", value: offer.counterCents, tone: "text-text" }]
      : [{ label: "Your lowest", value: offer.lowestCents, tone: "text-text" }]),
  ];
  return (
    <div className="flex w-full flex-col gap-[18px] rounded-lg border border-border bg-surface p-6">
      <div className="flex w-full">
        {cols.map((c) => (
          <div key={c.label} className="flex flex-1 flex-col">
            <div className="text-sm font-medium text-text-muted">{c.label}</div>
            <div className={cn("font-display text-2xl font-extrabold tracking-tight", c.tone)}>
              {c.value != null ? money(c.value) : "None"}
            </div>
          </div>
        ))}
      </div>
      {(vs || offer.depositCents) && (
        <div className="flex flex-wrap items-center gap-2">
          {vs && (
            <span
              className={cn(
                "inline-flex h-7 items-center rounded-full px-3 text-sm font-semibold",
                vs.good ? "bg-secondary-soft text-secondary" : "bg-accent-soft text-accent-text",
              )}
            >
              {vs.label}
            </span>
          )}
          {offer.depositCents ? <DepositBadge cents={offer.depositCents} /> : null}
        </div>
      )}
      {offer.note && (
        <div className="flex w-full items-start gap-2.5 rounded-md bg-surface-muted px-4 py-[14px]">
          <LetterAvatar initial={offer.buyer.initial} className="size-7 text-sm" />
          <p className="flex-1 text-base text-text">&ldquo;{offer.note}&rdquo;</p>
        </div>
      )}
      <p className="text-sm text-text-muted">{PAYMENT_NOTE}</p>
    </div>
  );
}

function Decision({ offer, order }: { offer: SellerOffer; order: SellerOrder | null }) {
  const who = offer.buyer.firstName;
  if (offer.status === "open") {
    return (
      <section
        aria-label="Your answer"
        className="flex w-full flex-col gap-4 rounded-lg border-2 border-secondary bg-surface p-6"
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-text">
              {who} offered {money(offer.amountCents)}
            </span>
            <OfferTag status="open" />
          </div>
          <p className="text-base text-text-muted">
            {offer.timeLeft ? `It's open for ${offer.timeLeft.replace(" left", "")} more. ` : ""}
            Accept it, counter somewhere between, or say no.
          </p>
        </div>
        {offer.agentNote && <AgentNote note={offer.agentNote} />}
        <OfferActions offer={offer} />
      </section>
    );
  }

  const sold = offer.status === "paid" || offer.status === "accepted";
  return (
    <section
      aria-label="Where it's at"
      className="flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-6"
    >
      <div className="flex items-start gap-2.5">
        {sold ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
            <CheckIcon size={16} strokeWidth={2.6} />
          </span>
        ) : (
          <LetterAvatar initial={offer.buyer.initial} className="size-8 text-sm" />
        )}
        <div className="flex flex-1 flex-col gap-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-text">
              {offer.status === "paid"
                ? `Sold to ${who} for ${money(order?.itemCents ?? offer.counterCents ?? offer.amountCents)}`
                : offer.status === "accepted"
                  ? `${who} can have it for ${money(offer.counterCents ?? offer.amountCents)}`
                  : offer.status === "countered"
                    ? `Waiting on ${who}`
                    : "This one's done"}
            </span>
            <OfferTag status={offer.status} />
          </div>
          <p className="text-base text-text-muted">{offerNote(offer)}</p>
        </div>
      </div>
      {offer.agentNote && offer.status === "countered" && <AgentNote note={offer.agentNote} />}
      {offer.status === "paid" && (
        <Button variant="secondary" className="w-full" render={<Link href="/sales" />} nativeButton={false}>
          {order?.status === "paid" ? "Ship it" : "See your sales"}
        </Button>
      )}
    </section>
  );
}

function Timeline({ offer, rows, className }: { offer: SellerOffer; rows: TimelineRow[]; className?: string }) {
  const viewer = useViewer();
  const latest = rows.reduce((last, r, i) => (r.amountCents !== undefined ? i : last), -1);
  return (
    <section
      aria-label="How it went"
      className={cn("flex w-full flex-col rounded-lg border border-border bg-surface px-6 py-2", className)}
    >
      <h2 className="pt-4 pb-1 text-base font-bold text-text">How it went</h2>
      <ol className="flex flex-col">
        {rows.map((row, i) => (
          <li key={i} className="flex w-full items-start gap-[14px] border-b border-border py-4 last:border-b-0">
            {row.who === "agent" ? (
              <AgentAvatar />
            ) : row.who === "you" ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-extrabold text-on-primary">
                {viewer.initial}
              </span>
            ) : (
              <LetterAvatar initial={offer.buyer.initial} className="size-8 text-sm" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text">
                    {row.who === "agent" ? "Your agent" : row.who === "you" ? "You" : offer.buyer.firstName}
                  </span>
                  <span className="text-sm text-text-muted">{row.time}</span>
                </div>
                <p className="text-base text-text">{row.text}</p>
              </div>
              {row.depositCents ? <DepositBadge cents={row.depositCents} /> : null}
            </div>
            <div
              className={cn(
                "w-16 shrink-0 text-right font-display text-xl font-extrabold",
                i === latest ? "text-secondary" : "text-text",
              )}
            >
              {row.amountCents !== undefined ? money(row.amountCents) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LiveOfferView({
  offer,
  order,
  timeline,
}: {
  offer: SellerOffer;
  order: SellerOrder | null;
  timeline: TimelineRow[];
}) {
  return (
    <>
      <MobileBackHeader title="Offer" backHref={offer.listing.href} className="h-[52px] pt-0" />
      <div className="flex w-full flex-col gap-4 px-4 pt-3 pb-8 desk:gap-7 desk:px-12 desk:pt-8 desk:pb-14">
        <Breadcrumb
          items={[
            { label: offer.shop.name, href: `/shops/${offer.shop.slug}` },
            { label: offer.listing.title, href: offer.listing.href },
            { label: `Offer from ${offer.buyer.firstName}` },
          ]}
        />
        <div className="flex w-full items-start gap-[14px] desk:items-center desk:gap-4">
          <LetterAvatar initial={offer.buyer.initial} className="size-14 text-xl desk:size-16 desk:text-2xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-1 desk:gap-0.5">
            <h1 className="font-display text-2xl leading-8 font-extrabold tracking-tight text-text desk:text-3xl">
              {offer.buyer.firstName} offered {money(offer.amountCents)}
            </h1>
            <p className="text-sm text-text-muted desk:text-base">
              For{" "}
              <Link href={offer.listing.href} className="font-semibold text-text hover:underline">
                {offer.listing.title}
              </Link>
              , {offer.when}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 desk:gap-6 lg:flex-row lg:items-start">
          <Timeline offer={offer} rows={timeline} className="order-last lg:order-first lg:flex-[1.3]" />
          <div className="flex flex-col gap-4 lg:flex-1">
            <Numbers offer={offer} />
            <Decision offer={offer} order={order} />
          </div>
        </div>
      </div>
    </>
  );
}
