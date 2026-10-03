import type { Metadata } from "next";
import { ConnectionsScreen } from "../../../../../components/tools/connections";

export const metadata: Metadata = { title: "Connections · resell.store" };

export default function Page() {
  return <ConnectionsScreen />;
}
