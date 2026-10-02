"use client";

import { useState } from "react";
import { cn } from "@repo/ui/lib/utils";

/** Follow / Following pill. Local state only in the prototype. */
export function FollowButton({
  storeName,
  defaultFollowing = false,
  className,
}: {
  storeName: string;
  defaultFollowing?: boolean;
  className?: string;
}) {
  const [following, setFollowing] = useState(defaultFollowing);
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={`${following ? "Unfollow" : "Follow"} ${storeName}`}
      onClick={() => setFollowing((f) => !f)}
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
