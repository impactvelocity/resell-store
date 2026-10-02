"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui/button";
import { Sticker } from "@repo/ui/sticker";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import {
  sidekickChecks,
  sidekickUrl,
  type SidekickCheck,
} from "../../lib/mock-tools";
import { MobileBackHeader, Page } from "../shell/page";
import {
  MiniSpinner,
  StepNumber,
  TextAction,
  useCopy,
  useIsDesktop,
} from "./parts";

/* D4 Shopping sidekick */

function CameraGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

function WrapDress({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 44" aria-hidden className={className}>
      <path
        d="M10 2h3l3 4 3-4h3l-1.5 12L28 42H4l7.5-28L10 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SequinDress({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 44" aria-hidden className={className}>
      <path
        d="M9 2h2.5l1 9h7l1-9H23l-1 14 5 26H5l5-26L9 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function QrCode() {
  return (
    <svg width="96" height="96" viewBox="0 0 21 21" aria-hidden>
      <path
        fillRule="evenodd"
        d="M0 0h7v7H0zM1 1v5h5V1zM14 0h7v7h-7zM15 1v5h5V1zM0 14h7v7H0zM1 15v5h5v-5z"
        fill="currentColor"
      />
      <path
        d="M2 2h3v3H2zM16 2h3v3h-3zM2 16h3v3H2zM8 0h1v2H8zM10 1h2v1h-2zM9 3h1v2H9zM11 4h2v1h-2zM8 6h2v1H8zM12 6h1v2h-1zM0 8h2v1H0zM3 9h2v1H3zM6 8h1v2H6zM8 9h3v1H8zM9 11h1v2H9zM11 10h2v2h-2zM14 8h2v1h-2zM17 9h1v2h-1zM19 8h2v1h-2zM15 11h1v1h-1zM0 11h1v2H0zM2 12h3v1H2zM6 12h2v1H6zM8 14h2v1H8zM11 14h1v3h-1zM13 13h2v1h-2zM16 13h1v2h-1zM18 12h3v1h-3zM8 17h2v1H8zM9 19h3v1H9zM13 16h2v2h-2zM16 17h2v1h-2zM19 15h2v2h-2zM14 19h1v2h-1zM16 20h3v1h-3zM20 18h1v2h-1z"
        fill="currentColor"
      />
    </svg>
  );
}

type Variant = "phone" | "desktop";

function CompareCard({
  variant,
  better,
  name,
  sellsFor,
  costs,
}: {
  variant: Variant;
  better: boolean;
  name: string;
  sellsFor: string;
  costs: string;
}) {
  const desk = variant === "desktop";
  const Illustration = better ? WrapDress : SequinDress;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col rounded-lg border-2 bg-surface",
        desk ? "gap-3 p-4" : "gap-2.5 p-3",
        better ? "border-secondary" : desk ? "border-surface" : "border-border",
      )}
    >
      <div
        className={cn(
          "flex w-full items-center justify-center rounded-md",
          desk ? "h-32" : "h-28",
          better ? "bg-surface-muted" : "bg-accent-soft",
        )}
      >
        <Illustration
          className={cn(
            better ? "text-text" : "text-berry-500",
            desk ? "h-[88px] w-16" : "h-[77px] w-14",
          )}
        />
      </div>
      <div className="flex flex-col">
        <div
          className={cn("text-base font-bold", !desk && "leading-[22px]")}
        >
          {name}
        </div>
        <div className="text-sm text-text-muted">$120 in the shop</div>
      </div>
      <div
        className={cn(
          "flex flex-col border-t border-border",
          desk ? "pt-2.5" : "pt-2",
        )}
      >
        <div className="text-sm text-text-muted">Sells on for about</div>
        <div
          className={cn(
            "font-display text-2xl font-extrabold tracking-tight",
            desk && "leading-9",
          )}
        >
          {sellsFor}
        </div>
      </div>
      <span
        className={cn(
          "flex h-7 w-fit items-center rounded-full text-sm font-bold",
          desk ? "px-3" : "px-2.5",
          better ? "bg-secondary-soft text-secondary" : "bg-surface-muted",
        )}
      >
        {desk ? "Really costs" : "Costs"} you {costs}
      </span>
    </div>
  );
}

function Comparison({ variant }: { variant: Variant }) {
  const desk = variant === "desktop";
  return (
    <div
      className={cn(
        "relative flex w-full",
        desk ? "hidden w-[468px] shrink-0 gap-3 desk:flex" : "gap-2.5 desk:hidden",
      )}
    >
      <CompareCard
        variant={variant}
        better
        name="Black wrap dress"
        sellsFor="$70"
        costs="$50"
      />
      <CompareCard
        variant={variant}
        better={false}
        name="Red sequin dress"
        sellsFor="$25"
        costs="$95"
      />
      {desk && (
        <Sticker
          tone="accent"
          rotate={-8}
          className="absolute -top-[18px] -left-[22px] h-9 origin-top-left px-3.5 py-0 text-base leading-5"
        >
          Better buy
        </Sticker>
      )}
    </div>
  );
}

type Check = SidekickCheck & { justNow?: boolean };

function CheckBar({ onCheck }: { onCheck: (name: string) => void }) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const isDesktop = useIsDesktop();
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const run = (name: string) => {
    setBusy(true);
    timer.current = setTimeout(() => {
      setBusy(false);
      setValue("");
      onCheck(name);
    }, 1200);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const text = value.trim();
        if (!text) {
          toast.add({ title: "Paste a link or say what you're eyeing first." });
          return;
        }
        run(/^https?:\/\//.test(text) ? "Something from that link" : text);
      }}
      className="flex h-14 w-full items-center gap-2 rounded-full bg-surface pr-1.5 pl-[18px] desk:h-[60px] desk:pl-[22px]"
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Paste a link or say what you're eyeing"
        className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-text-muted"
        placeholder={
          isDesktop ? "Paste a link or say what you're eyeing" : "Paste a link"
        }
      />
      <button
        type="button"
        aria-label="Take a photo of the tag"
        onClick={() => fileRef.current?.click()}
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-muted transition-colors outline-none hover:bg-border focus-visible:outline-2 focus-visible:outline-secondary desk:size-12"
      >
        <CameraGlyph />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) run("Item from your photo");
          event.target.value = "";
        }}
      />
      <button
        type="submit"
        disabled={busy}
        className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-text px-[18px] text-base font-bold text-on-secondary transition-colors outline-none hover:bg-leaf-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-progress desk:h-12 desk:px-[22px]"
      >
        {busy && <MiniSpinner />}
        {busy ? "Checking" : "Check it"}
      </button>
    </form>
  );
}

function Hero({ onCheck }: { onCheck: (name: string) => void }) {
  return (
    <section className="flex w-full flex-col gap-5 rounded-xl bg-primary px-5 py-6 desk:flex-row desk:items-center desk:gap-10 desk:py-11 desk:pr-11 desk:pl-12">
      <div className="flex min-w-0 flex-1 flex-col gap-5 desk:gap-6">
        <div className="flex flex-col gap-2 desk:gap-3">
          <div className="hidden text-sm font-bold tracking-wide uppercase desk:block">
            Shopping sidekick
          </div>
          <h1 className="font-display text-3xl leading-[38px] font-extrabold tracking-tight desk:text-4xl">
            Know what it&apos;s worth before you buy it
          </h1>
          <p className="text-base font-medium desk:text-lg desk:leading-7">
            Two dresses, same price. One sells on for $70, the other for $25.
            Your sidekick tells you which before you pay.
          </p>
        </div>
        <CheckBar onCheck={onCheck} />
      </div>
      <Comparison variant="desktop" />
    </section>
  );
}

const steps = [
  {
    title: "Show it what you're eyeing",
    body: "A photo of the tag, a link, or just the name.",
  },
  {
    title: "See what it sells on for",
    body: "Based on what the same thing really sold for, used.",
  },
  {
    title: "Sell it later in one tap",
    body: "It's already looked up, so the listing is half written.",
  },
];

const verdictTone: Record<SidekickCheck["verdict"], string> = {
  holds: "bg-secondary-soft text-secondary",
  loses: "bg-surface-muted text-text",
  owned: "bg-primary-soft text-text",
};

function CheckRow({
  check,
  onBought,
}: {
  check: Check;
  onBought: () => void;
}) {
  const owned = check.verdict === "owned";
  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 last:pb-3.5 desk:flex-row desk:items-center desk:gap-4 desk:py-3.5 desk:last:pb-3.5">
      <div className="flex min-w-0 flex-col desk:flex-1">
        <div className="flex items-center gap-2 text-base font-bold">
          {check.name}
          {check.justNow && (
            <span className="text-sm font-semibold text-accent-text">
              Just now
            </span>
          )}
        </div>
        <div className="text-sm text-text-muted">{check.detail}</div>
      </div>
      <div className="flex items-center justify-between gap-4 desk:contents">
        <span
          className={cn(
            "flex h-7 w-fit items-center rounded-full px-3 text-sm font-semibold whitespace-nowrap",
            verdictTone[check.verdict],
          )}
        >
          {check.verdictLabel}
        </span>
        {owned ? (
          <Link
            href={
              check.id === "dutch-oven"
                ? "/list/dutch-oven/research"
                : "/list/new"
            }
            className="shrink-0 rounded-sm text-sm font-bold text-secondary outline-none hover:underline focus-visible:outline-2 focus-visible:outline-secondary"
          >
            List it
          </Link>
        ) : (
          <TextAction onClick={onBought}>I bought it</TextAction>
        )}
      </div>
    </div>
  );
}

function RecentChecks({
  checks,
  onBought,
}: {
  checks: Check[];
  onBought: (id: string) => void;
}) {
  return (
    <section className="flex w-full flex-col rounded-lg border border-border bg-surface px-[18px] pt-5 pb-1.5 desk:flex-[1.5] desk:rounded-xl desk:px-7 desk:pt-6 desk:pb-3">
      <h2 className="pb-1.5 font-display text-xl font-extrabold tracking-tight desk:pb-2">
        Things you&apos;ve checked
      </h2>
      {checks.map((check) => (
        <CheckRow
          key={check.id}
          check={check}
          onBought={() => onBought(check.id)}
        />
      ))}
    </section>
  );
}

function TakeItShopping() {
  const toast = useToast();
  const { copy } = useCopy();
  return (
    <section className="flex w-full flex-col gap-3 rounded-lg bg-secondary-soft p-5 desk:flex-1 desk:flex-row desk:items-center desk:gap-5 desk:rounded-xl desk:px-7 desk:py-6">
      <div className="hidden size-32 shrink-0 items-center justify-center rounded-lg bg-surface text-text desk:flex">
        <QrCode />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 desk:gap-1.5">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          Take it shopping
        </h2>
        <p className="text-sm text-text-muted">
          <span className="desk:hidden">
            Add the sidekick to your home screen so it&apos;s one tap away in
            the shop.
          </span>
          <span className="hidden desk:inline">
            Scan to open it on your phone, then add it to your home screen.
          </span>
        </p>
        <button
          type="button"
          onClick={() =>
            copy("sidekick", `https://${sidekickUrl}`, "Link copied. Open it on your phone.")
          }
          className="hidden w-fit cursor-pointer rounded-sm text-sm font-bold text-secondary outline-none hover:underline focus-visible:outline-2 focus-visible:outline-secondary desk:block"
        >
          {sidekickUrl}
        </button>
      </div>
      <Button
        size="md"
        className="h-12 w-full bg-text text-base text-on-secondary hover:bg-leaf-600 desk:hidden"
        onClick={() =>
          toast.add({ title: "Tap Share, then Add to Home Screen." })
        }
      >
        Add to home screen
      </Button>
    </section>
  );
}

export function SidekickScreen() {
  const toast = useToast();
  const [checks, setChecks] = useState<Check[]>(sidekickChecks);

  const addCheck = (name: string) => {
    const price = 20 + Math.round(Math.random() * 16) * 5;
    const label = name.length > 40 ? `${name.slice(0, 40)}…` : name;
    setChecks((list) => [
      {
        id: `check-${Date.now()}`,
        name: label.charAt(0).toUpperCase() + label.slice(1),
        detail: `Sells on for about $${price}, used`,
        verdict: price >= 60 ? "holds" : "loses",
        verdictLabel: price >= 60 ? "Holds its value" : "Loses most of it",
        justNow: true,
      },
      ...list,
    ]);
    toast.add({ title: `Checked. It sells on for about $${price}.` });
  };

  const markBought = (id: string) => {
    setChecks((list) =>
      list.map((c) =>
        c.id === id ? { ...c, verdict: "owned", verdictLabel: "You own this" } : c,
      ),
    );
    toast.add({ title: "Nice find. List it whenever you're ready." });
  };

  return (
    <>
      <MobileBackHeader title="Shopping sidekick" backHref="/me" />
      <Page className="gap-4 pb-8 desk:gap-6 desk:pt-8">
        <Hero onCheck={addCheck} />
        <Comparison variant="phone" />
        <div className="flex flex-col gap-4 desk:flex-row desk:gap-5">
          {steps.map((step, i) => (
            <section
              key={step.title}
              className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-5 desk:flex-1 desk:p-6"
            >
              <StepNumber>{i + 1}</StepNumber>
              <h2 className="font-display text-xl font-extrabold tracking-tight">
                {step.title}
              </h2>
              <p className="text-base text-text-muted">{step.body}</p>
            </section>
          ))}
        </div>
        <div className="flex flex-col gap-4 desk:flex-row desk:gap-5">
          <RecentChecks checks={checks} onBought={markBought} />
          <TakeItShopping />
        </div>
      </Page>
    </>
  );
}
