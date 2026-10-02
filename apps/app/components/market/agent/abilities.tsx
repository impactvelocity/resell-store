import { abilities } from "../../../lib/mock-agent-buyer";

/** "What it does for you": four abilities, each with something you'd say to it. */
export function AgentAbilities() {
  return (
    <section className="flex flex-col gap-7 pb-14 desk:gap-9 desk:pb-[72px]">
      <h2 className="border-t border-public-border pt-10 font-display text-[28px] leading-[34px] font-extrabold tracking-tight text-text desk:pt-14 desk:text-3xl">
        What it does for you
      </h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
        {abilities.map((a) => (
          <div key={a.title} className="flex flex-col gap-2.5">
            <h3 className="font-display text-xl font-extrabold tracking-tight text-text">
              {a.title}
            </h3>
            <p className="text-base text-public-text-muted">{a.body}</p>
            <p className="pt-1.5 text-sm font-medium text-text">
              &quot;{a.example}&quot;
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
