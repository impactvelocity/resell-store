import type { WorkspaceListing } from "../../lib/server/listings";

/** "$89" or "$89.50". */
export function formatPrice(cents: number | null | undefined) {
  if (cents == null) return null;
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

/** The link as people read it: "maya.localhost:5689/yellow-dutch-oven". */
export function readableUrl(url: string) {
  return url.replace(/^https?:\/\//, "");
}

/** The lowest the agent will go: the listing's own floor, or the shop's % off. */
export function lowestCents(listing: WorkspaceListing) {
  if (listing.lowestCents != null) return listing.lowestCents;
  if (listing.priceCents == null) return null;
  return Math.round((listing.priceCents * (100 - listing.shop.lowestPercent)) / 100 / 100) * 100;
}

/** Copy, falling back quietly when the clipboard is blocked. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The system share sheet where there is one, else copy. Returns what happened. */
export async function shareLink(title: string, url: string): Promise<"shared" | "copied" | "failed" | "cancelled"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(url)) ? "copied" : "failed";
}
