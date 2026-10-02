"use client";

import { useId } from "react";
import { Chip, ChipGroup } from "@repo/ui/chip";
import { Input } from "@repo/ui/input";
import { cn } from "@repo/ui/lib/utils";
import { interests, notifyRows, profile, reachBy } from "../../lib/mock-inbox";
import type { ProfileData } from "./profile-context";

/* Form pieces shared by A7 Edit profile (phone) and Profile and settings (desktop). */

export function ProfileAvatar({
  name,
  className,
}: {
  name: string;
  /** Size and text size. */
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-[72px] shrink-0 items-center justify-center rounded-full bg-primary font-display text-3xl font-extrabold tracking-tight text-on-primary",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

const labelClass = "text-sm font-semibold text-text";
const boxClass =
  "rounded-md border-[1.5px] border-border bg-surface transition-colors focus-within:border-secondary";

export function NameField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <label htmlFor={id} className={cn(labelClass, "px-1 desk:px-0")}>
        Name
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="name"
        className="font-medium desk:h-[52px]"
      />
    </div>
  );
}

export function AboutField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div className="flex justify-between px-1 desk:px-0">
        <label htmlFor={id} className={labelClass}>
          About you
        </label>
        <span className="text-sm text-text-muted" aria-live="polite">
          {value.length} of {profile.aboutMax}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={profile.aboutMax}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          boxClass,
          "field-sizing-content min-h-[84px] w-full resize-none px-[18px] py-[14px] text-base text-text outline-none desk:font-medium",
        )}
      />
    </div>
  );
}

export function LocationField({
  value,
  onChange,
  hint,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  hint: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <label htmlFor={id} className={cn(labelClass, "px-1 desk:px-0")}>
        Location
      </label>
      <div
        className={cn(
          boxClass,
          "flex h-[54px] items-center gap-3 px-[18px] desk:h-[52px]",
        )}
      >
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="address-level2"
          className="h-full min-w-0 flex-1 bg-transparent text-base font-medium text-text outline-none"
        />
        <span className="shrink-0 text-sm text-text-muted max-desk:font-medium">
          {hint}
        </span>
      </div>
    </div>
  );
}

export function InterestChips({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <ChipGroup
      multiple
      aria-label="What you're into"
      value={value}
      onValueChange={(v: string[]) => onChange(v)}
      className="w-full"
    >
      {interests.map((i) => (
        <Chip key={i} value={i} className="px-4">
          {i}
        </Chip>
      ))}
    </ChipGroup>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        checked ? "bg-secondary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "size-[22px] rounded-full bg-surface shadow-[0_1px_2px_rgb(20_38_29/0.12)] transition-transform duration-200",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

/** "Tell me when" rows. Phone rows are semibold, desktop rows bold and roomier. */
export function NotifyRows({
  value,
  onChange,
}: {
  value: ProfileData["notify"];
  onChange: (v: ProfileData["notify"]) => void;
}) {
  return (
    <>
      {notifyRows.map((row) => {
        const on = value[row.key] ?? false;
        return (
          <div
            key={row.key}
            className="flex w-full items-center gap-3 border-b border-border py-[14px] last:border-b-0 desk:gap-4 desk:py-4 desk:last:border-b"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="text-base font-semibold text-text desk:font-bold">
                {row.label}
              </div>
              <div className="text-sm text-text-muted">
                {on ? row.when : "Off"}
              </div>
            </div>
            <Switch
              checked={on}
              label={row.label}
              onChange={(checked) => onChange({ ...value, [row.key]: checked })}
            />
          </div>
        );
      })}
    </>
  );
}

export function ReachChips({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <ChipGroup
      multiple
      aria-label="How to reach me"
      value={value}
      onValueChange={(v: string[]) => onChange(v)}
      className="flex-nowrap gap-1.5"
    >
      {reachBy.map((r) => (
        <Chip key={r} value={r} className="h-9 px-[14px]">
          {r}
        </Chip>
      ))}
    </ChipGroup>
  );
}
