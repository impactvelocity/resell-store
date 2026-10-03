"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@repo/ui/button";
import { ArrowUpRightIcon, CheckIcon, CopyIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { deleteAgentLink, makeAgentLink, setAgentRules } from "../../app/actions/developer";
import { MobileBackHeader, Page } from "../shell/page";
import { cn } from "@repo/ui/lib/utils";
import {
  ChoiceMenu,
  GroupCard,
  GroupRow,
  LetterTile,
  LockedPill,
  MiniSpinner,
  StatusPill,
  StepNumber,
  Switch,
  TextAction,
  useCopy,
} from "../tools/parts";
import { ConfirmDialog } from "./confirm";

/*
 * D2 Connect your agent, live. The private link is an agent key: shown in
 * full once, when it's made (we keep only a fingerprint), then masked. What it
 * may do is saved on the key and enforced by the API; "Ask me first" makes
 * the MCP server check with the owner before consequential actions.
 */

export type AgentScreenData = {
  link: {
    masked: string;
    made: string;
    lastUsed: string | null;
    scopes: string[];
    askFirst: string[];
  } | null;
  publicShopping: string;
  docs: { home: string; connect: string; seller: string; buyer: string };
  used: number;
  /** Apps seen with the current link in the last 30 days (lib/server/api/log.ts). */
  apps: { name: string; now: boolean; lastUsed: string }[];
  /** What agent links changed, newest first. */
  activity: { id: string; text: string; who: string; href: string | null; askedFirst: boolean; ok: boolean }[];
};

type Rule = "on" | "ask" | "off";
const choiceLabel = { on: "Always", ask: "Ask me first", off: "Never" } as const;
const fromLabel = { Always: "on", "Ask me first": "ask", Never: "off" } as const;
const choices = ["Always", "Ask me first", "Never"] as const;

const permissions: { scope: string; label: string; hint: string; kind: "toggle" | "choice" }[] = [
  { scope: "read", label: "See listings, sales and stats", hint: "Reading only", kind: "toggle" },
  { scope: "listings", label: "Make and edit listings", hint: "Ask first covers publishing and deleting", kind: "choice" },
  { scope: "messages", label: "Reply to buyers", hint: "Using what's in the listing", kind: "choice" },
  { scope: "offers", label: "Answer offers", hint: "Accept, counter or decline", kind: "choice" },
  { scope: "orders", label: "Mark things shipped", hint: "With the tracking number", kind: "choice" },
  { scope: "buying", label: "Shop for you", hint: "Like, follow, message sellers, make offers. Paying is always you.", kind: "choice" },
];

/** The starting rules a new link gets (keys.ts defaultAgentScopes / defaultAgentAskFirst). */
const defaults: Record<string, Rule> = { read: "on", listings: "on", messages: "on", offers: "ask", orders: "on", buying: "ask" };

function rulesFrom(link: AgentScreenData["link"]): Record<string, Rule> {
  if (!link) return defaults;
  return Object.fromEntries(
    permissions.map((p) => [
      p.scope,
      !link.scopes.includes(p.scope) ? "off" : link.askFirst.includes(p.scope) ? "ask" : "on",
    ]),
  );
}

function CopyRow({ label, value, copyKey }: { label: string; value: string; copyKey: string }) {
  const { copy, copied } = useCopy();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-sm font-bold text-on-secondary">{label}</div>
      <div className="flex w-full flex-col gap-2.5 desk:flex-row desk:gap-2">
        <div className="flex h-14 min-w-0 flex-1 items-center rounded-full bg-surface px-[18px] desk:px-5">
          <span className="min-w-0 overflow-x-auto font-mono text-sm font-medium whitespace-nowrap [scrollbar-width:none]">{value}</span>
        </div>
        <Button className="w-full gap-2 desk:w-auto desk:px-6" onClick={() => copy(copyKey, value, "Link copied. Paste it in your AI app.")}>
          {copied === copyKey ? <CheckIcon size={18} strokeWidth={2.4} /> : <CopyIcon size={18} strokeWidth={2.2} />}
          {copied === copyKey ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

function Hero({ data, onMade }: { data: AgentScreenData; onMade: () => void }) {
  const toast = useToast();
  const [fresh, setFresh] = useState<{ seller: string; buyer: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"new" | "delete" | null>(null);

  const make = async () => {
    setBusy(true);
    const res = await makeAgentLink();
    setBusy(false);
    if (!res.ok) {
      toast.add({ title: res.error });
      return;
    }
    setFresh({ seller: res.seller, buyer: res.buyer });
    onMade();
    toast.add({ title: data.link ? "New link made. The old one stopped working." : "Link made. Copy it now." });
  };

  return (
    <section className="flex w-full flex-col gap-5 rounded-xl bg-secondary px-5 py-6 desk:gap-6 desk:p-9">
      <div className="flex flex-col gap-2 desk:gap-2.5">
        <div className="text-sm font-semibold tracking-wide text-leaf-100 uppercase">Bring your own AI</div>
        <h1 className="font-display text-3xl leading-[38px] font-extrabold tracking-tight text-on-secondary desk:text-[40px] desk:leading-[44px]">
          Let your own AI run the shop
        </h1>
        <p className="text-base text-leaf-100 desk:text-lg desk:leading-7">
          Connect Claude, ChatGPT or any AI app that takes MCP connectors. Then just ask it: list this, answer that buyer, what sold
          this week.
        </p>
      </div>

      {fresh ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-lg bg-primary-soft px-4 py-3 text-sm font-bold text-text">
            Copy your link now. For your safety it&apos;s only shown once; after this you&apos;d make a new one.
          </p>
          <CopyRow label="Your shops" value={fresh.seller} copyKey="seller" />
          <CopyRow label="Shopping, as you" value={fresh.buyer} copyKey="buyer" />
          <TextAction className="w-fit text-on-secondary" onClick={() => setFresh(null)}>
            I&apos;ve added it
          </TextAction>
        </div>
      ) : data.link ? (
        <div className="flex w-full flex-col gap-2.5">
          <div className="text-sm font-bold text-on-secondary">Your private link</div>
          <div className="flex h-14 min-w-0 items-center rounded-full bg-surface px-[18px] desk:px-5">
            <span className="min-w-0 truncate font-mono text-sm font-medium">{data.link.masked}</span>
          </div>
          <div className="flex flex-col gap-2.5 desk:flex-row desk:items-center desk:justify-between desk:gap-4">
            <p className="text-sm text-leaf-100">
              {data.link.made}. {data.link.lastUsed ? `Last used ${data.link.lastUsed}.` : "Not used yet."} It&apos;s a key to your
              account, so it was only shown once. Need it again? Make a new one.
            </p>
            <div className="flex shrink-0 gap-5">
              <button
                type="button"
                onClick={() => setConfirm("delete")}
                className="w-fit cursor-pointer text-sm font-bold text-leaf-100 underline decoration-1 underline-offset-2 hover:decoration-2"
              >
                Turn off
              </button>
              <button
                type="button"
                onClick={() => setConfirm("new")}
                className="w-fit cursor-pointer text-sm font-bold text-on-secondary underline decoration-1 underline-offset-2 hover:decoration-2"
              >
                Make a new link
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <Button className="w-full gap-2 desk:w-fit desk:px-7" onClick={make} disabled={busy}>
            {busy && <MiniSpinner />}
            Make my private link
          </Button>
          <p className="text-sm text-leaf-100">It works like a password for your shop. Only you should have it.</p>
        </div>
      )}

      <ConfirmDialog
        open={confirm === "new"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Make a new link?"
        description="The old link stops working right away, and every AI app using it has to be set up again with the new one. What it may do stays the same."
        confirm="Make a new link"
        onConfirm={make}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Turn off your link?"
        description="Every AI app using it loses access right away. You can make a new one any time."
        confirm="Turn it off"
        cancel="Keep it"
        danger
        onConfirm={async () => {
          await deleteAgentLink();
          toast.add({ title: "Link turned off. No AI app can use it now." });
        }}
      />
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 desk:flex-1 desk:flex-col desk:gap-2.5">
      <StepNumber>{n}</StepNumber>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 desk:gap-2.5">
        <div className="text-base font-bold">{title}</div>
        {children}
      </div>
    </div>
  );
}

function Steps() {
  const { copy } = useCopy();
  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-5 desk:gap-5 desk:rounded-xl desk:p-7">
      <h2 className="font-display text-xl font-extrabold tracking-tight">Three steps, about a minute</h2>
      <div className="flex flex-col gap-4 desk:flex-row desk:gap-5">
        <Step n={1} title="Copy your private link">
          <p className="-mt-1.5 text-sm text-text-muted desk:mt-0">It&apos;s the one above. Only you should have it.</p>
        </Step>
        <Step n={2} title="Add it in your AI app">
          <p className="-mt-1.5 text-sm text-text-muted desk:mt-0">Look for Connectors or MCP servers in its settings and paste the link.</p>
        </Step>
        <Step n={3} title="Ask it something">
          <button
            type="button"
            onClick={() => copy("ask", "What needs me today?", "Copied. Ask it in your AI app.")}
            className="flex h-8 w-fit cursor-pointer items-center rounded-full bg-surface-muted px-3 text-sm font-medium transition-colors outline-none hover:bg-border focus-visible:outline-2 focus-visible:outline-secondary"
          >
            &quot;What needs me today?&quot;
          </button>
        </Step>
      </div>
    </section>
  );
}

function Permissions({ data }: { data: AgentScreenData }) {
  const toast = useToast();
  const [rules, setRules] = useState(() => rulesFrom(data.link));
  const disabled = !data.link;

  const update = async (scope: string, value: Rule, label: string) => {
    const before = rules;
    const next = { ...rules, [scope]: value };
    setRules(next);
    const res = await setAgentRules(next);
    if (!res.ok) {
      setRules(before);
      toast.add({ title: res.error });
      return;
    }
    toast.add({
      title:
        value === "off"
          ? "Saved. It can't do that now."
          : value === "ask"
            ? `Saved. It'll ask you first.`
            : `Saved. It can ${label.toLowerCase()}.`,
    });
  };

  return (
    <GroupCard title="What it may do" description={disabled ? "The starting rules. Make your link, then change them any time." : "Applies to every AI app using your link."}>
      {permissions.map((p) => (
        <GroupRow key={p.scope} className="gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="text-base font-bold">{p.label}</div>
            <div className="text-sm text-text-muted">{p.hint}</div>
          </div>
          {disabled ? (
            <span className="text-sm font-semibold text-text-muted">{choiceLabel[rules[p.scope] ?? "off"]}</span>
          ) : p.kind === "toggle" ? (
            <Switch label={p.label} checked={rules[p.scope] !== "off"} onCheckedChange={(on) => update(p.scope, on ? "on" : "off", p.label)} />
          ) : (
            <ChoiceMenu
              label={p.label}
              value={choiceLabel[rules[p.scope] ?? "off"]}
              options={choices}
              onChange={(v) => update(p.scope, fromLabel[v], p.label)}
            />
          )}
        </GroupRow>
      ))}
      <GroupRow className="gap-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="text-base font-bold">Change where your money goes</div>
          <div className="text-sm text-text-muted">Only you can, signed in here</div>
        </div>
        <LockedPill />
      </GroupRow>
    </GroupCard>
  );
}

function WorksWith({ data }: { data: AgentScreenData }) {
  const apps = [
    { letter: "C", name: "Claude", note: "Settings, Connectors, Add custom connector." },
    { letter: "G", name: "ChatGPT", note: "Settings, Connectors. Choose no authentication." },
    { letter: ">", name: "Claude Code, Cursor, VS Code", note: "One command or a line in mcp.json." },
  ];
  return (
    <GroupCard
      title="Works with"
      description="Anything that speaks MCP."
      action={
        <a href={data.docs.connect} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-bold text-secondary hover:underline">
          How to
          <ArrowUpRightIcon size={14} strokeWidth={2.4} />
        </a>
      }
    >
      {apps.map((app) => (
        <GroupRow key={app.name}>
          <LetterTile tone="leaf">{app.letter}</LetterTile>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="text-base font-bold">{app.name}</div>
            <div className="text-sm text-text-muted">{app.note}</div>
          </div>
        </GroupRow>
      ))}
      <p className="py-4 text-sm text-text-muted">
        Just shopping? Any AI can search resell.store with <span className="font-mono text-text">{data.publicShopping.replace(/^https?:\/\//, "")}</span>, no
        link needed.
      </p>
    </GroupCard>
  );
}

/**
 * Every app shares the one link, so there's no cutting off just one: making a
 * new link is how you stop them all.
 */
function Apps({ data }: { data: AgentScreenData }) {
  return (
    <GroupCard
      title="Using your link now"
      description={data.apps.length > 0 ? "To stop them all, make a new link or turn it off." : undefined}
    >
      {data.apps.length === 0 && <p className="pt-1 pb-4 text-sm text-text-muted">No AI apps have used your link yet.</p>}
      {data.apps.map((app) => (
        <GroupRow key={app.name}>
          <LetterTile tone={app.now ? "leaf" : "muted"}>{app.name.charAt(0).toUpperCase()}</LetterTile>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="text-base font-bold">{app.name}</div>
            <div className="text-sm text-text-muted">{app.lastUsed}</div>
          </div>
        </GroupRow>
      ))}
    </GroupCard>
  );
}

type ActivityItem = AgentScreenData["activity"][number];

function ActivityRow({ item }: { item: ActivityItem }) {
  const pill = !item.ok ? (
    <StatusPill tone="muted">Not allowed</StatusPill>
  ) : item.askedFirst ? (
    <StatusPill tone="pink">Asked you first</StatusPill>
  ) : null;
  const content = (
    <>
      <div className="flex items-center gap-2.5">
        <span className={cn("text-base font-medium", item.href && "group-hover:underline")}>{item.text}</span>
        {pill && <span className="hidden xl:inline-flex">{pill}</span>}
      </div>
      <div className="flex items-center gap-2">
        {pill && <span className="flex xl:hidden">{pill}</span>}
        <span className="text-sm whitespace-nowrap text-text-muted">{item.who}</span>
      </div>
    </>
  );
  const className =
    // Side by side only when the column is wide enough for both
    "group flex w-full flex-col gap-1 border-b border-border py-3 last:border-b-0 xl:flex-row xl:items-center xl:justify-between xl:gap-4 desk:py-3.5";
  if (!item.href) return <div className={className}>{content}</div>;
  return (
    <Link href={item.href} className={cn(className, "outline-none focus-visible:outline-2 focus-visible:outline-secondary")}>
      {content}
    </Link>
  );
}

const FIRST = 5;

function Activity({ data }: { data: AgentScreenData }) {
  const [all, setAll] = useState(false);
  const items = all ? data.activity : data.activity.slice(0, FIRST);
  return (
    <GroupCard
      title="What it did lately"
      className="desk:px-7 desk:pb-3"
      action={
        data.activity.length > FIRST && (
          <TextAction onClick={() => setAll((a) => !a)}>
            {all ? (
              "Show less"
            ) : (
              <>
                <span className="desk:hidden">See all</span>
                <span className="hidden desk:inline">See everything</span>
              </>
            )}
          </TextAction>
        )
      }
    >
      {items.length === 0 ? (
        <p className="pt-1 pb-4 text-sm text-text-muted">
          Nothing yet. Anything it changes shows up here: listings, replies, offers. Just looking doesn&apos;t.
        </p>
      ) : (
        <div className="-mt-0.5 flex flex-col pb-2 desk:mt-0 desk:pb-0">
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </GroupCard>
  );
}

export function AgentLiveScreen({ data }: { data: AgentScreenData }) {
  // After making the first link, permissions become editable without a reload
  const [made, setMade] = useState(false);
  const live: AgentScreenData = made && !data.link
    ? {
        ...data,
        link: {
          masked: "",
          made: "Made today",
          lastUsed: null,
          scopes: ["read", "listings", "messages", "offers", "orders", "buying"],
          askFirst: ["offers", "buying"],
        },
      }
    : data;
  return (
    <>
      <MobileBackHeader title="Your agent" backHref="/me" />
      <Page className="gap-4 pb-8 desk:gap-6 desk:pt-8">
        <Hero data={data} onMade={() => setMade(true)} />
        {/* Columns are `contents` on phones so the cards can interleave by order, as in the design */}
        <div className="flex flex-col gap-4 desk:flex-row desk:items-start desk:gap-6">
          <div className="contents desk:flex desk:min-w-0 desk:flex-[1.15] desk:flex-col desk:gap-6">
            <div className="order-1 desk:order-none">
              <Steps />
            </div>
            <div className="order-2 desk:order-none">
              <WorksWith data={data} />
            </div>
            {(data.link || data.activity.length > 0) && (
              <div className="order-5 desk:order-none">
                <Activity data={data} />
              </div>
            )}
          </div>
          <div className="contents desk:flex desk:min-w-0 desk:flex-1 desk:flex-col desk:gap-6">
            <div className="order-3 desk:order-none">
              <Permissions key={live.link ? "on" : "off"} data={live} />
            </div>
            {data.link && (
              <div className="order-4 desk:order-none">
                <Apps data={data} />
              </div>
            )}
          </div>
        </div>
      </Page>
    </>
  );
}
