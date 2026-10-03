import "server-only";
import { db, eq, user } from "@repo/db";

/*
 * "New since your last visit" on the buyer account (P8). A visit is a run of
 * views with no gap over 30 minutes; everything that changed after the
 * previous visit's last view is new for the whole of this one, so a badge
 * doesn't vanish the moment you click a button and the page refreshes.
 */

export const VISIT_GAP_MS = 30 * 60 * 1000;

type Marks = { accountSeenAt: Date | null; accountVisitFrom: Date | null };

/** Where "new" starts for this view, and the marks to save. Null on someone's first visit. */
export function visitWindow(marks: Marks, now = new Date()) {
  const seen = marks.accountSeenAt;
  if (!seen) return { since: null, next: { accountSeenAt: now, accountVisitFrom: null } };
  // Back after a while: a new visit, measured from the last one
  if (now.getTime() - seen.getTime() > VISIT_GAP_MS) return { since: seen, next: { accountSeenAt: now, accountVisitFrom: seen } };
  return { since: marks.accountVisitFrom, next: { accountSeenAt: now, accountVisitFrom: marks.accountVisitFrom } };
}

/** Records this view and returns where "new" starts (null: nothing's new). */
export async function accountVisit(userId: string, now = new Date()) {
  const [marks] = await db
    .select({ accountSeenAt: user.accountSeenAt, accountVisitFrom: user.accountVisitFrom })
    .from(user)
    .where(eq(user.id, userId));
  if (!marks) return null;
  const { since, next } = visitWindow(marks, now);
  await db.update(user).set(next).where(eq(user.id, userId));
  return since;
}

/** Changed since the start of "new"? */
export function isNewSince(since: Date | null, changedAt: Date) {
  return !!since && changedAt > since;
}
