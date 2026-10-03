"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@repo/ui/button";
import { ArrowUpRightIcon, CheckIcon } from "@repo/ui/icons";
import { Sticker } from "@repo/ui/sticker";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { publish, setListingVisibility } from "../../app/actions/listing-publish";
import type { PhotoView, WorkspaceListing } from "../../lib/server/listings";
import { AgentMessage, Spinner, Thread } from "../agent-chat/agent-chat";
import { QrArt } from "../listing-later/art";
import { LiveTag, LiveWorkspace } from "../listing-later/live-workspace";
import { useAgentChat } from "../listing-later/use-agent-chat";
import { CanvasHeader } from "../workspace/listing-panel";
import { ListingWorkspace, stepHref } from "../workspace/listing-workspace";
import { LiveEarlierCards } from "./earlier-cards";
import { copyText, formatPrice, lowestCents, readableUrl, shareLink } from "./format";
import { trackShare } from "../../lib/track";
import { PhotoThumb } from "./photo-thumb";

/*
 * C7 Publish and share on real data. Publishing waits for the person's tap and
 * needs a title and a price. Once live: the real link, copy and share. The
 * share kit pictures and posting to Facebook aren't built yet, so they say so.
 */

type Visibility = "everyone" | "link";

const visibilityOptions: { key: Visibility; label: string; detail: string }[] = [
  { key: "everyone", label: "Everyone", detail: "In your shop and on the resell.store marketplace" },
  { key: "link", label: "Only people with the link", detail: "Hidden from your shop page and the marketplace" },
];

export const elsewhereHref = (id: string) => `/list/${id}/publish?view=elsewhere`;

function missingLine(listing: WorkspaceListing) {
  if (!listing.hasTitle && listing.priceCents == null) return "It needs a title and a price before it can go live.";
  if (!listing.hasTitle) return "It needs a title before it can go live.";
  if (listing.priceCents == null) return "It needs a price before it can go live.";
  return null;
}

function sinceLabel(iso: string | null) {
  if (!iso) return "since just now";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "since today";
  if (days === 1) return "since yesterday";
  return `for ${days} days`;
}

/* Cards ------------------------------------------------------------------- */

function Radio({ on }: { on: boolean }) {
  return on ? (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
      <span className="size-2.5 rounded-full bg-on-secondary" />
    </span>
  ) : (
    <span className="size-6 shrink-0 rounded-full border-2 border-border" />
  );
}

function PublishCard({
  listing,
  photos,
  visibility,
  live,
  publishing,
  onVisibility,
  onPublish,
}: {
  listing: WorkspaceListing;
  photos: PhotoView[];
  visibility: Visibility;
  live: boolean;
  publishing: boolean;
  onVisibility: (v: Visibility) => void;
  onPublish: () => void;
}) {
  const stills = photos.filter((p) => !p.isVideo);
  const condition = listing.fields.find((f) => f.key === "condition" && f.value)?.value;
  const price = formatPrice(listing.priceCents);
  const missing = missingLine(listing);
  const sold = listing.status === "sold";

  return (
    <div className="flex w-full flex-col gap-5 rounded-lg border border-border bg-surface p-6">
      <div className="flex w-full items-center gap-4">
        <PhotoThumb photo={stills[0]} className="size-[88px] rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="text-lg leading-6 font-bold">{listing.title}</div>
          <div className="truncate text-sm text-text-muted">
            {stills.length === 0 ? "No photos yet" : `${stills.length} photo${stills.length === 1 ? "" : "s"}`}
            {condition ? `, ${condition.charAt(0).toLowerCase()}${condition.slice(1)}` : ""}
          </div>
        </div>
        {price && (
          <Sticker size="md" rotate={-5}>
            {price}
          </Sticker>
        )}
      </div>

      <div className="flex w-full flex-col border-t border-border" role="radiogroup" aria-label="Who can see it">
        <div className="pt-4 pb-1 text-base font-bold">Who can see it</div>
        {visibilityOptions.map((opt) => {
          const on = opt.key === visibility;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => !on && onVisibility(opt.key)}
              className="flex w-full cursor-pointer items-center gap-3 border-b border-border py-3 text-left last:border-b-0"
            >
              <span className="flex flex-1 flex-col">
                <span className="text-base font-semibold">{opt.label}</span>
                <span className="text-sm text-text-muted">{opt.detail}</span>
              </span>
              <Radio on={on} />
            </button>
          );
        })}
      </div>

      {live ? (
        <div className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-secondary-soft">
          {sold ? (
            <span className="text-base font-bold">Sold</span>
          ) : (
            <>
              <LiveTag className="h-auto bg-transparent px-0 text-base font-bold" />
              <span className="text-base font-medium text-text-muted">{sinceLabel(listing.publishedAt)}</span>
            </>
          )}
        </div>
      ) : missing ? (
        <div className="flex flex-col gap-3 rounded-lg bg-primary-soft px-5 py-4">
          <div className="text-base font-semibold">{missing}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
            {!listing.hasTitle && (
              <Link href={stepHref(listing.id, "words")} className="text-secondary hover:underline">
                Write the words
              </Link>
            )}
            {listing.priceCents == null && (
              <Link href={stepHref(listing.id, "details")} className="text-secondary hover:underline">
                Set a price
              </Link>
            )}
          </div>
        </div>
      ) : (
        <Button className="w-full" disabled={publishing} onClick={onPublish}>
          {publishing && <Spinner size={20} />}
          {publishing ? "Publishing" : "Publish listing"}
        </Button>
      )}
    </div>
  );
}

function PromiseCard({ listing, className }: { listing: WorkspaceListing; className?: string }) {
  const lowest = formatPrice(lowestCents(listing));
  const lines = [
    listing.shop.answerQuestions && "Answer buyers' questions from these details",
    listing.takeOffers && listing.shop.haggle && lowest && `Haggle on offers, never under ${lowest}`,
    listing.takeOffers && listing.shop.askHold && "Ask you before I accept anything",
  ].filter((l): l is string => Boolean(l));
  if (lines.length === 0) return null;
  return (
    <div className={cn("flex w-full flex-col gap-3 rounded-lg bg-secondary-soft px-5 py-[18px]", className)}>
      <div className="text-base font-bold">Once it&apos;s live, I will</div>
      {lines.map((line) => (
        <div key={line} className="flex items-start gap-2.5">
          <span className="mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
            <CheckIcon size={13} strokeWidth={3.4} />
          </span>
          <span className="flex-1 text-base font-medium">{line}</span>
        </div>
      ))}
    </div>
  );
}

function SoonChip() {
  return (
    <span className="flex h-6 shrink-0 items-center rounded-full bg-accent-soft px-2.5 text-sm font-semibold text-accent-text">
      Soon
    </span>
  );
}

export function LinkRow({
  title,
  url,
  className,
  onShared,
}: {
  title: string;
  url: string;
  className?: string;
  /** After a copy or share actually happened (Stats counts it). */
  onShared?: () => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex h-[52px] w-full items-center gap-2.5 rounded-full bg-surface-muted pr-2 pl-[18px]">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
        >
          {readableUrl(url)}
        </a>
        <button
          type="button"
          onClick={async () => {
            if (await copyText(url)) {
              setCopied(true);
              onShared?.();
              toast.add({ title: "Link copied. Go show it off." });
            } else toast.add({ title: "Couldn't copy. Press and hold the link instead." });
          }}
          className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface px-4 text-sm font-bold transition-colors hover:bg-surface-muted"
        >
          {copied && <CheckIcon size={14} strokeWidth={3} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <div className="flex gap-2">
        <Button
          size="md"
          variant="soft"
          className="flex-1"
          onClick={async () => {
            const result = await shareLink(title, url);
            if (result === "copied" || result === "shared") onShared?.();
            if (result === "copied") toast.add({ title: "Link copied. Go show it off." });
            if (result === "failed") toast.add({ title: "Couldn't share from here. Copy the link instead." });
          }}
        >
          Share
        </Button>
        <Button
          size="md"
          variant="soft"
          className="flex-1"
          render={<a href={url} target="_blank" rel="noreferrer" />}
          nativeButton={false}
        >
          See it live
          <ArrowUpRightIcon size={16} />
        </Button>
      </div>
    </div>
  );
}

function ShareCard({
  listing,
  shareUrl,
  className,
}: {
  listing: WorkspaceListing;
  shareUrl: string | null;
  className?: string;
}) {
  const kit = [
    { key: "square", label: "Square post", detail: "Instagram" },
    { key: "story", label: "Tall story", detail: "Stories, TikTok" },
    { key: "qr", label: "QR code", detail: "For yard sales" },
  ];
  return (
    <div className={cn("flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-6", className)}>
      <div className="flex flex-col gap-0.5">
        <div className="text-base font-bold">Share it</div>
        <div className="text-sm text-text-muted">
          {shareUrl
            ? listing.visibility === "link"
              ? "Only people with this link can see it."
              : "Send it anywhere. It's on the marketplace too."
            : "Your link is ready the moment you publish."}
        </div>
      </div>
      {shareUrl ? (
        <LinkRow title={listing.title} url={shareUrl} onShared={() => trackShare({ listing: listing.id })} />
      ) : (
        <div className="flex h-[52px] w-full items-center rounded-full border-[1.5px] border-dashed border-border px-[18px] text-sm font-medium text-text-muted">
          {listing.shop.slug}.resell.store/…
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold">Share kit</div>
          <SoonChip />
        </div>
        <div className="flex w-full gap-3">
          {kit.map((tile) => (
            <div key={tile.key} className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="flex h-[96px] w-full items-center justify-center rounded-md border-[1.5px] border-dashed border-border bg-surface-muted/60">
                {tile.key === "qr" ? (
                  <span className="opacity-30">
                    <QrArt size={48} />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "rounded-sm border-[1.5px] border-border bg-surface",
                      tile.key === "square" ? "size-12" : "h-14 w-8",
                    )}
                  />
                )}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-bold">{tile.label}</span>
                <span className="text-sm text-text-muted">{tile.detail}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-text-muted">
          Ready-made pictures for posts and stories, a QR code to print, and posting straight to Facebook are on the
          way. For now, the link does the job.
        </p>
      </div>
    </div>
  );
}

function ElsewhereButton({ listingId, className }: { listingId: string; className?: string }) {
  return (
    <Button render={<Link href={elsewhereHref(listingId)} />} nativeButton={false} className={className}>
      List it in more places
    </Button>
  );
}

/* Screen ------------------------------------------------------------------ */

export function LivePublishScreen({
  listing: initial,
  photos,
  filled,
  total,
}: {
  listing: WorkspaceListing;
  photos: PhotoView[];
  filled: number;
  total: number;
}) {
  const toast = useToast();
  const chat = useAgentChat([]);
  const [listing, setListing] = useState(initial);
  const [publishing, setPublishing] = useState(false);
  const live = listing.status !== "draft";
  const visibility = listing.visibility;
  const missing = missingLine(listing);

  async function changeVisibility(v: Visibility) {
    const before = listing.visibility;
    setListing((l) => ({ ...l, visibility: v }));
    try {
      await setListingVisibility(listing.id, v);
      if (live)
        toast.add({
          title: v === "link" ? "Updated. Only people with the link can see it now." : "Updated. It's on the marketplace now.",
        });
    } catch {
      setListing((l) => ({ ...l, visibility: before }));
      toast.add({ title: "Couldn't change that. Try again?" });
    }
  }

  async function goLive() {
    setPublishing(true);
    try {
      const result = await publish(listing.id, visibility);
      if (!result.ok) {
        toast.add({ title: result.message });
        return;
      }
      setListing((l) => ({
        ...l,
        status: "live",
        shareUrl: result.url,
        publishedAt: l.publishedAt ?? new Date().toISOString(),
      }));
      toast.add({ title: "It's live. Nice one." });
      chat.agent(
        `It's live at ${readableUrl(result.url)}. Send the link anywhere. Want it in more places too?`,
        <Link
          href={elsewhereHref(listing.id)}
          className="flex h-10 items-center gap-1.5 rounded-md bg-primary-soft px-3.5 text-sm font-semibold transition-colors hover:bg-lemon-300"
        >
          List it in more places
          <ArrowUpRightIcon size={16} />
        </Link>,
      );
    } catch {
      toast.add({ title: "Couldn't publish it. Try again?" });
    } finally {
      setPublishing(false);
    }
  }

  const reply = (text: string) =>
    chat.send(text, {
      thinking: "Checking the listing",
      text: live
        ? "Noted. You can change any of this from the listing page, and it stays live while you do."
        : missing
          ? `${missing} Once that's in, tap Publish.`
          : "Noted. You can change any of this after it's live. When you're ready, tap Publish.",
    });

  const card = (
    <PublishCard
      listing={listing}
      photos={photos}
      visibility={visibility}
      live={live}
      publishing={publishing}
      onVisibility={changeVisibility}
      onPublish={goLive}
    />
  );

  // Written once on arrival; publishing adds its own message below
  const [opening] = useState(() => live
    ? listing.status === "sold"
      ? "This one's sold. Nice work. You can put it back up from the listing page."
      : `It's live${listing.shareUrl ? ` at ${readableUrl(listing.shareUrl)}` : ""}. Send the link anywhere, or list it in more places.`
    : missing
      ? `Nearly there. ${missing}`
      : "That's everything. Pick who can see it and I'll put it live.");

  const thread = (
    <Thread>
      <AgentMessage>{opening}</AgentMessage>

      {/* Desktop: the promise sits in the chat */}
      <PromiseCard listing={listing} className="hidden desk:flex" />

      {/* Phone: everything sits in the chat */}
      <div className="flex flex-col gap-4 desk:hidden">
        {card}
        <PromiseCard listing={listing} />
        <ShareCard listing={listing} shareUrl={live ? listing.shareUrl : null} />
        {live && <ElsewhereButton listingId={listing.id} className="w-full" />}
      </div>

      {chat.thread}
    </Thread>
  );

  const canvas = (
    <>
      <CanvasHeader
        title={live ? (listing.status === "sold" ? "It's sold" : "It's live") : "Ready to go live"}
        description="You can change all of this after it's published."
        filled={filled}
        total={total}
      />
      <div className="flex flex-col items-start gap-4 xl:flex-row">
        <div className="flex w-full flex-col gap-4 xl:flex-[1.2]">
          {card}
          {live && <ElsewhereButton listingId={listing.id} className="w-full" />}
        </div>
        <ShareCard listing={listing} shareUrl={live ? listing.shareUrl : null} className="xl:flex-1" />
      </div>
      <LiveEarlierCards listing={listing} photos={photos} />
    </>
  );

  if (live) {
    return (
      <LiveWorkspace
        listingId={listing.id}
        title={listing.title}
        shopName={listing.shop.name}
        closeHref={listing.closeHref}
        chat={thread}
        canvas={canvas}
        busy={chat.busy}
        onSend={reply}
        backHref={stepHref(listing.id, "words")}
      />
    );
  }

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
      saveKey={visibility}
      chat={thread}
      canvas={canvas}
    />
  );
}
