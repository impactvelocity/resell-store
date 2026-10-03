import { Pop, Reveal } from "./motion";

const steps = [
  {
    title: "Snap a photo",
    body: "Add one line about what it is. A dress, a dutch oven, the bike in the hallway. That's your whole job.",
  },
  {
    title: "Your agent lists it",
    body: "It checks what the same thing really sold for, sets a fair price, writes the words and posts it to your shop.",
  },
  {
    title: "Say yes, get paid",
    body: "It answers buyers and brings you the good offers. PayPal holds the money and pays you when it arrives.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-[1440px] scroll-mt-6 px-4 md:px-12"
    >
      <Reveal
        y={48}
        className="flex flex-col gap-12 rounded-[32px] bg-primary px-6 pt-14 pb-16 md:gap-14 md:rounded-[40px] md:px-12 md:pt-[72px] md:pb-20"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <h2 className="max-w-[720px] font-display text-4xl font-extrabold tracking-tight md:text-[56px] md:leading-[58px]">
            Three steps, and only the first one is yours
          </h2>
          <p className="max-w-[360px] text-lg font-medium">
            Most people have their first thing listed before the kettle boils.
          </p>
        </div>
        <ol className="grid gap-10 md:grid-cols-3 md:gap-12">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={0.15 + i * 0.12} className="flex flex-col gap-4">
                <Pop delay={0.3 + i * 0.12} rotate={-30} className="w-fit">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-leaf-900 font-display text-2xl font-extrabold text-primary">
                    {i + 1}
                  </span>
                </Pop>
                <h3 className="font-display text-2xl font-extrabold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-lg">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
