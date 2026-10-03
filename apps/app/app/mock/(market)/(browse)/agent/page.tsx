import type { Metadata } from "next";
import { AgentAbilities } from "../../../../../components/market/agent/abilities";
import { PickAssistant } from "../../../../../components/market/agent/assistants";
import { AgentHero } from "../../../../../components/market/agent/hero";
import { HoldThePurse } from "../../../../../components/market/agent/purse";

export const metadata: Metadata = { title: "For your agent · resell.store" };

/** P7 For your agent: connect an assistant that shops resell.store for you. */
export default function AgentPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 desk:px-16">
      <AgentHero />
      <PickAssistant />
      <AgentAbilities />
      <HoldThePurse />
    </main>
  );
}
