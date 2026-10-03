import { StoreFollowRow } from "../../../../../components/market/discover/store-follow-row";
import { stores } from "../../../../../lib/mock-market";

/** Every store on resell.store. No design; same language as P1's "Stores worth a follow". */
export default function StoresPage() {
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
      <ul className="grid gap-x-12 md:grid-cols-2">
        {stores.map((store) => (
          <li key={store.slug} className="border-b border-public-border py-6">
            <StoreFollowRow
              store={store}
              defaultFollowing={store.slug === "secondshutter"}
              detail={
                <>
                  <span className="block">{store.tagline}</span>
                  <span className="flex flex-wrap gap-x-1.5 pt-0.5">
                    <span className="whitespace-nowrap">{store.location}</span>
                    <span aria-hidden>·</span>
                    <span className="whitespace-nowrap">
                      ★ {store.rating.toFixed(1)} · {store.sold} sold
                    </span>
                  </span>
                </>
              }
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
