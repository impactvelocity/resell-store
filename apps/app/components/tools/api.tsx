"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { ArrowUpRightIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import {
  apiKey,
  apiUsage,
  curlDesktop,
  curlPhone,
  endpoints,
  webhook,
} from "../../lib/mock-tools";
import { MobileBackHeader, Page, PageHeader } from "../shell/page";
import { TextAction, useCopy } from "./parts";
import { RegenerateDialog, useSecret } from "./secret";

/* D3 API */

const card =
  "flex w-full flex-col gap-3.5 rounded-lg border border-border bg-surface p-5 desk:rounded-xl desk:p-7";

const title = "font-display text-xl font-extrabold tracking-tight";

function ReadTheDocs({ className }: { className?: string }) {
  const toast = useToast();
  return (
    <Button
      variant="soft"
      className={className}
      onClick={() =>
        toast.add({ title: "The docs open here once they're live." })
      }
    >
      Read the docs
      <ArrowUpRightIcon size={16} strokeWidth={2.4} />
    </Button>
  );
}

function KeyCard({ secret }: { secret: ReturnType<typeof useSecret> }) {
  const { copy, copied } = useCopy();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const doCopy = () =>
    copy("key", secret.full, "Key copied. Keep it somewhere safe.");

  return (
    <section className={cn(card, "desk:gap-4")}>
      <div className="flex items-baseline justify-between gap-3 desk:items-center">
        <h2 className={title}>Your secret key</h2>
        <span className="text-sm text-text-muted">
          <span className="desk:hidden">{apiKey.madeShort}</span>
          <span className="hidden desk:inline">{apiKey.made}</span>
        </span>
      </div>
      <div className="flex h-[52px] w-full items-center justify-between gap-3 rounded-full border-[1.5px] border-border bg-surface px-[18px] desk:h-14 desk:pr-2 desk:pl-5">
        <span className="min-w-0 overflow-x-auto font-mono text-sm font-medium whitespace-nowrap [scrollbar-width:none]">
          <span className="desk:hidden">{secret.displayShort}</span>
          <span className="hidden desk:inline">{secret.display}</span>
        </span>
        <div className="hidden shrink-0 items-center gap-1.5 desk:flex">
          <button
            type="button"
            onClick={secret.toggleReveal}
            aria-pressed={secret.revealed}
            className="flex h-10 cursor-pointer items-center rounded-full bg-surface-muted px-3.5 text-sm font-bold transition-colors outline-none hover:bg-border focus-visible:outline-2 focus-visible:outline-secondary"
          >
            {secret.revealed ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            onClick={doCopy}
            className="flex h-10 cursor-pointer items-center rounded-full bg-primary px-4 text-sm font-bold text-on-primary transition-colors outline-none hover:bg-lemon-300 focus-visible:outline-2 focus-visible:outline-secondary"
          >
            {copied === "key" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="flex w-full gap-2 desk:hidden">
        <Button
          variant="soft"
          size="md"
          onClick={secret.toggleReveal}
          aria-pressed={secret.revealed}
          className="flex-1 border-0 bg-surface-muted hover:bg-border"
        >
          {secret.revealed ? "Hide" : "Show"}
        </Button>
        <Button size="md" onClick={doCopy} className="flex-1">
          {copied === "key" ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="flex flex-col items-start gap-3.5 desk:flex-row desk:justify-between desk:gap-4">
        <p className="text-sm text-text-muted desk:flex-1">
          Treat it like a password. Anyone who has it can manage your shops.
        </p>
        <TextAction onClick={() => setConfirmOpen(true)}>
          Make a new key
        </TextAction>
      </div>
      <RegenerateDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        thing="key"
        onConfirm={secret.regenerate}
      />
    </section>
  );
}

function UsageCard() {
  const pct = (apiUsage.used / apiUsage.limit) * 100;
  return (
    <section className={card}>
      <h2 className={title}>Used this month</h2>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl leading-[44px] font-extrabold tracking-tight">
          {apiUsage.used.toLocaleString("en-US")}
        </span>
        <span className="text-base text-text-muted">
          of {apiUsage.limit.toLocaleString("en-US")} requests
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Requests used this month"
        aria-valuemin={0}
        aria-valuemax={apiUsage.limit}
        aria-valuenow={apiUsage.used}
        className="h-3 w-full rounded-full bg-surface-muted"
      >
        <div
          className="h-3 rounded-full bg-secondary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-text-muted">
        Starts over on October 1. Free while we&apos;re in beta.
      </p>
    </section>
  );
}

function CodeSample({ suffix }: { suffix: string }) {
  const { copy, copied } = useCopy();
  const desktop = curlDesktop.replace(apiKey.suffix, suffix);
  return (
    <section className="flex w-full flex-col gap-3.5 overflow-hidden rounded-lg bg-text p-5 desk:gap-4 desk:rounded-xl desk:px-7 desk:pt-6 desk:pb-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 flex-1 text-base font-bold text-on-secondary">
          List something with one request
        </h2>
        <button
          type="button"
          onClick={() =>
            copy("curl", desktop, "Copied. Swap in your key and run it.")
          }
          className="flex h-8 shrink-0 cursor-pointer items-center rounded-full bg-on-secondary/14 px-3.5 text-sm font-bold text-on-secondary transition-colors outline-none hover:bg-on-secondary/24 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {copied === "curl" ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto font-mono text-sm leading-6 text-lemon-300 [scrollbar-width:thin]">
        <code className="desk:hidden">{curlPhone}</code>
        <code className="hidden desk:inline">{desktop}</code>
      </pre>
    </section>
  );
}

function EndpointsCard() {
  return (
    <section className="flex w-full flex-col rounded-lg border border-border bg-surface px-5 pt-5 pb-1.5 desk:rounded-xl desk:px-7 desk:pt-6 desk:pb-2">
      <h2 className={cn(title, "pb-2")}>What you can reach</h2>
      {endpoints.map((e) => (
        <div
          key={e.path}
          className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0"
        >
          <span className="w-[148px] shrink-0 font-mono text-sm font-semibold">
            {e.path}
          </span>
          <span className="min-w-0 flex-1 text-sm text-text-muted">
            {e.what}
          </span>
        </div>
      ))}
    </section>
  );
}

function WebhooksCard() {
  const toast = useToast();
  const [url, setUrl] = useState(webhook.url);
  const [draft, setDraft] = useState(webhook.url);
  const [editing, setEditing] = useState(false);
  const [events, setEvents] = useState(webhook.events);

  const save = () => {
    const next = draft.trim() || url;
    setUrl(next);
    setDraft(next);
    setEditing(false);
    toast.add({ title: "Saved. We'll send events there." });
  };

  return (
    <section className={card}>
      <div className="flex flex-col gap-0.5">
        <h2 className={title}>Webhooks</h2>
        <p className="text-sm text-text-muted">
          We&apos;ll tell your server when something happens.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (editing) save();
          else setEditing(true);
        }}
        className={cn(
          "flex h-[52px] w-full items-center justify-between gap-3 rounded-full border-[1.5px] bg-surface px-5 transition-colors",
          editing ? "border-secondary" : "border-border",
        )}
      >
        {editing ? (
          <input
            autoFocus
            type="url"
            aria-label="Webhook address"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraft(url);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 bg-transparent font-mono text-sm font-medium outline-none"
          />
        ) : (
          <span className="min-w-0 truncate font-mono text-sm font-medium">
            <span className="desk:hidden">{url.replace(/^https?:\/\//, "")}</span>
            <span className="hidden desk:inline">{url}</span>
          </span>
        )}
        <TextAction type="submit">{editing ? "Save" : "Edit"}</TextAction>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {events.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={e.on}
            onClick={() => {
              setEvents((list) =>
                list.map((x) => (x.id === e.id ? { ...x, on: !x.on } : x)),
              );
              toast.add({
                title: e.on
                  ? `We'll stop sending ${e.id}.`
                  : `We'll send ${e.id} too.`,
              });
            }}
            className={cn(
              "flex h-8 cursor-pointer items-center rounded-full px-3 font-mono text-sm font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-secondary",
              e.on
                ? "bg-secondary-soft text-text hover:bg-leaf-300/50"
                : "bg-surface-muted text-text-muted hover:bg-border",
            )}
          >
            {e.id}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ApiScreen() {
  const secret = useSecret(apiKey);
  return (
    <>
      <MobileBackHeader title="API" backHref="/me" />
      <Page className="gap-4 pb-8 desk:gap-7 desk:pt-8">
        <PageHeader
          className="hidden desk:flex"
          title="API"
          description="For developers. Everything you can do in the app, your code can do too."
          actions={<ReadTheDocs className="h-11 px-5 text-sm" />}
        />
        <p className="text-base text-text-muted desk:hidden">
          For developers. Everything you can do in the app, your code can do
          too.
        </p>
        <div className="flex flex-col gap-4 desk:flex-row desk:items-start desk:gap-6">
          <div className="contents desk:flex desk:min-w-0 desk:flex-1 desk:flex-col desk:gap-6">
            <div className="order-1 desk:order-none">
              <KeyCard secret={secret} />
            </div>
            <div className="order-2 desk:order-none">
              <UsageCard />
            </div>
            <div className="order-5 desk:order-none">
              <WebhooksCard />
            </div>
          </div>
          <div className="contents desk:flex desk:min-w-0 desk:flex-[1.15] desk:flex-col desk:gap-6">
            <div className="order-3 min-w-0 desk:order-none">
              <CodeSample suffix={secret.suffix} />
            </div>
            <div className="order-4 desk:order-none">
              <EndpointsCard />
            </div>
          </div>
          <div className="order-6 desk:hidden">
            <ReadTheDocs className="h-[52px] w-full" />
          </div>
        </div>
      </Page>
    </>
  );
}
