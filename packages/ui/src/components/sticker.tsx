import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

const stickerTones = {
  primary: "bg-primary text-on-primary",
  accent: "bg-accent text-text",
  secondary: "bg-secondary text-on-secondary",
  leaf: "bg-leaf-300 text-text",
} as const;

const stickerSizes = {
  lg: "px-5 py-2.5 text-2xl",
  md: "px-3.5 py-1 text-xl",
  sm: "px-4 py-2 text-lg leading-6 tracking-[-0.02em]",
} as const;

export interface StickerProps extends ComponentProps<"span"> {
  tone?: keyof typeof stickerTones;
  size?: keyof typeof stickerSizes;
  /** Tilt in degrees. Stickers look best a little crooked. */
  rotate?: number;
}

/** Tilted pill for prices and moments worth celebrating. Use one or two per screen. */
export function Sticker({
  className,
  tone = "primary",
  size = "sm",
  rotate = -3,
  style,
  ...props
}: StickerProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full font-display font-extrabold tracking-tight whitespace-nowrap",
        stickerTones[tone],
        stickerSizes[size],
        className,
      )}
      style={{ rotate: `${rotate}deg`, ...style }}
      {...props}
    />
  );
}
