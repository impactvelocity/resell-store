"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";
import { ChatIcon, HeartIcon, SearchIcon } from "@repo/ui/icons";
import { Wordmark } from "@repo/ui/logo";
import { siteUrl } from "../../lib/urls";
import { SiteLink, useCurrentStore } from "./links";

const nav = [
  { label: "Shop", href: "/discover" },
  { label: "Stores", href: "/stores" },
  { label: "For your agent", href: "/agent" },
] as const;

/** Prototype: the buyer counts as signed in on their own pages. */
const signedInPaths = ["/account", "/messages"];

/**
 * The marketplace header, shared by resell.store and every store subdomain.
 * Desktop: logo, search, nav, account. Under 900px the search drops to its own row.
 */
export function MarketHeader({ signedIn: signedInProp }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const inStore = useCurrentStore() !== null;
  const signedIn =
    signedInProp ?? signedInPaths.some((p) => pathname.startsWith(p));
  const active = inStore ? null : nav.find((n) => pathname.startsWith(n.href));

  return (
    <header className="border-b border-public-border bg-public-background">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3 px-4 desk:h-[76px] desk:gap-8 desk:px-16">
        <SiteLink
          href="/discover"
          aria-label="resell.store"
          className="shrink-0 rounded-full"
        >
          <Wordmark size="sm" className="gap-2.5 [&_svg]:size-8" />
        </SiteLink>

        <SearchBox className="hidden desk:flex" />

        <nav className="hidden shrink-0 items-center gap-7 desk:flex">
          {nav.map((n) => (
            <SiteLink
              key={n.href}
              href={n.href}
              aria-current={active === n ? "page" : undefined}
              className={cn(
                "text-base font-medium hover:underline",
                // On a store, the store is part of Shop
                (active === n || (inStore && n.href === "/discover")) &&
                  "font-bold",
              )}
            >
              {n.label}
            </SiteLink>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 desk:ml-0">
          <SiteLink
            href="/account#favourites"
            aria-label="Favourites"
            className="flex size-11 items-center justify-center rounded-full border border-public-border hover:bg-public-photo"
          >
            <HeartIcon size={18} strokeWidth={2.2} />
          </SiteLink>
          {signedIn ? (
            <>
              <SiteLink
                href="/messages"
                aria-label="Messages, 2 unread"
                className="relative flex size-11 items-center justify-center rounded-full bg-leaf-900 text-white"
              >
                <ChatIcon size={18} />
                <span className="absolute top-0.5 right-0.5 size-2.5 rounded-full border-2 border-public-background bg-pink-400" />
              </SiteLink>
              <SiteLink
                href="/account"
                aria-label="Your account"
                className="flex size-11 items-center justify-center rounded-full bg-lemon-400 font-display text-xl font-extrabold"
              >
                M
              </SiteLink>
            </>
          ) : (
            <>
              <SiteLink
                href="/sign-in"
                className="hidden px-2 text-base font-semibold hover:underline sm:block"
              >
                Log in
              </SiteLink>
              <SiteLink
                href="/welcome"
                className="flex h-11 items-center rounded-full bg-leaf-900 px-4 text-sm font-semibold text-white hover:bg-leaf-600 sm:px-5 sm:text-base"
              >
                Start selling
              </SiteLink>
            </>
          )}
        </div>
      </div>

      {/* Phone: search and nav get their own rows */}
      <div className="flex flex-col gap-3 px-4 pb-3 desk:hidden">
        <SearchBox />
        <nav className="-mx-4 flex gap-5 overflow-x-auto px-4 text-sm">
          {nav.map((n) => (
            <SiteLink
              key={n.href}
              href={n.href}
              className={cn(
                "shrink-0 font-medium",
                active === n && "font-bold underline underline-offset-4",
              )}
            >
              {n.label}
            </SiteLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SearchBox({ className }: { className?: string }) {
  const inStore = useCurrentStore() !== null;
  return (
    <form
      role="search"
      // Search is always marketplace-wide; on a store subdomain it leaves for /discover
      action={inStore ? undefined : "/discover"}
      onSubmit={(e) => {
        if (!inStore) return;
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q");
        window.location.href = siteUrl(`/discover?q=${encodeURIComponent(String(q ?? ""))}`);
      }}
      className={cn(
        "flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-public-photo px-[18px] focus-within:outline-2 focus-within:outline-secondary",
        className,
      )}
    >
      <SearchIcon size={18} strokeWidth={2.2} className="shrink-0" />
      <Suspense fallback={<QueryInput />}>
        <CurrentQueryInput />
      </Suspense>
    </form>
  );
}

/** Keeps the box filled with the current search on /discover?q=… */
function CurrentQueryInput() {
  const q = useSearchParams().get("q") ?? "";
  return <QueryInput key={q} defaultValue={q} />;
}

function QueryInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <input
      name="q"
      type="search"
      defaultValue={defaultValue}
      placeholder="Search things, stores and sellers"
      aria-label="Search things, stores and sellers"
      className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-public-text-muted"
    />
  );
}
