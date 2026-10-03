import { MessagesView } from "../../../../components/market/buyer/messages-view";

/** P6 Messages and agent chat. `?thread=secondshutter` opens a conversation. */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string | string[] }>;
}) {
  const { thread } = await searchParams;
  return <MessagesView initialThread={typeof thread === "string" ? thread : undefined} />;
}
