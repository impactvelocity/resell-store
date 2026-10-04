"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CompSite, MarketLoginStatus } from "@repo/db";
import { Button } from "@repo/ui/button";
import { useToast } from "@repo/ui/toast";
import { connectMarketLogin, disconnectMarketLogin, refreshMarketLogin } from "../../app/actions/market-logins";
import { LetterTile, SoonRow, Tag } from "../empty/coming-soon";

const returned: Record<string, (label: string) => string> = {
  connected: (l) => `Signed in to ${l}.`,
  pending: (l) => `${l} isn't finished yet. Check again in a moment.`,
  needs_auth: (l) => `${l} needs you to sign in again.`,
  failed: (l) => `The ${l} sign-in didn't finish. Try again.`,
  error: (l) => `We couldn't check with ${l}. Try Check again in a minute.`,
};

/**
 * D1: one marketplace sign-in row. Kernel's hosted page opens in a new tab;
 * we never see the password. When this tab comes back into view it asks
 * Kernel where the sign-in stands.
 */
export function MarketLoginConnect({
  site,
  label,
  letter,
  unlocks,
  status,
  lastError,
  enabled,
  result,
}: {
  site: CompSite;
  label: string;
  letter: string;
  unlocks: string;
  status: MarketLoginStatus | null;
  lastError: string | null;
  /** The server has a Kernel key. */
  enabled: boolean;
  /** ?result= when Kernel sent this site's sign-in back here */
  result: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [waiting, setWaiting] = useState(false);

  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (!result || shown.current === result) return;
    shown.current = result;
    toast.add({ title: (returned[result] ?? returned.error!)(label) });
    router.replace("/tools/connections", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (!waiting) return;
    let checking = false;
    const onBack = async () => {
      if (document.visibilityState !== "visible" || checking) return;
      checking = true;
      const res = await refreshMarketLogin(site);
      checking = false;
      if (res.ok && res.status === "connected") {
        setWaiting(false);
        toast.add({ title: returned.connected!(label) });
      }
      router.refresh();
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const connected = status === "connected";
  const tile = <LetterTile tone={connected ? "leaf" : "muted"}>{letter}</LetterTile>;
  if (!enabled) return <SoonRow tile={tile} title={label} description={unlocks} tag={<Tag>Soon</Tag>} />;

  // Opened on the click itself so pop-up blockers allow it
  const connect = () => {
    const tab = window.open("about:blank", "_blank");
    start(async () => {
      const res = await connectMarketLogin(site);
      if (!res.ok) {
        tab?.close();
        return void toast.add({ title: res.error });
      }
      if (!tab) return window.location.assign(res.url);
      tab.opener = null;
      tab.location.href = res.url;
      setWaiting(true);
    });
  };
  const check = () =>
    start(async () => {
      const res = await refreshMarketLogin(site);
      toast.add({ title: !res.ok ? res.error : (returned[res.status ?? "error"] ?? returned.error!)(label) });
      if (res.ok && res.status === "connected") setWaiting(false);
      router.refresh();
    });
  const disconnect = () =>
    start(async () => {
      const res = await disconnectMarketLogin(site);
      toast.add({ title: res.ok ? `Signed out of ${label}.` : res.error });
      setWaiting(false);
      router.refresh();
    });

  const note =
    waiting && !connected
      ? `Finish signing in to ${label} in the other tab. This updates when you come back.`
      : status === "needs_auth" || status === "failed"
        ? (lastError ?? `Sign in to ${label} again.`)
        : unlocks;

  return (
    <div className="flex w-full flex-col gap-3 border-b border-border py-4 last:border-b-0">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {tile}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 text-base font-bold">
            {label}
            {connected && <Tag tone="leaf">Signed in</Tag>}
            {status === "needs_auth" && <Tag>Signed out</Tag>}
          </span>
          <span className="text-sm text-text-muted">{note}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-[58px]">
        {waiting && !connected ? (
          <Button size="md" variant="soft" onClick={check} disabled={pending}>
            I&apos;m done, check now
          </Button>
        ) : !connected ? (
          <Button size="md" variant="secondary" onClick={connect} disabled={pending}>
            {pending ? `Opening ${label}...` : status && status !== "pending" ? "Sign in again" : `Sign in to ${label}`}
          </Button>
        ) : null}
        {status === "pending" && !waiting && (
          <Button size="md" variant="soft" onClick={check} disabled={pending}>
            Check again
          </Button>
        )}
        {status && (
          <Button size="md" variant="ghost" onClick={disconnect} disabled={pending}>
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}
