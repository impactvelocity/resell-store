import "server-only";
import { sellerTasks } from "../../../components/seller-live/data";
import { listSellerThreads } from "../../../lib/server/messages";

/** Everything the inbox lists, for the list page and an open conversation alike. */
export async function loadInbox(sellerId: string) {
  const [{ offers, orders, toAnswer, toShip }, threads] = await Promise.all([
    sellerTasks(sellerId),
    listSellerThreads(sellerId),
  ]);
  const waiting = offers.filter((o) => o.status === "countered" || o.status === "accepted");
  const pastOffers = offers.filter((o) => !["open", "countered", "accepted"].includes(o.status));
  const pastOrders = orders.filter((o) => o.status !== "paid");
  const empty = !toAnswer.length && !toShip.length && !waiting.length && !threads.length && !pastOffers.length && !pastOrders.length;
  return { toAnswer, toShip, waiting, threads, pastOffers, pastOrders, empty };
}
