import type { PublicStore } from "../../../lib/mock-market";
import { StoreLink } from "../links";
import { StoreAvatar } from "../parts";
import { StarIcon } from "../../reviews/review-parts";
import { FollowButton, type FollowLive } from "./follow-button";

/** Avatar, name and a line of detail, with a Follow button at the end. */
export function StoreFollowRow({
  store,
  detail,
  defaultFollowing,
  follow,
}: {
  store: PublicStore;
  detail?: React.ReactNode;
  defaultFollowing?: boolean;
  /** Live stores: saves the follow, starting from the server's state */
  follow?: FollowLive | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <StoreLink store={store.slug} tabIndex={-1} aria-hidden className="shrink-0">
        <StoreAvatar store={store} size={56} />
      </StoreLink>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <StoreLink
          store={store.slug}
          className="w-fit text-base font-bold hover:underline"
        >
          {store.name}
        </StoreLink>
        <div className="text-sm text-public-text-muted">
          {detail ?? (
            <>
              {/* Live stores with reviews: their stars before the tagline */}
              {store.live && store.rating != null && !!store.ratings && (
                <span className="mr-1.5 inline-flex items-center gap-1 align-[-2px]">
                  <StarIcon size={13} />
                  <span aria-hidden>
                    <span className="font-semibold text-text">{store.rating.toFixed(1)}</span> ({store.ratings})
                  </span>
                  <span className="sr-only">
                    Rated {store.rating.toFixed(1)} from {store.ratings} {store.ratings === 1 ? "review" : "reviews"}.
                  </span>
                </span>
              )}
              {store.tagline}
            </>
          )}
        </div>
      </div>
      <FollowButton storeName={store.name} defaultFollowing={defaultFollowing} live={follow} />
    </div>
  );
}
