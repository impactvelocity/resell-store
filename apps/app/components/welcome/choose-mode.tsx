"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { CheckIcon, ChevronLeftIcon, HeartIcon } from "@repo/ui/icons";
import { Sticker } from "@repo/ui/sticker";
import { cn } from "@repo/ui/lib/utils";
import type { HomeMode } from "../../lib/mock-home";
import { homeHref, storeMode } from "../home/mode";
import { IconLink } from "../shell/page";
import { WelcomeWordmark } from "./sign-up";

/*
 * A2 Buying or selling. The answer picks the first Home mode (and is
 * remembered, like the mode switch on Home).
 */

const options: {
  mode: HomeMode;
  title: string;
  description: string;
  perks: string[];
}[] = [
  {
    mode: "selling",
    title: "I have things to sell",
    description:
      "Open a shop, list things in minutes, and let your agent handle the back and forth.",
    perks: [
      "Your own shop link to share",
      "Listings written and priced for you",
      "Paid through PayPal",
    ],
  },
  {
    mode: "buying",
    title: "I'm here to buy",
    description: "Follow shops you like, save things for later, and make offers.",
    perks: [
      "See new things from shops you follow",
      "Make an offer and hold it with a deposit",
      "Check what something resells for first",
    ],
  },
];

const ctaLabel: Record<HomeMode, string> = {
  selling: "Open my first shop",
  buying: "Find things to buy",
};

function OptionCard({
  option,
  selected,
  onSelect,
}: {
  option: (typeof options)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-[14px] rounded-xl bg-surface p-5 text-left transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary desk:min-w-0 desk:flex-1 desk:gap-5 desk:p-8",
        selected
          ? "border-2 border-secondary"
          : "border-[1.5px] border-border hover:border-text-muted/40 desk:border-2",
      )}
    >
      <span className="flex w-full items-center justify-between desk:items-start">
        {option.mode === "selling" ? (
          <Sticker
            size="md"
            rotate={-5}
            className="py-1 desk:h-11 desk:px-[18px] desk:py-0 desk:text-[24px] desk:leading-7"
          >
            $24
          </Sticker>
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <HeartIcon size={22} className="*:fill-current" />
          </span>
        )}
        {selected ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary desk:size-8">
            <CheckIcon size={16} strokeWidth={3.2} />
          </span>
        ) : (
          <span className="size-7 shrink-0 rounded-full border-2 border-border bg-surface desk:size-8" />
        )}
      </span>
      <span className="flex flex-col gap-1 desk:gap-2">
        <span className="font-display text-xl font-extrabold tracking-[-0.02em] desk:text-2xl desk:leading-9 desk:tracking-tight">
          {option.title}
        </span>
        <span className="text-base text-text-muted">{option.description}</span>
      </span>
      <span className="hidden flex-col gap-2.5 border-t border-border pt-4 desk:flex">
        {option.perks.map((perk) => (
          <span key={perk} className="flex items-center gap-2.5">
            <CheckIcon size={18} strokeWidth={2.8} className="text-secondary" />
            <span className="text-base font-medium">{perk}</span>
          </span>
        ))}
      </span>
    </button>
  );
}

export function ChooseModeScreen() {
  const router = useRouter();
  const [choice, setChoice] = useState<HomeMode>("selling");

  function go(mode: HomeMode) {
    storeMode(mode);
    router.push(homeHref(mode));
  }

  return (
    <main className="flex min-h-dvh flex-col">
      {/* Phone header */}
      <div className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] desk:hidden">
        <IconLink href="/welcome" aria-label="Back">
          <ChevronLeftIcon strokeWidth={2.2} />
        </IconLink>
        <span className="text-sm font-medium text-text-muted">
          One quick question
        </span>
        <span className="size-10 shrink-0" />
      </div>
      {/* Desktop header */}
      <div className="hidden items-center justify-between px-12 py-7 desk:flex">
        <WelcomeWordmark markSize={36} />
        <span className="text-sm font-medium text-text-muted">
          One quick question
        </span>
      </div>

      <div className="flex flex-col desk:items-center desk:gap-10 desk:px-12 desk:pt-10 desk:pb-24">
        <div className="flex flex-col gap-2.5 px-6 pt-7 desk:items-center desk:gap-3 desk:p-0 desk:text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight desk:text-[56px] desk:leading-[60px]">
            What brings you here?
          </h1>
          <p className="text-base text-text-muted desk:text-lg desk:leading-7">
            Pick where to start. One account does both, and you can switch any
            time.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="What brings you here?"
          className="flex flex-col gap-3 px-4 pt-7 desk:w-[920px] desk:max-w-full desk:flex-row desk:gap-6 desk:p-0"
        >
          {options.map((option) => (
            <OptionCard
              key={option.mode}
              option={option}
              selected={choice === option.mode}
              onSelect={() => setChoice(option.mode)}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 px-4 py-9 desk:gap-4 desk:p-0">
          <Button
            className="h-[60px] w-full desk:w-[360px] desk:text-lg"
            onClick={() => go(choice)}
          >
            {ctaLabel[choice]}
          </Button>
          <Button
            variant="ghost"
            className="h-12 desk:h-auto desk:px-0 desk:hover:bg-transparent desk:hover:underline"
            onClick={() => go("buying")}
          >
            Just look around first
          </Button>
        </div>
      </div>
    </main>
  );
}
