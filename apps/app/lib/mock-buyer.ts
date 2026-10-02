/*
 * Maya's side of the marketplace for P6 (Messages) and P8 (Buyer account).
 * Front-end only: threads, orders and offers are made up and live in local state
 * once a page has them.
 */

import type { ArtKey } from "../components/market/art";

export type ThreadKind = "offer" | "order" | "other";

export type ChatMessage =
  | { id: string; type: "day"; label: string }
  | { id: string; type: "note"; text: string }
  | { id: string; type: "mine"; text: string }
  /** The seller themselves */
  | { id: string; type: "seller"; text: string }
  /** The store's agent, answering from the listing */
  | { id: string; type: "agent"; text: string }
  /** An offer Maya made, with what PayPal holds for it */
  | { id: string; type: "offer"; amount: number; text: string; deposit?: number }
  /** The seller's counter, which Maya answers in the thread */
  | {
      id: string;
      type: "counter";
      amount: number;
      expires: string;
      detail: string;
      /** What's left to pay if she accepts */
      toPay: number;
    }
  /** The seller said yes; pay to keep it */
  | { id: string; type: "accepted"; amount: number; detail: string; payHref: string };

/** "Where things stand": oldest first; the last step is where it is now. */
export type TimelineStep = {
  title: string;
  detail: string;
};

export type Thread = {
  /** The store's slug, also the ?thread= value */
  id: string;
  store: string;
  kind: ThreadKind;
  preview: string;
  when: string;
  unread?: boolean;
  /** Who you're talking to, under the store name */
  with: string;
  listing: { slug: string; title: string; price: number; art: ArtKey };
  messages: ChatMessage[];
  timeline: TimelineStep[];
  /** Open offers can be handed to the buyer's agent with a ceiling */
  agentCeiling?: number;
};

export const threads: Thread[] = [
  {
    id: "secondshutter",
    store: "secondshutter",
    kind: "offer",
    preview: "Countered at $130",
    when: "2 min",
    unread: true,
    with: "Sam, plus the store's agent for quick answers",
    listing: { slug: "35mm-film-camera", title: "35mm film camera", price: 140, art: "camera" },
    agentCeiling: 126,
    messages: [
      { id: "ss-0", type: "day", label: "Today" },
      { id: "ss-1", type: "mine", text: "Does the light meter work with batteries you can still buy?" },
      {
        id: "ss-2",
        type: "agent",
        text: "Yes. It takes a 4LR44, which most pharmacies and camera shops carry, and one is included. Sam checked the meter against a handheld one last week and it read within a third of a stop.",
      },
      {
        id: "ss-3",
        type: "offer",
        amount: 120,
        text: "Hi Sam, would you take $120? I can pay today and I am in no rush on shipping.",
        deposit: 20,
      },
      {
        id: "ss-4",
        type: "seller",
        text: "Thanks Maya. I can't quite get to $120, but I'll meet you at $130 and put a fresh roll of film in the box.",
      },
      {
        id: "ss-5",
        type: "counter",
        amount: 130,
        expires: "Good for 23 hours",
        detail: "Includes a fresh roll of colour film. You would pay $122 more: $110 after your $20 deposit, plus $12 shipping.",
        toPay: 122,
      },
    ],
    timeline: [
      { title: "You offered $120", detail: "10:12 this morning" },
      { title: "$20 deposit held by PayPal", detail: "Yours again if this falls through" },
      { title: "Sam countered at $130", detail: "10:41, waiting on you" },
    ],
  },
  {
    id: "june",
    store: "june",
    kind: "offer",
    preview: "Yes to $32 for the lamp",
    when: "1 hr",
    unread: true,
    with: "June, plus the store's agent for quick answers",
    listing: { slug: "brass-desk-lamp", title: "Brass desk lamp", price: 45, art: "lamp" },
    messages: [
      { id: "jf-0", type: "day", label: "Today" },
      {
        id: "jf-1",
        type: "offer",
        amount: 32,
        text: "Hi June, would you take $32 for the lamp? It would live on my reading desk.",
      },
      {
        id: "jf-2",
        type: "seller",
        text: "Yes to $32 for the lamp. It's rewired and the shade is original, so it's ready to go.",
      },
      {
        id: "jf-3",
        type: "accepted",
        amount: 32,
        detail: "Pay by tomorrow evening to keep it. Until then June holds it for you.",
        payHref: "/checkout/brass-desk-lamp",
      },
    ],
    timeline: [
      { title: "You offered $32", detail: "9:20 this morning" },
      { title: "June said yes to $32", detail: "Pay by tomorrow evening" },
    ],
  },
  {
    id: "billy",
    store: "billy",
    kind: "order",
    preview: "Your record is on its way",
    when: "Tue",
    with: "Billy, plus the store's agent for quick answers",
    listing: { slug: "first-pressing-soul-lp", title: "First-pressing soul LP", price: 32, art: "record" },
    messages: [
      { id: "bb-0", type: "day", label: "Tuesday" },
      { id: "bb-1", type: "mine", text: "Could you pack it with some board on both sides? It's a long way to Vancouver." },
      {
        id: "bb-2",
        type: "seller",
        text: "Always do. Your record is on its way, between two boards and out of the sleeve so the seams don't split.",
      },
      { id: "bb-3", type: "note", text: "Shipped with Canada Post. Arrives October 6." },
    ],
    timeline: [
      { title: "You paid $44", detail: "Held by PayPal until you have it" },
      { title: "Shipped", detail: "Tuesday, from Toronto" },
      { title: "Arrives October 6", detail: "Then you check it" },
    ],
  },
  {
    id: "cardcorner",
    store: "cardcorner",
    kind: "other",
    preview: "Offer declined, $40 back",
    when: "Mon",
    with: "Chris, plus the store's agent for quick answers",
    listing: { slug: "holo-trading-card-1999", title: "Holo trading card, 1999", price: 210, art: "card" },
    messages: [
      { id: "cc-0", type: "day", label: "Monday" },
      {
        id: "cc-1",
        type: "offer",
        amount: 160,
        text: "Would you take $160? I'd love it for my brother's birthday.",
        deposit: 40,
      },
      {
        id: "cc-2",
        type: "seller",
        text: "Thanks for asking, but I'm holding at $210 for this one. Graded 8s from that set don't come up often.",
      },
      { id: "cc-3", type: "note", text: "Offer declined. Your $40 deposit went back to your PayPal." },
    ],
    timeline: [
      { title: "You offered $160", detail: "Monday morning" },
      { title: "Chris declined", detail: "Monday afternoon" },
      { title: "$40 back with you", detail: "Returned to your PayPal" },
    ],
  },
  {
    id: "nina",
    store: "nina",
    kind: "order",
    preview: "Saturday pickup works",
    when: "Sep 27",
    with: "Nina, plus the store's agent for quick answers",
    listing: { slug: "oak-dining-chair", title: "Oak dining chair", price: 80, art: "chair" },
    messages: [
      { id: "na-0", type: "day", label: "September 26" },
      { id: "na-1", type: "mine", text: "Could I pick up the chair on Saturday morning?" },
      { id: "na-2", type: "seller", text: "Saturday pickup works. I'm home from 10, ring the side door." },
    ],
    timeline: [
      { title: "You paid $80", detail: "Held by PayPal until you check it" },
      { title: "Picked up on Saturday", detail: "September 27" },
      { title: "Check it by October 4", detail: "Then $80 goes to Nina" },
    ],
  },
];

export function getThread(id: string | undefined) {
  return threads.find((t) => t.id === id);
}

/** Canned answers from a store's agent when you write in the prototype. */
export function agentReply(text: string, owner: string, store: string) {
  const t = text.toLowerCase();
  if (/ship|post|deliver|arriv/.test(t))
    return "It ships tracked within 2 days of payment, and you'll get the tracking number here.";
  if (/return|refund|broken|work/.test(t))
    return "Every order is held by PayPal until you've checked it. If it isn't as described, you get your money back.";
  if (store === "secondshutter" && /lens|strap|case|box|cap|includ|come with/.test(t))
    return "It comes with the 50mm lens, both caps, the strap and a fresh 4LR44 battery. There's no case or original box.";
  return `Good question. I couldn't answer that from the listing, so I've passed it to ${owner}. They usually reply within the hour.`;
}

/* ---------- P8 Buyer account ---------- */

export type OrderStatus = {
  title: string;
  detail: string;
  /** Green when it's finished */
  done?: boolean;
};

export type BuyerOrder = {
  id: string;
  title: string;
  store: string;
  line: string;
  art: ArtKey;
  status: OrderStatus;
  action: "confirm" | "track" | "review";
};

export const orders: BuyerOrder[] = [
  {
    id: "chair",
    title: "Oak dining chair",
    store: "nina",
    line: "Nina at home, $80",
    art: "chair",
    status: { title: "Picked up on Saturday", detail: "Check it by October 4. Then $80 goes to Nina." },
    action: "confirm",
  },
  {
    id: "lp",
    title: "First-pressing soul LP",
    store: "billy",
    line: "Billy's bins, $44 with shipping",
    art: "record",
    status: { title: "On its way, arrives October 6", detail: "$44 held by PayPal until you have it." },
    action: "track",
  },
  {
    id: "apron",
    title: "Canvas garden apron",
    store: "june",
    line: "June's finds, $26 with shipping",
    art: "apron",
    status: { title: "All done", detail: "You confirmed it on September 24. June was paid.", done: true },
    action: "review",
  },
];

export type BuyerOffer = {
  id: string;
  title: string;
  line: string;
  art: ArtKey;
  status: OrderStatus;
  cta: { label: string; href: string; tone: "dark" | "green" };
};

export const offers: BuyerOffer[] = [
  {
    id: "camera",
    title: "35mm film camera with 50mm lens",
    line: "Second Shutter, asking $140",
    art: "camera",
    status: { title: "Sam countered at $130", detail: "Your $20 deposit is held. 23 hours left." },
    cta: { label: "Answer Sam", href: "/messages?thread=secondshutter", tone: "dark" },
  },
  {
    id: "lamp",
    title: "Brass desk lamp",
    line: "June's finds, asking $45",
    art: "lamp",
    status: { title: "June said yes to $32", detail: "Pay by tomorrow evening to keep it.", done: true },
    cta: { label: "Pay $32 to keep it", href: "/checkout/brass-desk-lamp", tone: "green" },
  },
];

/** Stores Maya follows; `fresh` means they listed something since her last visit. */
export const following: { store: string; fresh?: boolean }[] = [
  { store: "secondshutter", fresh: true },
  { store: "june", fresh: true },
  { store: "billy" },
  { store: "nina" },
  { store: "cardcorner" },
  { store: "tom" },
];

/** Listing slugs from mock-market, in the order P8 shows them. */
export const favourites = [
  "chunky-knit-sweater",
  "brass-desk-lamp",
  "holo-trading-card-1999",
  "50mm-lens",
];

export const accountCounts = { orders: 3, offers: 2, favourites: 12, following: 9 };
