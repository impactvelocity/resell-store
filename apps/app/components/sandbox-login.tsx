"use client";

import type { ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";
import type { SandboxLogin as Login } from "../lib/server/paypal";
import { useCopy } from "./tools/parts";

/**
 * Sandbox only: what's going on (no real money) and, when there's one, the
 * shared PayPal test login to use, with copy buttons. Works on the app and the
 * marketplace, so it uses palette colours rather than either zone's tokens.
 */
export function SandboxLogin({
  title = "PayPal sandbox",
  children,
  login,
  className,
}: {
  title?: string;
  children: ReactNode;
  login: Login | null;
  className?: string;
}) {
  const { copy, copied } = useCopy();
  return (
    <div className={cn("flex flex-col gap-2.5 rounded-md bg-lemon-100 px-4 py-3.5 text-sm text-leaf-900", className)}>
      <div className="flex flex-col gap-0.5">
        <p className="font-bold">{title}</p>
        <p>{children}</p>
      </div>
      {login && (
        <dl className="flex flex-col gap-1.5">
          {(
            [
              ["email", "Email", login.email],
              ["password", "Password", login.password],
            ] as const
          ).map(([key, label, value]) => (
            <div key={key} className="flex min-w-0 items-center gap-2 rounded-sm bg-white/70 py-1.5 pr-1.5 pl-3">
              <dt className="w-[72px] shrink-0 text-xs font-semibold opacity-70">{label}</dt>
              <dd className="w-0 flex-1 truncate font-mono text-[13px]">{value}</dd>
              <button
                type="button"
                onClick={() => copy(key, value, `${label} copied`)}
                className="h-7 shrink-0 rounded-sm px-2.5 text-xs font-bold hover:bg-lemon-300 focus-visible:outline-2 focus-visible:outline-leaf-600"
              >
                {copied === key ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
