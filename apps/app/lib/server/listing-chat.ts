import "server-only";
import type { UIMessage } from "ai";
import { and, asc, db, eq, listingMessage, type ListingStep } from "@repo/db";

/** The saved agent chat for one workspace step, oldest first. */
export async function loadMessages(listingId: string, step: ListingStep): Promise<UIMessage[]> {
  const rows = await db
    .select()
    .from(listingMessage)
    .where(and(eq(listingMessage.listingId, listingId), eq(listingMessage.step, step)))
    .orderBy(asc(listingMessage.createdAt));
  const prefix = `${listingId}:${step}:`;
  return rows.map((r) => ({
    id: r.id.startsWith(prefix) ? r.id.slice(prefix.length) : r.id,
    role: r.role,
    parts: r.parts as UIMessage["parts"],
  }));
}
