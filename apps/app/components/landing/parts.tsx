import type { ComponentProps, ReactNode } from "react";
import { CheckIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";

/* Pieces shared by the L1 landing page sections. */

export const githubUrl = "https://github.com/impactvelocity/resell-store";
export const hackathonUrl = "https://paypalaihackathon.devpost.com/";

/** 1440 artboard, 96px gutters on desktop. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1440px] px-4 md:px-12 xl:px-24",
        className,
      )}
      {...props}
    />
  );
}

/** Section headline: 64px display type on desktop. */
export function Headline({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h2
      className={cn(
        "font-display text-4xl font-extrabold tracking-tight md:text-5xl",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Headline on the left, a muted aside on the right, bottom aligned. */
export function SectionIntro({
  title,
  aside,
  className,
}: {
  title: ReactNode;
  aside: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16",
        className,
      )}
    >
      <Headline className="max-w-[760px]">{title}</Headline>
      <p className="max-w-[400px] text-lg text-text-muted md:text-xl md:leading-[30px]">
        {aside}
      </p>
    </div>
  );
}

/** Green disc with a white tick, for checklists. */
export function CheckDot({ size = 28 }: { size?: 24 | 28 }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-secondary text-white"
      style={{ width: size, height: size }}
    >
      <CheckIcon size={14} strokeWidth={3.4} />
    </span>
  );
}

/** Outlined label pill ("ChatGPT", "Ski gear"). Not interactive. */
export function Tag({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-full border border-border bg-surface px-3.5 text-sm font-semibold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small heading + line of copy, used in the promise and feature grids. */
export function Point({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <h3 className="font-display text-xl font-extrabold tracking-tight">
        {title}
      </h3>
      <p className="text-base text-text-muted">{children}</p>
    </div>
  );
}

/** The big 64px call-to-action size from the hero and closing panel. */
export const bigButton = "h-16 px-8 text-lg";
