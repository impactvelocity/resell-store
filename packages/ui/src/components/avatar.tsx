"use client";

import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cn } from "../lib/utils";

const avatarSizes = {
  sm: "size-10 text-lg",
  md: "size-14 text-2xl",
  lg: "size-[72px] text-3xl",
} as const;

export interface AvatarProps {
  src?: string;
  alt?: string;
  /** Shown while the image loads, or when there is none. Usually an initial. */
  fallback: string;
  size?: keyof typeof avatarSizes;
  className?: string;
}

export function Avatar({
  src,
  alt = "",
  fallback,
  size = "md",
  className,
}: AvatarProps) {
  return (
    <BaseAvatar.Root
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary align-middle font-display font-extrabold tracking-tight text-on-primary select-none",
        avatarSizes[size],
        className,
      )}
    >
      {src && (
        <BaseAvatar.Image
          src={src}
          alt={alt}
          className="size-full object-cover"
        />
      )}
      <BaseAvatar.Fallback>{fallback}</BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}
