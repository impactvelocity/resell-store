import type { Metadata } from "next";
import {
  LiveAccount,
  type LiveOfferView,
  type LiveOrderView,
} from "../../../../components/market/buyer/live-account";
import { EmptyAccount, SignInPrompt } from "../../../../components/market/buyer/live-empty";
import { shortPrice } from "../../../../lib/mock-checkout";
import { toDollars } from "../../../../lib/money";
import { agreedCents, listBuyerOffers, listBuyerOrders } from "../../../../lib/server/commerce";
import { latestDisputes, type DisputeRow } from "../../../../lib/server/disputes";
import { listFollowedShops } from "../../../../lib/server/follows";
import { listLikedListings } from "../../../../lib/server/likes";
import { publicViewer } from "../../../../lib/server/market";
import { buyerCanCancel, shipBy } from "../../../../lib/server/payout-policy";
import { reviewedOrderIds } from "../../../../lib/server/reviews";
import { countOwnedShops } from "../../../../lib/server/shops";
import { accountVisit, isNewSince } from "../../../../lib/server/account-visit";

export const metadata: Metadata = { title: "Your account · resell.store" };

/**
 * P8 Buyer account: the buyer's home for updates. Real orders and offers with
 * what each one needs next, what they've saved and the shops they follow.
 * Signed out, a way in; nothing yet, a friendly start. Sellers get a way
 * back to their shops.
 */
export default async function AccountPage() {
  const viewer = await publicViewer();
  if (!viewer) {
    return (
      <main className="mx-auto max-w-[1440px] px-4 desk:px-16">
        <SignInPrompt what="account" />
      </main>
    );
  }

  const [orderRows, offerRows, saved, following, ownedShops, since] = await Promise.all([
    listBuyerOrders(viewer.id),
    listBuyerOffers(viewer.id),
    listLikedListings(viewer.id),
    // One listing per shop is enough to say "new this week"
    listFollowedShops(viewer.id, { perShop: 1 }),
    countOwnedShops(viewer.id),
    accountVisit(viewer.id),
  ]);
  const sells = ownedShops > 0;
  if (!orderRows.length && !offerRows.length && !saved.length && !following.length) {
    return <EmptyAccount firstName={viewer.firstName} sells={sells} />;
  }

  const [problems, reviewed] = await Promise.all([
    latestDisputes(orderRows.map((r) => r.order.id)),
    reviewedOrderIds(orderRows.filter((r) => r.order.status === "completed").map((r) => r.order.id)),
  ]);
  const liveProblem = (orderId: string) => {
    const d = problems.get(orderId);
    return d && (d.status === "open" || d.status === "escalated") ? d : null;
  };
  const orders = orderRows.map((r) => ({
    ...toOrderView(r, liveProblem(r.order.id)),
    canReview: r.order.status === "completed" && !reviewed.has(r.order.id),
    isNew: isNewSince(since, r.order.updatedAt),
  }));
  const offers = offerRows.map((r) => ({ ...toOfferView(r), isNew: isNewSince(since, r.offer.updatedAt) }));
  const fresh = orders.filter((o) => o.isNew).length + offers.filter((o) => o.isNew).length;

  // What needs the buyer, in the words of the overview line
  const toCheck = orderRows.filter(
    (r) => (r.order.status === "shipped" || r.order.status === "delivered") && !liveProblem(r.order.id),
  ).length;
  const counters = offerRows.filter((r) => r.status === "countered").length;
  const toPay = offerRows.filter((r) => r.status === "accepted").length;
  const needs = [
    counters && plural(counters, "a counter offer", "counter offers"),
    toPay && plural(toPay, "an accepted offer to pay", "accepted offers to pay"),
    toCheck && plural(toCheck, "a parcel to check", "parcels to check"),
  ].filter(Boolean) as string[];
  const count = counters + toPay + toCheck;
  const summary = [
    needs.length
      ? `${count === 1 ? "One thing needs" : `${numberWord(count)} things need`} you today: ${list(needs)}.`
      : "Nothing needs you today. News on your orders, offers and the shops you follow lands here.",
    fresh > 0 && `${fresh === 1 ? "One update" : `${numberWord(fresh)} updates`} since your last visit, marked New.`,
  ]
    .filter(Boolean)
    .join(" ");

  // Paid or on the way: what PayPal would be holding
  const heldRows = orderRows.filter(
    (r) => r.order.status === "paid" || r.order.status === "shipped" || r.order.status === "delivered",
  );
  const heldCents = heldRows.reduce((sum, r) => sum + r.order.totalCents, 0);

  return (
    <LiveAccount
      firstName={viewer.firstName}
      summary={summary}
      held={heldCents > 0 ? dollars(heldCents) : null}
      heldTest={heldRows.every((r) => r.order.paymentProvider !== "paypal")}
      orders={orders}
      offers={offers}
      saved={saved}
      following={following.map((f) => ({
        shopId: f.shopId,
        slug: f.slug,
        name: f.name,
        initial: f.initial,
        tone: f.tone,
        picture: f.picture,
        line: [f.forSale > 0 ? `${f.forSale} for sale` : "Nothing for sale right now", f.hasNew && "new this week"]
          .filter(Boolean)
          .join(", "),
      }))}
      sells={sells}
    />
  );
}

/* Rows → what the account shows */

type OrderRows = Awaited<ReturnType<typeof listBuyerOrders>>;
type OfferRows = Awaited<ReturnType<typeof listBuyerOffers>>;

const dollars = (cents: number | null | undefined) => shortPrice(toDollars(cents) ?? 0);
const shortDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });

function toOrderView(r: OrderRows[number], problem: DisputeRow | null): LiveOrderView {
  const o = r.order;
  const shop = r.shop.name;
  const test = o.paymentProvider !== "paypal";
  const late = buyerCanCancel(o);
  const status = ((): LiveOrderView["status"] => {
    if (problem) {
      return {
        title: problem.status === "escalated" ? "We're looking at it" : "Problem reported",
        detail: [
          problem.offerCents != null && `${shop} offered ${dollars(problem.offerCents)} back.`,
          `${shop} isn't paid until it's sorted.`,
        ]
          .filter(Boolean)
          .join(" "),
      };
    }
    switch (o.status) {
      case "paid":
        if (late) {
          return {
            title: `${shop} hasn't shipped it yet`,
            detail: `It was due by ${shortDate.format(shipBy(o))}. You can cancel for a full refund, or give them a little longer.`,
          };
        }
        return {
          title: `Paid, ${shop} ships it next`,
          detail: `${dollars(o.totalCents)} held until it arrives.${test ? " Test checkout, so no money moved." : ""}`,
        };
      case "shipped":
      case "delivered":
        return {
          title: o.status === "delivered" ? "Delivered" : "On its way",
          detail: o.trackingNumber
            ? `Tracking ${o.trackingNumber}. Check it, then say it's all good.`
            : "No tracking number yet. Check it when it lands, then say it's all good.",
        };
      case "completed":
        return {
          title: "All done",
          detail:
            o.refundedCents > 0
              ? `You got ${dollars(o.refundedCents)} back and the rest went to ${shop}${test ? " (test)" : ""}.`
              : `You confirmed it${o.completedAt ? ` on ${shortDate.format(o.completedAt)}` : ""}. ${shop} was paid${test ? " (test)" : ""}.`,
          done: true,
        };
      case "refunded":
        return {
          title: `Refunded ${dollars(o.refundedCents || o.totalCents)}`,
          detail: `The money went back to you${test ? " (test, no money moved)" : ""}.`,
          muted: true,
        };
      case "cancelled":
        return {
          title: "Cancelled",
          detail: `It didn't ship, so ${dollars(o.refundedCents || o.totalCents)} went back to you${test ? " (test)" : ""}.`,
          muted: true,
        };
    }
  })();
  return {
    id: o.id,
    title: r.listing.title,
    photo: r.photo,
    line: `${shop}, ${dollars(o.totalCents)} with shipping`,
    status,
    canConfirm: (o.status === "shipped" || o.status === "delivered") && !problem,
    shopName: shop,
    href: `/account/orders/${o.id}`,
    canCancel: late,
    problem: problem ? (problem.status as "open" | "escalated") : null,
  };
}

function toOfferView(r: OfferRows[number]): LiveOfferView {
  const o = r.offer;
  const shop = r.shop.name;
  const offered = dollars(o.amountCents);
  const deposit = o.depositCents ? ` ${dollars(o.depositCents)} deposit noted (test).` : "";
  const left = timeLeft(o.expiresAt);
  const base = {
    id: o.id,
    listingId: r.listing.id,
    title: r.listing.title,
    photo: r.photo,
    line: `${shop}, asking ${dollars(r.listing.priceCents)}`,
    shopName: shop,
  };
  switch (r.status) {
    case "open":
      return {
        ...base,
        status: { title: `Waiting for ${shop}`, detail: `You offered ${offered}. ${left} for them to answer.${deposit}` },
        action: "withdraw",
      };
    case "countered":
      return {
        ...base,
        status: {
          title: `${shop} countered at ${dollars(o.counterCents)}`,
          detail: `You offered ${offered}. ${left} to answer.${deposit}`,
        },
        action: "counter",
        counter: dollars(o.counterCents),
      };
    case "accepted":
      return {
        ...base,
        status: {
          title: `Accepted at ${dollars(agreedCents(o))}`,
          detail: `${left} to pay, or it lapses.`,
        },
        action: "pay",
      };
    case "paid":
      return {
        ...base,
        status: { title: `Bought for ${dollars(agreedCents(o))}`, detail: "It's in your orders.", done: true },
        action: null,
      };
    case "declined":
      return { ...base, status: { title: "Declined", detail: `You offered ${offered}.`, muted: true }, action: null };
    case "expired":
      return { ...base, status: { title: "Ran out", detail: `You offered ${offered}.`, muted: true }, action: null };
    case "withdrawn":
      return {
        ...base,
        status: { title: "You took it back", detail: `You offered ${offered}.`, muted: true },
        action: null,
      };
  }
}

/** "47 hours left", "2 days left", "Under an hour left". */
function timeLeft(until: Date) {
  const hours = Math.floor((until.getTime() - Date.now()) / 3_600_000);
  if (hours < 1) return "Under an hour left";
  if (hours <= 36) return `${hours} ${hours === 1 ? "hour" : "hours"} left`;
  return `${Math.round(hours / 24)} days left`;
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : `${numberWord(n).toLowerCase()} ${many}`;
}

function numberWord(n: number) {
  return ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"][n] ?? String(n);
}

/** "a, b and c" */
function list(items: string[]) {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
