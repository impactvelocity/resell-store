/*
 * Browser side of Stats: tell the server someone looked at or shared a store
 * or listing. Fire and forget; it never throws and never blocks a page.
 */

type Target = { shop?: string | null; listing?: string | null };

function send(payload: Record<string, unknown>) {
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking is never worth an error
  }
}

/** A page view, with where they came from (?ref= or utm_source tags a link). */
export function trackView(target: Target) {
  const params = new URLSearchParams(window.location.search);
  send({
    kind: "view",
    ...target,
    referrer: document.referrer || null,
    tag: params.get("ref") ?? params.get("utm_source"),
  });
}

/** Someone shared or copied the link to a store or listing. */
export function trackShare(target: Target) {
  send({ kind: "share", ...target });
}
