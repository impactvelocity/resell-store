import { afterEach, describe, expect, it, vi } from "vitest";
import { channel3Configured, newOffers, searchProducts, usedOffers, type C3Product } from "./channel3";

/*
 * Channel3 catalog search. Splitting offers into new and second hand is
 * pure; searchProducts is checked against a stubbed fetch and never runs
 * without a key.
 */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const offer = (domain: string, price: number, condition?: "new" | "used" | "refurbished" | null) => ({
  url: `https://${domain}/item`,
  domain,
  price: { price, compare_at_price: null, currency: "USD" },
  availability: "InStock",
  condition,
});

const products: C3Product[] = [
  {
    id: "p1",
    title: "Le Creuset round dutch oven",
    offers: [offer("lecreuset.com", 420, "new"), offer("therealreal.com", 180, "used"), offer("ebay.com", 0, "used")],
  },
  {
    id: "p2",
    title: "Le Creuset oval",
    offers: [offer("macys.com", 390), offer("backmarket.com", 200, "refurbished"), offer("thredup.com", 150, "used")],
  },
  { id: "p3", title: "No offers at all" },
];

describe("usedOffers and newOffers", () => {
  it("keeps priced second-hand offers, with the product they're for", () => {
    const used = usedOffers(products);
    expect(used.map((u) => [u.product.id, u.offer.domain])).toEqual([
      ["p1", "therealreal.com"],
      ["p2", "thredup.com"],
    ]);
  });

  it("counts offers with no condition as new, and leaves refurbished out of both", () => {
    expect(newOffers(products).map((n) => n.offer.domain)).toEqual(["lecreuset.com", "macys.com"]);
  });

  it("handles no products", () => {
    expect(usedOffers([])).toEqual([]);
    expect(newOffers([])).toEqual([]);
  });
});

describe("searchProducts", () => {
  it("never calls out without a key", async () => {
    expect(channel3Configured).toBe(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchProducts({ query: "dutch oven" })).rejects.toThrow("CHANNEL3_API_KEY is not set.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the query, photo and limit, and returns the products", async () => {
    vi.stubEnv("CHANNEL3_API_KEY", "c3_test");
    const fetchMock = vi.fn(async () => Response.json({ products: products.slice(0, 1) }));
    vi.stubGlobal("fetch", fetchMock);

    const found = await searchProducts({ query: "dutch oven", base64Image: "aGVsbG8=", limit: 3 });
    expect(found.map((p) => p.id)).toEqual(["p1"]);
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://api.trychannel3.com/v1/search");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("c3_test");
    expect(JSON.parse(init.body as string)).toEqual({ limit: 3, query: "dutch oven", base64_image: "aGVsbG8=" });
  });

  it("leaves out what wasn't given and copes with no products in the reply", async () => {
    vi.stubEnv("CHANNEL3_API_KEY", "c3_test");
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchProducts({ query: "boots" })).toEqual([]);
    expect(JSON.parse((fetchMock.mock.calls[0]! as unknown as [string, RequestInit])[1].body as string)).toEqual({ limit: 8, query: "boots" });
  });

  it("throws with the status when Channel3 fails", async () => {
    vi.stubEnv("CHANNEL3_API_KEY", "c3_test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad key", { status: 401 })));
    await expect(searchProducts({ query: "x" })).rejects.toThrow("Channel3 /search failed: 401 bad key");
  });
});
