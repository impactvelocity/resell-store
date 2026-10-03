"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { ShieldCheckIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { useToast } from "@repo/ui/toast";
import {
  agent,
  buyer,
  deliveryOptions,
  itemNoun,
  payLaterInstalments,
  shortPrice,
  type DeliveryId,
  type DeliveryOption,
  type PayMethod,
} from "../../../lib/mock-checkout";
import { formatPrice, type Listing, type PublicListing, type PublicStore } from "../../../lib/mock-market";
import { toDollars } from "../../../lib/money";
import { signInHref } from "../../../lib/safe-next";
import { buyListing } from "../../../app/actions/commerce";
import type { SandboxLogin as Login } from "../../../lib/server/paypal";
import { SandboxLogin } from "../../sandbox-login";
import { SiteLink } from "../links";
import { RadioCard, Sparkle } from "./controls";
import { OrderItem, OrderSummary, StepList, SummaryLines, type SummaryLine } from "./order-summary";

const money = (n: number) => formatPrice(n, true);

/** Drop a trailing Canadian postal code for the one-line phone version. */
const shortAddress = (a: string) => a.replace(/\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, "");

type ShipTo = { name: string; address: string; country: string };

/** What a real checkout needs on top of the listing. Amounts are dollars. */
export type LiveCheckout = {
  listingId: string;
  asking: number;
  /** The buyer's accepted offer: they pay its price instead of asking. */
  offer: { id: string; amount: number } | null;
  /** Tracked and express, from the server's shipping rates */
  shipping: { tracked: number; express: number };
  /** Last address used, else just the buyer's name to start from */
  shipTo: ShipTo | null;
  name: string;
  /** Already bought: the page reloads into the paid state. */
  paid: { item: number; total: number; delivery: DeliveryId; method: "paypal" | "card" } | null;
  /** "paypal": paying sends the buyer to PayPal. "test": no keys, nothing moves. */
  payments: "paypal" | "test";
  /** Back from PayPal without paying: why (cancelled, declined…). */
  notice?: string | null;
  /** PayPal's test system: say so, with the shared test buyer to sign in as. */
  sandbox?: { buyer: Login | null } | null;
};

/** Live delivery times are rough until a rate service gives real dates. */
const liveArrives = { tracked: "in 4 to 8 days", express: "in 2 to 3 days" } as const;

/**
 * P4 checkout (desktop) and P10 (phone) as one responsive form. Everything is
 * worked out from the listing price and the chosen delivery and payment.
 *
 * With `live`, it's a real checkout: PayPal or card only, the address is the
 * buyer's own. Paying goes to PayPal and back (or, with no PayPal keys, places
 * a test order on the spot). Without `live`, the prototype.
 */
export function CheckoutForm({
  listing,
  store,
  live,
}: {
  listing: PublicListing;
  store: PublicStore;
  live?: LiveCheckout;
}) {
  const toast = useToast();
  const router = useRouter();
  // The prototype's helpers only read the drawing and shipping off a mock listing
  const mockListing = { ...listing, shipping: listing.shipping ?? 0 } as Listing;
  const options: DeliveryOption[] = live
    ? (["tracked", "express"] as const).map((id) => ({
        id,
        label: id === "tracked" ? "Tracked" : "Express",
        arrives: liveArrives[id],
        price: live.shipping[id],
      }))
    : deliveryOptions(mockListing);
  const [deliveryId, setDeliveryId] = useState<DeliveryId>(live?.paid?.delivery ?? "tracked");
  const [method, setMethod] = useState<PayMethod>(live?.paid?.method ?? "paypal");
  const [shipTo, setShipTo] = useState<ShipTo>(
    live
      ? (live.shipTo ?? { name: live.name, address: "", country: "" })
      : { name: buyer.name, address: buyer.address, country: buyer.country },
  );
  // A first-time buyer starts with the address open
  const [editingAddress, setEditingAddress] = useState(!!live && !live.shipTo && !live.paid);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [paid, setPaid] = useState(!!live?.paid);
  const [paidTotal, setPaidTotal] = useState<number | null>(live?.paid?.total ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(live?.notice ?? null);
  // A real checkout without PayPal keys: the order is real, no money moves
  const test = live?.payments === "test";

  // Back from PayPal with the browser's back button: the page comes back as it was left
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => e.persisted && setPending(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const delivery = options.find((o) => o.id === deliveryId)!;
  const itemPrice = live ? (live.paid?.item ?? live.offer?.amount ?? live.asking) : listing.price;
  const total = paidTotal ?? itemPrice + delivery.price;
  const today = Math.round((total / payLaterInstalments) * 100) / 100;
  const overLimit = total > agent.limit;
  const n = itemNoun(mockListing);
  const owner = store.owner;
  const shipsIn = store.shipsIn ?? "";

  const payLabel = {
    paypal: `Pay ${money(total)} with PayPal`,
    later: `Pay ${money(today)} today with Pay Later`,
    card: `Pay ${money(total)} by card`,
    agent: `Send to ${agent.name} to pay`,
  }[method];

  const untilInHands = `Nothing reaches the seller until the ${n.noun} ${n.is} in your hands.`;
  const testNote = "Test checkout: no money moves yet. PayPal is next.";
  const payNote = test
    ? testNote
    : {
        paypal: `You confirm in PayPal. ${untilInHands}`,
        later: `You confirm in PayPal. ${untilInHands}`,
        card: `Your card is charged now and PayPal holds it. ${untilInHands}`,
        agent: `${agent.name} checks with you before it pays. ${untilInHands}`,
      }[method];
  const payNoteShort = test
    ? "Test checkout: no money moves yet."
    : {
        paypal: "You confirm in PayPal before anything is charged.",
        later: "You confirm in PayPal before anything is charged.",
        card: "PayPal holds the money until it arrives.",
        agent: `${agent.name} asks you before it pays.`,
      }[method];

  const lines: SummaryLine[] = [
    ...(live?.offer && !live.paid
      ? ([
          { label: "Asking price", value: money(live.asking), tone: "struck" },
          { label: "Your accepted offer", value: money(live.offer.amount), tone: "strong" },
        ] as SummaryLine[])
      : [{ label: n.label, value: money(itemPrice) }]),
    { label: `${delivery.label} shipping`, value: money(delivery.price) },
    test
      ? { label: "Payment", value: "Test, nothing charged" }
      : { label: "Buyer protection", value: "Included", tone: "good" },
  ];

  async function pay(e: FormEvent) {
    e.preventDefault();
    if (!live) {
      setPaid(true);
      window.scrollTo({ top: 0 });
      return;
    }
    if (pending) return;
    if (editingAddress || !shipTo.address) {
      setError("Save where it's going first, then pay.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await buyListing({
      listingId: live.listingId,
      offerId: live.offer?.id ?? null,
      delivery: deliveryId,
      payMethod: method === "card" ? "card" : "paypal",
      shipTo,
    });
    if (!res.ok) {
      setPending(false);
      if (res.signin) return router.push(signInHref(`/checkout/${live.listingId}`));
      setError(res.error);
      return;
    }
    // Off to PayPal; it sends them back to the paid page. Stay "pending" until the page goes
    if (res.redirect) return window.location.assign(res.redirect);
    setPending(false);
    setPaidTotal(toDollars(res.totalCents) ?? total);
    setPaid(true);
    window.scrollTo({ top: 0 });
  }

  function saveAddress(next: ShipTo) {
    const clean = {
      name: next.name.trim(),
      address: next.address.trim(),
      country: next.country.trim(),
    };
    if (live) {
      // A real parcel needs all three
      if (!clean.name || clean.address.length < 5 || clean.country.length < 2) {
        toast.add({ title: "Add a name, the full address and the country." });
        return;
      }
      setShipTo(clean);
      setError(null);
    } else {
      setShipTo({
        name: clean.name || shipTo.name,
        address: clean.address || shipTo.address,
        country: shipTo.country,
      });
    }
    setEditingAddress(false);
    toast.add({ title: "Address updated." });
  }

  const summary = (
    <OrderSummary
      listing={listing}
      storeName={store.name}
      lines={lines}
      footer={
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold">Total</span>
          <span className="flex items-baseline gap-2">
            <span className="text-sm text-public-text-muted">USD</span>
            <span className="font-display text-3xl font-extrabold tracking-tight">
              {money(total)}
            </span>
          </span>
        </div>
      }
    />
  );

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-5 pb-40 desk:flex-row desk:items-start desk:gap-12 desk:px-16 desk:pt-14 desk:pb-20 xl:gap-24">
      <div className="flex min-w-0 grow basis-0 flex-col">
        {paid ? (
          <PaidState
            method={method}
            total={total}
            today={today}
            owner={owner}
            shipsIn={shipsIn}
            live={!!live}
            test={test}
          />
        ) : (
            <form onSubmit={pay} className="flex flex-col gap-7 desk:gap-10">
              <h1 className="sr-only font-display text-4xl font-extrabold tracking-tight desk:not-sr-only">
                Checkout
              </h1>

              <div className="desk:hidden">
                <OrderItem listing={listing} storeName={store.name} size="sm" />
              </div>

              {live?.offer && (
                <p className="flex items-center gap-2.5 rounded-md bg-leaf-100 px-4 py-3.5 text-base font-semibold text-leaf-900">
                  <ShieldCheckIcon size={20} strokeWidth={2.2} className="shrink-0 text-leaf-600" />
                  Your offer of {money(live.offer.amount)} was accepted. That&apos;s what you pay.
                </p>
              )}

              <div className="flex flex-col desk:gap-10">
                {/* 1. Ship to */}
                {editingAddress ? (
                  <AddressEditor
                    withCountry={!!live}
                    defaultValue={shipTo}
                    onSave={saveAddress}
                    onCancel={() => setEditingAddress(false)}
                  />
                ) : (
                  <section aria-labelledby="ship-to" className="flex flex-col desk:gap-3.5">
                    <div className="hidden items-baseline justify-between desk:flex">
                      <h2 id="ship-to" className="text-lg font-bold">
                        1. Ship to
                      </h2>
                      <ChangeButton onClick={() => setEditingAddress(true)} label="Change address" />
                    </div>
                    <div className="hidden flex-col rounded-md bg-public-photo px-5 py-[18px] desk:flex">
                      <p className="text-base font-semibold">{shipTo.name}</p>
                      <p className="text-base text-public-text-muted">
                        {shipTo.address}, {shipTo.country}
                      </p>
                    </div>
                    <MobileRow
                      className="border-t"
                      title={`Ship to ${shipTo.name}`}
                      detail={shortAddress(shipTo.address)}
                      onChange={() => setEditingAddress(true)}
                      changeLabel="Change address"
                    />
                  </section>
                )}

                {/* 2. Delivery */}
                <section aria-labelledby="delivery" className="flex flex-col gap-3.5">
                  <h2 id="delivery" className="hidden text-lg font-bold desk:block">
                    2. Delivery
                  </h2>
                  <MobileRow
                    className={cn(editingAddress && "border-t")}
                    title={`${delivery.label} delivery, ${shortPrice(delivery.price)}`}
                    detail={`Arrives ${delivery.arrives}`}
                    onChange={() => setDeliveryOpen((o) => !o)}
                    changeLabel="Change delivery"
                    expanded={deliveryOpen}
                  />
                  <div
                    role="radiogroup"
                    aria-label="Delivery"
                    className={cn(
                      "flex-col gap-3 lg:flex-row lg:gap-4 desk:flex",
                      deliveryOpen ? "flex" : "hidden",
                    )}
                  >
                    {options.map((o) => (
                      <RadioCard
                        key={o.id}
                        name="delivery"
                        value={o.id}
                        checked={deliveryId === o.id}
                        onChange={() => setDeliveryId(o.id)}
                        title={o.label}
                        detail={`Arrives ${o.arrives}`}
                        trailing={<span className="shrink-0 text-base font-bold">{shortPrice(o.price)}</span>}
                        className="grow basis-0"
                      />
                    ))}
                  </div>
                </section>
              </div>

              {/* 3. How you pay */}
              <section aria-labelledby="how-you-pay" className="flex flex-col gap-3 desk:gap-3.5">
                <h2 id="how-you-pay">
                  <span className="font-display text-xl font-extrabold tracking-tight desk:hidden">
                    How you pay
                  </span>
                  <span className="hidden text-lg font-bold desk:inline">3. How you pay</span>
                </h2>
                <div role="radiogroup" aria-labelledby="how-you-pay" className="flex flex-col gap-3">
                  <RadioCard
                    name="method"
                    value="paypal"
                    checked={method === "paypal"}
                    onChange={() => setMethod("paypal")}
                    title="PayPal"
                    detail={
                      <Responsive
                        short="Balance, bank or card"
                        long={
                          live
                            ? "Pay from your balance, bank or card."
                            : `Pay from your balance, bank or card. Signed in as ${buyer.email}.`
                        }
                      />
                    }
                  />
                  {!live && (
                  <RadioCard
                    name="method"
                    value="later"
                    checked={method === "later"}
                    onChange={() => setMethod("later")}
                    title="Pay Later"
                    detail={
                      <Responsive
                        short={`${payLaterInstalments} payments of ${money(today)}, no interest`}
                        long={`${payLaterInstalments} payments of ${money(today)}, one every two weeks. No interest, no fees.`}
                      />
                    }
                    trailing={
                      <span className="hidden shrink-0 text-sm font-semibold desk:inline">
                        {shortPrice(today)} today
                      </span>
                    }
                  />
                  )}
                  <RadioCard
                    name="method"
                    value="card"
                    checked={method === "card"}
                    onChange={() => setMethod("card")}
                    title="Debit or credit card"
                    detail={
                      <Responsive
                        short="No PayPal account needed"
                        long="No PayPal account needed. Same protection."
                      />
                    }
                  />
                  {!live && (
                  <RadioCard
                    name="method"
                    value="agent"
                    checked={method === "agent"}
                    disabled={overLimit}
                    onChange={() => setMethod("agent")}
                    title="Let my agent pay"
                    detail={
                      overLimit ? (
                        `This is over the ${shortPrice(agent.limit)} limit you set.`
                      ) : (
                        <Responsive
                          short={`Inside your ${shortPrice(agent.limit)} limit. It asks first.`}
                          long={`Your assistant finishes checkout for you, inside the ${shortPrice(agent.limit)} limit you set. It asks you before it pays.`}
                        />
                      )
                    }
                    trailing={
                      <>
                        <span className="hidden h-7 shrink-0 items-center gap-1.5 rounded-full bg-pink-100 px-2.5 text-xs font-semibold text-pink-600 desk:flex">
                          <Sparkle />
                          {agent.name} connected
                        </span>
                        <Sparkle size={16} className="text-pink-400 desk:hidden" />
                      </>
                    }
                  />
                  )}
                </div>
              </section>

              {/* Phone: the escrow note and totals sit in the flow */}
              <div className="flex gap-3 rounded-md bg-leaf-100 px-4 py-3.5 text-sm text-leaf-900 desk:hidden">
                <ShieldCheckIcon size={20} strokeWidth={2.2} className="shrink-0 text-leaf-600" />
                <div className="flex flex-col gap-0.5">
                  <p className="font-bold">
                    {test ? "Test checkout: no money moves yet" : "Your money waits with PayPal"}
                  </p>
                  <p>
                    {test
                      ? `PayPal is next. Then it holds your money until the ${n.noun} ${n.arrives} and you have had 3 days to check it.`
                      : `${owner} is paid only after the ${n.noun} ${n.arrives} and you have had 3 days to check it.`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 desk:hidden">
                <SummaryLines lines={lines} className="gap-2" />
                <div className="flex items-baseline justify-between border-t border-public-border pt-3">
                  <span className="text-lg font-bold">Total</span>
                  <span className="font-display text-2xl font-extrabold tracking-tight">
                    {money(total)}
                  </span>
                </div>
              </div>

              {live?.sandbox && !test && (
                <SandboxLogin title="Sandbox mode: no real money" login={live.sandbox.buyer}>
                  {live.sandbox.buyer
                    ? "Payments go through PayPal's test system, so your real PayPal login won't work. In PayPal, sign in as the demo buyer:"
                    : "Payments go through PayPal's test system, so sign in to PayPal with a sandbox buyer account."}
                </SandboxLogin>
              )}

              {error && (
                <p role="alert" className="rounded-md bg-berry-500/10 px-4 py-3 text-base font-semibold text-berry-500">
                  {error}
                </p>
              )}

              <div className="hidden flex-col gap-3.5 desk:flex">
                <Button type="submit" disabled={pending} className="h-[60px] w-full text-lg text-leaf-900">
                  {pending ? (test ? "Paying..." : "Opening PayPal...") : payLabel}
                </Button>
                <p className="text-center text-sm text-public-text-muted">{payNote}</p>
              </div>

              {/* Phone: pay bar pinned to the bottom */}
              <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 border-t border-public-border bg-public-background px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] desk:hidden">
                <Button type="submit" disabled={pending} className="h-14 w-full text-lg text-leaf-900">
                  {pending ? (test ? "Paying..." : "Opening PayPal...") : payLabel}
                </Button>
                <p className="text-center text-xs text-public-text-muted">{payNoteShort}</p>
              </div>
            </form>
        )}
      </div>

      <aside className="mt-10 flex shrink-0 flex-col gap-8 desk:mt-0 desk:w-[380px] xl:w-[440px]">
        <div className={cn(!paid && "hidden desk:block")}>{summary}</div>
        <div className="hidden desk:block">
          <StepList
            title="Where your money waits"
            steps={[
              {
                marker: 1,
                markerClass: "bg-leaf-600 text-white",
                title: test ? "Today: you order" : "Today: you pay, PayPal holds it",
                body: test
                  ? `${owner} sees the order. This is a test checkout, so no money moves yet.`
                  : `${owner} can see the order but not the money.`,
              },
              {
                marker: 2,
                markerClass: "bg-leaf-100 text-leaf-600",
                title: /day/.test(shipsIn)
                  ? `Within ${shipsIn}: it ships`
                  : `Next: it ${n.ships}`,
                body: live
                  ? "You see it in your account, with tracking if they add it."
                  : "You get a tracking link by email and in your account.",
              },
              {
                marker: 3,
                markerClass: "bg-leaf-100 text-leaf-600",
                title: "It arrives: you get 3 days to check it",
                body: "Not as described? Say so and your money comes back.",
              },
              {
                marker: 4,
                markerClass: "bg-leaf-100 text-leaf-600",
                title: test ? `You say it is good: it's done` : `You say it is good: ${owner} gets paid`,
                body: "Or the 3 days pass with no problem reported.",
              },
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

/** Short copy on phones, long copy from 900px. */
function Responsive({ short, long }: { short: string; long: string }) {
  return (
    <>
      <span className="desk:hidden">{short}</span>
      <span className="hidden desk:inline">{long}</span>
    </>
  );
}

function ChangeButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 cursor-pointer text-sm font-semibold text-leaf-600 hover:underline"
    >
      Change
    </button>
  );
}

/** P10's compact "Ship to" and "Delivery" rows. */
function MobileRow({
  title,
  detail,
  onChange,
  changeLabel,
  expanded,
  className,
}: {
  title: string;
  detail: string;
  onChange: () => void;
  changeLabel: string;
  expanded?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-public-border py-4 desk:hidden",
        className,
      )}
    >
      <div className="flex min-w-0 grow basis-0 flex-col gap-0.5 text-sm">
        <p className="font-bold">{title}</p>
        <p className="text-public-text-muted">{detail}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        aria-label={changeLabel}
        aria-expanded={expanded}
        className="shrink-0 cursor-pointer text-sm font-semibold text-leaf-600 hover:underline"
      >
        {expanded ? "Done" : "Change"}
      </button>
    </div>
  );
}

/** Inline edit for the shipping address. Enter saves rather than paying. */
function AddressEditor({
  defaultValue,
  withCountry,
  onSave,
  onCancel,
}: {
  defaultValue: ShipTo;
  /** Live checkout asks for the country on its own line */
  withCountry?: boolean;
  onSave: (next: ShipTo) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const field =
    "h-12 w-full rounded-md border border-public-border bg-public-background px-4 text-base font-normal outline-none focus:border-leaf-900";
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSave(value);
    }
  };
  return (
    <section aria-labelledby="ship-to" className="flex flex-col gap-3.5 border-t border-public-border pt-4 desk:border-0 desk:pt-0">
      <h2 id="ship-to" className="text-sm font-bold desk:text-lg">
        <span className="hidden desk:inline">1. </span>Ship to
      </h2>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Name
        <input
          value={value.name}
          onChange={(e) => setValue({ ...value, name: e.target.value })}
          onKeyDown={onKeyDown}
          autoComplete="name"
          autoFocus
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Address
        <input
          value={value.address}
          onChange={(e) => setValue({ ...value, address: e.target.value })}
          onKeyDown={onKeyDown}
          autoComplete="street-address"
          placeholder={withCountry ? "Street, apartment, city, postcode" : undefined}
          className={field}
        />
      </label>
      {withCountry && (
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Country
          <input
            value={value.country}
            onChange={(e) => setValue({ ...value, country: e.target.value })}
            onKeyDown={onKeyDown}
            autoComplete="country-name"
            className={field}
          />
        </label>
      )}
      <div className="flex gap-2 pb-4 desk:pb-0">
        <Button type="button" variant="secondary" size="md" onClick={() => onSave(value)}>
          Save address
        </Button>
        {/* Nothing to go back to the first time */}
        {(!withCountry || defaultValue.address) && (
          <Button type="button" variant="ghost" size="md" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </section>
  );
}

/** What replaces the form once you've paid. */
function PaidState({
  method,
  total,
  today,
  owner,
  shipsIn,
  live,
  test,
}: {
  method: PayMethod;
  total: number;
  today: number;
  owner: string;
  shipsIn: string;
  live?: boolean;
  test?: boolean;
}) {
  const [title, body] = test
    ? ["Paid.", `${money(total)} on a test checkout, so no money actually moved. The order is real.`]
    : {
        paypal: ["Paid.", `PayPal is holding ${money(total)} until it arrives.`],
        card: ["Paid.", `PayPal is holding ${money(total)} until it arrives.`],
        later: ["Paid.", `You paid ${money(today)} today. PayPal is holding it until it arrives.`],
        agent: [`Sent to ${agent.name}.`, `It will ask you before it pays ${money(total)}.`],
      }[method];
  const ships = /day/.test(shipsIn) ? ` and ships within ${shipsIn}` : "";

  return (
    <section aria-live="polite" className="flex flex-col items-start gap-6 desk:pt-2">
      <span className="flex size-14 items-center justify-center rounded-full bg-leaf-100 text-leaf-600">
        <ShieldCheckIcon size={28} strokeWidth={2.2} />
      </span>
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-lg text-public-text-muted">{body}</p>
        <p className="text-base text-public-text-muted">
          {live
            ? `${owner} has the order. Follow it in your account, and say it's all good once it's in your hands.`
            : `${owner} has the order${ships}. You get a tracking link by email and in your account.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <SiteLink
          href="/account"
          className="inline-flex h-14 items-center rounded-full bg-leaf-600 px-7 text-base font-bold text-white hover:bg-leaf-900"
        >
          See it in your account
        </SiteLink>
        <SiteLink
          href="/discover"
          className="inline-flex h-14 items-center rounded-full border border-public-border px-7 text-base font-bold hover:bg-public-photo"
        >
          Keep shopping
        </SiteLink>
      </div>
    </section>
  );
}
