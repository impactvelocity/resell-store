import type { Store } from "../../../lib/mock-market";
import { StoreLink } from "../links";
import { StoreAvatar } from "../parts";
import { FollowButton } from "./follow-button";

/** Avatar, name and a line of detail, with a Follow button at the end. */
export function StoreFollowRow({
  store,
  detail,
  defaultFollowing,
}: {
  store: Store;
  detail?: React.ReactNode;
  defaultFollowing?: boolean;
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
          {detail ?? store.tagline}
        </div>
      </div>
      <FollowButton storeName={store.name} defaultFollowing={defaultFollowing} />
    </div>
  );
}
