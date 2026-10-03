/* eslint-disable @next/next/no-img-element -- uploads and web pictures, any size */
import { cn } from "@repo/ui/lib/utils";
import type { PhotoView } from "../../lib/server/listings";
import { PlayGlyph } from "../listing-later/art";

/** A small square of a listing photo or video, cropped to fill. */
export function PhotoThumb({ photo, className }: { photo: PhotoView | null | undefined; className?: string }) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden bg-leaf-100", className)}>
      {photo?.isVideo ? (
        <>
          <video src={photo.url} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" />
          <span className="relative flex size-6 items-center justify-center rounded-full bg-text text-background">
            <PlayGlyph size={12} />
          </span>
        </>
      ) : photo ? (
        <img src={photo.url} alt={photo.alt ?? ""} className="absolute inset-0 size-full object-cover" />
      ) : null}
    </span>
  );
}
