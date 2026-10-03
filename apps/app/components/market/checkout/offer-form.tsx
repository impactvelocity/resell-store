"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { CheckIcon, ChatIcon, CloseIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import {
  agent,
  answersWithin,
  depositOptions,
  itemNoun,
  offerHours,
  shortPrice,
  suggestedOffer,
} from "../../../lib/mock-checkout";
import { formatPrice, type Listing, type PublicListing, type PublicStore } from "../../../lib/mock-market";
import { signInHref } from "../../../lib/safe-next";
import { sendOffer } from "../../../app/actions/commerce";
import { SiteLink, StoreLink } from "../links";
import { AmountChip, Sparkle, Switch } from "./controls";
import { OrderSummary, StepList } from "./order-summary";

const money = (n: number) => formatPrice(n, true);
const quickDiscounts = [10, 15, 20];

/** How warm an offer is, by how far under asking it lands. */
function offerHint(offer: number, price: number, owner: string) {
  if (offer <= 0) return { label: "Enter an amount", detail: "Whole dollars", tone: "muted" } as const;
  if (offer >= price)
    return {
      label: offer === price ? "That is the asking price" : "That is over asking",
      detail: "You can buy it outright instead",
      tone: "text",
    } as const;
  const under = `${shortPrice(price - offer)} under asking`;
  const pct = (price - offer) / price;
  if (pct <= 0.15) return { label: under, detail: "Offers this close usually get a yes here", tone: "good" } as const;
  if (pct <= 0.3) return { label: under, detail: `${owner} may come back with a counter`, tone: "text" } as const;
  return { label: under, detail: "Offers this far under rarely get a yes", tone: "low" } as const;
}

/** What a real offer needs on top of the listing. Amounts are dollars. */
export type LiveOffer = {
  listingId: string;
  /** Tracked shipping, from the server's rates */
  shipping: number;
  /** How long the seller has to answer */
  hours: number;
  /** The buyer's offer that's still waiting: a new one replaces it */
  current: { amount: number; counter: number | null } | null;
};

/** "Sunday at 3:40 PM", in the buyer's own time zone. */
const untilFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * P5: offer, note, optional deposit and agent, with a live summary on the right.
 *
 * With `live`, sending makes a real offer the seller answers. The deposit is
 * noted on it but not charged (no PayPal yet), and the agent option is hidden.
 */
export function OfferForm({
  listing,
  store,
  live,
}: {
  listing: PublicListing;
  store: PublicStore;
  live?: LiveOffer;
}) {
  const ids = useId();
  const router = useRouter();
  const owner = store.owner;
  // The prototype's helpers only read the drawing off a mock listing
  const n = itemNoun(listing as Listing);
  const shipping = live ? live.shipping : (listing.shipping ?? 0);
  const hours = live?.hours ?? offerHours;
  const key = listing.id ?? listing.slug;

  const [offerText, setOfferText] = useState(String(suggestedOffer(listing.price)));
  const [note, setNote] = useState<string | null>(null);
  // Nothing is held for real yet, so live deposits start off
  const [depositOn, setDepositOn] = useState(!live);
  const [depositPick, setDepositPick] = useState(20);
  const [agentOn, setAgentOn] = useState(false);
  const [sent, setSent] = useState(false);
  const [until, setUntil] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!listing.openToOffers) return <NotTakingOffers listing={listing} store={store} />;

  const offer = Number(offerText) || 0;
  const valid = offer > 0 && offer < listing.price;
  const hint = offerHint(offer, listing.price, owner);

  // Deposits only make sense below the offer itself
  const deposits = depositOptions.filter((d) => d < offer);
  const deposit =
    depositOn && deposits.length
      ? deposits.includes(depositPick)
        ? depositPick
        : deposits[deposits.length - 1]!
      : 0;
  const totalIfYes = offer + shipping;
  const rest = totalIfYes - deposit;

  // The note follows the offer until you write your own
  const noteText =
    note ??
    `Hi ${owner}, would you take ${shortPrice(offer)}? I can pay today and I am in no rush on shipping.`;

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    if (!live) {
      setSent(true);
      window.scrollTo({ top: 0 });
      return;
    }
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await sendOffer({
      listingId: live.listingId,
      amount: offer,
      note: noteText,
      deposit: deposit || null,
    });
    setPending(false);
    if (!res.ok) {
      if (res.signin) return router.push(signInHref(`/offer/${live.listingId}`));
      setError(res.error);
      return;
    }
    setUntil(untilFormat.format(new Date(res.expiresAt)));
    setSent(true);
    window.scrollTo({ top: 0 });
  }

  const summary = (
    <OrderSummary
      listing={listing}
      storeName={store.name}
      lines={[
        { label: "Asking price", value: money(listing.price), tone: "struck" },
        { label: "Your offer", value: money(offer), tone: "strong" },
        { label: "Tracked shipping", value: money(shipping) },
        { label: `Total if ${owner} says yes`, value: money(totalIfYes), tone: "strong" },
      ]}
      footer={
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-lg font-bold">{live ? "Deposit" : "Held today"}</span>
            <span className="text-sm text-public-text-muted">
              {live ? "Not charged in test mode" : `Then ${money(rest)} if accepted`}
            </span>
          </div>
          <span className="font-display text-3xl font-extrabold tracking-tight">
            {money(deposit)}
          </span>
        </div>
      }
    />
  );

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-6 pb-16 desk:flex-row desk:items-start desk:gap-12 desk:px-16 desk:pt-14 desk:pb-20 xl:gap-24">
      <div className="flex min-w-0 grow basis-0 flex-col">
        {sent ? (
          <section aria-live="polite" className="flex flex-col items-start gap-6 desk:pt-2">
            <span className="flex size-14 items-center justify-center rounded-full bg-leaf-100 text-leaf-600">
              <CheckIcon size={26} strokeWidth={2.6} />
            </span>
            <div className="flex flex-col gap-3">
              <h1 className="font-display text-4xl font-extrabold tracking-tight">Offer sent.</h1>
              {live ? (
                <>
                  <p className="text-lg text-public-text-muted">
                    Your {money(offer)} offer is open for {hours} hours
                    {until ? `, until ${until}` : ""}. {owner} can say yes, say no, or come back
                    with a counter.
                  </p>
                  <p className="text-base text-public-text-muted">
                    {deposit > 0
                      ? `Your ${money(deposit)} deposit is noted on it, but nothing is charged in test mode. `
                      : ""}
                    The answer shows up in your account. You can take the offer back until then.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg text-public-text-muted">
                    {owner} usually answers {answersWithin(store.repliesIn ?? "a day")}.
                  </p>
                  <p className="text-base text-public-text-muted">
                    {deposit > 0 ? `PayPal is holding your ${money(deposit)} deposit. ` : ""}
                    {agentOn
                      ? `If ${owner} counters, ${agent.name} replies for you and checks with you before any money moves.`
                      : `You will hear back in your messages.`}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <SiteLink
                href={live ? "/account#offers" : "/messages"}
                className="inline-flex h-14 items-center gap-2 rounded-full bg-leaf-600 px-7 text-base font-bold text-white hover:bg-leaf-900"
              >
                {!live && <ChatIcon size={18} />}
                {live ? "See it in your account" : "Go to messages"}
              </SiteLink>
              <StoreLink
                store={store.slug}
                href={`/${listing.slug}`}
                className="inline-flex h-14 items-center rounded-full border border-public-border px-7 text-base font-bold hover:bg-public-photo"
              >
                Back to the listing
              </StoreLink>
            </div>
          </section>
        ) : (
          <form onSubmit={send} className="flex flex-col gap-8 desk:gap-10">
            <div className="flex flex-col gap-2 desk:gap-3">
              <h1 className="sr-only font-display text-4xl font-extrabold tracking-tight desk:not-sr-only">
                Make an offer
              </h1>
              <p className="text-base text-public-text-muted desk:text-lg">
                {owner} is open to offers on this {n.noun}. The asking price is{" "}
                {shortPrice(listing.price)}.
              </p>
              {live?.current && (
                <p className="text-base font-semibold text-leaf-900">
                  {live.current.counter != null ? (
                    <>
                      {owner} countered your {shortPrice(live.current.amount)} with{" "}
                      {shortPrice(live.current.counter)}.{" "}
                      <SiteLink href="/account#offers" className="text-leaf-600 underline">
                        Answer it in your account
                      </SiteLink>
                      , or send a new offer here instead.
                    </>
                  ) : (
                    <>
                      You already offered {shortPrice(live.current.amount)}. Sending a new offer
                      replaces it.
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Your offer */}
            <div className="flex flex-col gap-3.5">
              <label htmlFor={`${ids}-offer`} className="text-lg font-bold">
                Your offer
              </label>
              <div className="flex flex-col gap-2 rounded-lg border-2 border-leaf-900 px-5 py-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-secondary sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
                <div className="flex h-16 items-center font-display text-5xl font-extrabold tracking-tight">
                  <span aria-hidden>$</span>
                  <input
                    id={`${ids}-offer`}
                    inputMode="numeric"
                    autoComplete="off"
                    value={offerText}
                    onChange={(e) => setOfferText(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    aria-describedby={`${ids}-hint`}
                    className="field-sizing-content h-16 min-w-[1ch] bg-transparent p-0 outline-none"
                  />
                </div>
                <div id={`${ids}-hint`} aria-live="polite" className="flex flex-col gap-0.5 sm:items-end sm:text-right">
                  <span
                    className={cn(
                      "text-base font-semibold",
                      hint.tone === "good" && "text-leaf-600",
                      hint.tone === "low" && "text-berry-500",
                      hint.tone === "muted" && "text-public-text-muted",
                    )}
                  >
                    {hint.label}
                  </span>
                  <span className="text-sm text-public-text-muted">
                    {offer >= listing.price ? (
                      <SiteLink href={`/checkout/${key}`} className="font-semibold text-leaf-600 underline">
                        {hint.detail}
                      </SiteLink>
                    ) : (
                      hint.detail
                    )}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {quickDiscounts.map((pct) => {
                  const amount = Math.round(listing.price * (1 - pct / 100));
                  return (
                    <AmountChip
                      key={pct}
                      pressed={offer === amount}
                      onClick={() => setOfferText(String(amount))}
                      className="gap-1.5 px-3 sm:gap-2 sm:px-4"
                    >
                      <span className="font-bold">{shortPrice(amount)}</span>
                      <span className={offer === amount ? "text-white/75" : "text-public-text-muted"}>
                        {pct}% off
                      </span>
                    </AmountChip>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <label htmlFor={`${ids}-note`} className="text-lg font-bold">
                  A note to {owner}
                </label>
                <span className="text-sm text-public-text-muted">
                  Optional, but offers with a note do better
                </span>
              </div>
              <textarea
                id={`${ids}-note`}
                value={noteText}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="h-28 w-full resize-none rounded-md border border-public-border px-5 py-4 text-base outline-none focus:border-leaf-900"
              />
            </div>

            {/* Deposit and agent */}
            <div className="flex flex-col border-t border-public-border">
              {deposits.length > 0 && (
                <div className="flex items-start gap-5 border-b border-public-border py-6">
                  <div className="flex min-w-0 grow basis-0 flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <h2 id={`${ids}-deposit`} className="text-lg font-bold">
                        Put down a deposit to show you mean it
                      </h2>
                      <p className="max-w-[560px] text-base text-public-text-muted">
                        PayPal holds it, not {owner}. If the answer is no, or the offer runs out,
                        you get every dollar back. If it is a yes, it comes off the price.
                        {live && " In test mode it's noted on your offer, but nothing is charged."}
                      </p>
                    </div>
                    {depositOn && (
                      <div role="group" aria-label="Deposit amount" className="flex flex-wrap gap-2">
                        {deposits.map((d) => (
                          <AmountChip
                            key={d}
                            pressed={deposit === d}
                            onClick={() => setDepositPick(d)}
                            className="px-[18px] font-semibold"
                          >
                            {shortPrice(d)}
                          </AmountChip>
                        ))}
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={depositOn}
                    onCheckedChange={setDepositOn}
                    aria-labelledby={`${ids}-deposit`}
                    className="mt-0.5"
                  />
                </div>
              )}
              {!live && (
              <div className="flex items-start gap-5 border-b border-public-border py-6">
                <div className="flex min-w-0 grow basis-0 flex-col gap-1">
                  <h2 id={`${ids}-agent`} className="flex items-start gap-2 text-lg font-bold">
                    <Sparkle size={16} className="mt-1.5 text-pink-400" />
                    Let my agent handle the back and forth
                  </h2>
                  <p className="max-w-[560px] text-base text-public-text-muted">
                    If {owner} counters, your assistant replies for you up to a ceiling you set, and
                    checks with you before any money moves.
                  </p>
                </div>
                <Switch
                  checked={agentOn}
                  onCheckedChange={setAgentOn}
                  aria-labelledby={`${ids}-agent`}
                  className="mt-0.5"
                />
              </div>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-berry-500/10 px-4 py-3 text-base font-semibold text-berry-500">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3.5">
              <Button
                type="submit"
                variant="secondary"
                disabled={!valid || pending}
                className="h-[60px] w-full text-lg"
              >
                {pending
                  ? "Sending..."
                  : deposit > 0
                    ? live
                      ? `Send offer with a ${shortPrice(deposit)} deposit`
                      : `Send offer and hold ${shortPrice(deposit)}`
                    : "Send offer"}
              </Button>
              <p className="text-center text-sm text-public-text-muted">
                Your offer stays open for {hours} hours. You can take it back any time before{" "}
                {owner} answers.
                {live && " Test mode: no money moves yet."}
              </p>
            </div>
          </form>
        )}
      </div>

      <aside className="mt-12 flex shrink-0 flex-col gap-8 desk:mt-0 desk:w-[380px] xl:w-[440px]">
        {summary}
        <StepList
          title="Three ways this goes"
          steps={[
            {
              marker: <CheckIcon size={14} strokeWidth={3.2} />,
              markerClass: "bg-leaf-100 text-leaf-600",
              title: `${owner} says yes`,
              body:
                deposit > 0
                  ? `You pay the other ${shortPrice(rest)} and the ${n.noun} ${n.ships}. Same protection as buying outright.`
                  : `You pay ${shortPrice(totalIfYes)} and the ${n.noun} ${n.ships}. Same protection as buying outright.`,
            },
            {
              marker: <SwapIcon />,
              markerClass: "bg-lemon-100 text-leaf-900",
              title: `${owner} counters`,
              body:
                deposit > 0
                  ? "You can accept, send a new number, or walk away with your deposit."
                  : "You can accept, send a new number, or walk away.",
            },
            {
              marker: <CloseIcon size={14} strokeWidth={3} />,
              markerClass: "bg-public-photo text-text",
              title: `${owner} says no, or ${hours} hours pass`,
              body:
                deposit > 0
                  ? `Your ${shortPrice(deposit)} goes straight back to where it came from.`
                  : "Nothing was held, so there is nothing to give back.",
            },
          ]}
        />
      </aside>
    </div>
  );
}

function SwapIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h14l-4-4M20 15H6l4 4" />
    </svg>
  );
}

/** For listings the seller hasn't opened to offers. */
function NotTakingOffers({ listing, store }: { listing: PublicListing; store: PublicStore }) {
  const n = itemNoun(listing as Listing);
  return (
    <div className="mx-auto flex max-w-[720px] flex-col items-start gap-6 px-4 pt-10 pb-20 desk:pt-20">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Make an offer</h1>
      <p className="text-lg text-public-text-muted">
        {store.owner} is not taking offers on this {n.noun}. The price is{" "}
        {shortPrice(listing.price)}, plus {shortPrice(listing.shipping ?? 0)} shipping.
      </p>
      <div className="flex flex-wrap gap-3">
        <SiteLink
          href={`/checkout/${listing.id ?? listing.slug}`}
          className="inline-flex h-14 items-center rounded-full bg-lemon-400 px-7 text-base font-bold text-leaf-900 hover:bg-lemon-300"
        >
          Buy it for {shortPrice(listing.price)}
        </SiteLink>
        <StoreLink
          store={store.slug}
          href={`/${listing.slug}`}
          className="inline-flex h-14 items-center rounded-full border border-public-border px-7 text-base font-bold hover:bg-public-photo"
        >
          Back to the listing
        </StoreLink>
      </div>
    </div>
  );
}
