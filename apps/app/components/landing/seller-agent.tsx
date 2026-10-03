import type { ReactNode } from "react";
import {
  ArrowUpRightIcon,
  BagIcon,
  CameraIcon,
  TruckIcon,
} from "@repo/ui/icons";
import { SparkleMark } from "@repo/ui/whimsy";
import { cn } from "@repo/ui/lib/utils";
import { Pill } from "../home/parts";
import { PotIllustration } from "../listing/pot-illustration";
import { Pop, Reveal } from "./motion";
import { CheckDot, Container, Point, SectionIntro } from "./parts";

/* The seller agent section: research, haggling, the link page, and four promises. */

/* ---------- Research ---------- */

type StepState = "done" | "working" | "next";

const researchSteps: {
  title: string;
  detail: string;
  source: string;
  state: StepState;
}[] = [
  {
    title: "Looked at your photo",
    detail: "Round, about 5.5 qt, yellow enamel",
    source: "Photo",
    state: "done",
  },
  {
    title: "Checked 42 recent sales",
    detail: "Most went for $160 to $210",
    source: "Sales",
    state: "done",
  },
  {
    title: "Visiting the maker's site",
    detail: "Seeing if it's still sold new",
    source: "Browser",
    state: "working",
  },
  {
    title: "Reading what buyers say",
    detail: "Up next",
    source: "Browser",
    state: "next",
  },
];

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") return <CheckDot size={24} />;
  if (state === "working") {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        aria-hidden
        className="shrink-0 animate-spin [animation-duration:1.4s]"
      >
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="3"
        />
        <path
          d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
          fill="none"
          stroke="var(--color-lemon-500)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <span
      aria-hidden
      className="size-6 shrink-0 rounded-full border-[3px] border-border"
    />
  );
}

function ResearchDemo() {
  return (
    <div className="flex w-full max-w-[438px] shrink-0 flex-col gap-4 rounded-xl bg-surface-muted p-5 sm:p-10">
      <div className="flex flex-col items-end gap-2">
        <Pop rotate={-20} delay={0.2}>
          <span className="flex size-28 items-center justify-center rounded-lg bg-leaf-100">
            <PotIllustration />
          </span>
        </Pop>
        <Pop rotate={6} delay={0.4} className="origin-bottom-right">
          <p className="max-w-[290px] rounded-t-lg rounded-br-[6px] rounded-bl-lg bg-text px-4 py-3 text-base font-medium text-background">
            Le Creuset dutch oven, the yellow one. It was a wedding gift.
          </p>
        </Pop>
      </div>
      <ul className="flex flex-col rounded-lg border border-border bg-surface px-4 py-1">
        {researchSteps.map((step) => (
          <li
            key={step.title}
            className="flex items-start gap-3 border-b border-border py-3.5 last:border-b-0"
          >
            <StepIcon state={step.state} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span
                className={cn(
                  "text-base font-semibold",
                  step.state === "next" && "text-text-muted",
                )}
              >
                {step.title}
              </span>
              <span className="text-sm text-text-muted">{step.detail}</span>
            </div>
            <span className="flex w-[76px] shrink-0 justify-end">
              <span
                className={cn(
                  "flex h-6 items-center rounded-full px-2.5 text-sm font-semibold",
                  step.state === "working"
                    ? "bg-primary-soft text-text"
                    : "bg-surface-muted text-text-muted",
                )}
              >
                {step.source}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2.5 px-1">
        <span aria-hidden className="flex items-center gap-[5px]">
          {["bg-lemon-400", "bg-leaf-300", "bg-pink-400"].map((tone, i) => (
            <span
              key={tone}
              className={cn(
                "size-[9px] shrink-0 animate-thinking rounded-full",
                tone,
              )}
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </span>
        <span className="text-sm font-medium text-text-muted">
          Working out a fair price
        </span>
      </div>
    </div>
  );
}

const listsIt = [
  "Priced from what the same thing actually sold for",
  "Title, description and details written for you",
  "Photos tidied and put in the right order",
];

function ResearchFeature() {
  return (
    <div className="flex flex-col items-center gap-12 rounded-[32px] border border-border bg-surface px-5 py-10 md:rounded-[40px] md:px-12 xl:flex-row xl:gap-[72px] xl:py-14 xl:pr-14 xl:pl-16">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <h3 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          It knows what your stuff is really worth
        </h3>
        <p className="max-w-[520px] text-lg text-text-muted">
          Before it writes a word, your agent looks at your photo, checks dozens
          of real recent sales and visits the maker's site. You get a fair price
          with the working shown, not a guess.
        </p>
        <ul className="flex flex-col gap-3.5 pt-2">
          {listsIt.map((line) => (
            <li
              key={line}
              className="flex items-center gap-3.5 text-lg font-semibold"
            >
              <CheckDot />
              {line}
            </li>
          ))}
        </ul>
      </div>
      <ResearchDemo />
    </div>
  );
}

/* ---------- Haggling and the link page ---------- */

function FeatureCard({
  title,
  body,
  className,
  children,
}: {
  title: string;
  body: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-10 rounded-[32px] p-6 md:rounded-[40px] md:p-14",
        className,
      )}
    >
      <div className="flex flex-col gap-5">
        <h3 className="font-display text-3xl font-extrabold tracking-tight md:text-[40px] md:leading-[42px]">
          {title}
        </h3>
        <p className="text-lg">{body}</p>
      </div>
      {children}
    </div>
  );
}

/** The agent's offer card from A3, as a still. */
function OfferDemo() {
  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent">
          <SparkleMark size={16} />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-accent-text">
          Your agent, 10 min ago
        </span>
        <Pill tone="secondary">$5 hold paid</Pill>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-lg leading-6 font-bold">
          Jess offered $20 for the linen dress
        </p>
        <p className="text-base text-text-muted">
          That's right at your lowest price, and she put money down. I'd take
          it.
        </p>
      </div>
      <div aria-hidden className="flex items-center gap-2">
        <span className="flex h-11 items-center rounded-full bg-secondary px-5 text-sm font-bold text-on-secondary">
          Accept $20
        </span>
        <span className="flex h-11 items-center px-4 text-sm font-bold text-secondary">
          See the offer
        </span>
      </div>
    </div>
  );
}

const linkRows = [
  { label: "Shop the whole closet", icon: <BagIcon />, tone: "bg-surface" },
  {
    label: "See how I style it",
    icon: <CameraIcon />,
    tone: "bg-secondary-soft text-secondary",
  },
  {
    label: "Shipping and returns",
    icon: <TruckIcon />,
    tone: "bg-accent-soft text-accent-text",
  },
];

/** Maya's link page, as a still. */
function LinkPageDemo() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {linkRows.map((row, i) => (
        <Reveal key={row.label} delay={0.2 + i * 0.1} y={18}>
          <div
            className={cn(
              "flex h-[68px] items-center gap-3.5 rounded-full pr-5 pl-3.5",
              i === 0
                ? "bg-primary text-on-primary"
                : "border-[1.5px] border-border bg-surface",
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                row.tone,
              )}
            >
              {row.icon}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 text-base",
                i === 0 ? "font-bold" : "font-semibold",
              )}
            >
              {row.label}
            </span>
            <ArrowUpRightIcon
              className={i === 0 ? undefined : "text-text-muted"}
            />
          </div>
        </Reveal>
      ))}
    </div>
  );
}

const promises = [
  {
    title: "Never below your floor",
    body: "It can't accept less than the lowest price you set.",
  },
  {
    title: "Awake when you aren't",
    body: "Buyers get an answer in seconds, at any hour.",
  },
  {
    title: "Serious buyers first",
    body: "Offers can come with a deposit, refunded if you pass.",
  },
  {
    title: "You have the last word",
    body: "Nothing sells until you tap yes, unless you tell it otherwise.",
  },
];

export function SellerAgent() {
  return (
    <section id="seller-agent" className="scroll-mt-6">
      <Container className="flex flex-col gap-6 pt-24 md:pt-32">
        <Reveal>
          <SectionIntro
            className="pb-8"
            title="More money for your stuff, less of your evening"
            aside="Pricing, writing, answering, haggling. Your agent handles the parts that made you give up on selling last time."
          />
        </Reveal>
        <Reveal y={48}>
          <ResearchFeature />
        </Reveal>
        <div className="flex flex-col gap-6 lg:flex-row">
          <Reveal y={48} className="flex min-w-0 flex-1">
            <FeatureCard
              title="It does the haggling"
              body="Tell it your lowest price once. It answers questions at 2am, takes a deposit from buyers who mean it, and only taps you for the final yes."
              className="bg-secondary-soft"
            >
              <Pop rotate={-5} delay={0.3}>
                <OfferDemo />
              </Pop>
            </FeatureCard>
          </Reveal>
          <Reveal y={48} delay={0.12} className="flex min-w-0 flex-1">
            <FeatureCard
              title="One link sells to everyone"
              body="Your shop gets its own page for your bio. People can browse it, and so can their ChatGPT or Claude. Your agent can post it to the other places you sell."
              className="bg-primary-soft"
            >
              <LinkPageDemo />
            </FeatureCard>
          </Reveal>
        </div>
        <div className="grid gap-8 px-2 pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {promises.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <Point title={p.title}>{p.body}</Point>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
