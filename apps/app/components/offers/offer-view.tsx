"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { CheckIcon, LockIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { AgentAvatar } from "../agent-chat/agent-chat";
import { MobileBackHeader } from "../shell/page";
import { managedListing, offerPage as offer } from "../../lib/mock-inbox";
import {
  NegotiationTimeline,
  type TimelineEntry,
} from "./negotiation-timeline";
import { useOfferActions } from "./offer-store";
import {
  Breadcrumb,
  ConfirmDialog,
  LetterAvatar,
  PriceStepper,
  StatusTag,
  UndoButton,
} from "./offer-parts";

/* C10 Listing / Offer: one offer, the numbers, what the agent would do, and how it went. */

const listingHref = "/listings/dutch-oven";

function Numbers() {
  const cols = [
    { label: "You're asking", value: offer.asking, tone: "text-text" },
    { label: "Her offer", value: offer.amount, tone: "text-secondary" },
    { label: "Your lowest", value: offer.lowest, tone: "text-text" },
  ];
  return (
    <div className="flex w-full flex-col gap-[18px] rounded-lg border border-border bg-surface p-6">
      <div className="flex w-full">
        {cols.map((c) => (
          <div key={c.label} className="flex flex-1 flex-col">
            <div className="text-sm font-medium text-text-muted">{c.label}</div>
            <div
              className={`font-display text-2xl font-extrabold tracking-tight ${c.tone}`}
            >
              ${c.value}
            </div>
          </div>
        ))}
      </div>
      <div className="flex w-full items-start gap-2.5 rounded-md bg-secondary-soft px-4 py-[14px]">
        <LockIcon size={20} strokeWidth={2.2} className="mt-0.5 shrink-0 text-secondary" />
        <p className="flex-1 text-sm font-medium text-text">{offer.holdNote}</p>
      </div>
    </div>
  );
}

function DecisionCard() {
  const toast = useToast();
  const actions = useOfferActions();
  const state = actions.get(offer.id, "needs-you");
  const [confirming, setConfirming] = useState(false);
  const [pushing, setPushing] = useState(false);

  const accept = (
    <ConfirmDialog
      open={confirming}
      onOpenChange={setConfirming}
      title={`Sell it to ${offer.buyer} for $${offer.amount}?`}
      description="The listing comes down everywhere and the other offers are declined."
      confirm="Sell it"
      onConfirm={() => {
        actions.accept(offer.id);
        toast.add({ title: `Sold to ${offer.buyer}. Waiting for payment.` });
      }}
    />
  );

  let body: React.ReactNode;

  if (state.status === "accepted") {
    body = (
      <>
        <div className="flex items-start gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
            <CheckIcon size={16} strokeWidth={2.6} />
          </span>
          <div className="flex flex-1 flex-col gap-1 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-text">
                Sold to {offer.buyer} for ${offer.amount}
              </span>
              <StatusTag status="accepted" />
            </div>
            <p className="text-base text-text-muted">
              Waiting for payment. {offer.buyer} pays the other $
              {offer.amount - offer.hold} through PayPal, then your shipping
              label is ready.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          className="w-full"
          render={<Link href="/sales" />}
          nativeButton={false}
        >
          See your sales
        </Button>
      </>
    );
  } else if (state.status === "declined") {
    body = (
      <div className="flex items-start gap-2.5">
        <LetterAvatar initial={offer.initial} className="size-8 text-sm" />
        <div className="flex flex-1 flex-col gap-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-text">You said no.</span>
            <StatusTag status="declined" />
          </div>
          <p className="text-base text-text-muted">
            {offer.buyer} gets her ${offer.hold} hold back. The listing stays up.
          </p>
        </div>
        {actions.undoId === offer.id && <UndoButton onClick={actions.undo} />}
      </div>
    );
  } else if (state.status === "waiting") {
    body = (
      <>
        <div className="flex items-start gap-2.5">
          <AgentAvatar size="md" />
          <div className="flex flex-1 flex-col gap-1 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-text">
                I sent ${state.counter}.
              </span>
              <StatusTag status="waiting" />
            </div>
            <p className="text-base text-text-muted">
              {offer.buyer}&apos;s agent usually answers within the hour. Her
              hold stays on while we wait.
            </p>
          </div>
        </div>
        <Button variant="soft" className="w-full" onClick={() => setConfirming(true)}>
          Accept ${offer.amount} instead
        </Button>
      </>
    );
  } else {
    body = (
      <>
        <div className="flex items-start gap-2.5">
          <AgentAvatar size="md" />
          <div className="flex flex-1 flex-col gap-1 pt-1">
            <div className="text-lg font-bold text-text">{offer.agentTitle}</div>
            <p className="text-base text-text-muted">{offer.agentBody}</p>
          </div>
        </div>
        {pushing ? (
          <PriceStepper
            buyer={offer.buyer}
            start={offer.suggest}
            min={offer.amount + 5}
            max={offer.asking}
            onSend={(amount) => {
              setPushing(false);
              actions.pushBack(offer.id, amount);
              toast.add({ title: `Your agent sent $${amount} to ${offer.buyer}` });
            }}
            onCancel={() => setPushing(false)}
          />
        ) : (
          <>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setConfirming(true)}
            >
              Accept ${offer.amount}
            </Button>
            <div className="flex w-full items-center gap-2">
              <Button
                variant="soft"
                className="h-[52px] flex-1"
                onClick={() => setPushing(true)}
              >
                Push back at ${offer.suggest}
              </Button>
              <Button
                variant="ghost"
                className="h-[52px] px-6 text-danger hover:bg-accent-soft/50"
                onClick={() => actions.decline(offer.id)}
              >
                Decline
              </Button>
            </div>
          </>
        )}
        <p className="text-sm text-text-muted">{offer.fineprint}</p>
      </>
    );
  }

  return (
    <section
      aria-label="What your agent would do"
      className="flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-6"
    >
      {body}
      {accept}
    </section>
  );
}

function useTimeline(): TimelineEntry[] {
  const actions = useOfferActions();
  const state = actions.get(offer.id, "needs-you");
  const rows: TimelineEntry[] = [...offer.timeline];
  if (state.status === "waiting" && state.counter) {
    rows.push({
      who: "agent",
      time: "Just now",
      text: `Pushed back at $${state.counter} for you. Waiting on ${offer.buyer}'s agent.`,
      amount: state.counter,
      fresh: true,
    });
  } else if (state.status === "accepted") {
    rows.push({
      who: "you",
      time: "Just now",
      text: `Accepted. Waiting for ${offer.buyer} to pay.`,
      amount: offer.amount,
      fresh: true,
    });
  } else if (state.status === "declined") {
    rows.push({
      who: "you",
      time: "Just now",
      text: `Said no. ${offer.buyer} gets her $${offer.hold} hold back.`,
      fresh: true,
    });
  }
  return rows;
}

export function OfferView() {
  const rows = useTimeline();
  return (
    <>
      <MobileBackHeader
        title="Offer"
        backHref={listingHref}
        className="h-[52px] pt-0"
      />
      <div className="flex w-full flex-col gap-4 px-4 pt-3 pb-8 desk:gap-7 desk:px-12 desk:pt-8 desk:pb-14">
        <Breadcrumb
          items={[
            {
              label: managedListing.shop.name,
              href: `/shops/${managedListing.shop.slug}`,
            },
            { label: managedListing.shortTitle, href: listingHref },
            { label: `Offer from ${offer.buyer}` },
          ]}
        />
        <div className="flex w-full items-start gap-[14px] desk:items-center desk:gap-4">
          <LetterAvatar
            initial={offer.initial}
            className="size-14 text-xl desk:size-16 desk:text-2xl"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1 desk:gap-0.5">
            <h1 className="font-display text-2xl leading-8 font-extrabold tracking-tight text-text desk:text-3xl">
              {offer.title}
            </h1>
            <p className="text-sm text-text-muted desk:text-base">
              {offer.subtitle}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 desk:gap-6 lg:flex-row lg:items-start">
          <NegotiationTimeline
            buyer={offer.buyer}
            initial={offer.initial}
            rows={rows}
            className="order-last lg:order-first lg:flex-[1.3]"
          />
          <div className="flex flex-col gap-4 lg:flex-1">
            <Numbers />
            <DecisionCard />
          </div>
        </div>
      </div>
    </>
  );
}
