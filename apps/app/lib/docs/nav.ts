/*
 * The docs site's map: every section of docs.resell.store, in sidebar order.
 * Guides are for people selling and buying, API and MCP for building on it,
 * Developers for working on resell.store itself. An item without an href
 * shows as "Soon", for listing a page before it exists.
 */

export const apiGroups = [
  { id: "account", title: "Account", blurb: "Check a key and see what needs you." },
  { id: "shops", title: "Shops", blurb: "Your stores and their settings." },
  { id: "listings", title: "Listings", blurb: "Make, change, publish and take down listings." },
  { id: "photos", title: "Photos", blurb: "Upload, reorder and remove a listing's pictures." },
  { id: "research", title: "Research", blurb: "Look items up, get a price, and have the agent write the words." },
  { id: "offers", title: "Offers", blurb: "Answer offers as a seller, or make them as a buyer." },
  { id: "sales", title: "Sales", blurb: "What sold, where it ships, and marking it shipped." },
  { id: "messages", title: "Messages", blurb: "Conversations between buyers and shops." },
  { id: "stats", title: "Stats", blurb: "Earnings, views, likes and where people came from." },
  { id: "webhooks", title: "Webhooks", blurb: "Get told when something happens." },
  { id: "marketplace", title: "Marketplace", blurb: "Search and browse everything for sale. No key needed." },
  { id: "likes-and-follows", title: "Likes and follows", blurb: "Hearts, followed stores and share links." },
  { id: "buying", title: "Buying", blurb: "Your orders, checkout links and confirming delivery." },
] as const;

export type ApiGroupId = (typeof apiGroups)[number]["id"];

/** "Likes and follows" → "likes-and-follows" */
export const groupId = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-") as ApiGroupId;

export type NavItem = { title: string; href?: string; soon?: boolean };
export type NavSection = { title: string; items: NavItem[] };
export type NavTab = { id: string; title: string; href: string; sections: NavSection[] };

export const docsTabs: NavTab[] = [
  {
    id: "guides",
    title: "Guides",
    href: "/",
    sections: [
      {
        title: "Start here",
        items: [
          { title: "Overview", href: "/" },
          { title: "Getting started", href: "/guides/getting-started" },
          { title: "How a sale works", href: "/guides/how-it-works" },
        ],
      },
      {
        title: "Selling",
        items: [
          { title: "Open a shop", href: "/guides/shops" },
          { title: "List an item", href: "/guides/list-an-item" },
          { title: "Prices and research", href: "/guides/pricing" },
          { title: "Offers", href: "/guides/offers" },
          { title: "Questions and your shop agent", href: "/guides/questions" },
          { title: "Sales and shipping", href: "/guides/sales" },
          { title: "Getting paid", href: "/guides/getting-paid" },
          { title: "Stats", href: "/guides/stats" },
        ],
      },
      {
        title: "Buying",
        items: [
          { title: "Finding things", href: "/guides/finding" },
          { title: "Making an offer", href: "/guides/making-offers" },
          { title: "Checkout", href: "/guides/checkout" },
          { title: "After you buy", href: "/guides/after-you-buy" },
        ],
      },
      {
        title: "Both sides",
        items: [
          { title: "Problems and refunds", href: "/guides/problems" },
          { title: "Reviews", href: "/guides/reviews" },
          { title: "Shopping sidekick", href: "/guides/sidekick" },
          { title: "Your AI agent", href: "/guides/your-agent" },
          { title: "Emails and notifications", href: "/guides/notifications" },
        ],
      },
    ],
  },
  {
    id: "api",
    title: "API",
    href: "/api",
    sections: [
      {
        title: "Getting started",
        items: [
          { title: "Introduction", href: "/api" },
          { title: "Keys and permissions", href: "/api/authentication" },
          { title: "Errors and limits", href: "/api/errors" },
          { title: "Recipes", href: "/api/recipes" },
        ],
      },
      { title: "Selling", items: apiGroups.slice(0, 10).map((g) => ({ title: g.title, href: `/api/${g.id}` })) },
      { title: "Shopping", items: apiGroups.slice(10).map((g) => ({ title: g.title, href: `/api/${g.id}` })) },
    ],
  },
  {
    id: "mcp",
    title: "MCP",
    href: "/mcp",
    sections: [
      {
        title: "Bring your own AI",
        items: [
          { title: "Overview", href: "/mcp" },
          { title: "Connect your app", href: "/mcp/connect" },
        ],
      },
      {
        title: "Servers",
        items: [
          { title: "Your shops", href: "/mcp/seller" },
          { title: "Shopping", href: "/mcp/buyer" },
        ],
      },
    ],
  },
  {
    id: "dev",
    title: "Developers",
    href: "/dev",
    sections: [
      {
        title: "Start here",
        items: [
          { title: "Overview", href: "/dev" },
          { title: "Run it locally", href: "/dev/local" },
          { title: "Project structure", href: "/dev/structure" },
          { title: "Domains and routing", href: "/dev/routing" },
        ],
      },
      {
        title: "How it works",
        items: [
          { title: "Data model", href: "/dev/data" },
          { title: "Research and agents", href: "/dev/agents" },
          { title: "Payments and payouts", href: "/dev/payments" },
          { title: "Background jobs", href: "/dev/jobs" },
          { title: "API, docs and MCP", href: "/dev/api" },
          { title: "Testing", href: "/dev/testing" },
        ],
      },
      {
        title: "Deploy",
        items: [
          { title: "Deploy to Render", href: "/dev/deploy" },
          { title: "Environment variables", href: "/dev/env" },
        ],
      },
      {
        title: "Built with",
        items: [
          { title: "The stack", href: "/dev/stack" },
          { title: "PayPal", href: "/dev/stack/paypal" },
          { title: "AI model", href: "/dev/stack/ai-model" },
          { title: "Channel3", href: "/dev/stack/channel3" },
          { title: "Kernel", href: "/dev/stack/kernel" },
          { title: "Render", href: "/dev/stack/render" },
          { title: "Everything else", href: "/dev/stack/more" },
        ],
      },
    ],
  },
];

/** The tab a docs path belongs to. */
export function tabFor(path: string) {
  if (path.startsWith("/api")) return docsTabs[1]!;
  if (path.startsWith("/mcp")) return docsTabs[2]!;
  if (path.startsWith("/dev")) return docsTabs[3]!;
  return docsTabs[0]!;
}
