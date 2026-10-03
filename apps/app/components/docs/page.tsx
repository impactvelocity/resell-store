import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { docsTabs } from "../../lib/docs/nav";

/*
 * A docs page: title block, the article, "On this page" on wide screens, and
 * previous/next links in sidebar order. Prose pieces below keep every page
 * reading the same.
 */

export type TocItem = { id: string; title: string; depth?: 2 | 3 };

/** Every linked page in sidebar order, for previous/next. */
const order = docsTabs.flatMap((t) => t.sections.flatMap((s) => s.items.filter((i) => i.href).map((i) => ({ ...i, tab: t.title }))));

export function DocPage({
  base,
  path,
  eyebrow,
  title,
  lead,
  toc = [],
  wide = false,
  children,
}: {
  base: string;
  /** This page's docs path, e.g. "/api/listings". */
  path: string;
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  toc?: TocItem[];
  /** Reference pages: room for code beside the text. */
  wide?: boolean;
  children: ReactNode;
}) {
  const i = order.findIndex((o) => o.href === path);
  const prev = i > 0 ? order[i - 1] : undefined;
  const next = i >= 0 ? order[i + 1] : undefined;
  const href = (p: string) => base + (p === "/" ? "" : p) || "/";

  return (
    <div className="flex gap-10 px-4 py-10 sm:px-8 desk:px-12 desk:py-14">
      <article className={cn("min-w-0 flex-1", wide ? "max-w-[1080px]" : "max-w-[760px]")}>
        <header className="flex flex-col gap-3 pb-8">
          {eyebrow && <p className="text-sm font-bold text-secondary">{eyebrow}</p>}
          <h1 className="font-display text-[34px] leading-[40px] font-extrabold tracking-tight desk:text-[44px] desk:leading-[50px]">
            {title}
          </h1>
          {lead && <div className="max-w-[680px] text-lg leading-7 text-text-muted">{lead}</div>}
        </header>
        <div className="flex flex-col gap-5">{children}</div>
        {(prev || next) && (
          <nav aria-label="More docs" className="mt-16 grid gap-3 border-t border-public-border pt-8 sm:grid-cols-2">
            {prev ? (
              <Link href={href(prev.href!)} className="group flex flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:bg-surface-muted/50">
                <span className="flex items-center gap-1 text-sm text-text-muted">
                  <ChevronLeftIcon size={14} strokeWidth={2.4} /> Previous
                </span>
                <span className="font-bold">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={href(next.href!)} className="group flex flex-col items-end gap-1 rounded-lg border border-border p-4 text-right transition-colors hover:bg-surface-muted/50">
                <span className="flex items-center gap-1 text-sm text-text-muted">
                  Next <ChevronRightIcon size={14} strokeWidth={2.4} />
                </span>
                <span className="font-bold">{next.tab !== order[i]?.tab ? `${next.tab}: ` : ""}{next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </article>
      {toc.length > 0 && (
        <aside
          className={cn(
            "sticky top-24 hidden h-fit max-h-[calc(100dvh-8rem)] w-[220px] shrink-0 overflow-y-auto",
            // Reference pages use the room for code beside the text instead
            !wide && "xl:block",
          )}
        >
          <p className="pb-3 text-xs font-bold tracking-wide text-text-muted uppercase">On this page</p>
          <ul className="flex flex-col gap-1.5 border-l border-public-border">
            {toc.map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className={cn(
                    "-ml-px block border-l border-transparent py-0.5 text-sm text-text-muted hover:border-text hover:text-text",
                    t.depth === 3 ? "pl-6" : "pl-4",
                  )}
                >
                  {t.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

export function H2({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn("group mt-8 scroll-mt-24 font-display text-[26px] leading-8 font-extrabold tracking-tight", className)}>
      <a href={`#${id}`} className="outline-none">
        {children}
        <span aria-hidden className="ml-2 text-text-muted opacity-0 transition-opacity group-hover:opacity-100">#</span>
      </a>
    </h2>
  );
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-4 scroll-mt-24 text-lg leading-7 font-bold">
      {children}
    </h3>
  );
}

export function P({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-base leading-7 text-text/90", className)} {...props} />;
}

/** Inline code. */
export function C({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[0.88em] text-text">{children}</code>;
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="font-semibold text-secondary underline decoration-secondary/30 underline-offset-[3px] hover:decoration-secondary"
    >
      {children}
    </a>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-6 text-base leading-7 text-text/90 marker:text-text-muted">{children}</ul>;
}

export function OL({ children }: { children: ReactNode }) {
  return <ol className="flex list-decimal flex-col gap-2 pl-6 text-base leading-7 text-text/90 marker:font-bold marker:text-text-muted">{children}</ol>;
}

export function Callout({
  tone = "note",
  title,
  children,
}: {
  tone?: "note" | "tip" | "warn";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-5 py-4 text-[15px] leading-6",
        tone === "note" && "border-leaf-300/60 bg-secondary-soft/60",
        tone === "tip" && "border-lemon-400/50 bg-primary-soft",
        tone === "warn" && "border-pink-400/40 bg-accent-soft/60",
      )}
    >
      {title && <p className="font-bold">{title}</p>}
      <div className="text-text/90 [&_p]:leading-6">{children}</div>
    </div>
  );
}

export function Table({ head, rows }: { head: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead className="bg-surface-muted/60">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-2.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border align-top">
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-3 leading-6">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A grid of linked cards, for overview pages. */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

export function LinkCard({
  href,
  title,
  children,
  tag,
  icon,
}: {
  href?: string;
  title: string;
  children: ReactNode;
  tag?: string;
  icon?: ReactNode;
}) {
  const body = (
    <>
      <span className="flex items-center gap-3">
        {icon && <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">{icon}</span>}
        <span className="text-lg font-bold">{title}</span>
        {tag && <span className="ml-auto rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-text-muted">{tag}</span>}
      </span>
      <span className="text-[15px] leading-6 text-text-muted">{children}</span>
    </>
  );
  const cls = "flex flex-col gap-2 rounded-xl border border-border bg-surface p-5";
  return href ? (
    <Link href={href} className={cn(cls, "transition-[background-color,border-color] hover:border-text/30 hover:bg-surface-muted/40")}>
      {body}
    </Link>
  ) : (
    <div className={cn(cls, "opacity-75")}>{body}</div>
  );
}

const methodTone: Record<string, string> = {
  GET: "bg-secondary-soft text-secondary",
  POST: "bg-primary-soft text-[#8a5a00]",
  PUT: "bg-accent-soft text-accent-text",
  PATCH: "bg-accent-soft text-accent-text",
  DELETE: "bg-[#fde3dc] text-danger",
};

export function Method({ method, className }: { method: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 font-mono text-[11px] font-bold tracking-wide",
        methodTone[method] ?? "bg-surface-muted",
        className,
      )}
    >
      {method}
    </span>
  );
}
