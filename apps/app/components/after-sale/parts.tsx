"use client";

import { useState } from "react";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { replyToProblem } from "../../app/actions/after-sale";
import { formatPrice } from "../listing-live/format";
import type { CaseEvent, CaseStep, OrderCaseView } from "./view";

/*
 * Pieces both order pages share: the buyer's (marketplace, white) and the
 * seller's (app, cream). `tone` picks the zone's colours, as the messages
 * conversation does. Buttons call the after-sale actions, which revalidate,
 * so the page refreshes itself with the new state.
 */

export type Tone = "app" | "public";

export const money = (cents: number | null | undefined) => formatPrice(cents) ?? "$0";

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const pillBase =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-60";

export const tones = {
  app: {
    card: "rounded-lg border border-border bg-surface",
    border: "border-border",
    muted: "text-text-muted",
    soft: "bg-surface-muted",
    input: "border-border bg-background focus-within:border-secondary",
    strong: cn(pillBase, "bg-secondary text-on-secondary hover:bg-leaf-900", focusRing),
    go: cn(pillBase, "bg-primary font-bold text-on-primary hover:bg-lemon-300", focusRing),
    outline: cn(pillBase, "border-[1.5px] border-border bg-surface text-text hover:bg-surface-muted", focusRing),
    quiet: cn(pillBase, "px-3 font-medium text-text-muted hover:text-text", focusRing),
    danger: cn(pillBase, "px-3 font-medium text-danger hover:bg-accent-soft/50", focusRing),
    you: "bg-primary text-on-primary",
  },
  public: {
    card: "rounded-lg border border-public-border bg-public-background",
    border: "border-public-border",
    muted: "text-public-text-muted",
    soft: "bg-public-photo",
    input: "border-public-border bg-public-background focus-within:border-leaf-900",
    strong: cn(pillBase, "bg-leaf-900 text-white hover:bg-leaf-600", focusRing),
    go: cn(pillBase, "bg-leaf-600 text-white hover:bg-leaf-900", focusRing),
    outline: cn(pillBase, "border border-leaf-900 text-text hover:bg-public-photo", focusRing),
    quiet: cn(pillBase, "px-3 font-medium text-public-text-muted hover:text-text", focusRing),
    danger: cn(pillBase, "px-3 font-medium text-berry-500 hover:bg-accent-soft/50", focusRing),
    you: "bg-leaf-100 text-leaf-900",
  },
} as const;

/** "(test, no money moved)" after a sum of money on a test checkout. */
export function testNote(view: Pick<OrderCaseView, "test">) {
  return view.test ? " (test, no money moved)" : "";
}

/** Runs one action at a time, with a toast either way. Returns whether it worked. */
export function useCaseAction() {
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  async function run(name: string, fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    if (pending) return false;
    setPending(name);
    try {
      const res = await fn();
      toast.add({ title: res.ok ? done : (res.error ?? "That didn't work. Try again?") });
      return res.ok;
    } catch {
      toast.add({ title: "That didn't work. Try again?" });
      return false;
    } finally {
      setPending(null);
    }
  }
  return { pending, run };
}

/** A card with a heading, for the side column and the main panels. */
export function Panel({
  tone,
  title,
  aside,
  children,
  className,
  highlight = false,
  label,
}: {
  tone: Tone;
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** A panel that needs them: the thicker border. */
  highlight?: boolean;
  label?: string;
}) {
  const t = tones[tone];
  return (
    <section
      aria-label={label}
      className={cn(
        t.card,
        "flex w-full flex-col gap-4 p-5 desk:p-6",
        highlight && (tone === "app" ? "border-2 border-secondary" : "border-2 border-leaf-900"),
        className,
      )}
    >
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** Paid → Shipped → Arrived → Done (or Cancelled / Refunded), as a small vertical track. */
export function StatusSteps({ steps, tone }: { steps: CaseStep[]; tone: Tone }) {
  const t = tones[tone];
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={s.label} className="flex gap-3">
            <div className="flex w-6 flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  s.state === "done" && "border-secondary bg-secondary text-on-secondary",
                  s.state === "stopped" && "border-text-muted bg-text-muted text-white",
                  s.state === "next" && "border-secondary bg-transparent",
                  s.state === "todo" && cn(t.border, "bg-transparent"),
                )}
              >
                {s.state === "done" && <TickGlyph />}
                {s.state === "stopped" && <CrossGlyph />}
              </span>
              {!last && (
                <span
                  aria-hidden
                  className={cn("my-1 w-0.5 flex-1 rounded-full", s.state === "done" ? "bg-secondary" : t.soft)}
                />
              )}
            </div>
            <div className={cn("flex flex-1 items-baseline justify-between gap-3", !last && "pb-4")}>
              <span
                className={cn(
                  "text-base",
                  s.state === "todo" ? t.muted : "font-semibold",
                  s.state === "next" && "text-secondary",
                )}
              >
                {s.label}
                <span className="sr-only">
                  {s.state === "done" ? ", done" : s.state === "next" ? ", next" : s.state === "stopped" ? ", stopped here" : ""}
                </span>
              </span>
              {s.when && <span className={cn("text-sm", t.muted)}>{s.when}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TickGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function CrossGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Label / amount lines, with a total under a rule. */
export function MoneyLines({
  tone,
  lines,
  total,
}: {
  tone: Tone;
  lines: { label: string; cents: number; minus?: boolean }[];
  total: { label: string; cents: number };
}) {
  const t = tones[tone];
  return (
    <dl className="flex flex-col gap-2 text-base">
      {lines.map((l) => (
        <div key={l.label} className="flex items-baseline justify-between gap-3">
          <dt className={t.muted}>{l.label}</dt>
          <dd className={cn("tabular-nums", l.minus && "text-secondary")}>
            {l.minus ? `−${money(l.cents)}` : money(l.cents)}
          </dd>
        </div>
      ))}
      <div className={cn("mt-1 flex items-baseline justify-between gap-3 border-t pt-3", t.border)}>
        <dt className="font-bold">{total.label}</dt>
        <dd className="font-display text-xl font-extrabold tabular-nums">{money(total.cents)}</dd>
      </div>
    </dl>
  );
}

/* ---------- The problem's timeline ---------- */

type Names = { buyer: string; seller: string };

function who(side: CaseEvent["side"], viewer: OrderCaseView["side"], names: Names) {
  if (side === viewer) return "You";
  if (side === "platform") return "resell.store";
  return side === "buyer" ? names.buyer : names.seller;
}

/** What happened, in a line. The event's own words (if any) show under it. */
function eventLine(e: CaseEvent, reasonLabel: string, source: "buyer" | "paypal"): { text: string; quote: boolean } {
  const amount = money(e.amountCents);
  if (e.side === "platform") {
    const fallback: Record<CaseEvent["kind"], string> = {
      opened: "Opened the problem.",
      message: "Sent a note.",
      refund_offered: `Offered ${amount} back.`,
      offer_declined: "The offer was turned down.",
      refunded: e.amountCents ? `Refunded ${amount}.` : "Refunded the order.",
      escalated: "Stepped in, since there was no answer in time.",
      closed: "Decided for the seller.",
    };
    return { text: e.body ?? fallback[e.kind], quote: false };
  }
  switch (e.kind) {
    case "opened":
      return {
        text: source === "paypal" ? `Opened a case in PayPal: ${reasonLabel.toLowerCase()}.` : `Reported a problem: ${reasonLabel.toLowerCase()}.`,
        quote: true,
      };
    case "message":
      return { text: e.body ?? "", quote: false };
    case "refund_offered":
      return { text: `Offered ${amount} back.`, quote: true };
    case "offer_declined":
      return { text: `Said no thanks to ${amount} back.`, quote: true };
    case "refunded":
      if (e.side === "buyer") return { text: `Took ${amount} back. That wrapped it up.`, quote: true };
      return { text: e.amountCents ? `Refunded ${amount}.` : "Refunded the order.", quote: true };
    case "escalated":
      return { text: "Asked resell.store to step in.", quote: true };
    case "closed":
      return { text: e.body === "It's all good." ? "Said it's all good." : "Said it's sorted.", quote: e.body !== "It's all good." };
  }
}

/** Who said or did what, oldest first, with the amounts on the right. */
export function ProblemTimeline({
  view,
  tone,
  className,
}: {
  view: OrderCaseView;
  tone: Tone;
  className?: string;
}) {
  const t = tones[tone];
  const d = view.dispute;
  if (!d) return null;
  const names = { buyer: view.buyer.firstName, seller: view.shop.name };
  const initials: Record<CaseEvent["side"], string> = {
    buyer: view.buyer.initial,
    seller: view.shop.name[0]?.toUpperCase() ?? "S",
    platform: "r",
  };
  return (
    <ol className={cn("flex flex-col", className)}>
      {view.events.map((e) => {
        const line = eventLine(e, d.reasonLabel, d.source);
        const mine = e.side === view.side;
        return (
          <li key={e.id} className={cn("flex items-start gap-3 border-b py-4 first:pt-1 last:border-b-0", t.border)}>
            <span
              aria-hidden
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold",
                mine ? t.you : e.side === "platform" ? "bg-leaf-900 text-white" : "bg-accent-soft text-text",
              )}
            >
              {initials[e.side]}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-bold">{who(e.side, view.side, names)}</span>
                <span className={cn("text-sm", t.muted)}>{e.when}</span>
              </div>
              <p className="text-base break-words whitespace-pre-line">{line.text}</p>
              {line.quote && e.body && (
                <p className={cn("rounded-md px-3.5 py-2.5 text-base break-words whitespace-pre-line", t.soft)}>
                  &ldquo;{e.body}&rdquo;
                </p>
              )}
            </div>
            {e.amountCents != null && (
              <span
                className={cn(
                  "shrink-0 pt-0.5 text-right font-display text-lg font-extrabold tabular-nums",
                  e.kind === "refunded" ? "text-secondary" : e.kind === "offer_declined" && t.muted,
                )}
              >
                {money(e.amountCents)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A message on the problem, to the other side. */
export function ReplyBox({
  disputeId,
  to,
  tone,
  className,
}: {
  disputeId: string;
  /** "Maya's Closet", "Sam" */
  to: string;
  tone: Tone;
  className?: string;
}) {
  const t = tones[tone];
  const { pending, run } = useCaseAction();
  const [text, setText] = useState("");
  return (
    <form
      className={cn("flex flex-col gap-2", className)}
      onSubmit={async (e) => {
        e.preventDefault();
        const body = text.trim();
        if (!body) return;
        const ok = await run("reply", () => replyToProblem({ disputeId, body }), `Sent. We'll let ${to} know.`);
        if (ok) setText("");
      }}
    >
      <div className={cn("flex items-end gap-2 rounded-[24px] border-[1.5px] py-1.5 pr-1.5 pl-4", t.input)}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          maxLength={2000}
          placeholder={`Write to ${to}`}
          aria-label={`Message ${to} about the problem`}
          className="field-sizing-content max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-base outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || !!pending}
          className="h-9 shrink-0 cursor-pointer rounded-full bg-secondary px-4 text-sm font-bold text-on-secondary transition-colors hover:bg-leaf-900 disabled:cursor-default disabled:opacity-40"
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}

/** "Problem" / "With resell.store" / "Refunded" / "Closed": where the problem stands. */
export function ProblemBadge({ status, className }: { status: NonNullable<OrderCaseView["dispute"]>["status"]; className?: string }) {
  const tag = {
    open: { label: "Problem", className: "bg-accent-soft text-accent-text" },
    escalated: { label: "With resell.store", className: "bg-accent-soft text-accent-text" },
    refunded: { label: "Settled, refunded", className: "bg-secondary-soft text-secondary" },
    closed: { label: "Settled", className: "bg-secondary-soft text-secondary" },
  }[status];
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
