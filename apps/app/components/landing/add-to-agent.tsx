import Link from "next/link";
import { ChevronRightIcon } from "@repo/ui/icons";
import { SparkleMark } from "@repo/ui/whimsy";
import { logoUrl } from "../../lib/logos";
import { signInHref } from "../../lib/safe-next";

/*
 * Hero "Add to your agent": goes to D2, where a signed-in person gets their
 * private MCP link. Signed out, it signs them in (or up) first and comes back.
 */

const agentSetup = "/tools/agent";

const stack = ["claude.ai", "chatgpt.com", "cursor.com"];

/** Brand colours for the letter tiles shown until a logo.dev key is set. */
const tileColors: Record<string, string> = {
  "claude.ai": "#d97757",
  "chatgpt.com": "#0d0d0d",
  "cursor.com": "#26251e",
};

function Mark({ domain, size }: { domain: string; size: number }) {
  const src = logoUrl(domain, size * 2);
  if (src)
    // eslint-disable-next-line @next/next/no-img-element -- logo.dev serves sized PNGs already
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-md" />;
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-md text-sm font-extrabold text-white"
      style={{ width: size, height: size, background: tileColors[domain] }}
    >
      {domain[0]!.toUpperCase()}
    </span>
  );
}

export function AddToAgent({ signedIn }: { signedIn: boolean }) {
  return (
    <Link
      href={signedIn ? agentSetup : signInHref(agentSetup)}
      className="flex h-12 w-fit items-center gap-3 rounded-full border border-border bg-surface pr-4 pl-2 text-base font-bold transition-colors outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      {logoUrl(stack[0]!) ? (
        <span className="flex -space-x-2">
          {stack.map((d) => (
            <span key={d} className="rounded-lg ring-2 ring-surface">
              <Mark domain={d} size={32} />
            </span>
          ))}
        </span>
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft">
          <SparkleMark size={16} />
        </span>
      )}
      Add to your agent
      <ChevronRightIcon size={18} strokeWidth={2.4} />
    </Link>
  );
}
