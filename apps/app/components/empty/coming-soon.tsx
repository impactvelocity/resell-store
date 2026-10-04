import type { ReactNode } from "react";
import { Sticker } from "@repo/ui/sticker";
import { cn } from "@repo/ui/lib/utils";
import { MobileBackHeader, Page } from "../shell/page";
import { EmptyArt, type EmptyArtPreset } from "./art";

/*
 * Frame for a screen whose feature isn't switched on yet (the Tools, D1–D4):
 * the app header, a coloured hero that says what it will do with a "Soon"
 * sticker, the specifics underneath, and a link to compare with the design.
 * Nothing on these pages pretends to work: no keys, no toggles, no "connected".
 */

const heroTones = {
  leaf: {
    card: "bg-secondary text-on-secondary",
    eyebrow: "text-leaf-100",
    body: "text-leaf-100",
    tile: "bg-leaf-100",
    sticker: "primary",
  },
  lemon: {
    card: "bg-primary text-text",
    eyebrow: "text-text",
    body: "text-text",
    tile: "bg-surface",
    sticker: "secondary",
  },
  pink: {
    card: "bg-accent-soft text-text",
    eyebrow: "text-accent-text",
    body: "text-text-muted",
    tile: "bg-surface",
    sticker: "primary",
  },
  ink: {
    card: "bg-text text-on-secondary",
    eyebrow: "text-leaf-300",
    body: "text-leaf-100",
    tile: "bg-primary-soft",
    sticker: "primary",
  },
} as const;

export function ComingSoon({
  mobileTitle,
  backHref = "/me",
  tone,
  eyebrow,
  title,
  description,
  art,
  hero = true,
  soon = true,
  preview = "A preview of what\u2019s coming. None of it is switched on yet, so nothing here can touch your shop.",
  children,
}: {
  mobileTitle: string;
  backHref?: string;
  tone: keyof typeof heroTones;
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  art: EmptyArtPreset;
  /** Off once the page's main thing is set up: just the cards. */
  hero?: boolean;
  /** The "Soon" stickers and "Coming next" line, for a page where nothing works yet. */
  soon?: boolean;
  /** The dashed note at the bottom. */
  preview?: ReactNode;
  children: ReactNode;
}) {
  const t = heroTones[tone];
  return (
    <>
      <MobileBackHeader title={mobileTitle} backHref={backHref} />
      <Page className="gap-4 pb-8 desk:gap-6 desk:pt-8">
        {!hero && (
          <h1 className="hidden font-display text-3xl leading-[44px] font-extrabold tracking-tight desk:block">
            {mobileTitle}
          </h1>
        )}
        {hero && (
          <section
            className={cn(
              "flex w-full flex-col gap-5 rounded-xl px-5 py-6 desk:flex-row desk:items-center desk:gap-10 desk:py-10 desk:pr-10 desk:pl-11",
              t.card,
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-4 desk:gap-5">
              <div className="flex flex-col gap-2 desk:gap-2.5">
                <div
                  className={cn(
                    "text-sm font-semibold tracking-wide uppercase",
                    t.eyebrow,
                  )}
                >
                  {eyebrow}
                </div>
                <h1 className="font-display text-3xl leading-[38px] font-extrabold tracking-tight text-balance desk:text-[40px] desk:leading-[44px]">
                  {title}
                </h1>
                <p
                  className={cn(
                    "text-base text-pretty desk:text-lg desk:leading-7",
                    t.body,
                  )}
                >
                  {description}
                </p>
              </div>
              {soon && (
                <>
                  <div className="flex items-center gap-3 desk:hidden">
                    <Sticker tone={t.sticker} size="sm" rotate={-4}>
                      Soon
                    </Sticker>
                    <span className={cn("text-sm font-semibold", t.body)}>
                      Coming next. Nothing to set up yet.
                    </span>
                  </div>
                  <p
                    className={cn(
                      "hidden text-sm font-semibold desk:block",
                      t.body,
                    )}
                  >
                    Coming next. Nothing to set up yet.
                  </p>
                </>
              )}
            </div>
            <div
              className={cn(
                "relative hidden size-[200px] shrink-0 items-center justify-center rounded-[40px] desk:flex",
                t.tile,
              )}
            >
              <EmptyArt preset={art} className="size-[66%]" />
              {soon && (
                <Sticker
                  tone={t.sticker}
                  size="md"
                  rotate={-6}
                  className="absolute -top-3 -right-4 shadow-[0_6px_16px_-8px_rgb(20_38_29/0.35)]"
                >
                  Soon
                </Sticker>
              )}
            </div>
          </section>
        )}

        {children}

        <div className="rounded-lg border-[1.5px] border-dashed border-border px-5 py-4 desk:rounded-xl desk:px-6">
          <p className="text-sm text-text-muted">{preview}</p>
        </div>
      </Page>
    </>
  );
}

/** White card holding one part of the plan. */
export function SoonCard({
  title,
  description,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex w-full flex-col gap-3 rounded-lg border border-border bg-surface px-[18px] pt-5 pb-2 desk:rounded-xl desk:px-6 desk:pt-6",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-text-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** One row in a SoonCard: a tile, a name, one line, and an optional tag on the right. */
export function SoonRow({
  tile,
  title,
  description,
  tag,
}: {
  tile?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  tag?: ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-3.5 border-b border-border py-4 last:border-b-0">
      {tile}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-bold">{title}</span>
        {description && (
          <span className="text-sm text-text-muted">{description}</span>
        )}
      </div>
      {tag}
    </div>
  );
}

/** Square letter tile standing in for a service logo (as on D1). */
export function LetterTile({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "leaf" | "pink" | "lemon";
}) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-md font-display text-lg leading-6 font-extrabold text-text",
        tone === "muted" && "bg-surface-muted",
        tone === "leaf" && "bg-secondary-soft",
        tone === "pink" && "bg-accent-soft",
        tone === "lemon" && "bg-primary-soft",
      )}
    >
      {children}
    </span>
  );
}

/** Small pill on the right of a row: "Soon", "Ask me first"… */
export function Tag({
  children,
  tone = "lemon",
}: {
  children: ReactNode;
  tone?: "lemon" | "muted" | "leaf";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-sm font-semibold whitespace-nowrap",
        tone === "lemon" && "bg-primary-soft text-text",
        tone === "muted" && "bg-surface-muted text-text-muted",
        tone === "leaf" && "bg-secondary-soft text-secondary",
      )}
    >
      {children}
    </span>
  );
}

/** Lemon number disc for step cards. */
export function StepNumber({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base leading-5 font-extrabold text-on-primary">
      {children}
    </span>
  );
}

/** Numbered steps in a row on desktop, stacked on a phone. */
export function Steps({
  title,
  steps,
}: {
  title?: ReactNode;
  steps: { title: string; body: ReactNode }[];
}) {
  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-5 desk:gap-5 desk:rounded-xl desk:p-7">
      {title && (
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          {title}
        </h2>
      )}
      <ol className="flex flex-col gap-4 desk:flex-row desk:gap-5">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="flex items-start gap-3 desk:flex-1 desk:flex-col desk:gap-2.5"
          >
            <StepNumber>{i + 1}</StepNumber>
            <div className="flex min-w-0 flex-1 flex-col gap-1 desk:gap-1.5">
              <div className="text-base font-bold">{step.title}</div>
              <div className="text-sm text-text-muted">{step.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
