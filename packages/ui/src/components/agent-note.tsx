import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";
import { SparkleIcon } from "./icons";

export interface AgentNoteProps extends Omit<ComponentProps<"div">, "title"> {
  /** Who and when, e.g. "Your agent, 2 min ago". */
  meta: ReactNode;
  title: ReactNode;
  /** Buttons, usually a primary md and a ghost md. */
  actions?: ReactNode;
}

/** A message from the listing agent. Pink is reserved for the agent. */
export function AgentNote({
  meta,
  title,
  actions,
  children,
  className,
  ...props
}: AgentNoteProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-surface p-6",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-text">
          <SparkleIcon />
        </span>
        <span className="text-sm font-semibold text-accent-text">{meta}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-xl font-bold tracking-[-0.01em] text-text">
          {title}
        </div>
        {children && (
          <div className="text-base text-text-muted">{children}</div>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
