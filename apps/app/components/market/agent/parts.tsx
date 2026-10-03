"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { mcpUrl } from "../../../lib/mock-agent-buyer";

/** Copies the MCP link, shows a toast, and remembers which button did it for 2s. */
export function useCopyMcpLink() {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = (key: string) => {
    try {
      void navigator.clipboard?.writeText(mcpUrl).catch(() => {});
    } catch {
      // Clipboard can be blocked in previews; the toast still confirms.
    }
    toast.add({ title: "MCP link copied. Paste it in your assistant." });
    setCopied(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2000);
  };

  return { copy, copied };
}

/** On/off switch, leaf when on. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-600 disabled:cursor-default disabled:opacity-50",
        checked ? "bg-leaf-600" : "bg-[#d4d4d4]",
      )}
    >
      <span
        className={cn(
          "size-[22px] rounded-full bg-white shadow-[0_1px_2px_rgb(20_38_29/0.2)] transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
