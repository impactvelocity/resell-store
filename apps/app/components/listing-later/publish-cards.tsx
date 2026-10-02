"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { CheckIcon, CloseIcon } from "@repo/ui/icons";
import { Sticker } from "@repo/ui/sticker";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { Spinner } from "../agent-chat/agent-chat";
import { draftListing } from "../../lib/mock";
import {
  agentPromises,
  listingLink,
  shareTiles,
  visibilityOptions,
  type ShareTileKey,
} from "../../lib/mock-listing-later";
import { PotArt, QrArt } from "./art";
import { LiveTag } from "./live-workspace";
import { setListing, useListing } from "./store";

/*
 * C7 cards: the publish card with "Who can see it" (spec 04 / D. Visibility),
 * the agent's promise, and the share kit (spec 04 / D. Share kit).
 */

/* Publish card ----------------------------------------------------------- */

function Radio({ on }: { on: boolean }) {
  return on ? (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
      <span className="size-2.5 rounded-full bg-on-secondary" />
    </span>
  ) : (
    <span className="size-6 shrink-0 rounded-full border-2 border-border" />
  );
}

export function PublishCard({ onPublished }: { onPublished?: () => void }) {
  const { visibility, published, photos } = useListing();
  const toast = useToast();
  const [publishing, setPublishing] = useState(false);
  const photoCount = photos.filter((p) => !p.video && !p.uploading).length;

  function publish() {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      setListing({ published: true, kitGenerating: true });
      setTimeout(() => setListing({ kitGenerating: false }), 1600);
      toast.add({ title: "It's live. Nice one." });
      onPublished?.();
    }, 900);
  }

  return (
    <div className="flex w-full flex-col gap-5 rounded-lg border border-border bg-surface p-6">
      <div className="flex w-full items-center gap-4">
        <div className="flex size-[88px] shrink-0 items-center justify-center rounded-lg bg-leaf-100">
          <PotArt size={60} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="text-lg leading-6 font-bold">
            <span className="desk:hidden">Yellow dutch oven, 5.5 qt</span>
            <span className="hidden desk:inline">{draftListing.title}</span>
          </div>
          <div className="text-sm text-text-muted">
            {photoCount} photos, barely used
          </div>
        </div>
        <Sticker size="md" rotate={-5}>
          ${draftListing.price}
        </Sticker>
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
              onClick={() => {
                if (on) return;
                setListing({ visibility: opt.key });
                if (published)
                  toast.add({
                    title:
                      opt.key === "link"
                        ? "Updated. Only people with the link can see it now."
                        : "Updated. It's on the marketplace now.",
                  });
              }}
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

      {published ? (
        <div className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-secondary-soft">
          <LiveTag className="h-auto bg-transparent px-0 text-base font-bold" />
          <span className="text-base font-medium text-text-muted">since just now</span>
        </div>
      ) : (
        <Button className="w-full" disabled={publishing} onClick={publish}>
          {publishing && <Spinner size={20} />}
          {publishing ? "Publishing" : "Publish listing"}
        </Button>
      )}
    </div>
  );
}

/* Agent promise ---------------------------------------------------------- */

export function PromiseCard({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full flex-col gap-3 rounded-lg bg-secondary-soft px-5 py-[18px]", className)}>
      <div className="text-base font-bold">Once it&apos;s live, I will</div>
      {agentPromises.map((line) => (
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

/* Share kit -------------------------------------------------------------- */

function TileArt({ kind, large = false }: { kind: ShareTileKey; large?: boolean }) {
  if (kind === "square")
    return (
      <div className="relative flex h-full w-full items-center justify-center rounded-md bg-secondary">
        <PotArt size={large ? 200 : 84} />
        <Sticker
          tone="accent"
          rotate={6}
          className={cn(
            "absolute origin-top-left",
            large ? "top-5 right-5 px-4 py-1 text-2xl" : "top-2.5 right-2 px-2.5 py-0.5 text-base leading-6",
          )}
        >
          ${draftListing.price}
        </Sticker>
      </div>
    );
  if (kind === "story")
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-pink-100">
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-1 bg-surface",
            large ? "h-[300px] w-[176px] gap-3 rounded-lg" : "h-[126px] w-[74px] rounded-[10px]",
          )}
        >
          <PotArt size={large ? 110 : 48} />
          <span className={cn("font-display font-extrabold", large ? "text-2xl" : "text-sm")}>
            ${draftListing.price}
          </span>
        </div>
      </div>
    );
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md bg-surface-muted">
      <QrArt size={large ? 200 : 88} />
    </div>
  );
}

export function CopyLinkRow({ className }: { className?: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className={cn("flex h-[52px] w-full items-center gap-2.5 rounded-full bg-surface-muted pr-2 pl-[18px]", className)}>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{listingLink}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(`https://${listingLink}`).catch(() => {});
          setCopied(true);
          toast.add({ title: "Link copied. Go show it off." });
        }}
        className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface px-4 text-sm font-bold transition-colors hover:bg-surface-muted"
      >
        {copied && <CheckIcon size={14} strokeWidth={3} />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

function ShareTileDialog({
  tile,
  onClose,
}: {
  tile: (typeof shareTiles)[number] | null;
  onClose: () => void;
}) {
  const toast = useToast();
  return (
    <Dialog open={tile !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[440px]">
        {tile && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle>{tile.label}</DialogTitle>
                <DialogDescription>
                  {tile.size}. For {tile.detail}.
                </DialogDescription>
              </div>
              <DialogClose
                aria-label="Close"
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-surface hover:bg-surface-muted"
              >
                <CloseIcon size={18} />
              </DialogClose>
            </div>
            <div className={cn("w-full", tile.key === "story" ? "h-[340px]" : "h-[320px]")}>
              <TileArt kind={tile.key} large />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="md"
                className="flex-1"
                onClick={() => {
                  toast.add({ title: `Saved ${tile.label.toLowerCase()} to your downloads.` });
                  onClose();
                }}
              >
                Download
              </Button>
              <Button
                size="md"
                variant="soft"
                className="flex-1"
                onClick={async () => {
                  const url = `https://${listingLink}`;
                  if (typeof navigator.share === "function") {
                    try {
                      await navigator.share({ title: draftListing.title, url });
                      return;
                    } catch {
                      // Cancelled or not allowed; fall back to copying
                    }
                  }
                  void navigator.clipboard?.writeText(url).catch(() => {});
                  toast.add({ title: "Link copied. Go show it off." });
                }}
              >
                Share
              </Button>
              {tile.key === "square" && (
                <Button
                  size="md"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    toast.add({ title: "Posting to Facebook. Up in about a minute." });
                    onClose();
                  }}
                >
                  Post now
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ShareKit({ className }: { className?: string }) {
  const { published, kitGenerating } = useListing();
  const toast = useToast();
  const [open, setOpen] = useState<ShareTileKey | null>(null);

  return (
    <div className={cn("flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-6", className)}>
      <div className="flex flex-col gap-0.5">
        <div className="text-base font-bold">Share kit</div>
        <div className="text-sm text-text-muted">
          {published
            ? kitGenerating
              ? "Making your pictures"
              : "Ready. Tap one to download or share it."
            : "Made for you, ready the moment you publish."}
        </div>
      </div>
      <div className="flex w-full gap-3">
        {shareTiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => {
              if (!published) {
                toast.add({ title: "Ready the moment you publish." });
                return;
              }
              if (!kitGenerating) setOpen(tile.key);
            }}
            className="group flex min-w-0 flex-1 cursor-pointer flex-col gap-2.5 text-left"
          >
            <span className="block h-[150px] w-full overflow-hidden rounded-md transition-transform group-hover:-translate-y-0.5">
              {kitGenerating ? (
                <span className="block h-full w-full animate-pulse rounded-md bg-surface-muted" />
              ) : (
                <TileArt kind={tile.key} />
              )}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-bold">{tile.label}</span>
              <span className="text-sm text-text-muted">{tile.detail}</span>
            </span>
          </button>
        ))}
      </div>
      <CopyLinkRow />
      <ShareTileDialog
        tile={shareTiles.find((t) => t.key === open) ?? null}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}
