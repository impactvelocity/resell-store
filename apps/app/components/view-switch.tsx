"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { isMockPath, MOCK_COOKIE } from "../lib/mock-mode";
import { storeFromHost } from "../lib/urls";

/*
 * Dev only. A pill in the corner that flips a designed screen between the live
 * version and the front-end prototype (app/mock), at the same URL.
 */
export function ViewSwitch() {
  const pathname = usePathname();
  const [state, setState] = useState<{ mock: boolean; mockable: boolean } | null>(null);

  useEffect(() => {
    const mock = document.cookie.split("; ").includes(`${MOCK_COOKIE}=1`);
    const inStore = storeFromHost(window.location.host) !== null;
    setState({ mock, mockable: inStore || isMockPath(pathname) });
  }, [pathname]);

  if (!state || (!state.mock && !state.mockable)) return null;

  return (
    <a
      href={`?view=${state.mock ? "live" : "mock"}`}
      className={cn(
        "fixed top-1/2 right-0 z-50 hidden h-9 origin-bottom-right translate-y-1/2 -rotate-90 items-center gap-2 rounded-t-lg border border-b-0 px-3 text-xs font-bold shadow-[0_-4px_16px_-10px_rgb(20_38_29/0.4)] transition-colors desk:flex",
        state.mock
          ? "border-pink-400 bg-pink-100 text-leaf-900"
          : "border-border bg-surface text-text",
      )}
    >
      <span
        className={cn("size-2 rounded-full", state.mock ? "bg-pink-400" : "bg-secondary")}
        aria-hidden
      />
      {state.mock ? "Mock · show live" : "Live · show mock"}
    </a>
  );
}
