import type { Metadata } from "next";
import { AgentLive } from "../../../../components/market/agent/live";
import { buyerAgentData } from "../../../../lib/server/api/screens";
import { getCurrentUser } from "../../../../lib/server/session";

export const metadata: Metadata = { title: "For your agent · resell.store" };

/**
 * P7 For your agent: connect an assistant that shops resell.store for you,
 * through the buyer MCP server (app/api/mcp). Signed out, it offers the
 * browse-only link; signed in, the person's own link and its limits.
 */
export default async function AgentPage() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto max-w-[1440px] px-4 desk:px-16">
      <AgentLive data={await buyerAgentData(user?.id ?? null)} />
    </main>
  );
}
