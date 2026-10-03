import Link from "next/link";
import { ChevronLeftIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { FlowBar, roundButton } from "../shops/parts";
import { EmptyState } from "../empty-state";
import { ActionLink, SectionTitle } from "./parts";
import { things, type SellerSummary } from "./summary";
import { PayPalPayoutRow, type PayoutPayPal } from "../seller-live/payout-row";

/*
 * B5 Sales and payouts, live, before the first sale. Same frame as the design:
 * the green payout card and "Ready to ship" on the left, recent sales on the
 * right. The payout card is honest: nothing owed yet, and whether PayPal is connected.
 * Once there's an order, the page shows seller-live/sales-live instead.
 */

function PayoutCard({ desk, paypal }: { desk: boolean; paypal: PayoutPayPal }) {
  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-xl bg-secondary text-on-secondary",
        desk ? "gap-5 p-7" : "gap-4 p-6",
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold text-leaf-100">
          Held until it arrives
        </span>
        <span
          className={cn(
            "font-display font-extrabold tracking-tight",
            desk ? "text-[72px] leading-[76px]" : "text-5xl",
          )}
        >
          $0
        </span>
        <span className="text-base text-leaf-100">
          When something sells, your share shows up here after fees.
        </span>
      </div>
      <PayPalPayoutRow
        paypal={paypal}
        className={cn("border-t pt-4", desk ? "border-white/30" : "border-leaf-300")}
      />
    </div>
  );
}

function NothingToShip() {
  return (
    <div className="flex w-full flex-col gap-1 rounded-lg border border-border bg-surface p-5">
      <span className="text-base font-bold">Nothing to ship</span>
      <span className="text-sm text-text-muted">
        When something sells, it shows up here with the address.
      </span>
    </div>
  );
}

function NoSales({ seller }: { seller: SellerSummary }) {
  let body: string;
  if (seller.sold > 0) {
    body = `${things(seller.sold)} marked as sold by hand. When someone buys through checkout, it shows up here.`;
  } else if (seller.live > 0) {
    body = `You have ${things(seller.live)} live. When one sells, it shows up here.`;
  } else {
    body = "List something. When it sells, the sale shows up here.";
  }

  return (
    <EmptyState
      art="payout"
      tone="leaf"
      title={seller.live > 0 ? "Your first sale goes here" : "Nothing sold yet"}
      actions={
        seller.live > 0 && seller.shopHref ? (
          <>
            <ActionLink href={seller.shopHref}>See your shop</ActionLink>
            <ActionLink href="/list/new" variant="soft">
              List another thing
            </ActionLink>
          </>
        ) : (
          <>
            <ActionLink href="/list/new">List something</ActionLink>
            {seller.shopHref && (
              <ActionLink href={seller.shopHref} variant="soft">
                See your shop
              </ActionLink>
            )}
          </>
        )
      }
    >
      {body}
    </EmptyState>
  );
}

export function SalesEmpty({ seller, paypal }: { seller: SellerSummary; paypal: PayoutPayPal }) {
  return (
    <>
      {/* ---------- Phone ---------- */}
      <div className="flex flex-col desk:hidden">
        <FlowBar
          left={
            <Link href="/me" aria-label="Back" className={roundButton}>
              <ChevronLeftIcon />
            </Link>
          }
          title="Sales and payouts"
        />
        <section className="px-4 pt-6">
          <PayoutCard desk={false} paypal={paypal} />
        </section>
        <section className="flex flex-col gap-2.5 px-4 pt-7">
          <h2 className="px-1 font-display text-xl font-extrabold tracking-[-0.02em]">
            Ready to ship
          </h2>
          <NothingToShip />
        </section>
        <section className="flex flex-col gap-2.5 px-4 pt-7 pb-9">
          <h2 className="px-1 font-display text-xl font-extrabold tracking-[-0.02em]">
            Recent sales
          </h2>
          <div className="rounded-lg border border-border bg-surface">
            <NoSales seller={seller} />
          </div>
        </section>
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden w-full flex-col gap-7 px-12 pt-8 pb-14 desk:flex">
        <h1 className="font-display text-3xl leading-[44px] font-extrabold tracking-tight">
          Sales and payouts
        </h1>
        <div className="flex flex-col items-start gap-7 xl:flex-row">
          <div className="flex w-full shrink-0 flex-col gap-7 xl:w-[400px]">
            <PayoutCard desk paypal={paypal} />
            <div className="flex flex-col gap-3">
              <SectionTitle>Ready to ship</SectionTitle>
              <NothingToShip />
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
            <SectionTitle>Recent sales</SectionTitle>
            <div className="rounded-xl border border-border bg-surface px-6">
              <NoSales seller={seller} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
