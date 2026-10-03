"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, IconButton } from "@repo/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog";
import {
  ArrowUpRightIcon,
  BagIcon,
  ChatIcon,
  ChevronRightIcon,
  CloseIcon,
  EyeIcon,
  LinkIcon,
  MoreIcon,
  PencilIcon,
  TagIcon,
} from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { markSold, relist, unpublish } from "../../app/actions/listing-publish";
import type { PhotoView, WorkspaceListing } from "../../lib/server/listings";
import { EmptyState } from "../empty-state";
import { Breadcrumb, ConfirmDialog } from "../offers/offer-parts";
import { MobileBackHeader } from "../shell/page";
import { stepHref } from "../workspace/listing-workspace";
import { formatPrice, lowestCents, shareLink } from "./format";
import { trackShare } from "../../lib/track";
import { ThreadRow, type ThreadListItem } from "../messages/thread-list";
import { PhotoThumb } from "./photo-thumb";
import type { SellerOffer, SellerOrder } from "../seller-live/data";
import { money, shipToLine } from "../seller-live/format";
import { OfferList, OrderTag, PaymentNote } from "../seller-live/parts";

/*
 * C9 Listing / Manage on real data: the listing, its state and what to do with
 * it, how it's doing (views, likes, shares, offers), the offers on it
 * (answered from here) and buyers' questions about it (answered in the inbox).
 */

type Status = WorkspaceListing["status"];

function liveFor(iso: string | null) {
  if (!iso) return "Live";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "Live since today";
  if (days === 1) return "Live for a day";
  return `Live for ${days} days`;
}

function StateTags({ listing, status }: { listing: WorkspaceListing; status: Status }) {
  return (
    <>
      {status === "live" ? (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary-soft px-3 text-sm font-semibold text-secondary">
          <span aria-hidden className="size-1.5 rounded-full bg-secondary" />
          {liveFor(listing.publishedAt)}
        </span>
      ) : (
        <span className="inline-flex h-7 items-center rounded-full bg-surface-muted px-3 text-sm font-semibold text-text-muted">
          {status === "sold" ? "Sold" : "Draft"}
        </span>
      )}
      {status === "live" && listing.visibility === "link" && (
        <span className="inline-flex h-7 items-center rounded-full bg-surface-muted px-3 text-sm font-semibold text-text">
          Only people with the link
        </span>
      )}
    </>
  );
}

/** The sale, once someone has bought it: who, how much, where it's at. */
function SaleCard({ order }: { order: SellerOrder }) {
  return (
    <div className="mb-2 flex flex-col gap-3 rounded-lg border-2 border-secondary bg-surface p-[18px] desk:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-lg font-extrabold text-on-secondary">
          {order.buyer.initial}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-bold text-text">
            {order.buyer.firstName} bought it for {money(order.totalCents)}
          </span>
          <span className="text-sm text-text-muted">
            {order.soldOn}, {money(order.itemCents)} + {money(order.shippingCents)} shipping to {shipToLine(order)}
          </span>
        </div>
        <OrderTag status={order.status} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <PaymentNote />
        <Link href="/sales" className="text-sm font-bold text-secondary hover:underline">
          {order.status === "paid" ? "Ship it from Sales" : "See it in Sales"}
        </Link>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-text">{children}</h2>;
}

function MoreMenu({
  listing,
  status,
  onShare,
  onSold,
  onTakeDown,
  hasOrder,
}: {
  listing: WorkspaceListing;
  status: Status;
  hasOrder: boolean;
  onShare: () => void;
  onSold: () => void;
  onTakeDown: () => void;
}) {
  const [open, setOpen] = useState(false);
  const row =
    "flex h-14 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-base font-semibold text-text hover:bg-surface-muted";
  const close = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <>
      <IconButton aria-label="More" className="size-10" onClick={() => setOpen(true)}>
        <MoreIcon />
      </IconButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-4">
          <DialogTitle className="px-3 pt-2 pb-2 text-xl">{listing.title}</DialogTitle>
          <div className="flex flex-col">
            <Link href={stepHref(listing.id, "details")} className={row}>
              <PencilIcon /> Edit listing
            </Link>
            {status === "live" && listing.shareUrl && (
              <>
                <button type="button" className={row} onClick={close(onShare)}>
                  <LinkIcon /> Share
                </button>
                <a href={listing.shareUrl} target="_blank" rel="noreferrer" className={row}>
                  <EyeIcon /> See it live
                  <ArrowUpRightIcon size={18} className="ml-auto text-text-muted" />
                </a>
              </>
            )}
            {status !== "draft" && !hasOrder && (
              <button type="button" className={row} onClick={close(onSold)}>
                <TagIcon /> {status === "sold" ? "Put it back up" : "Mark as sold"}
              </button>
            )}
            {status !== "draft" && !hasOrder && (
              <button type="button" className={row} onClick={close(onTakeDown)}>
                <CloseIcon /> Take it down
              </button>
            )}
            <Link href={listing.closeHref} className={row}>
              <BagIcon /> See it in {listing.shop.name}
              <ChevronRightIcon size={18} className="ml-auto text-text-muted" />
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LiveListingManage({
  listing,
  photos,
  offers = [],
  order = null,
  stats = null,
  questions = [],
}: {
  listing: WorkspaceListing;
  photos: PhotoView[];
  /** Offers on this listing, newest first. */
  offers?: SellerOffer[];
  /** The sale, when someone bought it. */
  order?: SellerOrder | null;
  /** How it's doing, once it has been live. */
  stats?: { views: number; views7d: number; likes: number; shares: number; offers: number } | null;
  /** Conversations with buyers about this listing, newest first. */
  questions?: ThreadListItem[];
}) {
  const toast = useToast();
  const [status, setStatus] = useState<Status>(listing.status);
  const [confirm, setConfirm] = useState<null | "sold" | "down">(null);
  const [working, setWorking] = useState(false);
  const cover = photos.find((p) => !p.isVideo);
  const price = formatPrice(listing.priceCents);
  const lowest = formatPrice(lowestCents(listing));
  const editHref = stepHref(listing.id, "details");

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, next: Status, done: string) {
    setWorking(true);
    try {
      const result = await action();
      if (!result.ok) {
        toast.add({ title: result.message ?? "That didn't work. Try again?" });
        return;
      }
      setStatus(next);
      toast.add({ title: done });
    } catch {
      toast.add({ title: "That didn't work. Try again?" });
    } finally {
      setWorking(false);
    }
  }

  async function share() {
    if (!listing.shareUrl) return;
    const result = await shareLink(listing.title, listing.shareUrl);
    if (result === "copied" || result === "shared") trackShare({ listing: listing.id });
    if (result === "copied") toast.add({ title: "Link copied. Go show it off." });
    if (result === "failed") toast.add({ title: "Couldn't copy the link. Try again?" });
  }

  function toggleSold() {
    if (status === "sold") void run(() => relist(listing.id), "live", "It's live again");
    else setConfirm("sold");
  }

  const actions =
    status === "draft" ? (
      <>
        <Button
          variant="soft"
          size="md"
          className="flex-1 px-0 desk:flex-none desk:px-5"
          render={<Link href={stepHref(listing.id, listing.step)} />}
          nativeButton={false}
        >
          Keep going
        </Button>
        <Button
          size="md"
          className="flex-1 px-0 desk:flex-none desk:px-5"
          render={<Link href={stepHref(listing.id, "publish")} />}
          nativeButton={false}
        >
          Publish
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="soft"
          size="md"
          className="flex-1 px-0 desk:flex-none desk:px-5"
          render={<Link href={editHref} />}
          nativeButton={false}
        >
          <span className="desk:hidden">Edit</span>
          <span className="hidden desk:inline">Edit listing</span>
        </Button>
        {status === "live" && listing.shareUrl && (
          <Button variant="soft" size="md" className="flex-1 px-0 desk:flex-none desk:px-5" onClick={share}>
            Share
          </Button>
        )}
        {order ? (
          <Button
            variant="secondary"
            size="md"
            className="flex-[1.4] px-0 desk:flex-none desk:px-5"
            render={<Link href="/sales" />}
            nativeButton={false}
          >
            See the sale
          </Button>
        ) : (
          <Button
            variant="soft"
            size="md"
            disabled={working}
            className="flex-[1.4] px-0 desk:flex-none desk:px-5"
            onClick={toggleSold}
          >
            {status === "sold" ? "Put it back up" : "Mark as sold"}
          </Button>
        )}
      </>
    );

  const live = status === "live";

  return (
    <>
      <MobileBackHeader
        title="Listing"
        backHref={listing.closeHref}
        className="h-[52px] pt-0"
        action={
          <MoreMenu
            listing={listing}
            status={status}
            hasOrder={!!order}
            onShare={share}
            onSold={toggleSold}
            onTakeDown={() => setConfirm("down")}
          />
        }
      />

      <div className="flex w-full flex-col gap-5 px-4 pt-3 pb-8 desk:gap-7 desk:px-12 desk:pt-8 desk:pb-14">
        <div className="flex items-center justify-between gap-4">
          <Breadcrumb
            items={[
              { label: listing.shop.name, href: listing.closeHref },
              { label: listing.title },
            ]}
          />
          <div className="hidden items-center gap-4 desk:flex">
            {live && listing.shareUrl && (
              <a
                href={listing.shareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm font-bold text-secondary hover:underline"
              >
                See it live
                <ArrowUpRightIcon size={16} />
              </a>
            )}
            {status !== "draft" && !order && (
              <button
                type="button"
                onClick={() => setConfirm("down")}
                className="cursor-pointer text-sm font-bold text-text-muted hover:text-text hover:underline"
              >
                Take it down
              </button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-3 desk:gap-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-[14px] desk:flex-1 desk:gap-5">
            <PhotoThumb photo={cover} className="size-[72px] rounded-lg desk:size-[88px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 desk:gap-2">
              <h1 className="font-display text-xl leading-[26px] font-extrabold tracking-tight text-text desk:text-2xl">
                {listing.title}
              </h1>
              <div className="font-display text-lg font-extrabold tracking-tight desk:hidden">
                {price ?? "No price yet"}
              </div>
              <div className="hidden flex-wrap items-center gap-2 desk:flex">
                <StateTags listing={listing} status={status} />
                <span className="pl-2 font-display text-xl font-extrabold">{price ?? "No price yet"}</span>
                {listing.takeOffers && lowest && status !== "sold" && (
                  <span className="text-sm font-medium text-text-muted">Lowest {lowest}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 desk:hidden">
            <StateTags listing={listing} status={status} />
          </div>
          <div className="flex w-full gap-2 desk:w-auto desk:shrink-0">{actions}</div>
        </div>

        {stats && status !== "draft" ? (
          <section aria-label="How it's doing" className="grid grid-cols-3 gap-3 desk:grid-cols-5">
            {[
              { label: "Views", value: stats.views },
              { label: "This week", value: stats.views7d },
              { label: "Likes", value: stats.likes },
              { label: "Shares", value: stats.shares },
              { label: "Offers", value: stats.offers },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface px-4 py-3 desk:px-5 desk:py-4">
                <span className="text-sm font-medium text-text-muted">{s.label}</span>
                <span className="font-display text-2xl font-extrabold tracking-tight">{s.value.toLocaleString("en-US")}</span>
              </div>
            ))}
          </section>
        ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <EyeIcon size={20} />
          </span>
          <p className="text-sm text-text-muted">
            {live
              ? "Views and saves will show up here once people start looking."
              : status === "sold"
                ? order
                  ? `Sold to ${order.buyer.firstName}. Nice work.`
                  : "Sold. Nice work."
                : "It's a draft, so nobody can see it yet."}
          </p>
        </div>
        )}

        <div className="flex flex-col gap-5 desk:gap-6 xl:flex-row xl:items-start">
          <section className="flex flex-col gap-3 xl:flex-[1.35]">
            {order && <SaleCard order={order} />}
            <SectionTitle>Offers</SectionTitle>
            {offers.length > 0 ? (
              <OfferList offers={offers} />
            ) : (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState
                size="sm"
                tone="lemon"
                art={<TagIcon size={44} />}
                sticker="Nothing yet"
                title="No offers yet"
              >
                {listing.takeOffers
                  ? live
                    ? `When someone makes an offer, it lands here.${listing.shop.askHold ? " I'll check with you before accepting anything." : ""}`
                    : "Offers come in once it's live."
                  : "Offers are off, so buyers pay your price."}
              </EmptyState>
            </div>
            )}
          </section>
          <section className="flex flex-col gap-3 xl:flex-1">
            <SectionTitle>Questions</SectionTitle>
            <div className="rounded-lg border border-border bg-surface">
              {questions.length > 0 ? (
                <div className="flex flex-col gap-1 p-2">
                  {questions.map((q) => (
                    <ThreadRow key={q.id} item={q} href={`/inbox/${q.id}`} tone="app" />
                  ))}
                </div>
              ) : (
              <EmptyState size="sm" tone="leaf" art={<ChatIcon size={44} />} title="No questions yet">
                Buyers&apos; questions about it show up here. Answer them from your inbox.
              </EmptyState>
              )}
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "sold"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Mark it as sold?"
        description="Buyers will see it's sold. You can put it back up any time."
        confirm="Mark as sold"
        onConfirm={() => void run(() => markSold(listing.id), "sold", "Marked as sold")}
      />
      <ConfirmDialog
        open={confirm === "down"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Take it down?"
        description="It goes back to a draft and nobody can see it until you publish it again. The link stays the same."
        confirm="Take it down"
        danger
        onConfirm={() => void run(() => unpublish(listing.id), "draft", "Taken down. It's a draft again.")}
      />
    </>
  );
}
