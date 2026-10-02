"use client";

import { useState } from "react";
import { CheckIcon, SparkleIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { ItemArt } from "../art";
import { SiteLink, StoreLink } from "../links";
import { useCopyMcpLink } from "./parts";

const chip =
  "inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-[18px] text-sm font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-600";

/** P7 hero: the pitch on the left, a sample assistant exchange on the right. */
export function AgentHero() {
  const { copy, copied } = useCopyMcpLink();

  return (
    <section className="flex flex-col gap-12 pt-10 pb-14 desk:pt-20 desk:pb-[88px] xl:flex-row xl:items-center xl:gap-20">
      <div className="flex min-w-0 flex-1 flex-col gap-5 desk:gap-6">
        <div className="text-sm font-bold tracking-wide text-pink-600 uppercase">
          For your agent
        </div>
        <h1 className="font-display text-[44px] leading-[46px] font-extrabold tracking-tight text-text desk:text-[72px] desk:leading-[72px]">
          Send your agent shopping.
        </h1>
        <p className="max-w-[560px] text-lg text-public-text-muted desk:text-[20px] desk:leading-[30px]">
          Add resell.store to the assistant you already use. It browses every
          store, watches for the thing you want, makes offers inside your limit,
          and asks you before it pays.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <a
            href="#assistants"
            className="flex h-14 items-center justify-center rounded-full bg-leaf-600 px-8 text-lg font-bold text-white transition-colors outline-none hover:bg-leaf-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-600"
          >
            Connect an assistant
          </a>
          <button
            type="button"
            onClick={() => copy("hero")}
            className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full border border-leaf-900 px-7 text-lg font-bold text-text transition-colors outline-none hover:bg-public-photo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-600"
          >
            {copied === "hero" && <CheckIcon size={18} strokeWidth={2.4} />}
            {copied === "hero" ? "Copied" : "Copy the MCP link"}
          </button>
        </div>
      </div>
      <SampleExchange />
    </section>
  );
}

/** The tilted-sticker card showing an assistant finding the film camera. */
function SampleExchange() {
  const toast = useToast();
  const [watching, setWatching] = useState(false);

  return (
    <div className="relative flex w-full shrink-0 flex-col gap-[18px] rounded-xl border border-public-border max-w-[540px] px-5 pt-11 pb-6 desk:px-7 desk:pb-7 xl:w-[540px]">
      <div className="absolute -top-4 right-5 origin-top-left rotate-[4deg] rounded-full bg-lemon-400 px-4 py-[5px] font-display text-base font-extrabold text-leaf-900 desk:right-7">
        Free for buyers
      </div>

      <div className="flex justify-end">
        <div className="max-w-[360px] rounded-t-lg rounded-br-[6px] rounded-bl-lg bg-leaf-900 px-[18px] py-3 text-base text-white">
          Find me a tested 35mm film camera under $150.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-pink-600">
          <SparkleIcon size={14} className="text-pink-400" />
          Your assistant, using resell.store
        </div>
        <p className="text-base text-text">
          I found three that were tested with film. The best match is from
          Second Shutter, and the seller is open to offers.
        </p>
      </div>

      <StoreLink
        store="secondshutter"
        href="/35mm-film-camera"
        className="flex items-center gap-3 rounded-[16px] bg-public-photo p-3 transition-colors outline-none hover:bg-[#ededed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-600 sm:gap-4 sm:p-[14px]"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[12px] bg-white sm:size-[72px]">
          <ItemArt art="camera" size={46} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-bold text-text">
            35mm film camera with 50mm lens
          </span>
          <span className="text-sm text-public-text-muted">
            Excellent, tested last week. Arrives Oct 8 to 10.
          </span>
        </span>
        <span className="shrink-0 font-display text-xl font-extrabold tracking-tight text-text">
          $140
        </span>
      </StoreLink>

      <div className="flex flex-wrap gap-2">
        <SiteLink
          href="/offer/35mm-film-camera"
          className={cn(chip, "bg-leaf-900 text-white hover:bg-leaf-600")}
        >
          Offer $120
        </SiteLink>
        <SiteLink
          href="/checkout/35mm-film-camera"
          className={cn(
            chip,
            "border border-leaf-900 text-text hover:bg-public-photo",
          )}
        >
          Buy for $152
        </SiteLink>
        <button
          type="button"
          aria-pressed={watching}
          onClick={() => {
            setWatching(!watching);
            toast.add({
              title: watching
                ? "Stopped watching the price."
                : "Watching the price. You'll hear if it drops.",
            });
          }}
          className={cn(
            chip,
            "border",
            watching
              ? "border-leaf-100 bg-leaf-100 text-leaf-600"
              : "border-public-border text-text hover:bg-public-photo",
          )}
        >
          {watching && <CheckIcon size={14} strokeWidth={3} />}
          {watching ? "Watching" : "Watch the price"}
        </button>
      </div>
    </div>
  );
}
