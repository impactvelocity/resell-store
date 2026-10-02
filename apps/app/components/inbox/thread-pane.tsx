"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui/button";
import { ArrowUpIcon, BagIcon, CheckIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { SweaterIllustration, VaseIllustration } from "@repo/ui/whimsy";
import { cn } from "@repo/ui/lib/utils";
import { AgentAvatar } from "../agent-chat/agent-chat";
import type { Thread, ThreadMessage } from "../../lib/mock-inbox";
import { useOfferActions } from "../offers/offer-store";
import {
  ConfirmDialog,
  OvenIllustration,
  PriceStepper,
  StatusTag,
  UndoButton,
} from "../offers/offer-parts";

/* One inbox thread: what it's about, what the agent would do, the messages, a composer. */

function DressShape({ size = 32 }: { size?: number }) {
  return (
    <svg width={size * (26 / 32)} height={size} viewBox="0 0 32 44" aria-hidden>
      <path d="M10 2h3l3 4 3-4h3l-1.5 12L28 42H4l7.5-28L10 2Z" fill="var(--color-leaf-600)" />
    </svg>
  );
}

function LampShape() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
      <path d="M9 4h12l4 9H5l4-9Z" fill="var(--color-lemon-500)" />
      <path d="M15 13v12M9 27h12" stroke="var(--color-leaf-900)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function Thumb({ thumb }: { thumb: Thread["thumb"] }) {
  const tile = {
    dress: "bg-accent-soft",
    vase: "bg-secondary-soft",
    sweater: "bg-primary-soft",
    oven: "bg-secondary-soft",
    tote: "bg-surface-muted",
    lamp: "bg-primary-soft",
  }[thumb];
  return (
    <div
      className={cn(
        "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md",
        tile,
      )}
    >
      {thumb === "dress" && <DressShape />}
      {thumb === "vase" && <VaseIllustration size={44} />}
      {thumb === "sweater" && <SweaterIllustration size={46} />}
      {thumb === "oven" && <OvenIllustration size={44} />}
      {thumb === "tote" && <BagIcon size={26} />}
      {thumb === "lamp" && <LampShape />}
    </div>
  );
}

function Bubble({ message }: { message: ThreadMessage }) {
  const mine = message.from !== "them";
  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div className="text-sm font-medium text-text-muted">{message.meta}</div>
      <div
        className={cn(
          "max-w-[88%] rounded-t-lg px-4 py-3 text-base desk:max-w-[440px]",
          message.from === "them" &&
            "rounded-br-lg rounded-bl-[6px] bg-surface-muted text-text",
          message.from === "agent" &&
            "rounded-br-[6px] rounded-bl-lg bg-secondary-soft text-text",
          message.from === "you" &&
            "rounded-br-[6px] rounded-bl-lg bg-text text-background",
        )}
      >
        {message.text}
      </div>
    </div>
  );
}

function SystemLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <div className="max-w-[80%] text-center text-sm font-medium text-text-muted">
        {children}
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

const cardClass =
  "flex w-full items-start gap-[14px] rounded-lg bg-secondary-soft p-5";

/** "I'd take it": the agent's suggestion on an offer, with Accept / Ask for more / Say no. */
function OfferDecision({
  thread,
  onAgentMessage,
}: {
  thread: Thread;
  onAgentMessage: (text: string) => void;
}) {
  const decision = thread.decision;
  const toast = useToast();
  const actions = useOfferActions();
  const key = `thread:${thread.id}`;
  const state = actions.get(key, "needs-you");
  const [confirming, setConfirming] = useState(false);
  const [asking, setAsking] = useState(false);

  if (decision?.kind !== "offer") return null;
  const { buyer, amount, hold } = decision;

  let title: React.ReactNode = decision.title;
  let tag: React.ReactNode = (
    <span className="inline-flex h-6 items-center rounded-full bg-surface px-2.5 text-sm font-semibold text-secondary">
      ${hold} hold paid
    </span>
  );
  let body: React.ReactNode = decision.body;
  let buttons: React.ReactNode = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="md"
        className="px-[22px]"
        onClick={() => setConfirming(true)}
      >
        Accept ${amount}
      </Button>
      <Button variant="soft" size="md" onClick={() => setAsking(true)}>
        Ask for more
      </Button>
      <Button
        variant="ghost"
        size="md"
        className="px-[14px] text-danger hover:bg-accent-soft/50"
        onClick={() => actions.decline(key)}
      >
        Say no
      </Button>
    </div>
  );

  if (state.status === "accepted") {
    title = `Sold to ${buyer} for $${amount}`;
    tag = <StatusTag status="accepted" className="h-6" />;
    body = `Waiting for payment. ${buyer} has until tomorrow, 2:11 pm, then I'll make your shipping label.`;
    buttons = null;
  } else if (state.status === "waiting") {
    title = `I asked ${buyer} for $${state.counter}`;
    tag = <StatusTag status="waiting" className="h-6" />;
    body = `Her $${hold} hold stays on while she thinks about it.`;
    buttons = (
      <Button
        variant="soft"
        size="md"
        className="self-start"
        onClick={() => setConfirming(true)}
      >
        Accept ${amount} instead
      </Button>
    );
  } else if (state.status === "declined") {
    title = "You said no";
    tag = <StatusTag status="declined" className="h-6" />;
    body = `${buyer} gets her $${hold} hold back. The dress stays up.`;
    buttons =
      actions.undoId === key ? (
        <div className="-ml-3">
          <UndoButton onClick={actions.undo} />
        </div>
      ) : null;
  }

  return (
    <div className={cardClass}>
      {state.status === "accepted" ? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
          <CheckIcon size={18} strokeWidth={2.6} />
        </span>
      ) : (
        <AgentAvatar size="lg" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-text">{title}</span>
            {tag}
          </div>
          <p className="text-base text-text">{body}</p>
        </div>
        {asking ? (
          <PriceStepper
            buyer={buyer}
            start={decision.suggest}
            min={amount + decision.step}
            max={decision.asking}
            step={decision.step}
            className="bg-surface"
            onSend={(counter) => {
              setAsking(false);
              actions.pushBack(key, counter);
              onAgentMessage(
                `Thanks ${buyer}. Could you meet me at $${counter}? Your hold stays on either way.`,
              );
            }}
            onCancel={() => setAsking(false)}
          />
        ) : (
          buttons
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Sell it to ${buyer} for $${amount}?`}
        description="The listing comes down everywhere and any other offers are declined."
        confirm="Sell it"
        onConfirm={() => {
          actions.accept(key);
          toast.add({ title: `Sold to ${buyer}. Waiting for payment.` });
        }}
      />
    </div>
  );
}

/** A plain suggestion with one action, e.g. "Print label". */
function ActionDecision({ thread }: { thread: Thread }) {
  const toast = useToast();
  const actions = useOfferActions();
  const key = `thread:${thread.id}`;
  const done = actions.get(key, "needs-you").status === "accepted";
  const decision = thread.decision;
  if (decision?.kind !== "action") return null;
  return (
    <div className={cardClass}>
      <AgentAvatar size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold text-text">{decision.title}</span>
          <p className="text-base text-text">{decision.body}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            className="px-[22px]"
            disabled={done}
            onClick={() => {
              actions.accept(key);
              toast.add({ title: decision.done });
            }}
          >
            {done ? (
              <>
                <CheckIcon size={16} /> Done
              </>
            ) : (
              decision.primary
            )}
          </Button>
          {decision.secondary && (
            <Button
              variant="soft"
              size="md"
              render={<Link href={decision.secondary.href} />}
              nativeButton={false}
            >
              {decision.secondary.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function footerFor(thread: Thread, status: string, counter?: number) {
  if (thread.decision?.kind !== "offer") return thread.footer;
  const { buyer, amount, hold } = thread.decision;
  if (status === "accepted")
    return `You accepted $${amount}. ${buyer} has until tomorrow, 2:11 pm to pay.`;
  if (status === "waiting") return `Your agent asked for $${counter}. Waiting on ${buyer}.`;
  if (status === "declined") return `You said no. ${buyer} gets her $${hold} hold back.`;
  return thread.footer;
}

export function ThreadPane({
  thread,
  extra,
  onSend,
  className,
}: {
  thread: Thread;
  /** Messages added in this session. */
  extra: ThreadMessage[];
  onSend: (message: ThreadMessage) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const actions = useOfferActions();
  const state = actions.get(`thread:${thread.id}`, "needs-you");
  const messages = [...thread.messages, ...extra];

  useEffect(() => {
    if (extra.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [extra.length]);

  const footer = footerFor(thread, state.status, state.counter);

  return (
    <section
      aria-label={thread.title}
      className={cn("flex min-h-0 flex-col justify-between gap-6", className)}
    >
      <div className="flex min-h-0 min-w-0 flex-col gap-5 desk:overflow-x-hidden desk:overflow-y-auto">
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 basis-[260px] items-center gap-[14px]">
            <Thumb thumb={thread.thumb} />
            <div className="flex min-w-0 flex-col">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-text">
                {thread.title}
              </h2>
              <p className="text-sm text-text-muted">{thread.subtitle}</p>
            </div>
          </div>
          {thread.listingHref && (
            <Button
              variant="soft"
              size="md"
              className="hidden h-10 px-4 desk:inline-flex"
              render={<Link href={thread.listingHref} />}
              nativeButton={false}
            >
              Open listing
            </Button>
          )}
        </div>
        {thread.listingHref && (
          <Link
            href={thread.listingHref}
            className="-mt-2 text-sm font-bold text-secondary desk:hidden"
          >
            Open listing
          </Link>
        )}

        <OfferDecision
          thread={thread}
          onAgentMessage={(text) =>
            onSend({ from: "agent", meta: "Your agent, just now", text })
          }
        />
        <ActionDecision thread={thread} />

        <div className="flex w-full flex-col gap-[14px]">
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
          {footer && <SystemLine>{footer}</SystemLine>}
          <div ref={endRef} />
        </div>
      </div>

      <form
        className="flex w-full items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text) return;
          onSend({ from: "you", meta: "You, just now", text });
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Write to ${thread.person} yourself`}
          aria-label={`Write to ${thread.person}`}
          className="h-[52px] min-w-0 flex-1 rounded-full border-[1.5px] border-border bg-surface px-5 text-base text-text outline-none placeholder:text-text-muted focus:border-secondary"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim()}
          className="flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-lemon-300 disabled:cursor-default"
        >
          <ArrowUpIcon size={20} strokeWidth={2.6} />
        </button>
      </form>
    </section>
  );
}
