"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { AgentAvatar } from "../agent-chat/agent-chat";
import { me } from "../../lib/mock";
import type { Question } from "../../lib/mock-inbox";

/*
 * Agent note, "Needs you" kind (spec D, Agent notes): a buyer question the
 * agent couldn't answer from the listing. Likely answers are pills; picking
 * one sends it to the buyer and adds the fact to the listing. Once answered,
 * the card shows the answer with who answered it and "Edit answer".
 */

type Answer = { text: string; by: "agent" | "you"; when: string };

function ReplyBox({
  initial = "",
  placeholder,
  submit,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  placeholder: string;
  submit: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text.trim());
      }}
    >
      <textarea
        autoFocus
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-md border-[1.5px] border-border bg-surface px-4 py-3 text-base text-text outline-none placeholder:text-text-muted focus:border-secondary"
      />
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant="secondary"
          size="md"
          disabled={!text.trim()}
        >
          {submit}
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function QuestionCard({
  question,
  buyer,
  className,
}: {
  question: Question;
  /** First name of who asked, for the toast. */
  buyer: string;
  className?: string;
}) {
  const toast = useToast();
  const [answer, setAnswer] = useState<Answer | null>(
    question.answer
      ? { text: question.answer, by: "agent", when: "yesterday" }
      : null,
  );
  const [mode, setMode] = useState<"idle" | "reply" | "edit">("idle");

  function send(text: string) {
    setAnswer({ text, by: "you", when: "just now" });
    setMode("idle");
    toast.add({ title: `Sent to ${buyer}. Added to your listing.` });
  }

  return (
    <article
      className={cn(
        "flex w-full flex-col gap-3 rounded-lg border border-border bg-surface p-5",
        !answer && "gap-[14px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex-1 text-base font-bold text-text">
          {question.question}
        </h3>
        {!answer && (
          <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-accent-soft px-3 text-sm font-semibold text-accent-text">
            Needs you
          </span>
        )}
      </div>

      {!answer && (
        <>
          <p className="text-sm text-text-muted">{question.from}</p>
          {mode === "reply" ? (
            <ReplyBox
              placeholder={`Write to ${buyer}`}
              submit="Send"
              onSubmit={send}
              onCancel={() => setMode("idle")}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {question.quickAnswers?.map((a) => (
                <Button key={a} variant="soft" size="md" onClick={() => send(a)}>
                  {a}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="md"
                className="px-3"
                onClick={() => setMode("reply")}
              >
                Write a reply
              </Button>
            </div>
          )}
        </>
      )}

      {answer &&
        (mode === "edit" ? (
          <ReplyBox
            initial={answer.text}
            placeholder="Your answer"
            submit="Save answer"
            onSubmit={(text) => {
              setAnswer({ text, by: "you", when: "just now" });
              setMode("idle");
              toast.add({ title: "Answer updated" });
            }}
            onCancel={() => setMode("idle")}
          />
        ) : (
          <>
            <div className="flex w-full items-start gap-2.5">
              {answer.by === "agent" ? (
                <AgentAvatar size="md" />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-extrabold text-on-primary">
                  {me.initial}
                </span>
              )}
              <p className="flex-1 pt-1 text-base text-text">{answer.text}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-muted">
                Answered by {answer.by === "agent" ? "your agent" : "you"},{" "}
                {answer.when}
              </span>
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="shrink-0 cursor-pointer text-sm font-bold text-secondary hover:underline"
              >
                Edit answer
              </button>
            </div>
          </>
        ))}
    </article>
  );
}
