import { cn } from "@repo/ui/lib/utils";
import { AgentAvatar } from "../agent-chat/agent-chat";
import { me } from "../../lib/mock";
import { HoldBadge, LetterAvatar } from "./offer-parts";

/*
 * Negotiation timeline (spec D). The back and forth between the buyer (or the
 * buyer's agent) and the seller's agent. Oldest first, read only. The latest
 * amount is green. New rows arrive while the page is open.
 */

export type TimelineEntry = {
  who: "buyer-agent" | "buyer" | "agent" | "you";
  time: string;
  /** One sentence on what was said or done. */
  text: string;
  /** The number on the table after that move. */
  amount?: number;
  /** A hold paid with this move shows as a badge under the row. */
  hold?: number;
  /** Highlight a row that just arrived. */
  fresh?: boolean;
};

function Who({ who, buyer }: { who: TimelineEntry["who"]; buyer: string }) {
  if (who === "agent") {
    return <span className="text-sm font-bold text-accent-text">Your agent</span>;
  }
  const label =
    who === "you" ? "You" : who === "buyer-agent" ? `${buyer}'s agent` : buyer;
  return <span className="text-sm font-bold text-text">{label}</span>;
}

function WhoAvatar({ who, initial }: { who: TimelineEntry["who"]; initial: string }) {
  if (who === "agent") return <AgentAvatar size="md" />;
  if (who === "you") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-extrabold text-on-primary">
        {me.initial}
      </span>
    );
  }
  return <LetterAvatar initial={initial} className="size-8 text-sm" />;
}

export function NegotiationTimeline({
  buyer,
  initial,
  rows,
  className,
}: {
  buyer: string;
  initial: string;
  rows: TimelineEntry[];
  className?: string;
}) {
  const latest = rows.reduce(
    (last, r, i) => (r.amount !== undefined ? i : last),
    -1,
  );
  return (
    <section
      aria-label="How it went"
      className={cn(
        "flex w-full flex-col rounded-lg border border-border bg-surface px-6 py-2",
        className,
      )}
    >
      <h2 className="pt-4 pb-1 text-base font-bold text-text">How it went</h2>
      <ol className="flex flex-col">
        {rows.map((row, i) => (
          <li
            key={`${row.time}-${i}`}
            className={cn(
              "flex w-full items-start gap-[14px] border-b border-border py-4 last:border-b-0",
              row.fresh && "animate-[timeline-in_400ms_ease-out]",
            )}
          >
            <WhoAvatar who={row.who} initial={initial} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Who who={row.who} buyer={buyer} />
                  <span className="text-sm text-text-muted">{row.time}</span>
                </div>
                <p className="text-base text-text">{row.text}</p>
              </div>
              {row.hold !== undefined && <HoldBadge amount={row.hold} />}
            </div>
            <div
              className={cn(
                "w-16 shrink-0 text-right font-display text-xl font-extrabold",
                i === latest ? "text-secondary" : "text-text",
              )}
            >
              {row.amount !== undefined ? `$${row.amount}` : null}
            </div>
          </li>
        ))}
      </ol>
      <style>{`@keyframes timeline-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </section>
  );
}
