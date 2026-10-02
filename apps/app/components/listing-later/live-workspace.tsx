"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { CheckIcon, ChevronLeftIcon, CloseIcon } from "@repo/ui/icons";
import { LemonMark } from "@repo/ui/logo";
import { cn } from "@repo/ui/lib/utils";
import { Composer } from "../agent-chat/agent-chat";
import { stepHref, steps } from "../workspace/listing-workspace";

/*
 * The listing workspace once the listing is live (C7 after Publish, C8).
 * Same frame as ListingWorkspace, but every step is done, the last one reads
 * "Published", the bar shows a green "Live" tag and "Close" instead of the
 * saved state. On a phone there's no listing peek: everything is in the chat.
 *
 * Kept local because the shared ListingWorkspace has no published state yet.
 */

export function LiveTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-7 w-fit shrink-0 items-center gap-1.5 rounded-full bg-secondary-soft px-3 text-sm font-semibold text-secondary",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-secondary" />
      Live
    </span>
  );
}

function DoneStepper({ listingId }: { listingId: string }) {
  return (
    <nav aria-label="Steps" className="flex items-center gap-2.5">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <Fragment key={step.key}>
            {i > 0 && (
              <span aria-hidden className="h-0.5 w-6 shrink-0 rounded-full bg-secondary" />
            )}
            <Link
              href={stepHref(listingId, step.key)}
              className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-75"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
                <CheckIcon size={14} strokeWidth={3.4} />
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  !last && "hidden xl:inline",
                )}
              >
                {last ? "Published" : step.label}
              </span>
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}

export function LiveWorkspace({
  listingId,
  shopName,
  title = "New listing",
  chat,
  canvas,
  busy,
  onSend,
  closeHref = "/shops/home-and-kitchen",
  backHref,
}: {
  listingId: string;
  shopName: string;
  title?: string;
  chat: ReactNode;
  canvas: ReactNode;
  busy?: boolean;
  onSend?: (text: string) => void;
  closeHref?: string;
  /** Phone back button. Defaults to history back. */
  backHref?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Desktop top bar */}
      <header className="hidden h-[72px] shrink-0 items-center justify-between border-b border-border bg-surface px-6 desk:flex">
        <div className="flex min-w-0 flex-1 items-center gap-3.5 xl:w-[340px] xl:flex-none">
          <Link href="/home" aria-label="Home">
            <LemonMark size={32} />
          </Link>
          <div className="flex min-w-0 flex-col text-sm">
            <span className="truncate font-bold">{title}</span>
            <span className="truncate text-text-muted">in {shopName}</span>
          </div>
        </div>
        <div className="shrink-0 px-6">
          <DoneStepper listingId={listingId} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3.5 xl:w-[340px] xl:flex-none">
          <LiveTag />
          <Link
            href={closeHref}
            className="flex h-11 items-center rounded-full border-[1.5px] border-border bg-surface px-5 text-sm font-bold transition-colors hover:bg-surface-muted"
          >
            Close
          </Link>
        </div>
      </header>

      {/* Phone flow bar and stage header */}
      <div className="flex shrink-0 flex-col desk:hidden">
        <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Back"
            onClick={() => (backHref ? router.push(backHref) : router.back())}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-surface"
          >
            <ChevronLeftIcon />
          </button>
          <span className="text-base font-bold">{title}</span>
          <Link
            href={closeHref}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-full border-[1.5px] border-border bg-surface"
          >
            <CloseIcon size={18} />
          </Link>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-5">
          <div className="flex w-full items-center gap-1.5" aria-hidden>
            {steps.map((s) => (
              <span key={s.key} className="h-1.5 flex-1 rounded-full bg-secondary" />
            ))}
          </div>
          <div className="flex items-center justify-between px-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Published
            </h1>
            <LiveTag />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-h-0 w-full flex-col desk:w-[420px] desk:shrink-0 desk:border-r desk:border-border xl:w-[520px]">
          {chat}
          <div className="hidden shrink-0 px-8 pb-6 desk:block">
            <Composer busy={busy} onSend={onSend} />
          </div>
        </section>
        <section className="hidden min-h-0 flex-1 overflow-y-auto bg-surface-muted desk:block">
          <div className="px-10 py-8">{canvas}</div>
        </section>
      </div>
    </div>
  );
}
