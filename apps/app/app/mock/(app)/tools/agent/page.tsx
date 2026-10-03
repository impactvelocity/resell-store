import type { Metadata } from "next";
import { AgentScreen } from "../../../../../components/tools/agent";

export const metadata: Metadata = { title: "Your agent · resell.store" };

export default function Page() {
  return <AgentScreen />;
}
