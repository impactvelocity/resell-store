"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { useToast } from "@repo/ui/toast";
import { AgentAvatar } from "../agent-chat/agent-chat";
import type { Offer, OfferStatus } from "../../lib/mock-inbox";
import { useOfferActions, type OfferState } from "./offer-store";
import {
  ConfirmDialog,
  HoldBadge,
  LetterAvatar,
  PriceStepper,
  StatusTag,
  UndoButton,
} from "./offer-parts";

/*
 * Offer card (spec D). One buyer's offer on one listing. "Needs you" is the
 * full card with a green border, the agent's view and three actions. Every
 * other state is a short row with a tag.
 */

function rowNote(offer: Offer, state: OfferState, soldTo?: string) {
  if (soldTo && soldTo !== offer.buyer && state.status !== "accepted") {
    return `Declined when you sold to ${soldTo}.`;
  }
  switch (state.status) {
    case "waiting":
      return state.byYou
        ? `Your agent countered at $${state.counter}, just now.`
        : offer.note;
    case "accepted":
      return "Waiting for payment. Turns into a sale when paid.";
    case "declined":
      return state.byYou
        ? `You said no.${offer.hold ? ` Her $${offer.hold} hold goes back.` : ""}`
        : offer.note;
    case "ran-out":
      return "Nobody answered before the hold ended. Hold handed back.";
    default:
      return offer.note;
  }
}

function OfferRow({
  offer,
  status,
  note,
  href,
  undo,
}: {
  offer: Offer;
  status: OfferStatus;
  note: string;
  href?: string;
  undo?: () => void;
}) {
  const body = (
    <>
      <LetterAvatar initial={offer.initial} tone={offer.tone} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="text-base font-semibold text-text">
          {offer.buyer} offered ${offer.amount}
        </div>
        <div className="text-sm text-text-muted">{note}</div>
      </div>
      <div className="flex w-24 shrink-0 items-center justify-end">
        <StatusTag status={status} />
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
        <div className="flex min-w-0 flex-1 items-center gap-[14px] py-4">
          {body}
        </div>
      )}
      {undo && <UndoButton onClick={undo} />}
    </li>
  );
}

function NeedsYouCard({
  offer,
  lowest,
  asking,
  onAccept,
  onPushBack,
  onDecline,
}: {
  offer: Offer;
  lowest: number;
  asking: number;
  onAccept: () => void;
  onPushBack: (amount: number) => void;
  onDecline: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pushing, setPushing] = useState(false);
  const howHref = `/offers/${offer.id}`;

  return (
    <article
      aria-label={`Offer from ${offer.buyer}`}
      className="flex w-full flex-col gap-[14px] rounded-lg border-2 border-secondary bg-surface p-[18px] desk:gap-4 desk:p-6"
    >
      <div className="flex w-full items-center gap-3 desk:gap-[14px]">
        <LetterAvatar
          initial={offer.initial}
          tone={offer.tone}
          className="size-11 desk:size-12 desk:text-xl"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="text-base font-bold text-text">{offer.buyer}</div>
          <div className="text-sm text-text-muted">{offer.when}</div>
        </div>
        <div className="hidden items-center gap-[14px] desk:flex">
          {offer.hold && <HoldBadge amount={offer.hold} />}
          <div className="font-display text-3xl font-extrabold tracking-tight">
            ${offer.amount}
          </div>
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-3 desk:hidden">
        <div className="font-display text-3xl font-extrabold tracking-tight">
          ${offer.amount}
        </div>
        {offer.hold && <HoldBadge amount={offer.hold} className="px-3" />}
      </div>

      <div className="flex w-full items-start gap-2.5 rounded-md bg-surface-muted p-[14px] desk:px-4">
        <AgentAvatar size="md" />
        <p className="flex-1 text-base text-text desk:pt-1">{offer.agentSays}</p>
      </div>

      {pushing ? (
        <PriceStepper
          buyer={offer.buyer}
          start={offer.suggest ?? offer.amount + 5}
          min={Math.max(lowest, offer.amount + 5)}
          max={asking}
          onSend={(amount) => {
            setPushing(false);
            onPushBack(amount);
          }}
          onCancel={() => setPushing(false)}
          className="bg-background"
        />
      ) : (
        <div className="flex flex-col gap-[14px] desk:flex-row desk:items-center desk:gap-2">
          <Button
            variant="secondary"
            className="h-[52px] w-full desk:w-auto"
            onClick={() => setConfirming(true)}
          >
            Accept ${offer.amount}
          </Button>
          <div className="flex gap-2 desk:contents">
            <Button
              variant="soft"
              className="h-12 flex-1 px-6 desk:h-[52px] desk:flex-none"
              onClick={() => setPushing(true)}
            >
              Push back
            </Button>
            <Button
              variant="ghost"
              className="h-12 flex-1 text-danger hover:bg-accent-soft/50 desk:h-[52px] desk:flex-none"
              onClick={onDecline}
            >
              Decline
            </Button>
          </div>
          <div className="hidden flex-1 desk:block" />
          <Link
            href={howHref}
            className="text-center text-sm font-bold whitespace-nowrap text-secondary hover:underline"
          >
            See how it went
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Sell it to ${offer.buyer} for $${offer.amount}?`}
        description="The listing comes down everywhere and the other offers are declined."
        confirm="Sell it"
        onConfirm={onAccept}
      />
    </article>
  );
}

/** The Offers column on C9: needs-you offers as full cards, the rest as rows. */
export function OfferList({
  offers,
  lowest,
  asking,
}: {
  offers: Offer[];
  lowest: number;
  asking: number;
}) {
  const actions = useOfferActions();
  const toast = useToast();

  const withState = offers.map((offer) => ({
    offer,
    state: actions.get(offer.id, offer.status),
  }));
  const soldTo = withState.find((o) => o.state.status === "accepted")?.offer
    .buyer;

  const cards = withState.filter(
    (o) => o.state.status === "needs-you" && !soldTo,
  );
  const rows = withState.filter((o) => !cards.includes(o));

  return (
    <div className="flex flex-col gap-3">
      {cards.map(({ offer }) => (
        <NeedsYouCard
          key={offer.id}
          offer={offer}
          lowest={lowest}
          asking={asking}
          onAccept={() => {
            actions.accept(offer.id);
            toast.add({ title: `Sold to ${offer.buyer}. Waiting for payment.` });
          }}
          onPushBack={(amount) => {
            actions.pushBack(offer.id, amount);
            toast.add({ title: `Your agent sent $${amount} to ${offer.buyer}` });
          }}
          onDecline={() => actions.decline(offer.id)}
        />
      ))}
      {rows.length > 0 && (
        <ul className="flex w-full flex-col rounded-lg border border-border bg-surface px-6 py-0.5">
          {rows.map(({ offer, state }) => {
            const status: OfferStatus =
              soldTo && soldTo !== offer.buyer ? "declined" : state.status;
            return (
              <OfferRow
                key={offer.id}
                offer={offer}
                status={status}
                note={rowNote(offer, state, soldTo)}
                href={
                  offer.suggest
                    ? `/offers/${offer.id}`
                    : offer.status === "waiting"
                      ? `/inbox/${offer.id}`
                      : undefined
                }
                undo={
                  actions.undoId === offer.id ? () => actions.undo() : undefined
                }
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

