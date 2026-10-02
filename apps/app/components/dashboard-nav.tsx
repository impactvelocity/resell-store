"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 md:flex-col">
      {links.map(({ href, label }) => {
        const active =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-muted",
              active
                ? "bg-primary-soft font-semibold text-text"
                : "text-text-muted",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
