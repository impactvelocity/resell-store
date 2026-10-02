/*
 * Prototype data for the inbox (A5), profile (A6/A7), the listing manage page
 * (C9) and the offer page (C10). Copy comes from the Paper file.
 */

import { draftListing, getShop } from "./mock";

/* Inbox ------------------------------------------------------------------- */

export type InboxSection = "needs-you" | "agent" | "buying";
export type InboxFilter = "all" | "offers" | "questions" | "sales";

export type InboxItem = {
  /** Also the thread id: /inbox/<id>. */
  id: string;
  section: InboxSection;
  /** Which filter chip shows it. "all" shows everything. */
  category: Exclude<InboxFilter, "all"> | "buying";
  icon:
    | { kind: "money" }
    | { kind: "ship" }
    | { kind: "agent" }
    | { kind: "person"; initial: string };
  title: string;
  summary: string;
  time: string;
  unread: boolean;
};

export const inboxSections: { key: InboxSection; label: string }[] = [
  { key: "needs-you", label: "Needs you" },
  { key: "agent", label: "Your agent handled" },
  { key: "buying", label: "Things you're buying" },
];

export const inboxFilters: { key: InboxFilter; label: string; count?: number }[] = [
  { key: "all", label: "All" },
  { key: "offers", label: "Offers", count: 3 },
  { key: "questions", label: "Questions" },
  { key: "sales", label: "Sales" },
];

export const inboxItems: InboxItem[] = [
  {
    id: "jess-linen-dress",
    section: "needs-you",
    category: "offers",
    icon: { kind: "money" },
    title: "Jess offered $20",
    summary: "Linen wrap dress. $5 hold paid.",
    time: "10m",
    unread: true,
  },
  {
    id: "priya-bud-vase",
    section: "needs-you",
    category: "sales",
    icon: { kind: "ship" },
    title: "Ship the bud vase by Friday",
    summary: "Sold to Priya for $18. Label is ready.",
    time: "2h",
    unread: true,
  },
  {
    id: "sweater-itchy",
    section: "agent",
    category: "questions",
    icon: { kind: "agent" },
    title: "Answered “Is the sweater itchy?”",
    summary: "Said it's a soft cotton blend, from your notes.",
    time: "1h",
    unread: false,
  },
  {
    id: "tote-nine",
    section: "agent",
    category: "offers",
    icon: { kind: "agent" },
    title: "Turned down $9 for the tote",
    summary: "Below your lowest price of $12. No hold.",
    time: "3h",
    unread: false,
  },
  {
    id: "sam-dutch-oven",
    section: "agent",
    category: "offers",
    icon: { kind: "agent" },
    title: "Countered Sam at $175",
    summary: "Dutch oven. Waiting to hear back.",
    time: "5h",
    unread: false,
  },
  {
    id: "june-desk-lamp",
    section: "buying",
    category: "buying",
    icon: { kind: "person", initial: "J" },
    title: "June accepted your $32 offer",
    summary: "Brass desk lamp. Pay by tomorrow to keep it.",
    time: "Tue",
    unread: false,
  },
];

export type ThreadMessage = {
  from: "them" | "agent" | "you";
  /** "Jess, 2:04 pm" */
  meta: string;
  text: string;
};

/** What the agent would do, shown above the messages. */
export type ThreadDecision =
  | {
      kind: "offer";
      buyer: string;
      amount: number;
      asking: number;
      hold: number;
      /** What "Ask for more" starts at. */
      suggest: number;
      step: number;
      title: string;
      body: string;
    }
  | {
      kind: "action";
      title: string;
      body: string;
      primary: string;
      /** Toast after the primary button. */
      done: string;
      secondary?: { label: string; href: string };
    };

export type Thread = {
  id: string;
  person: string;
  thumb: "dress" | "vase" | "sweater" | "oven" | "tote" | "lamp";
  title: string;
  subtitle: string;
  listingHref?: string;
  decision?: ThreadDecision;
  messages: ThreadMessage[];
  footer?: string;
};

export const threads: Record<string, Thread> = {
  "jess-linen-dress": {
    id: "jess-linen-dress",
    person: "Jess",
    thumb: "dress",
    title: "Jess offered $20",
    subtitle: "Linen wrap dress, listed at $24. Lowest you'll take: $20.",
    listingHref: "/listings/linen-dress",
    decision: {
      kind: "offer",
      buyer: "Jess",
      amount: 20,
      asking: 24,
      hold: 5,
      suggest: 22,
      step: 1,
      title: "I'd take it",
      body: "It's right at your lowest price, and she put money down, so she's serious. The dress has been up 2 days.",
    },
    messages: [
      { from: "them", meta: "Jess, 2:04 pm", text: "Love this. Would you take $18?" },
      {
        from: "agent",
        meta: "Your agent, 2:04 pm",
        text: "Thanks Jess. $18 is a little low for this one. Could you do $22?",
      },
      { from: "them", meta: "Jess, 2:11 pm", text: "Meet at $20? I've put the hold down." },
    ],
    footer: "Waiting on you. The hold lasts until tomorrow, 2:11 pm.",
  },
  "priya-bud-vase": {
    id: "priya-bud-vase",
    person: "Priya",
    thumb: "vase",
    title: "Ship the bud vase by Friday",
    subtitle: "Sold to Priya for $18. Label is ready.",
    decision: {
      kind: "action",
      title: "Your label is ready",
      body: "Print it, wrap the vase in something soft, and drop it at any post office by Friday.",
      primary: "Print label",
      done: "Label sent to your printer",
      secondary: { label: "See the sale", href: "/sales" },
    },
    messages: [
      { from: "them", meta: "Priya, Monday", text: "So happy this is mine. No rush on shipping!" },
      {
        from: "agent",
        meta: "Your agent, Monday",
        text: "Thanks Priya. It'll go out by Friday and you'll get tracking as soon as it does.",
      },
    ],
    footer: "Paid $18 on Monday. Ship by Friday.",
  },
  "sweater-itchy": {
    id: "sweater-itchy",
    person: "Leo",
    thumb: "sweater",
    title: "Answered “Is the sweater itchy?”",
    subtitle: "Cream cable knit sweater. Asked by Leo.",
    messages: [
      { from: "them", meta: "Leo, 1:12 pm", text: "Is the sweater itchy?" },
      {
        from: "agent",
        meta: "Your agent, 1:12 pm",
        text: "Not at all. It's a soft cotton blend, nice right against the skin.",
      },
    ],
    footer: "Your agent answered from your notes.",
  },
  "tote-nine": {
    id: "tote-nine",
    person: "Kai",
    thumb: "tote",
    title: "Turned down $9 for the tote",
    subtitle: "Canvas market tote, listed at $16. Lowest you'll take: $12.",
    messages: [
      { from: "them", meta: "Kai, 11:40 am", text: "Would you take $9?" },
      {
        from: "agent",
        meta: "Your agent, 11:40 am",
        text: "Thanks for asking! $9 is below what I can do. $12 is the lowest for this one.",
      },
    ],
    footer: "Your agent said no. No hold was paid.",
  },
  "sam-dutch-oven": {
    id: "sam-dutch-oven",
    person: "Sam",
    thumb: "oven",
    title: "Countered Sam at $175",
    subtitle: "Yellow dutch oven, listed at $185. Lowest you'll take: $160.",
    listingHref: "/listings/linen-dress",
    messages: [
      { from: "them", meta: "Sam, 9:20 am", text: "Would you take $140?" },
      {
        from: "agent",
        meta: "Your agent, 9:21 am",
        text: "It's in lovely shape with no chips. Could you do $175?",
      },
    ],
    footer: "Waiting to hear back from Sam.",
  },
  "june-desk-lamp": {
    id: "june-desk-lamp",
    person: "June",
    thumb: "lamp",
    title: "June accepted your $32 offer",
    subtitle: "Brass desk lamp from June's shop.",
    decision: {
      kind: "action",
      title: "Pay $32 to keep it",
      body: "June said yes. Pay by tomorrow and she'll send it out.",
      primary: "Pay $32",
      done: "Paid. June will ship it soon.",
    },
    messages: [
      { from: "you", meta: "You, Tuesday", text: "Would you take $32 for the lamp?" },
      { from: "them", meta: "June, Tuesday", text: "Deal! It's yours if you pay by tomorrow." },
    ],
  },
};

export function getThread(id: string | undefined) {
  return (id && threads[id]) || threads["jess-linen-dress"]!;
}

/* Profile ----------------------------------------------------------------- */

export const profile = {
  name: "Maya Rivera",
  about:
    "Recovering over-shopper. I buy good things, look after them, then pass them on.",
  location: "Portland, Oregon",
  since: "Selling since 2025.",
  aboutMax: 200,
};

export const interests = [
  "Vintage clothes",
  "Kitchen",
  "Books",
  "Plants",
  "Records",
  "Kids' things",
  "Sneakers",
  "Furniture",
];
export const myInterests = ["Vintage clothes", "Kitchen", "Plants"];

export type NotifyRow = {
  key: string;
  label: string;
  /** Shown under the label while it's on. */
  when: string;
  on: boolean;
};

export const notifyRows: NotifyRow[] = [
  { key: "offer", label: "Someone makes an offer", when: "Right away", on: true },
  { key: "sold", label: "Something sells", when: "Right away", on: true },
  {
    key: "agent",
    label: "My agent does something for me",
    when: "One summary each evening",
    on: true,
  },
  {
    key: "follow",
    label: "A shop I follow lists something",
    when: "Right away",
    on: false,
  },
];

export const reachBy = ["Email", "Phone alert", "Text"];
export const myReachBy = ["Email", "Phone alert"];

/* Listing manage (C9) and offer (C10) ------------------------------------- */

export const managedListing = {
  ...draftListing,
  shortTitle: "Yellow dutch oven",
  shop: getShop(draftListing.shopSlug),
  liveFor: "Live for 3 days",
  alsoOn: "Also on Facebook Marketplace",
  stats: [
    { label: "Views", value: 214 },
    { label: "Saves", value: 18 },
    { label: "Offers", value: 3 },
    { label: "Questions", value: 2 },
  ],
};

export type OfferStatus = "needs-you" | "waiting" | "accepted" | "declined" | "ran-out";

export type Offer = {
  id: string;
  buyer: string;
  initial: string;
  /** Avatar fill. */
  tone: "pink" | "leaf" | "muted";
  amount: number;
  hold?: number;
  status: OfferStatus;
  /** Who said what last, for the short row. */
  note: string;
  /** Needs-you card only. */
  when?: string;
  agentSays?: string;
  /** What "Push back" starts at. */
  suggest?: number;
};

/** The offer the C9 card and the C10 page are about. */
export const featuredOfferId = "jess-linen-dress";

export const listingOffers: Offer[] = [
  {
    id: featuredOfferId,
    buyer: "Jess",
    initial: "J",
    tone: "pink",
    amount: 170,
    hold: 20,
    status: "needs-you",
    note: "Her final offer, with money down.",
    when: "10 minutes ago, through her agent",
    agentSays:
      "She started at $150 and I countered twice. This is her final offer, $10 over your lowest, with money down. I'd take it.",
    suggest: 175,
  },
  {
    id: "sam-dutch-oven",
    buyer: "Sam",
    initial: "S",
    tone: "leaf",
    amount: 140,
    status: "waiting",
    note: "No hold. Your agent countered at $175, yesterday.",
  },
  {
    id: "ana-dutch-oven",
    buyer: "Ana",
    initial: "A",
    tone: "muted",
    amount: 120,
    status: "declined",
    note: "Your agent said no. It's well below your lowest.",
  },
];

export type Question = {
  id: string;
  question: string;
  from: string;
  /** Needs you: quick answers as pills. */
  quickAnswers?: string[];
  answer?: string;
  answeredBy?: string;
};

export const listingQuestions: Question[] = [
  {
    id: "canada",
    question: "“Would you ship to Canada?”",
    from: "From Priya, 1 hour ago. I couldn't answer this from your listing.",
    quickAnswers: ["Yes", "No, US only"],
  },
  {
    id: "knob",
    question: "“Does the lid have the metal knob?”",
    from: "From Ben, yesterday.",
    answer: "Yes, it's the stainless steel knob, safe in the oven at any heat.",
    answeredBy: "Answered by your agent, yesterday",
  },
];

export type TimelineRow = {
  who: "buyer-agent" | "buyer" | "agent" | "you";
  time: string;
  text: string;
  amount: number;
  /** A hold paid with this move. */
  hold?: number;
};

export const offerPage = {
  id: featuredOfferId,
  buyer: "Jess",
  initial: "J",
  amount: 170,
  asking: draftListing.price,
  lowest: draftListing.lowest,
  hold: 20,
  suggest: 175,
  title: "Jess offered $170",
  subtitle:
    "For the yellow dutch oven. Her agent and yours went back and forth for 29 minutes.",
  holdNote:
    "Jess has $20 on hold. It comes off the price if you accept, she gets it back if you decline, and she loses it if she backs out.",
  agentTitle: "I'd take it.",
  agentBody:
    "It's $10 over your lowest, she has money down, and it sells today rather than in about 6 days.",
  fineprint:
    "If you accept, Jess pays the other $150 through PayPal, you get a shipping label, and the listing comes down everywhere.",
  timeline: [
    { who: "buyer-agent", time: "9:02", text: "Opened low and asked if the price was firm.", amount: 150 },
    {
      who: "agent",
      time: "9:02",
      text: "Countered. Said similar ones sell for $185 and this one has no chips.",
      amount: 178,
    },
    { who: "buyer-agent", time: "9:14", text: "Came up, and asked about the marks on the base.", amount: 165 },
    {
      who: "agent",
      time: "9:15",
      text: "Sent your photo of the base. Held near asking and asked for a hold, to show she means it.",
      amount: 175,
    },
    { who: "buyer-agent", time: "9:31", text: "Final offer, and paid the hold.", amount: 170, hold: 20 },
  ] satisfies TimelineRow[],
};
