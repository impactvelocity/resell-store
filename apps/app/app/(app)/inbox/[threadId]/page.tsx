import { redirect } from "next/navigation";
import { InboxLive } from "../../../../components/inbox-live/inbox-live";
import { Conversation } from "../../../../components/messages/conversation";
import { loadThread } from "../../../../lib/server/messages";
import { requireUser } from "../../../../lib/server/session";
import { storeUrl } from "../../../../lib/urls";
import { loadInbox } from "../inbox-data";

/* A5 with a conversation open: the inbox list beside it (desktop), or just the conversation (phone). */
export default async function Page({ params }: { params: Promise<{ threadId: string }> }) {
  const user = await requireUser();
  const { threadId } = await params;
  const [open, inbox] = await Promise.all([loadThread(threadId, user.id), loadInbox(user.id)]);
  if (!open || open.side !== "seller") redirect("/inbox");
  const { summary } = open;
  const { empty: _empty, ...lists } = inbox;
  return (
    <InboxLive
      {...lists}
      activeThread={summary.id}
      pane={
        <Conversation
          key={summary.id}
          tone="app"
          threadId={summary.id}
          messages={open.messages}
          title={summary.withName}
          subtitle={summary.listing ? `About ${summary.listing.title}` : `Wrote to ${summary.shop.name}`}
          href={summary.listing?.slug ? storeUrl(summary.shop.slug, `/${summary.listing.slug}`) : undefined}
          photo={summary.listing?.photo}
          initial={summary.initial}
          otherName={summary.withName}
          backHref="/inbox"
          placeholder={`Reply to ${summary.withName}`}
          agent={{ on: open.agentOn, name: "Your agent", owner: "you" }}
          needsYou={summary.needsYou}
        />
      }
    />
  );
}
