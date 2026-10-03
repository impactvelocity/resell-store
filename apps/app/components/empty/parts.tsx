import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRightIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";

/*
 * Small pieces for the live empty and "soon" screens. Server-safe: plain links
 * styled like @repo/ui Button, so pages can render them without a client island.
 */

const actionVariants = {
  primary: "bg-primary text-on-primary hover:bg-lemon-300",
  secondary: "bg-secondary text-on-secondary hover:bg-leaf-900",
  soft: "border-[1.5px] border-border bg-surface text-text hover:bg-surface-muted",
} as const;

/** A link that looks like a Button (md on phones, lg-ish on desktop). */
export function ActionLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof actionVariants }) {
  return (
    <Link
      className={cn(
        "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-base font-bold whitespace-nowrap transition-[background-color,scale] select-none active:scale-[0.98] [&_svg]:shrink-0",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        actionVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

/**
 * "See the design" link. A plain <a> on purpose: ?view=mock goes through the
 * proxy, which sets the mock cookie and reloads the same URL from app/mock.
 */
export function CompareWithDesign({
  className,
  children = "See the design",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href="?view=mock"
      className={cn(
        "inline-flex items-center gap-1 rounded-sm font-bold text-secondary outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        className,
      )}
    >
      {children}
      <ArrowUpRightIcon size={16} strokeWidth={2.4} />
    </a>
  );
}

/** Section heading used across the empty screens, matching the mock cards. */
export function SectionTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("font-display text-xl font-extrabold tracking-tight", className)}
      {...props}
    />
  );
}

/** Small count tile: label over a big number. */
export function CountTile({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-lg border border-border bg-surface px-[18px] py-4 desk:rounded-xl desk:px-6 desk:py-5",
        className,
      )}
    >
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <span className="font-display text-2xl font-extrabold tracking-tight desk:text-[32px] desk:leading-10">
        {value}
      </span>
      {hint && <span className="text-sm text-text-muted">{hint}</span>}
    </div>
  );
}
