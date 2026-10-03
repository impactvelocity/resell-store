import type { Metadata } from "next";
import { and, db, desc, eq, isNotNull, listing, shop } from "@repo/db";
import { Wordmark } from "@repo/ui/logo";
import { cn } from "@repo/ui/lib/utils";
import {
  screenGroups,
  screenStatuses,
  type LiveContext,
  type Screen,
  type ScreenStatus,
} from "../../lib/screens";
import { getCurrentUser } from "../../lib/server/session";
import { listOwnedShops } from "../../lib/server/shops";

export const metadata: Metadata = {
  title: "Screens · resell.store",
};

/*
 * Index of every designed screen, each with two ways in: Live (the real app)
 * and Mock (the front-end prototype under app/mock, via the rs_view cookie).
 * Signed in, Live links point at your own shop and listings.
 */

async function loadLiveContext(): Promise<LiveContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const [shops, [latest], [published]] = await Promise.all([
    listOwnedShops(user.id),
    db
      .select({ id: listing.id })
      .from(listing)
      .innerJoin(shop, eq(listing.shopId, shop.id))
      .where(eq(shop.ownerId, user.id))
      .orderBy(desc(listing.updatedAt))
      .limit(1),
    db
      .select({ shop: shop.slug, slug: listing.slug })
      .from(listing)
      .innerJoin(shop, eq(listing.shopId, shop.id))
      .where(and(eq(shop.ownerId, user.id), eq(listing.status, "live"), isNotNull(listing.slug)))
      .orderBy(desc(listing.publishedAt))
      .limit(1),
  ]);
  return {
    shop: shops[0]?.slug ?? null,
    listing: latest ?? null,
    published: published?.slug ? { shop: published.shop, slug: published.slug } : null,
  };
}

/**
 * The screen's URL with the live/mock switch on it. Screens whose URL already
 * uses ?view= go through /screens/open so the two don't clash.
 */
function withView(href: string, view: "live" | "mock") {
  const [path, hash = ""] = href.split("#") as [string, string?];
  if (/[?&]view=/.test(path)) {
    return `/screens/open?as=${view}&to=${encodeURIComponent(href)}`;
  }
  return `${path}${path.includes("?") ? "&" : "?"}view=${view}${hash ? `#${hash}` : ""}`;
}

/** Strip the dev origin so absolute store URLs read like paths. */
function displayHref(href: string) {
  return href.replace(/^https?:\/\//, "");
}

const statusTone: Record<ScreenStatus, string> = {
  live: "bg-secondary-soft text-secondary",
  empty: "bg-primary-soft text-text",
  soon: "bg-accent-soft text-accent-text",
};

function StatusPill({ status }: { status: ScreenStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold",
        statusTone[status],
      )}
    >
      {status === "live" && <span aria-hidden className="size-1.5 rounded-full bg-secondary" />}
      {screenStatuses[status].label}
    </span>
  );
}

const linkClass =
  "inline-flex h-8 items-center rounded-full px-3 text-sm font-bold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

function ScreenRow({ screen, ctx }: { screen: Screen; ctx: LiveContext | null }) {
  const liveHref = (ctx && screen.live?.(ctx)) || screen.href;
  return (
    <li className="flex items-start gap-3 rounded-md px-3 py-3 transition-colors hover:bg-surface">
      <span className="w-9 shrink-0 pt-0.5 font-mono text-sm text-text-muted">{screen.code}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-bold">{screen.name}</span>
          <StatusPill status={screen.status} />
        </div>
        <span className="truncate font-mono text-xs text-text-muted" title={liveHref}>
          {displayHref(liveHref)}
        </span>
        {screen.note && <span className="text-sm text-text-muted">{screen.note}</span>}
        <div className="flex items-center gap-1.5 pt-0.5">
          <a
            href={withView(liveHref, "live")}
            className={cn(linkClass, "bg-secondary text-on-secondary hover:bg-leaf-900")}
          >
            Live
          </a>
          <a
            href={withView(screen.href, "mock")}
            className={cn(
              linkClass,
              "border-[1.5px] border-pink-400 bg-pink-100 text-leaf-900 hover:bg-pink-400/30",
            )}
          >
            Mock
          </a>
        </div>
      </div>
    </li>
  );
}

export default async function ScreensPage() {
  const ctx = await loadLiveContext();
  const counts = screenGroups
    .flatMap((g) => g.screens)
    .reduce<Record<ScreenStatus, number>>(
      (acc, s) => ({ ...acc, [s.status]: acc[s.status] + 1 }),
      { live: 0, empty: 0, soon: 0 },
    );

  return (
    <main className="mx-auto flex w-full max-w-page flex-col gap-10 px-4 py-10 desk:px-12 desk:py-16">
      <div className="flex flex-col gap-4">
        <Wordmark size="sm" />
        <h1 className="font-display text-4xl font-extrabold tracking-tight desk:text-5xl">
          Every screen
        </h1>
        <p className="max-w-2xl text-lg text-text-muted">
          Each screen opens two ways. <strong className="text-text">Live</strong> is
          the real app: your account, your shops, real data, and an honest empty
          state where there&apos;s nothing behind it yet.{" "}
          <strong className="text-text">Mock</strong> is the clickable prototype from
          the design, with made-up data. Mock sticks (it&apos;s a cookie) until you
          open something Live or flip the pill in the corner.
        </p>
        <p className="max-w-2xl text-base text-text-muted">
          {ctx
            ? "Live links go to your own shop and latest listing where a screen needs one."
            : "Sign in and Live links go to your own shop and listings. Signed out, they use the design's examples."}{" "}
          Resize under 900px to see the phone layout.
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
          {(Object.keys(screenStatuses) as ScreenStatus[]).map((status) => (
            <li key={status} className="flex items-center gap-2 text-sm text-text-muted">
              <StatusPill status={status} />
              <span>
                {screenStatuses[status].description}{" "}
                <span className="font-semibold text-text">({counts[status]})</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-8 md:grid-cols-2 desk:grid-cols-3 xl:grid-cols-5">
        {screenGroups.map((group) => (
          <section key={group.key} className="flex flex-col gap-3">
            <h2 className="px-3 text-sm font-semibold tracking-wide text-text-muted uppercase">
              {group.key}, {group.title}
            </h2>
            <ul className="flex flex-col gap-1">
              {group.screens.map((screen) => (
                <ScreenRow key={screen.code} screen={screen} ctx={ctx} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
