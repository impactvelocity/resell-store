"use client";

import type { ReactNode } from "react";
import { motion, MotionConfig } from "motion/react";

/*
 * Landing page motion. Everything plays once, as it first scrolls into view.
 * MotionConfig honours the visitor's reduced-motion setting: movement is
 * dropped and things just fade in.
 */

const spring = { type: "spring", stiffness: 150, damping: 20, mass: 0.9 } as const;
const bouncy = { type: "spring", stiffness: 320, damping: 13 } as const;
const inView = { once: true, margin: "0px 0px -12% 0px" } as const;

export function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Rises into place. `scale` below 1 grows it in as well. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  scale = 1,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  scale?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={inView}
      transition={{ ...spring, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Springs in from small with a tilt and a little overshoot. For stickers, marks
 * and pills. `immediate` plays it straight away instead of waiting for the scroll.
 */
export function Pop({
  children,
  className,
  delay = 0,
  rotate = -14,
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  rotate?: number;
  immediate?: boolean;
}) {
  const shown = { opacity: 1, scale: 1, rotate: 0 };
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.3, rotate }}
      {...(immediate ? { animate: shown } : { whileInView: shown, viewport: inView })}
      transition={{ ...bouncy, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Bobs and sways gently, forever. For the doodles. */
export function Float({
  children,
  className,
  distance = 8,
  tilt = 6,
  duration = 4.5,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  tilt?: number;
  duration?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -distance, 0], rotate: [0, tilt, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
