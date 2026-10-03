import type { Metadata } from "next";
import { ApiLiveScreen } from "../../../../components/tools-live/api-live";
import { apiScreenData } from "../../../../lib/server/api/screens";
import { requireUser } from "../../../../lib/server/session";

export const metadata: Metadata = { title: "API · resell.store" };

/* D3 API, live: keys, usage, a request to try, and webhooks (lib/server/api). */
export default async function Page() {
  const user = await requireUser();
  return <ApiLiveScreen data={await apiScreenData(user.id)} />;
}
