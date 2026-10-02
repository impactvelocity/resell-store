"use client";

import { useState } from "react";
import { SparkleIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import type { ChatMessage } from "../../../lib/mock-buyer";
import { SiteLink } from "../links";

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

/** The plain shield PayPal lines wear in the designs. */
export function ShieldIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Your own message, dark, on the right. */
export function MineBubble({ text }: { text: string }) {
  return (
    <div className="flex w-full justify-end">
      <p className="max-w-[min(420px,85%)] rounded-t-[20px] rounded-br-[6px] rounded-bl-[20px] bg-leaf-900 px-[18px] py-3 text-base text-white">
        {text}
      </p>
    </div>
  );
}

/** A grey bubble from the other side, with who said it above. */
export function TheirBubble({
  label,
  text,
}: {
  label: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-x-1.5 text-sm">{label}</div>
      <p className="max-w-[min(460px,90%)] rounded-tl-[6px] rounded-r-[20px] rounded-bl-[20px] bg-public-photo px-[18px] py-3 text-base">
        {text}
      </p>
    </div>
  );
}

/** "✦ Second Shutter's agent answered from the listing in a few seconds" */
export function AgentLabel({ storeName }: { storeName: string }) {
  return (
    <>
      <SparkleIcon size={14} className="text-pink-400" />
      <span className="font-semibold text-pink-600">{storeName}&apos;s agent</span>
      <span className="text-public-text-muted">answered from the listing in a few seconds</span>
    </>
  );
}

/** Three dots while the store's agent writes back. */
export function TypingBubble({ storeName }: { storeName: string }) {
  return (
    <div className="flex w-full flex-col items-start gap-1.5" aria-live="polite">
      <div className="flex items-center gap-1.5 text-sm">
        <SparkleIcon size={14} className="text-pink-400" />
        <span className="font-semibold text-pink-600">{storeName}&apos;s agent</span>
        <span className="text-public-text-muted">is checking the listing</span>
      </div>
      <div className="flex h-12 items-center gap-1.5 rounded-tl-[6px] rounded-r-[20px] rounded-bl-[20px] bg-public-photo px-5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-2 animate-bounce rounded-full bg-public-text-muted"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/** An offer you made, outlined, on the right. */
export function OfferBubble({
  message,
}: {
  message: Extract<ChatMessage, { type: "offer" }>;
}) {
  return (
    <div className="flex w-full justify-end">
      <div className="flex w-[340px] max-w-[90%] flex-col gap-1.5 rounded-t-[20px] rounded-br-[6px] rounded-bl-[20px] border border-public-border px-[18px] py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-public-text-muted">You offered</span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            ${message.amount}
          </span>
        </div>
        <p className="text-base">{message.text}</p>
        {message.deposit ? (
          <p className="flex items-center gap-1.5 pt-1 text-sm font-semibold text-leaf-600">
            <ShieldIcon />${message.deposit} deposit held by PayPal
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A line the platform adds, like a refund or a shipping update. */
export function NoteLine({ text }: { text: string }) {
  return (
    <p className="mx-auto max-w-[420px] rounded-full bg-leaf-100 px-4 py-2 text-center text-sm font-medium text-leaf-900">
      {text}
    </p>
  );
}

export type CounterState =
  | { status: "open" }
  | { status: "countering" }
  | { status: "countered"; amount: number }
  | { status: "accepted" }
  | { status: "declined" };

/**
 * The seller's counter offer. Accept, counter or decline right in the thread;
 * accepting leaves a "Pay $122 now" link to checkout.
 */
export function CounterCard({
  message,
  owner,
  listingSlug,
  deposit,
  state,
  onAccept,
  onStartCounter,
  onCounter,
  onCancelCounter,
  onDecline,
}: {
  message: Extract<ChatMessage, { type: "counter" }>;
  owner: string;
  listingSlug: string;
  deposit: number;
  state: CounterState;
  onAccept: () => void;
  onStartCounter: () => void;
  onCounter: (amount: number) => void;
  onCancelCounter: () => void;
  onDecline: () => void;
}) {
  const pill =
    state.status === "accepted"
      ? { text: "You accepted", tone: "bg-leaf-100 text-leaf-600" }
      : state.status === "declined"
        ? { text: "Declined", tone: "bg-public-photo text-public-text-muted" }
        : state.status === "countered"
          ? { text: `You countered at $${state.amount}`, tone: "bg-public-photo text-leaf-900" }
          : { text: message.expires, tone: "bg-lemon-100 text-leaf-900" };

  return (
    <div
      className={cn(
        "flex w-[460px] max-w-full flex-col gap-4 rounded-tl-[6px] rounded-r-[20px] rounded-bl-[20px] border-2 px-5 py-[22px] sm:px-6",
        state.status === "declined" ? "border-public-border" : "border-leaf-900",
      )}
    >
      <div className="flex w-full flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-public-text-muted">
            {owner}&apos;s counter offer
          </span>
          <span
            className={cn(
              "font-display text-4xl font-extrabold tracking-tight",
              state.status === "declined" && "text-public-text-muted line-through",
            )}
          >
            ${message.amount}
          </span>
        </div>
        <span
          className={cn(
            "flex h-7 items-center rounded-full px-3 text-sm font-semibold",
            pill.tone,
          )}
        >
          {pill.text}
        </span>
      </div>

      {state.status === "accepted" ? (
        <>
          <p className="text-sm text-public-text-muted">
            Deal at ${message.amount}. Pay the ${message.toPay} that&apos;s left and {owner} ships
            it within 2 days. PayPal holds it until you have the camera.
          </p>
          <SiteLink
            href={`/checkout/${listingSlug}`}
            className={cn(
              "flex h-12 w-full items-center justify-center rounded-full bg-leaf-600 text-base font-bold text-white hover:bg-leaf-900",
              focusRing,
            )}
          >
            Pay ${message.toPay} now
          </SiteLink>
        </>
      ) : state.status === "declined" ? (
        <p className="text-sm text-public-text-muted">
          You said no thanks. Your ${deposit} deposit is on its way back to your PayPal.
        </p>
      ) : state.status === "countered" ? (
        <p className="text-sm text-public-text-muted">
          {owner} has 24 hours to answer. Your ${deposit} deposit stays held until then.
        </p>
      ) : (
        <>
          <p className="text-sm text-public-text-muted">{message.detail}</p>
          {state.status === "countering" ? (
            <CounterForm
              max={message.amount}
              onSubmit={onCounter}
              onCancel={onCancelCounter}
            />
          ) : (
            <div className="flex w-full flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onAccept}
                className={cn(
                  "flex h-12 min-w-[140px] flex-1 cursor-pointer items-center justify-center rounded-full bg-leaf-600 text-base font-bold text-white hover:bg-leaf-900",
                  focusRing,
                )}
              >
                Accept ${message.amount}
              </button>
              <button
                type="button"
                onClick={onStartCounter}
                className={cn(
                  "flex h-12 cursor-pointer items-center justify-center rounded-full border border-leaf-900 px-[22px] text-base font-semibold hover:bg-public-photo",
                  focusRing,
                )}
              >
                Counter
              </button>
              <button
                type="button"
                onClick={onDecline}
                className={cn(
                  "cursor-pointer rounded-full px-2.5 py-3 text-center text-base font-semibold text-public-text-muted hover:text-text max-sm:w-full max-sm:py-1",
                  focusRing,
                )}
              >
                Decline
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CounterForm({
  max,
  onSubmit,
  onCancel,
}: {
  max: number;
  onSubmit: (amount: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(String(max - 5));
  const amount = Number(value);
  const valid = Number.isFinite(amount) && amount > 0 && amount < max;
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(Math.round(amount));
      }}
    >
      <div className="flex w-full flex-wrap items-center gap-2.5">
        <label className="flex h-12 min-w-0 flex-1 items-center gap-1 rounded-full border border-public-border px-5 focus-within:outline-2 focus-within:outline-secondary">
          <span className="sr-only">Your counter</span>
          <span className="font-bold">$</span>
          <input
            autoFocus
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
            className="w-full min-w-0 bg-transparent text-base font-bold outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={!valid}
          className={cn(
            "flex h-12 cursor-pointer items-center justify-center rounded-full bg-leaf-900 px-[22px] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40",
            focusRing,
          )}
        >
          Send counter
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "cursor-pointer rounded-full px-2.5 py-3 text-center text-base font-semibold text-public-text-muted hover:text-text max-sm:w-full max-sm:py-1",
            focusRing,
          )}
        >
          Cancel
        </button>
      </div>
      {!valid && value !== "" && (
        <p className="text-sm text-public-text-muted">
          A counter has to be under ${max}. At ${max}, just accept.
        </p>
      )}
    </form>
  );
}

/** The seller said yes to your offer; pay before it lapses. */
export function AcceptedCard({
  message,
  owner,
}: {
  message: Extract<ChatMessage, { type: "accepted" }>;
  owner: string;
}) {
  return (
    <div className="flex w-[460px] max-w-full flex-col gap-4 rounded-tl-[6px] rounded-r-[20px] rounded-bl-[20px] border-2 border-leaf-600 px-5 py-[22px] sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-public-text-muted">{owner} said yes</span>
          <span className="font-display text-4xl font-extrabold tracking-tight">
            ${message.amount}
          </span>
        </div>
        <span className="flex h-7 items-center rounded-full bg-leaf-100 px-3 text-sm font-semibold text-leaf-600">
          Offer accepted
        </span>
      </div>
      <p className="text-sm text-public-text-muted">{message.detail}</p>
      <SiteLink
        href={message.payHref}
        className={cn(
          "flex h-12 w-full items-center justify-center rounded-full bg-leaf-600 text-base font-bold text-white hover:bg-leaf-900",
          focusRing,
        )}
      >
        Pay ${message.amount} to keep it
      </SiteLink>
    </div>
  );
}
