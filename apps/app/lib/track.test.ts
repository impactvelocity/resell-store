import { afterEach, describe, expect, it, vi } from "vitest";
import { trackShare, trackView } from "./track";

/*
 * The browser beacon for Stats: what it posts to /api/track, and that it
 * never throws, whatever fetch does.
 */

function stubPage(search: string, referrer = "") {
  vi.stubGlobal("window", { location: { search } });
  vi.stubGlobal("document", { referrer });
}

function sent(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0]!;
  return { url, init, body: JSON.parse(init.body) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("trackView", () => {
  it("posts a view with the referrer and the ?ref= tag", () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    stubPage("?ref=ig&utm_source=newsletter", "https://www.instagram.com/");

    trackView({ shop: "maya", listing: "l1" });

    const { url, init, body } = sent(fetchMock);
    expect(url).toBe("/api/track");
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    expect(body).toEqual({ kind: "view", shop: "maya", listing: "l1", referrer: "https://www.instagram.com/", tag: "ig" });
  });

  it("falls back to utm_source, and sends nulls when there's no referrer or tag", () => {
    const fetchMock = vi.fn(async () => new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    stubPage("?utm_source=qr");
    trackView({ shop: "maya" });
    expect(sent(fetchMock).body).toEqual({ kind: "view", shop: "maya", referrer: null, tag: "qr" });

    fetchMock.mockClear();
    stubPage("");
    trackView({ shop: "maya" });
    expect(sent(fetchMock).body).toMatchObject({ referrer: null, tag: null });
  });
});

describe("trackShare", () => {
  it("posts a share", () => {
    const fetchMock = vi.fn(async () => new Response(null));
    vi.stubGlobal("fetch", fetchMock);
    trackShare({ listing: "l1" });
    expect(sent(fetchMock).body).toEqual({ kind: "share", listing: "l1" });
  });
});

describe("never breaking the page", () => {
  it("swallows a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(() => trackShare({ shop: "maya" })).not.toThrow();
    await new Promise((r) => setTimeout(r, 0)); // no unhandled rejection
  });

  it("swallows fetch throwing outright", () => {
    vi.stubGlobal("fetch", () => {
      throw new Error("no fetch here");
    });
    expect(() => trackShare({ shop: "maya" })).not.toThrow();
  });
});
