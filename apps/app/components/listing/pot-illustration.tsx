import type { SVGProps } from "react";

/** The yellow dutch oven from the Paper file, standing in for the person's photo. */
export function PotIllustration({
  size = 80,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden
      focusable={false}
      {...props}
    >
      <rect x="5" y="42" width="12" height="7" rx="3.5" fill="var(--color-lemon-500)" />
      <rect x="63" y="42" width="12" height="7" rx="3.5" fill="var(--color-lemon-500)" />
      <path d="M14 40h52v18c0 6-5 10-11 10H25c-6 0-11-4-11-10Z" fill="var(--color-lemon-400)" />
      <path d="M16 38c0-9 11-13 24-13s24 4 24 13Z" fill="var(--color-lemon-500)" />
      <circle cx="40" cy="22" r="4.5" fill="var(--color-leaf-900)" />
    </svg>
  );
}
