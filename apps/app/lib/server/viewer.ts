import "server-only";
import { and, db, eq, gt, offer, orders, shop, sql } from "@repo/db";
import type { Viewer } from "../../components/viewer";
import type { CurrentUser } from "./session";
import { countUnread } from "./messages";
import { listOwnedShops, toShopCard } from "./shops";

/** The nav badge: offers waiting on the seller's answer, paid orders still to ship, unread messages from buyers. */
async function countNeedsYou(sellerId: string) {
  const count = sql<number>`count(*)`.mapWith(Number);
  const [[offers], [toShip], unread] = await Promise.all([
    db
      .select({ n: count })
      .from(offer)
      .innerJoin(shop, eq(shop.id, offer.shopId))
      .where(and(eq(shop.ownerId, sellerId), eq(offer.status, "open"), gt(offer.expiresAt, new Date()))),
    db
      .select({ n: count })
      .from(orders)
      .innerJoin(shop, eq(shop.id, orders.shopId))
      .where(and(eq(shop.ownerId, sellerId), eq(orders.status, "paid"))),
    countUnread(sellerId, "seller"),
  ]);
  return (offers?.n ?? 0) + (toShip?.n ?? 0) + unread;
}

export async function loadViewer(user: CurrentUser): Promise<Viewer> {
  const [shops, inboxCount] = await Promise.all([listOwnedShops(user.id), countNeedsYou(user.id)]);
  const name = user.name?.trim() || user.email.split("@")[0]!;
  return {
    id: user.id,
    name,
    firstName: name.split(/\s+/)[0]!,
    initial: name[0]!.toUpperCase(),
    handle: `@${shops[0]?.slug ?? user.email.split("@")[0]}`,
    email: user.email,
    image: user.image,
    shops: shops.map(toShopCard),
    inboxCount,
  };
}
