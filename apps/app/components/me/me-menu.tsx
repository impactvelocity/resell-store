"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@repo/ui/button";
import {
  BagIcon,
  BellIcon,
  ChevronRightIcon,
  CodeIcon,
  PlugIcon,
  SparkleIcon,
  StatsIcon,
} from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { shopsHref, useViewer } from "../viewer";
import { useProfile } from "./profile-context";
import { ProfileAvatar } from "./profile-fields";
import { useLogOut } from "./profile-settings";

/*
 * A6 Me, phone only. On a phone, Shops, Sales, Stats and all Tools live here
 * (spec A, App shell). Desktop shows Profile and settings instead.
 */

function SidekickIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden>
      <g transform="rotate(-18 32 32)">
        <path d="M6 24a26 26 0 0 0 52 0Z" fill="var(--color-pink-400)" />
        <path d="M11 24a21 21 0 0 0 42 0Z" fill="#fff" />
        <path d="M14 24a18 18 0 0 0 36 0Z" fill="var(--color-lemon-300)" />
        <path
          d="M32 24v17M32 24 19.5 36.5M32 24l12.5 12.5"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8M11 12h9M17 9l3 3-3 3" />
    </svg>
  );
}

type Row = {
  label: string;
  icon: ReactNode;
  tile: string;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  danger?: boolean;
};

function MenuRow({ row }: { row: Row }) {
  const inner = (
    <>
      <span
        className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", row.tile)}
      >
        {row.icon}
      </span>
      <span
        className={cn("flex-1 text-base font-semibold", row.danger ? "text-danger" : "text-text")}
      >
        {row.label}
      </span>
      {row.trailing}
      {!row.danger && <ChevronRightIcon size={18} strokeWidth={2.2} className="text-text-muted" />}
    </>
  );
  const cls =
    "flex w-full cursor-pointer items-center gap-3 border-b border-border py-[14px] text-left last:border-b-0";
  return row.href ? (
    <Link href={row.href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={row.onClick} className={cls}>
      {inner}
    </button>
  );
}

function MenuSection({ label, rows }: { label: string; rows: Row[] }) {
  return (
    <section className="flex w-full flex-col gap-[10px] px-4 pt-[28px]">
      <h2 className="px-1 text-sm font-semibold tracking-wide text-text-muted uppercase">
        {label}
      </h2>
      <div className="flex w-full flex-col rounded-lg border border-border bg-surface px-4 py-0.5">
        {rows.map((row) => (
          <MenuRow key={row.label} row={row} />
        ))}
      </div>
    </section>
  );
}

const muted = (text: string) => <span className="text-sm font-medium text-text-muted">{text}</span>;

export function MeMenu({ className }: { className?: string }) {
  const { saved, account: profileAccount } = useProfile();
  const viewer = useViewer();
  const toast = useToast();
  const logOut = useLogOut();
  const { shops } = viewer;

  const selling: Row[] = [
    {
      label: shops.length ? "Your shops" : "Open a shop",
      icon: <BagIcon size={18} />,
      tile: "bg-primary-soft",
      href: shopsHref(viewer),
      trailing: shops.length ? muted(String(shops.length)) : undefined,
    },
    {
      label: "Sales and payouts",
      icon: <span className="font-display text-lg leading-6 font-extrabold text-secondary">$</span>,
      tile: "bg-secondary-soft",
      href: "/sales",
      trailing: profileAccount.live ? undefined : muted("1 to ship"),
    },
    {
      label: "Stats",
      icon: <StatsIcon size={18} />,
      tile: "bg-surface-muted",
      href: "/stats",
    },
  ];

  const tools: Row[] = [
    {
      label: "Connections",
      icon: <PlugIcon size={18} strokeWidth={2.2} className="text-secondary" />,
      tile: "bg-secondary-soft",
      href: "/tools/connections",
      trailing: profileAccount.live ? undefined : muted("PayPal, Instagram"),
    },
    {
      label: "Connect your agent",
      icon: <SparkleIcon size={16} />,
      tile: "bg-accent",
      href: "/tools/agent",
      trailing: (
        <span className="flex h-7 items-center rounded-full bg-accent-soft px-3 text-sm font-semibold text-accent-text">
          New
        </span>
      ),
    },
    {
      label: "Shopping sidekick",
      icon: <SidekickIcon />,
      tile: "bg-primary-soft",
      href: "/tools/sidekick",
    },
    {
      label: "API",
      icon: <CodeIcon size={18} strokeWidth={2.2} />,
      tile: "bg-surface-muted",
      href: "/tools/api",
    },
  ];

  const account: Row[] = [
    {
      label: "Notifications",
      icon: <BellIcon size={18} />,
      tile: "bg-surface-muted",
      href: "/me/edit#notifications",
    },
    {
      label: "Help",
      icon: <span className="text-base font-bold text-text">?</span>,
      tile: "bg-surface-muted",
      onClick: () => toast.add({ title: "Help opens here" }),
    },
    {
      label: "Log out",
      icon: (
        <span className="text-danger">
          <LogOutIcon />
        </span>
      ),
      tile: "bg-surface-muted",
      onClick: logOut.ask,
      danger: true,
    },
  ];

  return (
    <div className={cn("w-full flex-col pb-4", className)}>
      <div className="flex w-full items-center gap-4 px-5 pt-[max(16px,env(safe-area-inset-top))]">
        <ProfileAvatar name={saved.name} image={profileAccount.image} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text">
            {saved.name}
          </h1>
          <p className="text-sm text-text-muted">
            {saved.location ? `${saved.location}. ${profileAccount.since}` : profileAccount.since}
          </p>
        </div>
      </div>
      <div className="flex w-full gap-2 px-4 pt-5">
        <Button
          variant="soft"
          size="md"
          className="flex-1"
          render={<Link href="/me/edit" />}
          nativeButton={false}
        >
          Edit profile
        </Button>
        {profileAccount.publicHref && (
          <Button
            variant="soft"
            size="md"
            className="flex-1"
            render={<Link href={profileAccount.publicHref} />}
            nativeButton={false}
          >
            See public profile
          </Button>
        )}
      </div>
      <MenuSection label="Selling" rows={selling} />
      <MenuSection label="Tools" rows={tools} />
      <MenuSection label="Account" rows={account} />
      {logOut.dialog}
    </div>
  );
}
