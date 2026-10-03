import Link from "next/link";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { likedListingIds } from "../../lib/server/likes";
import { publicViewer, searchListings } from "../../lib/server/market";
import { LikesProvider } from "../market/likes";
import { ListingCard } from "../market/parts";
import { Reveal } from "./motion";
import { bigButton, Container, Headline } from "./parts";

/* The newest real listings, so the landing page shows what's actually for sale. */

const SLOTS = 4;

/** Fills the row while there are fewer than four things for sale. */
function OpenSlot({ signedIn }: { signedIn: boolean }) {
  return (
    <Link
      href={signedIn ? "/list/new" : "/welcome"}
      className="group flex min-w-0 flex-col gap-3.5 outline-none"
    >
      <span className="flex aspect-[310/330] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-public-border px-4 text-center transition-colors group-hover:border-leaf-600 group-hover:bg-leaf-100/40 group-focus-visible:border-leaf-600">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary font-display text-2xl font-extrabold text-on-primary transition-transform group-hover:rotate-90">
          +
        </span>
        <span className="text-base font-bold">Your thing here</span>
        <span className="text-sm text-public-text-muted">List something and it shows up for everyone</span>
      </span>
    </Link>
  );
}

export async function ForBuyers() {
  const [{ listings, total, stores }, viewer] = await Promise.all([
    searchListings({ sort: "newest", limit: SLOTS }),
    publicViewer(),
  ]);
  const liked = viewer ? await likedListingIds(viewer.id) : [];
  const open = Math.max(0, SLOTS - listings.length);

  return (
    <section className="border-y border-border bg-public-background">
      <Container className="flex flex-col gap-14 py-20 md:py-28">
        <Reveal className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="flex max-w-[720px] flex-col gap-5">
            <Headline>Good things, fair prices, real closets</Headline>
            <p className="max-w-[620px] text-lg text-public-text-muted md:text-xl md:leading-[30px]">
              Browse every shop in one marketplace. Make an offer, or send your
              own agent to find the deal. Your money is held by PayPal until it
              arrives.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
            <Button
              variant="secondary"
              className={bigButton}
              render={<Link href="/discover" />}
              nativeButton={false}
            >
              Try the marketplace
            </Button>
            <Button
              variant="soft"
              className={cn(
                bigButton,
                "border border-leaf-900 bg-transparent px-7",
              )}
              render={<Link href="/agent" />}
              nativeButton={false}
            >
              Connect your agent
            </Button>
          </div>
        </Reveal>
        <LikesProvider liked={liked}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:gap-6 lg:grid-cols-4">
            {listings.map((listing, i) => (
              <Reveal key={listing.id ?? listing.slug} delay={i * 0.08} y={36}>
                <ListingCard listing={listing} />
              </Reveal>
            ))}
            {Array.from({ length: open }, (_, i) => (
              <Reveal key={`open-${i}`} delay={(listings.length + i) * 0.08} y={36}>
                <OpenSlot signedIn={!!viewer} />
              </Reveal>
            ))}
          </div>
        </LikesProvider>
        {total > listings.length && (
          <Link
            href="/discover"
            className="w-fit self-center text-base font-bold text-secondary hover:underline"
          >
            See all {total} things from {stores} {stores === 1 ? "shop" : "shops"}
          </Link>
        )}
      </Container>
    </section>
  );
}
