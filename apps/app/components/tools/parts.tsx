"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@repo/ui/drawer";
import { CheckIcon, ChevronDownIcon, LockIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";

/*
 * Small pieces shared by the Tools screens (D1–D4).
 */

/** "mcp.resell.store/u/maya-••••••x7Qa": an agent link with its secret hidden. */
export function maskLink(url: string) {
  const bare = url.replace(/^https?:\/\//, "");
  return bare.replace(/([^/]+)$/, (t) => `${t.slice(0, t.indexOf("-") + 1)}${"•".repeat(6)}${t.slice(-4)}`);
}

/** Card holding a titled group of rows (connections, permissions, apps). */
export function GroupCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex w-full flex-col rounded-xl border border-border bg-surface px-[18px] pt-5 pb-1.5 desk:px-6 desk:pt-6 desk:pb-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 pb-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-text-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Row inside a GroupCard. Rows get a divider except the last. */
export function GroupRow({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3.5 border-b border-border py-4 last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

/** Square letter tile standing in for a service logo. */
export function LetterTile({
  tone = "muted",
  children,
  className,
}: {
  tone?: "leaf" | "muted" | "pink";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-md font-display text-lg leading-6 font-extrabold text-text transition-colors",
        tone === "leaf" && "bg-secondary-soft",
        tone === "muted" && "bg-surface-muted",
        tone === "pink" && "bg-accent-soft",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small status pill: green with a dot, pink, lemon or muted. */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: "leaf" | "pink" | "lemon" | "muted";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold whitespace-nowrap",
        tone === "leaf" && "bg-secondary-soft text-secondary",
        tone === "pink" && "bg-accent-soft text-accent-text",
        tone === "lemon" && "bg-primary-soft text-text",
        tone === "muted" && "bg-surface-muted text-text",
        className,
      )}
    >
      {tone === "leaf" && (
        <span aria-hidden className="size-1.5 rounded-full bg-secondary" />
      )}
      {children}
    </span>
  );
}

/** Lemon number disc for step cards. */
export function StepNumber({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base leading-5 font-extrabold text-on-primary">
      {children}
    </span>
  );
}

/** Text-only action in the secondary green (Manage, See all, Edit…). */
export function TextAction({
  className,
  tone = "secondary",
  ...props
}: ComponentProps<"button"> & { tone?: "secondary" | "danger" }) {
  return (
    <button
      type="button"
      className={cn(
        "shrink-0 cursor-pointer rounded-sm text-sm font-bold whitespace-nowrap outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        tone === "secondary" ? "text-secondary" : "text-danger",
        className,
      )}
      {...props}
    />
  );
}

/** On/off toggle. Leaf green when on. */
export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        checked ? "bg-secondary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "size-[22px] rounded-full bg-surface shadow-[0_1px_2px_rgb(20_38_29/0.2)] transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

/** Small outlined menu button: Always, Ask me first, Never. */
export function ChoiceMenu<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${value}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface pr-2.5 pl-3.5 text-sm font-bold whitespace-nowrap transition-colors outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        {value}
        <ChevronDownIcon size={16} strokeWidth={2.4} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-30 mt-1.5 flex w-44 flex-col rounded-md border border-border bg-surface p-1.5 shadow-[0_12px_32px_-12px_rgb(20_38_29/0.25)]"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === value}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className="flex h-10 cursor-pointer items-center justify-between rounded-sm px-3 text-left text-sm font-semibold hover:bg-surface-muted"
            >
              {option}
              {option === value && (
                <CheckIcon size={16} className="text-secondary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Grey "Never" with a lock. Can't be changed. */
export function LockedPill({ children = "Never" }: { children?: ReactNode }) {
  return (
    <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface-muted px-3.5 text-sm font-bold text-text-muted">
      <LockIcon size={14} strokeWidth={2.4} />
      {children}
    </span>
  );
}

/** Small spinner in the current text colour. */
export function MiniSpinner({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("shrink-0 animate-spin motion-reduce:animate-none", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Copies text, shows a toast, and flips a "Copied" label for a moment. */
export function useCopy() {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = (key: string, text: string, message: string) => {
    try {
      void navigator.clipboard?.writeText(text).catch(() => {});
    } catch {
      // Clipboard can be blocked in previews; the toast still confirms.
    }
    toast.add({ title: message });
    setCopied(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2000);
  };

  return { copy, copied };
}

const desktopQuery = "(min-width: 900px)";

/** True at the desk: breakpoint (900px). False during server render. */
export function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(desktopQuery);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );
}

/** A bottom sheet on phones, a centred dialog on desktop. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <p className="text-base text-text-muted">{description}</p>
            )}
          </div>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-auto max-h-[calc(90dvh+3rem)]">
        <div className="flex flex-col gap-5 px-5 pt-3 pb-8">
          <div className="flex flex-col gap-1">
            <DrawerTitle>{title}</DrawerTitle>
            {description && (
              <p className="text-base text-text-muted">{description}</p>
            )}
          </div>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
