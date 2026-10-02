import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRightIcon } from "@repo/ui/icons";
import { Wordmark } from "@repo/ui/logo";
import { screenGroups } from "../../lib/screens";

export const metadata: Metadata = {
  title: "Screens · resell.store prototype",
};

/** Index of every screen in the clickable prototype. */
export default function ScreensPage() {
  return (
    <main className="mx-auto flex w-full max-w-page flex-col gap-10 px-4 py-10 desk:px-12 desk:py-16">
      <div className="flex flex-col gap-4">
        <Wordmark size="sm" />
        <h1 className="font-display text-4xl font-extrabold tracking-tight desk:text-5xl">
          Every screen
        </h1>
        <p className="max-w-xl text-lg text-text-muted">
          A clickable prototype. Nothing is saved and nothing is real. Resize
          the window under 900px to see the phone layout.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 desk:grid-cols-4">
        {screenGroups.map((group) => (
          <section key={group.key} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-text-muted uppercase">
              {group.key}, {group.title}
            </h2>
            <ul className="flex flex-col gap-1">
              {group.screens.map((screen) => (
                <li key={screen.code}>
                  <Link
                    href={screen.href}
                    className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-primary-soft"
                  >
                    <span className="w-9 shrink-0 pt-0.5 font-mono text-sm text-text-muted">
                      {screen.code}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-bold">{screen.name}</span>
                      <span className="truncate font-mono text-xs text-text-muted">
                        {screen.href}
                      </span>
                      {screen.note && (
                        <span className="text-sm text-text-muted">
                          {screen.note}
                        </span>
                      )}
                    </span>
                    <ArrowUpRightIcon
                      size={18}
                      className="mt-0.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
