import { beforeEach, describe, expect, it } from "vitest";
import { db, eq, user } from "@repo/db";
import { resetDb } from "../../test/db";
import { createUser } from "../../test/factories";
import { accountVisit, isNewSince, VISIT_GAP_MS, visitWindow } from "./account-visit";

/*
 * "New since your last visit": a visit ends after 30 quiet minutes, and the
 * start of "new" holds for the whole visit.
 */

const t = (min: number) => new Date(Date.UTC(2026, 9, 3, 12, 0) + min * 60_000);

describe("visitWindow", () => {
  it("has nothing new on someone's first visit", () => {
    expect(visitWindow({ accountSeenAt: null, accountVisitFrom: null }, t(0))).toEqual({
      since: null,
      next: { accountSeenAt: t(0), accountVisitFrom: null },
    });
  });

  it("starts a new visit after a 30-minute gap, measured from the last view", () => {
    const w = visitWindow({ accountSeenAt: t(0), accountVisitFrom: null }, t(31));
    expect(w.since).toEqual(t(0));
    expect(w.next).toEqual({ accountSeenAt: t(31), accountVisitFrom: t(0) });
  });

  it("keeps the same start for views within a visit", () => {
    const w = visitWindow({ accountSeenAt: t(31), accountVisitFrom: t(0) }, t(40));
    expect(w.since).toEqual(t(0));
    expect(w.next.accountVisitFrom).toEqual(t(0));
    expect(VISIT_GAP_MS).toBe(30 * 60_000);
  });
});

describe("accountVisit", () => {
  beforeEach(resetDb);

  it("records views and returns where new starts", async () => {
    const person = await createUser();
    expect(await accountVisit(person.id, t(0))).toBeNull();
    expect(await accountVisit(person.id, t(5))).toBeNull();
    expect(await accountVisit(person.id, t(60))).toEqual(t(5));
    expect(await accountVisit(person.id, t(70))).toEqual(t(5));
    const [row] = await db.select().from(user).where(eq(user.id, person.id));
    expect(row!.accountSeenAt).toEqual(t(70));
  });
});

describe("isNewSince", () => {
  it("is new only after the start, and never without one", () => {
    expect(isNewSince(t(0), t(1))).toBe(true);
    expect(isNewSince(t(1), t(0))).toBe(false);
    expect(isNewSince(null, t(1))).toBe(false);
  });
});
