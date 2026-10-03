import type { ReactNode } from "react";
import { FlowerMark, LeafMark, SliceMark, SparkleMark } from "@repo/ui/whimsy";
import { PotIllustration, ToteIllustration } from "../home/illustrations";

/*
 * Little scenes for empty states, each drawn on one 120px square so they scale
 * with whatever tile holds them. Built from the garden marks and item drawings
 * so they sit with the rest of the app. Pick by name: <EmptyState art="chart" />.
 */

export const emptyArtPresets = [
  "garden",
  "items",
  "messages",
  "chart",
  "payout",
  "seedling",
] as const;

export type EmptyArtPreset = (typeof emptyArtPresets)[number];

export function isEmptyArtPreset(value: unknown): value is EmptyArtPreset {
  return typeof value === "string" && (emptyArtPresets as readonly string[]).includes(value);
}

function Scene({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden
      focusable={false}
      className={className}
      overflow="visible"
    >
      {children}
    </svg>
  );
}

/** Flower, leaf and a sparkle. The all-purpose "nothing yet". */
function Garden() {
  return (
    <>
      <FlowerMark size={72} x={0} y={0} />
      <g transform="rotate(12 92 92)">
        <LeafMark size={56} x={64} y={64} />
      </g>
      <SparkleMark size={34} x={82} y={4} />
    </>
  );
}

/** A pot and a tote: things waiting to be listed. */
function Items() {
  return (
    <>
      <g transform="rotate(8 86 46)">
        <ToteIllustration size={68} x={52} y={8} />
      </g>
      <PotIllustration size={84} x={0} y={36} />
      <SparkleMark size={22} x={14} y={10} />
    </>
  );
}

/** Two speech bubbles: a question and an offer. */
function Messages() {
  return (
    <>
      <path
        d="M30 16h28a22 22 0 0 1 0 44H32l-14 10 3-13A22 22 0 0 1 30 16Z"
        fill="var(--color-leaf-600)"
      />
      <g fill="var(--color-lemon-400)">
        <circle cx="32" cy="38" r="4" />
        <circle cx="45" cy="38" r="4" />
        <circle cx="58" cy="38" r="4" />
      </g>
      <path
        d="M90 54H62a22 22 0 0 0 0 44h26l14 10-3-13a22 22 0 0 0-9-41Z"
        fill="var(--color-pink-400)"
      />
      <SliceMark size={30} x={61} y={61} />
      <SparkleMark size={20} x={94} y={14} />
    </>
  );
}

/** Three bars growing, a flower on the tallest. */
function Chart() {
  return (
    <>
      <rect x="20" y="70" width="22" height="34" rx="7" fill="var(--color-leaf-300)" />
      <rect x="49" y="52" width="22" height="52" rx="7" fill="var(--color-pink-400)" />
      <rect x="78" y="34" width="22" height="70" rx="7" fill="var(--color-leaf-600)" />
      <path
        d="M10 104h100"
        stroke="var(--color-leaf-900)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <FlowerMark size={36} x={71} y={2} />
      <SparkleMark size={18} x={22} y={34} />
    </>
  );
}

function Coin({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <ellipse cx={cx} cy={cy + 5} rx="26" ry="9" fill="var(--color-lemon-500)" />
      <ellipse cx={cx} cy={cy} rx="26" ry="9" fill="var(--color-lemon-400)" />
      <ellipse
        cx={cx}
        cy={cy}
        rx="17"
        ry="5"
        fill="none"
        stroke="var(--color-lemon-300)"
        strokeWidth="2"
      />
    </>
  );
}

/** Two stacks of lemon coins and a leaf. Money, eventually. */
function Payout() {
  return (
    <>
      <g transform="rotate(-14 94 84)">
        <LeafMark size={50} x={70} y={54} />
      </g>
      {[0, 1, 2, 3].map((i) => (
        <Coin key={`a${i}`} cx={42} cy={96 - i * 12} />
      ))}
      {[0, 1].map((i) => (
        <Coin key={`b${i}`} cx={82} cy={100 - i * 12} />
      ))}
      <SparkleMark size={22} x={84} y={14} />
    </>
  );
}

/** A sprout in a pot: planted, coming up soon. */
function Seedling() {
  return (
    <>
      <path
        d="M60 74V42"
        stroke="var(--color-leaf-900)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M60 52C46 54 34 46 32 30c16-2 27 7 28 22Z" fill="var(--color-leaf-300)" />
      <path d="M60 46c2-16 14-26 30-24-1 16-13 25-30 24Z" fill="var(--color-leaf-600)" />
      <path d="M36 80h48l-6 30H42Z" fill="var(--color-pink-400)" />
      <rect x="31" y="70" width="58" height="12" rx="6" fill="var(--color-pink-600)" />
      <SparkleMark size={22} x={90} y={6} />
      <SparkleMark size={14} x={14} y={56} />
    </>
  );
}

const scenes: Record<EmptyArtPreset, () => ReactNode> = {
  garden: Garden,
  items: Items,
  messages: Messages,
  chart: Chart,
  payout: Payout,
  seedling: Seedling,
};

/** One preset scene. Sized by the caller (it fills its box). */
export function EmptyArt({
  preset = "garden",
  className,
}: {
  preset?: EmptyArtPreset;
  className?: string;
}) {
  const Drawing = scenes[preset];
  return (
    <Scene className={className}>
      <Drawing />
    </Scene>
  );
}
