"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/** Pill-shaped tabs with a sliding lemon indicator. Built on Base UI Tabs. */
export const SegmentedControl = Tabs.Root;

export function SegmentedControlList({
  className,
  children,
  ...props
}: ComponentProps<typeof Tabs.List>) {
  return (
    <Tabs.List
      className={cn(
        "relative z-0 inline-flex w-fit items-center rounded-full border-[1.5px] border-border bg-surface p-1",
        className,
      )}
      {...props}
    >
      {children}
      <Tabs.Indicator className="absolute top-(--active-tab-top) left-0 -z-10 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-primary transition-[translate,width] duration-200 ease-out" />
    </Tabs.List>
  );
}

export function SegmentedControlTab({
  className,
  ...props
}: ComponentProps<typeof Tabs.Tab>) {
  return (
    <Tabs.Tab
      className={cn(
        "flex h-11 min-w-[104px] cursor-pointer items-center justify-center rounded-full px-4 text-sm font-semibold whitespace-nowrap text-text-muted transition-colors outline-none select-none hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-secondary",
        "data-active:font-bold data-active:text-on-primary",
        className,
      )}
      {...props}
    />
  );
}

export function SegmentedControlPanel({
  className,
  ...props
}: ComponentProps<typeof Tabs.Panel>) {
  return <Tabs.Panel className={cn("outline-none", className)} {...props} />;
}
