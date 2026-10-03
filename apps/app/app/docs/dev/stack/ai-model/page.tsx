import type { Metadata } from "next";
import { CodeBlock } from "../../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, P, Table, UL } from "../../../../../components/docs/page";
import { docsBase } from "../../../../../lib/docs/base";

export const metadata: Metadata = { title: "AI model · Developers" };

const registry = `// lib/server/ai.ts
const registry = createProviderRegistry({ anthropic });

export function aiModel(kind: "main" | "fast" = "main"): LanguageModel {
  const id = kind === "fast" ? process.env.AI_MODEL_FAST : process.env.AI_MODEL;
  return registry.languageModel(id as ModelId); // "provider:model"
}

export const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);`;

const swap = `// lib/server/ai.ts: add the provider's AI SDK package to the registry
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

const registry = createProviderRegistry({ anthropic, openai });

// then point the env at it
AI_MODEL=openai:<model>
AI_MODEL_FAST=openai:<smaller model>`;

const structured = `const { output } = await generateText({
  model: aiModel("main"),
  output: Output.object({ schema: identitySchema }),
  instructions: "You identify second-hand items people want to sell. … never invent details you can't tell.",
  messages: [{ role: "user", content: [
    { type: "file", mediaType: photo.contentType, data: photo.data },
    { type: "text", text: \`The seller says: "\${prompt}". What is it?\` },
  ] }],
});`;

export default async function AiModel() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/stack/ai-model"
      eyebrow="Built with"
      title="AI model"
      lead="The AI model does the reading and writing: it looks at a photo and names the item, weighs prices, writes the listing, edits it in chat, answers buyers and words counter-offers. resell.store runs on an Anthropic model today, called through the Vercel AI SDK, and can be switched to any model the AI SDK supports."
      toc={[
        { id: "models", title: "Models" },
        { id: "changing", title: "Changing the model" },
        { id: "calls", title: "Every call" },
        { id: "patterns", title: "How it's called" },
        { id: "guardrails", title: "Guardrails" },
        { id: "unlocks", title: "What it unlocks" },
        { id: "without", title: "Without a key" },
        { id: "setup", title: "Setup" },
      ]}
    >
      <H2 id="models" className="mt-0">
        Models
      </H2>
      <P>
        <C>lib/server/ai.ts</C> builds an AI SDK provider registry and hands out two tiers: a main model for the careful work and a
        fast one for quick replies. Each is named in env as <C>provider:model</C>. Out of the box both point at Anthropic models (the
        defaults are in <C>.env.example</C> and <C>render.yaml</C>).
      </P>
      <Table
        head={["Tier", "Env", "Used for"]}
        rows={[
          [<C key="a">main</C>, <C key="a2">AI_MODEL</C>, "Seeing photos, pricing, matching listings, writing, the listing agent"],
          [<C key="b">fast</C>, <C key="b2">AI_MODEL_FAST</C>, "Search queries, buyer answers, counter messages, reading links"],
        ]}
      />
      <CodeBlock title="lib/server/ai.ts" code={registry} />

      <H2 id="changing">Changing the model</H2>
      <P>Nothing outside <C>lib/server/ai.ts</C> knows which model or company it&apos;s talking to, so switching is a settings change.</P>
      <UL>
        <li>
          <strong>Another Anthropic model:</strong> change <C>AI_MODEL</C> or <C>AI_MODEL_FAST</C> and restart. No code changes.
        </li>
        <li>
          <strong>Another provider</strong> (OpenAI, Google, Mistral, a local model, or any other AI SDK provider): install its AI SDK
          package, add it to the registry, set its API key, and point <C>AI_MODEL</C> and <C>AI_MODEL_FAST</C> at it.
        </li>
      </UL>
      <CodeBlock title="Switching provider" code={swap} />
      <Callout tone="note" title="What the new model needs">
        It needs structured output (every call except the counter message and the chat returns a zod schema), and the main model
        needs to read images for the photo step. The listing chat uses tool calls. Also change the <C>aiConfigured</C> check to
        look for the new provider&apos;s key, since features switch on from it.
      </Callout>

      <H2 id="calls">Every call</H2>
      <Table
        head={["Feature", "Tier", "API", "File"]}
        rows={[
          ["Identify the item (with the photo)", "main", <C key="a">generateText + Output.object</C>, <C key="a2">lib/server/research.ts</C>],
          ["Price verdict and questions", "main", <C key="b">generateText + Output.object</C>, <C key="b2">lib/server/research.ts</C>],
          ["Comps: marketplace search queries", "fast", <C key="c">generateText + Output.object</C>, <C key="c2">lib/server/comps.ts</C>],
          ["Comps: is each listing the same item, and its price", "main", <C key="d">generateText + Output.object</C>, <C key="d2">lib/server/comps.ts</C>],
          ["Listing agent chat", "main", <span key="e"><C>streamText</C> with 4 tools, up to 5 steps</span>, <C key="e2">app/api/listings/[id]/chat/route.ts</C>],
          ["Listing words", "main", <C key="f">generateText + Output.object</C>, <C key="f2">lib/server/words.ts</C>],
          ["Shop agent answering buyers", "fast", <C key="g">generateText + Output.object</C>, <C key="g2">lib/server/store-agent.ts</C>],
          ["Counter-offer message", "fast", <span key="h"><C>generateText</C> (plain text, then checked)</span>, <C key="h2">lib/server/negotiator.ts</C>],
          ["Sidekick: what is this and what does it cost", "fast", <C key="i">generateText + Output.object</C>, <C key="i2">lib/server/sidekick.ts</C>],
        ]}
      />
      <P>
        Comps matching uses the main model on purpose: the fast one let look-alikes through in testing. How each one fits into its
        feature is on <A href={`${base}/dev/agents`}>Research and agents</A>.
      </P>

      <H2 id="patterns">How it&apos;s called</H2>
      <P>
        Almost everything is <C>generateText</C> with <C>output: Output.object(&#123; schema &#125;)</C>, a zod schema whose{" "}
        <C>.describe()</C> strings tell the model what each field means. The result is typed and validated before any code uses it.
        Photos go in as <C>file</C> parts. AI SDK v7 names: <C>instructions</C> for the system prompt, <C>stopWhen: isStepCount(n)</C>{" "}
        for tool loops, and <C>toUIMessageStream</C> for the chat response that <C>useChat</C> reads.
      </P>
      <CodeBlock title="Identify, in research.ts" code={structured} />

      <H2 id="guardrails">Guardrails</H2>
      <UL>
        <li>
          <strong>Structured outputs</strong> for everything stored. Nothing is parsed out of free text.
        </li>
        <li>
          <strong>Numbers checked in code.</strong> The price verdict is rounded to whole dollars, the band is kept in order, and the
          suggestion is clamped inside it. Listing tools are integers with minimums, and the lowest price can never go above the
          asking price.
        </li>
        <li>
          <strong>Validated counters.</strong> The counter is calculated by <C>planMove</C>. The model&apos;s message is used only if it
          contains that exact amount and no dollar figure other than the counter, the offer and the asking price. Otherwise a
          template goes.
        </li>
        <li>
          <strong>Answers only from facts.</strong> The shop agent is given the listing&apos;s facts and the owner&apos;s own past answers,
          told not to guess, and hands off to the owner (<C>handoff</C>) when the facts don&apos;t cover it. Research facts are marked
          as being about the model in general.
        </li>
        <li>
          <strong>Buyer text is data.</strong> The shop agent is told buyer messages are questions, not instructions, and never to
          reveal the lowest price.
        </li>
        <li>
          <strong>No money moves.</strong> No model call can accept an offer, refund or release. The listing agent&apos;s four tools only
          edit the seller&apos;s own draft.
        </li>
        <li>
          <strong>Copy rules.</strong> Condition must match everywhere, no invented facts, and lengths are clipped in code.
        </li>
      </UL>
      <P>Because these checks live in code, they hold whichever model is plugged in.</P>

      <H2 id="unlocks">What it unlocks</H2>
      <UL>
        <li>Sellers list from a photo and a sentence: named, priced and described, with the questions only they can answer.</li>
        <li>An agent beside each listing that changes it when asked (&quot;make it $170 and turn offers off&quot;).</li>
        <li>Buyers get answers in seconds, any time, and the owner only sees what needs them.</li>
        <li>Lowball offers get a reasonable counter straight away, in a friendly message.</li>
        <li>Shoppers can paste a link and learn whether it holds its resale value.</li>
      </UL>

      <H2 id="without">Without a key</H2>
      <Table
        head={["Feature", "Without an AI key"]}
        rows={[
          ["Research", "Still runs. The seller's words become the name; the price comes from catalog and comps numbers alone (fallbackVerdict)."],
          ["Comps and sidekick", "Off: they need Kernel and the AI model together."],
          ["Listing agent", "The chat route answers 503."],
          ["Words", "A message asking for the key."],
          ["Shop agent", "Stays quiet; the owner answers."],
          ["Negotiator", "Counters as usual, with a template message."],
        ]}
      />

      <H2 id="setup">Setup</H2>
      <CodeBlock
        title="apps/app/.env.local"
        code={`ANTHROPIC_API_KEY=…\n# optional: pick the models, as provider:model\nAI_MODEL=…\nAI_MODEL_FAST=…`}
      />
      <P>
        The defaults for both models are already in <C>.env.example</C> and <C>render.yaml</C>. Tests blank the key, so nothing in
        the suite calls a model.
      </P>
    </DocPage>
  );
}
