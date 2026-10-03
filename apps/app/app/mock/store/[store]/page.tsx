import { notFound } from "next/navigation";
import { SiteLink } from "../../../../components/market/links";
import { StoreIntro } from "../../../../components/market/store/store-intro";
import { StoreShelves } from "../../../../components/market/store/store-shelves";
import { getStore, reviews, soldItems, storeListings } from "../../../../lib/mock-market";

/** P2: a store's home page, e.g. maya.resell.store. */
export default async function StorePage({ params }: { params: Promise<{ store: string }> }) {
  const store = getStore((await params).store);
  if (!store) notFound();

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 pt-8 pb-[72px] desk:px-16">
      <nav aria-label="Breadcrumb" className="text-sm text-public-text-muted">
        <SiteLink href="/stores" className="hover:text-text hover:underline">
          Stores
        </SiteLink>{" "}
        / <span aria-current="page">{store.name}</span>
      </nav>

      <StoreIntro store={store} />

      <StoreShelves
        store={store}
        listings={storeListings(store.slug)}
        sold={soldItems[store.slug] ?? []}
        reviews={reviews[store.slug] ?? []}
      />
    </main>
  );
}
