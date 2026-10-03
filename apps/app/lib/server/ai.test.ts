import { afterEach, describe, expect, it, vi } from "vitest";
import { AiNotConfigured, aiConfigured, aiModel } from "./ai";

/*
 * Which model each job gets (from env), and that the agent counts as off
 * without an Anthropic key. Building a model object makes no request.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

const idOf = (m: ReturnType<typeof aiModel>) => (m as { modelId: string; provider: string });

describe("aiModel", () => {
  it("uses Sonnet for the main agent and Haiku for quick jobs by default", () => {
    expect(idOf(aiModel()).modelId).toBe("claude-sonnet-5");
    expect(idOf(aiModel("main")).modelId).toBe("claude-sonnet-5");
    expect(idOf(aiModel("fast")).modelId).toBe("claude-haiku-4-5");
    expect(idOf(aiModel()).provider).toContain("anthropic");
  });

  it("takes the model from env so it can change without a deploy", () => {
    vi.stubEnv("AI_MODEL", "anthropic:claude-opus-5");
    vi.stubEnv("AI_MODEL_FAST", "anthropic:claude-haiku-5");
    expect(idOf(aiModel()).modelId).toBe("claude-opus-5");
    expect(idOf(aiModel("fast")).modelId).toBe("claude-haiku-5");
  });
});

describe("aiConfigured", () => {
  it("is off without ANTHROPIC_API_KEY, and the error says how to switch it on", () => {
    expect(aiConfigured).toBe(false);
    const error = new AiNotConfigured();
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain("ANTHROPIC_API_KEY");
  });
});
