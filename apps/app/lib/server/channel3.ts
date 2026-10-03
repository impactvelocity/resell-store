import "server-only";

/*
 * Channel3 (https://trychannel3.com/developers): one catalog of new and resale
 * products across retailers. Research uses it to identify the item, find what
 * it sells for new (MSRP) and used (resale offers), and borrow maker photos.
 */

const BASE = "https://api.trychannel3.com/v1";

export const channel3Configured = Boolean(process.env.CHANNEL3_API_KEY);

export type C3Offer = {
  url: string;
  domain: string;
  price: { price: number; compare_at_price: number | null; currency: string };
  availability: string;
  condition?: "new" | "used" | "refurbished" | null;
};

export type C3Product = {
  id: string;
  title: string;
  description?: string | null;
  brands?: { id: string; name: string }[];
  images?: { url: string; is_main_image?: boolean; shot_type?: string; alt_text?: string | null }[];
  category?: { slug: string; title: string; path?: { title: string }[] } | null;
  materials?: string[] | null;
  key_features?: string[] | null;
  offers?: C3Offer[];
};

async function call<T>(path: string, body: unknown): Promise<T> {
  const key = process.env.CHANNEL3_API_KEY;
  if (!key) throw new Error("CHANNEL3_API_KEY is not set.");
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Channel3 ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** Text and/or photo search. A photo plus a few words matches best. */
export async function searchProducts({
  query,
  base64Image,
  limit = 8,
}: {
  query?: string;
  base64Image?: string;
  limit?: number;
}) {
  const body: Record<string, unknown> = { limit };
  if (query) body.query = query;
  if (base64Image) body.base64_image = base64Image;
  const { products } = await call<{ products: C3Product[] }>("/search", body);
  return products ?? [];
}

/** Offers that are the item second hand (The RealReal, ThredUp, …). */
export function usedOffers(products: C3Product[]) {
  return products.flatMap((p) =>
    (p.offers ?? [])
      .filter((o) => o.condition === "used" && o.price?.price > 0)
      .map((o) => ({ product: p, offer: o })),
  );
}

/** Offers that are the item new, from the maker or a retailer. */
export function newOffers(products: C3Product[]) {
  return products.flatMap((p) =>
    (p.offers ?? [])
      .filter((o) => o.condition !== "used" && o.condition !== "refurbished" && o.price?.price > 0)
      .map((o) => ({ product: p, offer: o })),
  );
}
