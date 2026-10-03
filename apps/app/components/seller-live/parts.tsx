"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, IconButton } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { LockIcon, PlusIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { answerOffer, shipOrder } from "../../app/actions/commerce";
import type { OfferStatus, OrderStatus } from "../../lib/server/commerce";
import { AgentAvatar } from "../agent-chat/agent-chat";
import { ConfirmDialog, LetterAvatar } from "../offers/offer-parts";
import type { SellerOffer, SellerOrder } from "./data";
import { counterRange, money, offerNote, PAYMENT_NOTE, versusAsking, versusLowest } from "./format";

/*
 * The seller's offer card, offer rows, counter stepper and "mark shipped" form
 * on real data (C9, C10, A5, B5, Home). Same look as components/offers, wired
 * to the commerce actions. Wherever money is mentioned, PaymentNote says how
 * it moves (PayPal holds it, or a test checkout without PayPal keys).
 */

export function PaymentNote({ className }: { className?: string }) {
  return <p className={cn("text-sm text-text-muted", className)}>{PAYMENT_NOTE}</p>;
}

/* ---------- Tags ---------- */

const offerTags: Record<OfferStatus, { label: string; className: string }> = {
  open: { label: "Needs you", className: "bg-accent-soft text-accent-text" },
  countered: { label: "Countered", className: "bg-primary-soft text-text" },
  accepted: { label: "Accepted", className: "bg-secondary-soft text-secondary" },
  paid: { label: "Paid", className: "bg-secondary text-on-secondary" },
  declined: { label: "Declined", className: "bg-surface-muted text-text-muted" },
  withdrawn: { label: "Withdrawn", className: "bg-surface-muted text-text-muted" },
  expired: { label: "Ran out", className: "bg-surface-muted text-text-muted" },
};

export function OfferTag({ status, className }: { status: OfferStatus; className?: string }) {
  const tag = offerTags[status];
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        tag.className,
        className,
      )}
    >
      {tag.label}
    </span>
  );
}

const orderTags: Record<OrderStatus, { label: string; className: string }> = {
  paid: { label: "To ship", className: "bg-primary-soft text-text" },
  shipped: { label: "On the way", className: "bg-surface-muted text-text" },
  delivered: { label: "Delivered", className: "bg-secondary-soft text-secondary" },
  completed: { label: "Paid out (test)", className: "bg-secondary-soft text-secondary" },
  refunded: { label: "Refunded", className: "bg-surface-muted text-text-muted" },
  cancelled: { label: "Cancelled", className: "bg-surface-muted text-text-muted" },
};

export function OrderTag({ status, className }: { status: OrderStatus; className?: string }) {
  const tag = orderTags[status];
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        tag.className,
        className,
      )}
    >
      {tag.label}
    </span>
  );
}

/** A sale with a live problem: shown instead of its OrderTag until it's sorted. */
export function ProblemTag({ problem, className }: { problem: "open" | "escalated"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full bg-accent-soft px-3 text-sm font-semibold whitespace-nowrap text-accent-text",
        className,
      )}
    >
      {problem === "escalated" ? "With resell.store" : "Problem"}
    </span>
  );
}

/** The sale's tag: its problem while there's a live one, otherwise where the order's at. */
export function SaleTag({ order, className }: { order: Pick<SellerOrder, "status" | "problem">; className?: string }) {
  return order.problem ? (
    <ProblemTag problem={order.problem} className={className} />
  ) : (
    <OrderTag status={order.status} className={className} />
  );
}

/** "$20 down (test)": the buyer's deposit, which isn't charged yet. */
export function DepositBadge({ cents, className }: { cents: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-fit shrink-0 items-center gap-1.5 rounded-full bg-secondary-soft pr-3 pl-2 text-sm font-semibold whitespace-nowrap text-secondary",
        className,
      )}
    >
      <LockIcon size={16} strokeWidth={2.4} />
      {money(cents)} down (test)
    </span>
  );
}

/* ---------- Actions ---------- */

/** Accept, decline or counter with a toast either way. The page refreshes itself. */
export function useAnswerOffer(offer: Pick<SellerOffer, "id" | "buyer">) {
  const toast = useToast();
  const [pending, start] = useTransition();
  function answer(action: "accept" | "decline" | "counter", counter?: number) {
    start(async () => {
      try {
        const result = await answerOffer({ offerId: offer.id, action, counter });
        if (!result.ok) {
          toast.add({ title: result.error });
          return;
        }
        const who = offer.buyer.firstName;
        toast.add({
          title:
            action === "accept"
              ? `Accepted. ${who} has 48 hours to pay.`
              : action === "counter"
                ? `Sent $${counter} to ${who}.`
                : `Declined. We'll let ${who} know.`,
        });
      } catch {
        toast.add({ title: "That didn't work. Try again?" });
      }
    });
  }
  return { pending, answer };
}

function MinusGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
      <path d="M5 12h14" />
    </svg>
  );
}

/** Counter: a whole-dollar stepper between their offer and your price. */
export function CounterStepper({
  buyer,
  range,
  pending,
  onSend,
  onCancel,
  className,
}: {
  buyer: string;
  range: { min: number; max: number; start: number; step: number };
  pending?: boolean;
  onSend: (dollars: number) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [value, setValue] = useState(range.start);
  const { min, max, step } = range;
  return (
    <div className={cn("flex flex-col gap-3 rounded-md bg-surface-muted p-4", className)}>
      <div className="text-sm font-semibold text-text">Ask {buyer} for</div>
      <div className="flex items-center gap-3">
        <IconButton
          aria-label={`$${step} less`}
          size="sm"
          disabled={value <= min}
          onClick={() => setValue((v) => Math.max(min, v - step))}
        >
          <MinusGlyph />
        </IconButton>
        <output aria-live="polite" className="min-w-[4ch] text-center font-display text-3xl font-extrabold tracking-tight">
          ${value}
        </output>
        <IconButton
          aria-label={`$${step} more`}
          size="sm"
          disabled={value >= max}
          onClick={() => setValue((v) => Math.min(max, v + step))}
        >
          <PlusIcon size={18} strokeWidth={2.4} />
        </IconButton>
      </div>
      <p className="text-sm text-text-muted">
        Anywhere from ${min} to ${max}. {buyer} gets 48 hours to take it.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="md" disabled={pending} onClick={() => onSend(value)}>
          Send ${value}
        </Button>
        <Button variant="ghost" size="md" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Accept / Counter / Decline, with the counter stepper and the accept check. */
export function OfferActions({
  offer,
  detailHref,
  className,
}: {
  offer: SellerOffer;
  /** "See the offer", on cards that aren't the offer page. */
  detailHref?: string;
  className?: string;
}) {
  const { pending, answer } = useAnswerOffer(offer);
  const [confirming, setConfirming] = useState(false);
  const [countering, setCountering] = useState(false);
  const range = counterRange(offer);
  const who = offer.buyer.firstName;

  return (
    <div className={className}>
      {countering && range ? (
        <CounterStepper
          buyer={who}
          range={range}
          pending={pending}
          onSend={(dollars) => {
            setCountering(false);
            answer("counter", dollars);
          }}
          onCancel={() => setCountering(false)}
          className="bg-background"
        />
      ) : (
        <div className="flex flex-col gap-[14px] desk:flex-row desk:flex-wrap desk:items-center desk:gap-2">
          <Button
            variant="secondary"
            className="h-[52px] w-full desk:w-auto"
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            Accept {money(offer.amountCents)}
          </Button>
          <div className="flex gap-2 desk:contents">
            {range && (
              <Button
                variant="soft"
                className="h-12 flex-1 px-6 desk:h-[52px] desk:flex-none"
                disabled={pending}
                onClick={() => setCountering(true)}
              >
                Counter
              </Button>
            )}
            <Button
              variant="ghost"
              className="h-12 flex-1 text-danger hover:bg-accent-soft/50 desk:h-[52px] desk:flex-none"
              disabled={pending}
              onClick={() => answer("decline")}
            >
              Decline
            </Button>
          </div>
          {detailHref && (
            <>
              <div className="hidden flex-1 desk:block" />
              <Link
                href={detailHref}
                className="text-center text-sm font-bold whitespace-nowrap text-secondary hover:underline"
              >
                See the offer
              </Link>
            </>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Sell it to ${who} for ${money(offer.amountCents)}?`}
        description={`${who} gets 48 hours to pay. Once they do, it's sold and any other offers are declined. ${PAYMENT_NOTE}`}
        confirm="Accept"
        onConfirm={() => answer("accept")}
      />
    </div>
  );
}

/* ---------- Offer card (needs you) and row (everything else) ---------- */

/** What the shop's agent made of an offer, said to the seller only. */
export function AgentNote({ note }: { note: string }) {
  return (
    <div className="flex w-full items-start gap-2.5">
      <AgentAvatar size="sm" />
      <p className="flex-1 pt-0.5 text-sm text-text">
        <span className="font-bold">Your agent: </span>
        {note}
      </p>
    </div>
  );
}

/** One open offer: who, how much, against your price and lowest, and what to do. */
export function OfferCard({
  offer,
  showListing = false,
  detailHref,
  className,
}: {
  offer: SellerOffer;
  /** In the inbox and on Home, say which listing it's for. */
  showListing?: boolean;
  detailHref?: string;
  className?: string;
}) {
  const vs = versusLowest(offer.amountCents, offer.lowestCents);
  const asking = versusAsking(offer.amountCents, offer.askingCents);
  return (
    <article
      aria-label={`Offer from ${offer.buyer.firstName}`}
      className={cn(
        "flex w-full flex-col gap-[14px] rounded-lg border-2 border-secondary bg-surface p-[18px] desk:gap-4 desk:p-6",
        className,
      )}
    >
      <div className="flex w-full items-center gap-3 desk:gap-[14px]">
        <LetterAvatar initial={offer.buyer.initial} className="size-11 desk:size-12 desk:text-xl" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="truncate text-base font-bold text-text">
            {offer.buyer.firstName}
            {showListing && <span className="font-semibold text-text-muted"> on {offer.listing.title}</span>}
          </div>
          <div className="text-sm text-text-muted">
            {offer.when}
            {offer.timeLeft && `, ${offer.timeLeft}`}
          </div>
        </div>
        <div className="hidden items-center gap-[14px] desk:flex">
          {offer.depositCents ? <DepositBadge cents={offer.depositCents} /> : null}
          <div className="font-display text-3xl font-extrabold tracking-tight">{money(offer.amountCents)}</div>
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-3 desk:hidden">
        <div className="font-display text-3xl font-extrabold tracking-tight">{money(offer.amountCents)}</div>
        {offer.depositCents ? <DepositBadge cents={offer.depositCents} className="px-3" /> : null}
      </div>

      <div className="flex w-full flex-col gap-2 rounded-md bg-surface-muted p-[14px] desk:px-4">
        <div className="flex flex-wrap items-center gap-2">
          {vs && (
            <span
              className={cn(
                "inline-flex h-7 items-center rounded-full px-3 text-sm font-semibold",
                vs.good ? "bg-secondary-soft text-secondary" : "bg-accent-soft text-accent-text",
              )}
            >
              {vs.label}
              {offer.lowestCents != null && ` (${money(offer.lowestCents)})`}
            </span>
          )}
          {asking && <span className="text-sm font-medium text-text-muted">{asking}</span>}
        </div>
        {offer.note && <p className="text-base text-text">&ldquo;{offer.note}&rdquo;</p>}
      </div>

      {offer.agentNote && <AgentNote note={offer.agentNote} />}
      <OfferActions offer={offer} detailHref={detailHref} />
    </article>
  );
}

export function OfferRow({
  offer,
  href,
  showListing = false,
}: {
  offer: SellerOffer;
  href?: string;
  showListing?: boolean;
}) {
  const body = (
    <>
      <LetterAvatar initial={offer.buyer.initial} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="text-base font-semibold text-text">
          {offer.buyer.firstName} offered {money(offer.amountCents)}
          {showListing && <span className="text-text-muted"> for {offer.listing.title}</span>}
        </div>
        <div className="text-sm text-text-muted">{offerNote(offer)}</div>
      </div>
      <div className="flex w-24 shrink-0 items-center justify-end">
        <OfferTag status={offer.status} />
      </div>
    </>
  );
  return (
    <li className="flex items-center gap-2 border-b border-border last:border-b-0">
      {href ? (
        <Link
          href={href}
          className="-mx-2 flex min-w-0 flex-1 items-center gap-[14px] rounded-md px-2 py-4 transition-colors hover:bg-surface-muted/60"
        >
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-[14px] py-4">{body}</div>
      )}
    </li>
  );
}

/** Open offers as full cards, the rest as rows with their outcome. */
export function OfferList({ offers }: { offers: SellerOffer[] }) {
  const cards = offers.filter((o) => o.status === "open");
  const rows = offers.filter((o) => o.status !== "open");
  return (
    <div className="flex flex-col gap-3">
      {cards.map((offer) => (
        <OfferCard key={offer.id} offer={offer} detailHref={`/offers/${offer.id}`} />
      ))}
      {rows.length > 0 && (
        <ul className="flex w-full flex-col rounded-lg border border-border bg-surface px-6 py-0.5">
          {rows.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              href={`/offers/${offer.id}`}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Shipping ---------- */

/** "I've shipped it", with an optional tracking number. */
export function ShipForm({ order, className }: { order: SellerOrder; className?: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState("");

  function send() {
    start(async () => {
      try {
        const result = await shipOrder({ orderId: order.id, trackingNumber: tracking.trim() || null });
        if (!result.ok) {
          toast.add({ title: result.error });
          return;
        }
        setOpen(false);
        toast.add({ title: `Marked as shipped. We'll let ${order.buyer.firstName} know.` });
      } catch {
        toast.add({ title: "That didn't work. Try again?" });
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary transition-colors hover:bg-lemon-300",
          className,
        )}
      >
        I&apos;ve shipped it
      </button>
    );
  }
  return (
    <form
      className={cn("flex flex-col gap-2.5", className)}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-text">Tracking number (optional)</span>
        <Input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="9400 1112 0206…"
          maxLength={80}
          autoFocus
          className="h-12"
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" size="md" disabled={pending} className="flex-1">
          Mark shipped
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
