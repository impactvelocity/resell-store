"use client";

import { useViewer } from "../viewer";

/**
 * The bell's count: things waiting in the inbox (offers to answer, sales to
 * ship, unread messages). Nothing at all when the inbox has nothing new.
 */
export function BellBadge() {
  const { inboxCount } = useViewer();
  if (inboxCount <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs leading-none font-bold text-white ring-2 ring-background">
      {inboxCount > 9 ? "9+" : inboxCount}
    </span>
  );
}

/** "Notifications, 3 new" for screen readers. */
export function BellLabel() {
  const { inboxCount } = useViewer();
  return <span className="sr-only">{inboxCount > 0 ? `Inbox, ${inboxCount} new` : "Inbox"}</span>;
}
