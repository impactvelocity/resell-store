import type { Metadata } from "next";
import { ApiScreen } from "../../../../components/tools/api";

export const metadata: Metadata = { title: "API · resell.store" };

export default function Page() {
  return <ApiScreen />;
}
