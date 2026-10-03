import { describe, expect, it } from "vitest";
import { DAY, daysAgo } from "../../test/factories";
import {
  arrivalCheckAt,
  autoCancelAt,
  buyerCanCancel,
  disputeEscalatesAt,
  platformFeeCents,
  releaseAt,
  shipBy,
} from "./payout-policy";

const t0 = new Date("2026-10-01T12:00:00Z");
const plus = (days: number) => new Date(t0.getTime() + days * DAY);

describe("platformFeeCents", () => {
  it("takes 10% of the item price, rounded to the cent", () => {
    expect(platformFeeCents(10_000)).toBe(1_000);
    expect(platformFeeCents(1_995)).toBe(200);
    expect(platformFeeCents(0)).toBe(0);
  });
});

describe("shipping deadlines", () => {
  it("ships within 3 days and auto-cancels after 7", () => {
    expect(shipBy({ createdAt: t0 })).toEqual(plus(3));
    expect(autoCancelAt({ createdAt: t0 })).toEqual(plus(7));
  });

  it("lets the buyer cancel only a paid order past its ship-by date", () => {
    expect(buyerCanCancel({ status: "paid", createdAt: t0 }, plus(2.9))).toBe(false);
    expect(buyerCanCancel({ status: "paid", createdAt: t0 }, plus(3))).toBe(true);
    expect(buyerCanCancel({ status: "shipped", createdAt: t0 }, plus(5))).toBe(false);
  });
});

describe("releaseAt", () => {
  it("is null until it ships", () => {
    expect(releaseAt({ createdAt: t0, shippedAt: null, deliveredAt: null })).toBeNull();
  });

  it("is 3 days after delivery", () => {
    expect(releaseAt({ createdAt: t0, shippedAt: plus(1), deliveredAt: plus(4) })).toEqual(plus(7));
  });

  it("assumes delivery 10 days after shipping when there's no delivery date", () => {
    expect(releaseAt({ createdAt: t0, shippedAt: plus(1), deliveredAt: null })).toEqual(plus(14));
  });

  it("never waits past a day before PayPal's 28-day release", () => {
    expect(releaseAt({ createdAt: t0, shippedAt: plus(20), deliveredAt: null })).toEqual(plus(27));
  });
});

describe("arrival check and escalation", () => {
  it("asks a week after shipping", () => {
    expect(arrivalCheckAt({ shippedAt: null })).toBeNull();
    expect(arrivalCheckAt({ shippedAt: t0 })).toEqual(plus(7));
  });

  it("steps in on a problem after 3 days", () => {
    expect(disputeEscalatesAt({ createdAt: daysAgo(0, t0) })).toEqual(plus(3));
  });
});
