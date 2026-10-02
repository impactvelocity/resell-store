/*
 * Prototype data for the Tools screens (D1–D4). Nothing here is real.
 * Keys and links are obviously fake so nobody mistakes them for live secrets.
 */

export type ConnectionStatus = "not-connected" | "connected" | "needs-look";

export type Connection = {
  id: string;
  name: string;
  /** Letter on the tile. Real logos come later. */
  letter: string;
  status: ConnectionStatus;
  /** Why it's worth connecting. Shown while not connected. */
  pitch: string;
  /** The account line once connected. */
  account: string;
  /** What stopped working. Shown when it needs a look. */
  problem?: string;
  /** What the connection is allowed to do, for the Manage sheet. */
  allowed: string[];
};

export type ConnectionGroup = {
  id: string;
  title: string;
  description?: string;
  connections: Connection[];
};

export const connectionGroups: Record<
  "paid" | "sell" | "share" | "automatic",
  ConnectionGroup
> = {
  paid: {
    id: "paid",
    title: "Getting paid",
    connections: [
      {
        id: "paypal",
        name: "PayPal",
        letter: "P",
        status: "connected",
        pitch: "Get your payouts in a couple of days.",
        account: "maya@example.com. Your payouts land here.",
        allowed: ["Send your payouts here", "See payout status"],
      },
    ],
  },
  sell: {
    id: "sell",
    title: "Other places to sell",
    description:
      "Your agent copies listings over and takes them down when they sell.",
    connections: [
      {
        id: "facebook-marketplace",
        name: "Facebook Marketplace",
        letter: "F",
        status: "connected",
        pitch: "Lots of local buyers who can pick up.",
        account: "As Maya Rivera. 6 listings posted there.",
        allowed: [
          "Post your listings",
          "Take them down when they sell",
          "Read and answer messages about them",
        ],
      },
      {
        id: "ebay",
        name: "eBay",
        letter: "e",
        status: "not-connected",
        pitch: "Biggest reach for home and kitchen things.",
        account: "As maya_rivera. Nothing posted yet.",
        allowed: [
          "Post your listings",
          "Take them down when they sell",
          "Read and answer messages about them",
        ],
      },
      {
        id: "poshmark",
        name: "Poshmark",
        letter: "P",
        status: "not-connected",
        pitch: "Best for clothes, shoes and bags.",
        account: "As @mayasfinds. Nothing posted yet.",
        allowed: [
          "Post your listings",
          "Take them down when they sell",
          "Read and answer offers",
        ],
      },
      {
        id: "depop",
        name: "Depop",
        letter: "D",
        status: "not-connected",
        pitch: "Younger buyers, mostly clothing.",
        account: "As @mayasfinds. Nothing posted yet.",
        allowed: ["Post your listings", "Take them down when they sell"],
      },
    ],
  },
  share: {
    id: "share",
    title: "Where you share",
    description: "Post a new listing to your followers in one tap.",
    connections: [
      {
        id: "instagram",
        name: "Instagram",
        letter: "I",
        status: "connected",
        pitch: "Show new finds to your followers.",
        account: "@mayasfinds",
        allowed: ["Post new listings to your feed", "Post to your story"],
      },
      {
        id: "facebook-page",
        name: "Facebook page",
        letter: "F",
        status: "needs-look",
        pitch: "Post new listings to your page.",
        account: "Maya's finds. Posts go out when you list.",
        problem: "Facebook signed you out. Posts are on hold.",
        allowed: ["Post new listings to your page"],
      },
      {
        id: "tiktok",
        name: "TikTok",
        letter: "T",
        status: "not-connected",
        pitch: "Share a short video of what you're selling.",
        account: "@mayasfinds",
        allowed: ["Post a short video when you list"],
      },
      {
        id: "pinterest",
        name: "Pinterest",
        letter: "P",
        status: "not-connected",
        pitch: "Pin listings to a board.",
        account: "Board: Maya's finds",
        allowed: ["Pin new listings to a board"],
      },
    ],
  },
  automatic: {
    id: "automatic",
    title: "Make it automatic",
    connections: [
      {
        id: "zapier",
        name: "Zapier",
        letter: "Z",
        status: "not-connected",
        pitch:
          "Add each sale to a spreadsheet, or get a text when something sells.",
        account: "maya@example.com. 2 zaps running.",
        allowed: ["Tell Zapier when something sells", "Read your sales"],
      },
    ],
  },
};

/* D2 Your agent */

/** Fake MCP link. The masked form is what the design shows. */
export const agentLink = {
  maskedPrefix: "mcp.resell.store/u/maya-••••••",
  maskedShortPrefix: "mcp.resell.store/u/••••",
  fullPrefix: "mcp.resell.store/u/maya-fake-demo-link-",
  suffix: "k2",
};

export type PermissionChoice = "Always" | "Ask me first" | "Never";

export type Permission =
  | { id: string; label: string; hint: string; kind: "toggle"; on: boolean }
  | {
      id: string;
      label: string;
      hint: string;
      kind: "choice";
      value: PermissionChoice;
    }
  | { id: string; label: string; hint: string; kind: "locked" };

export const agentPermissions: Permission[] = [
  {
    id: "read",
    label: "See listings, sales and stats",
    hint: "Reading only",
    kind: "toggle",
    on: true,
  },
  {
    id: "listings",
    label: "Make and edit listings",
    hint: "New ones start as drafts",
    kind: "toggle",
    on: true,
  },
  {
    id: "reply",
    label: "Reply to buyers",
    hint: "Using what's in the listing",
    kind: "toggle",
    on: true,
  },
  {
    id: "offers",
    label: "Accept offers and change prices",
    hint: "You get a message to say yes or no",
    kind: "choice",
    value: "Ask me first",
  },
  {
    id: "money",
    label: "Change where your money goes",
    hint: "Only you can, signed in here",
    kind: "locked",
  },
];

export type AgentApp = {
  id: string;
  name: string;
  letter: string;
  lastUsed: string;
  tone: "leaf" | "muted";
};

export const agentApps: AgentApp[] = [
  {
    id: "claude",
    name: "Claude",
    letter: "C",
    lastUsed: "Last used 2 hours ago",
    tone: "leaf",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    letter: "G",
    lastUsed: "Last used September 12",
    tone: "muted",
  },
];

export type AgentActivity = {
  id: string;
  text: string;
  who: string;
  askedFirst?: boolean;
  href?: string;
};

export const agentActivity: AgentActivity[] = [
  {
    id: "a1",
    text: 'Listed "Green rain jacket" for $45',
    who: "Claude, today at 9:12",
  },
  {
    id: "a2",
    text: "Answered Dana about sweater sizing",
    who: "Claude, yesterday",
    href: "/inbox",
  },
  {
    id: "a3",
    text: "Wanted to accept $170 for the dutch oven",
    who: "Claude, Monday",
    askedFirst: true,
    href: "/inbox",
  },
];

/** Older entries shown after "See all". */
export const agentActivityOlder: AgentActivity[] = [
  {
    id: "a4",
    text: "Answered Jess about the linen dress",
    who: "ChatGPT, September 12",
    href: "/inbox",
  },
  {
    id: "a5",
    text: "Told you what sold last week",
    who: "ChatGPT, September 8",
  },
];

/* D3 API */

export const apiKey = {
  maskedPrefix: "rs_live_••••••••••••••••",
  maskedShortPrefix: "rs_live_••••••••••••",
  fullPrefix: "rs_live_FAKE_demo_not_a_real_key_",
  suffix: "4f2a",
  madeShort: "Made Sep 3",
  made: "Made September 3",
};

export const apiUsage = { used: 1240, limit: 10000 };

export const curlPhone = `curl api.resell.store/v1/listings \\
  -H "Authorization: Bearer $KEY" \\
  -d shop="maya-home" \\
  -d title="Yellow dutch oven" \\
  -d price=185 \\
  -d lowest_price=160`;

export const curlDesktop = `curl https://api.resell.store/v1/listings \\
  -H "Authorization: Bearer rs_live_...4f2a" \\
  -d shop="maya-home" \\
  -d title="Yellow dutch oven, 5.5 qt" \\
  -d price=185 \\
  -d lowest_price=160`;

export const endpoints = [
  { path: "/v1/shops", what: "Your shops and who can see them" },
  { path: "/v1/listings", what: "Make, change and publish listings" },
  { path: "/v1/research", what: "Look up an item and get a suggested price" },
  { path: "/v1/offers", what: "Offers, holds and where each one stands" },
  { path: "/v1/sales", what: "Sales, shipping and payouts" },
  { path: "/v1/webhooks", what: "Choose what we tell your server about" },
];

export const webhook = {
  url: "https://example.com/hooks/resell",
  events: [
    { id: "listing.sold", on: true },
    { id: "offer.received", on: true },
    { id: "question.asked", on: false },
    { id: "payout.sent", on: false },
  ],
};

/* D4 Shopping sidekick */

export type SidekickCheck = {
  id: string;
  name: string;
  detail: string;
  verdict: "holds" | "loses" | "owned";
  verdictLabel: string;
};

export const sidekickChecks: SidekickCheck[] = [
  {
    id: "crossbody",
    name: "Leather crossbody bag",
    detail: "$240 new, sells on for about $150",
    verdict: "holds",
    verdictLabel: "Holds its value",
  },
  {
    id: "blazer",
    name: "Trend blazer",
    detail: "$60 new, sells on for about $8",
    verdict: "loses",
    verdictLabel: "Loses most of it",
  },
  {
    id: "dutch-oven",
    name: "Yellow dutch oven",
    detail: "$420 new, sells on for about $185",
    verdict: "owned",
    verdictLabel: "You own this",
  },
];

export const sidekickUrl = "sidekick.resell.store/maya";
