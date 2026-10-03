"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";
import { DoneTick, Spinner } from "../agent-chat/agent-chat";

/*
 * The listing as it fills in (spec 04 / C. Listing panel and field rows).
 * The canvas on desktop, the drawer on a phone. Same cards in both.
 */

export function ProgressBar({
  value,
  className,
}: {
  /** 0 to 1. */
  value: number;
  className?: string;
}) {
  return (
    <span className={cn("flex h-1.5 w-full rounded-full bg-border", className)}>
      <span
        className="h-1.5 rounded-full bg-secondary transition-[width] duration-500"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </span>
  );
}

/** "Your listing" + a line, with "7 of 12 filled" and a bar on the right. */
export function CanvasHeader({
  title = "Your listing",
  description = "Fills in as we go. Click anything to change it.",
  filled,
  total = 12,
  action,
}: {
  title?: ReactNode;
  description?: ReactNode;
  filled?: number;
  total?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 pb-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-extrabold tracking-tight desk:text-[28px]">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-text-muted">{description}</p>
        )}
      </div>
      {action}
      {filled !== undefined && !action && (
        <div className="hidden w-[180px] shrink-0 flex-col items-end gap-1.5 desk:flex">
          <span className="text-sm font-semibold">
            {filled} of {total} filled
          </span>
          <ProgressBar value={filled / total} />
        </div>
      )}
    </div>
  );
}

/** White card on the canvas: a bold title, optional right-hand meta, then content. */
export function CanvasCard({
  title,
  meta,
  children,
  className,
  field,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Lets change chips scroll to and flash this card. */
  field?: string;
}) {
  return (
    <div
      data-field={field}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface px-6 pt-5 pb-6",
        className,
      )}
    >
      {(title || meta) && (
        <div className="flex items-baseline justify-between gap-3">
          {title && <div className="text-base font-bold">{title}</div>}
          {meta && (
            <div className="text-sm font-medium text-text-muted">{meta}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export type FieldState =
  /** Bold value, green tick. The agent found it. */
  | "filled"
  /** Lemon "You said" tag. It came from the person. */
  | "you-said"
  /** "I'll ask you", muted, empty ring. */
  | "to-ask"
  /** "Asking you now" in pink with a pink spinner. */
  | "asking"
  /** Step 2 on: pencil, click to edit. */
  | "editable";

export type Field = {
  key: string;
  label: string;
  value?: string;
  state: FieldState;
  /** Lemon "Just changed" tag under the value until the step ends. */
  justChanged?: boolean;
};

function EditIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-text-muted"
    >
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    </svg>
  );
}

function FieldRow({
  field,
  onEdit,
}: {
  field: Field;
  onEdit?: (key: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value ?? "");
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(field.value);
  const inputRef = useRef<HTMLInputElement>(null);

  // The row flashes primary-soft for a second when its value changes
  useEffect(() => {
    if (prevValue.current === field.value) return;
    prevValue.current = field.value;
    setDraft(field.value ?? "");
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1000);
    return () => clearTimeout(t);
  }, [field.value]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const editable = field.state === "editable";

  function save() {
    setEditing(false);
    if (draft.trim() && draft !== field.value) onEdit?.(field.key, draft.trim());
    else setDraft(field.value ?? "");
  }

  const value =
    field.state === "to-ask" ? (
      <span className="text-base text-text-muted">I&apos;ll ask you</span>
    ) : field.state === "asking" ? (
      <span className="text-base font-semibold text-accent-text">
        Asking you now
      </span>
    ) : (
      <span className="text-base font-semibold">{field.value}</span>
    );

  return (
    <div
      data-field={field.key}
      data-flash={flash || undefined}
      onClick={() => editable && !editing && setEditing(true)}
      className={cn(
        "flex gap-3 border-b border-border py-3 last:border-b-0",
        field.justChanged ? "items-start" : "items-center",
        editable && !editing && "cursor-pointer hover:bg-surface-muted",
      )}
    >
      <div
        className={cn(
          "w-[96px] shrink-0 text-sm leading-5 font-medium text-pretty break-words text-text-muted",
          field.justChanged && "pt-0.5",
        )}
      >
        {field.label}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setDraft(field.value ?? "");
                setEditing(false);
              }
            }}
            className="-my-1 h-9 w-full rounded-sm border-[1.5px] border-secondary bg-surface px-2.5 text-base font-semibold outline-none"
          />
        ) : (
          value
        )}
        {field.justChanged && !editing && (
          <span className="flex h-6 w-fit items-center rounded-full bg-primary-soft px-2.5 text-sm font-semibold">
            Just changed
          </span>
        )}
      </div>
      {field.state === "filled" && <DoneTick size={20} />}
      {field.state === "you-said" && (
        <span className="flex h-6 shrink-0 items-center rounded-full bg-primary-soft px-2.5 text-sm font-semibold">
          You said
        </span>
      )}
      {field.state === "to-ask" && (
        <span className="size-5 shrink-0 rounded-full border-2 border-border" />
      )}
      {field.state === "asking" && <Spinner tone="pink" size={20} />}
      {editable && !editing && <EditIcon />}
    </div>
  );
}

/** "The item" card: one row per field. Rows depend on the thing being sold. */
export function FieldsCard({
  title = "The item",
  fields,
  onEdit,
  className,
}: {
  title?: ReactNode;
  fields: Field[];
  /** Called when the person edits a row by hand. */
  onEdit?: (key: string, value: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-surface px-6 pt-5 pb-2",
        className,
      )}
    >
      <div className="pb-1.5 text-base font-bold">{title}</div>
      {fields.map((field) => (
        <FieldRow key={field.key} field={field} onEdit={onEdit} />
      ))}
    </div>
  );
}

/** Two grey bars standing in for content that's still being worked out. */
export function SkeletonLines({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)} aria-hidden>
      <span className="h-2.5 w-[55%] animate-pulse rounded-full bg-surface-muted" />
      <span className="h-2.5 w-full animate-pulse rounded-full bg-surface-muted" />
    </div>
  );
}
