"use client";

import { useRef, useState, type DragEvent } from "react";
import { CloseIcon, PlusIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { DoneTick, Spinner } from "../agent-chat/agent-chat";
import {
  fakeUploads,
  maxPhotos,
  shots,
  type Photo,
  type ShotKey,
} from "../../lib/mock-listing-later";
import { PhotoArtwork, PlayGlyph, WebLinkGlyph } from "./art";
import { setListing, useListing } from "./store";

/*
 * Photo grid and shot list (spec 04 / C. Photos). The first tile is the cover,
 * twice the size, and must be one of the person's own photos. Web pictures
 * carry a chip with the site name. Drag to reorder; hover (or long press on a
 * phone) shows Remove. "Add photos" and "Add a video" fake an upload.
 */

let uploadCount = 0;

/**
 * Pretend to pick and upload a photo (or the video). Returns a line for the
 * chat, or null if nothing was added.
 */
export function addFakeMedia(
  photos: Photo[],
  shot?: ShotKey,
): { photo: Photo; note: string } | null {
  const has = (k: ShotKey) => photos.some((p) => p.shot === k);
  if (shot === "video") {
    if (has("video")) return null;
    const photo: Photo = {
      id: `v${++uploadCount}`,
      art: "video",
      shot: "video",
      video: true,
      uploading: true,
    };
    return { photo, note: "Added a short video" };
  }
  if (photos.filter((p) => !p.video).length >= maxPhotos) return null;
  const pick =
    (shot && fakeUploads.find((u) => u.shot === shot)) ??
    fakeUploads.find((u) => u.shot && !has(u.shot)) ??
    fakeUploads[fakeUploads.length - 1]!;
  const photo: Photo = {
    id: `u${++uploadCount}`,
    art: pick.art,
    shot: pick.shot,
    uploading: true,
  };
  return { photo, note: pick.note };
}

function useAddMedia(onAdded?: (note: string) => void) {
  const listing = useListing();
  const toast = useToast();
  return (shot?: ShotKey) => {
    const added = addFakeMedia(listing.photos, shot);
    if (!added) {
      toast.add({
        title:
          shot === "video"
            ? "One video per listing. Remove it to add another."
            : `That's the most: ${maxPhotos} photos.`,
      });
      return;
    }
    setListing((s) => ({ photos: [...s.photos, added.photo] }));
    setTimeout(() => {
      setListing((s) => ({
        photos: s.photos.map((p) =>
          p.id === added.photo.id ? { ...p, uploading: false } : p,
        ),
      }));
      onAdded?.(added.note);
    }, 1400);
  };
}

function WebChip({ source }: { source: string }) {
  return (
    <span className="absolute bottom-2.5 left-2.5 flex h-7 max-w-[calc(100%-20px)] items-center gap-1.5 rounded-full bg-text px-2.5 text-sm font-semibold text-background">
      <WebLinkGlyph />
      <span className="truncate">{source}</span>
    </span>
  );
}

function PhotoTile({
  photo,
  cover,
  dragging,
  over,
  removable,
  armed,
  onArm,
  onRemove,
  dragProps,
}: {
  photo: Photo;
  cover: boolean;
  dragging: boolean;
  over: boolean;
  removable: boolean;
  armed: boolean;
  onArm: () => void;
  onRemove: () => void;
  dragProps: {
    draggable: boolean;
    onDragStart: (e: DragEvent) => void;
    onDragEnd: () => void;
    onDragOver: (e: DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: DragEvent) => void;
  };
}) {
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);
  const own = !photo.source;
  return (
    <div
      {...dragProps}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse") return;
        press.current = setTimeout(onArm, 500);
      }}
      onPointerUp={() => clearTimeout(press.current)}
      onPointerLeave={() => clearTimeout(press.current)}
      onContextMenu={(e) => {
        if (removable) {
          e.preventDefault();
          onArm();
        }
      }}
      aria-label={
        cover ? "Cover photo" : photo.video ? "Video" : photo.source ? `Photo from ${photo.source}` : "Your photo"
      }
      className={cn(
        "group relative flex cursor-grab items-center justify-center overflow-hidden rounded-lg select-none active:cursor-grabbing",
        own ? "bg-leaf-100" : "border border-border bg-surface",
        cover
          ? "col-span-2 h-[260px] desk:row-span-2 desk:h-auto"
          : "h-[164px] desk:h-auto",
        dragging && "opacity-40",
        over && "ring-[3px] ring-primary ring-offset-2 ring-offset-background desk:ring-offset-surface-muted",
      )}
    >
      <span className={cn("flex", photo.uploading && "opacity-40")}>
        <PhotoArtwork art={photo.art} size={cover ? 220 : 96} />
      </span>
      {photo.uploading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={36} />
        </span>
      )}
      {photo.video && !photo.uploading && (
        <span className="absolute top-2.5 left-2.5 flex h-7 items-center gap-1 rounded-full bg-text pr-2.5 pl-2 text-sm font-semibold text-background">
          <PlayGlyph size={14} />
          0:24
        </span>
      )}
      {cover && (
        <span className="absolute top-3.5 left-3.5 flex h-7 items-center rounded-full bg-text px-3 text-sm font-semibold text-background">
          Cover
        </span>
      )}
      {cover && own && (
        <span className="absolute bottom-3.5 left-3.5 flex h-7 items-center rounded-full bg-surface px-3 text-sm font-semibold">
          Your photo
        </span>
      )}
      {photo.source && <WebChip source={photo.source} />}
      {removable && !photo.uploading && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "absolute top-2.5 right-2.5 flex h-8 cursor-pointer items-center gap-1 rounded-full bg-surface pr-3 pl-2 text-sm font-bold shadow-[0_2px_8px_rgb(20_38_29/0.12)] transition-opacity",
            armed
              ? "opacity-100"
              : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100",
          )}
        >
          <CloseIcon size={14} strokeWidth={2.6} />
          Remove
        </button>
      )}
    </div>
  );
}

function AddTile({
  kind,
  onClick,
}: {
  kind: "photos" | "video";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[164px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-border transition-colors hover:bg-surface desk:h-auto"
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-full",
          kind === "photos" ? "bg-primary text-on-primary" : "bg-surface text-text",
        )}
      >
        {kind === "photos" ? <PlusIcon size={22} /> : <PlayGlyph />}
      </span>
      <span className="text-sm font-bold">
        {kind === "photos" ? "Add photos" : "Add a video"}
      </span>
    </button>
  );
}

export function PhotoGrid({
  onAdded,
  onRemoved,
  className,
}: {
  onAdded?: (note: string) => void;
  onRemoved?: (note: string) => void;
  className?: string;
}) {
  const { photos } = useListing();
  const toast = useToast();
  const add = useAddMedia(onAdded);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const hasVideo = photos.some((p) => p.video);
  const ownCount = photos.filter((p) => !p.source && !p.video).length;

  function move(from: string, to: string) {
    if (from === to) return;
    const list = [...photos];
    const fromIndex = list.findIndex((p) => p.id === from);
    const toIndex = list.findIndex((p) => p.id === to);
    if (fromIndex < 0 || toIndex < 0) return;
    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item!);
    const cover = list[0]!;
    if (cover.source || cover.video) {
      toast.add({ title: "The cover has to be one of your own photos." });
      return;
    }
    setListing({ photos: list });
  }

  function remove(photo: Photo) {
    setArmedId(null);
    setListing((s) => ({ photos: s.photos.filter((p) => p.id !== photo.id) }));
    onRemoved?.(
      photo.video
        ? "Removed the video"
        : photo.source
          ? `Removed a photo from ${photo.source}`
          : "Removed a photo",
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 desk:auto-rows-[184px] xl:grid-cols-[1.25fr_1.25fr_1fr_1fr]",
        className,
      )}
      onClick={() => setArmedId(null)}
    >
      {photos.map((photo, i) => {
        const isCover = i === 0;
        // The cover can't go if it's the only photo of the person's own
        const removable = !(isCover && ownCount <= 1);
        return (
          <PhotoTile
            key={photo.id}
            photo={photo}
            cover={isCover}
            dragging={dragId === photo.id}
            over={overId === photo.id && dragId !== photo.id}
            removable={removable}
            armed={armedId === photo.id}
            onArm={() => setArmedId(photo.id)}
            onRemove={() => remove(photo)}
            dragProps={{
              draggable: !photo.uploading,
              onDragStart: (e) => {
                setDragId(photo.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", photo.id);
              },
              onDragEnd: () => {
                setDragId(null);
                setOverId(null);
              },
              onDragOver: (e) => {
                if (!dragId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overId !== photo.id) setOverId(photo.id);
              },
              onDragLeave: () => setOverId((id) => (id === photo.id ? null : id)),
              onDrop: (e) => {
                e.preventDefault();
                if (dragId) move(dragId, photo.id);
                setDragId(null);
                setOverId(null);
              },
            }}
          />
        );
      })}
      <AddTile kind="photos" onClick={() => add()} />
      {!hasVideo && <AddTile kind="video" onClick={() => add("video")} />}
    </div>
  );
}

export function ShotList({
  onAdded,
  className,
}: {
  onAdded?: (note: string) => void;
  className?: string;
}) {
  const { photos } = useListing();
  const add = useAddMedia(onAdded);
  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-lg border border-border bg-surface px-4 py-1",
        className,
      )}
    >
      <div className="pt-3 pb-1 text-sm font-bold">Shots buyers look for</div>
      {shots.map((shot) => {
        const match = photos.find((p) => p.shot === shot.key);
        const done = match && !match.uploading;
        return (
          <div
            key={shot.key}
            className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
          >
            {done ? (
              <DoneTick />
            ) : match ? (
              <Spinner />
            ) : (
              <span className="size-6 shrink-0 rounded-full border-2 border-border" />
            )}
            <span className="flex-1 text-base font-semibold">{shot.label}</span>
            {!match && (
              <button
                type="button"
                onClick={() => add(shot.key)}
                className="cursor-pointer text-sm font-bold text-secondary hover:underline"
              >
                Add
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

