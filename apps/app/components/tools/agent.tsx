"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@repo/ui/button";
import { CheckIcon, CopyIcon, EyeIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import {
  agentActivity,
  agentActivityOlder,
  agentApps,
  agentLink,
  agentPermissions,
  type AgentActivity,
  type Permission,
  type PermissionChoice,
} from "../../lib/mock-tools";
import { MobileBackHeader, Page } from "../shell/page";
import {
  ChoiceMenu,
  GroupCard,
  GroupRow,
  LetterTile,
  LockedPill,
  StatusPill,
  StepNumber,
  Switch,
  TextAction,
  useCopy,
} from "./parts";
import { RegenerateDialog, useSecret } from "./secret";

/* D2 Connect your agent */

const choices: readonly PermissionChoice[] = ["Always", "Ask me first", "Never"];

function Hero() {
  const secret = useSecret(agentLink);
  const { copy, copied } = useCopy();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <section className="flex w-full flex-col gap-5 rounded-xl bg-secondary px-5 py-6 desk:gap-6 desk:p-9">
      <div className="flex flex-col gap-2 desk:gap-2.5">
        <div className="text-sm font-semibold tracking-wide text-leaf-100 uppercase">
          Bring your own AI
        </div>
        <h1 className="font-display text-3xl leading-[38px] font-extrabold tracking-tight text-on-secondary desk:text-[40px] desk:leading-[44px]">
          Let your own AI run the shop
        </h1>
        <p className="text-base text-leaf-100 desk:text-lg desk:leading-7">
          Connect Claude, ChatGPT or any AI app that takes MCP connectors. Then
          just ask it: list this, answer that buyer, what sold this week.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <div className="text-sm font-bold text-on-secondary">
          Your private link
        </div>
        <div className="flex w-full flex-col gap-2.5 desk:flex-row desk:gap-2">
          <div className="flex h-14 min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-surface pr-2 pl-[18px] desk:gap-3 desk:pl-5">
            <span className="min-w-0 overflow-x-auto font-mono text-sm font-medium whitespace-nowrap [scrollbar-width:none]">
              <span className="desk:hidden">{secret.displayShort}</span>
              <span className="hidden desk:inline">{secret.display}</span>
            </span>
            <button
              type="button"
              onClick={secret.toggleReveal}
              aria-pressed={secret.revealed}
              className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-surface-muted px-3.5 text-sm font-bold transition-colors outline-none hover:bg-border focus-visible:outline-2 focus-visible:outline-secondary"
            >
              <EyeIcon size={16} strokeWidth={2.2} className="hidden desk:block" />
              {secret.revealed ? "Hide" : "Show"}
            </button>
          </div>
          <Button
            className="w-full gap-2 desk:w-auto desk:px-6"
            onClick={() =>
              copy(
                "link",
                `https://${secret.full}`,
                "Link copied. Paste it in your AI app.",
              )
            }
          >
            {copied === "link" ? (
              <CheckIcon size={18} strokeWidth={2.4} />
            ) : (
              <CopyIcon size={18} strokeWidth={2.2} />
            )}
            {copied === "link" ? "Copied" : "Copy link"}
          </Button>
        </div>
        <div className="flex flex-col gap-2.5 desk:flex-row desk:items-center desk:justify-between desk:gap-4">
          <p className="text-sm text-leaf-100">
            This link is a key to your account. Keep it to yourself.
          </p>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="w-fit shrink-0 cursor-pointer rounded-sm text-sm font-bold text-on-secondary underline decoration-1 underline-offset-2 outline-none hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-secondary"
          >
            Make a new link
          </button>
        </div>
      </div>
      <RegenerateDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        thing="link"
        onConfirm={secret.regenerate}
      />
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
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
      <h2 className="font-display text-xl font-extrabold tracking-tight">
        Three steps, about a minute
      </h2>
      <div className="flex flex-col gap-4 desk:flex-row desk:gap-5">
        <Step n={1} title="Copy your private link">
          <p className="-mt-1.5 text-sm text-text-muted desk:mt-0">
            It&apos;s the one above. Only you should have it.
          </p>
        </Step>
        <Step n={2} title="Add it in your AI app">
          <p className="-mt-1.5 text-sm text-text-muted desk:mt-0">
            Look for Connectors or MCP servers in its settings and paste the
            link.
          </p>
        </Step>
        <Step n={3} title="Ask it something">
          <button
            type="button"
            onClick={() =>
              copy("ask", "What sold this week?", "Copied. Ask it in your AI app.")
            }
            className="flex h-8 w-fit cursor-pointer items-center rounded-full bg-surface-muted px-3 text-sm font-medium transition-colors outline-none hover:bg-border focus-visible:outline-2 focus-visible:outline-secondary"
          >
            &quot;What sold this week?&quot;
          </button>
        </Step>
      </div>
    </section>
  );
}

function Permissions() {
  const toast = useToast();
  const [perms, setPerms] = useState<Permission[]>(agentPermissions);

  const update = (id: string, patch: Partial<Permission>, message: string) => {
    setPerms((list) =>
      list.map((p) => (p.id === id ? ({ ...p, ...patch } as Permission) : p)),
    );
    toast.add({ title: message });
  };

  return (
    <GroupCard
      title="What it may do"
      description="Applies to every AI app using your link."
    >
      {perms.map((p) => (
        <GroupRow key={p.id} className="gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="text-base font-bold">{p.label}</div>
            <div className="text-sm text-text-muted">{p.hint}</div>
          </div>
          {p.kind === "toggle" && (
            <Switch
              label={p.label}
              checked={p.on}
              onCheckedChange={(on) =>
                update(
                  p.id,
                  { on },
                  on ? `Saved. It can ${p.label.toLowerCase()}.` : "Saved. It can't do that now.",
                )
              }
            />
          )}
          {p.kind === "choice" && (
            <ChoiceMenu
              label={p.label}
              value={p.value}
              options={choices}
              onChange={(value) =>
                update(p.id, { value }, `Saved. ${value} for offers and prices.`)
              }
            />
          )}
          {p.kind === "locked" && <LockedPill />}
        </GroupRow>
      ))}
    </GroupCard>
  );
}

function Apps() {
  const toast = useToast();
  const [apps, setApps] = useState(agentApps);

  return (
    <GroupCard title="Using your link now">
      {apps.length === 0 && (
        <p className="pt-1 pb-4 text-sm text-text-muted">
          No AI apps are using your link right now.
        </p>
      )}
      {apps.map((app) => (
        <GroupRow key={app.id}>
          <LetterTile tone={app.tone}>{app.letter}</LetterTile>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="text-base font-bold">{app.name}</div>
            <div className="text-sm text-text-muted">{app.lastUsed}</div>
          </div>
          <TextAction
            tone="danger"
            onClick={() => {
              setApps((list) => list.filter((a) => a.id !== app.id));
              toast.add({ title: `${app.name} can't use your link now.` });
            }}
          >
            Disconnect
          </TextAction>
        </GroupRow>
      ))}
    </GroupCard>
  );
}

function ActivityRow({ item }: { item: AgentActivity }) {
  const pill = item.askedFirst && (
    <StatusPill tone="pink">Asked you first</StatusPill>
  );
  const content = (
    <>
      <div className="flex items-center gap-2.5">
        <span className="text-base font-medium group-hover:underline">
          {item.text}
        </span>
        {pill && <span className="hidden desk:inline-flex">{pill}</span>}
      </div>
      <div className="flex items-center gap-2">
        {pill && <span className="flex desk:hidden">{pill}</span>}
        <span className="text-sm whitespace-nowrap text-text-muted">
          {item.who}
        </span>
      </div>
    </>
  );
  const className = cn(
    "group flex w-full flex-col gap-1 border-b border-border py-3 last:border-b-0 desk:flex-row desk:items-center desk:justify-between desk:gap-4 desk:py-3.5",
    !item.askedFirst && "gap-0",
  );

  if (item.href) {
    return (
      <Link href={item.href} className={cn(className, "outline-none focus-visible:outline-2 focus-visible:outline-secondary")}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

function Activity() {
  const [all, setAll] = useState(false);
  const items = all ? [...agentActivity, ...agentActivityOlder] : agentActivity;

  return (
    <GroupCard
      title="What it did lately"
      className="desk:px-7 desk:pb-3"
      action={
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
      }
    >
      <div className="-mt-0.5 flex flex-col pb-2 desk:mt-0 desk:pb-0">
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </div>
    </GroupCard>
  );
}

export function AgentScreen() {
  return (
    <>
      <MobileBackHeader title="Your agent" backHref="/me" />
      <Page className="pb-8 desk:pt-8">
        {/* Columns are `contents` on phones so the cards can interleave by order */}
        <div className="flex flex-col gap-4 desk:flex-row desk:items-start desk:gap-6">
          <div className="contents desk:flex desk:flex-[1.35] desk:flex-col desk:gap-6">
            <div className="order-1 desk:order-none">
              <Hero />
            </div>
            <div className="order-2 desk:order-none">
              <Steps />
            </div>
            <div className="order-5 desk:order-none">
              <Activity />
            </div>
          </div>
          <div className="contents desk:flex desk:flex-1 desk:flex-col desk:gap-6">
            <div className="order-3 desk:order-none">
              <Permissions />
            </div>
            <div className="order-4 desk:order-none">
              <Apps />
            </div>
          </div>
        </div>
      </Page>
    </>
  );
}
