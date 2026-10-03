"use client";

import { motion, MotionConfig } from "motion/react";

/** A price tag on a string that reads "404", swinging gently from its pin. */
export function SwingTag() {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        aria-hidden
        className="relative flex w-[220px] flex-col items-center md:w-[260px]"
        style={{ transformOrigin: "50% 0%" }}
        initial={{ rotate: -40, opacity: 0 }}
        animate={{ rotate: [-40, 12, -7, 4, -2, 0], opacity: 1 }}
        transition={{ duration: 2.2, ease: "easeOut" }}
      >
        {/* Pin and string */}
        <span className="size-4 rounded-full bg-leaf-900" />
        <span className="h-14 w-[3px] rounded-full bg-leaf-900/70 md:h-16" />
        <motion.div
          className="w-full"
          style={{ transformOrigin: "50% 0%" }}
          animate={{ rotate: [0, 3, 0, -3, 0] }}
          transition={{ duration: 5, delay: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 260 300" className="w-full drop-shadow-[0_18px_30px_rgb(20_38_29/0.18)]">
            <path
              d="M86 0h88a14 14 0 0 1 10 4l62 62a14 14 0 0 1 4 10v204a20 20 0 0 1-20 20H40a20 20 0 0 1-20-20V76a14 14 0 0 1 4-10L76 4a14 14 0 0 1 10-4Z"
              fill="var(--color-lemon-400)"
            />
            <circle cx="130" cy="44" r="13" fill="var(--color-background)" />
            <circle cx="130" cy="44" r="13" fill="none" stroke="var(--color-leaf-900)" strokeWidth="3" />
            <text
              x="130"
              y="178"
              textAnchor="middle"
              fontSize="88"
              fontWeight="800"
              letterSpacing="-4"
              fill="var(--color-leaf-900)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              404
            </text>
            <path
              d="M64 214h132"
              stroke="var(--color-leaf-900)"
              strokeWidth="3"
              strokeDasharray="2 9"
              strokeLinecap="round"
            />
            <text
              x="130"
              y="254"
              textAnchor="middle"
              fontSize="22"
              fontWeight="700"
              fill="var(--color-leaf-900)"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Page not found
            </text>
          </svg>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
