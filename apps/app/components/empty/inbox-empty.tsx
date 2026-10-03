import type { ReactNode } from "react";
import { SparkleIcon, TruckIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { EmptyState } from "../empty-state";
import { ActionLink } from "./parts";
import { things, type SellerSummary } from "./summary";

/*
 * A5 Inbox, live, before anyone has written. Same frame as the designed inbox
 * (title, list column, thread pane) with the list explaining what will land
 * there and the pane holding the empty state.
 */

const kinds: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg leading-6 font-extrabold text-on-primary">
        $
      </span>
    ),
    title: "Offers",
    body: "Someone names a price. Your agent checks it against your lowest.",
  },
  {
    icon: (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-lg leading-6 font-extrabold text-text">
        ?
      </span>
    ),
    title: "Questions",
    body: "Size, condition, pickup. Your agent answers from what's in the listing.",
  },
  {
    icon: (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
        <TruckIcon size={20} />
      </span>
    ),
    title: "Things to ship",
    body: "When something sells, the address and the label land here.",
  },
  {
    icon: (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-text text-primary">
        <SparkleIcon size={18} />
      </span>
    ),
    title: "Your agent, asking first",
    body: "Anything it won't decide without a yes from you.",
  },
];

function WhatLandsHere({ className }: { className?: string }) {
  return (
    <section className={cn("flex flex-col gap-[10px] desk:gap-1", className)}>
      <h2 className="px-1 text-sm font-semibold tracking-wide text-text-muted uppercase desk:px-3 desk:pt-[6px] desk:pb-[6px]">
        What lands here
      </h2>
      <ul className="flex flex-col rounded-lg border border-border bg-surface px-4 py-0.5 desk:gap-1 desk:rounded-none desk:border-0 desk:bg-transparent desk:p-0">
        {kinds.map((k) => (
          <li
            key={k.title}
            className="flex items-start gap-3 border-b border-border py-[14px] last:border-b-0 desk:border-b-0 desk:p-3"
          >
            {k.icon}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-bold text-text">{k.title}</span>
              <span className="text-sm text-text-muted">{k.body}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InboxEmpty({ seller }: { seller: SellerSummary }) {
  const hasLive = seller.live > 0;

  const empty = (
    <EmptyState
      art="messages"
      sticker="All quiet"
      title={hasLive ? `All quiet for now, ${seller.firstName}` : "Nothing here yet"}
      actions={
        hasLive ? (
          <>
            <ActionLink href="/list/new">List another thing</ActionLink>
            {seller.shopHref && (
              <ActionLink href={seller.shopHref} variant="soft">
                See your shop
              </ActionLink>
            )}
          </>
        ) : (
          <>
            <ActionLink href="/list/new">List something</ActionLink>
            {seller.drafts > 0 && seller.shopHref && (
              <ActionLink href={seller.shopHref} variant="soft">
                Finish a draft
              </ActionLink>
            )}
          </>
        )
      }
    >
      {hasLive
        ? `You have ${things(seller.live)} live. When a buyer asks a question or makes an offer, it lands here.`
        : "When buyers ask about something or make an offer, it lands here. List something and the conversations start."}
    </EmptyState>
  );

  return (
    <div className="flex w-full flex-col pb-10 desk:h-dvh desk:gap-5 desk:px-8 desk:pt-8 desk:pb-10 xl:px-12">
      <header className="flex items-center justify-between px-5 pt-[max(12px,env(safe-area-inset-top))] desk:px-0 desk:pt-0">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-text desk:leading-[44px]">
          Inbox
        </h1>
      </header>

      <div className="flex w-full flex-col desk:min-h-0 desk:flex-1 desk:flex-row desk:gap-5">
        <div className="order-2 px-4 pt-2 desk:order-1 desk:w-[300px] desk:shrink-0 desk:overflow-y-auto desk:rounded-xl desk:border desk:border-border desk:bg-surface desk:px-3 desk:py-4 lg:w-[340px] xl:w-[400px]">
          <WhatLandsHere />
        </div>
        <div className="order-1 flex w-full items-center justify-center desk:order-2 desk:min-w-0 desk:flex-1 desk:rounded-xl desk:border desk:border-border desk:bg-surface desk:p-7">
          {empty}
        </div>
      </div>
    </div>
  );
}
