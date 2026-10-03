"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@repo/ui/input";
import { cn } from "@repo/ui/lib/utils";
import { cancelAsSeller, escalateProblem, offerRefund, refundAll } from "../../app/actions/after-sale";
import { ConfirmDialog, Breadcrumb } from "../offers/offer-parts";
import type { SellerOrder } from "../seller-live/data";
import { OrderTag, ShipForm } from "../seller-live/parts";
import { MobileBackHeader } from "../shell/page";
import {
  Panel,
  ProblemBadge,
  ProblemTimeline,
  ReplyBox,
  StatusSteps,
  money,
  testNote,
  tones,
  useCaseAction,
} from "./parts";
import { SellerReviewPanel } from "./review-panels";
import type { OrderCaseView } from "./view";
import type { OrderReviewView } from "../../lib/server/reviews";

/*
 * B5 sale: one order on one of the seller's shops. Ship it (or say you
 * can't), and when the buyer reports a problem: talk it through, offer part
 * of the money back, refund it all, or ask resell.store to step in. The
 * payout card says what they get after fees and refunds, and whether it's
 * still held.
 */

const t = tones.app;

export function SellerOrderView({
  view,
  order,
  review = null,
}: {
  view: OrderCaseView;
  order: SellerOrder;
  /** The buyer's review, once they've left one (private ones too: they're for you). */
  review?: OrderReviewView | null;
}) {
  const live = !!view.dispute?.live;
  return (
    <>
      <MobileBackHeader title="Sale" backHref="/sales" className="h-[52px] pt-0" />
      <div className="flex w-full flex-col gap-4 px-4 pt-3 pb-8 desk:gap-7 desk:px-12 desk:pt-8 desk:pb-14">
        <Breadcrumb
          items={[
            { label: "Sales and payouts", href: "/sales" },
            { label: view.item.title },
          ]}
        />
        <div className="flex w-full items-center gap-[14px] desk:gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-surface-muted desk:size-16">
            {view.item.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploads are served by our own route, sized by CSS
              <img src={view.item.photo} alt="" className="size-full object-cover" />
            ) : (
              <span className="font-display text-xl font-extrabold text-text-muted">{view.item.title[0]}</span>
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 desk:gap-0.5">
            <h1 className="font-display text-2xl leading-8 font-extrabold tracking-tight text-text desk:text-3xl">
              {view.buyer.firstName} bought{" "}
              <Link href={`/listings/${view.item.id}`} className="hover:underline">
                {view.item.title}
              </Link>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-text-muted desk:text-base">
                {view.buyer.name} paid {money(view.money.totalCents)}, {view.dates.paidOn}
                {view.test && " (test)"}
              </p>
              {live ? <ProblemBadge status={view.dispute!.status} /> : <OrderTag status={view.status} />}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 desk:gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-col gap-4 desk:gap-6 lg:flex-[1.4]">
            {live ? <SellerProblem view={view} /> : <WhatsNext view={view} order={order} />}
            {review && <SellerReviewPanel view={view} review={review} />}
            {view.dispute && !live && <SettledProblem view={view} />}
          </div>
          <div className="flex min-w-0 flex-col gap-4 desk:gap-6 lg:flex-1">
            <PayoutPanel view={view} />
            <Panel tone="app" title="Where it's at" label="Where it's at">
              <StatusSteps steps={view.steps} tone="app" />
            </Panel>
            {view.dates.shippedOn && (
              <Panel tone="app" title="Shipping" label="Shipping">
                <ShipTo view={view} />
                <p className="text-sm text-text-muted">
                  {view.delivery === "express" ? "Express" : "Tracked"}
                  {view.trackingNumber ? `, tracking ${view.trackingNumber}` : ", no tracking number"}
                </p>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ShipTo({ view }: { view: OrderCaseView }) {
  return (
    <div className="rounded-md bg-surface-muted px-4 py-3 text-sm">
      <div className="font-semibold text-text">{view.shipTo.name}</div>
      <div className="whitespace-pre-line text-text-muted">{view.shipTo.address}</div>
      <div className="text-text-muted">{view.shipTo.country}</div>
    </div>
  );
}

/* ---------- What's next, with no live problem ---------- */

function WhatsNext({ view, order }: { view: OrderCaseView; order: SellerOrder }) {
  const who = view.buyer.firstName;
  const total = money(view.money.totalCents);
  const refunded = money(view.money.refundedCents);
  const { pending, run } = useCaseAction();
  const [confirming, setConfirming] = useState(false);

  switch (view.status) {
    case "paid":
      return (
        <Panel tone="app" highlight title={`Ship it by ${view.dates.shipBy}`} label="What's next">
          {view.buyerCanCancel && (
            <p className="rounded-md bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-text">
              It&apos;s past the ship-by date, so {who} can cancel for a refund now. Send it soon, or tell them why.
            </p>
          )}
          <p className="text-base text-text-muted">
            {who} paid {total}
            {view.delivery === "express" ? " for express" : ""}
            {testNote(view)}. If it hasn&apos;t shipped by {view.dates.autoCancel}, the sale is cancelled and {who} gets
            their money back.
          </p>
          <ShipTo view={view} />
          <ShipForm order={order} />
          <button
            type="button"
            disabled={!!pending}
            onClick={() => setConfirming(true)}
            className={cn(t.danger, "w-fit self-center")}
          >
            {pending === "cancel" ? "Cancelling..." : "I can't send it"}
          </button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Can't send it?"
            description={`We'll cancel the sale and ${who} gets all ${total} back${view.test ? " (test, no money moves)" : ""}. ${view.item.title} goes back on sale.`}
            confirm="Cancel the sale"
            danger
            onConfirm={() =>
              run(
                "cancel",
                () => cancelAsSeller({ orderId: view.id }),
                `Cancelled. ${who} is refunded and it's back on sale.`,
              )
            }
          />
        </Panel>
      );

    case "shipped":
    case "delivered":
      return (
        <Panel tone="app" title={view.status === "delivered" ? "It's arrived" : "On its way"} label="What's next">
          <p className="text-base text-text-muted">
            {view.trackingNumber ? `Tracking ${view.trackingNumber}. ` : `Shipped ${view.dates.shippedOn ?? ""}. `}
            You&apos;re paid when {who} says it&apos;s all good
            {view.dates.releaseOn ? `, or on ${view.dates.releaseOn} if they don't say anything` : ""}.
          </p>
        </Panel>
      );

    case "completed":
      return (
        <Panel tone="app" title="All done" label="What's next">
          <p className="text-base text-text-muted">
            {view.money.refundedCents > 0
              ? `${who} took ${refunded} back to settle a problem, and the rest is yours${testNote(view)}.`
              : `${who} confirmed it${view.dates.doneOn ? ` on ${view.dates.doneOn}` : ""}. Nice one.`}
          </p>
        </Panel>
      );

    case "refunded":
      return (
        <Panel tone="app" title={`Refunded ${refunded}`} label="What's next">
          <p className="text-base text-text-muted">
            {who} got their money back{view.dates.refundedOn ? ` on ${view.dates.refundedOn}` : ""}
            {testNote(view)}. Nothing else to do.
          </p>
        </Panel>
      );

    case "cancelled":
      return (
        <Panel tone="app" title="Cancelled" label="What's next">
          <p className="text-base text-text-muted">
            It didn&apos;t ship, so {who} got {refunded} back
            {view.dates.cancelledOn ? ` on ${view.dates.cancelledOn}` : ""}
            {testNote(view)}.
          </p>
        </Panel>
      );
  }
}

/* ---------- A live problem ---------- */

function SellerProblem({ view }: { view: OrderCaseView }) {
  const d = view.dispute!;
  const who = view.buyer.firstName;
  const escalated = d.status === "escalated";
  const left = view.money.refundableCents;
  const { pending, run } = useCaseAction();
  const [refunding, setRefunding] = useState(false);
  const [offering, setOffering] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const dollars = Number(amount);
  const valid = amount.trim() !== "" && Number.isFinite(dollars) && dollars > 0 && Math.round(dollars * 100) < left;

  return (
    <Panel
      tone="app"
      highlight
      label="The problem with this sale"
      title={escalated ? "resell.store is looking at it" : `${who} reported a problem`}
      aside={<ProblemBadge status={d.status} />}
    >
      <p className="text-base text-text-muted">
        {escalated
          ? "We're reading what you both said and will decide. We'll email you either way."
          : `On ${d.openedOn}, ${who} said: ${d.reasonLabel.toLowerCase()}. Talk it through here: refund it all, offer part of it back, or ask us to step in.`}{" "}
        Your money for this sale stays held until it&apos;s sorted.
      </p>
      {d.escalatesOn && (
        <p className="rounded-md bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-text">
          Answer {who} by {d.escalatesOn}, or resell.store steps in to decide.
        </p>
      )}
      {d.offerCents != null && (
        <p className="rounded-md bg-secondary-soft px-4 py-3 text-sm font-semibold text-secondary">
          You offered {money(d.offerCents)} back. Waiting on {who}.
        </p>
      )}

      <ProblemTimeline view={view} tone="app" />
      <ReplyBox disputeId={d.id} to={who} tone="app" />

      {offering ? (
        <form
          className="flex flex-col gap-3 rounded-md bg-surface-muted p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return;
            const ok = await run(
              "offer",
              () => offerRefund({ disputeId: d.id, amount: dollars, body: note.trim() || null }),
              `Offered ${money(Math.round(dollars * 100))} back. We'll let ${who} know.`,
            );
            if (ok) {
              setOffering(false);
              setAmount("");
              setNote("");
            }
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text">How much back?</span>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-[18px] -translate-y-1/2 text-base text-text-muted">$</span>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="20"
                autoFocus
                aria-describedby="offer-hint"
                className="h-12 bg-background pl-8"
              />
            </div>
            <span id="offer-hint" className="text-sm text-text-muted">
              Less than {money(left)}. For all of it, use Refund in full.
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text">A note for {who} (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Sorry about that. Would this help?"
              className="w-full resize-y rounded-md border-[1.5px] border-border bg-background px-4 py-3 text-base outline-none placeholder:text-text-muted focus:border-secondary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={!valid || !!pending} className={t.strong}>
              {pending === "offer" ? "Sending..." : valid ? `Offer ${money(Math.round(dollars * 100))} back` : "Send offer"}
            </button>
            <button type="button" onClick={() => setOffering(false)} className={t.quiet}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            disabled={!!pending}
            onClick={() => setRefunding(true)}
            className={cn(t.strong, "w-full sm:w-auto")}
          >
            {pending === "refund" ? "Refunding..." : "Refund in full"}
          </button>
          <button
            type="button"
            disabled={!!pending || left <= 100}
            onClick={() => setOffering(true)}
            className={cn(t.outline, "w-full sm:w-auto")}
          >
            {d.offerCents != null ? "Change your offer" : "Offer part of it back"}
          </button>
          {!escalated && (
            <button
              type="button"
              disabled={!!pending}
              onClick={() =>
                run(
                  "escalate",
                  () => escalateProblem({ disputeId: d.id }),
                  "Thanks. We'll look at what you both said and decide.",
                )
              }
              className={cn(t.quiet, "w-full sm:w-auto")}
            >
              {pending === "escalate" ? "Asking..." : "Ask resell.store to step in"}
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={refunding}
        onOpenChange={setRefunding}
        title={`Give ${who} all ${money(left)} back?`}
        description={`The order's refunded and the problem closes. ${view.test ? "It's a test checkout, so no money moves." : "It goes back through PayPal, so you won't be paid for this one."}`}
        confirm="Refund in full"
        danger
        onConfirm={() => run("refund", () => refundAll({ disputeId: d.id }), `Refunded. ${who} gets ${money(left)} back.`)}
      />
    </Panel>
  );
}

function SettledProblem({ view }: { view: OrderCaseView }) {
  const d = view.dispute!;
  return (
    <Panel tone="app" title={`${view.buyer.firstName}'s problem`} aside={<ProblemBadge status={d.status} />} label="The problem">
      <p className="text-base text-text-muted">
        {d.status === "refunded"
          ? `Settled with ${money(view.money.refundedCents)} back to ${view.buyer.firstName}${testNote(view)}.`
          : "Closed with no refund."}
      </p>
      <ProblemTimeline view={view} tone="app" />
    </Panel>
  );
}

/* ---------- Payout ---------- */

function PayoutPanel({ view }: { view: OrderCaseView }) {
  const m = view.money;
  const who = view.buyer.firstName;
  const gone = view.status === "refunded" || view.status === "cancelled";
  const live = !!view.dispute?.live;
  const state = gone
    ? `Nothing to pay out: it went back to ${who}.`
    : m.released
      ? view.test
        ? "Released (test)."
        : `In your PayPal${view.dates.releasedOn ? ` since ${view.dates.releasedOn}` : ""}.`
      : live
        ? "Held until the problem's sorted."
        : view.status === "paid"
          ? `Held until ${who} has it.`
          : view.status === "completed"
            ? "On its way to your PayPal."
            : `Held until ${who} says it's all good${view.dates.releaseOn ? `, or ${view.dates.releaseOn}` : ""}.`;
  return (
    <section
      aria-label="Your payout"
      className="flex w-full flex-col gap-4 rounded-xl bg-secondary p-6 text-on-secondary"
    >
      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold text-leaf-100">
          {m.released ? "You got" : gone ? "You get" : "You'll get"}
          {view.test && " (test)"}
        </span>
        <span className="font-display text-5xl font-extrabold tracking-tight">{money(m.youGetCents)}</span>
        <span className="text-base text-leaf-100">{state}</span>
      </div>
      <dl className="flex flex-col gap-1.5 border-t border-white/30 pt-4 text-sm">
        <PayoutLine label="Sale with shipping" cents={m.totalCents} />
        {m.refundedCents > 0 && <PayoutLine label={`Refunded to ${who}`} cents={m.refundedCents} minus />}
        {m.platformFeeCents ? <PayoutLine label="resell.store fee" cents={m.platformFeeCents} minus /> : null}
        {m.paypalFeeCents ? <PayoutLine label="PayPal fee" cents={m.paypalFeeCents} minus /> : null}
      </dl>
      {view.test && <p className="text-sm text-leaf-100">Test checkout: no money moved, and no fees.</p>}
    </section>
  );
}

function PayoutLine({ label, cents, minus }: { label: string; cents: number; minus?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-leaf-100">{label}</dt>
      <dd className="font-semibold tabular-nums">{minus ? `−${money(cents)}` : money(cents)}</dd>
    </div>
  );
}

