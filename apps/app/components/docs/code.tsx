"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";

/*
 * Code on the docs: ink panels with lemon type, like the API screen's sample,
 * a copy button, and language tabs that remember your pick across pages.
 */

const LANG_KEY = "rs_docs_lang";
const LANG_EVENT = "rs-docs-lang";

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {}
      }}
      className={cn(
        "flex h-7 shrink-0 cursor-pointer items-center rounded-full bg-on-secondary/12 px-3 text-xs font-bold text-on-secondary transition-colors outline-none hover:bg-on-secondary/24 focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function CodeBlock({
  code,
  title,
  className,
  tone = "ink",
}: {
  code: string;
  title?: ReactNode;
  className?: string;
  /** "ink" for requests and commands, "paper" for responses. */
  tone?: "ink" | "paper";
}) {
  const ink = tone === "ink";
  return (
    <div className={cn("overflow-hidden rounded-lg", ink ? "bg-text" : "border border-border bg-surface-muted/60", className)}>
      <div className="flex min-h-10 items-center justify-between gap-3 px-4 pt-2">
        <span className={cn("truncate text-xs font-bold tracking-wide uppercase", ink ? "text-on-secondary/60" : "text-text-muted")}>
          {title}
        </span>
        <CopyButton text={code} className={ink ? undefined : "bg-text/6 text-text hover:bg-text/12"} />
      </div>
      <pre
        className={cn(
          "overflow-x-auto px-4 pt-1 pb-4 font-mono text-[13px] leading-[22px] [scrollbar-width:thin]",
          ink ? "text-lemon-300" : "max-h-[520px] text-text",
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

export type CodeSample = { lang: string; label: string; code: string };

/** Several languages of the same request; the chosen one sticks across the site. */
export function CodeTabs({ samples, title, className }: { samples: CodeSample[]; title?: string; className?: string }) {
  const [lang, setLang] = useState(samples[0]!.lang);

  useEffect(() => {
    const read = () => {
      try {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved && samples.some((s) => s.lang === saved)) setLang(saved);
      } catch {}
    };
    read();
    window.addEventListener(LANG_EVENT, read);
    return () => window.removeEventListener(LANG_EVENT, read);
  }, [samples]);

  const pick = (next: string) => {
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {}
    window.dispatchEvent(new Event(LANG_EVENT));
  };

  const current = samples.find((s) => s.lang === lang) ?? samples[0]!;
  return (
    <div className={cn("overflow-hidden rounded-lg bg-text", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-on-secondary/10 px-2 pt-2 pb-1.5">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {title && <span className="px-2 text-xs font-bold tracking-wide whitespace-nowrap text-on-secondary/60 uppercase">{title}</span>}
          {samples.map((s) => (
            <button
              key={s.lang}
              type="button"
              onClick={() => pick(s.lang)}
              aria-pressed={s.lang === current.lang}
              className={cn(
                "h-7 shrink-0 cursor-pointer rounded-full px-3 text-xs font-bold text-on-secondary/60 transition-colors outline-none hover:text-on-secondary focus-visible:outline-2 focus-visible:outline-primary",
                s.lang === current.lang && "bg-on-secondary/14 text-on-secondary",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <CopyButton text={current.code} />
      </div>
      <pre className="overflow-x-auto px-4 pt-3 pb-4 font-mono text-[13px] leading-[22px] text-lemon-300 [scrollbar-width:thin]">
        <code>{current.code}</code>
      </pre>
    </div>
  );
}
