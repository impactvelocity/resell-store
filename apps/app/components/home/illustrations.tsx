import type { SVGProps } from "react";
import {
  DressIllustration,
  SweaterIllustration,
  VaseIllustration,
} from "@repo/ui/whimsy";
import type { ItemIllustration } from "../../lib/mock-home";
import type { Shop } from "../../lib/mock";

/*
 * Small product drawings from the Home artboards that aren't in @repo/ui/whimsy.
 * All on the 80px grid the whimsy illustrations use.
 */

type Props = SVGProps<SVGSVGElement> & { size?: number };

function Svg({
  size = 116,
  viewBox = "0 0 80 80",
  children,
  ...props
}: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      aria-hidden
      focusable={false}
      className="shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ToteIllustration(props: Props) {
  return (
    <Svg {...props}>
      <path
        d="M29 34c0-18 22-18 22 0"
        fill="none"
        stroke="var(--color-leaf-900)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M16 32h48l-4 38H20Z" fill="var(--color-lemon-400)" />
      <circle cx="40" cy="51" r="7" fill="var(--color-leaf-600)" />
    </Svg>
  );
}

export function LampIllustration(props: Props) {
  return (
    <Svg {...props}>
      <path d="M26 14h28l10 28H16Z" fill="var(--color-lemon-400)" />
      <path
        d="M40 42v24M28 68h24"
        stroke="var(--color-leaf-900)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BlanketIllustration(props: Props) {
  return (
    <Svg {...props}>
      <rect x="14" y="20" width="52" height="40" rx="8" fill="var(--color-pink-400)" />
      <path
        d="M14 34h52M14 46h52"
        stroke="var(--color-pink-600)"
        strokeWidth="3"
      />
    </Svg>
  );
}

export function RecordIllustration(props: Props) {
  return (
    <Svg {...props}>
      <circle cx="40" cy="40" r="30" fill="var(--color-leaf-900)" />
      <circle cx="40" cy="40" r="22" fill="none" stroke="#fff" strokeOpacity="0.15" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="11" fill="var(--color-pink-400)" />
      <circle cx="40" cy="40" r="2.5" fill="var(--color-leaf-900)" />
    </Svg>
  );
}

export function PotIllustration(props: Props) {
  return (
    <Svg {...props}>
      <rect x="34" y="18" width="12" height="6" rx="3" fill="var(--color-leaf-900)" />
      <path d="M14 26h52v4H14Z" fill="var(--color-berry-500)" />
      <path d="M8 36h8M64 36h8" stroke="var(--color-leaf-900)" strokeWidth="4" strokeLinecap="round" />
      <path d="M16 30h48v24c0 8-6 12-12 12H28c-6 0-12-4-12-12Z" fill="var(--color-berry-500)" />
    </Svg>
  );
}

/** The pear-shaped vase used as the Home and kitchen shop picture. */
function PearVase(props: Props) {
  return (
    <Svg {...props}>
      <path
        d="M32 20h16v6c0 6 12 12 12 24 0 12-9 20-20 20s-20-8-20-20c0-12 12-18 12-24Z"
        fill="var(--color-lemon-400)"
      />
    </Svg>
  );
}

/** The dress silhouette without the belt, as on the shop tiles. */
function PlainDress(props: Props) {
  return (
    <Svg {...props}>
      <path
        d="M29 8h5c0 5 3 8 6 8s6-3 6-8h5l2 22 12 42H15l12-42Z"
        fill="var(--color-leaf-600)"
      />
    </Svg>
  );
}

export function ItemArt({
  illustration,
  size,
}: {
  illustration: ItemIllustration;
  size?: number;
}) {
  switch (illustration) {
    case "sweater":
      return <SweaterIllustration size={size ?? 124} />;
    case "dress":
      return <DressIllustration size={size ?? 116} />;
    case "vase":
      return <VaseIllustration size={size ?? 116} />;
    case "tote":
      return <ToteIllustration size={size ?? 116} />;
    case "lamp":
      return <LampIllustration size={size ?? 112} />;
    case "blanket":
      return <BlanketIllustration size={size ?? 116} />;
    case "record":
      return <RecordIllustration size={size ?? 112} />;
    case "dutch-oven":
      return <PotIllustration size={size ?? 116} />;
  }
}

const shopTileTones: Record<Shop["tone"], string> = {
  pink: "bg-pink-100",
  leaf: "bg-leaf-100",
  muted: "bg-surface-muted",
};

/** 48px picture tile for a shop (spec E, shop card). */
export function ShopTile({ shop }: { shop: Shop }) {
  return (
    <span
      className={`flex size-12 shrink-0 items-center justify-center rounded-md ${shopTileTones[shop.tone]}`}
    >
      {shop.icon === "dress" && <PlainDress size={28} />}
      {shop.icon === "vase" && <PearVase size={28} />}
      {shop.icon === "record" && (
        <svg
          width={26}
          height={26}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text)"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      )}
    </span>
  );
}
