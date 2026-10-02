"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpIcon, ChevronDownIcon, ChevronLeftIcon, SparkleIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import {
  agentReply,
  threads,
  type ChatMessage,
  type Thread,
  type ThreadKind,
  type TimelineStep,
} from "../../../lib/mock-buyer";
import { getStore } from "../../../lib/mock-market";
import { ItemArt } from "../art";
import { StoreLink } from "../links";
import { StoreAvatar } from "../parts";
import { HandOff, Timeline } from "./agent-panel";
import {
  AcceptedCard,
  AgentLabel,
  CounterCard,
  MineBubble,
  NoteLine,
  OfferBubble,
  TheirBubble,
  TypingBubble,
  type CounterState,
} from "./chat-parts";

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

type Filter = "all" | "offer" | "order";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "offer", label: `Offers ${threads.filter((t) => t.kind === "offer").length}` },
  { id: "order", label: "Orders" },
];

function matches(filter: Filter, kind: ThreadKind) {
  return filter === "all" || filter === kind;
}

/** Per-thread state the buyer changes by talking, countering or handing off. */
type ThreadState = {
  messages: ChatMessage[];
  timeline: TimelineStep[];
  counter: CounterState;
  handedOff: number | null;
};

function initialState(): Record<string, ThreadState> {
  return Object.fromEntries(
    threads.map((t) => [
      t.id,
      { messages: t.messages, timeline: t.timeline, counter: { status: "open" }, handedOff: null },
    ]),
  );
}

let uid = 0;
const nextId = () => `local-${++uid}`;

/**
 * P6 Messages: thread list, the conversation with the seller (and the store's
 * agent), and a side panel to hand the deal to your own agent. Desktop shows all
 * three panes, each scrolling on its own; under 900px it's the list or the thread.
 */
export function MessagesView({ initialThread }: { initialThread?: string }) {
  const startId = threads.some((t) => t.id === initialThread) ? initialThread! : threads[0]!.id;
  const [selectedId, setSelectedId] = useState(startId);
  // Phone: open straight into the thread only when the URL asked for one
  const [phoneOpen, setPhoneOpen] = useState(Boolean(initialThread));
  const [filter, setFilter] = useState<Filter>("all");
  const [read, setRead] = useState<Set<string>>(() => new Set());
  const [state, setState] = useState(initialState);
  const [typing, setTyping] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const thread = threads.find((t) => t.id === selectedId)!;
  const visible = threads.filter((t) => matches(filter, t.kind));

  function select(id: string) {
    setSelectedId(id);
    setPhoneOpen(true);
    setRead((r) => new Set(r).add(id));
    window.history.replaceState(null, "", `?thread=${id}`);
  }

  function backToList() {
    setPhoneOpen(false);
    window.history.replaceState(null, "", window.location.pathname);
  }

  function update(id: string, fn: (s: ThreadState) => Partial<ThreadState>) {
    setState((all) => ({ ...all, [id]: { ...all[id]!, ...fn(all[id]!) } }));
  }

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function send(text: string) {
    const id = thread.id;
    const owner = getStore(thread.store)?.owner ?? "the seller";
    update(id, (s) => ({ messages: [...s.messages, { id: nextId(), type: "mine", text }] }));
    later(() => setTyping(id), 500);
    later(() => {
      setTyping((t) => (t === id ? null : t));
      update(id, (s) => ({
        messages: [...s.messages, { id: nextId(), type: "agent", text: agentReply(text, owner, thread.store) }],
      }));
    }, 1900);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 desk:h-[calc(100dvh-77px)] desk:flex-none">
      {/* Conversation list */}
      <aside
        className={cn(
          "w-full flex-col gap-5 px-4 py-6 desk:flex desk:w-[320px] desk:shrink-0 desk:overflow-y-auto desk:border-r desk:border-public-border desk:py-8 desk:pr-4 desk:pl-6 xl:w-[400px] xl:pl-16",
          phoneOpen ? "hidden" : "flex",
        )}
      >
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Messages</h1>
        <div className="flex gap-2" role="group" aria-label="Show">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex h-9 cursor-pointer items-center rounded-full px-4 text-sm font-semibold",
                filter === f.id
                  ? "bg-leaf-900 text-white"
                  : "border border-public-border hover:bg-public-photo",
                focusRing,
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ul className="flex w-full flex-col gap-1">
          {visible.map((t) => (
            <li key={t.id}>
              <ThreadRow
                thread={t}
                selected={t.id === selectedId}
                unread={Boolean(t.unread) && !read.has(t.id)}
                preview={previewFor(t, state[t.id]!)}
                onSelect={() => select(t.id)}
              />
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-3 py-6 text-sm text-public-text-muted">Nothing here yet.</li>
          )}
        </ul>
      </aside>

      {/* The conversation */}
      <Conversation
        key={thread.id}
        thread={thread}
        state={state[thread.id]!}
        typing={typing === thread.id}
        className={phoneOpen ? "flex" : "hidden desk:flex"}
        onBack={backToList}
        onSend={send}
        onCounter={(counter, step, message) =>
          update(thread.id, (s) => ({
            counter,
            timeline: step ? [...s.timeline, step] : s.timeline,
            messages: message ? [...s.messages, message] : s.messages,
          }))
        }
        onHandOff={(ceiling) =>
          update(thread.id, (s) => ({
            handedOff: ceiling,
            timeline: [
              ...s.timeline,
              { title: `Handed to Claude, up to $${ceiling}`, detail: "Just now, it asks before paying" },
            ],
          }))
        }
        onTakeBack={() =>
          update(thread.id, (s) => ({
            handedOff: null,
            timeline: [...s.timeline, { title: "You took it back", detail: "Just now" }],
          }))
        }
      />
    </div>
  );
}

/** What the list says under the store name, after you've acted on the counter. */
function previewFor(thread: Thread, s: ThreadState) {
  const last = s.messages[s.messages.length - 1];
  if (s.counter.status === "accepted") return "You accepted $130";
  if (s.counter.status === "declined") return "You declined";
  if (s.counter.status === "countered") return `You countered at $${s.counter.amount}`;
  if (last && last.id.startsWith("local-") && (last.type === "mine" || last.type === "agent"))
    return last.text;
  return thread.preview;
}

function ThreadRow({
  thread,
  selected,
  unread,
  preview,
  onSelect,
}: {
  thread: Thread;
  selected: boolean;
  unread: boolean;
  preview: string;
  onSelect: () => void;
}) {
  const store = getStore(thread.store)!;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-[14px] p-3 text-left",
        selected ? "desk:bg-public-photo" : "hover:bg-public-photo/60",
        focusRing,
      )}
    >
      <StoreAvatar store={store} size={44} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-bold">{store.name}</span>
        <span
          className={cn(
            "truncate text-sm text-public-text-muted",
            selected && "desk:font-semibold desk:text-text",
          )}
        >
          {preview}
        </span>
      </span>
      <span className="flex w-[44px] shrink-0 flex-col items-end gap-1.5">
        <span className="text-xs whitespace-nowrap text-public-text-muted">{thread.when}</span>
        {unread && (
          <span className="size-2.5 rounded-full bg-pink-400">
            <span className="sr-only">Unread</span>
          </span>
        )}
      </span>
    </button>
  );
}

function Conversation({
  thread,
  state,
  typing,
  className,
  onBack,
  onSend,
  onCounter,
  onHandOff,
  onTakeBack,
}: {
  thread: Thread;
  state: ThreadState;
  typing: boolean;
  className?: string;
  onBack: () => void;
  onSend: (text: string) => void;
  onCounter: (counter: CounterState, step?: TimelineStep, message?: ChatMessage) => void;
  onHandOff: (ceiling: number) => void;
  onTakeBack: () => void;
}) {
  const store = getStore(thread.store)!;
  const scroller = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const seen = useRef<number | null>(null);
  const deposit =
    thread.messages.find((m): m is Extract<ChatMessage, { type: "offer" }> => m.type === "offer")
      ?.deposit ?? 0;

  // Keep the newest message in view. Desktop scrolls the pane; on a phone the
  // page scrolls, so only follow along once you've started talking.
  useLayoutEffect(() => {
    const count = state.messages.length + (typing ? 1 : 0);
    const grew = seen.current !== null && count > seen.current;
    seen.current = count;
    const el = scroller.current;
    if (el && getComputedStyle(el).overflowY === "auto") {
      el.scrollTo({ top: el.scrollHeight, behavior: grew ? "smooth" : "auto" });
    } else if (grew) {
      end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [state.messages.length, typing]);

  const showAgent =
    thread.agentCeiling !== undefined &&
    (state.counter.status === "open" ||
      state.counter.status === "countering" ||
      state.counter.status === "countered");

  const side = (
    <>
      {showAgent && (
        <HandOff
          owner={store.owner}
          defaultCeiling={thread.agentCeiling!}
          handedOff={state.handedOff}
          onHandOff={onHandOff}
          onTakeBack={onTakeBack}
        />
      )}
      <div className={cn("w-full", showAgent && "border-t border-public-border pt-8")}>
        <Timeline steps={state.timeline} />
      </div>
    </>
  );

  return (
    <>
      <section
        aria-label={`Conversation with ${store.name}`}
        className={cn("min-w-0 flex-1 flex-col desk:min-h-0", className)}
      >
        {/* Thread header */}
        <header className="flex flex-col gap-3 border-b border-public-border px-4 py-4 desk:flex-row desk:items-center desk:justify-between desk:gap-6 desk:px-8 desk:py-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to messages"
              className={cn(
                "-ml-2 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-public-photo desk:hidden",
                focusRing,
              )}
            >
              <ChevronLeftIcon size={20} />
            </button>
            <div className="flex min-w-0 flex-col">
              <h2 className="truncate text-lg font-bold">{store.name}</h2>
              <p className="text-sm text-public-text-muted">{thread.with}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-public-photo">
              <ItemArt art={thread.listing.art} size={28} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col text-sm">
              <span className="font-semibold">{thread.listing.title}</span>
              <span className="text-public-text-muted">Asking ${thread.listing.price}</span>
            </span>
            <StoreLink
              store={thread.store}
              href={`/${thread.listing.slug}`}
              className={cn(
                "rounded-full pl-2 text-sm font-semibold whitespace-nowrap text-leaf-600 hover:underline",
                focusRing,
              )}
            >
              View listing
            </StoreLink>
          </div>
        </header>

        {/* Below xl the side panel folds up under the header */}
        <details className="group border-b border-public-border xl:hidden">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold desk:px-8 [&::-webkit-details-marker]:hidden",
              focusRing,
            )}
          >
            <SparkleIcon size={14} className="text-pink-400" />
            {showAgent
              ? state.handedOff !== null
                ? "Claude has it"
                : "Let your agent finish"
              : "Where things stand"}
            <span className="ml-auto flex min-w-0 items-center gap-1 font-medium text-public-text-muted">
              <span className="truncate">{state.timeline[state.timeline.length - 1]?.title}</span>
              <ChevronDownIcon
                size={16}
                className="shrink-0 transition-transform group-open:rotate-180"
              />
            </span>
          </summary>
          <div className="flex flex-col gap-8 px-4 pt-2 pb-6 desk:px-8">{side}</div>
        </details>

        {/* Messages */}
        <div
          ref={scroller}
          className="flex flex-col gap-5 px-4 py-6 desk:min-h-0 desk:flex-1 desk:overflow-y-auto desk:px-8 desk:py-7"
        >
          {state.messages.map((m) => (
            <Message
              key={m.id}
              message={m}
              thread={thread}
              counter={state.counter}
              deposit={deposit}
              onCounter={onCounter}
            />
          ))}
          {typing && <TypingBubble storeName={store.name} />}
          <div ref={end} />
        </div>

        <Composer owner={store.owner} onSend={onSend} />
      </section>

      {/* Side panel, xl and up */}
      <aside className="hidden w-[384px] shrink-0 flex-col gap-8 overflow-y-auto border-l border-public-border py-8 pr-16 pl-8 xl:flex">
        {side}
      </aside>
    </>
  );
}

function Message({
  message: m,
  thread,
  counter,
  deposit,
  onCounter,
}: {
  message: ChatMessage;
  thread: Thread;
  counter: CounterState;
  deposit: number;
  onCounter: (counter: CounterState, step?: TimelineStep, message?: ChatMessage) => void;
}) {
  const store = getStore(thread.store)!;
  switch (m.type) {
    case "day":
      return (
        <p className="text-center text-xs font-medium tracking-wide text-public-text-muted uppercase">
          {m.label}
        </p>
      );
    case "note":
      return <NoteLine text={m.text} />;
    case "mine":
      return <MineBubble text={m.text} />;
    case "agent":
      return <TheirBubble label={<AgentLabel storeName={store.name} />} text={m.text} />;
    case "seller":
      return <TheirBubble label={<span className="font-semibold">{store.owner}</span>} text={m.text} />;
    case "offer":
      return <OfferBubble message={m} />;
    case "accepted":
      return <AcceptedCard message={m} owner={store.owner} />;
    case "counter":
      return (
        <CounterCard
          message={m}
          owner={store.owner}
          listingSlug={thread.listing.slug}
          deposit={deposit}
          state={counter}
          onAccept={() =>
            onCounter(
              { status: "accepted" },
              { title: `You accepted $${m.amount}`, detail: `Just now, $${m.toPay} left to pay` },
            )
          }
          onStartCounter={() => onCounter({ status: "countering" })}
          onCancelCounter={() => onCounter({ status: "open" })}
          onCounter={(amount) =>
            onCounter(
              { status: "countered", amount },
              { title: `You countered at $${amount}`, detail: `Just now, waiting on ${store.owner}` },
              {
                id: nextId(),
                type: "offer",
                amount,
                text: `Could you do $${amount}? Happy to keep the roll of film out of it.`,
                deposit,
              },
            )
          }
          onDecline={() =>
            onCounter(
              { status: "declined" },
              { title: "You declined", detail: `Just now, $${deposit} deposit on its way back` },
            )
          }
        />
      );
  }
}

/** "Write to Sam." Enter or the arrow sends. */
function Composer({ owner, onSend }: { owner: string; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        onSend(trimmed);
        setText("");
      }}
      className="sticky bottom-0 flex w-full shrink-0 items-center bg-public-background px-4 pt-3 pb-4 desk:static desk:px-8 desk:pt-4 desk:pb-7"
    >
      <label className="flex h-[52px] min-w-0 flex-1 items-center gap-2 rounded-full border border-public-border pr-2 pl-5 focus-within:outline-2 focus-within:outline-secondary">
        <span className="sr-only">Message {owner}</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Write to ${owner}. Simple questions get an instant answer.`}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-public-text-muted"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!trimmed}
          className={cn(
            "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-leaf-900 text-white transition-opacity disabled:cursor-default disabled:opacity-100",
            focusRing,
          )}
        >
          <ArrowUpIcon size={16} strokeWidth={2.6} />
        </button>
      </label>
    </form>
  );
}
