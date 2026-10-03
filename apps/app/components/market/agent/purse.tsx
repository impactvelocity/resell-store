"use client";

import { useRef, useState } from "react";
import { PencilIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import {
  limitSwitches,
  spendLimit,
  type LimitId,
} from "../../../lib/mock-agent-buyer";
import { Switch } from "./parts";

export const purseRow =
  "flex items-center justify-between gap-4 border-b border-public-border py-[18px] last:border-b-0";

/**
 * "You hold the purse." (prototype): the spend ceiling and what the agent may
 * do alone. The live page's version is in live.tsx.
 */
export function HoldThePurse() {
  const toast = useToast();
  const [on, setOn] = useState<Record<LimitId, boolean>>(
    () =>
      Object.fromEntries(limitSwitches.map((l) => [l.id, l.on])) as Record<
        LimitId,
        boolean
      >,
  );

  return (
    <section className="flex flex-col border-t border-public-border pb-16 lg:flex-row lg:items-start lg:border-t-0 desk:pb-[88px]">
      <div className="flex flex-1 flex-col gap-3.5 pt-10 lg:border-t lg:border-public-border lg:pt-14 lg:pr-20">
        <h2 className="font-display text-[28px] leading-[34px] font-extrabold tracking-tight text-text desk:text-3xl">
          You hold the purse.
        </h2>
        <p className="max-w-[480px] text-lg text-public-text-muted">
          Your agent only does what you have allowed. Change these any time, or
          disconnect it with one click.
        </p>
      </div>
      <div className="flex flex-col pt-4 lg:w-1/2 lg:max-w-[620px] lg:shrink-0 lg:border-t lg:border-public-border lg:pt-[42px]">
        <div className={purseRow}>
          <RowText
            title="Most it can spend on one order"
            hint="Anything above this comes back to you."
          />
          <SpendLimit
            onSave={(v) =>
              toast.add({
                title: `Your agent can spend up to $${v} an order.`,
              })
            }
          />
        </div>
        {limitSwitches.map((l) => (
          <div key={l.id} className={purseRow}>
            <RowText title={l.title} hint={l.hint} />
            <Switch
              label={l.title}
              checked={on[l.id]}
              onCheckedChange={(v) => setOn((prev) => ({ ...prev, [l.id]: v }))}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function RowText({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="text-base font-bold text-text">{title}</div>
      <div className="text-sm text-public-text-muted">{hint}</div>
    </div>
  );
}

/**
 * The ceiling amount. Click it to type a new one; Enter or blur saves, Escape
 * cancels. `initial` null reads "No limit" until one is typed.
 */
export function SpendLimit({
  initial = spendLimit,
  disabled = false,
  onSave,
}: {
  initial?: number | null;
  disabled?: boolean;
  onSave: (value: number) => void;
}) {
  const [value, setValue] = useState(initial);
  const [draft, setDraft] = useState<string | null>(null);
  // Enter, Escape and the blur that follows can all try to finish one edit.
  const editing = useRef(false);
  const button = useRef<HTMLButtonElement>(null);

  const start = () => {
    editing.current = true;
    setDraft(value === null ? "" : String(value));
  };

  const finish = (save: boolean) => {
    if (!editing.current || draft === null) return;
    editing.current = false;
    setDraft(null);
    const n = Number(draft);
    if (save && n > 0 && n !== value) {
      setValue(n);
      onSave(n);
    }
  };

  if (draft !== null) {
    return (
      <label className="flex h-10 shrink-0 items-center rounded-full border border-leaf-600 bg-white pr-3 pl-3.5 font-display text-xl font-extrabold tracking-tight text-text focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-leaf-600">
        <span aria-hidden>$</span>
        <input
          autoFocus
          inputMode="numeric"
          aria-label="Most it can spend on one order, in dollars"
          value={draft}
          onChange={(e) =>
            setDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 5))
          }
          onFocus={(e) => e.target.select()}
          onBlur={() => finish(true)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== "Escape") return;
            finish(e.key === "Enter");
            requestAnimationFrame(() => button.current?.focus());
          }}
          className="w-[4.5ch] bg-transparent outline-none"
        />
      </label>
    );
  }

  const shown = value === null ? "No limit" : `$${value}`;
  if (disabled) {
    return (
      <span className="flex h-10 shrink-0 items-center font-display text-xl font-extrabold tracking-tight text-public-text-muted">
        {shown}
      </span>
    );
  }

  return (
    <button
      ref={button}
      type="button"
      onClick={start}
      aria-label={`Most it can spend on one order: ${shown}. Change`}
      className="group -mr-3 flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 font-display text-xl font-extrabold tracking-tight text-text transition-colors outline-none hover:bg-public-photo focus-visible:outline-2 focus-visible:outline-leaf-600"
    >
      <PencilIcon
        size={14}
        strokeWidth={2.4}
        className="text-public-text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      />
      {shown}
    </button>
  );
}
