"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpIcon, ChevronLeftIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { shops } from "../../lib/mock";
import {
  periods,
  phoneShopLabel,
  statsByShop,
  type ShopStats,
  type StatsPeriod,
} from "../../lib/mock-shops";
import { SourceBars, WeeklyBars, WeeklyTable } from "./charts";
import { FlowBar, Menu, MenuItem, SparkleSolid, roundButton } from "./parts";

/*
 * B4 Shop stats. `?shop=<slug>` picks the shop (default Maya's closet,
 * `all` for every shop). The period picker is local state.
 *
 * With `live`, the numbers are real (lib/server/stats.ts, every period at
 * once) and the agent card is left out until the agent handles buyers.
 */

/** Real stats for the signed-in seller: their shops, and each period's numbers. */
export type LiveStatsView = {
  shops: { slug: string; name: string }[];
  byPeriod: Record<StatsPeriod, ShopStats & { chartTitle?: string }>;
};

function money(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

export function StatsView({
  selected,
  live,
}: {
  selected: string;
  live?: LiveStatsView;
}) {
  const [period, setPeriod] = useState<StatsPeriod>("30d");
  const [asTable, setAsTable] = useState(false);
  const stats = live
    ? live.byPeriod[period]
    : (statsByShop[selected] ?? statsByShop["mayas-closet"]!);
  const periodInfo = periods.find((p) => p.value === period) ?? periods[1]!;
  const chartTitle =
    (live && live.byPeriod[period].chartTitle) || "Earned each week";

  // Shops with something to count, plus whichever one is open. One live shop needs no picker.
  const chipShops = live
    ? live.shops.length > 1
      ? live.shops.map((s) => ({
          slug: s.slug,
          name: s.name,
          shortName: s.name,
        }))
      : []
    : shops.filter((s) => s.live > 0 || s.slug === selected);
  const chips = chipShops.length
    ? [
        {
          slug: "all",
          href: "/stats?shop=all",
          label: "All shops",
          phone: "All shops",
        },
        ...chipShops.map((s) => ({
          slug: s.slug,
          href: `/stats?shop=${s.slug}`,
          label: s.name,
          phone: phoneShopLabel[s.slug] ?? s.shortName,
        })),
      ]
    : [];

  const periodMenu = (phone: boolean) => (
    <Menu
      label={phone ? periodInfo.short : periodInfo.label}
      align="end"
      aria-label="Period"
      buttonClassName={cn(!phone && "gap-2 border pr-3.5 pl-4 font-semibold")}
    >
      {(close) =>
        periods.map((p) => (
          <MenuItem
            key={p.value}
            selected={p.value === period}
            onClick={() => {
              setPeriod(p.value);
              close();
            }}
          >
            {p.label}
          </MenuItem>
        ))
      }
    </Menu>
  );

  const change =
    stats.made === 0 ? (
      <span className="text-sm text-text-muted">
        Nothing sold in this period yet.
      </span>
    ) : (
      <>
        <span className="flex h-7 items-center gap-1 rounded-full bg-secondary-soft pr-3 pl-2 text-sm font-semibold text-secondary desk:gap-1.5 desk:px-2.5 desk:font-bold">
          <ArrowUpIcon size={16} strokeWidth={2.6} className="desk:size-3.5" />
          Up {money(stats.change)}
        </span>
        <span className="text-sm text-text-muted">{periodInfo.before}</span>
      </>
    );

  const agentNumbers = [
    { value: String(stats.agent.questions), label: "questions answered" },
    { value: String(stats.agent.offers), label: "offers handled" },
    { value: stats.agent.hours, label: "saved, roughly" },
  ];

  return (
    <>
      {/* ---------- Phone ---------- */}
      <div className="flex flex-col desk:hidden">
        <FlowBar
          left={
            <Link href="/me" aria-label="Back" className={roundButton}>
              <ChevronLeftIcon />
            </Link>
          }
          title="Stats"
          right={periodMenu(true)}
        />
        <nav
          aria-label="Shops"
          className="flex items-center gap-2 overflow-x-auto px-4 pt-5 [scrollbar-width:none]"
        >
          {chips.map((chip) => (
            <Link
              key={chip.slug}
              href={chip.href}
              scroll={false}
              aria-current={chip.slug === selected ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold",
                chip.slug === selected
                  ? "bg-text text-background"
                  : "border-[1.5px] border-border bg-surface text-text",
              )}
            >
              {chip.phone}
            </Link>
          ))}
        </nav>
        <section className="flex flex-col gap-2 px-5 pt-7">
          <span className="text-sm font-semibold tracking-wide text-text-muted uppercase">
            You made
          </span>
          <span className="font-display text-5xl font-extrabold tracking-tight">
            {money(stats.made)}
          </span>
          <div className="flex items-center gap-2">{change}</div>
        </section>
        <section className="px-4 pt-6">
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-base font-bold">{chartTitle}</h2>
            <WeeklyBars weeks={stats.weeks} size="phone" />
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3 px-4 pt-3">
          {stats.tiles.map((tile) => (
            <div
              key={tile.label}
              className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface px-[18px] py-4"
            >
              <span className="text-sm font-medium text-text-muted">
                {tile.label}
              </span>
              <span className="font-display text-2xl font-extrabold tracking-tight">
                {tile.value}
              </span>
            </div>
          ))}
        </section>
        <section className="px-4 pt-3">
          <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-base font-bold">Where buyers came from</h2>
            <SourceBars sources={stats.sources} size="phone" />
          </div>
        </section>
        {!live && (
          <section className="px-4 pt-3 pb-9">
            <Link
              href="/inbox"
              className="flex flex-col gap-3.5 rounded-lg bg-secondary-soft p-5"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-text">
                  <SparkleSolid size={16} />
                </span>
                <span className="text-base font-bold">What your agent did</span>
              </span>
              <span className="flex w-full">
                {agentNumbers.map((n) => (
                  <span key={n.label} className="flex flex-1 flex-col">
                    <span className="font-display text-2xl font-extrabold tracking-tight">
                      {n.value}
                    </span>
                    <span className="text-sm font-medium text-text-muted">
                      {n.label}
                    </span>
                  </span>
                ))}
              </span>
            </Link>
          </section>
        )}
        {live && <div className="pb-9" />}
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden w-full flex-col gap-6 px-12 pt-8 pb-14 desk:flex">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <h1 className="font-display text-3xl leading-[44px] font-extrabold tracking-tight">
            Stats
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <Link
                key={chip.slug}
                href={chip.href}
                scroll={false}
                aria-current={chip.slug === selected ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors",
                  chip.slug === selected
                    ? "bg-text text-surface"
                    : "border border-border bg-surface text-text hover:bg-surface-muted",
                )}
              >
                {chip.label}
              </Link>
            ))}
            <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
            {periodMenu(false)}
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex flex-1 flex-col justify-between gap-6 rounded-xl border border-border bg-surface p-7">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold tracking-wide text-text-muted uppercase">
                You made
              </span>
              <span className="font-display text-[72px] leading-[76px] font-extrabold tracking-tight">
                {money(stats.made)}
              </span>
              <div className="flex flex-wrap items-center gap-2">{change}</div>
            </div>
            <dl className="flex w-full flex-col">
              {[
                { label: "Things sold", value: String(stats.thingsSold) },
                { label: "Average sale", value: money(stats.averageSale) },
                {
                  label: "Days to sell, typically",
                  value: stats.daysToSell
                    ? String(stats.daysToSell)
                    : "None yet",
                },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className={cn(
                    "flex items-center justify-between border-t border-border",
                    i < 2 ? "py-3" : "pt-3",
                  )}
                >
                  <dt className="text-base text-text-muted">{row.label}</dt>
                  <dd className="text-base font-bold">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-[1.7] flex-col gap-5 rounded-xl border border-border bg-surface p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold tracking-tight">
                {chartTitle}
              </h2>
              <button
                type="button"
                onClick={() => setAsTable((t) => !t)}
                className="cursor-pointer text-sm font-semibold text-secondary hover:underline"
              >
                {asTable ? "See as a chart" : "See as a table"}
              </button>
            </div>
            {asTable ? (
              <WeeklyTable weeks={stats.weeks} />
            ) : (
              <WeeklyBars weeks={stats.weeks} size="desk" />
            )}
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-2 gap-5",
            stats.tiles.length > 4 ? "lg:grid-cols-3" : "lg:grid-cols-4",
          )}
        >
          {stats.tiles.map((tile) => (
            <div
              key={tile.label}
              className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-6 py-5"
            >
              <span className="text-sm text-text-muted">{tile.label}</span>
              <span className="font-display text-2xl leading-[36px] font-extrabold tracking-tight">
                {tile.value}
              </span>
              <span className="text-sm text-text-muted">{tile.note}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4 rounded-xl border border-border bg-surface p-7">
            <h2 className="font-display text-xl font-extrabold tracking-tight">
              Where buyers came from
            </h2>
            <SourceBars sources={stats.sources} size="desk" />
          </div>
          <div className="flex flex-1 flex-col gap-2 rounded-xl border border-border bg-surface p-7">
            <h2 className="pb-2 font-display text-xl font-extrabold tracking-tight">
              Most looked at
            </h2>
            {stats.mostLooked.length === 0 ? (
              <p className="border-t border-border pt-3 text-sm text-text-muted">
                Nothing live yet, so nothing to look at.
              </p>
            ) : (
              stats.mostLooked.map((item, i) => (
                <Link
                  key={item.title}
                  href={item.href ?? "/listings/linen-dress"}
                  className={cn(
                    "group flex items-center justify-between gap-4 border-t border-border",
                    i < stats.mostLooked.length - 1 ? "py-2.5" : "pt-2.5",
                  )}
                >
                  <span className="flex flex-col">
                    <span className="text-base font-bold group-hover:underline">
                      {item.title}
                    </span>
                    <span className="text-sm text-text-muted">{item.note}</span>
                  </span>
                  <span className="shrink-0 text-base font-bold">
                    {item.views} {item.views === 1 ? "view" : "views"}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {!live && (
          <Link
            href="/inbox"
            className="flex flex-col gap-6 rounded-xl bg-secondary-soft px-7 py-6 lg:flex-row lg:items-center lg:gap-8"
          >
            <span className="flex flex-1 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-text">
                <SparkleSolid size={20} />
              </span>
              <span className="flex flex-col">
                <span className="font-display text-xl font-extrabold tracking-tight">
                  What your agent did
                </span>
                <span className="text-sm text-text-muted">
                  Everything it said is in your inbox.
                </span>
              </span>
            </span>
            <span className="flex gap-8">
              {agentNumbers.map((n) => (
                <span
                  key={n.label}
                  className="flex w-[150px] shrink-0 flex-col"
                >
                  <span className="font-display text-2xl leading-[36px] font-extrabold tracking-tight">
                    {n.value}
                  </span>
                  <span className="text-sm text-text-muted">{n.label}</span>
                </span>
              ))}
            </span>
          </Link>
        )}
      </div>
    </>
  );
}
