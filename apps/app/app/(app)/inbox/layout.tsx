import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inbox · resell.store" };

/*
 * A5 Inbox, live: conversations with buyers, offers to answer and sales to
 * ship. The designed inbox (components/inbox) is still served from app/mock.
 */
export default function InboxLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
