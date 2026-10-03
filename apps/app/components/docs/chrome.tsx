"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRightIcon, CloseIcon, ListIcon } from "@repo/ui/icons";
import { Wordmark } from "@repo/ui/logo";
import { cn } from "@repo/ui/lib/utils";
import { docsTabs, tabFor, type NavTab } from "../../lib/docs/nav";

/*
 * The docs site's frame: a header with the product tabs (Guides, API, MCP),
 * the section's sidebar, and the page. Under 900px the sidebar becomes a
 * sheet behind the Menu button.
 *
 * `base` is "" on docs.resell.store and "/docs" on the marketplace.
 */

function useDocsPath(base: string) {
  const pathname = usePathname();
  const path = base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;
  return path.replace(/\/$/, "") || "/";
}

function Sidebar({ tab, base, path, onNavigate }: { tab: NavTab; base: string; path: string; onNavigate?: () => void }) {
  return (
    <nav aria-label={`${tab.title} docs`} className="flex flex-col gap-7">
      {tab.sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <h2 className="px-3 pb-1 text-xs font-bold tracking-wide text-text-muted uppercase">{section.title}</h2>
          {section.items.map((item) =>
            item.href ? (
              <Link
                key={item.title}
                href={base + (item.href === "/" ? "" : item.href) || "/"}
                onClick={onNavigate}
                aria-current={path === item.href ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[15px] leading-6 font-medium text-text/80 transition-colors outline-none hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-secondary",
                  path === item.href && "bg-primary-soft font-bold text-text hover:bg-primary-soft",
                )}
              >
                {item.title}
              </Link>
            ) : (
              <span key={item.title} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[15px] leading-6 text-text-muted">
                {item.title}
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold">Soon</span>
              </span>
            ),
          )}
        </div>
      ))}
    </nav>
  );
}

export function DocsChrome({ base, appUrl, children }: { base: string; appUrl: string; children: ReactNode }) {
  const path = useDocsPath(base);
  const tab = tabFor(path);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-dvh bg-public-background">
      <header className="sticky top-0 z-30 border-b border-public-border bg-public-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 desk:gap-8 desk:px-8">
          <Link href={base || "/"} className="flex shrink-0 items-center gap-2.5 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-secondary">
            <Wordmark className="text-lg" />
            <span className="rounded-full bg-secondary-soft px-2.5 py-0.5 text-sm font-bold text-secondary">docs</span>
          </Link>
          <nav aria-label="Docs sections" className="hidden items-center gap-1 desk:flex">
            {docsTabs.map((t) => (
              <Link
                key={t.id}
                href={base + (t.href === "/" ? "" : t.href) || "/"}
                aria-current={t.id === tab.id ? "true" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[15px] font-semibold text-text-muted transition-colors outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-secondary",
                  t.id === tab.id && "bg-surface-muted text-text",
                )}
              >
                {t.title}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={appUrl}
              className="hidden h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-secondary transition-colors hover:bg-secondary-soft min-[520px]:flex"
            >
              resell.store
              <ArrowUpRightIcon size={15} strokeWidth={2.4} />
            </a>
            <a
              href={`${appUrl.replace(/\/$/, "")}/tools/api`}
              className="hidden h-10 items-center rounded-full bg-primary px-4 text-sm font-bold text-on-primary transition-colors hover:bg-lemon-300 sm:flex"
            >
              Get a key
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-10 items-center gap-2 rounded-full border-[1.5px] border-border px-3.5 text-sm font-bold desk:hidden"
              aria-expanded={menuOpen}
              aria-controls="docs-menu"
            >
              <ListIcon size={16} strokeWidth={2.4} />
              Menu
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-[272px] shrink-0 overflow-y-auto border-r border-public-border px-5 py-8 [scrollbar-width:thin] desk:block">
          <Sidebar tab={tab} base={base} path={path} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      {menuOpen && (
        <div id="docs-menu" role="dialog" aria-modal="true" aria-label="Docs menu" className="fixed inset-0 z-40 desk:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-text/30" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(340px,88vw)] flex-col overflow-y-auto bg-public-background px-5 pt-4 pb-10 shadow-xl">
            <div className="flex items-center justify-between pb-4">
              <div className="flex gap-1">
                {docsTabs.map((t) => (
                  <Link
                    key={t.id}
                    href={base + (t.href === "/" ? "" : t.href) || "/"}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-semibold text-text-muted",
                      t.id === tab.id && "bg-surface-muted text-text",
                    )}
                  >
                    {t.title}
                  </Link>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex size-10 items-center justify-center rounded-full hover:bg-surface-muted"
              >
                <CloseIcon size={18} strokeWidth={2.4} />
              </button>
            </div>
            <Sidebar tab={tab} base={base} path={path} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
