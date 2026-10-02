import { InboxView } from "../../../components/inbox/inbox-view";

/*
 * A5 Inbox. The view lives in the layout so /inbox and /inbox/<id> share one
 * list (filter, read dots, sent messages). The pages only pick the thread.
 */
export default function InboxLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <InboxView />
      {children}
    </>
  );
}
