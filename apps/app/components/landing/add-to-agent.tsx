"use client";

import Link from "next/link";
import { ChevronDownIcon, LinkIcon } from "@repo/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { useToast } from "@repo/ui/toast";
import { SparkleMark } from "@repo/ui/whimsy";
import { cn } from "@repo/ui/lib/utils";
import { logoUrl } from "../../lib/logos";

/*
 * Hero "Add to your agent": the shopping MCP link (no account needed) for
 * each assistant. Cursor and VS Code have install links; the rest copy the
 * link or command and say where to paste it.
 */

type Option = {
  name: string;
  domain?: string;
  hint: string;
} & (
  | { kind: "copy"; value: (url: string) => string; toast: string }
  | { kind: "open"; href: (url: string) => string }
);

const options: Option[] = [
  {
    name: "Claude",
    domain: "claude.ai",
    hint: "Paste it as a custom connector",
    kind: "copy",
    value: (url) => url,
    toast: "Link copied. In Claude, go to Settings, Connectors, Add custom connector.",
  },
  {
    name: "ChatGPT",
    domain: "chatgpt.com",
    hint: "Paste it as a connector in developer mode",
    kind: "copy",
    value: (url) => url,
    toast: "Link copied. In ChatGPT, turn on developer mode in Settings, Apps and connectors, then create a connector.",
  },
  {
    name: "Cursor",
    domain: "cursor.com",
    hint: "Opens Cursor to install it",
    kind: "open",
    href: (url) =>
      `cursor://anysphere.cursor-deeplink/mcp/install?name=resell-store&config=${btoa(JSON.stringify({ url }))}`,
  },
  {
    name: "VS Code",
    domain: "code.visualstudio.com",
    hint: "Opens VS Code to install it",
    kind: "open",
    href: (url) =>
      `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: "resell-store", type: "http", url }))}`,
  },
  {
    name: "Claude Code",
    domain: "claude.ai",
    hint: "Copies the terminal command",
    kind: "copy",
    value: (url) => `claude mcp add --transport http resell-store ${url}`,
    toast: "Command copied. Run it in your terminal.",
  },
  {
    name: "Any MCP client",
    hint: "Copies the MCP link",
    kind: "copy",
    value: (url) => url,
    toast: "MCP link copied. Paste it in your assistant.",
  },
];

const stack = ["claude.ai", "chatgpt.com", "cursor.com"];

/** Brand colours for the letter tiles shown until a logo.dev key is set. */
const tileColors: Record<string, string> = {
  "claude.ai": "#d97757",
  "chatgpt.com": "#0d0d0d",
  "cursor.com": "#26251e",
  "code.visualstudio.com": "#0078d4",
};

function Mark({ domain, name, size }: { domain?: string; name: string; size: number }) {
  const src = domain ? logoUrl(domain, size * 2) : null;
  if (src)
    // eslint-disable-next-line @next/next/no-img-element -- logo.dev serves sized PNGs already
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-md" />;
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md text-sm font-extrabold",
        domain ? "text-white" : "bg-surface-muted",
      )}
      style={{ width: size, height: size, background: domain ? tileColors[domain] : undefined }}
    >
      {domain ? name[0] : <LinkIcon size={16} strokeWidth={2.4} />}
    </span>
  );
}

export function AddToAgent({ mcpUrl }: { mcpUrl: string }) {
  const toast = useToast();

  const copy = (text: string, title: string) => {
    try {
      void navigator.clipboard?.writeText(text).catch(() => {});
    } catch {
      // Clipboard can be blocked in previews; the toast still says what to do.
    }
    toast.add({ title });
  };

  const row =
    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none hover:bg-surface-muted focus-visible:bg-surface-muted";

  return (
    <Popover>
      <PopoverTrigger className="flex h-12 w-fit cursor-pointer items-center gap-3 rounded-full border border-border bg-surface pr-4 pl-2 text-base font-bold transition-colors outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary data-[popup-open]:bg-surface-muted">
        {logoUrl(stack[0]!) ? (
          <span className="flex -space-x-2">
            {stack.map((d) => (
              <span key={d} className="rounded-lg ring-2 ring-surface">
                <Mark domain={d} name={d} size={32} />
              </span>
            ))}
          </span>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft">
            <SparkleMark size={16} />
          </span>
        )}
        Add to your agent
        <ChevronDownIcon size={18} strokeWidth={2.4} />
      </PopoverTrigger>
      <PopoverContent className="flex w-[340px] max-w-[calc(100vw-32px)] flex-col p-2">
        <p className="px-3 pt-2 pb-1 text-sm text-text-muted">
          Shop resell.store by chatting. No account needed.
        </p>
        <ul className="flex flex-col">
          {options.map((o) => (
            <li key={o.name}>
              {o.kind === "open" ? (
                <a href={o.href(mcpUrl)} className={row}>
                  <Mark domain={o.domain} name={o.name} size={32} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-base font-bold">{o.name}</span>
                    <span className="text-sm text-text-muted">{o.hint}</span>
                  </span>
                </a>
              ) : (
                <button type="button" onClick={() => copy(o.value(mcpUrl), o.toast)} className={row}>
                  <Mark domain={o.domain} name={o.name} size={32} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-base font-bold">{o.name}</span>
                    <span className="text-sm text-text-muted">{o.hint}</span>
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-1 flex flex-col gap-1 border-t border-border px-3 pt-3 pb-2 text-sm">
          <span className="truncate font-mono text-text-muted">{mcpUrl}</span>
          <Link href="/tools/agent" className="font-bold text-secondary hover:underline">
            Selling? Get your private seller link
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
