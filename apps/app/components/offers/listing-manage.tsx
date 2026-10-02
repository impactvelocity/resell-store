"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, IconButton } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@repo/ui/dialog";
import {
  ChevronRightIcon,
  LinkIcon,
  MoreIcon,
  PencilIcon,
  TagIcon,
  BagIcon,
} from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { MobileBackHeader } from "../shell/page";
import {
  listingOffers,
  listingQuestions,
  managedListing as listing,
} from "../../lib/mock-inbox";
import { OfferList } from "./offer-card";
import { Breadcrumb, ConfirmDialog, OvenIllustration } from "./offer-parts";
import { QuestionCard } from "./question-card";

/* C9 Listing / Manage: a live listing, its numbers, offers and questions. */

const editHref = `/list/${listing.id}/details`;
const shopHref = `/shops/${listing.shop.slug}`;

function StateTags({ sold }: { sold: boolean }) {
  return (
    <>
      {sold ? (
        <span className="inline-flex h-7 items-center rounded-full bg-surface-muted px-3 text-sm font-semibold text-text-muted">
          Sold
        </span>
      ) : (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary-soft px-3 text-sm font-semibold text-secondary">
          <span aria-hidden className="size-1.5 rounded-full bg-secondary" />
          {listing.liveFor}
        </span>
      )}
      <span className="inline-flex h-7 items-center rounded-full bg-surface-muted px-3 text-sm font-semibold text-text">
        {listing.alsoOn}
      </span>
    </>
  );
}

function useListingActions() {
  const toast = useToast();
  const [sold, setSold] = useState(false);
  const [confirmSold, setConfirmSold] = useState(false);

  async function share() {
    const url = `https://${listing.shop.domain}/${listing.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked; the toast still reads right for a prototype.
    }
    toast.add({ title: "Link copied. Go show it off." });
  }

  function toggleSold() {
    if (sold) {
      setSold(false);
      toast.add({ title: "It's live again" });
    } else {
      setConfirmSold(true);
    }
  }

  const dialog = (
    <ConfirmDialog
      open={confirmSold}
      onOpenChange={setConfirmSold}
      title="Mark it as sold?"
      description="It comes down everywhere, including Facebook Marketplace, and open offers are declined."
      confirm="Mark as sold"
      onConfirm={() => {
        setSold(true);
        toast.add({ title: "Marked as sold" });
      }}
    />
  );

  return { sold, share, toggleSold, dialog };
}

function MoreMenu({
  sold,
  onShare,
  onSold,
}: {
  sold: boolean;
  onShare: () => void;
  onSold: () => void;
}) {
  const [open, setOpen] = useState(false);
  const row =
    "flex h-14 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-base font-semibold text-text hover:bg-surface-muted";
  return (
    <>
      <IconButton
        aria-label="More"
        className="size-10"
        onClick={() => setOpen(true)}
      >
        <MoreIcon />
      </IconButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-4">
          <DialogTitle className="px-3 pt-2 pb-2 text-xl">
            {listing.shortTitle}
          </DialogTitle>
          <div className="flex flex-col">
            <Link href={editHref} className={row}>
              <PencilIcon /> Edit listing
            </Link>
            <button
              type="button"
              className={row}
              onClick={() => {
                setOpen(false);
                onShare();
              }}
            >
              <LinkIcon /> Share
            </button>
            <button
              type="button"
              className={row}
              onClick={() => {
                setOpen(false);
                onSold();
              }}
            >
              <TagIcon /> {sold ? "Put it back up" : "Mark as sold"}
            </button>
            <Link href={shopHref} className={row}>
              <BagIcon /> See it in {listing.shop.shortName}
              <ChevronRightIcon size={18} className="ml-auto text-text-muted" />
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-text">
      {children}
    </h2>
  );
}

function Stats() {
  return (
    <div className="grid grid-cols-2 gap-3 desk:grid-cols-4 desk:gap-4">
      {listing.stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface px-[18px] py-[14px] desk:px-5 desk:py-4"
        >
          <div className="text-sm text-text-muted desk:font-medium">
            {s.label}
          </div>
          <div className="font-display text-2xl font-extrabold tracking-tight">
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListingManage() {
  const { sold, share, toggleSold, dialog } = useListingActions();
  const soldLabel = sold ? "Put it back up" : "Mark as sold";

  return (
    <>
      <MobileBackHeader
        title="Listing"
        backHref={shopHref}
        className="h-[52px] pt-0"
        action={
          <MoreMenu sold={sold} onShare={share} onSold={toggleSold} />
        }
      />

      <div className="flex w-full flex-col gap-5 px-4 pt-3 pb-8 desk:gap-7 desk:px-12 desk:pt-8 desk:pb-14">
        <Breadcrumb
          items={[
            { label: "Shops", href: "/shops/mayas-closet" },
            { label: listing.shop.name, href: shopHref },
            { label: listing.shortTitle },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col gap-3 desk:gap-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-[14px] desk:flex-1 desk:gap-5">
            <div className="flex size-[72px] shrink-0 items-center justify-center rounded-lg bg-secondary-soft desk:size-[88px] desk:bg-leaf-100">
              <OvenIllustration className="size-11 desk:size-[60px]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 desk:gap-2">
              <h1 className="font-display text-xl leading-[26px] font-extrabold tracking-tight text-text desk:text-2xl">
                {listing.title}
              </h1>
              <div className="font-display text-lg font-extrabold tracking-tight desk:hidden">
                ${listing.price}
              </div>
              <div className="hidden flex-wrap items-center gap-2 desk:flex">
                <StateTags sold={sold} />
                <span className="pl-2 font-display text-xl font-extrabold">
                  ${listing.price}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 desk:hidden">
            <StateTags sold={sold} />
          </div>
          <div className="flex w-full gap-2 desk:w-auto desk:shrink-0">
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
            <Button
              variant="soft"
              size="md"
              className="flex-1 px-0 desk:flex-none desk:px-5"
              onClick={share}
            >
              Share
            </Button>
            <Button
              variant="soft"
              size="md"
              className="flex-[1.4] px-0 desk:flex-none desk:px-5"
              onClick={toggleSold}
            >
              {soldLabel}
            </Button>
          </div>
        </div>

        <Stats />

        <div className="flex flex-col gap-5 desk:gap-6 xl:flex-row xl:items-start">
          <section className="flex flex-col gap-3 xl:flex-[1.35]">
            <SectionTitle>Offers</SectionTitle>
            <OfferList
              offers={listingOffers}
              lowest={listing.lowest}
              asking={listing.price}
            />
          </section>
          <section className="flex flex-col gap-3 xl:flex-1">
            <SectionTitle>Questions</SectionTitle>
            {listingQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                buyer={q.from.match(/From (\w+)/)?.[1] ?? "them"}
              />
            ))}
          </section>
        </div>
      </div>
      {dialog}
    </>
  );
}

