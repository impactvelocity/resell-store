import type { Metadata } from "next";
import { SidekickScreen } from "../../../../components/tools/sidekick";

export const metadata: Metadata = { title: "Shopping sidekick · resell.store" };

export default function Page() {
  return <SidekickScreen />;
}
