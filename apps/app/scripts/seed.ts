import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  activity,
  db,
  eq,
  favourite,
  follow,
  inArray,
  listing,
  listingPhoto,
  message,
  or,
  orders,
  review,
  shop,
  sql,
  thread,
  user,
  type ActivitySource,
} from "@repo/db";
import { embed, embeddingsConfigured, listingPassage } from "../lib/server/embeddings";
import { deleteFiles, fileIdsOwnedBy, saveUpload } from "../lib/server/files";
import { platformFeeCents } from "../lib/server/payout-policy";
import { itemPrompt, storePicturePrompt } from "../seed/image-style";
import { buyers, stores, type SeedPerson } from "../seed/stores";

/*
 * Fills the database with the made-up marketplace in seed/stores.ts: ten
 * stores and their owners, four buyers, listings, a few sales with reviews,
 * questions in messages, follows, likes and a month of views for Stats.
 *
 *   pnpm --filter app seed              replace the seed data (or create it)
 *   pnpm --filter app seed --reset      only remove it
 *   pnpm --filter app seed --prompts    write seed/images/prompts.json for an image model; no database
 *   pnpm --filter app seed --remote     allow a DATABASE_URL that isn't on this machine
 *
 * Everything belongs to users whose id starts with "seed_", so a rerun only
 * replaces what the seed made. Sign in as anyone with their @example.com
 * address: in dev the sign-in link shows on the page.
 *
 * Pictures come from seed/images/{store}/{item}.png (or .jpg/.webp), and
 * seed/images/{store}/_store.png for the store's picture: rendered from the
 * drawings in seed/art by `pnpm --filter app seed:art`. Missing ones are
 * skipped. Uploads go to R2 when it's configured, else into Postgres.
 */

const here = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(here, "../seed/images");
const args = new Set(process.argv.slice(2));

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * DAY);
const seedId = (handle: string) => `seed_${handle}`;
const isSeedUser = sql`left(${user.id}, 5) = 'seed_'`;

/** Same numbers on every run, so the Stats charts don't jump around. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = random(20261003);
const between = (min: number, max: number) => min + rng() * (max - min);
const pick = <T>(list: readonly T[]) => list[Math.floor(rng() * list.length)]!;
const sample = <T>(list: readonly T[], n: number) =>
  [...list].sort(() => rng() - 0.5).slice(0, Math.min(n, list.length));

const cents = (dollars: number) => Math.round(dollars * 100);
const fieldKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Pictures ----------------------------------------------------------------- */

const imageTypes: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

function findImage(storeSlug: string, name: string) {
  for (const [ext, type] of Object.entries(imageTypes)) {
    const path = join(imagesDir, storeSlug, `${name}.${ext}`);
    if (existsSync(path)) return { path, type, fileName: `${name}.${ext}` };
  }
  return null;
}

async function uploadImage(storeSlug: string, name: string, ownerId: string) {
  const found = findImage(storeSlug, name);
  if (!found) return null;
  const bytes = readFileSync(found.path);
  const saved = await saveUpload(new File([bytes], found.fileName, { type: found.type }), ownerId);
  return saved.id;
}

function writePrompts() {
  const prompts = stores.flatMap((s) => [
    { file: `${s.slug}/_store.png`, prompt: storePicturePrompt(s.picture, s.tone) },
    ...s.items.map((i) => ({ file: `${s.slug}/${i.slug}.png`, prompt: itemPrompt(i.image, s.tone) })),
  ]);
  mkdirSync(imagesDir, { recursive: true });
  const out = join(imagesDir, "prompts.json");
  writeFileSync(out, JSON.stringify(prompts, null, 2) + "\n");
  const missing = prompts.filter((p) => {
    const [store, file] = p.file.split("/");
    return !findImage(store!, file!.replace(/\.png$/, ""));
  });
  console.log(`Wrote ${prompts.length} prompts to ${out}`);
  console.log(`${prompts.length - missing.length} pictures already in seed/images, ${missing.length} to make.`);
}

/* Safety ------------------------------------------------------------------- */

function checkDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL isn't set. Run this from apps/app with .env.local in place.");
  const host = new URL(url).hostname;
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
  if (!local && !args.has("--remote"))
    throw new Error(`DATABASE_URL points at ${host}. Pass --remote if you really mean to seed that database.`);
}

/* Clearing ----------------------------------------------------------------- */

async function clearSeed() {
  const seedUsers = (await db.select({ id: user.id }).from(user).where(isSeedUser)).map((u) => u.id);
  if (seedUsers.length === 0) return 0;
  const seedShops = (await db.select({ id: shop.id }).from(shop).where(inArray(shop.ownerId, seedUsers))).map(
    (s) => s.id,
  );
  // Orders hold on to their listing, shop and buyer, so they go first
  await db
    .delete(orders)
    .where(
      seedShops.length
        ? or(inArray(orders.shopId, seedShops), inArray(orders.buyerId, seedUsers))
        : inArray(orders.buyerId, seedUsers),
    );
  for (const id of seedUsers) await deleteFiles(await fileIdsOwnedBy(id));
  await db.delete(user).where(inArray(user.id, seedUsers));
  return seedUsers.length;
}

/* Seeding ------------------------------------------------------------------ */

async function checkConflicts() {
  const people = [...buyers, ...stores.map((s) => s.owner)];
  const emails = people.map((p) => p.email);
  const takenEmails = await db
    .select({ email: user.email })
    .from(user)
    .where(inArray(user.email, emails));
  const takenSlugs = await db
    .select({ slug: shop.slug })
    .from(shop)
    .where(inArray(shop.slug, stores.map((s) => s.slug)));
  const problems = [
    ...takenEmails.map((u) => `email ${u.email} is already someone's account`),
    ...takenSlugs.map((s) => `store slug ${s.slug} is already taken`),
  ];
  if (problems.length) throw new Error(`Can't seed:\n  ${problems.join("\n  ")}`);
}

async function createPerson(p: SeedPerson, mode: "selling" | "buying", since: Date) {
  await db.insert(user).values({
    id: seedId(p.handle),
    name: p.name,
    email: p.email,
    emailVerified: true,
    preferredMode: mode,
    onboardedAt: since,
    about: p.about,
    location: p.location,
    createdAt: since,
    updatedAt: since,
  });
}

const viewSources: ActivitySource[] = [
  "marketplace", "marketplace", "marketplace", "search", "search", "store", "store", "direct", "social", "qr",
];

async function seed() {
  await checkConflicts();
  const embedQueue: { id: string; passage: string }[] = [];
  const activityRows: (typeof activity.$inferInsert)[] = [];
  const liveListings: { id: string; publishedAt: Date }[] = [];
  const shopIds: string[] = [];
  let pictures = 0;
  let listingCount = 0;

  for (const b of buyers) await createPerson(b, "buying", daysAgo(between(60, 400)));

  for (const s of stores) {
    const ownerId = seedId(s.owner.handle);
    const opened = daysAgo(s.openedDaysAgo);
    await createPerson(s.owner, "selling", opened);

    const pictureFileId = await uploadImage(s.slug, "_store", ownerId);
    if (pictureFileId) pictures++;
    const [shopRow] = await db
      .insert(shop)
      .values({
        ownerId,
        slug: s.slug,
        name: s.name,
        about: s.about,
        category: s.category,
        tone: s.tone,
        location: s.location,
        pictureFileId,
        lowestPercent: s.lowestPercent ?? 15,
        createdAt: opened,
        updatedAt: opened,
      })
      .returning();
    shopIds.push(shopRow!.id);

    for (let n = 0; n < 40 + rng() * 120; n++) {
      activityRows.push({
        kind: "view",
        shopId: shopRow!.id,
        visitorId: crypto.randomUUID(),
        source: pick(viewSources),
        createdAt: daysAgo(between(0, Math.min(45, s.openedDaysAgo))),
      });
    }

    for (const item of s.items) {
      const status = item.sold ? "sold" : (item.status ?? "live");
      const publishedDaysAgo = item.sold
        ? item.sold.daysAgo + between(3, 20)
        : between(0.2, Math.min(60, s.openedDaysAgo));
      const published = daysAgo(publishedDaysAgo);
      const price = cents(item.price);
      const words = {
        name: item.name,
        title: item.title,
        oneLiner: item.oneLiner,
        description: item.description,
        category: item.category,
        fields: item.fields.map((f) => ({ key: fieldKey(f.label), label: f.label, value: f.value, source: "you" as const })),
      };

      const [row] = await db
        .insert(listing)
        .values({
          shopId: shopRow!.id,
          slug: status === "draft" ? null : item.slug,
          status,
          step: status === "draft" ? "words" : "publish",
          prompt: item.name,
          tone: "Friendly",
          ...words,
          priceCents: price,
          lowestCents: cents(item.lowest ?? item.price * (1 - (s.lowestPercent ?? 15) / 100)),
          shippingCents: cents(item.shipping),
          takeOffers: item.takeOffers ?? true,
          publishedAt: status === "draft" ? null : published,
          soldAt: item.sold ? daysAgo(item.sold.daysAgo) : null,
          createdAt: new Date(published.getTime() - 2 * 3600_000),
          updatedAt: item.sold ? daysAgo(item.sold.daysAgo) : published,
        })
        .returning();
      listingCount++;

      const photoId = await uploadImage(s.slug, item.slug, ownerId);
      if (photoId) {
        pictures++;
        await db.insert(listingPhoto).values({ listingId: row!.id, fileId: photoId, alt: item.name, position: 0 });
      }

      if (status === "draft") continue;
      embedQueue.push({ id: row!.id, passage: listingPassage(words) });
      if (status === "live") liveListings.push({ id: row!.id, publishedAt: published });

      // A month of views and the odd share, never before it was listed
      const shownFor = Math.min(publishedDaysAgo, 45) - (item.sold?.daysAgo ?? 0);
      const views = Math.round(between(4, 18) * Math.max(1, Math.sqrt(shownFor)));
      for (let n = 0; n < views; n++) {
        activityRows.push({
          kind: n < views / 12 ? "share" : "view",
          shopId: shopRow!.id,
          listingId: row!.id,
          visitorId: crypto.randomUUID(),
          source: n < views / 12 ? null : pick(viewSources),
          createdAt: daysAgo((item.sold?.daysAgo ?? 0) + between(0, shownFor)),
        });
      }

      if (item.sold) {
        const buyer = buyers.find((b) => b.handle === item.sold!.buyer)!;
        const paid = daysAgo(item.sold.daysAgo);
        const at = (days: number) => new Date(paid.getTime() + days * DAY);
        const shipping = cents(item.shipping);
        const fee = platformFeeCents(price);
        const [order] = await db
          .insert(orders)
          .values({
            listingId: row!.id,
            shopId: shopRow!.id,
            buyerId: seedId(buyer.handle),
            itemCents: price,
            shippingCents: shipping,
            totalCents: price + shipping,
            delivery: "tracked",
            payMethod: "paypal",
            shipTo: { name: buyer.name, address: `12 Seed St, ${buyer.location}`, country: buyer.location.endsWith("ON") ? "Canada" : "United States" },
            status: "completed",
            paymentProvider: "mock",
            platformFeeCents: fee,
            sellerNetCents: price + shipping - fee,
            trackingNumber: `9400 1000 0000 ${String(Math.floor(rng() * 1e8)).padStart(8, "0")}`,
            shippedAt: at(1),
            deliveredAt: at(3),
            completedAt: at(3.5),
            releasedAt: at(3.5),
            createdAt: paid,
            updatedAt: at(3.5),
          })
          .returning();
        await db.insert(review).values({
          orderId: order!.id,
          listingId: row!.id,
          shopId: shopRow!.id,
          buyerId: seedId(buyer.handle),
          rating: item.sold.rating,
          body: item.sold.review,
          sellerReply: item.sold.reply,
          repliedAt: item.sold.reply ? at(3.8) : null,
          createdAt: at(3.6),
          updatedAt: at(3.6),
        });
      }

      if (item.question) {
        const buyerId = seedId(item.question.buyer);
        const asked = daysAgo(between(0.3, 5));
        const answered = item.question.answer ? new Date(asked.getTime() + between(0.5, 4) * 3600_000) : null;
        const [t] = await db
          .insert(thread)
          .values({
            shopId: shopRow!.id,
            buyerId,
            listingId: row!.id,
            lastMessageAt: answered ?? asked,
            lastSide: answered ? "seller" : "buyer",
            lastPreview: (item.question.answer ?? item.question.ask).slice(0, 140),
            buyerReadAt: asked,
            sellerReadAt: answered,
            createdAt: asked,
          })
          .returning();
        await db.insert(message).values([
          { threadId: t!.id, authorId: buyerId, side: "buyer", body: item.question.ask, createdAt: asked },
          ...(answered
            ? [{ threadId: t!.id, authorId: ownerId, side: "seller" as const, body: item.question.answer!, createdAt: answered }]
            : []),
        ]);
      }
    }
  }

  // Each buyer follows a few stores and likes a handful of things
  for (const b of buyers) {
    for (const shopId of sample(shopIds, 3 + Math.floor(rng() * 4)))
      await db.insert(follow).values({ userId: seedId(b.handle), shopId, createdAt: daysAgo(between(0, 40)) });
    for (const l of sample(liveListings, 4 + Math.floor(rng() * 7)))
      await db.insert(favourite).values({
        userId: seedId(b.handle),
        listingId: l.id,
        createdAt: new Date(l.publishedAt.getTime() + between(0, now - l.publishedAt.getTime())),
      });
  }

  for (let i = 0; i < activityRows.length; i += 500) await db.insert(activity).values(activityRows.slice(i, i + 500));

  let embedded = 0;
  if (embeddingsConfigured && !args.has("--no-embed")) {
    for (let i = 0; i < embedQueue.length; i += 32) {
      const batch = embedQueue.slice(i, i + 32);
      const vectors = await embed(batch.map((b) => b.passage), "retrieval.passage");
      for (const [n, b] of batch.entries())
        await db.update(listing).set({ embedding: vectors[n] }).where(eq(listing.id, b.id));
      embedded += batch.length;
    }
  }

  return { listingCount, pictures, views: activityRows.length, embedded };
}

/* Run ---------------------------------------------------------------------- */

async function main() {
  if (args.has("--prompts")) return writePrompts();
  checkDatabase();

  const removed = await clearSeed();
  if (removed) console.log(`Removed the old seed data (${removed} people and everything they had).`);
  if (args.has("--reset")) return;

  const { listingCount, pictures, views, embedded } = await seed();
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:5689";
  console.log(`Seeded ${stores.length} stores, ${listingCount} listings, ${buyers.length} buyers, ${views} views.`);
  console.log(`Pictures: ${pictures} uploaded${pictures ? "" : " (none in seed/images yet; run with --prompts)"}.`);
  console.log(
    embedded
      ? `Embedded ${embedded} listings for search.`
      : "No embeddings (JINA_EMBEDDING_MODEL_KEY unset or --no-embed); search falls back to text.",
  );
  console.log("\nSign in as (the link shows on the page in dev):");
  for (const s of stores) console.log(`  ${s.owner.email.padEnd(28)} ${s.name} → http://${s.slug}.${root}`);
  for (const b of buyers) console.log(`  ${b.email.padEnd(28)} buyer`);
}

try {
  await main();
} finally {
  await db.$client.end();
}
