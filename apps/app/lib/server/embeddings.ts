import "server-only";

/*
 * Jina embeddings (https://jina.ai/embeddings) for semantic search. Listings
 * are embedded as passages when published; searches as queries. 1024 dims to
 * match listing.embedding.
 */

const MODEL = process.env.JINA_EMBEDDING_MODEL ?? "jina-embeddings-v5-text-small";
const DIMENSIONS = 1024;

export const embeddingsConfigured = Boolean(process.env.JINA_EMBEDDING_MODEL_KEY);

export async function embed(
  inputs: string[],
  task: "retrieval.query" | "retrieval.passage",
): Promise<number[][]> {
  const key = process.env.JINA_EMBEDDING_MODEL_KEY;
  if (!key) throw new Error("JINA_EMBEDDING_MODEL_KEY is not set.");
  const res = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, task, dimensions: DIMENSIONS, normalized: true, input: inputs }),
  });
  if (!res.ok) throw new Error(`Jina embeddings failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedQuery(text: string) {
  const [vector] = await embed([text], "retrieval.query");
  return vector!;
}

/** The text a listing is embedded from: what a buyer would read. */
export function listingPassage(l: {
  title?: string | null;
  name?: string | null;
  oneLiner?: string | null;
  description?: string | null;
  category?: string | null;
  fields?: { label: string; value?: string }[];
}) {
  const facts = (l.fields ?? [])
    .filter((f) => f.value)
    .map((f) => `${f.label}: ${f.value}`)
    .join(". ");
  return [l.title ?? l.name, l.oneLiner, l.category, facts, l.description]
    .filter(Boolean)
    .join("\n");
}
