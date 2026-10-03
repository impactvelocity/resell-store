import { EmptyState, type EmptyArtPreset, type EmptyStateTone } from "../../empty-state";
import { signInHref } from "../../../lib/safe-next";
import { formatPrice, type PublicListing, type PublicStore } from "../../../lib/mock-market";
import { SiteLink, StoreLink } from "../links";
import { pillLink } from "../parts";
import { OrderSummary, type SummaryLine } from "./order-summary";

/*
 * P4/P5 for live listings when there's no form to show: signed out, your own
 * listing, already sold, not taking offers, or an offer that's been accepted.
 * The thing itself stays on the right so you know what you were looking at.
 */

export type CheckoutNoticeKind =
  | "signin-buy"
  | "signin-offer"
  | "own"
  | "sold"
  | "no-offers"
  | "accepted";

const money = (n: number) => formatPrice(n, true);

type Content = {
  art: EmptyArtPreset;
  tone: EmptyStateTone;
  sticker?: string;
  title: string;
  body: string;
  actions: React.ReactNode;
  footnote?: string;
};

export function CheckoutNotice({
  kind,
  listing,
  store,
  asking,
  shipping,
  agreed,
  sold,
}: {
  kind: CheckoutNoticeKind;
  listing: PublicListing;
  store: PublicStore;
  /** Asking price and tracked shipping, in dollars */
  asking: number;
  shipping: number;
  /** An accepted offer's price, for "accepted" */
  agreed?: number;
  /** For "own": it has sold already */
  sold?: boolean;
}) {
  const id = listing.id ?? listing.slug;
  const owner = store.owner;
  const back = (
    <StoreLink store={listing.store} href={`/${listing.slug}`} className={pillLink.outline}>
      Back to the listing
    </StoreLink>
  );

  const all: Record<CheckoutNoticeKind, Content> = {
    "signin-buy": {
      art: "items",
      tone: "leaf",
      title: "Sign in to buy",
      body: `It takes a minute. We email you a link, you tap it, and you land right back here to finish buying from ${owner}.`,
      actions: (
        <>
          <SiteLink href={signInHref(`/checkout/${id}`)} className={pillLink.primary}>
            Sign in to buy
          </SiteLink>
          {back}
        </>
      ),
      footnote: "No password. New here? The same link makes your account.",
    },
    "signin-offer": {
      art: "messages",
      tone: "pink",
      title: "Sign in to make an offer",
      body: `So ${owner} knows who's asking, and so you hear back. We email you a link and bring you right back here.`,
      actions: (
        <>
          <SiteLink href={signInHref(`/offer/${id}`)} className={pillLink.primary}>
            Sign in to make an offer
          </SiteLink>
          {back}
        </>
      ),
      footnote: "No password. New here? The same link makes your account.",
    },
    own: {
      art: "seedling",
      tone: "lemon",
      sticker: "Yours",
      title: "This is your listing",
      body: sold
        ? "And it's sold. Ship it from your sales, and the order wraps up once the buyer says it's all good."
        : "You can't buy your own things, but you can share the link, check on offers, or change the price from your listings.",
      actions: (
        <>
          <SiteLink href={`/listings/${id}`} className={pillLink.primary}>
            Manage this listing
          </SiteLink>
          {back}
        </>
      ),
    },
    sold: {
      art: "items",
      tone: "photo",
      sticker: "Sold",
      title: "This one's sold",
      body: `Someone got to it first. ${owner} may have something like it in the store.`,
      actions: (
        <>
          <StoreLink store={listing.store} className={pillLink.primary}>
            Visit {store.name}
          </StoreLink>
          <SiteLink href="/discover" className={pillLink.outline}>
            Keep browsing
          </SiteLink>
        </>
      ),
    },
    "no-offers": {
      art: "items",
      tone: "photo",
      title: `${owner} isn't taking offers on this`,
      body: `The price is firm at ${money(asking)}, plus ${money(shipping)} tracked shipping.`,
      actions: (
        <>
          <SiteLink href={`/checkout/${id}`} className={pillLink.primary}>
            Buy it for {money(asking)}
          </SiteLink>
          {back}
        </>
      ),
    },
    accepted: {
      art: "payout",
      tone: "leaf",
      sticker: "Yes!",
      title: "Your offer was accepted",
      body: `${owner} said yes to ${money(agreed ?? asking)}. Pay within two days and it's yours.`,
      actions: (
        <>
          <SiteLink href={`/checkout/${id}`} className={pillLink.primary}>
            Pay {money(agreed ?? asking)} now
          </SiteLink>
          <SiteLink href="/account#offers" className={pillLink.outline}>
            See your offers
          </SiteLink>
        </>
      ),
    },
  };
  const c = all[kind];

  const lines: SummaryLine[] =
    kind === "accepted" && agreed != null
      ? [
          { label: "Asking price", value: money(asking), tone: "struck" },
          { label: "Your accepted offer", value: money(agreed), tone: "strong" },
          { label: "Tracked shipping", value: money(shipping) },
        ]
      : [
          { label: kind === "signin-offer" || kind === "no-offers" ? "Asking price" : "Price", value: money(asking) },
          { label: "Tracked shipping", value: money(shipping) },
        ];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col-reverse gap-2 px-4 pt-2 pb-16 desk:grid desk:grid-cols-[minmax(0,1fr)_420px] desk:items-start desk:gap-14 desk:px-16 desk:pt-10 desk:pb-24">
      <EmptyState
        surface="public"
        size="md"
        art={c.art}
        tone={c.tone}
        sticker={c.sticker}
        title={c.title}
        actions={c.actions}
        footnote={c.footnote}
      >
        {c.body}
      </EmptyState>

      <OrderSummary
        listing={listing}
        storeName={store.name}
        lines={lines}
        className="mt-6 desk:mt-16"
        footer={
          <p className="text-sm text-public-text-muted">
            {kind === "sold" ? "Sold." : "Test checkout: no money moves yet. PayPal is next."}
          </p>
        }
      />
    </div>
  );
}
