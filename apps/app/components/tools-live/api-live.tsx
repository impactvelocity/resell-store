"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { ArrowUpRightIcon, LockIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import {
  deleteApiKey,
  makeApiKey,
  newWebhookSecret,
  removeWebhook,
  saveWebhookSettings,
  sendTestWebhook,
} from "../../app/actions/developer";
import { MobileBackHeader, Page, PageHeader } from "../shell/page";
import { MiniSpinner, TextAction, useCopy } from "../tools/parts";
import { ConfirmDialog } from "./confirm";

/*
 * D3 API, live: the secret key (masked, with Show and Copy), this month's
 * requests, a request to try, what you can reach, and webhooks.
 */

export type ApiScreenData = {
  /** `token` is the full key, or null for one made before we kept keys to show again. */
  key: { masked: string; token: string | null; made: string; lastUsed: string | null } | null;
  usage: { used: number; limit: number; resets: string };
  apiBase: string;
  docs: { home: string; postman: string; groups: { title: string; href: string; blurb: string }[] };
  webhook: {
    url: string;
    events: string[];
    secretLast4: string;
    last: { at: string; status: number | null; error: string | null } | null;
    /** False once we've turned it off after three days of failures; saving switches it back on. */
    enabled: boolean;
    /** Events waiting to be tried again. */
    retrying: number;
  } | null;
  events: { id: string; what: string }[];
  shop: string | null;
};

const card = "flex w-full flex-col gap-3.5 rounded-lg border border-border bg-surface p-5 desk:rounded-xl desk:p-7";
const title = "font-display text-xl font-extrabold tracking-tight";

function ReadTheDocs({ href, className }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-border bg-surface font-bold transition-colors hover:bg-surface-muted",
        className,
      )}
    >
      Read the docs
      <ArrowUpRightIcon size={16} strokeWidth={2.4} />
    </a>
  );
}

/** A secret on screen, once: the full value with Copy, and a warning. */
function FreshSecret({ value, what, onDone }: { value: string; what: string; onDone: () => void }) {
  const { copy, copied } = useCopy();
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-primary-soft p-4">
      <p className="text-sm font-bold">Copy your {what} now. You won&apos;t see it again.</p>
      <div className="flex h-[52px] items-center gap-2 rounded-full border-[1.5px] border-border bg-surface pr-1.5 pl-4">
        <span className="min-w-0 flex-1 overflow-x-auto font-mono text-sm font-medium whitespace-nowrap [scrollbar-width:none]">{value}</span>
        <button
          type="button"
          onClick={() => copy("fresh", value, `Copied. Keep it somewhere safe.`)}
          className="flex h-10 shrink-0 cursor-pointer items-center rounded-full bg-primary px-4 text-sm font-bold text-on-primary transition-colors hover:bg-lemon-300"
        >
          {copied === "fresh" ? "Copied" : "Copy"}
        </button>
      </div>
      <TextAction className="w-fit" onClick={onDone}>
        I&apos;ve saved it
      </TextAction>
    </div>
  );
}

function KeyCard({ data, onToken }: { data: ApiScreenData; onToken: (token: string | null) => void }) {
  const toast = useToast();
  const { copy, copied } = useCopy();
  const [fresh, setFresh] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"new" | "delete" | null>(null);
  const token = fresh ?? data.key?.token ?? null;

  const make = async () => {
    setBusy(true);
    const res = await makeApiKey();
    setBusy(false);
    if (!res.ok) {
      toast.add({ title: res.error });
      return;
    }
    setFresh(res.token);
    setShown(true);
    onToken(res.token);
    toast.add({ title: data.key ? "New key made. The old one stopped working." : "Key made." });
  };

  return (
    <section className={cn(card, "desk:gap-4")}>
      <div className="flex items-baseline justify-between gap-3 desk:items-center">
        <h2 className={title}>Your secret key</h2>
        {data.key && !fresh && <span className="text-sm text-text-muted">{data.key.made}</span>}
      </div>
      {data.key || fresh ? (
        <>
          <div className="flex h-[52px] w-full items-center gap-2 rounded-full border-[1.5px] border-border bg-surface pr-1.5 pl-[18px] desk:h-14 desk:pl-5">
            <LockIcon size={16} strokeWidth={2.2} className="shrink-0 text-text-muted" />
            <span className="min-w-0 flex-1 overflow-x-auto font-mono text-sm font-medium whitespace-nowrap [scrollbar-width:none]">
              {shown && token ? token : token ? `rs_live_${"•".repeat(16)}${token.slice(-4)}` : data.key?.masked}
            </span>
            {token && (
              <button
                type="button"
                onClick={() => copy("key", token, "Key copied.")}
                className="flex h-9 shrink-0 cursor-pointer items-center rounded-full bg-primary px-3.5 text-sm font-bold text-on-primary transition-colors outline-none hover:bg-lemon-300 focus-visible:outline-2 focus-visible:outline-secondary desk:h-10 desk:px-4"
              >
                {copied === "key" ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          <p className="text-sm text-text-muted">
            {fresh ? "Made just now. " : data.key?.lastUsed ? `Last used ${data.key.lastUsed}. ` : "Not used yet. "}
            {token
              ? "You can show or copy it here any time."
              : "This key was made before keys could be shown again. Make a new one to see it here."}
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            A key lets your own code manage your shops: list things, answer offers, follow sales. It works like a password, so keep it
            private.
          </p>
          <Button size="md" className="w-fit" onClick={make} disabled={busy}>
            {busy && <MiniSpinner />}
            Make a key
          </Button>
        </div>
      )}
      {(data.key || fresh) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="text-sm text-text-muted">Anyone who has it can manage your shops.</p>
          <div className="flex gap-5">
            {token && <TextAction onClick={() => setShown((v) => !v)}>{shown ? "Hide key" : "Show key"}</TextAction>}
            <TextAction tone="danger" onClick={() => setConfirm("delete")}>
              Delete key
            </TextAction>
            <TextAction onClick={() => setConfirm("new")}>Make a new key</TextAction>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirm === "new"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Make a new key?"
        description="The old key stops working right away, and every script using it has to be set up again with the new one."
        confirm="Make a new key"
        onConfirm={make}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete your key?"
        description="It stops working right away. Your agent link isn't affected."
        confirm="Delete key"
        cancel="Keep it"
        danger
        onConfirm={async () => {
          await deleteApiKey();
          setFresh(null);
          setShown(false);
          onToken(null);
          toast.add({ title: "Key deleted. It doesn't work any more." });
        }}
      />
    </section>
  );
}

function UsageCard({ usage }: { usage: ApiScreenData["usage"] }) {
  const pct = Math.min(100, (usage.used / usage.limit) * 100);
  return (
    <section className={card}>
      <h2 className={title}>Used this month</h2>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl leading-[44px] font-extrabold tracking-tight">{usage.used.toLocaleString("en-US")}</span>
        <span className="text-base text-text-muted">of {usage.limit.toLocaleString("en-US")} requests</span>
      </div>
      <div
        role="progressbar"
        aria-label="Requests used this month"
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={usage.used}
        className="h-3 w-full rounded-full bg-surface-muted"
      >
        <div className="h-3 rounded-full bg-secondary" style={{ width: `${Math.max(pct, usage.used ? 1 : 0)}%` }} />
      </div>
      <p className="text-sm text-text-muted">Starts over on {usage.resets}. Free while we&apos;re in beta. Your agent link counts too.</p>
    </section>
  );
}

function CodeSample({ data, token }: { data: ApiScreenData; token: string | null }) {
  const { copy, copied } = useCopy();
  const masked = data.key ? data.key.masked.replace(/•+/, "...") : "rs_live_...";
  const shop = data.shop ?? "my-shop";
  // On screen the key stays masked; Copy puts the real one in
  const sample = (key: string) => `curl ${data.apiBase}/listings \\
  -H "Authorization: Bearer ${key}" \\
  -d shop="${shop}" \\
  -d title="Yellow dutch oven, 5.5 qt" \\
  -d price=185 \\
  -d lowest_price=160`;
  return (
    <section className="flex w-full flex-col gap-3.5 overflow-hidden rounded-lg bg-text p-5 desk:gap-4 desk:rounded-xl desk:px-7 desk:pt-6 desk:pb-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 flex-1 text-base font-bold text-on-secondary">List something with one request</h2>
        <button
          type="button"
          onClick={() => copy("curl", sample(token ?? masked), token ? "Copied, with your key in it." : "Copied. Swap in your key and run it.")}
          className="flex h-8 shrink-0 cursor-pointer items-center rounded-full bg-on-secondary/14 px-3.5 text-sm font-bold text-on-secondary transition-colors outline-none hover:bg-on-secondary/24 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {copied === "curl" ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto font-mono text-sm leading-6 text-lemon-300 [scrollbar-width:thin]">
        <code>{sample(masked)}</code>
      </pre>
      <p className="text-sm text-on-secondary/70">It makes a draft. Add <code className="text-lemon-300">-d publish=true</code> to put it live.</p>
    </section>
  );
}

function EndpointsCard({ docs }: { docs: ApiScreenData["docs"] }) {
  return (
    <section className="flex w-full flex-col rounded-lg border border-border bg-surface px-5 pt-5 pb-1.5 desk:rounded-xl desk:px-7 desk:pt-6 desk:pb-2">
      <h2 className={cn(title, "pb-2")}>What you can reach</h2>
      {docs.groups.map((g) => (
        <a
          key={g.href}
          href={g.href}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0"
        >
          <span className="w-[148px] shrink-0 text-sm font-bold group-hover:underline">{g.title}</span>
          <span className="min-w-0 flex-1 text-sm text-text-muted">{g.blurb}</span>
        </a>
      ))}
    </section>
  );
}

/** Postman's mark (Simple Icons, CC0) in its brand orange, on white so the figure reads. */
function PostmanLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Postman" className={className}>
      <circle cx="12" cy="12" r="11" fill="#fff" />
      <path
        fill="#FF6C37"
        d="M13.527.099C6.955-.744.942 3.9.099 10.473c-.843 6.572 3.8 12.584 10.373 13.428 6.573.843 12.587-3.801 13.428-10.374C24.744 6.955 20.101.943 13.527.099zm2.471 7.485a.855.855 0 0 0-.593.25l-4.453 4.453-.307-.307-.643-.643c4.389-4.376 5.180-4.418 5.996-3.753zm-4.863 4.861l4.440-4.440a.62.62 0 1 1 .847.903l-4.699 4.125-.588-.588zm.33.694l-1.100.238a.06.06 0 0 1-.067-.032.06.06 0 0 1 .01-.073l.645-.645.512.512zm-2.803-.459l1.172-1.172.879.878-1.979.426a.074.074 0 0 1-.085-.039.072.072 0 0 1 .013-.093zm-3.646 6.058a.076.076 0 0 1-.069-.083.077.077 0 0 1 .022-.046h.002l.946-.946 1.222 1.222-2.123-.147zm2.425-1.256a.228.228 0 0 0-.117.256l.203.865a.125.125 0 0 1-.211.117h-.003l-.934-.934-.294-.295 3.762-3.758 1.820-.393.874.874c-1.255 1.102-2.971 2.201-5.100 3.268zm5.279-3.428h-.002l-.839-.839 4.699-4.125a.952.952 0 0 0 .119-.127c-.148 1.345-2.029 3.245-3.977 5.091zm3.657-6.460l-.003-.002a1.822 1.822 0 0 1 2.459-2.684l-1.610 1.613a.119.119 0 0 0 0 .169l1.247 1.247a1.817 1.817 0 0 1-2.093-.343zm2.578 0a1.714 1.714 0 0 1-.271.218h-.001l-1.207-1.207 1.533-1.533c.661.72.637 1.832-.054 2.522zM18.855 6.050a.143.143 0 0 0-.053.157.416.416 0 0 1-.053.45.14.14 0 0 0 .023.197.141.141 0 0 0 .084.03.14.14 0 0 0 .106-.05.691.691 0 0 0 .087-.751.138.138 0 0 0-.194-.033z"
      />
    </svg>
  );
}

function PostmanCard({ apiBase, docs, token }: { apiBase: string; docs: string; token: string | null }) {
  const toast = useToast();
  const { copy, copied } = useCopy();
  const [busy, setBusy] = useState(false);
  const link = `${apiBase}/postman.json`;

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(link);
      if (!res.ok) throw new Error();
      const collection = await res.json();
      // Put the key in, so Postman works straight away
      if (token) collection.variable = collection.variable.map((v: { key: string }) => (v.key === "apiKey" ? { ...v, value: token } : v));
      const url = URL.createObjectURL(new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "resell-store.postman_collection.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.add({ title: token ? "Downloaded, with your key in it. Import it in Postman." : "Downloaded. Import it in Postman, then add your key." });
    } catch {
      toast.add({ title: "Couldn't get the collection. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cn(card, "gap-5 desk:gap-6")}>
      <div className="flex items-start gap-4 desk:gap-5">
        <PostmanLogo className="size-14 shrink-0 desk:size-16" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-2xl font-extrabold tracking-tight desk:text-[28px] desk:leading-9">Use it in Postman</h2>
          <p className="text-base text-text-muted">Every request, ready to send. Import it once and try anything in the API.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 desk:flex-row desk:items-center desk:gap-5">
        <Button className="w-full desk:w-auto desk:px-7" onClick={download} disabled={busy}>
          {busy && <MiniSpinner />}
          Download collection
        </Button>
        <div className="flex items-center justify-center gap-5">
          <TextAction onClick={() => copy("postman", link, "Copied. Paste it into Import in Postman.")}>
            {copied === "postman" ? "Copied" : "Copy import link"}
          </TextAction>
          <a
            href={docs}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-sm text-sm font-bold whitespace-nowrap text-secondary outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            How to set it up
            <ArrowUpRightIcon size={14} strokeWidth={2.4} />
          </a>
        </div>
      </div>
      <p className="border-t border-border pt-4 text-sm text-text-muted">
        In Postman, choose Import and drop in the file or paste the link.{" "}
        {token ? (
          "Your key goes in the download, so it works as soon as it's imported. Keep the file private."
        ) : (
          <>
            Make a key first to have it filled in, or put yours in the collection&apos;s{" "}
            <code className="font-mono">apiKey</code> variable.
          </>
        )}
      </p>
    </section>
  );
}

function WebhooksCard({ data }: { data: ApiScreenData }) {
  const toast = useToast();
  const saved = data.webhook;
  const [url, setUrl] = useState(saved?.url ?? "");
  const [events, setEvents] = useState<string[]>(saved?.events ?? ["listing.sold", "offer.received", "question.asked"]);
  const [editing, setEditing] = useState(!saved);
  const [busy, setBusy] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [last, setLast] = useState(saved?.last ?? null);

  const save = async (nextEvents = events, nextUrl = url) => {
    if (!nextUrl.trim()) return toast.add({ title: "Add the address first." });
    setBusy("save");
    const res = await saveWebhookSettings({ url: nextUrl.trim(), events: nextEvents as never });
    setBusy(null);
    if (!res.ok) return toast.add({ title: res.error });
    setEditing(false);
    if (res.secret) setSecret(res.secret);
    toast.add({ title: "Saved. We'll send events there." });
  };

  return (
    <section className={card}>
      <div className="flex flex-col gap-0.5">
        <h2 className={title}>Webhooks</h2>
        <p className="text-sm text-text-muted">We&apos;ll tell your server when something happens.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (editing) void save();
          else setEditing(true);
        }}
        className={cn(
          "flex h-[52px] w-full items-center justify-between gap-3 rounded-full border-[1.5px] bg-surface px-5 transition-colors",
          editing ? "border-secondary" : "border-border",
        )}
      >
        {editing ? (
          <input
            type="url"
            aria-label="Webhook address"
            placeholder="https://example.com/hooks/resell"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && saved) {
                setUrl(saved.url);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 bg-transparent font-mono text-sm font-medium outline-none placeholder:text-text-muted"
          />
        ) : (
          <span className="min-w-0 truncate font-mono text-sm font-medium">{url}</span>
        )}
        <TextAction type="submit" disabled={busy === "save"}>
          {editing ? "Save" : "Edit"}
        </TextAction>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {data.events.map((e) => {
          const on = events.includes(e.id);
          return (
            <button
              key={e.id}
              type="button"
              title={e.what}
              aria-pressed={on}
              onClick={() => {
                const next = on ? events.filter((x) => x !== e.id) : [...events, e.id];
                setEvents(next);
                if (!editing && saved) void save(next);
              }}
              className={cn(
                "flex h-8 cursor-pointer items-center rounded-full px-3 font-mono text-sm font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-secondary",
                on ? "bg-secondary-soft text-text hover:bg-leaf-300/50" : "bg-surface-muted text-text-muted hover:bg-border",
              )}
            >
              {e.id}
            </button>
          );
        })}
      </div>
      {secret && <FreshSecret value={secret} what="signing secret" onDone={() => setSecret(null)} />}
      {saved && !editing && (
        <div className="flex flex-col gap-3 border-t border-border pt-3.5 desk:flex-row desk:items-center desk:justify-between">
          <p className="text-sm text-text-muted">
            {!saved.enabled
              ? (saved.last?.error ?? "This webhook is turned off. Save it again to switch it back on.")
              : last
                ? last.error
                  ? `Last delivery failed: ${last.error}`
                  : `Last delivery ${last.at}: your server said ${last.status}.`
                : `Signed with the secret ending ${saved.secretLast4}.`}
            {saved.enabled && saved.retrying > 0 &&
              ` ${saved.retrying === 1 ? "One event is" : `${saved.retrying} events are`} waiting to be tried again.`}
          </p>
          <div className="flex shrink-0 gap-5">
            <TextAction
              disabled={busy === "test"}
              onClick={async () => {
                setBusy("test");
                const res = await sendTestWebhook();
                setBusy(null);
                if (!res.ok) return toast.add({ title: res.error });
                setLast({ at: "just now", status: res.status, error: res.error });
                toast.add({ title: res.error ? res.error : `Sent. Your server said ${res.status}.` });
              }}
            >
              {busy === "test" ? "Sending…" : "Send a test"}
            </TextAction>
            <TextAction
              onClick={async () => {
                const res = await newWebhookSecret();
                if (!res.ok) return toast.add({ title: res.error });
                setSecret(res.secret);
              }}
            >
              New secret
            </TextAction>
            <TextAction
              tone="danger"
              onClick={async () => {
                await removeWebhook();
                setUrl("");
                setEditing(true);
                setLast(null);
                toast.add({ title: "Stopped. We won't send anything." });
              }}
            >
              Stop
            </TextAction>
          </div>
        </div>
      )}
    </section>
  );
}

export function ApiLiveScreen({ data }: { data: ApiScreenData }) {
  const [token, setToken] = useState<string | null>(data.key?.token ?? null);
  return (
    <>
      <MobileBackHeader title="API" backHref="/me" />
      <Page className="gap-4 pb-8 desk:gap-7 desk:pt-8">
        <PageHeader
          className="hidden desk:flex"
          title="API"
          description="For developers. Everything you can do in the app, your code can do too."
          actions={<ReadTheDocs href={data.docs.home} className="h-11 px-5 text-sm" />}
        />
        <p className="text-base text-text-muted desk:hidden">For developers. Everything you can do in the app, your code can do too.</p>
        <div className="flex flex-col gap-4 desk:flex-row desk:items-start desk:gap-6">
          <div className="contents desk:flex desk:min-w-0 desk:flex-1 desk:flex-col desk:gap-6">
            <div className="order-1 desk:order-none">
              <KeyCard data={data} onToken={setToken} />
            </div>
            <div className="order-2 desk:order-none">
              <UsageCard usage={data.usage} />
            </div>
            <div className="order-6 desk:order-none">
              <WebhooksCard data={data} />
            </div>
          </div>
          <div className="contents desk:flex desk:min-w-0 desk:flex-[1.15] desk:flex-col desk:gap-6">
            <div className="order-3 min-w-0 desk:order-none">
              <CodeSample data={data} token={token} />
            </div>
            <div className="order-4 desk:order-none">
              <PostmanCard apiBase={data.apiBase} docs={data.docs.postman} token={token} />
            </div>
            <div className="order-5 desk:order-none">
              <EndpointsCard docs={data.docs} />
            </div>
          </div>
          <div className="order-7 desk:hidden">
            <ReadTheDocs href={data.docs.home} className="h-[52px] w-full" />
          </div>
        </div>
      </Page>
    </>
  );
}
