"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { useToast } from "@repo/ui/toast";
import { setFollow } from "../../../app/actions/follows";
import { signInHref } from "../../../lib/safe-next";
import { siteUrl } from "../../../lib/urls";
import { useCurrentStore } from "../links";

/** A live Follow button's starting point, from the server. */
export type FollowLive = { shopId: string; following: boolean; own?: boolean };

/**
 * Follow state for one shop. With `live` it saves: the button flips straight
 * away, flips back with a toast if saving fails, and signed-out people go to
 * sign in and come back here. Without it (the prototype) it's local only.
 */
export function useFollow(storeName: string, live?: FollowLive | null, defaultFollowing = false) {
  const router = useRouter();
  const toast = useToast();
  const store = useCurrentStore();
  const [following, setFollowing] = useState(live?.following ?? defaultFollowing);
  const saving = useRef(false);

  async function toggle() {
    const next = !following;
    if (!live) return setFollowing(next);
    if (saving.current) return;
    saving.current = true;
    setFollowing(next);
    const res = await setFollow({ shopId: live.shopId, following: next }).catch(() => null);
    saving.current = false;
    if (res?.ok) return;
    setFollowing(!next);
    if (res?.signin) {
      // Stores live on their own subdomain; /store/{slug}/… on the marketplace leads back there
      const here = store
        ? `/store/${store}${window.location.pathname}`
        : `${window.location.pathname}${window.location.search}`;
      const href = signInHref(here);
      if (store) window.location.assign(siteUrl(href));
      else router.push(href);
      return;
    }
    toast.add({ title: res?.error ?? `Couldn't follow ${storeName}. Try again?` });
  }

  return { following, toggle };
}

/** Follow / Following pill. Saves with `live`; local state only in the prototype. */
export function FollowButton({
  storeName,
  defaultFollowing = false,
  live,
  className,
}: {
  storeName: string;
  defaultFollowing?: boolean;
  live?: FollowLive | null;
  className?: string;
}) {
  const { following, toggle } = useFollow(storeName, live, defaultFollowing);
  // Nobody follows their own shop
  if (live?.own) return null;
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={`${following ? "Unfollow" : "Follow"} ${storeName}`}
      onClick={toggle}
      className={cn(
        "inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full border px-[18px] text-sm font-semibold transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        following
          ? "border-transparent bg-leaf-100 text-leaf-600 hover:bg-leaf-300/50"
          : "border-leaf-900 text-text hover:bg-public-photo",
        className,
      )}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
