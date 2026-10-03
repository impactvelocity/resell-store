"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { useToast } from "@repo/ui/toast";
import { connectPayPal, linkDemoSeller, refreshPayPal, unlinkPayPal } from "../../app/actions/paypal";
import type { SandboxLogin as Login } from "../../lib/server/paypal";
import { LetterTile, SoonRow, Tag } from "../empty/coming-soon";
import { SandboxLogin } from "../sandbox-login";

export type PayPalState = "none" | "confirm-email" | "not-receivable" | "missing-permissions" | "ready";

const describe: Record<PayPalState, string> = {
  none: "Connect it to get paid. Buyers' money waits with PayPal until they have the item.",
  "confirm-email": "Almost there: confirm your email with PayPal, then check again.",
  "not-receivable": "PayPal isn't letting this account take payments yet. Check your PayPal account.",
  "missing-permissions": "Connect again and allow everything PayPal asks for, so sales can pay out.",
  ready: "Sales pay out here once the buyer has the item.",
};

const returned: Record<string, string> = {
  connected: "PayPal is connected.",
  demo: "Linked to the demo PayPal.",
  incomplete: "PayPal wasn't finished. Connect again to pick up where you left off.",
  error: "We couldn't check with PayPal. Try Check again in a minute.",
};

/** D1's PayPal row: connect, see where it stands, check again or unlink. */
export function PayPalConnect({
  state,
  merchantId,
  enabled,
  result,
  demo = false,
  sandbox = null,
}: {
  state: PayPalState;
  merchantId: string | null;
  /** Linked to the shared demo seller rather than their own PayPal. */
  demo?: boolean;
  /**
   * PayPal's test system: say so, and offer the shared demo seller. `seller`
   * is its login, to watch sales land on PayPal's side.
   */
  sandbox?: { demoSeller: boolean; seller: Login | null } | null;
  /** The server has PayPal keys. Without them it's the "Soon" row. */
  enabled: boolean;
  /** ?paypal= after PayPal sends the seller back */
  result: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  // PayPal is open in another tab; check with PayPal whenever this one comes back into view
  const [waiting, setWaiting] = useState(false);

  // Once per return from PayPal; the toast manager is a new object every render
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (!result || !returned[result] || shown.current === result) return;
    shown.current = result;
    toast.add({ title: returned[result] });
    router.replace("/tools/connections", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (!waiting) return;
    let checking = false;
    const onBack = async () => {
      if (document.visibilityState !== "visible" || checking) return;
      checking = true;
      const res = await refreshPayPal();
      checking = false;
      if (res.ok && res.connected) {
        setWaiting(false);
        toast.add({ title: returned.connected! });
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const tile = <LetterTile tone={state === "ready" ? "leaf" : "muted"}>P</LetterTile>;
  if (!enabled)
    return <SoonRow tile={tile} title="PayPal" description="Get your payouts in a couple of days." tag={<Tag>Soon</Tag>} />;

  /**
   * PayPal opens in a new tab: it doesn't always send people back (an account
   * that was connected before lands on its PayPal dashboard instead). The tab
   * is opened on the click itself so pop-up blockers allow it.
   */
  const connect = () => {
    const tab = window.open("about:blank", "_blank");
    start(async () => {
      const res = await connectPayPal();
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
      const res = await refreshPayPal();
      toast.add({ title: !res.ok ? res.error : res.connected ? "Updated from PayPal." : "PayPal doesn't have you connected yet." });
      if (res.ok && res.connected) setWaiting(false);
      router.refresh();
    });
  const linkDemo = () =>
    start(async () => {
      const res = await linkDemoSeller();
      toast.add({
        title: !res.ok ? res.error : res.linked ? returned.demo! : "The demo PayPal isn't set up on this server yet.",
      });
      if (res.ok && res.linked) setWaiting(false);
      router.refresh();
    });
  const unlink = () =>
    start(async () => {
      const res = await unlinkPayPal();
      toast.add({ title: res.ok ? "PayPal unlinked. Remove resell.store from your PayPal settings too." : res.error });
      router.refresh();
    });

  const busy = pending;
  return (
    <div className="flex w-full flex-col gap-3 border-b border-border py-4 last:border-b-0">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {tile}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 text-base font-bold">
            PayPal
            {state === "ready" && <Tag tone="leaf">{demo ? "Demo" : "Connected"}</Tag>}
          </span>
          <span className="text-sm text-text-muted">
            {waiting && state !== "ready"
              ? "Finish connecting in the PayPal tab. This updates when you come back."
              : demo && state === "ready"
                ? "Linked to the shared demo PayPal. Your sales pay out to it once the buyer has the item."
                : describe[state]}
          </span>
          {merchantId && <span className="text-xs text-text-muted">Merchant ID {merchantId}</span>}
        </div>
      </div>
      {sandbox && (
        <SandboxLogin
          title="Sandbox mode: no real money"
          login={demo ? sandbox.seller : null}
        >
          {demo ? (
            <>
              Everyone trying the demo shares this PayPal test account. To watch your sales land and pay out, sign in
              at{" "}
              <a href="https://www.sandbox.paypal.com" target="_blank" rel="noreferrer" className="font-bold underline">
                sandbox.paypal.com
              </a>{" "}
              with:
            </>
          ) : state !== "none" ? (
            "PayPal here is its test system, so sales move pretend money between test accounts."
          ) : sandbox.demoSeller ? (
            "PayPal here is its test system, so real PayPal logins won't work. Use the demo PayPal to skip signing up, or connect a PayPal sandbox account of your own."
          ) : (
            "PayPal here is its test system, so real PayPal logins won't work. Connect with a PayPal sandbox account."
          )}
        </SandboxLogin>
      )}
      <div className="flex flex-wrap gap-2 pl-[58px]">
        {sandbox?.demoSeller && !waiting && (state === "none" || state === "missing-permissions") && (
          <Button size="md" variant="secondary" onClick={linkDemo} disabled={busy}>
            Use demo PayPal
          </Button>
        )}
        {waiting && state !== "ready" ? (
          <Button size="md" variant="soft" onClick={check} disabled={busy}>
            I&apos;m done, check now
          </Button>
        ) : state === "none" || state === "missing-permissions" ? (
          <Button size="md" variant={sandbox?.demoSeller ? "soft" : "secondary"} onClick={connect} disabled={busy}>
            {pending ? "Opening PayPal..." : state === "none" ? "Connect PayPal" : "Connect again"}
          </Button>
        ) : state !== "ready" ? (
          <Button size="md" variant="soft" onClick={check} disabled={busy}>
            Check again
          </Button>
        ) : null}
        {state !== "none" && (
          <Button size="md" variant="ghost" onClick={unlink} disabled={busy}>
            Unlink
          </Button>
        )}
      </div>
    </div>
  );
}
