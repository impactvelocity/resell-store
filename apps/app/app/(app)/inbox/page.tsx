import { InboxEmpty } from "../../../components/empty/inbox-empty";
import { getSellerSummary } from "../../../components/empty/summary";
import { InboxLive } from "../../../components/inbox-live/inbox-live";
import { requireUser } from "../../../lib/server/session";
import { loadInbox } from "./inbox-data";

/* A5 Inbox: messages, offers and sales, newest needs first, or the empty inbox before any of that. */
export default async function Page() {
  const user = await requireUser();
  const { empty, ...inbox } = await loadInbox(user.id);
  if (empty) return <InboxEmpty seller={await getSellerSummary()} />;
  return <InboxLive {...inbox} />;
}
