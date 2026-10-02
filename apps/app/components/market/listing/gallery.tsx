"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import type { PhotoView } from "../../../lib/mock-listing-detail";
import { ItemArt } from "../art";

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

/** White pill that sits on a photo: caption, "1 of 6". */
function PhotoChip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "absolute flex h-8 items-center rounded-full bg-white px-3 text-sm text-text",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Desktop gallery (P3): thumbnails beside a big photo with arrows. Arrow keys step through. */
export function Gallery({ photos, title }: { photos: PhotoView[]; title: string }) {
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const photo = photos[index]!;
  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
    else return;
    e.preventDefault();
  }

  return (
    <div className="flex min-w-0 flex-col-reverse gap-3 xl:flex-row xl:gap-4">
      {count > 1 && (
        // Below xl the thumbnails run under the photo; from xl they stand beside it, never taller than it
        <div className="relative shrink-0 xl:w-[92px]">
          <div
            role="group"
            aria-label="Choose a photo"
            onKeyDown={onKeyDown}
            className="flex gap-3 overflow-x-auto p-0.5 [scrollbar-width:none] xl:absolute xl:inset-0 xl:flex-col xl:overflow-x-visible xl:overflow-y-auto"
          >
            {photos.map((p, i) => (
              <button
                key={p.art + i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1}: ${p.caption}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "flex size-[72px] shrink-0 cursor-pointer items-center justify-center rounded-[12px] border-2 bg-public-photo transition-colors xl:size-[88px]",
                  i === index
                    ? "border-leaf-900"
                    : "border-transparent hover:border-public-border",
                  focusRing,
                )}
              >
                <ItemArt art={p.art} size={52} className="h-auto w-[59%]" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`Photos of ${title}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex aspect-square max-h-[672px] w-full min-w-0 items-center justify-center rounded-lg bg-public-photo",
          focusRing,
        )}
      >
        <ItemArt
          key={index}
          art={photo.art}
          size={380}
          className="h-auto w-[56%]"
        />
        <span className="sr-only" aria-live="polite">
          Photo {index + 1} of {count}: {photo.caption}
        </span>

        {count > 1 && (
          <>
            <ArrowButton side="left" onClick={() => go(-1)} />
            <ArrowButton side="right" onClick={() => go(1)} />
            <PhotoChip className="right-4 bottom-4 font-semibold">
              {index + 1} of {count}
            </PhotoChip>
          </>
        )}
        <PhotoChip className="bottom-4 left-4 font-medium">{photo.caption}</PhotoChip>
      </div>
    </div>
  );
}

function ArrowButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-text transition-[scale] hover:scale-105 active:scale-95",
        side === "left" ? "left-4" : "right-4",
        focusRing,
      )}
    >
      <Icon size={18} strokeWidth={2.4} />
    </button>
  );
}

/** Mobile photo slider (P9): full-bleed, swipe with scroll-snap, dots and a counter. */
export function PhotoSlider({
  photos,
  title,
  overlay,
  className,
}: {
  photos: PhotoView[];
  title: string;
  /** Sits top-right on the photo, e.g. the heart */
  overlay?: ReactNode;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const count = photos.length;

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  function goTo(i: number) {
    const el = track.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`Photos of ${title}`}
      className={cn("relative bg-public-photo", className)}
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p, i) => (
          <div
            key={p.art + i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${p.caption}`}
            className="flex aspect-square max-h-[560px] w-full shrink-0 snap-center items-center justify-center"
          >
            <ItemArt art={p.art} size={230} className="h-auto w-[59%] max-w-[330px]" />
          </div>
        ))}
      </div>

      {overlay && <div className="absolute top-4 right-4">{overlay}</div>}

      {count > 1 && (
        <>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {photos.map((p, i) => (
              <button
                key={p.art + i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "h-1.5 cursor-pointer rounded-full transition-[width,background-color]",
                  i === index ? "w-[18px] bg-leaf-900" : "w-1.5 bg-[#bdbdbd]",
                  focusRing,
                )}
              />
            ))}
          </div>
          <span className="absolute right-4 bottom-3 flex h-7 items-center rounded-full bg-white px-2.5 text-xs font-semibold text-text">
            {index + 1} of {count}
          </span>
        </>
      )}
    </div>
  );
}
