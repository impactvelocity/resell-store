import "server-only";
import { z } from "zod";
import { siteUrl } from "../../../urls";
import { PERIODS, sellerStats } from "../../stats";
import { route } from "../router";

const num = (value: string) => Number(value.replace(/[^0-9.-]/g, "")) || 0;

export const statsRoutes = [
  route({
    method: "GET",
    path: "/stats",
    group: "Stats",
    access: "key",
    summary: "How your shops are doing",
    description:
      "Earnings, views, likes, shares, followers, offers and sales for a period, each compared with the period before. Narrow it to one shop with `shop`. Money is what you made after fees.",
    query: z.object({
      shop: z.string().optional().describe("A shop slug. Leave out for every shop."),
      period: z.enum(PERIODS as ["7d", "30d", "90d", "year"]).default("30d").describe("7d, 30d, 90d or year (since January 1)."),
    }),
    example: {
      query: "period=7d",
      response: {
        object: "stats",
        period: "7d",
        shop: null,
        earned: 214,
        earned_change: 58,
        things_sold: 4,
        average_sale: 54,
        days_to_sell: 6,
        metrics: [
          { label: "Views", value: 398, note: "61 more than before" },
          { label: "Likes", value: 12, note: "48 saved right now" },
          { label: "Offers", value: 5, note: "2 turned into sales" },
        ],
        chart: [{ label: "Mon", dates: "Sep 26", earned: 0 }],
        sources: [{ label: "Your link", percent: 44 }],
        most_viewed: [{ title: "Yellow Le Creuset dutch oven, 5.5 qt", views: 61, note: "12 likes, 1 offer waiting", url: "https://resell.store/listings/8d1e6c2a-…" }],
      },
    },
    handler: async ({ auth, query }) => {
      const all = await sellerStats(auth!.user.id, query.shop ?? null);
      const s = all[query.period];
      return {
        object: "stats",
        period: query.period,
        shop: query.shop ?? null,
        earned: s.made,
        earned_change: s.change,
        things_sold: s.thingsSold,
        average_sale: s.averageSale,
        days_to_sell: s.daysToSell,
        metrics: s.tiles.map((t) => ({ label: t.label, value: num(t.value), note: t.note })),
        chart: s.weeks.map((w) => ({ label: w.label, dates: w.dates, earned: w.value })),
        sources: s.sources,
        most_viewed: s.mostLooked.map((m) => ({
          title: m.title,
          views: m.views,
          note: m.note,
          url: m.href ? siteUrl(m.href) : null,
        })),
      };
    },
  }),
];
