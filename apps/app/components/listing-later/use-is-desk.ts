"use client";

import { useSyncExternalStore } from "react";

const query = "(min-width: 900px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True at the `desk:` breakpoint. False on the server. */
export function useIsDesk() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
