import Link from "next/link";
import type { ReactNode } from "react";
import { TruckIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { EmptyState } from "../empty-state";
import type { SellerOffer, SellerOrder } from "../seller-live/data";
import { money, shipToLine, versusLowest } from "../seller-live/format";
import { OfferCard, ShipForm, PaymentNote } from "../seller-live/parts";
import { ThreadRow, type ThreadListItem } from "../messages/thread-list";

/*
 * A5 Inbox, live: new messages from buyers, offers to answer, sales to ship,
 * offers waiting on the buyer, read conversations, and everything that's done
 * (smaller and greyed, under "Earlier"). Same frame as the designed inbox
 * (list column, pane). The pane holds an open conversation, or else the most
 * pressing thing, ready to act on.
 */

type Row = {
  key: string;
  href: string;
  icon: ReactNode;
  title: string;
  summary: string;
  time: string;
  bold?: boolean;
  /** Done and dusted: shown smaller and greyed. */
  quiet?: boolean;
};

const iconBase = "flex size-10 shrink-0 items-center justify-center rounded-full";

const moneyIcon = (
  <span className={cn(iconBase, "bg-primary font-display text-lg leading-6 font-extrabold text-on-primary")}>$</span>
);
const shipIcon = (
  <span className={cn(iconBase, "bg-secondary text-on-secondary")}>
    <TruckIcon size={20} />
  </span>
);
const personIcon = (initial: string) => (
  <span className={cn(iconBase, "bg-accent-soft font-display text-lg leading-6 font-extrabold text-text")}>
    {initial}
  </span>
);

function offerRow(o: SellerOffer): Row {
  const vs = versusLowest(o.amountCents, o.lowestCents);
  return {
    key: o.id,
    href: `/offers/${o.id}`,
    icon: moneyIcon,
    title: `${o.buyer.firstName} offered ${money(o.amountCents)}`,
    summary: [o.listing.title, vs?.label.toLowerCase(), o.timeLeft].filter(Boolean).join(", "),
    time: shortAgo(o.when),
    bold: true,
  };
}

function shipRow(o: SellerOrder): Row {
  return {
    key: o.id,
    href: "/sales",
    icon: shipIcon,
    title: `Ship ${o.listing.title}`,
    summary: `To ${shipToLine(o)}. ${o.soldOn}.`,
    time: "",
    bold: true,
  };
}

function waitingRow(o: SellerOffer): Row {
  return {
    key: o.id,
    href: `/offers/${o.id}`,
    icon: personIcon(o.buyer.initial),
    title:
      o.status === "countered"
        ? `You countered ${o.buyer.firstName} at ${money(o.counterCents)}`
        : `${o.buyer.firstName} has to pay ${money(o.counterCents ?? o.amountCents)}`,
    summary: [o.listing.title, o.timeLeft].filter(Boolean).join(", "),
    time: shortAgo(o.when),
  };
}

const offerOutcome: Partial<Record<SellerOffer["status"], string>> = {
  declined: "declined",
  withdrawn: "withdrawn",
  expired: "ran out",
  paid: "paid",
  accepted: "accepted",
};

function pastOfferRow(o: SellerOffer): Row {
  const outcome = o.closedBySale ? "closed when it sold" : (offerOutcome[o.status] ?? o.status);
  return {
    key: o.id,
    href: `/offers/${o.id}`,
    icon: moneyIcon,
    title: `${o.buyer.firstName}'s offer of ${money(o.amountCents)}, ${outcome}`,
    summary: o.listing.title,
    time: shortAgo(o.when),
    quiet: true,
  };
}

function pastOrderRow(o: SellerOrder): Row {
  const where =
    o.status === "completed"
      ? o.paidThrough === "paypal" && !o.releasedAt
        ? "Done, payout on its way"
        : "Done, paid out"
      : o.status === "shipped" || o.status === "delivered"
        ? "On its way"
        : o.status === "refunded"
          ? "Refunded"
          : "Cancelled";
  return {
    key: o.id,
    href: "/sales",
    icon: shipIcon,
    title: `Sold ${o.listing.title} to ${o.buyer.firstName}`,
    summary: `${where}. ${o.soldOn}.`,
    time: "",
    quiet: true,
  };
}

/** "3 hours ago" → "3h". */
function shortAgo(when: string) {
  if (when === "just now") return "Now";
  const m = when.match(/^(\d+) (minute|hour|day)/);
  return m ? `${m[1]}${m[2]![0] === "m" ? "m" : m[2]![0]}` : when;
}

function InboxRow({ row }: { row: Row }) {
  return (
    <Link
      href={row.href}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border py-[14px] transition-colors last:border-b-0 desk:rounded-lg desk:border-b-0 desk:p-3 desk:hover:bg-surface-muted",
        row.quiet && "py-2.5 opacity-60 hover:opacity-100 desk:py-2",
      )}
    >
      <span className={cn(row.quiet && "origin-top-left scale-75 -mr-2.5 -mb-2.5")}>{row.icon}</span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn(
            "text-text",
            row.quiet ? "text-sm font-semibold" : "text-base",
            !row.quiet && (row.bold ? "font-bold" : "font-semibold desk:font-bold"),
          )}
        >
          {row.title}
        </div>
        <div className={cn("text-text-muted", row.quiet ? "text-xs" : "text-sm")}>{row.summary}</div>
      </div>
      {row.time && (
        <div className="flex w-[52px] shrink-0 flex-col items-end gap-1.5 desk:w-auto">
          <span className="text-sm font-medium text-text-muted">{row.time}</span>
        </div>
      )}
    </Link>
  );
}

function Section({
  label,
  rows,
  threads,
  activeThread,
  first,
}: {
  label: string;
  rows?: Row[];
  threads?: ThreadListItem[];
  activeThread?: string;
  first?: boolean;
}) {
  if (!rows?.length && !threads?.length) return null;
  return (
    <section className="flex flex-col gap-[10px] px-4 pt-[28px] desk:gap-1 desk:px-0 desk:pt-0">
      <h2
        className={cn(
          "px-1 text-sm font-semibold tracking-wide text-text-muted uppercase desk:px-3 desk:pb-[6px]",
          first ? "desk:pt-[6px]" : "desk:pt-[14px]",
        )}
      >
        {label}
      </h2>
      <div className="flex flex-col rounded-lg border border-border bg-surface px-4 py-0.5 desk:gap-1 desk:rounded-none desk:border-0 desk:bg-transparent desk:p-0">
        {threads?.map((t) => (
          <ThreadRow key={t.id} item={t} href={`/inbox/${t.id}`} active={t.id === activeThread} tone="app" />
        ))}
        {rows?.map((row) => (
          <InboxRow key={row.key} row={row} />
        ))}
      </div>
    </section>
  );
}

/** The most pressing thing, ready to act on: the newest offer, else the oldest sale to ship, else a new message. */
function TopItem({ offer, order, unread }: { offer?: SellerOffer; order?: SellerOrder; unread?: ThreadListItem }) {
  if (offer) {
    return (
      <div className="flex w-full max-w-[640px] flex-col gap-4">
        <h2 className="font-display text-xl font-extrabold tracking-tight">Needs you</h2>
        <OfferCard offer={offer} showListing detailHref={`/offers/${offer.id}`} />
      </div>
    );
  }
  if (order) {
    return (
      <div className="flex w-full max-w-[520px] flex-col gap-4">
        <h2 className="font-display text-xl font-extrabold tracking-tight">Ready to ship</h2>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-col">
            <span className="text-base font-bold">{order.listing.title}</span>
            <span className="text-sm text-text-muted">
              {order.buyer.name} paid {money(order.totalCents)}. {order.soldOn}.
            </span>
          </div>
          <div className="rounded-md bg-surface-muted px-4 py-3 text-sm text-text">
            <div className="font-semibold">{order.shipTo.name}</div>
            <div className="whitespace-pre-line text-text-muted">{order.shipTo.address}</div>
            <div className="text-text-muted">{order.shipTo.country}</div>
          </div>
          <ShipForm order={order} />
          <PaymentNote />
        </div>
      </div>
    );
  }
  if (unread) {
    return (
      <div className="flex w-full max-w-[520px] flex-col gap-4">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          {unread.needsYou ? "A question for you" : "New message"}
        </h2>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold">
              {unread.needsYou
                ? `${unread.withName} asked something your agent couldn't answer`
                : unread.lastByAgent
                  ? `Your agent answered ${unread.withName}`
                  : unread.withName}
              {!unread.needsYou && !unread.lastByAgent && (unread.listing ? ` asked about ${unread.listing.title}` : " wrote to you")}
              {(unread.needsYou || unread.lastByAgent) && unread.listing && ` about ${unread.listing.title}`}
            </span>
            <span className="text-base text-text-muted">&ldquo;{unread.preview}&rdquo;</span>
          </div>
          <Link
            href={`/inbox/${unread.id}`}
            className="inline-flex h-11 w-fit items-center rounded-full bg-secondary px-5 text-sm font-bold text-on-secondary transition-colors hover:bg-leaf-900"
          >
            Read and reply
          </Link>
        </div>
      </div>
    );
  }
  return (
    <EmptyState size="sm" art="messages" sticker="All good" title="Nothing needs you right now">
      Open a conversation on the left to read and reply. Anything waiting on buyers shows up there too.
    </EmptyState>
  );
}

export function InboxLive({
  toAnswer,
  toShip,
  waiting,
  threads = [],
  pastOffers = [],
  pastOrders = [],
  pane,
  activeThread,
}: {
  toAnswer: SellerOffer[];
  toShip: SellerOrder[];
  waiting: SellerOffer[];
  /** Conversations with buyers, newest first. */
  threads?: ThreadListItem[];
  /** Answered, lapsed or paid offers, and shipped or finished sales: the "Earlier" section. */
  pastOffers?: SellerOffer[];
  pastOrders?: SellerOrder[];
  /** An open conversation, in place of the most pressing thing. */
  pane?: ReactNode;
  activeThread?: string;
}) {
  const unread = threads.filter((t) => t.unread || t.needsYou);
  const read = threads.filter((t) => !t.unread && !t.needsYou);
  // Newest first, done things mixed by when they happened
  const earlier = [
    ...pastOffers.map((o) => ({ at: o.updatedAt, row: pastOfferRow(o) })),
    ...pastOrders.map((o) => ({ at: o.createdAt, row: pastOrderRow(o) })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20)
    .map((e) => e.row);
  const sections = [
    { label: "New messages", threads: unread },
    { label: "Needs you", rows: toAnswer.map(offerRow) },
    { label: "To ship", rows: toShip.map(shipRow) },
    { label: "Waiting on buyers", rows: waiting.map(waitingRow) },
    { label: "Messages", threads: read },
    { label: "Earlier", rows: earlier },
  ].filter((x) => x.rows?.length || x.threads?.length);

  return (
    <div
      className={cn(
        "flex w-full flex-col desk:h-dvh desk:gap-5 desk:px-8 desk:pt-8 desk:pb-10 xl:px-12",
        pane ? "h-[calc(100dvh-128px)]" : "pb-10",
      )}
    >
      <header
        className={cn(
          "items-center justify-between px-5 pt-[max(12px,env(safe-area-inset-top))] desk:flex desk:px-0 desk:pt-0",
          pane ? "hidden" : "flex",
        )}
      >
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-text desk:leading-[44px]">Inbox</h1>
      </header>

      <div className="flex w-full flex-col desk:min-h-0 desk:flex-1 desk:flex-row desk:gap-5 max-desk:min-h-0 max-desk:flex-1">
        <nav
          aria-label="Inbox"
          className={cn(
            "w-full flex-col desk:flex desk:w-[300px] desk:shrink-0 desk:gap-1 desk:overflow-y-auto desk:rounded-xl desk:border desk:border-border desk:bg-surface desk:px-3 desk:py-4 lg:w-[340px] xl:w-[400px]",
            pane ? "hidden" : "flex",
          )}
        >
          {sections.map((x, i) => (
            <Section key={x.label} {...x} activeThread={activeThread} first={i === 0} />
          ))}
        </nav>
        {pane ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden desk:min-w-0 desk:rounded-xl desk:border desk:border-border">
            {pane}
          </div>
        ) : (
          <div className="hidden desk:flex desk:min-w-0 desk:flex-1 desk:items-start desk:justify-center desk:overflow-y-auto desk:rounded-xl desk:border desk:border-border desk:bg-surface desk:p-7">
            <TopItem offer={toAnswer[0]} order={toShip[0]} unread={unread.find((t) => t.needsYou) ?? unread[0]} />
          </div>
        )}
      </div>
    </div>
  );
}
