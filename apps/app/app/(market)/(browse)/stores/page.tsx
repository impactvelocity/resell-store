import { EmptyState } from "../../../../components/empty-state";
import { StoreFollowRow } from "../../../../components/market/discover/store-follow-row";
import { SiteLink } from "../../../../components/market/links";
import { pillLink } from "../../../../components/market/parts";
import { followStates } from "../../../../lib/server/follows";
import { listStores, publicViewer } from "../../../../lib/server/market";
import { withRatings } from "../../../../lib/server/reviews";
import { StarIcon } from "../../../../components/reviews/review-parts";
import { siteShare } from "../../../../lib/og";

export const metadata = siteShare(
  "/stores",
  "Stores · resell.store",
  "Each one is a person with things to sell. Follow the ones you like on resell.store.",
);

/** Every store on resell.store. No design; same language as P1's "Stores worth a follow". */
export default async function StoresPage() {
  const [stores, viewer] = await Promise.all([listStores().then(withRatings), publicViewer()]);
  const follows = await followStates(viewer?.id, stores.map((s) => s.slug));

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-8 pb-14 desk:gap-8 desk:px-16 desk:pt-12 desk:pb-[72px]">
      <div className="flex flex-col gap-2 border-b border-public-border pb-6 desk:flex-row desk:items-end desk:justify-between desk:gap-8 desk:pb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight desk:text-4xl">
          Stores
        </h1>
        <p className="text-base text-public-text-muted desk:text-right">
          Each one is a person with things to sell. Follow the ones you like.
        </p>
      </div>
      {stores.length === 0 ? (
        <EmptyState
          surface="public"
          size="lg"
          art="items"
          sticker="Opening soon"
          tone="pink"
          title="The first stores are opening"
          actions={
            <SiteLink href="/welcome" className={pillLink.primary}>
              Open your store
            </SiteLink>
          }
          footnote="Every store gets its own address, like yours.resell.store."
        >
          Nobody has opened their doors yet. Open yours and it&apos;s the first thing people see
          here.
        </EmptyState>
      ) : (
        <ul className="grid gap-x-12 md:grid-cols-2">
          {stores.map((store) => (
            <li key={store.slug} className="border-b border-public-border py-6">
              <StoreFollowRow
                store={store}
                follow={follows[store.slug]}
                detail={
                  <>
                    <span className="block">{store.tagline}</span>
                    <span className="flex flex-wrap gap-x-1.5 pt-0.5">
                      {[
                        store.rating != null && store.ratings ? (
                          <span className="inline-flex items-center gap-1">
                            <StarIcon size={13} />
                            <span aria-hidden>
                              <span className="font-semibold text-text">{store.rating.toFixed(1)}</span> ({store.ratings})
                            </span>
                            <span className="sr-only">
                              Rated {store.rating.toFixed(1)} from {store.ratings} {store.ratings === 1 ? "review" : "reviews"}
                            </span>
                          </span>
                        ) : null,
                        store.location,
                        store.forSale > 0 ? `${store.forSale} for sale` : "Opening soon",
                        store.sold > 0 ? `${store.sold} sold` : null,
                      ]
                        .filter(Boolean)
                        .map((part, i) => (
                          <span key={i} className="whitespace-nowrap">
                            {i > 0 && (
                              <span aria-hidden className="pr-1.5">
                                ·
                              </span>
                            )}
                            {part}
                          </span>
                        ))}
                    </span>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
