"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentMessage,
  ChangeChip,
  SystemLine,
  ThinkingLine,
  Thread,
  UserMessage,
} from "../agent-chat/agent-chat";
import { FieldsCard, type Field } from "../workspace/listing-panel";
import { ListingWorkspace } from "../workspace/listing-workspace";
import {
  cannedReplies,
  detailFields,
  LISTING_ID,
  listingHref,
  priceRange,
} from "../../lib/mock-listing";
import { CanvasColumns, ListingCanvasHeader } from "./canvas-parts";
import { PriceCard } from "./price-card";

/*
 * C4 Details. Every item row is editable now; the price card sets the price,
 * the private floor and whether the agent takes offers. The composer answers
 * with a canned message, and understands two things: "barely used" and a price
 * like "$170".
 */

type ChatItem =
  | { id: string; kind: "user"; text: string }
  | {
      id: string;
      kind: "agent";
      text: string;
      stream?: boolean;
      chip?: { field: string; label: string };
    }
  | { id: string; kind: "system"; text: string };

const initialLog: ChatItem[] = [
  {
    id: "intro",
    kind: "agent",
    text: "Here's everything I have. Check it reads right, then set your price. I'd go with $185: it's the middle of what sold lately, and at that price these go in about 6 days.",
  },
  { id: "ask", kind: "user", text: "Can we say it's barely used?" },
  {
    id: "changed",
    kind: "agent",
    text: "Yes. I changed the condition, and kept the marks on the base in so nobody is surprised.",
    chip: { field: "condition", label: "Condition changed to “Barely used”" },
  },
];

export function DetailsFlow() {
  const [fields, setFields] = useState<Field[]>(detailFields);
  const [price, setPrice] = useState(priceRange.suggested);
  const [lowest, setLowest] = useState(priceRange.bandLow);
  const [takeOffers, setTakeOffers] = useState(true);
  const [log, setLog] = useState<ChatItem[]>(initialLog);
  const [thinking, setThinking] = useState(false);

  const ids = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => clearTimeout(t));
  }, []);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const id = (prefix: string) => `${prefix}-${++ids.current}`;

  function changePrice(next: number) {
    setPrice(next);
    // The floor can't go above the price
    setLowest((l) => Math.min(l, next));
  }

  function setField(key: string, value: string) {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, value, justChanged: true } : f)),
    );
  }

  /** A row edited by hand: a quiet line in the chat so the agent uses the new value. */
  function onEdit(key: string, value: string) {
    const label = fields.find((f) => f.key === key)?.label ?? key;
    setField(key, value);
    setLog((prev) => [
      ...prev,
      { id: id("system"), kind: "system", text: `You changed ${label} to ${value}` },
    ]);
  }

  function onSend(text: string) {
    setLog((prev) => [...prev, { id: id("user"), kind: "user", text }]);
    setThinking(true);

    const priceMatch = text.match(/\$\s?(\d{1,5})/);
    let reply: ChatItem;
    let effect: (() => void) | undefined;
    if (priceMatch) {
      const next = Number(priceMatch[1]);
      reply = {
        id: id("agent"),
        kind: "agent",
        text:
          next > priceRange.bandHigh
            ? `Done, $${next}. That's higher than most, so it may take a little longer to sell.`
            : next < priceRange.bandLow
              ? `Done, $${next}. That's lower than most, so it should go fast.`
              : `Done, $${next}. Right in the middle of what these sell for.`,
        stream: true,
        chip: { field: "price", label: `Price changed to $${next}` },
      };
      effect = () => changePrice(next);
    } else if (/barely|like new|good condition|used/i.test(text)) {
      const value = /like new/i.test(text)
        ? "Like new, light marks on the base"
        : "Barely used, light marks on the base";
      reply = {
        id: id("agent"),
        kind: "agent",
        text: "Done. I kept the marks on the base in so nobody is surprised.",
        stream: true,
        chip: { field: "condition", label: `Condition changed to “${value.split(",")[0]}”` },
      };
      effect = () => setField("condition", value);
    } else {
      reply = { id: id("agent"), kind: "agent", text: cannedReplies.details, stream: true };
    }

    later(1000, () => {
      setThinking(false);
      effect?.();
      setLog((prev) => [...prev, reply]);
    });
  }

  const chat = (
    <Thread>
      {log.map((item) => {
        if (item.kind === "user") return <UserMessage key={item.id}>{item.text}</UserMessage>;
        if (item.kind === "system") return <SystemLine key={item.id}>{item.text}</SystemLine>;
        return (
          <AgentMessage
            key={item.id}
            stream={item.stream}
            after={
              item.chip ? (
                <ChangeChip field={item.chip.field}>{item.chip.label}</ChangeChip>
              ) : undefined
            }
          >
            {item.text}
          </AgentMessage>
        );
      })}
      {thinking && <ThinkingLine>Making the change</ThinkingLine>}
    </Thread>
  );

  const filled = 9;
  const canvas = (
    <>
      <ListingCanvasHeader
        title="Check the details"
        description="Click a line to change it, or just tell me."
        phoneDescription="Tap a line to change it, or just tell me."
        filled={filled}
      />
      <CanvasColumns
        left={<FieldsCard fields={fields} onEdit={onEdit} />}
        right={
          <PriceCard
            range={priceRange}
            price={price}
            onPriceChange={changePrice}
            lowest={lowest}
            onLowestChange={setLowest}
            takeOffers={takeOffers}
            onTakeOffersChange={setTakeOffers}
            nextHref={listingHref("photos")}
          />
        }
      />
    </>
  );

  return (
    <ListingWorkspace
      listingId={LISTING_ID}
      step="details"
      chat={chat}
      canvas={canvas}
      filled={filled}
      busy={thinking}
      onSend={onSend}
      saveKey={`${price}-${lowest}-${takeOffers}-${JSON.stringify(fields)}`}
    />
  );
}
