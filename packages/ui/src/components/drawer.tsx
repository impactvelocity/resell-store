"use client";

import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/*
 * Bottom sheet for phones. Opens to 90% of the screen, swipe down to close.
 * Built on Base UI Drawer.
 */

export const Drawer = BaseDrawer.Root;
export const DrawerTrigger = BaseDrawer.Trigger;
export const DrawerClose = BaseDrawer.Close;

export function DrawerContent({
  className,
  children,
  ...props
}: ComponentProps<typeof BaseDrawer.Popup>) {
  return (
    <BaseDrawer.Portal>
      <BaseDrawer.Backdrop className="fixed inset-0 min-h-dvh bg-text opacity-[calc(0.4*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />
      <BaseDrawer.Viewport className="fixed inset-0 flex items-end justify-center">
        <BaseDrawer.Popup
          className={cn(
            "-mb-12 flex h-[calc(90dvh+3rem)] w-full flex-col overflow-hidden rounded-t-xl bg-background pb-12 text-text outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:[transform:translateY(calc(100%-3rem+2px))] data-starting-style:[transform:translateY(calc(100%-3rem+2px))] data-swiping:select-none",
            className,
          )}
          {...props}
        >
          <div
            aria-hidden
            className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-border"
          />
          <BaseDrawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </BaseDrawer.Content>
        </BaseDrawer.Popup>
      </BaseDrawer.Viewport>
    </BaseDrawer.Portal>
  );
}

export function DrawerTitle({
  className,
  ...props
}: ComponentProps<typeof BaseDrawer.Title>) {
  return (
    <BaseDrawer.Title
      className={cn(
        "font-display text-2xl font-extrabold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}
