"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon, CopyIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { makeAgentLink, setShoppingLimits } from "../../../app/actions/developer";
import type { BuyerAgentData } from "../../../lib/server/api/screens";
import { ConfirmDialog } from "../../tools-live/confirm";
import { maskLink } from "../../tools/parts";
import { AgentAbilities } from "./abilities";
import { Mark } from "./assistants";
import { AgentHero } from "./hero";
import { Switch } from "./parts";
import { purseRow, RowText, SpendLimit } from "./purse";

/*
 * P7 For your agent, live. The buyer MCP server (mcp.resell.store/buy) is
 * real: without a key it searches and looks; with the person's agent link it
 * likes, follows, messages and makes offers as them. It's the same link as
 * D2's, so the limits here and the rules there are one set. Paying is never
 * the agent's: it hands over the checkout link.
 */

const bigButton =
  "flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full px-8 text-lg font-bold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-600 disabled:cursor-default disabled:opacity-60";
const primary = cn(bigButton, "bg-leaf-600 text-white hover:bg-leaf-900");
const secondary = cn(bigButton, "border border-leaf-900 px-7 text-text hover:bg-public-photo");
const smallButton =
  "flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-public-border bg-white px-[22px] text-sm font-semibold text-text transition-colors outline-none hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-600";
const linkText = "w-fit cursor-pointer text-sm font-bold text-text underline decoration-1 underline-offset-2 hover:decoration-2";

/** What it can really do, in the MCP server's terms (packages/mcp/src/buyer.ts). */
const abilities = [
  {
    title: "Finds the right one",
    body: "Describe what you want in your own words. It searches every store by meaning, price and whether the seller takes offers.",
    example: "A linen dress, size M, under $30",
  },
  {
    title: "Asks the seller",
    body: "It writes to the store about size, condition or pickup, and reads you the answer when it comes.",
    example: "Ask if the lid comes with it",
  },
  {
    title: "Haggles politely",
    body: "It makes offers and answers counters, never above the most you set for one thing. Sellers have 48 hours to answer.",
    example: "Offer $120 on that camera",
  },
  {
    title: "Leaves paying to you",
    body: "When you're ready it hands you the checkout link. You pay with PayPal, and the money's held until your order arrives.",
    example: "Get me the checkout link",
  },
] as const;

const apps = [
  { name: "Claude", mark: "C", note: "Settings, Connectors, Add custom connector. Paste the link." },
  { name: "ChatGPT", mark: "C", note: "Settings, Connectors. Paste the link and choose no authentication." },
  { name: "Claude Code, Cursor, VS Code", mark: ">", note: "Add it as an MCP server: one command or a line in mcp.json." },
  { name: "Any MCP app", mark: "link", note: "Look for Connectors or MCP servers in its settings." },
] as const;

function useCopyText() {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string, message: string) => {
    try {
      void navigator.clipboard?.writeText(text).catch(() => {});
    } catch {
      // Clipboard can be blocked in previews; the toast still confirms.
    }
    toast.add({ title: message });
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
  };
  return { copy, copied };
}

function Connect({
  data,
  fresh,
  onMade,
}: {
  data: BuyerAgentData;
  fresh: string | null;
  onMade: (link: string) => void;
}) {
  const toast = useToast();
  const { copy, copied } = useCopyText();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [shown, setShown] = useState(false);

  const make = async () => {
    setBusy(true);
    const res = await makeAgentLink();
    setBusy(false);
    if (!res.ok) {
      toast.add({ title: res.error });
      return;
    }
    onMade(res.buyer);
    toast.add({ title: data.link ? "New link made. The old one stopped working." : "Link made. Copy it into your assistant." });
  };

  if (!data.signedIn) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href={data.signIn} className={primary}>
            Sign in to connect
          </Link>
          <button
            type="button"
            className={secondary}
            onClick={() => copy("browse", data.browseLink, "Browse-only link copied. Paste it in your assistant.")}
          >
            {copied === "browse" && <CheckIcon size={18} strokeWidth={2.4} />}
            {copied === "browse" ? "Copied" : "Just browse"}
          </button>
        </div>
        <p className="max-w-[520px] text-sm text-public-text-muted">
          Searching works without an account. To like, message and make offers as you, it needs your own link.
        </p>
      </div>
    );
  }

  if (fresh || data.link) {
    const link = fresh ?? data.link?.full ?? null;
    return (
      <div className="flex max-w-[620px] flex-col gap-2.5 pt-2">
        <div className="text-sm font-bold text-text">Your shopping link</div>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="flex h-14 min-w-0 flex-1 items-center rounded-full border border-public-border px-5">
            <span className="min-w-0 overflow-x-auto font-mono text-sm font-medium whitespace-nowrap [scrollbar-width:none]">
              {link ? (shown ? link : maskLink(link)) : data.link?.masked}
            </span>
          </div>
          {link && (
            <button type="button" className={primary} onClick={() => copy("link", link, "Link copied. Paste it in your assistant.")}>
              {copied === "link" ? <CheckIcon size={18} strokeWidth={2.4} /> : <CopyIcon size={18} strokeWidth={2.2} />}
              {copied === "link" ? "Copied" : "Copy link"}
            </button>
          )}
        </div>
        <p className="text-sm text-public-text-muted">
          {fresh ? "Made just now." : `${data.link!.made}. ${data.link!.lastUsed ? `Last used ${data.link!.lastUsed}.` : "Not used yet."}`}{" "}
          {link
            ? "It works like a password for shopping as you, so only paste it into assistants you trust."
            : "It was made before links could be shown again. Make a new one to see it here."}
        </p>
        <div className="flex gap-5">
          {link && (
            <button type="button" onClick={() => setShown((v) => !v)} className={linkText}>
              {shown ? "Hide" : "Show"}
            </button>
          )}
          <button type="button" onClick={() => setConfirm(true)} className={linkText}>
            Make a new link
          </button>
        </div>
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="Make a new link?"
          description={
            data.hasShops
              ? "The old link stops working right away in every app using it, including any that run your shop. Set them up again with the new one. Your limits stay the same."
              : "The old link stops working right away, and every app using it has to be set up again with the new one. Your limits stay the same."
          }
          confirm="Make a new link"
          onConfirm={make}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" className={primary} onClick={make} disabled={busy}>
          Make my shopping link
        </button>
        <a href="#assistants" className={secondary}>
          See the assistants
        </a>
      </div>
      <p className="max-w-[520px] text-sm text-public-text-muted">It works like a password for shopping as you. Only you should have it.</p>
    </div>
  );
}

function Assistants({ data, fresh }: { data: BuyerAgentData; fresh: string | null }) {
  const { copy, copied } = useCopyText();
  const own = fresh ?? data.link?.full ?? null;
  const link = own ?? data.browseLink;
  return (
    <section id="assistants" className="flex scroll-mt-24 flex-col gap-6 pb-14 desk:gap-8 desk:pb-[72px]">
      <div className="flex flex-col gap-2 border-t border-public-border pt-10 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 desk:pt-14">
        <h2 className="font-display text-[28px] leading-[34px] font-extrabold tracking-tight text-text desk:text-3xl">Pick your assistant</h2>
        <p className="text-base text-public-text-muted">
          About a minute. Paste the link in its settings.{" "}
          <a href={data.connectDocs} target="_blank" rel="noreferrer" className="font-semibold text-text underline underline-offset-2">
            Step by step
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {apps.map((a) => (
          <div key={a.name} className="flex flex-col gap-[14px] rounded-lg border border-public-border p-5 desk:p-6">
            <div className="flex flex-1 items-center gap-3.5 sm:flex-col sm:items-start">
              <Mark mark={a.mark} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="text-lg font-bold text-text">{a.name}</h3>
                <p className="text-sm text-public-text-muted">{a.note}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4 rounded-lg bg-public-photo py-4 pr-4 pl-5 desk:gap-6 desk:py-5 desk:pr-5 desk:pl-7">
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-5">
            <span className="shrink-0 text-sm font-semibold text-public-text-muted">{own ? "Your shopping link" : "Browse-only link"}</span>
            <span className="truncate text-base font-semibold text-text desk:text-lg">{own ? maskLink(own) : link.replace(/^https?:\/\//, "")}</span>
          </div>
          <button
            type="button"
            onClick={() => copy("bar", link, "Link copied. Paste it in your assistant.")}
            className={smallButton}
          >
            {copied === "bar" && <CheckIcon size={14} strokeWidth={3} />}
            {copied === "bar" ? "Copied" : "Copy"}
          </button>
        </div>
        {!fresh && (
          <p className="text-sm text-public-text-muted">
            {data.link
              ? "This one only searches and looks. Your own link, shown when you made it, does the rest."
              : "This one only searches and looks. Make your own link above so it can like, message and make offers as you."}
          </p>
        )}
      </div>
    </section>
  );
}

function Purse({ data, enabled }: { data: BuyerAgentData; enabled: boolean }) {
  const toast = useToast();
  const [limits, setLimits] = useState(data.limits);

  const save = async (next: typeof limits, message: string) => {
    const before = limits;
    setLimits(next);
    const res = await setShoppingLimits(next);
    if (!res.ok) {
      setLimits(before);
      toast.add({ title: res.error });
      return;
    }
    toast.add({ title: message });
  };

  return (
    <section className="flex flex-col border-t border-public-border pb-16 lg:flex-row lg:items-start lg:border-t-0 desk:pb-[88px]">
      <div className="flex flex-1 flex-col gap-3.5 pt-10 lg:border-t lg:border-public-border lg:pt-14 lg:pr-20">
        <h2 className="font-display text-[28px] leading-[34px] font-extrabold tracking-tight text-text desk:text-3xl">You hold the purse.</h2>
        <p className="max-w-[480px] text-lg text-public-text-muted">
          {enabled
            ? "Your agent only does what you allow. These apply to every app using your link."
            : data.signedIn
              ? "These are where it starts. Make your link, then change them any time."
              : "These are where it starts. Sign in and make your link, then change them any time."}
        </p>
      </div>
      <div className="flex flex-col pt-4 lg:w-1/2 lg:max-w-[620px] lg:shrink-0 lg:border-t lg:border-public-border lg:pt-[42px]">
        <div className={purseRow}>
          <RowText title="Most it can spend on one thing" hint="It can't offer or agree to more. Anything above comes back to you." />
          <SpendLimit
            key={enabled ? "on" : "off"}
            initial={limits.maxOffer}
            disabled={!enabled}
            onSave={(v) => save({ ...limits, maxOffer: v }, `Saved. Up to $${v} for any one thing.`)}
          />
        </div>
        <div className={purseRow}>
          <RowText title="Make offers on its own" hint="Up to your limit. Off, it asks you before each offer." />
          <Switch
            label="Make offers on its own"
            checked={limits.offersOnOwn}
            disabled={!enabled}
            onCheckedChange={(on) =>
              save(
                { ...limits, offersOnOwn: on },
                on ? "Saved. It makes offers on its own, up to your limit." : "Saved. It'll ask you before each offer.",
              )
            }
          />
        </div>
        <div className={purseRow}>
          <RowText title="Ask me before it pays" hint="It can't pay. It hands you the checkout link and you pay with PayPal." />
          <span className="flex h-8 shrink-0 items-center rounded-full bg-public-photo px-3.5 text-sm font-semibold text-text">Always</span>
        </div>
      </div>
    </section>
  );
}

export function AgentLive({ data }: { data: BuyerAgentData }) {
  // The new link, until the page data catches up
  const [fresh, setFresh] = useState<string | null>(null);
  const [made, setMade] = useState(false);
  return (
    <>
      <AgentHero
        actions={
          <Connect
            data={data}
            fresh={fresh}
            onMade={(link) => {
              setFresh(link);
              setMade(true);
            }}
          />
        }
      />
      <Assistants data={data} fresh={fresh} />
      <AgentAbilities items={abilities} />
      <Purse data={data} enabled={!!data.link || made} />
    </>
  );
}
