"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "@repo/ui/drawer";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  CloseIcon,
  ListIcon,
} from "@repo/ui/icons";
import { DotMark } from "@repo/ui/logo";
import { cn } from "@repo/ui/lib/utils";
import { Composer } from "../agent-chat/agent-chat";
import { ProgressBar } from "./listing-panel";

/*
 * Listing workspace (spec 04 / A. Listing workspace). Screens C1 to C8.
 * No sidebar. Desktop: 72px top bar with the stepper, a 520px chat column and
 * a canvas that fills the rest. Phone: flow bar, step bars, the chat, and a
 * listing peek above the composer that opens the canvas as a 90% drawer.
 */

export const steps = [
  { key: "research", label: "Research" },
  { key: "details", label: "Details" },
  { key: "photos", label: "Photos" },
  { key: "words", label: "Words" },
  { key: "publish", label: "Publish" },
] as const;

export type StepKey = (typeof steps)[number]["key"];

export function stepHref(listingId: string, step: StepKey) {
  return `/list/${listingId}/${step}`;
}

function Stepper({ listingId, current }: { listingId: string; current: number }) {
  return (
    <nav aria-label="Steps" className="flex items-center gap-2.5">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        const inner = (
          <>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold",
                state === "done" && "bg-secondary text-on-secondary",
                state === "current" && "bg-primary text-on-primary",
                state === "upcoming" && "bg-surface-muted text-text-muted",
              )}
            >
              {state === "done" ? <CheckIcon size={14} strokeWidth={3.4} /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                // Narrow desktops only label the current step
                state !== "current" && "hidden xl:inline",
                state === "current" && "font-bold text-text",
                state === "done" && "font-semibold text-text",
                state === "upcoming" && "font-medium text-text-muted",
              )}
            >
              {step.label}
            </span>
          </>
        );
        return (
          <Fragment key={step.key}>
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "h-0.5 w-6 shrink-0 rounded-full",
                  i <= current ? "bg-secondary" : "bg-border",
                )}
              />
            )}
            {state === "done" ? (
              <Link
                href={stepHref(listingId, step.key)}
                className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-75"
              >
                {inner}
              </Link>
            ) : (
              <span
                aria-current={state === "current" ? "step" : undefined}
                className="flex items-center gap-2"
              >
                {inner}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

function PhoneStepBars({ current }: { current: number }) {
  return (
    <div className="flex w-full items-center gap-1.5" aria-hidden>
      {steps.map((step, i) => (
        <span
          key={step.key}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            i < current ? "bg-secondary" : i === current ? "bg-primary" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

/** "Saving" for a beat after something changes, then "Saved a moment ago". */
function useSavedLabel(trigger: unknown) {
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setSaving(true);
    const t = setTimeout(() => setSaving(false), 900);
    return () => clearTimeout(t);
  }, [trigger]);
  return saving ? "Saving" : "Saved a moment ago";
}

export interface ListingWorkspaceProps {
  listingId: string;
  step: StepKey;
  /** "in Home and kitchen finds" under the title on desktop. */
  shopName?: string;
  title?: string;
  /** The chat thread: messages and cards. */
  chat: ReactNode;
  /** The canvas on desktop, the drawer on a phone. */
  canvas: ReactNode;
  /** Fields filled, for the phone peek. */
  filled?: number;
  total?: number;
  composerHint?: string;
  busy?: boolean;
  onSend?: (text: string) => void;
  /** The composer's Stop button while `busy`. */
  onStop?: () => void;
  /** The composer's camera button, e.g. to open the photo picker. */
  onCamera?: () => void;
  /** Phone only: start with the listing drawer open. */
  defaultCanvasOpen?: boolean;
  /** Change this to flash "Saving" in the bar. */
  saveKey?: unknown;
  /** Where Save and close goes. */
  closeHref?: string;
}

export function ListingWorkspace({
  listingId,
  step,
  shopName = "Home and kitchen finds",
  title = "New listing",
  chat,
  canvas,
  filled = 0,
  total = 12,
  composerHint,
  busy,
  onSend,
  onStop,
  onCamera,
  defaultCanvasOpen,
  saveKey,
  closeHref = "/shops/home-and-kitchen",
}: ListingWorkspaceProps) {
  const router = useRouter();
  const current = steps.findIndex((s) => s.key === step);
  const next = steps[current + 1];
  const prev = steps[current - 1];
  const saved = useSavedLabel(saveKey);

  const composer = (
    <Composer
      placeholder={composerHint}
      busy={busy}
      onSend={onSend}
      onStop={onStop}
      onCamera={onCamera}
    />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Desktop top bar */}
      <header className="hidden h-[72px] shrink-0 items-center justify-between border-b border-border bg-surface px-6 desk:flex">
        <div className="flex min-w-0 flex-1 items-center gap-3.5 xl:w-[340px] xl:flex-none">
          <Link href="/home" aria-label="Home">
            <DotMark />
          </Link>
          <div className="flex min-w-0 flex-col text-sm">
            <span className="truncate font-bold">{title}</span>
            <span className="truncate text-text-muted">in {shopName}</span>
          </div>
        </div>
        <div className="shrink-0 px-6">
          <Stepper listingId={listingId} current={current} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3.5 xl:w-[340px] xl:flex-none">
          <span className="hidden text-sm font-medium text-text-muted xl:inline">
            {saved}
          </span>
          <Link
            href={closeHref}
            className="flex h-11 items-center rounded-full border-[1.5px] border-border bg-surface px-5 text-sm font-bold transition-colors hover:bg-surface-muted"
          >
            Save and close
          </Link>
        </div>
      </header>

      {/* Phone flow bar and stage header */}
      <div className="flex shrink-0 flex-col desk:hidden">
        <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Back"
            onClick={() =>
              prev ? router.push(stepHref(listingId, prev.key)) : router.back()
            }
            className="flex size-10 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-surface"
          >
            <ChevronLeftIcon />
          </button>
          <span className="text-base font-bold">{title}</span>
          <Link
            href={closeHref}
            aria-label="Save and close"
            className="flex size-10 items-center justify-center rounded-full border-[1.5px] border-border bg-surface"
          >
            <CloseIcon size={18} />
          </Link>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-5">
          <PhoneStepBars current={current} />
          <div className="flex items-baseline justify-between px-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              {steps[current]?.label}
            </h1>
            <span className="text-sm font-medium text-text-muted">
              Step {current + 1} of {steps.length}
              {next ? `, ${next.label} next` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Chat column */}
        <section className="flex min-h-0 w-full flex-col desk:w-[420px] desk:shrink-0 xl:w-[520px] desk:border-r desk:border-border">
          {chat}
          <div className="hidden shrink-0 px-8 pb-6 desk:block">{composer}</div>

          {/* Phone dock: listing peek + composer */}
          <div className="flex shrink-0 flex-col gap-2.5 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] desk:hidden">
            <Drawer defaultOpen={defaultCanvasOpen}>
              <DrawerTrigger className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 text-left">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft">
                  <ListIcon />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-baseline justify-between text-sm">
                    <span className="font-bold">Your listing so far</span>
                    <span className="font-medium text-text-muted">
                      {filled} of {total} filled
                    </span>
                  </span>
                  <ProgressBar value={filled / total} className="bg-surface-muted" />
                </span>
                <ChevronUpIcon className="text-text-muted" />
              </DrawerTrigger>
              <DrawerContent>
                <div className="px-4 pt-2 pb-8">{canvas}</div>
              </DrawerContent>
            </Drawer>
            {composer}
          </div>
        </section>

        {/* Canvas */}
        <section className="hidden min-h-0 flex-1 overflow-y-auto bg-surface-muted desk:block">
          <div className="px-10 py-8">{canvas}</div>
        </section>
      </div>
    </div>
  );
}
