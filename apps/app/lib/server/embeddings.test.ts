import { afterEach, describe, expect, it, vi } from "vitest";
import { embed, embeddingsConfigured, embedQuery, listingPassage } from "./embeddings";

/*
 * Jina embeddings. Tests never reach Jina: without a key embed() refuses,
 * and with one fetch is a stub, so we check what would be sent and how the
 * reply is read.
 */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("listingPassage", () => {
  it("joins what a buyer reads: title, one-liner, category, facts, description", () => {
    const text = listingPassage({
      title: "Yellow dutch oven",
      name: "dutch oven",
      oneLiner: "Cooks like a dream",
      category: "Home",
      fields: [
        { label: "Brand", value: "Le Creuset" },
        { label: "Size" },
        { label: "Colour", value: "Soleil" },
      ],
      description: "Used a handful of times.",
    });
    expect(text).toBe("Yellow dutch oven\nCooks like a dream\nHome\nBrand: Le Creuset. Colour: Soleil\nUsed a handful of times.");
  });

  it("falls back to the draft name and skips what's missing", () => {
    expect(listingPassage({ name: "dutch oven", category: null })).toBe("dutch oven");
    expect(listingPassage({})).toBe("");
  });
});

describe("embed", () => {
  it("is off without a key, and refuses to call out", async () => {
    expect(embeddingsConfigured).toBe(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(embed(["x"], "retrieval.query")).rejects.toThrow("JINA_EMBEDDING_MODEL_KEY is not set.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the task and inputs and returns vectors in input order", async () => {
    vi.stubEnv("JINA_EMBEDDING_MODEL_KEY", "jina_test");
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          { index: 1, embedding: [0, 1] },
          { index: 0, embedding: [1, 0] },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await embed(["first", "second"], "retrieval.passage")).toEqual([
      [1, 0],
      [0, 1],
    ]);
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://api.jina.ai/v1/embeddings");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jina_test");
    expect(JSON.parse(init.body as string)).toMatchObject({
      task: "retrieval.passage",
      dimensions: 1024,
      normalized: true,
      input: ["first", "second"],
    });
  });

  it("throws with Jina's status when it fails", async () => {
    vi.stubEnv("JINA_EMBEDDING_MODEL_KEY", "jina_test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));
    await expect(embed(["x"], "retrieval.query")).rejects.toThrow("Jina embeddings failed: 429 rate limited");
  });

  it("embedQuery returns the one vector", async () => {
    vi.stubEnv("JINA_EMBEDDING_MODEL_KEY", "jina_test");
    const fetchMock = vi.fn(async () => Response.json({ data: [{ index: 0, embedding: [0.5, 0.5] }] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await embedQuery("boots")).toEqual([0.5, 0.5]);
    expect(JSON.parse((fetchMock.mock.calls[0]! as unknown as [string, RequestInit])[1].body as string).task).toBe("retrieval.query");
  });
});
