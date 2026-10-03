import type { Metadata } from "next";
import { OfferMissing } from "../../../../components/empty/offer-missing";
import { getSellerSummary } from "../../../../components/empty/summary";
import { offerTimeline, sellerOffers, sellerOrders } from "../../../../components/seller-live/data";
import { LiveOfferView } from "../../../../components/seller-live/offer-page";
import { requireUser } from "../../../../lib/server/session";

export const metadata: Metadata = { title: "Offer · resell.store" };

/*
 * C10 Listing / Offer: one offer on one of the seller's listings. Anyone
 * else's offer (or a bad link) gets the friendly "This offer isn't here".
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const offer = (await sellerOffers(user.id)).find((o) => o.id === id);
  if (!offer) return <OfferMissing seller={await getSellerSummary()} />;
  const order = (await sellerOrders(user.id)).find((o) => o.offerId === offer.id) ?? null;
  return <LiveOfferView offer={offer} order={order} timeline={offerTimeline(offer, order)} />;
}
