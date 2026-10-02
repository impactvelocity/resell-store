import type { ReactNode } from "react";

/* Product drawings from the Paper P-series artboards, on an 80×80 grid. */
export const moreArt = {
  /* P2 Store: for-sale grid */
  sunHat: (
    <>
      <ellipse cx="40" cy="54" rx="31" ry="9" fill="var(--color-lemon-400)" />
      <path d="M23 54c0-16 7-25 17-25s17 9 17 25Z" fill="var(--color-lemon-300)" />
      <path d="M23.5 50h33" fill="none" stroke="var(--color-pink-400)" strokeWidth="5" />
    </>
  ), // 170px in a 310×330 frame
  boots: (
    <>
      <path d="M24 12h20v30l18 9c4 2 6 5 6 9v4H24Z" fill="var(--color-leaf-900)" />
      <rect x="22" y="64" width="48" height="5" rx="2" fill="var(--color-lemon-500)" />
      <path d="M24 22h20" fill="none" stroke="var(--color-leaf-300)" strokeWidth="3" />
    </>
  ), // 170px in a 310×330 frame
  stripedTee: (
    <>
      <path d="M27 14 12 24l6 13 8-5v34h28V32l8 5 6-13-15-10c-2 4-6 7-13 7s-11-3-13-7Z" fill="#FFFFFF" />
      <path d="M26 40h28M26 49h28M26 58h28" fill="none" stroke="var(--color-leaf-600)" strokeWidth="3.5" />
    </>
  ), // 170px in a 310×330 frame
  scarf: (
    <>
      <rect x="18" y="22" width="44" height="36" rx="5" transform="rotate(-8 40 40)" fill="var(--color-pink-400)" />
      <circle cx="31" cy="35" r="4" fill="var(--color-lemon-400)" />
      <circle cx="47" cy="34" r="4" fill="var(--color-lemon-400)" />
      <circle cx="39" cy="47" r="4" fill="var(--color-lemon-400)" />
    </>
  ), // 170px in a 310×330 frame
  mugs: (
    <>
      <rect x="20" y="24" width="32" height="36" rx="7" fill="var(--color-leaf-600)" />
      <path d="M52 33h5a7 7 0 0 1 0 14h-5" fill="none" stroke="var(--color-leaf-600)" strokeWidth="5" />
      <path d="M27 33h18" fill="none" stroke="var(--color-leaf-300)" strokeWidth="3" strokeLinecap="round" />
    </>
  ), // 170px in a 310×330 frame

  /* P2 Store: "Went to new homes" sold row */
  budVase: (
    <>
      <path d="M40 22V8" fill="none" stroke="var(--color-leaf-900)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="8" r="5" fill="var(--color-pink-400)" />
      <path d="M32 20h16v6c0 6 12 12 12 24 0 12-9 20-20 20s-20-8-20-20c0-12 12-18 12-24Z" fill="var(--color-leaf-600)" />
    </>
  ), // 110px in a 243×210 frame
  beret: (
    <>
      <ellipse cx="40" cy="46" rx="28" ry="17" fill="var(--color-berry-500)" />
      <path d="M40 29v-8" fill="none" stroke="var(--color-leaf-900)" strokeWidth="4" strokeLinecap="round" />
    </>
  ), // 110px in a 243×210 frame
  picnicBlanket: (
    <>
      <rect x="14" y="24" width="52" height="34" rx="6" fill="var(--color-pink-400)" />
      <path d="M14 35h52M14 47h52" fill="none" stroke="var(--color-pink-600)" strokeWidth="4" />
    </>
  ), // 110px in a 243×210 frame
  midiSkirt: (
    <>
      <path d="M27 16h26l11 50H16Z" fill="var(--color-leaf-300)" />
      <path d="M27 16h26" fill="none" stroke="var(--color-leaf-900)" strokeWidth="5" />
      <path d="M40 22v44" fill="none" stroke="var(--color-leaf-600)" strokeWidth="2" />
    </>
  ), // 110px in a 243×210 frame
  candles: (
    <>
      <rect x="32" y="28" width="16" height="30" rx="3" fill="var(--color-lemon-400)" />
      <path d="M40 14c4 5 4 9 0 12-4-3-4-7 0-12Z" fill="var(--color-berry-500)" />
      <rect x="22" y="58" width="36" height="7" rx="3.5" fill="var(--color-leaf-900)" />
    </>
  ), // 110px in a 243×210 frame

  /* P3 Listing: "More from Second Shutter" */
  lens: (
    <>
      <circle cx="40" cy="40" r="27" fill="var(--color-leaf-900)" />
      <circle cx="40" cy="40" r="18" fill="var(--color-leaf-300)" />
      <circle cx="40" cy="40" r="8" fill="var(--color-leaf-900)" />
      <circle cx="47" cy="33" r="3" fill="#FFFFFF" />
    </>
  ), // 170px in a 310×330 frame
  rangefinder: (
    <>
      <rect x="10" y="28" width="60" height="34" rx="6" fill="var(--color-leaf-600)" />
      <rect x="10" y="22" width="60" height="10" rx="4" fill="var(--color-leaf-900)" />
      <circle cx="44" cy="46" r="11" fill="var(--color-leaf-900)" />
      <circle cx="44" cy="46" r="5" fill="var(--color-leaf-300)" />
      <rect x="16" y="36" width="12" height="8" rx="2" fill="#FFFFFF" />
    </>
  ), // 170px in a 310×330 frame
  lightMeter: (
    <>
      <rect x="24" y="12" width="32" height="56" rx="8" fill="var(--color-leaf-900)" />
      <circle cx="40" cy="30" r="10" fill="#FFFFFF" />
      <path d="M40 30l5-6" fill="none" stroke="var(--color-berry-500)" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="31" y="48" width="18" height="10" rx="3" fill="var(--color-lemon-400)" />
    </>
  ), // 170px in a 310×330 frame
  filmRolls: (
    <>
      <rect x="12" y="26" width="16" height="36" rx="4" fill="var(--color-lemon-400)" />
      <rect x="32" y="26" width="16" height="36" rx="4" fill="var(--color-leaf-600)" />
      <rect x="52" y="26" width="16" height="36" rx="4" fill="var(--color-pink-400)" />
      <path d="M17 26v-6h6v6M37 26v-6h6v6M57 26v-6h6v6" fill="var(--color-leaf-900)" />
    </>
  ), // 170px in a 310×330 frame

  /* P8 Buyer account: orders */
  apron: (
    <>
      <path d="M28 18h24l6 14v34H22V32Z" fill="var(--color-lemon-400)" />
      <path d="M28 18c0-6 24-6 24 0" fill="none" stroke="var(--color-leaf-900)" strokeWidth="3" />
      <rect x="31" y="42" width="18" height="12" rx="2" fill="var(--color-lemon-500)" />
    </>
  ), // 46px in a 72×72 frame

  /* P3 Listing: gallery thumbnails (thumb 1, "front", is the existing camera) */
  cameraTop: (
    <>
      <rect x="10" y="34" width="60" height="18" rx="5" fill="var(--color-leaf-900)" />
      <circle cx="24" cy="30" r="7" fill="var(--color-leaf-600)" />
      <rect x="36" y="24" width="14" height="10" rx="2" fill="var(--color-leaf-900)" />
      <circle cx="60" cy="31" r="4" fill="var(--color-lemon-400)" />
    </>
  ), // 52px in an 88×88 frame
  cameraBack: (
    <>
      <rect x="12" y="24" width="56" height="38" rx="8" fill="var(--color-leaf-900)" />
      <rect x="30" y="30" width="20" height="12" rx="2" fill="var(--color-leaf-300)" />
    </>
  ), // 52px in an 88×88 frame
  cameraLens: (
    <>
      <circle cx="40" cy="40" r="26" fill="var(--color-leaf-900)" />
      <circle cx="40" cy="40" r="17" fill="var(--color-leaf-300)" />
      <circle cx="40" cy="40" r="8" fill="var(--color-leaf-900)" />
    </>
  ), // 52px in an 88×88 frame
  /* Two tall rounded bars, lemon + leaf, side by side; reads as an open case (listing "comes with strap, lens cap, case"). */
  cameraCase: (
    <>
      <rect x="20" y="20" width="18" height="42" rx="5" fill="var(--color-lemon-400)" />
      <rect x="42" y="20" width="18" height="42" rx="5" fill="var(--color-leaf-600)" />
    </>
  ), // 52px in an 88×88 frame
  cameraSample: (
    <>
      <rect x="14" y="20" width="52" height="40" rx="3" fill="#FFFFFF" />
      <path d="M18 54l14-16 10 10 8-7 12 13Z" fill="var(--color-leaf-300)" />
      <circle cx="52" cy="31" r="5" fill="var(--color-lemon-400)" />
    </>
  ), // 52px in an 88×88 frame
} satisfies Record<string, ReactNode>;
