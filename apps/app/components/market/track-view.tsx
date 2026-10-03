"use client";

import { useEffect } from "react";
import { trackView } from "../../lib/track";

/** Counts one view of a store page (shop only) or a listing (listing id) for Stats. */
export function TrackView({ shop, listing }: { shop: string; listing?: string }) {
  useEffect(() => {
    trackView({ shop, listing });
  }, [shop, listing]);
  return null;
}
