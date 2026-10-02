"use client";

import { useState } from "react";
import { Button, IconButton } from "@repo/ui/button";
import { CheckIcon, ShareIcon, ShieldCheckIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { useToast } from "@repo/ui/toast";
import type { Store } from "../../../lib/mock-market";
import { storeDomain, storeUrl } from "../../../lib/urls";
import { SiteLink } from "../links";
import { StoreAvatar } from "../parts";

/** The little pink flower that sits on a store's avatar. */
function FlowerBadge({ className }: { className?: string }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 64 64"
      aria-hidden
      className={className}
    >
      <g className="fill-pink-400">
        <circle cx="32" cy="18" r="11" />
        <circle cx="45.3" cy="27.7" r="11" />
        <circle cx="40.2" cy="43.3" r="11" />
        <circle cx="23.8" cy="43.3" r="11" />
        <circle cx="18.7" cy="27.7" r="11" />
      </g>
      <circle cx="32" cy="32" r="8" fill="#fff" />
    </svg>
  );
}

/** Top of a store's home: who's selling, what they're like, and how to reach them. */
export function StoreIntro({ store }: { store: Store }) {
  const [following, setFollowing] = useState(false);
  const toast = useToast();

  async function share() {
    try {
      await navigator.clipboard.writeText(storeUrl(store.slug));
      toast.add({ title: "Link copied. Go show it off." });
    } catch {
      toast.add({ title: `Couldn't copy. It's ${storeDomain(store.slug)}` });
    }
  }

  return (
    <section className="flex flex-col gap-10 desk:flex-row desk:items-start desk:gap-20">
      <div className="flex min-w-0 grow basis-0 flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="relative size-[120px] shrink-0">
          <StoreAvatar store={store} size={120} />
          <FlowerBadge className="absolute -top-1 -right-1.5" />
        </div>

        <div className="flex min-w-0 grow basis-0 flex-col gap-3">
          <h1 className="font-display text-3xl font-extrabold tracking-tight desk:text-4xl">
            {store.name}
          </h1>
          <p className="text-sm font-medium text-public-text-muted">
            {storeDomain(store.slug)} · {store.location} · Selling since{" "}
            {store.since}
          </p>
          <p className="max-w-[560px] text-lg">{store.bio}</p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Button
              variant="secondary"
              aria-pressed={following}
              onClick={() => setFollowing((f) => !f)}
              className={cn(
                "h-12 px-7 font-semibold",
                following
                  ? "border border-leaf-900 bg-leaf-100 text-text hover:bg-leaf-100/70"
                  : "bg-leaf-900 hover:bg-leaf-600",
              )}
            >
              {following && <CheckIcon size={18} strokeWidth={2.4} />}
              {following ? "Following" : "Follow"}
            </Button>
            <SiteLink
              href="/messages"
              className="inline-flex h-12 items-center rounded-full border border-leaf-900 px-6 text-base font-semibold whitespace-nowrap transition-colors outline-none hover:bg-public-photo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              Message {store.owner}
            </SiteLink>
            <IconButton
              aria-label={`Share ${store.name}`}
              onClick={share}
              className="size-12 border border-public-border bg-public-background hover:bg-public-photo"
            >
              <ShareIcon size={18} strokeWidth={2.2} />
            </IconButton>
          </div>
        </div>
      </div>

      <StoreStats store={store} />
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse justify-end gap-0.5">
      <dt className="text-sm text-public-text-muted">{label}</dt>
      <dd className="font-display text-3xl font-extrabold tracking-tight">
        {value}
      </dd>
    </div>
  );
}

/** Four numbers that say whether a store is worth buying from, plus the PayPal promise. */
function StoreStats({ store }: { store: Store }) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-6 desk:w-[400px]">
      <dl className="grid grid-cols-2 gap-6">
        <Stat value={String(store.sold)} label="things sold" />
        <Stat value={store.rating.toFixed(1)} label={`from ${store.ratings} buyers`} />
        <Stat
          value={store.shipsIn}
          label={store.shipsIn === "Pickup" ? "or courier, by arrangement" : "to ship, usually"}
        />
        <Stat value={store.repliesIn} label="to reply, usually" />
      </dl>
      <p className="flex items-center gap-2.5 rounded-md bg-leaf-100 px-4 py-3.5 text-sm font-semibold text-leaf-600">
        <ShieldCheckIcon size={20} strokeWidth={2.2} className="shrink-0" />
        PayPal verified. Your money is held until it arrives.
      </p>
    </div>
  );
}
