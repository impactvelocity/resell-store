"use client";

/* eslint-disable @next/next/no-img-element -- uploads and web pictures, any size */
import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Button } from "@repo/ui/button";
import { CloseIcon, PlusIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { addWebPhoto, removePhoto, reorderPhotos } from "../../app/actions/listing-media";
import type { PhotoView, WorkspaceListing } from "../../lib/server/listings";
import { AgentMessage, DoneTick, Spinner, Thread, ThreadCard } from "../agent-chat/agent-chat";
import { PlayGlyph, WebLinkGlyph } from "../listing-later/art";
import { useAgentChat } from "../listing-later/use-agent-chat";
import { CanvasHeader } from "../workspace/listing-panel";
import { ListingWorkspace, stepHref } from "../workspace/listing-workspace";
import { LiveEarlierCards } from "./earlier-cards";

/*
 * C5 Photos on real data. Uploads go one at a time to /api/listings/[id]/photos
 * with a progress ring on each tile; remove, reorder and "found on the web"
 * pictures are server actions. The first tile is the cover, twice the size,
 * and must be one of the seller's own photos. Up to 12 photos and a video.
 */

const maxPhotos = 12;
// The proxy buffers request bodies up to 10 MB, so bigger files never arrive whole
const maxBytes = 10 * 1024 * 1024;

export type WebSuggestion = { url: string; source: string; alt: string | null };

type Pending = {
  key: string;
  file: File;
  preview: string;
  isVideo: boolean;
  /** 0 to 1. */
  progress: number;
};

const isOwn = (p: PhotoView) => !p.source && !p.isVideo;

/** POST one file with upload progress. Resolves with the grid or an error line. */
function uploadFile(
  listingId: string,
  file: File,
  onProgress: (value: number) => void,
): Promise<{ photos?: PhotoView[]; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    xhr.open("POST", `/api/listings/${listingId}/photos`);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      const body = (xhr.response ?? {}) as { photos?: PhotoView[]; error?: string };
      resolve(xhr.status < 300 ? body : { error: body.error ?? "That one didn't upload. Try again?" });
    };
    xhr.onerror = () => resolve({ error: "That one didn't upload. Check your connection and try again." });
    xhr.send(form);
  });
}

/** The agent's opening line, from what's there when the step opens. */
function openingLine(photos: PhotoView[], suggestions: WebSuggestion[]) {
  const own = photos.filter(isOwn).length;
  const web = suggestions.filter((s) => !photos.some((p) => p.url === s.url));
  const found =
    web.length > 0
      ? ` I found ${web.length === 1 ? "a picture" : `${web.length} pictures`} from ${web[0]!.source}${web.length > 1 && new Set(web.map((s) => s.source)).size > 1 ? " and other shops" : ""} you can add too. They carry a label, so buyers know which ones are yours.`
      : "";
  if (own === 0)
    return `Now the photos. Your own pictures sell it, so start with the whole thing in good light. That one becomes the cover.${found}`;
  if (own < 4)
    return `You've got ${own === 1 ? "one photo" : `${own} photos`} of your own. Listings with four or more sell faster, so add a few more angles and any marks.${found}`;
  return `That's a good set. Check the cover is the one you like best: drag another to the front to swap.${found}`;
}

/** A short reply to anything typed here, based on what's in the grid now. */
function advice(photos: PhotoView[]) {
  const own = photos.filter(isOwn).length;
  const hasVideo = photos.some((p) => p.isVideo);
  if (own === 0) return "Start with one of your own photos of the whole thing. Daylight by a window works best, and a plain background helps.";
  if (own < 4) return "Add a close-up of any wear or marks next. Showing them up front saves you questions later.";
  if (!hasVideo) return "Looking good. A short video is optional, but it helps for anything that moves, opens or sounds.";
  return "You're set here. Drag to change the order, then head on to the words.";
}

/* Tiles ------------------------------------------------------------------- */

function WebChip({ source }: { source: string }) {
  return (
    <span className="absolute bottom-2.5 left-2.5 flex h-7 max-w-[calc(100%-20px)] items-center gap-1.5 rounded-full bg-text px-2.5 text-sm font-semibold text-background">
      <WebLinkGlyph />
      <span className="truncate">{source}</span>
    </span>
  );
}

function VideoLength({ url }: { url: string }) {
  const [length, setLength] = useState<string | null>(null);
  return (
    <>
      <video
        src={url}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const s = Math.round(e.currentTarget.duration);
          if (Number.isFinite(s)) setLength(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
        }}
        className="absolute inset-0 size-full object-cover"
      />
      <span className="absolute top-2.5 left-2.5 flex h-7 items-center gap-1 rounded-full bg-text pr-2.5 pl-2 text-sm font-semibold text-background">
        <PlayGlyph size={14} />
        {length ?? "Video"}
      </span>
    </>
  );
}

const tileSize = (cover: boolean) =>
  cover ? "col-span-2 h-[260px] desk:row-span-2 desk:h-auto" : "h-[164px] desk:h-auto";

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
  photo: PhotoView;
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
  const own = isOwn(photo);
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
        cover ? "Cover photo" : photo.isVideo ? "Video" : photo.source ? `Photo from ${photo.source}` : "Your photo"
      }
      className={cn(
        "group relative flex cursor-grab items-center justify-center overflow-hidden rounded-lg select-none active:cursor-grabbing",
        own ? "bg-leaf-100" : "border border-border bg-surface",
        tileSize(cover),
        dragging && "opacity-40",
        over && "ring-[3px] ring-primary ring-offset-2 ring-offset-background desk:ring-offset-surface-muted",
      )}
    >
      {photo.isVideo ? (
        <VideoLength url={photo.url} />
      ) : (
        <img
          src={photo.url}
          alt={photo.alt ?? ""}
          draggable={false}
          className={cn("absolute inset-0 size-full", own ? "object-cover" : "object-contain p-2")}
        />
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
      {removable && (
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

function PendingTile({ item, cover }: { item: Pending; cover: boolean }) {
  const pct = Math.round(item.progress * 100);
  return (
    <div
      aria-label={`Uploading, ${pct}%`}
      className={cn("relative flex items-center justify-center overflow-hidden rounded-lg bg-leaf-100", tileSize(cover))}
    >
      {item.isVideo ? (
        <video src={item.preview} muted playsInline className="absolute inset-0 size-full object-cover opacity-40" />
      ) : (
        <img src={item.preview} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
      )}
      <span className="relative flex flex-col items-center gap-2">
        <Spinner size={36} />
        <span className="rounded-full bg-surface px-2.5 py-0.5 text-sm font-semibold">
          {pct < 100 ? `${pct}%` : "Saving"}
        </span>
      </span>
    </div>
  );
}

function AddTile({
  kind,
  cover = false,
  onClick,
}: {
  kind: "photos" | "video";
  cover?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-border transition-colors hover:bg-surface",
        tileSize(cover),
        cover && "border-dashed bg-surface/60 px-6 text-center",
      )}
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
        {cover ? "Add your own photo for the cover" : kind === "photos" ? "Add photos" : "Add a video"}
      </span>
      {cover && <span className="max-w-[240px] text-sm text-text-muted">Buyers trust a real photo of the real thing.</span>}
    </button>
  );
}

/* Shot list and web pictures ---------------------------------------------- */

function ShotList({
  photos,
  onAdd,
  className,
}: {
  photos: PhotoView[];
  onAdd: (kind: "photos" | "video") => void;
  className?: string;
}) {
  const own = photos.filter(isOwn).length;
  const shots = [
    { label: "The whole thing, in good light", done: own >= 1, kind: "photos" as const },
    { label: "Front, back and sides", done: own >= 3, kind: "photos" as const },
    { label: "Close-ups of labels, marks or wear", done: own >= 4, kind: "photos" as const },
    { label: "A short video, if you like", done: photos.some((p) => p.isVideo), kind: "video" as const },
  ];
  return (
    <div className={cn("flex w-full flex-col rounded-lg border border-border bg-surface px-4 py-1", className)}>
      <div className="pt-3 pb-1 text-sm font-bold">Shots buyers look for</div>
      {shots.map((shot) => (
        <div key={shot.label} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
          {shot.done ? <DoneTick /> : <span className="size-6 shrink-0 rounded-full border-2 border-border" />}
          <span className="flex-1 text-base font-semibold">{shot.label}</span>
          {!shot.done && (
            <button
              type="button"
              onClick={() => onAdd(shot.kind)}
              className="cursor-pointer text-sm font-bold text-secondary hover:underline"
            >
              Add
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function WebPictures({
  suggestions,
  adding,
  onAdd,
  className,
}: {
  suggestions: WebSuggestion[];
  adding: string | null;
  onAdd: (s: WebSuggestion) => void;
  className?: string;
}) {
  if (suggestions.length === 0) return null;
  return (
    <ThreadCard className={className}>
      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-bold">Found on the web</div>
        <div className="text-sm text-text-muted">
          Pictures from the maker or shops. They always show where they came from, and your own photo stays the cover.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {suggestions.map((s) => (
          <div key={s.url} className="flex flex-col gap-2">
            <div className="relative h-[120px] overflow-hidden rounded-md border border-border bg-surface">
              <img src={s.url} alt={s.alt ?? ""} className="absolute inset-0 size-full object-contain p-1.5" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1 text-sm text-text-muted">
                <WebLinkGlyph size={12} />
                <span className="truncate">{s.source}</span>
              </span>
              <button
                type="button"
                disabled={adding !== null}
                onClick={() => onAdd(s)}
                className="flex shrink-0 cursor-pointer items-center gap-1 text-sm font-bold text-secondary enabled:hover:underline disabled:cursor-default disabled:opacity-60"
              >
                {adding === s.url && <Spinner size={14} />}
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </ThreadCard>
  );
}

/* Screen ------------------------------------------------------------------ */

function NextButtons({ listingId, hasPhotos, phone = false }: { listingId: string; hasPhotos: boolean; phone?: boolean }) {
  const href = stepHref(listingId, "words");
  const next = (
    <Button render={<Link href={href} />} nativeButton={false} className={phone ? "w-full" : undefined}>
      Next, the words
    </Button>
  );
  if (hasPhotos) return phone ? <div className="pt-1">{next}</div> : next;
  const skip = (
    <Button
      variant="ghost"
      render={<Link href={href} />}
      nativeButton={false}
      className={phone ? "h-auto px-0 hover:bg-transparent hover:underline" : undefined}
    >
      Skip for now
    </Button>
  );
  return phone ? (
    <div className="flex flex-col items-center gap-3.5 pt-1">
      {next}
      {skip}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {skip}
      {next}
    </div>
  );
}

export function LivePhotosScreen({
  listing,
  initialPhotos,
  suggestions,
  filledWithoutPhotos,
  total,
}: {
  listing: WorkspaceListing;
  initialPhotos: PhotoView[];
  suggestions: WebSuggestion[];
  /** Fields filled, not counting photos. */
  filledWithoutPhotos: number;
  total: number;
}) {
  const toast = useToast();
  const chat = useAgentChat([]);
  const [photos, setPhotos] = useState(initialPhotos);
  const [pending, setPending] = useState<Pending[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [opening] = useState(() => openingLine(initialPhotos, suggestions));
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);

  // Let go of the local previews when leaving the step
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const own = photos.filter(isOwn).length;
  const stills = photos.filter((p) => !p.isVideo).length + pending.filter((p) => !p.isVideo).length;
  const hasVideo = photos.some((p) => p.isVideo) || pending.some((p) => p.isVideo);
  const left = suggestions.filter((s) => !photos.some((p) => p.url === s.url));
  const filled = filledWithoutPhotos + (photos.length > 0 ? 1 : 0);

  function pick(kind: "photos" | "video") {
    if (kind === "video" && hasVideo) {
      toast.add({ title: "One video per listing. Remove it to add another." });
      return;
    }
    if (kind === "photos" && stills >= maxPhotos) {
      toast.add({ title: `That's the most: ${maxPhotos} photos.` });
      return;
    }
    (kind === "video" ? videoInput : photoInput).current?.click();
  }

  function enqueue(files: File[]) {
    let room = maxPhotos - stills;
    let videoTaken = hasVideo;
    const accepted: Pending[] = [];
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      if (!isVideo && !file.type.startsWith("image/")) {
        toast.add({ title: `${file.name} isn't a photo or a video.` });
        continue;
      }
      if (file.size > maxBytes) {
        toast.add({ title: `${file.name} is too big. Up to 10 MB for now.` });
        continue;
      }
      if (isVideo ? videoTaken : room <= 0) {
        toast.add({
          title: isVideo ? "One video per listing. Remove it to add another." : `That's the most: ${maxPhotos} photos.`,
        });
        continue;
      }
      if (isVideo) videoTaken = true;
      else room--;
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      accepted.push({ key: preview, file, preview, isVideo, progress: 0 });
    }
    if (!accepted.length) return;
    setPending((list) => [...list, ...accepted]);

    // One at a time, so positions land in the order they were picked
    for (const item of accepted) {
      queue.current = queue.current.then(async () => {
        const result = await uploadFile(listing.id, item.file, (progress) =>
          setPending((list) => list.map((p) => (p.key === item.key ? { ...p, progress } : p))),
        );
        setPending((list) => list.filter((p) => p.key !== item.key));
        if (result.photos) {
          const firstOwn = !latest.current.some(isOwn) && !item.isVideo;
          setPhotos(result.photos);
          chat.system(item.isVideo ? "Added a video" : firstOwn ? "Added your cover photo" : "Added a photo");
        } else {
          toast.add({ title: result.error ?? "That one didn't upload. Try again?" });
        }
      });
    }
  }

  async function remove(photo: PhotoView) {
    setArmedId(null);
    const before = photos;
    setPhotos((list) => list.filter((p) => p.id !== photo.id));
    try {
      const result = await removePhoto(listing.id, photo.id);
      setPhotos(result.photos);
      chat.system(
        photo.isVideo ? "Removed the video" : photo.source ? `Removed a photo from ${photo.source}` : "Removed a photo",
      );
    } catch {
      setPhotos(before);
      toast.add({ title: "Couldn't remove that one. Try again?" });
    }
  }

  async function move(from: string, to: string) {
    if (from === to) return;
    const list = [...photos];
    const fromIndex = list.findIndex((p) => p.id === from);
    const toIndex = list.findIndex((p) => p.id === to);
    if (fromIndex < 0 || toIndex < 0) return;
    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item!);
    if (!isOwn(list[0]!) && list.some(isOwn)) {
      toast.add({ title: "The cover has to be one of your own photos." });
      return;
    }
    const before = photos;
    setPhotos(list);
    try {
      const result = await reorderPhotos(listing.id, list.map((p) => p.id));
      setPhotos(result.photos);
      if (result.error) toast.add({ title: result.error });
    } catch {
      setPhotos(before);
      toast.add({ title: "Couldn't save that order. Try again?" });
    }
  }

  async function addFromWeb(s: WebSuggestion) {
    if (stills >= maxPhotos) {
      toast.add({ title: `That's the most: ${maxPhotos} photos.` });
      return;
    }
    setAdding(s.url);
    try {
      const result = await addWebPhoto(listing.id, s.url);
      setPhotos(result.photos);
      if (result.error) toast.add({ title: result.error });
      else chat.system(`Added a photo from ${s.source}`);
    } catch {
      toast.add({ title: "Couldn't add that one. Try again?" });
    } finally {
      setAdding(null);
    }
  }

  // The cover slot stays open for the seller's own photo until there is one
  const coverSlot = own === 0;
  const coverPending = coverSlot ? pending.find((p) => !p.isVideo) : undefined;
  const grid = (
    <div
      className="grid grid-cols-2 gap-3 desk:auto-rows-[184px] xl:grid-cols-[1.25fr_1.25fr_1fr_1fr]"
      onClick={() => setArmedId(null)}
    >
      {coverSlot &&
        (coverPending ? (
          <PendingTile item={coverPending} cover />
        ) : (
          <AddTile kind="photos" cover onClick={() => pick("photos")} />
        ))}
      {photos.map((photo, i) => {
        const isCover = i === 0 && isOwn(photo);
        // The cover can't go while it's the only one of theirs and web pictures would take its place
        const removable = !(isCover && own <= 1 && photos.length > 1);
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
              draggable: true,
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
                if (dragId) void move(dragId, photo.id);
                setDragId(null);
                setOverId(null);
              },
            }}
          />
        );
      })}
      {pending
        .filter((item) => item !== coverPending)
        .map((item) => (
          <PendingTile key={item.key} item={item} cover={false} />
        ))}
      {stills < maxPhotos && !(coverSlot && !coverPending) && (
        <AddTile kind="photos" onClick={() => pick("photos")} />
      )}
      {!hasVideo && <AddTile kind="video" onClick={() => pick("video")} />}
    </div>
  );

  const note = (
    <p className="text-sm text-text-muted">
      <span className="desk:hidden">Hold and drag to reorder. </span>
      Photos from the web always show where they came from. You can remove them any time.
    </p>
  );

  const inputs: ReactNode = (
    <>
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          enqueue(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          enqueue(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </>
  );

  return (
    <ListingWorkspace
      listingId={listing.id}
      step="photos"
      title={listing.title}
      shopName={listing.shop.name}
      closeHref={listing.closeHref}
      filled={filled}
      total={total}
      busy={chat.busy}
      composerHint="Ask about photos"
      onSend={(text) => chat.send(text, { thinking: "Looking at your photos", text: advice(latest.current) })}
      saveKey={photos.map((p) => p.id).join()}
      chat={
        <Thread>
          {inputs}
          <AgentMessage>{opening}</AgentMessage>

          {/* Desktop: the shot list and web pictures sit in the chat, the grid on the canvas */}
          <ShotList className="hidden desk:flex" photos={photos} onAdd={pick} />
          <WebPictures className="hidden desk:flex" suggestions={left} adding={adding} onAdd={addFromWeb} />

          {/* Phone: everything sits in the chat */}
          <div className="flex flex-col gap-4 desk:hidden">
            {grid}
            {note}
            <ShotList photos={photos} onAdd={pick} />
            <WebPictures suggestions={left} adding={adding} onAdd={addFromWeb} />
            <NextButtons listingId={listing.id} hasPhotos={photos.length > 0} phone />
          </div>

          {chat.thread}
        </Thread>
      }
      canvas={
        <>
          <CanvasHeader
            title="Photos"
            description="Drag to reorder. The first one is the cover."
            filled={filled}
            total={total}
          />
          {grid}
          <div className="mt-5 flex flex-col gap-4 desk:flex-row desk:items-center desk:justify-between">
            <div className="max-w-[360px]">{note}</div>
            <div className="hidden desk:block">
              <NextButtons listingId={listing.id} hasPhotos={photos.length > 0} />
            </div>
          </div>
          <LiveEarlierCards listing={listing} />
        </>
      }
    />
  );
}
