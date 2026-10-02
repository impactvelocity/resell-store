"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@repo/ui/button";
import { Sticker } from "@repo/ui/sticker";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { AgentMessage, Spinner, Thread } from "../agent-chat/agent-chat";
import { draftListing } from "../../lib/mock";
import {
  connectedAs,
  listingLink,
  listingShop,
  replies,
  type Platform,
} from "../../lib/mock-listing-later";
import { LiveWorkspace } from "./live-workspace";
import { setListing, useListing } from "./store";
import { useAgentChat } from "./use-agent-chat";

/* C8 Listing / List elsewhere. The same workspace, after publishing. */

const id = draftListing.id;
const doneHref = "/listings/dutch-oven";

function LiveCard() {
  return (
    <div className="flex w-full items-center gap-3.5 rounded-lg border border-border bg-surface px-[18px] py-4 desk:px-5 desk:py-[18px]">
      <Sticker tone="accent" rotate={-5} className="h-9 px-3.5 py-0 text-base leading-5 desk:h-auto desk:py-1.5 desk:text-lg">
        It&apos;s live
      </Sticker>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-bold">
          Yellow dutch oven, ${draftListing.price}
        </span>
        <span className="truncate text-sm font-medium text-secondary">
          {listingLink}
        </span>
      </div>
    </div>
  );
}

function Toggle({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors",
        on ? "justify-end bg-secondary" : "justify-start bg-border",
      )}
    >
      <span className="size-[22px] rounded-full bg-surface shadow-[0_1px_2px_rgb(20_38_29/0.2)]" />
    </button>
  );
}

function GoodFit() {
  return (
    <span className="flex h-6 shrink-0 items-center rounded-full bg-accent-soft px-2.5 text-sm font-semibold text-accent-text desk:h-7 desk:px-3">
      Good fit
    </span>
  );
}

function PlatformRow({
  platform,
  connecting,
  onConnect,
  onToggle,
}: {
  platform: Platform;
  connecting: boolean;
  onConnect: () => void;
  onToggle: (on: boolean) => void;
}) {
  const { connected, on } = platform;
  const detail = connected
    ? on
      ? connectedAs
      : "Connected. Switch on to post it here too."
    : platform.pitch;
  const phoneDetail = connected && on ? "Connected. Goes up in about a minute." : detail;
  return (
    <div className="flex items-center gap-3 border-b border-border py-3.5 last:border-b-0 desk:gap-3.5 desk:py-4">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-md font-display text-lg font-extrabold",
          connected ? "bg-secondary-soft desk:text-secondary" : "bg-surface-muted",
        )}
      >
        {platform.letter}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold desk:font-semibold">{platform.name}</span>
          {platform.goodFit && !connected && (
            <span className="desk:hidden">
              <GoodFit />
            </span>
          )}
        </div>
        <span className="text-sm text-text-muted">
          <span className="desk:hidden">{phoneDetail}</span>
          <span className="hidden desk:inline">{detail}</span>
        </span>
      </div>
      {platform.goodFit && !connected && (
        <span className="hidden desk:flex">
          <GoodFit />
        </span>
      )}
      {connected && on && (
        <span className="hidden h-7 shrink-0 items-center rounded-full bg-secondary-soft px-3 text-sm font-semibold text-secondary desk:flex">
          Will post
        </span>
      )}
      {connected ? (
        <Toggle on={on} label={`Post on ${platform.name}`} onChange={onToggle} />
      ) : (
        <button
          type="button"
          disabled={connecting}
          onClick={onConnect}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-border bg-surface px-4 text-sm font-bold transition-colors enabled:hover:bg-surface-muted disabled:cursor-default desk:h-11 desk:px-5"
        >
          {connecting && <Spinner size={16} />}
          {connecting ? "Connecting" : "Connect"}
        </button>
      )}
    </div>
  );
}

function postingLine(count: number) {
  const where =
    count === 0
      ? "Not posting anywhere else."
      : `Posting to ${count} other place${count === 1 ? "" : "s"}.`;
  return `${where} You can change this later from the listing.`;
}

export function ElsewhereScreen() {
  const { platforms, published } = useListing();
  const toast = useToast();
  const chat = useAgentChat(replies.elsewhere);
  const [connecting, setConnecting] = useState<string | null>(null);
  const count = platforms.filter((p) => p.connected && p.on).length;

  // Arriving here straight from a link still means it's live
  useEffect(() => {
    if (!published) setListing({ published: true });
  }, [published]);

  function update(key: string, patch: Partial<Platform>) {
    setListing((s) => ({
      platforms: s.platforms.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    }));
  }

  function connect(p: Platform) {
    setConnecting(p.key);
    setTimeout(() => {
      setConnecting(null);
      update(p.key, { connected: true, on: true });
      toast.add({ title: `${p.name} connected. It'll go up there too.` });
      chat.system(`You connected ${p.name}`);
    }, 1200);
  }

  const list = (
    <div className="flex w-full flex-col rounded-lg border border-border bg-surface px-[18px] py-1 desk:px-6">
      {platforms.map((p) => (
        <PlatformRow
          key={p.key}
          platform={p}
          connecting={connecting === p.key}
          onConnect={() => connect(p)}
          onToggle={(on) => update(p.key, { on })}
        />
      ))}
    </div>
  );

  const done = (
    <Button render={<Link href={doneHref} />} nativeButton={false} className="w-full desk:w-auto">
      Done, go to the listing
    </Button>
  );

  return (
    <LiveWorkspace
      listingId={id}
      shopName={listingShop.name}
      busy={chat.busy}
      onSend={(text) => chat.send(text)}
      backHref={`/list/${id}/publish`}
      chat={
        <Thread>
          <LiveCard />
          <AgentMessage>
            Want it in more places too? It&apos;s the same listing everywhere.
            When it sells in one place, I take it down in the others so you
            never sell it twice.
          </AgentMessage>
          <AgentMessage className="hidden desk:flex">
            For cookware like this, eBay tends to find buyers fastest.
          </AgentMessage>

          {/* Phone: the list sits in the chat */}
          <div className="flex flex-col gap-4 desk:hidden">
            {list}
            <p className="text-center text-sm text-text-muted">{postingLine(count)}</p>
            {done}
          </div>

          {chat.thread}
        </Thread>
      }
      canvas={
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              List it in more places
            </h2>
            <p className="text-sm text-text-muted">
              Optional. Price, photos and sold status stay in sync.
            </p>
          </div>
          {list}
          <div className="flex items-center justify-between gap-6">
            <p className="text-sm text-text-muted">{postingLine(count)}</p>
            {done}
          </div>
        </div>
      }
    />
  );
}
