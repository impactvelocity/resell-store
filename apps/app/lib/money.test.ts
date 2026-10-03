import { describe, expect, it } from "vitest";
import { formatCents, toCents, toDollars } from "./money";

/* Dollars on screen, cents in the database: the two conversions. */

describe("toCents", () => {
  it("turns dollars into whole cents", () => {
    expect(toCents(12)).toBe(1200);
    expect(toCents(0)).toBe(0);
    expect(toCents(19.99)).toBe(1999);
  });

  it("rounds away floating-point noise", () => {
    // 0.1 + 0.2 is 0.30000000000000004, and 1.005 * 100 is 100.49999…
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(4.35)).toBe(435);
    expect(toCents(1.006)).toBe(101);
  });
});

describe("toDollars", () => {
  it("turns cents into dollars", () => {
    expect(toDollars(1200)).toBe(12);
    expect(toDollars(1999)).toBe(19.99);
    expect(toDollars(0)).toBe(0);
  });

  it("rounds stray fractions of a cent", () => {
    expect(toDollars(1999.6)).toBe(20);
  });

  it("gives undefined for a missing amount", () => {
    expect(toDollars(null)).toBeUndefined();
    expect(toDollars(undefined)).toBeUndefined();
  });
});

describe("formatCents", () => {
  it("drops .00 on whole dollars and keeps cents otherwise", () => {
    expect(formatCents(3200)).toBe("$32");
    expect(formatCents(3250)).toBe("$32.50");
    expect(formatCents(5)).toBe("$0.05");
    expect(formatCents(125_000)).toBe("$1,250");
  });

  it("is empty for a missing price", () => {
    expect(formatCents(null)).toBe("");
    expect(formatCents(undefined)).toBe("");
    expect(formatCents(Number.NaN)).toBe("");
  });
});
