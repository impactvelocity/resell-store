"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo } from "react";
import { AgentMessage, ChangeChip, SystemLine, ThinkingLine, UserMessage } from "../agent-chat/agent-chat";

/*
 * The real agent beside a listing (C3 and C4): useChat against
 * /api/listings/{id}/chat. Tool calls change the listing on the server; the
 * caller refreshes its canvas when a reply ends (`onChanged`).
 */

type ChangeOutput = { changed: string; to: string };

export function useListingAgent({
  listingId,
  step,
  initialMessages,
  onChanged,
}: {
  listingId: string;
  step: "research" | "details";
  initialMessages: UIMessage[];
  onChanged?: () => void;
}) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/listings/${listingId}/chat`, body: { step } }),
    [listingId, step],
  );
  const chat = useChat({
    id: `${listingId}-${step}`,
    messages: initialMessages,
    transport,
    onFinish: ({ message }) => {
      if (message.parts.some((p) => p.type.startsWith("tool-"))) onChanged?.();
    },
  });
  const busy = chat.status === "submitted" || chat.status === "streaming";
  return {
    messages: chat.messages,
    busy,
    error: chat.error,
    send: (text: string) => chat.sendMessage({ text }),
    stop: chat.stop,
  };
}

/** Which canvas card a tool's change belongs to, for the change chip. */
function fieldFor(toolName: string, input: unknown) {
  if (toolName === "set_field") return (input as { key?: string })?.key;
  return "price";
}

/** The agent's messages, rendered with the workspace chat parts. */
export function AgentMessages({
  messages,
  busy,
  error,
}: {
  messages: UIMessage[];
  busy: boolean;
  error?: Error;
}) {
  const last = messages[messages.length - 1];
  const waiting = busy && (!last || last.role === "user");
  return (
    <>
      {messages.map((m) => {
        const text = m.parts
          .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
          .map((p) => p.text)
          .join("");
        if (m.role === "user") return <UserMessage key={m.id}>{text}</UserMessage>;
        const chips = m.parts.flatMap((p) => {
          if (!p.type.startsWith("tool-")) return [];
          const part = p as { type: string; state: string; input?: unknown; output?: unknown; toolCallId: string };
          if (part.state !== "output-available") return [];
          const out = part.output as ChangeOutput;
          return [
            <ChangeChip key={part.toolCallId} field={fieldFor(part.type.slice(5), part.input)}>
              {out.changed} changed to “{out.to}”
            </ChangeChip>,
          ];
        });
        if (!text && chips.length === 0) return null;
        return (
          <AgentMessage key={m.id} after={chips.length ? chips : undefined}>
            {text || "Done."}
          </AgentMessage>
        );
      })}
      {waiting && <ThinkingLine>Thinking it over</ThinkingLine>}
      {error && <SystemLine>{agentError(error)}</SystemLine>}
    </>
  );
}

function agentError(error: Error) {
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    // not JSON
  }
  return "The agent couldn't answer just now. Try again in a moment.";
}
