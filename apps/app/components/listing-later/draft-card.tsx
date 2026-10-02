"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@repo/ui/icons";
import { Sticker } from "@repo/ui/sticker";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { ThreadCard } from "../agent-chat/agent-chat";
import { draftListing } from "../../lib/mock";
import {
  oneLinerMax,
  titleMax,
  tones,
  writing,
  type Draft,
  type Tone,
} from "../../lib/mock-listing-later";
import { PotArt } from "./art";
import { currentDraft, setListing, useListing, type ListingDraftState } from "./store";

/*
 * Tone picker and draft card (spec 04 / C. Words). Choosing a tone writes a
 * new draft. "Another take" rewrites all three parts, "Shorter" and "More
 * detail" only the description. Every draft is kept as a version. While a
 * draft is being written the text shimmers and the buttons are off.
 */

const shimmerCss = `
@keyframes ll-shimmer { from { background-position: 100% 0 } to { background-position: -100% 0 } }
.ll-shimmer {
  color: transparent;
  background-image: linear-gradient(90deg, var(--color-text-muted) 0%, var(--color-text-muted) 35%, var(--color-border) 50%, var(--color-text-muted) 65%, var(--color-text-muted) 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  animation: ll-shimmer 1.1s linear infinite;
}
@media (prefers-reduced-motion: reduce) { .ll-shimmer { animation: none } }
`;

export function ShimmerStyles() {
  return (
    <style href="listing-later-shimmer" precedence="default">
      {shimmerCss}
    </style>
  );
}

/* Rewrites --------------------------------------------------------------- */

const takeCursor: Partial<Record<Tone, number>> = { Friendly: 0 };
let rewriteTimer: ReturnType<typeof setTimeout> | undefined;

function nextTake(tone: Tone) {
  const takes = writing[tone].takes;
  const i = takeCursor[tone] === undefined ? 0 : (takeCursor[tone]! + 1) % takes.length;
  takeCursor[tone] = i;
  return takes[i]!;
}

/** Write a new version after a short "rewriting" beat. */
export function rewrite(
  kind: "tone" | "take" | "shorter" | "longer",
  opts: { tone?: Tone; delay?: number; done?: () => void } = {},
) {
  setListing((s) => {
    const tone = opts.tone ?? s.tone;
    return {
      tone,
      rewriting: kind === "shorter" || kind === "longer" ? "description" : "all",
    };
  });
  clearTimeout(rewriteTimer);
  rewriteTimer = setTimeout(() => {
    setListing((s: ListingDraftState) => {
      const now = currentDraft(s);
      let draft: Draft;
      if (kind === "shorter") draft = { ...now, description: writing[s.tone].shorter };
      else if (kind === "longer") draft = { ...now, description: writing[s.tone].longer };
      else draft = nextTake(s.tone);
      const versions = [...s.versions, draft];
      return { versions, versionIndex: versions.length - 1, rewriting: null };
    });
    opts.done?.();
  }, opts.delay ?? 1300);
}

/* Tone picker ------------------------------------------------------------ */

function focusComposer() {
  const boxes = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"));
  boxes.find((b) => b.offsetParent !== null)?.focus();
}

export function TonePicker({
  onPick,
  className,
}: {
  onPick?: (tone: Tone) => void;
  className?: string;
}) {
  const { tone, rewriting, styleSaved } = useListing();
  const toast = useToast();
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
              disabled={Boolean(rewriting)}
              onClick={() => {
                if (on) return;
                setListing({ styleSaved: false });
                rewrite("tone", { tone: t });
                onPick?.(t);
              }}
              className={cn(
                "flex h-12 cursor-pointer items-center gap-2 rounded-full text-base transition-colors disabled:cursor-default",
                on
                  ? "bg-primary pr-5 pl-3.5 font-bold text-on-primary"
                  : "border-[1.5px] border-border bg-surface px-5 font-semibold enabled:hover:bg-surface-muted",
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
          onClick={() => {
            setListing({ styleSaved: true });
            toast.add({ title: `Saved. Next time I'll start ${tone.toLowerCase()}.` });
          }}
          className="flex shrink-0 cursor-pointer items-center gap-1 text-sm font-bold text-secondary hover:underline disabled:cursor-default disabled:no-underline"
        >
          {styleSaved && <CheckIcon size={16} strokeWidth={3} />}
          {styleSaved ? "Saved as your usual style" : "Save as my usual style"}
        </button>
      </div>
    </ThreadCard>
  );
}

/* Draft card ------------------------------------------------------------- */

type PartKey = "title" | "oneLiner" | "description";

function EditablePart({
  part,
  value,
  shimmer,
  className,
  max,
}: {
  part: PartKey;
  value: string;
  shimmer: boolean;
  className: string;
  max?: number;
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
    setListing((s) => ({
      versions: s.versions.map((v, i) =>
        i === s.versionIndex ? { ...v, [part]: next } : v,
      ),
    }));
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        rows={1}
        value={draft}
        maxLength={max}
        onChange={(e) => setDraft(part === "description" ? e.target.value : e.target.value.replace(/\n/g, ""))}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (part !== "description" || e.metaKey || e.ctrlKey)) {
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
        "-mx-2 -my-1 cursor-text rounded-sm px-2 py-1 text-left transition-colors enabled:hover:bg-surface-muted",
        shimmer && "ll-shimmer",
      )}
    >
      {value}
    </button>
  );
}

function PartLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-semibold tracking-wide text-text-muted uppercase">
      {children}
    </div>
  );
}

export function DraftCard({
  onRewrite,
  fields = true,
}: {
  onRewrite?: (kind: "take" | "shorter" | "longer") => void;
  /** Tag the parts with data-field so change chips can find them. One copy per screen. */
  fields?: boolean;
}) {
  const f = (key: string) => (fields ? key : undefined);
  const listing = useListing();
  const draft = currentDraft(listing);
  const { rewriting, versionIndex, versions } = listing;
  const busy = Boolean(rewriting);

  const actions: { key: "take" | "shorter" | "longer"; label: string }[] = [
    { key: "take", label: "Another take" },
    { key: "shorter", label: "Shorter" },
    { key: "longer", label: "More detail" },
  ];

  // "Version 2 of 2" steps through every draft: click goes back one (wrapping
  // round to the newest), arrow keys go back and forward.
  const go = (delta: number) =>
    setListing((s) => ({
      versionIndex: (s.versionIndex + delta + s.versions.length) % s.versions.length,
    }));
  const versionNav = (
    <button
      type="button"
      disabled={busy || versions.length < 2}
      title="Step through versions (arrow keys work too)"
      aria-label={`Version ${versionIndex + 1} of ${versions.length}. Show the previous version`}
      onClick={() => go(-1)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(-1);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(1);
        }
      }}
      className="cursor-pointer text-sm font-medium whitespace-nowrap text-text-muted enabled:hover:text-text enabled:hover:underline disabled:cursor-default"
    >
      <span aria-live="polite">
        Version {versionIndex + 1} of {versions.length}
      </span>
    </button>
  );

  return (
    <div
      aria-busy={busy}
      className="flex w-full flex-col rounded-lg border border-border bg-surface p-5 desk:gap-[18px] desk:p-6"
    >
      <ShimmerStyles />
      <div data-field={f("title")} className="flex flex-col gap-1.5 border-b border-border pb-4 desk:border-b-0 desk:pb-0">
        <div className="flex justify-between">
          <PartLabel>Title</PartLabel>
          <span className="text-sm text-text-muted desk:font-medium">
            {draft.title.length} of {titleMax}
          </span>
        </div>
        <EditablePart
          part="title"
          value={draft.title}
          max={titleMax}
          shimmer={rewriting === "all"}
          className="font-display text-xl font-extrabold tracking-tight desk:text-2xl"
        />
      </div>
      <div data-field={f("oneLiner")} className="flex flex-col gap-1.5 border-b border-border py-4 desk:border-t desk:border-b-0 desk:pt-[18px] desk:pb-0">
        <PartLabel>One-liner</PartLabel>
        <EditablePart
          part="oneLiner"
          value={draft.oneLiner}
          max={oneLinerMax}
          shimmer={rewriting === "all"}
          className="text-base font-medium desk:text-lg desk:leading-7"
        />
      </div>
      <div data-field={f("description")} className="flex flex-col gap-1.5 border-b border-border py-4 desk:border-t desk:border-b-0 desk:pt-[18px] desk:pb-0">
        <PartLabel>Description</PartLabel>
        <EditablePart
          part="description"
          value={draft.description}
          shimmer={Boolean(rewriting)}
          className="text-base"
        />
      </div>
      <div className="flex flex-col desk:flex-row desk:items-center desk:gap-2 desk:border-t desk:border-border desk:pt-[18px]">
        <div className="flex flex-wrap gap-2 pt-4 desk:flex-nowrap desk:pt-0">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={busy}
              onClick={() => {
                rewrite(a.key);
                onRewrite?.(a.key);
              }}
              className="flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-border bg-surface px-4 text-sm font-bold transition-colors enabled:hover:bg-surface-muted disabled:cursor-default disabled:opacity-50 desk:font-semibold"
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="pt-3 desk:pt-0">{versionNav}</div>
      </div>
    </div>
  );
}

/** "How buyers see it": the card in the shop with the price sticker. */
export function BuyerPreview() {
  const listing = useListing();
  const draft = currentDraft(listing);
  const busy = listing.rewriting === "all";
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-lg border border-border bg-surface p-5">
      <div className="text-sm font-bold text-text-muted">How buyers see it</div>
      <div className="relative flex h-[200px] w-full items-center justify-center rounded-lg bg-leaf-100">
        <PotArt size={120} />
        <Sticker size="md" rotate={-5} className="absolute bottom-3 left-2.5 origin-top-left">
          ${draftListing.price}
        </Sticker>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className={cn("text-base font-semibold", busy && "ll-shimmer")}>{draft.title}</div>
        <div className={cn("text-sm text-text-muted", busy && "ll-shimmer")}>{draft.teaser}</div>
      </div>
    </div>
  );
}
