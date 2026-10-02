import type { SVGProps } from "react";
import type { PhotoArt } from "../../lib/mock-listing-later";

/*
 * Stand-in pictures of the dutch oven, drawn like the Paper file draws them.
 * Colours come from the theme ramps.
 */

type ArtProps = SVGProps<SVGSVGElement> & { size?: number };

export function PotArt({ size = 96, ...props }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden {...props}>
      <rect x="5" y="42" width="12" height="7" rx="3.5" fill="var(--color-lemon-500)" />
      <rect x="63" y="42" width="12" height="7" rx="3.5" fill="var(--color-lemon-500)" />
      <path d="M14 40h52v18c0 6-5 10-11 10H25c-6 0-11-4-11-10Z" fill="var(--color-lemon-400)" />
      <path d="M16 38c0-9 11-13 24-13s24 4 24 13Z" fill="var(--color-lemon-500)" />
      <circle cx="40" cy="22" r="4.5" fill="var(--color-leaf-900)" />
    </svg>
  );
}

/** The pot from above: the maker's second photo. */
export function PotTopArt({ size = 96, ...props }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden {...props}>
      <rect x="4" y="34" width="12" height="12" rx="5" fill="var(--color-lemon-500)" />
      <rect x="64" y="34" width="12" height="12" rx="5" fill="var(--color-lemon-500)" />
      <circle cx="40" cy="40" r="27" fill="var(--color-lemon-400)" />
      <circle cx="40" cy="40" r="20" fill="var(--color-background)" />
    </svg>
  );
}

/** Looking into the pot: cream enamel inside a yellow rim. */
function InsideArt({ size = 96, ...props }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden {...props}>
      <ellipse cx="40" cy="42" rx="30" ry="22" fill="var(--color-lemon-500)" />
      <ellipse cx="40" cy="40" rx="26" ry="18" fill="var(--color-lemon-100)" />
      <ellipse cx="40" cy="46" rx="18" ry="9" fill="var(--color-surface-muted)" />
      <rect x="4" y="38" width="10" height="7" rx="3.5" fill="var(--color-lemon-500)" />
      <rect x="66" y="38" width="10" height="7" rx="3.5" fill="var(--color-lemon-500)" />
    </svg>
  );
}

/** The base, with the light stove marks. */
function BaseArt({ size = 96, ...props }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden {...props}>
      <circle cx="40" cy="40" r="28" fill="var(--color-lemon-500)" />
      <circle cx="40" cy="40" r="21" fill="var(--color-lemon-300)" />
      <path
        d="M30 34c4-2 8-2 12 0M36 46c5 1 9 0 13-3M27 42c2 1 4 1 6 0"
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

/** Close-up of a handle. */
function HandlesArt({ size = 96, ...props }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden {...props}>
      <path d="M8 24h40v40H8Z" fill="var(--color-lemon-400)" />
      <rect x="44" y="36" width="26" height="14" rx="7" fill="var(--color-lemon-500)" />
      <path d="M8 20h44v6H8Z" fill="var(--color-lemon-500)" />
    </svg>
  );
}

export function PhotoArtwork({ art, size }: { art: PhotoArt; size: number }) {
  switch (art) {
    case "pot":
    case "video":
      return <PotArt size={size} />;
    case "pot-top":
      return <PotTopArt size={size} />;
    case "inside":
      return <InsideArt size={size} />;
    case "base":
      return <BaseArt size={size} />;
    case "handles":
      return <HandlesArt size={size} />;
  }
}

export function QrArt({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 29 29" aria-hidden>
      <path
        fillRule="evenodd"
        d="M1 1h9v9H1zM3 3v5h5V3zM19 1h9v9h-9zM21 3v5h5V3zM1 19h9v9H1zM3 21v5h5v-5z"
        fill="var(--color-text)"
      />
      <path
        d="M4.5 4.5h2v2h-2zM22.5 4.5h2v2h-2zM4.5 22.5h2v2h-2zM12 1h2v2h-2zM15 3h2v3h-2zM12 6h2v4h-2zM12 12h3v2h-3zM1 12h3v2H1zM6 13h4v2H6zM1 15h2v2H1zM16 12h2v4h-2zM20 12h4v2h-4zM26 12h2v4h-2zM12 16h2v3h-2zM19 16h3v2h-3zM14 20h3v2h-3zM12 23h2v5h-2zM16 24h2v2h-2zM19 20h2v4h-2zM23 19h5v2h-5zM22 23h3v2h-3zM26 24h2v4h-2zM19 26h5v2h-5z"
        fill="var(--color-text)"
      />
    </svg>
  );
}

export function PlayGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
    </svg>
  );
}

/** Small link glyph for the "From the web" chip, 2.4 stroke like the design. */
export function WebLinkGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
