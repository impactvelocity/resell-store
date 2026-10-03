import {
  AccountNav,
  OfferRow,
  OrderRow,
  SeeAllOrders,
} from "../../../../../components/market/buyer/account";
import { ShieldIcon } from "../../../../../components/market/buyer/chat-parts";
import { SiteLink, StoreLink } from "../../../../../components/market/links";
import { ListingCard, StoreAvatar } from "../../../../../components/market/parts";
import {
  accountCounts,
  favourites,
  following,
  offers,
  orders,
} from "../../../../../lib/mock-buyer";
import { findListing, getStore } from "../../../../../lib/mock-market";

/** P8 Buyer account: what needs Maya today, then orders, offers, follows and favourites. */
export default function AccountPage() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-6 pb-16 desk:flex-row desk:items-start desk:gap-12 desk:px-16 desk:pt-14 desk:pb-20 xl:gap-[72px]">
      <AccountNav />

      <main className="flex min-w-0 flex-1 flex-col gap-12 desk:gap-14">
        <section
          id="overview"
          className="flex scroll-mt-8 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="flex flex-col gap-2.5">
            <h1 className="font-display text-4xl font-extrabold tracking-tight">Hi Maya.</h1>
            <p className="text-lg text-public-text-muted">
              Two things need you today: a counter offer and a chair to check.
            </p>
          </div>
          <p className="flex h-9 w-fit shrink-0 items-center gap-2 rounded-full bg-leaf-100 px-3.5 text-sm font-semibold text-leaf-600">
            <ShieldIcon />
            $144 of yours held safely by PayPal
          </p>
        </section>

        <section id="orders" className="flex scroll-mt-8 flex-col gap-2">
          <SectionHead title="Orders">
            <SeeAllOrders />
          </SectionHead>
          <ul className="flex flex-col">
            {orders.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
        </section>

        <section id="offers" className="flex scroll-mt-8 flex-col gap-2">
          <SectionHead title="Offers">
            <SiteLink href="/messages?thread=secondshutter" className={seeAll}>
              See all offers
            </SiteLink>
          </SectionHead>
          <ul className="flex flex-col">
            {offers.map((o) => (
              <OfferRow key={o.id} offer={o} />
            ))}
          </ul>
        </section>

        <section id="following" className="flex scroll-mt-8 flex-col gap-5">
          <SectionHead title="Stores you follow">
            <SiteLink href="/stores" className={seeAll}>
              See all {accountCounts.following}
            </SiteLink>
          </SectionHead>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] desk:mx-0 desk:flex-wrap desk:gap-4 desk:overflow-visible desk:px-0">
            {following.map(({ store: slug, fresh }) => {
              const store = getStore(slug)!;
              return (
                <li key={slug} className="w-[96px] shrink-0 desk:w-[112px]">
                  <StoreLink
                    store={slug}
                    className="group flex flex-col items-center gap-2 rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  >
                    <span className="relative">
                      <StoreAvatar store={store} size={64} />
                      {fresh && (
                        <span className="absolute top-0 right-0 size-3.5 rounded-full border-2 border-white bg-pink-400">
                          <span className="sr-only">New listings</span>
                        </span>
                      )}
                    </span>
                    <span className="text-center text-sm font-medium group-hover:underline">
                      {store.name}
                    </span>
                  </StoreLink>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="favourites" className="flex scroll-mt-8 flex-col gap-5">
          <SectionHead title="Favourites">
            <SiteLink href="/discover" className={seeAll}>
              See all {accountCounts.favourites}
            </SiteLink>
          </SectionHead>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-6">
            {favourites.map((slug) => (
              <ListingCard key={slug} listing={findListing(slug)!} defaultLiked />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

const seeAll = "text-sm font-semibold whitespace-nowrap text-leaf-600 hover:underline";

function SectionHead({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
