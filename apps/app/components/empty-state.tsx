import type { ReactNode } from "react";
import { Sticker } from "@repo/ui/sticker";
import { cn } from "@repo/ui/lib/utils";
import { EmptyArt, isEmptyArtPreset, type EmptyArtPreset } from "./empty/art";

/*
 * What a screen shows before there's anything on it: a soft tile with one
 * illustration and a tilted sticker, a big friendly line, one sentence, and
 * the one thing to do next. Used by live screens whose data starts empty and
 * by flows that aren't switched on yet ("soon").
 *
 * `art` takes a preset scene ("garden", "items", "messages", "chart",
 * "payout", "seedling") or any node. `surface="public"` swaps to the plain
 * white marketplace look.
 */

const tileTones = {
  lemon: "bg-primary-soft",
  leaf: "bg-leaf-100",
  pink: "bg-pink-100",
  muted: "bg-surface-muted",
  /** Marketplace photo grey. The default on public pages. */
  photo: "bg-public-photo",
  /** White with a border, for sitting on a coloured card. */
  white: "border border-border bg-surface",
} as const;

export type EmptyStateTone = keyof typeof tileTones;
export type { EmptyArtPreset };

export function EmptyState({
  art,
  sticker,
  stickerTone = "accent",
  title,
  children,
  actions,
  footnote,
  tone,
  size = "md",
  surface = "app",
  className,
}: {
  /** A preset scene by name, or one illustration from @repo/ui/whimsy or the item art. */
  art?: EmptyArtPreset | ReactNode;
  /** A word or two on a tilted sticker over the art: "Nothing yet", "Soon". */
  sticker?: ReactNode;
  stickerTone?: "primary" | "secondary" | "accent" | "leaf";
  title: ReactNode;
  children?: ReactNode;
  /** Buttons, primary first. */
  actions?: ReactNode;
  /** Small print under the buttons: a side link, a "why". */
  footnote?: ReactNode;
  /** Tile colour. Defaults to lemon in the app and photo grey on public pages. */
  tone?: EmptyStateTone;
  /** "lg" fills a whole page; "md" sits inside one; "sm" sits in a card or column. */
  size?: "sm" | "md" | "lg";
  /** "app" on the lemon ground; "public" on the white marketplace and store pages. */
  surface?: "app" | "public";
  className?: string;
}) {
  const publicSurface = surface === "public";
  const tileTone = tone ?? (publicSurface ? "photo" : "lemon");

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center text-center",
        size === "lg" && "gap-6 px-4 py-12 desk:gap-7 desk:py-24",
        size === "md" && "gap-5 px-4 py-10 desk:gap-6 desk:py-16",
        size === "sm" && "gap-4 px-4 py-8",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center",
          tileTones[tileTone],
          size === "lg" && "size-[184px] rounded-[36px] desk:size-[232px] desk:rounded-[44px]",
          size === "md" && "size-[148px] rounded-[32px] desk:size-[168px] desk:rounded-[36px]",
          size === "sm" && "size-[112px] rounded-[26px]",
        )}
      >
        {isEmptyArtPreset(art) || art === undefined || art === null ? (
          <EmptyArt preset={isEmptyArtPreset(art) ? art : "garden"} className="size-[66%]" />
        ) : (
          art
        )}
        {sticker && (
          <Sticker
            tone={stickerTone}
            size={size === "sm" ? "sm" : "md"}
            rotate={-6}
            className={cn(
              "absolute origin-top-left shadow-[0_6px_16px_-8px_rgb(20_38_29/0.35)]",
              size === "sm" ? "-top-2.5 -right-4" : "-top-3 -right-5",
            )}
          >
            {sticker}
          </Sticker>
        )}
      </div>
      <div className={cn("flex max-w-[460px] flex-col", size === "sm" ? "gap-1.5" : "gap-2.5")}>
        <h2
          className={cn(
            "font-display font-extrabold tracking-tight text-balance text-text",
            size === "lg" && "text-[28px] leading-9 desk:text-[40px] desk:leading-[44px]",
            size === "md" && "text-2xl desk:text-[28px] desk:leading-8",
            size === "sm" && "text-xl",
          )}
        >
          {title}
        </h2>
        {children && (
          <div
            className={cn(
              "text-pretty",
              publicSurface ? "text-public-text-muted" : "text-text-muted",
              size === "sm" ? "text-sm" : "text-base desk:text-lg",
            )}
          >
            {children}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-col items-stretch justify-center gap-3 min-[420px]:w-auto min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center">
          {actions}
        </div>
      )}
      {footnote && (
        <div
          className={cn(
            "max-w-[420px] text-sm text-pretty",
            publicSurface ? "text-public-text-muted" : "text-text-muted",
          )}
        >
          {footnote}
        </div>
      )}
    </div>
  );
}
