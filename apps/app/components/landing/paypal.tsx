import { DressIllustration } from "@repo/ui/whimsy";
import { Pop, Reveal } from "./motion";
import { CheckDot, Container, Headline } from "./parts";

const perks = [
  {
    title: "AI checkout",
    body: "A buyer, or the assistant shopping for them, can pay in a couple of taps without leaving the chat.",
  },
  {
    title: "Held until it arrives",
    body: "PayPal keeps the payment safe until the buyer has it in hand. Fewer disputes, no awkward messages.",
  },
  {
    title: "Pay Later for them",
    body: "Buyers can split a bigger buy into four. You still get the whole amount, so more people say yes.",
  },
  {
    title: "Deposits on offers",
    body: "Serious buyers put money down. It goes back if you pass and comes off the price if you accept.",
  },
];

const timeline = [
  { label: "Jess paid with PayPal", day: "Mon" },
  { label: "Held safely while it shipped", day: "Tue" },
  { label: "Arrived, and Jess loves it", day: "Thu" },
];

function PayoutCard() {
  return (
    <div className="relative flex w-full max-w-[480px] shrink-0 flex-col gap-6 rounded-[32px] bg-surface p-6 text-text sm:p-9">
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-md bg-accent-soft">
          <DressIllustration size={40} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-lg font-bold">Linen wrap dress</span>
          <span className="text-sm text-text-muted">
            Sold to Jess from Maya's closet
          </span>
        </div>
        <span className="font-display text-2xl font-extrabold tracking-tight">
          $24
        </span>
      </div>
      <ol className="flex flex-col gap-4 border-t border-border pt-6">
        {timeline.map((step) => (
          <li key={step.label} className="flex items-center gap-3.5">
            <CheckDot />
            <span className="min-w-0 flex-1 text-base font-semibold">
              {step.label}
            </span>
            <span className="text-sm text-text-muted">{step.day}</span>
          </li>
        ))}
      </ol>
      <Pop rotate={3} delay={0.45}>
        <div className="flex items-center justify-between gap-4 rounded-lg bg-primary px-[22px] py-[18px] text-on-primary">
          <div className="flex flex-col">
            <span className="text-base font-bold">Paid out to your PayPal</span>
            <span className="text-sm">Thursday, 4:12 pm</span>
          </div>
          <span className="font-display text-3xl font-extrabold tracking-tight">
            +$24
          </span>
        </div>
      </Pop>
      <Pop className="absolute -top-[18px] right-8" rotate={-40} delay={0.6}>
        <span
          className="block rounded-full bg-accent px-4 py-[5px] font-display text-base font-extrabold text-leaf-900"
          style={{ rotate: "4deg" }}
        >
          Ka-ching
        </span>
      </Pop>
    </div>
  );
}

export function PayPal() {
  return (
    <section className="pt-24 md:pt-32">
      <div className="bg-leaf-900 text-white">
        <Container className="flex flex-col items-center gap-16 py-20 xl:flex-row xl:gap-20 xl:py-28">
          <div className="flex min-w-0 flex-1 flex-col gap-12">
            <Reveal className="flex flex-col gap-5">
              <Headline className="text-white">
                You get paid and nobody gets burned
              </Headline>
              <p className="max-w-[560px] text-lg text-white/80 md:text-xl md:leading-[30px]">
                Buyers trust the checkout because it's PayPal. You get the money
                without chasing anyone or meeting a stranger in a parking lot.
              </p>
            </Reveal>
            <div className="grid gap-8 sm:grid-cols-2 sm:gap-x-10">
              {perks.map((perk, i) => (
                <Reveal
                  key={perk.title}
                  delay={i * 0.08}
                  className="flex flex-col gap-2"
                >
                  <h3 className="font-display text-xl font-extrabold tracking-tight text-lemon-400">
                    {perk.title}
                  </h3>
                  <p className="text-base">{perk.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal y={48} delay={0.1} className="w-full max-w-[480px] shrink-0">
            <PayoutCard />
          </Reveal>
        </Container>
      </div>
    </section>
  );
}
