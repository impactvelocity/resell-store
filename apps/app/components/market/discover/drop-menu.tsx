"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";

export type DropOption<T extends string> = { value: T; label: string };

/**
 * A text button with a chevron that opens a small single-choice menu.
 * Used for the filter row and sort on /discover.
 */
export function DropMenu<T extends string>({
  label,
  options,
  value,
  onChange,
  align = "left",
  className,
  triggerClassName,
}: {
  label: React.ReactNode;
  options: DropOption<T>[];
  value: T;
  onChange: (value: T) => void;
  align?: "left" | "right";
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded-md text-sm font-medium whitespace-nowrap outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
          triggerClassName,
        )}
      >
        {label}
        <ChevronDownIcon
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className={cn(
            "absolute top-full z-20 mt-2 flex min-w-48 flex-col rounded-2xl border border-public-border bg-public-background p-1.5 shadow-[0_8px_24px_rgb(0_0_0/0.08)]",
            align === "right" ? "left-0 md:right-0 md:left-auto" : "left-0",
          )}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "flex h-9 cursor-pointer items-center rounded-xl px-3 text-left text-sm whitespace-nowrap outline-none hover:bg-public-photo focus-visible:bg-public-photo",
                o.value === value && "font-semibold",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
