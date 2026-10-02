"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  PhotoCameraIcon,
  SparkleIcon,
} from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";

/*
 * Agent chat (spec 04 / B). The left column of the listing workspace, and the
 * whole screen on a phone. The agent is always the pink circle with the dark
 * sparkle, plain text, no bubble. The person gets a dark bubble on the right.
 */

export function AgentAvatar({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const s = { sm: "size-6", md: "size-8", lg: "size-10" }[size];
  const icon = { sm: 12, md: 16, lg: 18 }[size];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent text-text",
        s,
        className,
      )}
    >
      <SparkleIcon size={icon} />
    </span>
  );
}

/* Thread ------------------------------------------------------------------ */

/**
 * Scrolling thread. Follows new messages unless the person has scrolled up,
 * then shows a "New message" pill instead.
 */
export function Thread({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [unseen, setUnseen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    const observer = new MutationObserver(() => {
      if (pinned.current) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      } else {
        setUnseen(true);
      }
    });
    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          if (pinned.current) setUnseen(false);
        }}
        className="flex h-full flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-5 desk:px-8 desk:py-8"
      >
        {children}
      </div>
      {unseen && (
        <button
          type="button"
          onClick={() => {
            ref.current?.scrollTo({
              top: ref.current.scrollHeight,
              behavior: "smooth",
            });
            setUnseen(false);
          }}
          className="absolute bottom-3 left-1/2 flex h-9 -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full bg-text px-4 text-sm font-semibold text-background"
        >
          New message
          <ChevronDownIcon size={16} />
        </button>
      )}
    </div>
  );
}

/* Messages ---------------------------------------------------------------- */

/** 112px square thumb for a photo in a person's message. Pass an illustration or <img>. */
export function MessagePhoto({
  tone = "leaf",
  children,
  className,
}: {
  tone?: "leaf" | "pink" | "lemon" | "muted";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    leaf: "bg-leaf-100",
    pink: "bg-pink-100",
    lemon: "bg-lemon-100",
    muted: "bg-surface-muted",
  };
  return (
    <div
      className={cn(
        "flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg [&>img]:size-full [&>img]:object-cover",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Right side, dark bubble, at most 80% of the column. Photos sit above it, up to 4 in a row. */
export function UserMessage({
  photos,
  children,
  className,
}: {
  photos?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-end gap-2", className)}>
      {photos && (
        <div className="flex flex-wrap justify-end gap-2">{photos}</div>
      )}
      {children && (
        <div className="max-w-[80%] rounded-lg rounded-br-[6px] bg-text px-4 py-3 text-base font-medium text-background">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Left side, sparkle avatar, plain text. With `stream`, the text arrives word
 * by word as if it's being written.
 */
export function AgentMessage({
  children,
  stream = false,
  after,
  className,
}: {
  children: ReactNode;
  stream?: boolean;
  /** Change chips or a card that belongs to this message. */
  after?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start gap-2.5">
        <AgentAvatar />
        <div className="min-w-0 flex-1 pt-1 text-base text-text [&_p+p]:mt-3">
          {stream && typeof children === "string" ? (
            <StreamedText text={children} />
          ) : (
            children
          )}
        </div>
      </div>
      {after && (
        <div className="flex flex-wrap gap-2 pl-[42px]">{after}</div>
      )}
    </div>
  );
}

function StreamedText({ text }: { text: string }) {
  const words = text.split(" ");
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= words.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 45);
    return () => clearTimeout(t);
  }, [shown, words.length]);
  return <>{words.slice(0, shown).join(" ")}</>;
}

/**
 * Under an agent message, one per field it changed. Tapping it scrolls to that
 * field in the listing and flashes it. Fields are found by `data-field`.
 */
export function ChangeChip({
  field,
  children,
  className,
}: {
  field?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!field) return;
        const el = document.querySelector<HTMLElement>(
          `[data-field="${field}"]`,
        );
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.dataset.flash = "true";
        setTimeout(() => delete el.dataset.flash, 1000);
      }}
      className={cn(
        "flex h-10 w-fit cursor-pointer items-center gap-2 rounded-md bg-primary-soft px-3.5 text-left text-sm font-semibold text-text transition-colors hover:bg-lemon-300",
        className,
      )}
    >
      <PencilIcon size={16} />
      {children}
    </button>
  );
}

/** A quiet centred line in the thread, e.g. "You changed Size to 5.5 qt". */
export function SystemLine({ children }: { children: ReactNode }) {
  return (
    <div className="self-center rounded-full bg-surface-muted px-3 py-1 text-sm font-medium text-text-muted">
      {children}
    </div>
  );
}

/* Tool activity ----------------------------------------------------------- */

export type ToolRowState = "queued" | "running" | "done" | "failed";

export type ToolRow = {
  title: ReactNode;
  detail?: ReactNode;
  /** The tool in one word: Photo, Sales, Browser, API. */
  tag: string;
  state: ToolRowState;
};

export function Spinner({
  tone = "lemon",
  size = 24,
  className,
}: {
  tone?: "lemon" | "pink";
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("shrink-0 animate-spin motion-reduce:animate-none", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="9.5"
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="3"
      />
      <path
        d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
        fill="none"
        stroke={
          tone === "pink" ? "var(--color-accent)" : "var(--color-lemon-500)"
        }
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DoneTick({ size = 24 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary"
      style={{ width: size, height: size }}
    >
      <CheckIcon size={Math.round(size * 0.58)} strokeWidth={3.2} />
    </span>
  );
}

function ToolRowIcon({ state }: { state: ToolRowState }) {
  if (state === "done") return <DoneTick />;
  if (state === "running") return <Spinner />;
  if (state === "failed")
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-text">
        !
      </span>
    );
  return <span className="size-6 shrink-0 rounded-full border-[3px] border-border" />;
}

function ToolTag({ state, children }: { state: ToolRowState; children: ReactNode }) {
  return (
    <span
      className={cn(
        "flex h-6 items-center rounded-full px-2.5 text-sm font-semibold",
        state === "running"
          ? "bg-primary-soft text-text"
          : "bg-surface-muted text-text-muted",
      )}
    >
      {children}
    </span>
  );
}

/**
 * One row for each thing the agent looks at, so waiting reads as progress.
 * When every row is finished it folds into a summary pill; tapping it opens the rows again.
 */
export function ToolActivityCard({
  rows,
  summary,
  defaultOpen,
  className,
}: {
  rows: ToolRow[];
  /** e.g. "Looked in 4 places, took 38 seconds". Shown once every row is finished. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const finished = rows.every((r) => r.state === "done" || r.state === "failed");
  const [open, setOpen] = useState(defaultOpen ?? !finished);
  const failed = rows.filter((r) => r.state === "failed");
  const others = rows.filter((r) => r.state !== "failed");

  if (finished && summary && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 w-fit cursor-pointer items-center gap-2.5 rounded-full border border-border bg-surface pr-4 pl-3 text-sm font-semibold transition-colors hover:bg-surface-muted",
          className,
        )}
      >
        <DoneTick size={22} />
        {summary}
        <ChevronDownIcon size={16} strokeWidth={2.4} className="text-text-muted" />
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col rounded-lg border border-border bg-surface px-4 py-1">
        {others.map((row, i) => (
          <div
            key={i}
            className="flex items-start gap-3 border-b border-border py-3.5 last:border-b-0"
          >
            <ToolRowIcon state={row.state} />
            <div className="flex min-w-0 flex-1 flex-col">
              <div
                className={cn(
                  "text-base font-semibold",
                  row.state === "queued" ? "text-text-muted" : "text-text",
                )}
              >
                {row.title}
              </div>
              {row.detail && (
                <div className="text-sm text-text-muted">{row.detail}</div>
              )}
            </div>
            <div className="flex w-[76px] shrink-0 justify-end">
              <ToolTag state={row.state}>{row.tag}</ToolTag>
            </div>
          </div>
        ))}
      </div>
      {failed.map((row, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <ToolRowIcon state="failed" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="text-base font-bold">{row.title}</div>
            {row.detail && (
              <div className="text-sm text-text-muted">{row.detail}</div>
            )}
          </div>
          <ToolTag state="failed">{row.tag}</ToolTag>
        </div>
      ))}
      {finished && summary && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-fit cursor-pointer text-sm font-bold text-secondary"
        >
          Fold it up
        </button>
      )}
    </div>
  );
}

/* Thinking line ----------------------------------------------------------- */

/**
 * Three dots, lemon, leaf and pink, pulsing one after another, with a few
 * words on what the agent is working out. With reduced motion the dots stay still.
 */
export function ThinkingLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-medium text-text-muted">
      <span className="flex items-center gap-1" aria-hidden>
        <span className="size-2 animate-thinking rounded-full bg-lemon-400 motion-reduce:animate-none" />
        <span className="size-2 animate-thinking rounded-full bg-leaf-300 [animation-delay:150ms] motion-reduce:animate-none" />
        <span className="size-2 animate-thinking rounded-full bg-accent [animation-delay:300ms] motion-reduce:animate-none" />
      </span>
      {children}
    </div>
  );
}

/* Composer ---------------------------------------------------------------- */

/**
 * Camera, input and send. The input grows to five lines, then scrolls. Enter
 * sends, Shift+Enter makes a new line. Send is off while empty and turns into
 * Stop while the agent is working.
 */
export function Composer({
  placeholder = "Add a detail or ask",
  busy = false,
  onSend,
  onStop,
  onCamera,
  className,
}: {
  placeholder?: string;
  busy?: boolean;
  onSend?: (text: string) => void;
  onStop?: () => void;
  onCamera?: () => void;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // 24px line height, five lines max
    el.style.height = `${Math.min(el.scrollHeight, 24 * 5 + 28)}px`;
  }, [value]);

  function send() {
    const text = value.trim();
    if (!text) return;
    onSend?.(text);
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className={cn("flex w-full items-end gap-2", className)}>
      <button
        type="button"
        aria-label="Add photos"
        onClick={onCamera}
        className="flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-surface transition-colors hover:bg-surface-muted"
      >
        <PhotoCameraIcon size={22} />
      </button>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-[52px] min-w-0 flex-1 resize-none rounded-[26px] border-[1.5px] border-border bg-surface px-[18px] py-[12.5px] text-base leading-6 text-text outline-none placeholder:text-text-muted focus:border-secondary"
      />
      {busy ? (
        <button
          type="button"
          aria-label="Stop"
          onClick={onStop}
          className="flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-text text-background"
        >
          <span className="size-3.5 rounded-[3px] bg-background" />
        </button>
      ) : (
        <button
          type="button"
          aria-label="Send"
          disabled={!value.trim()}
          onClick={send}
          className="flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-lemon-300 disabled:cursor-default disabled:hover:bg-primary"
        >
          <ArrowUpIcon size={22} />
        </button>
      )}
    </div>
  );
}

/* Answer picker ----------------------------------------------------------- */

/**
 * Ready-made answers under an agent question. Two to five pills; the chosen
 * one goes lemon with a tick and can't be tapped again. With `multiple`, the
 * pills toggle and a Done button appears.
 */
export function AnswerPicker({
  options,
  index,
  total,
  multiple = false,
  defaultValue,
  onAnswer,
  onSkip,
  className,
}: {
  options: string[];
  /** 1-based question number. */
  index?: number;
  total?: number;
  multiple?: boolean;
  defaultValue?: string[];
  onAnswer?: (answers: string[]) => void;
  onSkip?: () => void;
  className?: string;
}) {
  const [picked, setPicked] = useState<string[]>(defaultValue ?? []);
  const [sent, setSent] = useState(Boolean(defaultValue?.length) && !multiple);

  function choose(option: string) {
    if (sent) return;
    if (multiple) {
      setPicked((p) =>
        p.includes(option) ? p.filter((o) => o !== option) : [...p, option],
      );
      return;
    }
    setPicked([option]);
    setSent(true);
    onAnswer?.([option]);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = picked.includes(option);
          return (
            <button
              key={option}
              type="button"
              disabled={sent && !on}
              aria-pressed={on}
              onClick={() => choose(option)}
              className={cn(
                "flex h-12 cursor-pointer items-center gap-2 rounded-full px-5 text-base transition-colors disabled:cursor-default",
                on
                  ? "bg-primary pl-3.5 font-bold text-on-primary"
                  : "border-[1.5px] border-border bg-surface font-semibold text-text enabled:hover:bg-surface-muted disabled:opacity-50",
              )}
            >
              {on && <CheckIcon size={18} />}
              {option}
            </button>
          );
        })}
        {multiple && !sent && (
          <button
            type="button"
            disabled={!picked.length}
            onClick={() => {
              setSent(true);
              onAnswer?.(picked);
            }}
            className="flex h-12 cursor-pointer items-center rounded-full bg-secondary px-5 text-base font-bold text-on-secondary disabled:cursor-default disabled:opacity-40"
          >
            Done
          </button>
        )}
      </div>
      {(total || onSkip) && (
        <div className="flex items-center justify-between">
          {total ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: total }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-[18px] rounded-full",
                      i + 1 < (index ?? 1)
                        ? "bg-secondary"
                        : i + 1 === index
                          ? "bg-primary"
                          : "bg-border",
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-text-muted">
                Question {index} of {total}
              </span>
            </div>
          ) : (
            <span />
          )}
          {onSkip && !sent && (
            <button
              type="button"
              onClick={() => {
                setSent(true);
                onSkip();
              }}
              className="cursor-pointer text-sm font-bold text-secondary"
            >
              Skip this one
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Card wrapper for things that sit in the thread between messages (shot list, tone picker). */
export function ThreadCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-4",
        className,
      )}
      {...props}
    />
  );
}
