import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { createProviderRegistry, type LanguageModel } from "ai";

/*
 * Models come from env as "provider:model", so they can change without a deploy.
 *   AI_MODEL       the agent: research, edits, copywriting
 *   AI_MODEL_FAST  quick, cheap jobs: summaries, search query parsing
 * Add providers to the registry to use them from env.
 */

const registry = createProviderRegistry({ anthropic });

type ModelId = Parameters<typeof registry.languageModel>[0];

export function aiModel(kind: "main" | "fast" = "main"): LanguageModel {
  const id =
    kind === "fast"
      ? (process.env.AI_MODEL_FAST ?? "anthropic:claude-haiku-4-5")
      : (process.env.AI_MODEL ?? "anthropic:claude-sonnet-5");
  return registry.languageModel(id as ModelId);
}

export const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

/** Thrown when a feature needs the model and no key is set. */
export class AiNotConfigured extends Error {
  constructor() {
    super("Add ANTHROPIC_API_KEY to apps/app/.env.local to switch the agent on.");
  }
}
