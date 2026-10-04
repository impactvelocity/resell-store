"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import {
  accountCounts,
  type BuyerOffer,
  type BuyerOrder,
  type OrderStatus,
} from "../../../lib/mock-buyer";
import { getStore } from "../../../lib/mock-market";
import { signOut } from "../../../lib/auth-client";
import { type ArtKey } from "../art";
import { SiteLink } from "../links";
import { ListingImage } from "../parts";

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

const navItems: { id: string; label: string; count?: number }[] = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders", count: accountCounts.orders },
  { id: "offers", label: "Offers", count: accountCounts.offers },
  { id: "favourites", label: "Favourites", count: accountCounts.favourites },
  { id: "following", label: "Following", count: accountCounts.following },
];

/**
 * The account's left nav. Sections jump within the page; on a phone it turns
 * into a row of chips you scroll sideways. With `live` counts it's a real
 * account: orders, offers, saved things and follows, and a real sign out.
 */
export function AccountNav({
  live,
  sells = false,
}: {
  live?: { orders: number; offers: number; saved?: number; following?: number };
  /** They own a shop: "Manage your stores" rather than "Start selling" */
  sells?: boolean;
} = {}) {
  const toast = useToast();
  const [active, setActive] = useState("overview");
  const items = live
    ? [
        { id: "overview", label: "Overview" },
        { id: "orders", label: "Orders", count: live.orders },
        { id: "offers", label: "Offers", count: live.offers },
        ...(live.saved != null ? [{ id: "saved", label: "Saved", count: live.saved }] : []),
        ...(live.following != null ? [{ id: "following", label: "Following", count: live.following }] : []),
      ]
    : navItems;
  const item = (on: boolean) =>
    cn(
      "flex h-11 shrink-0 items-center justify-between gap-3 rounded-full px-4 text-base whitespace-nowrap",
      on ? "bg-public-photo font-bold" : "font-medium hover:bg-public-photo/60",
      "max-desk:border max-desk:border-public-border max-desk:text-sm",
      on && "max-desk:border-transparent",
      focusRing,
    );

  return (
    <nav
      aria-label="Account"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] desk:sticky desk:top-8 desk:mx-0 desk:w-[228px] desk:shrink-0 desk:flex-col desk:gap-1 desk:overflow-visible desk:px-0"
    >
      {items.map((n) => (
        <a
          key={n.id}
          href={`#${n.id}`}
          onClick={() => setActive(n.id)}
          aria-current={active === n.id ? "true" : undefined}
          className={item(active === n.id)}
        >
          {n.label}
          {n.count != null && (
            <span className="text-sm font-normal text-public-text-muted">{n.count}</span>
          )}
        </a>
      ))}
      <SiteLink href="/agent" className={item(false)}>
        My agent
      </SiteLink>
      <SiteLink href="/home?mode=selling" className={item(false)}>
        {sells ? "Manage your stores" : "Start selling"}
      </SiteLink>
      <button
        type="button"
        onClick={() =>
          toast.add({
            title: live
              ? "Your last address fills in at checkout. Change it there for now."
              : "2418 Alder Street and PayPal. Change them at checkout for now.",
          })
        }
        className={cn(item(false), "cursor-pointer text-left")}
      >
        Addresses and payment
      </button>
      {live ? (
        <SignOutButton className={cn(item(false), "cursor-pointer text-left text-public-text-muted")} />
      ) : (
        <SiteLink href="/discover" className={cn(item(false), "text-public-text-muted")}>
          Sign out
        </SiteLink>
      )}
    </nav>
  );
}

/** Signs out of the marketplace and lands back on Discover. */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut().catch(() => {});
        router.push("/discover");
        router.refresh();
      }}
      className={className}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

/** Thumb, title, status and action, in four lanes on desktop and stacked on a phone. */
export function Row({
  art,
  photo,
  title,
  line,
  status,
  fresh = false,
  children,
}: {
  art?: ArtKey;
  /** A live listing's cover, shown instead of the drawing */
  photo?: string | null;
  title: string;
  line: string;
  /** `muted` greys out things that are over (declined, ran out) */
  status: OrderStatus & { muted?: boolean };
  /** Changed since their last visit: a small "New" tag by the status */
  fresh?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-public-border py-5 last:border-b-0 sm:grid-cols-[72px_minmax(0,1fr)_172px] sm:gap-x-5 xl:grid-cols-[72px_minmax(0,1fr)_320px_172px]">
      <span className="row-span-2 flex size-14 items-center justify-center self-start overflow-hidden rounded-[12px] bg-public-photo sm:size-[72px] sm:self-center xl:row-span-1">
        <ListingImage
          photo={photo ?? undefined}
          art={art}
          artSize={46}
          artClassName={art ? "max-sm:size-9" : undefined}
        />
      </span>
      <span className="col-start-2 flex flex-col gap-0.5">
        <span className="text-base font-bold">{title}</span>
        <span className="text-sm text-public-text-muted">{line}</span>
      </span>
      <span className="col-start-2 flex flex-col gap-0.5 xl:col-start-3 xl:row-start-1">
        <span
          className={cn(
            "text-base font-bold",
            status.done && "text-leaf-600",
            status.muted && "text-public-text-muted",
          )}
        >
          {status.title}
          {fresh && (
            <span className="ml-2 inline-flex h-5 items-center rounded-full bg-pink-100 px-2 align-middle text-xs font-bold text-pink-600">
              New
            </span>
          )}
        </span>
        <span className="text-sm text-public-text-muted">{status.detail}</span>
      </span>
      <span className="col-span-2 flex flex-col items-stretch gap-1.5 sm:col-span-1 sm:col-start-3 sm:row-span-2 sm:row-start-1 xl:col-start-4 xl:row-span-1">
        {children}
      </span>
    </li>
  );
}

const pill =
  "flex h-11 w-full cursor-pointer items-center justify-center rounded-full text-sm font-semibold";

/** An order with its local state: confirming it pays the seller, then you can review. */
export function OrderRow({ order }: { order: BuyerOrder }) {
  const toast = useToast();
  const [status, setStatus] = useState(order.status);
  const [action, setAction] = useState(order.action);
  const [reviewed, setReviewed] = useState(false);
  const store = getStore(order.store)!;
  const price = order.line.match(/\$\d+/)?.[0] ?? "";

  return (
    <Row art={order.art} title={order.title} line={order.line} status={status}>
      {action === "confirm" && (
        <>
          <button
            type="button"
            onClick={() => {
              setStatus({
                title: "All done",
                detail: `You confirmed it just now. ${store.owner} was paid.`,
                done: true,
              });
              setAction("review");
              toast.add({ title: `Thanks. ${price} is on its way to ${store.owner}.` });
            }}
            className={cn(pill, "bg-leaf-600 text-white hover:bg-leaf-900", focusRing)}
          >
            It&apos;s all good
          </button>
          <button
            type="button"
            onClick={() =>
              toast.add({
                title: `We've told ${store.owner}. PayPal keeps holding your ${price}.`,
              })
            }
            className={cn(
              "cursor-pointer rounded-full text-center text-sm font-medium text-public-text-muted hover:text-text",
              focusRing,
            )}
          >
            Report a problem
          </button>
        </>
      )}
      {action === "track" && (
        <button
          type="button"
          onClick={() => toast.add({ title: "Canada Post: in Winnipeg, arrives October 6." })}
          className={cn(pill, "border border-leaf-900 hover:bg-public-photo", focusRing)}
        >
          Track parcel
        </button>
      )}
      {action === "review" && (
        <button
          type="button"
          disabled={reviewed}
          onClick={() => {
            setReviewed(true);
            toast.add({ title: `Five stars for ${store.name}. Thanks for saying so.` });
          }}
          className={cn(
            pill,
            "border border-public-border hover:bg-public-photo disabled:cursor-default disabled:bg-transparent disabled:text-leaf-600",
            focusRing,
          )}
        >
          {reviewed ? "Review sent" : "Leave a review"}
        </button>
      )}
    </Row>
  );
}

export function OfferRow({ offer }: { offer: BuyerOffer }) {
  return (
    <Row art={offer.art} title={offer.title} line={offer.line} status={offer.status}>
      <SiteLink
        href={offer.cta.href}
        className={cn(
          pill,
          "text-white",
          offer.cta.tone === "dark" ? "bg-leaf-900 hover:bg-leaf-600" : "bg-leaf-600 hover:bg-leaf-900",
          focusRing,
        )}
      >
        {offer.cta.label}
      </SiteLink>
    </Row>
  );
}

/** "See all orders": there's only one page of them in the prototype. */
export function SeeAllOrders() {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => toast.add({ title: "That's every order so far." })}
      className={cn(
        "cursor-pointer rounded-full text-sm font-semibold text-leaf-600 hover:underline",
        focusRing,
      )}
    >
      See all orders
    </button>
  );
}
