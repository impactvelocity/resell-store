"use client";

import type { UIMessage } from "ai";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import type { ListingField, ResearchFindings, ResearchStepRow } from "@repo/db/schema";
import {
  AgentMessage,
  AnswerPicker,
  MessagePhoto,
  SystemLine,
  ThinkingLine,
  Thread,
  ToolActivityCard,
  UserMessage,
} from "../agent-chat/agent-chat";
import { FieldsCard, type Field } from "../workspace/listing-panel";
import { ListingWorkspace, stepHref } from "../workspace/listing-workspace";
import { rerunResearch, saveField } from "../../app/actions/listings";
import { CanvasColumns, ListingCanvasHeader, PhotosCard, WordsCard } from "./canvas-parts";
import { FindingsCard, PriceWorkingCard } from "./findings-card";
import { AgentMessages, useListingAgent } from "./listing-agent";

/*
 * C2 Research and C3 Findings, live. The research job (lib/server/research.ts)
 * runs on the server; this polls its rows into the tool card, then shows what
 * it found and asks the questions only the seller can answer, one at a time.
 * Typed messages answer the open question, or go to the agent.
 */

export type ResearchSnapshot = {
  run: { id: string; status: "running" | "done" | "failed"; steps: ResearchStepRow[] } | null;
  listing: {
    name: string | null;
    fields: ListingField[];
    findings: ResearchFindings | null;
    priceCents: number | null;
    lowestCents: number | null;
  };
};

const POLL_MS = 1200;

export function LiveResearch({
  listingId,
  prompt,
  shopName,
  closeHref,
  photos,
  initial,
  initialMessages,
}: {
  listingId: string;
  prompt: string | null;
  shopName: string;
  closeHref: string;
  photos: string[];
  initial: ResearchSnapshot;
  initialMessages: UIMessage[];
}) {
  const [snap, setSnap] = useState(initial);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [saving, startSaving] = useTransition();
  const [retrying, startRetry] = useTransition();
  const committing = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/listings/${listingId}/research`, { cache: "no-store" });
    if (res.ok) setSnap((await res.json()) as ResearchSnapshot);
  }, [listingId]);

  const status = snap.run?.status ?? "none";
  const running = status === "running";

  useEffect(() => {
    if (!running) return;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [running, refresh]);

  const agent = useListingAgent({
    listingId,
    step: "research",
    initialMessages,
    onChanged: refresh,
  });

  const findings = snap.listing.findings;
  const fields = snap.listing.fields;
  const done = status === "done" && findings !== null;

  /* Questions: the first one without an answer that wasn't skipped */
  const questions = findings?.questions ?? [];
  const answerOf = (field: string) => fields.find((f) => f.key === field && f.source === "you")?.value;
  const openIndex = done
    ? questions.findIndex((q) => !answerOf(q.field) && !skipped.includes(q.field))
    : -1;
  const open = openIndex >= 0 ? questions[openIndex] : undefined;
  const allAsked = done && openIndex === -1;

  function answer(field: string, label: string, value: string | null) {
    committing.current = false;
    if (value === null) {
      setSkipped((s) => [...s, field]);
      return;
    }
    // Show it straight away; the server catches up
    setSnap((prev) => ({
      ...prev,
      listing: {
        ...prev.listing,
        fields: upsert(prev.listing.fields, { key: field, label, value, source: "you" }),
      },
    }));
    startSaving(async () => {
      await saveField(listingId, { key: field, label, value });
    });
  }

  function onSend(text: string) {
    if (open && !committing.current) {
      answer(open.field, open.label, text);
      return;
    }
    void agent.send(text);
  }

  /* Chat */
  const firstPhoto = photos[0];
  const chat = (
    <Thread>
      {(prompt || firstPhoto) && (
        <UserMessage
          photos={
            firstPhoto ? (
              <MessagePhoto tone="leaf">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploads are served from /api/files */}
                <img src={firstPhoto} alt="" className="size-full object-cover" />
              </MessagePhoto>
            ) : undefined
          }
        >
          {prompt || undefined}
        </UserMessage>
      )}
      <AgentMessage>
        {firstPhoto
          ? "Got it. Give me a minute to find out what these really sell for."
          : "On it. Give me a minute to find out what these really sell for."}
      </AgentMessage>

      {snap.run && (
        <ToolActivityCard
          key={status}
          rows={snap.run.steps.map((s) => ({
            tag: s.tag,
            state: s.state,
            title: s.title,
            detail: s.detail,
          }))}
          summary={running ? undefined : `Looked in ${snap.run.steps.length} places`}
          defaultOpen={running}
        />
      )}

      {status === "none" && (
        <AgentMessage
          after={
            <Button size="md" disabled={retrying} onClick={() => startRetry(async () => {
              await rerunResearch(listingId);
              await refresh();
            })}>
              Look it up
            </Button>
          }
        >
          Ready when you are. I&apos;ll look for what it sells for new and second hand.
        </AgentMessage>
      )}

      {status === "failed" && (
        <AgentMessage
          after={
            <Button size="md" disabled={retrying} onClick={() => startRetry(async () => {
              await rerunResearch(listingId);
              await refresh();
            })}>
              Try again
            </Button>
          }
        >
          I hit a snag looking this up. Want me to try again? You can also skip ahead and
          set the details yourself.
        </AgentMessage>
      )}

      {done && (
        <>
          <AgentMessage>
            {findings.summary}
          </AgentMessage>
          <FindingsCard
            variant="compact"
            className="desk:hidden"
            state={findings.confidence === "low" ? "rough" : "ready"}
            data={findings}
          />
          {questions.slice(0, openIndex === -1 ? questions.length : openIndex + 1).map((q) => {
            const a = answerOf(q.field);
            const wasSkipped = skipped.includes(q.field);
            return (
              <div key={q.field} className="flex flex-col gap-5">
                <AgentMessage>{q.ask}</AgentMessage>
                {a && <UserMessage>{a}</UserMessage>}
                {wasSkipped && <SystemLine>You skipped {q.label.toLowerCase()}</SystemLine>}
                {q === open && (
                  <AnswerPicker
                    options={q.options.map((o) => o.label)}
                    index={openIndex + 1}
                    total={questions.length}
                    onAnswer={([label]) => {
                      const option = q.options.find((o) => o.label === label);
                      if (!option || committing.current) return;
                      committing.current = true;
                      // Let the chosen pill show for a beat before it becomes a message
                      // The label is what the seller picked and what buyers will read
                      setTimeout(() => answer(q.field, q.label, option.label), 450);
                    }}
                    onSkip={() => {
                      if (committing.current) return;
                      answer(q.field, q.label, null);
                    }}
                  />
                )}
              </div>
            );
          })}
          {allAsked && (
            <AgentMessage
              after={
                <Button size="md" render={<Link href={stepHref(listingId, "details")} />} nativeButton={false}>
                  On to details
                </Button>
              }
            >
              That&apos;s everything I need. Next, check the details and set your price.
            </AgentMessage>
          )}
        </>
      )}

      <AgentMessages messages={agent.messages} busy={agent.busy} error={agent.error} />
      {running && <ThinkingLine>{thinkingLabel(snap.run!.steps)}</ThinkingLine>}
      {saving && <ThinkingLine>Writing that down</ThinkingLine>}
    </Thread>
  );

  /* Canvas */
  const askingKey = open?.field;
  const canvasFields: Field[] = fields.map((f) => ({
    key: f.key,
    label: f.label,
    value: f.value,
    state:
      f.key === askingKey
        ? "asking"
        : f.value
          ? f.source === "you"
            ? "you-said"
            : "filled"
          : "to-ask",
  }));
  const filled = fields.filter((f) => f.value).length + (findings ? 1 : 0) + photos.length;
  const total = Math.max(fields.length, 4) + 1 + Math.max(photos.length, 1) + 3;

  const canvas = (
    <>
      <ListingCanvasHeader
        title="Your listing"
        description="Fills in as we go. Click anything to change it."
        phoneDescription="Fills in as we go. Tap anything to change it."
        filled={Math.min(filled, total)}
        total={total}
      />
      {done && (
        <>
          <FindingsCard
            variant="wide"
            className="mb-4 hidden desk:flex"
            state={findings.confidence === "low" ? "rough" : "ready"}
            data={findings}
          />
          <FindingsCard
            variant="compact"
            className="mb-4 desk:hidden"
            state={findings.confidence === "low" ? "rough" : "ready"}
            data={findings}
          />
        </>
      )}
      <CanvasColumns
        left={
          canvasFields.length ? (
            <FieldsCard
              fields={canvasFields}
              onEdit={(key, value) => {
                const label = fields.find((f) => f.key === key)?.label ?? key;
                answer(key, label, value);
              }}
            />
          ) : (
            <FieldsCard fields={[{ key: "item", label: "Item", state: "to-ask" }]} />
          )
        }
        right={
          <>
            {!done && status !== "failed" && (
              <PriceWorkingCard label={running ? "Looking for what these sell for" : "Waiting to start"} />
            )}
            <PhotosCard photos={photos} />
            <WordsCard />
          </>
        }
      />
      {(done || status === "failed") && (
        <div className="flex justify-end pt-6">
          <Button
            render={<Link href={stepHref(listingId, "details")} />}
            nativeButton={false}
            className="w-full xl:w-auto"
          >
            {done ? "Looks right, on to details" : "Skip to details"}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <ListingWorkspace
      listingId={listingId}
      step="research"
      title={snap.listing.name ?? "New listing"}
      shopName={shopName}
      closeHref={closeHref}
      chat={chat}
      canvas={canvas}
      filled={Math.min(filled, total)}
      total={total}
      busy={running || agent.busy}
      onSend={onSend}
      onStop={agent.busy ? agent.stop : undefined}
      composerHint={open ? "Or type your answer" : "Ask me anything about it"}
      saveKey={`${status}-${fields.map((f) => f.value).join("|")}`}
    />
  );
}

function thinkingLabel(steps: ResearchStepRow[]) {
  const runningStep = steps.find((s) => s.state === "running");
  if (!runningStep || runningStep.key === "identify") return "Having a look";
  if (runningStep.key === "price") return "Putting it all together";
  return "Working out a fair price";
}

function upsert(fields: ListingField[], next: ListingField) {
  return fields.some((f) => f.key === next.key)
    ? fields.map((f) => (f.key === next.key ? next : f))
    : [...fields, next];
}
