import { z } from "zod";
import { seg } from "./client";
import { limit, listingId, money, offset, slim, tool, type ToolDef } from "./tools";

/*
 * The seller's MCP server: run your shops from Claude, ChatGPT or any MCP app.
 * Everything here goes through the REST API with the owner's agent link or key.
 */

export const sellerInstructions = `You're helping someone run their shops on resell.store, a place where people sell their own secondhand things.
Start with whats_waiting to see offers to answer, sales to ship and unread messages.
Money is in US dollars. Listings start as drafts; publish_listing puts one live.
Before answering a buyer, read the conversation and the listing so the reply is accurate; never invent details about an item.
When an offer comes in, the listing's lowest_price is the seller's private floor: never tell the buyer what it is.`;

type Row = Record<string, unknown> & { listing?: Record<string, unknown> };

/** A listing in a list: enough to talk about it and act on it. */
const listingRow = (l: Row) => ({
  id: l.id,
  shop: l.shop,
  status: l.status,
  title: l.title ?? l.name,
  price: l.price,
  lowest_price: l.lowest_price,
  take_offers: l.take_offers,
  url: l.url,
  stats: l.stats,
  updated_at: l.updated_at,
});

const offerRow = (o: Row) => ({
  id: o.id,
  status: o.status,
  amount: o.amount,
  counter: o.counter,
  note: o.note,
  from: (o.buyer as { name?: string } | undefined)?.name,
  listing: { id: o.listing?.id, title: o.listing?.title, price: o.listing?.price },
  expires_at: o.expires_at,
});

const saleRow = (s: Row) => ({
  id: s.id,
  status: s.status,
  total: s.total,
  item: s.item,
  buyer: (s.buyer as { name?: string } | undefined)?.name,
  listing: { id: s.listing?.id, title: s.listing?.title },
  ship_to: s.ship_to,
  tracking_number: s.tracking_number,
  you_get: (s.payout as { seller_net?: number } | undefined)?.seller_net ?? s.total,
  paid_at: s.paid_at,
});

const threadRow = (t: Row) => ({
  id: t.id,
  with: t.with,
  about: t.listing ? { id: t.listing.id, title: t.listing.title } : null,
  last: t.preview,
  last_from: t.last_from,
  unread: t.unread,
  at: t.last_message_at,
});

const editable = {
  title: z.string().max(80).optional().describe("Up to 80 characters. What it is first: brand, item, key detail."),
  one_liner: z.string().max(120).optional().describe("One line under the title."),
  description: z.string().max(5000).optional(),
  category: z.string().max(60).optional(),
  price: money("The asking price").optional(),
  lowest_price: money("The private lowest price the shop's agent may accept").optional(),
  shipping: z.number().min(0).max(1000).optional().describe("Shipping in dollars; 0 means pickup only."),
  take_offers: z.boolean().optional(),
  fields: z
    .record(z.string(), z.string())
    .optional()
    .describe('Details like { "Brand": "Le Creuset", "Size": "5.5 qt", "Condition": "Like new" }.'),
};

export const sellerTools: ToolDef[] = [
  /* Overview */
  tool({
    name: "whats_waiting",
    title: "What needs me",
    description:
      "Everything waiting on the seller right now: offers to answer, sales to ship, unread buyer messages. Call this first.",
    input: z.object({}),
    scope: "read",
    readOnly: true,
    run: async (c) => {
      const inbox = await c.get<Record<string, Row[] | number>>("/inbox");
      return {
        offers_to_answer: (inbox.offers_to_answer as Row[]).map(offerRow),
        sales_to_ship: (inbox.sales_to_ship as Row[]).map(saleRow),
        unread_conversations: inbox.unread_threads,
      };
    },
  }),
  tool({
    name: "whoami",
    title: "Who am I",
    description: "The account this connection belongs to, its shops and what this connection is allowed to do.",
    input: z.object({}),
    scope: "read",
    readOnly: true,
    run: (c) => c.get("/me"),
  }),
  tool({
    name: "get_stats",
    title: "Shop stats",
    description:
      "How the shops are doing: earnings, things sold, views, likes, shares, followers, offers, where visitors came from and the most viewed listings, compared with the period before.",
    input: z.object({
      period: z.enum(["7d", "30d", "90d", "year"]).optional().describe("Default 30d."),
      shop: z.string().optional().describe("A shop slug; leave out for all shops."),
    }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get("/stats", { period: a.period, shop: a.shop }),
  }),

  /* Shops */
  tool({
    name: "list_shops",
    title: "List shops",
    description: "The seller's shops with their settings and listing counts.",
    input: z.object({}),
    scope: "read",
    readOnly: true,
    run: (c) => c.get("/shops"),
  }),
  tool({
    name: "get_shop",
    title: "Get a shop",
    description: "One shop's settings and this week's numbers.",
    input: z.object({ shop: z.string().describe("The shop's slug.") }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get(`/shops/${seg(a.shop)}`),
  }),
  tool({
    name: "update_shop",
    title: "Change shop settings",
    description:
      "Change a shop's name, about, location, who can see it, whether it's paused, and what its agent may do (answer questions, haggle, lowest % off).",
    input: z.object({
      shop: z.string().describe("The shop's slug."),
      name: z.string().max(60).optional(),
      about: z.string().max(300).optional(),
      location: z.string().max(80).optional(),
      visibility: z.enum(["public", "link", "private"]).optional(),
      paused: z.boolean().optional(),
      answer_questions: z.boolean().optional(),
      haggle: z.boolean().optional(),
      lowest_percent: z.number().int().min(0).max(90).optional(),
    }),
    scope: "shops",
    consequential: true,
    confirmMessage: (a) => `Change the settings of ${a.shop}?`,
    run: (c, { shop, ...rest }) => c.patch(`/shops/${seg(shop)}`, rest),
  }),
  tool({
    name: "open_shop",
    title: "Open a new shop",
    description: "Opens a new shop at {slug}.resell.store.",
    input: z.object({
      name: z.string().min(1).max(60),
      slug: z.string().min(1).max(32).describe("Lowercase letters, numbers and dashes."),
      category: z.string().max(40).optional(),
      visibility: z.enum(["public", "link", "private"]).optional(),
    }),
    scope: "shops",
    consequential: true,
    confirmMessage: (a) => `Open a new shop called "${a.name}" at ${a.slug}.resell.store?`,
    run: (c, a) => c.post("/shops", a),
  }),

  /* Listings */
  tool({
    name: "list_listings",
    title: "List listings",
    description: "The seller's listings, most recently changed first, with views, likes and offers for each.",
    input: z.object({
      status: z.enum(["draft", "live", "sold"]).optional(),
      shop: z.string().optional().describe("A shop slug; leave out for all shops."),
      limit,
      offset,
    }),
    scope: "read",
    readOnly: true,
    run: async (c, a) => slim(await c.get<{ data: Row[] }>("/listings", a), listingRow),
  }),
  tool({
    name: "get_listing",
    title: "Get a listing",
    description: "Everything about one listing: words, details, photos, price, the private lowest price, research and numbers.",
    input: z.object({ id: listingId }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get(`/listings/${seg(a.id)}`),
  }),
  tool({
    name: "create_listing",
    title: "Make a listing",
    description:
      "Makes a draft listing. A prompt in the seller's words is enough (\"yellow le creuset dutch oven 5.5qt, used twice\"); set research: true to have the research agent identify it and suggest a price. Photos can be added from public image URLs. It stays a draft until publish_listing.",
    input: z.object({
      shop: z.string().optional().describe("Shop slug; defaults to the first shop."),
      prompt: z.string().max(500).optional().describe("What it is, in the seller's words."),
      ...editable,
      photo_urls: z.array(z.string().url()).max(12).optional(),
      research: z.boolean().optional().describe("Look it up and suggest a price (takes about a minute; check with get_research)."),
    }),
    scope: "listings",
    run: async (c, a) => listingRow(await c.post<Row>("/listings", a)),
  }),
  tool({
    name: "update_listing",
    title: "Change a listing",
    description: "Change a listing's words, price, private lowest price, shipping, details, or whether it takes offers. Send only what changes.",
    input: z.object({ id: listingId, ...editable, visibility: z.enum(["everyone", "link"]).optional() }),
    scope: "listings",
    run: async (c, { id, ...rest }) => listingRow(await c.patch<Row>(`/listings/${seg(id)}`, rest)),
  }),
  tool({
    name: "publish_listing",
    title: "Put a listing live",
    description: "Publishes a draft on the store. Needs a title and a price. visibility \"link\" keeps it out of search.",
    input: z.object({ id: listingId, visibility: z.enum(["everyone", "link"]).optional() }),
    scope: "listings",
    consequential: true,
    confirmMessage: () => "Put this listing live on your store?",
    run: async (c, { id, ...rest }) => listingRow(await c.post<Row>(`/listings/${seg(id)}/publish`, rest)),
  }),
  tool({
    name: "unpublish_listing",
    title: "Take a listing down",
    description: "Back to a draft. It keeps its link.",
    input: z.object({ id: listingId }),
    scope: "listings",
    run: async (c, a) => listingRow(await c.post<Row>(`/listings/${seg(a.id)}/unpublish`)),
  }),
  tool({
    name: "mark_sold_elsewhere",
    title: "Mark sold elsewhere",
    description: "For something that sold somewhere else. (Sales on resell.store mark themselves sold.)",
    input: z.object({ id: listingId }),
    scope: "listings",
    consequential: true,
    run: async (c, a) => listingRow(await c.post<Row>(`/listings/${seg(a.id)}/mark-sold`)),
  }),
  tool({
    name: "relist",
    title: "Relist",
    description: "Puts a sold listing back up at the same link.",
    input: z.object({ id: listingId }),
    scope: "listings",
    consequential: true,
    run: async (c, a) => listingRow(await c.post<Row>(`/listings/${seg(a.id)}/relist`)),
  }),
  tool({
    name: "delete_listing",
    title: "Delete a listing",
    description: "Deletes a listing and its photos for good. Listings with a sale can't be deleted.",
    input: z.object({ id: listingId }),
    scope: "listings",
    destructive: true,
    consequential: true,
    confirmMessage: () => "Delete this listing for good?",
    run: (c, a) => c.delete(`/listings/${seg(a.id)}`),
  }),
  tool({
    name: "add_photos",
    title: "Add photos",
    description: "Adds pictures to a listing from public image URLs (we keep a copy). Up to 12 photos.",
    input: z.object({ id: listingId, urls: z.array(z.string().url()).min(1).max(12), alt: z.string().max(200).optional() }),
    scope: "listings",
    run: (c, { id, ...rest }) => c.post(`/listings/${seg(id)}/photos`, rest),
  }),
  tool({
    name: "remove_photo",
    title: "Remove a photo",
    description: "Removes one photo from a listing.",
    input: z.object({ id: listingId, photo_id: z.string().min(1) }),
    scope: "listings",
    destructive: true,
    run: (c, a) => c.delete(`/listings/${seg(a.id)}/photos/${seg(a.photo_id)}`),
  }),
  tool({
    name: "reorder_photos",
    title: "Reorder photos",
    description: "Sets the photo order; the first is the cover and must be one of the seller's own photos. Send every photo id.",
    input: z.object({ id: listingId, photo_ids: z.array(z.string()).min(1).max(20) }),
    scope: "listings",
    run: (c, { id, ...rest }) => c.put(`/listings/${seg(id)}/photos/order`, rest),
  }),

  /* Research and words */
  tool({
    name: "research_item",
    title: "What's this worth?",
    description:
      "Looks an item up from a description: what it is, what it sells for second-hand and a suggested price. Makes a draft listing to hold the results; check them with get_research after about a minute.",
    input: z.object({
      query: z.string().min(2).max(500).describe("What it is, e.g. \"Le Creuset dutch oven 5.5 qt yellow\"."),
      shop: z.string().optional(),
      photo_urls: z.array(z.string().url()).max(4).optional(),
    }),
    scope: "listings",
    run: (c, a) => c.post("/research", a),
  }),
  tool({
    name: "research_listing",
    title: "Look a listing up",
    description: "Starts the research agent on an existing listing (identify it, find prices, suggest one). Check with get_research.",
    input: z.object({ id: listingId }),
    scope: "listings",
    run: (c, a) => c.post(`/listings/${seg(a.id)}/research`),
  }),
  tool({
    name: "get_research",
    title: "Research results",
    description: "Progress of the latest research run, then its findings: what it is, a price range and suggested price, facts and questions worth answering.",
    input: z.object({ id: listingId }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get(`/listings/${seg(a.id)}/research`),
  }),
  tool({
    name: "write_listing_words",
    title: "Write the words",
    description:
      "Has the writing agent write the title, one-liner and description from the listing's details, in a tone, and puts them on the listing. instruction can be \"shorter\", \"longer\", \"take\" (a fresh take) or free text.",
    input: z.object({
      id: listingId,
      tone: z.enum(["Friendly", "Playful", "Straight to the point", "A bit luxe"]).optional(),
      instruction: z.string().max(500).optional(),
    }),
    scope: "listings",
    run: (c, { id, ...rest }) => c.post(`/listings/${seg(id)}/words`, rest),
  }),

  /* Offers */
  tool({
    name: "list_offers",
    title: "List offers",
    description: "Offers on the seller's listings, newest first. status \"open\" means waiting on the seller.",
    input: z.object({
      status: z.enum(["open", "countered", "accepted", "declined", "withdrawn", "expired", "paid"]).optional(),
      listing: z.string().optional().describe("Only offers on this listing id."),
      limit,
      offset,
    }),
    scope: "read",
    readOnly: true,
    run: async (c, a) => slim(await c.get<{ data: Row[] }>("/offers", { role: "seller", ...a }), offerRow),
  }),
  tool({
    name: "accept_offer",
    title: "Accept an offer",
    description: "Says yes to an open offer. The buyer gets 48 hours to pay.",
    input: z.object({ id: z.string().min(1).describe("The offer id.") }),
    scope: "offers",
    consequential: true,
    confirmMessage: () => "Accept this offer?",
    run: async (c, a) => offerRow(await c.post<Row>(`/offers/${seg(a.id)}/accept`)),
  }),
  tool({
    name: "decline_offer",
    title: "Decline an offer",
    description: "Says no to an open offer. The buyer is told kindly.",
    input: z.object({ id: z.string().min(1).describe("The offer id.") }),
    scope: "offers",
    consequential: true,
    confirmMessage: () => "Decline this offer?",
    run: async (c, a) => offerRow(await c.post<Row>(`/offers/${seg(a.id)}/decline`)),
  }),
  tool({
    name: "counter_offer",
    title: "Counter an offer",
    description: "Names a price between the buyer's offer and the asking price. The buyer has 48 hours to take it.",
    input: z.object({ id: z.string().min(1).describe("The offer id."), amount: money("Your counter") }),
    scope: "offers",
    consequential: true,
    confirmMessage: (a) => `Counter at $${a.amount}?`,
    run: async (c, a) => offerRow(await c.post<Row>(`/offers/${seg(a.id)}/counter`, { amount: a.amount })),
  }),

  /* Sales */
  tool({
    name: "list_sales",
    title: "List sales",
    description: "What sold, newest first. status \"paid\" means it's waiting to be shipped.",
    input: z.object({
      status: z.enum(["paid", "shipped", "delivered", "completed", "refunded", "cancelled"]).optional(),
      limit,
      offset,
    }),
    scope: "read",
    readOnly: true,
    run: async (c, a) => slim(await c.get<{ data: Row[] }>("/sales", a), saleRow),
  }),
  tool({
    name: "get_sale",
    title: "Get a sale",
    description: "One sale: the buyer, the shipping address, the payout and its status.",
    input: z.object({ id: z.string().min(1) }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get(`/sales/${seg(a.id)}`),
  }),
  tool({
    name: "mark_shipped",
    title: "Mark shipped",
    description: "Says a sale is in the post, with a tracking number if there is one. The buyer gets the tracking link.",
    input: z.object({ id: z.string().min(1).describe("The sale (order) id."), tracking_number: z.string().max(80).optional() }),
    scope: "orders",
    consequential: true,
    confirmMessage: () => "Mark this sale as shipped?",
    run: async (c, { id, ...rest }) => saleRow(await c.post<Row>(`/sales/${seg(id)}/ship`, rest)),
  }),
  tool({
    name: "get_sale_problem",
    title: "See a problem with a sale",
    description:
      "The buyer's problem with a sale and everything both sides said. Refunds need the owner: point them to the sale page, an agent can't give money back.",
    input: z.object({ id: z.string().min(1).describe("The sale (order) id.") }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get(`/sales/${seg(a.id)}/problem`),
  }),
  tool({
    name: "reply_about_problem",
    title: "Reply about a problem",
    description: "Adds a message to the buyer's open problem with a sale. Be kind and factual; never promise a refund for the owner.",
    input: z.object({ id: z.string().min(1).describe("The sale (order) id."), body: z.string().min(1).max(2000) }),
    scope: "orders",
    consequential: true,
    confirmMessage: () => "Send this reply about the problem?",
    run: (c, { id, ...rest }) => c.post(`/sales/${seg(id)}/problem/reply`, rest),
  }),
  tool({
    name: "list_reviews",
    title: "List reviews",
    description: "Reviews buyers left on the owner's shops, newest first, including private ones only the owner sees.",
    input: z.object({ shop: z.string().optional().describe("A shop slug, to see just that shop.") }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get("/reviews", a),
  }),
  tool({
    name: "reply_to_review",
    title: "Reply to a review",
    description: "The shop's public reply under a review. One per review; replying again edits it.",
    input: z.object({ id: z.string().min(1).describe("The review id."), body: z.string().min(1).max(1000) }),
    scope: "shops",
    consequential: true,
    confirmMessage: () => "Post this reply under the review?",
    run: (c, { id, ...rest }) => c.post(`/reviews/${seg(id)}/reply`, rest),
  }),

  /* Messages */
  tool({
    name: "list_conversations",
    title: "List conversations",
    description: "Conversations with buyers, newest first.",
    input: z.object({ unread: z.boolean().optional().describe("Only ones waiting on the seller."), limit, offset }),
    scope: "read",
    readOnly: true,
    run: async (c, a) => slim(await c.get<{ data: Row[] }>("/threads", { role: "seller", ...a }), threadRow),
  }),
  tool({
    name: "read_conversation",
    title: "Read a conversation",
    description: "The whole conversation with a buyer, oldest first, and the listing it's about.",
    input: z.object({ id: z.string().min(1).describe("The conversation id.") }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get(`/threads/${seg(a.id)}`),
  }),
  tool({
    name: "reply_to_buyer",
    title: "Reply to a buyer",
    description:
      "Sends a reply in a conversation as the shop. Keep it short, friendly and true to the listing; never share the private lowest price.",
    input: z.object({ id: z.string().min(1).describe("The conversation id."), body: z.string().min(1).max(2000) }),
    scope: "messages",
    run: async (c, a) => {
      const sent = await c.post(`/threads/${seg(a.id)}/messages`, { body: a.body });
      await c.post(`/threads/${seg(a.id)}/read`).catch(() => {});
      return sent;
    },
  }),
  tool({
    name: "mark_conversation_read",
    title: "Mark read",
    description: "Marks a conversation read without replying.",
    input: z.object({ id: z.string().min(1) }),
    scope: "messages",
    run: async (c, a) => threadRow(await c.post<Row>(`/threads/${seg(a.id)}/read`)),
  }),
];
