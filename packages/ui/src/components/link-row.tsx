"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowUpRightIcon } from "./icons";

const iconTones = {
  surface: "bg-surface text-text",
  secondary: "bg-secondary-soft text-secondary",
  accent: "bg-accent-soft text-accent-text",
} as const;

export interface LinkRowProps extends useRender.ComponentProps<"a"> {
  icon: ReactNode;
  iconTone?: keyof typeof iconTones;
  /** The lemon one. Use for a single headline link. */
  featured?: boolean;
}

/** Big tappable link — shop links, profile links, help. Renders an `<a>` by default. */
export function LinkRow({
  icon,
  iconTone,
  featured = false,
  className,
  children,
  render,
  ...props
}: LinkRowProps) {
  const tone = iconTone ?? (featured ? "surface" : "secondary");

  return useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      {
        className: cn(
          "flex h-[68px] w-full items-center gap-3.5 rounded-full pr-5 pl-3.5 text-base transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
          featured
            ? "bg-primary font-bold text-on-primary hover:bg-lemon-300"
            : "border-[1.5px] border-border bg-surface font-semibold text-text hover:bg-surface-muted",
          className,
        ),
        children: (
          <>
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                iconTones[tone],
              )}
            >
              {icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{children}</span>
            <ArrowUpRightIcon
              className={cn(
                "shrink-0",
                featured ? "text-on-primary" : "text-text-muted",
              )}
            />
          </>
        ),
      },
      props,
    ),
  });
}
