"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Chip, ChipGroup } from "@repo/ui/chip";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { AgentAvatar } from "../agent-chat/agent-chat";
import { MobileBackHeader } from "../shell/page";
import {
  getThread,
  inboxFilters,
  inboxItems,
  inboxSections,
  type InboxFilter,
  type InboxItem,
  type ThreadMessage,
} from "../../lib/mock-inbox";
import { ThreadPane } from "./thread-pane";

/*
 * A5 Inbox. Desktop: list and thread side by side. Phone: the list at /inbox,
 * the thread full screen at /inbox/<id>. Rendered from the inbox layout so the
 * list keeps its state (filter, read dots, sent messages) between the two.
 */

function ShipIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8h11v9H3zM14 11h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17.5" cy="18" r="1.8" />
    </svg>
  );
}

function ItemIcon({ icon }: { icon: InboxItem["icon"] }) {
  const base =
    "flex size-10 shrink-0 items-center justify-center rounded-full";
  switch (icon.kind) {
    case "money":
      return (
        <span
          className={cn(
            base,
            "bg-primary font-display text-lg leading-6 font-extrabold text-on-primary",
          )}
        >
          $
        </span>
      );
    case "ship":
      return (
        <span className={cn(base, "bg-secondary text-on-secondary")}>
          <ShipIcon />
        </span>
      );
    case "agent":
      return <AgentAvatar size="lg" />;
    case "person":
      return (
        <span
          className={cn(
            base,
            "bg-accent-soft font-display text-lg leading-6 font-extrabold text-text",
          )}
        >
          {icon.initial}
        </span>
      );
  }
}

function InboxRow({
  item,
  unread,
  selected,
  onOpen,
}: {
  item: InboxItem;
  unread: boolean;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <Link
      href={`/inbox/${item.id}`}
      onClick={onOpen}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border py-[14px] transition-colors last:border-b-0",
        "desk:rounded-lg desk:border-b-0 desk:p-3 desk:hover:bg-surface-muted",
        selected && "desk:bg-primary-soft desk:hover:bg-primary-soft",
      )}
    >
      <ItemIcon icon={item.icon} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn(
            "text-base text-text",
            item.section === "needs-you" ? "font-bold" : "font-semibold desk:font-bold",
          )}
        >
          {item.title}
        </div>
        <div className="text-sm text-text-muted">{item.summary}</div>
      </div>
      <div className="flex w-[52px] shrink-0 flex-col items-end gap-1.5 desk:w-auto">
        <span className="text-sm font-medium text-text-muted">{item.time}</span>
        {unread && (
          <span
            aria-label="Unread"
            className="size-[10px] shrink-0 rounded-full bg-accent desk:size-2"
          />
        )}
      </div>
    </Link>
  );
}

export function InboxView() {
  const params = useParams<{ threadId?: string }>();
  const threadId = params.threadId;
  const toast = useToast();

  const [filter, setFilter] = useState<InboxFilter>("all");
  const [unread, setUnread] = useState<Set<string>>(
    () => new Set(inboxItems.filter((i) => i.unread).map((i) => i.id)),
  );
  const [extra, setExtra] = useState<Record<string, ThreadMessage[]>>({});

  const thread = getThread(threadId);
  const selectedId = threadId ?? inboxItems[0]!.id;

  const visible = inboxItems.filter(
    (i) => filter === "all" || i.category === filter,
  );

  function markRead(id: string) {
    setUnread((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className="flex w-full flex-col desk:h-dvh desk:gap-5 desk:px-8 desk:pt-8 desk:pb-10 xl:px-12">
      {threadId && <MobileBackHeader title={thread.person} backHref="/inbox" />}

      <header
        className={cn(
          "flex flex-wrap items-center justify-between px-5 pt-[max(12px,env(safe-area-inset-top))] desk:flex-nowrap desk:gap-5 desk:px-0 desk:pt-0",
          threadId && "hidden desk:flex",
        )}
      >
        <h1 className="order-1 font-display text-3xl font-extrabold tracking-tight text-text desk:leading-[44px]">
          Inbox
        </h1>
        <button
          type="button"
          onClick={() => {
            setUnread(new Set());
            toast.add({ title: "All caught up" });
          }}
          className="order-2 cursor-pointer text-sm font-bold text-secondary hover:underline desk:order-3"
        >
          Mark all read
        </button>
        <ChipGroup
          aria-label="Show"
          value={[filter]}
          onValueChange={(value: string[]) => {
            const next = value[value.length - 1] as InboxFilter | undefined;
            if (next) setFilter(next);
          }}
          className="order-3 -mx-5 mt-5 w-[calc(100%+40px)] flex-nowrap overflow-x-auto px-4 [scrollbar-width:none] desk:order-2 desk:mx-0 desk:mt-0 desk:mr-auto desk:w-auto desk:gap-1.5 desk:px-0"
        >
          {inboxFilters.map((f) => (
            <Chip key={f.key} value={f.key} className="gap-1.5 px-4 first:px-[18px] desk:first:px-4">
              {f.label}
              {f.count !== undefined && (
                <span className="font-bold text-accent-text in-data-pressed:text-pink-100">
                  {f.count}
                </span>
              )}
            </Chip>
          ))}
        </ChipGroup>
      </header>

      <div className="flex w-full desk:min-h-0 desk:flex-1 desk:gap-5">
        {/* List */}
        <nav
          aria-label="Conversations"
          className={cn(
            "flex w-full flex-col desk:w-[300px] desk:shrink-0 lg:w-[340px] xl:w-[400px] desk:gap-1 desk:overflow-y-auto desk:rounded-xl desk:border desk:border-border desk:bg-surface desk:px-3 desk:py-4",
            threadId && "hidden desk:flex",
          )}
        >
          {inboxSections.map((section, si) => {
            const items = visible.filter((i) => i.section === section.key);
            if (!items.length) return null;
            return (
              <section
                key={section.key}
                className="flex flex-col gap-[10px] px-4 pt-[28px] desk:gap-1 desk:px-0 desk:pt-0"
              >
                <h2
                  className={cn(
                    "px-1 text-sm font-semibold tracking-wide text-text-muted uppercase desk:px-3 desk:pb-[6px]",
                    si === 0 ? "desk:pt-[6px]" : "desk:pt-[14px]",
                  )}
                >
                  {section.label}
                </h2>
                <div className="flex flex-col rounded-lg border border-border bg-surface px-4 py-0.5 desk:gap-1 desk:rounded-none desk:border-0 desk:bg-transparent desk:p-0">
                  {items.map((item) => (
                    <InboxRow
                      key={item.id}
                      item={item}
                      unread={unread.has(item.id)}
                      selected={item.id === selectedId}
                      onOpen={() => markRead(item.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          {visible.length === 0 && (
            <p className="px-5 pt-8 text-base text-text-muted">Nothing here.</p>
          )}
        </nav>

        {/* Thread */}
        <ThreadPane
          key={thread.id}
          thread={thread}
          extra={extra[thread.id] ?? []}
          onSend={(message) =>
            setExtra((prev) => ({
              ...prev,
              [thread.id]: [...(prev[thread.id] ?? []), message],
            }))
          }
          className={cn(
            "w-full px-4 pt-5 pb-6 desk:min-w-0 desk:flex-1 desk:rounded-xl desk:border desk:border-border desk:bg-surface desk:p-7",
            !threadId && "hidden desk:flex",
          )}
        />
      </div>
    </div>
  );
}
