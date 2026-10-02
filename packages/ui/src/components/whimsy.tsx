import type { SVGProps } from "react";

/*
 * Whimsy: little garden marks and product illustrations.
 * Use sparingly — one or two per screen. If a screen feels busy, the whimsy goes first.
 */

type MarkProps = SVGProps<SVGSVGElement> & { size?: number };

function Mark({
  size = 72,
  viewBox = "0 0 64 64",
  children,
  ...props
}: MarkProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      aria-hidden
      focusable={false}
      {...props}
    >
      {children}
    </svg>
  );
}

export function SliceMark(props: MarkProps) {
  return (
    <Mark viewBox="0 0 44 44" {...props}>
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
    </Mark>
  );
}

export function FlowerMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <g fill="var(--color-pink-400)">
        <circle cx="32" cy="18" r="11" />
        <circle cx="45.3" cy="27.7" r="11" />
        <circle cx="40.2" cy="43.3" r="11" />
        <circle cx="23.8" cy="43.3" r="11" />
        <circle cx="18.7" cy="27.7" r="11" />
      </g>
      <circle cx="32" cy="32" r="8" fill="var(--color-lemon-400)" />
    </Mark>
  );
}

export function LeafMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <g transform="rotate(35 32 32)">
        <path
          d="M32 58C17 46 15 26 32 6c17 20 15 40 0 52Z"
          fill="var(--color-leaf-300)"
        />
        <path
          d="M32 58V20"
          stroke="var(--color-leaf-900)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </Mark>
  );
}

export function SparkleMark({ size = 56, ...props }: MarkProps) {
  return (
    <Mark size={size} {...props}>
      <path
        d="M32 4c2 17 11 26 28 28-17 2-26 11-28 28-2-17-11-26-28-28 17-2 26-11 28-28Z"
        fill="var(--color-leaf-900)"
      />
    </Mark>
  );
}

export function BerriesMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path
        d="M50 8 22 38M50 8l-8 36M50 8 34 22"
        stroke="var(--color-leaf-900)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <g fill="var(--color-berry-500)">
        <circle cx="20" cy="42" r="10" />
        <circle cx="43" cy="48" r="10" />
        <circle cx="31" cy="24" r="8" />
      </g>
    </Mark>
  );
}

export function WedgeMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <g transform="rotate(-18 32 32)">
        <path d="M6 24a26 26 0 0 0 52 0Z" fill="var(--color-pink-400)" />
        <path d="M11 24a21 21 0 0 0 42 0Z" fill="#fff" />
        <path d="M14 24a18 18 0 0 0 36 0Z" fill="var(--color-lemon-300)" />
        <path
          d="M32 24v17M32 24 19.5 36.5M32 24l12.5 12.5"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </Mark>
  );
}

/* Product illustrations — placeholders for item photos */

export function DressIllustration({ size = 136, ...props }: MarkProps) {
  return (
    <Mark size={size} viewBox="0 0 80 80" {...props}>
      <path
        d="M29 8h5c0 5 3 8 6 8s6-3 6-8h5l2 22 12 42H15l12-42Z"
        fill="var(--color-leaf-600)"
      />
      <path
        d="M27 30h26"
        stroke="var(--color-lemon-400)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Mark>
  );
}

export function SweaterIllustration({ size = 144, ...props }: MarkProps) {
  return (
    <Mark size={size} viewBox="0 0 80 80" {...props}>
      <path
        d="M28 12c2 5 6 7 12 7s10-2 12-7l10 4 10 22-9 5-5-9v34H22V34l-5 9-9-5 10-22Z"
        fill="var(--color-pink-400)"
      />
      <path
        d="M22 60h36"
        stroke="var(--color-pink-600)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Mark>
  );
}

export function VaseIllustration({ size = 136, ...props }: MarkProps) {
  return (
    <Mark size={size} viewBox="0 0 80 80" {...props}>
      <path
        d="M40 22V8"
        stroke="var(--color-leaf-900)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="40" cy="8" r="5" fill="var(--color-pink-400)" />
      <path
        d="M32 20h16v6c0 6 12 12 12 24 0 12-9 20-20 20s-20-8-20-20c0-12 12-18 12-24Z"
        fill="var(--color-leaf-600)"
      />
    </Mark>
  );
}
