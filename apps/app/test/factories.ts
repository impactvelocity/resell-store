import { db, listing, orders, offer, shop, user, type ShipTo } from "@repo/db";

/*
 * Rows for tests, with sensible defaults. Every factory takes overrides.
 * People get @test.dev addresses so notify code really "sends" (into the
 * sendEmail spy); use @example.com to check the logged-not-sent path.
 */

let n = 0;
const next = () => ++n;

export async function createUser(overrides: Partial<typeof user.$inferInsert> = {}) {
  const i = next();
  const [row] = await db
    .insert(user)
    .values({ id: `user_${i}_${crypto.randomUUID().slice(0, 6)}`, name: `Person ${i}`, email: `person${i}@test.dev`, ...overrides })
    .returning();
  return row!;
}

export async function createShop(ownerId: string, overrides: Partial<typeof shop.$inferInsert> = {}) {
  const i = next();
  const [row] = await db
    .insert(shop)
    .values({ ownerId, slug: `shop-${i}`, name: `Shop ${i}`, ...overrides })
    .returning();
  return row!;
}

/** A live listing at $100 with $9 shipping, open to offers. */
export async function createListing(shopId: string, overrides: Partial<typeof listing.$inferInsert> = {}) {
  const i = next();
  const [row] = await db
    .insert(listing)
    .values({
      shopId,
      slug: `thing-${i}`,
      status: "live",
      name: `Thing ${i}`,
      title: `Thing number ${i}`,
      priceCents: 10_000,
      shippingCents: 900,
      publishedAt: new Date(),
      ...overrides,
    })
    .returning();
  return row!;
}

/** A seller with a shop and a live listing, and a buyer. */
export async function createSale(opts: { listing?: Partial<typeof listing.$inferInsert> } = {}) {
  const seller = await createUser({ name: "Maya Seller" });
  const buyer = await createUser({ name: "Jess Buyer" });
  const s = await createShop(seller.id);
  const l = await createListing(s.id, opts.listing);
  return { seller, buyer, shop: s, listing: l };
}

export const shipTo: ShipTo = { name: "Jess Buyer", address: "12 Elm St, Portland, OR 97201", country: "United States" };

/**
 * An order row written directly (no checkout), in any state. Marks the
 * listing sold. `paypal: true` makes it look like a real PayPal capture.
 */
export async function createOrder(
  sale: { buyer: { id: string }; shop: { id: string }; listing: { id: string } },
  overrides: Partial<typeof orders.$inferInsert> & { paypal?: boolean } = {},
) {
  const { paypal, ...rest } = overrides;
  const [row] = await db
    .insert(orders)
    .values({
      listingId: sale.listing.id,
      shopId: sale.shop.id,
      buyerId: sale.buyer.id,
      itemCents: 10_000,
      shippingCents: 900,
      totalCents: 10_900,
      delivery: "tracked",
      payMethod: "paypal",
      shipTo,
      ...(paypal && {
        paymentProvider: "paypal",
        paymentRef: `CAP-${crypto.randomUUID().slice(0, 8)}`,
        payeeMerchantId: "MERCHANT1",
        platformFeeCents: 1000,
        paypalFeeCents: 429,
        sellerNetCents: 9471,
      }),
      ...rest,
    })
    .returning();
  const { eq } = await import("@repo/db");
  await db.update(listing).set({ status: "sold", soldAt: new Date() }).where(eq(listing.id, sale.listing.id));
  return row!;
}

export async function createOffer(
  sale: { buyer: { id: string }; shop: { id: string }; listing: { id: string } },
  overrides: Partial<typeof offer.$inferInsert> = {},
) {
  const [row] = await db
    .insert(offer)
    .values({
      listingId: sale.listing.id,
      shopId: sale.shop.id,
      buyerId: sale.buyer.id,
      amountCents: 8_000,
      expiresAt: new Date(Date.now() + 48 * 3600_000),
      ...overrides,
    })
    .returning();
  return row!;
}

export const DAY = 24 * 60 * 60 * 1000;
export const daysAgo = (d: number, from = new Date()) => new Date(from.getTime() - d * DAY);
