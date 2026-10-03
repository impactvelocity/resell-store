import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { BellIcon, ChevronLeftIcon } from "@repo/ui/icons";
import { Wordmark } from "@repo/ui/logo";
import { cn } from "@repo/ui/lib/utils";
import { ViewerInitial } from "../viewer";
import { BellBadge, BellLabel } from "./bell-badge";

/*
 * Page-level pieces shared by screens inside the app shell.
 * Phone headers are per page; the desktop sidebar comes from <AppShell>.
 */

/** Page padding: 16px gutters on a phone, 48px beside the sidebar on desktop. */
export function Page({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 px-4 pt-3 desk:gap-8 desk:px-12 desk:pt-10 desk:pb-14",
        className,
      )}
      {...props}
    />
  );
}

/** Desktop page title row: big display title on the left, actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-base text-text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export function BellButton({
  className,
  size = "md",
}: {
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <Link
      href="/inbox"
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-text transition-colors hover:bg-surface-muted",
        size === "lg" ? "size-12" : "size-10",
        className,
      )}
    >
      <BellIcon size={size === "lg" ? 22 : 20} strokeWidth={2.2} aria-hidden />
      <BellLabel />
      <BellBadge />
    </Link>
  );
}

export function MeAvatar({ className }: { className?: string }) {
  return (
    <Link
      href="/me"
      aria-label="Me"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-extrabold text-on-primary",
        className,
      )}
    >
      <ViewerInitial />
    </Link>
  );
}

/** Phone top bar for the main tabs: wordmark, bell, avatar. */
export function MobileTopBar({
  className,
  actions,
}: {
  className?: string;
  /** Replaces the bell and avatar. */
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] desk:hidden",
        className,
      )}
    >
      <Link href="/home" className="flex items-center">
        <Wordmark size="sm" />
      </Link>
      <div className="flex items-center gap-2">
        {actions ?? (
          <>
            <BellButton />
            <MeAvatar />
          </>
        )}
      </div>
    </div>
  );
}

/** Round soft icon button that is a link. */
export function IconLink({
  className,
  ...props
}: ComponentProps<typeof Link> & { "aria-label": string }) {
  return (
    <Link
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-text transition-colors hover:bg-surface-muted",
        className,
      )}
      {...props}
    />
  );
}

/** Phone header for pages below a tab: back button, centred title, optional action. */
export function MobileBackHeader({
  title,
  backHref,
  action,
  className,
}: {
  title: ReactNode;
  backHref: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[40px_1fr_40px] items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] desk:hidden",
        className,
      )}
    >
      <IconLink href={backHref} aria-label="Back">
        <ChevronLeftIcon />
      </IconLink>
      <div className="truncate text-center text-base font-bold">{title}</div>
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

/** Small uppercase section label. */
export function Eyebrow({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-sm font-semibold tracking-wide text-text-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}

/** White card with the standard border. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface desk:rounded-xl",
        className,
      )}
      {...props}
    />
  );
}
