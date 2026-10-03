"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Sticker } from "@repo/ui/sticker";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { checkItem, forgetCheck, listFromCheck, markBought } from "../../app/actions/sidekick";
import { signInHref } from "../../lib/safe-next";
import { MobileBackHeader, Page } from "../shell/page";
import { MiniSpinner, StepNumber, TextAction, useIsDesktop } from "./parts";

/*
 * D4 Shopping sidekick on real data (the prototype is ./sidekick.tsx). Each
 * check runs for about a minute in the background; the page refreshes while
 * any are going. Two finished checks sit side by side, and the one that keeps
 * more of what you pay is the better buy.
 */

export type LiveCheck = {
  id: string;
  query: string;
  name: string | null;
  status: "running" | "done" | "failed";
  error: string | null;
  bought: boolean;
  ago: string;
  costCents: number | null;
  /** "you said", "the link", "new at nordstrom.com" */
  costSource: string | null;
  sellsForCents: number | null;
  sellsForLowCents: number | null;
  sellsForHighCents: number | null;
  listedMedianCents: number | null;
  /** Likely resale over cost: 0.8 keeps 80%. */
  ratio: number | null;
  verdict: { key: "holds" | "some" | "loses" | "unknown"; label: string };
  netCostCents: number | null;
  confidence: "low" | "medium" | "high" | null;
  notes: string | null;
  looked: number;
  sitesLine: string | null;
  image: string | null;
  listings: {
    title: string;
    siteLabel: string;
    priceCents: number;
    url: string;
    image: string | null;
    condition: string;
    note: string;
  }[];
};

const POLL_MS = 4000;

const money = (cents: number | null | undefined) => {
  if (cents == null) return "?";
  const d = cents / 100;
  return `$${Number.isInteger(d) ? d : Math.round(d)}`;
};
const pct = (ratio: number | null) => (ratio == null ? null : `${Math.round(ratio * 100)}%`);

const verdictTone: Record<LiveCheck["verdict"]["key"], string> = {
  holds: "bg-secondary-soft text-secondary",
  some: "bg-primary-soft text-text",
  loses: "bg-accent-soft text-accent-text",
  unknown: "bg-surface-muted text-text-muted",
};

/* ---------- Check bar ---------- */

function CheckBar() {
  const toast = useToast();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [value, setValue] = useState("");
  const [busy, start] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const text = value.trim();
        if (!text) {
          toast.add({ title: "Paste a link or say what you're eyeing first." });
          return;
        }
        start(async () => {
          const res = await checkItem(text);
          if (!res.ok) {
            if (res.signin) router.push(signInHref("/tools/sidekick"));
            else toast.add({ title: res.error });
            return;
          }
          setValue("");
          toast.add({ title: "Checking. It takes about a minute." });
          router.refresh();
        });
      }}
      className="flex h-14 w-full items-center gap-2 rounded-full bg-surface pr-1.5 pl-[18px] desk:h-[60px] desk:pl-[22px]"
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Paste a link or say what you're eyeing"
        className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-text-muted"
        placeholder={isDesktop ? "Paste a link, or e.g. “Reformation black wrap dress, $120”" : "Paste a link or name it"}
      />
      <button
        type="submit"
        disabled={busy}
        className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-text px-[18px] text-base font-bold text-on-secondary transition-colors outline-none hover:bg-leaf-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-progress desk:h-12 desk:px-[22px]"
      >
        {busy && <MiniSpinner />}
        {busy ? "Starting" : "Check it"}
      </button>
    </form>
  );
}

/* ---------- Side by side ---------- */

function CompareCard({ check, better }: { check: LiveCheck; better: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2.5 rounded-lg border-2 bg-surface p-3 desk:gap-3 desk:p-4",
        better ? "border-secondary" : "border-border",
      )}
    >
      <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-md bg-surface-muted desk:h-32">
        {check.image ? (
          <img src={check.image} alt="" className="size-full object-cover" />
        ) : (
          <span className="font-display text-3xl font-extrabold text-text-muted">{(check.name ?? "?")[0]}</span>
        )}
      </div>
      <div className="flex flex-col">
        <div className="line-clamp-2 text-base leading-[22px] font-bold">{check.name ?? check.query}</div>
        <div className="text-sm text-text-muted">
          {check.costCents != null ? `${money(check.costCents)} (${check.costSource})` : "Price unknown"}
        </div>
      </div>
      <div className="flex flex-col border-t border-border pt-2 desk:pt-2.5">
        <div className="text-sm text-text-muted">Sells on for about</div>
        <div className="font-display text-2xl font-extrabold tracking-tight">{money(check.sellsForCents)}</div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {check.ratio != null && (
          <span className={cn("flex h-7 items-center rounded-full px-2.5 text-sm font-bold", verdictTone[check.verdict.key])}>
            Keeps {pct(check.ratio)}
          </span>
        )}
        {check.netCostCents != null && (
          <span className="flex h-7 items-center rounded-full bg-surface-muted px-2.5 text-sm font-bold">
            Really costs {money(check.netCostCents)}
          </span>
        )}
      </div>
    </div>
  );
}

function Comparison({ a, b }: { a: LiveCheck; b: LiveCheck }) {
  const [winner, loser] = (a.ratio ?? 0) >= (b.ratio ?? 0) ? [a, b] : [b, a];
  const tie = Math.abs((a.ratio ?? 0) - (b.ratio ?? 0)) < 0.05;
  const short = (c: LiveCheck) => c.name ?? c.query;
  return (
    <section aria-label="Side by side" className="flex w-full flex-col gap-3">
      <div className="relative flex w-full gap-2.5 desk:gap-3">
        {[a, b].map((c) => (
          <CompareCard key={c.id} check={c} better={!tie && c.id === winner.id} />
        ))}
        {!tie && (
          <Sticker
            tone="accent"
            rotate={-8}
            className={cn(
              "absolute -top-[18px] h-9 origin-top-left px-3.5 py-0 text-base leading-5",
              winner.id === a.id ? "-left-[14px]" : "left-[calc(50%-8px)]",
            )}
          >
            Better buy
          </Sticker>
        )}
      </div>
      <p className="text-base font-medium">
        {tie
          ? `They hold their value about the same: ${pct(a.ratio)} and ${pct(b.ratio)} of what you'd pay.`
          : `Go with the ${short(winner)}. It keeps about ${pct(winner.ratio)} of what you pay when you sell it on; the ${short(loser)} keeps ${pct(loser.ratio)}.`}
      </p>
    </section>
  );
}

/* ---------- Things you've checked ---------- */

function CheckRow({
  check,
  comparing,
  onCompare,
}: {
  check: LiveCheck;
  comparing: boolean;
  onCompare: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok && "error" in res && res.error) toast.add({ title: res.error });
      else if (done) toast.add({ title: done });
      router.refresh();
    });

  const detail =
    check.status === "running"
      ? check.name
        ? `Checking eBay, Poshmark and Depop for ${check.name}...`
        : "Working out what it is..."
      : check.status === "failed"
        ? (check.error ?? "Couldn't finish that one.")
        : check.sellsForCents != null
          ? `Listed around ${money(check.listedMedianCents)}, so sells on for ${money(check.sellsForLowCents)} to ${money(check.sellsForHighCents)}${check.costCents != null ? `. Costs ${money(check.costCents)} (${check.costSource})` : ""}`
          : `Couldn't find it for sale second hand (looked at ${check.looked} listings).`;

  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 desk:py-3.5">
      <div className="flex flex-col gap-2 desk:flex-row desk:items-center desk:gap-4">
        <div className="flex min-w-0 flex-col desk:flex-1">
          <div className="flex items-center gap-2 text-base font-bold">
            {check.status === "running" && <MiniSpinner className="text-secondary" />}
            <span className="truncate">{check.name ?? check.query}</span>
            <span className="shrink-0 text-sm font-medium text-text-muted">{check.ago}</span>
          </div>
          <div className={cn("text-sm", check.status === "failed" ? "text-danger" : "text-text-muted")}>{detail}</div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {check.status === "done" && (
            <span className={cn("flex h-7 items-center rounded-full px-3 text-sm font-semibold whitespace-nowrap", verdictTone[check.bought ? "some" : check.verdict.key])}>
              {check.bought ? "You own this" : check.ratio != null ? `${check.verdict.label}, ${pct(check.ratio)}` : check.verdict.label}
            </span>
          )}
          {check.status === "done" && check.listings.length > 0 && (
            <TextAction onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? "Hide" : "Details"}
            </TextAction>
          )}
          {check.status === "done" && check.ratio != null && !check.bought && (
            <TextAction onClick={onCompare} aria-pressed={comparing}>
              {comparing ? "Comparing" : "Compare"}
            </TextAction>
          )}
          {check.status === "done" &&
            (check.bought ? (
              <TextAction disabled={busy} onClick={() => start(() => listFromCheck(check.id))}>
                {busy ? "Starting..." : "List it"}
              </TextAction>
            ) : (
              <TextAction disabled={busy} onClick={() => act(() => markBought(check.id, true), "Nice find. List it whenever you're ready.")}>
                I bought it
              </TextAction>
            ))}
          {check.status === "failed" && (
            <TextAction disabled={busy} onClick={() => act(async () => {
              const res = await checkItem(check.query);
              if (res.ok) await forgetCheck(check.id);
              return res;
            })}>
              Try again
            </TextAction>
          )}
          {check.status !== "running" && (
            <TextAction tone="danger" disabled={busy} onClick={() => act(() => forgetCheck(check.id))}>
              Remove
            </TextAction>
          )}
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-3 rounded-md bg-surface-muted p-3.5 desk:p-4">
          {check.notes && <p className="text-sm text-text">{check.notes}</p>}
          <ul className="grid grid-cols-1 gap-2 min-[560px]:grid-cols-2">
            {check.listings.map((l) => (
              <li key={l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-md bg-surface p-2 transition-colors hover:bg-background"
                >
                  <span className="size-12 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
                    {l.image && <img src={l.image} alt="" className="size-full object-cover" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{l.title}</span>
                    <span className="truncate text-xs text-text-muted">
                      {l.siteLabel}
                      {l.condition !== "unknown" ? `, ${l.condition}` : ""}. {l.note}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-base font-extrabold">{money(l.priceCents)}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-muted">
            {check.sitesLine}. Things usually sell for a little under what they&apos;re listed at, so the estimate is 85 to 100% of the middle price.
            {check.confidence === "low" && " Only a few matches, so treat it as rough."}
          </p>
        </div>
      )}
    </div>
  );
}

const steps = [
  { title: "Show it what you're eyeing", body: "A link, or the name and what it costs." },
  { title: "See what it sells on for", body: "From the same thing listed on eBay, Poshmark and Depop right now." },
  { title: "Sell it later in one tap", body: "Bought it? List it and the research is already started." },
];

export function LiveSidekickScreen({ checks }: { checks: LiveCheck[] }) {
  const router = useRouter();
  const comparable = checks.filter((c) => c.status === "done" && c.ratio != null && !c.bought);
  const [picked, setPicked] = useState<string[]>([]);
  // The two picked, else the two newest that can be compared
  const pair = [
    ...picked.map((id) => comparable.find((c) => c.id === id)).filter((c): c is LiveCheck => !!c),
    ...comparable.filter((c) => !picked.includes(c.id)),
  ].slice(0, 2);
  const running = checks.some((c) => c.status === "running");

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [running, router]);

  const toggleCompare = (id: string) =>
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [id, ...list].slice(0, 2)));

  return (
    <>
      <MobileBackHeader title="Shopping sidekick" backHref="/me" />
      <Page className="gap-4 pb-8 desk:gap-6 desk:pt-8">
        <section className="flex w-full flex-col gap-5 rounded-xl bg-primary px-5 py-6 desk:flex-row desk:items-center desk:gap-10 desk:py-11 desk:pr-11 desk:pl-12">
          <div className="flex min-w-0 flex-1 flex-col gap-5 desk:gap-6">
            <div className="flex flex-col gap-2 desk:gap-3">
              <div className="hidden text-sm font-bold tracking-wide uppercase desk:block">Shopping sidekick</div>
              <h1 className="font-display text-3xl leading-[38px] font-extrabold tracking-tight desk:text-4xl">
                Know what it&apos;s worth before you buy it
              </h1>
              <p className="text-base font-medium desk:text-lg desk:leading-7">
                Two dresses, same price. One sells on for $70, the other for $25. Check both and your sidekick tells you which to buy.
              </p>
            </div>
            <CheckBar />
          </div>
          {pair.length === 2 && (
            <div className="hidden w-[468px] shrink-0 desk:flex">
              <Comparison a={pair[0]!} b={pair[1]!} />
            </div>
          )}
        </section>

        {pair.length === 2 && (
          <div className="desk:hidden">
            <Comparison a={pair[0]!} b={pair[1]!} />
          </div>
        )}

        {checks.length > 0 ? (
          <section className="flex w-full flex-col rounded-lg border border-border bg-surface px-[18px] pt-5 pb-1.5 desk:rounded-xl desk:px-7 desk:pt-6 desk:pb-3">
            <h2 className="pb-1.5 font-display text-xl font-extrabold tracking-tight desk:pb-2">Things you&apos;ve checked</h2>
            {checks.map((check) => (
              <CheckRow
                key={check.id}
                check={check}
                comparing={pair.some((p) => p.id === check.id)}
                onCompare={() => toggleCompare(check.id)}
              />
            ))}
          </section>
        ) : null}

        <div className="flex flex-col gap-4 desk:flex-row desk:gap-5">
          {steps.map((step, i) => (
            <section
              key={step.title}
              className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-5 desk:flex-1 desk:p-6"
            >
              <StepNumber>{i + 1}</StepNumber>
              <h2 className="font-display text-xl font-extrabold tracking-tight">{step.title}</h2>
              <p className="text-base text-text-muted">{step.body}</p>
            </section>
          ))}
        </div>
      </Page>
    </>
  );
}
