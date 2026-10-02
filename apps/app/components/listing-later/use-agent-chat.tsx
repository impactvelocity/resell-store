"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AgentMessage,
  SystemLine,
  ThinkingLine,
  UserMessage,
} from "../agent-chat/agent-chat";

/*
 * The bit of the thread that grows while you use a screen: what the person
 * sends, quiet system lines, and canned agent replies that arrive after a
 * short thinking line. No model behind it.
 */

export type Reply = { thinking: string; text: string; after?: ReactNode };

type NewEntry =
  | { kind: "me"; text: string }
  | { kind: "agent"; text: string; after?: ReactNode }
  | { kind: "system"; text: string }
  | { kind: "node"; node: ReactNode };

type Entry = NewEntry & { id: number };

export function useAgentChat(replies: readonly Reply[]) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [thinking, setThinking] = useState<string | null>(null);
  const nextId = useRef(1);
  const turn = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const push = useCallback((entry: NewEntry) => {
    const id = nextId.current++;
    setEntries((list) => [...list, { ...entry, id }]);
  }, []);

  /** Shows a thinking line, then the agent's reply. */
  const reply = useCallback(
    (r: Reply, delay = 1100) => {
      setThinking(r.thinking);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setThinking(null);
        push({ kind: "agent", text: r.text, after: r.after });
      }, delay);
    },
    [push],
  );

  /** The person sends a message; the next canned reply follows. */
  const send = useCallback(
    (text: string, override?: Reply) => {
      push({ kind: "me", text });
      const r = override ?? replies[turn.current % replies.length]!;
      turn.current += 1;
      reply(r);
    },
    [push, replies, reply],
  );

  const system = useCallback((text: string) => push({ kind: "system", text }), [push]);
  const agent = useCallback(
    (text: string, after?: ReactNode) => push({ kind: "agent", text, after }),
    [push],
  );
  const node = useCallback((n: ReactNode) => push({ kind: "node", node: n }), [push]);

  const thread = (
    <>
      {entries.map((e) => {
        if (e.kind === "me") return <UserMessage key={e.id}>{e.text}</UserMessage>;
        if (e.kind === "system") return <SystemLine key={e.id}>{e.text}</SystemLine>;
        if (e.kind === "node") return <div key={e.id}>{e.node}</div>;
        return (
          <AgentMessage key={e.id} stream after={e.after}>
            {e.text}
          </AgentMessage>
        );
      })}
      {thinking && <ThinkingLine>{thinking}</ThinkingLine>}
    </>
  );

  return { thread, busy: thinking !== null, send, reply, system, agent, node };
}
