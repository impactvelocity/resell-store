import type { ComponentProps, SVGProps } from "react";
import { cn } from "../lib/utils";

/** The lemon-slice mark. */
export function LemonMark({
  size = 40,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden
      focusable={false}
      {...props}
    >
      <circle cx="22" cy="22" r="22" fill="var(--color-lemon-400)" />
      <circle cx="22" cy="22" r="18" fill="#fff" />
      <circle cx="22" cy="22" r="15.5" fill="var(--color-lemon-300)" />
      <path
        d="M22 6.5v31M6.5 22h31M11 11l22 22M33 11 11 33"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="22" cy="22" r="2.5" fill="#fff" />
    </svg>
  );
}

const wordmarkSizes = {
  sm: { mark: 28, text: "text-xl" },
  md: { mark: 40, text: "text-2xl" },
} as const;

/** Lemon mark + "resell.store" set in the display face. */
export function Wordmark({
  size = "md",
  className,
  ...props
}: ComponentProps<"span"> & { size?: keyof typeof wordmarkSizes }) {
  const s = wordmarkSizes[size];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 font-display font-extrabold tracking-tight text-text",
        s.text,
        className,
      )}
      {...props}
    >
      <LemonMark size={s.mark} />
      resell.store
    </span>
  );
}
