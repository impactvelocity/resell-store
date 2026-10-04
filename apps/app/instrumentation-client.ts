import posthog from "posthog-js";
import { serviceFromHost, storeFromHost } from "./lib/urls";

/*
 * PostHog on every page: Next runs this file in the browser before the app hydrates,
 * on every host (marketplace, store subdomains, docs). Anonymous only, no identify().
 *
 * Every event carries project: "resell-store" plus the zone it came from, so the
 * PostHog project can be filtered down to this app and split by site/market/app/store/docs.
 */

/** Marketplace pages on the root domain that buyers browse (not the seller workspace). */
const MARKET =
  /^\/(?:discover|stores|agent|account|messages|checkout|offer)(?:\/|$)/;

function zone({ host, pathname }: Location) {
  if (serviceFromHost(host) === "docs" || /^\/docs(?:\/|$)/.test(pathname))
    return "docs";
  if (storeFromHost(host) || /^\/store\//.test(pathname)) return "store";
  if (pathname === "/" || pathname.startsWith("/sign-in")) return "site";
  if (MARKET.test(pathname)) return "market";
  return "app";
}

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    defaults: "2026-08-30",
    person_profiles: "never",
    before_send: (event) => {
      if (event)
        event.properties = {
          ...event.properties,
          project: "resell-store",
          zone: zone(window.location),
        };
      return event;
    },
  });
}
