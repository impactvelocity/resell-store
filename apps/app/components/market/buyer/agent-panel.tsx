"use client";

import { useState } from "react";
import { SparkleIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import type { TimelineStep } from "../../../lib/mock-buyer";

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

/**
 * "Let your agent finish": give Claude a ceiling and it negotiates with the
 * seller, then asks before paying. Handing off is local state in the prototype.
 */
export function HandOff({
  owner,
  defaultCeiling,
  handedOff,
  onHandOff,
  onTakeBack,
}: {
  owner: string;
  defaultCeiling: number;
  handedOff: number | null;
  onHandOff: (ceiling: number) => void;
  onTakeBack: () => void;
}) {
  const [value, setValue] = useState(String(defaultCeiling));
  const ceiling = Number(value);
  const valid = Number.isFinite(ceiling) && ceiling > 0;

  if (handedOff !== null) {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center gap-2">
          <SparkleIcon size={16} className="text-pink-400" />
          <h2 className="font-display text-xl font-extrabold tracking-tight">Claude has it</h2>
        </div>
        <p className="text-sm text-public-text-muted">
          It&apos;s talking to {owner} now and won&apos;t go past ${handedOff}. You&apos;ll get a
          message here before anything is paid.
        </p>
        <div className="flex h-[52px] items-center gap-3 rounded-[14px] bg-leaf-100 px-[18px] text-sm font-semibold text-leaf-900">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-leaf-600 opacity-60" />
            <span className="relative size-2.5 rounded-full bg-leaf-600" />
          </span>
          Working on it, up to ${handedOff}
        </div>
        <button
          type="button"
          onClick={onTakeBack}
          className={cn(
            "flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-leaf-900 text-base font-semibold hover:bg-public-photo",
            focusRing,
          )}
        >
          Take it back
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onHandOff(Math.round(ceiling));
      }}
    >
      <div className="flex items-center gap-2">
        <SparkleIcon size={16} className="text-pink-400" />
        <h2 className="font-display text-xl font-extrabold tracking-tight">Let your agent finish</h2>
      </div>
      <p className="text-sm text-public-text-muted">
        Claude is connected. Give it a ceiling and it replies to {owner} for you, then asks before
        it pays.
      </p>
      <label className="flex h-[52px] w-full items-center justify-between gap-3 rounded-[14px] border border-public-border px-[18px] focus-within:outline-2 focus-within:outline-secondary">
        <span className="text-sm text-public-text-muted">Go no higher than</span>
        <span className="flex items-center text-lg font-bold">
          $
          <input
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
            aria-label="Go no higher than"
            className="bg-transparent outline-none"
            style={{ width: `${Math.max(1, value.length)}ch` }}
          />
        </span>
      </label>
      <button
        type="submit"
        disabled={!valid}
        className={cn(
          "flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-leaf-900 text-base font-semibold text-white hover:bg-leaf-600 disabled:cursor-not-allowed disabled:opacity-40",
          focusRing,
        )}
      >
        Hand it to Claude
      </button>
    </form>
  );
}

/** "Where things stand": the deal so far, newest step with the dark dot. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex w-full flex-col gap-4">
      <h2 className="text-base font-bold">Where things stand</h2>
      <ol className="flex w-full flex-col gap-3.5">
        {steps.map((step, i) => (
          <li key={`${step.title}-${i}`} className="flex w-full gap-3">
            <span className="flex w-3 shrink-0 justify-center pt-1.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  i === steps.length - 1 ? "bg-leaf-900" : "bg-leaf-300",
                )}
              />
            </span>
            <span className="flex flex-1 flex-col text-sm">
              <span className="font-semibold">{step.title}</span>
              <span className="text-public-text-muted">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
