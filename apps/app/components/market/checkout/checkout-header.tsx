"use client";

import { ChevronLeftIcon, LockIcon } from "@repo/ui/icons";
import { Wordmark } from "@repo/ui/logo";
import { SiteLink, StoreLink } from "../links";

/**
 * The slim header on checkout and offers. Desktop: wordmark, "Secure checkout",
 * a way back to the listing. Under 900px: back button, centred title, lock.
 */
export function CheckoutHeader({
  store,
  listing,
  title,
}: {
  store: string;
  listing: string;
  /** Centred on phones */
  title: string;
}) {
  return (
    <header className="border-b border-public-border bg-public-background">
      <div className="mx-auto hidden h-[76px] max-w-[1440px] items-center justify-between px-16 desk:flex">
        <SiteLink href="/discover" aria-label="resell.store" className="shrink-0 rounded-full">
          <Wordmark size="sm" className="gap-2.5 [&_svg]:size-8" />
        </SiteLink>
        <div className="flex items-center gap-7">
          <span className="flex items-center gap-2 text-sm font-semibold text-leaf-600">
            <LockIcon size={16} strokeWidth={2.4} />
            Secure checkout
          </span>
          <StoreLink
            store={store}
            href={`/${listing}`}
            className="text-sm font-semibold hover:underline"
          >
            Back to the listing
          </StoreLink>
        </div>
      </div>

      <div className="flex h-16 items-center justify-between px-4 desk:hidden">
        <StoreLink
          store={store}
          href={`/${listing}`}
          aria-label="Back to the listing"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-public-border hover:bg-public-photo"
        >
          <ChevronLeftIcon size={18} strokeWidth={2.4} />
        </StoreLink>
        <span className="font-display text-xl font-extrabold tracking-tight">{title}</span>
        <span
          role="img"
          aria-label="Secure checkout"
          className="flex size-10 shrink-0 items-center justify-center text-leaf-600"
        >
          <LockIcon size={18} strokeWidth={2.4} />
        </span>
      </div>
    </header>
  );
}
