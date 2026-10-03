"use server";

import { z } from "zod";
import {
  parseCategory,
  priceBuckets,
  searchListings,
  sortOrders,
} from "../../lib/server/market";

const moreInput = z.object({
  q: z.string().max(200).optional(),
  category: z.string().max(40).nullish(),
  price: z.enum(priceBuckets).optional(),
  offers: z.boolean().optional(),
  sort: z.enum(sortOrders).optional(),
  offset: z.number().int().min(0).max(5000),
  limit: z.number().int().min(1).max(60).optional(),
});

/** P1 "Show more things": the next page of the same search. Public, no sign-in. */
export async function loadMoreListings(input: z.input<typeof moreInput>) {
  const parsed = moreInput.parse(input);
  const result = await searchListings({ ...parsed, category: parseCategory(parsed.category) });
  return { listings: result.listings, total: result.total };
}
