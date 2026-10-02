/*
 * Store-home extras the shared catalog doesn't carry. The mock catalog only
 * holds a handful of each store's listings, so section chips read from the
 * store's full counts here when we have them (Maya's match the P2 design).
 */

export const sectionCounts: Record<string, Record<string, number>> = {
  maya: {
    Dresses: 9,
    Knitwear: 7,
    Tops: 8,
    "Shoes and bags": 8,
    Home: 6,
  },
};
