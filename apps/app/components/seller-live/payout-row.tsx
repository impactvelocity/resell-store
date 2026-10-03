import Link from "next/link";
import { ChevronRightIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";

/** Where the seller's PayPal stands: no keys on the server, not connected, or connected. */
export type PayoutPayPal = "off" | "connect" | "connected";

/**
 * The last line of the green payout card (B5). Gone once PayPal is connected:
 * the card's numbers already say where the money goes.
 */
export function PayPalPayoutRow({ paypal, className }: { paypal: PayoutPayPal; className?: string }) {
  if (paypal === "connected") return null;
  if (paypal === "connect")
    return (
      <Link
        href="/tools/connections"
        className={cn("group flex items-center gap-2.5 text-sm font-bold outline-none focus-visible:underline", className)}
      >
        <span className="flex-1 group-hover:underline">Connect PayPal to get paid</span>
        <ChevronRightIcon size={18} strokeWidth={2.4} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex-1 text-sm font-bold">Payouts to PayPal</span>
      <span className="inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-sm font-bold text-on-primary">
        Soon
      </span>
    </div>
  );
}
