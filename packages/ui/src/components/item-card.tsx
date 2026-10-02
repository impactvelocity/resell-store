"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";
import { LikeButton } from "./button";
import { Sticker } from "./sticker";

const photoTones = {
  pink: "bg-pink-100",
  leaf: "bg-leaf-100",
  lemon: "bg-lemon-100",
  muted: "bg-surface-muted",
} as const;

export interface ItemCardProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode;
  meta?: ReactNode;
  /** Photo or illustration. Images should fill the frame (`object-cover`). */
  image: ReactNode;
  tone?: keyof typeof photoTones;
  price?: string;
  sold?: boolean;
  liked?: boolean;
  defaultLiked?: boolean;
  onLikedChange?: (liked: boolean) => void;
}

/** A listing tile: photo, like toggle, price sticker, title and a line of detail. */
export function ItemCard({
  title,
  meta,
  image,
  tone = "muted",
  price,
  sold = false,
  liked,
  defaultLiked,
  onLikedChange,
  className,
  ...props
}: ItemCardProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      <div
        className={cn(
          "relative flex h-[236px] items-center justify-center overflow-hidden rounded-lg [&>img]:size-full [&>img]:object-cover",
          photoTones[tone],
        )}
      >
        {image}
        <LikeButton
          variant="overlay"
          pressed={liked}
          defaultPressed={defaultLiked}
          onPressedChange={onLikedChange}
          className="absolute top-2.5 right-2.5"
        />
        {sold ? (
          <Sticker
            tone="secondary"
            size="md"
            rotate={-1}
            className="absolute bottom-3 left-2.5 origin-top-left text-lg"
          >
            Sold
          </Sticker>
        ) : (
          price && (
            <Sticker
              tone="primary"
              size="md"
              rotate={-5}
              className="absolute bottom-3 left-2.5 origin-top-left"
            >
              {price}
            </Sticker>
          )
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <div className="text-base font-semibold text-text">{title}</div>
        {meta && <div className="text-sm text-text-muted">{meta}</div>}
      </div>
    </div>
  );
}
