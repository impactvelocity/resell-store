"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/** Floating bottom navigation for mobile. */
export function TabBar({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border-[1.5px] border-border bg-surface p-2",
        className,
      )}
      {...props}
    />
  );
}

export interface TabBarItemProps extends useRender.ComponentProps<"a"> {
  active?: boolean;
  /** The dark centre action, e.g. "Sell". */
  emphasis?: boolean;
  "aria-label": string;
}

/** Renders an `<a>` by default; pass `render={<Link href="…" />}` for client routing. */
export function TabBarItem({
  active = false,
  emphasis = false,
  className,
  render,
  ...props
}: TabBarItemProps) {
  return useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      {
        "aria-current": active ? "page" : undefined,
        className: cn(
          "flex h-[52px] w-14 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&_svg]:size-[22px]",
          emphasis
            ? "bg-text text-background hover:bg-leaf-600"
            : active
              ? "bg-primary text-on-primary"
              : "text-text-muted hover:text-text",
          className,
        ),
      },
      props,
    ),
  });
}
