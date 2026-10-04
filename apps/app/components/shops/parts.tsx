"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDownIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { trackShare } from "../../lib/track";
import { cn } from "@repo/ui/lib/utils";
import { visibilityLabel, type Shop, type ShopVisibility } from "../../lib/mock";
import type { ShopListing, ThumbKind, ThumbTone } from "../../lib/mock-shops";
import { checkShopLink, type LinkState } from "../../app/actions/shops";

/*
 * Small pieces shared by the shop screens (B1–B5): picture tiles, item
 * thumbnails, the visibility tag and radio card, toggles and a tiny menu.
 */

/* ---------- Icons not in @repo/ui ---------- */

export function SlidersIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h10M18 7h2M4 17h2M10 17h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="7" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="17" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function GlobeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LinkChainIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PadlockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="11"
        width="14"
        height="9"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CopySmallIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="8"
        y="8"
        width="12"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DownloadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v11M7 11l5 5 5-5M5 20h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CameraOutlineIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** The four-point sparkle the design uses for the agent and "List something new". */
export function SparkleSolid({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
      <path
        d="M32 4c2 17 11 26 28 28-17 2-26 11-28 28-2-17-11-26-28-28 17-2 26-11 28-28Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ---------- Item thumbnails ---------- */

const toneBg: Record<ThumbTone, string> = {
  pink: "bg-pink-100",
  leaf: "bg-leaf-100",
  muted: "bg-surface-muted",
  lemon: "bg-primary-soft",
};

function ThumbArt({ kind, size, vaseFill }: { kind: ThumbKind; size: number; vaseFill?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 80 80", "aria-hidden": true } as const;
  switch (kind) {
    case "dress":
      return (
        <svg {...common}>
          <path
            d="M29 8h5c0 5 3 8 6 8s6-3 6-8h5l2 22 12 42H15l12-42Z"
            fill="var(--color-leaf-600)"
          />
        </svg>
      );
    case "sweater":
      return (
        <svg {...common}>
          <path
            d="M28 12c2 5 6 7 12 7s10-2 12-7l10 4 10 22-9 5-5-9v34H22V34l-5 9-9-5 10-22Z"
            fill="var(--color-pink-400)"
          />
        </svg>
      );
    case "tote":
      return (
        <svg {...common}>
          <path
            d="M29 34c0-18 22-18 22 0"
            fill="none"
            stroke="var(--color-leaf-900)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M16 32h48l-4 38H20Z" fill="var(--color-lemon-400)" />
        </svg>
      );
    case "jacket":
      return (
        <svg {...common}>
          <path d="M24 20h32l6 16H18Z" fill="var(--color-leaf-300)" />
          <rect x="18" y="36" width="44" height="28" rx="6" fill="var(--color-leaf-600)" />
        </svg>
      );
    case "vase":
      return (
        <svg {...common}>
          <path
            d="M32 20h16v6c0 6 12 12 12 24 0 12-9 20-20 20s-20-8-20-20c0-12 12-18 12-24Z"
            fill={vaseFill ?? "var(--color-leaf-600)"}
          />
        </svg>
      );
    case "pot":
      return (
        <svg {...common}>
          <rect x="6" y="38" width="12" height="7" rx="3.5" fill="var(--color-leaf-900)" />
          <rect x="62" y="38" width="12" height="7" rx="3.5" fill="var(--color-leaf-900)" />
          <rect x="14" y="32" width="52" height="32" rx="12" fill="var(--color-lemon-400)" />
          <path d="M16 34c0-8 11-12 24-12s24 4 24 12Z" fill="var(--color-lemon-500)" />
          <rect x="35" y="15" width="10" height="8" rx="4" fill="var(--color-leaf-900)" />
        </svg>
      );
    case "record":
      return (
        <svg {...common}>
          <circle cx="40" cy="40" r="28" fill="var(--color-leaf-900)" />
          <circle
            cx="40"
            cy="40"
            r="19"
            fill="none"
            stroke="var(--color-leaf-600)"
            strokeWidth="1.5"
          />
          <circle cx="40" cy="40" r="10" fill="var(--color-pink-400)" />
          <circle cx="40" cy="40" r="2.5" fill="var(--color-background)" />
        </svg>
      );
    case "mug":
      return (
        <svg {...common}>
          <path
            d="M52 34h5a8 8 0 0 1 0 16h-5"
            fill="none"
            stroke="var(--color-leaf-600)"
            strokeWidth="6"
          />
          <rect x="16" y="22" width="38" height="44" rx="9" fill="var(--color-leaf-600)" />
        </svg>
      );
  }
}

export function ItemThumb({
  kind,
  tone,
  className,
  size = 56,
  art = 36,
}: {
  kind: ThumbKind;
  tone: ThumbTone;
  className?: string;
  size?: number;
  art?: number;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md",
        toneBg[tone],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <ThumbArt kind={kind} size={art} />
    </span>
  );
}

/**
 * A listing's thumbnail: its cover photo, a plain placeholder for a real
 * listing with no photo yet, or the prototype's drawing.
 */
export function ListingThumb({
  listing,
  size = 56,
  art = 36,
}: {
  listing: Pick<ShopListing, "photo" | "thumb" | "tone" | "title">;
  size?: number;
  art?: number;
}) {
  if (listing.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- uploads and web photos of any size
      <img
        src={listing.photo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-md bg-surface-muted object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  if (listing.photo === null) {
    return (
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-md bg-surface-muted text-text-muted"
        style={{ width: size, height: size }}
      >
        <CameraOutlineIcon size={Math.round(art * 0.6)} />
      </span>
    );
  }
  return <ItemThumb kind={listing.thumb} tone={listing.tone} size={size} art={art} />;
}

/* ---------- Shop picture tile ---------- */

const shopToneBg: Record<Shop["tone"], string> = {
  pink: "bg-pink-100",
  leaf: "bg-leaf-100",
  muted: "bg-surface-muted",
};

export function ShopTile({
  shop,
  size = 64,
  art = 38,
  image,
  className,
}: {
  shop: Pick<Shop, "icon" | "tone">;
  size?: number;
  art?: number;
  /** An uploaded picture (object URL) replaces the icon. */
  image?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cover bg-center",
        shopToneBg[shop.tone],
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundImage: image ? `url(${image})` : undefined,
      }}
    >
      {!image &&
        (shop.icon === "record" ? (
          <svg width={art * 0.68} height={art * 0.68} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="var(--color-text)" strokeWidth="2" />
            <circle cx="12" cy="12" r="2.5" stroke="var(--color-text)" strokeWidth="2" />
          </svg>
        ) : shop.icon === "vase" ? (
          <ThumbArt kind="vase" size={art} vaseFill="var(--color-lemon-400)" />
        ) : (
          <ThumbArt kind="dress" size={art} />
        ))}
    </span>
  );
}

/* ---------- Visibility ---------- */

/** Spec E / Shop card: green tag with a dot, lemon tag, or grey tag. */
export function VisibilityTag({
  visibility,
  className,
}: {
  visibility: ShopVisibility;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        visibility === "public" && "bg-secondary-soft text-secondary",
        visibility === "link" && "bg-primary-soft text-text",
        visibility === "private" && "bg-surface-muted text-text-muted",
        className,
      )}
    >
      {visibility === "public" && (
        <span aria-hidden className="size-1.5 rounded-full bg-secondary" />
      )}
      {visibilityLabel[visibility]}
    </span>
  );
}

const visibilityCopy = {
  create: {
    private: "Private while you set things up",
    link: "Share it yourself, stay off the marketplace",
    public: "Also shown on the resell.store marketplace",
  },
  settings: {
    private: "Private. Nobody can open the link.",
    link: "Not shown on the marketplace",
    public: "Also shown on the resell.store marketplace",
  },
} as const;

const visibilityOptions: {
  value: ShopVisibility;
  title: string;
  icon: ReactNode;
  iconBg: string;
}[] = [
  { value: "private", title: "Only me", icon: <PadlockIcon />, iconBg: "bg-surface-muted" },
  {
    value: "link",
    title: "Anyone with the link",
    icon: <LinkChainIcon />,
    iconBg: "bg-primary-soft",
  },
  { value: "public", title: "Everyone", icon: <GlobeIcon />, iconBg: "bg-surface-muted" },
];

export function RadioDot({ checked }: { checked: boolean }) {
  return checked ? (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary"
    >
      <span className="size-2.5 rounded-full bg-surface" />
    </span>
  ) : (
    <span aria-hidden className="size-6 shrink-0 rounded-full border-2 border-border" />
  );
}

/**
 * Spec D / Visibility: one choice, the whole row is the tap target, the chosen
 * row has the filled green radio. Icons show on the create screen only.
 */
export function VisibilityPicker({
  value,
  onChange,
  variant,
  label,
  noPublic,
  className,
}: {
  value: ShopVisibility;
  onChange: (value: ShopVisibility) => void;
  variant: "create" | "settings";
  label: string;
  /** Leave out "Everyone" (the demo keeps new stores off the marketplace). */
  noPublic?: boolean;
  className?: string;
}) {
  const options = noPublic
    ? visibilityOptions.filter((option) => option.value !== "public")
    : visibilityOptions;
  const picker = (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex w-full flex-col rounded-lg border border-border bg-surface px-4 py-0.5",
        className,
      )}
    >
      {options.map((option, i) => {
        const checked = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const step =
                event.key === "ArrowDown" || event.key === "ArrowRight"
                  ? 1
                  : event.key === "ArrowUp" || event.key === "ArrowLeft"
                    ? -1
                    : 0;
              if (!step) return;
              event.preventDefault();
              const next = options[(i + step + options.length) % options.length]!;
              onChange(next.value);
              const group = event.currentTarget.parentElement;
              group
                ?.querySelectorAll<HTMLButtonElement>("[role=radio]")
                [(i + step + options.length) % options.length]?.focus();
            }}
            tabIndex={checked ? 0 : -1}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 py-3.5 text-left outline-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-secondary",
              i < options.length - 1 && "border-b border-border",
            )}
          >
            {variant === "create" && (
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-text",
                  option.iconBg,
                )}
              >
                {option.icon}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-semibold text-text">{option.title}</span>
              <span className="text-sm text-text-muted">
                {visibilityCopy[variant][option.value]}
              </span>
            </span>
            <RadioDot checked={checked} />
          </button>
        );
      })}
    </div>
  );
  if (!noPublic) return picker;
  return (
    <>
      {picker}
      <p className="px-1 text-sm text-text-muted">
        The marketplace is closed to new stores during the demo. Share your link instead.
      </p>
    </>
  );
}

/* ---------- Toggle switch ---------- */

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        checked ? "bg-secondary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "size-[22px] rounded-full bg-surface shadow-[0_1px_2px_rgb(20_38_29/0.2)] transition-transform duration-200",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

/* ---------- Buttons and pills ---------- */

/** Outlined pill button/link used all over these screens (h-44, bold 14). */
export const softPill =
  "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-surface px-5 text-sm font-bold text-text transition-colors outline-none select-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

/** Round 40px header button. */
export const roundButton =
  "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-text transition-colors outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-secondary";

export function Badge({
  tone,
  className,
  children,
}: {
  tone: "accent" | "lemon" | "leaf" | "muted";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        tone === "accent" && "bg-accent-soft text-accent-text",
        tone === "lemon" && "bg-primary-soft text-text",
        tone === "leaf" && "bg-secondary-soft text-secondary",
        tone === "muted" && "bg-surface-muted text-text",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Phone header under a tab: three slots, pushed apart like the design's flow bar. */
export function FlowBar({
  left,
  title,
  right,
  className,
}: {
  left: ReactNode;
  title: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] desk:hidden",
        className,
      )}
    >
      {left}
      {typeof title === "string" ? (
        <h1 className="truncate text-base font-bold">{title}</h1>
      ) : (
        title
      )}
      {right ?? <span className="size-10 shrink-0" />}
    </div>
  );
}

/* ---------- Tiny menu (dropdown) ---------- */

export function Menu({
  label,
  buttonClassName,
  align = "start",
  children,
  "aria-label": ariaLabel,
}: {
  label: ReactNode;
  buttonClassName?: string;
  align?: "start" | "center" | "end";
  children: (close: () => void) => ReactNode;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface pr-3.5 pl-4 text-sm font-bold text-text transition-colors outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-secondary",
          buttonClassName,
        )}
      >
        {label}
        <ChevronDownIcon size={16} strokeWidth={2.4} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-30 mt-2 flex min-w-[220px] flex-col rounded-md border border-border bg-surface p-1.5 shadow-[0_16px_32px_-16px_rgb(20_38_29/0.3)]",
            align === "start" && "left-0",
            align === "end" && "right-0",
            align === "center" && "left-1/2 -translate-x-1/2",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  selected,
  href,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { selected?: boolean; href?: string }) {
  const classes = cn(
    "flex h-11 w-full cursor-pointer items-center gap-2 rounded-sm px-3 text-left text-sm font-semibold whitespace-nowrap text-text transition-colors outline-none hover:bg-surface-muted focus-visible:bg-surface-muted",
    selected && "bg-primary-soft hover:bg-primary-soft",
    className,
  );
  if (href) {
    return (
      <Link
        href={href}
        role="menuitem"
        className={classes}
        onClick={props.onClick as unknown as ComponentProps<typeof Link>["onClick"]}
      >
        {children}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" className={classes} {...props}>
      {children}
    </button>
  );
}

/* ---------- Shop link check ---------- */

export type LinkCheck = "empty" | "checking" | LinkState;

/**
 * Asks the server whether a shop link is free, a moment after typing stops.
 * `currentSlug` is the shop being edited, whose own link always counts as free.
 */
export function useLinkCheck(
  link: string,
  { enabled, currentSlug }: { enabled: boolean; currentSlug?: string },
): LinkCheck {
  const [result, setResult] = useState<{ link: string; state: LinkState } | null>(null);
  const skip = !enabled || !link || link === currentSlug;
  useEffect(() => {
    if (skip) return;
    let stale = false;
    const timer = setTimeout(() => {
      checkShopLink(link, currentSlug)
        .then((state) => !stale && setResult({ link, state }))
        .catch(() => {});
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [link, currentSlug, skip]);
  if (!link) return "empty";
  if (link === currentSlug) return "free";
  return result?.link === link ? result.state : "checking";
}

/* ---------- Share ---------- */

/**
 * Copies the shop link, or explains why a private shop has nothing to share.
 * `url` is the real store address; the mock falls back to its domain.
 */
export function useShareShop() {
  const toast = useToast();
  return (shop: Pick<Shop, "domain" | "visibility" | "slug">, url?: string) => {
    if (shop.visibility === "private") {
      toast.add({ title: "Only you can open this shop for now." });
      return;
    }
    navigator.clipboard?.writeText(url ?? `https://${shop.domain}`).catch(() => {});
    // A real shop (the prototype passes no url): count the share for Stats
    if (url) trackShare({ shop: shop.slug });
    toast.add({ title: "Link copied. Go show it off." });
  };
}
