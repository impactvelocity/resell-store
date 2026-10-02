"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { ItemCard } from "@repo/ui/item-card";
import { LemonMark } from "@repo/ui/logo";
import { SparkleIcon } from "@repo/ui/icons";
import { Sticker } from "@repo/ui/sticker";
import { DressIllustration, SweaterIllustration } from "@repo/ui/whimsy";
import { cn } from "@repo/ui/lib/utils";

/*
 * A1 Sign up. Prototype only: every way in just moves on to A2.
 * Real sign-in (PayPal, Google, email link) gets wired up later.
 */

const NEXT = "/welcome/start";

const headline = "Your closet, open for business.";
const pitch =
  "Snap a photo. Your agent writes the listing, finds a fair price, and deals with buyers.";

export function WelcomeWordmark({
  markSize = 40,
  className,
}: {
  markSize?: number;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "flex w-fit items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight",
        className,
      )}
    >
      <LemonMark size={markSize} />
      resell.store
    </Link>
  );
}

function SignUpForm({ inputClassName }: { inputClassName?: string }) {
  const router = useRouter();
  const next = () => router.push(NEXT);
  return (
    <form
      className="flex w-full flex-col gap-3"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        next();
      }}
    >
      <Button type="button" className="w-full" onClick={next}>
        Continue with PayPal
      </Button>
      <Button type="button" variant="soft" className="w-full" onClick={next}>
        Continue with Google
      </Button>
      <div className="flex w-full items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-sm font-medium text-text-muted">
          or use your email
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <Input
        type="email"
        name="email"
        autoComplete="email"
        aria-label="Email"
        placeholder="you@example.com"
        className={cn("h-14 px-[22px]", inputClassName)}
      />
      <Button type="submit" variant="secondary" className="w-full">
        Email me a sign-in link
      </Button>
    </form>
  );
}

function LogInLine({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-base", className)}>
      <span className="font-medium text-text-muted">Been here before?</span>
      <Link href="/home" className="font-bold text-secondary hover:underline">
        Log in
      </Link>
    </p>
  );
}

const terms = "By continuing you agree to our Terms and Privacy Policy.";

/* The lemon panel on desktop: two listings, two stickers, an agent note. */
function Showcase() {
  return (
    <div className="flex origin-center scale-75 flex-col items-center gap-7 xl:scale-100">
      <div className="relative flex items-start gap-7">
        <div className="w-[264px] shrink-0 -rotate-4 rounded-xl bg-surface px-3 pt-3 pb-4">
          <ItemCard
            title="Linen wrap dress"
            meta="Size M, worn twice"
            price="$24"
            tone="pink"
            image={<DressIllustration size={116} />}
            className="gap-2.5 [&>div:first-child]:h-[196px]"
          />
        </div>
        <div className="pt-14">
          <div className="w-[264px] shrink-0 rotate-3 rounded-xl bg-surface px-3 pt-3 pb-4">
            <ItemCard
              title="Chunky knit sweater"
              meta="Size S, like new"
              price="$38"
              tone="leaf"
              defaultLiked
              image={<SweaterIllustration size={124} />}
              className="gap-2.5 [&>div:first-child]:h-[196px]"
            />
          </div>
        </div>
        <Sticker
          tone="secondary"
          size="md"
          rotate={8}
          className="absolute -top-[18px] -right-7 h-11 origin-top-left px-5 py-0"
        >
          Sold
        </Sticker>
        <Sticker
          tone="accent"
          size="md"
          rotate={-7}
          className="absolute -top-[26px] -left-9 h-11 origin-top-left px-5 py-0"
        >
          Just listed
        </Sticker>
      </div>
      <div className="flex w-[556px] items-start gap-[14px] rounded-xl bg-surface px-[22px] py-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-text">
          <SparkleIcon size={20} />
        </span>
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-base font-medium">
            Linen wrap dress, size M. Ones like it sold for $22 to $28 this
            month, so I&apos;d list it at $24.
          </p>
          {/* Illustration of the agent, not real controls */}
          <div aria-hidden className="flex gap-2">
            <span className="flex h-10 items-center rounded-full bg-secondary px-[18px] text-sm font-bold text-on-secondary">
              List it at $24
            </span>
            <span className="flex h-10 items-center rounded-full border-[1.5px] border-border px-[18px] text-sm font-bold">
              Change the price
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SignUpScreen() {
  return (
    <>
      {/* Phone */}
      <main className="flex min-h-dvh flex-col desk:hidden">
        <div className="flex w-full flex-col gap-5 px-6 pt-[max(36px,env(safe-area-inset-top))]">
          <WelcomeWordmark />
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            {headline}
          </h1>
          <p className="text-lg leading-7 text-text-muted">{pitch}</p>
        </div>
        <div aria-hidden className="flex items-center gap-2.5 px-6 pt-7">
          <Sticker size="lg" rotate={-5} className="px-[18px] py-2 leading-[34px]">
            $24
          </Sticker>
          <Sticker tone="secondary" rotate={4}>
            Sold
          </Sticker>
          <Sticker tone="accent" rotate={-3}>
            Just listed
          </Sticker>
        </div>
        <div className="px-6 pt-10">
          <SignUpForm inputClassName="rounded-full" />
        </div>
        <div className="flex flex-col items-center gap-2.5 px-6 pt-7 pb-9">
          <LogInLine />
          <p className="w-[300px] max-w-full text-center text-sm text-text-muted">
            {terms}
          </p>
        </div>
      </main>

      {/* Desktop */}
      <main className="hidden min-h-dvh desk:flex">
        <div className="flex w-[480px] shrink-0 flex-col justify-between gap-10 px-14 py-10 xl:w-[600px] xl:px-20">
          <WelcomeWordmark markSize={36} />
          <div className="flex w-full flex-col gap-7">
            <div className="flex flex-col gap-3">
              <h1 className="font-display text-[56px] leading-[56px] font-extrabold tracking-tight">
                {headline}
              </h1>
              <p className="text-lg leading-7 text-text-muted">{pitch}</p>
            </div>
            <SignUpForm inputClassName="rounded-lg" />
            <LogInLine className="gap-2 [&>span]:font-normal" />
          </div>
          <p className="text-sm text-text-muted">{terms}</p>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden bg-primary p-16">
          <Showcase />
        </div>
      </main>
    </>
  );
}
