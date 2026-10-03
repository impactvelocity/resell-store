import { PhotoCameraIcon } from "@repo/ui/icons";
import { WedgeMark } from "@repo/ui/whimsy";
import { cn } from "@repo/ui/lib/utils";
import { Float, Pop, Reveal } from "./motion";
import { Container, Headline, Tag } from "./parts";

const dresses = [
  {
    title: "Black wrap dress",
    resale: 70,
    costs: 50,
    best: true,
    photo: "bg-surface-muted",
    drawing: (
      <path
        d="M10 2h3l3 4 3-4h3l-1.5 12L28 42H4l7.5-28L10 2Z"
        fill="var(--color-leaf-900)"
      />
    ),
  },
  {
    title: "Red sequin dress",
    resale: 25,
    costs: 95,
    best: false,
    photo: "bg-accent-soft",
    drawing: (
      <path
        d="M9 2h2.5l1 9h7l1-9H23l-1 14 5 26H5l5-26L9 2Z"
        fill="var(--color-berry-500)"
      />
    ),
  },
];

const steps = [
  {
    title: "Show it what you're eyeing",
    body: "A photo of the tag, a link, or just the name.",
  },
  {
    title: "See what it sells on for",
    body: "Based on what the same thing really sold for, used.",
  },
  {
    title: "Sell it later in one tap",
    body: "It's already looked up, so the listing is half written.",
  },
];

const goodFor = ["Occasion dresses", "Ski gear", "Strollers", "Power tools"];

function ComparisonDemo() {
  return (
    <div
      aria-hidden
      className="relative flex w-full max-w-[520px] shrink-0 flex-col items-center gap-5 rounded-[32px] bg-primary px-5 py-10 sm:rounded-[40px] sm:px-12 sm:py-14"
    >
      <div className="flex h-14 w-full items-center gap-2 rounded-full bg-surface pr-1.5 pl-[18px]">
        <span className="min-w-0 flex-1 text-base text-text-muted">
          Paste a link
        </span>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted">
          <PhotoCameraIcon strokeWidth={2.2} />
        </span>
        <span className="flex h-11 shrink-0 items-center rounded-full bg-text px-[18px] text-base font-bold text-white">
          Check it
        </span>
      </div>
      <div className="flex w-full gap-2.5">
        {dresses.map((dress) => (
          <div
            key={dress.title}
            className={cn(
              "flex min-w-0 flex-1 flex-col gap-2.5 rounded-lg border-2 bg-surface p-3",
              dress.best ? "border-secondary" : "border-border",
            )}
          >
            <span
              className={cn(
                "flex h-28 items-center justify-center rounded-md",
                dress.photo,
              )}
            >
              <svg width="56" height="77" viewBox="0 0 32 44">
                {dress.drawing}
              </svg>
            </span>
            <span className="flex flex-col">
              <span className="text-base leading-[22px] font-bold">
                {dress.title}
              </span>
              <span className="text-sm text-text-muted">$120 in the shop</span>
            </span>
            <span className="flex flex-col border-t border-border pt-2">
              <span className="text-sm text-text-muted">
                Sells on for about
              </span>
              <span className="font-display text-2xl font-extrabold tracking-tight">
                ${dress.resale}
              </span>
            </span>
            <span
              className={cn(
                "flex h-7 w-fit items-center rounded-full px-2.5 text-sm font-bold",
                dress.best
                  ? "bg-secondary-soft text-secondary"
                  : "bg-surface-muted",
              )}
            >
              Costs you ${dress.costs}
            </span>
          </div>
        ))}
      </div>
      <p className="text-center text-base font-semibold text-on-primary">
        Same price in the shop. $45 apart in the end.
      </p>
      <Pop className="absolute -top-[22px] right-9" rotate={120} delay={0.5}>
        <Float tilt={-10} duration={5.5}>
          <WedgeMark size={72} />
        </Float>
      </Pop>
    </div>
  );
}

export function Sidekick() {
  return (
    <section id="sidekick" className="scroll-mt-6">
      <Container className="flex flex-col-reverse items-center gap-16 py-24 md:py-32 xl:flex-row xl:gap-[88px]">
        <Reveal
          y={48}
          scale={0.96}
          className="flex w-full max-w-[520px] shrink-0 justify-center"
        >
          <ComparisonDemo />
        </Reveal>
        <div className="flex min-w-0 flex-1 flex-col gap-7">
          <Reveal className="flex flex-col gap-7">
            <Headline>Know what it's worth before you buy it</Headline>
            <p className="text-lg text-text-muted md:text-xl md:leading-[30px]">
              About to buy a dress you'll wear twice? Show your sidekick the tag
              or paste the link. It tells you what that exact thing sells on
              for, so you pick the one that costs you less in the end.
            </p>
          </Reveal>
          <ol className="flex flex-col gap-[18px] pt-1">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Reveal delay={0.1 + i * 0.1} y={16} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-extrabold text-on-primary">
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-lg font-bold">{step.title}</span>
                    <span className="text-base text-text-muted">
                      {step.body}
                    </span>
                  </span>
                </Reveal>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="pr-1 text-sm font-semibold text-text-muted">
              Made for the rarely used
            </span>
            {goodFor.map((item, i) => (
              <Pop key={item} delay={0.3 + i * 0.06} rotate={i % 2 ? 8 : -8}>
                <Tag>{item}</Tag>
              </Pop>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
