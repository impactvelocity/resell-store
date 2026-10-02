"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@repo/ui/icons";
import { ItemCard } from "@repo/ui/item-card";
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTab,
} from "@repo/ui/segmented-control";
import { WedgeMark } from "@repo/ui/whimsy";
import { cn } from "@repo/ui/lib/utils";
import type { HomeMode, ShopItem } from "../../lib/mock-home";
import { ItemArt } from "./illustrations";

/* Pieces shared by the selling and buying Home, phone and desktop. */

export function ModeSwitch({
  mode,
  onModeChange,
  className,
  tabClassName,
}: {
  mode: HomeMode;
  onModeChange: (mode: HomeMode) => void;
  className?: string;
  tabClassName?: string;
}) {
  return (
    <SegmentedControl
      value={mode}
      onValueChange={(value) => onModeChange(value as HomeMode)}
    >
      <SegmentedControlList
        aria-label="Home mode"
        className={cn("flex", className)}
      >
        <SegmentedControlTab
          value="selling"
          className={cn("min-w-0 flex-1", tabClassName)}
        >
          Selling
        </SegmentedControlTab>
        <SegmentedControlTab
          value="buying"
          className={cn("min-w-0 flex-1", tabClassName)}
        >
          Buying
        </SegmentedControlTab>
      </SegmentedControlList>
    </SegmentedControl>
  );
}

export function SectionHeader({
  title,
  href,
  action,
  className,
}: {
  title: ReactNode;
  href?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
        {title}
      </h2>
      {href && action && (
        <Link
          href={href}
          className="text-sm font-bold text-secondary hover:underline"
        >
          {action}
        </Link>
      )}
    </div>
  );
}

const pillTones = {
  secondary: "bg-secondary-soft text-secondary",
  primary: "bg-primary-soft text-text",
  muted: "bg-surface-muted text-text-muted",
} as const;

/** Small status pill (28px): "$5 hold paid", "Accepted", "Waiting", visibility. */
export function Pill({
  tone,
  dot = false,
  className,
  children,
}: {
  tone: keyof typeof pillTones;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        pillTones[tone],
        className,
      )}
    >
      {dot && (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-secondary" />
      )}
      {children}
    </span>
  );
}

/** The "Get your link" sidekick promo (lemon card with the wedge). */
export function SidekickPromo({ className }: { className?: string }) {
  return (
    <Link
      href="/tools/sidekick"
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl bg-primary-soft p-6 transition-colors hover:bg-lemon-300/40",
        className,
      )}
    >
      <div className="flex w-[250px] max-w-[calc(100%-56px)] flex-col gap-1.5">
        <div className="font-display text-xl font-extrabold tracking-[-0.02em]">
          Shopping sidekick
        </div>
        <p className="text-base">
          About to buy something? See what it will resell for first.
        </p>
      </div>
      <span className="flex items-center gap-1.5 text-sm font-bold text-secondary group-hover:underline">
        Get your link
        <ArrowUpRightIcon size={18} strokeWidth={2.4} />
      </span>
      <WedgeMark size={52} className="absolute top-4 right-[18px]" />
    </Link>
  );
}

/** A grid of item cards (A4 "New from your shops", and Search results). */
export function ItemGrid({
  items,
  className,
}: {
  items: ShopItem[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 desk:grid-cols-3 desk:gap-4", className)}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          title={item.title}
          meta={item.meta}
          price={`$${item.price}`}
          tone={item.tone}
          defaultLiked={item.liked}
          image={<ItemArt illustration={item.illustration} />}
          // Home artboards use a 196px photo and a 10px gap
          className="min-w-0 gap-2.5 [&>div:first-child]:h-[196px]"
        />
      ))}
    </div>
  );
}
