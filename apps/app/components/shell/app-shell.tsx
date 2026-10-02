"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BagIcon,
  ChatIcon,
  ChevronRightIcon,
  CodeIcon,
  HomeIcon,
  PlugIcon,
  PlusIcon,
  SearchIcon,
  SparkleIcon,
  StatsIcon,
  TagIcon,
  TruckIcon,
  UserIcon,
} from "@repo/ui/icons";
import { LemonMark } from "@repo/ui/logo";
import { TabBar, TabBarItem } from "@repo/ui/tab-bar";
import { cn } from "@repo/ui/lib/utils";
import { inboxCount, me } from "../../lib/mock";

/*
 * The frame around every signed-in screen (spec 04 / A. App shell).
 * Under 900px: one column and a floating tab bar. 900px and up: a sidebar.
 * The listing workspace and sign-up don't use it.
 */

type NavItem = {
  href: string;
  label: string;
  icon: (props: { strokeWidth?: number }) => ReactNode;
  /** Path prefixes that keep this item lit, e.g. Shops stays on for a listing. */
  match: string[];
  count?: number;
};

const mainNav: NavItem[] = [
  { href: "/home", label: "Home", icon: HomeIcon, match: ["/home"] },
  {
    href: "/shops/mayas-closet",
    label: "Shops",
    icon: BagIcon,
    match: ["/shops", "/listings", "/offers"],
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: ChatIcon,
    match: ["/inbox"],
    count: inboxCount,
  },
  { href: "/sales", label: "Sales", icon: TruckIcon, match: ["/sales"] },
  { href: "/stats", label: "Stats", icon: StatsIcon, match: ["/stats"] },
];

const toolsNav: NavItem[] = [
  {
    href: "/tools/connections",
    label: "Connections",
    icon: PlugIcon,
    match: ["/tools/connections"],
  },
  {
    href: "/tools/agent",
    label: "Your agent",
    icon: SparkleIcon,
    match: ["/tools/agent"],
  },
  { href: "/tools/api", label: "API", icon: CodeIcon, match: ["/tools/api"] },
  {
    href: "/tools/sidekick",
    label: "Shopping sidekick",
    icon: TagIcon,
    match: ["/tools/sidekick"],
  },
];

function isActive(pathname: string, match: string[]) {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

/** Counts things that need the person. Hidden at 0, reads 9+ past nine. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft px-[9px] text-sm font-bold text-accent-text">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 w-full shrink-0 items-center gap-3 rounded-md px-3 text-base text-text transition-colors outline-none focus-visible:outline-2 focus-visible:outline-secondary",
        active ? "bg-primary-soft font-bold" : "font-medium hover:bg-surface-muted",
      )}
    >
      <Icon strokeWidth={active ? 2.6 : 2} />
      <span className="flex-1">{item.label}</span>
      {item.count !== undefined && <CountBadge count={item.count} />}
    </Link>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "sticky top-0 h-dvh w-64 shrink-0 flex-col justify-between gap-8 overflow-y-auto border-r border-border bg-surface px-4 py-6",
        className,
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <Link
            href="/home"
            className="flex items-center gap-2.5 px-2 font-display text-xl font-extrabold tracking-tight"
          >
            <LemonMark size={32} />
            resell.store
          </Link>
          <Link
            href="/list/new"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-on-primary transition-colors hover:bg-lemon-300"
          >
            <SparkleIcon size={18} />
            List something new
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {mainNav.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.match)}
            />
          ))}
        </nav>
        <nav className="flex flex-col gap-0.5" aria-label="Tools">
          <div className="px-3 pb-1.5 text-sm font-semibold tracking-wide text-text-muted uppercase">
            Tools
          </div>
          {toolsNav.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.match)}
            />
          ))}
        </nav>
      </div>
      <Link
        href="/me"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md border-t border-border px-2 py-2.5 transition-colors hover:bg-surface-muted",
          isActive(pathname, ["/me"]) && "bg-primary-soft",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-extrabold text-on-primary">
          {me.initial}
        </span>
        <span className="flex min-w-0 flex-1 flex-col text-sm">
          <span className="font-bold">{me.name}</span>
          <span className="text-text-muted">Profile and settings</span>
        </span>
        <ChevronRightIcon size={18} className="text-text-muted" />
      </Link>
    </aside>
  );
}

/** Home, Search, List something, Inbox, Me. Floats 16px above the bottom safe area. */
export function MobileTabBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const onMe = isActive(pathname, [
    "/me",
    "/shops",
    "/listings",
    "/offers",
    "/sales",
    "/stats",
    "/tools",
  ]);
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <TabBar className="pointer-events-auto shadow-[0_8px_24px_-12px_rgb(20_38_29/0.25)]">
        <TabBarItem
          aria-label="Home"
          active={isActive(pathname, ["/home"])}
          render={<Link href="/home" />}
        >
          <HomeIcon />
        </TabBarItem>
        <TabBarItem
          aria-label="Search"
          active={pathname === "/search"}
          render={<Link href="/search" />}
        >
          <SearchIcon />
        </TabBarItem>
        <TabBarItem
          aria-label="List something new"
          emphasis
          render={<Link href="/list/new" />}
        >
          <PlusIcon strokeWidth={2.6} />
        </TabBarItem>
        <TabBarItem
          aria-label="Inbox"
          active={isActive(pathname, ["/inbox"])}
          render={<Link href="/inbox" />}
          className="relative"
        >
          <ChatIcon />
          {inboxCount > 0 && (
            <span className="absolute top-2.5 right-3 size-2.5 rounded-full border-2 border-surface bg-accent" />
          )}
        </TabBarItem>
        <TabBarItem aria-label="Me" active={onMe} render={<Link href="/me" />}>
          <UserIcon />
        </TabBarItem>
      </TabBar>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar className="hidden desk:flex" />
      <main className="min-w-0 flex-1 pb-32 desk:pb-0">{children}</main>
      <MobileTabBar className="desk:hidden" />
    </div>
  );
}
