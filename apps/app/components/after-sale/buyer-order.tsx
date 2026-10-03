"use client";

import { useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import {
  answerRefund,
  cancelAsBuyer,
  closeProblem,
  escalateProblem,
  reportProblem,
} from "../../app/actions/after-sale";
import { confirmOrder } from "../../app/actions/commerce";
import { RadioCard } from "../market/checkout/controls";
import { SiteLink, StoreLink } from "../market/links";
import { ListingImage } from "../market/parts";
import { ConfirmDialog } from "../offers/offer-parts";
import {
  MoneyLines,
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
import { BuyerReviewPanel } from "./review-panels";
import type { OrderCaseView } from "./view";
import type { OrderReviewView } from "../../lib/server/reviews";

/*
 * P8 order: one thing the buyer bought. What they paid, where it's at, and
 * what's next: cancel a late one, say it's all good, report a problem, or
 * talk a problem through with the seller.
 */

const t = tones.public;

export type ReasonOption = { id: "not_arrived" | "not_as_described" | "damaged" | "other"; label: string };

export function BuyerOrderView({
  view,
  reasons,
  reporting = false,
  review = null,
  reviewing = false,
}: {
  view: OrderCaseView;
  reasons: ReasonOption[];
  /** Open the "Report a problem" form straight away (from the account's link). */
  reporting?: boolean;
  /** The buyer's review of this order, once they've left one. */
  review?: OrderReviewView | null;
  /** Arrived from a "Leave a review" link (?review=1): go straight to the stars. */
  reviewing?: boolean;
}) {
  const live = !!view.dispute?.live;
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-4 pb-16 desk:gap-8 desk:px-16 desk:pt-10 desk:pb-20">
      <SiteLink
        href="/account#orders"
        className="inline-flex w-fit items-center gap-1.5 rounded-full text-sm font-semibold text-public-text-muted hover:text-text"
      >
        <BackGlyph />
        Your orders
      </SiteLink>

      <header className="flex items-center gap-4 desk:gap-5">
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-public-photo desk:size-20">
          <ListingImage photo={view.item.photo ?? undefined} artSize={46} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-display text-2xl leading-tight font-extrabold tracking-tight desk:text-4xl">
            {view.item.title}
          </h1>
          <p className="text-sm text-public-text-muted desk:text-base">
            From{" "}
            <StoreLink store={view.shop.slug} className="font-semibold text-text hover:underline">
              {view.shop.name}
            </StoreLink>
            , paid {view.dates.paidOn}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-6 desk:flex-row desk:items-start desk:gap-10 xl:gap-14">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {live ? <BuyerProblem view={view} /> : <WhatsNext view={view} reasons={reasons} reporting={reporting} />}
          {((view.status === "completed" && !live) || review) && (
            <BuyerReviewPanel view={view} review={review} focus={reviewing} />
          )}
          {view.dispute && !live && <SettledProblem view={view} />}
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-6 desk:w-[340px] xl:w-[380px]">
          <Panel tone="public" title="Where it's at" label="Where it's at">
            <StatusSteps steps={view.steps} tone="public" />
            {view.trackingNumber && (
              <p className={cn("rounded-md px-4 py-3 text-sm", t.soft)}>
                <span className="font-semibold">Tracking</span>{" "}
                <span className="font-mono break-all">{view.trackingNumber}</span>
              </p>
            )}
          </Panel>
          <Panel tone="public" title="What you paid" label="What you paid">
            <MoneyLines
              tone="public"
              lines={[
                { label: "Item", cents: view.money.itemCents },
                {
                  label: view.delivery === "express" ? "Express shipping" : "Tracked shipping",
                  cents: view.money.shippingCents,
                },
                ...(view.money.refundedCents > 0
                  ? [{ label: "Refunded so far", cents: view.money.refundedCents, minus: true }]
                  : []),
              ]}
              total={{
                label: view.money.refundedCents > 0 ? "You paid in the end" : "Total",
                cents: view.money.totalCents - view.money.refundedCents,
              }}
            />
            {view.test && <p className="text-sm text-public-text-muted">Test checkout, so no money moved.</p>}
          </Panel>
          <Panel tone="public" title="Sending to" label="Sending to">
            <div className="text-base">
              <div className="font-semibold">{view.shipTo.name}</div>
              <div className="whitespace-pre-line text-public-text-muted">{view.shipTo.address}</div>
              <div className="text-public-text-muted">{view.shipTo.country}</div>
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function BackGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

/* ---------- What's next, with no live problem ---------- */

function WhatsNext({
  view,
  reasons,
  reporting: startReporting,
}: {
  view: OrderCaseView;
  reasons: ReasonOption[];
  reporting: boolean;
}) {
  const shop = view.shop.name;
  const total = money(view.money.totalCents);
  const refunded = money(view.money.refundedCents);
  const { pending, run } = useCaseAction();
  const [confirming, setConfirming] = useState(false);
  const [reporting, setReporting] = useState(startReporting);

  switch (view.status) {
    case "paid":
      if (view.buyerCanCancel) {
        return (
          <Panel tone="public" highlight title="It hasn't shipped yet" label="What's next">
            <p className="text-base text-public-text-muted">
              {shop} was meant to send it by {view.dates.shipBy}. You can cancel now and get all {total} back
              {testNote(view)}, or give them a little longer. If it still hasn&apos;t shipped by {view.dates.autoCancel}, we
              cancel it and refund you anyway.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={!!pending}
                onClick={() => setConfirming(true)}
                className={cn(t.strong, "w-full sm:w-auto")}
              >
                {pending === "cancel" ? "Cancelling..." : "Cancel for a full refund"}
              </button>
            </div>
            <ConfirmDialog
              open={confirming}
              onOpenChange={setConfirming}
              title={`Cancel and get ${total} back?`}
              description={
                view.test
                  ? `We'll let ${shop} know. It's a test checkout, so no money moves.`
                  : `We'll let ${shop} know and PayPal sends the whole ${total} back to you.`
              }
              confirm="Cancel the order"
              danger
              onConfirm={() =>
                run("cancel", () => cancelAsBuyer({ orderId: view.id }), `Cancelled. ${total} is on its way back to you.`)
              }
            />
          </Panel>
        );
      }
      return (
        <Panel tone="public" title={`Ships by ${view.dates.shipBy}`} label="What's next">
          <p className="text-base text-public-text-muted">
            {shop} has until then to send it, and we&apos;ll email you the tracking when they do. Your {total} is held until
            it&apos;s in your hands{testNote(view)}. If it hasn&apos;t shipped by then, you can cancel here for a full refund.
          </p>
        </Panel>
      );

    case "shipped":
    case "delivered":
      return (
        <Panel tone="public" highlight title={view.status === "delivered" ? "It's arrived" : "On its way"} label="What's next">
          <p className="text-base text-public-text-muted">
            {view.trackingNumber ? `Tracking ${view.trackingNumber}. ` : "No tracking number for this one. "}
            Once it&apos;s in your hands and it&apos;s right, say so and {shop} gets paid.
            {view.dates.releaseOn && ` If we don't hear from you by ${view.dates.releaseOn}, the money goes to ${shop}.`}
          </p>
          {!reporting && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={!!pending}
                onClick={() =>
                  run("confirm", () => confirmOrder({ orderId: view.id }), `Thanks. That wraps it up with ${shop}.`)
                }
                className={cn(t.go, "w-full sm:w-auto")}
              >
                {pending === "confirm" ? "Saving..." : "It's all good"}
              </button>
              <button type="button" onClick={() => setReporting(true)} className={cn(t.quiet, "w-full sm:w-auto")}>
                Report a problem
              </button>
            </div>
          )}
          {reporting && <ReportForm view={view} reasons={reasons} onCancel={() => setReporting(false)} />}
        </Panel>
      );

    case "completed":
      return (
        <Panel tone="public" title="All done" label="What's next">
          <p className="text-base text-public-text-muted">
            {view.money.refundedCents > 0
              ? `You got ${refunded} back and the rest went to ${shop}${testNote(view)}.`
              : `You confirmed it${view.dates.doneOn ? ` on ${view.dates.doneOn}` : ""}, so ${shop} was paid${testNote(view)}.`}
          </p>
        </Panel>
      );

    case "refunded":
      return (
        <Panel tone="public" title={`Refunded ${refunded}`} label="What's next">
          <p className="text-base text-public-text-muted">
            The money went back to you{view.dates.refundedOn ? ` on ${view.dates.refundedOn}` : ""}
            {testNote(view)}. Nothing else to do.
          </p>
        </Panel>
      );

    case "cancelled":
      return (
        <Panel tone="public" title="Cancelled" label="What's next">
          <p className="text-base text-public-text-muted">
            It didn&apos;t ship, so {refunded} went back to you
            {view.dates.cancelledOn ? ` on ${view.dates.cancelledOn}` : ""}
            {testNote(view)}.
          </p>
        </Panel>
      );
  }
}

function ReportForm({
  view,
  reasons,
  onCancel,
}: {
  view: OrderCaseView;
  reasons: ReasonOption[];
  onCancel: () => void;
}) {
  const { pending, run } = useCaseAction();
  const [reason, setReason] = useState<ReasonOption["id"]>(view.status === "shipped" ? "not_arrived" : "not_as_described");
  const [details, setDetails] = useState("");
  const shop = view.shop.name;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!details.trim()) return;
        await run(
          "report",
          () => reportProblem({ orderId: view.id, reason, details: details.trim() }),
          `Reported. ${shop} isn't paid until it's sorted.`,
        );
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-base font-semibold">What&apos;s wrong?</legend>
        {reasons.map((r) => (
          <RadioCard
            key={r.id}
            name="reason"
            value={r.id}
            checked={reason === r.id}
            onChange={() => setReason(r.id)}
            title={r.label}
          />
        ))}
      </fieldset>
      <label className="flex flex-col gap-2">
        <span className="text-base font-semibold">Tell {shop} what happened</span>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          required
          rows={4}
          maxLength={2000}
          placeholder="The more they know, the faster it's sorted."
          className="min-h-28 w-full resize-y rounded-md border border-public-border bg-public-background px-4 py-3 text-base outline-none placeholder:text-public-text-muted focus:border-leaf-900"
        />
      </label>
      <p className="text-sm text-public-text-muted">
        {shop} isn&apos;t paid while you sort it out, so your {money(view.money.totalCents)} stays held{testNote(view)}.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={!!pending || !details.trim()} className={cn(t.strong, "w-full sm:w-auto")}>
          {pending ? "Sending..." : "Report the problem"}
        </button>
        <button type="button" onClick={onCancel} className={cn(t.quiet, "w-full sm:w-auto")}>
          Not now
        </button>
      </div>
    </form>
  );
}

/* ---------- A live problem ---------- */

function BuyerProblem({ view }: { view: OrderCaseView }) {
  const d = view.dispute!;
  const shop = view.shop.name;
  const escalated = d.status === "escalated";
  const { pending, run } = useCaseAction();
  const [taking, setTaking] = useState(false);

  return (
    <Panel
      tone="public"
      highlight
      label="Your problem with this order"
      title={escalated ? "We're looking at it" : "Problem reported"}
      aside={<ProblemBadge status={d.status} />}
    >
      <p className="text-base text-public-text-muted">
        {escalated
          ? "resell.store is reading what you both said and will decide. We'll email you either way."
          : `You told ${shop} on ${d.openedOn}: ${d.reasonLabel.toLowerCase()}. Talk it through here.`}{" "}
        {shop} isn&apos;t paid until it&apos;s sorted, so your {money(view.money.totalCents)} stays held{testNote(view)}.
      </p>

      {d.offerCents != null && (
        <div className="flex flex-col gap-3 rounded-md bg-leaf-100 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold text-leaf-900">
              {shop} offered {money(d.offerCents)} back
            </span>
            <span className="text-sm text-leaf-900/80">
              Take it and the order&apos;s done: you keep it, get {money(d.offerCents)} back{testNote(view)}, and the rest
              goes to {shop}.
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!!pending}
              onClick={() => setTaking(true)}
              className={cn(t.go, "w-full sm:w-auto")}
            >
              {pending === "take" ? "Taking it..." : `Take ${money(d.offerCents)} back`}
            </button>
            <button
              type="button"
              disabled={!!pending}
              onClick={() =>
                run("decline", () => answerRefund({ disputeId: d.id, accept: false }), `No thanks sent. We'll let ${shop} know.`)
              }
              className={cn(t.outline, "w-full bg-white sm:w-auto")}
            >
              {pending === "decline" ? "Saying no..." : "No thanks"}
            </button>
          </div>
          <ConfirmDialog
            open={taking}
            onOpenChange={setTaking}
            title={`Take ${money(d.offerCents)} back?`}
            description={`That settles it: the problem closes, ${money(d.offerCents)} comes back to you${view.test ? " (test, no money moves)" : ""} and the rest goes to ${shop}.`}
            confirm={`Take ${money(d.offerCents)}`}
            onConfirm={() =>
              run(
                "take",
                () => answerRefund({ disputeId: d.id, accept: true }),
                `Done. ${money(d.offerCents)} is on its way back to you.`,
              )
            }
          />
        </div>
      )}

      <ProblemTimeline view={view} tone="public" />
      <ReplyBox disputeId={d.id} to={shop} tone="public" />

      <div className={cn("flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center", t.border)}>
        <button
          type="button"
          disabled={!!pending}
          onClick={() => run("sorted", () => closeProblem({ disputeId: d.id }), `Glad it's sorted. We'll let ${shop} know.`)}
          className={cn(t.outline, "w-full sm:w-auto")}
        >
          {pending === "sorted" ? "Saving..." : "It's sorted"}
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
    </Panel>
  );
}

/** A problem that's over: how it ended, and what was said. */
function SettledProblem({ view }: { view: OrderCaseView }) {
  const d = view.dispute!;
  const refunded = d.status === "refunded";
  return (
    <Panel tone="public" title="The problem you reported" aside={<ProblemBadge status={d.status} />} label="The problem you reported">
      <p className="text-base text-public-text-muted">
        {refunded
          ? `Settled with ${money(view.money.refundedCents)} back to you${testNote(view)}.`
          : "Closed with no refund."}
      </p>
      <ProblemTimeline view={view} tone="public" />
    </Panel>
  );
}
