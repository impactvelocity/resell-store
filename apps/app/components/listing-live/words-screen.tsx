"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@repo/ui/button";
import { CheckIcon } from "@repo/ui/icons";
import { Sticker } from "@repo/ui/sticker";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import {
  chooseWords,
  editWords,
  saveWritingStyle,
  writeWords,
  type WordsCopy,
} from "../../app/actions/listing-words";
import type { PhotoView, WorkspaceListing } from "../../lib/server/listings";
import { AgentMessage, ChangeChip, ThinkingLine, Thread, ThreadCard, UserMessage } from "../agent-chat/agent-chat";
import { useAgentChat } from "../listing-later/use-agent-chat";
import { useIsDesk } from "../listing-later/use-is-desk";
import { CanvasHeader } from "../workspace/listing-panel";
import { ListingWorkspace, stepHref } from "../workspace/listing-workspace";
import { LiveEarlierCards } from "./earlier-cards";
import { formatPrice } from "./format";
import { PhotoThumb } from "./photo-thumb";

/*
 * C6 Words on real data. The agent writes a take in the chosen tone; each one
 * is kept so "Version 2 of 3" steps back through them, and the take on screen
 * is the listing's words. Edits by hand save straight to the listing. Without
 * an Anthropic key the seller can still write it all themselves.
 */

const tones = ["Friendly", "Playful", "Straight to the point", "A bit luxe"] as const;
type Tone = (typeof tones)[number];

const toneWord: Record<Tone, string> = {
  Friendly: "friendly",
  Playful: "playful",
  "Straight to the point": "no-nonsense",
  "A bit luxe": "slightly luxe",
};

const titleMax = 80;
const oneLinerMax = 120;

type Part = "title" | "oneLiner" | "description";
type Words = { title: string; oneLiner: string; description: string; teaser: string };
type Kind = "first" | "tone" | "take" | "shorter" | "longer" | "custom";

const shimmerCss = `
@keyframes lw-shimmer { from { background-position: 100% 0 } to { background-position: -100% 0 } }
.lw-shimmer {
  color: transparent;
  background-image: linear-gradient(90deg, var(--color-text-muted) 0%, var(--color-text-muted) 35%, var(--color-border) 50%, var(--color-text-muted) 65%, var(--color-text-muted) 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  animation: lw-shimmer 1.1s linear infinite;
}
@media (prefers-reduced-motion: reduce) { .lw-shimmer { animation: none } }
`;

function isTone(value: string | null | undefined): value is Tone {
  return tones.includes(value as Tone);
}

function focusComposer() {
  const boxes = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"));
  boxes.find((b) => b.offsetParent !== null)?.focus();
}

/* Pieces ------------------------------------------------------------------ */

function TonePicker({
  tone,
  disabled,
  styleSaved,
  onPick,
  onSaveStyle,
  className,
}: {
  tone: Tone;
  disabled: boolean;
  styleSaved: boolean;
  onPick: (tone: Tone) => void;
  onSaveStyle: () => void;
  className?: string;
}) {
  return (
    <ThreadCard className={className}>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How it should sound">
        {tones.map((t) => {
          const on = t === tone;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => !on && onPick(t)}
              className={cn(
                "flex h-12 cursor-pointer items-center gap-2 rounded-full text-base transition-colors disabled:cursor-default",
                on
                  ? "bg-primary pr-5 pl-3.5 font-bold text-on-primary"
                  : "border-[1.5px] border-border bg-surface px-5 font-semibold enabled:hover:bg-surface-muted disabled:opacity-60",
              )}
            >
              {on && <CheckIcon size={18} strokeWidth={3} />}
              {t}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={focusComposer}
          className="cursor-pointer text-left text-sm font-medium text-text-muted hover:text-text"
        >
          Or tell me in your own words
        </button>
        <button
          type="button"
          disabled={styleSaved}
          onClick={onSaveStyle}
          className="flex shrink-0 cursor-pointer items-center gap-1 text-sm font-bold text-secondary hover:underline disabled:cursor-default disabled:no-underline"
        >
          {styleSaved && <CheckIcon size={16} strokeWidth={3} />}
          {styleSaved ? "Saved as your usual style" : "Save as my usual style"}
        </button>
      </div>
    </ThreadCard>
  );
}

function EditablePart({
  value,
  placeholder,
  shimmer,
  multiline = false,
  max,
  onSave,
  className,
}: {
  value: string;
  placeholder: string;
  shimmer: boolean;
  multiline?: boolean;
  max?: number;
  onSave: (value: string) => void;
  className: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !editing) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  function save() {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === value) return setDraft(value);
    onSave(next);
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        rows={1}
        value={draft}
        maxLength={max}
        onChange={(e) => setDraft(multiline ? e.target.value : e.target.value.replace(/\n/g, ""))}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn(
          className,
          "-mx-2 -my-1 w-[calc(100%+16px)] resize-none rounded-sm border-[1.5px] border-secondary bg-surface px-2 py-1 outline-none",
        )}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={shimmer}
      onClick={() => setEditing(true)}
      className={cn(
        className,
        "-mx-2 -my-1 cursor-text rounded-sm px-2 py-1 text-left whitespace-pre-line transition-colors enabled:hover:bg-surface-muted",
        shimmer && "lw-shimmer",
        !value && !shimmer && "text-text-muted",
      )}
    >
      {value || (shimmer ? "Writing" : placeholder)}
    </button>
  );
}

function PartLabel({ children }: { children: ReactNode }) {
  return <div className="text-sm font-semibold tracking-wide text-text-muted uppercase">{children}</div>;
}

function DraftCard({
  words,
  rewriting,
  canRewrite,
  index,
  count,
  fields,
  onEdit,
  onRewrite,
  onStep,
}: {
  words: Words;
  rewriting: null | "all" | "description";
  canRewrite: boolean;
  index: number;
  count: number;
  /** Tag the parts with data-field so change chips can find them. One copy per screen. */
  fields: boolean;
  onEdit: (part: Part, value: string) => void;
  onRewrite: (kind: "take" | "shorter" | "longer") => void;
  onStep: (delta: number) => void;
}) {
  const f = (key: string) => (fields ? key : undefined);
  const busy = Boolean(rewriting);
  const actions = [
    { key: "take" as const, label: "Another take" },
    { key: "shorter" as const, label: "Shorter" },
    { key: "longer" as const, label: "More detail" },
  ];

  return (
    <div aria-busy={busy} className="flex w-full flex-col rounded-lg border border-border bg-surface p-5 desk:gap-[18px] desk:p-6">
      <style href="listing-live-shimmer" precedence="default">
        {shimmerCss}
      </style>
      <div data-field={f("title")} className="flex flex-col gap-1.5 border-b border-border pb-4 desk:border-b-0 desk:pb-0">
        <div className="flex justify-between">
          <PartLabel>Title</PartLabel>
          <span className="text-sm text-text-muted desk:font-medium">
            {words.title.length} of {titleMax}
          </span>
        </div>
        <EditablePart
          value={words.title}
          placeholder="Add a title"
          max={titleMax}
          shimmer={rewriting === "all"}
          onSave={(v) => onEdit("title", v)}
          className="font-display text-xl font-extrabold tracking-tight desk:text-2xl"
        />
      </div>
      <div data-field={f("oneLiner")} className="flex flex-col gap-1.5 border-b border-border py-4 desk:border-t desk:border-b-0 desk:pt-[18px] desk:pb-0">
        <PartLabel>One-liner</PartLabel>
        <EditablePart
          value={words.oneLiner}
          placeholder="Add a line on why someone would want it"
          max={oneLinerMax}
          shimmer={rewriting === "all"}
          onSave={(v) => onEdit("oneLiner", v)}
          className="text-base font-medium desk:text-lg desk:leading-7"
        />
      </div>
      <div data-field={f("description")} className="flex flex-col gap-1.5 border-b border-border py-4 desk:border-t desk:border-b-0 desk:pt-[18px] desk:pb-0">
        <PartLabel>Description</PartLabel>
        <EditablePart
          value={words.description}
          placeholder="Add a description: condition, size, anything a buyer would ask"
          multiline
          shimmer={busy}
          onSave={(v) => onEdit("description", v)}
          className="text-base"
        />
      </div>
      <div className="flex flex-col desk:flex-row desk:items-center desk:gap-2 desk:border-t desk:border-border desk:pt-[18px]">
        {canRewrite && (
          <div className="flex flex-wrap gap-2 pt-4 desk:flex-nowrap desk:pt-0">
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                disabled={busy}
                onClick={() => onRewrite(a.key)}
                className="flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-border bg-surface px-4 text-sm font-bold transition-colors enabled:hover:bg-surface-muted disabled:cursor-default disabled:opacity-50 desk:font-semibold"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        {count > 0 && (
          <div className="pt-3 desk:pt-0">
            <button
              type="button"
              disabled={busy || count < 2}
              title="Step through versions (arrow keys work too)"
              aria-label={`Version ${index + 1} of ${count}. Show the previous version`}
              onClick={() => onStep(-1)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  onStep(-1);
                }
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  onStep(1);
                }
              }}
              className="cursor-pointer text-sm font-medium whitespace-nowrap text-text-muted enabled:hover:text-text enabled:hover:underline disabled:cursor-default"
            >
              <span aria-live="polite">
                Version {index + 1} of {count}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BuyerPreview({
  words,
  cover,
  price,
  busy,
}: {
  words: Words;
  cover: PhotoView | undefined;
  price: string | null;
  busy: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-lg border border-border bg-surface p-5">
      <div className="text-sm font-bold text-text-muted">How buyers see it</div>
      <div className="relative h-[200px] w-full">
        <PhotoThumb photo={cover} className="size-full rounded-lg" />
        {!cover && (
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-text-muted">
            Your cover photo goes here
          </span>
        )}
        {price && (
          <Sticker size="md" rotate={-5} className="absolute bottom-3 left-2.5 origin-top-left">
            {price}
          </Sticker>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className={cn("text-base font-semibold", busy && "lw-shimmer")}>{words.title || "Your title"}</div>
        <div className={cn("text-sm text-text-muted", busy && "lw-shimmer")}>{words.teaser || words.oneLiner}</div>
      </div>
    </div>
  );
}

function KeyNeeded({ className }: { className?: string }) {
  return (
    <ThreadCard className={cn("bg-primary-soft", className)}>
      <div className="text-base font-bold">I can&apos;t write yet</div>
      <p className="text-sm">
        The writing agent needs an Anthropic key. Add <code className="font-semibold">ANTHROPIC_API_KEY</code> to{" "}
        <code className="font-semibold">apps/app/.env.local</code> and restart the dev server. Until then, click any part
        to write it yourself.
      </p>
    </ThreadCard>
  );
}

/* Screen ------------------------------------------------------------------ */

export function LiveWordsScreen({
  listing,
  initialCopies,
  photos,
  aiReady: aiReadyAtLoad,
  writingStyle,
  filled,
  total,
}: {
  listing: WorkspaceListing;
  initialCopies: WordsCopy[];
  photos: PhotoView[];
  aiReady: boolean;
  writingStyle: string | null;
  filled: number;
  total: number;
}) {
  const toast = useToast();
  const isDesk = useIsDesk();
  const chat = useAgentChat([]);
  const [aiReady, setAiReady] = useState(aiReadyAtLoad);
  const [copies, setCopies] = useState(initialCopies);
  const [index, setIndex] = useState(() => {
    // The take whose words are on the listing, else the newest
    for (let i = initialCopies.length - 1; i >= 0; i--) {
      const c = initialCopies[i]!;
      if (c.title === listing.title && c.description === listing.description) return i;
    }
    return initialCopies.length - 1;
  });
  const usualTone = writingStyle?.split(":")[0];
  const [tone, setTone] = useState<Tone>(() =>
    isTone(listing.tone) ? listing.tone : isTone(usualTone) ? usualTone : "Friendly",
  );
  const [styleSaved, setStyleSaved] = useState(() => usualTone === tone);
  const [rewriting, setRewriting] = useState<null | "all" | "description">(null);
  const [thinking, setThinking] = useState<string | null>(null);
  // Words typed by hand before there's any take
  const [own, setOwn] = useState<Words>({
    title: listing.hasTitle ? listing.title : "",
    oneLiner: listing.oneLiner ?? "",
    description: listing.description ?? "",
    teaser: "",
  });
  const started = useRef(false);
  const copiesRef = useRef(copies);
  useEffect(() => {
    copiesRef.current = copies;
  }, [copies]);

  const current = copies[index];
  const words: Words = current ?? own;
  const busy = rewriting !== null;

  async function write(kind: Kind, opts: { tone?: Tone; text?: string } = {}) {
    if (busy) return;
    const useTone = opts.tone ?? tone;
    const instruction =
      kind === "take" || kind === "shorter" || kind === "longer" ? kind : kind === "custom" ? opts.text : undefined;
    setRewriting(kind === "shorter" || kind === "longer" ? "description" : "all");
    setThinking(
      kind === "first"
        ? "Writing a first go"
        : kind === "tone"
          ? `Writing it ${toneWord[useTone]}`
          : kind === "shorter"
            ? "Making it shorter"
            : kind === "longer"
              ? "Adding more detail"
              : "Trying another way to say it",
    );
    try {
      const result = await writeWords(listing.id, { tone: useTone, instruction, fromCopyId: current?.id ?? null });
      if (!result.ok) {
        if (result.reason === "no-key") setAiReady(false);
        else chat.agent(result.message);
        return;
      }
      const next = [...copiesRef.current, result.copy];
      copiesRef.current = next;
      setCopies(next);
      setIndex(next.length - 1);
      const hint = isDesk ? "Change anything on the right, or ask me for another take." : "Tap any part to change it, or ask me for another take.";
      const line =
        kind === "first"
          ? `Here's a first go, ${toneWord[useTone]}. ${hint}`
          : kind === "tone"
            ? `Here's a ${toneWord[useTone]} version. ${hint}`
            : kind === "shorter"
              ? "Shorter now. I kept the title and one-liner."
              : kind === "longer"
                ? "I added more detail to the description."
                : kind === "take"
                  ? "Here's another take."
                  : "Done. I worked that in. Have a look.";
      chat.agent(
        line,
        kind === "custom" || kind === "take" ? (
          <>
            <ChangeChip field="title">Title rewritten</ChangeChip>
            <ChangeChip field="description">Description rewritten</ChangeChip>
          </>
        ) : kind === "shorter" || kind === "longer" ? (
          <ChangeChip field="description">Description rewritten</ChangeChip>
        ) : undefined,
      );
    } catch {
      chat.agent("I couldn't write that one. Try again in a moment?");
    } finally {
      setRewriting(null);
      setThinking(null);
    }
  }

  // First visit: write the first take straight away
  useEffect(() => {
    if (started.current || initialCopies.length > 0 || !aiReadyAtLoad || listing.hasTitle) return;
    started.current = true;
    void write("first");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  async function edit(part: Part, value: string) {
    // Show it straight away, then keep what the server saved (titles are clipped to fit)
    const apply = (v: string) => {
      if (current) setCopies((list) => list.map((c, i) => (i === index ? { ...c, [part]: v } : c)));
      else setOwn((w) => ({ ...w, [part]: v }));
    };
    apply(value);
    try {
      const result = await editWords(listing.id, { part, value, copyId: current?.id ?? null });
      apply(result.value);
    } catch {
      toast.add({ title: "Couldn't save that. Try again?" });
    }
  }

  function step(delta: number) {
    if (copies.length < 2) return;
    const next = (index + delta + copies.length) % copies.length;
    setIndex(next);
    const copy = copies[next]!;
    if (isTone(copy.tone)) setTone(copy.tone);
    chooseWords(listing.id, copy.id).catch(() => toast.add({ title: "Couldn't switch versions. Try again?" }));
  }

  async function saveStyle() {
    try {
      await saveWritingStyle(listing.id, tone);
      setStyleSaved(true);
      toast.add({ title: `Saved. Next time I'll start ${tone.toLowerCase()}.` });
    } catch {
      toast.add({ title: "Couldn't save that. Try again?" });
    }
  }

  function pickTone(t: Tone) {
    setTone(t);
    setStyleSaved(usualTone === t);
    if (aiReady) void write(current || own.title ? "tone" : "first", { tone: t });
  }

  const useWords = (className?: string) => (
    <Button render={<Link href={stepHref(listing.id, "publish")} />} nativeButton={false} className={className}>
      Use these words
    </Button>
  );

  const draft = (fields: boolean) => (
    <DraftCard
      words={words}
      rewriting={rewriting}
      canRewrite={aiReady && Boolean(current)}
      index={index}
      count={copies.length}
      fields={fields}
      onEdit={edit}
      onRewrite={(kind) => void write(kind)}
      onStep={step}
    />
  );

  return (
    <ListingWorkspace
      listingId={listing.id}
      step="words"
      title={words.title || listing.title}
      shopName={listing.shop.name}
      closeHref={listing.closeHref}
      filled={filled}
      total={total}
      busy={busy}
      composerHint={aiReady ? "Tell me what to change" : "Add ANTHROPIC_API_KEY to write with the agent"}
      // Anything typed in this step is a writing instruction
      onSend={(text) => {
        if (!aiReady) {
          chat.send(text, {
            thinking: "Reading that",
            text: "I can't rewrite anything until the Anthropic key is in. For now, click any part of the words to change it yourself.",
          });
          return;
        }
        chat.node(<UserMessage>{text}</UserMessage>);
        void write(current ? "custom" : "first", { text });
      }}
      saveKey={`${index}-${copies.length}-${tone}-${words.title}-${words.oneLiner}-${words.description}`}
      chat={
        <Thread>
          <AgentMessage>Now the words. How should it sound?</AgentMessage>
          <TonePicker
            tone={tone}
            disabled={busy}
            styleSaved={styleSaved}
            onPick={pickTone}
            onSaveStyle={saveStyle}
          />
          {!aiReady && <KeyNeeded />}

          {/* Phone: the draft sits in the chat */}
          <div className="flex flex-col gap-4 desk:hidden">
            {draft(!isDesk)}
            {useWords("w-full")}
          </div>

          {chat.thread}
          {thinking && <ThinkingLine>{thinking}</ThinkingLine>}
        </Thread>
      }
      canvas={
        <>
          <CanvasHeader
            title="The words"
            description="Click any part to edit it yourself."
            filled={filled}
            total={total}
          />
          <div className="flex flex-col items-start gap-4 xl:flex-row">
            <div className="w-full xl:flex-[1.6]">{draft(isDesk)}</div>
            <div className="flex w-full flex-col gap-4 xl:flex-1">
              <BuyerPreview
                words={words}
                cover={photos.find((p) => !p.isVideo)}
                price={formatPrice(listing.priceCents)}
                busy={rewriting === "all"}
              />
              {useWords("hidden w-full desk:flex")}
            </div>
          </div>
          <LiveEarlierCards listing={listing} photos={photos} />
        </>
      }
    />
  );
}
