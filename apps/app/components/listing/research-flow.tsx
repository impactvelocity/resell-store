"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import {
  AgentMessage,
  AnswerPicker,
  MessagePhoto,
  SystemLine,
  ThinkingLine,
  Thread,
  ToolActivityCard,
  UserMessage,
  type ToolRow,
} from "../agent-chat/agent-chat";
import { FieldsCard, type Field } from "../workspace/listing-panel";
import { ListingWorkspace } from "../workspace/listing-workspace";
import {
  cannedReplies,
  firstMessage,
  foundFields,
  LISTING_ID,
  listingHref,
  questionLabels,
  questions,
  researchRows,
  researchSummary,
  type Question,
} from "../../lib/mock-listing";
import { CanvasColumns, ListingCanvasHeader, PhotosCard, WordsCard } from "./canvas-parts";
import { FindingsCard, PriceWorkingCard } from "./findings-card";
import { PotIllustration } from "./pot-illustration";

/*
 * C2 Research and C3 Findings and questions, one route.
 * C2 plays out on timers: each tool row goes queued, running, done, and fills
 * its fields as it finishes. Then it turns into C3 (?view=findings): the
 * findings card and the agent's questions. Visiting ?view=findings shows C3
 * straight away, one question already answered, like the design.
 */

/** How long each research tick lasts. Tick n has row n running; the last tick has them all done. */
const TICK_MS = [1400, 1500, 1500, 1500, 1100];
const LAST_TICK = researchRows.length;

const DONE_DESKTOP =
  "Done. Three sources agree, so I'm fairly sure about the price. What I found is on the right. " +
  questions[0]!.ask;
const DONE_PHONE =
  "Done. Three sources agree, so I'm fairly sure about the price. Here's what I found.";
const ALL_ASKED =
  "That's everything I need. Next, check the details and set your price.";

/** Roughly how long AgentMessage takes to stream a text (45ms a word). */
const streamMs = (text: string) => text.split(" ").length * 45 + 250;

type Answer = { label: string; value: string } | null;

type ChatItem =
  | { id: string; kind: "user"; text: string; photo?: boolean }
  | {
      id: string;
      kind: "agent";
      text: string;
      stream?: boolean;
      /** Only on one layout (the phone splits the findings message around the card). */
      only?: "phone" | "desk";
      next?: boolean;
    }
  | { id: string; kind: "system"; text: string }
  | { id: string; kind: "tools" }
  | { id: string; kind: "findings" }
  | { id: string; kind: "picker"; q: number };

function findingsItems(stream: boolean): ChatItem[] {
  return [
    { id: "done-desk", kind: "agent", only: "desk", text: DONE_DESKTOP, stream },
    { id: "done-phone", kind: "agent", only: "phone", text: DONE_PHONE, stream },
    { id: "findings", kind: "findings" },
    { id: "ask-0", kind: "agent", only: "phone", text: questions[0]!.ask, stream },
  ];
}

const baseItems: ChatItem[] = [
  { id: "first", kind: "user", text: firstMessage, photo: true },
  {
    id: "intro",
    kind: "agent",
    text: "Lovely piece. Give me a minute to find out what these really sell for.",
  },
  { id: "tools", kind: "tools" },
];

function rowsAt(tick: number): ToolRow[] {
  return researchRows.map((row, i) => {
    if (i < tick) return { tag: row.tag, state: "done", ...row.done };
    if (i === tick) return { tag: row.tag, state: "running", ...row.running };
    return { tag: row.tag, state: "queued", title: row.queued.title, detail: "Up next" };
  });
}

function thinkingAt(tick: number) {
  if (tick === 0) return "Having a look";
  if (tick >= LAST_TICK) return "Putting it all together";
  return "Working out a fair price";
}

export function ResearchFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Read once: the replace() at the end of the research must not restart anything
  const [direct] = useState(() => searchParams.get("view") === "findings");

  const [phase, setPhase] = useState<"research" | "findings">(
    direct ? "findings" : "research",
  );
  const [tick, setTick] = useState(direct ? LAST_TICK : 0);
  const [answers, setAnswers] = useState<Partial<Record<Question["field"], Answer>>>(
    () => (direct ? { condition: questions[0]!.options[0]! } : {}),
  );
  const [log, setLog] = useState<ChatItem[]>(() => {
    if (!direct) {
      return baseItems.map((item) =>
        item.id === "intro" && item.kind === "agent" ? { ...item, stream: true } : item,
      );
    }
    return [
      ...baseItems,
      ...findingsItems(false),
      { id: "answer-0", kind: "user", text: questions[0]!.options[0]!.label },
      { id: "ask-1", kind: "agent", text: questions[1]!.ask },
      { id: "picker-1", kind: "picker", q: 1 },
    ];
  });
  const [thinking, setThinking] = useState<string | null>(null);

  const timers = useRef<number[]>([]);
  const committing = useRef(false);
  const ids = useRef(0);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => clearTimeout(t));
  }, []);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const nextId = (prefix: string) => `${prefix}-x${++ids.current}`;

  /* The research simulation (C2) */
  useEffect(() => {
    if (phase !== "research") return;
    const t = window.setTimeout(() => {
      if (tick < LAST_TICK) {
        setTick(tick + 1);
        return;
      }
      setPhase("findings");
      setLog((prev) => [...prev, ...findingsItems(true)]);
      // The answers come in once the question has been written out
      later(streamMs(DONE_DESKTOP), () =>
        setLog((prev) => [...prev, { id: "picker-0", kind: "picker", q: 0 }]),
      );
      router.replace(`${listingHref("research")}?view=findings`, { scroll: false });
    }, TICK_MS[tick] ?? 1000);
    return () => clearTimeout(t);
  }, [phase, tick, router, later]);

  const openPicker = log.find(
    (item): item is Extract<ChatItem, { kind: "picker" }> => item.kind === "picker",
  );
  const askingField = openPicker ? questions[openPicker.q]?.field : undefined;

  /* Answering a question: from the picker, a skip, or typed in the composer */
  function answer(q: number, value: Answer) {
    const question = questions[q];
    if (!question) return;
    committing.current = false;
    setAnswers((prev) => ({ ...prev, [question.field]: value }));
    setLog((prev) => [
      ...prev.filter((item) => !(item.kind === "picker" && item.q === q)),
      value
        ? { id: `answer-${q}`, kind: "user", text: value.label }
        : { id: `skip-${q}`, kind: "system", text: `You skipped ${questionLabels[question.field].toLowerCase()}` },
    ]);
    setThinking("Writing that down");
    later(900, () => {
      setThinking(null);
      const next = questions[q + 1];
      if (!next) {
        setLog((prev) => [
          ...prev,
          { id: "all-asked", kind: "agent", text: ALL_ASKED, stream: true, next: true },
        ]);
        return;
      }
      setLog((prev) => [
        ...prev,
        { id: `ask-${q + 1}`, kind: "agent", text: next.ask, stream: true },
      ]);
      later(streamMs(next.ask), () =>
        setLog((prev) => [...prev, { id: `picker-${q + 1}`, kind: "picker", q: q + 1 }]),
      );
    });
  }

  function onSend(text: string) {
    if (openPicker && !committing.current) {
      answer(openPicker.q, { label: text, value: text });
      return;
    }
    setLog((prev) => [...prev, { id: nextId("user"), kind: "user", text }]);
    const reply =
      phase === "research"
        ? cannedReplies.researching
        : log.some((item) => item.id === "all-asked")
          ? cannedReplies.done
          : cannedReplies.findings;
    if (phase !== "research") setThinking("Thinking it over");
    later(900, () => {
      setThinking(null);
      setLog((prev) => [...prev, { id: nextId("agent"), kind: "agent", text: reply, stream: true }]);
    });
  }

  /* Fields */
  const fieldFor = (field: Question["field"], label: string, fallback?: Field): Field => {
    const a = answers[field];
    if (askingField === field) return { key: field, label, state: "asking" };
    if (a) return { key: field, label, value: a.value, state: "you-said" };
    return fallback ?? { key: field, label, state: "to-ask" };
  };

  const found = tick >= 1;
  const fields: Field[] = [
    ...(found ? foundFields.slice(0, 3) : []),
    ...(found ? [fieldFor("size", "Size", foundFields[3])] : []),
    fieldFor("condition", "Condition"),
    fieldFor("bought", "Bought"),
    fieldFor("box", "Box"),
  ];
  const answered = (["condition", "bought", "box"] as const).filter((f) => answers[f]).length;
  const filled = (found ? 4 : 0) + (phase === "findings" ? 2 : 0) + answered;

  /* Chat */
  const chat = (
    <Thread>
      {log.map((item) => {
        switch (item.kind) {
          case "user":
            return (
              <UserMessage
                key={item.id}
                photos={
                  item.photo ? (
                    <MessagePhoto tone="leaf">
                      <PotIllustration />
                    </MessagePhoto>
                  ) : undefined
                }
              >
                {item.text}
              </UserMessage>
            );
          case "agent":
            return (
              <AgentMessage
                key={item.id}
                stream={item.stream}
                className={cn(
                  item.only === "phone" && "desk:hidden",
                  item.only === "desk" && "hidden desk:flex",
                )}
                after={
                  item.next ? (
                    <Button
                      size="md"
                      render={<Link href={listingHref("details")} />}
                      nativeButton={false}
                    >
                      On to details
                    </Button>
                  ) : undefined
                }
              >
                {item.text}
              </AgentMessage>
            );
          case "system":
            return <SystemLine key={item.id}>{item.text}</SystemLine>;
          case "tools":
            return (
              <Fragment key={item.id}>
                <ToolActivityCard
                  key={phase}
                  rows={rowsAt(tick)}
                  summary={researchSummary}
                  defaultOpen={phase === "research"}
                />
              </Fragment>
            );
          case "findings":
            return (
              <FindingsCard key={item.id} variant="compact" className="desk:hidden" />
            );
          case "picker": {
            const q = questions[item.q]!;
            return (
              <AnswerPicker
                key={item.id}
                options={q.options.map((o) => o.label)}
                index={item.q + 1}
                total={questions.length}
                onAnswer={([label]) => {
                  const option = q.options.find((o) => o.label === label);
                  if (!option || committing.current) return;
                  committing.current = true;
                  // Let the chosen pill show for a beat before it becomes a message
                  later(450, () => answer(item.q, option));
                }}
                onSkip={() => {
                  if (committing.current) return;
                  answer(item.q, null);
                }}
              />
            );
          }
        }
      })}
      {phase === "research" && <ThinkingLine>{thinkingAt(tick)}</ThinkingLine>}
      {thinking && <ThinkingLine>{thinking}</ThinkingLine>}
    </Thread>
  );

  /* Canvas */
  const canvas = (
    <>
      <ListingCanvasHeader
        title="Your listing"
        description="Fills in as we go. Click anything to change it."
        phoneDescription="Fills in as we go. Tap anything to change it."
        filled={filled}
      />
      {phase === "findings" && (
        <>
          <FindingsCard variant="wide" className="mb-4 hidden desk:flex" />
          <FindingsCard variant="compact" className="mb-4 desk:hidden" />
        </>
      )}
      <CanvasColumns
        left={<FieldsCard fields={fields} />}
        right={
          <>
            {phase === "research" && (
              <PriceWorkingCard
                label={
                  tick < 2 ? "Looking for recent sales" : "Working it out from 42 recent sales"
                }
              />
            )}
            <PhotosCard />
            <WordsCard />
          </>
        }
      />
      {phase === "findings" && (
        <div className="flex justify-end pt-6">
          <Button
            render={<Link href={listingHref("details")} />}
            nativeButton={false}
            className="w-full xl:w-auto"
          >
            Looks right, on to details
          </Button>
        </div>
      )}
    </>
  );

  return (
    <ListingWorkspace
      listingId={LISTING_ID}
      step="research"
      chat={chat}
      canvas={canvas}
      filled={filled}
      busy={phase === "research" || thinking !== null}
      onSend={onSend}
      saveKey={`${phase}-${tick}-${JSON.stringify(answers)}`}
    />
  );
}
