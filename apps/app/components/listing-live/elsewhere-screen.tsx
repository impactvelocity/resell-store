"use client";

import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Sticker } from "@repo/ui/sticker";
import type { PhotoView, WorkspaceListing } from "../../lib/server/listings";
import { AgentMessage, Thread } from "../agent-chat/agent-chat";
import { EmptyState } from "../empty-state";
import { LiveWorkspace } from "../listing-later/live-workspace";
import { useAgentChat } from "../listing-later/use-agent-chat";
import { ListingWorkspace, stepHref } from "../workspace/listing-workspace";
import { formatPrice, readableUrl } from "./format";
import { PhotoThumb } from "./photo-thumb";

/*
 * C8 List elsewhere. Other marketplaces aren't connected yet, so this says what
 * will happen when they are, without pretending to connect anything.
 */

const platforms = [
  {
    key: "ebay",
    letter: "e",
    name: "eBay",
    pitch: "The biggest reach. Good for collectibles, tech and kitchen things.",
  },
  {
    key: "facebook",
    letter: "F",
    name: "Facebook Marketplace",
    pitch: "Lots of local buyers. Good for big things you'd rather not ship.",
  },
  {
    key: "poshmark",
    letter: "P",
    name: "Poshmark",
    pitch: "Best for clothes, shoes and bags.",
  },
  {
    key: "depop",
    letter: "D",
    name: "Depop",
    pitch: "Younger buyers, mostly clothing and vintage.",
  },
];

function ListingCard({ listing, cover }: { listing: WorkspaceListing; cover: PhotoView | undefined }) {
  const live = listing.status === "live";
  const price = formatPrice(listing.priceCents);
  return (
    <div className="flex w-full items-center gap-3.5 rounded-lg border border-border bg-surface px-[18px] py-4 desk:px-5 desk:py-[18px]">
      {live ? (
        <Sticker tone="accent" rotate={-5} className="h-9 px-3.5 py-0 text-base leading-5 desk:h-auto desk:py-1.5 desk:text-lg">
          It&apos;s live
        </Sticker>
      ) : (
        <PhotoThumb photo={cover} className="size-12 rounded-md" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-bold">
          {listing.title}
          {price ? `, ${price}` : ""}
        </span>
        {live && listing.shareUrl ? (
          <a
            href={listing.shareUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm font-medium text-secondary hover:underline"
          >
            {readableUrl(listing.shareUrl)}
          </a>
        ) : (
          <span className="text-sm text-text-muted">
            {listing.status === "sold" ? "Sold" : "Not live yet"}
          </span>
        )}
      </div>
    </div>
  );
}

function PlatformList() {
  return (
    <div className="flex w-full flex-col rounded-lg border border-border bg-surface px-[18px] py-1 desk:px-6">
      {platforms.map((p) => (
        <div key={p.key} className="flex items-center gap-3 border-b border-border py-3.5 last:border-b-0 desk:gap-3.5 desk:py-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-muted font-display text-lg font-extrabold">
            {p.letter}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-bold desk:font-semibold">{p.name}</span>
            <span className="text-sm text-text-muted">{p.pitch}</span>
          </div>
          <span className="flex h-7 shrink-0 items-center rounded-full bg-accent-soft px-3 text-sm font-semibold text-accent-text">
            Soon
          </span>
        </div>
      ))}
    </div>
  );
}

export function LiveElsewhereScreen({
  listing,
  photos,
  filled,
  total,
}: {
  listing: WorkspaceListing;
  photos: PhotoView[];
  filled: number;
  total: number;
}) {
  const chat = useAgentChat([]);
  const live = listing.status === "live";
  const manageHref = `/listings/${listing.id}`;
  const cover = photos.find((p) => !p.isVideo);

  const soon = (
    <EmptyState
      size="sm"
      tone="pink"
      sticker="Soon"
      title="More places, coming soon"
    >
      Connect a marketplace once and I&apos;ll post this listing there too, with the same price and photos. When it sells
      in one place, I take it down everywhere else, so you never sell it twice.
    </EmptyState>
  );

  const done = live ? (
    <Button render={<Link href={manageHref} />} nativeButton={false} className="w-full desk:w-auto">
      Done, go to the listing
    </Button>
  ) : (
    <Button render={<Link href={stepHref(listing.id, "publish")} />} nativeButton={false} className="w-full desk:w-auto">
      Back to publish
    </Button>
  );

  const footnote = live
    ? "Nothing to set up yet. It's live in your shop, and the link works anywhere."
    : "Publish it first. Then it's live in your shop, and the link works anywhere.";

  const thread = (
    <Thread>
      <ListingCard listing={listing} cover={cover} />
      <AgentMessage>
        Soon I&apos;ll be able to put it in more places too. It&apos;ll be the same listing everywhere, and when it sells in
        one place, I&apos;ll take it down in the others.
      </AgentMessage>

      {/* Phone: the list sits in the chat */}
      <div className="flex flex-col gap-4 desk:hidden">
        {soon}
        <PlatformList />
        <p className="text-center text-sm text-text-muted">{footnote}</p>
        {done}
      </div>

      {chat.thread}
    </Thread>
  );

  const canvas = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">List it in more places</h2>
        <p className="text-sm text-text-muted">Optional. Price, photos and sold status will stay in sync.</p>
      </div>
      <div className="rounded-lg border border-border bg-surface">{soon}</div>
      <PlatformList />
      <div className="flex items-center justify-between gap-6">
        <p className="text-sm text-text-muted">{footnote}</p>
        {done}
      </div>
    </div>
  );

  const reply = (text: string) =>
    chat.send(text, {
      thinking: "Checking where it fits",
      text: "Other marketplaces aren't connected yet, so for now it lives in your shop. Share the link anywhere in the meantime.",
    });

  if (listing.status === "draft") {
    return (
      <ListingWorkspace
        listingId={listing.id}
        step="publish"
        title={listing.title}
        shopName={listing.shop.name}
        closeHref={listing.closeHref}
        filled={filled}
        total={total}
        busy={chat.busy}
        onSend={reply}
        chat={thread}
        canvas={canvas}
      />
    );
  }

  return (
    <LiveWorkspace
      listingId={listing.id}
      title={listing.title}
      shopName={listing.shop.name}
      closeHref={listing.closeHref}
      busy={chat.busy}
      onSend={reply}
      backHref={stepHref(listing.id, "publish")}
      chat={thread}
      canvas={canvas}
    />
  );
}
