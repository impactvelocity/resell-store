import type { Metadata } from "next";
import { AgentLiveScreen } from "../../../../components/tools-live/agent-live";
import { agentScreenData } from "../../../../lib/server/api/screens";
import { requireUser } from "../../../../lib/server/session";

export const metadata: Metadata = { title: "Your agent · resell.store" };

/* D2 Connect your agent, live: the private MCP link and what it may do (app/api/mcp). */
export default async function Page() {
  const user = await requireUser();
  return <AgentLiveScreen data={await agentScreenData(user.id)} />;
}
