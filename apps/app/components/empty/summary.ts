import "server-only";
import { requireUser } from "../../lib/server/session";
import { listOwnedShops } from "../../lib/server/shops";

/*
 * Just enough about the signed-in seller to make an empty screen personal:
 * their first name, their first shop and how many things they have live.
 */

export type SellerSummary = {
  firstName: string;
  /** Where "See your shop" goes, or null when they haven't made one. */
  shopHref: string | null;
  shopName: string | null;
  shops: number;
  live: number;
  drafts: number;
  sold: number;
};

export async function getSellerSummary(): Promise<SellerSummary> {
  const user = await requireUser();
  const shops = await listOwnedShops(user.id);
  const name = user.name?.trim() || user.email.split("@")[0]!;
  const first = shops[0];
  return {
    firstName: name.split(/\s+/)[0]!,
    shopHref: first ? `/shops/${first.slug}` : null,
    shopName: first?.name ?? null,
    shops: shops.length,
    live: shops.reduce((n, s) => n + s.live, 0),
    drafts: shops.reduce((n, s) => n + s.drafts, 0),
    sold: shops.reduce((n, s) => n + s.sold, 0),
  };
}

/** "1 thing" / "3 things". */
export function things(n: number) {
  return `${n} ${n === 1 ? "thing" : "things"}`;
}
