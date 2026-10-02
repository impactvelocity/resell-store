"use client";

import { useState } from "react";
import { CheckIcon, LinkIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import {
  assistants,
  mcpUrl,
  type Assistant,
  type AssistantId,
} from "../../../lib/mock-agent-buyer";
import { useCopyMcpLink } from "./parts";

const action =
  "flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-semibold";
const pressable =
  "cursor-pointer transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-600";

/** "Pick your assistant": five connector cards and the MCP link bar. */
export function PickAssistant() {
  const toast = useToast();
  const { copy, copied } = useCopyMcpLink();
  const [connected, setConnected] = useState<Set<AssistantId>>(
    () => new Set(assistants.filter((a) => a.connected).map((a) => a.id)),
  );

  const connect = (a: Assistant) => {
    setConnected((prev) => new Set(prev).add(a.id));
    toast.add({ title: `Added to ${a.name}. Just ask it to shop.` });
  };

  return (
    <section
      id="assistants"
      className="flex scroll-mt-24 flex-col gap-6 pb-14 desk:gap-8 desk:pb-[72px]"
    >
      <div className="flex flex-col gap-2 border-t border-public-border pt-10 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 desk:pt-14">
        <h2 className="font-display text-[28px] leading-[34px] font-extrabold tracking-tight text-text desk:text-3xl">
          Pick your assistant
        </h2>
        <p className="text-base text-public-text-muted">
          About a minute. Sign in once with your resell.store account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5 lg:gap-5">
        {assistants.map((a) => (
          <div
            key={a.id}
            className="flex flex-col gap-[14px] rounded-lg border border-public-border p-5 desk:p-6"
          >
            <div className="flex flex-1 items-center gap-3.5 sm:flex-col sm:items-start">
              <Mark mark={a.mark} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="text-lg font-bold text-text">{a.name}</h3>
                <p className="text-sm text-public-text-muted">{a.blurb}</p>
              </div>
            </div>
            {a.action === "add" &&
              (connected.has(a.id) ? (
                <div className={cn(action, "bg-leaf-100 text-leaf-600")}>
                  <CheckIcon size={14} strokeWidth={3.2} />
                  Connected
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => connect(a)}
                  className={cn(
                    action,
                    pressable,
                    "bg-leaf-900 text-white hover:bg-leaf-600",
                  )}
                >
                  Add to {a.name}
                </button>
              ))}
            {a.action === "copy" && (
              <button
                type="button"
                onClick={() => copy(a.id)}
                className={cn(
                  action,
                  pressable,
                  "border border-leaf-900 text-text hover:bg-public-photo",
                )}
              >
                {copied === a.id && <CheckIcon size={14} strokeWidth={3} />}
                {copied === a.id ? "Copied" : "Copy link"}
              </button>
            )}
            {a.action === "none" && (
              <div className={cn(action, "bg-public-photo text-text")}>
                Nothing to install
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-public-photo py-4 pr-4 pl-5 desk:gap-6 desk:py-5 desk:pr-5 desk:pl-7">
        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-5">
          <span className="text-sm font-semibold text-public-text-muted">
            MCP link
          </span>
          <span className="truncate text-base font-semibold text-text desk:text-lg">
            {mcpUrl}
          </span>
        </div>
        <button
          type="button"
          onClick={() => copy("bar")}
          className={cn(
            pressable,
            "flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-public-border bg-white px-[22px] text-sm font-semibold text-text hover:bg-[#fafafa]",
          )}
        >
          {copied === "bar" && <CheckIcon size={14} strokeWidth={3} />}
          {copied === "bar" ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}

/** Letter tile, or the link / browser glyph for the generic options. */
function Mark({ mark }: { mark: Assistant["mark"] }) {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-public-photo font-display text-xl font-extrabold text-text">
      {mark === "link" ? (
        <LinkIcon size={22} strokeWidth={2.4} />
      ) : mark === "browser" ? (
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M3 10h18" />
        </svg>
      ) : (
        mark
      )}
    </div>
  );
}
