"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeftIcon, SparkleIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { readThread, reply, startThread } from "../../app/actions/messages";
import { signInHref } from "../../lib/safe-next";

/*
 * One conversation between a buyer and a shop, for both sides: the buyer's
 * Messages (marketplace colours) and the seller's Inbox (app colours). New
 * messages from the other side arrive by polling while the tab is visible.
 */

export type ConversationMessage = {
  id: string;
  mine: boolean;
  /** Written by the shop's agent (on the seller's side). */
  byAgent?: boolean;
  body: string;
  createdAt: string;
};

type Tone = "app" | "public";

const tones = {
  app: {
    frame: "bg-surface",
    border: "border-border",
    muted: "text-text-muted",
    theirs: "bg-surface-muted text-text",
    input: "border-border bg-background focus-within:border-secondary",
    photo: "bg-surface-muted",
  },
  public: {
    frame: "bg-public-background",
    border: "border-public-border",
    muted: "text-public-text-muted",
    theirs: "bg-public-photo text-text",
    input: "border-public-border bg-public-background focus-within:border-leaf-900",
    photo: "bg-public-photo",
  },
} as const;

/** How often to look for replies while the conversation is on screen. */
const POLL_MS = 6000;
/** Right after the buyer writes, while the shop's agent is answering. */
const FAST_POLL_MS = 2000;
/** How long the agent gets before the "writing" hint goes away. */
const AGENT_WAIT_MS = 45_000;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();

export function Conversation({
  tone,
  threadId,
  draft,
  messages,
  title,
  subtitle,
  href,
  photo,
  initial,
  otherName,
  backHref,
  placeholder,
  agent,
  needsYou = false,
  className,
}: {
  tone: Tone;
  /** Null for a first message: sending makes the thread. */
  threadId: string | null;
  draft?: { shopSlug: string; listingId: string | null };
  messages: ConversationMessage[];
  title: string;
  subtitle?: string;
  /** The listing or store, opened from the header (absolute for store pages). */
  href?: string;
  photo?: string | null;
  initial: string;
  /** Who's on the other side, above their bubbles. */
  otherName: string;
  /** Phone: back to the list. */
  backHref: string;
  placeholder?: string;
  /**
   * The shop's agent answers buyers here. `name` labels its messages ("Your
   * agent" for the seller, "Maya's assistant" for the buyer); `owner` is who
   * can still reply.
   */
  agent?: { on: boolean; name: string; owner: string };
  /** Seller side: the agent handed this one over. */
  needsYou?: boolean;
  className?: string;
}) {
  const t = tones[tone];
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // The server's copy has caught up with what we just sent (not a poll landing mid-send)
  useEffect(() => {
    if (!sending) setPending([]);
  }, [messages, sending]);

  // Their latest message is read once it's on screen
  const lastTheirs = [...messages].reverse().find((m) => !m.mine)?.id;
  useEffect(() => {
    if (threadId && lastTheirs) void readThread({ threadId });
  }, [threadId, lastTheirs]);

  const shown = [...messages, ...pending];
  // Buyer side: the agent is on and hasn't answered their latest message yet
  const last = shown.at(-1);
  const [now, setNow] = useState(() => Date.now());
  const awaitingAgent =
    tone === "public" &&
    !!agent?.on &&
    !!last?.mine &&
    now - new Date(last.createdAt).getTime() < AGENT_WAIT_MS;

  // Look for replies while visible, quicker while the agent is answering
  useEffect(() => {
    if (!threadId) return;
    const timer = setInterval(
      () => {
        if (document.visibilityState === "visible") router.refresh();
        setNow(Date.now());
      },
      awaitingAgent ? FAST_POLL_MS : POLL_MS,
    );
    return () => clearInterval(timer);
  }, [threadId, router, awaitingAgent]);

  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [shown.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    setText("");
    setPending((p) => [...p, { id: `pending-${Date.now()}`, mine: true, body, createdAt: new Date().toISOString() }]);
    const res = threadId
      ? await reply({ threadId, body })
      : await startThread({ shopSlug: draft!.shopSlug, listingId: draft!.listingId, body });
    setSending(false);
    if (!res.ok) {
      setPending([]);
      setText(body);
      if (res.signin) return router.push(signInHref(window.location.pathname + window.location.search));
      setError(res.error);
      return;
    }
    if ("threadId" in res) router.replace(`/messages?t=${res.threadId}`);
    input.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  const headerInner = (
    <>
      <span className={cn("flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md font-display text-lg font-extrabold", t.photo)}>
        {photo ? <img src={photo} alt="" className="size-full object-cover" /> : initial}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-bold">{title}</span>
        {subtitle && <span className={cn("truncate text-sm", t.muted)}>{subtitle}</span>}
      </span>
    </>
  );

  let lastDay = "";
  return (
    <section className={cn("flex min-h-0 flex-1 flex-col", t.frame, className)} aria-label={`Conversation with ${otherName}`}>
      <header className={cn("flex items-center gap-3 border-b px-4 py-3 desk:px-6 desk:py-4", t.border)}>
        <Link href={backHref} aria-label="Back to all messages" className="-ml-1 flex size-10 shrink-0 items-center justify-center rounded-full desk:hidden">
          <ChevronLeftIcon />
        </Link>
        {href ? (
          <a href={href} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
            {headerInner}
          </a>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{headerInner}</div>
        )}
      </header>

      <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 desk:px-6">
        {shown.length === 0 && (
          <p className={cn("m-auto max-w-[320px] text-center text-sm", t.muted)}>
            {agent?.on && tone === "public"
              ? `Ask anything. ${agent.name} answers right away from the listing, and ${agent.owner} can reply here too.`
              : `Say hello to ${otherName}. They get your message right away and can answer here.`}
          </p>
        )}
        {shown.map((m) => {
          const day = dayLabel(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m.id} className="flex flex-col gap-3">
              {showDay && <p className={cn("text-center text-xs font-semibold", t.muted)}>{day}</p>}
              <div className={cn("flex w-full flex-col gap-1", m.mine ? "items-end" : "items-start")}>
                <p
                  className={cn(
                    "max-w-[min(460px,85%)] px-[18px] py-3 text-base whitespace-pre-wrap break-words",
                    m.mine
                      ? cn(
                          "rounded-t-[20px] rounded-br-[6px] rounded-bl-[20px]",
                          // The seller's agent wrote it: theirs, but not in their own voice
                          m.byAgent ? "border-[1.5px] border-dashed border-leaf-900/40 bg-secondary-soft text-text" : "bg-leaf-900 text-white",
                        )
                      : cn("rounded-tl-[6px] rounded-r-[20px] rounded-bl-[20px]", t.theirs),
                    m.id.startsWith("pending-") && "opacity-70",
                  )}
                >
                  {m.body}
                </p>
                <span className={cn("flex items-center gap-1 px-1 text-xs", t.muted)}>
                  {m.byAgent && <SparkleIcon size={12} />}
                  {m.byAgent && agent ? agent.name : m.mine ? "You" : otherName},{" "}
                  {m.id.startsWith("pending-") ? "sending..." : timeLabel(m.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {awaitingAgent && agent && (
        <p className={cn("flex items-center gap-1.5 px-5 pb-2 text-sm desk:px-7", t.muted)} aria-live="polite">
          <SparkleIcon size={14} />
          {agent.name} is writing...
        </p>
      )}
      {needsYou && (
        <p className="mx-4 mb-2 rounded-md bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent-text desk:mx-6">
          Your agent couldn&apos;t answer this one from the listing, so it told them you&apos;d reply here.
        </p>
      )}
      <form
        className={cn("flex flex-col gap-2 border-t px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] desk:px-6 desk:pb-5", t.border)}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {error && (
          <p role="alert" className="text-sm font-semibold text-berry-500">
            {error}
          </p>
        )}
        <div className={cn("flex items-end gap-2 rounded-[24px] border-[1.5px] py-1.5 pr-1.5 pl-4", t.input)}>
          <textarea
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={2000}
            placeholder={placeholder ?? `Message ${otherName}`}
            aria-label={`Message ${otherName}`}
            className="field-sizing-content max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-base outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="h-9 shrink-0 cursor-pointer rounded-full bg-secondary px-4 text-sm font-bold text-on-secondary transition-colors hover:bg-leaf-900 disabled:cursor-default disabled:opacity-40"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}

