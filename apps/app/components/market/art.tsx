import type { ReactNode } from "react";
import { moreArt } from "./art-more";

/* Product drawings from the P1 Marketplace artboard, on an 80×80 grid. */
const baseArt = {
  dress: (
    <>
      <path d="M29 8h5c0 5 3 8 6 8s6-3 6-8h5l2 22 12 42H15l12-42Z" fill="var(--color-leaf-600)" />
      <path d="M27 30h26" fill="none" stroke="var(--color-lemon-400)" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  camera: (
    <>
      <rect x="12" y="26" width="56" height="38" rx="8" fill="var(--color-leaf-900)" />
      <rect x="28" y="18" width="18" height="10" rx="3" fill="var(--color-leaf-900)" />
      <circle cx="40" cy="45" r="13" fill="var(--color-leaf-300)" />
      <circle cx="40" cy="45" r="6" fill="var(--color-leaf-900)" />
      <circle cx="59" cy="34" r="3" fill="var(--color-lemon-400)" />
    </>
  ),
  sweater: (
    <>
      <path d="M28 12c2 5 6 7 12 7s10-2 12-7l10 4 10 22-9 5-5-9v34H22V34l-5 9-9-5 10-22Z" fill="var(--color-pink-400)" />
      <path d="M22 60h36" fill="none" stroke="var(--color-pink-600)" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  record: (
    <>
      <circle cx="40" cy="40" r="30" fill="var(--color-leaf-900)" />
      <circle cx="40" cy="40" r="20" fill="none" stroke="#FFFFFF40" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="11" fill="var(--color-pink-400)" />
      <circle cx="40" cy="40" r="2.5" fill="#FFFFFF" />
    </>
  ),
  lamp: (
    <>
      <path d="M28 14h24l8 24H20Z" fill="var(--color-lemon-400)" />
      <rect x="38" y="38" width="4" height="24" fill="var(--color-leaf-900)" />
      <rect x="26" y="62" width="28" height="6" rx="3" fill="var(--color-leaf-900)" />
    </>
  ),
  card: (
    <>
      <rect x="22" y="10" width="36" height="60" rx="5" fill="var(--color-lemon-400)" />
      <rect x="27" y="16" width="26" height="24" rx="3" fill="#FFFFFF" />
      <circle cx="40" cy="28" r="7" fill="var(--color-pink-400)" />
      <path d="M28 48h24M28 56h16" fill="none" stroke="var(--color-leaf-900)" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  tote: (
    <>
      <path d="M29 34c0-18 22-18 22 0" fill="none" stroke="var(--color-leaf-900)" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 32h48l-4 38H20Z" fill="var(--color-lemon-400)" />
      <circle cx="40" cy="51" r="7" fill="var(--color-leaf-600)" />
    </>
  ),
  chair: (
    <>
      <rect x="24" y="12" width="32" height="30" rx="6" fill="var(--color-leaf-600)" />
      <rect x="18" y="42" width="44" height="10" rx="4" fill="var(--color-leaf-600)" />
      <path d="M24 52v18M56 52v18" fill="none" stroke="var(--color-leaf-900)" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
} satisfies Record<string, ReactNode>;

const art = { ...baseArt, ...moreArt };

export type ArtKey = keyof typeof art;

/** A flat product drawing standing in for a listing photo. */
export function ItemArt({
  art: key,
  size = 170,
  className,
}: {
  art: ArtKey;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden
      focusable={false}
      className={className}
      style={{ flexShrink: 0 }}
    >
      {art[key]}
    </svg>
  );
}
