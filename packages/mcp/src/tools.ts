import { inputRequired, inputResponse, type CallToolResult, type McpServer, type ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ResellApiError, type Account, type ResellClient } from "./client";

/*
 * One tool = one or two API calls. Each tool says which permission ("scope")
 * the key needs; tools the key can't use aren't offered at all. Tools marked
 * `consequential` (money, offers, going live) ask the owner first when the
 * owner set that permission to "Ask me first" on resell.store/tools/agent.
 */

export type Scope = "read" | "shops" | "listings" | "messages" | "offers" | "orders" | "buying" | "webhooks";

export type ToolDef = {
  name: string;
  title: string;
  description: string;
  input: z.ZodObject;
  /** The key permission it needs. Leave out for public tools that work without a key. */
  scope?: Scope;
  /** Reads only. */
  readOnly?: boolean;
  /** Can't be undone, or moves money. */
  destructive?: boolean;
  /** Subject to "Ask me first". */
  consequential?: boolean;
  /** The question put to the owner when they've asked to approve this first. */
  confirmMessage?: (args: Record<string, unknown>) => string;
  run: (client: ResellClient, args: Record<string, unknown>) => Promise<unknown>;
};

/** Keeps the type of `args` for each tool while collecting them in one list. */
export function tool<S extends z.ZodObject>(
  def: Omit<ToolDef, "input" | "run" | "confirmMessage"> & {
    input: S;
    run: (client: ResellClient, args: z.output<S>) => Promise<unknown>;
    confirmMessage?: (args: z.output<S>) => string;
  },
): ToolDef {
  return def as unknown as ToolDef;
}

const confirmSchema = z.object({
  approve: z.boolean().describe("Yes, go ahead"),
});

const confirmedField = z
  .boolean()
  .optional()
  .describe(
    "The shop owner asked to approve this kind of action first. Only set true after they've said yes to this exact action in this conversation.",
  );

function text(value: unknown, isError = false): CallToolResult {
  return {
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 1) }],
    ...(isError ? { isError: true } : {}),
  };
}

/** Whether the connected app can show the owner a yes/no question. */
function canElicit(server: McpServer, ctx: ServerContext) {
  const envelope = ctx.mcpReq.envelope as Record<string, unknown> | undefined;
  const fromEnvelope = Object.entries(envelope ?? {}).find(([k]) => k.endsWith("clientCapabilities"))?.[1] as
    | { elicitation?: unknown }
    | undefined;
  if (fromEnvelope) return !!fromEnvelope.elicitation;
  return !!server.server.getClientCapabilities()?.elicitation;
}

/** The connected app's own name ("claude-ai", "openai-mcp"), when it gives one. */
function clientName(server: McpServer, ctx: ServerContext) {
  const envelope = ctx.mcpReq.envelope as Record<string, unknown> | undefined;
  const info = Object.entries(envelope ?? {}).find(([k]) => k.endsWith("clientInfo"))?.[1] as { name?: unknown } | undefined;
  const name = typeof info?.name === "string" ? info.name : server.server.getClientVersion()?.name;
  return name?.trim().slice(0, 80) || null;
}

export type Permissions = {
  /** Null for a public server with no key: only public tools. */
  account: Account | null;
};

export function allowedTools(tools: ToolDef[], { account }: Permissions) {
  return tools.filter((t) => !t.scope || (account?.key.scopes.includes(t.scope) ?? false));
}

export function registerTools(server: McpServer, client: ResellClient, tools: ToolDef[], perms: Permissions) {
  const askFirst = new Set(perms.account?.key.ask_first ?? []);
  for (const t of allowedTools(tools, perms)) {
    const asks = !!t.consequential && !!t.scope && askFirst.has(t.scope);
    const input = asks ? t.input.extend({ confirmed: confirmedField }) : t.input;
    server.registerTool(
      t.name,
      {
        title: t.title,
        description: asks
          ? `${t.description}\n\nThe owner wants to approve this first: ask them, then call with confirmed: true.`
          : t.description,
        inputSchema: input,
        annotations: {
          title: t.title,
          readOnlyHint: !!t.readOnly,
          destructiveHint: !!t.destructive,
          idempotentHint: !!t.readOnly,
          openWorldHint: false,
        },
      },
      async (rawArgs: Record<string, unknown>, ctx: ServerContext) => {
        const { confirmed, ...args } = rawArgs as Record<string, unknown> & { confirmed?: boolean };
        // For the owner's activity log on resell.store: which app, which tool, and whether it asked
        const name = clientName(server, ctx);
        const tagged = (askedFirst: boolean) =>
          client.withHeaders({
            "resell-tool": t.name,
            ...(name ? { "resell-client": name } : {}),
            ...(askedFirst ? { "resell-asked-first": "1" } : {}),
          });
        let call = tagged(asks && confirmed === true);
        if (asks && confirmed !== true) {
          const question = t.confirmMessage?.(args) ?? `Go ahead: ${t.title.toLowerCase()}?`;
          const answer = inputResponse(ctx.mcpReq.inputResponses, "approve");
          if (answer.kind === "elicit") {
            const ok = answer.action === "accept" && (answer.content as { approve?: boolean } | undefined)?.approve === true;
            if (!ok) return text("The owner said no, so nothing was changed.");
            call = tagged(true);
          } else if (canElicit(server, ctx)) {
            return inputRequired({
              inputRequests: { approve: inputRequired.elicit({ message: question, requestedSchema: confirmSchema }) },
            });
          } else {
            return text(
              `Not done yet. The shop owner asked to approve this first. Ask them: "${question}" If they say yes, call ${t.name} again with confirmed: true.`,
            );
          }
        }
        try {
          return text(await t.run(call, args));
        } catch (error) {
          if (error instanceof ResellApiError) return text(error.message, true);
          if (error instanceof z.ZodError) return text(error.issues[0]?.message ?? "Something in there doesn't look right.", true);
          return text("Something went wrong talking to resell.store. Try again in a moment.", true);
        }
      },
    );
  }
}

/* Shared input pieces */

export const money = (what: string) => z.number().positive().max(100_000).describe(`${what}, in US dollars.`);
export const listingId = z.string().min(1).describe("The listing's id.");
export const limit = z.number().int().min(1).max(100).optional().describe("How many to return (default 25).");
export const offset = z.number().int().min(0).optional().describe("How many to skip, for the next page.");

/** Lists come back as { data, total, has_more }; keep the model's context small. */
export function slim<T, U>(list: { data: T[]; total?: number; has_more?: boolean }, map: (item: T) => U) {
  return { total: list.total, has_more: list.has_more, items: list.data.map(map) };
}
