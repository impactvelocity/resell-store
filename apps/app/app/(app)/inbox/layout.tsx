import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inbox · resell.store" };

/*
 * A5 Inbox: conversations with buyers, offers to answer and sales to ship.
 */
export default function InboxLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
