import Link from "next/link";
import { cn } from "@repo/ui/lib/utils";

/*
 * The list of conversations beside (or, on a phone, instead of) the open one.
 * Unread ones are bold with a dot; read ones stay, quieter.
 */

export type ThreadListItem = {
  id: string;
  withName: string;
  initial: string;
  listing: { title: string; photo: string | null } | null;
  preview: string;
  lastMine: boolean;
  /** The last message is the shop's agent answering. */
  lastByAgent?: boolean;
  /** Seller side: the agent handed this one over. */
  needsYou?: boolean;
  lastMessageAt: Date;
  unread: boolean;
};

/** "3:04 pm" today, "Tue" this week, "Oct 2" before that. */
export function shortWhen(date: Date, now = new Date()) {
  const days = (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  if (days < 6) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ThreadRow({
  item,
  href,
  active,
  tone,
}: {
  item: ThreadListItem;
  href: string;
  active?: boolean;
  tone: "app" | "public";
}) {
  const muted = tone === "app" ? "text-text-muted" : "text-public-text-muted";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg p-3 transition-colors",
        tone === "app" ? "hover:bg-surface-muted" : "hover:bg-public-photo",
        active && (tone === "app" ? "bg-primary-soft hover:bg-primary-soft" : "bg-public-photo"),
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md font-display text-lg font-extrabold",
          tone === "app" ? "bg-accent-soft" : "bg-public-photo",
        )}
      >
        {item.listing?.photo ? <img src={item.listing.photo} alt="" className="size-full object-cover" /> : item.initial}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-base", item.unread ? "font-bold" : "font-semibold")}>
            {item.withName}
          </span>
          <span className={cn("shrink-0 text-xs", item.unread ? "font-bold text-accent-text" : muted)}>
            {shortWhen(item.lastMessageAt)}
          </span>
        </span>
        {item.listing && <span className={cn("truncate text-sm", muted)}>{item.listing.title}</span>}
        <span className={cn("flex items-center gap-2 text-sm", item.unread ? "font-semibold text-text" : muted)}>
          <span className="min-w-0 flex-1 truncate">
            {item.lastMine ? (item.lastByAgent ? "Your agent: " : "You: ") : ""}
            {item.preview}
          </span>
          {item.needsYou ? (
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-text">
              Needs you
            </span>
          ) : (
            item.unread && <span aria-label="Unread" className="size-2.5 shrink-0 rounded-full bg-accent" />
          )}
        </span>
      </span>
    </Link>
  );
}
